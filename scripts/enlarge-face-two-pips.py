"""Enlarge only the two recessed pips on face 2 without changing die size.

Run with the checked-in source scene open:
  blender --background design/cup-model-v3/cup-material-v3.blend \
    --python scripts/enlarge-face-two-pips.py

The script updates both the editable Blend mesh and the matching source GLB.
It sets an absolute target radius, so running it again is idempotent.
"""
from pathlib import Path
import json
import math
import struct

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parent.parent
BLEND_PATH = ROOT / 'design/cup-model-v3/cup-material-v3.blend'
GLB_PATH = ROOT / 'design/cup-model-v3/cup-material-v3.glb'

PIP_SCALE = 1.12
PIP_TARGET_RADIUS = 0.2326 * PIP_SCALE
BODY_TARGET_RADIUS = 0.2450 * PIP_SCALE

# Blender is Z-up. Face 2 points toward -Y in the editable source.
BLENDER_CENTERS = ((-0.465, 0.465), (0.465, -0.465))  # X/Z
# glTF is Y-up. The same face points toward +Z after export.
GLTF_CENTERS = ((-0.465, 0.465), (0.465, -0.465))  # X/Y


def material_vertices(mesh, material_index):
    return {
        vertex
        for polygon in mesh.polygons if polygon.material_index == material_index
        for vertex in polygon.vertices
    }


def resize_blend_ring(mesh, vertices, center, target_radius, lower_radius=0.0):
    cx, cz = center
    selected = []
    for index in vertices:
        point = mesh.vertices[index].co
        radius = math.hypot(point.x - cx, point.z - cz)
        if point.y < -0.84 and lower_radius < radius < 0.32:
            selected.append((index, radius))
    if not selected:
        raise RuntimeError(f'No face-two vertices found around {center}')
    current = max(radius for _, radius in selected)
    if math.isclose(current, target_radius, rel_tol=0.0, abs_tol=1e-6):
        return {}, current, len(selected)
    factor = target_radius / current
    for index, _ in selected:
        point = mesh.vertices[index].co
        point.x = cx + (point.x - cx) * factor
        point.z = cz + (point.z - cz) * factor
    return {index: factor for index, _ in selected}, current, len(selected)


def update_blend():
    die = bpy.data.objects.get('Dice 1 - top 1')
    if die is None or die.type != 'MESH':
        raise RuntimeError('Linked source die mesh is unavailable')
    mesh = die.data
    material_by_name = {material.name: index for index, material in enumerate(mesh.materials)}
    body = material_vertices(mesh, material_by_name['Ivory polished resin'])
    blue = material_vertices(mesh, material_by_name['Matte blue spherical inset'])
    old_normals = [normal.vector.copy() for normal in mesh.corner_normals]
    factors = {}
    reports = []
    for center in BLENDER_CENTERS:
        changed, current, count = resize_blend_ring(mesh, body, center, BODY_TARGET_RADIUS, 0.16)
        factors.update(changed)
        reports.append(('body', center, current, BODY_TARGET_RADIUS, count))
        changed, current, count = resize_blend_ring(mesh, blue, center, PIP_TARGET_RADIUS)
        factors.update(changed)
        reports.append(('pip', center, current, PIP_TARGET_RADIUS, count))
    metadata_changed = mesh.get('face_two_pip_scale') != PIP_SCALE
    if metadata_changed:
        mesh['face_two_pip_scale'] = PIP_SCALE
    if 'face_two_pip_complete' in mesh:
        del mesh['face_two_pip_complete']
        metadata_changed = True
    if factors:
        mesh.update()
        corrected = []
        for loop, normal in zip(mesh.loops, old_normals):
            factor = factors.get(loop.vertex_index)
            if factor is not None:
                normal = Vector((normal.x / factor, normal.y, normal.z / factor)).normalized()
            corrected.append(normal)
        mesh.normals_split_custom_set(corrected)
        mesh.update()
    if factors or metadata_changed:
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH), check_existing=False)
    return reports


def read_glb(path):
    data = path.read_bytes()
    magic, version, total = struct.unpack_from('<III', data, 0)
    if magic != 0x46546C67 or version != 2 or total != len(data):
        raise RuntimeError('Expected a valid glTF 2.0 binary')
    json_length, json_type = struct.unpack_from('<II', data, 12)
    if json_type != 0x4E4F534A:
        raise RuntimeError('GLB JSON chunk is missing')
    document = json.loads(data[20:20 + json_length])
    binary_header = 20 + json_length
    binary_length, binary_type = struct.unpack_from('<II', data, binary_header)
    if binary_type != 0x004E4942:
        raise RuntimeError('GLB binary chunk is missing')
    binary = bytearray(data[binary_header + 8:binary_header + 8 + binary_length])
    return document, binary


def vec3_accessor(document, binary, index):
    accessor = document['accessors'][index]
    view = document['bufferViews'][accessor['bufferView']]
    if accessor['componentType'] != 5126 or accessor['type'] != 'VEC3':
        raise RuntimeError('Expected a float VEC3 accessor')
    start = view.get('byteOffset', 0) + accessor.get('byteOffset', 0)
    stride = view.get('byteStride', 12)

    def read(row):
        return list(struct.unpack_from('<fff', binary, start + row * stride))

    def write(row, value):
        struct.pack_into('<fff', binary, start + row * stride, *value)

    return accessor, read, write


def resize_glb_primitive(document, binary, primitive, target_radius, kind):
    position_accessor, read_position, write_position = vec3_accessor(
        document, binary, primitive['attributes']['POSITION'])
    _, read_normal, write_normal = vec3_accessor(
        document, binary, primitive['attributes']['NORMAL'])
    positions = [read_position(index) for index in range(position_accessor['count'])]
    reports = []
    changed = False
    for cx, cy in GLTF_CENTERS:
        selected = []
        for index, (x, y, z) in enumerate(positions):
            radius = math.hypot(x - cx, y - cy)
            lower = 0.16 if kind == 'body' else 0.0
            if z > 0.84 and lower < radius < 0.32:
                selected.append((index, radius))
        if not selected:
            raise RuntimeError(f'No GLB {kind} vertices found around {(cx, cy)}')
        current = max(radius for _, radius in selected)
        if math.isclose(current, target_radius, rel_tol=0.0, abs_tol=1e-6):
            reports.append((kind, (cx, cy), current, target_radius, len(selected)))
            continue
        factor = target_radius / current
        changed = True
        for index, _ in selected:
            x, y, z = positions[index]
            positions[index] = [cx + (x - cx) * factor, cy + (y - cy) * factor, z]
            nx, ny, nz = read_normal(index)
            corrected = Vector((nx / factor, ny / factor, nz)).normalized()
            write_normal(index, corrected)
        reports.append((kind, (cx, cy), current, target_radius, len(selected)))
    if changed:
        for index, position in enumerate(positions):
            write_position(index, position)
        position_accessor['min'] = [min(row[axis] for row in positions) for axis in range(3)]
        position_accessor['max'] = [max(row[axis] for row in positions) for axis in range(3)]
    return reports, changed


def write_glb(path, document, binary):
    document['buffers'][0]['byteLength'] = len(binary)
    encoded = json.dumps(document, separators=(',', ':'), ensure_ascii=False).encode('utf8')
    encoded += b' ' * (-len(encoded) % 4)
    binary += b'\0' * (-len(binary) % 4)
    total = 12 + 8 + len(encoded) + 8 + len(binary)
    output = bytearray(struct.pack('<III', 0x46546C67, 2, total))
    output.extend(struct.pack('<II', len(encoded), 0x4E4F534A))
    output.extend(encoded)
    output.extend(struct.pack('<II', len(binary), 0x004E4942))
    output.extend(binary)
    temporary = path.with_suffix('.glb.tmp')
    temporary.write_bytes(output)
    temporary.replace(path)


def update_glb():
    document, binary = read_glb(GLB_PATH)
    dice_node = next(node for node in document['nodes'] if node.get('name', '').startswith('Dice 1'))
    dice_mesh = document['meshes'][dice_node['mesh']]
    reports = []
    changed = False
    for primitive in dice_mesh['primitives']:
        material = document['materials'][primitive['material']]['name']
        if material == 'Ivory polished resin':
            resized, primitive_changed = resize_glb_primitive(document, binary, primitive, BODY_TARGET_RADIUS, 'body')
            reports.extend(resized); changed = changed or primitive_changed
        elif material == 'Matte blue spherical inset':
            resized, primitive_changed = resize_glb_primitive(document, binary, primitive, PIP_TARGET_RADIUS, 'pip')
            reports.extend(resized); changed = changed or primitive_changed
    if len(reports) != 4:
        raise RuntimeError(f'Expected four GLB resize reports, got {len(reports)}')
    if changed:
        write_glb(GLB_PATH, document, binary)
    return reports


blend_reports = update_blend()
glb_reports = update_glb()
for source, reports in (('Blend', blend_reports), ('GLB', glb_reports)):
    for kind, center, before, after, count in reports:
        print(f'{source} {kind} {center}: radius {before:.6f} -> {after:.6f}, vertices {count}')
