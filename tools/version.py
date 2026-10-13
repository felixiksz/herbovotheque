"""Change le ?v= de tous les fichiers dans index.html et la version du service worker,
pour que les navigateurs prennent la nouvelle version.

Usage : python tools/version.py
"""
import os, re, time

RACINE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
v = time.strftime("%Y%m%d-%H%M%S")

chemin = os.path.join(RACINE, "index.html")
html = open(chemin, encoding="utf-8").read()
html, n = re.subn(r"\?v=[0-9a-z-]+", "?v=" + v, html)
open(chemin, "w", encoding="utf-8", newline="\n").write(html)

sw = os.path.join(RACINE, "sw.js")
if os.path.exists(sw):
    s = open(sw, encoding="utf-8").read()
    s = re.sub(r'const VERSION = "[^"]*"', 'const VERSION = "' + v + '"', s)
    s = re.sub(r"\?v=[0-9a-z-]+", "?v=" + v, s)
    open(sw, "w", encoding="utf-8", newline="\n").write(s)

print(n, "fichiers ->", v)
