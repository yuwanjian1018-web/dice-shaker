const test = require('node:test')
const assert = require('node:assert/strict')
const modulePath = require.resolve('../pages/index/index')
const { COVER_DURATION_MS, SHAKE_DURATION_MS } = require('../utils/game')

function setup(t, options = {}) {
  const previousPage = global.Page
  const previousWx = global.wx
  const calls = { play: 0, stop: 0, destroy: 0, listen: 0, unlisten: 0, sensorStart: [], sensorStop: 0 }
  const storage = { 'dice-shaker-motion-enabled': options.motionEnabled }
  const audio = { stop() { calls.stop += 1 }, play() { calls.play += 1 }, destroy() { calls.destroy += 1 }, onError(fn) { this.error = fn }, onPlay(fn) { this.played = fn } }
  global.wx = {
    createInnerAudioContext: () => audio,
    getWindowInfo: () => ({ windowWidth: 375 }),
    getStorageSync: key => storage[key],
    setStorageSync: (key, value) => { storage[key] = value },
    vibrateShort() {},
    onAccelerometerChange() { calls.listen += 1 },
    offAccelerometerChange() { calls.unlisten += 1 },
    startAccelerometer(options) { calls.sensorStart.push(options) },
    stopAccelerometer() { calls.sensorStop += 1 }
  }
  let definition
  global.Page = value => { definition = value }
  delete require.cache[modulePath]
  require(modulePath)
  const page = { ...definition, data: { ...definition.data }, setData(patch) { this.data = { ...this.data, ...patch } } }
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 10000 })
  page.onLoad()
  page.onShow()
  t.after(() => {
    page.onUnload()
    if (previousPage === undefined) delete global.Page; else global.Page = previousPage
    if (previousWx === undefined) delete global.wx; else global.wx = previousWx
    delete require.cache[modulePath]
  })
  return { page, calls, audio, storage }
}

test('sound begins with the shake, stops on completion, and lock prevents restart', t => {
  const { page, calls, audio } = setup(t)
  assert.equal(audio.src, '/assets/audio/dice-shake.wav')
  page.handleRoll()
  assert.equal(calls.play, 0)
  t.mock.timers.tick(COVER_DURATION_MS)
  assert.equal(page.data.phase, 'shaking')
  assert.equal(calls.play, 1)
  const stops = calls.stop
  t.mock.timers.tick(SHAKE_DURATION_MS)
  assert.equal(page.data.phase, 'covered')
  assert.ok(calls.stop > stops)
  page.handleToggleLock()
  page.handleRoll()
  t.mock.timers.tick(2000)
  assert.equal(calls.play, 1)
})

test('settings draft cancels or applies, clamps boundaries and blocks background rolls', t => {
  const { page } = setup(t)
  page.handleOpenSettings()
  page.handleIncreaseCount()
  page.handleIncreaseCount()
  assert.equal(page.data.draftDiceCount, 6)
  page.handleRoll()
  assert.equal(page.data.isBusy, false)
  page.handleCloseSettings()
  assert.equal(page.data.diceCount, 5)
  page.handleOpenSettings()
  for (let index = 0; index < 8; index += 1) page.handleDecreaseCount()
  assert.equal(page.data.draftDiceCount, 1)
  page.handleSaveSettings()
  assert.equal(page.data.diceCount, 1)
})

test('vertical drag tracks continuously and remains at an intermediate position after release', t => {
  const { page } = setup(t)
  const original = page.data.dice.map((die) => die.value)

  page.handleTouchStart({ touches: [{ clientY: 300 }] })
  page.handleTouchMove({ touches: [{ clientY: 250 }] })
  assert.ok(page.data.lidProgress > 0.32 && page.data.lidProgress < 0.33)
  page.handleTouchEnd({ changedTouches: [{ clientY: 230 }] })
  const stoppedProgress = page.data.lidProgress
  assert.ok(stoppedProgress > 0.45 && stoppedProgress < 0.46)
  assert.equal(page.data.phase, 'lid-moving')
  t.mock.timers.tick(2000)
  assert.equal(page.data.lidProgress, stoppedProgress)
  assert.deepEqual(page.data.dice.map((die) => die.value), original)

  page.handleTouchStart({ touches: [{ clientY: 230 }] })
  page.handleTouchEnd({ changedTouches: [{ clientY: 40 }] })
  assert.equal(page.data.lidProgress, 1)
  assert.equal(page.data.phase, 'revealed')

  page.handleTouchStart({ touches: [{ clientY: 40 }] })
  page.handleTouchEnd({ changedTouches: [{ clientY: 120 }] })
  assert.ok(page.data.lidProgress > 0.48 && page.data.lidProgress < 0.49)
})

test('rolling from a partial opening closes the lid before the whole shaker moves', t => {
  const { page, calls } = setup(t)
  page.game.setLidProgress(0.58)
  page.handleRoll()
  assert.equal(page.data.phase, 'covering')
  assert.equal(page.data.lidProgress, 0)
  t.mock.timers.tick(COVER_DURATION_MS)
  assert.equal(page.data.phase, 'shaking')
  assert.equal(calls.play, 1)
  const stops = calls.stop
  page.onHide()
  assert.equal(page.data.isBusy, false)
  assert.ok(calls.stop > stops)
  assert.equal(calls.unlisten, 0)
})

function shake(page, t) {
  page.handleAcceleration({ x: 0, y: 0, z: 1 })
  t.mock.timers.tick(100)
  page.handleAcceleration({ x: 1.6, y: 0, z: 1 })
  t.mock.timers.tick(100)
  page.handleAcceleration({ x: -1.6, y: 0, z: 1 })
}

function setMotion(page, value) {
  page.handleOpenSettings()
  page.handleMotionChange({ detail: { value } })
  page.handleSaveSettings()
}

test('button mode is the default and ignores motion without starting the sensor', t => {
  const { page, calls } = setup(t)
  assert.equal(page.data.motionEnabled, false)
  assert.equal(calls.listen, 0)
  shake(page, t)
  assert.equal(page.data.isBusy, false)
  page.handleRoll()
  assert.equal(page.data.phase, 'covering')
})

test('motion settings cancel or persist on save, including across page reloads', t => {
  const { page, calls, storage } = setup(t)
  page.handleOpenSettings()
  page.handleMotionChange({ detail: { value: true } })
  page.handleCloseSettings()
  assert.equal(page.data.motionEnabled, false)
  assert.equal(calls.listen, 0)
  page.handleOpenSettings()
  assert.equal(page.data.draftMotionEnabled, false)
  page.handleCloseSettings()
  setMotion(page, true)
  assert.equal(storage['dice-shaker-motion-enabled'], true)
  assert.equal(calls.listen, 1)
  page.onUnload()
  page.onLoad()
  page.onShow()
  assert.equal(page.data.motionEnabled, true)
  assert.equal(calls.listen, 2)
})

test('motion and button triggers are mutually exclusive and disabling detaches the sensor', t => {
  const { page, calls } = setup(t, { motionEnabled: true })
  page.handleRoll()
  assert.equal(page.data.isBusy, false)
  shake(page, t)
  assert.equal(page.data.phase, 'covering')
  t.mock.timers.tick(COVER_DURATION_MS)
  t.mock.timers.tick(SHAKE_DURATION_MS)
  const oldListener = page._accelerometerListener
  setMotion(page, false)
  assert.equal(page._accelerometerListener, null)
  assert.equal(calls.sensorStop, 1)
  oldListener({ x: 4, y: 0, z: 1 })
  shake(page, t)
  assert.equal(page.data.isBusy, false)
  page.handleRoll()
  assert.equal(page.data.phase, 'covering')
})

test('motion mode respects lock and settings while maintaining one listener on resume', t => {
  const { page, calls } = setup(t, { motionEnabled: true })
  page.onShow()
  assert.equal(calls.listen, 1)
  page.handleToggleLock()
  shake(page, t)
  assert.equal(page.data.isBusy, false)
  page.handleOpenSettings()
  assert.equal(page._accelerometerListener, null)
  page.handleIncreaseCount()
  assert.equal(page.data.draftDiceCount, 5)
  page.handleCloseSettings()
  assert.equal(calls.listen, 2)
  page.onHide()
  shake(page, t)
  assert.equal(page.data.isBusy, false)
  page.onShow()
  assert.equal(calls.listen, 3)
  page.handleToggleLock()
  shake(page, t)
  assert.equal(page.data.phase, 'covering')
})

test('sensor failure restores button mode while an old failure cannot disable a new session', t => {
  const { page, calls, storage } = setup(t, { motionEnabled: true })
  const oldStart = calls.sensorStart[0]
  page.onHide()
  page.onShow()
  oldStart.fail()
  assert.equal(page.data.motionEnabled, true)
  calls.sensorStart[1].fail()
  assert.equal(page.data.motionEnabled, false)
  assert.equal(page.data.motionError, true)
  assert.equal(storage['dice-shaker-motion-enabled'], false)
  assert.equal(page._accelerometerListener, null)
  page.handleRoll()
  assert.equal(page.data.phase, 'covering')
})

test('dice layout changes only after a completed roll or a count change', t => {
  const { page } = setup(t)
  const positions = () => page.data.dice.map(die => die.position)
  const original = positions()
  page.game.setLidProgress(1)
  assert.deepEqual(positions(), original)
  page.handleRoll()
  t.mock.timers.tick(COVER_DURATION_MS)
  page.handleToggleLock()
  assert.deepEqual(positions(), original)
  page.handleToggleLock()
  page.handleRoll()
  t.mock.timers.tick(COVER_DURATION_MS)
  t.mock.timers.tick(SHAKE_DURATION_MS)
  assert.notDeepEqual(positions(), original)
  const rolled = positions()
  page.game.setLidProgress(0.5)
  page.onHide()
  assert.deepEqual(positions(), rolled)
})
