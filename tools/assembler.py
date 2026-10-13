"""Assemble prive/base.json + les rubriques « Au jardin » -> prive/donnees.json.

Les valeurs de culture viennent de tools/culture/*.json (pré-remplies d'après le
biotope et des guides de jardinage). Elles restent marquées « à vérifier » dans le
jeu tant qu'ƟvƟ ne les a pas confirmées.

Usage : python tools/assembler.py   puis   node tools/chiffrer.mjs <mot de passe>
"""
import os, json, glob

ICI = os.path.dirname(os.path.abspath(__file__))
PRIVE = os.path.join(ICI, "..", "prive")

MOIS = "mois"
CHAMPS_JARDIN = [
    {"id": "cycle", "nom": "Cycle", "type": "choix", "options": ["Annuelle", "Bisannuelle", "Vivace", "Arbuste", "Arbre", "Liane", "Algue"]},
    {"id": "hauteur", "nom": "Hauteur", "type": "court"},
    {"id": "espacement", "nom": "Espacement de plantation", "type": "court"},
    {"id": "exposition", "nom": "Exposition", "type": "choix", "multiple": True, "options": ["Plein soleil", "Mi-ombre", "Ombre"]},
    {"id": "sol", "nom": "Sol", "type": "choix", "multiple": True, "options": ["Sableux", "Caillouteux", "Limoneux", "Argileux", "Humifère", "Calcaire", "Neutre", "Acide", "Sec", "Frais", "Humide", "Bien drainé", "Profond", "Riche", "Pauvre"]},
    {"id": "arrosage", "nom": "Arrosage", "type": "choix", "options": ["Faible", "Modéré", "Régulier", "Abondant"]},
    {"id": "secheresse", "nom": "Résistance à la sécheresse", "type": "choix", "options": ["Faible", "Moyenne", "Bonne", "Excellente"]},
    {"id": "rusticite", "nom": "Rusticité", "type": "court"},
    {"id": "climatMed", "nom": "Au jardin méditerranéen", "type": "choix", "options": ["Idéale", "Bien", "Avec un peu d’ombre et d’eau", "Difficile", "En pot ou en serre"]},
    {"id": "multiplication", "nom": "Multiplication", "type": "choix", "multiple": True, "options": ["Semis", "Bouturage", "Division", "Marcottage", "Greffe", "Bulbes ou caïeux", "Rejets", "Drageons"]},
    {"id": "moisSemis", "nom": "Semis", "type": MOIS},
    {"id": "moisPlantation", "nom": "Plantation", "type": MOIS},
    {"id": "moisFloraison", "nom": "Floraison", "type": MOIS},
    {"id": "moisRecolte", "nom": "Récolte", "type": MOIS},
    {"id": "bonnesVoisines", "nom": "Bonnes voisines", "type": "plantes"},
    {"id": "mauvaisesVoisines", "nom": "Mauvaises voisines", "type": "plantes"},
    {"id": "compagnonnage", "nom": "Compagnonnage (notes)", "type": "texte"},
    {"id": "entretien", "nom": "Entretien", "type": "texte"},
    {"id": "faune", "nom": "Faune et pollinisateurs", "type": "court"},
    {"id": "envahissante", "nom": "Caractère envahissant", "type": "choix", "options": ["Non", "Un peu", "Oui"]},
    {"id": "toxiciteJardin", "nom": "Toxicité au jardin (enfants, animaux)", "type": "court"},
]

ALIAS_CLIMAT = {"Ombre et eau": "Avec un peu d’ombre et d’eau", "Pot": "En pot ou en serre"}

base = json.load(open(os.path.join(PRIVE, "base.json"), encoding="utf-8"))
for c in CHAMPS_JARDIN:
    c["section"] = "jardin"
    c["cartes"] = c["id"] in ("exposition", "sol", "cycle", "moisFloraison", "moisRecolte", "multiplication")
# « Mes notes » reste la dernière rubrique
notes = [c for c in base["champs"] if c["section"] == "notes"]
base["champs"] = [c for c in base["champs"] if c["section"] != "notes"] + CHAMPS_JARDIN + notes

par_id = {p["id"]: p for p in base["plantes"]}
connus = {c["id"]: c for c in CHAMPS_JARDIN}
compte = 0
for chemin in sorted(glob.glob(os.path.join(ICI, "culture", "*.json"))):
    for pid, valeurs in json.load(open(chemin, encoding="utf-8")).items():
        p = par_id.get(pid)
        if not p:
            raise SystemExit("plante inconnue dans %s : %s" % (chemin, pid))
        for cid, val in valeurs.items():
            if cid == "climatMed":
                val = ALIAS_CLIMAT.get(val, val)
            if cid not in connus:
                raise SystemExit("rubrique inconnue %s (%s)" % (cid, pid))
            champ = connus[cid]
            if champ["type"] == "choix":
                vals = val if isinstance(val, list) else [val]
                for x in vals:
                    if x not in champ["options"]:
                        raise SystemExit("option inconnue %r pour %s (%s)" % (x, cid, pid))
            if champ["type"] == "plantes":
                for x in val:
                    if x not in par_id:
                        raise SystemExit("voisine inconnue %r (%s)" % (x, pid))
            p["valeurs"][cid] = val
            p.setdefault("aVerifier", []).append(cid)
        compte += 1

# messages personnels (bienvenue, île secrète) : chiffrés avec le reste, jamais en clair sur GitHub
messages = os.path.join(PRIVE, "messages.json")
if os.path.exists(messages):
    for cle, texte in json.load(open(messages, encoding="utf-8")).items():
        if cle in ("message", "messageIle") and texte.strip():
            base[cle] = texte.strip()

base["version"] = 1
with open(os.path.join(PRIVE, "donnees.json"), "w", encoding="utf-8") as f:
    json.dump(base, f, ensure_ascii=False, separators=(",", ":"))
print(len(base["plantes"]), "plantes,", compte, "avec des données de culture")
