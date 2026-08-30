const DICE_COUNT = 5
const PIP_KEYS = ['tl', 'tr', 'ml', 'mc', 'mr', 'bl', 'br']

const VISIBLE_PIPS = {
  1: ['mc'],
  2: ['tl', 'br'],
  3: ['tl', 'mc', 'br'],
  4: ['tl', 'tr', 'bl', 'br'],
  5: ['tl', 'tr', 'mc', 'bl', 'br'],
  6: ['tl', 'tr', 'ml', 'mr', 'bl', 'br']
}

function rollDie(random = Math.random) {
  const sample = random()

  if (sample < 0 || sample >= 1) {
    throw new RangeError('random() must return a number from 0 up to, but not including, 1')
  }

  return Math.floor(sample * 6) + 1
}

function rollDice(random = Math.random) {
  return Array.from({ length: DICE_COUNT }, () => rollDie(random))
}

function createDieModel(value, index) {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new RangeError('die value must be an integer between 1 and 6')
  }

  const visiblePips = VISIBLE_PIPS[value]

  return {
    id: `die-${index}`,
    value,
    pips: PIP_KEYS.map((key) => ({
      key,
      visible: visiblePips.includes(key)
    }))
  }
}

module.exports = {
  DICE_COUNT,
  createDieModel,
  rollDie,
  rollDice
}
