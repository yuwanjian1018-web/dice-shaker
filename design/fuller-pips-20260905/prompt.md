# 内置 ImageGen 提示词

用户澄清：保留宝石切面高光，只加大红蓝点与骰子尺寸。前两张用户参考仅用于点的饱满程度。骰子尺寸在布局代码中调整。

Use case: precise-object-edit.
Image 1 is the edit target: the existing 1536x1024 six-dice sprite atlas.
Images 2 and 3 are ONLY references for the much BIGGER, FULLER proportions of the colored pips. The user explicitly wants to KEEP the gemstone-like faceted highlights of Image 1. Do NOT flatten the pips or remove their jeweled facets. Do NOT copy the reference blue tray, white plastic style, camera angle or scenery.

Change ONLY the size/fullness of the recessed red and blue pips on ALL six dice. Make every blue pip and every red four-face pip about 30% larger in DIAMETER than Image 1, and every red single pip about 25% larger in diameter. Their colored regions must look bold and full, close to the broad round pips of the two references. Maintain their rich cobalt blue / ruby red color and polished gemstone-cut reflective facets inside each pip. Each pip is a circular inset in its face's own plane; preserve elliptical perspective. No thin rings, no hollow pips, no tiny dots.
Keep the center positions and correct face-local diagonal arrangement of the TWO and THREE faces. Enlarge around those centers with careful margins: all pips fully inside their own face, no pips merging/touching, no extra pips. Expand spacing a little only if necessary for six pips to stay separate.

EXACT COUNTS and colors (TOP / SCREEN-LEFT / SCREEN-RIGHT):
row1 left: 1 RED / 2 BLUE / 3 BLUE
row1 middle: 2 BLUE / 3 BLUE / 1 RED
row1 right: 3 BLUE / 1 RED / 2 BLUE
row2 left: 4 RED / 2 BLUE / 1 RED
row2 middle: 5 BLUE / 1 RED / 3 BLUE
row2 right: 6 BLUE / 3 BLUE / 2 BLUE.
This is exactly 18 visible numbered faces. The TWO pattern lies in diagonally opposite inset corners of each square face, THREE is that diagonal plus center. Preserve the top TWO nearly horizontal diagonal across the diamond-shaped top from image 1.

PRESERVE EXACTLY: the ivory cube bodies, six outer silhouettes and roundness, size in the atlas, positions and 3 by 2 cell layout, camera elevation, cube rotations, vertical edges, lighting, body texture and solid green matte. The game will scale the dice up in code; do not enlarge the cube bodies in this atlas. Output same 1536x1024 with 512x512 cells. Pure flat #00FF00 background with clean edges and no green reflections. No floor, no cast shadows outside dice, no text, no labels, no cup or tray.
