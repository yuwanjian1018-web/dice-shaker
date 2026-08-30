const { createDieModel, rollDice } = require('./dice')

const COVER_DURATION_MS = 280
const SHAKE_DURATION_MS = 1200

function toDiceModels(values) {
  return values.map((value, index) => createDieModel(value, index))
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0)
}

function createDiceGame(options = {}) {
  const random = options.random || Math.random
  const schedule = options.schedule || setTimeout
  const cancel = options.cancel || clearTimeout
  const onChange = options.onChange || (() => {})
  const timers = new Set()
  let disposed = false
  const initialValues = [1, 2, 3, 4, 5]
  let state = {
    phase: 'covered',
    isBusy: false,
    actionLabel: '摇一摇',
    statusText: '点击按钮，摇出你的好运气',
    dice: toDiceModels(initialValues),
    total: sum(initialValues)
  }

  function getState() {
    return {
      ...state,
      dice: state.dice.map((die) => ({
        ...die,
        pips: die.pips.map((pip) => ({ ...pip }))
      }))
    }
  }

  function update(patch) {
    state = { ...state, ...patch }
    onChange(getState())
  }

  function after(delay, callback) {
    const id = schedule(() => {
      timers.delete(id)
      if (!disposed) callback()
    }, delay)
    timers.add(id)
  }

  function startRoll() {
    if (disposed || state.isBusy) return false

    update({
      phase: 'covering',
      isBusy: true,
      actionLabel: '正在摇…',
      statusText: '盖好骰盅，准备开始'
    })

    after(COVER_DURATION_MS, () => {
      update({
        phase: 'shaking',
        statusText: '骰子正在翻滚…'
      })

      after(SHAKE_DURATION_MS, () => {
        const values = rollDice(random)
        const total = sum(values)

        update({
          phase: 'revealed',
          isBusy: false,
          actionLabel: '再摇一次',
          statusText: `结果揭晓！五颗骰子合计 ${total} 点`,
          dice: toDiceModels(values),
          total
        })
      })
    })

    return true
  }

  function dispose() {
    disposed = true
    timers.forEach((id) => cancel(id))
    timers.clear()
  }

  return {
    dispose,
    getState,
    startRoll
  }
}

module.exports = {
  COVER_DURATION_MS,
  SHAKE_DURATION_MS,
  createDiceGame
}
