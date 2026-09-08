# 大点与骰子尺寸调整 · 2026-09-05

按用户两张参考调整点的饱满程度，并遵循后续澄清：保留宝石切面高光，只加大红蓝点和骰子尺寸。

- 六张素材保留象牙白骰身、红蓝宝石切面高光、18 个可见面的点数和 2/3 点的面内对角排列。
- 红蓝点向外扩展；透明素材中的着色像素面积比上一版增加约 35%–67%（逐颗汇总，包含高光颜色变化，不等于精确直径增幅）。点仍互相分开，完整位于对应骰面内。
- 布局基础尺寸从 140 改为 150，增加约 7.1%，深度缩放和落地锚点保持一致。
- 六颗骰子的空间更紧：先尝试随机落点；若不能放满，从安全排布开始进行有限次随机移动，每次均检查盘沿、杯内空间和骰面间距，再打乱骰子顺序。结束阶段缩小移动幅度，让边缘位置也能变化。
- 运行素材为 `assets/dice-perspective/die-1.png` 至 `die-6.png`，240 × 240 透明 PNG。位置逻辑在 `utils/dice-layout.js`。

## 源图与重建

使用内置 ImageGen，未使用 API CLI。用户参考图保存在 `reference-1.jpg` 和 `reference-2.jpg`；最终编辑源图为 `dice-atlas-green.png`；完整提示词见 `prompt.md`。

设置 `DICE_SHARP_MODULE` 指向 sharp，运行 `node scripts/build-perspective-dice.js --dice-only`。脚本仅进行色键透明提取、裁切、缩放和补边。骰身放大由布局代码完成。

## 检查

- `node --test tests/*.test.js`：30 项通过，包含新 PNG 下缘轮廓的 6,000 组随机布局边界检查、500 组布局的随机性检查、极端随机源的有限次回退以及既有体感/按钮/锁定逻辑。
- `node scripts/check-project.js`：项目结构、语法和素材引用通过。
- `pip-validation.json`：对六张透明 PNG 的红蓝连通区域计数，全部 18 个可见面点数正确。
- `gallery-1-3.png`、`gallery-4-6.png`：采用生产样式与新位置逻辑的 36 个离线案例；用于检查不同数量和分布，不是真机截图。
- `native-six-open.jpg`、`native-six-half.jpg`、`native-six-closed.jpg`、`native-five-open.jpg`：微信原生模拟器检查截图。
- `preview-scene.jpg`：原生五颗截图的场景裁切，未改写图像内容。

本轮未改动托盘、骰盅素材及设置界面。
