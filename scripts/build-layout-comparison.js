// 仅拼接真实参考与模拟器截图；不绘制或改变骰面、角度。
const sharp = require(process.env.DICE_SHARP_MODULE || 'sharp')
const path = require('node:path')
const fs = require('node:fs/promises')
const dir = path.resolve(__dirname, '../design/layout-return-20260831')

async function main() {
  const reference = await sharp(path.join(dir, 'reference.jpg')).png().toBuffer()
  const after = await sharp(path.join(dir, 'open.png')).png().toBuffer()
  const before = await sharp(path.join(dir, '../black-implementation/open.png')).png().toBuffer()
  for (const [name, left] of [['reference-vs-current', reference], ['before-vs-current', before]]) {
    await sharp({ create: { width: 1304, height: 1251, channels: 3, background: '#353739' } })
      .composite([{ input: left, left: 0, top: 0 }, { input: after, left: 659, top: 0 }])
      .png().toFile(path.join(dir, `${name}.png`))
    const region = { left: 80, top: 540, width: 490, height: 350 }
    await sharp({ create: { width: 994, height: 350, channels: 3, background: '#353739' } })
      .composite([
        { input: await sharp(left).extract(region).png().toBuffer(), left: 0, top: 0 },
        { input: await sharp(after).extract(region).png().toBuffer(), left: 504, top: 0 }
      ]).png().toFile(path.join(dir, `${name}-detail.png`))
  }
  // 交付预览仅等比缩小实际截图；全尺寸截图及对照另行保留。
  const previewImages = await Promise.all(['closed.png', 'open.png'].map(async name =>
    sharp(path.join(dir, name)).resize({ width: 323 }).png().toBuffer()))
  await sharp({ create: { width: 660, height: 626, channels: 3, background: '#353739' } })
    .composite(previewImages.map((input, index) => ({ input, left: index * 337, top: 0 })))
    .png().toFile(path.join(dir, 'preview-closed-open.png'))
  await fs.writeFile(path.join(dir, 'comparison-metadata.json'), JSON.stringify({
    reference: 'reference.jpg', before: '../black-implementation/open.png', after: 'open.png',
    inputPixels: [645, 1251], windowLogicalPixels: [430, 834], screenshotScale: 1.5,
    normalization: 'Same content-only pixel dimensions. No scaling or synthetic UI. 14px comparison gutter.',
    detail: { left: 80, top: 540, width: 490, height: 350 },
    smallDevice: { screenLogicalPixels: [375, 667], contentLogicalPixels: [375, 603], screenshotPixels: [563, 905] },
    intentionalChanges: ['Five-dice position layout from reference', 'Current dice images and angle unchanged', 'Cup and tray enlarged about 6 percent']
  }, null, 2) + '\n')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
