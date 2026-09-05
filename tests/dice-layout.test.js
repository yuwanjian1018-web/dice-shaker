const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { PNG } = require('pngjs')
const { createDiceLayout, dicePositionStyle } = require('../utils/dice-layout')

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
    return seed / 4294967296
  }
}

// Independent reference measured on assets/tray-black.png's inner floor.
function insideFloor(x, y) {
  return ((x - 400) / 343) ** 2 + ((y - 231) / 141) ** 2 <= 1
}

const lowerOutlines = Array.from({ length: 6 }, (_, index) => {
  const image = PNG.sync.read(fs.readFileSync(path.join(__dirname, `../assets/dice-perspective/die-${index + 1}.png`)))
  const points = []
  // Check the real opaque lower silhouette, not just the nominal layout radius.
  for (let y = 173; y < image.height; y++) {
    let left = image.width, right = -1
    for (let x = 0; x < image.width; x++) if (image.data[(y * image.width + x) * 4 + 3] > 32) {
      left = Math.min(left, x); right = Math.max(right, x)
    }
    if (right >= 0) points.push([left / 240 - 0.5, y / 240 - 0.72], [right / 240 - 0.5, y / 240 - 0.72])
  }
  return points
})

test('actual lower silhouettes remain inside the tray with clearance for every count', () => {
  const random = seededRandom(20260905)
  for (let count = 1; count <= 6; count++) for (let run = 0; run < 1000; run++) {
    const layout = createDiceLayout(count, random)
    assert.equal(layout.length, count)
    for (const pose of layout) {
      // The cup narrows above its outer base; the dice must fit beneath it too.
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        const x = (pose.x + sx * pose.size * 0.5 - 400) / 322
        const y = (pose.y + sy * pose.size * 0.26 - 223) / 139
        assert.ok(x * x + y * y <= 1, 'die extends outside the usable cup cross-section')
      }
      for (const outline of lowerOutlines) for (const [x, y] of outline) {
        // Four offset points require a 10-source-pixel margin to the floor edge.
        for (const [dx, dy] of [[-10, 0], [10, 0], [0, -10], [0, 10]]) {
          assert.ok(insideFloor(pose.x + x * pose.size + dx, pose.y + y * pose.size + dy), 'opaque die silhouette crosses inner rim')
        }
      }
    }
  }
})

test('depth controls size and layering while sprites remain upright', () => {
  const random = seededRandom(27)
  for (let run = 0; run < 200; run++) {
    const poses = createDiceLayout(6, random).sort((a, b) => a.y - b.y)
    for (let index = 0; index < poses.length; index++) {
      const style = dicePositionStyle(poses[index])
      assert.ok(!style.includes('rotate('))
      assert.ok(style.includes('translate(-50%,-72%)'))
      if (index) assert.ok(poses[index].size >= poses[index - 1].size)
      for (let other = 0; other < index; other++) {
        const a = poses[index], b = poses[other]
        assert.ok(((a.x - b.x) / 138) ** 2 + ((a.y - b.y) / 90) ** 2 >= 1, 'larger top faces must stay readable')
      }
    }
  }
})

test('random layouts vary across the usable floor even with six dice', () => {
  const random = seededRandom(1234)
  for (const count of [1, 5, 6]) {
    const firstDice = Array.from({ length: 500 }, () => createDiceLayout(count, random)[0])
    assert.ok(new Set(firstDice.map(die => `${die.x},${die.y}`)).size > 495)
    assert.ok(Math.max(...firstDice.map(die => die.x)) - Math.min(...firstDice.map(die => die.x)) > 350)
    assert.ok(Math.max(...firstDice.map(die => die.y)) - Math.min(...firstDice.map(die => die.y)) > 150)
  }
})

test('constant random sources return safe separate fallback positions within a bounded budget', () => {
  for (const value of [0, 0.5, 0.999999]) {
    let calls = 0
    const layout = createDiceLayout(6, () => { calls++; return value })
    assert.equal(layout.length, 6)
    assert.equal(new Set(layout.map(die => `${die.x},${die.y}`)).size, 6)
    assert.ok(calls <= 28160)
    for (let index = 0; index < layout.length; index++) {
      const pose = layout[index]
      for (let other = 0; other < index; other++) {
        const b = layout[other]
        assert.ok(((pose.x - b.x) / 138) ** 2 + ((pose.y - b.y) / 90) ** 2 >= 1, 'fallback top faces must stay readable')
      }
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
        assert.ok(((pose.x + sx * pose.size * 0.5 - 400) / 322) ** 2 + ((pose.y + sy * pose.size * 0.26 - 223) / 139) ** 2 <= 1, 'fallback extends outside the cup')
      }
      for (const outline of lowerOutlines) for (const [x, y] of outline) {
        for (const [dx, dy] of [[-10, 0], [10, 0], [0, -10], [0, 10]]) {
          assert.ok(insideFloor(pose.x + x * pose.size + dx, pose.y + y * pose.size + dy), 'fallback crosses inner rim')
        }
      }
    }
  }
})

test('invalid counts and random samples are rejected', () => {
  for (const count of [0, 7, 1.5, NaN]) assert.throws(() => createDiceLayout(count), /between 1 and 6/)
  for (const value of [-0.1, 1, NaN, Infinity]) assert.throws(() => createDiceLayout(2, () => value), /random\(\)/)
})
