const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')

const pageModulePath = path.resolve(__dirname, '../pages/index/index.js')

test('index page connects both controls and lifecycle to the dice game', (t) => {
  let definition
  const previousPage = global.Page
  t.after(() => {
    if (previousPage === undefined) delete global.Page
    else global.Page = previousPage
    delete require.cache[pageModulePath]
  })
  global.Page = (pageDefinition) => {
    definition = pageDefinition
  }

  delete require.cache[pageModulePath]
  require(pageModulePath)

  assert.equal(typeof definition.onLoad, 'function')
  assert.equal(typeof definition.handleRoll, 'function')
  assert.equal(typeof definition.handleToggleLid, 'function')
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

  definition.handleToggleLid.call(page)
  assert.equal(page.data.phase, 'opening')
  assert.equal(page.data.isLidOpen, true)
  definition.onUnload.call(page)
  assert.equal(page.game, null)
  definition.handleToggleLid.call(page)
  definition.handleRoll.call(page)

  definition.onLoad.call(page)

  definition.handleRoll.call(page)
  assert.equal(page.data.phase, 'covering')
  assert.equal(page.data.isBusy, true)

  definition.onUnload.call(page)
  assert.equal(page.game, null)

})
