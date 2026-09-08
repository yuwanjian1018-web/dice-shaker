"""Bake local cavity occlusion with Blender's BVH, leaving the approved mesh intact.
Run: blender --background --python scripts/bake-3d-occlusion.py
Then: python scripts/build-3d-assets.py
"""
from pathlib import Path
import base64, hashlib, json, math, struct
from mathutils import Vector
from mathutils.bvhtree import BVHTree

ROOT = Path(__file__).resolve().parent.parent
source = ROOT/'design/cup-model-v3/cup-material-v3.glb'
source_data = source.read_bytes()
json_length = struct.unpack_from('<I', source_data, 12)[0]
doc = json.loads(source_data[20:20+json_length])
binary = source_data[28+json_length:]

def accessor(index):
    a = doc['accessors'][index]
    view = doc['bufferViews'][a['bufferView']]
    size = {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3}[a['type']]
    fmt = {5121: 'B', 5123: 'H', 5125: 'I', 5126: 'f'}[a['componentType']]
    values = struct.unpack_from('<' + fmt * a['count'] * size, binary,
                                view.get('byteOffset', 0) + a.get('byteOffset', 0))
    return [values[i:i+size] for i in range(0, len(values), size)]

samples = 96
rays = []
for i in range(samples):
    r = math.sqrt((i + .5) / samples)
    angle = i * 2.399963229728653
    rays.append((r * math.cos(angle), r * math.sin(angle), math.sqrt(1-r*r)))
output = []
for mesh_index, mesh in enumerate(doc['meshes']):
    vertices, triangles, primitives = [], [], []
    for p in mesh['primitives']:
        positions = accessor(p['attributes']['POSITION'])
        normals = accessor(p['attributes']['NORMAL'])
        indices = [v[0] for v in accessor(p['indices'])]
        offset = len(vertices)
        vertices.extend(positions)
        triangles.extend(tuple(offset + n for n in indices[i:i+3]) for i in range(0, len(indices), 3))
        primitives.append((positions, normals))
    tree = BVHTree.FromPolygons(vertices, triangles, all_triangles=True)
    radius = .45 if mesh_index == 2 else .8
    for primitive_index, (positions, normals) in enumerate(primitives):
        values = bytearray()
        for position, normal in zip(positions, normals):
            n = Vector(normal).normalized()
            tangent = n.cross(Vector((0, 1, 0)) if abs(n.y) < .9 else Vector((1, 0, 0))).normalized()
            bitangent = n.cross(tangent)
            origin = Vector(position) + n * .0015
            blocked = 0.0
            for x, y, z in rays:
                hit, _, _, distance = tree.ray_cast(origin, tangent*x + bitangent*y + n*z, radius)
                if hit is not None:
                    blocked += 1 - (distance / radius)**2
            values.append(round(255 * max(.2, 1 - blocked / samples)))
        output.append({'mesh': mesh_index, 'primitive': primitive_index,
                       'values': base64.b64encode(values).decode('ascii')})
        print(mesh_index, primitive_index, 'AO', min(values), round(sum(values)/len(values)), max(values), flush=True)
cache = {'sourceSha256': hashlib.sha256(source_data).hexdigest(),
         'samples': samples, 'primitives': output}
(ROOT/'design/cup-model-v3/surface-occlusion.json').write_text(json.dumps(cache, separators=(',', ':')), encoding='utf8')
