const { createDiceGame } = require('../../utils/game')
const { createShakeDetector } = require('../../utils/shake-detector')

// 5 颗恢复参考图的后方1颗、左右各1颗、前方2颗；6 颗保持3+3。
// 仅调整中心位置，保留现有骰子素材、角度和大小。
const DICE_POSITIONS = {
  1: [[50, 51]], 2: [[32, 51], [68, 51]],
  3: [[50, 21], [30, 77], [70, 77]],
  4: [[31, 23], [69, 23], [31, 79], [69, 79]],
  5: [[50, 14], [21, 43], [79, 43], [37, 82], [64, 82]],
  6: [[19, 23], [50, 19], [81, 23], [19, 77], [50, 81], [81, 77]]
}

Page({
  data: {
    phase: 'covered', isBusy: false, isLidOpen: false, hasRolled: false,
    isLocked: false, diceCount: 5, actionLabel: '摇一摇', dice: [],
    settingsOpen: false, draftDiceCount: 5, soundError: false
  },

  onLoad() {
    this._visible = true
    this._previousPhase = 'covered'
    this._detector = createShakeDetector()
    this.initSound()
    this.game = createDiceGame({ onChange: (state) => this.applyGameState(state) })
    this.applyGameState(this.game.getState())
  },

  applyGameState(state) {
    const positions = DICE_POSITIONS[state.diceCount]
    const dice = state.dice.map((die, index) => ({
      ...die, position: `left:${positions[index][0]}%;top:${positions[index][1]}%;z-index:${Math.round(positions[index][1])};`
    }))
    this.setData({ ...state, dice })
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
    if (typeof wx === 'undefined' || !wx.onAccelerometerChange || this._accelerometerListener) return
    this._accelerometerListener = (sample) => this.handleAcceleration(sample)
    wx.onAccelerometerChange(this._accelerometerListener)
    wx.startAccelerometer({ interval: 'game', fail() {} })
  },

  handleAcceleration(sample) {
    if (!this.game || !this._visible || this.data.settingsOpen || this.data.isLocked || this.data.isBusy) {
      if (this._detector) this._detector.reset()
      return
    }
    if (this._detector && this._detector.push(sample)) this.handleRoll()
  },

  handleRoll() {
    if (this.game && this._visible && !this.data.settingsOpen) this.game.startRoll()
  },
  handleToggleLid() {
    if (this.game && !this.data.settingsOpen) this.game.toggleLid()
  },
  handleToggleLock() {
    if (!this.game || this.data.settingsOpen) return
    this.game.toggleLock()
    if (this._detector) this._detector.reset()
  },

  handleTouchStart(event) {
    if (this.data.isBusy || this.data.settingsOpen) return
    const touch = event.touches && event.touches[0]
    this._touchStart = touch ? { x: touch.clientX, y: touch.clientY } : null
  },
  handleTouchEnd(event) {
    const touch = event.changedTouches && event.changedTouches[0]
    const start = this._touchStart
    this._touchStart = null
    if (!start || !touch || !this.game || this.data.isBusy || this.data.settingsOpen) return
    const dx = touch.clientX - start.x
    const dy = touch.clientY - start.y
    if (Math.abs(dy) < 35 || Math.abs(dy) < Math.abs(dx) * 1.2) return
    this._lastSwipe = Date.now()
    if ((dy < 0 && !this.data.isLidOpen) || (dy > 0 && this.data.isLidOpen)) this.game.toggleLid()
  },
  handleCupTap() {
    // 手势结束后部分基础库仍派发 tap，避免一次滑动触发两次开合。
    if (this._lastSwipe && Date.now() - this._lastSwipe < 450) return
    this.handleToggleLid()
  },
  handleTouchCancel() { this._touchStart = null },

  handleOpenSettings() {
    if (this.data.isBusy) return
    this.setData({ settingsOpen: true, draftDiceCount: this.data.diceCount })
    if (this._detector) this._detector.reset()
  },
  handleCloseSettings() { this.setData({ settingsOpen: false }) },
  handleDecreaseCount() {
    if (!this.data.isLocked && this.data.draftDiceCount > 1) this.setData({ draftDiceCount: this.data.draftDiceCount - 1 })
  },
  handleIncreaseCount() {
    if (!this.data.isLocked && this.data.draftDiceCount < 6) this.setData({ draftDiceCount: this.data.draftDiceCount + 1 })
  },
  handleSaveSettings() {
    if (this.game && !this.data.isLocked) this.game.setDiceCount(this.data.draftDiceCount)
    this.setData({ settingsOpen: false })
  },
  preventMove() {},

  onHide() {
    this._visible = false
    if (this.game) this.game.cancelMotion()
    this.stopSound()
    if (this._detector) this._detector.reset()
    if (this._accelerometerListener && typeof wx !== 'undefined') {
      wx.offAccelerometerChange(this._accelerometerListener)
      wx.stopAccelerometer({ fail() {} })
      this._accelerometerListener = null
    }
  },
  onUnload() {
    this.onHide()
    if (this.game) this.game.dispose()
    this.game = null
    if (this._audio) this._audio.destroy()
    this._audio = null
  }
})
