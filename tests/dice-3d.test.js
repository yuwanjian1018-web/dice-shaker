const test = require('node:test')
const assert = require('node:assert/strict')
const { createLayout, fits, separated } = require('../utils/dice-3d-layout')
const { createScopedThreejs } = require('../vendor/threejs-miniprogram/index')
const {
  createAssembly, createDiceBatch, choosePixelRatio, chooseShadowSize,
  shakeEnvelope, DETAIL_PIXEL_BUDGET, MOTION_PIXEL_BUDGET, DETAIL_OVERSAMPLE, SHAKE_SETTLE_MS
} = require('../utils/shaker-3d')
const { SHAKE_DURATION_MS } = require('../utils/game')
const model = require('../assets/models/cup-scene')
const fs = require('node:fs')
const path = require('node:path')

test('settled rendering supersamples while motion resolution and shadows remain bounded', () => {
  const width = 430, height = 642
  const nativeDetail = choosePixelRatio(3, width, height, DETAIL_PIXEL_BUDGET)
  const detail = choosePixelRatio(3, width, height, DETAIL_PIXEL_BUDGET, 1, DETAIL_OVERSAMPLE)
  const motion = choosePixelRatio(3, width, height, MOTION_PIXEL_BUDGET)
  const reducedMotion = choosePixelRatio(3, width, height, MOTION_PIXEL_BUDGET, .7)
  assert.ok(detail > nativeDetail && detail <= 4.25)
  assert.ok(width * height * detail * detail <= DETAIL_PIXEL_BUDGET + 1)
  assert.ok(motion >= 2 && motion < nativeDetail)
  assert.ok(reducedMotion >= 1 && reducedMotion < motion)
  assert.equal(choosePixelRatio(1, 375, 600, DETAIL_PIXEL_BUDGET), 1)
  assert.equal(chooseShadowSize(false, 0, 4096), 2048)
  assert.equal(chooseShadowSize(true, 0, 4096), 1024)
  assert.equal(chooseShadowSize(false, 1, 4096), 1024)
  assert.equal(chooseShadowSize(false, 0, 1024), 1024)
})

test('the final shake interval eases continuously to the neutral pose', () => {
  const start = SHAKE_DURATION_MS - SHAKE_SETTLE_MS
  const samples = [0, .25, .5, .75, 1].map(step => shakeEnvelope(start + step * SHAKE_SETTLE_MS))
  assert.equal(shakeEnvelope(start - 1), 1)
  assert.equal(samples[0], 1)
  assert.equal(samples[samples.length - 1], 0)
  for (let i = 1; i < samples.length; i++) assert.ok(samples[i] < samples[i - 1])
  assert.ok(shakeEnvelope(SHAKE_DURATION_MS - 8) < .01)
})

test('face two uses larger pips and matching larger body sockets', () => {
  const bytes = fs.readFileSync(path.resolve(__dirname, '../assets/models/cup-scene.bin'))
  const read = index => {
    const accessor = model.accessors[index], view = model.bufferViews[accessor.bufferView]
    return new Float32Array(bytes.buffer, bytes.byteOffset + (view.byteOffset || 0) + (accessor.byteOffset || 0), accessor.count * 3)
  }
  const node = model.nodes.find(item => item.name && item.name.startsWith('Dice 1'))
  const mesh = model.meshes[node.mesh]
  const primitive = name => mesh.primitives.find(item => model.materials[item.material].name === name)
  const faceTwoCenters = [[-.465, .465], [.465, -.465]]
  const faceThreeCenters = [[.465, .465], [0, 0], [-.465, -.465]]
  function radius(item, face, centers, lower) {
    const positions = read(item.attributes.POSITION)
    let result = 0, found = 0
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i + 1], z = positions[i + 2]
      if ((face === 2 ? z : x) <= .84) continue
      const a = face === 2 ? x : y, b = face === 2 ? y : z
      const nearest = Math.min(...centers.map(([ca, cb]) => Math.hypot(a - ca, b - cb)))
      if (nearest > lower && nearest < .32) { result = Math.max(result, nearest); found += 1 }
    }
    assert.ok(found > 0)
    return result
  }
  const body = primitive('Ivory polished resin')
  const blue = primitive('Matte blue spherical inset')
  const twoPip = radius(blue, 2, faceTwoCenters, 0)
  const regularPip = radius(blue, 3, faceThreeCenters, 0)
  const twoSocket = radius(body, 2, faceTwoCenters, .16)
  const regularSocket = radius(body, 3, faceThreeCenters, .16)
  assert.ok(twoPip / regularPip > 1.1 && twoPip / regularPip < 1.14)
  assert.ok(twoSocket / regularSocket > 1.1 && twoSocket / regularSocket < 1.14)
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

test('identical dice are packed into three draw batches without changing their transformed vertices', async () => {
  const THREE = createScopedThreejs({ width: 375, height: 600 })
  const bytes = fs.readFileSync(path.resolve(__dirname, '../assets/models/cup-scene.bin'))
  const binary = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const assembly = createAssembly(THREE, binary, async () => ({ width: 512, height: 512 }))
  await assembly.ready
  const base = assembly.nodes.find(n => n.name === 'BasePivot')
  const dice = assembly.nodes.filter(n => n.name.startsWith('Dice '))
  const extra = dice[0].clone(true)
  base.add(extra); dice.push(extra)
  const source = dice[0].children[0].geometry.attributes.position
  const first = new THREE.Vector3().fromBufferAttribute(source, 0)
  const batch = createDiceBatch(THREE, dice, base, assembly.resources)
  dice[0].position.set(-1.2, .578, -3.7)
  dice[0].scale.setScalar(.47)
  dice[0].quaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), .37)
  dice[0].updateMatrix()
  const expected = first.clone().applyMatrix4(dice[0].matrix)
  batch.update(5)

  assert.equal(batch.parts.length, 3)
  assert.ok(dice.every(die => die.children.length === 0))
  assert.deepEqual(batch.parts.map(part => part.mesh.castShadow), [true, false, false])
  for (const part of batch.parts) assert.equal(part.mesh.geometry.drawRange.count, part.indexCount * 5)
  const actual = new THREE.Vector3().fromBufferAttribute(batch.parts[0].targetPosition, 0)
  assert.ok(actual.distanceTo(expected) < 1e-6)
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
