const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const pageModulePath = path.resolve(__dirname, '../pages/index/index.js')

test('index page connects its button and lifecycle to the dice game', () => {
  let definition
  global.Page = (pageDefinition) => {
    definition = pageDefinition
  }

  delete require.cache[pageModulePath]
  require(pageModulePath)

  assert.equal(typeof definition.onLoad, 'function')
  assert.equal(typeof definition.handleRoll, 'function')
  assert.equal(typeof definition.onUnload, 'function')

  const page = {
    updates: [],
    setData(nextState) {
      this.updates.push(nextState)
      this.data = nextState
    }
  }

  definition.onLoad.call(page)
  assert.equal(page.data.phase, 'covered')
  assert.equal(page.data.dice.length, 5)

  definition.handleRoll.call(page)
  assert.equal(page.data.phase, 'covering')
  assert.equal(page.data.isBusy, true)

  definition.onUnload.call(page)
  assert.equal(page.game, null)

  delete global.Page
})
