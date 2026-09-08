// Pass this function as wechatide automation_evaluate --fn-source.
// Uses real page methods and rendered selectors; injected motion samples do not validate phone hardware.
(async function () {
  const p = getCurrentPages()[0];
  const originalMotion = p.data.motionEnabled;
  const originalCount = p.data.diceCount;
  const originalLock = p.data.isLocked;
  const passed = [];
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (ok, name) => { if (!ok) throw new Error(name); passed.push(name) };
  const positions = () => JSON.stringify(p._scene3D.inspect().dice.map(die => die.position));
  const setMotion = value => {
    p.handleOpenSettings();
    p.handleMotionChange({ detail: { value } });
    p.handleSaveSettings();
  };
  const query = selector => new Promise(resolve => wx.createSelectorQuery().selectAll(selector).boundingClientRect(resolve).exec());
  const shake = async () => {
    p.handleAcceleration({ x: 0, y: 0, z: 1 }); await wait(100);
    p.handleAcceleration({ x: 1.6, y: 0, z: 1 }); await wait(100);
    p.handleAcceleration({ x: -1.6, y: 0, z: 1 });
  };
  try {
    p.game.cancelMotion();
    p.handleCloseSettings();
    if (p.data.isLocked) p.handleToggleLock();
    setMotion(false);
    await wait(150);
    const button = (await query('.roll-button'))[0];
    check(Boolean(button) && !p._accelerometerListener, 'button mode renders roll and stops sensor');
    await shake();
    check(!p.data.isBusy, 'button mode ignores motion samples');
    p.handleOpenSettings();
    p.handleMotionChange({ detail: { value: true } });
    p.handleCloseSettings();
    check(!p.data.motionEnabled, 'closing settings cancels mode draft');
    setMotion(true);
    await wait(150);
    check(p.data.motionEnabled && Boolean(p._accelerometerListener), 'saving motion starts sensor');
    check(wx.getStorageSync('dice-shaker-motion-enabled') === true, 'motion preference persisted');
    check((await query('.roll-button')).length === 0, 'roll button removed in motion mode');
    const locks = await query('.lock-button');
    check(locks.length === 1 && Math.abs(locks[0].left - button.left) < 1 && Math.abs(locks[0].width - button.width) < 1 && Math.abs(locks[0].top - button.top) < 1, 'single lock occupies original roll position and size');
    p.handleRoll();
    check(!p.data.isBusy, 'motion mode rejects button handler');
    p.handleToggleLock();
    await shake();
    check(!p.data.isBusy, 'lock blocks motion');
    p.handleToggleLock();
    const before = positions();
    await shake();
    check(p.data.isBusy, 'unlocked motion samples start roll');
    await wait(1650);
    check(p.data.phase === 'covered' && p.data.hasRolled && positions() !== before, 'roll finishes covered with a new layout');
    check(p._scene3D.inspect().progress === 0 && p._scene3D.inspect().triangles === 6720, 'covered cup skips every die mesh');
    const rolled = positions();
    p.game.setLidProgress(1);
    p.game.setLidProgress(0.4);
    check(positions() === rolled, 'manual reveal preserves layout');
    p.handleOpenSettings();
    check(!p._accelerometerListener, 'settings pause motion listener');
    p.handleCloseSettings();
    check(Boolean(p._accelerometerListener), 'closing settings resumes motion listener');
    p.onHide();
    check(!p._accelerometerListener && !p.data.isBusy, 'hide releases sensor and cancels motion');
    p.onShow();
    check(Boolean(p._accelerometerListener), 'show resumes motion listener');
    setMotion(false);
    await wait(150);
    check((await query('.roll-button')).length === 1 && (await query('.lock-button--primary')).length === 0, 'disabling motion restores button and side lock');
    for (let count = 1; count <= 6; count += 1) {
      p.game.setDiceCount(count);
      p.game.setLidProgress(1);
      await wait(50);
      const scene = p._scene3D.inspect();
      check(scene.count === count && scene.triangles === 6720 + count * 19596, 'renders ' + count + ' dice');
    };
    return { passed: passed.length, checks: passed, viewport: wx.getWindowInfo().windowWidth };
  } finally {
    p.game.cancelMotion();
    p.handleCloseSettings();
    if (p.data.isLocked) p.handleToggleLock();
    p.game.setDiceCount(originalCount);
    setMotion(originalMotion);
    if (originalLock) p.handleToggleLock();
    p.game.setLidProgress(1);
  };
})
