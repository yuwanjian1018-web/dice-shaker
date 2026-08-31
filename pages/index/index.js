const { createDiceGame } = require('../../utils/game')

Page({
  data: {
    phase: 'covered',
    isBusy: false,
    isLidOpen: false,
    hasRolled: false,
    actionLabel: '摇一摇',
    lidActionLabel: '打开盖子',
    lidStateLabel: '已合盖',
    statusText: '摇一摇，再打开看看',
    dice: []
  },

  onLoad() {
    this.game = createDiceGame({
      onChange: (nextState) => this.setData(nextState)
    })
    this.setData(this.game.getState())
  },

  handleRoll() {
    if (this.game) this.game.startRoll()
  },

  handleToggleLid() {
    if (this.game) this.game.toggleLid()
  },

  onUnload() {
    if (this.game) this.game.dispose()
    this.game = null
  }
})
