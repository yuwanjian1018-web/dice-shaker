// 将生成原件保存在 design/，只把适合小程序包体的 PNG 放入 assets/。
// 使用已有 sharp 运行时：DICE_SHARP_MODULE 可指定本机模块路径。
const fs = require('node:fs/promises')
const path = require('node:path')
const crypto = require('node:crypto')
const sharp = require(process.env.DICE_SHARP_MODULE || 'sharp')

const root = path.resolve(__dirname, '..')
const sourceDir = path.join(root, 'design', 'asset-sources')
const iconDir = path.join(root, 'assets', 'icons')
const iconSourceDir = path.join(root, 'design', 'icon-sources')
const iconBase = 'https://raw.githubusercontent.com/phosphor-icons/core/main/'

async function exists(file) {
  try { await fs.access(file); return true } catch { return false }
}

async function downloadOnce(url, file) {
  if (await exists(file)) return fs.readFile(file, 'utf8')
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) })
  if (!response.ok) throw new Error(`下载失败 ${response.status}: ${url}`)
  const content = await response.text()
  await fs.writeFile(file, content, 'utf8')
  return content
}

async function main() {
  for (const dir of [sourceDir, iconDir, iconSourceDir]) await fs.mkdir(dir, { recursive: true })
  const manifest = { note: 'Generated source images preserved; PNG resize only, no content retouching.', images: [], icons: [] }

  for (const [name, width] of [['cup-mint.png', 640], ['tray-sage.png', 768]]) {
    const target = path.join(root, 'assets', name)
    const source = path.join(sourceDir, name)
    if (!await exists(source)) await fs.copyFile(target, source)
    const original = await sharp(source).metadata()
    const png = await sharp(source).resize({ width, withoutEnlargement: true }).png({ compressionLevel: 9, adaptiveFiltering: true }).toBuffer()
    await fs.writeFile(target, png)
    const final = await sharp(png).metadata()
    manifest.images.push({
      file: `assets/${name}`, source: `design/asset-sources/${name}`,
      original: [original.width, original.height], runtime: [final.width, final.height],
      alpha: final.hasAlpha, bytes: png.length,
      sourceSha256: crypto.createHash('sha256').update(await fs.readFile(source)).digest('hex'),
      runtimeSha256: crypto.createHash('sha256').update(png).digest('hex')
    })
  }

  for (const [name, output, color] of [
    ['dice-five', 'dice-five-white', '#ffffff'],
    ['arrow-up', 'arrow-up', '#426652'],
    ['arrow-down', 'arrow-down', '#426652'],
    ['hand-tap', 'hand-tap', '#849286']
  ]) {
    const url = `${iconBase}assets/regular/${name}.svg`
    const svg = await downloadOnce(url, path.join(iconSourceDir, `${name}.svg`))
    if (!svg.includes('<svg')) throw new Error(`无效 SVG: ${url}`)
    // 只替换官方图标的 currentColor；保留原始路径，不手绘替代图标。
    const coloredSvg = svg.replace(/currentColor/g, color)
    const png = await sharp(Buffer.from(coloredSvg)).resize(80, 80).png({ compressionLevel: 9 }).toBuffer()
    await fs.writeFile(path.join(iconDir, `${output}.png`), png)
    manifest.icons.push({ name, url, color, sha256: crypto.createHash('sha256').update(svg).digest('hex'), runtimeSha256: crypto.createHash('sha256').update(png).digest('hex'), output: `assets/icons/${output}.png` })
  }
  const license = await downloadOnce(`${iconBase}LICENSE`, path.join(iconSourceDir, 'LICENSE.txt'))
  await fs.writeFile(path.join(iconDir, 'LICENSE.txt'), license, 'utf8')
  await fs.writeFile(path.join(root, 'design', 'asset-manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify(manifest, null, 2))
}

main().catch(error => { console.error(error.message); process.exitCode = 1 })
