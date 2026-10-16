// Placard à tisanes : les mélanges concoctés par ƟvƟ, gardés en mémoire.
// Chaque plante d'un mélange doit être justifiée par l'effet thérapeutique recherché.
// Le placard contient aussi les bocaux de plantes sèches, pour composer de nouveaux mélanges.
(function () {
  const H = window.H;
  const choisies = new Set(); // bocaux choisis dans le placard pour un nouveau mélange
  let recherche = "";
  // Dans le monde de Mesi, ce sont des formules de pharmacopée chinoise : chaque substance a son
  // rang (Empereur, Ministre, Assistant, Messager), sa dose et son action dans la formule.
  const M = () => H.monde === "mesi";
  const RANGS = [["jun", "Empereur (jūn)"], ["chen", "Ministre (chén)"], ["zuo", "Assistant (zuǒ)"], ["shi", "Messager (shǐ)"]];
  const nomRang = (r) => (RANGS.find((x) => x[0] === r) || [])[1] || "";
  const ordreRang = (r) => { const i = RANGS.findIndex((x) => x[0] === r); return i < 0 ? 9 : i; };
  const MOTS = {
    titre: ["Placard à tisanes", "Mes formules"], nouveau: ["Nouveau mélange", "Nouvelle formule"], mes: ["Mes mélanges", "Mes formules"],
    exporter: ["Exporter les recettes", "Exporter les formules"], vide: ["Pas encore de mélange. Choisis des bocaux plus bas, ou clique sur « Nouveau mélange ».", "Pas encore de formule. Choisis des bocaux plus bas, ou clique sur « Nouvelle formule »."],
    seches: ["Les plantes sèches", "Les substances"], chercher: ["Chercher une plante sèche", "Chercher une substance"], aide: ["Clique sur les bocaux pour préparer un mélange.", "Clique sur les bocaux pour composer une formule."],
    enPrep: ["Mélange en préparation : ", "Formule en préparation : "], composer: ["Composer le mélange", "Composer la formule"], aucune: ["Aucune plante sèche ne correspond.", "Aucune substance ne correspond."],
  };
  const mot = (cle) => MOTS[cle][M() ? 1 : 0];

  const tisanes = () =>
    Object.values(H.herbier.tisanes || {})
      .filter((t) => !t.supprime)
      .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  function enregistrer(t) {
    t.modifieLe = H.maintenant();
    H.herbier.tisanes = H.herbier.tisanes || {};
    H.herbier.tisanes[t.id] = t;
    H.d.changer("herbier");
  }

  function composition(t) {
    return (t.plantes || [])
      .slice().sort((a, b) => ordreRang(a.rang) - ordreRang(b.rang))
      .map((x) => {
        const p = H.d.plante(x.id);
        return p ? (x.rang ? nomRang(x.rang) + " · " : "") + (x.part ? x.part + " " : "") + p.nom + (x.role ? " : " + x.role : "") : null;
      })
      .filter(Boolean);
  }

  // Quelques propriétés en gras dans la fiche, pour aider à argumenter.
  function piste(p) {
    if (M()) {
      const a = String((p.valeurs || {}).actions || "").split("\n").map((l) => l.replace(/^•\s*/, "").trim()).filter(Boolean).slice(0, 2);
      return a.length ? "ex. : " + a.join(", ").toLowerCase() + "…" : "Son action dans la formule";
    }
    const gras = [];
    String((p.valeurs || {}).proprietes || "").replace(/\*\*(.+?)\*\*/g, (_, x) => {
      for (const morceau of x.split(/[,\-–;]| et /)) {
        const t = morceau.replace(/[.:]+$/, "").trim().toLowerCase();
        if (t.length > 2 && t.length < 32 && gras.length < 3 && !gras.includes(t)) gras.push(t);
      }
    });
    return gras.length ? "ex. : " + gras.join(", ") + "…" : "Effet recherché dans ce mélange";
  }

  function sachet(t) {
    const teinte = t.couleur || ["#c9a878", "#d9b98c", "#b8956a", "#cfae7e"][H.hash(t.id) % 4];
    return H.el(
      "button.sachet",
      { type: "button", style: "--sachet:" + teinte, onclick: () => ouvrir(t) },
      H.el("span.sachet-pli"),
      H.el("span.sachet-nom", null, t.nom),
      H.el("span.sachet-plantes", null,
        (t.plantes || []).map((x) => (H.d.plante(x.id) || {}).nom).filter(Boolean).slice(0, 5).join(" · ") + ((t.plantes || []).length > 5 ? " …" : ""))
    );
  }

  function ouvrir(t) {
    const corps = H.el("div.tisane-detail",
      null,
      H.el("h2", null, t.nom),
      t.usage ? H.el("div", null, H.el("h3", null, M() ? "Indications" : "Pour quoi"), H.el("div.texte-fiche", { html: H.texteRiche(t.usage) })) : null,
      H.el("h3", null, "Composition"),
      H.el("ul.tisane-compo", null,
        (t.plantes || []).slice().sort((a, b) => ordreRang(a.rang) - ordreRang(b.rang)).map((x) => {
          const p = H.d.plante(x.id);
          if (!p) return null;
          return H.el("li", null,
            x.rang ? H.el("span.discret", null, nomRang(x.rang) + " · ") : null,
            x.part ? H.el("strong", null, x.part + " ") : null,
            H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, p.nom),
            x.role ? H.el("span.role-plante", null, " : " + x.role) : H.el("span.discret", null, " (rôle à préciser)")
          );
        })
      ),
      t.preparation ? H.el("div", null, H.el("h3", null, "Préparation"), H.el("div.texte-fiche", { html: H.texteRiche(t.preparation) })) : null,
      t.notes ? H.el("div", null, H.el("h3", null, "Notes"), H.el("div.texte-fiche", { html: H.texteRiche(t.notes) })) : null,
      H.el("div.boutons-bas", null,
        H.el("button.bouton", { type: "button", onclick: () => { fermer(); editer(t); } }, "Modifier")
      )
    );
    const fermer = H.fenetre(corps);
  }

  function editer(t, idsDepart) {
    t = t
      ? JSON.parse(JSON.stringify(t))
      : { id: H.uid("tisane"), nom: "", plantes: (idsDepart || []).map((id) => ({ id, part: "", role: "" })), usage: "", preparation: "", notes: "", creeLe: H.maintenant() };
    const existe = !!(H.herbier.tisanes && H.herbier.tisanes[t.id] && !H.herbier.tisanes[t.id].supprime);
    const nom = H.el("input", { type: "text", value: t.nom, placeholder: M() ? "Nom de la formule" : "Nom du mélange" });
    const liste = H.el("div.tisane-liste");
    const dessinerListe = () => {
      liste.innerHTML = "";
      t.plantes.forEach((x, i) => {
        const p = H.d.plante(x.id);
        if (!p) return;
        const role = H.el("textarea.role", { rows: 2, placeholder: piste(p), "aria-label": (M() ? "Action dans la formule : " + p.nom : "Effet thérapeutique " + H.duNom(p)), oninput: (e) => (x.role = e.target.value.trim()) });
        role.value = x.role || "";
        const props = (p.valeurs || {})[M() ? "actions" : "proprietes"];
        const rang = M() ? H.el("select", { "aria-label": "Rang de " + p.nom, onchange: (e) => (x.rang = e.target.value || undefined) },
          H.el("option", { value: "" }, "Rang…"), ...RANGS.map(([v, n]) => H.el("option", { value: v, selected: x.rang === v }, n))) : null;
        liste.appendChild(H.el("div.tisane-plante", null,
          H.el("div.org-sous-ligne", null,
            H.el("input", { type: "text", value: x.part || "", placeholder: M() ? "9 g" : "1 part", size: 8, "aria-label": (M() ? "Dose : " + p.nom : "Proportion " + H.duNom(p)), oninput: (e) => (x.part = e.target.value.trim()) }),
            H.el("strong", null, p.nom),
            rang,
            H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { t.plantes.splice(i, 1); dessinerListe(); } }, "Retirer")
          ),
          role,
          props ? H.el("details.rappel-proprietes", null, H.el("summary.discret", null, M() ? "Revoir ses actions" : "Revoir ses propriétés"), H.el("div.texte-fiche", { html: H.texteRiche(props) })) : null
        ));
      });
      liste.appendChild(
        H.el("button.bouton.petit", {
          type: "button",
          onclick: () =>
            H.choisirPlantes(t.plantes.map((x) => x.id), (ids) => {
              const avant = new Map(t.plantes.map((x) => [x.id, x]));
              t.plantes = ids.map((id) => avant.get(id) || { id, part: "", role: "" });
              dessinerListe();
            }, M() ? "Substances de la formule" : "Plantes du mélange"),
        }, M() ? (t.plantes.length ? "Ajouter ou retirer des substances" : "Choisir les substances") : (t.plantes.length ? "Ajouter ou retirer des plantes" : "Choisir les plantes"))
      );
    };
    dessinerListe();
    const zone = (val, ph) => {
      const z = H.el("textarea", { rows: 3, placeholder: ph });
      z.value = val || "";
      return z;
    };
    const usage = zone(t.usage, M() ? "Syndrome, indications…" : "Indications, moments de la journée…");
    const prep = zone(t.preparation, M() ? "Décoction, poudre, pilules…" : "Infusion 10 min, 1 cuillère à soupe par tasse…");
    const notes = zone(t.notes, M() ? "Variantes, précautions…" : "Goût, variantes, pour qui…");
    const msg = H.el("p.discret.erreur", { role: "alert" });
    let fermer;
    const form = H.el("form.formulaire", {
      onsubmit(e) {
        e.preventDefault();
        if (!nom.value.trim()) {
          msg.textContent = M() ? "Donne un nom à la formule." : "Donne un nom au mélange.";
          return;
        }
        if (!t.plantes.length) {
          msg.textContent = M() ? "Choisis au moins une substance." : "Choisis au moins une plante.";
          return;
        }
        const sansRole = t.plantes.filter((x) => !x.role || x.role.length < 3).map((x) => (H.d.plante(x.id) || {}).nom).filter(Boolean);
        if (sansRole.length) {
          msg.textContent = (M() ? "Explique l’action de chaque substance dans la formule : il manque " : "Explique l’effet thérapeutique de chaque plante : il manque ") + sansRole.join(", ") + ".";
          return;
        }
        t.nom = nom.value.trim();
        t.usage = usage.value.trim();
        t.preparation = prep.value.trim();
        t.notes = notes.value.trim();
        enregistrer(t);
        choisies.clear();
        fermer();
        H.router();
      },
    },
      H.el("h2", null, M() ? (existe ? "Modifier la formule" : "Nouvelle formule") : (existe ? "Modifier le mélange" : "Nouveau mélange")),
      H.el("label", null, "Nom", nom),
      H.el("label", null, M() ? "Indications" : "Pour quoi", usage),
      H.el("div", null,
        H.el("h3", null, M() ? "Substances, doses et rang de chacune" : "Plantes, proportions et effet de chacune"),
        H.el("p.discret.aide", null, M() ? "Pour chaque substance, son rang (Empereur, Ministre, Assistant, Messager) et l’action qu’elle apporte à la formule." : "Pour chaque plante, argumente l’effet thérapeutique qu’elle apporte au mélange."),
        liste),
      H.el("label", null, "Préparation", prep),
      H.el("label", null, "Notes", notes),
      msg,
      H.el("div.boutons-bas", null,
        existe
          ? H.el("button.bouton.discret-bouton", {
              type: "button",
              onclick() {
                if (!confirm((M() ? "Jeter la formule « " : "Jeter le mélange « ") + t.nom + " » ?")) return;
                enregistrer({ id: t.id, supprime: true });
                fermer();
                H.router();
              },
            }, "Supprimer")
          : null,
        H.el("button.bouton", { type: "submit" }, M() ? "Ranger la formule" : "Ranger dans le placard")
      )
    );
    fermer = H.fenetre(form);
    nom.focus();
  }

  function exporter() {
    const lignes = [];
    for (const t of tisanes()) {
      lignes.push(t.nom.toUpperCase());
      if (t.usage) lignes.push((M() ? "  Indications : " : "  Pour quoi : ") + t.usage.replace(/\n/g, " "));
      composition(t).forEach((c) => lignes.push("  - " + c));
      if (t.preparation) lignes.push("  Préparation : " + t.preparation.replace(/\n/g, " "));
      if (t.notes) lignes.push("  Notes : " + t.notes.replace(/\n/g, " "));
      lignes.push("");
    }
    H.telecharger(M() ? "mes-formules.txt" : "placard-a-tisanes.txt", lignes.join("\n"));
  }

  // --- les bocaux de plantes sèches, au fond du placard -----------------------------
  function bocaux(zone, barre) {
    const q = H.sansAccents(recherche.trim());
    const plantes = H.d.plantes().filter((p) => (p.preparations || []).includes("plante-seche") && (!q || H.sansAccents(p.nom + " " + p.latin).includes(q)));
    zone.innerHTML = "";
    if (!plantes.length) zone.appendChild(H.el("p.discret", null, mot("aucune")));
    for (const p of plantes) {
      const choisie = choisies.has(p.id);
      zone.appendChild(H.el("button.bocal.bocal-placard" + (choisie ? ".choisi" : ""), {
        type: "button",
        "aria-pressed": String(choisie),
        title: choisie ? "Retirer du mélange" : "Ajouter au mélange",
        onclick() {
          choisie ? choisies.delete(p.id) : choisies.add(p.id);
          bocaux(zone, barre);
        },
      },
        H.el("span.bocal-cadre", null, H.el("img.bocal-image.forme-bocal", { src: H.aqua.bocal("bocal", H.aqua.teintePlante(p), H.d.stock(p, "plante-seche")), alt: "" })),
        H.el("span.etiquette", { lang: "fr" }, p.nom)
      ));
    }
    barre.innerHTML = "";
    barre.hidden = !choisies.size;
    if (choisies.size) {
      const noms = Array.from(choisies).map((id) => (H.d.plante(id) || {}).nom).filter(Boolean);
      barre.append(
        H.el("span", null, mot("enPrep") + noms.join(", ")),
        H.el("button.bouton.petit", { type: "button", onclick: () => { choisies.clear(); bocaux(zone, barre); } }, "Tout reposer"),
        H.el("button.bouton.petit.actif", { type: "button", onclick: () => editer(null, Array.from(choisies)) }, mot("composer"))
      );
    }
  }

  H.vues.tisanes = {
    afficher(c) {
      const liste = tisanes();
      c.appendChild(H.el("div.herbo-tete", null,
        H.el("h1", null, mot("titre")),
        H.el("div.herbo-boutons", null,
          H.el("a.bouton.discret-bouton", { href: "#herbotheque" }, "Retour aux étagères"),
          H.el("button.bouton", { type: "button", onclick: () => editer() }, mot("nouveau")),
          liste.length ? H.el("button.bouton", { type: "button", onclick: exporter }, mot("exporter")) : null
        )
      ));
      const planche = { style: "--planche:url(" + H.aqua.planche() + ")" };
      const placard = H.el("div.placard", planche);
      placard.appendChild(H.el("h2.titre-placard", null, mot("mes")));
      if (!liste.length) {
        placard.appendChild(H.el("p.placard-vide", null, mot("vide")));
      }
      liste.forEach((t) => placard.appendChild(sachet(t)));
      c.appendChild(placard);

      const barre = H.el("div.barre-melange", { hidden: true });
      const zone = H.el("div.rangee.bocaux-placard");
      const champ = H.el("input", {
        type: "search",
        placeholder: mot("chercher"),
        value: recherche,
        "aria-label": mot("chercher"),
        oninput: H.anti((e) => {
          recherche = e.target.value;
          bocaux(zone, barre);
        }, 180),
      });
      c.appendChild(H.el("div.placard.placard-plantes", planche,
        H.el("h2.titre-placard", null, mot("seches")),
        H.el("p.discret.aide-placard", null, mot("aide")),
        champ,
        zone
      ));
      c.appendChild(barre);
      bocaux(zone, barre);
    },
  };

  H.tisanes = { liste: tisanes, composition, mot: (cle) => mot(cle) };
})();
