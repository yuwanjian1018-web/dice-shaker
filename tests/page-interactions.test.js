const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const modulePath = require.resolve('../pages/index/index')
const { COVER_DURATION_MS, SHAKE_DURATION_MS } = require('../utils/game')
const SETTINGS_DISMISS_FALLBACK_MS = 360

function loadSettingsGesture() {
  const source = fs.readFileSync(path.resolve(__dirname, '../pages/index/settings-sheet.wxs'), 'utf8')
  const sandbox = { module: { exports: {} }, exports: {} }
  vm.runInNewContext(source, sandbox)
  return sandbox.module.exports
}

function gestureHarness(threshold = 80) {
  const state = {}
  const styles = []
  const calls = []
  const instance = {
    getState: () => state,
    setStyle: style => styles.push({ ...style }),
    requestAnimationFrame: callback => callback()
  }
  const owner = { callMethod: (method, args) => calls.push({ method, args }) }
  const gesture = loadSettingsGesture()
  gesture.thresholdChanged(threshold, undefined, owner, instance)
  return { gesture, instance, owner, state, styles, calls }
}

function setup(t, options = {}) {
  const previousPage = global.Page
  const previousWx = global.wx
  const calls = {
    play: 0, stop: 0, destroy: 0, listen: 0, unlisten: 0,
    sensorStart: [], sensorStop: 0, sensorOrder: [], shareMenus: []
  }
  let sensorStarted = false
  const storage = {
    'dice-shaker-motion-enabled': options.motionEnabled,
    'dice-shaker-dice-count': options.diceCount
  }
  const audio = { stop() { calls.stop += 1 }, play() { calls.play += 1 }, destroy() { calls.destroy += 1 }, onError(fn) { this.error = fn }, onPlay(fn) { this.played = fn } }
  global.wx = {
    createInnerAudioContext: () => audio,
    getWindowInfo: () => ({ windowWidth: 375 }),
    getDeviceInfo: () => ({ platform: options.platform || 'ios' }),
    nextTick: callback => callback(),
    getStorageSync: key => storage[key],
    setStorageSync: (key, value) => { storage[key] = value },
    showShareMenu: config => { calls.shareMenus.push(config) },
    vibrateShort() {},
    onAccelerometerChange() { calls.listen += 1; calls.sensorOrder.push('listen'); sensorStarted = true },
    offAccelerometerChange() { calls.unlisten += 1 },
    startAccelerometer(config) {
      calls.sensorStart.push(config)
      calls.sensorOrder.push('start')
      if (options.rejectDuplicateAccelerometerStart && sensorStarted) {
        if (config.fail) config.fail({ errMsg: 'startAccelerometer:fail already started' })
        return
      }
      sensorStarted = true
      if (config.success) config.success({})
    },
    stopAccelerometer() { calls.sensorStop += 1; sensorStarted = false }
  }
  let definition
  global.Page = value => { definition = value }
  delete require.cache[modulePath]
  require(modulePath)
  const page = { ...definition, data: { ...definition.data }, setData(patch, callback) { this.data = { ...this.data, ...patch }; if (callback) callback() } }
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

test('share menu exposes friend and timeline sharing with a stable home-page entry', t => {
  const { page, calls } = setup(t)
  assert.equal(calls.shareMenus.length, 1)
  assert.equal(calls.shareMenus[0].withShareTicket, false)
  assert.deepEqual(calls.shareMenus[0].menus, ['shareAppMessage', 'shareTimeline'])
  assert.equal(typeof calls.shareMenus[0].fail, 'function')
  assert.deepEqual(page.onShareAppMessage(), {
    title: '摇骰子｜聚会桌游，随手开摇',
    path: '/pages/index/index'
  })
  assert.deepEqual(page.onShareTimeline(), {
    title: '摇骰子｜聚会桌游，随手开摇',
    query: ''
  })
})

test('sound begins with the shake, stops on completion, and lock prevents restart', t => {
  const { page, calls, audio } = setup(t)
  assert.equal(audio.src, '/assets/audio/dice-shake.mp3')
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

test('busy state blocks settings and repeat roll taps without applying busy visual classes', t => {
  const { page } = setup(t)
  page.handleRoll()
  assert.equal(page.data.isBusy, true)
  assert.equal(page.data.phase, 'covering')
  page.handleOpenSettings()
  page.handleRoll()
  assert.equal(page.data.settingsOpen, false)
  assert.equal(page.data.phase, 'covering')
  t.mock.timers.tick(COVER_DURATION_MS)
  assert.equal(page.data.phase, 'shaking')
  page.handleOpenSettings()
  page.handleRoll()
  assert.equal(page.data.settingsOpen, false)
  assert.equal(page.data.phase, 'shaking')
})

test('settings changes save immediately, clamp boundaries and survive page reloads', t => {
  const { page, storage } = setup(t)
  page.handleOpenSettings()
  page.handleIncreaseCount()
  page.handleIncreaseCount()
  assert.equal(page.data.diceCount, 6)
  assert.equal(page.game.getState().diceCount, 6)
  assert.equal(storage['dice-shaker-dice-count'], 6)
  page.handleRoll()
  assert.equal(page.data.isBusy, false)
  page.handleCloseSettings()
  assert.equal(page.data.settingsOpen, true)
  assert.equal(page.data.settingsClosing, true)
  t.mock.timers.tick(SETTINGS_DISMISS_FALLBACK_MS)
  assert.equal(page.data.settingsOpen, false)
  assert.equal(page.data.diceCount, 6)
  page.handleOpenSettings()
  for (let index = 0; index < 8; index += 1) page.handleDecreaseCount()
  assert.equal(page.data.diceCount, 1)
  assert.equal(page.game.getState().diceCount, 1)
  assert.equal(storage['dice-shaker-dice-count'], 1)
  page.onUnload()
  page.onLoad()
  page.onShow()
  assert.equal(page.data.diceCount, 1)
  assert.equal(page.game.getState().diceCount, 1)
})

test('opening settings keeps the live WebGL scene in place without snapshot or suspension', t => {
  const { page } = setup(t)
  const calls = []
  page._scene3D = {
    update() {},
    snapshot() { calls.push('snapshot'); return 'data:image/png;base64,unused' },
    suspend() { calls.push('suspend') },
    resume() { calls.push('resume') },
    dispose() { calls.push('dispose') }
  }
  page.handleOpenSettings()
  assert.equal(page.data.settingsOpen, true)
  assert.deepEqual(calls, [])
  page.handleCloseSettings()
  t.mock.timers.tick(SETTINGS_DISMISS_FALLBACK_MS)
  assert.deepEqual(calls, [])
})

test('settings markup has no completion action, decoded snapshots swap safely, and audio errors stay diagnostic', () => {
  const markup = fs.readFileSync(path.resolve(__dirname, '../pages/index/index.wxml'), 'utf8')
  const styles = fs.readFileSync(path.resolve(__dirname, '../pages/index/index.wxss'), 'utf8')
  const pageSource = fs.readFileSync(path.resolve(__dirname, '../pages/index/index.js'), 'utf8')
  const settingsButton = markup.match(/<button class="settings-button icon-button"[^>]*>/)[0]
  assert.doesNotMatch(markup, /handleSaveSettings|done-button/)
  assert.match(markup, /modelSnapshotReady \? 'shaker-canvas--snapshot-covered'/)
  assert.match(markup, /fade-in="\{\{false\}\}" bindload="handleModelSnapshotLoad"/)
  assert.doesNotMatch(markup, /音效暂不可用|soundError/)
  assert.doesNotMatch(pageSource, /soundError/)
  assert.match(pageSource, /console\.warn\('摇骰音效播放失败'/)
  assert.match(settingsButton, /hover-class="\{\{isBusy \? 'none' : 'control--pressed'\}\}"/)
  assert.match(settingsButton, /aria-disabled="\{\{isBusy\}\}"/)
  assert.doesNotMatch(markup, /settings-button[^"\n]*is-busy/)
  assert.doesNotMatch(settingsButton, /\sdisabled=/)
  assert.doesNotMatch(markup, /roll-button[^"\n]*is-busy/)
  assert.doesNotMatch(styles, /\.settings-button\[disabled\]|\.roll-button\.is-busy/)
})

test('DevTools preloads its canvas snapshot before swapping layers and releases it after close', t => {
  const { page } = setup(t, { platform: 'devtools', motionEnabled: true })
  const calls = []
  page._scene3D = {
    update() {},
    snapshot() { calls.push('snapshot'); return 'data:image/png;base64,ready' },
    redraw() { calls.push('redraw') },
    suspend() {}, resume() {}, dispose() {}
  }
  page.handleOpenSettings()
  assert.equal(page.data.settingsOpen, false)
  assert.equal(page._accelerometerListener, null)
  assert.equal(page.data.modelSnapshotReady, false)
  assert.equal(page.data.modelSnapshot, 'data:image/png;base64,ready')
  page.handleModelSnapshotLoad()
  assert.equal(page.data.settingsOpen, true)
  assert.equal(page.data.modelSnapshotReady, true)
  page.handleCloseSettings()
  t.mock.timers.tick(SETTINGS_DISMISS_FALLBACK_MS)
  assert.equal(page.data.settingsOpen, false)
  assert.equal(page.data.modelSnapshotReady, false)
  assert.equal(page.data.modelSnapshot, 'data:image/png;base64,ready')
  t.mock.timers.tick(80)
  assert.equal(page.data.modelSnapshot, '')
  assert.deepEqual(calls, ['snapshot', 'redraw'])
})

test('settings sheet gesture moves the whole view in WXS and closes from its released position', () => {
  const rebound = gestureHarness(80)
  rebound.gesture.touchstart({ instance: rebound.instance, touches: [{ pageY: 200 }] }, rebound.owner)
  rebound.gesture.touchmove({ instance: rebound.instance, touches: [{ pageY: 250 }] }, rebound.owner)
  assert.equal(rebound.styles.at(-1).transform, 'translate3d(0, 50px, 0)')
  rebound.gesture.touchend({ instance: rebound.instance, changedTouches: [{ pageY: 250 }] }, rebound.owner)
  assert.equal(rebound.styles.at(-1).transform, 'translate3d(0, 0px, 0)')
  assert.equal(rebound.calls.at(-1).args.shouldClose, false)
  assert.equal(rebound.calls.at(-1).args.offset, 0)

  const dismiss = gestureHarness(80)
  dismiss.gesture.touchstart({ instance: dismiss.instance, touches: [{ pageY: 200 }] }, dismiss.owner)
  dismiss.gesture.touchmove({ instance: dismiss.instance, touches: [{ pageY: 300 }] }, dismiss.owner)
  dismiss.gesture.touchend({ instance: dismiss.instance, changedTouches: [{ pageY: 300 }] }, dismiss.owner)
  assert.equal(dismiss.styles.at(-1).transform, 'translate3d(0, 100%, 0)')
  assert.equal(dismiss.calls.at(-1).method, 'handleSettingsGestureRelease')
  assert.equal(dismiss.calls.at(-1).args.shouldClose, true)
  assert.equal(dismiss.calls.at(-1).args.offset, 100)
  dismiss.gesture.transitionEnd({ instance: dismiss.instance }, dismiss.owner)
  assert.equal(dismiss.calls.at(-1).method, 'finishSettingsDismiss')
})

test('vertical drag tracks continuously and remains at an intermediate position after release', t => {
  const { page } = setup(t)
  const original = page.data.dice.map((die) => die.value)

  page.handleTouchStart({ touches: [{ clientY: 300 }] })
  page.handleTouchMove({ touches: [{ clientY: 250 }] })
  assert.ok(page.data.lidProgress > 0 && page.data.lidProgress < 1)
  // Finger travel maps to the 3D opening clip; no CSS bitmap offset remains.
  const offset = () => page.data.lidProgress * 340
  assert.ok(Math.abs(offset() - 100) < 0.2)
  page.handleTouchEnd({ changedTouches: [{ clientY: 230 }] })
  const stoppedProgress = page.data.lidProgress
  assert.ok(stoppedProgress > 0 && stoppedProgress < 1)
  assert.ok(Math.abs(offset() - 140) < 0.2)
  assert.equal(page.data.phase, 'lid-moving')
  t.mock.timers.tick(2000)
  assert.equal(page.data.lidProgress, stoppedProgress)
  assert.deepEqual(page.data.dice.map((die) => die.value), original)

  page.handleTouchStart({ touches: [{ clientY: 230 }] })
  page.handleTouchEnd({ changedTouches: [{ clientY: 40 }] })
  assert.equal(page.data.lidProgress, 1)
  assert.equal(page.data.phase, 'revealed')
  const fullyOpenOffset = offset()

  page.handleTouchStart({ touches: [{ clientY: 40 }] })
  page.handleTouchEnd({ changedTouches: [{ clientY: 120 }] })
  assert.ok(page.data.lidProgress > 0 && page.data.lidProgress < 1)
  assert.ok(Math.abs(offset() - (fullyOpenOffset - 160)) < 0.2)
})

test('a lid drag only ships the value that moved across the setData bridge', t => {
  const { page } = setup(t)
  const patches = []
  const setData = page.setData
  page.setData = function (patch) { patches.push(Object.keys(patch).sort().join(',')); setData.call(this, patch) }

  page.handleTouchStart({ touches: [{ clientY: 400 }] })
  for (let y = 399; y >= 380; y -= 1) page.handleTouchMove({ touches: [{ clientY: y }] })

  // Entering the drag reports the new phase and label once; after that a moving
  // finger must not resend the dice, their spoken label or the unchanged flags.
  assert.equal(patches[0], 'lidActionLabel,lidProgress,phase')
  assert.deepEqual([...new Set(patches.slice(1))], ['lidProgress'])
  assert.ok(page.data.lidProgress > 0 && page.data.lidProgress < 1)
  assert.equal(page.data.dice.length, 5)
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

function setMotion(page, t, value) {
  page.handleOpenSettings()
  page.handleMotionChange({ detail: { value } })
  page.handleCloseSettings()
  t.mock.timers.tick(SETTINGS_DISMISS_FALLBACK_MS)
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

test('motion setting saves immediately and persists across page reloads', t => {
  const { page, calls, storage } = setup(t)
  page.handleOpenSettings()
  page.handleMotionChange({ detail: { value: true } })
  assert.equal(page.data.motionEnabled, true)
  assert.equal(storage['dice-shaker-motion-enabled'], true)
  assert.equal(calls.listen, 0)
  page.handleCloseSettings()
  t.mock.timers.tick(SETTINGS_DISMISS_FALLBACK_MS)
  assert.equal(calls.listen, 1)
  page.onUnload()
  page.onLoad()
  page.onShow()
  assert.equal(page.data.motionEnabled, true)
  assert.equal(calls.listen, 2)
})

test('Android starts the accelerometer before registering its auto-starting listener', t => {
  const { page, calls, storage } = setup(t, {
    platform: 'android',
    motionEnabled: true,
    rejectDuplicateAccelerometerStart: true
  })
  assert.deepEqual(calls.sensorOrder, ['start', 'listen'])
  assert.equal(page.data.motionEnabled, true)
  assert.equal(page.data.motionError, false)
  assert.equal(storage['dice-shaker-motion-enabled'], true)
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
  setMotion(page, t, false)
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
  assert.equal(page.data.diceCount, 5)
  page.handleCloseSettings()
  assert.equal(calls.listen, 1)
  t.mock.timers.tick(SETTINGS_DISMISS_FALLBACK_MS)
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

test('page forwards roll revisions to 3D without changing them on inspection or cancellation', t => {
  const { page } = setup(t)
  let sceneState = page.game.getState()
  page._scene3D = { update(state) { sceneState = state }, suspend() {}, dispose() {} }
  const positions = () => [sceneState.rollRevision, sceneState.diceCount]
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

test('3D rendering follows page visibility and is disposed on unload', t => {
  const { page } = setup(t)
  const calls = []
  page._scene3D = {
    update(state) { calls.push(['update', state.lidProgress, state.diceCount]) },
    suspend() { calls.push(['suspend']) },
    resume() { calls.push(['resume']) },
    dispose() { calls.push(['dispose']) }
  }
  page.game.setLidProgress(.5)
  assert.deepEqual(calls[0], ['update', .5, 5])
  page.onHide()
  assert.ok(calls.some(c => c[0] === 'suspend'))
  page.onShow()
  assert.ok(calls.some(c => c[0] === 'resume'))
  page.onUnload()
  assert.equal(page._scene3D, null)
  assert.equal(calls.filter(c => c[0] === 'dispose').length, 1)
})
