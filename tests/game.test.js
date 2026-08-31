const test = require('node:test')
const assert = require('node:assert/strict')

const {
  COVER_DURATION_MS,
  SHAKE_DURATION_MS,
  OPEN_DURATION_MS,
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

test('game starts covered with five dice ready beneath the cup', () => {
  const game = createDiceGame()
  const state = game.getState()

  assert.equal(state.phase, 'covered')
  assert.equal(state.isBusy, false)
  assert.equal(state.actionLabel, '摇一摇')
  assert.equal(state.isLidOpen, false)
  assert.equal(state.lidActionLabel, '打开盖子')
  assert.deepEqual(state.dice.map((die) => die.value), [1, 2, 3, 4, 5])
  assert.equal(Object.hasOwn(state, 'total'), false)
})

test('shaking creates one fresh result but keeps the lid closed until a manual reveal', () => {
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

  assert.equal(game.startRoll(), true)
  assert.equal(game.startRoll(), false, 'a second tap is ignored while animation runs')
  assert.equal(game.getState().phase, 'covering')
  assert.equal(game.getState().isBusy, true)
  assert.equal(game.toggleLid(), false)

  assert.equal(clock.runNext(), COVER_DURATION_MS)
  assert.equal(game.getState().phase, 'shaking')
  assert.equal(game.toggleLid(), false)
  assert.equal(clock.runNext(), SHAKE_DURATION_MS)

  const covered = game.getState()
  assert.equal(covered.phase, 'covered')
  assert.equal(covered.isLidOpen, false)
  assert.equal(covered.isBusy, false)
  assert.equal(covered.hasRolled, true)
  assert.equal(covered.statusText, '摇好了，打开看看吧')
  assert.deepEqual(covered.dice.map((die) => die.value), [1, 2, 3, 4, 6])
  assert.equal(clock.activeCount(), 0, 'no automatic reveal is scheduled')
  assert.deepEqual(states.map((state) => state.phase), ['covering', 'shaking', 'covered'])
  assert.equal(game.toggleLid(), true)
  assert.equal(clock.runNext(), OPEN_DURATION_MS)
  assert.equal(game.getState().phase, 'revealed')
  assert.equal(randomIndex, 5, 'opening does not roll again')
})

test('dispose cancels an unfinished animation', () => {
  const clock = createFakeClock()
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel })

  game.startRoll()
  assert.equal(clock.activeCount(), 1)

  game.dispose()
  assert.equal(clock.activeCount(), 0)
})

test('repeated manual opening and closing preserves the dice and blocks overlapping actions', () => {
  const clock = createFakeClock()
  let randomCalls = 0
  const game = createDiceGame({ random: () => { randomCalls += 1; return 0.2 }, schedule: clock.schedule, cancel: clock.cancel })
  const initialDice = game.getState().dice

  for (let repeat = 0; repeat < 4; repeat += 1) {
    assert.equal(game.toggleLid(), true)
    assert.equal(game.getState().phase, 'opening')
    assert.equal(game.toggleLid(), false)
    assert.equal(game.startRoll(), false)
    assert.equal(clock.runNext(), OPEN_DURATION_MS)
    assert.equal(game.getState().isLidOpen, true)
    assert.equal(game.getState().lidActionLabel, '合上盖子')

    assert.equal(game.toggleLid(), true)
    assert.equal(game.getState().phase, 'closing')
    assert.equal(game.toggleLid(), false)
    assert.equal(game.startRoll(), false)
    assert.equal(clock.runNext(), COVER_DURATION_MS)
    assert.equal(game.getState().isLidOpen, false)
    assert.deepEqual(game.getState().dice, initialDice)
    assert.equal(clock.activeCount(), 0)
  }
  assert.equal(randomCalls, 0)
})

test('rolling while open closes first, keeps old dice hidden and then waits for manual reveal', () => {
  const clock = createFakeClock()
  let randomCalls = 0
  const game = createDiceGame({ random: () => { randomCalls += 1; return 0.999 }, schedule: clock.schedule, cancel: clock.cancel })
  game.toggleLid()
  clock.runNext()
  assert.equal(game.startRoll(), true)
  assert.equal(game.getState().isLidOpen, false)
  assert.equal(game.getState().phase, 'covering')
  assert.equal(randomCalls, 0)
  clock.runNext()
  assert.equal(randomCalls, 0)
  clock.runNext()
  assert.equal(randomCalls, 5)
  assert.deepEqual(game.getState().dice.map(die => die.value), [6, 6, 6, 6, 6])
  assert.equal(game.getState().phase, 'covered')
  const rolledDice = game.getState().dice
  game.toggleLid()
  clock.runNext()
  game.toggleLid()
  clock.runNext()
  game.toggleLid()
  clock.runNext()
  assert.deepEqual(game.getState().dice, rolledDice)
  assert.equal(randomCalls, 5)
})

test('disposing during opening, closing or shaking cancels every pending update', () => {
  for (const target of ['opening', 'closing', 'shaking']) {
    const clock = createFakeClock()
    const updates = []
    const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, onChange: state => updates.push(state) })
    if (target === 'shaking') { game.startRoll(); clock.runNext() }
    else {
      game.toggleLid()
      if (target === 'closing') { clock.runNext(); game.toggleLid() }
    }
    assert.equal(game.getState().phase, target)
    const beforeDispose = updates.length
    game.dispose()
    assert.equal(clock.activeCount(), 0)
    assert.equal(game.toggleLid(), false)
    assert.equal(game.startRoll(), false)
    assert.equal(updates.length, beforeDispose)
  }
})

test('lock blocks every roll while keeping manual reveal and prior values available', () => {
  const clock = createFakeClock()
  let randomCalls = 0
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, random: () => { randomCalls++; return .7 } })
  const original = game.getState().dice
  game.toggleLock()
  assert.equal(game.getState().isLocked, true)
  for (let i = 0; i < 5; i++) assert.equal(game.startRoll(), false)
  assert.equal(game.setDiceCount(6), false)
  assert.equal(game.toggleLid(), true)
  clock.runNext()
  assert.deepEqual(game.getState().dice, original)
  assert.equal(randomCalls, 0)
  game.toggleLock()
  assert.equal(game.startRoll(), true)
  clock.runNext(); clock.runNext()
  assert.equal(randomCalls, 5)
})

test('locking during cover or shake cancels all pending random result commits', () => {
  for (const phase of ['covering', 'shaking']) {
    const clock = createFakeClock()
    let randomCalls = 0
    const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, random: () => { randomCalls++; return .5 } })
    const original = game.getState().dice
    game.startRoll()
    if (phase === 'shaking') clock.runNext()
    game.toggleLock()
    assert.equal(game.getState().phase, 'covered')
    assert.equal(game.getState().isLocked, true)
    assert.equal(game.getState().isBusy, false)
    assert.equal(clock.activeCount(), 0)
    assert.deepEqual(game.getState().dice, original)
    assert.equal(randomCalls, 0)
  }
})

test('all six count settings roll exactly that count and reject invalid or busy changes', () => {
  const clock = createFakeClock()
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel, random: () => .99 })
  for (const invalid of [0, 7, 2.5, '3', NaN]) assert.equal(game.setDiceCount(invalid), false)
  for (let count = 1; count <= 6; count++) {
    assert.equal(game.setDiceCount(count), true)
    assert.equal(game.getState().dice.length, count)
    game.startRoll()
    assert.equal(game.setDiceCount(2), false)
    clock.runNext(); clock.runNext()
    assert.deepEqual(game.getState().dice.map(die => die.value), Array(count).fill(6))
  }
})
