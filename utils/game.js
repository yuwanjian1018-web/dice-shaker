const { createDieModel, rollDice } = require('./dice')

const COVER_DURATION_MS = 280
const SHAKE_DURATION_MS = 1200

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
    lidProgress: 0,
    hasRolled: false,
    rollRevision: 0,
    isLocked: false,
    diceCount: 5,
    actionLabel: '摇一摇',
    lidActionLabel: '向上拖动打开骰盅',
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
    if (disposed || state.isBusy || state.isLocked) return false

    update({
      phase: 'covering',
      isBusy: true,
      isLidOpen: false,
      lidProgress: 0,
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
        const values = rollDice(random, state.diceCount)

        // 摇完保持合盖；只有用户主动开盖时才展示本轮骰子。
        update({
          phase: 'covered',
          isBusy: false,
          isLidOpen: false,
          lidProgress: 0,
          hasRolled: true,
          rollRevision: state.rollRevision + 1,
          actionLabel: '再摇一次',
          lidActionLabel: '向上拖动打开骰盅',
          lidStateLabel: '已合盖',
          statusText: '摇好了，打开看看吧',
          dice: toDiceModels(values)
        })
      })
    })

    return true
  }

  function setLidProgress(progress) {
    if (disposed || state.isBusy || !Number.isFinite(progress)) return false
    const normalized = Math.round(Math.min(1, Math.max(0, progress)) * 1000) / 1000
    const phase = normalized === 0 ? 'covered' : (normalized === 1 ? 'revealed' : 'lid-moving')
    const isLidOpen = normalized === 1

    update({
      phase,
      isLidOpen,
      lidProgress: normalized,
      lidActionLabel: normalized === 0
        ? '向上拖动打开骰盅'
        : (normalized === 1 ? '向下拖动合上骰盅' : '拖动调整骰盅开合位置'),
      lidStateLabel: normalized === 0 ? '已合盖' : (normalized === 1 ? '已完全打开' : `已打开 ${Math.round(normalized * 100)}%`),
      statusText: state.hasRolled ? '拖动骰盅查看本轮结果' : '准备好了，就摇一摇'
    })
    return true
  }

  function dispose() {
    disposed = true
    timers.forEach((id) => cancel(id))
    timers.clear()
  }

  function cancelMotion() {
    if (disposed) return false
    timers.forEach((id) => cancel(id))
    timers.clear()
    const phase = state.lidProgress === 0 ? 'covered' : (state.lidProgress === 1 ? 'revealed' : 'lid-moving')
    update({
      phase, isBusy: false,
      actionLabel: state.hasRolled ? '再摇一次' : '摇一摇',
      lidActionLabel: state.lidProgress === 0
        ? '向上拖动打开骰盅'
        : (state.lidProgress === 1 ? '向下拖动合上骰盅' : '拖动调整骰盅开合位置')
    })
    return true
  }

  function toggleLock() {
    if (disposed) return false
    // 本轮只在摇动完成后提交；取消不改变旧点数。
    if (!state.isLocked && (state.phase === 'shaking' || state.phase === 'covering')) cancelMotion()
    update({ isLocked: !state.isLocked })
    return true
  }

  function setDiceCount(count) {
    if (disposed || state.isBusy || state.isLocked || !Number.isInteger(count) || count < 1 || count > 6) return false
    if (count === state.diceCount) return true
    const values = state.dice.map((die) => die.value)
    while (values.length < count) values.push((values.length % 6) + 1)
    update({ diceCount: count, dice: toDiceModels(values.slice(0, count)), hasRolled: false, actionLabel: '摇一摇' })
    return true
  }

  return {
    dispose,
    getState,
    cancelMotion,
    toggleLock,
    setDiceCount,
    setLidProgress,
    startRoll,
  }
}

module.exports = {
  COVER_DURATION_MS,
  SHAKE_DURATION_MS,
  createDiceGame
}
