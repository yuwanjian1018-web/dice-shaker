# 骰子素材 V2：真实侧面与更清晰顶面

生成方式：内置 ImageGen 编辑，未使用 API CLI。六张 V1 素材在覆盖前保留于 `design/asset-sources/dice-v1-backup/`。

## 首轮生成提示词

Use case: precise-object-edit.
Asset: exact six-dice sprite atlas, 3 columns by 2 rows, landscape 1536 x 1024.
Input is the current dice atlas: preserve only its ivory white rounded resin material, glossy sculpted highlights, concave ruby-red and sapphire-blue pips, not its old orientation or pip assignments. Re-render all six as the SAME real die viewed in six different physically valid orientations. The request specifically corrects wrong side-face values in the input.

CAMERA AND FORM: same elevated camera and scale on all six dice. The camera is 65 degrees above the horizontal tabletop and about 40 degrees around the vertical axis. Top face should occupy about 60 percent of the total visible die area. Two SHORT side faces are visible equally: the front face projects to the lower LEFT, the right face projects to the lower RIGHT, separated by a vertical corner. Shape is a realistic cube with large soft rounded corners, not a tall rectangular block. Dominant broad diamond-like square top, low side faces. Keep the top result especially clear and easy to count. All dice identical size, camera, lighting, not randomly tumbled.

EXACT ATLAS ORDER AND FACE VALUES. For this spec FRONT means visible lower-left face and RIGHT means visible lower-right face. Three visible faces on each die must follow exactly:
Top row, left die: TOP = 1, FRONT = 2, RIGHT = 3.
Top row, middle die: TOP = 2, FRONT = 3, RIGHT = 1.
Top row, right die: TOP = 3, FRONT = 1, RIGHT = 2.
Bottom row, left die: TOP = 4, FRONT = 2, RIGHT = 1.
Bottom row, middle die: TOP = 5, FRONT = 1, RIGHT = 3.
Bottom row, right die: TOP = 6, FRONT = 3, RIGHT = 2.

PIP COLOR ON EVERY FACE: 1 and 4 are ruby RED; 2, 3, 5, and 6 are sapphire BLUE. One = one CENTER pip; two = two diagonal corner pips; three = three pips in one diagonal; four = four corner pips; five = four corners plus center; six = two columns of three. All pips are carved shallow circular depressions with soft glossy recess highlight. Count accurately on EVERY face. No extra dots. No repeated number among visible faces on the same die. Opposite physical faces are 1/6, 2/5, 3/4 and can never touch. Do NOT preserve the original wrong side values.

COMPOSITION: 512-by-512 invisible equal square grid cells; dice individually centered with generous empty gutters, no overlaps, no cropping. Each die around 340 pixels tall, same visual size. No numbers, labels, frames, arrows, shadows outside the dice or grids.
BACKGROUND for deterministic extraction: absolutely flat solid uniform chroma green #00FF00, with no texture, no gradient, no checkerboard, no floor, no drop shadow, no reflected green spill on ivory. Every pixel not part of a die must be pure green. Clean antialiased silhouettes. This green matte will be removed to true alpha for the game.

## 定向修订第6颗

首轮逐面目视检查发现：第1–5颗共15个可见面的点数与要求一致；第6颗顶面6、右面2正确，但前面误生成为5。没有用程序补点、删除点或绘制点数。将第6颗所在512×512格裁为独立输入，使用以下提示词由ImageGen修复：

Use case: precise-object-edit. Edit THIS EXACT single die cutout. Make just ONE correction: change the visible LOWER-LEFT face from five blue pips to exactly THREE blue pips in a single diagonal. The upper face already has SIX blue pips and must stay exactly unchanged. The lower-RIGHT face already has TWO blue pips and must stay exactly unchanged.
On the lower-LEFT face, KEEP these three existing blue pips: upper-left pip centered approximately (65,252), center pip (99,304), bottom-right pip (135,355), coordinates on the 512x512 input. REMOVE ONLY the extra middle-left pip centered (63,306) and extra middle-right pip centered (133,304), filling those two depressions smoothly with matching ivory resin so there is no residual dot or hollow. Final visible counts must be TOP SIX, LOWER-LEFT THREE, LOWER-RIGHT TWO. Exactly eleven pips in total, all sapphire blue.
Preserve the exact silhouette, the same rounded cube shape, camera angle, scale, position, ivory material, highlights, shading, all other pips, and the flat pure green #00FF00 background. Do not redesign. Do not zoom. Do not add letters, markings, watermarks, shadows, checkerboard or other elements. Only the two wrong extra dots are removed.

## 源文件与选用关系

- `dice-ivory-v2-generated-draft.png`：第一轮未经修改的1536×1024生成原件，第6颗前面错误，禁止直接作为最终素材使用。
- `dice-ivory-v2-die6-edit-target.png`：从首轮原件裁出的第6颗512×512输入。
- `dice-ivory-v2-die6-generated-fixed.png`：ImageGen定向修订后的1254×1254原件；已目视确认顶6、前3、右2。
- `dice-ivory-v2-selected-sheet.png`：第1–5格来自首轮原件；第6格使用修订原件缩放到512×512并替换。仅做裁切、缩放、排版，未程序绘制或改写点数。

## 透明提取与规范化

生成原件采用绿色背景，最终运行素材均为真RGBA透明。用现成sharp按3列×2行512×512格提取，背景判据为 `G > max(R,B) + 15 && G > 100`；仅保留每格最大前景连通区域。在轮廓边缘存在少量剩余绿色优势的像素处将绿色通道降到max(R,B)，去除绿色溢出；象牙白主体和红蓝凹点均不满足该条件，其颜色未重绘。前景边界裁切后等比contain至216×216，再四边各补12像素透明区，输出240×240 RGBA PNG。缩放由sharp进行边缘抗锯齿。

依赖：`C:/Program Files/nodejs/node.exe`，`C:/Users/xiaojian/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp`。

## 可见面逐一核对记录

下面的“前”指画面左下侧面，“右”指画面右下侧面。表格来自对最终深灰QA拼图的逐面目视数点，不是自动识别算法的结果。

|素材|顶面|前面/左下|右面/右下|可见面核对|
|---|---:|---:|---:|---|
|die-1.png|1红|2蓝|3蓝|3个面均确认|
|die-2.png|2蓝|3蓝|1红|3个面均确认|
|die-3.png|3蓝|1红|2蓝|3个面均确认|
|die-4.png|4红|2蓝|1红|3个面均确认|
|die-5.png|5蓝|1红|3蓝|3个面均确认|
|die-6.png|6蓝|3蓝|2蓝|3个面均确认；首轮错误已由ImageGen修复|

全部18个可见面已检查。各颗可见面之间没有重复数值；1/6、2/5、3/4三组相对面未在同一颗的相邻可见面出现。映射采用主任务指定的同一右手骰子旋转组合。

与V1相比，新版顶面明显增大，两个侧面缩短并分居左右，顶面读数更集中。镜头65度、顶面约60%为生成提示词的构图目标，未当作量测几何数值。

## 交付与QA

- 运行文件：`assets/dice/die-1.png`至`die-6.png`，已按授权覆盖V1。
- 240×240、RGBA、真实alpha；主体高度216px左右，统一居中。六图合计约338KB。
- `dice-ivory-v2-alpha-qa.png`：深灰#292b2d底完整六图拼图，每张下方标注顶/前/右映射；目视检查没有绿色背景、棋盘或白框。
- `dice-ivory-v2-validation.json`：尺寸、alpha、裁切边界、文件大小与映射记录。
- 未修改JS、CSS/WXSS、DevTools状态或其他项目逻辑。
