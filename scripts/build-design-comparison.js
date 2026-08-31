// 只裁切与并排排列验收截图，不修改界面内容。
const path = require('node:path')
const fs = require('node:fs/promises')
const sharp = require(process.env.DICE_SHARP_MODULE || 'sharp')
const design = path.resolve(__dirname, '..', 'design')
const viewportCrop = { left: 822, top: 174, width: 360, height: 678 }
const cardCrop = { left: 837, top: 284, width: 330, height: 440 }

async function region(name, crop, scale = 1) {
  return sharp(path.join(design, name)).extract(crop)
    .resize(crop.width * scale, crop.height * scale).png().toBuffer()
}

async function pair(left, right, name, crop, scale = 1) {
  const width = crop.width * scale
  const height = crop.height * scale
  await sharp({ create: { width: width * 2 + 16, height, channels: 3, background: '#dfe7dd' } })
    .composite([
      { input: await region(left, crop, scale), left: 0, top: 0 },
      { input: await region(right, crop, scale), left: width + 16, top: 0 }
    ]).png().toFile(path.join(design, name))
}

async function main() {
  await pair('before-revealed.png', 'after-open-preserved.jpg', 'comparison-before-after.png', viewportCrop)
  await pair('before-revealed.png', 'after-open-preserved.jpg', 'comparison-card-detail.png', cardCrop, 2)
  await pair('after-closed-initial.jpg', 'after-open-preserved.jpg', 'preview-closed-open.png', viewportCrop)
  const dimensions = {}
  for (const name of ['before-revealed.png', 'after-closed-initial.jpg', 'after-open-preserved.jpg']) {
    const metadata = await sharp(path.join(design, name)).metadata()
    dimensions[name] = { width: metadata.width, height: metadata.height, format: metadata.format }
  }
  await fs.writeFile(path.join(design, 'comparison-metadata.json'), JSON.stringify({ dimensions, viewportCrop, cardCrop, note: 'Native simulator at the same preset and scale; screenshots contain desktop chrome, comparisons retain app content only. No semantic image editing.' }, null, 2) + '\n', 'utf8')
  console.log('已生成改版前后对照、卡片细节对照与开合状态预览。')
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
