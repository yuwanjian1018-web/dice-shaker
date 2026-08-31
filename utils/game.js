const { createDieModel, rollDice } = require('./dice')

const COVER_DURATION_MS = 280
const SHAKE_DURATION_MS = 1200
const OPEN_DURATION_MS = 420

function toDiceModels(values) {
  return values.map((value, index) => createDieModel(value, index))
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
    isLidOpen: false,
    hasRolled: false,
    actionLabel: '摇一摇',
    lidActionLabel: '打开盖子',
    lidStateLabel: '已合盖',
    statusText: '摇一摇，再打开看看',
    dice: toDiceModels(initialValues)
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
      isLidOpen: false,
      actionLabel: '摇动中',
      lidActionLabel: '请稍候',
      lidStateLabel: '准备摇动',
      statusText: '先盖好，留一点小悬念'
    })

    after(COVER_DURATION_MS, () => {
      update({
        phase: 'shaking',
        lidStateLabel: '摇动中',
        statusText: '好手气，正在酝酿'
      })

      after(SHAKE_DURATION_MS, () => {
        const values = rollDice(random)

        // 摇完保持合盖；只有用户主动开盖时才展示本轮骰子。
        update({
          phase: 'covered',
          isBusy: false,
          isLidOpen: false,
          hasRolled: true,
          actionLabel: '摇一摇',
          lidActionLabel: '打开盖子',
          lidStateLabel: '已合盖',
          statusText: '摇好了，打开看看吧',
          dice: toDiceModels(values)
        })
      })
    })

    return true
  }

  function toggleLid() {
    if (disposed || state.isBusy) return false

    if (state.isLidOpen) {
      update({
        phase: 'closing',
        isBusy: true,
        isLidOpen: false,
        lidActionLabel: '合盖中',
        lidStateLabel: '正在合盖',
        statusText: '盖好，留一点小悬念'
      })
      after(COVER_DURATION_MS, () => {
        update({
          phase: 'covered',
          isBusy: false,
          lidActionLabel: '打开盖子',
          lidStateLabel: '已合盖',
          statusText: state.hasRolled ? '随时打开，还是刚才的骰子' : '摇一摇，再打开看看'
        })
      })
    } else {
      update({
        phase: 'opening',
        isBusy: true,
        isLidOpen: true,
        lidActionLabel: '开盖中',
        lidStateLabel: '正在开盖',
        statusText: '小小惊喜，慢慢揭晓'
      })
      after(OPEN_DURATION_MS, () => {
        update({
          phase: 'revealed',
          isBusy: false,
          lidActionLabel: '合上盖子',
          lidStateLabel: '已开盖',
          statusText: state.hasRolled ? '看看这次的手气' : '准备好了，就摇一摇'
        })
      })
    }

    // 开合只改变盖子状态，不调用随机数，也不改变本轮骰面。
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
    startRoll,
    toggleLid
  }
}

module.exports = {
  COVER_DURATION_MS,
  SHAKE_DURATION_MS,
  OPEN_DURATION_MS,
  createDiceGame
}
