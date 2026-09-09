# 摇骰子 · 原生微信小程序

当前版本使用本地 3D 骰盅、底座和骰子模型。用户可选择按钮或体感摇骰，摇完保持合盖，再手动拖动骰盅揭晓；运行时不请求远程模型、图片或音频。

## 当前功能

- 默认五颗骰子，设置中可调整为 1～6 颗
- 按钮摇骰或手机体感摇骰，两种方式互斥
- 骰盅可连续拖动，并停在任意开合位置
- 反复开合保留本轮结果，只有重新摇骰才生成新结果
- 骰子 1、4 点为红色，其余为蓝色；相对面为 1/6、2/5、3/4
- 骰盅开合、底座倾斜、随机摆放、碰撞音效和锁定状态均在本地完成
- 页面进入后台时停止声音、动画和传感器监听
- 3D 模型、PBR 贴图、渲染库和音效随小程序打包

## 在微信开发者工具中打开

1. 安装并打开微信开发者工具。
2. 导入项目，目录选择 `C:\Users\xiaojian\Documents\WeChatProjects\dice-shaker`。
3. 保留项目现有 AppID，点击“编译”。
4. 测试按钮摇骰、设置、锁定、手动开合；体感与性能仍需真机复核。

项目不会自动上传或发布。AppSecret、支付密钥等秘密不得写入前端代码或提交到 Git。

## 运行检查

在项目目录执行：

```powershell
npm.cmd test
npm.cmd run check
```

测试和检查只依赖 Node.js 内置功能，无需执行 `npm install`，也不需要保留 `node_modules/`。当前测试覆盖游戏状态、1～6 颗随机摆放、3D 模型完整性、开合间隙、渲染生命周期、手势、音效、锁定和体感逻辑。`npm run check` 同时检查页面结构、素材引用、媒体总量和编译前包体预算。

开发者工具内的交互检查可使用：

- `scripts/verify-motion-devtools.js`：作为 wechatide `automation_evaluate --fn-source` 的函数源
- `scripts/devtools-console-check.js`：粘贴到开发者工具 Console 检查真实页面方法、音频和交互

注入加速度样本不等同于真机体感验证。

## 当前 3D 资源

- 运行模型：`assets/models/cup-scene.js`、`assets/models/cup-scene.bin` 和三张本地 PBR 贴图
- 可编辑源：`design/cup-model-v3/cup-material-v3.blend`
- 完整导出：`design/cup-model-v3/cup-material-v3.glb`
- 遮蔽缓存与验证记录：`design/cup-model-v3/surface-occlusion.json`、`runtime-verification.json`
- 渲染库：`vendor/threejs-miniprogram`，版本 0.0.8，MIT
- 模型纹理许可：`assets/models/LICENSE.txt`
- 音效：`assets/audio/dice-shake.mp3`，可用 `npm run build:audio` 重建

重建移动端模型资源需要 Python 和 Pillow：

```powershell
python scripts/build-3d-assets.py
```

若修改完整模型并需要重新烘焙遮蔽数据，再用 Blender 执行 `scripts/bake-3d-occlusion.py`。这些重建步骤不是运行或普通测试的前置条件。

## 移动端性能处理

- 合盖时跳过完全被遮挡的骰子网格
- 材质使用正面渲染，并由测试核对三角面绕序
- 关闭 `preserveDrawingBuffer`，设置面板快照在同一绘制任务内读取
- 静止画面最高使用约 500 万像素、1.4 倍设备像素比超采样，并用 2048 PCF 阴影精修骰子边缘和接触阴影
- 开合、拖动和摇骰仍限制在约 115 万像素与最高 1024 阴影；帧间隔变慢时继续自动降档，松手后只补绘一帧高质量结果
- 相同材质的 1～6 颗骰子合并为 3 个动态批次；保留全部外形和凹点三角面，同时避免每颗骰子重复提交 3 次绘制
- 拖动时只发送变化的 `lidProgress`，渲染合并到每帧最多一次
- 静止时不循环绘制，后台暂停，页面卸载时释放 GPU 资源

这些措施确定减少了渲染工作量，但 iPhone 实际帧率、温升、声音和晃动阈值仍需真机验证。

## 目录结构

```text
├── app.js / app.json / app.wxss       小程序全局配置
├── pages/index/                       主页面、样式与交互
├── utils/                             游戏状态、体感与 3D 渲染
├── assets/                            当前运行所需模型、贴图、图标和音效
├── vendor/                            本地 threejs-miniprogram
├── design/cup-model-v3/               当前完整模型源与验证记录
├── tests/                             Node.js 自动化测试
├── scripts/                           当前检查、模型/音效构建与开发者工具 QA
└── project.config.json                微信开发者工具项目配置
```

历史图片版设计、对比截图、中间模型和只服务旧素材的构建脚本已从当前工作树删除；需要追溯时可从 Git 历史恢复。`.git/` 保留完整提交历史，因此不会随工作树清理同步大幅缩小。

## 当前交互时间

- 合盖：280 ms
- 摇动：1200 ms
- 摇完保持合盖，等待用户手动揭晓
- 手动开合连续跟手，不自动吸附

时间定义在 `utils/game.js`，3D 动画实现在 `utils/shaker-3d.js`。
