# 好运骰盅 · 原生微信小程序

这是一个微信原生小程序：点击“摇一摇”生成五颗随机骰子，摇完保持合盖，由用户手动揭晓。界面采用暖白、薄荷绿与浅木色，不显示总点数。

## 已实现

- 五颗标准六面骰子，每次独立随机生成 1～6 点
- 点击骰盅本身或“打开盖子 / 合上盖子”按钮，手动控制开合
- 摇完保持合盖；反复开合保留本轮点数，只有“摇一摇”重新生成结果
- 骰子 1、4 点为红色，2、3、5、6 点为蓝色
- 盖下、摇动与揭盖动画；动画期间锁定两个按钮，避免计时器叠加
- 薄荷绿骰盅、浅木色托盘与原生骰子点阵，素材随小程序本地打包
- Node.js 自动化测试与项目结构检查

## 在微信开发者工具中打开

1. 安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 点击开发者工具中的 **“+” / 导入项目**。
3. 保留项目已有 AppID；本次设计修改没有改变账号、AppID 或安全设置。
4. 项目目录选择：

   ```text
   C:\Users\xiaojian\Documents\WeChatProjects\dice-shaker
   ```

5. 导入后点击顶部 **编译**，再点击页面中的 **摇一摇**。
6. 摇动结束后点击 **打开盖子**，或直接点击骰盅揭晓；再次点击即可合盖。

> AppID 不是密码，但 **AppSecret 永远不要写进前端代码或提交到 Git**。真机预览或发布需使用有相应权限的微信开发者账号，本项目不会自动上传或发布。

## 运行测试

在 Windows PowerShell 中执行：

```powershell
Set-Location 'C:\Users\xiaojian\Documents\WeChatProjects\dice-shaker'
npm.cmd test
npm.cmd run check
```

小程序运行与上述测试没有第三方 npm 依赖，因此不需要先运行 `npm install`。测试覆盖点阵、红蓝配色、手动开合、摇后保持合盖、重复点击保护和页面退出时的计时器清理。

## 素材与设计记录

- `assets/`：小程序实际使用的透明 PNG，骰盅 640 × 640，托盘 768 × 384。
- `design/asset-sources/`：保留未经缩放的 ImageGen 原始素材；对应提示词在 `design/cup-asset-prompt.md` 与 `design/tray-asset-prompt.md`。
- 操作图标来自 [Phosphor Icons](https://github.com/phosphor-icons/core)，MIT 许可保存在 `assets/icons/LICENSE.txt`。
- `design/asset-manifest.json`：素材来源、尺寸、文件大小与 SHA-256；`design-qa.md`：微信模拟器验收记录。
- `design/`、`tests/`、`scripts/` 与说明文档已从小程序打包中排除。

只有重建图片时才需要 Node.js 与 `sharp`（本次验证环境为 Node.js 24.18.0、sharp 0.35.4）。将 `DICE_SHARP_MODULE` 指向已有 sharp 模块，运行以下命令即可从保留的原图重建：

```powershell
# 若首次下载图标受 Node.js 网络环境影响，先使用 Windows 网络栈下载。
./scripts/fetch-icons.ps1
node scripts/build-assets.js
```

已有图标源文件会直接复用；重建不会覆盖 ImageGen 原图。

## Git 新手说明

Git 用来保存代码的历史快照。推荐使用以下最小流程：

```bash
# 只需配置一次；请换成你自己的姓名和邮箱
git config --global user.name "你的名字"
git config --global user.email "你的邮箱"

# 查看改动
git status

# 选择要放入下一次快照的文件
git add .

# 创建快照
git commit -m "feat: create dice shaker mini program"
```

- `git add` 只是把改动放进“待提交区”，并没有上传网络。
- `git commit` 只在本机创建历史记录，也没有上传网络。
- GitHub/Gitee 是远程代码托管平台，以后需要备份或协作时再连接即可。
- `project.private.config.json` 已写入 `.gitignore`，它是开发者工具生成的个人配置，不应提交。
- 提交前先运行 `npm test && npm run check`。

## 目录结构

```text
├── app.js / app.json / app.wxss       小程序全局配置
├── pages/index/                       主页面、样式与动画
├── utils/dice.js                      骰子随机与点阵模型
├── utils/game.js                      手动开合与摇动状态流程
├── assets/                            本地骰盅、托盘与操作图标
├── design/                            设计依据、原始素材和验收截图
├── tests/                             Node.js 自动化测试
├── scripts/                           项目检查和素材构建脚本
└── project.config.json                微信开发者工具项目配置
```

## 第一次开发需要特别注意

1. **前端不能保存秘密**：AppSecret、支付密钥、数据库密码必须放在服务端，不能写入小程序代码。
2. **真机表现要复测**：开发者工具与手机的字体、性能和安全区域可能略有差异。
3. **不要直接改测试来掩盖错误**：业务变更时先明确期望，再修改测试和实现。
4. **当前随机数用于娱乐展示**：`Math.random()` 适合普通小游戏，不适合赌博、抽奖兑付或任何资金场景。
5. **小步提交 Git**：每完成一个独立功能就提交一次，出问题时更容易退回。

## 当前交互时间

- 盖下骰盅：280 ms
- 摇动骰盅：1200 ms
- 摇完保持合盖，等待用户手动揭晓
- 手动揭盖：420 ms
- 手动合盖：280 ms

开合操作不调用随机数，也不改变本轮骰子。页面退出会清除未完成的计时器。

这些时间定义在 `utils/game.js`，动画外观定义在 `pages/index/index.wxss`。
