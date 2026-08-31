const test = require('node:test')
const assert = require('node:assert/strict')
const modulePath = require.resolve('../pages/index/index')
const { COVER_DURATION_MS, SHAKE_DURATION_MS } = require('../utils/game')

function setup(t) {
  const previousPage = global.Page
  const previousWx = global.wx
  const calls = { play: 0, stop: 0, destroy: 0, listen: 0, unlisten: 0 }
  const audio = { stop() { calls.stop++ }, play() { calls.play++ }, destroy() { calls.destroy++ }, onError(fn) { this.error = fn }, onPlay(fn) { this.played = fn } }
  global.wx = { createInnerAudioContext: () => audio, vibrateShort() {}, onAccelerometerChange() { calls.listen++ }, offAccelerometerChange() { calls.unlisten++ }, startAccelerometer() {}, stopAccelerometer() {} }
  let definition
  global.Page = value => { definition = value }
  delete require.cache[modulePath]
  require(modulePath)
  const page = { ...definition, data: { ...definition.data }, setData(patch) { this.data = { ...this.data, ...patch } } }
  t.mock.timers.enable({ apis: ['setTimeout'] })
  page.onLoad(); page.onShow()
  t.after(() => {
    page.onUnload()
    if (previousPage === undefined) delete global.Page; else global.Page = previousPage
    if (previousWx === undefined) delete global.wx; else global.wx = previousWx
    delete require.cache[modulePath]
  })
  return { page, calls, audio }
}

test('sound begins with the shake, stops on completion, and lock prevents restart', t => {
  const { page, calls, audio } = setup(t)
  assert.equal(audio.src, '/assets/audio/dice-shake.wav')
  page.handleRoll(); assert.equal(calls.play, 0)
  t.mock.timers.tick(COVER_DURATION_MS)
  assert.equal(page.data.phase, 'shaking'); assert.equal(calls.play, 1)
  const stops = calls.stop
  t.mock.timers.tick(SHAKE_DURATION_MS)
  assert.equal(page.data.phase, 'covered'); assert.ok(calls.stop > stops)
  page.handleToggleLock(); page.handleRoll()
  t.mock.timers.tick(2000)
  assert.equal(calls.play, 1)
  page.handleToggleLock(); page.handleRoll(); t.mock.timers.tick(COVER_DURATION_MS)
  assert.equal(calls.play, 2)
  page.handleToggleLock()
  assert.equal(page.data.phase, 'covered'); assert.equal(page.data.isLocked, true)
})

test('settings draft cancels or applies, clamps boundaries and blocks background rolls', t => {
  const { page } = setup(t)
  page.handleOpenSettings(); page.handleIncreaseCount(); page.handleIncreaseCount()
  assert.equal(page.data.draftDiceCount, 6)
  page.handleRoll(); assert.equal(page.data.isBusy, false)
  page.handleCloseSettings(); assert.equal(page.data.diceCount, 5)
  page.handleOpenSettings()
  for (let i = 0; i < 8; i++) page.handleDecreaseCount()
  assert.equal(page.data.draftDiceCount, 1)
  page.handleSaveSettings(); assert.equal(page.data.diceCount, 1)
  page.handleToggleLock(); page.handleOpenSettings(); page.handleIncreaseCount()
  assert.equal(page.data.draftDiceCount, 1)
})

test('swipe reveal preserves values; horizontal swipes do not reveal; hide stops sound/listeners', t => {
  const { page, calls } = setup(t)
  const original = page.data.dice.map(d => d.value)
  const swipe = (x, y) => {
    page.handleTouchStart({ touches: [{ clientX: 100, clientY: 300 }] })
    page.handleTouchEnd({ changedTouches: [{ clientX: x, clientY: y }] })
  }
  swipe(200, 295); assert.equal(page.data.isLidOpen, false)
  swipe(102, 200); t.mock.timers.tick(420)
  assert.equal(page.data.isLidOpen, true)
  assert.deepEqual(page.data.dice.map(d => d.value), original)
  page.handleRoll(); t.mock.timers.tick(COVER_DURATION_MS)
  const stops = calls.stop
  page.onHide()
  assert.equal(page.data.isBusy, false); assert.ok(calls.stop > stops)
  assert.equal(calls.unlisten, 1)
  page.handleRoll(); assert.equal(page.data.isBusy, false)
  page.onShow(); assert.equal(calls.listen, 2)
})
