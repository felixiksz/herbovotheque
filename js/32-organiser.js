// Organiser l'herbothèque : rangements et étagères, rubriques des fiches, types de préparation.
(function () {
  const H = window.H;

  const TYPES = [
    ["texte", "Texte long"],
    ["court", "Texte court"],
    ["choix", "Choix dans une liste"],
    ["choix-multiple", "Plusieurs choix dans une liste"],
    ["mois", "Mois de l’année"],
    ["plantes", "Autres plantes"],
  ];
  const FORMES = [
    ["bocal", "Bocal"],
    ["flacon", "Flacon ambré"],
    ["compte-gouttes", "Compte-gouttes"],
    ["huile-essentielle", "Flacon d’huile essentielle"],
    ["pot", "Pot"],
    ["tube", "Petit tube"],
  ];
  const nomType = (c) => (TYPES.find(([t]) => t === (c.type === "choix" && c.multiple ? "choix-multiple" : c.type)) || [0, c.type])[1];

  function rangementsModifies() {
    H.herbier.rangementsModifieLe = H.maintenant();
    H.d.changer("herbier");
  }

  function deplacer(liste, i, d) {
    const j = i + d;
    if (j < 0 || j >= liste.length) return;
    [liste[i], liste[j]] = [liste[j], liste[i]];
  }

  function petit(texte, fn, opts) {
    return H.el("button.bouton.petit" + (opts && opts.discret ? ".discret-bouton" : ""), { type: "button", onclick: fn, "aria-label": opts && opts.label }, texte);
  }

  // --- onglet étagères ------------------------------------------------------
  function ongletEtageres(zone, redessiner) {
    const rgs = H.herbier.rangements;
    rgs.forEach((rg, i) => {
      const nom = H.el("input", { type: "text", value: rg.nom, "aria-label": "Nom du rangement", onchange: (e) => { rg.nom = e.target.value.trim() || rg.nom; rangementsModifies(); } });
      let detail = "";
      if (rg.type === "champ") detail = "selon la rubrique « " + ((H.d.champ(rg.champ) || {}).nom || rg.champ) + " »";
      else if (rg.type === "preparation") detail = "une étagère par préparation";
      else if (rg.type === "alpha") detail = "par ordre alphabétique";
      else detail = "étagères choisies à la main";
      const bloc = H.el("div.org-ligne", null,
        H.el("div.org-tete", null, nom, H.el("span.discret", null, detail)),
        H.el("div.pastilles", null,
          petit("Monter", () => { deplacer(rgs, i, -1); rangementsModifies(); redessiner(); }, { discret: true }),
          rgs.length > 1 ? petit("Supprimer", () => { if (confirm("Supprimer le rangement « " + rg.nom + " » ?")) { rgs.splice(i, 1); rangementsModifies(); redessiner(); } }, { discret: true }) : null
        )
      );
      if (rg.type === "manuel") {
        const ets = H.el("div.org-etageres");
        (rg.etageres || []).forEach((et, k) => {
          ets.appendChild(H.el("div.org-sous-ligne", null,
            H.el("input", { type: "text", value: et.nom, "aria-label": "Nom de l’étagère", onchange: (e) => { et.nom = e.target.value.trim() || et.nom; rangementsModifies(); } }),
            H.el("span.discret", null, et.plantes.length + " plantes"),
            petit("Monter", () => { deplacer(rg.etageres, k, -1); rangementsModifies(); redessiner(); }, { discret: true }),
            petit("Retirer", () => { if (confirm("Retirer l’étagère « " + et.nom + " » ? Les fiches restent dans l’herbothèque.")) { rg.etageres.splice(k, 1); rangementsModifies(); redessiner(); } }, { discret: true })
          ));
        });
        const nouvelle = H.el("input", { type: "text", placeholder: "Nouvelle étagère" });
        ets.appendChild(H.el("form.org-sous-ligne", {
          onsubmit(e) {
            e.preventDefault();
            const n = nouvelle.value.trim();
            if (!n) return;
            rg.etageres = rg.etageres || [];
            rg.etageres.push({ id: H.uid("et"), nom: n, plantes: [] });
            rangementsModifies();
            redessiner();
          },
        }, nouvelle, H.el("button.bouton.petit", { type: "submit" }, "Ajouter l’étagère")));
        bloc.appendChild(ets);
      }
      zone.appendChild(bloc);
    });

    // nouveau rangement
    const nom = H.el("input", { type: "text", placeholder: "Nom du rangement" });
    const champs = H.d.champs().filter((c) => c.type === "court" || c.type === "choix");
    const type = H.el("select", null,
      H.el("option", { value: "manuel" }, "Mes étagères à moi"),
      champs.map((c) => H.el("option", { value: "champ:" + c.id }, "Selon « " + c.nom + " »"))
    );
    const msg = H.el("p.discret.erreur");
    zone.appendChild(H.el("form.org-nouveau", {
      onsubmit(e) {
        e.preventDefault();
        const n = nom.value.trim();
        if (!n) {
          msg.textContent = "Donne un nom au rangement.";
          return;
        }
        const rg = { id: H.uid("rg"), nom: n };
        if (type.value === "manuel") Object.assign(rg, { type: "manuel", etageres: [{ id: H.uid("et"), nom: "Première étagère", plantes: [] }] });
        else Object.assign(rg, { type: "champ", champ: type.value.slice(6) });
        H.herbier.rangements.push(rg);
        H.herbier.rangementActif = rg.id;
        rangementsModifies();
        redessiner();
      },
    }, H.el("h3", null, "Nouveau rangement"), H.el("div.ligne-option", null, nom, type, H.el("button.bouton.petit", { type: "submit" }, "Créer")), msg));
  }

  // --- onglet rubriques -------------------------------------------------------
  function ongletRubriques(zone, redessiner) {
    const schema = H.herbier.schema;
    schema.sections.forEach((s, si) => {
      const champs = schema.champs.filter((c) => c.section === s.id);
      const sec = H.el("div.org-section", null,
        H.el("div.org-tete", null,
          H.el("input.titre-section", { type: "text", value: s.nom, "aria-label": "Nom de la section", onchange: (e) => H.d.majSchema(() => (s.nom = e.target.value.trim() || s.nom)) }),
          H.el("div.pastilles", null,
            petit("Monter", () => { H.d.majSchema(() => deplacer(schema.sections, si, -1)); redessiner(); }, { discret: true }),
            !champs.length ? petit("Retirer", () => { H.d.majSchema(() => { schema.sections.splice(si, 1); schema.retires.push(s.id); }); redessiner(); }, { discret: true }) : null
          )
        )
      );
      champs.forEach((c) => {
        const ligne = H.el("div.org-ligne.org-champ", null,
          H.el("div.org-tete", null,
            H.el("input", { type: "text", value: c.nom, "aria-label": "Nom de la rubrique", onchange: (e) => H.d.majSchema(() => (c.nom = e.target.value.trim() || c.nom)) }),
            H.el("span.discret", null, nomType(c))
          ),
          H.el("div.pastilles", null,
            H.el("label.discret", null, H.el("input", { type: "checkbox", checked: !!c.cartes, onchange: (e) => H.d.majSchema(() => (c.cartes = e.target.checked)) }), " en flashcartes"),
            H.el("select", {
              "aria-label": "Section",
              onchange(e) {
                H.d.majSchema(() => (c.section = e.target.value));
                redessiner();
              },
            }, schema.sections.map((x) => H.el("option", { value: x.id, selected: x.id === c.section }, x.nom))),
            petit("Monter", () => {
              H.d.majSchema(() => {
                const memes = schema.champs.filter((x) => x.section === c.section);
                const k = memes.indexOf(c);
                if (k > 0) {
                  const a = schema.champs.indexOf(memes[k - 1]), b = schema.champs.indexOf(c);
                  [schema.champs[a], schema.champs[b]] = [schema.champs[b], schema.champs[a]];
                }
              });
              redessiner();
            }, { discret: true }),
            petit("Retirer", () => {
              if (!confirm("Retirer la rubrique « " + c.nom + " » de toutes les fiches ? (Le texte des fiches de base reste disponible si tu la recrées avec le même nom.)")) return;
              H.d.majSchema(() => {
                schema.champs.splice(schema.champs.indexOf(c), 1);
                schema.retires.push(c.id);
              });
              redessiner();
            }, { discret: true })
          )
        );
        if (c.type === "choix") {
          const t = H.el("textarea", { rows: Math.min(8, (c.options || []).length + 1), "aria-label": "Options, une par ligne" });
          t.value = (c.options || []).join("\n");
          t.addEventListener("change", () => H.d.majSchema(() => (c.options = t.value.split("\n").map((x) => x.trim()).filter(Boolean))));
          ligne.appendChild(H.el("details.org-options", null, H.el("summary.discret", null, "Options (" + (c.options || []).length + ")"), t));
        }
        sec.appendChild(ligne);
      });
      zone.appendChild(sec);
    });

    const nom = H.el("input", { type: "text", placeholder: "Nom de la rubrique" });
    const type = H.el("select", null, TYPES.map(([v, t]) => H.el("option", { value: v }, t)));
    const section = H.el("select", null, schema.sections.map((s) => H.el("option", { value: s.id }, s.nom)));
    const msg = H.el("p.discret.erreur");
    zone.appendChild(H.el("form.org-nouveau", {
      onsubmit(e) {
        e.preventDefault();
        const n = nom.value.trim();
        if (!n) {
          msg.textContent = "Donne un nom à la rubrique.";
          return;
        }
        let id = H.slug(n).replace(/-([a-z0-9])/g, (_, x) => x.toUpperCase());
        while (H.d.champ(id)) id += "2";
        const c = { id, nom: n, section: section.value, type: type.value === "choix-multiple" ? "choix" : type.value, cartes: false };
        if (c.type === "choix") {
          c.options = [];
          c.multiple = type.value === "choix-multiple";
        }
        H.d.majSchema((s) => {
          s.champs.push(c);
          s.retires = s.retires.filter((x) => x !== id);
        });
        redessiner();
      },
    }, H.el("h3", null, "Nouvelle rubrique"), H.el("div.ligne-option", null, nom, type, section, H.el("button.bouton.petit", { type: "submit" }, "Ajouter")), msg));

    const nomSec = H.el("input", { type: "text", placeholder: "Nom de la section" });
    zone.appendChild(H.el("form.org-nouveau", {
      onsubmit(e) {
        e.preventDefault();
        const n = nomSec.value.trim();
        if (!n) return;
        H.d.majSchema((s) => s.sections.push({ id: H.uid("sec"), nom: n }));
        redessiner();
      },
    }, H.el("h3", null, "Nouvelle section"), H.el("div.ligne-option", null, nomSec, H.el("button.bouton.petit", { type: "submit" }, "Ajouter"))));
  }

  // --- onglet préparations ----------------------------------------------------
  function ongletPreparations(zone, redessiner) {
    const preps = H.herbier.schema.preparations;
    preps.forEach((p, i) => {
      const img = H.el("img.mini-bocal", { src: H.aqua.bocal(p.forme, "#8a9a4a"), alt: "" });
      zone.appendChild(H.el("div.org-ligne", null,
        H.el("div.org-tete", null,
          img,
          H.el("input", { type: "text", value: p.nom, "aria-label": "Nom de la préparation", onchange: (e) => H.d.majSchema(() => (p.nom = e.target.value.trim() || p.nom)) }),
          H.el("select", {
            "aria-label": "Forme du contenant",
            onchange(e) {
              H.d.majSchema(() => (p.forme = e.target.value));
              img.src = H.aqua.bocal(p.forme, "#8a9a4a");
            },
          }, FORMES.map(([v, t]) => H.el("option", { value: v, selected: v === p.forme }, t)))
        ),
        H.el("div.pastilles", null,
          petit("Monter", () => { H.d.majSchema(() => deplacer(preps, i, -1)); redessiner(); }, { discret: true }),
          petit("Retirer", () => {
            if (!confirm("Retirer la préparation « " + p.nom + " » ?")) return;
            H.d.majSchema((s) => {
              s.preparations.splice(i, 1);
              s.retires.push(p.id);
            });
            redessiner();
          }, { discret: true })
        )
      ));
    });
    const nom = H.el("input", { type: "text", placeholder: "Nouvelle préparation (ex. sirop, baume…)" });
    const forme = H.el("select", null, FORMES.map(([v, t]) => H.el("option", { value: v }, t)));
    zone.appendChild(H.el("form.org-nouveau", {
      onsubmit(e) {
        e.preventDefault();
        const n = nom.value.trim();
        if (!n) return;
        let id = H.slug(n);
        while (H.d.preparation(id)) id += "-2";
        H.d.majSchema((s) => s.preparations.push({ id, nom: n, forme: forme.value }));
        redessiner();
      },
    }, H.el("h3", null, "Nouvelle préparation"), H.el("div.ligne-option", null, nom, forme, H.el("button.bouton.petit", { type: "submit" }, "Ajouter"))));
  }

  H.organiser = function (ongletInitial) {
    let onglet = ongletInitial || "etageres";
    const zone = H.el("div.org-zone");
    const onglets = H.el("div.pastilles.org-onglets");
    const LISTE = [["etageres", "Étagères"], ["rubriques", "Rubriques des fiches"], ["preparations", "Préparations"]];
    function redessiner() {
      onglets.innerHTML = "";
      LISTE.forEach(([id, t]) => onglets.appendChild(H.el("button.bouton.petit" + (id === onglet ? ".actif" : ""), { type: "button", onclick: () => { onglet = id; redessiner(); } }, t)));
      zone.innerHTML = "";
      ({ etageres: ongletEtageres, rubriques: ongletRubriques, preparations: ongletPreparations })[onglet](zone, redessiner);
    }
    redessiner();
    H.fenetre(H.el("div.organiser", null, H.el("h2", null, "Organiser"), onglets, zone), {
      classe: "large",
      surFermer: () => {
        if (document.documentElement.dataset.vue === "herbotheque") H.router();
      },
    });
  };
})();
