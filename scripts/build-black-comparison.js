// 仅裁切和排列真实截图；不重画界面，不伪造模拟器状态。
const path = require('node:path')
const fs = require('node:fs/promises')
const sharp = require(process.env.DICE_SHARP_MODULE || 'sharp')
const dir = path.resolve(__dirname, '../design/black-implementation')
async function main() {
  const comparisons = []
  for (const [name, sourceX] of [['closed', 0], ['open', 495], ['settings', 989]]) {
    const src = await sharp(path.join(dir, 'reference.png'))
      .extract({ left: sourceX, top: 78, width: 484, height: 990 })
      .resize(430, 880).png().toBuffer()
    // 实机模拟器截图为内容区 645×1251，缩到逻辑尺寸 430×834 后只在底部补齐对照画布。
    const shot = await sharp(path.join(dir, `${name}.png`)).resize(430, 834).png().toBuffer()
    await sharp({ create: { width: 874, height: 880, channels: 3, background: '#353739' } })
      .composite([{ input: src, left: 0, top: 0 }, { input: shot, left: 444, top: 0 }])
      .png().toFile(path.join(dir, `compare-${name}.png`))
    comparisons.push({ name, source: { x: sourceX, y: 78, width: 484, height: 990 }, native: await sharp(path.join(dir, `${name}.png`)).metadata().then(m => ({ width: m.width, height: m.height })), note: 'Source scaled to 430x880; native downsampled 1.5x to 430x834. Bottom 46px on native side is canvas padding, not UI. Device chrome excluded, responsive height difference explicitly retained.' })
  }
  const shots = []
  for (const name of ['closed', 'open', 'settings', 'locked']) shots.push(await sharp(path.join(dir, `${name}.png`)).resize(323, 626).png().toBuffer())
  await sharp({ create: { width: 1328, height: 626, channels: 3, background: '#eeece8' } })
    .composite(shots.map((input, i) => ({ input, left: i * 335, top: 0 }))).png().toFile(path.join(dir, 'preview-four-states.png'))
  const left = await sharp(path.join(dir, 'compare-open.png')).extract({ left: 0, top: 345, width: 430, height: 320 }).png().toBuffer()
  const right = await sharp(path.join(dir, 'compare-open.png')).extract({ left: 444, top: 345, width: 430, height: 320 }).png().toBuffer()
  await sharp({ create: { width: 874, height: 320, channels: 3, background: '#353739' } })
    .composite([{ input: left, left: 0, top: 0 }, { input: right, left: 444, top: 0 }]).png().toFile(path.join(dir, 'compare-dice-detail.png'))
  await fs.writeFile(path.join(dir, 'comparison-metadata.json'), JSON.stringify({ viewport: { screen: [430, 932], window: [430, 834], nativeDPR: 3, screenshotScale: 1.5 }, comparisons }, null, 2))
  // 用户追加要求：对照真实模拟器中改动前后骰子的侧面与排布，不重绘点数。
  const diceDetails = []
  for (const name of ['open-before-dice-refinement', 'open']) {
    diceDetails.push(await sharp(path.join(dir, `${name}.png`))
      .extract({ left: 85, top: 550, width: 475, height: 310 }).png().toBuffer())
  }
  await sharp({ create: { width: 964, height: 310, channels: 3, background: '#353739' } })
    .composite(diceDetails.map((input, i) => ({ input, left: i * 489, top: 0 })))
    .png().toFile(path.join(dir, 'compare-dice-before-after.png'))
  const fiveSix = []
  for (const name of ['open', 'six-dice']) fiveSix.push(await sharp(path.join(dir, `${name}.png`)).resize(430, 834).png().toBuffer())
  await sharp({ create: { width: 874, height: 834, channels: 3, background: '#eeece8' } })
    .composite(fiveSix.map((input, i) => ({ input, left: i * 444, top: 0 })))
    .png().toFile(path.join(dir, 'preview-five-six.png'))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
