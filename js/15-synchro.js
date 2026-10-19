// Synchronisation entre appareils via le dépôt GitHub (jeton à accès fin).
// Les sauvegardes sont chiffrées et rangées sur une branche à part
// « sauvegardes », pour ne pas reconstruire le site à chaque partie.
//
// Chaque personne a son propre jeton. La liste des accès (data/acces.enc, chiffrée) ne garde
// que l'empreinte de chaque jeton, jamais le jeton lui-même, avec un nom et un rôle :
//   ovo     : la partie d'ƟvƟ (herbier et jeu) ;
//   mesi    : sa propre partie (data/mesi/…), et les lettres et les textes avec ƟvƟ ; gère les accès ;
//   testeur : une partie d'essai à part (data/essais/…), qu'ƟvƟ ne voit jamais.
(function () {
  const H = window.H;
  const DEPOT = "felixiksz/herbovotheque";
  const BRANCHE = "sauvegardes";
  const API = "https://api.github.com/repos/" + DEPOT;
  const FICHIERS = { herbier: "data/herbier.enc", jeu: "data/jeu.enc", acces: "data/acces.enc" };
  const role = () => H.local.role || null;
  // où ranger une sauvegarde : la partie d'ƟvƟ, une partie d'essai, ou la partie de Mesi (à part)
  function chemin(quoi) {
    if (quoi.includes("/")) return quoi;
    if (quoi === "acces") return FICHIERS.acces;
    if (role() === "testeur" && H.local.empreinte) return "data/essais/" + H.local.empreinte.slice(0, 16) + "/" + quoi + ".enc";
    if (role() === "mesi") return "data/mesi/" + (H.monde === "mesi" ? "monde/" : "") + quoi + ".enc";
    return FICHIERS[quoi];
  }
  async function empreinte(jeton) {
    const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("herbotheque|" + jeton));
    return Array.from(new Uint8Array(h), (o) => o.toString(16).padStart(2, "0")).join("");
  }
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
    const r = await fetch(API + "/contents/" + chemin(quoi) + "?ref=" + commit, { headers: entetes(true), cache: "no-store" });
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
      arbre.push({ path: chemin(quoi), mode: "100644", type: "blob", sha: blob.sha });
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
    r.lettres = fusionnerCollection(local.lettres, distant.lettres);
    r.matins = fusionnerCollection(local.matins, distant.matins);
    r.cadeaux = fusionnerCollection(local.cadeaux, distant.cadeaux);
    r.cris = fusionnerCollection(local.cris, distant.cris);
    for (const cle of ["taches", "clients", "catalogue", "documents"]) r[cle] = fusionnerCollection(local[cle], distant[cle]);
    const entr = plusRecent(local, distant, "entrepriseModifieLe");
    r.entreprise = entr.entreprise;
    r.entrepriseModifieLe = entr.entrepriseModifieLe;
    r.ferme = { elements: fusionnerCollection((local.ferme || {}).elements, (distant.ferme || {}).elements) };
    const labo = plusRecent(local, distant, "laboModifieLe");
    r.labo = labo.labo;
    r.laboModifieLe = labo.laboModifieLe;
    r.pluieMagique = Math.max(local.pluieMagique || 0, distant.pluieMagique || 0);
    const rep = plusRecent(local, distant, "repetitionModifieLe");
    r.repetition = rep.repetition;
    r.seuilReussite = rep.seuilReussite;
    r.repetitionModifieLe = rep.repetitionModifieLe;
    // la sortie de Mémé : la plus récente (et « on l'a vue rentrer » dès qu'un appareil l'a vue)
    const sl = local.memeSortie, sd = distant.memeSortie;
    r.memeSortie = !sl ? sd : !sd ? sl : sd.depart > sl.depart ? sd : sd.depart < sl.depart ? sl : Object.assign({}, sl, { vuRentrer: sl.vuRentrer || sd.vuRentrer });
    r.modifieLe = Math.max(local.modifieLe || 0, distant.modifieLe || 0);
    return r;
  }

  // Le rôle de ce jeton, d'après la liste des accès (null : jeton pas encore autorisé)
  async function verifierAcces(parent) {
    const acces = await lireDistant("acces", parent);
    const emp = await empreinte(H.local.jeton);
    const u = acces && acces.utilisateurs && acces.utilisateurs[emp];
    await H.d.majLocal((l) => {
      l.empreinte = emp;
      l.role = u ? u.role : null;
      l.nomAcces = u ? u.nom : null;
    });
    return { acces, utilisateur: u || null };
  }

  async function synchroniser() {
    if (!H.local.jeton || !navigator.onLine) return;
    etat("en cours");
    try {
      for (let essai = 0; essai < 4; essai++) {
        const parent = await tete();
        const { utilisateur } = await verifierAcces(parent);
        if (!utilisateur) {
          etat("erreur", "ce jeton n’a pas (ou plus) d’accès");
          return;
        }
        const aEcrire = {};
        // Mesi : les lettres et les textes passent par la partie d'ƟvƟ, sans jamais toucher
        // à son herbier ni à ses jardins
        if (role() === "mesi") {
          const chezOvo = await lireDistant(FICHIERS.jeu, parent);
          const commun = { lettres: fusionnerCollection(H.jeu.lettres, chezOvo && chezOvo.lettres), textes: fusionnerCollection(H.jeu.textes, chezOvo && chezOvo.textes), matins: fusionnerCollection(H.jeu.matins, chezOvo && chezOvo.matins), cadeaux: fusionnerCollection(H.jeu.cadeaux, chezOvo && chezOvo.cadeaux), cris: fusionnerCollection(H.jeu.cris, chezOvo && chezOvo.cris) };
          const chezMoi = Object.assign({}, H.jeu, commun);
          if (canon(chezMoi) !== canon(H.jeu)) {
            H.jeu = chezMoi;
            await H.kv.ecrire(H.d.cleKv("jeu"), chezMoi);
            H.emettre("donnees", "jeu");
          }
          const versOvo = Object.assign({}, chezOvo || { modifieLe: 0 }, commun);
          if (!chezOvo || canon(versOvo) !== canon(chezOvo)) aEcrire[FICHIERS.jeu] = versOvo;
        }
        // ma partie à moi, partagée entre mes appareils : celle d'ƟvƟ, celle de Mesi, ou une partie d'essai
        for (const quoi of ["herbier", "jeu"]) {
          const distant = await lireDistant(quoi, parent);
          const local = quoi === "jeu" ? H.jeu : H.herbier;
          const fusion = quoi === "jeu" ? fusionnerJeu(local, distant) : fusionnerHerbier(local, distant);
          if (canon(fusion) !== canon(local)) {
            if (quoi === "jeu") H.jeu = fusion;
            else H.herbier = fusion;
            H.d.invalider();
            await H.kv.ecrire(H.d.cleKv(quoi), fusion);
            H.emettre("donnees", quoi);
          }
          if (!distant || canon(fusion) !== canon(distant)) aEcrire[chemin(quoi)] = fusion;
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
    empreinte,
    // Relier un jeton à cet appareil : vérifie ses droits, puis son accès dans la liste.
    // Le tout premier jeton (quand la liste n'existe pas encore) devient celui de Mesi.
    async relier(jeton, confirmerPremier) {
      const t = await H.synchro.testerJeton(jeton);
      if (!t.ok) return t;
      const ancien = H.local.jeton;
      await H.d.majLocal((l) => (l.jeton = jeton));
      try {
        const parent = await tete();
        const { acces, utilisateur } = await verifierAcces(parent);
        if (utilisateur) {
          H.synchro.lancer();
          return { ok: true, message: "Jeton relié : " + utilisateur.nom + "." };
        }
        if (!acces && confirmerPremier()) {
          const emp = await empreinte(jeton);
          await ecrireDistant({ acces: { utilisateurs: { [emp]: { nom: "Mesi", role: "mesi", ajouteLe: H.maintenant() } }, modifieLe: H.maintenant() } }, parent);
          await verifierAcces(await tete());
          H.synchro.lancer();
          return { ok: true, message: "Jeton relié : Mesi. Tu peux maintenant ajouter les autres jetons." };
        }
        await H.d.majLocal((l) => {
          if (ancien) l.jeton = ancien;
          else delete l.jeton;
        });
        return { ok: false, message: "Ce jeton n’a pas encore d’accès : Mesi doit l’ajouter dans ses réglages." };
      } catch (e) {
        await H.d.majLocal((l) => {
          if (ancien) l.jeton = ancien;
          else delete l.jeton;
        });
        return { ok: false, message: "Pas de connexion avec GitHub (" + e.message + ")" };
      }
    },
    // pour Mesi : la liste des accès, ajouter ou retirer un jeton
    async listeAcces() {
      const acces = await lireDistant("acces", await tete());
      return Object.entries((acces && acces.utilisateurs) || {}).map(([emp, u]) => Object.assign({ empreinte: emp }, u));
    },
    async changerAcces(fn) {
      if (role() !== "mesi") throw new Error("réservé à Mesi");
      for (let essai = 0; essai < 4; essai++) {
        const parent = await tete();
        const acces = (await lireDistant("acces", parent)) || { utilisateurs: {} };
        fn(acces.utilisateurs);
        acces.modifieLe = H.maintenant();
        try {
          await ecrireDistant({ acces }, parent);
          return;
        } catch (e) {
          if (!e.conflit) throw e;
        }
      }
      throw new Error("conflit");
    },
    async ajouterAcces(jeton, nom, sonRole) {
      const t = await H.synchro.testerJeton(jeton);
      if (!t.ok) return t;
      const emp = await empreinte(jeton);
      await H.synchro.changerAcces((u) => (u[emp] = { nom, role: sonRole, ajouteLe: H.maintenant() }));
      return { ok: true };
    },
    async retirerAcces(emp) {
      if (emp === H.local.empreinte) return { ok: false, message: "Tu ne peux pas retirer ton propre accès." };
      await H.synchro.changerAcces((u) => delete u[emp]);
      return { ok: true };
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
