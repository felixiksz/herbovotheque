// Service worker : le jeu marche hors connexion.
// VERSION et les ?v= sont changés par tools/version.py à chaque mise à jour.
const VERSION = "20261013-093423";
const CACHE = "herbotheque-" + VERSION;
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "data/base.enc",
  "css/00-base.css?v=20261013-093423",
  "css/10-herbotheque.css?v=20261013-093423",
  "css/20-fiche.css?v=20261013-093423",
  "css/30-cartes.css?v=20261013-093423",
  "css/40-terrain.css?v=20261013-093423",
  "js/00-outils.js?v=20261013-093423",
  "js/05-chiffre.js?v=20261013-093423",
  "js/10-donnees.js?v=20261013-093423",
  "js/15-synchro.js?v=20261013-093423",
  "js/20-ciel.js?v=20261013-093423",
  "js/25-aquarelle.js?v=20261013-093423",
  "js/30-herbotheque.js?v=20261013-093423",
  "js/32-organiser.js?v=20261013-093423",
  "js/35-fiche.js?v=20261013-093423",
  "js/37-dessin.js?v=20261013-093423",
  "js/38-tisanes.js?v=20261013-093423",
  "js/40-cartes.js?v=20261013-093423",
  "js/45-ressources.js?v=20261013-093423",
  "js/50-pixel.js?v=20261013-093423",
  "js/55-dialogue.js?v=20261013-093423",
  "js/56-sons.js?v=20261013-093423",
  "js/58-musique.js?v=20261013-093423",
  "js/60-terrain.js?v=20261013-093423",
  "js/62-lolo.js?v=20261013-093423",
  "js/65-village.js?v=20261013-093423",
  "js/80-reglages.js?v=20261013-093423",
  "js/90-app.js?v=20261013-093423",
  "fonts/beth-ellen.woff2",
  "fonts/kumar-one.woff2",
  "fonts/caudex-regular.woff2",
  "fonts/caudex-bold.woff2",
  "fonts/caudex-italic.woff2",
  "fonts/caudex-bold-italic.woff2",
  "sons/miaou.mp3",
  "sons/attention.mp3",
  "sons/pas.mp3",
  "sons/roll.mp3",
  "sons/galop.mp3",
  "icones/icone-180.png",
  "icones/icone-192.png",
  "icones/favicon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k.startsWith("herbotheque-") && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  // GitHub (synchronisation) et météo : toujours en ligne, jamais en cache
  if (url.origin !== location.origin || e.request.method !== "GET") return;
  // la page et les fiches : le réseau d'abord, le cache si on est hors connexion
  if (e.request.mode === "navigate" || url.pathname.endsWith("/data/base.enc")) {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copie = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copie));
          return r;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
    );
    return;
  }
  // le reste (versionné) : le cache d'abord
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
