const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '..')
const requiredRootFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'sitemap.json'
]

function fail(message) {
  console.error(`✖ ${message}`)
  process.exitCode = 1
}

function pass(message) {
  console.log(`✔ ${message}`)
}

function readJson(relativePath) {
  const fullPath = path.join(root, relativePath)
  try {
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'))
  } catch (error) {
    fail(`${relativePath} 不是有效 JSON：${error.message}`)
    return null
  }
}

for (const relativePath of requiredRootFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    fail(`缺少必需文件 ${relativePath}`)
  }
}
if (!process.exitCode) pass('根目录必需文件齐全')

const appConfig = readJson('app.json')
const projectConfig = readJson('project.config.json')
readJson('sitemap.json')

if (projectConfig && !projectConfig.appid) {
  console.log('⚠ project.config.json 的 appid 尚未填写；导入开发者工具时请使用自己的测试 AppID')
}

if (appConfig && Array.isArray(appConfig.pages)) {
  for (const page of appConfig.pages) {
    for (const extension of ['js', 'json', 'wxml', 'wxss']) {
      const relativePath = `${page}.${extension}`
      if (!fs.existsSync(path.join(root, relativePath))) {
        fail(`页面 ${page} 缺少 ${extension} 文件`)
      }
    }
  }
  if (!process.exitCode) pass(`已检查 ${appConfig.pages.length} 个页面的四类文件`)
} else if (appConfig) {
  fail('app.json 的 pages 必须是数组')
}

const jsFiles = [
  'app.js',
  'pages/index/index.js',
  'utils/dice.js',
  'utils/game.js'
]

for (const relativePath of jsFiles) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, relativePath)], {
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    fail(`${relativePath} 语法检查失败：${result.stderr.trim()}`)
  }
}
if (!process.exitCode) pass(`${jsFiles.length} 个 JavaScript 文件语法正确`)

const wxmlPath = path.join(root, 'pages/index/index.wxml')
const wxml = fs.readFileSync(wxmlPath, 'utf8')
// 包括动态 src 分支中的本地素材，避免开发工具编译后才发现资源缺失。
const assetPaths = [...new Set(wxml.match(/\/assets\/[\w./-]+\.(?:png|jpg|jpeg|webp)/g) || [])]
for (const assetPath of assetPaths) {
  if (!fs.existsSync(path.join(root, assetPath.slice(1)))) {
    fail(`页面引用的本地素材不存在：${assetPath}`)
  }
}
if (!process.exitCode) pass(`${assetPaths.length} 个页面素材引用有效`)

const tagStack = []
const tagPattern = /<(\/)?([a-z][\w-]*)\b[^>]*>/gi
let tagMatch

while ((tagMatch = tagPattern.exec(wxml))) {
  const fullTag = tagMatch[0]
  const isClosing = Boolean(tagMatch[1])
  const tagName = tagMatch[2]
  const isSelfClosing = /\/>$/.test(fullTag)

  if (isSelfClosing) continue
  if (isClosing) {
    const expected = tagStack.pop()
    if (expected !== tagName) {
      fail(`pages/index/index.wxml 标签不匹配：期望 </${expected}>，实际 </${tagName}>`)
      break
    }
  } else {
    tagStack.push(tagName)
  }
}
if (tagStack.length > 0) fail(`pages/index/index.wxml 存在未闭合标签：${tagStack.join(', ')}`)
if (!process.exitCode) pass('WXML 标签结构完整')

const wxssPath = path.join(root, 'pages/index/index.wxss')
const wxss = fs.readFileSync(wxssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
let braceDepth = 0
for (const character of wxss) {
  if (character === '{') braceDepth += 1
  if (character === '}') braceDepth -= 1
  if (braceDepth < 0) break
}
if (braceDepth !== 0) fail('pages/index/index.wxss 的花括号不平衡')
if (!process.exitCode) pass('WXSS 块结构完整')

if (!process.exitCode) {
  console.log('\n项目结构检查通过。')
}
