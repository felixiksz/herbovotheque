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
  // chaque monde garde sa partie à part sur l'appareil (celui de Mesi : « mesi:herbier », « mesi:jeu »)
  const cleKv = (q) => (H.monde === "mesi" ? "mesi:" + q : q);

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

  // Les rubriques propres au jeu, qui ne viennent pas des fiches : ƟvƟ les remplit lui·elle-même.
  // « Améliore le sol » : ce qu'une plante fait à la terre autour d'elle, une fois adulte.
  const CHAMPS_JEU = [
    { id: "amendeSol", nom: "Améliore le sol", type: "choix", multiple: true, section: "jardin",
      options: ["Enrichit (azote)", "Apporte de l’humus", "Décompacte", "Draine", "Garde la fraîcheur", "Acidifie", "Adoucit le calcaire"] },
    { id: "auJardin", nom: "Au jardin, elle…", type: "liste", section: "jardin",
      suggestions: ["attire énormément les pucerons", "attire les coccinelles", "attire les abeilles", "attire les papillons", "repousse les pucerons", "repousse les limaces", "sert de plante piège", "abrite les auxiliaires", "nourrit les oiseaux en hiver"] },
  ];

  // La première fois qu'on ouvre le jeu, une seule tisane attend dans le placard : celle de
  // Pizsoma (réglisse, aubépine, mélisse). Les mélanges d'essai faits avant l'ouverture
  // sont rangés (pas effacés : ils restent dans les données, marqués supprimés). Les tisanes
  // créées ensuite par ƟvƟ ne sont jamais touchées.
  const OUVERTURE = Date.parse("2026-10-15T00:00:00+02:00");
  function tisaneDeDepart() {
    if (H.monde === "mesi") return;
    const h = H.herbier;
    h.tisanes = h.tisanes || {};
    if (h.tisanes.pizsoma) {
      // la première version avait des pétales de rose, et une fiche « Rose » ajoutée exprès :
      // la mélisse remplace la rose, et la fiche Rose disparaît
      const t = h.tisanes.pizsoma, maintenant = H.maintenant();
      let change = false;
      if ((t.plantes || []).some((x) => x.id === "rose")) {
        t.plantes = t.plantes.map((x) => (x.id === "rose" ? { id: "melissa-officinalis", part: "feuilles", role: "Calme et apaise, et son parfum citronné" } : x));
        t.modifieLe = maintenant;
        change = true;
      }
      if (h.plantes.rose && !h.plantes.rose.supprime && h.plantes.rose.nom === "Rose") {
        h.plantes.rose = { id: "rose", supprime: true, modifieLe: maintenant };
        change = true;
      }
      if (change) { index = null; H.d.changer("herbier"); }
      return;
    }
    const t = H.maintenant();
    for (const x of Object.values(h.tisanes)) {
      if (!x.supprime && (x.creeLe || x.modifieLe || 0) < OUVERTURE) Object.assign(x, { supprime: true, modifieLe: t });
    }
    h.tisanes.pizsoma = {
      id: "pizsoma",
      nom: "La tisane de Pizsoma",
      plantes: [
        { id: "glycyrrhiza-glabra", part: "racine", role: "La douceur, et le goût sucré" },
        { id: "crataegus-monogyna", part: "fleurs et feuilles", role: "Apaise le cœur et la nervosité" },
        { id: "melissa-officinalis", part: "feuilles", role: "Calme et apaise, et son parfum citronné" },
      ],
      usage: "",
      preparation: "Infusion 10 min à couvert.",
      notes: "",
      creeLe: t,
      modifieLe: t,
    };
    index = null;
    H.d.changer("herbier");
  }

  // Ajoute au schéma de l'herbier les rubriques nouvelles de la base
  // (sauf celles qu'ƟvƟ a retirées volontairement).
  function completerSchema() {
    const s = H.herbier.schema;
    // les huiles essentielles ont maintenant leur propre flacon (avant : compte-gouttes)
    const he = s.preparations.find((p) => p.id === "huile-essentielle");
    if (he && he.forme === "compte-gouttes" && !s.formeHeChoisie) {
      he.forme = "huile-essentielle";
      s.formeHeChoisie = true;
    }
    for (const cle of ["sections", "champs", "preparations"]) {
      const ids = new Set(s[cle].map((x) => x.id));
      for (const x of H.base[cle] || []) {
        if (!ids.has(x.id) && !s.retires.includes(x.id)) s[cle].push(copie(x));
      }
    }
    const idsChamps = new Set(s.champs.map((x) => x.id));
    for (const x of CHAMPS_JEU) if (!idsChamps.has(x.id) && !s.retires.includes(x.id)) s.champs.push(copie(x));
    // les rubriques de la base marquées d'un numéro de mise à jour reprennent leur nom et leurs cartes
    for (const x of H.base.champs || []) {
      if (!x.maj) continue;
      const c = s.champs.find((y) => y.id === x.id);
      if (c && (c.maj || 0) < x.maj) Object.assign(c, { nom: x.nom, cartes: x.cartes, maj: x.maj });
    }
  }

  H.d = {
    async charger(base) {
      H.base = base;
      H.herbier = (await H.kv.lire(cleKv("herbier"))) || herbierNeuf(base);
      H.jeu = Object.assign(jeuNeuf(), (await H.kv.lire(cleKv("jeu"))) || {});
      H.local = Object.assign({ son: true, musique: true, theme: "auto" }, (await H.kv.lire("local")) || {});
      completerSchema();
      index = null;
      tisaneDeDepart();
      // le cri enregistré avant qu'on le partage avec l'autre : on le partage maintenant
      const moi = H.local.role === "mesi" ? "mesi" : "ovo";
      if (H.jeu.cri && !(H.jeu.cris || {})[moi]) {
        H.jeu.cris = Object.assign({}, H.jeu.cris, { [moi]: { id: moi, son: H.jeu.cri, modifieLe: H.maintenant() } });
        H.d.changer("jeu");
      }
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

    // Stock de chaque préparation dans l'herbothèque : plein, moitie, presque-vide, vide.
    NIVEAUX: [["plein", "Plein"], ["moitie", "À moitié"], ["presque-vide", "Presque vide"], ["vide", "Vide"]],
    stock: (p, prepId) => ((p && p.stocks) || {})[prepId] || "plein",
    aRemplir: (p) => (p.preparations || []).some((id) => ["presque-vide", "vide"].includes(H.d.stock(p, id))),
    fixerStock(id, prepId, niveau) {
      H.d.majPlante(id, (x) => {
        x.stocks = Object.assign({}, x.stocks);
        if (niveau === "plein") delete x.stocks[prepId];
        else x.stocks[prepId] = niveau;
      });
    },

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
      for (const quoi of q) await H.kv.ecrire(cleKv(quoi), quoi === "jeu" ? H.jeu : H.herbier);
      if (q.length && H.synchro) H.synchro.planifier();
    },
    async majLocal(fn) {
      fn(H.local);
      await H.kv.ecrire("local", H.local);
    },
    invalider() {
      index = null;
    },
    cleKv: (q) => cleKv(q),
  };

  let index = null;
  const enAttente = new Set();
  const enregistrerBientot = H.anti(() => H.d.enregistrerMaintenant(), 600);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.d.enregistrerMaintenant();
  });
})();
