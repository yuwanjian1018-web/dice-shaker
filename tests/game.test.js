const test = require('node:test')
const assert = require('node:assert/strict')

const {
  COVER_DURATION_MS,
  SHAKE_DURATION_MS,
  createDiceGame
} = require('../utils/game')

function createFakeClock() {
  let nextId = 1
  const tasks = []

  return {
    schedule(callback, delay) {
      const task = { id: nextId++, callback, delay, cancelled: false }
      tasks.push(task)
      return task.id
    },
    cancel(id) {
      const task = tasks.find((candidate) => candidate.id === id)
      if (task) task.cancelled = true
    },
    runNext() {
      const task = tasks.find((candidate) => !candidate.cancelled && !candidate.ran)
      assert.ok(task, 'expected a scheduled task')
      task.ran = true
      task.callback()
      return task.delay
    },
    activeCount() {
      return tasks.filter((task) => !task.cancelled && !task.ran).length
    }
  }
}

test('game starts fully covered with five dice ready beneath the cup', () => {
  const state = createDiceGame().getState()
  assert.equal(state.phase, 'covered')
  assert.equal(state.isBusy, false)
  assert.equal(state.isLidOpen, false)
  assert.equal(state.lidProgress, 0)
  assert.equal(state.actionLabel, '摇一摇')
  assert.deepEqual(state.dice.map((die) => die.value), [1, 2, 3, 4, 5])
  assert.equal(Object.hasOwn(state, 'total'), false)
})

test('manual lid movement is continuous, clamps at both ends and preserves dice', () => {
  const game = createDiceGame()
  const original = game.getState().dice

  assert.equal(game.setLidProgress(0.37), true)
  assert.equal(game.getState().phase, 'lid-moving')
  assert.equal(game.getState().lidProgress, 0.37)
  assert.equal(game.getState().isLidOpen, false)

  assert.equal(game.setLidProgress(1.4), true)
  assert.equal(game.getState().phase, 'revealed')
  assert.equal(game.getState().lidProgress, 1)
  assert.equal(game.getState().isLidOpen, true)

  assert.equal(game.setLidProgress(-0.2), true)
  assert.equal(game.getState().phase, 'covered')
  assert.equal(game.getState().lidProgress, 0)
  assert.deepEqual(game.getState().dice, original)
  assert.equal(game.setLidProgress(NaN), false)
})

test('repeated drag positions do not notify the view and snapshots cannot mutate game state', () => {
  let updates = 0
  const game = createDiceGame({ onChange: () => updates++ })
  game.setLidProgress(.5)
  game.setLidProgress(.50001)
  assert.equal(updates, 1)
  const snapshot = game.getState()
  snapshot.dice[0].value = 6
  assert.equal(game.getState().dice[0].value, 1)
})

test('shaking creates one fresh result and finishes fully covered', () => {
  const clock = createFakeClock()
  const samples = [0, 0.2, 0.4, 0.6, 0.999999]
  const states = []
  let randomIndex = 0
  const game = createDiceGame({
    random: () => samples[randomIndex++],
    schedule: clock.schedule,
    cancel: clock.cancel,
    onChange: (state) => states.push(state)
  })

  game.setLidProgress(0.64)
  assert.equal(game.startRoll(), true)
  assert.equal(game.startRoll(), false)
  assert.equal(game.getState().phase, 'covering')
  assert.equal(game.getState().lidProgress, 0)
  assert.equal(game.setLidProgress(0.5), false)

  assert.equal(clock.runNext(), COVER_DURATION_MS)
  assert.equal(game.getState().phase, 'shaking')
  assert.equal(clock.runNext(), SHAKE_DURATION_MS)

  const covered = game.getState()
  assert.equal(covered.phase, 'covered')
  assert.equal(covered.lidProgress, 0)
  assert.equal(covered.isBusy, false)
  assert.equal(covered.hasRolled, true)
  assert.deepEqual(covered.dice.map((die) => die.value), [1, 2, 3, 4, 6])
  assert.equal(clock.activeCount(), 0)
  assert.deepEqual(states.map((state) => state.phase), ['lid-moving', 'covering', 'shaking', 'covered'])
})

test('dispose and cancelMotion stop pending updates without changing a manual lid position', () => {
  const clock = createFakeClock()
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel })
  game.setLidProgress(0.42)
  game.cancelMotion()
  assert.equal(game.getState().lidProgress, 0.42)
  assert.equal(game.getState().phase, 'lid-moving')

  game.startRoll()
  assert.equal(clock.activeCount(), 1)
  game.dispose()
  assert.equal(clock.activeCount(), 0)
  assert.equal(game.setLidProgress(0.8), false)
  assert.equal(game.startRoll(), false)
})

test('lock blocks rolling and count changes but still allows inspecting the dice', () => {
  const clock = createFakeClock()
  let randomCalls = 0
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, random: () => { randomCalls += 1; return 0.7 } })
  const original = game.getState().dice

  game.toggleLock()
  assert.equal(game.getState().isLocked, true)
  assert.equal(game.startRoll(), false)
  assert.equal(game.setDiceCount(6), false)
  assert.equal(game.setLidProgress(0.73), true)
  assert.equal(game.getState().lidProgress, 0.73)
  assert.deepEqual(game.getState().dice, original)
  assert.equal(randomCalls, 0)

  game.toggleLock()
  assert.equal(game.startRoll(), true)
  clock.runNext()
  clock.runNext()
  assert.equal(randomCalls, 5)
})

test('locking during cover or shake cancels the uncommitted result', () => {
  for (const phase of ['covering', 'shaking']) {
    const clock = createFakeClock()
    let randomCalls = 0
    const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, random: () => { randomCalls += 1; return 0.5 } })
    const original = game.getState().dice
    game.startRoll()
    if (phase === 'shaking') clock.runNext()
    game.toggleLock()
    assert.equal(game.getState().phase, 'covered')
    assert.equal(game.getState().lidProgress, 0)
    assert.equal(game.getState().isLocked, true)
    assert.equal(game.getState().isBusy, false)
    assert.equal(clock.activeCount(), 0)
    assert.deepEqual(game.getState().dice, original)
    assert.equal(randomCalls, 0)
  }
})

test('all six count settings roll exactly that count and reject invalid changes', () => {
  const clock = createFakeClock()
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, random: () => 0.99 })
  for (const invalid of [0, 7, 2.5, '3', NaN]) assert.equal(game.setDiceCount(invalid), false)
  for (let count = 1; count <= 6; count += 1) {
    assert.equal(game.setDiceCount(count), true)
    assert.equal(game.getState().dice.length, count)
    game.startRoll()
    assert.equal(game.setDiceCount(2), false)
    clock.runNext()
    clock.runNext()
    assert.deepEqual(game.getState().dice.map((die) => die.value), Array(count).fill(6))
  }
})
