const test = require('node:test')
const assert = require('node:assert/strict')
const { createShakeDetector } = require('../utils/shake-detector')

test('stationary gravity, small movements and malformed samples do not shake', () => {
  let time = 0
  const detector = createShakeDetector({ now: () => time })
  for (let i = 0; i < 100; i++) {
    time += 100
    assert.equal(detector.push({ x: Math.sin(i) * .05, y: 0, z: 1 }), false)
  }
  assert.equal(detector.push({ x: NaN, y: 0, z: 1 }), false)
  assert.equal(detector.push(null), false)
})

test('requires two impacts, prevents repeated rolls and resets stale samples', () => {
  let time = 0
  const detector = createShakeDetector({ now: () => time })
  const sample = x => detector.push({ x, y: 0, z: 1 })
  assert.equal(sample(0), false)
  time = 100; assert.equal(sample(1.5), false)
  time = 200; assert.equal(sample(-1.5), true)
  time = 300; assert.equal(sample(1.5), false)
  time = 2100; detector.reset(); assert.equal(sample(-2), false)
  time = 2200; assert.equal(sample(2), false)
  time = 2300; assert.equal(sample(-2), true)
})
