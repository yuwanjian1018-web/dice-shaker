// 在微信开发者工具 Console 中执行此 IIFE。使用真实页面处理函数和真实音频上下文，不伪造播放状态。
// 会改变当前娱乐骰局和数量（无持久化数据），运行后重新编译可恢复默认 5 颗。
(async () => {
  const p = getCurrentPages()[0]
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const values = () => p.data.dice.map(die => die.value).join(',')
  const originalMotionEnabled = p.data.motionEnabled
  const setMotion = value => {
    p.handleOpenSettings()
    p.handleMotionChange({ detail: { value } })
    p.handleSaveSettings()
  }
  let passed = 0
  let plays = 0
  let stops = 0
  const onPlay = () => { plays++ }
  const onStop = () => { stops++ }
  const check = (ok, name) => { if (!ok) throw new Error(name); passed++; console.log('DICE_QA PASS', name) }
  p._audio.onPlay(onPlay)
  p._audio.onStop(onStop)
  try {
    console.log('DICE_VIEWPORT', JSON.stringify(wx.getWindowInfo()))
    p.handleCloseSettings()
    if (p.data.isLocked) p.handleToggleLock()
    await wait(1600)
    setMotion(false)
    const before = values()
    p.handleToggleLock(); p.handleRoll(); await wait(1700)
    check(p.data.isLocked && !p.data.isBusy && values() === before && plays === 0, 'locked click preserves values and does not play')
    p.handleToggleLock(); p.handleRoll(); await wait(450)
    check(p.data.phase === 'shaking' && plays === 1 && !p._audio.paused, 'unlock starts shake and actual audio playback')
    await wait(1300)
    check(!p.data.isBusy && !p.data.isLidOpen && p.data.hasRolled && p._audio.paused && stops >= 1, 'roll finishes covered and actual audio stops')
    const rolled = values()
    p.game.setLidProgress(.48); await wait(50)
    check(p.data.lidProgress === .48 && values() === rolled, 'manual lid movement stops at an intermediate position')
    p.game.setLidProgress(1); await wait(50)
    check(p.data.isLidOpen && values() === rolled, 'manual full reveal preserves result')
    p.handleRoll()
    check(p.data.phase === 'covering' && p.data.lidProgress === 0, 'roll from open closes first')
    await wait(450); p.handleToggleLock(); await wait(1300)
    check(p.data.isLocked && !p.data.isBusy && values() === rolled && p._audio.paused, 'lock during shake cancels result and stops audio')
    p.handleToggleLock()
    p.handleOpenSettings(); p.handleIncreaseCount(); p.handleCloseSettings()
    check(p.data.diceCount === p.game.getState().diceCount, 'cancel settings does not apply draft')
    for (const count of [1, 6, 5]) {
      p.handleOpenSettings()
      while (p.data.draftDiceCount > count) p.handleDecreaseCount()
      while (p.data.draftDiceCount < count) p.handleIncreaseCount()
      p.handleSaveSettings()
      check(p.data.dice.length === count && p.data.diceCount === count, 'count ' + count + ' applied')
    }
    const motion = async () => {
      p.handleAcceleration({x:0,y:0,z:1}); await wait(100)
      p.handleAcceleration({x:1.6,y:0,z:1}); await wait(100)
      p.handleAcceleration({x:-1.6,y:0,z:1})
    }
    setMotion(true)
    p.handleToggleLock(); await motion()
    check(!p.data.isBusy, 'locked sensor samples do not roll')
    p.handleToggleLock(); await motion()
    check(p.data.isBusy, 'unlocked sensor samples start a roll')
    await wait(450); p.onHide()
    check(!p.data.isBusy && p._audio.paused && !p._accelerometerListener, 'hide stops audio and detaches sensor')
    p.onShow()
    console.log('DICE_QA COMPLETE', passed, 'PASS', 'audioPlay=' + plays, 'audioStop=' + stops)
  } catch (error) { console.error('DICE_QA FAILED', error.message) }
  finally { p.game.cancelMotion(); setMotion(originalMotionEnabled); p._audio.offPlay(onPlay); p._audio.offStop(onStop) }
})()
