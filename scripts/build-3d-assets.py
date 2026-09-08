"""Derive mobile assets from the approved V3 GLB without simplifying geometry.
Run with Python + Pillow. Only texture encoding and lossless storage change.
"""
from pathlib import Path
import json,struct,io,hashlib,base64
from PIL import Image

def compact_meshes(doc, binary):
    """Drop unused UVs and merge byte-identical vertices, preserving triangles."""
    source_accessors, source_views = doc['accessors'], doc['bufferViews']
    payload, accessors, views = bytearray(), [], []

    def read(index):
        a = source_accessors[index]
        v = source_views[a['bufferView']]
        assert not a.get('sparse') and not v.get('byteStride')
        stride = {5121: 1, 5123: 2, 5125: 4, 5126: 4}[a['componentType']] * {'SCALAR': 1, 'VEC2': 2, 'VEC3': 3, 'VEC4': 4}[a['type']]
        offset = v.get('byteOffset', 0) + a.get('byteOffset', 0)
        return [bytes(binary[offset + i * stride:offset + (i + 1) * stride]) for i in range(a['count'])]

    def write(index, rows, target=None, indices=False):
        payload.extend(b'\0' * (-len(payload) % 4))
        packed = b''.join(rows)
        view = {'buffer': 0, 'byteOffset': len(payload), 'byteLength': len(packed)}
        if target is not None:
            view['target'] = target
        omitted = {'bufferView', 'byteOffset'} | ({'min', 'max'} if indices else set())
        a = {k: v for k, v in source_accessors[index].items() if k not in omitted}
        a.update(bufferView=len(views), count=len(rows))
        views.append(view)
        accessors.append(a)
        payload.extend(packed)
        return len(accessors) - 1

    records = []
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            material = doc['materials'][primitive['material']]
            pbr = material.get('pbrMetallicRoughness', {})
            # Runtime-generated fibre maps also require UV coordinates.
            uses_uv = (any(k in material for k in ('normalTexture', 'occlusionTexture', 'emissiveTexture'))
                       or any(k in pbr for k in ('baseColorTexture', 'metallicRoughnessTexture'))
                       or any(word in material['name'] for word in ('suede', 'felt')))
            attributes = {name: index for name, index in primitive['attributes'].items()
                          if name != 'TEXCOORD_0' or uses_uv}
            rows = {name: read(index) for name, index in attributes.items()}
            count = len(rows['POSITION'])
            assert all(len(values) == count for values in rows.values())
            unique, representatives, remap = {}, [], []
            for i in range(count):
                key = b''.join(values[i] for values in rows.values())
                if key not in unique:
                    unique[key] = len(representatives)
                    representatives.append(i)
                remap.append(unique[key])
            primitive['attributes'] = {
                name: write(index, [rows[name][i] for i in representatives], 34962)
                for name, index in attributes.items()
            }
            index = primitive['indices']
            fmt = {5121: '<B', 5123: '<H', 5125: '<I'}[source_accessors[index]['componentType']]
            indices = [struct.pack(fmt, remap[struct.unpack(fmt, value)[0]]) for value in read(index)]
            primitive['indices'] = write(index, indices, 34963, indices=True)
            records.append({'material': material['name'], 'before': count,
                            'after': len(representatives), 'uvRetained': uses_uv})
    mapping = {}
    for animation in doc.get('animations', []):
        for sampler in animation['samplers']:
            for key in ('input', 'output'):
                index = sampler[key]
                if index not in mapping:
                    mapping[index] = write(index, read(index))
                sampler[key] = mapping[index]
    doc['accessors'], doc['bufferViews'] = accessors, views
    return payload, records

ROOT=Path(__file__).resolve().parent.parent
SOURCE=ROOT/'design/cup-model-v3/cup-material-v3.glb'
OUT=ROOT/'assets/models'
OUT.mkdir(parents=True,exist_ok=True)
data=SOURCE.read_bytes();length=struct.unpack_from('<I',data,12)[0]
doc=json.loads(data[20:20+length]);binary=data[28+length:]
old_views=doc['bufferViews'];image_views={im['bufferView'] for im in doc['images']}
payload=bytearray();views=[];mapping={}
for i,view in enumerate(old_views):
    if i in image_views: continue
    payload.extend(b'\0'*(-len(payload)%4))
    mapping[i]=len(views)
    start=view.get('byteOffset',0)
    views.append({**view,'byteOffset':len(payload)})
    payload.extend(binary[start:start+view['byteLength']])
for accessor in doc['accessors']: accessor['bufferView']=mapping[accessor['bufferView']]
for index,image in enumerate(doc['images']):
    view=old_views[image['bufferView']];start=view.get('byteOffset',0)
    pic=Image.open(io.BytesIO(binary[start:start+view['byteLength']])).convert('RGB')
    # Spend resolution on the scanned surface normals; colour/roughness remain
    # compact. Power-of-two maps retain repeat/mipmaps on WebGL 1.
    is_normal=any(m.get('normalTexture',{}).get('index') in [i for i,t in enumerate(doc['textures']) if t['source']==index] for m in doc['materials'])
    size=1024 if is_normal else 512
    pic.thumbnail((size,size),Image.Resampling.LANCZOS)
    name=f'cup-material-{index}.jpg'
    # Retain 1024px normals and full-resolution colour channels (no chroma
    # subsampling). Choose the highest JPEG quality that fits the byte budget.
    for quality in range(82 if is_normal else 85, 39, -1):
        encoded = io.BytesIO()
        pic.save(encoded,format='JPEG',quality=quality,optimize=True,subsampling=0)
        if encoded.tell() <= (160 if is_normal else 200) * 1024:
            break
    else:
        raise ValueError(f'Texture {index} exceeds its byte budget')
    (OUT/name).write_bytes(encoded.getvalue())
    doc['images'][index]={'uri':name}
occlusion_path=ROOT/'design/cup-model-v3/surface-occlusion.json'
if occlusion_path.exists():
    occlusion=json.loads(occlusion_path.read_text(encoding='utf8'))
    assert occlusion['sourceSha256']==hashlib.sha256(data).hexdigest(), 'Rebake occlusion for the changed source model'
    for entry in occlusion['primitives']:
        primitive=doc['meshes'][entry['mesh']]['primitives'][entry['primitive']]
        values=base64.b64decode(entry['values'])
        assert len(values)==doc['accessors'][primitive['attributes']['POSITION']]['count']
        payload.extend(b'\0'*(-len(payload)%4))
        primitive['attributes']['_OCCLUSION']=len(doc['accessors'])
        doc['accessors'].append({'bufferView':len(views),'componentType':5121,'count':len(values),'type':'SCALAR','normalized':True})
        views.append({'buffer':0,'byteOffset':len(payload),'byteLength':len(values),'target':34962})
        payload.extend(values)
doc['bufferViews']=views
payload,vertex_report=compact_meshes(doc,payload)
doc['buffers']=[{'byteLength':len(payload),'uri':'cup-scene.bin'}]
doc.pop('extensionsRequired',None)
for node in doc['nodes']:
    if 'extras' in node: node['extras'].pop('reference',None)
(OUT/'cup-scene.bin').write_bytes(payload)
(OUT/'cup-scene.js').write_text('module.exports = '+json.dumps(doc,separators=(',',':'),ensure_ascii=False)+'\n',encoding='utf8')
report={'sourceSha256':hashlib.sha256(data).hexdigest(),'geometrySimplified':False,'binaryBytes':len(payload),
        'vertices':vertex_report,
        'bakedOcclusion':occlusion_path.exists(),
        'files':{p.name:p.stat().st_size for p in OUT.iterdir() if p.is_file()},
        'textures':'1024 normal map, 512 colour/roughness maps; original 2K textures retained in design source GLB',
        'source':'https://ambientcg.com/view?id=Leather037','license':'CC0'}
(ROOT/'design/cup-model-v3/mobile-assets.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print(json.dumps(report))
