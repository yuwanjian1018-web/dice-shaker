const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const model = require('../assets/models/cup-scene')

// Compare the shipped mesh against the approved source, not against a second
// implementation of the optimizer. Expanding indices catches winding/order,
// normals, UV seams and occlusion changes even when vertex IDs are remapped.
test('compacted model preserves every triangle corner, used attribute and animation sample', () => {
  const source = fs.readFileSync(path.join(__dirname, '../design/cup-model-v3/cup-material-v3.glb'))
  const jsonLength = source.readUInt32LE(12)
  const original = JSON.parse(source.subarray(20, 20 + jsonLength).toString())
  const originalBinary = source.subarray(28 + jsonLength)
  const binary = fs.readFileSync(path.join(__dirname, '../assets/models/cup-scene.bin'))
  const baked = JSON.parse(fs.readFileSync(path.join(__dirname, '../design/cup-model-v3/surface-occlusion.json'), 'utf8'))

  function rows(doc, bytes, index) {
    const a = doc.accessors[index], view = doc.bufferViews[a.bufferView]
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]
    const stride = size * { 5121: 1, 5123: 2, 5125: 4, 5126: 4 }[a.componentType]
    const offset = (view.byteOffset || 0) + (a.byteOffset || 0)
    assert.ok(offset + a.count * stride <= bytes.length)
    return Array.from({ length: a.count }, (_, i) => bytes.subarray(offset + i * stride, offset + (i + 1) * stride))
  }
  const indices = (doc, bytes, primitive) => rows(doc, bytes, primitive.indices).map(row => row.readUIntLE(0, row.length))
  const expand = (values, indices) => Buffer.concat(indices.map(i => values[i]))
  assert.equal(model.meshes.length, original.meshes.length)
  assert.deepEqual(model.materials, original.materials)
  let triangles = 0
  model.meshes.forEach((mesh, mi) => {
    assert.equal(mesh.primitives.length, original.meshes[mi].primitives.length)
    mesh.primitives.forEach((primitive, pi) => {
      const old = original.meshes[mi].primitives[pi]
      const oldIndices = indices(original, originalBinary, old)
      const newIndices = indices(model, binary, primitive)
      assert.equal(newIndices.length, oldIndices.length)
      assert.equal(primitive.material, old.material)
      triangles += newIndices.length / 3
      for (const name of ['POSITION', 'NORMAL', 'TEXCOORD_0']) {
        if (name === 'TEXCOORD_0' && primitive.attributes[name] === undefined) {
          const material = model.materials[primitive.material]
          assert.ok(!material.normalTexture && !material.pbrMetallicRoughness.baseColorTexture)
          assert.ok(!/suede|felt/.test(material.name))
          continue
        }
        assert.deepEqual(expand(rows(model, binary, primitive.attributes[name]), newIndices),
          expand(rows(original, originalBinary, old.attributes[name]), oldIndices), `${mesh.name}: ${name}`)
      }
      const cavity = baked.primitives.find(e => e.mesh === mi && e.primitive === pi)
      const originalCavity = Array.from(Buffer.from(cavity.values, 'base64'), v => Buffer.from([v]))
      assert.deepEqual(expand(rows(model, binary, primitive.attributes._OCCLUSION), newIndices),
        expand(originalCavity, oldIndices), `${mesh.name}: occlusion`)
    })
  })
  assert.equal(triangles, 26316)
  model.animations.forEach((animation, ai) => {
    const old = original.animations[ai]
    assert.deepEqual(animation.channels, old.channels)
    animation.samplers.forEach((sampler, si) => {
      assert.equal(sampler.interpolation, old.samplers[si].interpolation)
      for (const field of ['input', 'output']) {
        assert.deepEqual(Buffer.concat(rows(model, binary, sampler[field])),
          Buffer.concat(rows(original, originalBinary, old.samplers[si][field])))
      }
    })
  })
})
