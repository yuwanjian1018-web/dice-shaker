const { createDiceGame } = require('../../utils/game')

Page({
  data: {
    phase: 'covered',
    isBusy: false,
    actionLabel: '摇一摇',
    statusText: '点击按钮，摇出你的好运气',
    dice: [],
    total: 0
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

  onUnload() {
    if (this.game) this.game.dispose()
    this.game = null
  }
})
