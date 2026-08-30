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

test('game starts covered with five dice ready beneath the cup', () => {
  const game = createDiceGame()
  const state = game.getState()

  assert.equal(state.phase, 'covered')
  assert.equal(state.isBusy, false)
  assert.equal(state.actionLabel, '摇一摇')
  assert.equal(state.statusText, '点击按钮，摇出你的好运气')
  assert.deepEqual(state.dice.map((die) => die.value), [1, 2, 3, 4, 5])
  assert.equal(state.total, 15)
})

test('startRoll covers, shakes, then reveals one fresh five-die result', () => {
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

  assert.equal(clock.runNext(), COVER_DURATION_MS)
  assert.equal(game.getState().phase, 'shaking')
  assert.equal(clock.runNext(), SHAKE_DURATION_MS)

  const revealed = game.getState()
  assert.equal(revealed.phase, 'revealed')
  assert.equal(revealed.isBusy, false)
  assert.equal(revealed.actionLabel, '再摇一次')
  assert.equal(revealed.statusText, '结果揭晓！五颗骰子合计 16 点')
  assert.deepEqual(revealed.dice.map((die) => die.value), [1, 2, 3, 4, 6])
  assert.equal(revealed.total, 16)
  assert.deepEqual(states.map((state) => state.phase), ['covering', 'shaking', 'revealed'])
})

test('dispose cancels an unfinished animation', () => {
  const clock = createFakeClock()
  const game = createDiceGame({ schedule: clock.schedule, cancel: clock.cancel })

  game.startRoll()
  assert.equal(clock.activeCount(), 1)

  game.dispose()
  assert.equal(clock.activeCount(), 0)
})
