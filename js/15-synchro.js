// Synchronisation entre appareils via le dépôt GitHub (jeton à accès fin).
// Les sauvegardes sont chiffrées et rangées sur une branche à part
// « sauvegardes », pour ne pas reconstruire le site à chaque partie.
(function () {
  const H = window.H;
  const DEPOT = "felixiksz/herbovotheque";
  const BRANCHE = "sauvegardes";
  const API = "https://api.github.com/repos/" + DEPOT;
  const FICHIERS = { herbier: "data/herbier.enc", jeu: "data/jeu.enc" };
  let minuteur = null;
  let enCours = null;

  function entetes(brut) {
    return {
      Authorization: "Bearer " + H.local.jeton,
      Accept: brut ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async function api(chemin, opts) {
    const r = await fetch(API + chemin, Object.assign({ headers: entetes(), cache: "no-store" }, opts));
    if (!r.ok) {
      const err = new Error("GitHub " + r.status);
      err.statut = r.status;
      throw err;
    }
    return r.status === 204 ? null : r.json();
  }

  // Dernier commit de la branche des sauvegardes (créée au besoin).
  async function tete() {
    try {
      return (await api("/git/ref/heads/" + BRANCHE)).object.sha;
    } catch (e) {
      if (e.statut !== 404) throw e;
      const depot = await api("");
      const principale = (await api("/git/ref/heads/" + depot.default_branch)).object.sha;
      await api("/git/refs", { method: "POST", body: JSON.stringify({ ref: "refs/heads/" + BRANCHE, sha: principale }) });
      return principale;
    }
  }

  // Lecture brute (jusqu'à 100 Mo) d'une sauvegarde chiffrée, à un commit donné.
  async function lireDistant(quoi, commit) {
    const r = await fetch(API + "/contents/" + FICHIERS[quoi] + "?ref=" + commit, { headers: entetes(true), cache: "no-store" });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error("GitHub " + r.status);
    return H.chiffre.ouvrir(JSON.parse(await r.text()), H.cle);
  }

  // Écrit les sauvegardes modifiées en un seul commit (API Git : pas de limite à 1 Mo).
  // Si l'autre appareil a écrit entre-temps, la branche a bougé : on signale un conflit.
  async function ecrireDistant(objets, parent) {
    const arbre = [];
    for (const [quoi, objet] of Object.entries(objets)) {
      const paquet = await H.chiffre.fermer(objet, H.cle, H.meta.sel, H.meta.iter);
      const blob = await api("/git/blobs", { method: "POST", body: JSON.stringify({ content: JSON.stringify(paquet), encoding: "utf-8" }) });
      arbre.push({ path: FICHIERS[quoi], mode: "100644", type: "blob", sha: blob.sha });
    }
    const base = (await api("/git/commits/" + parent)).tree.sha;
    const tree = await api("/git/trees", { method: "POST", body: JSON.stringify({ base_tree: base, tree: arbre }) });
    const commit = await api("/git/commits", { method: "POST", body: JSON.stringify({ message: "Sauvegarde", tree: tree.sha, parents: [parent] }) });
    try {
      await api("/git/refs/heads/" + BRANCHE, { method: "PATCH", body: JSON.stringify({ sha: commit.sha, force: false }) });
    } catch (e) {
      if (e.statut === 422 || e.statut === 409) throw Object.assign(new Error("conflit"), { conflit: true });
      throw e;
    }
  }

  // JSON aux clés triées, pour comparer deux versions sans se tromper d'ordre
  function canon(v) {
    if (Array.isArray(v)) return "[" + v.map(canon).join(",") + "]";
    if (v && typeof v === "object") return "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canon(v[k])).join(",") + "}";
    return JSON.stringify(v);
  }

  // --- fusion : pour chaque élément, la version la plus récente gagne ------
  function fusionnerCollection(a, b) {
    const out = Object.assign({}, a);
    for (const [k, v] of Object.entries(b || {})) {
      if (!out[k] || (v && (v.modifieLe || 0) > (out[k].modifieLe || 0))) out[k] = v;
    }
    return out;
  }
  function plusRecent(a, b, cle) {
    return (b[cle] || 0) > (a[cle] || 0) ? b : a;
  }

  function fusionnerHerbier(local, distant) {
    if (!distant) return local;
    const r = Object.assign({}, local);
    r.plantes = fusionnerCollection(local.plantes, distant.plantes);
    r.tisanes = fusionnerCollection(local.tisanes, distant.tisanes);
    r.supprimees = Object.assign({}, distant.supprimees, local.supprimees);
    r.schema = plusRecent(local.schema, distant.schema, "modifieLe") === local.schema ? local.schema : distant.schema;
    const rg = plusRecent(local, distant, "rangementsModifieLe");
    r.rangements = rg.rangements;
    r.rangementActif = rg.rangementActif;
    r.rangementsModifieLe = rg.rangementsModifieLe;
    r.modifieLe = Math.max(local.modifieLe || 0, distant.modifieLe || 0);
    return r;
  }

  function fusionnerJeu(local, distant) {
    if (!distant) return local;
    const r = Object.assign({}, local);
    r.cartes = fusionnerCollection(local.cartes, distant.cartes);
    r.cartesPerso = fusionnerCollection(local.cartesPerso, distant.cartesPerso);
    r.iles = fusionnerCollection(local.iles, distant.iles);
    const res = plusRecent(local, distant, "ressourcesModifieLe");
    r.ressources = res.ressources;
    r.energie = res.energie;
    r.ressourcesModifieLe = res.ressourcesModifieLe;
    const lieu = plusRecent(local, distant, "lieuModifieLe");
    r.lieu = lieu.lieu;
    r.lieuModifieLe = lieu.lieuModifieLe;
    r.recompenses = plusRecent(local, distant, "recompensesModifieLe").recompenses || local.recompenses;
    r.vu = Object.assign({}, distant.vu, local.vu);
    const serre = plusRecent(local, distant, "serreModifieLe");
    r.serre = serre.serre;
    r.serreModifieLe = serre.serreModifieLe;
    r.textes = fusionnerCollection(local.textes, distant.textes);
    const labo = plusRecent(local, distant, "laboModifieLe");
    r.labo = labo.labo;
    r.laboModifieLe = labo.laboModifieLe;
    r.pluieMagique = Math.max(local.pluieMagique || 0, distant.pluieMagique || 0);
    r.modifieLe = Math.max(local.modifieLe || 0, distant.modifieLe || 0);
    return r;
  }

  async function synchroniser() {
    if (!H.local.jeton || !navigator.onLine) return;
    etat("en cours");
    try {
      for (let essai = 0; essai < 4; essai++) {
        const parent = await tete();
        const aEcrire = {};
        for (const quoi of ["herbier", "jeu"]) {
          const distant = await lireDistant(quoi, parent);
          const local = quoi === "jeu" ? H.jeu : H.herbier;
          const fusion = quoi === "jeu" ? fusionnerJeu(local, distant) : fusionnerHerbier(local, distant);
          if (canon(fusion) !== canon(local)) {
            if (quoi === "jeu") H.jeu = fusion;
            else H.herbier = fusion;
            H.d.invalider();
            await H.kv.ecrire(quoi, fusion);
            H.emettre("donnees", quoi);
          }
          if (!distant || canon(fusion) !== canon(distant)) aEcrire[quoi] = fusion;
        }
        if (Object.keys(aEcrire).length) {
          try {
            await ecrireDistant(aEcrire, parent);
          } catch (e) {
            if (e.conflit) continue;
            throw e;
          }
        }
        break;
      }
      await H.d.majLocal((l) => {
        l.derniereSynchro = { herbier: H.maintenant(), jeu: H.maintenant() };
      });
      etat("à jour");
    } catch (e) {
      console.warn(e);
      etat("erreur", e.message);
    }
  }

  function etat(e, detail) {
    H.synchro.etat = e;
    H.synchro.detail = detail || "";
    H.emettre("synchro", e);
  }

  H.synchro = {
    etat: "inactive",
    detail: "",
    // après une modification : on attend un peu pour grouper les changements
    planifier() {
      if (!H.local.jeton) return;
      clearTimeout(minuteur);
      minuteur = setTimeout(() => H.synchro.lancer(), 45000);
    },
    async lancer() {
      clearTimeout(minuteur);
      if (enCours) return enCours;
      enCours = synchroniser().finally(() => (enCours = null));
      return enCours;
    },
    async testerJeton(jeton) {
      const r = await fetch(API, {
        headers: { Authorization: "Bearer " + jeton, Accept: "application/vnd.github+json" },
      });
      if (!r.ok) return { ok: false, message: r.status === 401 ? "Jeton refusé" : "Dépôt introuvable avec ce jeton" };
      const d = await r.json();
      if (!d.permissions || !d.permissions.push) return { ok: false, message: "Ce jeton ne peut pas écrire dans le dépôt" };
      return { ok: true };
    },
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && minuteur) H.synchro.lancer();
    if (document.visibilityState === "visible" && H.local && H.local.jeton) H.synchro.lancer();
  });
  window.addEventListener("online", () => H.local && H.local.jeton && H.synchro.lancer());
})();
