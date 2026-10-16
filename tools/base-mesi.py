# Les fiches du monde de Mesi : la pharmacopée chinoise du jeu jeuxmtc (les 206 substances
# médicinales, leurs fiches complètes du cours), au format des fiches de l'herbothèque.
# Écrit prive/mesi.json ; ensuite : node tools/chiffrer.mjs <mot de passe> mesi
# Usage : python tools/base-mesi.py <dossier de jeuxmtc>
import io, json, os, re, sys, unicodedata

ici = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ici, "..", "..", "jeuxmtc_clean")


def objet_js(chemin, nom, ouvrant):
    s = io.open(os.path.join(src, chemin), encoding="utf-8").read()
    i = s.index(ouvrant, s.index(nom))
    return json.JSONDecoder().raw_decode(s[i:])[0]


classes = objet_js("22-20-pharma-data.js", "const PHARMA_CLASSES", "[")
herbes = objet_js("22-20-pharma-data.js", "const PHARMA_HERBS", "[")
fiches = objet_js("22-21-pharma-fiches-completes.js", "MTC_PHARMA_FICHES", "{")


def slug(t):
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"[^a-z0-9]+", "-", t).strip("-")


def texte(v):
    # les listes à tirets du cours deviennent des puces
    if not v:
        return ""
    lignes = [re.sub(r"^\s*-\s+", "• ", l) for l in str(v).strip().split("\n")]
    return "\n".join(lignes).strip()


base_ovo = json.load(io.open(os.path.join(ici, "..", "prive", "donnees.json"), encoding="utf-8"))
jardin = [c for c in base_ovo["champs"] if c["section"] in ("jardin", "notes")]

sections = [
    {"id": "identite", "nom": "Identité"},
    {"id": "proprietes", "nom": "Nature, saveur et tropisme"},
    {"id": "actions", "nom": "Actions et indications"},
    {"id": "associations", "nom": "Associations et formules"},
    {"id": "precautions", "nom": "Précautions"},
    {"id": "preparation", "nom": "Préparations"},
    {"id": "synthese", "nom": "Synthèse"},
    {"id": "recherches", "nom": "Composants et recherches modernes"},
    {"id": "jardin", "nom": "Au jardin"},
    {"id": "notes", "nom": "Mes notes"},
]
champs = [
    {"id": "hanzi", "nom": "Caractères", "section": "identite", "type": "court", "cartes": True},
    {"id": "nomFr", "nom": "Nom français", "section": "identite", "type": "court", "cartes": True},
    {"id": "classe", "nom": "Classe", "section": "identite", "type": "choix", "options": [c["nom"] for c in classes], "cartes": True},
    {"id": "essentielle", "nom": "Substance essentielle", "section": "identite", "type": "choix", "options": ["Oui"], "cartes": False},
    {"id": "nature", "nom": "Nature", "section": "proprietes", "type": "court", "cartes": True},
    {"id": "saveur", "nom": "Saveur", "section": "proprietes", "type": "court", "cartes": True},
    {"id": "tropisme", "nom": "Tropisme", "section": "proprietes", "type": "court", "cartes": True},
    {"id": "posologie", "nom": "Posologie", "section": "proprietes", "type": "court", "cartes": True},
    {"id": "actions", "nom": "Actions", "section": "actions", "type": "texte", "cartes": True},
    {"id": "indications", "nom": "Indications", "section": "actions", "type": "texte", "cartes": True},
    {"id": "esprit", "nom": "Esprit", "section": "actions", "type": "texte", "cartes": False},
    {"id": "associations", "nom": "Associations", "section": "associations", "type": "texte", "cartes": False},
    {"id": "formules", "nom": "Formules", "section": "associations", "type": "texte", "cartes": True},
    {"id": "comparaisons", "nom": "Comparaisons", "section": "associations", "type": "texte", "cartes": False},
    {"id": "precautions", "nom": "Précautions", "section": "precautions", "type": "texte", "cartes": True},
    {"id": "contreIndications", "nom": "Contre-indications et incompatibilités", "section": "precautions", "type": "texte", "cartes": True},
    {"id": "preparationsMtc", "nom": "Préparations", "section": "preparation", "type": "texte", "cartes": False},
    {"id": "synthese", "nom": "Synthèse", "section": "synthese", "type": "texte", "cartes": False},
    {"id": "composants", "nom": "Composants", "section": "recherches", "type": "texte", "cartes": False},
    {"id": "recherches", "nom": "Recherches modernes", "section": "recherches", "type": "texte", "cartes": False},
] + jardin
preparations = [
    {"id": "plante-seche", "nom": "Pièces médicinales séchées", "forme": "bocal"},
    {"id": "poudre", "nom": "Poudre", "forme": "pot"},
    {"id": "granules", "nom": "Extraits en granulés", "forme": "flacon"},
]

CHAMPS_FICHE = {"indications": "indications", "associations": "associations", "formules": "formules", "vs": "comparaisons",
                "precautions": "precautions", "contre_indications": "contreIndications", "preparations": "preparationsMtc",
                "syntheses": "synthese", "ingredients": "composants", "recherches_modernes": "recherches"}
plantes, vus = [], set()
for h in herbes:
    pid = slug(h["pinyinSansTons"])
    while pid in vus:
        pid += "-2"
    vus.add(pid)
    v = {
        "hanzi": h.get("hanzi") or fiches["hanzi"].get(h["id"], ""),
        "nomFr": h.get("nom", ""),
        "classe": h.get("classe", ""),
        "nature": h.get("nature", ""),
        "saveur": h.get("saveur", ""),
        "tropisme": h.get("tropisme", ""),
        "posologie": h.get("posologie", ""),
        "actions": "\n".join("• " + a for a in h.get("actions") or []),
        "esprit": texte(h.get("esprit")),
    }
    if h.get("prioritaire"):
        v["essentielle"] = "Oui"
    for cle, champ in CHAMPS_FICHE.items():
        t = texte((fiches.get(cle) or {}).get(h["id"]))
        if t:
            v[champ] = t
    v = {k: x for k, x in v.items() if x}
    plantes.append({"id": pid, "code": h["id"], "nom": h["pinyin"], "latin": "", "valeurs": v,
                    "preparations": ["plante-seche"], "source": "Pharmacopée chinoise (cours), " + h["id"]})

sortie = {"version": 1, "monde": "mesi", "sections": sections, "champs": champs, "preparations": preparations, "plantes": plantes}
io.open(os.path.join(ici, "..", "prive", "mesi.json"), "w", encoding="utf-8").write(json.dumps(sortie, ensure_ascii=False, indent=1))
print(len(plantes), "substances ->", "prive/mesi.json")
