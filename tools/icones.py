"""Fabrique les icônes de l'application (tête d'ƟvƟ en pixels sur papier crème).

Usage : python tools/icones.py
"""
import os, re
from PIL import Image, ImageDraw

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
src = open(os.path.join(RACINE, "js", "50-pixel.js"), encoding="utf-8").read()
pal = dict(re.findall(r'(\w): "(#[0-9a-f]{6})"', src.split("const OVO")[0]))
m = re.search(r"const OVO = \[(.*?)\];", src, re.S)
lignes = re.findall(r'"([^"]*)"', m.group(1))[:16]

os.makedirs(os.path.join(RACINE, "icones"), exist_ok=True)


def icone(taille, marge=0.16, fond="#f8f2e4"):
    im = Image.new("RGB", (taille, taille), fond)
    d = ImageDraw.Draw(im)
    # petit cercle orange fluo derrière la tête
    r = taille * 0.40
    d.ellipse([taille / 2 - r, taille / 2 - r, taille / 2 + r, taille / 2 + r], fill="#ffa64d")
    w = max(len(l) for l in lignes)
    h = len(lignes)
    k = int((taille * (1 - 2 * marge)) / max(w, h))
    x0 = (taille - w * k) // 2
    y0 = (taille - h * k) // 2 + k // 2
    for y, l in enumerate(lignes):
        for x, c in enumerate(l):
            if c in pal:
                d.rectangle([x0 + x * k, y0 + y * k, x0 + (x + 1) * k - 1, y0 + (y + 1) * k - 1], fill=pal[c])
    return im


for taille, nom in ((180, "icone-180.png"), (192, "icone-192.png"), (512, "icone-512.png"), (64, "favicon.png")):
    icone(taille).save(os.path.join(RACINE, "icones", nom))
icone(512, marge=0.24).save(os.path.join(RACINE, "icones", "icone-masquable-512.png"))
print("icônes prêtes")
