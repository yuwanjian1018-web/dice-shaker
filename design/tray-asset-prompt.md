# 浅鼠尾草绿托盘素材

- 任务：微信五骰子小程序的独立空托盘素材，使用动态骰子在页面叠加。
- 生成方式：内置 image_gen（image_gen__imagegen），未使用 CLI/API 回退。
- 用例：product-mockup。
- 输入图：无；从文字生成新素材。
- 项目文件：assets/tray-sage.png。
- 原始生成文件：C:/Users/xiaojian/.codex/generated_images/01a05585-dde4-7ee1-b4c5-5f96f3554a0a/exec-32d59e8a-3665-4f59-b61f-8b48feff0e67.png。
- 目标分辨率：1024 × 512；工具实际返回：1774 × 887，宽高比仍为 2:1。未静默重采样为目标尺寸。
- PNG 模式：RGBA；真实 alpha 范围 0–255；全透明像素 656,604；alpha 250–255 的像素 897,660。
- 中心样本 RGBA：(228, 238, 221, 254)；内部表面近似不透明。
- alpha >=128 的可见物体边界：(93, 96, 1680, 791)，按 Pillow 的右/下不包含规则。
- 非零 alpha 边界：(89, 33, 1684, 796)，说明物体外围少量低 alpha 残留；不裁切、不修图。
- 文件大小：1,635,470 bytes。
- SHA-256：af284665bfa077231010c6593920a09c6a27b21bc1c80c6948ad378b4bdf2777。
- 保存方式：从原始生成文件原样复制；原件保留，未修改/裁切/重采样。

## 视觉检查

完整单个横向椭圆空托盘，视角正面居中、略俯视，浅木外圈、细暖白内圈、极浅鼠尾草绿底面。画面无骰子、杯盖、文字、标志或背景；外围是实际透明 alpha，非绘制格纹。最终色值由生成模型与光照共同形成，不声称每个像素严格匹配指定十六进制色值。与其他资产的最终视角与合成遮挡关系由页面集成阶段核查。

## 完整生成提示词

```text
Use case: product-mockup.
Asset type: one transparent PNG game UI asset for a fresh, calm WeChat five-dice mini program. This is an EMPTY TRAY, and real dynamic dice will be rendered separately in code.
Primary request: render exactly one complete low-profile oval dice tray, photographed/rendered from the front on its central axis at approximately 25 degrees looking downward. Elegant physical tabletop game accessory, delicate natural 3D product rendering.
Scene/backdrop: truly transparent background with actual transparent alpha, not a white background, not a checkerboard. The object floats as an isolated clean product cutout, with no floor plane.
Subject and materials: horizontal ellipse-shaped tray; narrow gently rounded light oak outer rim, an extremely thin warm ivory inner edge, and a very pale sage-green #E0ECE2 matte soft felt / fine frosted interior. The playing surface is entirely empty, plain, broad, clean and uninterrupted. Keep the tray shallow and the wooden rim very slender and elegant.
Composition/framing: 1024×512 pixel horizontal canvas, close to 2:1 ratio. Center the tray precisely, straight symmetrical front-facing camera, no sideways rotation. Show the whole tray without any clipping. Tray occupies approximately 88 percent of canvas width and 80 percent of canvas height, with transparent margins on all sides. This corresponds to an on-screen 590rpx×285rpx tray for five small dice arranged in two rows (three plus two); do NOT draw any dice.
Lighting/mood: very soft diffuse light from upper left, low contrast, clean, natural, airy, refined tactile product visualization. Subtle self shading inside the rim only; no conspicuous heavy floor shadow.
Color palette: warm ivory, pale natural oak, very light sage-green #E0ECE2. This asset will pair with a separately rendered matte mint #B7D5C4 vertical-ribbed dice cup with a small oak round knob, from the same front-centered 25-degree downward perspective; do NOT draw that cup.
Text: none.
Constraints: exactly ONE empty tray, actual alpha transparency, complete silhouette, careful smooth rim, no cropped edges.
Avoid: dice, pips, numbers, cup, lid, knob, hands, people, text, logos, ornaments, patterns, checkered backdrop, floor, room, pedestal, additional objects, harsh reflections, thick bulky walls, orange wood, saturated green, strong dark cast shadows.
```
