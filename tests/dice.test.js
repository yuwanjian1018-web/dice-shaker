const test = require('node:test')
const assert = require('node:assert/strict')

const {
  DICE_COUNT,
  createDieModel,
  rollDie,
  rollDice
} = require('../utils/dice')

test('rollDie maps random boundaries to values from 1 through 6', () => {
  const samples = [0, 1 / 6, 2 / 6, 3 / 6, 4 / 6, 5 / 6, 0.999999999]
  const expected = [1, 2, 3, 4, 5, 6, 6]

  assert.deepEqual(samples.map((sample) => rollDie(() => sample)), expected)
})

test('rollDice returns exactly five dice by default', () => {
  const samples = [0, 0.2, 0.4, 0.6, 0.8]
  let index = 0

  const result = rollDice(() => samples[index++])

  assert.equal(DICE_COUNT, 5)
  assert.deepEqual(result, [1, 2, 3, 4, 5])
})

test('createDieModel exposes the correct visible pip positions', () => {
  const expectedVisibleKeys = {
    1: ['mc'],
    2: ['tl', 'br'],
    3: ['tl', 'mc', 'br'],
    4: ['tl', 'tr', 'bl', 'br'],
    5: ['tl', 'tr', 'mc', 'bl', 'br'],
    6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
  }

  for (let value = 1; value <= 6; value += 1) {
    const model = createDieModel(value, value - 1)
    const visibleKeys = model.pips.filter((pip) => pip.visible).map((pip) => pip.key)

    assert.equal(model.id, `die-${value - 1}`)
    assert.equal(model.value, value)
    assert.deepEqual(visibleKeys, expectedVisibleKeys[value])
  }
})

test('createDieModel rejects values outside a standard die', () => {
  assert.throws(() => createDieModel(0, 0), /between 1 and 6/)
  assert.throws(() => createDieModel(7, 0), /between 1 and 6/)
})
