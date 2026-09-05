// Offline visual QA using production geometry, assets and scene styles.
// This complements, and does not replace, screenshots from the WeChat simulator.
const fs = require('node:fs/promises')
const path = require('node:path')
const { createDiceLayout, dicePositionStyle } = require('../utils/dice-layout')
const { chromium } = require(process.env.DICE_PLAYWRIGHT_MODULE || 'playwright')
const root = path.resolve(__dirname, '..')
const output = process.argv[2]
if (!output) throw new Error('Pass an output directory outside the watched mini-program project')
function seededRandom(seed) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296 }
}
async function main() {
  await fs.mkdir(output, { recursive: true })
  const css = (await fs.readFile(path.join(root, 'pages/index/index.wxss'), 'utf8')).replace(/@import[^;]+;/, '').replace(/rpx/g, 'px')
  const image = async name => 'data:image/png;base64,' + (await fs.readFile(path.join(root, 'assets', name))).toString('base64')
  const tray = await image('tray-black-lowrim.png')
  const dice = await Promise.all(Array.from({ length: 6 }, (_, index) => image(`dice-perspective/die-${index + 1}.png`)))
  const cards = []
  const rows = []
  for (let count = 1; count <= 6; count++) for (let seed = 1; seed <= 6; seed++) {
    const poses = createDiceLayout(count, seededRandom(seed * 715 + count))
    rows.push({ count, seed, poses })
    cards.push(`<article><span>${count} dice · seed ${seed}</span><div class="gallery-stage"><div class="tray-scene"><img class="tray-art" src="${tray}"><div class="dice-tray">${poses.map((pose, index) => `<div class="die" style="${dicePositionStyle(pose)}"><div class="die-shadow"></div><img class="die-image" src="${dice[(index + seed - 1) % 6]}"></div>`).join('')}</div><img class="tray-front" src="${tray}"></div></div></article>`)
  }
  const html = `<!doctype html><meta charset="UTF-8"><style>${css}\nbody{margin:0;background:#353739;color:#e5e5e5;font:15px Arial}main{display:grid;grid-template-columns:repeat(3,400px);gap:12px;padding:12px}article{background:#303234;border:1px solid #585b5c;border-radius:10px;overflow:hidden}article span{display:block;padding:8px 14px}.gallery-stage{position:relative;width:398px;height:252px;overflow:hidden}.tray-scene{bottom:14px;transform:translateX(-50%) scale(.68);transform-origin:50% 100%}</style><main>${cards.join('')}</main>`
  await fs.writeFile(path.join(output, 'gallery.html'), html)
  await fs.writeFile(path.join(output, 'layouts.json'), JSON.stringify(rows, null, 2))
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  try {
    const page = await browser.newPage({ viewport: { width: 1248, height: 1100 }, deviceScaleFactor: 1 })
    await page.setContent(html)
    await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())))
    // Split into two readable sheets; all 36 cases are retained in gallery.html.
    for (let start = 0; start < 36; start += 18) {
      await page.locator('article').evaluateAll((articles, start) => articles.forEach((article, i) => { article.style.display = i >= start && i < start + 18 ? '' : 'none' }), start)
      await page.screenshot({ path: path.join(output, `gallery-${start === 0 ? '1-3' : '4-6'}.png`), fullPage: true })
    }
    console.log(JSON.stringify({ cards: rows.length, output }))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
