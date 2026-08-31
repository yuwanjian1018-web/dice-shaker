# 黑色骰盅透明素材

- 用途：原生微信小程序的独立骰盅图层，允许整体摇晃及上下平移开合。
- 生成方式：内置 `image_gen`，未使用外部 CLI/API。
- 参考：用户提供的 `codex-clipboard-30e87f39-3218-4871-b05a-060319a30dee.png`，取中间屏悬空骰盅的造型、材质和视角。
- 生成原件：`black-cup-generated.png`，1145 × 1374 px，RGBA。
- 运行素材：`../../assets/cup-black.png`，547 × 700 px，RGBA，585966 bytes。
- 后处理：使用现成 `sharp` 对透明边界执行 `trim({ threshold: 5 })`，等比例缩放至 700 px 高；不改变造型、不另画背景。

## 生成提示词

Use case: background-extraction. Asset type: a single transparent PNG sprite for a native WeChat dice cup game. Input image 1 is the reference, not the output layout. Extract/recreate ONLY the hovering inverted black dice cup at the top of the CENTER screen, preserving its exact visual design. A premium realistic black leather-textured / molded plastic dice cup, closed narrow top with a small elliptical raised disc and fine rim, rounded shoulders, subtly tapering body that widens toward the bottom opening, complete thin black bottom rim, gentle white studio highlights on left and right shoulders, faint fine-grain texture. Straight-on view from slightly above, matching the reference camera angle. Single object centered, complete silhouette, compactly framed with only about 5 percent clear padding. Visible object width-to-height ratio approximately 0.83. True transparent alpha background. No base tray, no dice, no cast shadow outside the object, no ground, no background of any color, no checkerboard pattern, no UI, no buttons, no text, no watermark. Keep object pitch and shape as in the floating cup in the center reference, suitable to move vertically as one image in an opening animation.

## 透明背景修正提示词

Use case: background-extraction. This is a production PNG asset and must have actual alpha transparency outside the cup. Remove the checkerboard background COMPLETELY from this image, preserving only the black inverted cup and its exact complete silhouette, texture, highlights, shape, orientation, framing and bottom rim. Do not depict or paint transparency as any checkerboard or other pattern. Keep the cup unchanged. Actual transparent pixels, PNG alpha channel required. No ground shadow.

## 验证

- 首版有棋盘格烘焙背景，未作为运行素材采用；再次使用内置 `image_gen` 修正透明背景。
- 最终素材 `hasAlpha: true`、4 通道；72978 个像素的 alpha 为 0，杯体主要像素 alpha 为 253/255，保留生成器输出与抗锯齿。
- 已查看最终 PNG：无底座、骰子、文字、背景棋盘格；完整顶部小盖、两侧高光和底缘均保留。
- 与参考的黑色倒扣杯、略宽下口和稍俯视方向一致；纹理与高光为重新生成的近似，不是逐像素复刻。
