// Fiche plante présentée comme une page d'herbier. Chaque rubrique se modifie sur place.
(function () {
  const H = window.H;
  let actuelle = null;
  let conteneur = null;

  const vide = (v) => v == null || v === "" || (Array.isArray(v) && !v.length);

  // --- illustration : un brin de plante à l'aquarelle, propre à chaque plante ---
  function planche(p) {
    const W = 260, Hh = 340, S = 2;
    const c = H.aqua.toile(W * S, Hh * S), ctx = c.getContext("2d"), r = H.alea(p.id + "planche");
    ctx.scale(S, S);
    const teinte = H.aqua.teintePlante(p);
    const fleurs = ["#e9e4f5", "#f2c94c", "#b48ad8", "#f08a9b", "#ffffff", "#f5a742", "#7aa6e0"];
    const fleur = fleurs[H.hash(p.id) % fleurs.length];
    const feuille = ["#7a9a4a", "#5f8a46", "#8aa35a", "#6b8f5a"][H.hash(p.id + "f") % 4];
    const tiges = 1 + Math.floor(r() * 3);
    const rubans = [];
    for (let t = 0; t < tiges; t++) {
      const x0 = W / 2 + (t - (tiges - 1) / 2) * 34 + (r() - 0.5) * 10;
      const haut = 60 + r() * 50;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const k = i / 12;
        pts.push([x0 + Math.sin(k * 3 + t) * 12 * k + (t - 1) * 18 * k, Hh - 20 - k * (Hh - 20 - haut)]);
      }
      H.aqua.trait(ctx, r, pts, { couleur: "#4f6b3a", epaisseur: 2, alpha: 0.75 });
      // le ruban se pose en travers de la tige, en bas, et un peu plus haut sur la tige principale
      for (const i of t === 0 ? [2, 7] : [3]) {
        const [x, y] = pts[i], [xa, ya] = pts[i - 1], [xb, yb] = pts[i + 1];
        rubans.push([x, y, Math.atan2(yb - ya, xb - xa) + (r() - 0.5) * 0.4]);
      }
      const n = 4 + Math.floor(r() * 4);
      for (let i = 1; i <= n; i++) {
        const k = i / (n + 1);
        const [x, y] = pts[Math.round(k * 12)];
        const taille = 14 + r() * 16 * (1 - k * 0.5);
        for (const cote of [-1, 1]) {
          const fx = x + cote * taille * 0.9, fy = y - taille * 0.3;
          H.aqua.tache(ctx, r, fx, fy, taille, taille * 0.38, feuille, { alpha: 0.09, couches: 10, bord: 0.3 });
          H.aqua.trait(ctx, r, [[x, y], [fx + cote * taille * 0.6, fy - 2]], { couleur: "#4f6b3a", epaisseur: 0.8, alpha: 0.5 });
        }
      }
      const [sx, sy] = pts[12];
      const nf = 3 + Math.floor(r() * 6);
      for (let i = 0; i < nf; i++) {
        const a = r() * Math.PI * 2, d = r() * 18;
        H.aqua.tache(ctx, r, sx + Math.cos(a) * d, sy + Math.sin(a) * d * 0.7 - 6, 7 + r() * 6, 6 + r() * 5, fleur, { alpha: 0.16, couches: 10 });
      }
      H.aqua.tache(ctx, r, sx, sy - 6, 4, 4, teinte, { alpha: 0.2, couches: 6 });
    }
    // rubans de papier gommé qui tiennent les tiges, comme dans un vrai herbier
    for (const [x, y, a] of rubans) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.fillStyle = "rgba(222, 204, 158, 0.85)";
      ctx.beginPath();
      // bords un peu déchirés aux deux bouts
      ctx.moveTo(-6, -17);
      ctx.lineTo(6, -18);
      ctx.lineTo(5, -6);
      ctx.lineTo(7, 6);
      ctx.lineTo(5, 18);
      ctx.lineTo(-6, 17);
      ctx.lineTo(-5, 5);
      ctx.lineTo(-7, -6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    return c.toDataURL("image/png");
  }

  // --- affichage d'une valeur selon son type -----------------------------------
  function valeurLecture(champ, v) {
    if (vide(v)) return H.el("p.discret.vide", null, "Pas encore rempli");
    switch (champ.type) {
      case "texte":
        return H.el("div.texte-fiche", { html: H.texteRiche(v) });
      case "choix":
        return H.el("div.pastilles", null, (Array.isArray(v) ? v : [v]).map((x) => H.el("span.pastille-valeur", null, x)));
      case "mois":
        return calendrier(v);
      case "plantes":
        return H.el(
          "div.pastilles",
          null,
          v.map((id) => {
            const q = H.d.plante(id);
            return q ? H.el("a.pastille-valeur.lien", { href: "#fiche/" + encodeURIComponent(id) }, q.nom) : null;
          })
        );
      default:
        return H.el("p", { html: H.texteRiche(String(v)).replace(/^<p>|<\/p>$/g, "") });
    }
  }

  function calendrier(mois, modifiable) {
    const sel = new Set(mois || []);
    const boite = H.el("div.calendrier" + (modifiable ? ".modifiable" : ""));
    H.MOIS.forEach((m, i) => {
      const n = i + 1;
      const b = H.el(modifiable ? "button" : "span", { class: "mois" + (sel.has(n) ? " plein" : ""), type: modifiable ? "button" : null, "aria-pressed": modifiable ? String(sel.has(n)) : null }, m.replace(".", ""));
      if (modifiable) {
        b.addEventListener("click", () => {
          sel.has(n) ? sel.delete(n) : sel.add(n);
          b.classList.toggle("plein");
          b.setAttribute("aria-pressed", String(sel.has(n)));
        });
      }
      boite.appendChild(b);
    });
    boite.valeur = () => Array.from(sel).sort((a, b) => a - b);
    return boite;
  }

  // --- éditeurs ----------------------------------------------------------------
  function editeur(champ, v, p) {
    switch (champ.type) {
      case "texte": {
        const t = H.el("textarea", { rows: Math.min(18, Math.max(5, String(v || "").split("\n").length + 2)) });
        t.value = v || "";
        t.valeur = () => t.value.trim();
        return H.el("div", null, t, H.el("p.discret.aide", null, "Une ligne par paragraphe. « • » ou « - » en début de ligne pour une puce, **mot** pour le gras, ## pour un sous-titre."));
      }
      case "choix": {
        const multiple = !!champ.multiple;
        const sel = new Set(Array.isArray(v) ? v : v ? [v] : []);
        const boite = H.el("div.choix-options");
        const dessiner = () => {
          boite.innerHTML = "";
          for (const o of champ.options || []) {
            boite.appendChild(
              H.el("label.option", null,
                H.el("input", {
                  type: multiple ? "checkbox" : "radio",
                  name: "opt-" + champ.id,
                  checked: sel.has(o),
                  onchange(e) {
                    if (!multiple) sel.clear();
                    e.target.checked ? sel.add(o) : sel.delete(o);
                  },
                }),
                " " + o
              )
            );
          }
          if (!multiple) {
            boite.appendChild(H.el("label.option", null, H.el("input", { type: "radio", name: "opt-" + champ.id, checked: !sel.size, onchange: () => sel.clear() }), " (aucun)"));
          }
        };
        dessiner();
        const nouvelle = H.el("input", { type: "text", placeholder: "Nouvelle option" });
        const ajouter = H.el("button.bouton.petit", {
          type: "button",
          onclick() {
            const o = nouvelle.value.trim();
            if (!o) return;
            H.d.majSchema(() => {
              const c = H.d.champ(champ.id);
              c.options = c.options || [];
              if (!c.options.includes(o)) c.options.push(o);
              champ.options = c.options;
            });
            if (!multiple) sel.clear();
            sel.add(o);
            nouvelle.value = "";
            dessiner();
          },
        }, "Ajouter l’option");
        const tout = H.el("div", null, boite, H.el("div.ligne-option", null, nouvelle, ajouter));
        tout.valeur = () => (multiple ? Array.from(sel) : Array.from(sel)[0] || "");
        return tout;
      }
      case "mois":
        return calendrier(v, true);
      case "plantes": {
        let ids = (v || []).slice();
        const boite = H.el("div.pastilles");
        const dessiner = () => {
          boite.innerHTML = "";
          ids.forEach((id) => {
            const q = H.d.plante(id);
            if (q) boite.appendChild(H.el("span.pastille-valeur", null, q.nom));
          });
          boite.appendChild(
            H.el("button.bouton.petit", { type: "button", onclick: () => H.choisirPlantes(ids, (n) => { ids = n.filter((x) => x !== p.id); dessiner(); }, champ.nom) }, "Choisir")
          );
        };
        dessiner();
        boite.valeur = () => ids;
        return boite;
      }
      default: {
        const i = H.el("input", { type: "text", value: v || "" });
        i.valeur = () => i.value.trim();
        return i;
      }
    }
  }

  function rubrique(p, champ) {
    const v = (p.valeurs || {})[champ.id];
    const aVerif = H.d.aVerifier(p, champ.id);
    const bloc = H.el("div.rubrique" + (aVerif ? ".a-verifier" : ""), { "data-champ": champ.id });
    const titre = H.el("h3", null, champ.nom);
    if (aVerif) titre.appendChild(H.el("span.puce-a-verifier", { title: "Valeur pré-remplie d’après le biotope et des guides de jardinage" }, "à vérifier"));
    const actions = H.el("span.actions-rubrique");
    if (aVerif) {
      actions.appendChild(H.el("button.bouton.petit", { type: "button", onclick: () => { H.d.confirmer(p.id, champ.id); recharger(); } }, "C’est juste"));
    }
    actions.appendChild(H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => modifier() }, vide(v) ? "Remplir" : "Modifier"));
    const corps = H.el("div.corps-rubrique", null, valeurLecture(champ, v));
    bloc.append(H.el("div.tete-rubrique", null, titre, actions), corps);

    function modifier() {
      const ed = editeur(champ, v, p);
      const champValeur = ed.valeur ? ed : ed.querySelector("textarea") || ed;
      corps.innerHTML = "";
      corps.appendChild(ed);
      actions.hidden = true;
      corps.appendChild(
        H.el("div.boutons-bas", null,
          H.el("button.bouton.discret-bouton", { type: "button", onclick: recharger }, "Annuler"),
          H.el("button.bouton", {
            type: "button",
            onclick() {
              const nv = champValeur.valeur();
              H.d.majPlante(p.id, (x) => {
                x.valeurs = x.valeurs || {};
                if (vide(nv)) delete x.valeurs[champ.id];
                else x.valeurs[champ.id] = nv;
                x.aVerifier = (x.aVerifier || []).filter((c) => c !== champ.id);
              });
              H.toast("Rubrique enregistrée");
              recharger();
            },
          }, "Enregistrer")
        )
      );
      const focus = corps.querySelector("textarea, input");
      if (focus) focus.focus();
    }
    return bloc;
  }

  // --- en-tête de fiche : nom, préparations, étagères, photo ---------------------
  function enTete(p) {
    const illus = p.photo
      ? H.el("figure.photo-lofi", null, H.el("img", { src: p.photo.src, alt: "Photo " + H.duNom(p) }), H.el("span.date-photo", null, p.photo.date || ""))
      : H.el("img.planche-illus", { src: planche(p), alt: "" });

    const preps = H.el("div.pastilles.preps");
    for (const prep of H.d.preparations()) {
      const a = (p.preparations || []).includes(prep.id);
      preps.appendChild(
        H.el("button.bouton.petit" + (a ? ".actif" : ""), {
          type: "button",
          "aria-pressed": String(a),
          title: a ? "Retirer cette préparation" : "Ajouter cette préparation",
          onclick() {
            H.d.majPlante(p.id, (x) => {
              x.preparations = x.preparations || [];
              if (x.preparations.includes(prep.id)) x.preparations = x.preparations.filter((y) => y !== prep.id);
              else x.preparations.push(prep.id);
              if (x.preparationPrincipale && !x.preparations.includes(x.preparationPrincipale)) delete x.preparationPrincipale;
            });
            recharger();
          },
        }, H.el("img", { src: H.aqua.bocal(prep.forme, H.aqua.teintePlante(p)), alt: "", class: "mini-bocal" }), prep.nom)
      );
    }
    // niveau de chaque bocal dans l'herbothèque
    const stocks = H.el("div.stocks",
      null,
      (p.preparations || []).map((id) => {
        const prep = H.d.preparation(id);
        if (!prep) return null;
        return H.el("label.ligne-stock", null,
          H.el("img.mini-bocal", { src: H.aqua.bocal(prep.forme, H.aqua.teintePlante(p), H.d.stock(p, id)), alt: "" }),
          H.el("span", null, prep.nom),
          H.el("select", { "aria-label": "Stock : " + prep.nom, onchange: (e) => { H.d.fixerStock(p.id, id, e.target.value); recharger(); } },
            H.d.NIVEAUX.map(([v, t]) => H.el("option", { value: v, selected: H.d.stock(p, id) === v }, t)))
        );
      })
    );
    const choixPrincipal = H.el(
      "select",
      {
        "aria-label": "Bocal sur l’étagère",
        onchange(e) {
          H.d.majPlante(p.id, (x) => (x.preparationPrincipale = e.target.value));
          recharger();
        },
      },
      (p.preparations || []).map((id) => {
        const prep = H.d.preparation(id);
        return prep ? H.el("option", { value: id, selected: id === (p.preparationPrincipale || p.preparations[0]) }, prep.nom) : null;
      })
    );

    const manuels = [];
    for (const rg of H.herbier.rangements.filter((r) => r.type === "manuel")) {
      for (const et of rg.etageres || []) {
        const dedans = et.plantes.includes(p.id);
        manuels.push(
          H.el("button.bouton.petit" + (dedans ? ".actif" : ""), {
            type: "button",
            "aria-pressed": String(dedans),
            onclick() {
              et.plantes = dedans ? et.plantes.filter((x) => x !== p.id) : et.plantes.concat(p.id);
              H.herbier.rangementsModifieLe = H.maintenant();
              H.d.changer("herbier");
              recharger();
            },
          }, et.nom)
        );
      }
    }

    const liste = H.d.plantes();
    const i = liste.findIndex((x) => x.id === p.id);
    const prec = liste[(i - 1 + liste.length) % liste.length];
    const suiv = liste[(i + 1) % liste.length];

    return H.el(
      "header.fiche-tete",
      null,
      H.el("nav.fiche-nav", null,
        H.el("a.bouton.discret-bouton", { href: "#herbotheque" }, "Retour aux étagères"),
        H.el("span.fiche-fleches", null,
          H.el("a.bouton.petit", { href: "#fiche/" + encodeURIComponent(prec.id), title: prec.nom }, "Précédente"),
          H.el("a.bouton.petit", { href: "#fiche/" + encodeURIComponent(suiv.id), title: suiv.nom }, "Suivante")
        )
      ),
      H.el("div.fiche-haut", null,
        H.el("div.fiche-illus", null, illus),
        H.el("div.fiche-noms", null,
          H.el("h1.fiche-nom", null, p.nom),
          p.latin ? H.el("p.fiche-latin", null, p.latin) : null,
          (p.valeurs || {}).nomsCommuns ? H.el("p.discret.fiche-communs", null, p.valeurs.nomsCommuns) : null,
          H.el("div.fiche-outils", null,
            H.el("button.bouton.petit", { type: "button", onclick: () => renommer(p) }, "Renommer"),
            H.el("button.bouton.petit", { type: "button", onclick: () => ajouterPhoto(p) }, p.photo ? "Changer la photo" : "Ajouter une photo"),
            p.photo ? H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { H.d.majPlante(p.id, (x) => delete x.photo); recharger(); } }, "Retirer la photo") : null,
            H.el("a.bouton.petit", { href: "#cartes/plante/" + encodeURIComponent(p.id) }, "Réviser cette plante")
          )
        )
      ),
      H.el("div.fiche-preps", null,
        H.el("h3", null, "Préparations dans l’herbothèque"),
        preps,
        (p.preparations || []).length > 1 ? H.el("label.discret", null, "Bocal posé sur les étagères : ", choixPrincipal) : null
      ),
      (p.preparations || []).length ? H.el("div.fiche-preps", null, H.el("h3", null, "Stock dans l’herbothèque"), stocks) : null,
      manuels.length ? H.el("div.fiche-preps", null, H.el("h3", null, "Sur mes étagères"), H.el("div.pastilles", null, manuels)) : null,
      H.el("div.fiche-preps.fiche-carte", null,
        H.el("h3", null, "Sur la carte du terrain"),
        H.el("div.ligne-carte", null,
          H.el("img.apercu-carte", { src: p.dessinCarte || (H.terrain ? H.terrain.dessinAuto(p) : ""), alt: "" }),
          H.el("button.bouton.petit", { type: "button", onclick: () => H.dessinerPlante(p.id, recharger) }, p.dessinCarte || p.dessinFace || p.dessinCote ? "Modifier son modèle" : "Dessiner son modèle")
        )
      ),
      H.photos ? H.photos.section(p, recharger, p.photo ? null : illus) : null
    );
  }

  function renommer(p) {
    const nom = H.el("input", { type: "text", value: p.nom });
    const latin = H.el("input", { type: "text", value: p.latin || "" });
    let fermer;
    fermer = H.fenetre(
      H.el("form.formulaire", {
        onsubmit(e) {
          e.preventDefault();
          if (!nom.value.trim()) return;
          H.d.majPlante(p.id, (x) => {
            x.nom = nom.value.trim();
            x.latin = latin.value.trim();
          });
          fermer();
          recharger();
        },
      },
        H.el("h2", null, "Renommer"),
        H.el("label", null, "Nom", nom),
        H.el("label", null, "Nom latin", latin),
        H.el("div.boutons-bas", null,
          H.el("button.bouton.discret-bouton", { type: "button", onclick: () => { if (confirm("Supprimer la fiche « " + p.nom + " » ?")) { H.d.supprimerPlante(p.id); fermer(); H.aller("herbotheque"); } } }, "Supprimer la fiche"),
          H.el("button.bouton", { type: "submit" }, "Enregistrer")
        )
      )
    );
  }

  // Photo réduite (pour la synchronisation) et datée façon vieil appareil.
  function ajouterPhoto(p) {
    const input = H.el("input", { type: "file", accept: "image/*" });
    input.addEventListener("change", async () => {
      const f = input.files[0];
      if (!f) return;
      const img = await createImageBitmap(f).catch(() => null);
      if (!img) return H.toast("Cette image ne s’ouvre pas");
      const max = 720, k = Math.min(1, max / Math.max(img.width, img.height));
      const c = H.aqua.toile(Math.round(img.width * k), Math.round(img.height * k));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const d = new Date(f.lastModified || Date.now());
      const date = String(d.getDate()).padStart(2, " ") + " " + String(d.getMonth() + 1).padStart(2, " ") + " '" + String(d.getFullYear()).slice(2);
      H.d.majPlante(p.id, (x) => (x.photo = { src: c.toDataURL("image/jpeg", 0.72), date }));
      recharger();
    });
    input.click();
  }

  function etiquetteHerbier(p) {
    const n = H.d.plantes().findIndex((x) => x.id === p.id) + 1;
    return H.el("aside.etiquette-herbier", null,
      H.el("p.titre-etiquette", null, "Herbier d’ƟvƟ"),
      H.el("p", null, H.el("span.discret", null, "N° "), String(n).padStart(3, "0")),
      p.latin ? H.el("p", null, H.el("em", null, p.latin)) : null,
      (p.valeurs || {}).famille ? H.el("p", null, p.valeurs.famille) : null,
      p.source ? H.el("p.discret", null, p.source) : null
    );
  }

  // Le navigateur de l'herbothèque : plusieurs fenêtres, chacune avec autant d'onglets qu'on veut
  // (comme sur l'ordinateur d'ƟvƟ, avec ses centaines d'onglets). Gardé sur cet appareil.
  function fenetres() {
    let f = H.local.fenetresNav;
    if (!f || !f.length) f = [{ onglets: (H.local.onglets || []).slice() }];
    return f.map((x) => ({ onglets: (x.onglets || []).filter((id) => H.d.plante(id)) }));
  }
  const fenetreActive = (f) => Math.max(0, Math.min(H.local.fenetreNav || 0, (f || fenetres()).length - 1));
  function enregistrer(f, active) {
    H.d.majLocal((l) => {
      l.fenetresNav = f;
      l.fenetreNav = active;
      delete l.onglets;
    });
  }
  const versOnglet = (id) => H.aller(id ? "fiche/" + encodeURIComponent(id) : "herbotheque");
  // ouvrir une fiche : si elle est déjà ouverte quelque part, on va dans sa fenêtre
  function ouvrirOnglet(id) {
    const f = fenetres();
    let a = fenetreActive(f);
    const ailleurs = f.findIndex((x) => x.onglets.includes(id));
    if (ailleurs >= 0) a = ailleurs;
    else f[a].onglets.push(id);
    enregistrer(f, a);
    return { f, a };
  }
  function fermerOnglet(id) {
    let f = fenetres(), a = fenetreActive(f);
    f[a].onglets = f[a].onglets.filter((x) => x !== id);
    if (!f[a].onglets.length && f.length > 1) {
      f.splice(a, 1);
      a = Math.max(0, a - 1);
    }
    enregistrer(f, a);
    if (id === actuelle) versOnglet(f[a].onglets[f[a].onglets.length - 1]);
    else afficherFiche(actuelle);
  }
  // détacher l'onglet dans une nouvelle fenêtre
  function nouvelleFenetre(id) {
    const f = fenetres(), a = fenetreActive(f);
    f[a].onglets = f[a].onglets.filter((x) => x !== id);
    f.push({ onglets: [id] });
    const vides = f[a].onglets.length === 0;
    if (vides) f.splice(a, 1);
    enregistrer(f, f.length - 1);
    afficherFiche(id);
  }
  function changerFenetre(i) {
    const f = fenetres();
    enregistrer(f, i);
    const o = f[i].onglets;
    versOnglet(o[o.length - 1]);
  }
  function fermerFenetre(i) {
    let f = fenetres();
    f.splice(i, 1);
    if (!f.length) f = [{ onglets: [] }];
    const a = Math.min(fenetreActive(f), f.length - 1);
    enregistrer(f, a);
    const o = f[a].onglets;
    versOnglet(o[o.length - 1]);
  }
  function chromeNavigateur(id) {
    const { f, a } = ouvrirOnglet(id);
    const liste = f[a].onglets;
    return H.el("div.chrome-navigateur", null,
      // les fenêtres ouvertes, comme une barre des tâches
      H.el("div.fenetres-navigateur", null,
        f.map((x, i) => H.el("div.fenetre-mini" + (i === a ? ".active" : ""), null,
          H.el("button.choisir-fenetre", { type: "button", onclick: () => changerFenetre(i) }, "Fenêtre " + (i + 1) + " · " + x.onglets.length + (x.onglets.length > 1 ? " onglets" : " onglet")),
          H.el("button.fermer-onglet", { type: "button", "aria-label": "Fermer la fenêtre " + (i + 1), onclick: () => fermerFenetre(i) }, "×"))),
        H.el("button.menu-bureau", { type: "button", onclick: () => nouvelleFenetre(id) }, "Ouvrir cet onglet dans une nouvelle fenêtre")
      ),
      H.el("div.titre-fenetre", null,
        H.el("button.fermer-fenetre", { type: "button", "aria-label": "Retour à l’herbothèque", onclick: () => H.aller("herbotheque") }, "×"),
        H.el("span", null, "Navigateur — fenêtre " + (a + 1) + " · " + liste.length + (liste.length > 1 ? " onglets" : " onglet"))),
      H.el("div.onglets-navigateur", { role: "tablist" },
        liste.map((x) => {
          const q = H.d.plante(x);
          return H.el("div.onglet" + (x === id ? ".actif" : ""), { role: "tab", "aria-selected": x === id ? "true" : "false", title: q.nom },
            H.el("a", { href: "#fiche/" + encodeURIComponent(x) }, q.nom),
            H.el("button.fermer-onglet", { type: "button", "aria-label": "Fermer l’onglet " + q.nom, onclick: () => fermerOnglet(x) }, "×"));
        }),
        H.el("a.nouvel-onglet", { href: "#herbotheque", title: "Nouvel onglet : choisir une plante dans l’herbothèque", "aria-label": "Nouvel onglet" }, "+")),
      H.el("div.adresse-navigateur", null, "herbotheque://fiches/" + id)
    );
  }

  function afficherFiche(id) {
    const p = H.d.plante(id);
    conteneur.innerHTML = "";
    if (!p) {
      conteneur.appendChild(H.el("p", null, "Cette plante n’est pas (ou plus) dans l’herbothèque. ", H.el("a", { href: "#herbotheque" }, "Retour aux étagères")));
      return;
    }
    actuelle = id;
    conteneur.appendChild(H.el("div.navigateur-fiche", null, chromeNavigateur(id), pageFiche(p)));
  }

  // la page d'une fiche (en-tête, sections en onglets, étiquette), pour l'herbothèque ou pour la
  // carte qui s'ouvre par-dessus le jardin
  function pageFiche(p) {
    const page = H.el("article.page-herbier");
    page.appendChild(enTete(p));
    // les sections de la fiche en onglets, comme les fenêtres de l'ordinateur ; l'onglet ouvert
    // reste le même d'une plante à l'autre (pratique pour comparer)
    const onglets = [];
    const champsParSection = {};
    for (const c of H.d.champs()) (champsParSection[c.section] = champsParSection[c.section] || []).push(c);
    for (const s of H.d.sections()) {
      const champs = champsParSection[s.id] || [];
      if (!champs.length) continue;
      const remplis = champs.filter((c) => !vide((p.valeurs || {})[c.id]));
      const vides = champs.filter((c) => vide((p.valeurs || {})[c.id]));
      const aVerif = champs.filter((c) => H.d.aVerifier(p, c.id)).length;
      const det = H.el("details.section-fiche", { id: "section-" + s.id, open: remplis.length > 0 && s.id !== "approches" });
      det.appendChild(
        H.el("summary", null, H.el("h2", null, s.nom), aVerif ? H.el("span.puce-a-verifier", null, aVerif + " à vérifier") : null)
      );
      remplis.forEach((c) => det.appendChild(rubrique(p, c)));
      if (vides.length) {
        const plus = H.el("div.rubriques-vides");
        const bouton = H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { bouton.remove(); vides.forEach((c) => plus.appendChild(rubrique(p, c))); } },
          "Rubriques vides : " + vides.map((c) => c.nom).join(", "));
        plus.appendChild(bouton);
        det.appendChild(plus);
      }
      onglets.push({ nom: s.nom + (aVerif ? " •" : ""), el: det });
    }
    page.appendChild(H.bureau.onglets(onglets, { cle: "fiche" }));
    page.appendChild(etiquetteHerbier(p));
    return page;
  }

  // La fiche en carte, par-dessus le jardin : on la lit sans quitter l'île, on peut la réduire en
  // bas de l'écran (un clic sur sa barre la rouvre) ou la fermer.
  let carte = null;
  function carteFiche(id) {
    const p = H.d.plante(id);
    if (!p) return;
    if (carte) carte.remove();
    const corps = H.el("div.corps-carte-fiche", null, pageFiche(p));
    const reduire = H.el("button.bouton-carte-fiche", { type: "button", "aria-label": "Réduire la fiche", title: "Réduire" }, "_");
    const barre = H.el("div.barre-carte-fiche", null,
      H.el("span.titre-carte-fiche", null, p.nom),
      reduire,
      H.el("button.bouton-carte-fiche", { type: "button", "aria-label": "Fermer la fiche", title: "Fermer", onclick: (e) => { e.stopPropagation(); carte.remove(); carte = null; } }, "×"));
    carte = H.el("section.carte-fiche", { role: "dialog", "aria-label": "Fiche : " + p.nom }, barre, corps);
    const basculer = () => { carte.classList.toggle("reduite"); reduire.textContent = carte.classList.contains("reduite") ? "▢" : "_"; reduire.title = carte.classList.contains("reduite") ? "Rouvrir" : "Réduire"; };
    reduire.addEventListener("click", (e) => { e.stopPropagation(); basculer(); });
    barre.addEventListener("click", () => carte.classList.contains("reduite") && basculer());
    document.body.appendChild(carte);
  }
  // la carte se ferme quand on quitte l'île
  window.addEventListener("hashchange", () => { if (carte && !location.hash.startsWith("#terrain/")) { carte.remove(); carte = null; } });

  function recharger() {
    if (!conteneur || !actuelle) return;
    const y = window.scrollY;
    afficherFiche(actuelle);
    window.scrollTo(0, y);
  }

  H.vues.fiche = {
    afficher(c, params) {
      conteneur = c;
      afficherFiche(params[0]);
      window.scrollTo(0, 0);
    },
    mettreAJour(params) {
      afficherFiche(params[0]);
      window.scrollTo(0, 0);
    },
    quitter() {
      conteneur = null;
      actuelle = null;
    },
  };

  H.fiche = { planche, calendrier, valeurLecture, carte: carteFiche };
})();
