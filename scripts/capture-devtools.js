// 仅捕获已打开的微信模拟器，不切换基础库、不改账号或开发者工具设置。
const automator = require('miniprogram-automator')
const path = require('node:path')
async function main() {
  const mp = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' })
  const name = path.basename(process.argv[2] || 'closed.png')
  const timer = setTimeout(() => { mp.disconnect(); process.exitCode = 1 }, 10000)
  try {
    const file = path.resolve(__dirname, '../design/black-implementation', name)
    await mp.screenshot({ path: file })
    console.log(file)
  } finally { clearTimeout(timer); mp.disconnect() }
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
