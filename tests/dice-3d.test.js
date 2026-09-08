const test = require('node:test')
const assert = require('node:assert/strict')
const { createLayout, fits, separated } = require('../utils/dice-3d-layout')
const { createScopedThreejs } = require('../vendor/threejs-miniprogram/index')
const { createAssembly, choosePixelRatio, DETAIL_PIXEL_BUDGET, MOTION_PIXEL_BUDGET } = require('../utils/shaker-3d')
const model = require('../assets/models/cup-scene')
const fs = require('node:fs')
const path = require('node:path')

test('settled rendering uses a sharper pixel budget while motion remains bounded', () => {
  const detail = choosePixelRatio(3, 375, 600, DETAIL_PIXEL_BUDGET)
  const motion = choosePixelRatio(3, 375, 600, MOTION_PIXEL_BUDGET)
  const reducedMotion = choosePixelRatio(3, 375, 600, MOTION_PIXEL_BUDGET, .7)
  assert.equal(detail, 3)
  assert.ok(motion > 2 && motion < detail)
  assert.ok(reducedMotion >= 1 && reducedMotion < motion)
  assert.equal(choosePixelRatio(1, 375, 600, DETAIL_PIXEL_BUDGET), 1)
})

test('one through six dice fit inside the real tray and do not intersect', () => {
  let seed = 9271
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let count = 1; count <= 6; count++) for (let roll = 0; roll < 80; roll++) {
    const layout = createLayout(count, random)
    assert.equal(layout.length, count)
    assert.ok(layout.every(fits))
    layout.forEach((p, i) => layout.slice(i + 1).forEach(q => assert.ok(separated(p, q))))
  }
})

// Back-face culling is only invisible while every triangle faces the way its
// shading normal claims and the shells stay closed. Re-exporting the model must
// not quietly break that, so the guarantee is checked rather than assumed.
test('every packaged triangle is wound to match its normal, so culled faces are unseen', () => {
  const bytes = fs.readFileSync(path.resolve(__dirname, '../assets/models/cup-scene.bin'))
  const read = index => {
    const a = model.accessors[index], view = model.bufferViews[a.bufferView]
    const Type = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType]
    return new Type(bytes.buffer, bytes.byteOffset + (view.byteOffset || 0) + (a.byteOffset || 0),
      a.count * { SCALAR: 1, VEC3: 3 }[a.type])
  }
  let checked = 0
  for (const mesh of model.meshes) for (const primitive of mesh.primitives) {
    const position = read(primitive.attributes.POSITION), normal = read(primitive.attributes.NORMAL)
    const index = read(primitive.indices)
    for (let i = 0; i < index.length; i += 3) {
      const [a, b, c] = [index[i], index[i + 1], index[i + 2]]
      const u = [0, 1, 2].map(j => position[b * 3 + j] - position[a * 3 + j])
      const v = [0, 1, 2].map(j => position[c * 3 + j] - position[a * 3 + j])
      const face = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
      const shading = [0, 1, 2].map(j => normal[a * 3 + j] + normal[b * 3 + j] + normal[c * 3 + j])
      const dot = face.reduce((sum, value, j) => sum + value * shading[j], 0)
      assert.ok(dot > 0, `${mesh.name}: triangle ${i / 3} faces away from its normal`)
      checked += 1
    }
  }
  assert.equal(checked, 26316)
})

test('the loader culls back faces and leaves recessed pips out of the depth pass', async () => {
  const THREE = createScopedThreejs({ width: 375, height: 600 })
  const bytes = fs.readFileSync(path.resolve(__dirname, '../assets/models/cup-scene.bin'))
  const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const assembly = createAssembly(THREE, binary, async () => ({ width: 512, height: 512 }))
  await assembly.ready
  assert.ok(assembly.resources.materials.every(material => material.side === THREE.FrontSide))
  const casters = new Map()
  assembly.root.traverse(mesh => { if (mesh.isMesh) casters.set(mesh.material.name, mesh.castShadow) })
  assert.ok([...casters.keys()].some(name => /spherical inset/.test(name)))
  for (const [name, castShadow] of casters) assert.equal(castShadow, !/spherical inset/.test(name), name)
})

test('the packaged meshes preserve upward lid clearance over the entire opening', async () => {
  const THREE = createScopedThreejs({ width: 375, height: 600 })
  const bytes = fs.readFileSync(path.resolve(__dirname, '../assets/models/cup-scene.bin'))
  const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const assembly = createAssembly(THREE, binary, async () => ({ width: 512, height: 512 }))
  await assembly.ready
  const lid = assembly.nodes.find(n => n.name === 'LidPivot')
  const tray = assembly.nodes.find(n => n.name.startsWith('Base -'))
  let last = -Infinity
  const v = new THREE.Vector3()
  function extreme(node, minimum) {
    let result = minimum ? Infinity : -Infinity
    node.traverse(mesh => {
      if (!mesh.isMesh) return
      const pos = mesh.geometry.attributes.position
      for (let k = 0; k < pos.count; k++) {
        v.fromBufferAttribute(pos, k).applyMatrix4(mesh.matrixWorld)
        result = minimum ? Math.min(result, v.y) : Math.max(result, v.y)
      }
    })
    return result
  }
  for (let i = 0; i <= 200; i++) {
    assembly.pose(i / 200)
    const lowest = extreme(lid, true)
    assert.ok(lowest >= last - .001, `lid descends at ${i / 200}`)
    if (i >= 20) assert.ok(lowest > extreme(tray, false), `lid below base at ${i / 200}`)
    last = lowest
  }
  assert.ok(last - extreme(tray, false) > .4)
})
