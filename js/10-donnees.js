// Données du jeu : fiches de base (chiffrées, en lecture seule) + herbier d'ƟvƟ
// (ses modifications, ses plantes, ses rangements, ses tisanes) + progression du jeu.
//
// H.base     : fiches de départ, déchiffrées au lancement
// H.herbier  : tout ce qu'iel modifie ou ajoute (synchronisé)
// H.jeu      : cartes, ressources, îles, lieu (synchronisé)
// H.local    : réglages propres à l'appareil (jeton GitHub, son…), jamais synchronisés
(function () {
  const H = window.H;

  // --- IndexedDB : une seule table clé → valeur ---------------------------
  let dbp = null;
  function db() {
    if (!dbp) {
      dbp = new Promise((ok, ko) => {
        const r = indexedDB.open("herbovotheque", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("kv");
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
    }
    return dbp;
  }
  H.kv = {
    async lire(cle) {
      const d = await db();
      return new Promise((ok, ko) => {
        const r = d.transaction("kv").objectStore("kv").get(cle);
        r.onsuccess = () => ok(r.result);
        r.onerror = () => ko(r.error);
      });
    },
    async ecrire(cle, val) {
      const d = await db();
      return new Promise((ok, ko) => {
        const t = d.transaction("kv", "readwrite");
        t.objectStore("kv").put(val, cle);
        t.oncomplete = () => ok();
        t.onerror = () => ko(t.error);
      });
    },
    async effacer(cle) {
      const d = await db();
      return new Promise((ok) => {
        const t = d.transaction("kv", "readwrite");
        t.objectStore("kv").delete(cle);
        t.oncomplete = () => ok();
      });
    },
  };

  const copie = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));

  function herbierNeuf(base) {
    const t = H.maintenant();
    return {
      version: 1,
      modifieLe: t,
      schema: {
        sections: copie(base.sections),
        champs: copie(base.champs),
        preparations: copie(base.preparations),
        retires: [],
        modifieLe: t,
      },
      rangements: H.rangementsParDefaut ? H.rangementsParDefaut() : [],
      rangementsModifieLe: t,
      plantes: {},
      supprimees: {},
      tisanes: {},
    };
  }

  function jeuNeuf() {
    return {
      version: 1,
      modifieLe: H.maintenant(),
      cartes: {},
      cartesPerso: {},
      ressources: {},
      ressourcesModifieLe: 0,
      recompenses: {},
      energie: { valeur: 100, le: H.maintenant() },
      iles: {},
      lieu: { nom: "Marseille", lat: 43.2965, lon: 5.3698 },
      lieuModifieLe: 0,
      vu: {},
    };
  }

  // Ajoute au schéma de l'herbier les rubriques nouvelles de la base
  // (sauf celles qu'ƟvƟ a retirées volontairement).
  function completerSchema() {
    const s = H.herbier.schema;
    for (const cle of ["sections", "champs", "preparations"]) {
      const ids = new Set(s[cle].map((x) => x.id));
      for (const x of H.base[cle] || []) {
        if (!ids.has(x.id) && !s.retires.includes(x.id)) s[cle].push(copie(x));
      }
    }
  }

  H.d = {
    async charger(base) {
      H.base = base;
      H.herbier = (await H.kv.lire("herbier")) || herbierNeuf(base);
      H.jeu = Object.assign(jeuNeuf(), (await H.kv.lire("jeu")) || {});
      H.local = Object.assign({ son: true, musique: true, theme: "auto" }, (await H.kv.lire("local")) || {});
      completerSchema();
      index = null;
    },

    // --- schéma ---
    sections: () => H.herbier.schema.sections,
    champs: () => H.herbier.schema.champs,
    champ: (id) => H.herbier.schema.champs.find((c) => c.id === id),
    preparations: () => H.herbier.schema.preparations,
    preparation: (id) => H.herbier.schema.preparations.find((p) => p.id === id),

    majSchema(fn) {
      fn(H.herbier.schema);
      H.herbier.schema.modifieLe = H.maintenant();
      H.d.changer("herbier");
    },

    // --- plantes ---
    plantes() {
      if (!index) {
        const h = H.herbier;
        const liste = [];
        const vus = new Set();
        for (const p of H.base.plantes) {
          vus.add(p.id);
          if (h.supprimees[p.id]) continue;
          const perso = h.plantes[p.id];
          if (perso && perso.supprime) continue;
          liste.push(perso || p);
        }
        for (const [id, p] of Object.entries(h.plantes)) {
          if (!vus.has(id) && !p.supprime && !h.supprimees[id]) liste.push(p);
        }
        liste.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
        index = { liste, parId: new Map(liste.map((p) => [p.id, p])) };
      }
      return index.liste;
    },
    plante(id) {
      H.d.plantes();
      return index.parId.get(id);
    },
    estModifiee: (id) => !!H.herbier.plantes[id],

    // Modifie une plante : la copie va dans l'herbier, la base reste intacte.
    majPlante(id, fn) {
      const actuelle = H.d.plante(id);
      const p = copie(actuelle) || { id, nom: "", latin: "", valeurs: {}, preparations: [] };
      fn(p);
      p.modifieLe = H.maintenant();
      H.herbier.plantes[id] = p;
      index = null;
      H.d.changer("herbier");
      return p;
    },
    ajouterPlante(nom) {
      let id = H.slug(nom);
      while (H.d.plante(id)) id += "-2";
      return H.d.majPlante(id, (p) => {
        p.nom = nom;
        p.creeLe = H.maintenant();
      });
    },
    supprimerPlante(id) {
      H.herbier.plantes[id] = { id, supprime: true, modifieLe: H.maintenant() };
      index = null;
      H.d.changer("herbier");
    },

    // Une valeur pré-remplie est « à vérifier » tant qu'ƟvƟ ne l'a pas confirmée.
    aVerifier: (p, champId) => !!(p.aVerifier && p.aVerifier.includes(champId)),
    confirmer(id, champId) {
      H.d.majPlante(id, (p) => {
        p.aVerifier = (p.aVerifier || []).filter((c) => c !== champId);
      });
    },

    // --- enregistrement ---
    changer(quoi) {
      const objet = quoi === "jeu" ? H.jeu : H.herbier;
      objet.modifieLe = H.maintenant();
      if (quoi !== "jeu") index = null;
      enAttente.add(quoi);
      enregistrerBientot();
      H.emettre("donnees", quoi);
    },
    async enregistrerMaintenant() {
      const q = Array.from(enAttente);
      enAttente.clear();
      for (const quoi of q) await H.kv.ecrire(quoi, quoi === "jeu" ? H.jeu : H.herbier);
      if (q.length && H.synchro) H.synchro.planifier();
    },
    async majLocal(fn) {
      fn(H.local);
      await H.kv.ecrire("local", H.local);
    },
    invalider() {
      index = null;
    },
  };

  let index = null;
  const enAttente = new Set();
  const enregistrerBientot = H.anti(() => H.d.enregistrerMaintenant(), 600);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.d.enregistrerMaintenant();
  });
})();
