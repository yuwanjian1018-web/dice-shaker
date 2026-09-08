const DICE_COUNT = 5

function rollDie(random = Math.random) {
  const sample = random()

  if (!Number.isFinite(sample) || sample < 0 || sample >= 1) {
    throw new RangeError('random() must return a number from 0 up to, but not including, 1')
  }

  return Math.floor(sample * 6) + 1
}

function rollDice(random = Math.random, count = DICE_COUNT) {
  if (!Number.isInteger(count) || count < 1 || count > 6) throw new RangeError('dice count must be an integer between 1 and 6')
  return Array.from({ length: count }, () => rollDie(random))
}

function createDieModel(value, index) {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new RangeError('die value must be an integer between 1 and 6')
  }

  return { id: `die-${index}`, value }
}

module.exports = {
  DICE_COUNT,
  createDieModel,
  rollDie,
  rollDice
}
