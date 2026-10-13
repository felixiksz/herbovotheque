// Placard à tisanes : les mélanges concoctés par ƟvƟ, gardés en mémoire.
(function () {
  const H = window.H;

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
      .map((x) => {
        const p = H.d.plante(x.id);
        return p ? (x.part ? x.part + " " : "") + p.nom : null;
      })
      .filter(Boolean);
  }

  function sachet(t) {
    const teinte = t.couleur || ["#c9a878", "#d9b98c", "#b8956a", "#cfae7e"][H.hash(t.id) % 4];
    return H.el(
      "button.sachet",
      { type: "button", style: "--sachet:" + teinte, onclick: () => ouvrir(t) },
      H.el("span.sachet-pli"),
      H.el("span.sachet-nom", null, t.nom),
      H.el("span.sachet-plantes", null, composition(t).slice(0, 5).join(" · ") + ((t.plantes || []).length > 5 ? " …" : ""))
    );
  }

  function ouvrir(t) {
    const corps = H.el("div.tisane-detail",
      null,
      H.el("h2", null, t.nom),
      H.el("h3", null, "Composition"),
      H.el("ul.tisane-compo", null,
        (t.plantes || []).map((x) => {
          const p = H.d.plante(x.id);
          return p ? H.el("li", null, x.part ? H.el("strong", null, x.part + " ") : null, H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, p.nom)) : null;
        })
      ),
      t.usage ? H.el("div", null, H.el("h3", null, "Pour quoi"), H.el("div.texte-fiche", { html: H.texteRiche(t.usage) })) : null,
      t.preparation ? H.el("div", null, H.el("h3", null, "Préparation"), H.el("div.texte-fiche", { html: H.texteRiche(t.preparation) })) : null,
      t.notes ? H.el("div", null, H.el("h3", null, "Notes"), H.el("div.texte-fiche", { html: H.texteRiche(t.notes) })) : null,
      H.el("div.boutons-bas", null,
        H.el("button.bouton", { type: "button", onclick: () => { fermer(); editer(t); } }, "Modifier")
      )
    );
    const fermer = H.fenetre(corps);
  }

  function editer(t) {
    t = t ? JSON.parse(JSON.stringify(t)) : { id: H.uid("tisane"), nom: "", plantes: [], usage: "", preparation: "", notes: "", creeLe: H.maintenant() };
    const nom = H.el("input", { type: "text", value: t.nom, placeholder: "Nom du mélange" });
    const liste = H.el("div.tisane-liste");
    const dessinerListe = () => {
      liste.innerHTML = "";
      t.plantes.forEach((x, i) => {
        const p = H.d.plante(x.id);
        if (!p) return;
        liste.appendChild(H.el("div.org-sous-ligne", null,
          H.el("input", { type: "text", value: x.part || "", placeholder: "1 part", size: 8, "aria-label": "Proportion de " + p.nom, oninput: (e) => (x.part = e.target.value.trim()) }),
          H.el("span", null, p.nom),
          H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { t.plantes.splice(i, 1); dessinerListe(); } }, "Retirer")
        ));
      });
      liste.appendChild(
        H.el("button.bouton.petit", {
          type: "button",
          onclick: () =>
            H.choisirPlantes(t.plantes.map((x) => x.id), (ids) => {
              const avant = new Map(t.plantes.map((x) => [x.id, x]));
              t.plantes = ids.map((id) => avant.get(id) || { id, part: "" });
              dessinerListe();
            }, "Plantes du mélange"),
        }, "Choisir les plantes")
      );
    };
    dessinerListe();
    const zone = (val, ph) => {
      const z = H.el("textarea", { rows: 4, placeholder: ph });
      z.value = val || "";
      return z;
    };
    const usage = zone(t.usage, "Indications, moments de la journée…");
    const prep = zone(t.preparation, "Infusion 10 min, 1 cuillère à soupe par tasse…");
    const notes = zone(t.notes, "Goût, variantes, pour qui…");
    const msg = H.el("p.discret.erreur");
    let fermer;
    const form = H.el("form.formulaire", {
      onsubmit(e) {
        e.preventDefault();
        if (!nom.value.trim()) {
          msg.textContent = "Donne un nom au mélange.";
          return;
        }
        t.nom = nom.value.trim();
        t.usage = usage.value.trim();
        t.preparation = prep.value.trim();
        t.notes = notes.value.trim();
        enregistrer(t);
        fermer();
        H.router();
      },
    },
      H.el("h2", null, H.herbier.tisanes && H.herbier.tisanes[t.id] ? "Modifier le mélange" : "Nouveau mélange"),
      H.el("label", null, "Nom", nom),
      H.el("div", null, H.el("h3", null, "Plantes et proportions"), liste),
      H.el("label", null, "Pour quoi", usage),
      H.el("label", null, "Préparation", prep),
      H.el("label", null, "Notes", notes),
      msg,
      H.el("div.boutons-bas", null,
        H.herbier.tisanes && H.herbier.tisanes[t.id]
          ? H.el("button.bouton.discret-bouton", {
              type: "button",
              onclick() {
                if (!confirm("Jeter le mélange « " + t.nom + " » ?")) return;
                enregistrer({ id: t.id, supprime: true });
                fermer();
                H.router();
              },
            }, "Supprimer")
          : null,
        H.el("button.bouton", { type: "submit" }, "Ranger dans le placard")
      )
    );
    fermer = H.fenetre(form);
    nom.focus();
  }

  function exporter() {
    const lignes = [];
    for (const t of tisanes()) {
      lignes.push(t.nom.toUpperCase());
      composition(t).forEach((c) => lignes.push("  - " + c));
      if (t.usage) lignes.push("  Pour quoi : " + t.usage.replace(/\n/g, " "));
      if (t.preparation) lignes.push("  Préparation : " + t.preparation.replace(/\n/g, " "));
      if (t.notes) lignes.push("  Notes : " + t.notes.replace(/\n/g, " "));
      lignes.push("");
    }
    H.telecharger("placard-a-tisanes.txt", lignes.join("\n"));
  }

  H.vues.tisanes = {
    afficher(c) {
      const liste = tisanes();
      c.appendChild(H.el("div.herbo-tete", null,
        H.el("h1", null, "Placard à tisanes"),
        H.el("div.herbo-boutons", null,
          H.el("a.bouton.discret-bouton", { href: "#herbotheque" }, "Retour aux étagères"),
          H.el("button.bouton", { type: "button", onclick: () => editer() }, "Nouveau mélange"),
          liste.length ? H.el("button.bouton", { type: "button", onclick: exporter }, "Exporter les recettes") : null
        )
      ));
      const placard = H.el("div.placard", { style: "--planche:url(" + H.aqua.planche() + ")" });
      if (!liste.length) {
        placard.appendChild(H.el("p.placard-vide", null, "Le placard est vide pour l’instant. Clique sur « Nouveau mélange » pour y ranger ta première synergie."));
      }
      liste.forEach((t) => placard.appendChild(sachet(t)));
      c.appendChild(placard);
    },
  };

  H.tisanes = { liste: tisanes, composition };
})();
