// Le terrain : des îles-jardins, vues de dessus, à l'échelle.
// Chaque case a une exposition et un sol ; chaque plante pousse en temps réel,
// plus ou moins vite selon que les conditions lui plaisent. Jeu doux : rien ne meurt.
// Une île « croquis » sert d'esquisse pour un vrai projet (pas de ressources, plantes adultes).
(function () {
  const H = window.H;
  const T = 32; // taille d'une case à l'écran (zoom 1)
  const BORD = 2; // cases de mer autour de l'île
  const HEURE = 3600e3;

  const TUILES = {
    herbe: { nom: "Herbe", cout: {} },
    terre: { nom: "Terre bêchée", cout: { outils: 1 } },
    chemin: { nom: "Chemin", cout: { outils: 1, terre: 1 } },
    gravier: { nom: "Gravier", cout: { outils: 1 } },
    eau: { nom: "Mare", cout: { outils: 2 } },
    serre: { nom: "Serre ou pots", cout: { outils: 3, soleil: 1 } },
  };
  const EXPOS = ["Plein soleil", "Mi-ombre", "Ombre"];
  const CONTRAIRES = [["Sec", "Humide"], ["Calcaire", "Acide"], ["Riche", "Pauvre"], ["Sableux", "Argileux"]];
  const BESOIN_EAU = { Faible: 25, "Modéré": 45, "Régulier": 65, Abondant: 80 };
  const ILE_SECRETE = "lolo-meme";
  const OUVERTURE_SECRETE = new Date(2027, 1, 24); // le 24 février : son anniversaire

  // --- données -----------------------------------------------------------------
  const iles = () => Object.values(H.jeu.iles || {}).filter((i) => !i.supprime);
  const cle = (x, y) => x + "," + y;

  function sauver(ile) {
    ile.modifieLe = H.maintenant();
    H.jeu.iles = H.jeu.iles || {};
    H.jeu.iles[ile.id] = ile;
    H.d.changer("jeu");
  }

  function caseDe(ile, x, y) {
    const c = (ile.cases || {})[cle(x, y)] || {};
    return { t: c.t || "herbe", expo: c.expo || ile.expo || "Plein soleil", sol: c.sol || ile.sol || [] };
  }

  function nombre(texte) {
    // « 1 m en haie, 3 m isolé » -> 1 (en mètres) ; « 50 cm » -> 0,5
    const m = /([\d,.]+)\s*(?:[–-]\s*[\d,.]+\s*)?(cm|m)\b/.exec(String(texte || ""));
    if (!m) return null;
    const n = parseFloat(m[1].replace(",", "."));
    return m[2] === "cm" ? n / 100 : n;
  }

  // --- conditions : est-ce que la plante se plaît ici ? ----------------------------
  function evaluer(ile, x, y, p, pl) {
    const v = p.valeurs || {};
    const c = caseDe(ile, x, y);
    const raisons = [];
    let f = 1;

    // exposition
    const expos = v.exposition || [];
    if (expos.length && c.t !== "serre") {
      if (!expos.includes(c.expo)) {
        const voisin = (c.expo === "Mi-ombre") || expos.includes("Mi-ombre");
        f *= voisin ? 0.65 : 0.35;
        if (EXPOS.indexOf(c.expo) > EXPOS.indexOf(expos[0])) raisons.push("Elle aimerait plus de lumière (" + expos.join(", ").toLowerCase() + ").");
        else raisons.push("Elle préférerait un coin plus ombragé (" + expos.join(", ").toLowerCase() + ").");
      }
    }
    // sol
    const sols = v.sol || [];
    if (sols.length && c.t !== "serre") {
      const ici = new Set(c.sol);
      if (c.t === "gravier") ["Caillouteux", "Sec", "Bien drainé"].forEach((s) => ici.add(s));
      if (c.t === "terre") ici.add("Riche");
      const communs = sols.filter((s) => ici.has(s)).length;
      let sf = 0.55 + 0.45 * Math.min(1, communs / Math.min(3, sols.length));
      const opposes = [];
      for (const [a, b] of CONTRAIRES) {
        if (sols.includes(a) && ici.has(b) && !sols.includes(b)) opposes.push(b.toLowerCase());
        if (sols.includes(b) && ici.has(a) && !sols.includes(a)) opposes.push(a.toLowerCase());
      }
      sf -= 0.25 * opposes.length;
      sf = Math.max(0.25, Math.min(1, sf));
      if (sf < 0.85) raisons.push("Le sol ne lui va pas tout à fait : elle aime un sol " + sols.slice(0, 4).join(", ").toLowerCase() + (opposes.length ? " (ici trop " + opposes.join(", ") + ")" : "") + ".");
      f *= sf;
    }
    // climat méditerranéen
    const cm = v.climatMed;
    if (cm && c.t !== "serre") {
      if (cm === "Idéale") f *= 1.05;
      else if (cm === "Difficile") {
        f *= 0.6;
        raisons.push("Le climat du Sud est rude pour elle : un coin frais et humide l’aiderait.");
      } else if (cm === "En pot ou en serre") {
        f *= 0.35;
        raisons.push("Elle serait bien mieux à l’abri, en serre ou en pot.");
      } else if (/ombre/.test(cm) && c.expo === "Plein soleil") {
        f *= 0.75;
        raisons.push("Au soleil du Sud, elle apprécierait un peu d’ombre et d’eau.");
      }
    }
    if (c.t === "herbe") f *= 0.95;
    if (c.t === "terre") f *= 1.05;
    // voisines
    let bonus = 0;
    const bonnes = v.bonnesVoisines || [], mauvaises = v.mauvaisesVoisines || [];
    const amies = [], fâcheuses = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const autre = (ile.plantes || {})[cle(x + dx, y + dy)];
        if (!autre) continue;
        const q = H.d.plante(autre.p);
        const ov = (q && q.valeurs) || {};
        if (bonnes.includes(autre.p) || (ov.bonnesVoisines || []).includes(p.id)) {
          bonus += 0.08;
          if (q) amies.push(q.nom);
        }
        if (mauvaises.includes(autre.p) || (ov.mauvaisesVoisines || []).includes(p.id)) {
          bonus -= 0.15;
          if (q) fâcheuses.push(q.nom);
        }
      }
    }
    bonus = Math.min(0.16, bonus);
    if (amies.length) raisons.push("Elle se plaît avec ses voisines : " + Array.from(new Set(amies)).join(", ") + ".");
    if (fâcheuses.length) raisons.push("Elle ne s’entend pas avec : " + Array.from(new Set(fâcheuses)).join(", ") + ".");
    f *= 1 + bonus;
    if (pl && pl.purinJusqua > H.maintenant()) f *= 1.15;
    // eau
    if (pl && !ile.croquis) {
      const besoin = BESOIN_EAU[v.arrosage] || 45;
      if (pl.eau < besoin) raisons.push(pl.eau < besoin / 2 ? "Elle a très soif." : "Elle a un peu soif.");
      else if (v.arrosage === "Faible" && pl.eau > 85 && c.t !== "serre") raisons.push("Un peu trop d’eau pour elle.");
    }
    return { facteur: Math.max(0.15, Math.min(1.3, f)), raisons };
  }

  function facteurEau(p, pl, c) {
    const v = p.valeurs || {};
    const besoin = BESOIN_EAU[v.arrosage] || 45;
    if (pl.eau >= besoin) return v.arrosage === "Faible" && pl.eau > 85 && c.t !== "serre" ? 0.8 : 1;
    return 0.3 + 0.7 * (pl.eau / besoin);
  }

  // Fait pousser une plante depuis sa dernière mise à jour (pas d'une heure).
  function pousser(ile, x, y, pl, maintenant) {
    if (ile.croquis) return;
    const p = H.d.plante(pl.p);
    if (!p) return;
    const meteo = H.pluieMagique && H.pluieMagique() ? Object.assign({}, H.ciel.meteo, { type: "pluie" }) : H.ciel.meteo || {};
    const c = caseDe(ile, x, y);
    const v = p.valeurs || {};
    let heures = Math.min(24 * 45, (maintenant - (pl.maj || maintenant)) / HEURE);
    if (heures < 0.05) return;
    const { facteur } = evaluer(ile, x, y, p, pl);
    const mois = new Date(maintenant).getMonth() + 1;
    const saison = (v.moisFloraison || []).length && (v.cycle === "Annuelle") && [12, 1, 2].includes(mois) ? 0.4 : [12, 1, 2].includes(mois) ? 0.6 : 1;
    const chaleur = meteo.temperature == null ? 1 : meteo.temperature > 26 ? 1.6 : meteo.temperature < 10 ? 0.5 : 1;
    const pluie = meteo.type === "pluie" || meteo.type === "orage" ? 9 : 0;
    const solSec = c.sol.includes("Sec") ? 1.2 : c.sol.includes("Humide") || c.t === "eau" ? 0.6 : 1;
    const vitesse = 100 / 72; // trois jours pour devenir adulte quand tout va bien
    while (heures > 0) {
      const pas = Math.min(1, heures);
      const paille = pl.pailleJusqua > maintenant ? 0.5 : 1;
      const serre = c.t === "serre" ? 0.6 : 1;
      pl.eau = Math.max(0, Math.min(100, pl.eau - pas * 1.2 * chaleur * paille * solSec * serre + pas * (c.t === "serre" ? 0 : pluie)));
      pl.c = Math.min(100, pl.c + pas * vitesse * facteur * saison * facteurEau(p, pl, c));
      heures -= pas;
    }
    pl.maj = maintenant;
  }

  function stade(ile, pl) {
    if (ile.croquis) return 3;
    return pl.c < 5 ? 0 : pl.c < 30 ? 1 : pl.c < 70 ? 2 : 3;
  }
  const NOMS_STADES = ["graine", "pousse", "jeune plante", "adulte"];
  function fleurie(p, ile, pl) {
    return stade(ile, pl) >= 3 && (p.valeurs.moisFloraison || []).includes(new Date().getMonth() + 1);
  }
  function aRecolter(p, ile, pl) {
    if (ile.croquis) return false;
    return stade(ile, pl) >= 3 && (p.valeurs.moisRecolte || []).includes(new Date().getMonth() + 1) && (!pl.recolteLe || H.maintenant() - pl.recolteLe > 7 * 24 * HEURE);
  }

  // --- dessins -------------------------------------------------------------------
  const cacheDessins = new Map();
  function memo(cleD, fn) {
    if (!cacheDessins.has(cleD)) cacheDessins.set(cleD, fn());
    return cacheDessins.get(cleD);
  }
  const TEINTES_SAISON = { printemps: "#9cc77a", "été": "#bcc46a", automne: "#b9a35a", hiver: "#93a68c" };

  function textureTuile(type, saison, variante) {
    return memo("tuile|" + type + "|" + saison + "|" + variante, () => {
      const S = 2, c = H.aqua.toile(T * S, T * S), ctx = c.getContext("2d"), r = H.alea(type + variante + saison);
      ctx.scale(S, S);
      const herbe = TEINTES_SAISON[saison] || "#9cc77a";
      const fonds = { herbe, terre: "#9a6a43", chemin: "#d8c7a6", gravier: "#cfc6b4", eau: "#79b5d3", serre: "#d9e9e6" };
      ctx.fillStyle = fonds[type];
      ctx.globalAlpha = 1;
      ctx.fillRect(0, 0, T, T);
      ctx.globalAlpha = 1;
      if (type === "herbe") {
        for (let i = 0; i < 3; i++) H.aqua.tache(ctx, r, r() * T, r() * T, 8 + r() * 8, 6 + r() * 6, i % 2 ? "#6f9a4f" : "#c9d98a", { alpha: 0.035, couches: 6 });
        for (let i = 0; i < 4; i++) {
          const x = r() * T, y = 6 + r() * (T - 8);
          H.aqua.trait(ctx, r, [[x, y], [x + (r() - 0.5) * 3, y - 4]], { couleur: "#4f7a3a", epaisseur: 0.8, alpha: 0.35 });
        }
      } else if (type === "terre") {
        for (let y = 5; y < T; y += 7) H.aqua.trait(ctx, r, [[2, y], [T - 2, y + (r() - 0.5) * 2]], { couleur: "#6b4423", epaisseur: 1, alpha: 0.35 });
      } else if (type === "chemin") {
        const dalle = H.aqua.rectArrondi(3, 3, T - 6, T - 6, 5);
        H.aqua.lavis(ctx, r, dalle, "#bfae8c", { alpha: 0.18, couches: 8 });
        H.aqua.trait(ctx, r, dalle.concat([dalle[0]]), { couleur: "#7a6a52", epaisseur: 0.8, alpha: 0.5 });
      } else if (type === "gravier") {
        for (let i = 0; i < 22; i++) H.aqua.tache(ctx, r, r() * T, r() * T, 1.8, 1.4, r() > 0.5 ? "#9a9080" : "#efe8da", { alpha: 0.3, couches: 3 });
      } else if (type === "eau") {
        for (let i = 0; i < 3; i++) H.aqua.trait(ctx, r, [[4 + r() * 8, 8 + i * 8], [14 + r() * 10, 8 + i * 8 + 1]], { couleur: "#ffffff", epaisseur: 1, alpha: 0.5 });
      } else if (type === "serre") {
        H.aqua.trait(ctx, r, [[1, 1], [T - 1, 1], [T - 1, T - 1], [1, T - 1], [1, 1]], { couleur: "#5c8a86", epaisseur: 1, alpha: 0.6 });
        H.aqua.trait(ctx, r, [[1, 1], [T - 1, T - 1]], { couleur: "#ffffff", epaisseur: 1, alpha: 0.5 });
      }
      return c;
    });
  }

  // Dessins faits à la main (H.dessinerPlante) : chargés une fois, puis redessinés à la bonne taille.
  const imagesDessin = new Map();
  function imageDessin(p) {
    const src = p.dessinCarte;
    let e = imagesDessin.get(p.id);
    if (!e || e.src !== src) {
      e = { src, pret: false, img: new Image() };
      e.img.onload = () => {
        e.pret = true;
        if (vue) dessiner();
      };
      e.img.src = src;
      imagesDessin.set(p.id, e);
    }
    return e.pret ? e.img : null;
  }

  function dessinPlante(p, st, fleur, rayonCases) {
    if (p.dessinCarte && st >= 2) {
      const img = imageDessin(p);
      if (img) {
        return memo("main|" + p.id + "|" + p.dessinCarte.length + "|" + st + "|" + rayonCases, () => {
          const rayon = st < 3 ? 11 : Math.max(12, Math.min(rayonCases * T, 6 * T));
          const taille = Math.ceil(rayon * 2 + 8);
          const c = H.aqua.toile(taille * 2, taille * 2);
          c.getContext("2d").drawImage(img, 0, 0, taille * 2, taille * 2);
          return c;
        });
      }
    }
    const cleD = "plante|" + p.id + "|" + st + "|" + (fleur ? 1 : 0) + "|" + rayonCases;
    return memo(cleD, () => {
      const r = H.alea(p.id + st);
      const rayon = st < 3 ? [4, 8, 11][st] : Math.max(12, Math.min(rayonCases * T, 6 * T));
      const taille = Math.ceil(rayon * 2 + 8);
      const S = 2, c = H.aqua.toile(taille * S, taille * S), ctx = c.getContext("2d");
      ctx.scale(S, S);
      const cx = taille / 2, cy = taille / 2;
      const feuille = ["#5f8a46", "#7a9a4a", "#6b8f5a", "#4f7a3a", "#8aa35a"][H.hash(p.id) % 5];
      const fleurs = ["#e9e4f5", "#f2c94c", "#b48ad8", "#f08a9b", "#ffffff", "#f5a742", "#7aa6e0"];
      const couleurFleur = fleurs[H.hash(p.id) % fleurs.length];
      const v = p.valeurs || {};
      if (st === 0) {
        H.aqua.tache(ctx, r, cx, cy + 2, 6, 3.5, "#6b4423", { alpha: 0.25, couches: 6 });
        H.aqua.tache(ctx, r, cx, cy + 1, 1.6, 1.4, "#3e2a18", { alpha: 0.5, couches: 3 });
      } else if (st === 1) {
        H.aqua.trait(ctx, r, [[cx, cy + 5], [cx, cy - 1]], { couleur: "#4f7a3a", epaisseur: 1.2 });
        H.aqua.tache(ctx, r, cx - 3, cy - 2, 3.5, 2, feuille, { alpha: 0.3, couches: 6 });
        H.aqua.tache(ctx, r, cx + 3, cy - 3, 3.5, 2, feuille, { alpha: 0.3, couches: 6 });
      } else {
        const arbre = v.cycle === "Arbre" || v.cycle === "Arbuste";
        if (arbre && st === 3) {
          H.aqua.tache(ctx, r, cx + 3, cy + 4, rayon * 0.9, rayon * 0.75, "#23214a", { alpha: 0.03, couches: 8 });
          H.aqua.tache(ctx, r, cx, cy, rayon, rayon * 0.92, feuille, { alpha: 0.075, couches: 16, bord: 0.35 });
          H.aqua.tache(ctx, r, cx - rayon * 0.3, cy - rayon * 0.3, rayon * 0.45, rayon * 0.4, "#c9e08a", { alpha: 0.06, couches: 8 });
        } else {
          const n = st === 2 ? 4 : 7;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2 + r();
            H.aqua.tache(ctx, r, cx + Math.cos(a) * rayon * 0.45, cy + Math.sin(a) * rayon * 0.45, rayon * 0.5, rayon * 0.35, feuille, { alpha: 0.12, couches: 8 });
          }
          H.aqua.tache(ctx, r, cx, cy, rayon * 0.5, rayon * 0.5, feuille, { alpha: 0.12, couches: 8 });
        }
        if (fleur) {
          const nf = Math.max(4, Math.round(rayon / 2));
          for (let i = 0; i < nf; i++) {
            const a = r() * Math.PI * 2, d = r() * rayon * 0.75;
            H.aqua.tache(ctx, r, cx + Math.cos(a) * d, cy + Math.sin(a) * d, 2.4, 2.2, couleurFleur, { alpha: 0.4, couches: 5 });
          }
        }
      }
      return c;
    });
  }

  // --- vue : l'archipel (liste des îles) --------------------------------------------
  function ileSecreteOuverte() {
    return H.local.apercuIleSecrete || new Date() >= OUVERTURE_SECRETE;
  }

  function miniature(ile) {
    const W = 220, Hh = 130, c = H.aqua.toile(W * 2, Hh * 2), ctx = c.getContext("2d"), r = H.alea(ile.id);
    ctx.scale(2, 2);
    H.aqua.tache(ctx, r, W / 2, Hh / 2, W * 0.5, Hh * 0.5, "#79b5d3", { alpha: 0.05, couches: 12 });
    const k = Math.min((W - 50) / ile.cols, (Hh - 40) / ile.lignes);
    const w = ile.cols * k, h = ile.lignes * k, x0 = (W - w) / 2, y0 = (Hh - h) / 2;
    H.aqua.lavis(ctx, r, H.aqua.rectArrondi(x0 - 5, y0 - 5, w + 10, h + 10, 12), "#e7d3a2", { alpha: 0.12, couches: 10, bord: 0.2 });
    H.aqua.lavis(ctx, r, H.aqua.rectArrondi(x0, y0, w, h, 8), TEINTES_SAISON[document.documentElement.dataset.saison] || "#9cc77a", { alpha: 0.13, couches: 10, bord: 0.2 });
    for (const [k2, pl] of Object.entries(ile.plantes || {})) {
      const [x, y] = k2.split(",").map(Number);
      const p = H.d.plante(pl.p);
      if (!p) continue;
      H.aqua.tache(ctx, r, x0 + (x + 0.5) * k, y0 + (y + 0.5) * k, Math.max(2, k * 0.6), Math.max(2, k * 0.6), "#5f8a46", { alpha: 0.25, couches: 4 });
    }
    return c.toDataURL("image/png");
  }

  function archipel(conteneur) {
    conteneur.appendChild(H.el("div.terrain-tete", null,
      H.el("h1", null, "Terrain"),
      H.el("div.herbo-boutons", null, H.el("button.bouton", { type: "button", onclick: nouvelleIle }, "Nouvelle île"))
    ));
    conteneur.appendChild(H.el("p.discret.terrain-intro", null,
      "Chaque île est un jardin. Les îles de jeu poussent en temps réel et demandent des ressources ; les îles croquis servent d’esquisse pour un vrai projet, à l’échelle."));
    const grille = H.el("div.archipel");
    const liste = iles().filter((i) => i.id !== ILE_SECRETE || ileSecreteOuverte());
    if (!liste.length) {
      grille.appendChild(H.el("p.discret", null, "Pas encore d’île. Clique sur « Nouvelle île » pour dessiner ton premier jardin."));
    }
    liste.forEach((ile) => {
      grille.appendChild(H.el("a.carte-ile", { href: "#terrain/" + encodeURIComponent(ile.id) },
        H.el("img", { src: miniature(ile), alt: "" }),
        H.el("span.nom-ile", null, ile.nom),
        H.el("span.discret", null, (ile.croquis ? "Croquis · " : "") + ile.largeur + " × " + ile.longueur + " m · " + Object.keys(ile.plantes || {}).length + " plantes")
      ));
    });
    if (!ileSecreteOuverte()) {
      grille.appendChild(H.el("div.carte-ile.brume", { title: "Une île se cache dans la brume" },
        H.el("span.brume-dessin", { "aria-hidden": "true" }),
        H.el("span.nom-ile", null, "Une île dans la brume"),
        H.el("span.discret", null, "Reviens le 24 février…")
      ));
    } else if (!(H.jeu.iles || {})[ILE_SECRETE]) {
      creerIleSecrete();
      return H.router();
    }
    conteneur.appendChild(grille);
  }

  function nouvelleIle() {
    const nom = H.el("input", { type: "text", placeholder: "Le jardin des simples" });
    const largeur = H.el("input", { type: "number", min: 2, max: 80, step: "0.5", value: 10 });
    const longueur = H.el("input", { type: "number", min: 2, max: 80, step: "0.5", value: 8 });
    const echelle = H.el("select", null, [["0.25", "25 cm"], ["0.5", "50 cm"], ["1", "1 m"], ["2", "2 m"]].map(([v, t]) => H.el("option", { value: v, selected: v === "0.5" }, t)));
    const type = H.el("select", null, H.el("option", { value: "jeu" }, "Île de jeu (pousse en temps réel)"), H.el("option", { value: "croquis" }, "Croquis de projet (sans ressources)"));
    const expo = H.el("select", null, EXPOS.map((e) => H.el("option", { value: e }, e)));
    const options = (H.d.champ("sol") || {}).options || [];
    const defaut = ["Calcaire", "Caillouteux", "Sec", "Bien drainé"];
    const sols = H.el("div.choix-options", null, options.map((o) => H.el("label.option", null, H.el("input", { type: "checkbox", value: o, checked: defaut.includes(o) }), " " + o)));
    const notes = H.el("textarea", { rows: 3, placeholder: "Adresse, personnes, envies, contraintes…" });
    const msg = H.el("p.discret.erreur");
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire", {
      onsubmit(e) {
        e.preventDefault();
        const n = nom.value.trim();
        const L = parseFloat(largeur.value), l = parseFloat(longueur.value), k = parseFloat(echelle.value);
        if (!n) return (msg.textContent = "Donne un nom à l’île.");
        if (!(L > 0 && l > 0)) return (msg.textContent = "Indique des dimensions en mètres.");
        const cols = Math.round(L / k), lignes = Math.round(l / k);
        if (cols > 80 || lignes > 80) return (msg.textContent = "C’est trop grand pour cette échelle : choisis des cases plus grandes (maximum 80 cases de côté).");
        if (cols < 3 || lignes < 3) return (msg.textContent = "C’est trop petit pour cette échelle : choisis des cases plus petites.");
        const ile = {
          id: H.uid("ile"), nom: n, largeur: L, longueur: l, caseM: k, cols, lignes,
          croquis: type.value === "croquis", expo: expo.value,
          sol: H.$$("input:checked", sols).map((i) => i.value),
          notes: notes.value.trim(), cases: {}, plantes: {}, creeLe: H.maintenant(),
        };
        sauver(ile);
        fermer();
        H.aller("terrain/" + encodeURIComponent(ile.id));
      },
    },
      H.el("h2", null, "Nouvelle île"),
      H.el("label", null, "Nom", nom),
      H.el("div.ligne-option", null, H.el("label", null, "Largeur (m)", largeur), H.el("label", null, "Longueur (m)", longueur), H.el("label", null, "Une case =", echelle)),
      H.el("label", null, "Type", type),
      H.el("label", null, "Exposition de départ", expo),
      H.el("div", null, H.el("h3", null, "Sol de départ"), sols, H.el("p.discret.aide", null, "Par défaut, un sol de garrigue. Tu pourras ensuite peindre des zones différentes.")),
      H.el("label", null, "Notes", notes),
      msg,
      H.el("button.bouton", { type: "submit" }, "Créer l’île")
    ));
    nom.focus();
  }

  function creerIleSecrete() {
    const ile = {
      id: ILE_SECRETE, nom: "L’île de Lóló et Mémé", largeur: 9, longueur: 7, caseM: 0.5, cols: 18, lignes: 14,
      croquis: false, secrete: true, expo: "Plein soleil", sol: ["Calcaire", "Limoneux", "Bien drainé"],
      notes: "", cases: {}, plantes: {}, creeLe: H.maintenant(),
    };
    const maintenant = H.maintenant();
    const fleurs = ["lavandula-angustifolia", "matricaria-recutita", "melissa-officinalis", "calendula-officinalis", "thymus-vulgaris", "viola-odorata", "rosmarinus-officinalis", "centaurea-cyanus", "papaver-rhoeas", "eschscholzia-californica"];
    const r = H.alea("lolo");
    for (let y = 0; y < ile.lignes; y++) {
      for (let x = 0; x < ile.cols; x++) {
        const bord = x < 2 || y < 2 || x >= ile.cols - 2 || y >= ile.lignes - 2;
        if (bord && r() < 0.55) {
          const id = fleurs[Math.floor(r() * fleurs.length)];
          if (H.d.plante(id)) ile.plantes[cle(x, y)] = { p: id, le: maintenant, c: 100, eau: 80, maj: maintenant };
        }
        if (y === Math.floor(ile.lignes / 2) && x >= 2 && x < ile.cols - 2) ile.cases[cle(x, y)] = { t: "chemin" };
      }
    }
    sauver(ile);
  }

  // --- vue : une île -----------------------------------------------------------------
  let vue = null; // état de l'île affichée

  function ouvrirIle(conteneur, id) {
    const ile = (H.jeu.iles || {})[id];
    if (!ile || ile.supprime || (ile.secrete && !ileSecreteOuverte())) {
      conteneur.appendChild(H.el("p", null, "Cette île n’existe pas (ou pas encore). ", H.el("a", { href: "#terrain" }, "Retour à l’archipel")));
      return;
    }
    const maintenant = H.maintenant();
    for (const [k, pl] of Object.entries(ile.plantes || {})) {
      const [x, y] = k.split(",").map(Number);
      pousser(ile, x, y, pl, maintenant);
    }

    vue = {
      ile, outil: "regarder", plante: null, tuile: "terre", zone: { expo: "Mi-ombre", sol: [] },
      zoom: H.local.zoomTerrain || (window.innerWidth < 640 ? 0.75 : 1),
      ovo: { x: ile.secrete ? 3 : Math.floor(ile.cols / 2), y: Math.floor(ile.lignes / 2) + (ile.secrete ? 1 : 0), cible: null, file: [], pas: 0 },
      luigi: null, gouttes: [], derniere: performance.now(), anim: 0, choisie: null,
    };

    const ciel = H.el("canvas.ciel-ile", { height: 70 });
    const infoCiel = H.el("p.info-ciel");
    const toile = H.el("canvas.toile-ile", { "aria-label": "Plan de l’île " + ile.nom });
    const zoneToile = H.el("div.zone-toile", null, toile);
    const outils = H.el("div.outils-terrain");
    const options = H.el("div.options-outil");
    const panneau = H.el("div.panneau-case", { hidden: true });

    conteneur.appendChild(H.el("div.terrain-tete", null,
      H.el("a.bouton.discret-bouton", { href: "#terrain" }, "Archipel"),
      H.el("h1", null, ile.nom),
      H.el("span.discret.echelle-ile", null, ile.largeur + " × " + ile.longueur + " m · une case = " + (ile.caseM < 1 ? ile.caseM * 100 + " cm" : ile.caseM + " m") + (ile.croquis ? " · croquis" : ""))
    ));
    conteneur.append(H.el("div.bandeau-ciel", null, ciel, infoCiel), outils, options, zoneToile, panneau);
    conteneur.appendChild(H.el("div.pied-ile", null,
      H.el("button.bouton.petit", { type: "button", onclick: () => exporterListe(ile) }, "Exporter la liste des plantes"),
      H.el("button.bouton.petit", { type: "button", onclick: () => exporterImage(ile) }, "Exporter le croquis (image)"),
      H.el("button.bouton.petit", { type: "button", onclick: () => reglagesIle(ile) }, "Réglages de l’île"),
      !ile.croquis ? H.el("button.bouton.petit", { type: "button", onclick: () => appelerMesi(true) }, "Appeler Mesi") : null,
      H.lolo && H.lolo.disponible() ? H.el("button.bouton.petit", { type: "button", onclick: appelerLolo }, "Appeler Lóló") : null,
      H.el("span.zoom", null,
        H.el("button.bouton.petit", { type: "button", "aria-label": "Dézoomer", onclick: () => zoomer(-1) }, "−"),
        H.el("button.bouton.petit", { type: "button", "aria-label": "Zoomer", onclick: () => zoomer(1) }, "+")
      )
    ));
    Object.assign(vue, { toile, ciel, infoCiel, outils, options, panneau, zoneToile });

    dessinerOutils();
    dimensionner();
    peindreFond();
    dessiner();
    dessinerCiel();
    toile.addEventListener("click", clic);
    boucle();
    if (ile.secrete) {
      // Lóló (avec Mémé sur le dos) arrive au galop depuis le bord de l'île
      vue.lolo = {};
      H.sons.galop(-4, ile.cols / 2, true, 0.6).then((c) => {
        if (vue) vue.lolo.course = c;
      });
    }
    if (!ile.croquis) vue.minuteurMesi = setInterval(visiteSpontanee, 60e3);
    if (ile.secrete && !H.jeu.vu.ileSecrete) {
      H.jeu.vu.ileSecrete = H.maintenant();
      H.d.changer("jeu");
      H.sons.bornes("galop").then((b) => setTimeout(() => vue && H.dialogue.dire([
        { qui: "lolo", texte: "Hiii ! Bienvenue sur notre île, ƟvƟ !" },
        { qui: "meme", texte: "Rrrrrrrr… rrrrrrrr… (Mémé ouvre un œil, sourit, et le referme.)" },
        { qui: "lolo", texte: (H.base.messageIle || "Joyeux anniversaire ! On t’a préparé un petit coin de fleurs rien que pour toi.") },
      ]), b.fin * 1000 + 300));
    }
  }

  function dessinerOutils() {
    const ile = vue.ile;
    const liste = ile.croquis
      ? [["regarder", "Regarder"], ["planter", "Planter"], ["amenager", "Aménager"], ["zones", "Soleil et sol"], ["retirer", "Retirer"]]
      : [["regarder", "Regarder"], ["planter", "Planter"], ["arroser", "Arroser"], ["recolter", "Récolter"], ["amenager", "Aménager"], ["zones", "Soleil et sol"], ["retirer", "Retirer"]];
    vue.outils.innerHTML = "";
    liste.forEach(([id, nom]) =>
      vue.outils.appendChild(H.el("button.bouton.petit.outil" + (vue.outil === id ? ".actif" : ""), { type: "button", "aria-pressed": String(vue.outil === id), onclick: () => { vue.outil = id; dessinerOutils(); } }, nom))
    );
    // options de l'outil
    const o = vue.options;
    o.innerHTML = "";
    if (vue.outil === "planter") {
      const p = vue.plante && H.d.plante(vue.plante);
      o.appendChild(H.el("button.bouton.petit", { type: "button", onclick: () => H.choisirPlantes(vue.plante ? [vue.plante] : [], (ids) => { vue.plante = ids[0] || null; vue.depuisSerre = false; retenirPlante(vue.plante); dessinerOutils(); }, "Quelle plante ?", { un: true, detail: ile.croquis ? null : (q) => pastillesCout(coutPlantation(q)) }) }, p && !vue.depuisSerre ? "Plante : " + p.nom : "Choisir la plante"));
      (H.local.plantesRecentes || []).slice(0, 6).forEach((id) => {
        const q = H.d.plante(id);
        if (q && (id !== vue.plante || vue.depuisSerre)) o.appendChild(H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { vue.plante = id; vue.depuisSerre = false; retenirPlante(id); dessinerOutils(); } }, q.nom));
      });
      // les bébés plantes de la serre : repiquage moins cher, et elles démarrent déjà jeunes
      if (!ile.croquis && H.serre) {
        const bebes = H.serre.bebes();
        if (bebes.length) {
          o.appendChild(H.el("span.cout", null, "De la serre :"));
          bebes.forEach(([id, n]) => {
            const q = H.d.plante(id);
            if (q) o.appendChild(H.el("button.bouton.petit" + (vue.depuisSerre && vue.plante === id ? ".actif" : ""), { type: "button", onclick: () => { vue.plante = id; vue.depuisSerre = true; dessinerOutils(); } }, q.nom + " × " + n));
          });
        }
      }
      if (!ile.croquis && p) {
        o.appendChild(vue.depuisSerre
          ? H.el("span.cout", null, "Repiquer un bébé " + H.nomPhrase(p) + " : ", pastillesCout(H.serre.coutRepiquage))
          : H.el("span.cout", null, "Pour planter " + H.duNom(p) + " : ", pastillesCout(coutPlantation(p))));
      }
    } else if (vue.outil === "amenager") {
      Object.entries(TUILES).forEach(([id, t]) =>
        o.appendChild(H.el("button.bouton.petit" + (vue.tuile === id ? ".actif" : ""), { type: "button", onclick: () => { vue.tuile = id; dessinerOutils(); } }, t.nom))
      );
      if (!ile.croquis) o.appendChild(H.el("span.cout", null, cout(TUILES[vue.tuile].cout)));
    } else if (vue.outil === "zones") {
      EXPOS.forEach((e) => o.appendChild(H.el("button.bouton.petit" + (vue.zone.expo === e ? ".actif" : ""), { type: "button", onclick: () => { vue.zone.expo = e; dessinerOutils(); } }, e)));
      const options = (H.d.champ("sol") || {}).options || [];
      const det = H.el("details.zone-sols", null, H.el("summary.discret", null, vue.zone.sol.length ? "Sol : " + vue.zone.sol.join(", ") : "Sol : celui de l’île"));
      det.appendChild(H.el("div.choix-options", null, options.map((s) => H.el("label.option", null, H.el("input", { type: "checkbox", checked: vue.zone.sol.includes(s), onchange: (e) => { vue.zone.sol = e.target.checked ? vue.zone.sol.concat(s) : vue.zone.sol.filter((x) => x !== s); } }), " " + s))));
      o.appendChild(det);
      o.appendChild(H.el("label.option", null, H.el("input", { type: "checkbox", checked: !!vue.voirZones, onchange: (e) => { vue.voirZones = e.target.checked; dessiner(); } }), " montrer les zones"));
    } else if (vue.outil === "arroser") {
      o.appendChild(H.el("span.cout", null, "Arrose la case et ses voisines · " + cout({ eau: 1, energie: 1 })));
    } else if (vue.outil === "recolter") {
      o.appendChild(H.el("span.cout", null, "Les plantes prêtes à récolter sont entourées de fluo · " + cout({ energie: 2 })));
    } else if (vue.outil === "retirer") {
      o.appendChild(H.el("span.cout", null, "Retire la plante ou l’aménagement de la case"));
    } else {
      o.appendChild(H.el("span.cout", null, "Clique sur une plante pour voir comment elle se porte"));
    }
  }

  function cout(c) {
    const parts = Object.entries(c).map(([k, n]) => H.quantiteTexte(k, n));
    return parts.length ? "Coût : " + parts.join(", ") : "Gratuit";
  }

  // Ce que demande une plantation : dépend du cycle, du sol et de l'eau dont la plante a besoin.
  function coutPlantation(p) {
    const v = (p && p.valeurs) || {};
    const c = {
      Annuelle: { graines: 2, terre: 1, energie: 3 },
      Bisannuelle: { graines: 2, terre: 1, energie: 3 },
      Vivace: { graines: 1, terre: 1, energie: 4 },
      Arbuste: { graines: 1, terre: 2, compost: 1, energie: 6 },
      Arbre: { graines: 1, terre: 3, compost: 1, energie: 8 },
      Liane: { graines: 1, terre: 2, energie: 5 },
    }[v.cycle] || { graines: 1, terre: 1, energie: 4 };
    const r = Object.assign({}, c);
    if (v.arrosage === "Régulier") r.eau = 1;
    if (v.arrosage === "Abondant") r.eau = 2;
    if ((v.sol || []).includes("Riche")) r.compost = (r.compost || 0) + 1;
    if (v.climatMed === "En pot ou en serre") r.soleil = 1;
    // ordre d'affichage stable
    const ordre = ["graines", "terre", "eau", "compost", "soleil", "energie"];
    return Object.fromEntries(ordre.filter((k) => r[k]).map((k) => [k, r[k]]));
  }

  // petites pastilles avec l'icône de chaque ressource
  function pastillesCout(c) {
    return H.el("span.pastilles-cout", null,
      Object.entries(c).map(([k, n]) => {
        const assez = (k === "energie" ? H.ressources.energie() : H.ressources.quantite(k)) >= n;
        return H.el("span.pastille-cout" + (assez ? "" : ".manque"), { title: H.quantiteTexte(k, n) },
          H.el("img", { src: H.ressources.icone(k, 2), alt: "" }), String(n));
      })
    );
  }

  function retenirPlante(id) {
    if (!id) return;
    H.d.majLocal((l) => (l.plantesRecentes = [id].concat((l.plantesRecentes || []).filter((x) => x !== id)).slice(0, 8)));
  }

  function zoomer(sens) {
    const niveaux = [0.5, 0.75, 1, 1.5, 2];
    const i = niveaux.indexOf(vue.zoom);
    vue.zoom = niveaux[Math.max(0, Math.min(niveaux.length - 1, (i < 0 ? 2 : i) + sens))];
    H.d.majLocal((l) => (l.zoomTerrain = vue.zoom));
    dimensionner();
    peindreFond();
    dessiner();
  }

  function dimensionner() {
    const ile = vue.ile;
    const w = (ile.cols + BORD * 2) * T * vue.zoom, h = (ile.lignes + BORD * 2) * T * vue.zoom;
    const dpr = Math.min(window.devicePixelRatio || 1, 4096 / w, 4096 / h, 2.5);
    vue.dpr = dpr;
    vue.toile.width = Math.round(w * dpr);
    vue.toile.height = Math.round(h * dpr);
    vue.toile.style.width = w + "px";
    vue.toile.style.height = h + "px";
    vue.fond = H.aqua.toile(vue.toile.width, vue.toile.height);
  }

  // Le fond (mer, sable, tuiles) ne change que si l'on aménage.
  function peindreFond() {
    const ile = vue.ile, ctx = vue.fond.getContext("2d"), r = H.alea(ile.id + "fond");
    const k = T * vue.zoom * vue.dpr;
    const saison = document.documentElement.dataset.saison || "printemps";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, vue.fond.width, vue.fond.height);
    ctx.fillStyle = "#8fc3dc";
    ctx.fillRect(0, 0, vue.fond.width, vue.fond.height);
    ctx.save();
    ctx.scale(k / T, k / T);
    const W = ile.cols + BORD * 2, Hh = ile.lignes + BORD * 2;
    for (let i = 0; i < 18; i++) H.aqua.tache(ctx, r, r() * W * T, r() * Hh * T, 40 + r() * 80, 30 + r() * 60, i % 2 ? "#6aa9c9" : "#bfe0ec", { alpha: 0.05, couches: 8 });
    const sable = H.aqua.rectArrondi((BORD - 0.6) * T, (BORD - 0.6) * T, (ile.cols + 1.2) * T, (ile.lignes + 1.2) * T, T * 1.2, 8);
    H.aqua.lavis(ctx, r, sable, "#ead6a6", { alpha: 0.2, couches: 12, bord: 0.05 });
    // l'herbe : un seul grand lavis continu, sans damier
    const herbe = TEINTES_SAISON[saison] || "#9cc77a";
    ctx.fillStyle = herbe;
    ctx.fillRect(BORD * T, BORD * T, ile.cols * T, ile.lignes * T);
    const n = Math.ceil((ile.cols * ile.lignes) / 6);
    for (let i = 0; i < n; i++) {
      const x = (BORD + r() * ile.cols) * T, y = (BORD + r() * ile.lignes) * T;
      H.aqua.tache(ctx, r, x, y, T * (0.8 + r() * 1.6), T * (0.6 + r() * 1.2), i % 3 === 0 ? "#7fa85a" : i % 3 === 1 ? "#cfdc94" : herbe, { alpha: 0.022, couches: 6 });
    }
    for (let i = 0; i < n * 2; i++) {
      const x = (BORD + r() * ile.cols) * T, y = (BORD + r() * ile.lignes) * T;
      H.aqua.trait(ctx, r, [[x, y], [x + (r() - 0.5) * 4, y - 5]], { couleur: "#4f7a3a", epaisseur: 0.8, alpha: 0.3 });
    }
    ctx.restore();
    for (let y = 0; y < ile.lignes; y++) {
      for (let x = 0; x < ile.cols; x++) {
        const c = caseDe(ile, x, y);
        if (c.t === "herbe") continue;
        const tex = textureTuile(c.t, saison, H.hash(cle(x, y)) % 3);
        ctx.drawImage(tex, (x + BORD) * k, (y + BORD) * k, k + 0.5, k + 0.5);
      }
    }
    // quadrillage très fin, pour l'échelle
    ctx.strokeStyle = "rgba(43,38,34,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= ile.cols; x++) {
      ctx.moveTo((x + BORD) * k, BORD * k);
      ctx.lineTo((x + BORD) * k, (ile.lignes + BORD) * k);
    }
    for (let y = 0; y <= ile.lignes; y++) {
      ctx.moveTo(BORD * k, (y + BORD) * k);
      ctx.lineTo((ile.cols + BORD) * k, (y + BORD) * k);
    }
    ctx.stroke();
  }

  function rayonPlante(p, ile) {
    const esp = nombre((p.valeurs || {}).espacement);
    if (!esp) return 0.5;
    return Math.max(0.45, esp / 2 / ile.caseM);
  }

  function dessiner(ctxDest, sansNuit) {
    const ile = vue.ile;
    const toile = vue.toile;
    const ctx = ctxDest || toile.getContext("2d");
    const k = T * vue.zoom * vue.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vue.fond, 0, 0);
    ctx.setTransform(k / T, 0, 0, k / T, BORD * k, BORD * k);

    // zones (exposition) en surimpression légère
    if (vue.voirZones || vue.outil === "zones") {
      for (let y = 0; y < ile.lignes; y++) {
        for (let x = 0; x < ile.cols; x++) {
          const c = caseDe(ile, x, y);
          if (c.expo === "Plein soleil") continue;
          ctx.fillStyle = c.expo === "Ombre" ? "rgba(40,40,90,0.28)" : "rgba(40,40,90,0.14)";
          ctx.fillRect(x * T, y * T, T, T);
        }
      }
    }

    // plantes, de haut en bas pour que les grandes recouvrent joliment
    const entrees = Object.entries(ile.plantes || {}).map(([k2, pl]) => {
      const [x, y] = k2.split(",").map(Number);
      return { x, y, pl };
    }).sort((a, b) => a.y - b.y);
    for (const { x, y, pl } of entrees) {
      const p = H.d.plante(pl.p);
      if (!p) continue;
      const st = stade(ile, pl);
      const img = dessinPlante(p, st, fleurie(p, ile, pl), st === 3 ? Math.round(rayonPlante(p, ile) * 2) / 2 : 0);
      const taille = img.width / 2;
      ctx.drawImage(img, (x + 0.5) * T - taille / 2, (y + 0.5) * T - taille / 2, taille, taille);
      if (aRecolter(p, ile, pl)) {
        ctx.save();
        ctx.strokeStyle = "#ff2e9a";
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc((x + 0.5) * T, (y + 0.5) * T, T * 0.48, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      } else if (!ile.croquis && pl.eau < 20 && st > 0) {
        ctx.fillStyle = "#3a8fd8";
        ctx.beginPath();
        ctx.arc((x + 0.85) * T, (y + 0.15) * T, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      if (vue.choisie && vue.choisie.x === x && vue.choisie.y === y) {
        ctx.strokeStyle = "#ff7b00";
        ctx.lineWidth = 2;
        ctx.strokeRect(x * T + 1, y * T + 1, T - 2, T - 2);
      }
    }

    // Lóló et Mémé sur leur île
    if (ile.secrete) {
      const maintenant = performance.now();
      const pos = vue.lolo && vue.lolo.course ? H.sons.position(vue.lolo.course, maintenant) : null;
      const visible = !vue.lolo || (vue.lolo.course && pos);
      const galope = !!(pos && pos.enCourse);
      const lx = pos ? pos.x : ile.cols / 2;
      const image = galope ? Math.floor(maintenant / 90) % 4 : Math.floor(maintenant / 700) % 2;
      if (visible) H.pixel.dessiner(ctx, galope ? "loloGalop" : "lolo", lx * T, (ile.lignes / 2 + 0.6) * T - (galope && image % 2 ? 2 : 0), 2, image);
      if (visible && !galope && Math.floor(maintenant / 1400) % 2) {
        ctx.font = "10px 'Suez One', serif";
        ctx.fillStyle = "#ff2e9a";
        ctx.fillText("rrr", (ile.cols / 2 + 0.4) * T, (ile.lignes / 2 - 1.3) * T);
      }
    }

    // personnages
    if (!ile.croquis || vue.ovo.cible) {
      const o = vue.ovo;
      const marche = o.cible ? Math.floor(performance.now() / 160) % 2 : 0;
      H.pixel.dessiner(ctx, "ovo", (o.x + 0.5) * T, (o.y + 0.9) * T - (marche ? 1 : 0), 1.5, marche);
    }
    if (vue.loloVisite && vue.loloVisite.course) {
      const l = vue.loloVisite;
      const pos = H.sons.position(l.course, performance.now());
      if (pos) {
        const image = pos.enCourse ? Math.floor(performance.now() / 90) % 4 : Math.floor(performance.now() / 700) % 2;
        H.pixel.dessiner(ctx, pos.enCourse ? "loloGalop" : "lolo", (pos.x + 0.5) * T, (l.y + 0.9) * T - (pos.enCourse && image % 2 ? 2 : 0), 2, image);
      }
    }
    if (vue.luigi) {
      const l = vue.luigi;
      const marche = l.cible ? Math.floor(performance.now() / 170) % 2 : 0;
      H.pixel.dessiner(ctx, "luigi", (l.x + 0.5) * T, (l.y + 0.9) * T - (marche ? 1 : 0), 1.5, marche);
    }

    // petits cœurs pendant un câlin
    if (vue.coeurs && vue.coeurs > performance.now() && vue.luigi) {
      const tc = (performance.now() % 1500) / 1500;
      const cx = ((vue.ovo.x + vue.luigi.x) / 2 + 0.5) * T, cy = (vue.ovo.y - 0.3) * T;
      for (let i = 0; i < 3; i++) {
        const u = (tc + i / 3) % 1;
        dessinerCoeur(ctx, cx + Math.sin(u * 6 + i) * 8, cy - u * 28, 1 - u);
      }
    }

    // météo
    if (vue.gouttes.length) {
      const neige = (H.ciel.meteo || {}).type === "neige";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = neige ? "rgba(255,255,255,0.9)" : "rgba(60,110,170,0.55)";
      for (const g of vue.gouttes) ctx.fillRect(g.x, g.y, neige ? 3 * vue.dpr : 1.5 * vue.dpr, neige ? 3 * vue.dpr : 7 * vue.dpr);
    }

    // nuit, aube et crépuscule
    if (!sansNuit) {
      const alt = H.ciel.etat().soleil.alt;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const v of H.ciel.lumiere(alt)) {
        ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha + ")";
        ctx.fillRect(0, 0, toile.width, toile.height);
      }
    }
  }

  function dessinerCiel() {
    const c = vue.ciel;
    const w = c.clientWidth || 600;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(w * dpr);
    c.height = Math.round(70 * dpr);
    const ctx = c.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const s = H.ciel.etat();
    const t = H.ciel.teinteCiel(s.soleil.alt);
    const g = ctx.createLinearGradient(0, 0, 0, 70);
    g.addColorStop(0, t.haut);
    g.addColorStop(1, t.bas);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, 70);
    const r = H.alea(7);
    if (s.soleil.alt < -4) {
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = "rgba(255,255,240," + (0.4 + r() * 0.6) + ")";
        ctx.fillRect(Math.floor(r() * w), Math.floor(r() * 60), 1.5, 1.5);
      }
    }
    // l'azimut va de l'est (gauche) à l'ouest (droite) en passant par le sud
    const px = (az) => w / 2 + (az / 180) * (w / 2 - 20);
    const py = (alt) => 62 - Math.max(-10, alt) * 0.9;
    const astre = (az, alt, couleur, rayon) => {
      const x = Math.round(px(az)), y = Math.round(py(alt));
      ctx.fillStyle = couleur;
      for (let dy = -rayon; dy <= rayon; dy++) {
        for (let dx = -rayon; dx <= rayon; dx++) {
          if (dx * dx + dy * dy <= rayon * rayon) ctx.fillRect(x + dx * 2, y + dy * 2, 2, 2);
        }
      }
      return [x, y];
    };
    if (s.soleil.alt > -3) astre(s.soleil.az, s.soleil.alt, "#ffd23a", 5);
    if (s.lune.alt > -3) {
      const [x, y] = astre(s.lune.az, s.lune.alt, "#f3efd8", 4);
      // ombre de la phase
      const ph = s.lune.phase;
      const decal = (ph < 0.5 ? 1 - ph * 4 : (ph - 0.5) * 4 - 1) * 8;
      ctx.fillStyle = t.haut;
      if (s.lune.fraction < 0.97) {
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const ddx = dx - decal / 2 * (ph < 0.5 ? -1 : 1);
            if (dx * dx + dy * dy <= 16 && ddx * ddx + dy * dy <= 16 - s.lune.fraction * 10) ctx.fillRect(x + dx * 2, y + dy * 2, 2, 2);
          }
        }
      }
    }
    // les calanques à l'horizon, en pixels : un plan lointain bleuté, un plan calcaire plus clair
    const nuitCiel = s.soleil.alt < -4;
    for (const [graine, base, haut, couleur] of [
      [11, 70, 20, nuitCiel ? "#3a3d62" : "#a9b6c9"],
      [23, 72, 28, nuitCiel ? "#555470" : "#e4dccb"],
    ]) {
      const rc = H.alea(graine);
      ctx.fillStyle = couleur;
      let y = base - haut * 0.5;
      for (let x = 0; x < w; x += 2) {
        const saut = rc();
        if (saut < 0.02) y = base - haut * (0.8 + rc() * 0.2);
        else if (saut < 0.04) y = base - haut * (0.2 + rc() * 0.2);
        else y += (rc() - 0.5) * 3;
        y = Math.max(base - haut, Math.min(base - 4, y));
        ctx.fillRect(x, Math.round(y / 2) * 2, 2, 70 - Math.round(y / 2) * 2);
      }
    }
    const m = s.meteo;
    if (m && (m.type === "nuages" || m.type === "pluie" || m.type === "orage" || m.type === "voile")) {
      const n = m.type === "voile" ? 2 : 5;
      for (let i = 0; i < n; i++) {
        const cx = (i + 0.5) * (w / n) + r() * 30, cy = 14 + r() * 20;
        ctx.fillStyle = m.type === "orage" || m.type === "pluie" ? "rgba(120,125,140,0.85)" : "rgba(255,255,255,0.85)";
        for (let j = 0; j < 4; j++) ctx.fillRect(Math.round(cx + j * 8 - 16), Math.round(cy - (j % 2) * 4), 18, 8);
      }
    }
    const heures = s.heures;
    if (H.pluieMagique && H.pluieMagique()) {
      ctx.fillStyle = "rgba(120,125,160,0.5)";
      for (let i = 0; i < 5; i++) ctx.fillRect(Math.round((i + 0.3) * (w / 5)), 12 + (i % 2) * 6, 34, 10);
    }
    vue.infoCiel.textContent = [
      H.pluieMagique && H.pluieMagique() ? "pluie de joie de Lóló" : null,
      H.jeu.lieu.nom,
      H.heure(s.date),
      m ? m.temperature + " °C, " + m.libelle : null,
      s.saison,
      H.ciel.nomPhase(s.lune.phase),
      heures.lever ? "soleil " + H.heure(heures.lever) + " – " + H.heure(heures.coucher) : null,
    ].filter(Boolean).join(" · ");
  }

  // --- interaction ---------------------------------------------------------------------
  function caseCliquee(e) {
    const rect = vue.toile.getBoundingClientRect();
    const k = T * vue.zoom;
    const x = Math.floor((e.clientX - rect.left) / k) - BORD;
    const y = Math.floor((e.clientY - rect.top) / k) - BORD;
    if (x < 0 || y < 0 || x >= vue.ile.cols || y >= vue.ile.lignes) return null;
    return { x, y };
  }

  function clic(e) {
    const c = caseCliquee(e);
    if (!c) return;
    // Lóló et Mémé
    if (vue.ile.secrete && Math.abs(c.x + 0.5 - vue.ile.cols / 2) < 2.5 && c.y - vue.ile.lignes / 2 > -3 && c.y - vue.ile.lignes / 2 < 1) {
      if (!H.$(".dialogue")) H.lolo.parler(vue.ile);
      return;
    }
    marcherVers(c.x, c.y, () => agir(c.x, c.y));
  }

  // ƟvƟ va se placer juste sous la case, puis agit ; les clics suivants attendent leur tour.
  function marcherVers(x, y, ensuite) {
    if (vue.ile.croquis) return ensuite();
    if (document.visibilityState === "hidden") {
      // page cachée : pas d'animation, ƟvƟ agit tout de suite
      vue.ovo.x = x;
      vue.ovo.y = Math.min(vue.ile.lignes - 1, y + 1);
      return ensuite();
    }
    vue.ovo.file.push({ cible: { x, y: Math.min(vue.ile.lignes - 1, y + 1) }, ensuite });
    if (!vue.ovo.cible) prochaineEtape();
  }
  function prochaineEtape() {
    const etape = vue.ovo.file.shift();
    if (!etape) return;
    vue.ovo.cible = etape.cible;
    vue.ovo.ensuite = () => {
      etape.ensuite();
      prochaineEtape();
    };
  }

  function agir(x, y) {
    const ile = vue.ile;
    const k = cle(x, y);
    const pl = (ile.plantes || {})[k];
    const libre = (txt) => H.toast(txt);
    switch (vue.outil) {
      case "regarder":
        if (pl) inspecter(x, y);
        else montrerCase(x, y);
        break;
      case "planter": {
        if (!vue.plante) return libre("Choisis d’abord une plante.");
        const t = caseDe(ile, x, y).t;
        if (t === "eau" || t === "chemin") return libre("On ne plante pas sur un " + (t === "eau" ? "plan d’eau" : "chemin") + ".");
        if (pl) return libre("Il y a déjà une plante ici.");
        const repiquage = !ile.croquis && vue.depuisSerre;
        if (repiquage && !H.serre.bebes().some(([id]) => id === vue.plante)) {
          vue.depuisSerre = false;
          dessinerOutils();
          return libre("Plus de bébé plante de cette espèce dans la caisse.");
        }
        if (!ile.croquis && !payer(repiquage ? H.serre.coutRepiquage : coutPlantation(H.d.plante(vue.plante)))) return;
        if (repiquage) H.serre.prendre(vue.plante);
        const maintenant = H.maintenant();
        ile.plantes = ile.plantes || {};
        ile.plantes[k] = { p: vue.plante, le: maintenant, c: ile.croquis ? 100 : repiquage ? 30 : 0, eau: 70, maj: maintenant };
        if (repiquage) dessinerOutils();
        sauver(ile);
        H.bruit("plante");
        const p = H.d.plante(vue.plante);
        const ev = evaluer(ile, x, y, p, ile.plantes[k]);
        if (!ile.croquis && ev.facteur < 0.6) {
          H.dialogue.dire([{ qui: "ovo", texte: "Hmm… " + (ev.raisons[0] || "Elle n’a pas l’air très à l’aise ici.") }]);
        }
        dessiner();
        break;
      }
      case "arroser": {
        if (!payer({ eau: 1, energie: 1 })) return;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const q = (ile.plantes || {})[cle(x + dx, y + dy)];
          if (q) {
            pousser(ile, x + dx, y + dy, q, H.maintenant());
            q.eau = 100;
          }
        }
        sauver(ile);
        H.bruit("eau");
        dessiner();
        break;
      }
      case "recolter": {
        if (!pl) return;
        const p = H.d.plante(pl.p);
        if (!p || !aRecolter(p, ile, pl)) return libre("Pas encore prête à récolter.");
        recolter(x, y);
        break;
      }
      case "amenager": {
        const t = vue.tuile;
        if (caseDe(ile, x, y).t === t) return;
        if ((t === "eau" || t === "chemin") && pl) return libre("Retire d’abord la plante de cette case.");
        if (!ile.croquis && !payer(TUILES[t].cout)) return;
        ile.cases = ile.cases || {};
        ile.cases[k] = Object.assign({}, ile.cases[k], { t });
        if (t === "herbe") delete ile.cases[k].t;
        sauver(ile);
        peindreFond();
        dessiner();
        break;
      }
      case "zones": {
        ile.cases = ile.cases || {};
        const z = Object.assign({}, ile.cases[k], { expo: vue.zone.expo });
        if (vue.zone.sol.length) z.sol = vue.zone.sol.slice();
        else delete z.sol;
        ile.cases[k] = z;
        sauver(ile);
        dessiner();
        break;
      }
      case "retirer": {
        if (pl) {
          delete ile.plantes[k];
        } else if (ile.cases && ile.cases[k] && ile.cases[k].t) {
          delete ile.cases[k].t;
          peindreFond();
        } else return;
        sauver(ile);
        dessiner();
        break;
      }
    }
  }

  function payer(couts) {
    if (H.ressources.depenser(couts)) return true;
    const ids = Object.entries(couts).filter(([k, n]) => (k === "energie" ? H.ressources.energie() : H.ressources.quantite(k)) < n).map(([k]) => k);
    const fatigue = ids.length === 1 && ids[0] === "energie";
    const textes = ids.map(H.manqueTexte);
    const manque = [textes.slice(0, -1).join(", "), textes[textes.length - 1]].filter(Boolean);
    H.dialogue.dire([{ qui: "ovo", texte: fatigue
      ? "Ouf, je suis un peu fatigué·e… Une petite pause, ou quelques flashcartes pour reprendre des forces ?"
      : "Il me manque " + manque.join(" et ") + ". Quelques flashcartes et on s’y remet !" }]);
    H.bruit("erreur");
    return false;
  }

  function recolter(x, y) {
    const ile = vue.ile;
    const pl = ile.plantes[cle(x, y)];
    const p = H.d.plante(pl.p);
    if (!payer({ energie: 2 })) return;
    pl.recolteLe = H.maintenant();
    const gains = { graines: 2, compost: 1 };
    if ((p.preparations || []).includes("plante-seche")) gains.paille = 1;
    Object.entries(gains).forEach(([k2, n]) => H.ressources.ajouter(k2, n));
    if (H.labo) H.labo.ajouterRecolte(p.id, 1);
    if (p.valeurs.cycle === "Annuelle") pl.c = 40;
    sauver(ile);
    H.bruit("recolte");
    H.toast("Récolte : " + p.nom + " (+2 graines, +1 compost" + (gains.paille ? ", +1 paille" : "") + ", et une récolte pour le labo)");
    dessiner();
  }

  function montrerCase(x, y) {
    const c = caseDe(vue.ile, x, y);
    vue.choisie = { x, y };
    vue.panneau.hidden = false;
    vue.panneau.innerHTML = "";
    vue.panneau.append(
      H.el("button.bouton.petit.discret-bouton.fermer-panneau", { type: "button", onclick: () => { vue.panneau.hidden = true; vue.choisie = null; dessiner(); } }, "Fermer"),
      H.el("h3", null, TUILES[c.t].nom),
      H.el("p", null, c.expo + " · sol " + (c.sol.length ? c.sol.join(", ").toLowerCase() : "non précisé"))
    );
    dessiner();
  }

  function inspecter(x, y) {
    const ile = vue.ile;
    const pl = ile.plantes[cle(x, y)];
    const p = H.d.plante(pl.p);
    if (!p) return;
    pousser(ile, x, y, pl, H.maintenant());
    const ev = evaluer(ile, x, y, p, pl);
    const st = stade(ile, pl);
    vue.choisie = { x, y };
    const P = vue.panneau;
    P.hidden = false;
    P.innerHTML = "";
    const pourcent = Math.round(Math.min(1, ev.facteur) * 100);
    const humeur = pourcent >= 90 ? "Elle se plaît beaucoup ici" : pourcent >= 65 ? "Elle se plaît bien ici" : pourcent >= 40 ? "Elle pousse, mais sans enthousiasme" : "Elle n’est pas vraiment à son aise";
    P.append(
      H.el("button.bouton.petit.discret-bouton.fermer-panneau", { type: "button", onclick: () => { P.hidden = true; vue.choisie = null; dessiner(); } }, "Fermer"),
      H.el("h3.nom-plante-ile", null, p.nom),
      H.el("p.discret", null,
        (ile.croquis ? "Adulte" : NOMS_STADES[st].replace(/^./, (c) => c.toUpperCase()) + " · " + Math.round(pl.c) + " %") +
        (fleurie(p, ile, pl) ? " · en fleurs" : "") +
        " · " + caseDe(ile, x, y).expo.toLowerCase()),
      !ile.croquis ? H.el("div.jauges", null,
        H.el("span", null, "Eau "), H.el("span.jauge.jauge-eau", null, H.el("span.jauge-plein", { style: { width: Math.round(pl.eau) + "%" } })),
        H.el("span", null, " Bien-être "), H.el("span.jauge", null, H.el("span.jauge-plein", { style: { width: pourcent + "%" } }))
      ) : null,
      H.el("p", null, humeur + " (" + pourcent + " %)."),
      ev.raisons.length ? H.el("ul.raisons", null, ev.raisons.map((t) => H.el("li", null, t))) : null
    );
    const actions = H.el("div.pastilles");
    if (!ile.croquis) {
      const act = (nom, couts, fn, fluo) => actions.appendChild(H.el("button.bouton.petit" + (fluo ? ".actif" : ""), { type: "button", title: cout(couts), onclick: () => { if (payer(couts)) { fn(); sauver(ile); dessiner(); inspecter(x, y); } } }, nom));
      if (aRecolter(p, ile, pl)) actions.appendChild(H.el("button.bouton.petit.actif", { type: "button", onclick: () => { recolter(x, y); inspecter(x, y); } }, "Récolter"));
      act("Arroser", { eau: 1, energie: 1 }, () => { pl.eau = 100; H.bruit("eau"); });
      act("Pailler", { paille: 1 }, () => { pl.pailleJusqua = H.maintenant() + 14 * 24 * HEURE; });
      act("Compost", { compost: 1, energie: 1 }, () => { pl.c = Math.min(100, pl.c + 15); });
      act("Purin", { purin: 1 }, () => { pl.purinJusqua = H.maintenant() + 7 * 24 * HEURE; });
      act("Rayon de soleil", { soleil: 1 }, () => { pl.c = Math.min(100, pl.c + 25); });
    }
    actions.appendChild(H.el("button.bouton.petit", { type: "button", onclick: () => H.dessinerPlante(p.id, () => { dessiner(); inspecter(x, y); }) }, p.dessinCarte ? "Modifier son dessin" : "Dessiner son aspect"));
    actions.appendChild(H.el("a.bouton.petit", { href: "#fiche/" + encodeURIComponent(p.id) }, "Voir la fiche"));
    P.appendChild(actions);
    dessiner();
    if (!ile.croquis && Math.random() < 0.3) appelerMesi(false, p);
  }

  // --- Mesi et ses « bâtons » (la MTC, sa spécialité) ----------------------------------
  function astuceMTC(p) {
    const v = p.valeurs || {};
    if (!v.mtcSaveur && !v.mtc) return null;
    const premiere = String(v.mtc || "").split("\n").map((l) => l.replace(/^[•\-–#\s]+/, "").replace(/\*\*/g, "").trim()).filter(Boolean)[0] || "";
    const intro = ["Psst, ƟvƟ ! J’ai un bâton pour toi.", "Mon bâton du jour, c’est la MTC, évidemment !", "Tu savais ?", "Petit bâton chinois, gratuit !"][Math.floor(Math.random() * 4)];
    const phrases = [{ qui: "luigi", texte: intro }];
    if (v.mtcSaveur) phrases.push({ qui: "luigi", texte: "En médecine chinoise, saveur et nature " + H.duNom(p) + " : " + v.mtcSaveur.toLowerCase().replace(/\s*-\s*/g, ", ").replace(/^saveurs?\s*:?\s*/, "") + "." });
    if (premiere) phrases.push({ qui: "luigi", texte: "Dans sa fiche MTC, on lit : « " + (premiere.length > 200 ? premiere.slice(0, 197) + "…" : premiere) + " »" });
    return phrases;
  }

  // Les lignes de la rubrique MTC d'une plante, sans la mise en forme (renvois suivis).
  const lignesMTC = (p, champ) => H.lignesFiche(p, champ || "mtc");
  const court = (t, n) => (t.length > n ? t.slice(0, n - 1) + "…" : t);

  // On appelle Mesi (avec le miaou) : Mesi arrive et répond aux questions sur les plantes du jardin.
  async function consulterMesi() {
    const L = (texte, choix) => H.dialogue.dire([{ qui: "luigi", texte, choix }]);
    const ids = Array.from(new Set(Object.values(vue.ile.plantes || {}).map((x) => x.p)));
    const plantes = ids.map((id) => H.d.plante(id)).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    if (!plantes.length) {
      await L("Miaou reçu ! Plante d’abord quelque chose, et je te raconte ce qu’en dit la médecine chinoise.");
      return;
    }
    let p = null;
    let intro = "Miaou reçu ! Sur quelle plante du jardin tu veux un de mes bâtons ?";
    for (;;) {
      if (!p) {
        const id = await L(intro, plantes.map((q) => ({ valeur: q.id, libelle: q.nom })).concat([{ valeur: null, libelle: "Rien, merci Mesi" }]));
        if (!id) break;
        p = H.d.plante(id);
      }
      const q = await L("Que veux-tu savoir sur " + H.leNom(p) + " ?", [
        { valeur: "saveur", libelle: H.accord(p, "Sa", "Sa", "Leur", "Leur") + " saveur et " + H.accord(p, "sa", "sa", "leur", "leur") + " nature" },
        { valeur: "indications", libelle: "À quoi " + H.accord(p, "il sert", "elle sert", "ils servent", "elles servent") + " en MTC" },
        { valeur: "precautions", libelle: "Des précautions ?" },
        { valeur: "autre", libelle: "Une autre plante" },
        { valeur: null, libelle: "Merci Mesi !" },
      ]);
      if (!q) break;
      if (q === "autre") {
        p = null;
        intro = "D’accord ! Laquelle, cette fois ?";
        continue;
      }
      const v = p.valeurs || {};
      const repliques = [];
      if (q === "saveur") {
        repliques.push(v.mtcSaveur
          ? "En MTC, saveur et nature " + H.duNom(p) + " : " + v.mtcSaveur.toLowerCase().replace(/\s*-\s*/g, ", ").replace(/^saveurs?\s*:?\s*/, "") + "."
          : "Sa fiche ne précise pas sa saveur. Un bâton à creuser ensemble !");
      } else if (q === "indications") {
        const lignes = lignesMTC(p);
        if (!lignes.length) repliques.push("Sa fiche ne dit rien côté MTC. Mystère !");
        else {
          repliques.push("Dans sa fiche MTC, on lit :");
          lignes.slice(0, 4).forEach((l) => repliques.push("« " + court(l, 220) + " »"));
          if (lignes.length > 4) repliques.push("Et il y a encore " + (lignes.length - 4) + " lignes dans sa fiche !");
        }
      } else if (q === "precautions") {
        const lignes = lignesMTC(p, "precautions");
        if (!lignes.length) repliques.push("Sa fiche ne mentionne pas de précaution particulière.");
        else {
          repliques.push("Côté précautions, sa fiche dit :");
          lignes.slice(0, 4).forEach((l) => repliques.push("« " + court(l, 220) + " »"));
        }
      }
      await H.dialogue.dire(repliques.map((texte) => ({ qui: "luigi", texte })));
    }
    await L(["À tout à l’heure !", "À ce soir !", "À toute !", "Le temps n’est qu’un concept."][Math.floor(Math.random() * 4)]);
  }

  // Un câlin et des bisous : des petits cœurs, et Mesi laisse un souvenir.
  async function calin() {
    vue.coeurs = performance.now() + 4500;
    await H.dialogue.dire([
      { qui: "ovo", texte: "Viens là, toi !" },
      { qui: "luigi", texte: "Mwah ! Mwah ! Mwah !" },
    ]);
    const cadeau = Math.random() < 0.3 ? "crepe" : ["eau", "graines", "compost", "terre", "soleil"][Math.floor(Math.random() * 5)];
    const n = cadeau === "crepe" ? 1 : 2;
    H.ressources.ajouter(cadeau, n);
    await H.dialogue.dire([{ qui: "luigi", texte: "Tiens, je t’ai apporté " + H.quantiteTexte(cadeau, n).replace(/^1 /, "une ").replace(/^une (outil|rayon|seau|bidon|arrosoir)/, "un $1") + ". À plus tard !" }]);
  }

  function dessinerCoeur(ctx, x, y, alpha) {
    const motif = [".kk.kk.", "kppkppk", "kpppppk", ".kpppk.", "..kpk..", "...k..."];
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    motif.forEach((l, j) => {
      for (let i = 0; i < l.length; i++) {
        if (l[i] === ".") continue;
        ctx.fillStyle = l[i] === "k" ? "#2a2246" : "#ff2e9a";
        ctx.fillRect(Math.round(x - 7 + i * 2), Math.round(y + j * 2), 2, 2);
      }
    });
    ctx.restore();
  }

  // De temps en temps, Mesi appelle au loin pendant qu'ƟvƟ jardine.
  function visiteSpontanee() {
    if (!vue || vue.luigi || document.visibilityState === "hidden" || Math.random() > 0.25) return;
    const ids = Object.values(vue.ile.plantes || {}).map((x) => x.p);
    const p = ids.length ? H.d.plante(ids[Math.floor(Math.random() * ids.length)]) : null;
    appelerMesi(false, p);
  }

  // Lóló arrive au galop (Mémé sur le dos), raconte, puis repart.
  function appelerLolo() {
    if (vue.ile.secrete) {
      if (!H.$(".dialogue")) H.lolo.parler(vue.ile);
      return;
    }
    if (vue.loloVisite) return;
    const lv = (vue.loloVisite = { y: Math.max(1, vue.ovo.y - 1) });
    const arrivee = Math.max(1, vue.ovo.x - 2);
    lv.ensuite = () => H.lolo.parler(vue.ile).then(async () => {
      if (!vue || vue.loloVisite !== lv) return;
      lv.partant = true;
      lv.arrive = false;
      lv.course = await H.sons.galop(arrivee, vue.ile.cols + 4, false, 0.4);
    });
    H.sons.galop(-4, arrivee, true, 0.6).then((c) => (lv.course = c));
  }

  function partirMesi() {
    if (vue && vue.luigi) vue.luigi.cible = { x: -2, y: vue.luigi.y, partir: true };
    if (vue && document.visibilityState === "hidden") vue.luigi = null;
  }

  function appelerMesi(demande, plante) {
    if (demande) H.jouerCri();
    if (vue.luigi) {
      if (demande && !vue.luigi.occupe) {
        vue.luigi.occupe = true;
        consulterMesi().then(() => partirMesi());
      }
      return;
    }
    let ensuite;
    if (demande) {
      ensuite = () => {
        vue.luigi.occupe = true;
        consulterMesi().then(() => partirMesi());
      };
    } else {
      // visite spontanée : Mesi appelle au loin, ƟvƟ choisit de lui parler ou de lui faire un câlin
      if (H.maintenant() - (H.local.derniereVisiteMesi || 0) < 10 * 60e3) return;
      if (H.$(".dialogue")) return;
      const astuce = plante && astuceMTC(plante);
      H.d.majLocal((l) => (l.derniereVisiteMesi = H.maintenant()));
      H.sons.jouer("attention", 0.4);
      H.dialogue.dire([{
        qui: "luigi",
        nom: "Mesi, au loin",
        texte: "ƟvƟ ! Hé, ƟvƟ ! Tu as un moment ?",
        choix: [{ valeur: "parler", libelle: "Parler avec Mesi" }, { valeur: "calin", libelle: "Lui faire un câlin et des bisous" }],
      }]).then((choix) => {
        if (!choix || !vue || vue.luigi) return;
        const fin = choix === "calin"
          ? () => calin().then(() => partirMesi())
          : () => (astuce ? H.dialogue.dire(astuce) : consulterMesi()).then(() => partirMesi());
        vue.luigi = { x: -1, y: vue.ovo.y, cible: { x: Math.max(0, vue.ovo.x - 1), y: vue.ovo.y }, ensuite: fin, occupe: true };
        if (document.visibilityState === "hidden") {
          vue.luigi.x = vue.luigi.cible.x;
          vue.luigi.cible = null;
          vue.luigi.ensuite = null;
          fin();
        }
      });
      return;
    }
    H.d.majLocal((l) => (l.derniereVisiteMesi = H.maintenant()));
    vue.luigi = { x: -1, y: vue.ovo.y, cible: { x: Math.max(0, vue.ovo.x - 1), y: vue.ovo.y }, ensuite };
    if (document.visibilityState === "hidden") {
      vue.luigi.x = vue.luigi.cible.x;
      vue.luigi.cible = null;
      vue.luigi.ensuite = null;
      ensuite();
    }
  }

  // --- animation -------------------------------------------------------------------------
  function boucle() {
    cancelAnimationFrame(vue && vue.anim);
    const pas = (t) => {
      if (!vue) return;
      const dt = Math.min(0.1, (t - vue.derniere) / 1000);
      vue.derniere = t;
      let bouge = false;
      for (const qui of ["ovo", "luigi"]) {
        const o = vue[qui];
        if (!o || !o.cible) continue;
        const dx = o.cible.x - o.x, dy = o.cible.y - o.y;
        const d = Math.hypot(dx, dy);
        const v = 5 * dt;
        if (d <= v) {
          o.x = o.cible.x;
          o.y = o.cible.y;
          const partir = o.cible.partir;
          o.cible = null;
          if (o.ensuite) {
            const f = o.ensuite;
            o.ensuite = null;
            f();
          }
          if (partir && qui === "luigi") vue.luigi = null;
        } else {
          o.x += (dx / d) * v;
          o.y += (dy / d) * v;
        }
        bouge = true;
      }
      // les pas d'ƟvƟ sur le chemin pavé
      const o = vue.ovo;
      const surPave = !!o.cible && caseDe(vue.ile, Math.round(o.x), Math.round(o.y)).t === "chemin";
      H.sons.boucle("pas", surPave, 0.6);
      if (vue.lolo && (!vue.lolo.course || t < vue.lolo.course.t1)) bouge = true;
      if (vue.coeurs && vue.coeurs > t) bouge = true;
      const lv = vue.loloVisite;
      if (lv) {
        bouge = true;
        if (lv.course && !lv.arrive && t >= lv.course.t1) {
          lv.arrive = true;
          if (lv.partant) vue.loloVisite = null;
          else if (lv.ensuite) {
            const f = lv.ensuite;
            lv.ensuite = null;
            f();
          }
        }
      }
      // pluie ou neige d'après la vraie météo
      const magique = H.pluieMagique && H.pluieMagique();
      const m = magique ? { type: "pluie" } : H.ciel.meteo || {};
      const tombe = m.type === "pluie" || m.type === "orage" || m.type === "neige";
      if (tombe) {
        const W = vue.toile.width, Hh = vue.toile.height;
        while (vue.gouttes.length < 70) vue.gouttes.push({ x: Math.random() * W, y: Math.random() * Hh, v: (m.type === "neige" ? 40 : 380) * vue.dpr * (0.7 + Math.random() * 0.6) });
        for (const g of vue.gouttes) {
          g.y += g.v * dt;
          if (m.type === "neige") g.x += Math.sin(t / 600 + g.v) * 0.5;
          if (g.y > Hh) {
            g.y = -10;
            g.x = Math.random() * W;
          }
        }
        bouge = true;
      } else vue.gouttes = [];
      if (vue.ile.secrete) bouge = true;
      if (bouge || !vue.dessineUneFois) {
        dessiner();
        vue.dessineUneFois = true;
      }
      vue.anim = requestAnimationFrame(pas);
    };
    vue.anim = requestAnimationFrame(pas);
  }

  // --- exports et réglages -----------------------------------------------------------------
  function exporterListe(ile) {
    const quantites = {};
    for (const pl of Object.values(ile.plantes || {})) quantites[pl.p] = (quantites[pl.p] || 0) + 1;
    const plantes = Object.keys(quantites).map((id) => H.d.plante(id)).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    if (!plantes.length) return H.toast("Pas encore de plantes sur cette île");
    H.exporterPlantes(plantes, H.slug(ile.nom), quantites);
  }

  function exporterImage(ile) {
    const c = H.aqua.toile(vue.toile.width, vue.toile.height + 60 * vue.dpr);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f8f2e4";
    ctx.fillRect(0, 0, c.width, c.height);
    const tmp = H.aqua.toile(vue.toile.width, vue.toile.height);
    const sauvegardeChoix = vue.choisie;
    vue.choisie = null;
    dessiner(tmp.getContext("2d"), true);
    vue.choisie = sauvegardeChoix;
    ctx.drawImage(tmp, 0, 0);
    // cartouche : nom, dimensions, barre d'échelle d'un mètre
    const k = T * vue.zoom * vue.dpr;
    const y0 = vue.toile.height + 14 * vue.dpr;
    ctx.fillStyle = "#23214a";
    ctx.font = (16 * vue.dpr) + "px 'Suez One', serif";
    ctx.fillText(ile.nom + " — " + ile.largeur + " × " + ile.longueur + " m", 12 * vue.dpr, y0 + 14 * vue.dpr);
    const unMetre = k / ile.caseM;
    ctx.fillRect(c.width - unMetre - 20 * vue.dpr, y0 + 8 * vue.dpr, unMetre, 3 * vue.dpr);
    ctx.font = (12 * vue.dpr) + "px Caudex, serif";
    ctx.fillText("1 m", c.width - unMetre - 20 * vue.dpr, y0 + 28 * vue.dpr);
    c.toBlob((b) => {
      const url = URL.createObjectURL(b);
      const a = H.el("a", { href: url, download: H.slug(ile.nom) + ".png" });
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, "image/png");
  }

  function reglagesIle(ile) {
    const nom = H.el("input", { type: "text", value: ile.nom });
    const notes = H.el("textarea", { rows: 4 });
    notes.value = ile.notes || "";
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire", {
      onsubmit(e) {
        e.preventDefault();
        ile.nom = nom.value.trim() || ile.nom;
        ile.notes = notes.value.trim();
        sauver(ile);
        fermer();
        H.router();
      },
    },
      H.el("h2", null, "Réglages de l’île"),
      H.el("label", null, "Nom", nom),
      H.el("label", null, "Notes", notes),
      H.el("p.discret", null, ile.largeur + " × " + ile.longueur + " m, " + ile.cols + " × " + ile.lignes + " cases, sol de départ : " + (ile.sol || []).join(", ").toLowerCase()),
      H.el("div.boutons-bas", null,
        !ile.secrete ? H.el("button.bouton.discret-bouton", { type: "button", onclick: () => { if (confirm("Supprimer l’île « " + ile.nom + " » ?")) { H.jeu.iles[ile.id] = { id: ile.id, supprime: true, modifieLe: H.maintenant() }; H.d.changer("jeu"); fermer(); H.aller("terrain"); } } }, "Supprimer l’île") : null,
        H.el("button.bouton", { type: "submit" }, "Enregistrer")
      )
    ));
  }

  H.vues.terrain = {
    afficher(c, params) {
      vue = null;
      if (params[0]) ouvrirIle(c, params[0]);
      else archipel(c);
    },
    quitter() {
      if (vue) {
        cancelAnimationFrame(vue.anim);
        clearInterval(vue.minuteurMesi);
      }
      H.sons.boucle("pas", false);
      vue = null;
      H.dialogue.fermer();
    },
  };

  H.sur("ciel", () => {
    if (vue) {
      dessinerCiel();
      peindreFond();
      dessiner();
    }
  });
  H.sur("meteo", () => vue && dessinerCiel());
  document.addEventListener("visibilitychange", () => {
    if (!vue) return;
    if (document.visibilityState === "hidden") cancelAnimationFrame(vue.anim);
    else {
      const maintenant = H.maintenant();
      for (const [k, pl] of Object.entries(vue.ile.plantes || {})) {
        const [x, y] = k.split(",").map(Number);
        pousser(vue.ile, x, y, pl, maintenant);
      }
      vue.derniere = performance.now();
      boucle();
    }
  });

  // dessin automatique d'une plante adulte, comme point de départ pour la dessiner soi-même
  function dessinAuto(p) {
    return dessinPlante(Object.assign({}, p, { dessinCarte: null }), 3, true, 1.6).toDataURL("image/png");
  }

  H.terrain = { evaluer, iles, ileSecreteOuverte, dessinAuto };
})();
