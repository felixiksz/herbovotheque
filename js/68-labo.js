// Le labo : on y transforme les récoltes en préparations (séchage, teinture, macérat,
// distillation…) qui prennent du temps réel, puis on remplit les bocaux de l'herbothèque.
// On y infuse aussi les tisanes du placard : elles redonnent de l'énergie.
(function () {
  const H = window.H;
  const HEURE = 3600e3;
  const NB_POSTES = 6;
  // durée de chaque préparation (raccourcie pour le jeu) et ce qu'on fait au labo
  const FACONS = {
    "plante-seche": { heures: 8, geste: "Mettre à sécher", etat: "sèche sur la claie" },
    teinture: { heures: 48, geste: "Mettre à macérer dans l’alcool", etat: "macère dans l’alcool" },
    "huile-essentielle": { heures: 4, geste: "Distiller à l’alambic", etat: "dans l’alambic" },
    macerat: { heures: 48, geste: "Mettre à macérer dans l’huile", etat: "macère au soleil" },
    gemmotherapie: { heures: 24, geste: "Mettre les bourgeons à macérer", etat: "macère doucement" },
    elixir: { heures: 6, geste: "Préparer l’élixir au soleil", etat: "infuse au soleil" },
  };
  const COUT_CUEILLETTE = { energie: 3 };
  const COUT_PREPARATION = { energie: 2 };
  const INFUSION = 5 * 60e3;          // une tisane infuse cinq minutes
  const ENERGIE_TISANE = 12;
  const TASSES_PAR_CRAN = 3;          // trois tasses font baisser le bocal d'un cran

  function labo() {
    H.jeu.labo = H.jeu.labo || {};
    const l = H.jeu.labo;
    l.recoltes = l.recoltes || {};
    l.postes = l.postes || [];
    while (l.postes.length < NB_POSTES) l.postes.push(null);
    l.usages = l.usages || {};
    return l;
  }
  function sauver() {
    H.jeu.laboModifieLe = H.maintenant();
    H.d.changer("jeu");
  }
  const duree = (ms) => H.cartes.duree(Math.max(0, ms));
  const avancement = (poste) => Math.min(1, (H.maintenant() - poste.le) / (FACONS[poste.prep].heures * HEURE));
  const moisCourant = () => new Date().getMonth() + 1;

  // pour le terrain : une récolte sur une île arrive au labo
  function ajouterRecolte(id, n) {
    const l = labo();
    l.recoltes[id] = (l.recoltes[id] || 0) + (n || 1);
    sauver();
  }

  let conteneur = null;
  function dessiner() {
    if (!conteneur) return;
    const l = labo();
    conteneur.innerHTML = "";
    conteneur.appendChild(H.el("div.herbo-tete", null,
      H.el("h1", null, "Labo"),
      H.el("p.discret", null, "Les récoltes des îles et les cueillettes arrivent ici. On les fait sécher, macérer ou distiller, et quand c’est prêt, on remplit les bocaux de l’herbothèque. On y infuse aussi les tisanes du placard.")
    ));

    // les récoltes en attente
    const recoltes = Object.entries(l.recoltes).filter(([id, n]) => n > 0 && H.d.plante(id));
    const ongletRecoltes = [
      recoltes.length
        ? H.el("div.pastilles", null, recoltes.map(([id, n]) => H.el("span.pastille-valeur", null, H.d.plante(id).nom + " × " + n)))
        : H.el("p.discret", null, "Pas encore de récolte. Récolte une plante sur une île, ou va cueillir dans la nature."),
      H.el("div.pastilles", null,
        H.el("button.bouton.petit", { type: "button", onclick: cueillir }, "Aller cueillir dans la nature (" + H.quantiteTexte("energie", COUT_CUEILLETTE.energie) + ")")),
    ];

    // les postes de préparation
    const grille = H.el("div.grille-pots.grille-labo");
    l.postes.forEach((poste, i) => {
      const p = poste && H.d.plante(poste.p);
      const prep = poste && H.d.preparation(poste.prep);
      if (!poste || !p || !prep || !FACONS[poste.prep]) {
        l.postes[i] = null;
        grille.appendChild(H.el("button.pot.pot-vide", { type: "button", onclick: () => preparer(i) },
          H.el("img", { src: H.aqua.bocal("bocal", "#d9cbb0", "vide"), alt: "" }),
          H.el("span.nom-pot", null, "Préparer ici")));
        return;
      }
      const a = avancement(poste);
      const prete = a >= 1;
      const niveau = prete ? "plein" : a >= 0.66 ? "moitie" : a >= 0.25 ? "presque-vide" : "vide";
      const reste = FACONS[poste.prep].heures * HEURE - (H.maintenant() - poste.le);
      grille.appendChild(H.el("div.pot" + (prete ? ".pret" : ""), null,
        H.el("img", { src: H.aqua.bocal(prep.forme, H.aqua.teintePlante(p), niveau), alt: "" }),
        H.el("span.nom-pot", null, p.nom),
        H.el("span.etat-pot", null, prep.nom + " · " + (prete ? "prête" : FACONS[poste.prep].etat)),
        prete
          ? H.el("button.bouton.petit.actif", { type: "button", onclick: () => mettreEnBocal(i) }, "Remplir le bocal")
          : H.el("span.reste", null, "encore " + duree(reste))
      ));
    });
    // trois onglets : ce qui attend, ce qui se prépare, la tisane
    const enCours = l.postes.filter(Boolean).length;
    conteneur.appendChild(H.bureau.onglets([
      { nom: "Les récoltes" + (recoltes.length ? " (" + recoltes.length + ")" : ""), el: ongletRecoltes },
      { nom: "Les préparations" + (enCours ? " (" + enCours + ")" : ""), el: grille },
      { nom: "Une tisane", el: sectionTisane(l) },
    ], { cle: "labo" }));
  }

  function sectionTisane(l) {
    const t = l.tisane;
    if (t) {
      const melange = (H.herbier.tisanes || {})[t.id];
      const reste = INFUSION - (H.maintenant() - t.le);
      if (!melange) {
        l.tisane = null;
      } else if (reste > 0) {
        return H.el("p", null, "« " + melange.nom + " » infuse… encore " + duree(reste) + ".");
      } else {
        return H.el("div", null,
          H.el("p", null, "« " + melange.nom + " » est prête, bien chaude."),
          H.el("button.bouton.petit.actif", { type: "button", onclick: boire }, "Boire la tisane"));
      }
    }
    const melanges = Object.values(H.herbier.tisanes || {}).filter((x) => !x.supprime && (x.plantes || []).length);
    if (!melanges.length) return H.el("p.discret", null, "Compose d’abord un mélange dans le placard à tisanes de l’herbothèque.");
    return H.el("div.pastilles", null, melanges.map((m) => {
      const vides = m.plantes.map((x) => H.d.plante(x.id)).filter((p) => p && H.d.stock(p, "plante-seche") === "vide");
      return H.el("button.bouton.petit", {
        type: "button",
        title: vides.length ? "Bocal vide : " + vides.map((p) => p.nom).join(", ") : "Infuser cinq minutes",
        onclick: () => infuser(m, vides),
      }, m.nom);
    }));
  }

  // cueillir dans la nature : les plantes dont c'est le mois de récolte
  function cueillir() {
    const mois = moisCourant();
    const saison = H.d.plantes().filter((p) => ((p.valeurs || {}).moisRecolte || []).includes(mois));
    if (!saison.length) {
      H.dialogue.dire([{ qui: "ovo", texte: "Rien à cueillir dans la nature ce mois-ci. Je reviendrai le mois prochain !" }]);
      return;
    }
    H.choisirPlantes([], (ids) => {
      const id = ids[0];
      if (!id) return;
      if (!H.ressources.depenser(COUT_CUEILLETTE)) {
        H.dialogue.dire([{ qui: "ovo", texte: "Il me manque de l’énergie pour aller cueillir. Une tisane ou quelques flashcartes, et j’y vais !" }]);
        return;
      }
      ajouterRecolte(id, 2);
      H.bruit("recolte");
      if (H.journal) H.journal.noter("cueillir", "je suis allé·e cueillir dans la nature : ", H.leNom(H.d.plante(id)), "");
      H.toast("Cueillette : " + H.leNom(H.d.plante(id)) + " (2 récoltes)");
      dessiner();
    }, "Que cueillir ce mois-ci ?", {
      un: true,
      filtre: (p) => saison.includes(p),
      detail: (p) => (H.d.aRemplir(p) ? H.el("span.bon-mois", null, "bocal à remplir") : null),
    });
  }

  // lancer une préparation sur un poste libre
  function preparer(i) {
    const l = labo();
    const dispo = Object.entries(l.recoltes).filter(([id, n]) => n > 0 && H.d.plante(id)).map(([id]) => H.d.plante(id));
    if (!dispo.length) {
      H.dialogue.dire([{ qui: "ovo", texte: "Il me faut d’abord une récolte : sur une île, ou en allant cueillir dans la nature." }]);
      return;
    }
    const corps = H.el("div.choix-labo");
    let fermer;
    corps.appendChild(H.el("h2", null, "Que préparer ?"));
    for (const p of dispo.sort((a, b) => a.nom.localeCompare(b.nom, "fr"))) {
      const preps = (p.preparations || []).filter((id) => FACONS[id] && H.d.preparation(id));
      if (!preps.length) continue;
      corps.appendChild(H.el("div.ligne-labo", null,
        H.el("strong", null, p.nom + " "),
        H.el("span.discret", null, "(" + l.recoltes[p.id] + " récolte" + (l.recoltes[p.id] > 1 ? "s" : "") + ")"),
        H.el("div.pastilles", null, preps.map((id) => {
          const prep = H.d.preparation(id);
          const niveau = H.d.stock(p, id);
          return H.el("button.bouton.petit" + (["vide", "presque-vide"].includes(niveau) ? ".actif" : ""), {
            type: "button",
            title: "Bocal : " + (H.d.NIVEAUX.find(([n]) => n === niveau) || [, ""])[1].toLowerCase() + " · " + FACONS[id].heures + " h",
            onclick() {
              if (!H.ressources.depenser(COUT_PREPARATION)) {
                fermer();
                H.dialogue.dire([{ qui: "ovo", texte: "Il me manque de l’énergie pour ça. Je me repose un peu et je reviens !" }]);
                return;
              }
              l.recoltes[p.id]--;
              l.postes[i] = { p: p.id, prep: id, le: H.maintenant() };
              sauver();
              if (H.journal) H.journal.noter("labo:" + id, "au labo, j’ai mis en route : " + FACONS[id].geste.toLowerCase() + " ", H.leNom(p).toLowerCase());
              H.bruit("plante");
              H.toast(FACONS[id].geste + " : " + H.leNom(p) + " (prêt dans " + FACONS[id].heures + " h)");
              fermer();
              dessiner();
            },
          }, prep.nom);
        }))
      ));
    }
    corps.appendChild(H.el("p.discret", null, "Chaque préparation coûte " + H.quantiteTexte("energie", COUT_PREPARATION.energie) + ". En orange : les bocaux presque vides ou vides."));
    fermer = H.fenetre(corps);
  }

  function mettreEnBocal(i) {
    const l = labo();
    const poste = l.postes[i];
    const p = H.d.plante(poste.p), prep = H.d.preparation(poste.prep);
    H.d.fixerStock(poste.p, poste.prep, "plein");
    if (H.journal) H.journal.noter("bocal", "au labo, j’ai rempli des bocaux : ", prep.nom.toLowerCase() + " " + H.duNom(p), "");
    l.postes[i] = null;
    sauver();
    H.bruit("recolte");
    H.toast("Bocal rempli : " + p.nom + " (" + prep.nom.toLowerCase() + ")");
    dessiner();
  }

  function infuser(m, vides) {
    if (vides.length) {
      H.dialogue.dire([{ qui: "ovo", texte: "Le bocal " + (H.genre(vides[0]).elision ? "d’" : "de ") + H.nomPhrase(vides[0]) + " est vide… Il faut d’abord en refaire au labo." }]);
      return;
    }
    labo().tisane = { id: m.id, le: H.maintenant() };
    sauver();
    H.bruit("eau");
    if (H.journal) H.journal.noter("tisane", "j’ai infusé une tisane : ", "« " + m.nom + " »", "");
    dessiner();
  }

  // boire : de l'énergie, et les bocaux de plantes sèches baissent doucement
  async function boire() {
    const l = labo();
    const m = (H.herbier.tisanes || {})[l.tisane.id];
    l.tisane = null;
    for (const x of (m && m.plantes) || []) {
      const p = H.d.plante(x.id);
      if (!p) continue;
      l.usages[x.id] = (l.usages[x.id] || 0) + 1;
      if (l.usages[x.id] >= TASSES_PAR_CRAN) {
        l.usages[x.id] = 0;
        const ordre = H.d.NIVEAUX.map(([n]) => n);
        const i = ordre.indexOf(H.d.stock(p, "plante-seche"));
        if (i >= 0 && i < ordre.length - 1) H.d.fixerStock(p.id, "plante-seche", ordre[i + 1]);
      }
    }
    sauver();
    H.ressources.gagnerEnergie(ENERGIE_TISANE);
    dessiner();
    await H.dialogue.dire([{ qui: "ovo", texte: H.histoires.auHasard(["Mmmh, ça sent la garrigue.", "Une gorgée, et tout va mieux.", "Je la bois tant qu’elle est chaude."]) + " (+" + ENERGIE_TISANE + " d’énergie)" }]);
  }

  // pour la ferme : la fumée sort du tuyau de poêle quand une préparation est en cours
  function enCours() {
    const l = labo();
    const t = l.tisane;
    return l.postes.some((p) => p && FACONS[p.prep] && avancement(p) < 1) || !!(t && t.le && H.maintenant() - t.le < INFUSION);
  }
  H.labo = { ajouterRecolte, enCours };

  H.vues.labo = {
    afficher(c) {
      conteneur = c;
      dessiner();
    },
    quitter() {
      conteneur = null;
    },
  };
  setInterval(() => conteneur && document.documentElement.dataset.vue === "labo" && dessiner(), 30e3);
})();
