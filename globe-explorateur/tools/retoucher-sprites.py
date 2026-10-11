# Adoucit les bords rectangulaires du sol de pyramides.png (ellipse en fondu sur le sol), sans RunningHub.
# Source conservée dans assets/img/source/pyramides-orig.png. Usage : python3 tools/retoucher-sprites.py
import math, shutil, os
from PIL import Image

SRC = 'assets/img/source/pyramides-orig.png'
DST = 'assets/img/pyramides.png'

im = Image.open(SRC).convert('RGBA')
w, h = im.size
a = im.getchannel('A')
x0, y0, x1, y1 = a.point(lambda v: 255 if v > 16 else 0).getbbox()
cw, ch = x1 - x0, y1 - y0
cx = (x0 + x1) / 2
sol_haut = y0 + ch * 0.66          # le sol commence ici ; au-dessus : rien n'est touché
rx, ry = cw / 2 * 1.02, (y1 - sol_haut) * 1.0
px = im.load()
for y in range(int(sol_haut), y1):
    for x in range(x0, x1):
        r, g, b, al = px[x, y]
        if al == 0:
            continue
        # demi-ellipse : pleine largeur à la hauteur du sol, qui se resserre vers le bas ; bord adouci sur 22 %
        d = math.hypot((x - cx) / rx, (y - sol_haut) / ry)
        m = 1.0 if d <= 0.78 else max(0.0, (1.0 - d) / 0.22)
        px[x, y] = (r, g, b, int(al * m))
im.save(DST)

# Planche de contrôle : 8 sprites sur fond bleu globe
noms = ['manchot', 'lion', 'panda', 'kangourou', 'tour-eiffel', 'pyramides', 'statue-liberte', 'lama']
T = 320
planche = Image.new('RGB', (T * 4, T * 2), (47, 155, 255))
for i, n in enumerate(noms):
    sp = Image.open(f'assets/img/{n}.png').convert('RGBA').resize((T, T))
    planche.paste(sp, ((i % 4) * T, (i // 4) * T), sp)
planche.save('assets/planche.png')
