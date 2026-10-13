// Synchronisation entre appareils via le dépôt GitHub (jeton à accès fin).
// Les sauvegardes sont chiffrées et rangées sur une branche à part
// « sauvegardes », pour ne pas reconstruire le site à chaque partie.
(function () {
  const H = window.H;
  const DEPOT = "felixiksz/herbovotheque";
  const BRANCHE = "sauvegardes";
  const API = "https://api.github.com/repos/" + DEPOT;
  const FICHIERS = { herbier: "herbier.enc", jeu: "jeu.enc" };
  const shas = {};
  let minuteur = null;
  let enCours = null;

  function entetes(brut) {
    return {
      Authorization: "Bearer " + H.local.jeton,
      Accept: brut ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    };
  }

  async function brancheExiste() {
    const r = await fetch(API + "/branches/" + BRANCHE, { headers: entetes() });
    if (r.ok) return true;
    if (r.status !== 404) throw new Error("GitHub " + r.status);
    const depot = await (await fetch(API, { headers: entetes() })).json();
    const tete = await (await fetch(API + "/git/ref/heads/" + depot.default_branch, { headers: entetes() })).json();
    const c = await fetch(API + "/git/refs", {
      method: "POST",
      headers: entetes(),
      body: JSON.stringify({ ref: "refs/heads/" + BRANCHE, sha: tete.object.sha }),
    });
    if (!c.ok) throw new Error("Création de la branche impossible (" + c.status + ")");
    return true;
  }

  async function lireDistant(quoi) {
    const url = API + "/contents/data/" + FICHIERS[quoi] + "?ref=" + BRANCHE;
    const meta = await fetch(url, { headers: entetes(), cache: "no-store" });
    if (meta.status === 404) return null;
    if (!meta.ok) throw new Error("GitHub " + meta.status);
    const info = await meta.json();
    shas[quoi] = info.sha;
    const brut = await fetch(url, { headers: entetes(true), cache: "no-store" });
    const paquet = JSON.parse(await brut.text());
    return H.chiffre.ouvrir(paquet, H.cle);
  }

  async function ecrireDistant(quoi, objet) {
    const paquet = await H.chiffre.fermer(objet, H.cle, H.meta.sel, H.meta.iter);
    const corps = {
      message: "Sauvegarde " + (quoi === "jeu" ? "du jeu" : "de l’herbier"),
      content: btoa(unescape(encodeURIComponent(JSON.stringify(paquet)))),
      branch: BRANCHE,
    };
    if (shas[quoi]) corps.sha = shas[quoi];
    const r = await fetch(API + "/contents/data/" + FICHIERS[quoi], {
      method: "PUT",
      headers: entetes(),
      body: JSON.stringify(corps),
    });
    if (r.status === 409 || r.status === 422) {
      // quelqu'un (l'autre appareil) a écrit entre-temps : on refusionne
      delete shas[quoi];
      throw Object.assign(new Error("conflit"), { conflit: true });
    }
    if (!r.ok) throw new Error("GitHub " + r.status);
    shas[quoi] = (await r.json()).content.sha;
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
    r.modifieLe = Math.max(local.modifieLe || 0, distant.modifieLe || 0);
    return r;
  }

  async function synchroniser() {
    if (!H.local.jeton || !navigator.onLine) return;
    etat("en cours");
    try {
      await brancheExiste();
      for (const quoi of ["herbier", "jeu"]) {
        for (let essai = 0; essai < 3; essai++) {
          const distant = await lireDistant(quoi);
          const local = quoi === "jeu" ? H.jeu : H.herbier;
          const fusion = quoi === "jeu" ? fusionnerJeu(local, distant) : fusionnerHerbier(local, distant);
          const change = JSON.stringify(fusion) !== JSON.stringify(local);
          if (quoi === "jeu") H.jeu = fusion;
          else H.herbier = fusion;
          if (change) {
            H.d.invalider();
            await H.kv.ecrire(quoi, fusion);
            H.emettre("donnees", quoi);
          }
          if (!distant || JSON.stringify(fusion) !== JSON.stringify(distant)) {
            try {
              await ecrireDistant(quoi, fusion);
            } catch (e) {
              if (e.conflit) continue;
              throw e;
            }
          }
          break;
        }
        await H.d.majLocal((l) => {
          l.derniereSynchro = Object.assign({}, l.derniereSynchro, { [quoi]: H.maintenant() });
        });
      }
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
