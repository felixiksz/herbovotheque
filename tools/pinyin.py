"""Ajoute à VT323 les voyelles du pinyin qui lui manquent (ǎ ǐ ǒ ǔ, ǖ ǘ ǚ ǜ et leurs majuscules),
composées avec ses propres lettres et accents. Modifie fonts/vt323-ext.woff2 sur place."""
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphComponent

CHEMIN = "fonts/vt323-ext.woff2"
# décalage horizontal de chaque accent pour le centrer sur une lettre de 400 de large
ACCENTS = {"macron": ("uni0304", 400), "aigu": ("acutecomb", 380), "caron": ("uni030C", 400), "grave": ("gravecomb", 420)}
MAJ = 160  # au-dessus d'une majuscule
TREMA = 120  # au-dessus d'un tréma
LETTRES = {
    0x01CD: ("A", "caron", MAJ), 0x01CE: ("a", "caron", 0),
    0x01CF: ("I", "caron", MAJ), 0x01D0: ("dotlessi", "caron", 0),
    0x01D1: ("O", "caron", MAJ), 0x01D2: ("o", "caron", 0),
    0x01D3: ("U", "caron", MAJ), 0x01D4: ("u", "caron", 0),
}
# ü avec un ton : le tréma, puis l'accent au-dessus
TREMAS = {0x01D5: ("U", "macron"), 0x01D6: ("u", "macron"), 0x01D7: ("U", "aigu"), 0x01D8: ("u", "aigu"),
          0x01D9: ("U", "caron"), 0x01DA: ("u", "caron"), 0x01DB: ("U", "grave"), 0x01DC: ("u", "grave")}


def composant(nom, x, y):
    c = GlyphComponent()
    c.glyphName, c.x, c.y, c.flags = nom, x, y, 0
    return c


def composee(parts):
    g = Glyph()
    g.numberOfContours = -1
    g.components = [composant(*p) for p in parts]
    g.components[0].flags = 0x4  # les métriques de la lettre de base
    return g


t = TTFont(CHEMIN)
glyf, hmtx = t["glyf"], t["hmtx"]
nouvelles = {}
for code, (base, acc, dy) in LETTRES.items():
    nom, dx = ACCENTS[acc]
    nouvelles[code] = [(base, 0, 0), (nom, dx, dy)]
for code, (base, acc) in TREMAS.items():
    dy = MAJ if base == "U" else 0
    nom, dx = ACCENTS[acc]
    nouvelles[code] = [(base, 0, 0), ("uni0308", 400, dy), (nom, dx, dy + TREMA)]

ordre = t.getGlyphOrder()
for code, parts in nouvelles.items():
    nom = "uni%04X" % code
    if nom not in glyf.keys():
        ordre.append(nom)
    glyf.glyphs[nom] = composee(parts)
    hmtx[nom] = hmtx[parts[0][0]]
t.setGlyphOrder(ordre)
for nom in ["uni%04X" % c for c in nouvelles]:
    glyf[nom].recalcBounds(glyf)
for table in t["cmap"].tables:
    if table.isUnicode():
        for code in nouvelles:
            table.cmap[code] = "uni%04X" % code
t["maxp"].numGlyphs = len(ordre)
t.flavor = "woff2"
t.save(CHEMIN)
print(len(nouvelles), "voyelles ajoutées")


# --- les autres polices : les mêmes voyelles, dessinées à partir de leurs propres accents ---
# On prend l'accent sur une lettre qui l'a déjà (ě pour le caron, ā pour le macron, á, à, ü),
# on le détache de sa lettre et on le pose, centré, sur a, ı, o ou u.
from fontTools.pens.recordingPen import DecomposingRecordingPen, RecordingPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

AUTRES = ["caudex-regular", "caudex-bold", "caudex-italic", "caudex-bold-italic", "suez-one", "beth-ellen", "kumar-one"]
SOURCES = {  # minuscule, majuscule ; « ^ » : le circonflexe retourné, faute de caron ; « ¯ » : l'accent seul
    "caron": [(0x011B, 0x011A), (0x00EA, 0x00CA, "^"), (0x00E2, 0x00C2, "^")],
    "macron": [(0x0101, 0x0100), (0x00AF, 0x00AF, "¯")],
    "aigu": [(0x00E9, 0x00C9)],
    "grave": [(0x00E8, 0x00C8)],
    "trema": [(0x00FC, 0x00DC)],
}
VOYELLES = [(0x01CE, "a", "caron"), (0x01D0, "i", "caron"), (0x01D2, "o", "caron"), (0x01D4, "u", "caron"), (0x011B, "e", "caron"),
            (0x01CD, "A", "caron"), (0x01CF, "I", "caron"), (0x01D1, "O", "caron"), (0x01D3, "U", "caron"), (0x011A, "E", "caron"),
            (0x0101, "a", "macron"), (0x0113, "e", "macron"), (0x012B, "i", "macron"), (0x014D, "o", "macron"), (0x016B, "u", "macron"),
            (0x0100, "A", "macron"), (0x0112, "E", "macron"), (0x012A, "I", "macron"), (0x014C, "O", "macron"), (0x016A, "U", "macron")]
TONS_U = {"macron": (0x01D6, 0x01D5), "aigu": (0x01D8, 0x01D7), "caron": (0x01DA, 0x01D9), "grave": (0x01DC, 0x01DB)}


def contours(gs, nom):
    p = DecomposingRecordingPen(gs)
    gs[nom].draw(p)
    res, cur = [], []
    for op, args in p.value:
        cur.append((op, args))
        if op in ("closePath", "endPath"):
            res.append(cur)
            cur = []
    return res


def bornes(cs, gs):
    b = BoundsPen(gs)
    for c in cs:
        for op, args in c:
            getattr(b, op)(*args)
    return b.bounds


def deplacer(cs, dx, dy, retourne_autour=None):
    out = []
    for c in cs:
        nc = []
        for op, args in c:
            pts = []
            for (x, y) in args:
                if retourne_autour is not None:
                    y = 2 * retourne_autour - y
                pts.append((x + dx, y + dy))
            nc.append((op, tuple(pts)))
        if retourne_autour is not None:  # retourner inverse le sens des contours
            nc = inverser(nc)
        out.append(nc)
    return out


def inverser(c):
    rp = RecordingPen()
    from fontTools.pens.reverseContourPen import ReverseContourPen
    pen = ReverseContourPen(rp)
    for op, args in c:
        getattr(pen, op)(*args)
    return rp.value


def accent(t, gs, cm, nom_acc, maj):
    """Les contours de l'accent, posés au-dessus d'une lettre de référence, et le centre de cette lettre."""
    for src in SOURCES[nom_acc]:
        code = src[1] if maj else src[0]
        if code not in cm:
            continue
        lettre = cm[ord("E" if maj else "e")] if nom_acc != "trema" else cm[ord("U" if maj else "u")]
        if nom_acc in ("caron", "aigu", "grave") and code in (0x00EA, 0x00CA, 0x011B, 0x011A, 0x00E9, 0x00C9, 0x00E8, 0x00C8):
            lettre = cm[ord("E" if maj else "e")]
        base = bornes(contours(gs, lettre), gs)
        if len(src) > 2 and src[2] == "¯":
            # l'accent seul : à la hauteur de l'accent aigu de é
            aigu, _ = accent(t, gs, cm, "aigu", maj)
            cs = contours(gs, cm[code])
            if not aigu or not cs:
                continue
            b, ba = bornes(cs, gs), bornes(aigu, gs)
            cs = deplacer(cs, (base[0] + base[2]) / 2 - (b[0] + b[2]) / 2, (ba[1] + ba[3]) / 2 - (b[1] + b[3]) / 2)
            return cs, (base[0] + base[2]) / 2
        cs = [c for c in contours(gs, cm[code]) if bornes([c], gs)[1] > base[3] - 2]
        if not cs:
            continue
        if len(src) > 2:  # le circonflexe retourné
            b = bornes(cs, gs)
            cs = deplacer(cs, 0, 0, retourne_autour=(b[1] + b[3]) / 2)
        return cs, (base[0] + base[2]) / 2
    if maj:  # pas de majuscule accentuée : l'accent de la minuscule, monté à la hauteur des capitales
        cs, cx = accent(t, gs, cm, nom_acc, False)
        if cs:
            haut = bornes(contours(gs, cm[ord("E")]), gs)[3] - bornes(contours(gs, cm[ord("e")]), gs)[3]
            return deplacer(cs, 0, haut), cx
    return None, None


def lettre_base(gs, cm, ch):
    if ch == "i":
        if 0x0131 in cm:
            return contours(gs, cm[0x0131])
        cs = contours(gs, cm[ord("i")])  # sans son point (le contour le plus haut)
        return sorted(cs, key=lambda c: bornes([c], gs)[1])[:-1]
    return contours(gs, cm[ord(ch)])


def ecrire(t, nom, cs, avance, lsb_de):
    pen = TTGlyphPen(None)
    for c in cs:
        for op, args in c:
            getattr(pen, op)(*args)
    g = pen.glyph()
    if nom not in t["glyf"].keys():
        t.setGlyphOrder(t.getGlyphOrder() + [nom])
    t["glyf"].glyphs[nom] = g
    g.recalcBounds(t["glyf"])
    t["hmtx"][nom] = (avance, g.xMin if g.numberOfContours else 0)


for f in AUTRES:
    chemin = "fonts/%s.woff2" % f
    t = TTFont(chemin)
    gs, cm = t.getGlyphSet(), t.getBestCmap()
    ajout = {}
    for code, ch, ton in VOYELLES:
        if code in cm and not cm[code].startswith("pinyin"):
            continue
        maj = ch.isupper()
        acc, cx = accent(t, gs, cm, ton, maj)
        if not acc:
            continue
        base = lettre_base(gs, cm, ch.lower() if ch == "i" else ch)
        bb = bornes(base, gs)
        ajout[code] = (base + deplacer(acc, (bb[0] + bb[2]) / 2 - cx, 0), cm[ord(ch)])
    for ton, (code_min, code_maj) in TONS_U.items():
        for maj, code in ((False, code_min), (True, code_maj)):
            if code in cm and not cm[code].startswith("pinyin"):
                continue
            tr, cxt = accent(t, gs, cm, "trema", maj)
            acc, cx = accent(t, gs, cm, ton, maj)
            if not tr or not acc:
                continue
            base = lettre_base(gs, cm, "U" if maj else "u")
            bb, btr, bacc = bornes(base, gs), bornes(tr, gs), bornes(acc, gs)
            ecart = (btr[3] - btr[1]) * 0.6
            monte = btr[3] + ecart - bacc[1]
            ajout[code] = (base + deplacer(tr, (bb[0] + bb[2]) / 2 - cxt, 0) + deplacer(acc, (bb[0] + bb[2]) / 2 - cx, monte), cm[ord("U" if maj else "u")])
    for code, (cs, ref) in ajout.items():
        nom = "pinyin%04X" % code
        ecrire(t, nom, cs, t["hmtx"][ref][0], ref)
        for table in t["cmap"].tables:
            if table.isUnicode():
                table.cmap[code] = nom
    t["maxp"].numGlyphs = len(t.getGlyphOrder())
    t.flavor = "woff2"
    t.save(chemin)
    print(f, len(ajout), "voyelles")
