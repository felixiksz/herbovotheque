// La to-do liste d'ƟvƟ : des tâches avec ou sans échéance, rattachées (ou non) à un jardin et à
// une plante, qui peuvent revenir toutes seules (chaque semaine, chaque mois…). On les voit par
// moment (en retard, aujourd'hui, cette semaine, plus tard) ; les idées de saison viennent des
// fiches des plantes de ses jardins (ce qui se sème, se plante, se récolte ce mois-ci).
// Gardée dans la partie (H.jeu.taches), synchronisée.
(function () {
  const H = window.H;
  const JOUR = 864e5;
  const REPETITIONS = [["", "Une seule fois"], ["7", "Chaque semaine"], ["14", "Toutes les deux semaines"], ["mois", "Chaque mois"], ["365", "Chaque année"]];

  const taches = () => Object.values(H.jeu.taches || {}).filter((t) => !t.supprime);
  function enregistrer(t) {
    t.modifieLe = H.maintenant();
    H.jeu.taches = Object.assign({}, H.jeu.taches, { [t.id]: t });
    H.d.changer("jeu");
  }
  const debutJour = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return +x; };
  const dateCourte = (t) => new Date(t).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const iles = () => Object.values(H.jeu.iles || {}).filter((i) => i && !i.supprime);
  const nomIle = (id) => ((H.jeu.iles || {})[id] || {}).nom || "";

  // la prochaine échéance d'une tâche qui revient
  function suivante(t) {
    const d = new Date(t.echeance || Date.now());
    if (t.repetition === "mois") d.setMonth(d.getMonth() + 1);
    else d.setTime(d.getTime() + parseInt(t.repetition, 10) * JOUR);
    return debutJour(d);
  }
  function cocher(t) {
    if (t.repetition && !t.fait) {
      // une tâche qui revient : on garde la trace, et elle repart à sa prochaine date
      t.faitesLe = (t.faitesLe || []).concat(H.maintenant()).slice(-20);
      t.echeance = suivante(t);
      H.toast("Fait ! Elle revient le " + dateCourte(t.echeance));
    } else {
      t.fait = !t.fait;
      t.faitLe = t.fait ? H.maintenant() : null;
    }
    enregistrer(t);
  }

  // les groupes, par moment
  function groupes(liste) {
    const auj = debutJour(Date.now()), semaine = auj + 7 * JOUR;
    const g = { retard: [], aujourdhui: [], semaine: [], plusTard: [], sansDate: [], faites: [] };
    for (const t of liste) {
      if (t.fait) g.faites.push(t);
      else if (!t.echeance) g.sansDate.push(t);
      else if (t.echeance < auj) g.retard.push(t);
      else if (t.echeance < auj + JOUR) g.aujourdhui.push(t);
      else if (t.echeance < semaine) g.semaine.push(t);
      else g.plusTard.push(t);
    }
    for (const k of Object.keys(g)) g[k].sort((a, b) => (a.echeance || 0) - (b.echeance || 0) || (a.creeLe || 0) - (b.creeLe || 0));
    g.faites.sort((a, b) => (b.faitLe || 0) - (a.faitLe || 0));
    return g;
  }

  // les idées du mois, d'après les fiches des plantes des jardins
  function ideesDeSaison() {
    const mois = new Date().getMonth() + 1, vues = new Set(), idees = [];
    const deja = new Set(taches().filter((t) => !t.fait).map((t) => t.titre));
    for (const ile of iles()) {
      for (const pl of Object.values(ile.plantes || {})) {
        const p = H.d.plante(pl.p);
        if (!p || vues.has(ile.id + p.id)) continue;
        vues.add(ile.id + p.id);
        const v = p.valeurs || {};
        for (const [champ, verbe] of [["moisSemis", "Semer"], ["moisPlantation", "Planter"], ["moisRecolte", "Récolter"]]) {
          if (!(v[champ] || []).includes(mois)) continue;
          const titre = verbe + " " + H.leNom(p);
          if (!deja.has(titre) && !idees.some((x) => x.titre === titre && x.ile === ile.id)) idees.push({ titre, ile: ile.id, plante: p.id });
        }
      }
    }
    return idees.slice(0, 24);
  }

  let conteneur = null, filtreIle = "", ouvert = null;

  function formulaire(t) {
    const nouvelle = !t;
    t = t ? Object.assign({}, t) : { id: H.uid("tache"), titre: "", creeLe: H.maintenant() };
    const titre = H.el("input", { type: "text", value: t.titre || "", placeholder: "Arroser les semis, tailler la lavande, envoyer le devis…", required: true });
    const date = H.el("input", { type: "date", value: t.echeance ? new Date(t.echeance - new Date(t.echeance).getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : "" });
    const rep = H.el("select", null, REPETITIONS.map(([v, n]) => H.el("option", { value: v, selected: (t.repetition || "") === v }, n)));
    const ile = H.el("select", null, H.el("option", { value: "" }, "Aucun jardin"), iles().map((i) => H.el("option", { value: i.id, selected: t.ile === i.id }, i.nom)));
    let plante = t.plante || null;
    const choixPlante = H.el("button.bouton.petit", { type: "button" });
    const majPlante = () => (choixPlante.textContent = plante && H.d.plante(plante) ? H.d.plante(plante).nom : "Choisir une plante");
    choixPlante.onclick = () => H.choisirPlantes(plante ? [plante] : [], (ids) => { plante = ids[ids.length - 1] || null; majPlante(); }, "La plante de la tâche");
    majPlante();
    const notes = H.el("textarea", { rows: 2, placeholder: "Notes" });
    notes.value = t.notes || "";
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire.form-tache", {
      onsubmit(e) {
        e.preventDefault();
        if (!titre.value.trim()) return;
        Object.assign(t, { titre: titre.value.trim(), echeance: date.value ? debutJour(date.value + "T12:00") : null, repetition: rep.value, ile: ile.value || null, plante, notes: notes.value.trim() });
        enregistrer(t);
        fermer();
        dessiner();
      },
    },
      H.el("h2", null, nouvelle ? "Nouvelle tâche" : "Modifier la tâche"),
      H.el("label", null, "La tâche", titre),
      H.el("div.ligne-option", null, H.el("label", null, "Pour le ", date), H.el("label", null, "Revient ", rep)),
      H.el("div.ligne-option", null, H.el("label", null, "Jardin ", ile), H.el("span", null, "Plante ", choixPlante)),
      H.el("label", null, "Notes", notes),
      H.el("div.boutons-bas", null,
        !nouvelle ? H.el("button.bouton.discret-bouton", { type: "button", onclick: () => { t.supprime = true; enregistrer(t); fermer(); dessiner(); } }, "Supprimer") : null,
        H.el("button.bouton", { type: "submit" }, nouvelle ? "Ajouter" : "Enregistrer"))
    ));
    titre.focus();
  }

  function ligne(t) {
    const p = t.plante && H.d.plante(t.plante);
    const retard = !t.fait && t.echeance && t.echeance < debutJour(Date.now());
    return H.el("li.tache" + (t.fait ? ".faite" : "") + (retard ? ".en-retard" : ""), null,
      H.el("label.case-tache", null,
        H.el("input", { type: "checkbox", checked: !!t.fait, onchange: () => { cocher(t); dessiner(); } }),
        H.el("span.titre-tache", null, t.titre)),
      H.el("span.infos-tache.discret", null,
        [t.echeance ? dateCourte(t.echeance) : null, t.repetition ? "↻ " + (REPETITIONS.find((r) => r[0] === t.repetition) || [0, ""])[1].toLowerCase() : null, t.ile ? nomIle(t.ile) : null].filter(Boolean).join(" · "),
        p ? H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, " · " + p.nom) : null),
      H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => formulaire(t) }, "Modifier")
    );
  }

  function dessiner() {
    if (!conteneur) return;
    const liste = taches().filter((t) => !filtreIle || t.ile === filtreIle);
    const g = groupes(liste);
    const bloc = (cle, titre, items, ferme) => {
      if (!items.length) return null;
      const det = H.el("details.groupe-taches.groupe-" + cle, { open: ouvert && cle in ouvert ? ouvert[cle] : !ferme });
      det.addEventListener("toggle", () => { ouvert = Object.assign({}, ouvert, { [cle]: det.open }); });
      det.append(H.el("summary", null, H.el("h3", null, titre + " (" + items.length + ")")), H.el("ul.liste-taches", null, items.map(ligne)));
      return det;
    };
    const idees = ideesDeSaison();
    conteneur.replaceChildren(...[
      H.el("div.barre-taches", null,
        H.el("button.bouton", { type: "button", onclick: () => formulaire() }, "Nouvelle tâche"),
        H.el("label.discret", null, "Jardin ", H.el("select", { onchange: (e) => { filtreIle = e.target.value; dessiner(); } },
          H.el("option", { value: "" }, "Tous"), iles().map((i) => H.el("option", { value: i.id, selected: filtreIle === i.id }, i.nom))))),
      liste.length ? null : H.el("p.discret", null, "Rien à faire pour l’instant. Ajoute une tâche, ou pioche dans les idées du mois."),
      bloc("retard", "En retard", g.retard),
      bloc("aujourdhui", "Aujourd’hui", g.aujourdhui),
      bloc("semaine", "Cette semaine", g.semaine),
      bloc("plusTard", "Plus tard", g.plusTard),
      bloc("sansDate", "Sans date", g.sansDate),
      bloc("faites", "Faites", g.faites, true),
      idees.length ? H.el("details.groupe-taches.idees-taches", null,
        H.el("summary", null, H.el("h3", null, "Idées du mois, d’après les fiches de tes jardins (" + idees.length + ")")),
        H.el("div.pastilles", null, idees.map((x) => H.el("button.pastille-valeur", {
          type: "button", title: nomIle(x.ile),
          onclick: () => { enregistrer({ id: H.uid("tache"), titre: x.titre, ile: x.ile, plante: x.plante, creeLe: H.maintenant(), echeance: debutJour(Date.now() + 7 * JOUR) }); dessiner(); },
        }, "+ " + x.titre + (filtreIle ? "" : " (" + nomIle(x.ile) + ")"))))) : null,
    ].filter(Boolean));
  }

  H.taches = { aFaire: () => taches().filter((t) => !t.fait && t.echeance && t.echeance < debutJour(Date.now()) + JOUR).length };
  H.vues.taches = {
    afficher(c) {
      conteneur = c;
      dessiner();
    },
    quitter() {
      conteneur = null;
    },
  };
  H.sur("donnees", () => conteneur && dessiner());
})();
