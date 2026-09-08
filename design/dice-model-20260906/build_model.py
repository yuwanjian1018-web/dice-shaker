"""Editable dice model reconstructed from the six current runtime sprites.
Run with Blender 5: blender --background --python build_model.py
Only writes to this design directory, which is excluded from the mini-program.
"""
import bpy
import math
import json
import hashlib
from pathlib import Path
from mathutils import Vector, Matrix

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 0.01
model = bpy.data.collections.new('Dice - ivory and matte concave pips')
scene.collection.children.link(model)

def move_to_model(obj):
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    model.objects.link(obj)
    return obj

def linear(hexcode):
    values = [int(hexcode[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in values)

def material(name, hexcode, roughness, metal=0, coat=.2):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*linear(hexcode), 1)
    mat.use_nodes = True
    mat.node_tree.nodes.clear()
    p = mat.node_tree.nodes.new('ShaderNodeBsdfPrincipled')
    output = mat.node_tree.nodes.new('ShaderNodeOutputMaterial')
    mat.node_tree.links.new(p.outputs['BSDF'], output.inputs['Surface'])
    p.inputs['Base Color'].default_value = mat.diffuse_color
    p.inputs['Roughness'].default_value = roughness
    p.inputs['Metallic'].default_value = metal
    p.inputs['Coat Weight'].default_value = coat
    p.inputs['Coat Roughness'].default_value = .16
    return mat

ivory = material('Ivory polished resin', 'f8f1e9', .24, coat=.24)
blue = material('Matte blue spherical inset', '123eac', .82, 0, 0)
red = material('Matte red spherical inset', 'ad1119', .82, 0, 0)
for mat in (red, blue):
    shader = next(node for node in mat.node_tree.nodes if node.type == 'BSDF_PRINCIPLED')
    shader.inputs['Specular IOR Level'].default_value = .20

bpy.ops.mesh.primitive_cube_add(size=2)
body = move_to_model(bpy.context.object)
body.name = 'Ivory body - rounded edges and 21 recessed sockets'
body.data.materials.append(ivory)
bevel = body.modifiers.new('Soft rounded corners', 'BEVEL')
bevel.width = .24
bevel.segments = 10
bpy.ops.object.modifier_apply(modifier=bevel.name)

# Same physical handedness as the runtime images: 1 / 2 / 3 visible together.
# Coordinates are Blender Z-up; each face basis u, v has u cross v = normal.
faces = {
    1: ((0, 0, 1), (1, 0, 0), (0, 1, 0)),
    2: ((0, -1, 0), (1, 0, 0), (0, 0, 1)),
    3: ((1, 0, 0), (0, 1, 0), (0, 0, 1)),
    4: ((-1, 0, 0), (0, -1, 0), (0, 0, 1)),
    5: ((0, 1, 0), (-1, 0, 0), (0, 0, 1)),
    6: ((0, 0, -1), (1, 0, 0), (0, -1, 0)),
}
s = .465
patterns = {
    1: [(0, 0)],
    2: [(-s, s), (s, -s)],
    3: [(-s, s), (0, 0), (s, -s)],
    4: [(-s, -s), (-s, s), (s, -s), (s, s)],
    5: [(-s, -s), (-s, s), (0, 0), (s, -s), (s, s)],
    6: [(-s, -s), (-s, 0), (-s, s), (s, -s), (s, 0), (s, s)],
}
cutters = bpy.data.collections.new('Temporary socket cutters')
scene.collection.children.link(cutters)
records = []

for value, (normal, axis_u, axis_v) in faces.items():
    n, u, v = Vector(normal), Vector(axis_u), Vector(axis_v)
    radius = .33 if value == 1 else (.24 if value == 4 else (.215 if value == 6 else .235))
    for index, (px, py) in enumerate(patterns[value]):
        center = u * px + v * py
        bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=.32,
                                           location=center + n * 1.03)
        cutter = bpy.context.object
        cutter.rotation_euler = n.to_track_quat('Z', 'Y').to_euler()
        for coll in list(cutter.users_collection):
            coll.objects.unlink(cutter)
        cutters.objects.link(cutter)
        # Smooth spherical bowl: center deeper than rim, entirely below the face.
        # Normals face into the cavity; curvature and shading must both be concave.
        count, ring_count = 32, 8
        aperture = radius * .990
        sag = aperture * .30
        sphere_radius = (aperture * aperture + sag * sag) / (2 * sag)
        rim = .989
        bottom = rim - sag
        sphere_center = bottom + sphere_radius
        vertices = [tuple(center + n * bottom)]
        normals = [tuple(n)]
        polygons = []
        for ring in range(1, ring_count + 1):
            r = aperture * ring / ring_count
            height = math.sqrt(sphere_radius * sphere_radius - r * r)
            for j in range(count):
                angle = j * math.tau / count
                radial = u * (r * math.cos(angle)) + v * (r * math.sin(angle))
                vertices.append(tuple(center + radial + n * (sphere_center - height)))
                normals.append(tuple((-radial + n * height) / sphere_radius))
        for j in range(count):
            polygons.append((0, 1 + j, 1 + (j + 1) % count))
        for ring in range(ring_count - 1):
            for j in range(count):
                a, b = 1 + ring * count + j, 1 + ring * count + (j + 1) % count
                c, d = a + count, b + count
                polygons.append((a, c, d, b))
        # Check every ring rises from the bowl floor toward the recessed lip.
        depths = [(Vector(vertices[0]) - center).dot(n)]
        depths.extend((Vector(vertices[1 + ring * count]) - center).dot(n)
                      for ring in range(ring_count))
        assert all(a < b for a, b in zip(depths, depths[1:])), 'Pip must be concave'
        assert .88 < depths[0] < depths[-1] < 1, 'Pip intersects socket floor or face'
        mesh = bpy.data.meshes.new('Smooth concave spherical bowl %d.%d' % (value, index + 1))
        mesh.from_pydata(vertices, [], polygons)
        mesh.update()
        obj = bpy.data.objects.new('Face %d - pip %d' % (value, index + 1), mesh)
        model.objects.link(obj)
        mesh.materials.append(red if value in (1, 4) else blue)
        for poly in mesh.polygons:
            poly.use_smooth = True
        mesh.normals_split_custom_set_from_vertices(normals)
        records.append({'face': value, 'pip': index + 1, 'center': [px, py],
                        'normal': list(normal), 'radius': radius,
                        'color': 'matte-red' if value in (1, 4) else 'matte-blue',
                        'surface': 'concave spherical bowl recessed into socket',
                        'sphereRadius': sphere_radius, 'bottom': bottom,
                        'rim': rim, 'roughness': .82,
                        'metallic': 0, 'clearcoat': 0})

bpy.context.view_layer.objects.active = body
body.select_set(True)
boolean = body.modifiers.new('All 21 real socket recesses', 'BOOLEAN')
boolean.operation = 'DIFFERENCE'
boolean.operand_type = 'COLLECTION'
boolean.collection = cutters
boolean.solver = 'EXACT'
bpy.ops.object.modifier_apply(modifier=boolean.name)
for obj in list(cutters.objects):
    bpy.data.objects.remove(obj, do_unlink=True)
bpy.data.collections.remove(cutters)
bevel = body.modifiers.new('Soft socket lips', 'BEVEL')
bevel.width = .010
bevel.segments = 2
bevel.limit_method = 'ANGLE'
bevel.angle_limit = .7
bpy.ops.object.modifier_apply(modifier=bevel.name)
for poly in body.data.polygons:
    poly.use_smooth = True
weighted = body.modifiers.new('Resin face normals', 'WEIGHTED_NORMAL')
weighted.keep_sharp = True
weighted.weight = 50
bpy.ops.object.modifier_apply(modifier=weighted.name)
body['reference'] = 'assets/dice-perspective/die-1.png through die-6.png'
body['opposite_faces'] = '1+6, 2+5, 3+4'
body['pip_count'] = 21

scene.world.color = (.15, .15, .15)
world = scene.world
world.use_nodes = True
background = next(node for node in world.node_tree.nodes if node.type == 'BACKGROUND')
background.inputs['Color'].default_value = (.30, .32, .36, 1)
background.inputs['Strength'].default_value = .45

def area(name, location, energy, size, target=(0, 0, 0)):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat('-Z', 'Y').to_euler()

area('Key softbox', (-3.5, -4.5, 6), 650, 4)
area('Front fill', (4.5, -2.5, 3), 280, 3)
area('Top rim', (1, 4, 5), 450, 3)
bpy.ops.object.camera_add()
camera = bpy.context.object
camera.name = 'Model review camera'
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 3.75
scene.camera = camera

def camera_angle(elevation):
    angle = math.radians(elevation)
    camera.location = Vector((math.cos(angle) / math.sqrt(2), -math.cos(angle) / math.sqrt(2), math.sin(angle))) * 8
    camera.rotation_euler = (-camera.location).to_track_quat('-Z', 'Y').to_euler()

camera_angle(45)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 40
scene.cycles.use_denoising = True
scene.render.resolution_x = 760
scene.render.resolution_y = 760
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.view_settings.view_transform = 'AgX'
scene.view_settings.exposure = .4

# Export only the model; preview lighting and camera stay in the editable .blend.
bpy.ops.object.select_all(action='DESELECT')
for obj in model.objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.export_scene.gltf(filepath=str(OUT / 'ivory-matte-dice.glb'),
                          export_format='GLB', use_selection=True,
                          export_apply=True, export_cameras=False, export_lights=False,
                          export_extras=True, export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'ivory-matte-dice.blend'))
triangles = 0
for obj in model.objects:
    obj.data.calc_loop_triangles()
    triangles += len(obj.data.loop_triangles)
manifest = {
    'status': 'model preview - not integrated into mini-program',
    'revision': '2026-09-07 matte concave spherical pips',
    'sourceSprites': {f'die-{i}.png': hashlib.sha256((ROOT / f'assets/dice-perspective/die-{i}.png').read_bytes()).hexdigest() for i in range(1, 7)},
    'faceNormalsBlender': {str(k): list(v[0]) for k, v in faces.items()},
    'oppositePairs': [[1, 6], [2, 5], [3, 4]],
    'pips': records, 'totalPips': len(records), 'triangles': triangles,
    'glbBytes': (OUT / 'ivory-matte-dice.glb').stat().st_size,
}
(OUT / 'model-manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf8')
print('MODEL_RESULT ' + json.dumps({k: manifest[k] for k in ('totalPips', 'triangles', 'glbBytes')}), flush=True)
for label, elevation in [('reference-angle', 30), ('clear-top-angle', 50)]:
    camera_angle(elevation)
    scene.render.filepath = str(OUT / (label + '.png'))
    bpy.ops.render.render(write_still=True)
print('MODEL_RENDER_COMPLETE', flush=True)
