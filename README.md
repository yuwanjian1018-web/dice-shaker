# 摇骰子 · 黑色骰盅原生微信小程序

保留原有石墨灰页面与操作布局，2026-09-07 将骰盅、底座和骰子图片替换为真实 3D 模型。在设置中选择按钮或体感摇骰，摇完保持合盖，由用户手动揭晓；不显示总点数。

## 已实现

- 默认五颗，可在左上角设置面板调整为 1～6 颗；点“完成”保存，点关闭或遮罩取消
- 设置新增“体感摇骰”：默认关闭，通过按钮摇骰；开启后仅晃动手机触发，移除“摇一摇”按钮，锁定按钮移至原主按钮位置。选择保存在本机，下次打开沿用
- 在场景内上下拖动骰盅，杯盖实时跟随手指，并可停在完全打开与完全关闭之间的任意位置
- 摇完保持合盖；反复开合保留本轮点数，只有“摇一摇”重新生成结果
- 骰子 1、4 点为红色，2、3、5、6 点为蓝色
- 使用已确认的象牙色 3D 骰子及红蓝哑光凹点；旋转模型展示本轮点数，相对面为 1/6、2/5、3/4；在真实圆形盘内随机摆放并检查重叠和边界
- 盖子向后翻转并持续上升，底座向前倾斜展示点数；由 WebGL 深度计算遮挡，合盖摇动时跳过被完全遮住的骰子绘制
- 先合盖，再连续左右晃动 1200 ms，伴随本地碰撞音效；晃动完停止音效并保留结果
- 按钮模式的锁在主按钮右侧，体感模式的锁位于中央：点击锁定，禁止摇骰；再次点击解锁。锁定期间可查看结果、切换操作模式，不能修改数量
- 摇动中锁定会立即停止声音和动画，并保留上一轮点数及位置；切到后台也会停止声音、计时器和传感器监听。体感关闭或设置面板打开时不监听传感器；启动失败时恢复按钮操作并提示
- 3D 模型、PBR 材质贴图、渲染库和音效随小程序本地打包，无运行时联网依赖
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

小程序使用已包含在 vendor 中的 threejs-miniprogram 0.0.8（MIT），不需要单独构建 npm。30 项测试覆盖游戏状态、点数、3D 摆放与整段开合间隙、模型数据无损性、渲染生命周期以及手势/音效/体感逻辑。可直接运行 `node --test tests/*.test.js` 和 `node scripts/check-project.js`，无需安装 npm 依赖。旧图片布局测试已随对应旧模块删除。

开发者工具优先使用官方 wechatide CLI。`scripts/verify-motion-devtools.js` 可作为 `automation_evaluate --fn-source` 的函数源，检查真实页面方法、渲染后的按钮位置和传感器生命周期；注入加速度样本不代表手机体感硬件验证。`scripts/devtools-console-check.js` 可粘贴到开发者工具 Console 检查音频与基础交互。截屏先保存到项目外，避免写入工程触发热重载后丢失待验证页面状态。

2026-08-31追加布局调整：仅恢复五颗骰子的参考排列，保持当前骰子图片、角度与大小；盖子、底座同比放大约6%。在375×667和430×932模拟器中复查开合盖，截图位于`design/layout-return-20260831/`。此前新版素材的原生Console集成检查13项通过，记录保留在`design/black-implementation/`；本次没有重新宣称完整集成复测。真机声音听感和实际晃动阈值尚未校准，详细证据与边界见`design-qa.md`。

截图使用 `wechatide -c Codex simulator_screenshot --project D:\DATE\vibecoding\dice-shaker --path <项目外输出路径>`。已移除固定调试端口的旧截图脚本及其 `miniprogram-automator` 依赖，不再维护重复的自动化入口。

## 当前 3D 模型与素材

- 当前实现与限制：`design/cup-model-v3/README.md`；运行模型为 `assets/models/cup-scene.js` 和 `cup-scene.bin`，使用本地 PBR 贴图。
- 原有图片移至 `design/cup-model-v3/previous-images/`，完整 Blender/GLB 模型放在 `design/cup-model-v3/`。
- `python scripts/build-3d-assets.py` 重建移动资源；合并字节完全相同的顶点、删除材质未使用的 UV，并按体积预算编码贴图。保留全部三角面、法线、有效 UV、遮蔽数据和开盖轨迹。
- 当前为小程序实时光栅渲染；Cycles 离线灯光追踪效果没有直接搬入手机。

## 历史素材与设计记录（已由 3D 替换）

- **历史大点与尺寸版**：`design/fuller-pips-20260905/README.md`。保留红蓝宝石切面高光，点更饱满，骰子基础尺寸放大约 7%；同时调整六颗骰子的随机落点，30 项测试通过。
- **历史透视和边框修正版**：`design/perspective-20260905/README.md`，包含本轮素材来源、随机边界检查、模拟器和离线视觉复查记录。之前的布局记录仅作历史参考。
- 原图片版运行素材：`assets/cup-black.png`、`assets/tray-black-lowrim.png` 和 `assets/dice-perspective/die-1.png`～`die-6.png`。2026-09-06 清理未使用的旧托盘、旧骰子、薄荷绿素材、旧图标和重复纹理文件；历史设计原稿仍在打包排除的 `design/` 中。

- `assets/cup-black.png`：547 × 700；`assets/tray-black-lowrim.png`：800 × 480；`assets/dice-perspective/die-1.png`～`die-6.png`：各 240 × 240，均包含真实透明通道。杯体显示尺寸约放大 8%，保持合盖时底边落点与杯体在最前方的层级。最大抬升距离从 308rpx 增加到 340rpx，优先让骰面完整露出，允许杯顶超出屏幕。
- `design/asset-sources/`：保留 ImageGen 原件及 `black-cup-prompt.md`、`black-tray-prompt.md`、`dice-ivory-prompt.md`。造型按参考生成，不宣称逐像素一致。
- `design/asset-sources/dice-ivory-v2-alpha-qa.png` 与 `dice-ivory-v2-validation.json`：新版骰子的顶面/前面/右面核对；`dice-v1-backup/` 保留被替换的旧素材。
- `design/black-implementation/reference.png`：本轮用户选定的设计图副本；旧设计图与薄荷绿素材均保留。
- 操作图标来自 [Phosphor Icons](https://github.com/phosphor-icons/core)，MIT 许可保存在 `assets/icons/LICENSE.txt`。
- `design-qa.md`：最新布局验收；`design/layout-return-20260831/previous-design-qa.md`保留此前黑色设计及骰面修订验收，薄荷绿旧版验收仍保留于`design/black-implementation/previous-mint-design-qa.md`。
- `assets/audio/dice-shake.mp3`：原创合成碰撞音效，1.2 s 音源 / 44.1 kHz / 单声道 / 48 kbps。安装 FFmpeg（或用 `DICE_FFMPEG` 指定路径）后，`npm run build:audio` 可按固定种子重建，无第三方录音素材。
- `design/`、`tests/`、`scripts/`、`node_modules/`、Git 数据、依赖清单与说明文档已从小程序打包中排除。`npm run check` 检查组件按需注入、无运行时引用的业务 JS、未使用素材、图片和音频合计小于 200 KiB，以及 1.5 MiB 的编译前包体预算；最终大小以开发者工具为准。200 KiB 是总和限制，不是单文件限制。
- 2026-09-08 清理图片版布局模块、其过时测试与五个旧素材/对比脚本；历史设计文件仍用于追溯，完整 GLB 和遮蔽数据也是移动模型重建及完整性测试的输入。

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
├── utils/dice.js                      骰子随机与点数状态
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

这些时间定义在 `utils/game.js`，3D 动画实现在 `utils/shaker-3d.js`。
