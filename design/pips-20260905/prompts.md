# 内置 ImageGen 编辑提示词

素材最终源图：dice-atlas-green.png。使用内置 ImageGen；未使用 API CLI。第一轮为中间稿，第二轮修正后才接入程序。

## 第一轮：加大点与对角排列

Use case: precise-object-edit. Image 1 is the EDIT TARGET: six ivory dice sprites in a 3 by 2 atlas. Correct only their recessed colored pip patterns and pip sizes. Keep the exact six cube silhouettes, rounded ivory bodies, locations, equal physical sizes, camera elevation, upright vertical edges, lighting, shadows on the dice, and solid green background. Same 1536x1024 canvas and 512x512 cells. These assets already fit a dice tray, so geometry must remain unchanged.

PRIMARY FIX: Every TWO face must have its two pips at DIAGONALLY OPPOSITE corners of the square face in that face's OWN perspective coordinates, like a real die. They must NOT lie along a row parallel to one cube edge. This applies to TOP of die 2; LEFT of dice 1 and 4; RIGHT of dice 3 and 6. Each pair should be balanced symmetrically around its face center. Respect the perspective: diagonal on the square surface, not an arbitrary diagonal in the 2D image. The top two pips can occupy inset LEFT and RIGHT diamond corners. Every THREE face likewise has two opposing corner pips with a central pip along its true face diagonal.

SIZE: Enlarge all blue pips and red four-face pips to about 1.4 TIMES their current DIAMETER, with balanced spacing and margins. RED SINGLE center pips should be notably larger, about 1.55 times current diameter. This should look like bold readable real Chinese-style dice, not tiny jeweled marks. Use smooth deep cobalt-blue and deep red recessed circular paint-filled dimples, subtle coherent glossy highlights, no faceted gemstones or white holes. A physical circle must project naturally as an ellipse in each face plane. No pips touching one another, no edges clipped.

EXACT FACE MAPPING, from viewer:
row1 left: TOP 1 RED, LEFT 2 BLUE, RIGHT 3 BLUE.
row1 middle: TOP 2 BLUE, LEFT 3 BLUE, RIGHT 1 RED.
row1 right: TOP 3 BLUE, LEFT 1 RED, RIGHT 2 BLUE.
row2 left: TOP 4 RED, LEFT 2 BLUE, RIGHT 1 RED.
row2 middle: TOP 5 BLUE, LEFT 1 RED, RIGHT 3 BLUE.
row2 right: TOP 6 BLUE, LEFT 3 BLUE, RIGHT 2 BLUE.
1 is a single central pip; 2 is two opposite face corners; 3 is two opposite face corners plus center; 4 is four face corners; 5 is four corners plus center; 6 is two columns of three on the square face. Every face must have exactly its specified number of pips, no extra marks. Do not change any top number or side number.

Output exactly six sprites, no text, no labels, no grid lines, no floor, no added external cast shadows. Preserve solid flat #00FF00 matte background with clean dice edges, no green reflections.

## 第二轮：明确面内位置并核对点数

Use case: precise-object-edit. Edit the provided six-dice atlas precisely. Keep the ivory cube bodies, silhouettes, perspective, positions, lighting and green background unchanged. Same 1536x1024 canvas.
Correct these errors in the pip artwork:
1. UPPER MIDDLE die top face is 2. Remove its present two blue pips and put exactly two blue pips centered approximately at global image coordinates (680,184) and (846,184). These are inset LEFT and RIGHT opposite corners of its diamond-shaped top square. This is the proper face-local diagonal. The line joining the two pips must run nearly HORIZONTALLY across the diamond top, not slope down along a cube edge. Both same size.
2. UPPER RIGHT die top face is 3. Remove the current sloping row; place exactly three evenly spaced blue pips in a nearly HORIZONTAL row through (1175,185), (1259,185), (1343,185), the top face's true left-to-right diagonal.
3. LOWER RIGHT die right side MUST have TWO blue pips, currently one is missing. Place one in upper-right area approximately (1376,749) and one in lower-left area (1308,855) of that right face. They are diagonally opposite corners on that face.
4. Make ALL blue pips about 25 percent larger than in this input while keeping their centers (except the explicitly moved ones), counts and colors. Top-face blue pips should be about 64 px wide and 30 px high, with enough spacing to remain distinct. The six pips on the lower-right top face also need enlargement. Red single pips and four red top pips are already good, preserve their sizes.
Every pip is a round recessed paint-filled dimple with restrained smooth highlight, not a jewel. Ensure each pip is fully inside its own face and has coherent perspective.
Exact (TOP / SCREEN LEFT / SCREEN RIGHT) counts for each die:
upper-left 1 red / 2 blue / 3 blue
upper-middle 2 blue / 3 blue / 1 red
upper-right 3 blue / 1 red / 2 blue
lower-left 4 red / 2 blue / 1 red
lower-middle 5 blue / 1 red / 3 blue
lower-right 6 blue / 3 blue / 2 blue.
No additional marks, no text, no new objects, no shadows on the solid #00FF00 background.
