# 薄荷绿骰盅素材生成记录

- 用途：原生微信小程序中可点按、可开合的骰盅杯盖素材。
- 生成方式：内置 `image_gen.imagegen`；未使用 CLI/API 回退，未进行自定义绘图。
- 生成时间：2026-08-30（任务日期）。
- 原始输出：`C:/Users/xiaojian/.codex/generated_images/01a05585-ab3a-7c10-99bb-b5a383b418cd/exec-c6e8aa4e-ac7c-4ba3-b125-9576ebf5a7ae.png`
- 项目素材：`assets/cup-mint.png`；从原始输出直接复制，保留原图及 alpha。
- 请求尺寸：1024 × 1024 px。
- 实际输出尺寸：1254 × 1254 px。内置工具未遵循请求尺寸，因此不能将原图标作 1024 × 1024。
- 原始文件大小：1,262,902 bytes。
- 像素格式：32-bit ARGB PNG。
- alpha 检查：通过，确有透明通道。1,572,516 像素中，完全透明 725,775，半透明 845,929，完全不透明 812；左上、右上、右下角 alpha 为 0，左下角为 1（近透明残留）；主体抽查 alpha 为 253–254（接近不透明）。未将棋盘格作为图像背景，原始边缘和近透明残留均未静默修正。
- 目视检查：一个完整倒扣杯盖，主体为浅薄荷绿色竖向凹槽，小木色握钮、暖白下沿；没有托盘、骰子、文字、人物、额外背景或地面投影。轮廓边缘保留生成工具原始抗锯齿。物体略高于提示要求的约 80% 高度，需以页面实际呈现为准。
- 集成提示：素材按页面容器等比显示；如需限制包体，可由主任务产生独立运行时压缩版本，不应声称无损缩放。

## 精确提示词

```text
Use case: product-mockup
Asset type: transparent PNG game asset for a native WeChat mini program, intended to be a tappable dice-cup lid animated between closed and raised states.
Primary request: Generate one single upside-down dice cup, with its closed top uppermost and wide mouth rim at the bottom. The cup is the sole object; no tray or dice.
Scene/backdrop: Genuinely transparent background with alpha. Output a 1024 x 1024 PNG. No opaque background and no simulated checkerboard transparency.
Subject: A clean, softly rounded tapered dice cup, narrower at the top and broader at its bottom mouth. A small light-oak rounded knob sits centrally on the top, sized for grasping. Its main body is matte mint / sage green, target color #B7D5C4, with subtle evenly spaced vertical fluting. A very narrow warm-white band finishes the lower mouth rim.
Style/medium: Refined natural 3D product render of an elegant physical tabletop game accessory; fresh, clean, warm, quiet and tactile. No exaggerated plastic gloss.
Composition/framing: Centered, front axis symmetric, camera slightly looking down at approximately 25 degrees. Complete object fully within the square canvas; object occupies about 80 percent of canvas width and about 80 percent of canvas height. Comfortable transparent margins on every side, no cropping.
Lighting/mood: Soft diffuse light from upper left, gentle realistic self shading. Retain shading on the object but absolutely no shadow cast onto an external ground plane.
Color palette: Matte light mint / sage green #B7D5C4 body, tiny light natural oak knob, very narrow warm-white bottom edge.
Constraints: Exactly one cup. No tray, no base platform, no separate underside, no dice, no floor, no background, no text, no numbers, no logos, no watermark, no flowers, no people, no extra decoration. True transparent alpha outside the object.
```
