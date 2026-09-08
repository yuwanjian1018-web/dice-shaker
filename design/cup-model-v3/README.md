# V3 3D 模型接入 · 2026-09-07

实际运行：`pages/index/index` 的 WebGL canvas；`utils/shaker-3d.js` 渲染真实网格，`utils/dice-3d-layout.js` 负责盘内摆放。此前图片版骰盅、盘沿和骰子已从当前工作树删除，需要时可从 Git 历史恢复。

`cup-material-v3.blend`、`cup-material-v3.glb` 为用户确认的完整模型；骰子沿用此前的象牙色圆角造型及 21 个哑光球面凹点。`mobile-assets.json` 记录原模型哈希与移动资源规格。

- 移动模型：`assets/models/cup-scene.js`、`cup-scene.bin`、1024 像素法线贴图和两张 512 像素颜色/粗糙度贴图。2026-09-08 合并完全重复的顶点并删除纯色材质未使用的 UV；全部三角面、逐角点位置/法线、有效 UV、凹点、遮蔽数据和开盖轨迹均保持一致。法线贴图采用全分辨率色彩通道和不超过 160 KiB 的 JPEG 编码预算。
- 点数驱动模型旋转，1/6、2/5、3/4 对面关系不变，支持 1–6 颗；使用实际 3D 占地和分离轴检查避免重叠、超出杯内空间。
- 直接采样已确认的 3 个动画通道：盖子位置、盖子旋转、底座旋转。盖子后翻 102° 时继续上升，底座向前倾 24°。手动拖动可停在任意位置，摇动前平滑合盖。
- 本地 256 像素环境反射、方向灯、最高 2048 像素盘面阴影；环境图在线性空间生成，最终画面使用 Three r108 实际支持的 `gammaOutput` / `gammaFactor=2.2` 和 ACES。内壁使用几何受光，避免实时自阴影产生三角色块。
- 绒面使用本地生成、带 mipmap 的纤维颜色/凹凸细节与 sheen。Blender BVH 对原网格每个顶点采样 96 条半球射线，烘焙凹点口沿及内衬接缝的近场遮蔽；移动着色器将其用于间接光和少量漫反射衰减。这是移动端近似，不等同于 Cycles 路径追踪和多重反射。
- 合盖摇动只绘制 6,720 个三角形；完全打开五颗时绘制 104,700 个三角形。静止时不循环绘制，后台暂停，离开页面释放 GPU 资源。
- 原生 WebGL 在部分环境中会覆盖普通设置弹层。打开设置时显示当前模型的透明快照，将画布移出可视区域并暂停；关闭后在下一帧恢复绘制。保持画布尺寸及 GPU 上下文，避免直接隐藏后出现空白。
- 使用 vendored `threejs-miniprogram@0.0.8`，MIT，源自 https://github.com/wechat-miniprogram/threejs-miniprogram 。无需额外 npm 构建，不请求远程模型或 CDN。
- 皮革扫描来自 https://ambientcg.com/view?id=Leather037 ，CC0；许可见 `assets/models/LICENSE.txt`。

重建移动资源：安装 Pillow 后执行 `python scripts/build-3d-assets.py`，会复用 `surface-occlusion.json` 中与源模型哈希匹配的烘焙数据。重新烘焙可执行 `blender --background --python scripts/bake-3d-occlusion.py` 后再运行资源脚本。完整 2K 模型和烘焙缓存放在打包排除的 `design/` 中。

测试：`node --test tests/*.test.js`、`node scripts/check-project.js`。移动几何连续 201 个开合状态检查最低点单调上升与底座间隙；480 组 1–6 颗摆放检查边界和重叠。模拟器验证和截图记录在 `runtime-verification.json`（完成验证后保存）。真机 GPU 表现、设备温升和真实声音/体感仍需实机确认。
