"""Extrait les fiches plantes du PDF Imderplam vers prive/fiches-brutes.json.

Usage : python tools/extraire-fiches.py "chemin/Fiches-plantes.pdf"

Le PDF est protégé (diffusion interdite) : le JSON va dans prive/, qui n'est jamais
publié. Seule la version chiffrée (data/fiches.enc) part sur GitHub.
"""
import sys, os, re, json, unicodedata
import fitz

PDF = sys.argv[1]
SORTIE = os.path.join(os.path.dirname(__file__), "..", "prive", "fiches-brutes.json")

PURPLE, GREEN = 0x642477, 0x127047


def role(span):
    f, s, c = span["font"], round(span["size"]), span["color"]
    t = span["text"].strip()
    if s <= 8 or "Tous droits" in t or "reproduction" in t or "L.111" in t:
        return "skip"
    if f.startswith("Roboto-Regular") and s in (11, 12):
        return "skip"  # en-tête courant « Fiche plante Imderplam - … »
    if f.startswith("Roboto-Italic") and s == 12:
        return "skip"
    if f.startswith("Lora-Bold") and s >= 20:
        return "titre"
    if f.startswith("Roboto-Italic") and s >= 17:
        return "latin"
    if f.startswith("Lora") and s >= 20:
        return "section"
    if f.startswith("Roboto-Italic") and 14 <= s <= 16:
        return "rubrique"
    if f.startswith("Roboto-BoldItalic") and 12 <= s <= 14:
        return "sphere"
    return "texte"


def propre(t):
    t = unicodedata.normalize("NFC", t)
    t = t.replace(" ", " ").replace("", "•")
    return t


def lignes_de(doc):
    """Renvoie une suite de (page, role, y, x, texte, gras) ligne par ligne."""
    for pn, page in enumerate(doc, 1):
        if pn < 5:
            continue
        for b in page.get_text("dict")["blocks"]:
            for l in b.get("lines", []):
                spans = [s for s in l["spans"] if s["text"].strip()]
                if not spans:
                    continue
                roles = [role(s) for s in spans]
                if all(r == "skip" for r in roles):
                    continue
                main = next(r for r in roles if r != "skip")
                morceaux = []
                for s, r in zip(spans, roles):
                    if r == "skip":
                        continue
                    t = propre(s["text"])
                    gras = "Bold" in s["font"] and main == "texte"
                    if s["font"].startswith("MS-") or t.strip() in ("✧", "❖", "➢", "▪", "●"):
                        t = "• "
                    morceaux.append((t, gras))
                yield pn, main, round(l["bbox"][1], 1), round(l["bbox"][0]), morceaux


def joindre(morceaux):
    out = ""
    for t, gras in morceaux:
        if gras and t.strip():
            lead = t[: len(t) - len(t.lstrip())]
            trail = t[len(t.rstrip()):]
            t = lead + "**" + t.strip() + "**" + trail
        if out and not out.endswith((" ", "• ")) and not t.startswith((" ", ",", ".", ")")):
            out += " "
        out += t
    out = re.sub(r"\*\*\s*\*\*", " ", out)
    out = re.sub(r"[ \t]+", " ", out).strip()
    return out


def slug(t):
    t = unicodedata.normalize("NFD", t.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


plantes = []
cur = None
section = rubrique = None
dernier = None  # (page, y, x) de la dernière ligne de texte


def ajouter(texte, y, x, pn):
    global dernier
    key = (section or "", rubrique or "")
    bloc = cur["sections"].setdefault(key, [])
    debut = texte.startswith(("•", "- ", "– ", "→", "N.B"))
    nouveau_par = (
        not bloc
        or debut
        or dernier is None
        or dernier[0] != pn
        or y - dernier[1] > 22
    )
    if nouveau_par:
        bloc.append(texte)
    else:
        prev = bloc[-1]
        if prev.endswith("-") and not prev.endswith(" -"):
            bloc[-1] = prev + texte
        else:
            bloc[-1] = prev + " " + texte
    dernier = (pn, y, x)


doc = fitz.open(PDF)
for pn, r, y, x, morceaux in lignes_de(doc):
    texte = joindre(morceaux)
    if not texte:
        continue
    if r == "titre":
        if cur and cur.get("latin") and cur["sections"]:
            plantes.append(cur)
            cur = None
        if cur is None:
            cur = {"nom": texte, "latin": "", "page": pn, "sections": {}}
        else:
            cur["nom"] += " " + texte
        section, rubrique, dernier = None, None, None
        continue
    if cur is None:
        continue
    if r == "latin":
        cur["latin"] = (cur["latin"] + " " + texte).strip()
        continue
    if r == "section":
        section, rubrique, dernier = texte, None, None
        continue
    if r == "rubrique":
        rubrique, dernier = texte, None
        continue
    if r == "sphere":
        ajouter("## " + texte, y, x, pn)
        dernier = None
        continue
    ajouter(texte, y, x, pn)
if cur:
    plantes.append(cur)

for p in plantes:
    p["nom"] = re.sub(r"\s+", " ", p["nom"]).strip()
    p["sections"] = [
        {"section": k[0], "rubrique": k[1], "paragraphes": v} for k, v in p["sections"].items()
    ]

os.makedirs(os.path.dirname(SORTIE), exist_ok=True)
with open(SORTIE, "w", encoding="utf-8") as f:
    json.dump(plantes, f, ensure_ascii=False, indent=1)
print(len(plantes), "plantes ->", os.path.normpath(SORTIE))
