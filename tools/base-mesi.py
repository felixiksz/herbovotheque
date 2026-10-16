# La copie de secours des fiches de pharmacopée du monde de Mesi : les données du jeu jeuxmtc
# telles quelles (les 206 substances, leurs fiches complètes, les ajouts du cours et les
# corrections publiées). Le jeu les lit d'abord sur le site de jeuxmtc (js/12-pharmacopee.js) ;
# cette copie ne sert que la toute première fois, ou sans connexion.
# Écrit prive/mesi.json ; ensuite : node tools/chiffrer.mjs <mot de passe> mesi
# Usage : python tools/base-mesi.py <dossier de jeuxmtc>
import io, json, os, sys, time

ici = os.path.dirname(os.path.abspath(__file__))
src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ici, "..", "..", "jeuxmtc_clean")


def objet_js(chemin, nom):
    s = io.open(os.path.join(src, chemin), encoding="utf-8").read()
    i = s.index(nom)
    while s[i] not in "{[":
        i += 1
    return json.JSONDecoder().raw_decode(s[i:])[0]


sortie = {
    "classes": objet_js("22-20-pharma-data.js", "const PHARMA_CLASSES"),
    "herbes": objet_js("22-20-pharma-data.js", "const PHARMA_HERBS"),
    "fiches": objet_js("22-21-pharma-fiches-completes.js", "MTC_PHARMA_FICHES"),
    "ajouts": objet_js("fiches-ajouts.js", "MTC_FICHE_ADDITIONS").get("pharma", {}),
    "corrections": objet_js("fiches-corrections.js", "MTC_FICHE_CORRECTIONS").get("pharma", {}),
    "lueLe": int(time.time() * 1000),
}
io.open(os.path.join(ici, "..", "prive", "mesi.json"), "w", encoding="utf-8").write(json.dumps(sortie, ensure_ascii=False))
print(len(sortie["herbes"]), "substances ->", "prive/mesi.json")
