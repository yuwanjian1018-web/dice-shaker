# 骰子与托盘透视修正 · 2026-09-05

几何、透视与盘沿以本记录为准；骰子点样式随后在 design/pips-20260905 修正，该目录保留当前骰子源图和验证记录。前一轮 design/layout-motion-20260905 只保留历史证据。

## 问题与修正

之前只限制骰子中心点，且将整张 2D 图旋转，导致骰子下沿压上前沿，立边倾斜，骰面俯角与托盘不一致。

- 落点采用托盘素材的 800 × 480 同一坐标系，并以图片高度 72% 的落地中心定位，避免混淆图片中心和接触位置。
- 每个候选位置同时检查完整底面包络、内沿余量及杯体在骰子高度处的保守可用截面。底面包络的四角均需通过；不是只测试中心。
- 基础图片尺寸 140 个素材像素，按深度微调大小。取消平面 rotate，竖直边保持竖直。
- 重新生成较低俯视角的六颗骰子；生成目标约 28°，属于构图目标，不是相机标定实测。全部 18 个可见面的点数已经逐面目视核对。
- 托盘盘沿变薄；素材归一化时让顶沿椭圆保持与原场景接近的投影。中央前壁从旧图约 100 像素降到新图约 55 像素。
- 分层为盘底/后沿 → 接触阴影与按落点远近排序的骰子 → 同一托盘素材截出的前沿 → 骰盅。各层共用同一缩放，未用前沿覆盖来替代边界检查。
- 原图和旧运行素材保留；没有删除之前工作区改动。

## 当前资源

- assets/dice-perspective/die-1.png 至 die-6.png：240 × 240 真透明 PNG。
- assets/tray-black-lowrim.png：800 × 480 真透明 PNG。
- dice-alpha-qa.png：深灰背景下的六颗骰子，便于检查透明边缘与点数。
- asset-validation.json：裁切边界、像素尺寸和文件信息。

|顶面|左下侧面|右下侧面|
|---|---|---|
|1 红|2 蓝|3 蓝|
|2 蓝|3 蓝|1 红|
|3 蓝|1 红|2 蓝|
|4 红|2 蓝|1 红|
|5 蓝|1 红|3 蓝|
|6 蓝|3 蓝|2 蓝|

## 生成与重建

使用内置 ImageGen，未使用 API CLI。第一张输出将棋盘格画进 RGB 背景，因此再次要求仅更换为绿色素材提取背景，随后用 sharp 做色键透明提取、裁切、缩放和补透明边，不用程序改写骰面或点数。托盘同样保留 ImageGen 绿色源图；仅做透明提取和尺寸归一化。

重建：设置 DICE_SHARP_MODULE 指向已有 sharp 模块，运行 node scripts/build-perspective-dice.js。

### 骰子透视编辑提示词

Use case: precise-object-edit. Produce a game-ready six-dice sprite atlas as an edit of image 1. Images 2 and 3 are ONLY camera/material context: the black tray and cup from the actual game; DO NOT include a tray or cup in the output.
Fix the perspective of ALL six dice so they sit upright on the floor of the reference tray seen at about 28 degrees above horizontal. Current dice in image 1 are seen too steeply from above. Lower the camera: diamond top face short axis about 0.47 of its long axis, taller vertical side faces. Every vertical cube edge remains vertical in the image. All dice resting FLAT on their bottom square face, no tipped/floating cubes, no screen-plane rotation. Same rounded ivory resin, blue and red recessed pips, similar realistic soft light from upper left. Real rounded CUBES, not elongated pillars.
Use six slightly varied horizontal yaw angles within 30 to 60 degrees so their orientation is naturally varied while retaining SAME camera elevation, gravity and lighting. Do not rotate the 2D image. Same physical cube size.
Exactly six separate dice, same 3 columns by 2 rows and ordering as input atlas, generous empty space and equal cells, no cropping or overlap. Output 1536x1024 or higher in 3:2 aspect ratio. Each die occupies about 60% of its cell.
CRITICAL COUNTS: row1 left TOP1 RED, LEFT2 BLUE, RIGHT3 BLUE. Row1 middle TOP2 BLUE, LEFT3 BLUE, RIGHT1 RED. Row1 right TOP3 BLUE, LEFT1 RED, RIGHT2 BLUE. Row2 left TOP4 RED, LEFT2 BLUE, RIGHT1 RED. Row2 middle TOP5 BLUE, LEFT1 RED, RIGHT3 BLUE. Row2 right TOP6 BLUE, LEFT3 BLUE, RIGHT2 BLUE. ONE center dot, TWO diagonal dots, THREE single diagonal, FOUR four corners, FIVE four corners and center, SIX two columns of three. Exact counts on all 18 faces, opposite pairs 1/6,2/5,3/4 cannot meet. No extra dots.
Genuinely transparent alpha background. No green matte, no checkerboard, no stage, no floor or external drop shadow (contact shadows will be placed in code), no text, no labels, no grid or watermarks. Preserve clean anti-aliased silhouettes.

### 骰子背景整理提示词

Use case: background-extraction. Preserve all six dice EXACTLY as in this image: every pip count and color, shape, size, position, camera angle, lighting and 3-by-2 atlas layout. Change ONLY the background from the checkerboard to a perfectly flat solid chroma green #00FF00 for game sprite extraction. Remove all external shadows on the background. Every background pixel should be pure #00FF00, with no texture, checkerboard, gradient, shadows, reflections or green spill on the ivory. Clean antialiased dice silhouette edges. Do not re-render, move or modify the dice or their pips. Exact same 1536x1024 size.

### 低盘沿编辑提示词

Use case: precise-object-edit. Edit this black dice tray to have a LOWER, shallower rim, with the vertical wall height about HALF of the original, as requested for the game. Keep the exact same diameter, ellipse perspective, black fine-textured plastic, lighting from upper left, thin restrained silver-gray edge highlights, and broad empty black floor. It must remain a physical circular shallow tray with a continuous narrow raised rim, not a flat plate or a thick pot. Preserve the inner floor camera angle (about 26 degrees above horizontal). The front vertical lip should be only about one quarter of a die's visible height when a die is 140 pixels tall on an 800 pixel wide tray.
Composition: one single empty tray, no dice, no cup, no UI. Match original framing and footprint width, centered, entire silhouette visible. The top-view ellipse of the floor and top lip must keep the original width and perspective, reduce only vertical wall height and body thickness; do not flatten/squash the whole tray image. Output landscape 5:3 ratio. Pure uniform #00FF00 green matte background outside the tray for extraction, absolutely no green inside the tray, no green reflections, no shadows beyond the silhouette, no checkerboard. No text or watermark.

## 检查范围

- node --test tests/*.test.js：30 项通过。含 1–6 颗共 6,000 组随机布局，将六种实际 PNG 的下沿像素轮廓投射到盘面，检查内沿余量，并检查杯内空间。另检查分布变化、大小与遮挡顺序及极端随机源的有限次回退。
- node scripts/check-project.js 和官方 WXML/WXSS 编译检查。
- gallery-1-3.png、gallery-4-6.png：使用生产样式、素材和位置生成器的 36 个固定种子离线案例；不是手机截图。
- 原生模拟器截图另标 native，检查全开、半开、合盖和不同骰子数量。
- scripts/verify-motion-devtools.js：既有 24 项原生模拟器交互检查，用于防止本轮改动破坏体感、锁定和按钮模式。

该方案仍为 2D 分层场景，几何包络与图片视角是保守的视觉约束，不是刚体物理仿真。真机声音、晃动灵敏度未在本轮实测。
