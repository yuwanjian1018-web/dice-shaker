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
const sitemapConfig = readJson('sitemap.json')

if (sitemapConfig) {
  if (!Array.isArray(sitemapConfig.rules) || sitemapConfig.rules.length === 0) {
    fail('sitemap.json 必须包含至少一条 rules 规则，避免真机调试报 Invalid SiteMap')
  } else {
    const invalidRule = sitemapConfig.rules.find((rule) => (
      !rule ||
      typeof rule.page !== 'string' ||
      rule.page.length === 0 ||
      (rule.action !== undefined && !['allow', 'disallow'].includes(rule.action))
    ))

    if (invalidRule) {
      fail('sitemap.json 的每条规则都必须包含 page，action 如填写只能为 allow 或 disallow')
    } else {
      pass(`sitemap.json 已配置 ${sitemapConfig.rules.length} 条有效规则`)
    }
  }
}
if (appConfig && appConfig.lazyCodeLoading !== 'requiredComponents') {
  fail('app.json 必须启用 lazyCodeLoading: requiredComponents')
} else if (appConfig) pass('已启用组件按需注入')

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

const jsFiles = ['app.js', ...['pages', 'utils'].flatMap(dir =>
  listFiles(path.join(root, dir), dir + '/').filter(file => file.endsWith('.js')))]

// Follow literal CommonJS imports from actual entrypoints. A test-only import
// does not make an otherwise unused module part of the running application.
const reachable = new Set()
function visit(file) {
  if (reachable.has(file)) return
  reachable.add(file)
  const source = fs.readFileSync(path.join(root, file), 'utf8')
  const imports = [...source.matchAll(/require\(\s*['"](\.[^'"]+)['"]\s*\)/g)]
  for (const [, specifier] of imports) {
    const base = path.posix.normalize(path.posix.join(path.posix.dirname(file), specifier))
    const dependency = [base, base + '.js', base + '/index.js'].find(candidate =>
      fs.existsSync(path.join(root, candidate)) && fs.statSync(path.join(root, candidate)).isFile())
    if (!dependency) fail(`${file} 引用了不存在的模块 ${specifier}`)
    else if (dependency.endsWith('.js')) visit(dependency)
  }
}
visit('app.js')
for (const page of appConfig?.pages || []) if (fs.existsSync(path.join(root, page + '.js'))) visit(page + '.js')
for (const file of jsFiles) if (!reachable.has(file)) fail(`无运行时引用的 JS 文件：${file}`)

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
const sceneModel = require('../assets/models/cup-scene')
assetPaths.push('/assets/models/cup-scene.js', '/assets/models/cup-scene.bin')
sceneModel.images.forEach(image => assetPaths.push(`/assets/models/${image.uri}`))
assetPaths.push('/assets/models/LICENSE.txt')
assetPaths.push('/assets/audio/dice-shake.mp3')
assetPaths.push('/assets/graphite-texture.wxss')
for (const assetPath of assetPaths) {
  if (!fs.existsSync(path.join(root, assetPath.slice(1)))) {
    fail(`页面引用的本地素材不存在：${assetPath}`)
  }
}
if (!process.exitCode) pass(`${assetPaths.length} 个页面素材引用有效`)

// Keep obsolete assets out of the source package, including dynamic dice images.
function listFiles(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const relativePath = prefix + entry.name
    return entry.isDirectory()
      ? listFiles(path.join(directory, entry.name), relativePath + '/')
      : [relativePath]
  })
}
const usedAssets = new Set([...assetPaths.map(file => file.slice(1)), 'assets/icons/LICENSE.txt'])
for (const file of listFiles(path.join(root, 'assets'), 'assets/')) {
  if (!usedAssets.has(file)) fail(`未使用的运行素材：${file}；请移出 assets 或补充引用检查`)
}

// Conservative local estimate, not the DevTools compiled source-package size.
// Match the 1.5 MiB quality rule, rather than the looser remote-debug limit.
if (projectConfig) {
  const rules = projectConfig.packOptions || { ignore: [], include: [] }
  if ((rules.include || []).length || (rules.ignore || []).some(rule => !['file', 'folder'].includes(rule.type))) {
    fail('包体检查只支持当前使用的 file/folder ignore 规则；配置变更后请同步更新检查器')
  } else {
    const ignored = file => ['.git', '.gitignore', 'project.private.config.json'].includes(file) ||
      (rules.ignore || []).some(rule => file === rule.value || (rule.type === 'folder' && file.startsWith(rule.value + '/')))
    let bytes = 0
    let mediaBytes = 0
    function measure(directory, prefix = '') {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = prefix + entry.name
        if (ignored(file)) continue
        const fullPath = path.join(directory, entry.name)
        if (entry.isDirectory()) measure(fullPath, file + '/')
        else {
          const size = fs.statSync(fullPath).size
          bytes += size
          if (/\.(?:png|jpe?g|webp|gif|bmp|svg|mp3|wav|m4a|aac|ogg|flac)$/i.test(file)) mediaBytes += size
        }
      }
    }
    measure(root)
    // DevTools checkImageAndAudioSizeLimit sums all media in compiledPkg and
    // compares strictly below 200 KiB. It is NOT a per-file limit.
    const mediaLabel = `图片和音频合计 ${(mediaBytes / 1024).toFixed(1)} KiB；必须小于 200 KiB（编译前估算）`
    if (mediaBytes >= 200 * 1024) fail(mediaLabel)
    else pass(mediaLabel)
    const budget = 1.5 * 1024 * 1024
    const label = `本地待打包文件 ${(bytes / 1024).toFixed(1)} KiB；预算 ${(budget / 1024).toFixed(1)} KiB（编译前估算）`
    if (bytes > budget) fail(label)
    else pass(label)
  }
}

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
