"""Vérifier et corriger les fiches à la main, page du cours à côté.

Usage : python tools/verifier.py   (ou double-clic sur « Vérifier les fiches.bat »)

Ouvre http://localhost:8790 : à gauche la page du PDF, à droite la fiche, rubrique par
rubrique. « Enregistrer » écrit prive/base.json (une copie de l'ancien va dans
prive/sauvegardes/). « Publier dans le jeu » refait data/base.enc, puis l'envoie sur GitHub.
Les fiches en clair ne quittent jamais l'ordinateur : seul base.enc (chiffré) est publié.
"""
import os, re, json, sys, time, shutil, subprocess, webbrowser, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import fitz

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.normpath(os.path.join(ICI, ".."))
PRIVE = os.path.join(RACINE, "prive")
BASE = os.path.join(PRIVE, "base.json")
VERIF = os.path.join(PRIVE, "verification.json")
MDP = os.path.join(PRIVE, "mot-de-passe.txt")
SAUVEGARDES = os.path.join(PRIVE, "sauvegardes")
PDF = os.path.join(os.path.expanduser("~"), "Desktop", "Herbotheque", "Fiches-plantes-MAJ-juin-2025-1.pdf")
PORT = 8790

doc = fitz.open(PDF)
images = {}
verrou = threading.Lock()


def lire(chemin, defaut):
    if not os.path.exists(chemin):
        return defaut
    with open(chemin, encoding="utf-8") as f:
        return json.load(f)


def ecrire(chemin, donnees, indent=None):
    tmp = chemin + ".tmp"
    with open(tmp, "w", encoding="utf-8", newline="\n") as f:
        json.dump(donnees, f, ensure_ascii=False, indent=indent)
    os.replace(tmp, chemin)


def page_de(p):
    m = re.search(r"p\. (\d+)", p.get("source", ""))
    return int(m.group(1)) if m else 1


def fiches():
    base = lire(BASE, None)
    debuts = sorted({page_de(p) for p in base["plantes"]})
    plantes = []
    for p in base["plantes"]:
        d = page_de(p)
        suite = [x for x in debuts if x > d]
        fin = (suite[0] - 1) if suite else len(doc)
        plantes.append({"id": p["id"], "nom": p.get("nom", ""), "latin": p.get("latin", ""), "page": d, "fin": fin, "valeurs": p.get("valeurs", {})})
    plantes.sort(key=lambda x: x["page"])
    return {"sections": base["sections"], "champs": base["champs"], "plantes": plantes, "verif": lire(VERIF, {}), "mdp": os.path.exists(MDP)}


def enregistrer(donnees):
    with verrou:
        base = lire(BASE, None)
        p = next((x for x in base["plantes"] if x["id"] == donnees["id"]), None)
        if not p:
            raise ValueError("fiche inconnue : " + donnees["id"])
        os.makedirs(SAUVEGARDES, exist_ok=True)
        shutil.copy2(BASE, os.path.join(SAUVEGARDES, "base-" + time.strftime("%Y%m%d-%H%M%S") + ".json"))
        # on garde les 60 dernières copies
        for vieux in sorted(os.listdir(SAUVEGARDES))[:-60]:
            os.remove(os.path.join(SAUVEGARDES, vieux))
        for cle in ("nom", "latin"):
            if donnees.get(cle, "").strip():
                p[cle] = donnees[cle].strip()
        valeurs = {}
        for cid, v in donnees["valeurs"].items():
            if isinstance(v, str):
                v = v.replace("\r\n", "\n").strip()
                if v:
                    valeurs[cid] = v
            elif isinstance(v, list) and v:
                valeurs[cid] = v
        # (on garde l'ordre des rubriques d'origine, les nouvelles à la fin)
        ordre = [c for c in p.get("valeurs", {}) if c in valeurs] + [c for c in valeurs if c not in p.get("valeurs", {})]
        p["valeurs"] = {c: valeurs[c] for c in ordre}
        ecrire(BASE, base, indent=1)


def marquer(donnees):
    with verrou:
        v = lire(VERIF, {})
        if donnees.get("ok"):
            v[donnees["id"]] = {"date": time.strftime("%Y-%m-%d %H:%M"), "note": donnees.get("note", "")}
        else:
            v.pop(donnees["id"], None)
        ecrire(VERIF, v, indent=1)


def lancer(cmd):
    r = subprocess.run(cmd, cwd=RACINE, capture_output=True, text=True, encoding="utf-8", errors="replace")
    sortie = (r.stdout or "") + (r.stderr or "")
    return r.returncode, "$ " + " ".join(cmd[:2] if "chiffrer" in " ".join(cmd) else cmd) + "\n" + sortie.strip()


def publier(donnees):
    mdp = donnees.get("mdp") or (open(MDP, encoding="utf-8").read().strip() if os.path.exists(MDP) else "")
    if not mdp:
        return False, "Il manque le mot de passe des fiches."
    journal = []
    etapes = [
        [sys.executable, "tools/assembler.py"],
        ["node", "tools/chiffrer.mjs", mdp],
    ]
    for cmd in etapes:
        code, texte = lancer(cmd)
        journal.append(texte)
        if code:
            return False, "\n\n".join(journal)
    with open(MDP, "w", encoding="utf-8") as f:
        f.write(mdp)
    code, texte = lancer(["git", "status", "--porcelain", "data/base.enc"])
    if not texte.split("\n", 1)[-1].strip():
        journal.append("Rien de nouveau à publier.")
        return True, "\n\n".join(journal)
    message = "Fiches : corrections du " + time.strftime("%d/%m/%Y")
    for cmd in (["git", "add", "data/base.enc"], ["git", "commit", "-m", message], ["git", "pull", "--rebase"], ["git", "push"]):
        code, texte = lancer(cmd)
        journal.append(texte)
        if code:
            return False, "\n\n".join(journal)
    journal.append("C’est en ligne. Dans le jeu, recharge la page (ou ferme et rouvre l’appli) pour voir les fiches corrigées.")
    return True, "\n\n".join(journal)


def texte_pages(de, a):
    return "\n\n".join("— page %d —\n%s" % (i, doc[i - 1].get_text()) for i in range(de, a + 1) if 1 <= i <= len(doc))


class Gestion(BaseHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def envoyer(self, code, corps, type_="application/json; charset=utf-8"):
        if isinstance(corps, (dict, list)):
            corps = json.dumps(corps, ensure_ascii=False)
        if isinstance(corps, str):
            corps = corps.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Content-Length", str(len(corps)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(corps)

    def do_GET(self):
        u = urlparse(self.path)
        q = parse_qs(u.query)
        try:
            if u.path == "/":
                with open(os.path.join(ICI, "verifier.html"), encoding="utf-8") as f:
                    return self.envoyer(200, f.read(), "text/html; charset=utf-8")
            if u.path == "/api/fiches":
                return self.envoyer(200, fiches())
            if u.path == "/api/texte":
                return self.envoyer(200, {"texte": texte_pages(int(q["de"][0]), int(q["a"][0]))})
            m = re.fullmatch(r"/page/(\d+)\.png", u.path)
            if m:
                n = int(m.group(1))
                if n not in images:
                    images[n] = doc[n - 1].get_pixmap(dpi=130).tobytes("png")
                return self.envoyer(200, images[n], "image/png")
            self.envoyer(404, {"erreur": "introuvable"})
        except Exception as e:
            self.envoyer(500, {"erreur": str(e)})

    def do_POST(self):
        u = urlparse(self.path)
        try:
            n = int(self.headers.get("Content-Length") or 0)
            donnees = json.loads(self.rfile.read(n).decode("utf-8") or "{}")
            if u.path == "/api/enregistrer":
                enregistrer(donnees)
                return self.envoyer(200, {"ok": True})
            if u.path == "/api/verifier":
                marquer(donnees)
                return self.envoyer(200, {"ok": True})
            if u.path == "/api/publier":
                ok, journal = publier(donnees)
                return self.envoyer(200, {"ok": ok, "journal": journal})
            self.envoyer(404, {"erreur": "introuvable"})
        except Exception as e:
            self.envoyer(500, {"erreur": str(e)})


if __name__ == "__main__":
    serveur = ThreadingHTTPServer(("127.0.0.1", PORT), Gestion)
    adresse = "http://localhost:%d" % PORT
    print("Vérification des fiches :", adresse, "(ferme cette fenêtre pour arrêter)")
    if "--sans-navigateur" not in sys.argv:
        threading.Timer(0.6, lambda: webbrowser.open(adresse)).start()
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        pass
