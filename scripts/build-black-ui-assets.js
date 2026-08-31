// 重用参考图空白区域纹理和官方 Phosphor 图标，不改动参考原图。
const fs = require('node:fs/promises')
const path = require('node:path')
const sharp = require(process.env.DICE_SHARP_MODULE || 'sharp')
const root = path.resolve(__dirname, '..')

async function main() {
  for (const name of ['gear', 'lock', 'lock-open', 'caret-double-up', 'caret-double-down', 'x', 'minus', 'plus']) {
    const source = await fs.readFile(path.join(root, 'design/icon-sources', `${name}.svg`), 'utf8')
    await sharp(Buffer.from(source.replace(/currentColor/g, '#f3f1ed'))).resize(96, 96).png()
      .toFile(path.join(root, 'assets/icons', `${name}-light.png`))
  }
  const texture = await sharp(path.join(root, 'design/black-implementation/reference.png'))
    .extract({ left: 10, top: 145, width: 470, height: 170 })
    .jpeg({ quality: 90 }).toBuffer()
  await fs.writeFile(path.join(root, 'assets/graphite-texture.jpg'), texture)
  // WXSS 不支持本地背景图片路径，使用同一来源纹理的内嵌 URL 平铺，避免拉成长条。
  await fs.writeFile(path.join(root, 'assets/graphite-texture.wxss'), `.page-shell { background-image: url("data:image/jpeg;base64,${texture.toString('base64')}"); background-size: 470rpx 170rpx; }\n`)
  console.log('Black UI icons and source texture ready')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
