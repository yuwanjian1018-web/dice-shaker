const { createDiceGame } = require('../../utils/game')
const { createDiceLayout, dicePositionStyle } = require('../../utils/dice-layout')
const { createShakeDetector } = require('../../utils/shake-detector')

const LID_TRAVEL_RPX = 308
const MOTION_SETTING_KEY = 'dice-shaker-motion-enabled'

Page({
  data: {
    phase: 'covered', isBusy: false, isLidOpen: false, hasRolled: false,
    isLocked: false, diceCount: 5, actionLabel: '摇一摇', dice: [],
    settingsOpen: false, draftDiceCount: 5, soundError: false,
    motionEnabled: false, draftMotionEnabled: false, motionError: false,
    lidProgress: 0, lidStyle: 'transform:translate3d(0,0,0);'
  },

  onLoad() {
    this._visible = true
    this._previousPhase = 'covered'
    this._detector = createShakeDetector()
    try {
      const motionEnabled = typeof wx !== 'undefined' && wx.getStorageSync && wx.getStorageSync(MOTION_SETTING_KEY) === true
      this.setData({ motionEnabled: Boolean(motionEnabled), draftMotionEnabled: Boolean(motionEnabled) })
    } catch (error) {}
    let windowWidth = 375
    try {
      const windowInfo = typeof wx !== 'undefined' && wx.getWindowInfo ? wx.getWindowInfo() : null
      if (windowInfo && Number.isFinite(windowInfo.windowWidth)) windowWidth = windowInfo.windowWidth
    } catch (error) {}
    this._lidTravelPx = LID_TRAVEL_RPX * windowWidth / 750
    this.initSound()
    this.game = createDiceGame({ onChange: (state) => this.applyGameState(state) })
    this.applyGameState(this.game.getState())
  },

  applyGameState(state) {
    const rolled = this._lastRollRevision !== state.rollRevision
    if (!this._diceLayout || this._diceLayout.length !== state.diceCount || rolled) {
      this._diceLayout = createDiceLayout(state.diceCount)
    }
    this._lastRollRevision = state.rollRevision
    const dice = state.dice.map((die, index) => ({
      ...die,
      position: dicePositionStyle(this._diceLayout[index])
    }))
    const lidOffsetRpx = Math.round(state.lidProgress * LID_TRAVEL_RPX * 10) / 10
    this.setData({ ...state, dice, lidStyle: `transform:translate3d(0,-${lidOffsetRpx}rpx,0);` })
    if (state.phase === 'shaking' && this._previousPhase !== 'shaking' && this._visible) {
      if (this._audio) { this._audio.stop(); this._audio.play() }
      if (typeof wx !== 'undefined' && wx.vibrateShort) wx.vibrateShort({ type: 'medium', fail() {} })
    } else if (state.phase !== 'shaking' && this._previousPhase === 'shaking') this.stopSound()
    this._previousPhase = state.phase
  },

  initSound() {
    if (typeof wx === 'undefined' || !wx.createInnerAudioContext) return
    try {
      this._audio = wx.createInnerAudioContext()
      this._audio.src = '/assets/audio/dice-shake.wav'
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
    if (!this.data.motionEnabled || !this._visible || this.data.settingsOpen) {
      this.stopMotionSensor()
      return
    }
    if (this._accelerometerListener) return
    const listener = sample => this.handleAcceleration(sample)
    this._accelerometerListener = listener
    const fail = () => {
      if (this._accelerometerListener !== listener) return
      this.stopMotionSensor()
      this.setData({ motionEnabled: false, draftMotionEnabled: false, motionError: true })
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
    if (!this.data.motionEnabled || !this.game || !this._visible || this.data.settingsOpen || this.data.isLocked || this.data.isBusy) {
      if (this._detector) this._detector.reset()
      return
    }
    if (this._detector && this._detector.push(sample)) this.game.startRoll()
  },

  handleRoll() {
    if (!this.data.motionEnabled && this.game && this._visible && !this.data.settingsOpen) this.game.startRoll()
  },
  handleToggleLock() {
    if (!this.game || this.data.settingsOpen) return
    this.game.toggleLock()
    if (this._detector) this._detector.reset()
  },

  handleTouchStart(event) {
    if (this.data.isBusy || this.data.settingsOpen) return
    const touch = event.touches && event.touches[0]
    const state = this.game && this.game.getState()
    this._touchStart = touch && state ? { y: touch.clientY, progress: state.lidProgress } : null
  },
  updateLidFromTouch(touch) {
    const start = this._touchStart
    if (!start || !touch || !this.game || this.data.isBusy || this.data.settingsOpen) return
    const progress = start.progress + (start.y - touch.clientY) / this._lidTravelPx
    this.game.setLidProgress(progress)
  },
  handleTouchMove(event) {
    this.updateLidFromTouch(event.touches && event.touches[0])
  },
  handleTouchEnd(event) {
    this.updateLidFromTouch(event.changedTouches && event.changedTouches[0])
    this._touchStart = null
  },
  handleTouchCancel() { this._touchStart = null },

  handleOpenSettings() {
    if (this.data.isBusy) return
    this.setData({ settingsOpen: true, draftDiceCount: this.data.diceCount, draftMotionEnabled: this.data.motionEnabled })
    this.syncMotionSensor()
  },
  handleCloseSettings() {
    this.setData({ settingsOpen: false })
    this.syncMotionSensor()
  },
  handleMotionChange(event) {
    this.setData({ draftMotionEnabled: Boolean(event.detail.value) })
  },
  handleDecreaseCount() {
    if (!this.data.isLocked && this.data.draftDiceCount > 1) this.setData({ draftDiceCount: this.data.draftDiceCount - 1 })
  },
  handleIncreaseCount() {
    if (!this.data.isLocked && this.data.draftDiceCount < 6) this.setData({ draftDiceCount: this.data.draftDiceCount + 1 })
  },
  handleSaveSettings() {
    if (this.game && !this.data.isLocked) this.game.setDiceCount(this.data.draftDiceCount)
    this.setData({ settingsOpen: false, motionEnabled: this.data.draftMotionEnabled, motionError: false })
    this.saveMotionPreference()
    this.syncMotionSensor()
  },
  preventMove() {},

  onHide() {
    this._visible = false
    if (this.game) this.game.cancelMotion()
    this.stopSound()
    this.stopMotionSensor()
  },
  onUnload() {
    this.onHide()
    if (this.game) this.game.dispose()
    this.game = null
    if (this._audio) this._audio.destroy()
    this._audio = null
  }
})
