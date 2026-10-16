// L'herbothèque : des étagères en bois, un bocal par plante, rangés comme ƟvƟ veut.
(function () {
  const H = window.H;

  H.rangementsParDefaut = () => [
    { id: "famille", nom: "Par famille botanique", type: "champ", champ: "famille" },
    { id: "spheres", nom: "Par sphère d’action", type: "champ", champ: "spheres" },
    { id: "preparations", nom: "Par préparation", type: "preparation" },
    { id: "alpha", nom: "De A à Z", type: "alpha" },
    { id: "mes-etageres", nom: "Mes étagères", type: "manuel", etageres: [{ id: "preferees", nom: "Mes préférées", plantes: [] }] },
  ];

  const etat = { recherche: "", partout: false, aVerifier: false, aRemplir: false };

  function rangementActif() {
    const h = H.herbier;
    return h.rangements.find((r) => r.id === h.rangementActif) || h.rangements[0];
  }

  const prepPrincipale = (p) => p.preparationPrincipale || (p.preparations || [])[0] || "plante-seche";
  function formePrincipale(p) {
    const prep = H.d.preparation(prepPrincipale(p));
    return prep ? prep.forme : "bocal";
  }

  function texteDe(v) {
    if (v == null) return "";
    if (Array.isArray(v)) return v.join(" ");
    return String(v);
  }

  function correspond(p, q) {
    if (etat.aVerifier && !(p.aVerifier || []).length) return false;
    if (etat.aRemplir && !H.d.aRemplir(p)) return false;
    if (!q) return true;
    const cible = [p.nom, p.latin, p.valeurs && p.valeurs.nomsCommuns].join(" ");
    if (H.sansAccents(cible).includes(q)) return true;
    if (!etat.partout) return false;
    return Object.values(p.valeurs || {}).some((v) => H.sansAccents(texteDe(v)).includes(q));
  }

  // Groupes d'étagères pour un rangement : [{nom, plantes:[{plante, forme}]}]
  function grouper(rg, plantes) {
    const groupes = new Map();
    const ajouter = (nom, p, forme, prepId) => {
      if (!groupes.has(nom)) groupes.set(nom, []);
      groupes.get(nom).push({ plante: p, forme: forme || formePrincipale(p), prep: prepId || prepPrincipale(p) });
    };
    if (rg.type === "alpha") {
      for (const p of plantes) ajouter(H.sansAccents(p.nom).charAt(0).toUpperCase() || "?", p);
    } else if (rg.type === "preparation") {
      for (const prep of H.d.preparations()) groupes.set(prep.nom, []);
      for (const p of plantes) {
        for (const id of p.preparations || []) {
          const prep = H.d.preparation(id);
          if (prep) ajouter(prep.nom, p, prep.forme, prep.id);
        }
      }
    } else if (rg.type === "manuel") {
      const places = new Set();
      for (const et of rg.etageres || []) {
        groupes.set(et.nom, []);
        for (const id of et.plantes) {
          const p = plantes.find((x) => x.id === id);
          if (p) {
            ajouter(et.nom, p);
            places.add(id);
          }
        }
      }
      if (!etat.recherche) {
        const reste = plantes.filter((p) => !places.has(p.id));
        if (reste.length) groupes.set("Pas encore rangées", reste.map((p) => ({ plante: p, forme: formePrincipale(p), prep: prepPrincipale(p) })));
      }
    } else {
      const champ = H.d.champ(rg.champ);
      if (champ && champ.options) for (const o of champ.options) groupes.set(o, []);
      for (const p of plantes) {
        let v = (p.valeurs || {})[rg.champ];
        if (v == null || v === "" || (Array.isArray(v) && !v.length)) {
          ajouter("Sans " + (champ ? champ.nom.toLowerCase() : "valeur"), p);
          continue;
        }
        if (!Array.isArray(v)) v = [String(v).split(/[;,]/)[0].trim()];
        for (const x of v) ajouter(x, p);
      }
    }
    let liste = Array.from(groupes, ([nom, pl]) => ({ nom, plantes: pl }));
    if (etat.recherche || rg.type !== "manuel") liste = liste.filter((g) => g.plantes.length);
    if (rg.type === "champ") {
      const champ = H.d.champ(rg.champ);
      if (!champ || !champ.options) liste.sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    }
    // l'ordre choisi à la main dans « Organiser » passe avant l'ordre automatique
    if (rg.type !== "manuel" && rg.ordre && rg.ordre.length) {
      const rang = (nom) => {
        const i = rg.ordre.indexOf(nom);
        return i < 0 ? 1e6 : i;
      };
      liste = liste.map((g, i) => [g, i]).sort((a, b) => rang(a[0].nom) - rang(b[0].nom) || a[1] - b[1]).map(([g]) => g);
    }
    return liste;
  }

  function bocal(item) {
    const p = item.plante;
    const niveau = H.d.stock(p, item.prep);
    const img = H.el("img", {
      src: H.aqua.bocal(item.forme, H.aqua.teintePlante(p), niveau),
      alt: "",
      loading: "lazy",
      class: "bocal-image forme-" + item.forme,
    });
    return H.el(
      "a.bocal",
      { href: "#fiche/" + encodeURIComponent(p.id), title: p.nom + (p.latin ? " – " + p.latin : ""), "data-forme": item.forme },
      H.el("span.bocal-cadre", null, img),
      H.el("span.etiquette", { lang: "fr" }, p.nom),
      niveau === "vide" || niveau === "presque-vide" ? H.el("span.niveau-bas", null, niveau === "vide" ? "vide" : "presque vide") : null
    );
  }

  function etagere(groupe, rg) {
    const titre = H.el("h2.etagere-titre", null, H.el("span.etiquette-kraft", null, groupe.nom), H.el("span.compte", null, String(groupe.plantes.length)));
    const rangee = H.el("div.rangee", null, groupe.plantes.map(bocal));
    const et = rg.type === "manuel" ? (rg.etageres || []).find((e) => e.nom === groupe.nom) : null;
    if (et) {
      rangee.appendChild(
        H.el(
          "button.bouton.petit.ajouter-bocal",
          { type: "button", onclick: () => H.choisirPlantes(et.plantes, (ids) => majEtagere(rg, et, ids), "Plantes de l’étagère « " + et.nom + " »") },
          "Choisir les plantes"
        )
      );
    }
    return H.el("section.etagere", { style: "--n:" + Math.max(1, groupe.plantes.length + (et ? 1 : 0)) }, titre, rangee);
  }

  function majEtagere(rg, et, ids) {
    et.plantes = ids;
    H.herbier.rangementsModifieLe = H.maintenant();
    H.d.changer("herbier");
    dessiner();
  }

  let conteneurEtageres = null;
  let generation = 0;
  let resume = null;
  let zoneDossiers = null, titreFenetre = null;
  const COULEURS_DOSSIERS = ["#eeff41", "#ffb3a8", "#cfe8a4", "#c9c2ff", "#ffd6a0", "#a8e4ec"];
  // une icône de dossier, dans les couleurs du bureau
  const dossierSVG = (couleur) =>
    '<svg width="54" height="40" viewBox="0 0 58 44" aria-hidden="true"><path d="M2 8 h20 l5 5 h29 v29 h-54 z" fill="' + couleur + '" stroke="#23214a" stroke-width="2" stroke-linejoin="round"/><path d="M2 16 h54" stroke="#23214a" stroke-width="2"/></svg>';

  function dessiner() {
    if (!conteneurEtageres) return;
    const rg = rangementActif();
    const q = H.sansAccents(etat.recherche.trim());
    const plantes = H.d.plantes().filter((p) => correspond(p, q));
    const tousGroupes = grouper(rg, plantes);
    // les dossiers du bureau : un par étagère, et « Toutes » pour tout voir
    if (etat.dossier && !tousGroupes.some((g) => g.nom === etat.dossier)) etat.dossier = null;
    if (zoneDossiers) {
      zoneDossiers.innerHTML = "";
      const dossier = (nom, n, i) => H.el("button.dossier" + ((etat.dossier || null) === nom ? ".ouvert" : ""), {
        type: "button",
        onclick() {
          etat.dossier = nom;
          dessiner();
        },
      }, H.el("span.icone-dossier", { html: dossierSVG(nom ? COULEURS_DOSSIERS[i % COULEURS_DOSSIERS.length] : "#f2f0e8") }), H.el("span.nom-dossier", null, (nom || "Toutes") + " (" + n + ")"));
      zoneDossiers.appendChild(dossier(null, plantes.length, 0));
      tousGroupes.forEach((g, i) => zoneDossiers.appendChild(dossier(g.nom, g.plantes.length, i)));
    }
    const groupes = etat.dossier ? tousGroupes.filter((g) => g.nom === etat.dossier) : tousGroupes;
    if (titreFenetre) titreFenetre.textContent = (etat.dossier || "Toutes les étagères") + " — " + groupes.reduce((a, g) => a + g.plantes.length, 0) + " bocaux";
    conteneurEtageres.innerHTML = "";
    if (!plantes.length) {
      conteneurEtageres.appendChild(H.el("p.discret", null, "Aucune plante ne correspond à « " + etat.recherche + " »."));
    }
    // les étagères se dessinent par petits paquets pour rester fluide sur téléphone
    let i = 0;
    const cible = conteneurEtageres;
    const tour = ++generation;
    const paquet = () => {
      // on a quitté la page, ou les étagères ont été redessinées entre-temps
      if (cible !== conteneurEtageres || tour !== generation) return;
      const fin = Math.min(i + 4, groupes.length);
      for (; i < fin; i++) cible.appendChild(etagere(groupes[i], rg));
      if (i < groupes.length) requestAnimationFrame(paquet);
    };
    paquet();
    resume.textContent = plantes.length + (plantes.length > 1 ? " plantes" : " plante") + " · " + groupes.length + (groupes.length > 1 ? " étagères" : " étagère");
  }

  H.vues.herbotheque = {
    afficher(c) {
      const rgSelect = H.el(
        "select",
        {
          id: "choix-rangement",
          onchange(e) {
            H.herbier.rangementActif = e.target.value;
            H.herbier.rangementsModifieLe = H.maintenant();
            H.d.changer("herbier");
            dessiner();
          },
        },
        H.herbier.rangements.map((r) => H.el("option", { value: r.id, selected: r.id === rangementActif().id }, r.nom))
      );
      const champRecherche = H.el("input", {
        type: "search",
        placeholder: "Chercher une plante",
        value: etat.recherche,
        "aria-label": "Chercher une plante",
        oninput: H.anti((e) => {
          etat.recherche = e.target.value;
          dessiner();
        }, 180),
      });
      const partout = H.el("label.case", null,
        H.el("input", { type: "checkbox", checked: etat.partout, onchange: (e) => { etat.partout = e.target.checked; dessiner(); } }),
        " aussi dans le texte des fiches"
      );
      const filtreVerif = H.el("label.case", null,
        H.el("input", { type: "checkbox", checked: etat.aVerifier, onchange: (e) => { etat.aVerifier = e.target.checked; dessiner(); } }),
        " seulement les fiches qui ont des rubriques à vérifier"
      );
      const filtreStock = H.el("label.case", null,
        H.el("input", { type: "checkbox", checked: etat.aRemplir, onchange: (e) => { etat.aRemplir = e.target.checked; dessiner(); } }),
        " seulement les bocaux presque vides ou vides"
      );
      resume = H.el("p.discret.resume");
      const heure = H.el("span.heure-bureau");
      const majHeure = () => (heure.textContent = new Date().toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" }));
      majHeure();
      zoneDossiers = H.el("nav.dossiers-bureau", { "aria-label": "Étagères" });
      titreFenetre = H.el("span");
      conteneurEtageres = H.el("div.etageres", { style: "--planche:url(" + H.aqua.planche() + ")" });
      c.appendChild(H.el("div.bureau-herbo", null,
        // la barre de menu, comme sur un vieil ordinateur
        H.el("div.barre-bureau", null,
          H.el("b", null, "Herbothèque"),
          H.el("button.menu-bureau", { type: "button", onclick: nouvellePlante }, "Ajouter une plante"),
          H.el("a.menu-bureau", { href: "#tisanes" }, H.monde === "mesi" ? "Mes formules" : "Placard à tisanes"),
          H.el("button.menu-bureau", { type: "button", onclick: () => H.organiser && H.organiser() }, "Organiser"),
          H.el("button.menu-bureau", { type: "button", onclick: exporterVisible }, "Exporter"),
          H.el("label.menu-bureau", null, "Ranger ", rgSelect),
          heure
        ),
        H.el("div.corps-bureau", null,
          zoneDossiers,
          H.el("section.fenetre-bureau", null,
            H.el("div.titre-fenetre", null, H.el("button.fermer-fenetre", { type: "button", "aria-label": "Voir toutes les étagères", onclick: () => { etat.dossier = null; dessiner(); } }, "×"), titreFenetre),
            H.el("div.contenu-fenetre", null,
              H.el("div.herbo-outils", null, H.el("div.recherche", null, champRecherche, partout, filtreVerif, filtreStock)),
              resume,
              conteneurEtageres
            )
          )
        )
      ));
      dessiner();
    },
    quitter() {
      conteneurEtageres = null;
      zoneDossiers = null;
      titreFenetre = null;
    },
  };

  H.sur("donnees", (quoi) => {
    if (quoi === "herbier" && conteneurEtageres && document.documentElement.dataset.vue === "herbotheque") dessiner();
  });
  H.herbotheque = { redessiner: () => dessiner() };
  // Groupes d'un rangement (pour choisir quoi réviser) : [{nom, ids}]
  H.groupesDe = (rg) => grouper(rg, H.d.plantes()).map((g) => ({ nom: g.nom, ids: g.plantes.map((x) => x.plante.id) }));

  function nouvellePlante() {
    const champ = H.el("input", { type: "text", placeholder: "Nom de la plante", required: true });
    const latin = H.el("input", { type: "text", placeholder: "Nom latin (facultatif)" });
    const msg = H.el("p.discret.erreur");
    let fermer;
    const form = H.el(
      "form.formulaire",
      {
        onsubmit(e) {
          e.preventDefault();
          const nom = champ.value.trim();
          if (!nom) {
            msg.textContent = "Donne un nom à la plante.";
            return;
          }
          const p = H.d.ajouterPlante(nom);
          if (latin.value.trim()) H.d.majPlante(p.id, (x) => (x.latin = latin.value.trim()));
          fermer();
          H.aller("fiche/" + encodeURIComponent(p.id));
        },
      },
      H.el("h2", null, "Nouvelle plante"),
      H.el("label", null, "Nom", champ),
      H.el("label", null, "Nom latin", latin),
      msg,
      H.el("button.bouton", { type: "submit" }, "Créer la fiche")
    );
    fermer = H.fenetre(form);
    champ.focus();
  }

  function exporterVisible() {
    const q = H.sansAccents(etat.recherche.trim());
    H.exporterPlantes(H.d.plantes().filter((p) => correspond(p, q)), "herbotheque");
  }

  // --- export de listes de plantes (herbothèque, îles, tisanes) ---------------
  H.exporterPlantes = function (plantes, nomFichier, quantites) {
    const champs = ["famille", "cycle", "exposition", "sol", "arrosage", "rusticite", "hauteur", "espacement", "moisFloraison"]
      .map((id) => H.d.champ(id))
      .filter(Boolean);
    const cell = (v) => {
      if (Array.isArray(v)) v = v.map((x) => (typeof x === "number" ? H.MOIS[x - 1] : x)).join(", ");
      v = v == null ? "" : String(v).replace(/\*\*/g, "");
      return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    };
    const lignes = [["Plante", "Nom latin"].concat(quantites ? ["Quantité"] : [], champs.map((c) => c.nom)).map(cell).join(";")];
    for (const p of plantes) {
      lignes.push(
        [p.nom, p.latin]
          .concat(quantites ? [quantites[p.id] || ""] : [], champs.map((c) => (p.valeurs || {})[c.id]))
          .map(cell)
          .join(";")
      );
    }
    // en UTF-8 simple : Numbers, Excel sur Mac et les tableurs en ligne lisent bien les accents
    const contenu = lignes.join("\n");
    H.telecharger(nomFichier + ".csv", contenu, "text/csv;charset=utf-8");
    H.toast("Liste exportée (" + plantes.length + " plantes)");
  };

  // --- choisir des plantes dans une liste (étagères, îles, tisanes) -----------
  H.choisirPlantes = function (choisies, valider, titre, opts) {
    opts = opts || {};
    const sel = new Set(choisies);
    const recherche = H.el("input", { type: "search", placeholder: "Chercher", "aria-label": "Chercher une plante" });
    const liste = H.el("div.liste-choix");
    const dessinerListe = () => {
      const q = H.sansAccents(recherche.value.trim());
      liste.innerHTML = "";
      for (const p of H.d.plantes()) {
        if (q && !H.sansAccents(p.nom + " " + p.latin).includes(q)) continue;
        if (opts.filtre && !opts.filtre(p)) continue;
        liste.appendChild(
          H.el(
            "label.choix-plante",
            null,
            H.el("input", {
              type: opts.un ? "radio" : "checkbox",
              name: "choix-plante",
              checked: sel.has(p.id),
              onchange(e) {
                if (opts.un) sel.clear();
                e.target.checked ? sel.add(p.id) : sel.delete(p.id);
              },
            }),
            " ",
            H.el("span", null, p.nom),
            p.latin ? H.el("em.discret", null, " " + p.latin) : null,
            opts.detail ? opts.detail(p) : null
          )
        );
      }
    };
    recherche.addEventListener("input", dessinerListe);
    dessinerListe();
    let fermer;
    const corps = H.el(
      "div.choisir-plantes",
      null,
      H.el("h2", null, titre || "Choisir des plantes"),
      recherche,
      liste,
      H.el(
        "div.boutons-bas",
        null,
        H.el("button.bouton", { type: "button", onclick: () => { fermer(); valider(Array.from(sel)); } }, "Valider")
      )
    );
    fermer = H.fenetre(corps);
    recherche.focus();
  };
})();
