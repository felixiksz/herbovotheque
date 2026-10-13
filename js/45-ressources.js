// Ressources du jardin et énergie du·de la jardinier·e.
//
// Les flashcartes rapportent des ressources (selon la catégorie révisée) et de l'énergie.
// Le terrain les dépense. Après une bonne séance, il faut se reposer : pendant la pause,
// les cartes ne rapportent plus rien (sauf si on mange une crêpe au chocolat).
(function () {
  const H = window.H;

  const P = { k: "#2b2622", b: "#3a8fd8", c: "#8fd0ff", w: "#ffffff", g: "#c79a4a", G: "#8a6230", v: "#5aa63a", V: "#2f7a2a", y: "#ffd23a", o: "#ff9a1e", s: "#9aa0a8", S: "#5a6068", t: "#7a4a24", T: "#4a2a14", p: "#e8d27a", P: "#b89a3a", m: "#7a3a1a", r: "#ff4fa0", n: "#5a3a22", N: "#2a1a10" };

  const ICONES = {
    eau: ["....k....", "...kck...", "..kccbk..", ".kcbbbbk.", ".kwbbbbk.", ".kwcbbbk.", "..kbbbk..", "...kkk..."],
    graines: [".........", "..kk.....", ".kggk.kk.", ".kgGk.kgk", "..kk.kgGk", "...kk.kk.", "..kgGk...", "...kk...."],
    compost: ["...vV....", "..kvVk...", ".ktttTk..", ".kttvtk..", "ktTtttTk.", "kttTttTk.", ".kkkkkk.."],
    soleil: ["k...y...k", ".k..y..k.", "...yyy...", "yyyyoyyyy", "...yyy...", ".k..y..k.", "k...y...k"],
    outils: ["kk.....kk", "ksk...kSk", ".kssk.kk.", "..kssk...", "...ktk...", "...ktk...", "...ktk...", "....k...."],
    terre: [".........", "..kkkkk..", ".ktTttTk.", "kttTttttk", "kTttTtTtk", ".kkkkkkk."],
    paille: ["p.P.p.P.p", "pPp.pPp.p", ".pPpPpPp.", "..kkkkk..", "..pPpPp..", ".pPp.pPp.", "pP.p.p.Pp"],
    purin: ["...kkk...", "...kVk...", "..kvvVk..", ".kvVvvVk.", ".kvvVvvk.", ".kVvvvVk.", "..kkkkk.."],
    crepe: ["..kkkkk..", ".kppppPk.", "kpNnNnppk", "kpnNNNnPk", "kpNnNnppk", ".kPppppk.", "..kkkkk.."],
    energie: [".kk.kk.", "krrkrrk", "krrrrrk", ".krrrk.", "..krk..", "...k..."],
  };

  H.RESSOURCES = [
    { id: "eau", nom: "Eau" },
    { id: "graines", nom: "Graines" },
    { id: "compost", nom: "Compost" },
    { id: "soleil", nom: "Soleil" },
    { id: "outils", nom: "Outils" },
    { id: "terre", nom: "Terre" },
    { id: "paille", nom: "Paille" },
    { id: "purin", nom: "Purins" },
    { id: "crepe", nom: "Crêpes au chocolat fondu" },
  ];

  // Catégorie d'une carte = la section de sa rubrique (ou « tisanes », « perso »…).
  const PAR_DEFAUT = {
    botanique: "graines",
    identite: "graines",
    phyto: "eau",
    approches: "purin",
    mtc: "soleil",
    precautions: "outils",
    jardin: "terre",
    notes: "paille",
    tisanes: "compost",
    perso: "paille",
  };

  const MAX_ENERGIE = 100;
  const REPOS_PAR_HEURE = 6;          // l'énergie remonte doucement toute seule
  const CARTES_AVANT_PAUSE = 40;      // environ 20 minutes de révision
  const DUREE_PAUSE = 2 * 3600e3;     // 2 heures de repos

  function icone(id, echelle) {
    return H.dessinPixel(ICONES[id] || ICONES.graines, P, echelle || 3);
  }

  function energie() {
    const e = H.jeu.energie;
    const heures = (H.maintenant() - (e.le || H.maintenant())) / 3600e3;
    return Math.min(MAX_ENERGIE, Math.round((e.valeur || 0) + heures * REPOS_PAR_HEURE));
  }
  function fixerEnergie(v) {
    H.jeu.energie = Object.assign({}, H.jeu.energie, { valeur: Math.max(0, Math.min(MAX_ENERGIE, v)), le: H.maintenant() });
  }

  // Séance de révision en cours : combien de cartes récompensées depuis la dernière pause.
  function seance() {
    const s = H.jeu.seance || { cartes: 0, debut: 0, pauseJusqua: 0 };
    if (s.pauseJusqua && H.maintenant() >= s.pauseJusqua) {
      s.cartes = 0;
      s.pauseJusqua = 0;
    }
    // une séance « s'oublie » après 3 heures sans réviser
    if (s.derniere && H.maintenant() - s.derniere > 3 * 3600e3) {
      s.cartes = 0;
      s.pauseJusqua = 0;
    }
    H.jeu.seance = s;
    return s;
  }

  function modifie() {
    H.jeu.ressourcesModifieLe = H.maintenant();
    H.d.changer("jeu");
    afficherBarre();
  }

  function categorieCarte(carte) {
    return carte.categorie || "perso";
  }

  function ressourcePour(categorie) {
    return (H.jeu.recompenses || {})[categorie] || PAR_DEFAUT[categorie] || "graines";
  }

  H.ressources = {
    icone,
    MAX_ENERGIE,
    CARTES_AVANT_PAUSE,
    PAR_DEFAUT,
    energie,
    seance,
    ressourcePour,
    quantite: (id) => (H.jeu.ressources || {})[id] || 0,

    ajouter(id, n) {
      H.jeu.ressources = H.jeu.ressources || {};
      H.jeu.ressources[id] = Math.max(0, (H.jeu.ressources[id] || 0) + n);
      modifie();
    },
    depenser(couts) {
      for (const [id, n] of Object.entries(couts)) {
        if (id === "energie") {
          if (energie() < n) return false;
        } else if (H.ressources.quantite(id) < n) return false;
      }
      for (const [id, n] of Object.entries(couts)) {
        if (id === "energie") fixerEnergie(energie() - n);
        else H.jeu.ressources[id] -= n;
      }
      modifie();
      return true;
    },

    // Récompense d'une réponse. Renvoie ce qui a été gagné (pour l'afficher).
    recompenser(carte, note) {
      const s = seance();
      s.derniere = H.maintenant();
      if (s.pauseJusqua) return { pause: true };
      const gain = {};
      const id = ressourcePour(categorieCarte(carte));
      gain[id] = note === 0 ? 1 : 2;
      gain.energie = note === 0 ? 1 : 3;
      s.cartes++;
      if (s.cartes % 15 === 0) gain.crepe = 1;
      H.jeu.ressources = H.jeu.ressources || {};
      for (const [k, n] of Object.entries(gain)) {
        if (k === "energie") fixerEnergie(energie() + n);
        else H.jeu.ressources[k] = (H.jeu.ressources[k] || 0) + n;
      }
      if (s.cartes >= CARTES_AVANT_PAUSE) {
        s.pauseJusqua = H.maintenant() + DUREE_PAUSE;
        gain.pauseCommence = true;
      }
      modifie();
      return gain;
    },

    // Une crêpe au chocolat fondu : fin de la pause et un bon coup d'énergie.
    mangerCrepe() {
      if (H.ressources.quantite("crepe") < 1) return false;
      H.jeu.ressources.crepe--;
      const s = seance();
      s.pauseJusqua = 0;
      s.cartes = 0;
      fixerEnergie(energie() + 30);
      modifie();
      return true;
    },

    afficherBarre,
  };

  function afficherBarre() {
    const barre = H.$("#barre-ressources");
    if (!barre || !H.jeu) return;
    barre.innerHTML = "";
    const e = energie();
    barre.appendChild(
      H.el("span.res.res-energie", { title: "Énergie du·de la jardinier·e : " + e + " / " + MAX_ENERGIE },
        H.el("img", { src: icone("energie", 2), alt: "" }),
        H.el("span.jauge", null, H.el("span.jauge-plein", { style: { width: e + "%" } })),
        H.el("span.sr", null, "Énergie " + e)
      )
    );
    const visibles = H.RESSOURCES.filter((r) => H.ressources.quantite(r.id) > 0 || r.id === "eau" || r.id === "graines");
    visibles.forEach((r) =>
      barre.appendChild(
        H.el("span.res", { title: r.nom }, H.el("img", { src: icone(r.id, 2), alt: r.nom }), String(H.ressources.quantite(r.id)))
      )
    );
  }

  setInterval(() => H.jeu && afficherBarre(), 5 * 60e3);
})();
