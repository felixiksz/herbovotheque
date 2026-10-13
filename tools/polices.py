"""Ajoute Ɵ (U+019F) à Beth Ellen et Kumar One, puis exporte toutes les polices en woff2 sous-ensemble."""
import sys, os
from fontTools.ttLib import TTFont
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.ttLib.tables._g_l_y_f import GlyphComponent
from fontTools import subset

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)

UNICODES = (
    list(range(0x20, 0x7F)) + list(range(0xA0, 0x250)) + list(range(0x300, 0x370)) +
    list(range(0x370, 0x400)) + list(range(0x1E00, 0x1F00)) + list(range(0x2000, 0x2070)) +
    list(range(0x2070, 0x20A0)) + [0x20AC] + list(range(0x2100, 0x2200)) + list(range(0x2190, 0x2200)) +
    list(range(0x2200, 0x2300))
)


def add_obar(font, bar_ratio, thick_ratio, slant):
    glyf = font["glyf"]
    cmap = font.getBestCmap()
    o_name = cmap[ord("O")]
    o = glyf[o_name]
    o.recalcBounds(glyf)
    w = o.xMax - o.xMin
    h = o.yMax - o.yMin
    mid = o.yMin + h * 0.5
    rad = font["head"].unitsPerEm * thick_ratio
    cx = o.xMin + w * bar_ratio
    cy = mid + slant
    pen = TTGlyphPen(None)
    if slant >= 0:
        k = 0.4142 * rad
        pen.moveTo((cx + rad, cy))
        pen.qCurveTo((cx + rad, cy + k), (cx + rad * 0.7071, cy + rad * 0.7071))
        pen.qCurveTo((cx + k, cy + rad), (cx, cy + rad))
        pen.qCurveTo((cx - k, cy + rad), (cx - rad * 0.7071, cy + rad * 0.7071))
        pen.qCurveTo((cx - rad, cy + k), (cx - rad, cy))
        pen.qCurveTo((cx - rad, cy - k), (cx - rad * 0.7071, cy - rad * 0.7071))
        pen.qCurveTo((cx - k, cy - rad), (cx, cy - rad))
        pen.qCurveTo((cx + k, cy - rad), (cx + rad * 0.7071, cy - rad * 0.7071))
        pen.qCurveTo((cx + rad, cy - k), (cx + rad, cy))
        pen.closePath()
    bar = pen.glyph()
    order = font.getGlyphOrder()
    order += ["ovobar", "Obarmiddle"]
    font.setGlyphOrder(order)
    glyf.glyphs["ovobar"] = bar
    comp = TTGlyphPen(None).glyph()
    comp.numberOfContours = -1
    comp.components = []
    for name in (o_name, "ovobar"):
        c = GlyphComponent()
        c.glyphName = name
        c.x = c.y = 0
        c.flags = 0x4 if name == o_name else 0
        comp.components.append(c)
    glyf.glyphs["Obarmiddle"] = comp
    adv = font["hmtx"][o_name][0]
    font["hmtx"]["ovobar"] = (0, 0)
    font["hmtx"]["Obarmiddle"] = (adv, o.xMin)
    for table in font["cmap"].tables:
        if table.isUnicode():
            table.cmap[0x19F] = "Obarmiddle"
    font["maxp"].numGlyphs = len(order)
    if "post" in font and font["post"].formatType == 2.0:
        font["post"].extraNames = getattr(font["post"], "extraNames", [])
    glyf["Obarmiddle"].recalcBounds(glyf)


jobs = [
    ("bethellen_BethEllen-Regular.ttf", "beth-ellen.woff2", (0.37, 0.068, 25)),
    ("kumarone_KumarOne-Regular.ttf", "kumar-one.woff2", (0.5, 0.06, 0)),
    ("caudex_Caudex-Regular.ttf", "caudex-regular.woff2", None),
    ("caudex_Caudex-Bold.ttf", "caudex-bold.woff2", None),
    ("caudex_Caudex-Italic.ttf", "caudex-italic.woff2", None),
    ("caudex_Caudex-BoldItalic.ttf", "caudex-bold-italic.woff2", None),
]
for name, dest, obar in jobs:
    f = TTFont(os.path.join(src, name))
    if obar:
        add_obar(f, *obar)
    opts = subset.Options()
    opts.hinting = False
    opts.flavor = "woff2"
    opts.layout_features = ["*"]
    opts.name_IDs = ["*"]
    opts.notdef_outline = True
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=UNICODES)
    sub.subset(f)
    if obar:
        f.save(os.path.join(out, dest.replace(".woff2", "-ovo.ttf")))
    f.flavor = "woff2"
    f.save(os.path.join(out, dest))
    print(dest, os.path.getsize(os.path.join(out, dest)))
