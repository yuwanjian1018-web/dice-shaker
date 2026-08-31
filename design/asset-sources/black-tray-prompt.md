# 黑色空骰盘素材

- 工具：内置 `image_gen`，参考用户所附三屏设计中间屏底盘。
- 生成原件：`black-tray-generated.png`，1391 × 1131，原始 RGB 文件完整保留。
- 运行素材：`../../assets/tray-black.png`，800 px 宽，透明 PNG。

## Prompt

Create a standalone empty black circular dice tray matching the middle screen of the supplied design. Front-above perspective, broad ellipse with width-to-total-height about 1.64. Black molded plastic shallow dish, two thin raised concentric rims with restrained gray highlights, visible thick front lower edge, empty almost-black interior. Photorealistic 3D product render, subtle reflections and fine plastic texture. Whole object centered and fully visible. Genuinely transparent alpha background, not a drawn checkerboard. No cup, no dice, no UI, no text, no watermark.

## 透明背景处理记录

工具实际返回的原件为 RGB，并在背景中绘入浅色棋盘；未把它当成真透明。按照 image-to-code 素材处理要求，用现有 sharp 读取像素，从图像外边缘四连通泛洪剔除 RGB 最大通道值 ≥ 100 的背景像素，物体内部高光保持原样。背景写入 alpha = 0，其余 alpha = 255，再用 sharp trim 裁去透明外边距、等比例缩至 800 px 宽并压缩 PNG。缩放保留边缘抗锯齿 alpha。仅处理背景与文件尺寸，不绘制或重建底盘；原件未改动。
