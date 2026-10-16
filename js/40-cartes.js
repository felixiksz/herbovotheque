// Flashcartes à répétition espacée, tirées des fiches, des tisanes et des cartes d'ƟvƟ.
// Réponses : raté / difficile / bien / facile. Le taux de réussite de chaque carte est
// suivi : sous le seuil (80 % par défaut), la carte revient plus souvent.
(function () {
  const H = window.H;
  const JOUR = 864e5, MIN = 6e4;
  const NOTES = [
    { n: 0, nom: "Raté" },
    { n: 1, nom: "Difficile" },
    { n: 2, nom: "Bien" },
    { n: 3, nom: "Facile" },
  ];

  // --- toutes les cartes possibles ------------------------------------------------
  const vide = (v) => v == null || v === "" || (Array.isArray(v) && !v.length);

  function toutesLesCartes() {
    const cartes = [];
    const champs = H.d.champs().filter((c) => c.cartes);
    for (const p of H.d.plantes()) {
      if (p.latin) {
        cartes.push({ id: p.id + "|_latin", plante: p.id, rubrique: "_latin", categorie: "identite", recto: () => texte("Nom latin " + H.duNom(p).slice(0, -H.nomPhrase(p).length), H.el("strong", null, H.nomPhrase(p))), verso: () => H.el("p.reponse-courte", null, H.el("em", null, p.latin)) });
        cartes.push({ id: p.id + "|_nom", plante: p.id, rubrique: "_nom", categorie: "identite", recto: () => texte("Quelle plante est ", H.el("em", null, p.latin), " ?"), verso: () => H.el("p.reponse-courte", null, p.nom) });
      }
      for (const c of champs) {
        const v = (p.valeurs || {})[c.id];
        if (vide(v)) continue;
        // quand les réponses possibles sont en nombre limité (sphères, cycle, exposition, sol,
        // mois…), la carte se joue en choix multiples
        const mois = c.type === "mois";
        const options = c.type === "choix" ? c.options || [] : mois ? H.MOIS : null;
        const bonnes = (Array.isArray(v) ? v : [v]).map((x) => (mois && typeof x === "number" ? H.MOIS[x - 1] : x)).filter((x) => options && options.includes(x));
        cartes.push({
          id: p.id + "|" + c.id,
          plante: p.id,
          rubrique: c.id,
          categorie: c.section,
          recto: () => texte(H.el("strong", null, p.nom), H.el("span.recto-rubrique", null, c.nom)),
          verso: () => H.fiche.valeurLecture(c, v),
          choix: options && options.length > 1 && bonnes.length ? { options, bonnes, plusieurs: !!(c.multiple || mois || Array.isArray(v)) } : null,
        });
      }
    }
    for (const t of H.tisanes.liste()) {
      cartes.push({
        id: "tisane|" + t.id,
        rubrique: "tisanes",
        categorie: "tisanes",
        recto: () => texte(H.monde === "mesi" ? "Composition de la formule " : "Composition du mélange ", H.el("strong", null, t.nom)),
        verso: () => H.el("ul", null, H.tisanes.composition(t).map((x) => H.el("li", null, x))),
      });
      for (const x of t.plantes || []) {
        const p = H.d.plante(x.id);
        if (!p || !x.role) continue;
        cartes.push({
          id: "tisane-role|" + t.id + "|" + x.id,
          plante: x.id,
          rubrique: "tisanesRoles",
          categorie: "tisanes",
          recto: () => texte(H.monde === "mesi" ? "Dans la formule " : "Dans le mélange ", H.el("strong", null, t.nom), ", pourquoi ", H.el("strong", null, p.nom), " ?"),
          verso: () => H.el("p.reponse-courte", null, x.role),
        });
      }
    }
    for (const c of Object.values(H.jeu.cartesPerso || {})) {
      if (c.supprime) continue;
      cartes.push({
        id: "perso|" + c.id,
        plante: c.plante || null,
        rubrique: "perso:" + (c.paquet || "Mes cartes"),
        categorie: "perso",
        recto: () => H.el("div.texte-fiche", { html: H.texteRiche(c.recto) }),
        verso: () => H.el("div.texte-fiche", { html: H.texteRiche(c.verso) }),
      });
    }
    return cartes;
  }

  function texte(...morceaux) {
    return H.el("p.recto-texte", null, morceaux);
  }

  // Rubriques révisables, rangées pour le choix : [{titre, items:[{cle, nom}]}]
  function groupesDeRubriques() {
    const g = [{ titre: "Identité", items: [{ cle: "_latin", nom: "Nom latin" }, { cle: "_nom", nom: "Retrouver la plante d’après son nom latin" }] }];
    for (const s of H.d.sections()) {
      const items = H.d.champs().filter((c) => c.cartes && c.section === s.id).map((c) => ({ cle: c.id, nom: c.nom }));
      if (items.length) g.push({ titre: s.nom, items });
    }
    const autres = H.monde === "mesi" ? [{ cle: "tisanes", nom: "Mes formules" }, { cle: "tisanesRoles", nom: "Rôle de chaque substance dans mes formules" }] : [{ cle: "tisanes", nom: "Mes tisanes" }, { cle: "tisanesRoles", nom: "Rôle de chaque plante dans mes tisanes" }];
    const paquets = new Set(Object.values(H.jeu.cartesPerso || {}).filter((c) => !c.supprime).map((c) => c.paquet || "Mes cartes"));
    paquets.forEach((p) => autres.push({ cle: "perso:" + p, nom: p }));
    g.push({ titre: H.monde === "mesi" ? "Formules et cartes perso" : "Tisanes et cartes perso", items: autres });
    return g;
  }

  // --- choix de ce qu'on révise (gardé sur l'appareil) --------------------------
  function filtre() {
    const f = Object.assign(
      { rubriques: ["_latin", "famille", "proprietes", "mtcSaveur", "tisanes"], rangement: "", groupes: [], mode: "dues", nouvelles: 15, plante: null, plantesChoisies: [] },
      H.local.filtreCartes || {}
    );
    return f;
  }
  function majFiltre(fn) {
    const f = filtre();
    fn(f);
    H.d.majLocal((l) => (l.filtreCartes = f));
  }

  function selection(f) {
    f = f || filtre();
    const toutes = toutesLesCartes();
    if (f.plante) return toutes.filter((c) => c.plante === f.plante);
    // les plantes de l'île : les rubriques habituelles d'abord (toutes, s'il n'y en a pas)
    if (f.ile) {
      const ids = new Set(f.ile), dIle = toutes.filter((c) => c.plante && ids.has(c.plante));
      const habituelles = dIle.filter((c) => f.rubriques.includes(c.rubrique));
      return habituelles.length ? habituelles : dIle;
    }
    let cartes = toutes.filter((c) => f.rubriques.includes(c.rubrique));
    if ((f.plantesChoisies || []).length) {
      const ids = new Set(f.plantesChoisies);
      cartes = cartes.filter((c) => c.plante && ids.has(c.plante));
    }
    if (f.rangement && f.groupes.length) {
      const rg = H.herbier.rangements.find((r) => r.id === f.rangement);
      if (rg) {
        const ids = new Set();
        H.groupesDe(rg).filter((g) => f.groupes.includes(g.nom)).forEach((g) => g.ids.forEach((id) => ids.add(id)));
        cartes = cartes.filter((c) => !c.plante || ids.has(c.plante));
      }
    }
    return cartes;
  }

  // --- répétition espacée ----------------------------------------------------------
  const etat = (id) => (H.jeu.cartes || {})[id];
  const taux = (s) => (s && s.vues ? s.reussites / s.vues : null);
  const seuil = () => (H.jeu.seuilReussite || 80) / 100;
  const estFragile = (s) => s && s.vues >= 3 && taux(s) < seuil();

  function prochainEtat(s, note, maintenant) {
    s = s ? Object.assign({}, s) : { ease: 2.5, intervalle: 0, reps: 0, vues: 0, reussites: 0, ratees: 0, apprentissage: true, notes: [] };
    s.vues++;
    if (note > 0) s.reussites++;
    else s.ratees++;
    s.notes = (s.notes || []).concat(note).slice(-12);
    let attente;
    if (s.apprentissage) {
      if (note === 0) attente = 1 * MIN;
      else if (note === 1) attente = 10 * MIN;
      else {
        s.apprentissage = false;
        s.intervalle = s.apresRechute || (note === 2 ? 1 : 4);
        delete s.apresRechute;
        attente = s.intervalle * JOUR;
      }
    } else if (note === 0) {
      s.ease = Math.max(1.3, s.ease - 0.2);
      s.apprentissage = true;
      s.apresRechute = Math.max(1, Math.round(s.intervalle * 0.5));
      s.reps = 0;
      attente = 10 * MIN;
    } else {
      if (note === 1) {
        s.ease = Math.max(1.3, s.ease - 0.15);
        s.intervalle = Math.max(1, s.intervalle * 1.2);
      } else if (note === 2) {
        s.intervalle = Math.max(1, s.intervalle * s.ease);
      } else {
        s.ease += 0.15;
        s.intervalle = Math.max(1, s.intervalle * s.ease * 1.3);
      }
      if (estFragile(s)) s.intervalle *= 0.7;
      s.intervalle = Math.round(s.intervalle * (0.95 + Math.random() * 0.1) * 10) / 10;
      s.reps++;
      attente = s.intervalle * JOUR;
    }
    s.due = maintenant + attente;
    s.vueLe = maintenant;
    s.modifieLe = maintenant;
    return s;
  }

  function duree(ms) {
    if (ms < 60 * MIN) return Math.max(1, Math.round(ms / MIN)) + " min";
    if (ms < JOUR) return Math.round(ms / (60 * MIN)) + " h";
    const j = ms / JOUR;
    if (j < 30) return Math.round(j) + " j";
    if (j < 365) return Math.round(j / 30) + " mois";
    return (Math.round((j / 365) * 10) / 10).toString().replace(".", ",") + " an";
  }

  function fileDeRevision(f) {
    const maintenant = H.maintenant();
    const cartes = selection(f);
    const dues = [], nouvelles = [], fragiles = [];
    for (const c of cartes) {
      const s = etat(c.id);
      if (!s) nouvelles.push(c);
      else {
        if (s.due <= maintenant) dues.push(c);
        if (estFragile(s)) fragiles.push(c);
      }
    }
    dues.sort((a, b) => etat(a.id).due - etat(b.id).due);
    if (f.mode === "aRevoir") return { file: dues, dues: dues.length, nouvelles: nouvelles.length, fragiles: fragiles.length, total: cartes.length };
    if (f.mode === "nouvelles") return { file: melanger(nouvelles).slice(0, Math.max(1, f.nouvelles)), dues: dues.length, nouvelles: nouvelles.length, fragiles: fragiles.length, total: cartes.length };
    if (f.mode === "fragiles") return { file: melanger(fragiles), dues: dues.length, nouvelles: nouvelles.length, fragiles: fragiles.length, total: cartes.length };
    if (f.mode === "toutes") return { file: melanger(cartes.slice()).slice(0, 60), dues: dues.length, nouvelles: nouvelles.length, fragiles: fragiles.length, total: cartes.length };
    const nouv = melanger(nouvelles).slice(0, f.plante ? 999 : f.nouvelles);
    return { file: dues.concat(nouv), dues: dues.length, nouvelles: nouvelles.length, fragiles: fragiles.length, total: cartes.length };
  }

  function melanger(a) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // --- écran d'accueil des flashcartes ---------------------------------------------
  let conteneur = null;
  let choixOuvert = null; // le panneau « Choisir quoi réviser » reste ouvert entre deux clics

  let derniersParams = [];
  function accueil(params) {
    derniersParams = params || [];
    const y = window.scrollY;
    conteneur.innerHTML = "";
    requestAnimationFrame(() => window.scrollTo(0, y));
    let f = filtre();
    if (params[0] === "plante" && params[1]) {
      f = Object.assign({}, f, { plante: params[1], mode: "toutes" });
    }
    // les plantes de l'île où l'on se trouve, en flashcartes
    const ile = params[0] === "ile" && params[1] && (H.jeu.iles || {})[params[1]];
    if (ile) f = Object.assign({}, f, { ile: [...new Set(Object.values(ile.plantes || {}).map((x) => x.p))], nomIle: ile.nom, mode: "toutes" });
    const info = fileDeRevision(f);
    const p = f.plante ? H.d.plante(f.plante) : null;

    conteneur.appendChild(H.el("h1", null, "Flashcartes"));
    const s = H.ressources.seance();
    if (s.pauseJusqua) conteneur.appendChild(bandeauPause(s));

    const resume = H.el("div.cartes-resume", null,
      p ? H.el("p", null, "Révision de la plante ", H.el("strong", null, p.nom), " · ", H.el("a", { href: "#cartes" }, "revenir au choix habituel")) : null,
      f.ile ? H.el("p", null, "Révision des plantes de « ", H.el("strong", null, f.nomIle), " » · ", H.el("a", { href: "#cartes" }, "revenir au choix habituel")) : null,
      H.el("p.chiffres", null,
        H.el("span", null, H.el("strong", null, String(info.dues)), " à revoir"),
        H.el("span", null, H.el("strong", null, String(info.nouvelles)), " nouvelles"),
        H.el("span", null, H.el("strong", null, String(info.fragiles)), " fragiles"),
        H.el("span.discret", null, info.total + " cartes dans la sélection")
      ),
      H.el("button.bouton.commencer", {
        type: "button",
        onclick: () => (info.file.length ? revision(info.file, f) : H.toast("Rien à réviser pour l’instant avec ce choix")),
      }, info.file.length ? "Commencer (" + info.file.length + " cartes)" : "Rien à réviser maintenant")
    );
    // une fenêtre à onglets : réviser, puis ce qu'il y a autour
    conteneur.appendChild(H.bureau.onglets([
      { nom: "Réviser", el: [resume].concat(!p ? [choix(f, !!f.ile)] : []) },
      { nom: "Réussite", el: statistiques() },
      { nom: "Mes cartes", el: cartesPerso() },
      { nom: "Ce qu’elles rapportent", el: recompenses() },
    ], { cle: "cartes" }));
  }

  function bandeauPause(s) {
    const reste = s.pauseJusqua - H.maintenant();
    return H.el("div.bandeau-pause", null,
      H.el("p", null, "ƟvƟ se repose : encore ", H.el("strong", null, duree(reste)), " avant que les cartes rapportent à nouveau des ressources. Tu peux réviser quand même, pour le plaisir."),
      H.ressources.quantite("crepe") > 0
        ? H.el("button.bouton.petit", { type: "button", onclick: () => { H.ressources.mangerCrepe(); H.toast("Miam. Plein·e d’énergie !"); H.router(); } },
            H.el("img", { src: H.ressources.icone("crepe", 2), alt: "" }), "Manger une crêpe au chocolat fondu")
        : null
    );
  }

  // rubriquesSeules : pour les plantes d'une île, on choisit seulement les rubriques à réviser
  function choix(f, rubriquesSeules) {
    if (choixOuvert == null) choixOuvert = !H.local.filtreCartes;
    const det = H.el("details.cartes-choix", { open: rubriquesSeules || choixOuvert });
    det.addEventListener("toggle", () => (choixOuvert = det.open));
    det.appendChild(H.el("summary", null, H.el("h2", null, rubriquesSeules ? "Quelles rubriques réviser" : "Choisir quoi réviser")));
    if (!rubriquesSeules) {
      const info = fileDeRevision(f);
      det.appendChild(H.el("h3", null, "Quelles cartes"));
      const modes = [
        ["dues", "À revoir et nouvelles"],
        ["aRevoir", "Seulement celles à revoir (" + info.dues + ")"],
        ["nouvelles", "Seulement les nouvelles (" + info.nouvelles + ")"],
        ["fragiles", "Seulement les fragiles (" + info.fragiles + ")"],
        ["toutes", "Tout, dans le désordre (" + info.total + ")"],
      ];
      det.appendChild(H.el("div.pastilles", null,
        modes.map(([m, t]) => H.el("button.bouton.petit" + (f.mode === m ? ".actif" : ""), { type: "button", "aria-pressed": String(f.mode === m), onclick: () => { majFiltre((x) => (x.mode = m)); setTimeout(() => accueil(derniersParams), 0); } }, t)),
        f.mode === "dues" || f.mode === "nouvelles" ? H.el("label.discret", null, " Nouvelles cartes par séance ",
          H.el("input", { type: "number", min: 1, max: 100, value: f.nouvelles, style: { width: "4.5em" }, onchange: (e) => { majFiltre((x) => (x.nouvelles = Math.max(1, parseInt(e.target.value, 10) || 1))); setTimeout(() => accueil(derniersParams), 0); } })) : null
      ));
    }
    // rubriques
    for (const g of groupesDeRubriques()) {
      det.appendChild(H.el("h3", null, g.titre));
      det.appendChild(H.el("div.pastilles", null,
        g.items.map((it) => {
          const actif = f.rubriques.includes(it.cle);
          return H.el("button.bouton.petit" + (actif ? ".actif" : ""), {
            type: "button",
            "aria-pressed": String(actif),
            onclick() {
              majFiltre((x) => {
                x.rubriques = actif ? x.rubriques.filter((r) => r !== it.cle) : x.rubriques.concat(it.cle);
              });
              // on reste sur la même révision (les plantes d'une île, par exemple)
              setTimeout(() => accueil(derniersParams), 0);
            },
          }, it.nom);
        })
      ));
    }
    if (rubriquesSeules) return det;
    // plantes
    det.appendChild(H.el("h3", null, "Quelles plantes"));
    const rg = H.herbier.rangements.find((r) => r.id === f.rangement);
    det.appendChild(H.el("label", null, "Selon le rangement ",
      H.el("select", {
        onchange(e) {
          majFiltre((x) => {
            x.rangement = e.target.value;
            x.groupes = [];
          });
          setTimeout(() => accueil([]), 0);
        },
      }, H.el("option", { value: "" }, "toutes les plantes"), H.herbier.rangements.map((r) => H.el("option", { value: r.id, selected: r.id === f.rangement }, r.nom)))
    ));
    if (rg) {
      det.appendChild(H.el("div.pastilles.groupes-cartes", null,
        H.groupesDe(rg).map((g) => {
          const actif = f.groupes.includes(g.nom);
          return H.el("button.bouton.petit" + (actif ? ".actif" : ""), {
            type: "button",
            "aria-pressed": String(actif),
            onclick() {
              majFiltre((x) => (x.groupes = actif ? x.groupes.filter((n) => n !== g.nom) : x.groupes.concat(g.nom)));
              setTimeout(() => accueil([]), 0);
            },
          }, g.nom + " (" + g.ids.length + ")");
        })
      ));
      if (!f.groupes.length) det.appendChild(H.el("p.discret", null, "Aucune étagère choisie : toutes les plantes sont incluses."));
    }
    // ou bien des plantes choisies une à une
    const choisies = (f.plantesChoisies || []).map((id) => H.d.plante(id)).filter(Boolean);
    det.appendChild(H.el("div.pastilles", null,
      H.el("button.bouton.petit", { type: "button", onclick: () => H.choisirPlantes(f.plantesChoisies || [], (ids) => { majFiltre((x) => (x.plantesChoisies = ids)); setTimeout(() => accueil(derniersParams), 0); }, "Quelles plantes réviser ?") }, choisies.length ? "Changer les plantes choisies" : "Choisir des plantes une à une"),
      choisies.map((q) => H.el("button.bouton.petit.actif", { type: "button", title: "Retirer de la révision", onclick: () => { majFiltre((x) => (x.plantesChoisies = (x.plantesChoisies || []).filter((id) => id !== q.id))); setTimeout(() => accueil(derniersParams), 0); } }, q.nom + " ×")),
      choisies.length ? H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { majFiltre((x) => (x.plantesChoisies = [])); setTimeout(() => accueil(derniersParams), 0); } }, "Toutes les plantes") : null
    ));
    return det;
  }

  // --- statistiques : taux de réussite par rubrique, cartes fragiles ------------------
  function statistiques() {
    const det = H.el("details.cartes-stats");
    det.appendChild(H.el("summary", null, H.el("h2", null, "Taux de réussite")));
    const cartes = toutesLesCartes();
    const parRubrique = new Map();
    let vues = 0, reussites = 0;
    const fragiles = [];
    for (const c of cartes) {
      const s = etat(c.id);
      if (!s) continue;
      vues += s.vues;
      reussites += s.reussites;
      const r = parRubrique.get(c.rubrique) || { vues: 0, reussites: 0, cartes: 0 };
      r.vues += s.vues;
      r.reussites += s.reussites;
      r.cartes++;
      parRubrique.set(c.rubrique, r);
      if (estFragile(s)) fragiles.push(c);
    }
    const nomRubrique = (cle) => (cle === "_latin" ? "Nom latin" : cle === "_nom" ? "Plante d’après le nom latin" : cle === "tisanes" ? (H.monde === "mesi" ? "Mes formules" : "Mes tisanes") : cle === "tisanesRoles" ? (H.monde === "mesi" ? "Rôle des substances dans mes formules" : "Rôle des plantes dans mes tisanes") : cle.startsWith("perso:") ? cle.slice(6) : (H.d.champ(cle) || {}).nom || cle);
    if (!vues) {
      det.appendChild(H.el("p.discret", null, "Les statistiques apparaîtront après tes premières révisions."));
    } else {
      det.appendChild(H.el("p", null, "En tout : ", H.el("strong", null, Math.round((reussites / vues) * 100) + " %"), " de réussite sur " + vues + " réponses."));
      const table = H.el("div.stats-lignes");
      Array.from(parRubrique).sort((a, b) => a[1].reussites / a[1].vues - b[1].reussites / b[1].vues).forEach(([cle, r]) => {
        const t = Math.round((r.reussites / r.vues) * 100);
        table.appendChild(H.el("div.stats-ligne" + (t < seuil() * 100 ? ".sous-seuil" : ""), null,
          H.el("span", null, nomRubrique(cle)),
          H.el("span.barre-taux", null, H.el("span", { style: { width: t + "%" } })),
          H.el("span.taux", null, t + " %"),
          H.el("span.discret", null, r.cartes + " cartes")
        ));
      });
      det.appendChild(table);
    }
    det.appendChild(H.el("p.discret", null, "Seuil de réussite : ",
      H.el("input", {
        type: "number", min: 50, max: 100, value: H.jeu.seuilReussite || 80, style: { width: "4.5em" },
        onchange(e) {
          H.jeu.seuilReussite = Math.min(100, Math.max(50, parseInt(e.target.value, 10) || 80));
          H.d.changer("jeu");
        },
      }), " %. En dessous, une carte vue au moins 3 fois devient fragile et revient plus souvent."));
    if (fragiles.length) {
      det.appendChild(H.el("h3", null, fragiles.length + " cartes fragiles"));
      det.appendChild(H.el("ul.liste-fragiles", null,
        fragiles.slice(0, 40).map((c) => {
          const s = etat(c.id);
          const p = c.plante ? H.d.plante(c.plante) : null;
          return H.el("li", null, (p ? p.nom + " · " : "") + nomRubrique(c.rubrique), H.el("span.discret", null, " " + Math.round(taux(s) * 100) + " % (" + s.vues + " fois)"));
        })
      ));
    }
    return det;
  }

  // --- cartes écrites par ƟvƟ ---------------------------------------------------------
  function cartesPerso() {
    const det = H.el("details.cartes-perso");
    det.appendChild(H.el("summary", null, H.el("h2", null, "Mes cartes")));
    const liste = Object.values(H.jeu.cartesPerso || {}).filter((c) => !c.supprime);
    det.appendChild(H.el("button.bouton.petit", { type: "button", onclick: () => editerCarte() }, "Écrire une carte"));
    if (liste.length) {
      det.appendChild(H.el("ul.liste-perso", null,
        liste.map((c) => H.el("li", null,
          H.el("span.discret", null, (c.paquet || "Mes cartes") + " · "),
          c.recto.replace(/\*\*/g, "").slice(0, 80),
          " ",
          H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => editerCarte(c) }, "Modifier")
        ))
      ));
    } else {
      det.appendChild(H.el("p.discret", null, "Les cartes que tu écris toi-même se rangent par paquets, que tu peux ensuite choisir de réviser."));
    }
    return det;
  }

  function editerCarte(c) {
    c = c ? Object.assign({}, c) : { id: H.uid("carte"), recto: "", verso: "", paquet: "Mes cartes" };
    const paquets = Array.from(new Set(Object.values(H.jeu.cartesPerso || {}).map((x) => x.paquet || "Mes cartes")));
    const paquet = H.el("input", { type: "text", value: c.paquet, list: "liste-paquets" });
    const recto = H.el("textarea", { rows: 3 });
    recto.value = c.recto;
    const verso = H.el("textarea", { rows: 5 });
    verso.value = c.verso;
    const plante = H.el("select", null, H.el("option", { value: "" }, "(aucune)"), H.d.plantes().map((p) => H.el("option", { value: p.id, selected: p.id === c.plante }, p.nom)));
    const msg = H.el("p.discret.erreur");
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire", {
      onsubmit(e) {
        e.preventDefault();
        if (!recto.value.trim() || !verso.value.trim()) {
          msg.textContent = "Écris une question et une réponse.";
          return;
        }
        Object.assign(c, { recto: recto.value.trim(), verso: verso.value.trim(), paquet: paquet.value.trim() || "Mes cartes", plante: plante.value || null, modifieLe: H.maintenant() });
        H.jeu.cartesPerso = H.jeu.cartesPerso || {};
        H.jeu.cartesPerso[c.id] = c;
        const f = filtre();
        if (!f.rubriques.includes("perso:" + c.paquet)) majFiltre((x) => x.rubriques.push("perso:" + c.paquet));
        H.d.changer("jeu");
        fermer();
        H.router();
      },
    },
      H.el("h2", null, "Carte"),
      H.el("label", null, "Paquet", paquet, H.el("datalist", { id: "liste-paquets" }, paquets.map((p) => H.el("option", { value: p })))),
      H.el("label", null, "Question", recto),
      H.el("label", null, "Réponse", verso),
      H.el("label", null, "Plante liée (facultatif)", plante),
      msg,
      H.el("div.boutons-bas", null,
        H.jeu.cartesPerso && H.jeu.cartesPerso[c.id]
          ? H.el("button.bouton.discret-bouton", { type: "button", onclick: () => { H.jeu.cartesPerso[c.id] = { id: c.id, supprime: true, modifieLe: H.maintenant() }; H.d.changer("jeu"); fermer(); H.router(); } }, "Supprimer")
          : null,
        H.el("button.bouton", { type: "submit" }, "Enregistrer")
      )
    ));
  }

  // --- quelle ressource rapporte chaque catégorie ------------------------------------
  function recompenses() {
    const det = H.el("details.cartes-recompenses");
    det.appendChild(H.el("summary", null, H.el("h2", null, "Ce que rapportent les cartes")));
    const cats = [["identite", "Identité"]].concat(H.d.sections().map((s) => [s.id, s.nom]), [["tisanes", H.monde === "mesi" ? "Formules" : "Tisanes"], ["perso", "Mes cartes"]]);
    const grille = H.el("div.grille-recompenses");
    cats.forEach(([id, nom]) => {
      const choisie = H.ressources.ressourcePour(id);
      const img = H.el("img", { src: H.ressources.icone(choisie, 2), alt: "" });
      grille.appendChild(H.el("label.ligne-recompense", null,
        H.el("span", null, nom),
        img,
        H.el("select", {
          onchange(e) {
            H.jeu.recompenses = Object.assign({}, H.jeu.recompenses, { [id]: e.target.value });
            H.jeu.recompensesModifieLe = H.maintenant();
            H.d.changer("jeu");
            img.src = H.ressources.icone(e.target.value, 2);
          },
        }, H.RESSOURCES.filter((r) => r.id !== "crepe").map((r) => H.el("option", { value: r.id, selected: r.id === choisie }, r.nom)))
      ));
    });
    det.appendChild(H.el("p.discret", null, "Chaque réponse rapporte la ressource de sa catégorie, une ressource du jardin en plus (celle qui manque le plus : terre, graines, eau, compost, outils ou soleil) et un peu d’énergie. Toutes les 15 cartes : une crêpe au chocolat fondu. Après " + H.ressources.CARTES_AVANT_PAUSE + " cartes, ƟvƟ fait une pause de deux heures."));
    det.appendChild(grille);
    return det;
  }

  // --- séance de révision -------------------------------------------------------------
  function revision(file, f) {
    file = file.slice();
    let faites = 0, reussies = 0, avertiPause = false;
    const gains = {};
    const total = () => faites + file.length;

    const zone = H.el("div.revision");
    conteneur.innerHTML = "";
    conteneur.appendChild(zone);

    const fin = () => {
      // la séance est finie : le clavier ne répond plus à aucune carte
      clavier = null;
      zone.innerHTML = "";
      if (H.journal && faites) H.journal.noter("cartes:" + Date.now(), "j’ai révisé " + faites + " flashcartes, et j’en ai réussi " + reussies);
      zone.appendChild(H.el("div.carte.carte-fin", null,
        H.el("h2", null, "Séance terminée"),
        H.el("p", null, faites + " réponses, dont " + reussies + " réussies."),
        Object.keys(gains).length
          ? H.el("p.gains", null, "Gagné : ", Object.entries(gains).map(([k, n]) => H.el("span.gain", null, H.el("img", { src: H.ressources.icone(k, 2), alt: "" }), "+" + n + " ")))
          : null,
        H.el("div.boutons-bas", null,
          H.el("a.bouton", { href: "#terrain" }, "Aller au terrain"),
          H.el("button.bouton", { type: "button", onclick: () => accueil([]) }, "Retour aux flashcartes")
        )
      ));
    };

    const suivante = () => {
      if (!file.length) return fin();
      const c = file.shift();
      const s = etat(c.id);
      zone.innerHTML = "";
      const progression = H.el("div.progression", null,
        H.el("span", null, (faites + 1) + " / " + (total() + 1)),
        H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: fin }, "Arrêter là")
      );
      const carte = H.el("div.carte", { tabindex: "0" });
      const recto = H.el("div.recto", null, c.recto());
      carte.appendChild(recto);
      if (s && estFragile(s)) carte.appendChild(H.el("span.marque-fragile", null, "fragile"));
      // les choix multiples : on coche, puis « Valider »
      const choisis = new Set();
      let choixEl = null, valide = !c.choix;
      if (c.choix) {
        choixEl = H.el("div.choix-carte", null,
          H.el("p.aide-choix", null, c.choix.plusieurs ? "Coche toutes les bonnes réponses." : "Une seule bonne réponse."),
          H.el("div.pastilles-choix", null, c.choix.options.map((o) => H.el("button.pastille-choix", { type: "button", "data-choix": o, onclick(e) {
            e.stopPropagation();
            if (valide) return;
            if (!c.choix.plusieurs) { choisis.clear(); choixEl.querySelectorAll(".choisi").forEach((b) => b.classList.remove("choisi")); }
            if (choisis.has(o)) choisis.delete(o); else choisis.add(o);
            this.classList.toggle("choisi", choisis.has(o));
          } }, o))));
        carte.appendChild(choixEl);
      }
      const verso = H.el("div.verso", { hidden: true }, c.choix ? null : c.verso());
      carte.appendChild(verso);
      const boutons = H.el("div.reponses", { hidden: true });
      const maintenant = H.maintenant();
      NOTES.forEach(({ n, nom }) => {
        const apres = prochainEtat(s, n, maintenant);
        // la touche du clavier qui donne la même réponse, écrite sur le bouton
        boutons.appendChild(H.el("button.bouton.note-" + n, { type: "button", onclick: () => repondre(n), title: "Touche " + (n + 1) },
          H.el("kbd.touche", null, String(n + 1)), H.el("span", null, nom), H.el("span.delai", null, duree(apres.due - maintenant))));
      });
      const retourner = H.el("button.bouton.retourner", { type: "button", onclick: montrer, title: "Touche Espace ou Entrée" }, c.choix ? "Valider" : "Voir la réponse", H.el("kbd.touche", null, "espace"));
      zone.append(progression, carte, retourner, boutons);
      carte.addEventListener("click", () => !c.choix && verso.hidden && montrer());
      carte.focus({ preventScroll: true });

      function montrer() {
        if (c.choix && !valide) {
          // chaque choix dit s'il était juste, oublié ou faux ; la note proposée en découle
          valide = true;
          let oublis = 0, fautes = 0;
          choixEl.querySelectorAll(".pastille-choix").forEach((b) => {
            const o = b.dataset.choix, bon = c.choix.bonnes.includes(o), pris = choisis.has(o);
            if (bon && pris) b.classList.add("juste");
            else if (bon) { b.classList.add("oubli"); oublis++; }
            else if (pris) { b.classList.add("faux"); fautes++; }
            else b.classList.add("ecarte");
          });
          const erreurs = oublis + fautes, n = erreurs === 0 ? 3 : erreurs === 1 && c.choix.plusieurs ? 1 : 0;
          const bouton = boutons.querySelector(".note-" + n);
          if (bouton) bouton.classList.add("suggere");
          choixEl.querySelector(".aide-choix").textContent = erreurs === 0 ? "Tout juste !" : (oublis ? oublis + " oubliée" + (oublis > 1 ? "s" : "") : "") + (oublis && fautes ? ", " : "") + (fautes ? fautes + " en trop" : "") + ".";
        }
        verso.hidden = false;
        boutons.hidden = false;
        retourner.remove();
      }
      let repondu = false;
      function repondre(n) {
        // une seule réponse par carte (un double clic ou une touche gardée enfoncée ne comptent pas)
        if (repondu) return;
        repondu = true;
        const nouvel = prochainEtat(etat(c.id), n, H.maintenant());
        H.jeu.cartes = H.jeu.cartes || {};
        H.jeu.cartes[c.id] = nouvel;
        H.d.changer("jeu");
        faites++;
        if (n > 0) reussies++;
        const g = H.ressources.recompenser(c, n);
        if (g.pause) {
          // pendant la pause, pas de récompense : on le dit une fois par séance
          if (!avertiPause) {
            avertiPause = true;
            H.toast("ƟvƟ se repose : les cartes ne rapportent plus rien pendant encore " + duree(H.ressources.seance().pauseJusqua - H.maintenant()) + ". Une crêpe au chocolat fondu met fin à la pause.", 6000);
          }
        } else {
          for (const [k, v] of Object.entries(g)) if (typeof v === "number" && k !== "energie") gains[k] = (gains[k] || 0) + v;
          if (g.crepe) H.toast("Une crêpe au chocolat fondu pour ƟvƟ !");
          if (g.pauseCommence) H.toast("Belle séance ! ƟvƟ va se reposer un peu.", 4000);
        }
        // une carte ratée ou difficile en apprentissage revient dans la séance
        if (nouvel.due - H.maintenant() < 20 * MIN) file.splice(Math.min(file.length, 3 + Math.floor(Math.random() * 3)), 0, c);
        suivante();
      }
      clavier = (e) => {
        if (e.repeat || e.target.closest("input, textarea, select")) return;
        if (e.key === " " || e.key === "Enter") {
          if (verso.hidden) {
            e.preventDefault();
            montrer();
          }
        } else if (!verso.hidden && ["1", "2", "3", "4"].includes(e.key)) {
          repondre(parseInt(e.key, 10) - 1);
        }
      };
    };
    suivante();
  }

  let clavier = null;
  document.addEventListener("keydown", (e) => {
    if (clavier && document.documentElement.dataset.vue === "cartes" && H.$(".revision")) clavier(e);
  });

  H.vues.cartes = {
    afficher(c, params) {
      conteneur = c;
      accueil(params);
      requestAnimationFrame(() => requestAnimationFrame(() => window.scrollTo(0, 0)));
    },
    mettreAJour(params) {
      accueil(params);
    },
    quitter() {
      conteneur = null;
      clavier = null;
    },
  };

  H.cartes = { toutesLesCartes, prochainEtat, duree };
})();
