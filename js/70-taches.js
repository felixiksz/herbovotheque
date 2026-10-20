// La to-do liste d'ƟvƟ : des tâches avec ou sans échéance, rattachées (ou non) à un jardin et à
// une plante, qui peuvent revenir toutes seules (chaque semaine, chaque mois…). On les voit par
// moment (en retard, aujourd'hui, cette semaine, plus tard) ; les idées de saison viennent des
// fiches des plantes de ses jardins (ce qui se sème, se plante, se récolte ce mois-ci).
// Gardée dans la partie (H.jeu.taches), synchronisée.
(function () {
  const H = window.H;
  const JOUR = 864e5;
  // les rappels : combien de minutes avant l'heure de la tâche (9 h si elle n'a pas d'heure)
  const RAPPELS = [["", "Pas de rappel"], ["0", "À l’heure"], ["15", "15 min avant"], ["60", "1 h avant"], ["1440", "La veille"]];
  const REPETITIONS = [["", "Une seule fois"], ["7", "Chaque semaine"], ["14", "Toutes les deux semaines"], ["mois", "Chaque mois"], ["365", "Chaque année"]];

  const taches = () => Object.values(H.jeu.taches || {}).filter((t) => !t.supprime);
  function enregistrer(t) {
    t.modifieLe = H.maintenant();
    H.jeu.taches = Object.assign({}, H.jeu.taches, { [t.id]: t });
    H.d.changer("jeu");
  }
  const debutJour = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return +x; };
  const dateCourte = (t) => new Date(t).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const iles = () => H.ilesVisibles();
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
    const heure = H.el("input", { type: "time", value: t.heure || "" });
    const rappel = H.el("select", null, RAPPELS.map(([v, n]) => H.el("option", { value: v, selected: (t.rappel == null ? "" : String(t.rappel)) === v }, n)));
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
        Object.assign(t, { titre: titre.value.trim(), echeance: date.value ? debutJour(date.value + "T12:00") : null, heure: heure.value || null, rappel: date.value && rappel.value !== "" ? +rappel.value : null, repetition: rep.value, ile: ile.value || null, plante, notes: notes.value.trim() });
        if (t.rappel != null) demanderPermission();
        enregistrer(t);
        fermer();
        dessiner();
      },
    },
      H.el("h2", null, nouvelle ? "Nouvelle tâche" : "Modifier la tâche"),
      H.el("label", null, "La tâche", titre),
      H.el("div.ligne-option", null, H.el("label", null, "Pour le ", date), H.el("label", null, "à ", heure), H.el("label", null, "Revient ", rep)),
      H.el("div.ligne-option", null, H.el("label", null, "Me prévenir ", rappel), H.el("small.discret", null, "une notification, quand le jeu est ouvert (ou à son ouverture)")),
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
        [t.echeance ? dateCourte(t.echeance) + (t.heure ? " à " + t.heure.replace(":", " h ") : "") : null, t.rappel != null && t.echeance ? "rappel " + (RAPPELS.find((r) => r[0] === String(t.rappel)) || [0, ""])[1].toLowerCase() : null, t.repetition ? "↻ " + (REPETITIONS.find((r) => r[0] === t.repetition) || [0, ""])[1].toLowerCase() : null, t.ile ? nomIle(t.ile) : null].filter(Boolean).join(" · "),
        p ? H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, " · " + p.nom) : null),
      H.boutonCrayon(() => formulaire(t), "Modifier la tâche")
    );
  }

  function exporterTaches() {
    const g = groupes(taches().filter((t) => !filtreIle || t.ile === filtreIle));
    const rang = (t) => [t.titre, t.echeance ? dateCourte(t.echeance) : "", t.repetition ? (REPETITIONS.find((r) => r[0] === t.repetition) || [0, ""])[1] : "", t.ile ? nomIle(t.ile) : "", t.plante && H.d.plante(t.plante) ? H.d.plante(t.plante).nom : "", t.notes || ""];
    const cols = ["Tâche", "Pour le", "Revient", "Jardin", "Plante", "Notes"];
    H.exporter({
      titre: "To-do liste" + (filtreIle ? " — " + nomIle(filtreIle) : ""),
      nomFichier: "to-do-liste",
      sections: [["En retard", g.retard], ["Aujourd’hui", g.aujourdhui], ["Cette semaine", g.semaine], ["Plus tard", g.plusTard], ["Sans date", g.sansDate], ["Faites", g.faites]]
        .filter(([, l]) => l.length).map(([titre, l]) => ({ titre, colonnes: cols, lignes: l.map(rang) })),
    });
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
        H.el("button.bouton.petit", { type: "button", onclick: exporterTaches }, "Exporter"),
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

  // --- les rappels : une notification au bon moment, tant que le jeu est ouvert ; à l'ouverture,
  // celles qui sont passées entre-temps (une seule fois chacune, sur chaque appareil)
  function demanderPermission() {
    if ("Notification" in window && Notification.permission === "default") Notification.requestPermission().catch(() => {});
  }
  const momentRappel = (t) => t.echeance + (t.heure ? (+t.heure.slice(0, 2) * 60 + +t.heure.slice(3, 5)) : 9 * 60) * 6e4 - (t.rappel || 0) * 6e4;
  async function notifier(titre, corps) {
    H.toast(titre + (corps ? " — " + corps : ""), 6000);
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const opts = { body: corps || "", icon: "icones/icone-192.png", tag: "rappel-" + titre, data: { hash: "#taches" } };
    try {
      const reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
      if (reg) return reg.showNotification(titre, opts);
      new Notification(titre, opts);
    } catch (e) { /* pas de notification sur cet appareil */ }
  }
  function verifierRappels() {
    if (!H.jeu || !H.local) return;
    const vus = H.local.rappelsVus || {}, maintenant = Date.now(), aMontrer = [];
    for (const t of taches()) {
      if (t.fait || t.rappel == null || !t.echeance) continue;
      const cle = t.id + ":" + t.echeance + ":" + (t.heure || "") + ":" + t.rappel, m = momentRappel(t);
      if (m <= maintenant && !vus[cle] && maintenant - m < 7 * JOUR) aMontrer.push([cle, t]);
    }
    if (!aMontrer.length) return;
    H.d.majLocal((l) => { l.rappelsVus = Object.assign({}, l.rappelsVus); for (const [cle] of aMontrer) l.rappelsVus[cle] = maintenant; });
    if (aMontrer.length > 3) return notifier(aMontrer.length + " tâches à faire", aMontrer.map(([, t]) => t.titre).join(", "));
    for (const [, t] of aMontrer) {
      const quand = t.heure ? "à " + t.heure.replace(":", " h ") : "";
      const jour = debutJour(t.echeance) === debutJour(maintenant) ? "aujourd’hui" : t.echeance < debutJour(maintenant) ? "en retard" : "demain";
      notifier(t.titre, [jour, quand, t.ile ? nomIle(t.ile) : ""].filter(Boolean).join(" ").trim());
    }
  }
  setTimeout(verifierRappels, 4000);
  setInterval(verifierRappels, 30e3);

  // --- les post-it de la ferme, dans le coin en bas à gauche : les tâches les plus pressées, une par
  // post-it, qu'on coche sur place ; on les replie en un seul petit post-it (sur cet appareil)
  const COULEURS_POSTIT = ["jaune", "rose", "bleu", "vert"];
  function postits() {
    const boite = H.el("div.postits");
    const remplir = () => {
      if (!H.jeu) return;
      const g = groupes(taches()), pressees = [].concat(g.retard, g.aujourdhui, g.semaine, g.sansDate, g.plusTard);
      const ferme = !!(H.local && H.local.postitsFermes);
      const basculer = () => { H.d.majLocal((l) => (l.postitsFermes = !ferme)); setTimeout(remplir, 0); };
      if (ferme || !pressees.length) {
        boite.replaceChildren(H.el("button.postit.postit-plie.postit-jaune", { type: "button", title: pressees.length ? "Déplier les post-it" : "La to-do liste", onclick: () => (pressees.length ? basculer() : (location.hash = "#taches")) },
          "To-do" + (pressees.length ? " (" + pressees.length + ")" : "")));
        return;
      }
      const montrees = pressees.slice(0, 4), reste = pressees.length - montrees.length;
      boite.replaceChildren(
        H.el("div.postits-tete", null,
          H.el("a.postits-titre", { href: "#taches", title: "Ouvrir la to-do liste" }, "To-do"),
          H.el("button.postits-replier", { type: "button", title: "Replier les post-it", "aria-label": "Replier les post-it", onclick: basculer }, "–")),
        ...montrees.map((t, i) => {
          const retard = t.echeance && t.echeance < debutJour(Date.now());
          const quand = t.echeance ? (retard ? "en retard · " : "") + dateCourte(t.echeance) + (t.heure ? " à " + t.heure.replace(":", " h ") : "") : "";
          return H.el("div.postit.postit-" + COULEURS_POSTIT[H.hash(t.id) % COULEURS_POSTIT.length] + (retard ? ".postit-retard" : ""), { style: "--penche:" + ((H.hash(t.id + "p") % 5) - 2) * 0.8 + "deg" },
            H.el("label.postit-case", null,
              H.el("input", { type: "checkbox", onchange: () => { cocher(t); setTimeout(remplir, 0); } }),
              H.el("span", null, t.titre)),
            quand ? H.el("span.postit-quand", null, quand) : null);
        }),
        reste > 0 ? H.el("a.postit-reste", { href: "#taches" }, "et " + reste + " autre" + (reste > 1 ? "s" : "") + "…") : null);
    };
    remplir();
    H.sur("donnees", () => boite.isConnected && remplir());
    return boite;
  }

  H.taches = { aFaire: () => taches().filter((t) => !t.fait && t.echeance && t.echeance < debutJour(Date.now()) + JOUR).length, postits };
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
