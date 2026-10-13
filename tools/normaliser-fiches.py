"""Range les fiches brutes en rubriques : prive/fiches-brutes.json -> prive/base.json.

Usage : python tools/normaliser-fiches.py "chemin/Fiches-plantes.pdf"
(le PDF sert seulement à relire l'index pour avoir les noms bien écrits)
"""
import sys, os, re, json, unicodedata, subprocess
import fitz

ICI = os.path.dirname(os.path.abspath(__file__))
PRIVE = os.path.join(ICI, "..", "prive")
PDF = sys.argv[1]


def sans_accents(t):
    t = unicodedata.normalize("NFD", t.lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", sans_accents(t)).strip("-")


# --- noms de l'index (pages 3-4), repérés par numéro de page -------------
doc = fitz.open(PDF)
index_txt = "\n".join(doc[i].get_text() for i in (2, 3))
noms_index = {}
tampon = ""
for ligne in index_txt.splitlines():
    ligne = ligne.strip()
    if not ligne or ligne == "Index" or "droits" in ligne or "reproduction" in ligne or "L.111" in ligne:
        continue
    tampon = (tampon + " " + ligne).strip()
    m = re.match(r"^(.*?)\s*(\d{1,3})$", tampon)
    if m and " - " in m.group(1):
        nom = m.group(1).split(" - ")[0].strip()
        noms_index[int(m.group(2))] = nom
        tampon = ""
    elif re.fullmatch(r"\d{1,3}", ligne):
        tampon = ""

# --- rubriques ------------------------------------------------------------
SECTIONS = [
    ("botanique", "Botanique"),
    ("phyto", "Phytothérapie – Herboristerie"),
    ("approches", "Autres approches"),
    ("mtc", "MTC"),
    ("precautions", "Précautions et législation"),
    ("jardin", "Au jardin"),
    ("notes", "Mes notes"),
]

CHAMPS = [
    # id, nom, section, type, cartes (révisable en flashcarte)
    ("nomsCommuns", "Noms communs", "botanique", "court", True),
    ("famille", "Famille", "botanique", "court", True),
    ("ordre", "Ordre", "botanique", "court", False),
    ("description", "Description botanique", "botanique", "texte", False),
    ("drogueSeche", "Description de la drogue sèche", "botanique", "texte", True),
    ("biotope", "Biotope et répartition", "botanique", "texte", False),
    ("ethnobotanique", "Ethnobotanique", "botanique", "texte", False),
    ("partiesRecolte", "Parties utilisées et période de récolte", "phyto", "texte", True),
    ("principesActifs", "Principes actifs", "phyto", "texte", True),
    ("formesGaleniques", "Formes galéniques", "phyto", "texte", False),
    ("dosages", "Modes d’utilisation, dosages conseillés", "phyto", "texte", False),
    ("proprietes", "Propriétés et indications", "phyto", "texte", True),
    ("spheres", "Sphères d’action", "phyto", "choix", True),
    ("aromatherapie", "Aromathérapie", "approches", "texte", False),
    ("gemmotherapie", "Gemmothérapie", "approches", "texte", False),
    ("elixirs", "Élixirs floraux", "approches", "texte", False),
    ("homeopathie", "Homéopathie", "approches", "texte", False),
    ("mtcSaveur", "Saveur et nature", "mtc", "court", True),
    ("mtc", "MTC", "mtc", "texte", True),
    ("precautions", "Précautions d’usage", "precautions", "texte", True),
    ("legislation", "Législation", "precautions", "texte", False),
    ("notes", "Mes notes", "notes", "texte", False),
]

RUBRIQUES = {
    "description botanique": "description",
    "description de la drogue seche": "drogueSeche",
    "description drogue seche": "drogueSeche",
    "description plante seche": "drogueSeche",
    "description de la plante seche": "drogueSeche",
    "biotope et repartition": "biotope",
    "ethnobotanique": "ethnobotanique",
    "parties utilisees et periode de recolte": "partiesRecolte",
    "parties utilisees et periodes de recolte": "partiesRecolte",
    "principes actifs": "principesActifs",
    "formes galeniques": "formesGaleniques",
    "modes d'utilisation, dosages conseilles": "dosages",
    "proprietes et indications": "proprietes",
}
SECTION_SEULE = {
    "ethnobotanique": "ethnobotanique",
    "mtc": "mtc",
    "legislation": "legislation",
    "aromatherapie": "aromatherapie",
    "aromatherapie - precautions d'usage": "aromatherapie",
    "gemmotherapie": "gemmotherapie",
    "homeopathie": "homeopathie",
    "elixir floral": "elixirs",
    "elixirs floraux": "elixirs",
    "elixir floral bach": "elixirs",
    "precautions d'usage": "precautions",
    "precautions d'usage (phytotherapie)": "precautions",
    "description botanique": "description",
}


def cle(t):
    return sans_accents(t).replace("’", "'").strip(" .")


def nettoyer(par):
    par = re.sub(r"\*\*\s*\*\*", " ", par)
    par = re.sub(r"\s+([,.;:)])", r"\1", par).replace("( ", "(")
    par = re.sub(r"\.{4,}", "…", par)
    par = re.sub(r"[ ]{2,}", " ", par).strip()
    return par


def nom_propre(p):
    n = noms_index.get(p["page"])
    if n and sans_accents(n)[:4] == sans_accents(p["nom"])[:4]:
        return n
    t = p["nom"].lower()
    return t[:1].upper() + t[1:]


SPHERE_RE = re.compile(r"^##\s*(Sph[èe]re\s+[^(:]+)", re.I)

# Les fiches nomment les sphères de 70 façons : on les regroupe en grandes familles.
SPHERES = [
    (r"digest|gastro|splen", "Digestive"),
    (r"hepat", "Hépatique"),
    (r"bucc|pharyng", "Bucco-pharyngée"),
    (r"circulat|vein|lymph", "Circulatoire"),
    (r"cardio", "Cardiovasculaire"),
    (r"uterin|gyneco|feminin", "Gynécologique"),
    (r"genit(?!o-urin)|genito", "Génitale"),
    (r"urin", "Urinaire"),
    (r"respir", "Respiratoire"),
    (r"immun", "Immunitaire"),
    (r"cutan|phanere|cosmet", "Cutanée"),
    (r"metabol", "Métabolique"),
    (r"nerv|cognit|neuro", "Nerveuse"),
    (r"osteo|articul|locomot|muscul", "Ostéo-articulaire"),
    (r"endocrin|hormon", "Endocrinienne"),
    (r"sens", "Organes des sens"),
]

PREPARATIONS = [
    {"id": "plante-seche", "nom": "Plante sèche", "forme": "bocal"},
    {"id": "teinture", "nom": "Teinture mère", "forme": "flacon"},
    {"id": "huile-essentielle", "nom": "Huile essentielle", "forme": "compte-gouttes"},
    {"id": "macerat", "nom": "Macérat huileux", "forme": "pot"},
    {"id": "gemmotherapie", "nom": "Macérat de bourgeons", "forme": "flacon"},
    {"id": "elixir", "nom": "Élixir floral", "forme": "compte-gouttes"},
    {"id": "homeopathie", "nom": "Homéopathie", "forme": "tube"},
]
PREPARATIONS_AUTO = [
    ("plante-seche", lambda f, v: re.search(r"tisane|infusion|decoction|poudre|gelule|plante seche|maceration a froid", f)),
    ("teinture", lambda f, v: re.search(r"teinture|hydroalcool|alcoolature", f)),
    ("huile-essentielle", lambda f, v: "aromatherapie" in v),
    ("macerat", lambda f, v: re.search(r"macerat huileux|huile infusee|macere huileux", f)),
    ("gemmotherapie", lambda f, v: "gemmotherapie" in v),
    ("elixir", lambda f, v: "elixirs" in v),
    ("homeopathie", lambda f, v: "homeopathie" in v),
]

def identifiant(latin):
    """Genre + espèce du premier nom latin : « Centaurea cyanus L. » -> centaurea-cyanus."""
    t = latin.split(":", 1)[1] if ":" in latin else latin
    t = re.sub(r"\(.*?\)", " ", t)
    t = re.split(r",| et | ou ", t)[0]
    mots = [m for m in t.split() if m[:1].isalpha()]
    return slug(" ".join(mots[:2]))


plantes = []
toutes_spheres = {}
inconnus = set()
for brute in json.load(open(os.path.join(PRIVE, "fiches-brutes.json"), encoding="utf-8")):
    v = {}
    for s in brute["sections"]:
        sec, rub = cle(s["section"]), cle(s["rubrique"])
        pars = [nettoyer(x) for x in s["paragraphes"]]
        champ = None
        if rub:
            champ = RUBRIQUES.get(rub)
            if not champ and sec.startswith("precautions"):
                champ, pars = "precautions", ["### " + s["rubrique"]] + pars
            elif not champ and sec.startswith("aromatherapie"):
                champ, pars = "aromatherapie", ["### " + s["rubrique"]] + pars
            elif not champ and rub == "ethnobotanique":
                champ = "ethnobotanique"
        elif sec == "botanique":
            texte = " ".join(pars).replace("**", "")
            labels = r"(Noms communs|Noms? latins?|Nom scientifique|Famille|Division ou ordre|[Oo]rdre)\s*:|N\.B\."
            for lab, cid in (("Noms communs", "nomsCommuns"), ("Famille", "famille"), ("(?:Division ou ordre|[Oo]rdre)", "ordre")):
                m = re.search(r"(?<![\w ]ou )" + lab + r"\s*:\s*(.*?)(?=" + labels + "|$)", texte)
                if m:
                    val = m.group(1).replace("**", "").strip(" .:")
                    if val:
                        v[cid] = val
            nb = re.search(r"N\.B\.\s*(.*)$", texte)
            if nb:
                v["_nb"] = "N.B. " + nb.group(1).strip()
            continue
        else:
            champ = SECTION_SEULE.get(sec)
        if not champ:
            inconnus.add((s["section"], s["rubrique"]))
            champ = "notes"
            pars = ["### " + (s["section"] + " – " + s["rubrique"]).strip(" –")] + pars
        if champ == "mtc" and pars and re.match(r"^\**Saveur", pars[0]):
            v["mtcSaveur"] = re.sub(r"^\**Saveurs?\**\s*[-:]?\s*", "", pars[0]).replace("**", "").strip()
            pars = pars[1:]
        v[champ] = (v.get(champ, "") + "\n" + "\n".join(pars)).strip()
    if "_nb" in v:
        v["description"] = (v.pop("_nb") + "\n" + v.get("description", "")).strip()
    spheres = []
    for ligne in v.get("proprietes", "").splitlines():
        m = SPHERE_RE.match(ligne)
        if m:
            brut = sans_accents(m.group(1))
            for mot, nom in SPHERES:
                if re.search(mot, brut) and nom not in spheres:
                    spheres.append(nom)
                    toutes_spheres[nom] = toutes_spheres.get(nom, 0) + 1
    if spheres:
        v["spheres"] = spheres
    nom = nom_propre(brute)
    formes = sans_accents(v.get("formesGaleniques", "") + " " + v.get("dosages", ""))
    preps = []
    for prep, test in PREPARATIONS_AUTO:
        if test(formes, v):
            preps.append(prep)
    plantes.append({
        "id": identifiant(brute["latin"]) or slug(nom),
        "nom": nom,
        "latin": brute["latin"],
        "valeurs": v,
        "preparations": preps,
        "source": "Fiches plantes Imderplam 2025, p. %d" % brute["page"],
    })

ids = [p["id"] for p in plantes]
assert len(ids) == len(set(ids)), [i for i in ids if ids.count(i) > 1]

champs = [
    {"id": i, "nom": n, "section": s, "type": t, "cartes": c}
    for i, n, s, t, c in CHAMPS
]
for c in champs:
    if c["id"] == "spheres":
        c["options"] = sorted(toutes_spheres, key=lambda x: -toutes_spheres[x])
        c["multiple"] = True

base = {
    "sections": [{"id": i, "nom": n} for i, n in SECTIONS],
    "champs": champs,
    "preparations": PREPARATIONS,
    "plantes": plantes,
}
with open(os.path.join(PRIVE, "base.json"), "w", encoding="utf-8") as f:
    json.dump(base, f, ensure_ascii=False, indent=1)
print(len(plantes), "plantes ; sphères :", toutes_spheres)
print("non classés :", inconnus)
