const { createDiceGame } = require('../../utils/game')
const { createShakeDetector } = require('../../utils/shake-detector')
const { createScopedThreejs } = require('../../vendor/threejs-miniprogram/index')
const { createShakerScene } = require('../../utils/shaker-3d')

// Finger travel controls the model's sampled opening animation.
const LID_TRAVEL_RPX = 340
const MOTION_SETTING_KEY = 'dice-shaker-motion-enabled'
const DICE_COUNT_SETTING_KEY = 'dice-shaker-dice-count'
const SETTINGS_DISMISS_FALLBACK_MS = 360
const SETTINGS_CLOSE_DISTANCE_RPX = 160

Page({
  data: {
    phase: 'covered', isBusy: false, isLidOpen: false, hasRolled: false,
    isLocked: false, diceCount: 5, actionLabel: '摇一摇', dice: [],
    settingsOpen: false, settingsClosing: false, settingsCloseDistancePx: 80,
    soundError: false, motionEnabled: false, motionError: false,
    lidProgress: 0, modelReady: false, modelError: false,
    modelSnapshot: '', modelSnapshotReady: false, diceResultLabel: '', resultsVisible: false
  },

  onLoad() {
    this._destroyed = false
    this._visible = true
    this._previousPhase = 'covered'
    this._detector = createShakeDetector()
    try {
      const deviceInfo = typeof wx !== 'undefined' && wx.getDeviceInfo
        ? wx.getDeviceInfo()
        : (typeof wx !== 'undefined' && wx.getSystemInfoSync ? wx.getSystemInfoSync() : null)
      this._useSettingsSnapshot = Boolean(deviceInfo && deviceInfo.platform === 'devtools')
    } catch (error) { this._useSettingsSnapshot = false }
    let initialDiceCount = 5
    try {
      const motionEnabled = typeof wx !== 'undefined' && wx.getStorageSync && wx.getStorageSync(MOTION_SETTING_KEY) === true
      const savedDiceCount = typeof wx !== 'undefined' && wx.getStorageSync ? wx.getStorageSync(DICE_COUNT_SETTING_KEY) : 5
      if (Number.isInteger(savedDiceCount) && savedDiceCount >= 1 && savedDiceCount <= 6) initialDiceCount = savedDiceCount
      this.setData({ motionEnabled: Boolean(motionEnabled) })
    } catch (error) {}
    let windowWidth = 375
    try {
      const windowInfo = typeof wx !== 'undefined' && wx.getWindowInfo ? wx.getWindowInfo() : null
      if (windowInfo && Number.isFinite(windowInfo.windowWidth)) windowWidth = windowInfo.windowWidth
    } catch (error) {}
    this._lidTravelPx = LID_TRAVEL_RPX * windowWidth / 750
    this.setData({ settingsCloseDistancePx: SETTINGS_CLOSE_DISTANCE_RPX * windowWidth / 750 })
    this.initSound()
    this.game = createDiceGame({ onChange: (state) => this.applyGameState(state) })
    if (initialDiceCount !== 5) this.game.setDiceCount(initialDiceCount)
    this.applyGameState(this.game.getState())
  },

  applyGameState(state) {
    // Dragging the lid emits a state per touch event. Shipping the whole model
    // across the bridge each time stalls the view thread, so send only the keys
    // that moved; a steady drag then costs one number instead of twenty values.
    const patch = {}
    for (const key in state) if (key !== 'dice' && state[key] !== this.data[key]) patch[key] = state[key]
    const diceKey = state.rollRevision + ':' + state.diceCount
    if (diceKey !== this._diceKey) {
      this._diceKey = diceKey
      patch.dice = state.dice
      patch.diceResultLabel = state.dice.map((die, index) => `第${index + 1}颗${die.value}点`).join('，')
    }
    const resultsVisible = state.lidProgress >= 0.85
    if (resultsVisible !== this.data.resultsVisible) patch.resultsVisible = resultsVisible
    if (Object.keys(patch).length) this.setData(patch)
    if (this._scene3D) this._scene3D.update(state)
    if (state.phase === 'shaking' && this._previousPhase !== 'shaking' && this._visible) {
      if (this._audio) { this._audio.stop(); this._audio.play() }
      if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'medium', fail() {} })
    } else if (state.phase !== 'shaking' && this._previousPhase === 'shaking') this.stopSound()
    this._previousPhase = state.phase
  },

  onReady() { this.init3D() },

  init3D() {
    if (this._destroyed || typeof wx === 'undefined' || !wx.createSelectorQuery) return
    const generation = this._sceneGeneration = (this._sceneGeneration || 0) + 1
    if (this._scene3D) this._scene3D.dispose()
    this._scene3D = null
    this.setData({ modelReady: false, modelError: false })
    wx.createSelectorQuery().select('#shaker-canvas').fields({ node: true, size: true }).exec(async results => {
      if (generation !== this._sceneGeneration || this._destroyed) return
      try {
        const result = results && results[0]
        if (!result || !result.node || !result.width || !result.height) throw new Error('WebGL canvas is unavailable')
        const canvas = result.node
        const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
        const scene = await createShakerScene({
          THREE: createScopedThreejs(canvas), canvas, width: result.width, height: result.height, pixelRatio: info.pixelRatio,
          readBinary: () => new Promise((resolve, reject) => wx.getFileSystemManager().readFile({ filePath: 'assets/models/cup-scene.bin', success: r => resolve(r.data), fail: reject })),
          loadImage: src => new Promise((resolve, reject) => {
            const image = canvas.createImage()
            image.onload = () => resolve(image)
            image.onerror = () => reject(new Error('Unable to load model texture: ' + src))
            image.src = src
          })
        })
        if (generation !== this._sceneGeneration || this._destroyed) { scene.dispose(); return }
        this._scene3D = scene
        if (!this._visible) scene.suspend()
        scene.update(this.game.getState())
        this.setData({ modelReady: true, modelError: false })
      } catch (error) {
        if (generation !== this._sceneGeneration || this._destroyed) return
        this.setData({ modelReady: false, modelError: true })
        console.error('3D 骰盅加载失败', error && (error.message || error.errMsg || error))
      }
    })
  },

  handleCanvasError(event) {
    console.error('3D 骰盅画布错误', event.detail)
    this.setData({ modelReady: false, modelError: true })
  },

  onResize() {
    if (!this._scene3D) return
    wx.createSelectorQuery().select('#shaker-canvas').fields({ size: true }).exec(results => {
      if (this._scene3D && results[0] && results[0].width && results[0].height) this._scene3D.resize(results[0].width, results[0].height)
    })
    const info = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    this._lidTravelPx = LID_TRAVEL_RPX * info.windowWidth / 750
    this.setData({ settingsCloseDistancePx: SETTINGS_CLOSE_DISTANCE_RPX * info.windowWidth / 750 })
  },

  initSound() {
    if (typeof wx === 'undefined' || !wx.createInnerAudioContext) return
    try {
      this._audio = wx.createInnerAudioContext()
      this._audio.src = '/assets/audio/dice-shake.mp3'
      this._audio.loop = true
      this._audio.volume = 0.8
      this._audio.obeyMuteSwitch = false
      this._audio.onError((error) => {
        if (!this.game) return
        this.setData({ soundError: true })
        console.warn('摇骰音效播放失败', error.errCode, error.errMsg)
      })
      this._audio.onPlay(() => { if (this.game) this.setData({ soundError: false }) })
    } catch (error) {
      this.setData({ soundError: true })
      console.warn('无法初始化摇骰音效', error.message)
    }
  },

  stopSound() { if (this._audio) this._audio.stop() },

  onShow() {
    this._visible = true
    if (this._scene3D) this._scene3D.resume()
    if (this._detector) this._detector.reset()
    this.syncMotionSensor()
  },

  saveMotionPreference() {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) wx.setStorageSync(MOTION_SETTING_KEY, this.data.motionEnabled)
    } catch (error) {}
  },

  stopMotionSensor() {
    const listener = this._accelerometerListener
    this._accelerometerListener = null
    if (this._detector) this._detector.reset()
    if (!listener || typeof wx === 'undefined') return
    if (wx.offAccelerometerChange) wx.offAccelerometerChange(listener)
    if (wx.stopAccelerometer) wx.stopAccelerometer({ fail() {} })
  },

  syncMotionSensor() {
    if (!this.data.motionEnabled || !this._visible || this.data.settingsOpen || this._settingsPending) {
      this.stopMotionSensor()
      return
    }
    if (this._accelerometerListener) return
    const listener = sample => this.handleAcceleration(sample)
    this._accelerometerListener = listener
    const fail = () => {
      if (this._accelerometerListener !== listener) return
      this.stopMotionSensor()
      this.setData({ motionEnabled: false, motionError: true })
      this.saveMotionPreference()
    }
    if (typeof wx === 'undefined' || !wx.onAccelerometerChange || !wx.startAccelerometer) {
      fail()
      return
    }
    try {
      wx.onAccelerometerChange(listener)
      wx.startAccelerometer({ interval: 'game', fail })
    } catch (error) { fail() }
  },

  handleAcceleration(sample) {
    if (!this.data.motionEnabled || !this.game || !this._visible || this.data.settingsOpen || this._settingsPending || this.data.isLocked || this.data.isBusy) {
      if (this._detector) this._detector.reset()
      return
    }
    if (this._detector && this._detector.push(sample)) this.game.startRoll()
  },

  handleRoll() {
    if (!this.data.motionEnabled && this.game && this._visible && !this.data.settingsOpen && !this._settingsPending) this.game.startRoll()
  },
  handleToggleLock() {
    if (!this.game || this.data.settingsOpen || this._settingsPending) return
    this.game.toggleLock()
    if (this._detector) this._detector.reset()
  },

  handleTouchStart(event) {
    if (this.data.isBusy || this.data.settingsOpen || this._settingsPending) return
    const touch = event.touches && event.touches[0]
    const state = this.game && this.game.getState()
    this._touchStart = touch && state ? { y: touch.clientY, progress: state.lidProgress } : null
    if (this._touchStart && this._scene3D) this._scene3D.setInteractionActive(true)
  },
  updateLidFromTouch(touch) {
    const start = this._touchStart
    if (!start || !touch || !this.game || this.data.isBusy || this.data.settingsOpen || this._settingsPending) return
    const progress = start.progress + (start.y - touch.clientY) / this._lidTravelPx
    this.game.setLidProgress(progress)
  },
  handleTouchMove(event) {
    this.updateLidFromTouch(event.touches && event.touches[0])
  },
  handleTouchEnd(event) {
    this.updateLidFromTouch(event.changedTouches && event.changedTouches[0])
    this._touchStart = null
    if (this._scene3D) this._scene3D.setInteractionActive(false)
  },

  saveDiceCountPreference(count) {
    try {
      if (typeof wx !== 'undefined' && wx.setStorageSync) wx.setStorageSync(DICE_COUNT_SETTING_KEY, count)
    } catch (error) {}
  },
  handleTouchCancel() {
    this._touchStart = null
    if (this._scene3D) this._scene3D.setInteractionActive(false)
  },

  handleOpenSettings() {
    if (this.data.isBusy || this.data.settingsOpen || this._settingsPending) return
    if (this._snapshotReleaseTimer) clearTimeout(this._snapshotReleaseTimer)
    this._snapshotReleaseTimer = null
    // Real phones support same-layer composition, so they keep the live WebGL
    // canvas throughout. DevTools needs a decoded image above its native canvas;
    // preload it before the sheet appears so there is no blank or flashing frame.
    if (this._useSettingsSnapshot && this._scene3D) {
      let modelSnapshot = ''
      try { modelSnapshot = this._scene3D.snapshot() } catch (error) { console.warn('模型背景快照不可用', error.message) }
      if (modelSnapshot) {
        this._settingsPending = true
        this.setData({ modelSnapshot, modelSnapshotReady: false })
        this.syncMotionSensor()
        if (this._snapshotLoadTimer) clearTimeout(this._snapshotLoadTimer)
        this._snapshotLoadTimer = setTimeout(() => this.finishSettingsSnapshotLoad(false), 500)
        return
      }
    }
    this.setData({ settingsOpen: true, settingsClosing: false, modelSnapshot: '', modelSnapshotReady: false })
    this.syncMotionSensor()
  },
  handleModelSnapshotLoad() {
    if (!this._settingsPending) return
    const reveal = () => this.finishSettingsSnapshotLoad(true)
    if (typeof wx !== 'undefined' && wx.nextTick) wx.nextTick(reveal)
    else setTimeout(reveal, 0)
  },
  handleModelSnapshotError() { this.finishSettingsSnapshotLoad(false) },
  finishSettingsSnapshotLoad(ready) {
    if (!this._settingsPending) return
    this._settingsPending = false
    if (this._snapshotLoadTimer) clearTimeout(this._snapshotLoadTimer)
    this._snapshotLoadTimer = null
    this.setData({
      settingsOpen: true, settingsClosing: false,
      modelSnapshot: ready ? this.data.modelSnapshot : '', modelSnapshotReady: Boolean(ready)
    }, () => this.syncMotionSensor())
  },
  handleCloseSettings() {
    this.dismissSettings()
  },
  dismissSettings() {
    if (!this.data.settingsOpen || this.data.settingsClosing) return
    this.setData({ settingsClosing: true }, () => {
      if (!this.data.settingsClosing || this._destroyed) return
      if (this._settingsCloseTimer) clearTimeout(this._settingsCloseTimer)
      this._settingsCloseTimer = setTimeout(() => this.finishSettingsDismiss(), SETTINGS_DISMISS_FALLBACK_MS)
    })
  },
  handleSettingsGestureRelease(result) {
    if (result && result.shouldClose) this.dismissSettings()
  },
  finishSettingsDismiss() {
    if (!this.data.settingsOpen || !this.data.settingsClosing) return
    if (this._settingsCloseTimer) clearTimeout(this._settingsCloseTimer)
    this._settingsCloseTimer = null
    const releaseSnapshot = Boolean(this.data.modelSnapshot)
    if (releaseSnapshot && this._scene3D && this._scene3D.redraw) this._scene3D.redraw()
    this.setData({ settingsOpen: false, settingsClosing: false, modelSnapshotReady: false }, () => {
      this.syncMotionSensor()
      if (!releaseSnapshot) return
      this._snapshotReleaseTimer = setTimeout(() => {
        this._snapshotReleaseTimer = null
        if (!this.data.settingsOpen && !this._settingsPending) this.setData({ modelSnapshot: '' })
      }, 80)
    })
  },
  handleMotionChange(event) {
    this.setData({ motionEnabled: Boolean(event.detail.value), motionError: false }, () => {
      this.saveMotionPreference()
      this.syncMotionSensor()
    })
  },
  handleDecreaseCount() {
    const count = this.data.diceCount - 1
    if (this.game && !this.data.isLocked && count >= 1 && this.game.setDiceCount(count)) this.saveDiceCountPreference(count)
  },
  handleIncreaseCount() {
    const count = this.data.diceCount + 1
    if (this.game && !this.data.isLocked && count <= 6 && this.game.setDiceCount(count)) this.saveDiceCountPreference(count)
  },
  preventMove() {},

  onHide() {
    this._visible = false
    this._touchStart = null
    if (this._scene3D) this._scene3D.suspend()
    if (this.game) this.game.cancelMotion()
    this.stopSound()
    this.stopMotionSensor()
  },
  onUnload() {
    this.onHide()
    this._destroyed = true
    if (this._settingsCloseTimer) clearTimeout(this._settingsCloseTimer)
    this._settingsCloseTimer = null
    if (this._snapshotLoadTimer) clearTimeout(this._snapshotLoadTimer)
    this._snapshotLoadTimer = null
    if (this._snapshotReleaseTimer) clearTimeout(this._snapshotReleaseTimer)
    this._snapshotReleaseTimer = null
    this._settingsPending = false
    this._sceneGeneration = (this._sceneGeneration || 0) + 1
    if (this._scene3D) this._scene3D.dispose()
    this._scene3D = null
    if (this.game) this.game.dispose()
    this.game = null
    if (this._audio) this._audio.destroy()
    this._audio = null
  }
})
