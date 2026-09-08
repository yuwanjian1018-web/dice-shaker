const test = require('node:test')
const assert = require('node:assert/strict')
const { createLayout, fits, separated } = require('../utils/dice-3d-layout')
const { createScopedThreejs } = require('../vendor/threejs-miniprogram/index')
const { createAssembly } = require('../utils/shaker-3d')
const fs = require('node:fs')
const path = require('node:path')

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
