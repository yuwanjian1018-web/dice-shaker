# 摇骰子 · 黑色骰盅原生微信小程序

按 2026-08-31 提供的三屏设计实现：石墨灰纹理、黑色骰盅和底盘、白色圆角立体骰子。在设置中选择按钮或体感摇骰，摇完保持合盖，由用户手动揭晓；不显示总点数。

## 已实现

- 默认五颗，可在左上角设置面板调整为 1～6 颗；点“完成”保存，点关闭或遮罩取消
- 设置新增“体感摇骰”：默认关闭，通过按钮摇骰；开启后仅晃动手机触发，移除“摇一摇”按钮，锁定按钮移至原主按钮位置。选择保存在本机，下次打开沿用
- 在场景内上下拖动骰盅，杯盖实时跟随手指，并可停在完全打开与完全关闭之间的任意位置
- 摇完保持合盖；反复开合保留本轮点数，只有“摇一摇”重新生成结果
- 骰子 1、4 点为红色，2、3、5、6 点为蓝色
- 六种骰面使用同一实体骰子的合法朝向，相对面为 1/6、2/5、3/4；三个可见面的点数已经逐面核对。2026-09-05 修正透视：骰子落点向盘内回收，按整个底面及杯内空间限制边界；重新生成与托盘视角接近的骰子素材，移除整张图片的倾斜旋转。远处略小、近处略大，点数保持可读
- 托盘采用较低的盘沿，按盘底、骰子及接触阴影、前沿、杯体分层；边缘遮挡符合前后关系。完整合盖时隐藏骰子
- 先合盖，再连续左右晃动 1200 ms，伴随本地碰撞音效；晃动完停止音效并保留结果
- 按钮模式的锁在主按钮右侧，体感模式的锁位于中央：点击锁定，禁止摇骰；再次点击解锁。锁定期间可查看结果、切换操作模式，不能修改数量
- 摇动中锁定会立即停止声音和动画，并保留上一轮点数及位置；切到后台也会停止声音、计时器和传感器监听。体感关闭或设置面板打开时不监听传感器；启动失败时恢复按钮操作并提示
- 黑色骰盅、托盘、六种真实点数图片和音效随小程序本地打包，无运行时联网依赖
- Node.js 自动化测试与项目结构检查

## 在微信开发者工具中打开

1. 安装并打开[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. 点击开发者工具中的 **“+” / 导入项目**。
3. 保留项目已有 AppID；本次设计修改没有改变账号、AppID 或安全设置。
4. 项目目录选择：

   ```text
   D:\DATE\vibecoding\dice-shaker
   ```

5. 导入后点击顶部 **编译**，再点击页面中的 **摇一摇**。
6. 摇动结束后在场景内上下拖动骰盅；松手后杯盖会停在当前位置。

> AppID 不是密码，但 **AppSecret 永远不要写进前端代码或提交到 Git**。真机预览或发布需使用有相应权限的微信开发者账号，本项目不会自动上传或发布。

## 运行测试

在 Windows PowerShell 中执行：

```powershell
Set-Location 'D:\DATE\vibecoding\dice-shaker'
npm.cmd test
npm.cmd run check
```

小程序运行没有第三方运行依赖。30 项测试覆盖随机点数与位置、图片下沿轮廓不越界、杯内空间、数量边界、手动开合、锁定与中途取消、音效起止、后台清理、手势、体感互斥、偏好保存与传感器失败处理。也可直接运行 `node --test tests/*.test.js` 和 `node scripts/check-project.js`。轮廓检查使用现有开发依赖中的 PNG 解码器；`node_modules` 已排除出小程序包。

开发者工具优先使用官方 wechatide CLI。`scripts/verify-motion-devtools.js` 可作为 `automation_evaluate --fn-source` 的函数源，检查真实页面方法、渲染后的按钮位置和传感器生命周期；注入加速度样本不代表手机体感硬件验证。`scripts/devtools-console-check.js` 可粘贴到开发者工具 Console 检查音频与基础交互。截屏先保存到项目外，避免写入工程触发热重载后丢失待验证页面状态。

2026-08-31追加布局调整：仅恢复五颗骰子的参考排列，保持当前骰子图片、角度与大小；盖子、底座同比放大约6%。在375×667和430×932模拟器中复查开合盖，截图位于`design/layout-return-20260831/`。此前新版素材的原生Console集成检查13项通过，记录保留在`design/black-implementation/`；本次没有重新宣称完整集成复测。真机声音听感和实际晃动阈值尚未校准，详细证据与边界见`design-qa.md`。

官方自动化包的传递依赖存在 npm audit 告警，仅用于本地开发；未执行会替换其版本的 `audit fix --force`。不应将该工具作为线上服务或处理不可信文件。

## 素材与设计记录

- **当前大点与尺寸版**：`design/fuller-pips-20260905/README.md`。保留红蓝宝石切面高光，点更饱满，骰子基础尺寸放大约 7%；同时调整六颗骰子的随机落点，30 项测试通过。
- **当前透视和边框修正版**：`design/perspective-20260905/README.md`，包含本轮素材来源、随机边界检查、模拟器和离线视觉复查记录。之前的布局记录仅作历史参考。
- 当前运行素材：`assets/tray-black-lowrim.png` 和 `assets/dice-perspective/die-1.png`～`die-6.png`；旧托盘和骰子素材保留。

- `assets/cup-black.png`：547 × 700；`assets/tray-black.png`：800 × 480；`assets/dice/die-1.png`～`die-6.png`：各 240 × 240，均包含真实透明通道。
- `design/asset-sources/`：保留 ImageGen 原件及 `black-cup-prompt.md`、`black-tray-prompt.md`、`dice-ivory-prompt.md`。造型按参考生成，不宣称逐像素一致。
- `design/asset-sources/dice-ivory-v2-alpha-qa.png` 与 `dice-ivory-v2-validation.json`：新版骰子的顶面/前面/右面核对；`dice-v1-backup/` 保留被替换的旧素材。
- `design/black-implementation/reference.png`：本轮用户选定的设计图副本；旧设计图与薄荷绿素材均保留。
- 操作图标来自 [Phosphor Icons](https://github.com/phosphor-icons/core)，MIT 许可保存在 `assets/icons/LICENSE.txt`。
- `design-qa.md`：最新布局验收；`design/layout-return-20260831/previous-design-qa.md`保留此前黑色设计及骰面修订验收，薄荷绿旧版验收仍保留于`design/black-implementation/previous-mint-design-qa.md`。
- `assets/audio/dice-shake.wav`：原创合成碰撞音效，1.2 s / 44.1 kHz / 单声道 PCM16。`npm run build:audio` 可按固定种子重建，无第三方录音素材。
- `design/`、`tests/`、`scripts/` 与说明文档已从小程序打包中排除。

只有重建图片时才需要 Node.js 与 `sharp`（本次验证环境为 Node.js 24.18.0、sharp 0.35.4）。将 `DICE_SHARP_MODULE` 指向已有 sharp 模块，运行以下命令即可从保留的原图重建：

```powershell
# 若首次下载图标受 Node.js 网络环境影响，先使用 Windows 网络栈下载。
./scripts/fetch-icons.ps1
node scripts/build-black-ui-assets.js
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
- 手动开合：连续跟手，无自动吸附，可停在任意位置

开合操作不调用随机数，也不改变本轮骰子。页面退出会清除未完成的计时器。

这些时间定义在 `utils/game.js`，动画外观定义在 `pages/index/index.wxss`。
