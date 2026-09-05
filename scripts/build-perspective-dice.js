// Asset preparation only: chroma-key, crop, resize and transparent padding.
// All shapes, perspective and pips come from the retained ImageGen source.
const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require(process.env.DICE_SHARP_MODULE || 'sharp')
const root = path.resolve(__dirname, '..')

async function main() {
  const design = path.join(root, 'design/fuller-pips-20260905')
  const source = path.join(design, 'dice-atlas-green.png')
  const output = path.join(root, 'assets/dice-perspective')
  await fs.mkdir(output, { recursive: true })
  const records = []
  const previews = []
  for (let index = 0; index < 6; index++) {
    const { data, info } = await sharp(source).extract({ left: index % 3 * 512, top: Math.floor(index / 3) * 512, width: 512, height: 512 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    let left = 512, top = 512, right = 0, bottom = 0
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const offset = (y * 512 + x) * 4
      const [r, g, b] = data.subarray(offset, offset + 3)
      if (g > Math.max(r, b) + 20 && g > 100) {
        data[offset + 3] = 0
      } else {
        if (g > Math.max(r, b)) data[offset + 1] = Math.max(r, b)
        left = Math.min(left, x); right = Math.max(right, x)
        top = Math.min(top, y); bottom = Math.max(bottom, y)
      }
    }
    const bounds = { left, top, width: right - left + 1, height: bottom - top + 1 }
    const sprite = await sharp(data, { raw: info }).extract(bounds).resize(216, 216, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ left: 12, right: 12, top: 12, bottom: 12, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer()
    await fs.writeFile(path.join(output, `die-${index + 1}.png`), sprite)
    records.push({ value: index + 1, bounds, bytes: sprite.length })
    previews.push({ input: sprite, left: index % 3 * 260 + 10, top: Math.floor(index / 3) * 260 + 10 })
  }
  await sharp({ create: { width: 780, height: 520, channels: 4, background: '#353739' } }).composite(previews).png().toFile(path.join(design, 'dice-alpha-qa.png'))
  await fs.writeFile(path.join(design, 'asset-validation.json'), JSON.stringify(records, null, 2) + '\n')
  if (process.argv.includes('--dice-only')) {
    console.log(JSON.stringify(records))
    return
  }
  const tray = await sharp(path.join(root, 'design/perspective-20260905/tray-low-rim-green.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let left = tray.info.width, top = tray.info.height, right = 0, bottom = 0
  for (let y = 0; y < tray.info.height; y++) for (let x = 0; x < tray.info.width; x++) {
    const offset = (y * tray.info.width + x) * 4
    const [r, g, b] = tray.data.subarray(offset, offset + 3)
    if (g > Math.max(r, b) + 20 && g > 100) tray.data[offset + 3] = 0
    else {
      if (g > Math.max(r, b)) tray.data[offset + 1] = Math.max(r, b)
      left = Math.min(left, x); right = Math.max(right, x)
      top = Math.min(top, y); bottom = Math.max(bottom, y)
    }
  }
  // Match the original ellipse's projection and center; retain a thinner wall.
  await sharp(tray.data, { raw: tray.info }).extract({ left, top, width: right - left + 1, height: bottom - top + 1 })
    .resize(800, 442, { fit: 'fill' }).extend({ top: 13, bottom: 25, left: 0, right: 0, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png().toFile(path.join(root, 'assets/tray-black-lowrim.png'))
  console.log(JSON.stringify(records))
}
main().catch(error => { console.error(error); process.exitCode = 1 })
