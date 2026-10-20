// Service worker : le jeu marche hors connexion.
// VERSION et les ?v= sont changés par tools/version.py à chaque mise à jour.
const VERSION = "20261020-105222";
const CACHE = "herbotheque-" + VERSION;
const CORE = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "data/base.enc",
  "css/00-base.css?v=20261020-105222",
  "css/10-herbotheque.css?v=20261020-105222",
  "css/20-fiche.css?v=20261020-105222",
  "css/30-cartes.css?v=20261020-105222",
  "css/40-terrain.css?v=20261020-105222",
  "js/00-outils.js?v=20261020-105222",
  "js/03-accueil.js?v=20261020-105222",
  "js/05-chiffre.js?v=20261020-105222",
  "js/10-donnees.js?v=20261020-105222",
  "js/12-pharmacopee.js?v=20261020-105222",
  "js/15-synchro.js?v=20261020-105222",
  "js/20-ciel.js?v=20261020-105222",
  "js/25-aquarelle.js?v=20261020-105222",
  "js/26-retro.js?v=20261020-105222",
  "js/30-herbotheque.js?v=20261020-105222",
  "js/32-organiser.js?v=20261020-105222",
  "js/35-fiche.js?v=20261020-105222",
  "js/36-photos.js?v=20261020-105222",
  "js/37-dessin.js?v=20261020-105222",
  "js/38-tisanes.js?v=20261020-105222",
  "js/40-cartes.js?v=20261020-105222",
  "js/45-ressources.js?v=20261020-105222",
  "js/50-pixel.js?v=20261020-105222",
  "js/54-audio.js?v=20261020-105222",
  "js/55-dialogue.js?v=20261020-105222",
  "js/56-sons.js?v=20261020-105222",
  "js/58-musique.js?v=20261020-105222",
  "js/61-hongrois.js?v=20261020-105222",
  "js/60-terrain.js?v=20261020-105222",
  "js/62-lolo.js?v=20261020-105222",
  "js/63-histoires.js?v=20261020-105222",
  "js/64-textes.js?v=20261020-105222",
  "js/65-ferme.js?v=20261020-105222",
  "js/66-nuit.js?v=20261020-105222",
  "js/67-serre.js?v=20261020-105222",
  "js/68-labo.js?v=20261020-105222",
  "js/69-lettres.js?v=20261020-105222",
  "js/70-taches.js?v=20261020-105222",
  "js/72-devis.js?v=20261020-105222",
  "js/74-export.js?v=20261020-105222",
  "js/76-carnet.js?v=20261020-105222",
  "js/80-reglages.js?v=20261020-105222",
  "js/87-bureau.js?v=20261020-105222",
  "js/90-app.js?v=20261020-105222",
  "fonts/beth-ellen.woff2",
  "fonts/kumar-one.woff2",
  "fonts/suez-one.woff2",
  "fonts/vt323.woff2",
  "fonts/vt323-ext.woff2",
  "fonts/caudex-regular.woff2",
  "fonts/caudex-bold.woff2",
  "fonts/caudex-italic.woff2",
  "fonts/caudex-bold-italic.woff2",
  "sons/miaou.mp3",
  "sons/attention.mp3",
  "sons/pas.mp3",
  "sons/roll.mp3",
  "sons/galop.mp3",
  "sons/goelands/goeland-cri.ogg",
  "sons/goelands/goeland-rpg.ogg",
  "sons/goelands/goelands-dispute.wav",
  "sons/criquets.wav",
  "sons/criquets-loin.wav",
  "sons/cigales.wav",
  "sons/sanglier.wav",
  "sons/grenouille-rieuse.mp3",
  "sons/alyte.mp3",
  "icones/icone-180.png",
  "icones/icone-192.png",
  "icones/favicon.png",
];

self.addEventListener("install", (e) => {
  // « reload » : jamais une vieille copie du navigateur (une police modifiée garde le même nom)
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: "reload" })))).then(() => self.skipWaiting()));
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
  if (e.request.mode === "navigate" || url.pathname.endsWith("/data/base.enc") || url.pathname.endsWith("/data/mesi.enc")) {
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

// un clic sur un rappel : on revient au jeu (ou on l'ouvre), sur la to-do liste
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const hash = (e.notification.data && e.notification.data.hash) || "";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((liste) => {
    for (const c of liste) if ("focus" in c) { c.postMessage({ aller: hash }); return c.focus(); }
    return self.clients.openWindow(self.registration.scope + "index.html" + hash);
  }));
});
