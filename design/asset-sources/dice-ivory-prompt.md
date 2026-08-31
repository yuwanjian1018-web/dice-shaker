# 骰子素材生成记录

工具：内置 image_gen（未使用 API CLI）。

参考图：`C:/Users/xiaojian/AppData/Local/Temp/codex-clipboard-30e87f39-3218-4871-b05a-060319a30dee.png`。

## 首次生成提示词

Use case: stylized-concept.
Asset type: a single production-ready transparent PNG sprite atlas containing six matching ivory dice for a WeChat dice-shaker mini-game.
Input image 1 is a STYLE REFERENCE ONLY. Refer to the five small ivory dice on the tray in the middle phone design. Do not reproduce phones, tray, cup, UI, labels, background, or text.
Primary request: one transparent RGBA PNG atlas, landscape 3:2 aspect ratio, arranged in an invisible exact 3-column by 2-row grid of equal square cells. One die centered in each cell, no overlaps, wide fully transparent gutters. Reading order: TOP LEFT top-face one; TOP MIDDLE top-face two; TOP RIGHT top-face three; BOTTOM LEFT top-face four; BOTTOM MIDDLE top-face five; BOTTOM RIGHT top-face six.
All six dice have EXACTLY THE SAME SIZE, orientation, camera angle and lighting. Render each as a realistic beautiful ivory white polished resin cube with very large rounded corners, beveled pillowy faces and visibly carved concave colored circular pips. Camera looks down 35 degrees, looking almost straight toward the front face with only a slight right face visible, matching the dice in the reference. Top face is visibly broad and large, front face large, right face narrow. Soft studio highlights at top-left, gentle natural gray shading on lower front, no floor shadow and no surrounding light halo. Cubical not rectangular.
CRITICAL TOP-FACE PIP ASSIGNMENT, count very carefully: cell 1 exactly ONE centered deep ruby-red pip; cell 2 exactly TWO sapphire-blue pips at opposite diagonal corners; cell 3 exactly THREE sapphire-blue pips on one diagonal; cell 4 exactly FOUR ruby-red pips in four corners; cell 5 exactly FIVE sapphire-blue pips in four corners plus center; cell 6 exactly SIX sapphire-blue pips in two parallel columns of three. Each top-face pip a clearly separate recessed circular hole. No seventh pip. No extra dots on top. The front face of die 1 has exactly TWO sapphire-blue pips. The front face of each other die has exactly ONE centered ruby-red pip. Right narrow side may have at most two sapphire-blue pips.
Constraints: absolutely NO text, numbers, numerals, labels, panel outlines, gridlines, drop shadows, background patterns, checkerboard, gray or white backdrop. The entire space outside all six dice must be genuinely transparent with alpha=0, not a simulated checkerboard. Keep each die at 70 percent of its cell width and height, fully inside its own cell with equal clear margins. Same angle as reference, physically dimensional and rounded, not flat square icons, no flat vector art.

## 透明修订

首版顶面点数1–6及配色已逐个目视确认，但文件为RGB并带模拟棋盘背景；禁止将该背景直接用于运行素材。

第二次内置生成工具的提示词：

Use case: background-extraction. EDIT THIS EXACT INPUT ATLAS ONLY. Preserve every die, all pips, colors, shape, camera angle, positions, scale, materials and lighting exactly unchanged. Preserve 1536 by 1024 pixel atlas composition. Remove the LIGHT GRAY AND WHITE CHECKERBOARD BACKGROUND COMPLETELY and return a true RGBA PNG with alpha=0 everywhere outside the six die silhouettes. Background must be actual transparent alpha pixels. DO NOT paint another checkerboard or white or colored background. No cast shadows outside dice. Antialiased clean edges. The exact six intact dice are the only nontransparent content. Top-face pip counts must stay 1,2,3 top row and 4,5,6 bottom row. Keep top faces red for 1/4 and blue for 2/3/5/6. This is a precise background extraction task, no redesign.

该次输出仍为1536×1024 RGB、没有alpha，保留为`dice-ivory-generated.png`；第一版保留为`dice-ivory-generated-v1.png`。两者均为未裁切的生成原件，不是运行素材。

## 确定性透明提取与裁切

按主任务授权用现成sharp做透明后处理，未重绘、未修改骰子点数或内部颜色。将1536×1024原件划分为3列×2行512×512单元格。每格从外边界四连通泛洪，背景候选条件为RGB最大通道减最小通道≤6且最小通道≥215；仅去掉与外部连通的近中性色棋盘，因此封闭在骰子内部的高光不会被误删。保留每格最大前景连通区，将该区alpha设255，外部设0。按每格前景边界裁切，等比contain缩放至180×180，再四边各补10像素透明区，输出200×200 RGBA PNG。缩小时由sharp保留平滑的透明边缘。

依赖：`C:/Program Files/nodejs/node.exe`；`C:/Users/xiaojian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp`。

## 已完成验证

- `assets/dice/die-1.png`：200×200 RGBA，39211字节，顶面1红点，前面2蓝点。
- `assets/dice/die-2.png`：200×200 RGBA，39558字节，顶面2蓝点，前面1红点。
- `assets/dice/die-3.png`：200×200 RGBA，40704字节，顶面3蓝点，前面1红点。
- `assets/dice/die-4.png`：200×200 RGBA，41500字节，顶面4红点，前面1红点。
- `assets/dice/die-5.png`：200×200 RGBA，44279字节，顶面5蓝点，前面1红点。
- `assets/dice/die-6.png`：200×200 RGBA，45697字节，顶面6蓝点，前面1红点。

六图均由sharp验证`hasAlpha=true`、alpha最小值0最大值255。以深灰底`#292b2d`合成`dice-ivory-alpha-qa.png`并目视检查：没有棋盘残留、没有独立白色方框，骰子完整、尺寸对齐、点数正确。未改动JS、WXSS或原参考图。
