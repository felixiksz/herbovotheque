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
    sol: { nom: "Sol nu", cout: {} },
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
    if (ile.cadeau) suivreCadeau(ile);
    H.d.changer("jeu");
  }

  // Une île de forme libre : les cases de son rectangle qui ne font pas partie de l'île (ile.vides)
  // sont du vide, où l'on voit le ciel ou la mer ; au-delà du rectangle, c'est vide aussi.
  const estVide = (ile, x, y) => x < 0 || y < 0 || x >= ile.cols || y >= ile.lignes || !!(ile.vides && ile.vides[cle(x, y)]);
  function texteEchelle(ile) {
    return ile.largeur + " × " + ile.longueur + " m · une case = " + (ile.caseM < 1 ? ile.caseM * 100 + " cm" : ile.caseM + " m") + (ile.croquis ? " · croquis" : "");
  }
  function caseDe(ile, x, y) {
    if (ile.vides && ile.vides[cle(x, y)]) return { t: "vide", expo: ile.expo || "Plein soleil", sol: ile.sol || [] };
    const c = (ile.cases || {})[cle(x, y)] || {};
    return { t: c.t || "sol", expo: c.expo || ile.expo || "Plein soleil", sol: c.sol || ile.sol || [] };
  }
  // Les couleurs de la terre nue, d'après le sol de l'île (ou de la case) : le sable, la terre
  // rouge argileuse, le calcaire clair, l'humus sombre, le limon ; et des cailloux s'il est caillouteux.
  function teintesSol(sols) {
    const a = new Set(sols || []);
    // (toujours une couleur de terre : le calcaire est ocre clair, pas gris)
    const base = a.has("Sableux") ? ["#e9c99a", "#f3e2c0", "#d9b48a", "#f6ecc8"]
      : a.has("Calcaire") ? ["#c9a06a", "#d9b48a", "#b9834f", "#e9c99a"]
      : a.has("Argileux") ? ["#b2552e", "#c96a3a", "#9a4a2a", "#d9824f"]
      : a.has("Humifère") || a.has("Riche") ? ["#4b3427", "#5a3e2a", "#3a2a20", "#7a4520"]
      : ["#9a6a3c", "#8a5c34", "#7a4520", "#b9834f"];
    return { base, cailloux: a.has("Caillouteux") ? 0.1 : a.has("Calcaire") ? 0.05 : 0.015, pierres: a.has("Calcaire") ? ["#f3f0dc", "#e9e3cd"] : ["#8a98cc", "#c2cdec"] };
  }

  function nombre(texte) {
    // « 1 m en haie, 3 m isolé » -> 1 (en mètres) ; « 50 cm » -> 0,5
    const m = /([\d,.]+)\s*(?:[–-]\s*[\d,.]+\s*)?(cm|m)\b/.exec(String(texte || ""));
    if (!m) return null;
    const n = parseFloat(m[1].replace(",", "."));
    return m[2] === "cm" ? n / 100 : n;
  }

  // La hauteur adulte d'une plante, en mètres : le plus grand nombre de la rubrique « Hauteur »
  // (« 20–60 cm » → 0,6), sinon une hauteur typique de son cycle.
  function hauteurM(p) {
    const v = p.valeurs || {}, t = String(v.hauteur || "");
    let max = 0;
    for (const m of t.matchAll(/([\d,.]+)\s*(?:[–-]\s*([\d,.]+))?\s*(cm|m)\b/g)) {
      const n = Math.max(parseFloat(m[1].replace(",", ".")) || 0, parseFloat((m[2] || "0").replace(",", ".")) || 0);
      max = Math.max(max, m[3] === "cm" ? n / 100 : n);
    }
    if (max) return max;
    return { Arbre: 8, Arbuste: 2, Liane: 3, Annuelle: 0.4, Bisannuelle: 0.6, Vivace: 0.5, Algue: 0.2 }[v.cycle] || 0.5;
  }
  // L'ombre des grands arbres et arbustes adultes (2,5 m et plus) : mi-ombre sous leur couronne,
  // ombre tout près du tronc des très grands. Les plantes d'ombre s'y plaisent.
  const RANG_EXPO = { "Plein soleil": 0, "Mi-ombre": 1, Ombre: 2 };
  const ombresCache = new Map();
  function ombreArbres(ile) {
    const cleO = ile.id + "|" + (ile.modifieLe || 0) + "|" + Object.keys(ile.plantes || {}).length;
    const deja = ombresCache.get(ile.id);
    if (deja && deja.cle === cleO) return deja.carte;
    // Sous la couronne d'un arbre (ou d'un grand arbuste), c'est la mi-ombre ; là où les couronnes de
    // deux grands arbres se chevauchent, l'ombre. La couronne est celle qu'on voit (au plus 6 cases
    // de rayon), et un arbre ne se fait pas d'ombre à lui-même.
    const carte = {}, sous = {};
    for (const [k, pl] of Object.entries(ile.plantes || {})) {
      const q = H.d.plante(pl.p);
      if (!q || stade(ile, pl) < 3) continue;
      const h = hauteurM(q);
      if (h < 2.5) continue;
      const [x, y] = k.split(",").map(Number), r = Math.max(1, Math.min(6, rayonPlante(q, ile)));
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
        if ((!dx && !dy) || Math.hypot(dx, dy) > r + 0.2) continue;
        const c2 = cle(x + dx, y + dy);
        if (h >= 5) sous[c2] = (sous[c2] || 0) + 1;
        const e = sous[c2] >= 2 ? "Ombre" : "Mi-ombre";
        if (!carte[c2] || RANG_EXPO[e] > RANG_EXPO[carte[c2]]) carte[c2] = e;
      }
    }
    ombresCache.set(ile.id, { cle: cleO, carte });
    return carte;
  }
  // l'exposition vraie d'une case : celle qu'on a peinte, assombrie par les arbres
  function expoIci(ile, x, y) {
    const peinte = caseDe(ile, x, y).expo, ombre = ombreArbres(ile)[cle(x, y)];
    return ombre && RANG_EXPO[ombre] > RANG_EXPO[peinte] ? ombre : peinte;
  }

  // --- conditions : est-ce que la plante se plaît ici ? ----------------------------
  function evaluer(ile, x, y, p, pl) {
    const v = p.valeurs || {};
    const c = Object.assign(caseDe(ile, x, y), { expo: expoIci(ile, x, y) });
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
    if (c.t === "herbe") f *= 0.95; // l'herbe fait de la concurrence
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

  // Ce que les plantes « qui améliorent le sol » font à la terre (rubrique remplie par ƟvƟ) :
  // une qualité gagnée, une qualité qui part.
  const EFFETS_SOL = {
    "Enrichit (azote)": ["Riche", "Pauvre"],
    "Apporte de l’humus": ["Humifère", "Pauvre"],
    "Décompacte": ["Profond", "Argileux"],
    "Draine": ["Bien drainé", "Humide"],
    "Garde la fraîcheur": ["Frais", "Sec"],
    "Acidifie": ["Acide", "Calcaire"],
    "Adoucit le calcaire": ["Neutre", "Calcaire"],
  };
  const JOUR = 24 * HEURE;
  let solsAmeliores = [];
  // une plante adulte depuis un jour améliore le sol de sa case et des huit cases autour
  function amenderSol(ile, x, y, pl, p, maintenant) {
    const effets = ((p.valeurs || {}).amendeSol || []).filter((e) => EFFETS_SOL[e]);
    if (!effets.length || pl.c < 70 || pl.solAmende) return;
    if (!pl.adulteDepuis) pl.adulteDepuis = maintenant;
    if (maintenant - pl.adulteDepuis < JOUR) return;
    ile.cases = ile.cases || {};
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = x + dx, cy = y + dy;
        if (cx < 0 || cy < 0 || cx >= ile.cols || cy >= ile.lignes) continue;
        const k = cle(cx, cy), c = Object.assign({}, ile.cases[k]);
        const sol = new Set(c.sol || ile.sol || []);
        for (const e of effets) {
          const [gagne, part] = EFFETS_SOL[e];
          sol.delete(part);
          sol.add(gagne);
        }
        c.sol = [...sol];
        ile.cases[k] = c;
      }
    }
    pl.solAmende = maintenant;
    solsAmeliores.push(p.nom + " (" + effets.map((e) => EFFETS_SOL[e][0].toLowerCase()).join(", ") + ")");
  }
  // les plantes qu'ƟvƟ a notées comme apportant une qualité de sol
  function plantesQuiApportent(qualite) {
    const effets = Object.entries(EFFETS_SOL).filter(([, [gagne]]) => gagne === qualite).map(([e]) => e);
    return H.d.plantes().filter((q) => ((q.valeurs || {}).amendeSol || []).some((e) => effets.includes(e)));
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
    amenderSol(ile, x, y, pl, p, maintenant);
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
  const TEINTES_SAISON = { printemps: "#9cc77a", "été": "#adc46a", automne: "#9fb862", hiver: "#93a68c" };

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
  function imageDessin(p, champ) {
    champ = champ || "dessinCarte";
    const src = p[champ];
    if (!src) return null;
    const cleI = p.id + "|" + champ;
    let e = imagesDessin.get(cleI);
    if (!e || e.src !== src) {
      e = { src, pret: false, img: new Image() };
      e.img.onload = () => {
        e.pret = true;
        if (vue) dessiner();
      };
      e.img.src = src;
      imagesDessin.set(cleI, e);
    }
    return e.pret ? e.img : null;
  }

  // le modèle dessiné à la main (vue de dessus) : seulement si on a choisi de le montrer sur les
  // îles ; sinon chaque plante garde son dessin botanique
  const dessinMain = (p) => (p.dessinSurIles && p.dessinCarte) || null;
  function dessinPlante(p, st, fleur, rayonCases) {
    if (dessinMain(p) && st >= 2) {
      const img = imageDessin(p);
      if (img) {
        return memo("main|" + p.id + "|" + p.dessinCarte.length + "|" + st + "|" + rayonCases, () => {
          const rayon = st < 3 ? 11 : Math.max(12, Math.min(rayonCases * T, 6 * T));
          const taille = Math.ceil(rayon * 2 + 8);
          const c = H.aqua.toile(taille * 2, taille * 2), cc = c.getContext("2d");
          cc.imageSmoothingEnabled = false; // le dessin en pixel art reste net
          cc.drawImage(img, 0, 0, taille * 2, taille * 2);
          return c;
        });
      }
    }
    const saison = H.feuillage ? H.feuillage(p.id) : null;
    const cleD = "plante|" + p.id + "|" + st + "|" + (fleur ? 1 : 0) + "|" + rayonCases + "|" + (saison ? saison.cle : "");
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
        if (arbre && st === 3 && saison && saison.densite < 1) {
          // vu de dessus, un arbre qui se dégarnit : ses branches en étoile, et ce qui reste de feuilles
          for (let k = 0; k < 7; k++) {
            const a = (k / 7) * Math.PI * 2 + r() * 0.4;
            H.aqua.trait(ctx, r, [[cx, cy], [cx + Math.cos(a) * rayon * 0.5, cy + Math.sin(a) * rayon * 0.5], [cx + Math.cos(a + 0.3) * rayon * 0.85, cy + Math.sin(a + 0.3) * rayon * 0.85]], { couleur: "#6b4a34", epaisseur: 1 });
          }
          const reste = saison.automne > 0.5 ? saison.couleur : saison.jeune ? "#9cc77a" : feuille;
          if (saison.densite > 0) for (let k = 0; k < Math.round(12 * saison.densite); k++) {
            const a = r() * Math.PI * 2, dd = Math.sqrt(r()) * rayon * 0.8;
            H.aqua.tache(ctx, r, cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, rayon * 0.25, rayon * 0.2, reste, { alpha: 0.18, couches: 5 });
          }
        } else if (arbre && st === 3) {
          const teinte = saison && saison.automne ? saison.couleur : feuille;
          H.aqua.tache(ctx, r, cx + 3, cy + 4, rayon * 0.9, rayon * 0.75, "#23214a", { alpha: 0.03, couches: 8 });
          H.aqua.tache(ctx, r, cx, cy, rayon, rayon * 0.92, feuille, { alpha: 0.075, couches: 16, bord: 0.35 });
          if (saison && saison.automne) for (let k = 0; k < Math.round(10 * saison.automne); k++) { const a = r() * Math.PI * 2, dd = Math.sqrt(r()) * rayon * 0.8; H.aqua.tache(ctx, r, cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, rayon * 0.3, rayon * 0.25, teinte, { alpha: 0.2, couches: 5 }); }
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

  // La miniature d'une île, dessinée comme la ferme : un petit bloc isométrique en gros pixels,
  // le dessus avec ses vraies cases (herbe, terre bêchée, chemin, gravier, mare, serre), sa tranche
  // de terre, et ses plantes, les arbres plus hauts que les herbes. Un croquis est sur papier.
  const PIX_TUILES = {
    herbe: ["#6cbd5c", "#4aa63e", "#9cc77a"], terre: ["#9a6a3c", "#7a4520", "#b9834f"], chemin: ["#d9b48a", "#c9a06a", "#e9c99a"],
    gravier: ["#c2cdec", "#8a98cc", "#e9e3cd"], eau: ["#2f8fe0", "#6fb6ee", "#2f8fe0"], serre: ["#d6eef7", "#a8d8ec", "#f3f0dc"],
  };
  const PIX_CROQUIS = {
    herbe: ["#efe8d4", "#e9e3cd", "#efe8d4"], terre: ["#d9c4a0", "#c9b090", "#d9c4a0"], chemin: ["#e9d9b8", "#ddd2ba", "#e9d9b8"],
    gravier: ["#ddd8cc", "#c2cdec", "#ddd8cc"], eau: ["#a8d8ec", "#d6eef7", "#a8d8ec"], serre: ["#f3f0dc", "#d6eef7", "#f3f0dc"],
  };
  const FLEURS_PIX = ["#8a58cc", "#ff5b4f", "#f6ee55", "#d07ab8", "#f3f0dc", "#ffd23a", "#e8714a"];
  function miniature(ile) {
    const W = 96, Hh = 64, c = document.createElement("canvas");
    c.width = W; c.height = Hh;
    const g = c.getContext("2d"), P = (x, y, col) => { g.fillStyle = col; g.fillRect(x | 0, y | 0, 1, 1); };
    const hsh = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    // la mer, avec quelques reflets
    g.fillStyle = "#a8d8ec"; g.fillRect(0, 0, W, Hh);
    const r = H.alea(ile.id);
    for (let k = 0; k < 16; k++) { g.fillStyle = "#d6eef7"; g.fillRect((r() * (W - 3)) | 0, (r() * Hh) | 0, 3, 1); }
    const cols = ile.cols, lignes = ile.lignes, tons = ile.croquis ? PIX_CROQUIS : PIX_TUILES;
    const a = Math.min((W - 10) / (cols + lignes), (Hh - 22) / ((cols + lignes) / 2));
    const ox = W / 2 + ((lignes - cols) * a) / 2, oy = 12 + Math.max(0, (Hh - 22 - ((cols + lignes) * a) / 2) / 2);
    const iso = (i, j) => [ox + (i - j) * a, oy + ((i + j) * a) / 2];
    // le dessus, pixel par pixel : à quelle case appartient chaque pixel
    for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
      const u = (x + 0.5 - ox) / a, v = ((y + 0.5 - oy) * 2) / a, i = (u + v) / 2, j = (v - u) / 2;
      if (i < 0 || j < 0 || i >= cols || j >= lignes) continue;
      const tt = caseDe(ile, Math.floor(i), Math.floor(j)).t;
      if (tt === "vide") continue;
      const t = tt === "sol" ? (ile.croquis ? tons.herbe : teintesSol(ile.sol).base) : tons[tt] || tons.herbe, h = hsh(x, y);
      P(x, y, h < 0.6 ? t[0] : h < 0.85 ? t[1] : t[2]);
    }
    // la tranche de terre (côté gauche au soleil, côté droit à l'ombre)
    const [ax, ay] = iso(0, lignes), [bx, by] = iso(cols, lignes), [cx, cy] = iso(cols, 0);
    const tranche = (x0, y0, x1, y1, clair) => {
      const n = Math.max(1, Math.round(Math.abs(x1 - x0)));
      for (let q = 0; q <= n; q++) {
        const x = x0 + ((x1 - x0) * q) / n, y = y0 + ((y1 - y0) * q) / n;
        for (let d = 0; d < 6; d++) P(x, y + d, d < 1 ? (ile.croquis ? "#c9c4b0" : clair ? "#6cbd5c" : "#3f8a42") : d < 4 ? (clair ? "#b9834f" : "#9a6a3c") : clair ? "#8a98cc" : "#6b6578");
      }
    };
    for (let y = 0; y < lignes; y++) for (let x = 0; x < cols; x++) {
      if (estVide(ile, x, y)) continue;
      if (estVide(ile, x, y + 1)) { const [p0, q0] = iso(x, y + 1), [p1, q1] = iso(x + 1, y + 1); tranche(p0, q0, p1, q1, true); }
      if (estVide(ile, x + 1, y)) { const [p0, q0] = iso(x + 1, y + 1), [p1, q1] = iso(x + 1, y); tranche(p0, q0, p1, q1, false); }
    }
    // les plantes, du fond vers l'avant ; les arbres et les arbustes dépassent
    const plantes = Object.entries(ile.plantes || {}).map(([k, pl]) => { const [x, y] = k.split(",").map(Number); return { x, y, p: H.d.plante(pl.p) }; })
      .filter((o) => o.p).sort((m, n) => m.x + m.y - (n.x + n.y));
    for (const { x, y, p } of plantes) {
      const [px, py] = iso(x + 0.5, y + 0.5), cycle = (p.valeurs || {}).cycle, fleur = FLEURS_PIX[Math.floor(hsh(p.id.length, p.id.charCodeAt(0)) * FLEURS_PIX.length)];
      if (ile.croquis) { P(px, py, "#23214a"); P(px + 1, py, "#23214a"); continue; }
      if (cycle === "Arbre") {
        for (let d = 0; d < 7; d++) P(px, py - d, "#4b3427");
        for (let dy = -2; dy <= 1; dy++) for (let dx = -4; dx <= 4; dx++) if (Math.abs(dx) / 4.5 + Math.abs(dy) / 2.5 < 1) P(px + dx, py - 8 + dy, hsh(dx + x, dy + y) < 0.5 ? "#2f6b35" : "#3f8a42");
      } else if (cycle === "Arbuste") {
        for (let dy = -2; dy <= 0; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) < 3) P(px + dx, py + dy - 1, hsh(dx, dy + x) < 0.6 ? "#3f8a42" : "#2f6b35");
        P(px, py - 3, fleur);
      } else {
        P(px, py, "#2f6b35"); P(px + 1, py, "#3f8a42"); P(px, py - 1, "#3f8a42"); P(px + 1, py - 1, fleur);
      }
    }
    return c.toDataURL("image/png");
  }

  function archipel(conteneur) {
    // (la fenêtre s'appelle déjà « Les îles » : pas de titre, un bouton et une ligne d'aide en pixels)
    conteneur.appendChild(H.el("div.archipel-tete", null,
      H.el("button.bouton-pixel", { type: "button", onclick: nouvelleIle }, "Nouvelle île"),
      H.el("p.aide-pixel", null, "Chaque île est un jardin. Les îles de jeu poussent en temps réel ; les croquis servent d’esquisse pour un vrai projet, à l’échelle.")
    ));
    const grille = H.el("div.archipel");
    const liste = iles().filter((i) => i.id !== ILE_SECRETE || ileSecreteOuverte());
    if (!liste.length) {
      grille.appendChild(H.el("p.discret", null, "Pas encore d’île. Clique sur « Nouvelle île » pour dessiner ton premier jardin."));
    }
    liste.forEach((ile) => {
      grille.appendChild(H.el("a.carte-ile", { href: "#terrain/" + encodeURIComponent(ile.id) },
        H.el("img.miniature-ile", { src: miniature(ile), alt: "" }),
        H.el("span.infos-ile", null,
          H.el("span.nom-ile", null, ile.nom),
          H.el("span.mesures-ile", null, ile.largeur + " × " + ile.longueur + " m · " + Object.keys(ile.plantes || {}).length + " plantes"),
          H.el("span.sorte-ile" + (ile.croquis ? ".croquis" : ""), null, etiquetteIle(ile)))
      ));
    });
    if (!ileSecreteOuverte()) {
      grille.appendChild(H.el("div.carte-ile.brume", { title: "Une île se cache dans la brume" },
        H.el("span.brume-dessin", { "aria-hidden": "true" }),
        H.el("span.infos-ile", null,
          H.el("span.nom-ile", null, "Une île dans la brume"),
          H.el("span.mesures-ile", null, "Reviens le 24 février…"))
      ));
    } else if (!(H.jeu.iles || {})[ILE_SECRETE] || ((H.jeu.iles[ILE_SECRETE].version || 1) < VERSION_ILE_SECRETE && !H.jeu.iles[ILE_SECRETE].supprime)) {
      creerIleSecrete();
      return H.router();
    }
    conteneur.appendChild(grille);
  }

  // --- les îles surprises ---------------------------------------------------------------
  // ƟvƟ et Mesi peuvent se préparer une île en secret, et l'offrir à l'autre pour un jour choisi.
  // Le cadeau (une copie de l'île, et les fiches de ses plantes) passe par la même voie que les
  // lettres ; le jour venu, l'île arrive chez l'autre, avec un petit mot. Tant que la date n'est
  // pas arrivée, on peut encore la retoucher : la copie suit l'île.
  const NOMS = { ovo: H.fixe("ƟvƟ"), mesi: H.fixe("Mesi") };
  const moi = () => (H.local.role === "mesi" ? "mesi" : "ovo");
  const autre = () => (moi() === "mesi" ? "ovo" : "mesi");
  const deux = (n) => String(n).padStart(2, "0");
  const jourIso = (d) => d.getFullYear() + "-" + deux(d.getMonth() + 1) + "-" + deux(d.getDate());
  const dateLisible = (iso) => new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const cadeaux = () => Object.values(H.jeu.cadeaux || {}).filter((c) => c && !c.supprime);
  function etiquetteIle(ile) {
    const c = ile.cadeau && (H.jeu.cadeaux || {})[ile.cadeau];
    if (c && !c.supprime) return c.recuLe ? "offerte à " + NOMS[c.pour] + " ✓" : "surprise pour " + NOMS[c.pour] + " · " + dateLisible(c.le);
    if (ile.aOffrir) return "surprise à offrir";
    if (ile.offertePar) return "cadeau de " + NOMS[ile.offertePar];
    return ile.croquis ? "croquis" : "île de jeu";
  }
  // la copie du cadeau : l'île telle qu'elle est, et les fiches de toutes ses plantes
  function emballer(ile, c) {
    const copie = JSON.parse(JSON.stringify(ile));
    delete copie.cadeau; delete copie.aOffrir;
    const fiches = {};
    for (const pl of Object.values(copie.plantes || {})) {
      const p = H.d.plante(pl.p);
      // (ƟvƟ n'a jamais les fiches chinoises de Mesi : seulement le nom de la plante et son jardin)
      if (p && !fiches[p.id]) fiches[p.id] = p.pc && H.pharmacopee ? H.pharmacopee.pourOvo(p) : JSON.parse(JSON.stringify(p));
    }
    Object.assign(c, { ile: copie, fiches, modifieLe: H.maintenant() });
  }
  function offrir(ile, le, mot) {
    const id = ile.cadeau || H.uid("cadeau");
    const c = Object.assign({}, (H.jeu.cadeaux || {})[id], { id, de: moi(), pour: autre(), le, mot });
    emballer(ile, c);
    H.jeu.cadeaux = Object.assign({}, H.jeu.cadeaux, { [id]: c });
    ile.cadeau = id;
    delete ile.aOffrir;
    sauver(ile);
  }
  // tant que la surprise n'est pas arrivée, la copie suit les retouches de l'île
  function suivreCadeau(ile) {
    const c = ile.cadeau && (H.jeu.cadeaux || {})[ile.cadeau];
    if (!c || c.supprime || c.recuLe || c.le <= jourIso(new Date())) return;
    emballer(ile, c);
  }
  // le jour venu, chez l'autre : l'île arrive, avec le petit mot
  async function livrerCadeaux() {
    if (!H.jeu || !H.local || H.$(".dialogue")) return;
    const aujourdhui = jourIso(new Date());
    const c = cadeaux().find((x) => x.pour === moi() && !x.recuLe && x.le <= aujourdhui && x.ile && !Object.values(H.jeu.iles || {}).some((i) => i.deCadeau === x.id));
    if (!c) return;
    const id = H.uid("ile");
    const ile = Object.assign(JSON.parse(JSON.stringify(c.ile)), { id, deCadeau: c.id, offertePar: c.de, mot: c.mot || "", recueLe: H.maintenant() });
    // les plantes que cette herbothèque n'a pas encore rejoignent l'herbier
    let nouvelles = 0;
    for (const [pid, p] of Object.entries(c.fiches || {})) {
      if (H.d.plante(pid)) continue;
      H.herbier.plantes[pid] = Object.assign({}, p, { offertePar: c.de, modifieLe: H.maintenant() });
      nouvelles++;
    }
    if (nouvelles) { H.d.invalider(); H.d.changer("herbier"); }
    sauver(ile);
    H.jeu.cadeaux = Object.assign({}, H.jeu.cadeaux, { [c.id]: Object.assign({}, c, { recuLe: H.maintenant(), modifieLe: H.maintenant() }) });
    H.d.changer("jeu");
    const qui = c.de === "mesi" ? "luigi" : "ovo";
    await H.dialogue.dire([
      { brut: true, qui, texte: "Surprise ! Je t’ai préparé une île en secret : « " + ile.nom + " »." },
    ].concat(c.mot ? [{ brut: true, qui, texte: c.mot }] : []).concat(nouvelles ? [{ brut: true, qui, texte: nouvelles > 1 ? "Ses " + nouvelles + " plantes sont aussi dans ton herbothèque, maintenant." : "Sa plante est aussi dans ton herbothèque, maintenant." }] : []));
    H.aller("terrain/" + encodeURIComponent(id));
  }
  H.sur("vue", (v) => { if (["village", "terrain", "maison"].includes(v)) setTimeout(livrerCadeaux, 2600); });
  H.sur("donnees", (quoi) => { if (quoi === "jeu") setTimeout(livrerCadeaux, 2600); });

  // La fenêtre « Nouvelle île », dans le style des menus du jeu : un bloc d'encre, la police
  // pixel, des choix qu'on coche (le curseur ▶ devant celui qui est pris) plutôt que des listes.
  function nouvelleIle() {
    const nom = H.el("input", { type: "text", placeholder: "Le jardin des simples" });
    const largeur = H.el("input", { type: "number", min: 2, max: 80, step: "0.5", value: 10 });
    const longueur = H.el("input", { type: "number", min: 2, max: 80, step: "0.5", value: 8 });
    // une rangée de choix (un seul pris à la fois)
    let groupe = 0;
    const choix = (liste, defaut) => {
      const nomGroupe = "choix-ile-" + ++groupe;
      const boite = H.el("div.choix-pixel", null, liste.map(([v, t, aide]) => H.el("label.puce-pixel", null,
        H.el("input", { type: "radio", name: nomGroupe, value: v, checked: v === defaut }), H.el("span", null, t), aide ? H.el("small", null, aide) : null)));
      boite.valeur = () => (H.$("input:checked", boite) || {}).value;
      return boite;
    };
    const echelle = choix([["0.25", "25 cm"], ["0.5", "50 cm"], ["1", "1 m"], ["2", "2 m"]], "0.5");
    const type = choix([["jeu", "Île de jeu", "elle pousse en temps réel"], ["croquis", "Croquis de projet", "à l’échelle, sans ressources"], ["surprise", "Île surprise", "à offrir à " + NOMS[autre()] + ", à la date de ton choix"]], "jeu");
    const expo = choix(EXPOS.map((e) => [e, e]), EXPOS[0]);
    const options = (H.d.champ("sol") || {}).options || [];
    const defaut = ["Calcaire", "Caillouteux", "Sec", "Bien drainé"];
    const sols = H.el("div.pastilles", null, options.map((o) => H.el("label.case", null, H.el("input", { type: "checkbox", value: o, checked: defaut.includes(o) }), " " + o)));
    const notes = H.el("textarea", { rows: 3, placeholder: "Adresse, personnes, envies, contraintes…" });
    const cases = H.el("p.aide-menu");
    const majCases = () => {
      const L = parseFloat(largeur.value), l = parseFloat(longueur.value), k = parseFloat(echelle.valeur());
      cases.textContent = L > 0 && l > 0 && k > 0 ? "Soit " + Math.round(L / k) + " × " + Math.round(l / k) + " cases." : "";
    };
    const msg = H.el("p.aide-menu.erreur");
    let fermer;
    const formulaire = H.el("form.formulaire-pixel", {
      oninput: majCases,
      onsubmit(e) {
        e.preventDefault();
        const n = nom.value.trim();
        const L = parseFloat(largeur.value), l = parseFloat(longueur.value), k = parseFloat(echelle.valeur());
        if (!n) return (msg.textContent = "Donne un nom à l’île.");
        if (!(L > 0 && l > 0)) return (msg.textContent = "Indique des dimensions en mètres.");
        const cols = Math.round(L / k), lignes = Math.round(l / k);
        if (cols > 80 || lignes > 80) return (msg.textContent = "C’est trop grand pour cette échelle : choisis des cases plus grandes (maximum 80 cases de côté).");
        if (cols < 3 || lignes < 3) return (msg.textContent = "C’est trop petit pour cette échelle : choisis des cases plus petites.");
        const ile = {
          id: H.uid("ile"), nom: n, largeur: L, longueur: l, caseM: k, cols, lignes,
          croquis: type.valeur() === "croquis", expo: expo.valeur(), aOffrir: type.valeur() === "surprise" || undefined,
          sol: H.$$("input:checked", sols).map((i) => i.value),
          notes: notes.value.trim(), cases: {}, plantes: {}, creeLe: H.maintenant(),
        };
        sauver(ile);
        fermer();
        H.aller("terrain/" + encodeURIComponent(ile.id));
      },
    },
      H.el("h2", null, "Nouvelle île"),
      H.el("label.champ-pixel", null, H.el("span", null, "Nom"), nom),
      H.el("div.ligne-pixel", null,
        H.el("label.champ-pixel", null, H.el("span", null, "Largeur (m)"), largeur),
        H.el("span.fois", null, "×"),
        H.el("label.champ-pixel", null, H.el("span", null, "Longueur (m)"), longueur)),
      H.el("div.champ-pixel", null, H.el("span", null, "Une case ="), echelle), cases,
      H.el("div.champ-pixel", null, H.el("span", null, "Type"), type),
      H.el("div.champ-pixel", null, H.el("span", null, "Exposition de départ"), expo),
      H.el("div.champ-pixel", null, H.el("span", null, "Sol de départ"), sols, H.el("p.aide-menu", null, "Par défaut, un sol de garrigue. Tu pourras ensuite peindre des zones différentes.")),
      H.el("label.champ-pixel", null, H.el("span", null, "Notes"), notes),
      msg,
      H.el("button.bouton", { type: "submit" }, "Créer l’île")
    );
    fermer = H.fenetre(formulaire, { classe: "menu-scene.menu-large" });
    majCases();
    nom.focus();
  }

  // L'île de Lóló et Mémé : un chemin en forme de cœur, au milieu un bassin (papyrus, nénuphars,
  // grenouilles, canards), et tout autour beaucoup de romarin et de thym.
  const VERSION_ILE_SECRETE = 3;
  function creerIleSecrete() {
    const cols = 22, lignes = 20;
    const ile = {
      id: ILE_SECRETE, nom: "L’île de Lóló et Mémé", largeur: 11, longueur: 10, caseM: 0.5, cols, lignes,
      croquis: false, secrete: true, version: VERSION_ILE_SECRETE, expo: "Plein soleil", sol: ["Calcaire", "Limoneux", "Bien drainé"],
      notes: "", cases: {}, plantes: {}, creeLe: H.maintenant(),
    };
    const maintenant = H.maintenant();
    // le cœur : x = 16 sin³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t (retourné, pointe en bas)
    const sx = (cols - 5) / 32, sy = (lignes - 5) / 29, cx = cols / 2, cy = 2.5 + 12 * sy;
    const contour = [];
    for (let t = 0; t < Math.PI * 2; t += 0.01) {
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      contour.push([cx + hx * sx, cy + hy * sy]);
    }
    for (const [x, y] of contour) ile.cases[cle(Math.floor(x), Math.floor(y))] = { t: "chemin" };
    const dansCoeur = (x, y) => {
      let dedans = false;
      for (let i = 0, j = contour.length - 1; i < contour.length; j = i++) {
        const [xi, yi] = contour[i], [xj, yj] = contour[j];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
      }
      return dedans;
    };
    // le bassin, au cœur du cœur
    const mare = { cx, cy: cy + 2 * sy, rx: 3.6, ry: 2.6 };
    ile.mare = mare;
    const dansMare = (x, y, marge) => ((x - mare.cx) / (mare.rx + marge)) ** 2 + ((y - mare.cy) / (mare.ry + marge)) ** 2 <= 1;
    const r = H.alea("lolo-coeur");
    // surtout du romarin et du thym, et des bleuets
    const herbes = ["rosmarinus-officinalis", "thymus-vulgaris", "thymus-serpyllum", "rosmarinus-officinalis", "thymus-vulgaris", "centaurea-cyanus"].filter((id) => H.d.plante(id));
    const fleurs = ["lavandula-angustifolia", "calendula-officinalis", "viola-odorata", "centaurea-cyanus", "papaver-rhoeas", "eschscholzia-californica", "matricaria-recutita"].filter((id) => H.d.plante(id));
    for (let y = 0; y < lignes; y++) {
      for (let x = 0; x < cols; x++) {
        const k = cle(x, y), mx = x + 0.5, my = y + 0.5;
        if (dansMare(mx, my, 0)) {
          ile.cases[k] = { t: "eau" };
          continue;
        }
        if (ile.cases[k] || dansMare(mx, my, 0.9)) continue;
        const dedans = dansCoeur(mx, my);
        // dans le cœur : surtout du romarin et du thym ; dehors, des touffes et quelques fleurs
        const chance = dedans ? 0.85 : 0.55;
        if (r() > chance) continue;
        const liste = dedans || r() < 0.65 ? herbes : fleurs;
        const id = liste[Math.floor(r() * liste.length)];
        if (id) ile.plantes[k] = { p: id, le: maintenant, c: 100, eau: 80, maj: maintenant };
      }
    }
    ile.lolo = { x: cx, y: cy + 15 * sy + 1.4 };
    sauver(ile);
  }

  // --- les animaux et les insectes -----------------------------------------------------------
  // Ceux de l'île de Lóló et Mémé (autour du bassin), et ceux qu'ƟvƟ a emmenés sur ses îles.
  // Les positions sont en cases ; elles servent au dessin et pour les montrer du doigt.
  const NOMS_ANIMAUX = { canard: "le canard", grenouille: "la grenouille", papillon: "le papillon", libellule: "la libellule" };
  const HONGROIS_ANIMAUX = { canard: "kacsa", grenouille: "béka", papillon: "pillangó", libellule: "szitakötő" };
  function animaux(ile, t) {
    const liste = [];
    const m = ile.mare;
    if (m) {
      [[0, 1], [Math.PI, -1]].forEach(([ph, sens], i) => {
        const a = ph + (sens * t) / 9000;
        liste.push({ type: "canard", x: m.cx + Math.cos(a) * m.rx * 0.55, y: m.cy + Math.sin(a) * m.ry * 0.5, dir: a + (sens * Math.PI) / 2, variante: i });
      });
      [[-1.6, -0.6], [0.2, -1.2]].forEach(([dx, dy], i) => liste.push({ type: "grenouille", x: m.cx + dx, y: m.cy + dy, variante: i }));
      for (let i = 0; i < 2; i++) {
        const u = t / 1000 + i * 5;
        liste.push({ type: "libellule", x: m.cx + Math.sin(u * 0.7) * m.rx * 0.9 + Math.sin(u * 2.3) * 0.4, y: m.cy - 0.8 + Math.cos(u * 0.5 + i) * m.ry * 0.9, dir: Math.atan2(Math.cos(u * 0.5 + i), Math.cos(u * 0.7)), variante: i });
      }
      for (let i = 0; i < 4; i++) {
        const u = t / 1000 + i * 7;
        liste.push({ type: "papillon", x: ile.cols / 2 + Math.sin(u * 0.23 + i) * ile.cols * 0.38, y: ile.lignes / 2 + Math.sin(u * 0.31 + i * 2) * ile.lignes * 0.36 + Math.sin(u * 3) * 0.15, variante: i });
      }
    }
    // les animaux emmenés sur cette île : chacun garde son coin
    for (const a of ile.animaux || []) {
      const u = t / 1000 + (a.graine || 0);
      if (a.type === "canard") {
        const ang = u / 9 * (a.graine % 2 ? 1 : -1);
        liste.push({ type: "canard", x: a.x + Math.cos(ang) * 0.7, y: a.y + Math.sin(ang) * 0.5, dir: ang + Math.PI / 2, variante: a.graine % 2 });
      } else if (a.type === "grenouille") liste.push({ type: "grenouille", x: a.x, y: a.y, variante: a.graine % 2 });
      else if (a.type === "libellule") liste.push({ type: "libellule", x: a.x + Math.sin(u * 0.7) * 1.4, y: a.y + Math.cos(u * 0.5) * 1, dir: Math.atan2(Math.cos(u * 0.5), Math.cos(u * 0.7)), variante: a.graine % 2 });
      else if (a.type === "papillon") liste.push({ type: "papillon", x: a.x + Math.sin(u * 0.23) * 3, y: a.y + Math.sin(u * 0.31) * 2.5 + Math.sin(u * 3) * 0.15, variante: a.graine % 4 });
    }
    return liste;
  }
  function dessinerAnimaux(ctx, ile, t, projection) {
    for (const a of animaux(ile, t)) {
      const [px, py] = projection ? projection(a.x, a.y) : [a.x * T, a.y * T];
      ctx.save();
      if (a.type === "canard") {
        const [corps, tete] = a.variante ? ["#8a6a4a", "#2f7a4a"] : ["#f2f0e8", "#ffd23a"];
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(px - Math.cos(a.dir) * 8, py - Math.sin(a.dir) * 8, 7, 3, a.dir, 0, Math.PI * 2); ctx.stroke();
        ctx.translate(px, py); ctx.rotate(a.dir);
        ctx.fillStyle = corps; ctx.beginPath(); ctx.ellipse(0, 0, 7, 4.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#23214a"; ctx.lineWidth = 1; ctx.stroke();
        ctx.fillStyle = tete; ctx.beginPath(); ctx.arc(6, 0, 3, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#ff9a1e"; ctx.beginPath(); ctx.moveTo(8.5, -1.2); ctx.lineTo(11.5, 0); ctx.lineTo(8.5, 1.2); ctx.fill();
      } else if (a.type === "grenouille") {
        const saut = (t / 1000 + a.variante * 3) % 9 < 0.5;
        const fy = py - (saut ? 4 : 0);
        ctx.fillStyle = "#6fae3a";
        ctx.beginPath(); ctx.ellipse(px, fy, 5, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = "#4a7a2a"; ctx.lineWidth = 2;
        for (const s2 of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(px + s2 * 3, fy + 3); ctx.lineTo(px + s2 * 7, fy + 6); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(px + s2 * 3, fy - 2); ctx.lineTo(px + s2 * 6, fy - 5); ctx.stroke();
        }
        const cligne = (t / 1000 + a.variante) % 4 < 0.15;
        ctx.fillStyle = "#23214a";
        for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.ellipse(px + s2 * 2.2, fy - 4, 1.4, cligne ? 0.3 : 1.4, 0, 0, Math.PI * 2); ctx.fill(); }
      } else if (a.type === "libellule") {
        ctx.translate(px, py); ctx.rotate(a.dir);
        ctx.fillStyle = "rgba(200,230,255,0.55)";
        for (const [dx, dy] of [[-1, -1], [-1, 1], [2, -1], [2, 1]]) { ctx.beginPath(); ctx.ellipse(dx, dy * 4, 2, 5, dy * 0.4, 0, Math.PI * 2); ctx.fill(); }
        ctx.strokeStyle = a.variante ? "#3826f2" : "#1f8a6a"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(6, 0); ctx.stroke();
      } else if (a.type === "papillon") {
        const bat = Math.abs(Math.sin((t / 1000 + a.variante * 7) * 9));
        ctx.fillStyle = ["#ff5b4f", "#ffd23a", "#7aa6e0", "#f3b4cf"][a.variante % 4];
        for (const s2 of [-1, 1]) { ctx.beginPath(); ctx.ellipse(px + s2 * 3 * bat, py, 3.5 * bat + 0.6, 3, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = "#23214a"; ctx.fillRect(px - 0.6, py - 3, 1.2, 6);
      }
      ctx.restore();
    }
  }

  // le bassin et ses habitants, dessinés par-dessus l'île (en cases ; T pixels par case)
  function dessinerMare(ctx, ile, t) {
    const m = ile.mare;
    const X = (x) => x * T, Y = (y) => y * T;
    ctx.save();
    // des papyrus tout autour : des ombelles vues d'en haut, comme de petites étoiles
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      const px = X(m.cx + Math.cos(a) * (m.rx + 0.45)), py = Y(m.cy + Math.sin(a) * (m.ry + 0.45));
      ctx.strokeStyle = "#5f8a46";
      ctx.lineWidth = 1.2;
      const balance = Math.sin(t / 900 + i) * 0.08;
      for (let j = 0; j < 12; j++) {
        const b = (j / 12) * Math.PI * 2 + balance;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px + Math.cos(b) * 9, py + Math.sin(b) * 9);
        ctx.stroke();
      }
      ctx.fillStyle = "#c9b45a";
      ctx.beginPath(); ctx.arc(px, py, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    // des nénuphars
    const feuilles = [[-1.6, -0.6], [1.3, 0.7], [0.2, -1.2], [-0.4, 1.1]];
    feuilles.forEach(([dx, dy], i) => {
      const px = X(m.cx + dx), py = Y(m.cy + dy);
      ctx.fillStyle = "#4f8a3a";
      ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 9, 0.35, Math.PI * 2 - 0.1); ctx.closePath(); ctx.fill();
      if (i === 1) { ctx.fillStyle = "#f3b4cf"; ctx.beginPath(); ctx.arc(px - 3, py - 2, 3, 0, Math.PI * 2); ctx.fill(); }
    });
    ctx.restore();
  }


  // --- les icônes en pixels de l'écran des îles (12 × 12, dans le style du bureau) ---------------
  const PAL_ICONE = { k: "#23214a", w: "#f3f0dc", b: "#3d5ee8", B: "#a8d8ec", m: "#f4a3b8", M: "#c93f6e", v: "#4aa63e", y: "#f6ee55", g: "#c6c8dc", G: "#8d90b0", n: "#b9834f", N: "#7a4520" };
  const ICONES_ILE = {
    oiseau: ["............", "............", ".......kkk..", "......kbbbk.", "......kbkbyy", "..kkkkkbbbk.", ".kbbbbbbbbk.", "kbbBBBbbbk..", ".kbbBBBbbk..", "..kkkbbbk...", "....k..k....", "...kk..kk..."],
    relief: [".....kk.....", "...kkvvkk...", ".kkvvvvvvkk.", "kvvvvvvvvvvk", "knkkvvvvkkNk", "knnnkkkkNNNk", "knnnnnNNNNNk", ".kknnnNNNkk.", "...kknNkk...", ".....kk.....", "............", "............"],
    plus: ["............", "............", "....kkkk....", "....kwwk....", "..kkkwwkkk..", "..kwwwwwwk..", "..kwwwwwwk..", "..kkkwwkkk..", "....kwwk....", "....kkkk....", "............", "............"],
    moins: ["............", "............", "............", "............", "..kkkkkkkk..", "..kwwwwwwk..", "..kwwwwwwk..", "..kkkkkkkk..", "............", "............", "............", "............"],
    cerveau: ["............", "...kkkkkk...", "..kmmMmmmk..", ".kmmmMmMmmk.", ".kmMmMmmMmk.", "kmmMmmMmmmmk", "kmmmMmmMmMmk", ".kmMmmMmmmk.", ".kmmMmmMmmk.", "..kkkkkkkk..", "....kmmk....", "....kkkk...."],
    exporter: ["..kkkkkk....", "..kwwwwkk...", "..kwwwwkwk..", "..kwwwwkkkk.", "..kwwwwwwwk.", "..kwwwvwwwk.", "..kwwwvvwwk.", "..kwvvvvvwk.", "..kwwwvvwwk.", "..kwwwvwwwk.", "..kwwwwwwwk.", "..kkkkkkkkk."],
    reglages: ["....kkkk....", ".kk.kggk.kk.", ".kgkkggkkgk.", "..kggggggk..", "kkggkkkkgGkk", "kgggk..kgGGk", "kgggk..kgGGk", "kkggkkkkGGkk", "..kgGGGGGk..", ".kGkkGGkkGk.", ".kk.kGGk.kk.", "....kkkk...."],
    patte: ["............", "..kk....kk..", ".knnk..knnk.", ".knnk..knnk.", "..kk.kk.kk..", "....knnk....", "...knnnnk...", "..knnnnnnk..", "..knnnnnnk..", "...knnnnk...", "....kkkk....", "............"],
  };
  const imagesIcones = {};
  function imageIcone(nom) {
    if (!imagesIcones[nom]) {
      const c = document.createElement("canvas");
      c.width = c.height = 12;
      const g = c.getContext("2d");
      ICONES_ILE[nom].forEach((l, j) => [...l].forEach((ch, i) => { if (PAL_ICONE[ch]) { g.fillStyle = PAL_ICONE[ch]; g.fillRect(i, j, 1, 1); } }));
      imagesIcones[nom] = c.toDataURL("image/png");
    }
    return imagesIcones[nom];
  }
  // un bouton-icône : l'image en pixels, le nom au survol (et pour les lecteurs d'écran)
  const boutonIcone = (src, nom, onclick, lien) => H.el(lien ? "a.bouton-icone" : "button.bouton-icone", Object.assign({ title: nom, "aria-label": nom }, lien ? { href: lien } : { type: "button", onclick }), H.el("img", { src, alt: "" }));

  // --- vue : une île -----------------------------------------------------------------
  let vue = null; // état de l'île affichée

  function ouvrirIle(conteneur, id) {
    const ile = (H.jeu.iles || {})[id];
    if (!ile || ile.supprime || (ile.secrete && !ileSecreteOuverte())) {
      conteneur.appendChild(H.el("p", null, "Cette île n’existe pas (ou pas encore). ", H.el("a", { href: "#terrain" }, "Retour à l’archipel")));
      return;
    }
    const maintenant = H.maintenant();
    solsAmeliores = [];
    for (const [k, pl] of Object.entries(ile.plantes || {})) {
      const [x, y] = k.split(",").map(Number);
      pousser(ile, x, y, pl, maintenant);
    }
    if (solsAmeliores.length) {
      sauver(ile);
      setTimeout(() => H.toast("Le sol s’est amélioré autour de : " + solsAmeliores.join(" ; "), 6000), 800);
    }

    vue = {
      ile, outil: "regarder", plante: null, tuile: "terre", zone: { expo: "Mi-ombre", sol: [] },
      zoom: H.local.zoomTerrain || (window.innerWidth < 640 ? 0.75 : 1),
      ovo: { x: ile.secrete ? 3 : Math.floor(ile.cols / 2), y: Math.floor(ile.lignes / 2) + (ile.secrete ? 1 : 0), cible: null, file: [], pas: 0 },
      luigi: null, gouttes: [], derniere: performance.now(), anim: 0, choisie: null,
      iso: !H.local.vueDessus,
    };

    const ciel = H.el("canvas.ciel-ile", { height: 70 });
    const infoCiel = H.el("p.info-ciel");
    const toile = H.el("canvas.toile-ile", { "aria-label": "Plan de l’île " + ile.nom });
    const zoneToile = H.el("div.zone-toile", null, toile);
    const outils = H.el("div.outils-terrain");
    const options = H.el("div.options-outil");
    const panneau = H.el("div.panneau-case", { hidden: true });
    let echelle = null;

    conteneur.appendChild(H.el("div.terrain-tete", null,
      H.el("a.bouton.discret-bouton", { href: "#terrain" }, "Archipel"),
      H.el("h1", null, ile.nom),
      (echelle = H.el("span.discret.echelle-ile", null, texteEchelle(ile))),
      // l'île : réviser ses plantes, l'exporter, ses réglages
      H.el("div.actions-ile", null,
        Object.keys(ile.plantes || {}).length ? boutonIcone(imageIcone("cerveau"), "Réviser les plantes de l’île", null, "#cartes/ile/" + encodeURIComponent(ile.id)) : null,
        boutonIcone(imageIcone("exporter"), "Exporter (la liste des plantes, ou le croquis)", () => exporterIle(ile)),
        boutonIcone(imageIcone("reglages"), "Réglages de l’île", () => reglagesIle(ile)))
    ));
    vue.echelle = echelle;
    // de chaque côté de l'île, deux barres d'icônes : à gauche la vue (relief ou oiseau, zoom), à
    // droite ceux qu'on peut appeler
    const barreVue = H.el("div.barre-ile.barre-vue", null,
      (vue.boutonVue = boutonIcone(imageIcone(vue.iso ? "oiseau" : "relief"), vue.iso ? "Vue d’oiseau (touche V)" : "Vue en relief (touche V)", () => basculerVue())),
      boutonIcone(imageIcone("plus"), "Zoomer", () => zoomer(1)),
      boutonIcone(imageIcone("moins"), "Dézoomer", () => zoomer(-1)));
    const barreAmis = H.el("div.barre-ile.barre-amis", null,
      !ile.croquis ? boutonIcone(H.pixel.portrait("luigi", 2), H.monde === "mesi" ? "Appeler ƟvƟ" : "Appeler Mesi", () => appelerMesi(true)) : null,
      H.lolo && H.lolo.disponible() ? boutonIcone(H.pixel.portrait("lolo", 2), "Appeler Lóló", appelerLolo) : null,
      ile.secrete ? boutonIcone(imageIcone("patte"), "Emmener un animal sur une de mes îles", () => emmenerAnimal(ile)) : null,
      ile.secrete ? (vue.boutonHongrois = H.el("button.bouton.petit.actif", { type: "button", hidden: true, onclick: finirTourHongrois }, "Finir le tour en hongrois")) : null);
    conteneur.append(H.el("div.bandeau-ciel", null, ciel, infoCiel), outils, options, H.el("div.cadre-toile-ile", null, zoneToile, barreVue, barreAmis), panneau);
    Object.assign(vue, { toile, ciel, infoCiel, outils, options, panneau, zoneToile });
    if (window.ResizeObserver) { const ro = new ResizeObserver(() => hauteurZone()); ro.observe(outils); ro.observe(options); }

    dessinerOutils();
    dimensionner();
    peindreFond();
    dessiner();
    dessinerCiel();
    toile.addEventListener("click", clic);
    brancherZoomGestes(zoneToile);
    brancherGestesForme(toile);
    chargerCalque(ile);
    // le nom et l'aperçu d'une plante : au survol avec la souris, ou au toucher sur téléphone
    toile.addEventListener("pointerdown", (e) => (vue.pointeur = e.pointerType));
    toile.addEventListener("pointermove", (e) => e.pointerType === "mouse" && montrerBulle(e));
    toile.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && cacherBulle());
    zoneToile.addEventListener("scroll", () => cacherBulle());
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

  // passer de la vue en relief à la vue d'oiseau (de dessus), et retour
  function basculerVue() {
    vue.iso = !vue.iso;
    H.d.majLocal((l) => (l.vueDessus = !vue.iso));
    // (l'icône montre la vue où l'on va : l'oiseau depuis le relief, le relief depuis la vue d'oiseau)
    if (vue.boutonVue) { const n = vue.iso ? "Vue d’oiseau (touche V)" : "Vue en relief (touche V)"; vue.boutonVue.title = n; vue.boutonVue.setAttribute("aria-label", n); vue.boutonVue.querySelector("img").src = imageIcone(vue.iso ? "oiseau" : "relief"); }
    dessinerOutils();
    dimensionner(); peindreFond(); dessiner();
  }
  document.addEventListener("keydown", (e) => {
    if (!vue || !document.body.contains(vue.toile) || e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea, select")) return;
    if (e.key === "v" || e.key === "V") basculerVue();
  });

  function dessinerOutils() {
    const ile = vue.ile;
    // (avec l'outil de la forme, le doigt peint sur l'île au lieu de faire défiler la page)
    if (vue.toile) vue.toile.style.touchAction = vue.outil === "forme" ? "none" : "";
    // deux modes, une seule rangée d'outils à la fois : le jardin (ce qu'on fait tous les jours) et
    // le chantier (ce qui transforme l'île)
    const modes = {
      jardin: ile.croquis
        ? [["regarder", "Regarder"], ["planter", "Planter"], ["retirer", "Retirer"]]
        : [["regarder", "Regarder"], ["planter", "Planter"], ["arroser", "Arroser"], ["recolter", "Récolter"], ["retirer", "Retirer"]],
      chantier: [["amenager", "Aménager"], ["zones", "Soleil et sol"]].concat(ile.secrete ? [] : [["forme", "Forme de l’île"]]),
    };
    const mode = modes.chantier.some(([id]) => id === vue.outil) ? "chantier" : "jardin";
    const changerMode = (m) => { if (m !== mode) { vue.outil = modes[m][0][0]; dessinerOutils(); } };
    vue.outils.replaceChildren(
      H.el("div.modes-ile", { role: "tablist" }, [["jardin", "Jardin"], ["chantier", "Chantier"]].map(([m, nom]) =>
        H.el("button.mode-ile" + (m === mode ? ".actif" : ""), { type: "button", role: "tab", "aria-selected": String(m === mode), onclick: () => changerMode(m) }, nom))),
      H.el("div.rangee-outils", null, modes[mode].map(([id, nom]) =>
        H.el("button.bouton.petit.outil" + (vue.outil === id ? ".actif" : ""), { type: "button", "aria-pressed": String(vue.outil === id), onclick: () => { vue.outil = id; dessinerOutils(); } }, nom))));

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
          o.appendChild(H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: fenetreCaisse }, "Ta caisse et le sol"));
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
    } else if (vue.outil === "forme") {
      const mode = vue.formeMode || "ajouter";
      const modes = [["ajouter", "Pinceau : terre"], ["enlever", "Gomme : mer"], ["contour", "Tracer le contour"]].concat(vue.calque ? [["deplacer", "Déplacer le dessin"]] : []);
      for (const [id, nom] of modes) o.appendChild(H.el("button.bouton.petit" + (mode === id ? ".actif" : ""), { type: "button", onclick: () => { vue.formeMode = id; dessinerOutils(); } }, nom));
      if (mode === "ajouter" || mode === "enlever") for (const n of [1, 2, 3]) o.appendChild(H.el("button.bouton.petit.discret-bouton" + ((vue.pinceau || 1) === n ? ".actif" : ""), { type: "button", title: "Taille du pinceau", onclick: () => { vue.pinceau = n; dessinerOutils(); } }, ["fin", "moyen", "large"][n - 1]));
      if ((vue.formesAvant || []).length) o.appendChild(H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: annulerForme }, "Annuler"));
      o.appendChild(H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: importerCalque }, vue.calque ? "Changer de dessin" : "Importer un dessin à décalquer"));
      if (vue.calque) {
        o.appendChild(H.el("label.option", null, "Transparence ", H.el("input", { type: "range", min: 0.15, max: 0.9, step: 0.05, value: vue.calque.opacite, oninput: (e) => { vue.calque.opacite = +e.target.value; dessiner(); }, onchange: garderCalque })));
        o.appendChild(H.el("label.option", null, "Taille ", H.el("input", { type: "range", min: 2, max: Math.max(40, Math.max(ile.cols, ile.lignes) * 3), step: 0.5, value: vue.calque.l, oninput: (e) => { vue.calque.l = +e.target.value; dessiner(); }, onchange: garderCalque })));
        o.appendChild(H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: retirerCalque }, "Retirer le dessin"));
      }
      o.appendChild(H.el("span.cout", null, {
        ajouter: "Glisse le doigt pour peindre de la terre, même au-delà du bord : l’île s’agrandit d’elle-même",
        enlever: "Glisse le doigt pour rendre des cases à la mer (sauf là où poussent des plantes)",
        contour: "Fais le tour de la forme voulue d’un seul trait : à l’intérieur la terre, à l’extérieur la mer",
        deplacer: "Fais glisser le dessin pour le poser où il faut",
      }[mode]));
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

  // (cx, cy : le point de l'écran qui reste sous le pointeur ou entre les doigts ; sinon le milieu)
  function zoomer(sens, cx, cy) {
    const niveaux = [0.5, 0.75, 1, 1.5, 2];
    const i = niveaux.indexOf(vue.zoom), avant = vue.zoom;
    vue.zoom = niveaux[Math.max(0, Math.min(niveaux.length - 1, (i < 0 ? 2 : i) + sens))];
    if (vue.zoom === avant) return;
    const z = vue.zoneToile, rz = z && z.getBoundingClientRect(), rt = vue.toile.getBoundingClientRect();
    if (cx == null && rz) { cx = rz.left + rz.width / 2; cy = rz.top + rz.height / 2; }
    const fx = rt.width ? (cx - rt.left) / rt.width : 0.5, fy = rt.height ? (cy - rt.top) / rt.height : 0.5;
    H.d.majLocal((l) => (l.zoomTerrain = vue.zoom));
    dimensionner();
    peindreFond();
    dessiner();
    if (z) {
      z.scrollLeft = fx * vue.toile.offsetWidth - (cx - rz.left);
      z.scrollTop = fy * vue.toile.offsetHeight - (cy - rz.top);
    }
  }
  // la molette avec Ctrl (ou ⌘), et le pincement du pavé tactile (qui arrive comme une molette
  // avec Ctrl) : un cran de zoom par geste ; la molette seule fait toujours défiler l'île
  function brancherZoomGestes(zone) {
    let cumul = 0, dernier = 0;
    zone.addEventListener("wheel", (e) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      cumul += e.deltaY * (e.deltaMode === 1 ? 30 : 1);
      const t = performance.now();
      if (Math.abs(cumul) < 40 || t - dernier < 220) return;
      dernier = t;
      zoomer(cumul < 0 ? 1 : -1, e.clientX, e.clientY);
      cumul = 0;
    }, { passive: false });
    // deux doigts sur l'écran : on pince pour dézoomer, on écarte pour zoomer
    let pince = null;
    const ecart = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    zone.addEventListener("touchstart", (e) => { if (e.touches.length === 2) pince = { d: ecart(e.touches) }; }, { passive: true });
    zone.addEventListener("touchmove", (e) => {
      if (!pince || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const d = ecart(e.touches), q = d / pince.d;
      if (q > 1.3 || q < 0.77) {
        zoomer(q > 1 ? 1 : -1, (e.touches[0].clientX + e.touches[1].clientX) / 2, (e.touches[0].clientY + e.touches[1].clientY) / 2);
        pince.d = d;
      }
    }, { passive: false });
    zone.addEventListener("touchend", (e) => { if (e.touches.length < 2) pince = null; });
  }

  // L'île prend toute la place de l'écran : la zone descend jusqu'en bas de la fenêtre, et la toile
  // la remplit (du ciel ou de la mer en plus autour de l'île). On renvoie la largeur et la hauteur à
  // remplir (rien pour l'export, qui garde l'île seule avec sa petite bordure).
  function placeZone(w) {
    const z = vue.zoneToile;
    if (!z || vue.pourExport || !z.isConnected) return [0, 0];
    hauteurZone();
    // (la toile prend sa largeur d'abord : une barre de défilement en bas mange un peu de hauteur)
    vue.toile.style.width = w + "px";
    return [z.clientWidth, z.clientHeight];
  }
  // (la hauteur de la zone suit aussi ce qui change au-dessus : les options de l'outil)
  function hauteurZone() {
    const z = vue && vue.zoneToile;
    if (!z || !z.isConnected) return;
    const haut = z.getBoundingClientRect().top + window.scrollY;
    z.style.maxHeight = "none";
    z.style.height = Math.max(280, Math.round(window.innerHeight - haut - 14)) + "px";
  }
  let attenteTaille = 0;
  window.addEventListener("resize", () => {
    clearTimeout(attenteTaille);
    attenteTaille = setTimeout(() => { if (vue && vue.toile && vue.toile.isConnected) { dimensionner(); peindreFond(); dessiner(); } }, 200);
  });

  function dimensionner() {
    if (vue.iso) return dimensionnerIso();
    const ile = vue.ile;
    // (la toile remplit toute la zone d'affichage : l'île au milieu, de la mer autour)
    const [zw, zh] = placeZone((ile.cols + BORD * 2) * T * vue.zoom);
    const casesX = Math.max(ile.cols + BORD * 2, Math.ceil(zw / (T * vue.zoom))), casesY = Math.max(ile.lignes + BORD * 2, Math.floor(zh / (T * vue.zoom)));
    vue.bx = (casesX - ile.cols) / 2; vue.by = (casesY - ile.lignes) / 2;
    const w = casesX * T * vue.zoom, h = Math.max(casesY * T * vue.zoom, zh);
    const dpr = Math.min(window.devicePixelRatio || 1, 4096 / w, 4096 / h, 3);
    vue.dpr = dpr;
    vue.toile.width = Math.round(w * dpr);
    vue.toile.height = Math.round(h * dpr);
    vue.toile.style.width = w + "px";
    vue.toile.style.height = h + "px";
    vue.fond = H.aqua.toile(vue.toile.width, vue.toile.height);
  }

  // Le fond (mer, sable, tuiles) ne change que si l'on aménage.
  function peindreFond() {
    if (vue.iso) return peindreFondIso();
    const ile = vue.ile, ctx = vue.fond.getContext("2d"), r = H.alea(ile.id + "fond");
    const k = T * vue.zoom * vue.dpr;
    const saison = document.documentElement.dataset.saison || "printemps";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, vue.fond.width, vue.fond.height);
    ctx.fillStyle = "#8fc3dc";
    ctx.fillRect(0, 0, vue.fond.width, vue.fond.height);
    ctx.save();
    ctx.scale(k / T, k / T);
    const BX = vue.bx, BY = vue.by, W = ile.cols + BX * 2, Hh = ile.lignes + BY * 2;
    for (let i = 0; i < 18; i++) H.aqua.tache(ctx, r, r() * W * T, r() * Hh * T, 40 + r() * 80, 30 + r() * 60, i % 2 ? "#6aa9c9" : "#bfe0ec", { alpha: 0.05, couches: 8 });
    // la plage tout autour : d'un seul lavis pour une île rectangulaire ; pour une île de forme
    // libre, elle suit le bord, case par case (une bande de sable arrondie autour de chaque case de
    // terre, toutes fondues ensemble)
    const libre = !!(ile.vides && Object.keys(ile.vides).length);
    const terre = new Path2D();
    if (libre) {
      const plage = new Path2D();
      for (let y = 0; y < ile.lignes; y++) for (let x = 0; x < ile.cols; x++) {
        if (estVide(ile, x, y)) continue;
        plage.roundRect((BX + x - 0.6) * T, (BY + y - 0.6) * T, 2.2 * T, 2.2 * T, T * 0.6);
        terre.rect((BX + x) * T, (BY + y) * T, T, T);
      }
      ctx.fillStyle = "#ead6a6";
      ctx.globalAlpha = 0.9;
      ctx.fill(plage);
      ctx.globalAlpha = 1;
    } else {
      const sable = H.aqua.rectArrondi((BX - 0.6) * T, (BY - 0.6) * T, (ile.cols + 1.2) * T, (ile.lignes + 1.2) * T, T * 1.2, 8);
      H.aqua.lavis(ctx, r, sable, "#ead6a6", { alpha: 0.2, couches: 12, bord: 0.05 });
      terre.rect(BX * T, BY * T, ile.cols * T, ile.lignes * T);
    }
    // la terre nue de l'île : un seul grand lavis continu, sans damier
    const herbe = TEINTES_SAISON[saison] || "#9cc77a", terreNue = teintesSol(ile.sol).base;
    ctx.fillStyle = terreNue[0];
    ctx.fill(terre);
    ctx.save();
    ctx.clip(terre);
    const n = Math.ceil((ile.cols * ile.lignes) / 6);
    for (let i = 0; i < n; i++) {
      const x = (BX + r() * ile.cols) * T, y = (BY + r() * ile.lignes) * T;
      H.aqua.tache(ctx, r, x, y, T * (0.8 + r() * 1.6), T * (0.6 + r() * 1.2), terreNue[1 + (i % 3)], { alpha: 0.03, couches: 6 });
    }
    ctx.restore();
    ctx.restore();
    for (let y = 0; y < ile.lignes; y++) {
      for (let x = 0; x < ile.cols; x++) {
        const c = caseDe(ile, x, y);
        if (c.t === "vide" || c.t === "sol") continue;
        const tex = textureTuile(c.t, saison, H.hash(cle(x, y)) % 3);
        ctx.drawImage(tex, (x + BX) * k, (y + BY) * k, k + 0.5, k + 0.5);
      }
    }
    // quadrillage très fin, pour l'échelle (sur la terre seulement)
    ctx.save();
    ctx.scale(k / T, k / T);
    ctx.clip(terre);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.strokeStyle = "rgba(43,38,34,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= ile.cols; x++) {
      ctx.moveTo((x + BX) * k, BY * k);
      ctx.lineTo((x + BX) * k, (ile.lignes + BY) * k);
    }
    for (let y = 0; y <= ile.lignes; y++) {
      ctx.moveTo(BX * k, (y + BY) * k);
      ctx.lineTo((ile.cols + BX) * k, (y + BY) * k);
    }
    ctx.stroke();
    ctx.restore();
  }

  // --- la vue en relief (isométrique), comme la ferme -------------------------------
  // Une case est un losange ; l'île est un bloc dont on voit les deux tranches (terre et roche,
  // avec les racines des plantes du bord). Les plantes se dressent à leur vraie hauteur (les très
  // grands arbres un peu tassés pour tenir dans l'écran), et les couronnes des arbres sont un peu
  // transparentes : on voit ce qui pousse dessous.
  const HW = T * 0.62, QH = HW / 2, PROF = T * 0.9, MARGE = T * 0.8;
  const proj = (x, y) => [vue.ox + (x - y) * HW, vue.oy + (x + y) * QH];
  const versCase = (lx, ly) => { const u = (lx - vue.ox) / HW, w = (ly - vue.oy) / QH; return [(u + w) / 2, (w - u) / 2]; };
  function hauteurPx(p, ile, st) {
    // (les petites herbes un peu agrandies, pour qu'on reconnaisse leur port et leur famille)
    const m = hauteurM(p), eff = m <= 2 ? 0.5 + m * 0.75 : 2 + (m - 2) * 0.35;
    const parMetre = ((2 * HW) / ile.caseM) * 0.55;
    const h = Math.min(6 * T, Math.max(5, eff * parMetre));
    return h * [0.12, 0.25, 0.6, 1][st];
  }
  // la largeur du feuillage : d'après l'espacement de plantation, mais jamais beaucoup plus large
  // que la plante n'est haute (sinon les arbres deviennent des parasols géants)
  function largeurPx(p, ile, st) {
    const base = Math.max(5, rayonPlante(p, ile) * 2 * HW * 0.9);
    return Math.min(base, Math.max(6, hauteurPx(p, ile, 3) * 0.9)) * [0.3, 0.35, 0.65, 1][st];
  }
  const FEUILLES_PIX = ["#4aa63e", "#6cbd5c", "#3f8a42", "#2f6b35", "#7aa64a"];
  const FLEURS_ISO = ["#e9e4f5", "#f2c94c", "#b48ad8", "#f08a9b", "#ffffff", "#f5a742", "#7aa6e0"];
  const assombrir = (hex, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
  // Le dessin debout d'une plante : { pied, couronne? } (la couronne des arbres à part, pour la
  // dessiner après tout le reste, en transparence). L'origine est le pied, en bas au milieu.
  // (fin : combien de pixels du dessin par pixel de l'île ; à 2 ou 3, les feuilles et les fleurs
  // selon la famille botanique se distinguent bien mieux. Les mesures rendues restent en pixels de l'île)
  function planteDebout(p, ile, st, fleur, fin) {
    fin = fin || 1;
    const d = planteDeboutFin(p, ile, st, fleur, fin);
    return fin === 1 ? d : Object.assign({}, d, { l: d.l / fin, h: d.h / fin, haut: d.haut / fin, fin });
  }
  function planteDeboutFin(p, ile, st, fleur, fin) {
    const h = Math.round(hauteurPx(p, ile, st) * fin), w = Math.round(largeurPx(p, ile, st) * fin), v = p.valeurs || {};
    // (debout, chaque plante prend toujours son dessin botanique automatique : les modèles en volume
    // dessinés de face et de côté ne servent plus ; la vue de dessus reste pour la vue d'oiseau)
    const saison = H.feuillage ? H.feuillage(p.id) : null;
    return memo("iso|" + p.id + "|" + st + "|" + (fleur ? 1 : 0) + "|" + h + "|" + w + "|" + (saison ? saison.cle : ""), () => {
      const L = w + 6, Hh = h + 6, toile = (lw, lh) => { const c = document.createElement("canvas"); c.width = lw; c.height = lh; return c; };
      const pied = toile(L, Hh), g = pied.getContext("2d"), cx = Math.floor(L / 2), sol = Hh - 2;
      const R = (gg, x, y, ww, hh, col) => { gg.fillStyle = col; gg.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(ww)), Math.max(1, Math.round(hh))); };
      const feuille = FEUILLES_PIX[H.hash(p.id) % FEUILLES_PIX.length], sombre = assombrir(feuille, 0.7), clair = assombrir(feuille, 1.18).replace(/#(..)(..)(..)/, (m0, a, b, c) => "#" + [a, b, c].map((x) => Math.min(255, parseInt(x, 16)).toString(16).padStart(2, "0")).join(""));
      const fleurCol = FLEURS_ISO[H.hash(p.id) % FLEURS_ISO.length], r = H.alea(p.id + "|iso|" + st);
      const res = { pied, couronne: null, l: L, h: Hh, haut: h };
      if (st === 0) { R(g, cx - 3, sol - 1, 6, 2, "#6b4423"); R(g, cx, sol - 2, 1, 1, "#4f7a3a"); return res; }
      // Un feuillage en grappes : une masse sombre, puis des bouquets de feuilles posés dessus,
      // chacun éclairé en haut à gauche, avec des feuilles claires sur le dessus et des trous
      // d'ombre entre eux (comme les arbres du pixel art détaillé).
      const tresSombre = assombrir(feuille, 0.5);
      const masse = (gg, x0, y0, rx, ry) => {
        const dans = (x, y) => (x * x) / (rx * rx + 0.01) + (y * y) / (ry * ry + 0.01);
        for (let y = -ry; y <= ry; y++) for (let x = -rx; x <= rx; x++) if (dans(x, y) <= 1 - r() * 0.1) R(gg, x0 + x, y0 + y, 1, 1, dans(x, y) > 0.75 ? tresSombre : sombre);
        const n = Math.max(3, Math.min(16, Math.round((rx * ry) / 18)));
        for (let k = 0; k < n; k++) {
          const a2 = r() * Math.PI * 2, dd = Math.sqrt(r()) * 0.7, bx = Math.round(Math.cos(a2) * rx * dd), by = Math.round(Math.sin(a2) * ry * dd - ry * 0.1);
          const br = Math.max(2, Math.round(Math.min(rx, ry) * (0.35 + r() * 0.2)));
          for (let y = -br; y <= br; y++) for (let x = -br; x <= br; x++) {
            const d = (x * x + y * y) / (br * br + 0.01);
            if (d > 1 - r() * 0.2 || dans(bx + x, by + y) > 1) continue;
            const lum = (-x - y) / br + (r() - 0.5) * 0.5;
            R(gg, x0 + bx + x, y0 + by + y, 1, 1, lum > 0.75 ? clair : lum < -0.55 ? sombre : feuille);
          }
        }
        // quelques feuilles qui dépassent du bord
        for (let k = 0; k < (rx + ry) / 2; k++) { const a2 = r() * Math.PI * 2; R(gg, x0 + Math.round(Math.cos(a2) * (rx + 1)), y0 + Math.round(Math.sin(a2) * (ry + 1)), 1, 1, r() < 0.5 ? feuille : sombre); }
      };
      const cycle = v.cycle, hm = hauteurM(p);
      // les arbres et les arbustes, dessinés selon leur famille dès qu'on a assez de pixels pour ça
      if (h >= 20 && dessinLigneux(p)) {
        const fe = toile(L, Hh), gf = fe.getContext("2d");
        ligneux(p, v, g, gf, cx, sol, w, h, { feuille, sombre, clair, tresSombre, fleurCol }, fleur && st >= 2, r, saison);
        appliquerSaison(fe, saison, p.id);
        // (le feuillage reste opaque, avec le reste du dessin : transparent, il disparaissait)
        g.drawImage(fe, 0, 0);
        return res;
      }
      if (cycle === "Arbre" || (cycle === "Arbuste" && hm >= 2.5)) {
        // le tronc, puis la couronne sur une toile à part
        const tw = Math.max(2, Math.round(w * 0.09)), ht = Math.round(h * 0.42);
        // le tronc, son écorce et deux branches qui partent vers la couronne
        R(g, cx - tw / 2, sol - ht, tw, ht, "#7a4520"); R(g, cx - tw / 2, sol - ht, 1, ht, "#9a6a3c"); R(g, cx + tw / 2 - 1, sol - ht, 1, ht, "#4b3427");
        for (let y = 2; y < ht; y += 3) R(g, cx - tw / 2 + 1 + (y % 2), sol - y, 1, 1, "#4b3427");
        R(g, cx - tw / 2 - 1, sol, tw + 2, 1, "#4b3427");
        for (const sens of [-1, 1]) for (let q = 0; q < Math.max(3, w * 0.2); q++) R(g, cx + sens * (tw / 2 + q * 0.8), sol - ht - q, 1, 1, "#7a4520");
        // en automne, des feuilles tombées dans l'herbe, au pied
        if (saison && saison.automne > 0.4 && st >= 2) for (let k = 0; k < Math.max(4, w / 2); k++) R(g, cx + (r() - 0.5) * w * 1.1, sol - r() * 2, 1, 1, r() < 0.6 ? saison.couleur : "#c99a3a");
        if (st >= 2) {
          const couronne = toile(L, Hh), gc = couronne.getContext("2d"), rx = Math.max(2, Math.floor(w / 2)), ry = Math.max(2, Math.floor((h - ht) * 0.55));
          // quand les feuilles se font rares, on voit les branches nues
          if (saison && saison.densite < 0.95) branchesNues(gc, cx, sol - ht, rx, h - ht, r);
          if (!saison || saison.densite > 0) {
            const feuilles = toile(L, Hh), gf = feuilles.getContext("2d");
            masse(gf, cx, sol - ht - (h - ht) * 0.45, rx, ry);
            if (fleur && (!saison || saison.densite >= 1)) for (let k = 0; k < Math.max(3, w / 4); k++) R(gf, cx + (r() - 0.5) * w * 0.8, sol - ht - (h - ht) * (0.2 + r() * 0.6), 1, 1, fleurCol);
            appliquerSaison(feuilles, saison, p.id);
            gc.drawImage(feuilles, 0, 0);
          }
          res.couronne = couronne;
        }
        return res;
      }
      if (cycle === "Arbuste" && hm < 1.3 && ["Lamiaceae", "Verbenaceae", "Hypericaceae", "Asteraceae"].includes(v.famille)) {
        plantePortrait(g, cx, sol, w, h, v.famille, { feuille, sombre, clair, fleurCol }, fleur && st === 3, st, r, saison, p.id, true);
        return res;
      }
      if (cycle === "Arbuste") {
        // (un arbuste à feuilles caduques montre ses rameaux quand il se dégarnit)
        if (saison && saison.densite < 0.95) for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; for (let s = 0; s < h * 0.85; s += 1) R(g, cx + Math.cos(a) * s * 0.6, sol - Math.sin(-a) * s, 1, 1, s < h * 0.4 ? "#7a4520" : "#9a6a3c"); }
        if (!saison || saison.densite > 0) {
          const feuilles = toile(L, Hh), gf = feuilles.getContext("2d");
          masse(gf, cx, sol - h / 2, Math.max(2, Math.floor(w / 2)), Math.max(2, Math.floor(h / 2)));
          if (fleur && (!saison || saison.densite >= 1)) for (let k = 0; k < Math.max(3, w / 3); k++) R(gf, cx + (r() - 0.5) * w * 0.8, sol - h * (0.2 + r() * 0.75), 1, 1, fleurCol);
          appliquerSaison(feuilles, saison, p.id);
          g.drawImage(feuilles, 0, 0);
        }
        return res;
      }
      if (cycle === "Liane") {
        R(g, cx, sol - h, 1, h, "#9a6a3c");
        for (let y = 0; y < h; y += 2) {
          if (saison && r() > saison.densite) continue;
          const automne = saison && r() < saison.automne;
          R(g, cx + (y % 4 ? 1 : -2), sol - y, 2, 1, automne ? saison.couleur : y % 6 ? feuille : sombre);
        }
        if (fleur && (!saison || saison.densite >= 1)) for (let y = 4; y < h; y += 7) R(g, cx + 2, sol - y, 1, 1, fleurCol);
        return res;
      }
      // les herbes : dessinées selon leur famille botanique (voir plantePortrait)
      plantePortrait(g, cx, sol, w, h, v.famille, { feuille, sombre, clair, fleurCol }, fleur && st === 3, st, r, saison, p.id);
      return res;
    });
  }

  // --- les arbres et les arbustes, selon leur famille -------------------------------------------
  // Pas une boule : chaque famille a son architecture (un tronc et des charpentières qui se
  // divisent, plusieurs tiges qui partent du pied, des tiges dressées, des cannes arquées, un
  // coussin bas, des étages de conifère, une colonne), sa forme de feuille (aiguilles, écailles,
  // feuilles composées pennées ou palmées, lobées, en éventail, lancéolées, dentées…) et ses
  // fleurs ou ses fruits (chatons, cônes, chandelles, corymbes, figues, noix, oranges…).
  // (les petits sous-arbrisseaux, thym, lavande, hysope…, gardent le dessin des herbes de leur famille)
  const dessinLigneux = (p) => { const v = p.valeurs || {}; return (v.cycle === "Arbre" || v.cycle === "Arbuste") && !(v.cycle === "Arbuste" && hauteurM(p) < 1.3 && ["Lamiaceae", "Verbenaceae", "Hypericaceae", "Asteraceae"].includes(v.famille)); };
  const BOIS = {
    Pinaceae: ["cone", "aiguilles", "cones"], Cupressaceae: ["colonne", "ecailles", "baies"],
    Lamiaceae: ["dresse", "lineaires", "verticilles"], Verbenaceae: ["dresse", "lanceolees", "epis"],
    Rosaceae: ["arque", "dentees", "cinq"], Ericaceae: ["coussin", "petites", "clochettes"],
    Betulaceae: ["ovale", "dentees", "chatons"], Salicaceae: ["pleureur", "lanceolees", "chatons"],
    Fagaceae: ["rond", "dentees", "bogues"], Juglandaceae: ["etale", "pennees", "noix"],
    Oleaceae: ["etale", "argent", "olives"], Moraceae: ["etale", "lobees", "figues"],
    Myrtaceae: ["ovale", "lanceolees", "etamines"], Lauraceae: ["ovale", "lanceolees", "jaunes"],
    Hippocastanaceae: ["rond", "palmees", "chandelles"], Malvaceae: ["ovale", "cordees", "bractees"],
    Rutaceae: ["boule", "ovales", "oranges"], Ginkgoaceae: ["ovale", "eventail", null],
    Anacardiaceae: ["boule", "pennees", "baiesRouges"], Adoxaceae: ["multitige", "pennees", "corymbes"],
    Cornaceae: ["multitige", "ovales", "corymbes"], Grossulariaceae: ["multitige", "lobees", "grappes"],
    Araliaceae: ["multitige", "palmees", "ombelles"], Asparagaceae: ["touffe", "cladodes", "baiesRouges"],
    Theaceae: ["boule", "ovales", "cinq"],
  };
  // les espèces qui ne ressemblent pas au reste de leur famille
  const BOIS_ESPECES = [
    [/^pin /i, { forme: "pin" }], [/c[eè]dre/i, { forme: "etages" }], [/sapin/i, { forme: "cone" }],
    [/bouleau/i, { forme: "pleureur", ecorce: "blanche" }], [/aulne/i, { forme: "ovale" }], [/noisetier/i, { forme: "multitige" }],
    [/genevrier|genévrier/i, { forme: "sauvage", feuille: "aiguilles", repro: "baies", ecorce: "genevrier", vert: ["#7aa64a", "#b4cf6a", "#4f7a3a", "#2f5034"] }], [/amandier/i, { forme: "etale", repro: "cinq", fleur: "#f6cfe0" }],
    [/aub[eé]pine/i, { forme: "boule", repro: "corymbes" }], [/eucalyptus/i, { forme: "ovale", ecorce: "claire", feuille: "argent" }],
    [/fr[eê]ne/i, { forme: "ovale", feuille: "pennees", repro: null }], [/figuier/i, { ecorce: "lisse" }], [/m[uû]rier/i, { forme: "boule", feuille: "cordees", repro: "mures" }],
    [/giroflier/i, { forme: "cone", feuille: "lanceolees", repro: "jaunes" }], [/cannelier/i, { forme: "ovale" }],
    [/ch[aâ]taignier/i, { forme: "rond", feuille: "lanceolees" }], [/myrte\b/i, { forme: "boule", feuille: "petites" }],
    [/olivier/i, { ecorce: "noueuse" }], [/saule/i, { forme: "pleureur" }],
  ];
  const TOUFFUS = ["rond", "etale", "ovale", "boule", "pleureur", "pin", "multitige", "coussin"];
  const TOUFFE = { Moraceae: 0.13, Hippocastanaceae: 0.13, Juglandaceae: 0.1, Fagaceae: 0.09, Malvaceae: 0.1, Oleaceae: 0.075, Betulaceae: 0.055, Salicaceae: 0.06, Myrtaceae: 0.065, Lauraceae: 0.075, Rutaceae: 0.1, Ginkgoaceae: 0.065, Anacardiaceae: 0.07, Rosaceae: 0.07, Theaceae: 0.08, Grossulariaceae: 0.09, Cornaceae: 0.08, Adoxaceae: 0.08, Araliaceae: 0.1, Ericaceae: 0.07 };
  // le vert de chaque famille (clair, moyen, sombre, très sombre), pour que les arbres ne se ressemblent pas
  const VERTS_FAMILLE = {
    Pinaceae: ["#2f6b4f", "#5a9a6a", "#1e4a3a", "#143326"], Cupressaceae: ["#2f5a34", "#4f7a3a", "#1e3d25", "#132a1c"],
    Oleaceae: ["#7ea48c", "#a9c8b4", "#4f7a66", "#35584c"], Moraceae: ["#4aa63e", "#7cc860", "#2f7a35", "#1e5228"],
    Juglandaceae: ["#7aa64a", "#a8c860", "#4f7a3a", "#33552a"], Fagaceae: ["#3f7a3a", "#6a9a4a", "#2a5a30", "#1a3d22"],
    Hippocastanaceae: ["#2f7a3e", "#5aa64a", "#1e5a30", "#143d22"], Malvaceae: ["#6cbd5c", "#a0d878", "#3f8a42", "#2a6033"],
    Betulaceae: ["#8ab84a", "#c0dc70", "#5a8a3a", "#3a6030"], Salicaceae: ["#8fae7a", "#c0d4a0", "#5f7f5a", "#3f5a42"],
    Myrtaceae: ["#6a9a8a", "#9cc4b0", "#456e60", "#2e4c44"], Lauraceae: ["#2f6b35", "#5a9a4a", "#1e4a28", "#13331c"],
    Rutaceae: ["#2f7a35", "#5aa64a", "#1e5228", "#133a1c"], Ginkgoaceae: ["#9cc77a", "#d0e89a", "#6a9a4a", "#466a34"],
    Anacardiaceae: ["#3f6b3a", "#6a8f4a", "#2a4a2a", "#1a321e"], Rosaceae: ["#4f9a46", "#86c060", "#2f6b35", "#1e4a28"],
    Ericaceae: ["#3f7a4a", "#6aa060", "#2a5a3a", "#1a3d28"], Adoxaceae: ["#5a9a46", "#8cc060", "#3a7035", "#264d26"],
  };
  const ECORCES = { brune: ["#7a4520", "#9a6a3c", "#4b3427"], blanche: ["#f3f0dc", "#ffffff", "#23214a"], claire: ["#d9c29a", "#efe0bc", "#9a7a52"], lisse: ["#8f8cb8", "#b4b2d6", "#5a5888"], noueuse: ["#6b5a3a", "#8f7a50", "#3e3324"], genevrier: ["#b8a07e", "#ddd0b4", "#6b5440"] };
  function ligneux(p, v, g, gf, cx, sol, w, h, C, fleurit, r, saison) {
    let [forme, feuille, repro] = BOIS[v.famille] || ["ovale", "ovales", null];
    let ecorce = "brune", fleurCol = C.fleurCol;
    for (const [motif, o] of BOIS_ESPECES) if (motif.test(p.nom || "")) {
      if (o.vert) C = Object.assign({}, C, { vert: o.vert });
      if (o.forme) forme = o.forme; if (o.feuille) feuille = o.feuille; if ("repro" in o) repro = o.repro; if (o.ecorce) ecorce = o.ecorce; if (o.fleur) fleurCol = o.fleur;
      break;
    }
    if (v.cycle === "Arbuste" && ["rond", "etale", "ovale", "boule", "pleureur"].includes(forme) && hauteurM(p) < 4) forme = forme === "pleureur" ? "multitige" : forme === "boule" ? "boule" : "multitige";
    const vf = C.vert || VERTS_FAMILLE[v.famille];
    if (vf) C = Object.assign({}, C, { feuille: vf[0], clair: vf[1], sombre: vf[2], tresSombre: vf[3] });
    const [eB, eC, eS] = ECORCES[ecorce] || ECORCES.brune;
    const P = (gg, x, y, col) => { gg.fillStyle = col; gg.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const trait = (gg, x0, y0, x1, y1, ep, col, colC) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
      for (let s = 0; s <= n; s++) {
        const x = x0 + ((x1 - x0) * s) / n, y = y0 + ((y1 - y0) * s) / n;
        for (let e = 0; e < ep; e++) P(gg, x - Math.floor(ep / 2) + e, y, e === 0 && colC && ep > 1 ? colC : e === ep - 1 && ep > 2 ? eS : col);
      }
    };
    // le centre de la couronne, pour éclairer chaque feuille en haut à gauche
    let ccx = cx, ccy = sol - h / 2, crx = w / 2, cry = h / 2;
    const ton = (x, y, k) => { const l = (-(x - ccx) / (crx + 1) - (y - ccy) / (cry + 1)) * 0.6 + (r() - 0.5) * 0.7 + (k || 0); return l > 0.55 ? C.clair : l < -0.6 ? C.tresSombre : l < -0.15 ? C.sombre : C.feuille; };
    const argent = (c) => c === C.clair ? "#a9c8b4" : c === C.feuille ? "#7ea48c" : c === C.sombre ? "#4f7a66" : "#35584c";
    // une feuille (ou une petite grappe d'aiguilles) posée en x, y ; a : la direction du rameau
    function poserFeuille(x, y, a) {
      const c = ton(x, y), cs = (k) => (feuille === "argent" ? argent(k) : k);
      switch (feuille) {
        case "aiguilles": for (let k = -2; k <= 2; k++) { const b = a + k * 0.38; for (let s = 1; s <= 3; s++) P(gf, x + Math.cos(b) * s, y + Math.sin(b) * s, s === 3 ? ton(x, y, 0.4) : c); } break;
        case "ecailles": for (let k = 0; k < 6; k++) P(gf, x + Math.round((r() - 0.5) * 3), y + Math.round((r() - 0.5) * 3), k < 2 ? ton(x, y, 0.5) : c); break;
        case "lineaires": for (const s of [-1, 1]) { const b = a + s * 0.75; P(gf, x + Math.cos(b), y + Math.sin(b), c); P(gf, x + Math.cos(b) * 2, y + Math.sin(b) * 2, s < 0 ? C.clair : c); } break;
        case "petites": P(gf, x, y, c); P(gf, x + 1, y, ton(x, y)); P(gf, x, y + 1, C.sombre); break;
        case "cladodes": P(gf, x, y, c); P(gf, x + Math.cos(a + 0.6) * 1.5, y + Math.sin(a + 0.6) * 1.5, c); break;
        case "eventail": for (let k = -1; k <= 1; k++) { P(gf, x + k, y - 2, ton(x, y, 0.3)); P(gf, x + k, y - 1, c); } P(gf, x, y, C.sombre); break;
        case "palmees": for (let k = -2; k <= 2; k++) { const b = Math.PI / 2 + k * 0.62; for (let s = 1; s <= 3; s++) P(gf, x + Math.cos(b) * s, y + Math.sin(b) * s * 0.8, s === 1 ? C.sombre : k < 0 ? ton(x, y, 0.3) : c); } break;
        case "pennees": {
          const b = a + (r() - 0.5) * 0.6, n = 4;
          for (let s = 0; s <= n * 1.6; s++) P(gf, x + Math.cos(b) * s, y + Math.sin(b) * s, C.sombre);
          for (let k = 1; k <= n; k++) for (const sg of [-1, 1]) { const px = x + Math.cos(b) * k * 1.6, py = y + Math.sin(b) * k * 1.6, bb = b + sg * 1.2; P(gf, px + Math.cos(bb), py + Math.sin(bb), sg < 0 ? ton(px, py, 0.3) : c); P(gf, px + Math.cos(bb) * 2, py + Math.sin(bb) * 2, c); }
          break;
        }
        case "lobees": for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) { if (Math.abs(xx) + Math.abs(yy) > 3 || (yy === -1 && Math.abs(xx) === 1) || (yy === 1 && Math.abs(xx) === 2)) continue; P(gf, x + xx, y + yy, xx + yy < -1 ? ton(x, y, 0.4) : xx + yy > 1 ? C.sombre : c); } break;
        case "cordees": for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) { if (yy === -1 && xx === 0) continue; P(gf, x + xx, y + yy, xx + yy < 0 ? ton(x, y, 0.4) : c); } P(gf, x, y + 2, C.sombre); break;
        case "dentees": for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) { if (r() < 0.18 && (xx || yy)) continue; P(gf, x + xx, y + yy, xx + yy < 0 ? ton(x, y, 0.4) : xx + yy > 0 ? C.sombre : c); } break;
        case "lanceolees": case "argent": {
          const b = a + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5) + 0.5;
          for (let s = 0; s < 5; s++) { const px = x + Math.cos(b) * s, py = y + Math.sin(b) * s; P(gf, px, py, cs(s < 2 ? ton(x, y, 0.3) : c)); if (s === 2) P(gf, px, py + 1, cs(C.sombre)); }
          break;
        }
        default: for (let yy = 0; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) P(gf, x + xx, y + yy, yy === 0 && xx < 1 ? ton(x, y, 0.4) : c);
      }
    }
    // une fleur ou un fruit, au bout d'un rameau
    function poserRepro(x, y) {
      switch (repro) {
        case "chatons": for (let s = 1; s <= 3; s++) P(gf, x, y + s, s === 3 ? "#9a7a3a" : "#d9c26a"); break;
        case "cones": P(gf, x, y, "#7a4520"); P(gf, x + 1, y, "#9a6a3c"); P(gf, x, y + 1, "#4b3427"); P(gf, x + 1, y + 1, "#7a4520"); break;
        case "baies": P(gf, x, y, "#3d4a8a"); P(gf, x + 1, y, "#a8b8e0"); P(gf, x, y + 1, "#5a6ab8"); break;
        case "baiesRouges": P(gf, x, y, "#c93f4e"); P(gf, x + 1, y, "#e9606a"); break;
        case "mures": P(gf, x, y, "#3a1a3a"); P(gf, x, y + 1, "#5a2a5a"); break;
        case "cinq": P(gf, x, y, "#f2c94c"); for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) P(gf, x + dx, y + dy, fleurCol); break;
        case "corymbes": for (let k = -2; k <= 2; k++) { P(gf, x + k, y - 1 + Math.abs(k) * 0.3, "#fbf6e0"); if (Math.abs(k) < 2) P(gf, x + k, y - 2, "#ffffff"); } break;
        case "chandelles": for (let s = 0; s < 4; s++) { P(gf, x, y - s, s === 1 ? "#f08a9b" : "#fbf6e0"); if (s < 2) P(gf, x + 1, y - s, "#f3ead0"); } break;
        case "clochettes": P(gf, x, y + 1, "#f3c6d6"); P(gf, x + 1, y + 2, "#e9a6be"); break;
        case "figues": P(gf, x, y, "#6a4a8a"); P(gf, x, y + 1, "#4a3270"); break;
        case "olives": P(gf, x, y + 1, "#3a3a5a"); break;
        case "noix": P(gf, x, y, "#7aa64a"); P(gf, x + 1, y, "#9cc77a"); P(gf, x, y + 1, "#4f7a3a"); break;
        case "oranges": P(gf, x, y, "#f5a742"); P(gf, x + 1, y, "#ffc76a"); P(gf, x, y + 1, "#d9822a"); P(gf, x + 1, y + 1, "#f5a742"); break;
        case "bogues": P(gf, x, y, "#c9d96a"); P(gf, x + 1, y, "#a8b84a"); P(gf, x, y - 1, "#e3ea8a"); break;
        case "etamines": for (const [dx, dy] of [[0, 0], [-1, 0], [1, 0], [0, -1]]) P(gf, x + dx, y + dy, dx || dy ? "#fbf6e0" : "#f2c94c"); break;
        case "jaunes": P(gf, x, y, "#f2d94c"); P(gf, x + 1, y + 1, "#e9c23a"); break;
        case "bractees": P(gf, x, y + 1, "#e3ea9a"); P(gf, x + 1, y + 2, "#f2e98a"); break;
        case "grappes": for (let s = 1; s <= 3; s++) P(gf, x + (s % 2), y + s, "#3a2a5a"); break;
        case "ombelles": for (let k = -1; k <= 1; k++) P(gf, x + k, y - 1, "#3a2a5a"); P(gf, x, y - 2, "#5a4a8a"); break;
        case "verticilles": case "epis": P(gf, x, y, fleurCol); P(gf, x + 1, y - 1, fleurCol); break;
        default: P(gf, x, y, fleurCol);
      }
    }
    const pointes = [], long = [];
    // Les rameaux ne partent pas tous du même point : ils s'insèrent le long de leur axe, à des
    // hauteurs différentes, un d'un côté puis un de l'autre (feuilles alternes : la plupart des
    // familles), ou deux par deux face à face (feuilles opposées : frêne, olivier, marronnier,
    // sureau, cornouiller, romarin…) ; l'axe, lui, continue au-delà.
    const opposees = ["Oleaceae", "Hippocastanaceae", "Adoxaceae", "Cornaceae", "Lamiaceae", "Verbenaceae", "Caprifoliaceae"].includes(v.famille);
    function branche(x, y, a, l, ep, n, ecart) {
      let x1 = x + Math.cos(a) * l, y1 = y + Math.sin(a) * l;
      // (on reste dans la couronne)
      const d = ((x1 - ccx) / (crx + 0.5)) ** 2 + ((y1 - ccy) / (cry + 0.5)) ** 2;
      if (d > 1) { const k = (0.78 + r() * 0.22) / Math.sqrt(d); x1 = ccx + (x1 - ccx) * k; y1 = ccy + (y1 - ccy) * k; }
      trait(g, x, y, x1, y1, Math.max(1, Math.round(ep)), eB, eC);
      if (n <= 0) { pointes.push([x1, y1, a]); long.push([x, y, x1, y1, a]); return; }
      if (n <= 1) long.push([x, y, x1, y1, a]);
      let cote = r() < 0.5 ? -1 : 1;
      for (const t of opposees ? [0.4, 0.72] : [0.3, 0.52, 0.74]) {
        const bx = x + (x1 - x) * (t + (r() - 0.5) * 0.08), by = y + (y1 - y) * (t + (r() - 0.5) * 0.08);
        for (const sd of opposees ? [-1, 1] : [cote]) branche(bx, by, a + sd * ecart * (0.85 + r() * 0.35), l * (0.5 + 0.2 * (1 - t)) * (0.85 + r() * 0.3), Math.max(1, ep * 0.55), n - 1, ecart * 0.9);
        cote = -cote;
      }
      branche(x1, y1, a + (r() - 0.5) * 0.3, l * (0.5 + r() * 0.15), Math.max(1, ep * 0.7), n - 1, ecart * 0.9);
    }
    const tronc = (ht, ep) => {
      for (let y = 0; y < ht; y++) { const dx = forme === "pin" || ecorce === "noueuse" ? Math.round(Math.sin(y / 9) * 1.2) : 0; trait(g, cx - ep / 2 + dx, sol - y, cx + ep / 2 - 1 + dx, sol - y, 1, eB); P(g, cx - ep / 2 + dx, sol - y, eC); P(g, cx + ep / 2 - 1 + dx, sol - y, eS); }
      // l'écorce : les marques du bouleau, les fissures des autres
      for (let y = 2; y < ht; y += ecorce === "blanche" ? 4 : 3) P(g, cx - ep / 2 + 1 + Math.floor(r() * Math.max(1, ep - 2)), sol - y, eS);
      trait(g, cx - ep / 2 - 1, sol, cx + ep / 2, sol, 1, eS);
    };
    const n = Math.max(2, Math.min(4, Math.round(Math.log2(h / 6))));
    const ep0 = Math.max(2, Math.round(w * 0.08));
    if (["rond", "etale", "ovale", "boule", "pleureur", "pin"].includes(forme)) {
      const fr = { rond: 0.38, etale: 0.36, ovale: 0.3, boule: 0.22, pleureur: 0.3, pin: 0.62 }[forme], ht = Math.round(h * fr);
      cry = (h - ht) / 2 + 1; ccy = sol - ht - cry + 2; crx = w / 2;
      if (forme === "ovale") crx = w * 0.42;
      if (forme === "pin") { cry = (h - ht) * 0.45; ccy = sol - h + cry; }
      tronc(ht, ep0);
      const nn = Math.min(3, n), ecart = { rond: 0.8, etale: 0.95, ovale: 0.55, boule: 0.9, pleureur: 0.75, pin: 1.2 }[forme];
      if (forme === "etale" || forme === "boule") {
        // le tronc se divise bas en deux ou trois grosses charpentières, à des hauteurs un peu différentes
        const k = 2 + (r() < 0.5 ? 1 : 0);
        for (let i = 0; i < k; i++) {
          const u = k > 1 ? i / (k - 1) - 0.5 : 0, y0 = sol - ht + 1 - Math.round(i * (h - ht) * 0.08);
          trait(g, cx, sol - ht + 1, cx, y0, Math.max(1, Math.round(ep0 * 0.8)), eB, eC);
          branche(cx, y0, -Math.PI / 2 + u * (forme === "etale" ? 1.5 : 1.2) + (r() - 0.5) * 0.15, (h - ht) * 0.62, ep0 * 0.75, nn, ecart * 0.8);
        }
      } else {
        // un axe qui monte presque jusqu'en haut, et les branches insérées tout le long
        branche(cx, sol - ht + 1, -Math.PI / 2 + (r() - 0.5) * 0.1, (h - ht) * (forme === "pin" ? 0.7 : 0.82), ep0 * 0.8, nn, ecart);
      }
    } else if (forme === "multitige" || forme === "dresse" || forme === "touffe") {
      const k = forme === "dresse" ? Math.max(9, Math.round(w / 2.5)) : forme === "touffe" ? Math.max(10, Math.round(w / 2.2)) : Math.max(4, Math.round(w / 7));
      ccy = sol - h / 2; cry = h / 2; crx = w / 2;
      for (let i = 0; i < k; i++) {
        const u = k > 1 ? i / (k - 1) - 0.5 : 0, a = -Math.PI / 2 + u * (forme === "multitige" ? 1.1 : 0.8) + (r() - 0.5) * 0.15;
        const l = h * (forme === "multitige" ? 0.55 : 0.9) * (0.75 + r() * 0.3) * (1 - Math.abs(u) * 0.35);
        if (forme === "multitige") branche(cx + u * 4, sol, a, l, Math.max(1, ep0 * 0.6), Math.max(1, n - 1), 0.5);
        else {
          // une tige droite, à peine courbée, couverte de feuilles du pied jusqu'au bout
          let x = cx + u * 3, y = sol, aa = a;
          for (let s = 0; s < l; s++) { P(g, x, y, s < l * 0.3 ? eB : C.sombre); if (s > l * 0.15 && s % 2 === 0) long.push([x, y, x, y, aa]); x += Math.cos(aa); y += Math.sin(aa); aa += u * 0.004; }
          pointes.push([x, y, aa]);
        }
      }
    } else if (forme === "sauvage") {
      // Le genévrier commun dans la nature : plusieurs troncs tordus et clairs qui partent du pied
      // en s'écartant, chacun portant sa propre flèche étroite et ébouriffée, de hauteurs inégales,
      // faite de rameaux courts hérissés d'aiguilles piquantes qui pointent vers le haut.
      ccy = sol - h / 2; cry = h / 2 + 2; crx = w / 2;
      const k = 3 + Math.floor(r() * 3), plusHaut = Math.floor(r() * k);
      for (let i = 0; i < k; i++) {
        const u = k > 1 ? i / (k - 1) - 0.5 : 0, penche = u * 0.45 + (r() - 0.5) * 0.2, hi = h * (i === plusHaut ? 0.97 : 0.5 + r() * 0.4);
        let x = cx + u * 4, y = sol;
        const lmax = w * (0.14 + r() * 0.1);
        for (let s = 0; s < hi; s++) {
          const t = s / hi, a = -Math.PI / 2 + penche * (1 - t * 0.5) + Math.sin(s / 5 + i) * 0.12;
          x += Math.cos(a); y += Math.sin(a);
          // le tronc clair et tordu, bien visible en bas
          if (t < 0.45) { P(g, x, y, eB); P(g, x - 1, y, eC); if (t < 0.25) P(g, x + 1, y, eS); }
          else P(g, x, y, C.sombre);
          // des rameaux courts et ébouriffés, plus longs vers le milieu de la flèche, qui montent
          if (t > 0.18 && s % 3 === 0) {
            const larg = lmax * Math.sin(Math.PI * Math.min(1, (t - 0.18) / 0.82)) * (0.5 + r() * 0.8) + 1;
            for (const sd of [-1, 1]) {
              if (r() < 0.25) continue;
              const b = a + sd * (0.75 + r() * 0.5), x1 = Math.max(cx - w / 2 + 3, Math.min(cx + w / 2 - 3, x + Math.cos(b) * larg)), y1 = y + Math.sin(b) * larg;
              trait(g, x, y, x1, y1, 1, C.sombre);
              long.push([x, y, x1, y1, b - sd * 0.5]);
              if (larg > 4) pointes.push([x1, y1, b]);
            }
          }
        }
        pointes.push([x, y, -Math.PI / 2]);
      }
    } else if (forme === "arque") {
      // des cannes qui montent puis s'arquent vers l'extérieur, la pointe vers le bas
      const k = Math.max(8, Math.round(w / 3.5));
      ccy = sol - h / 2; cry = h / 2; crx = w / 2;
      for (let i = 0; i < k; i++) {
        const u = i / (k - 1) - 0.5, s0 = u < 0 ? -1 : 1, l = h * (1.05 + r() * 0.35);
        let x = cx + u * 4, y = sol, aa = -Math.PI / 2 + u * 0.5;
        for (let s = 0; s < l; s++) { P(g, x, y, s < l * 0.25 ? eB : "#8a3a3a"); if (s > l * 0.2 && s % 2 === 0) long.push([x, y, x, y, aa]); x += Math.cos(aa); y += Math.sin(aa); aa += s0 * (1.9 / l) * (0.7 + Math.abs(u)); if (s > 4 && (y > sol - 2 || Math.abs(x - cx) > w / 2)) break; }
        pointes.push([x, y, aa]);
      }
    } else if (forme === "coussin") {
      // un coussin bas et serré : de courts rameaux qui partent du pied
      ccy = sol; cry = Math.min(h, w * 0.7); crx = w / 2;
      const k = Math.max(9, Math.round(w / 2.5));
      for (let i = 0; i < k; i++) { const u = i / (k - 1) - 0.5, a = -Math.PI / 2 + u * 2.6; branche(cx + u * 3, sol, a, cry * (0.6 + r() * 0.3), 1, 2, 0.6); }
    } else {
      // les conifères : un tronc jusqu'à la pointe, des étages de branches de plus en plus courts
      // (en cône pour le sapin, en plateaux larges pour le cèdre, serrés en colonne pour le cyprès)
      const colonne = forme === "colonne", etages = forme === "etages";
      ccy = sol - h / 2; cry = h / 2; crx = w / 2;
      const base = Math.round(h * (colonne ? 0.06 : etages ? 0.25 : 0.12));
      tronc(h - 2, Math.max(2, Math.round(ep0 * (colonne ? 0.7 : 1))));
      const pas = colonne ? 2 : etages ? Math.max(4, Math.round(h / 7)) : Math.max(3, Math.round(h / 12));
      for (let y = base; y < h - 2; y += pas) {
        const u = (y - base) / Math.max(1, h - base), lg = (colonne ? w * 0.42 * Math.sin(Math.PI * Math.min(1, 0.15 + u * 0.95)) : etages ? (w / 2) * (1 - u * 0.75) : (w / 2) * (1 - u) + 1) * (0.85 + r() * 0.3);
        for (const s0 of [-1, 1]) {
          const a = colonne ? -Math.PI / 2 + s0 * 0.35 : s0 > 0 ? (etages ? -0.05 : 0.18) : Math.PI - (etages ? -0.05 : 0.18), l = colonne ? lg / Math.sin(0.35) * 0.6 : lg;
          const x1 = cx + Math.cos(a) * l, y1 = sol - y + Math.sin(a) * l;
          trait(g, cx, sol - y, x1, y1, 1, eB);
          for (let t = 0.15; t <= 1; t += colonne ? 0.2 : 0.1) {
            const fx = cx + (x1 - cx) * t, fy = sol - y + (y1 - (sol - y)) * t;
            long.push([cx, sol - y, fx, fy, colonne ? -Math.PI / 2 : etages ? Math.PI / 2 : a + s0 * 0.9]);
            // (les plateaux du cèdre et du sapin ont de l'épaisseur : des aiguilles aussi au-dessus)
            if (!colonne) long.push([fx, fy - 2, fx, fy - 2, -Math.PI / 2 + s0 * 0.4]);
          }
          pointes.push([x1, y1, a]);
        }
      }
      pointes.push([cx, sol - h + 1, -Math.PI / 2]);
    }
    // les feuilles : le long des derniers rameaux et en touffe à leur bout ; les fleurs ou les fruits
    // au bout des rameaux (sur la moitié haute pour les tiges dressées)
    const dens = saison ? saison.densite : 1;
    const fines = ["aiguilles", "ecailles", "petites", "lineaires", "cladodes"].includes(feuille);
    const garde = [];
    for (const e of long) if (r() <= Math.max(0.15, dens)) garde.push(e);
    if (TOUFFUS.includes(forme) && !fines) {
      // Les feuillus : des touffes pleines, comme dans le pixel art des arbres, chacune ombrée en
      // dessous et éclairée en haut à gauche, avec des sous-bouquets plus clairs et quelques feuilles
      // qui dépassent du bord (de la forme de la famille, quand la touffe est assez grande). Leur
      // taille dépend de la famille (grosses masses du figuier, petites touffes aérées du bouleau)
      // et de la taille de l'arbre ; on les pose du bas vers le haut, les plus hautes par-dessus.
      const cr = Math.max(2, Math.round(h * (TOUFFE[v.famille] || 0.08) * (forme === "multitige" || forme === "coussin" ? 1.1 : 1)));
      const trous = feuille === "argent" ? 0.16 : ["Betulaceae", "Salicaceae", "Ginkgoaceae"].includes(v.famille) ? 0.12 : 0.03;
      const centres = [];
      // (chaque touffe reste entière dans le dessin : pas de couronne coupée net)
      const ajouter = (x, y) => { x = Math.max(cx - w / 2 + cr * 1.2 + 1, Math.min(cx + w / 2 - cr * 1.2 - 1, x)); y = Math.max(sol - h + cr * 1.05 + 1, y); for (const [a2, b2] of centres) if ((a2 - x) ** 2 + (b2 - y) ** 2 < (cr * 0.7) ** 2) return; centres.push([x, y]); };
      for (const [x, y] of pointes) if (r() <= Math.max(0.15, dens)) ajouter(x, y);
      for (const [x0, y0, x1, y1] of garde) { const ll = Math.hypot(x1 - x0, y1 - y0); for (let t = cr * 1.1; t < ll; t += cr * 1.1) ajouter(x0 + ((x1 - x0) * t) / ll, y0 + ((y1 - y0) * t) / ll); }
      if (forme === "pleureur") for (const [x, y] of pointes.slice()) for (let s = cr; s < h * 0.25 && y + s < sol - 3; s += cr) ajouter(x + (r() - 0.5) * 2, y + s);
      centres.sort((a, b) => b[1] - a[1]);
      const teinte = (c) => (feuille === "argent" ? argent(c) : c);
      for (const [x0, y0] of centres) {
        const rr = cr * (0.8 + r() * 0.4), ry = rr * 0.85;
        for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let x = -Math.ceil(rr); x <= Math.ceil(rr); x++) {
          const d = (x * x) / (rr * rr) + (y * y) / (ry * ry);
          if (d > 1 - r() * 0.22 || (d < 0.8 && r() < trous)) continue;
          const lum = (-x * 0.6 - y) / rr + (r() - 0.5) * 0.55;
          P(gf, x0 + x, y0 + y, teinte(d > 0.8 && y > -ry * 0.2 ? C.tresSombre : lum > 0.6 ? C.clair : lum > -0.1 ? C.feuille : lum > -0.65 ? C.sombre : C.tresSombre));
        }
        // des sous-bouquets plus clairs sur le dessus
        for (let k = 0; k < 2; k++) {
          const bx = x0 - rr * (0.1 + r() * 0.35), by = y0 - ry * (0.15 + r() * 0.35), br = Math.max(1, rr * 0.35);
          for (let y = -br; y <= br; y++) for (let x = -br; x <= br; x++) if (x * x + y * y <= br * br && r() > 0.25) P(gf, bx + x, by + y, teinte((-x - y) / br > 0.3 ? C.clair : C.feuille));
        }
        // des feuilles qui dépassent du bord
        if (cr >= 4) for (let k = 0; k < 2; k++) { const a2 = -Math.PI / 2 + (r() - 0.6) * 2.4; poserFeuille(x0 + Math.cos(a2) * rr, y0 + Math.sin(a2) * ry, a2); }
        else for (let k = 0; k < rr; k++) { const a2 = r() * Math.PI * 2; P(gf, x0 + Math.cos(a2) * (rr + 1), y0 + Math.sin(a2) * (ry + 1), teinte(a2 > Math.PI ? C.feuille : C.sombre)); }
      }
    } else {
      // les aiguilles, les écailles, les petites feuilles : posées une à une le long des rameaux
      for (const [x0, y0, x1, y1, a] of garde) {
        const ll = Math.hypot(x1 - x0, y1 - y0), m = Math.max(1, Math.floor(ll / (forme === "sauvage" ? 2.6 : fines ? 1.5 : 3)));
        for (let k = 0; k <= m; k++) { const t = ll ? k / m : 1; poserFeuille(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, a); }
      }
      for (const [x, y, a] of pointes) {
        if (r() > Math.max(0.15, dens)) continue;
        for (let k = 0; k < 3; k++) poserFeuille(x + (r() - 0.5) * 3, y + (r() - 0.5) * 3, a + (r() - 0.5));
      }
    }
    if (fleurit && repro && dens >= 0.6) {
      const ok = ["verticilles", "epis"].includes(repro) ? long.filter(([, y]) => y < sol - h * 0.5) : pointes;
      for (const [x, y] of ok) if (r() < (forme === "sauvage" ? 0.2 : ok === pointes ? 0.7 : 0.35)) poserRepro(x + (r() - 0.5) * 2, y + (r() - 0.5) * 2);
    }
  }

  // --- le port botanique des herbes -----------------------------------------------------------
  // Chaque famille a sa façon précise de porter ses feuilles et ses fleurs : chez les Lamiacées,
  // les feuilles sont opposées deux à deux et chaque paire est tournée d'un quart de tour par
  // rapport à la précédente (vues de côté : une paire bien étalée, puis une paire vue de face,
  // raccourcie) ; chez les Rubiacées, elles sont en verticilles ; chez les Astéracées, alternes en
  // spirale (on les voit de longueurs différentes, un coup à gauche, un coup à droite, devant ou
  // derrière la tige) ; chez les Poacées, alternes sur deux rangs ; chez d'autres, en rosette au
  // pied. Les fleurs aussi : en verticilles étagés, en épi, en capitules, en ombelles, en grappes…
  const PORTS = {
    Lamiaceae: ["opposees", "verticilles"], Urticaceae: ["opposees", "chatons"], Verbenaceae: ["opposees", "epi"], Hypericaceae: ["opposees", "cyme"],
    Caprifoliaceae: ["opposees", "corymbe"], Gentianaceae: ["opposees", "cyme"], Apocynaceae: ["opposees", "solitaire"], Pedaliaceae: ["opposees", "solitaire"],
    Rubiaceae: ["verticillees", "cyme"],
    Asteraceae: ["alternes", "capitule"], Rosaceae: ["alternes", "cyme"], Fabaceae: ["composees", "grappe"], Solanaceae: ["alternes", "cyme"],
    Malvaceae: ["alternes", "solitaire"], Boraginaceae: ["alternes", "scorpioide"], Polygonaceae: ["alternes", "epi"], Linaceae: ["alternes", "solitaire"],
    Onagraceae: ["alternes", "grappe"], Brassicaceae: ["rosetteTige", "grappe"], Scrophulariaceae: ["rosetteTige", "epi"], Papaveraceae: ["rosette", "solitaireHaut"],
    Apiaceae: ["engainantes", "ombelle"], Araliaceae: ["alternes", "ombelle"], Melanthiaceae: ["alternes", "grappe"],
    Plantaginaceae: ["rosette", "epiHaut"], Primulaceae: ["rosette", "ombelleHaut"], Violaceae: ["rosette", "solitaire"], Asphodelaceae: ["rosetteEpaisse", "grappeHaut"],
    Amaryllidaceae: ["lineaires", "ombelleHaut"], Iridaceae: ["eventail", "solitaireHaut"], Zingiberaceae: ["distiques", "aucune"], Poaceae: ["graminee", "panicule"],
    Equisetaceae: ["prele", "aucune"], Tropaeolaceae: ["peltees", "solitaire"],
  };
  function plantePortrait(g, cx, sol, w, h, famille, C, fleurit, st, r, saison, graine, buisson) {
    const [port, inflo] = PORTS[famille] || ["alternes", "cyme"];
    const P = (gg, x, y, col) => { gg.fillStyle = col; gg.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const tigeC = C.sombre, coeur = "#f2c94c";
    // les feuilles sur une toile à part (pour les couleurs de la saison)
    const fe = document.createElement("canvas"); fe.width = g.canvas.width; fe.height = g.canvas.height;
    const gf = fe.getContext("2d");
    // une feuille : partant de (x, y), dans la direction a, longue de l ; le bord du dessus clair
    const feuilleA = (x, y, a, l, larg, devant) => {
      for (let s = 0; s <= l; s += 0.6) {
        const u = s / Math.max(1, l), e = Math.sin(u * Math.PI) * (larg || 1);
        const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
        P(gf, px, py, devant === false ? C.sombre : C.feuille);
        if (e > 0.6) { P(gf, px - Math.sin(a) * e * 0.8, py + Math.cos(a) * e * 0.8, C.sombre); P(gf, px + Math.sin(a) * e * 0.8, py - Math.cos(a) * e * 0.8, devant === false ? C.feuille : C.clair); }
      }
    };
    const tige = (x0, y0, x1, y1, col) => { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0))); for (let k = 0; k <= n; k++) P(g, x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n, col || tigeC); };
    const petiteFleur = (x, y, col) => { P(g, x, y, col || C.fleurCol); };
    const grandeFleur = (x, y, col) => { col = col || C.fleurCol; P(g, x - 1, y, col); P(g, x + 1, y, col); P(g, x, y - 1, col); P(g, x, y + 1, col); P(g, x, y, coeur); };
    const capitule = (x, y) => { P(g, x - 1, y, C.fleurCol); P(g, x + 1, y, C.fleurCol); P(g, x, y - 1, C.fleurCol); P(g, x, y, "#c99a3a"); };
    const L = Math.max(1, Math.min(6, w * 0.22)), jeune = st < 3;
    // les fleurs, selon l'inflorescence, au bout d'une tige (x, y), qui monte depuis (xb, yb)
    const fleurs = (x, y, xb, yb) => {
      if (!fleurit) return;
      const hauteur = Math.abs(yb - y);
      switch (inflo) {
        case "verticilles": for (let k = 0; k < 4; k++) { const yy = y + k * 2.5; if (yy > yb) break; P(g, x - 1, yy, C.fleurCol); P(g, x + 1, yy, C.fleurCol); P(g, x, yy - 1, C.fleurCol); } break;
        case "epi": case "epiHaut": for (let k = 0; k < Math.min(7, hauteur * 0.35); k++) { P(g, x, y + k, C.fleurCol); if (k % 2) P(g, x + (k % 4 ? 1 : -1), y + k, C.fleurCol); } break;
        case "capitule": capitule(x, y); break;
        case "ombelle": case "ombelleHaut": for (let k = -3; k <= 3; k++) { tige(x, y + 2, x + k, y, tigeC); P(g, x + k, y - 1, C.fleurCol); } break;
        case "grappe": case "grappeHaut": for (let k = 0; k < 6; k++) { const yy = y + k * 1.8; if (yy > yb) break; P(g, x + (k % 2 ? 1 : -1), yy, C.fleurCol); } P(g, x, y - 1, C.fleurCol); break;
        case "cyme": case "corymbe": for (let k = -2; k <= 2; k++) petiteFleur(x + k, y - (Math.abs(k) < 2 ? 1 : 0)); break;
        case "solitaire": case "solitaireHaut": grandeFleur(x, y - 1); break;
        case "scorpioide": for (let k = 0; k < 5; k++) petiteFleur(x + Math.cos(k * 0.9) * 2, y - Math.sin(k * 0.9) * 2); break;
        case "panicule": for (let k = 0; k < 6; k++) P(g, x + (k - 2.5) * 0.9, y + Math.abs(k - 2.5) * 0.8, "#d8c27a"); break;
        case "chatons": for (let k = 2; k < hauteur * 0.6; k += 3) { P(g, x - 1, y + k, "#9cc77a"); P(g, x + 1, y + k + 1, "#9cc77a"); } break;
      }
    };
    // une tige feuillée qui monte de (x0, sol) à (x1, haut), avec ses nœuds et ses feuilles
    const tigeFeuillee = (x0, x1, haut, graineT) => {
      tige(x0, sol, x1, sol - haut);
      const entre = Math.max(2, Math.round(haut / (jeune ? 3 : 5 + Math.min(4, haut / 12))));
      let k = 0;
      for (let y = entre * 0.8; y < haut * (fleurit ? 0.82 : 0.95); y += entre * (1 - y / haut * 0.25), k++) {
        const u = y / haut, x = x0 + (x1 - x0) * u, yy = sol - y, l = L * (1 - u * 0.5);
        if (port === "opposees") {
          // deux à deux, chaque paire tournée d'un quart de tour : étalée, puis vue de face
          if (k % 2 === 0) { feuilleA(x, yy, -Math.PI + 0.45, l, 0.9, true); feuilleA(x, yy, -0.45, l, 0.9, true); }
          else { feuilleA(x, yy, -Math.PI / 2 - 0.25, l * 0.5, 0.7, true); P(gf, x + 1, yy - 1, C.sombre); }
        } else if (port === "verticillees") {
          for (const a of [-Math.PI + 0.25, -0.25, -Math.PI + 0.8, -0.8]) feuilleA(x, yy, a, l * (Math.abs(Math.cos(a)) > 0.9 ? 1 : 0.6), 0.5, Math.cos(a) * 0 === 0);
        } else if (port === "distiques" || port === "graminee") {
          const cote = k % 2 ? -1 : 1;
          feuilleA(x, yy, cote > 0 ? -0.35 : -Math.PI + 0.35, l * (port === "graminee" ? 1.8 : 1.6), port === "graminee" ? 0.4 : 1.4, true);
        } else if (port === "composees") {
          // une feuille composée de petites folioles, une fois à gauche, une fois à droite
          const cote = k % 2 ? -1 : 1, a = cote > 0 ? -0.5 : -Math.PI + 0.5;
          for (let q = 1; q <= l + 1; q += 1.3) { const px = x + Math.cos(a) * q, py = yy + Math.sin(a) * q; P(gf, px, py - 1, C.feuille); P(gf, px, py + 1, C.clair); }
        } else if (port === "engainantes") {
          const cote = k % 2 ? -1 : 1, a = cote > 0 ? -0.6 : -Math.PI + 0.6;
          P(gf, x + cote, yy, C.clair);
          for (let q = 2; q <= l + 2; q += 1.2) { const px = x + Math.cos(a) * q, py = yy + Math.sin(a) * q; P(gf, px, py, C.feuille); P(gf, px + (q % 2 ? 1 : 0), py - 1, C.clair); }
        } else {
          // alternes en spirale (2/5) : 144° d'une feuille à l'autre, vues de côté
          const th = (k * 144 + hsh(graineT, 3) * 360) * Math.PI / 180, proj = Math.cos(th), devant = Math.sin(th) > 0;
          feuilleA(x, yy, proj > 0 ? -0.5 : -Math.PI + 0.5, Math.max(1, l * (0.35 + 0.65 * Math.abs(proj))), port === "peltees" ? 1.6 : 1, devant);
        }
      }
      fleurs(x1, sol - haut, x0, sol);
    };
    const rosette = (rx, ry, epaisse) => {
      const n = epaisse ? 7 : 9;
      for (let k = 0; k < n; k++) {
        const a = -Math.PI + (k / (n - 1)) * Math.PI, l = rx * (0.7 + hsh(graine.length + k, 9) * 0.3);
        feuilleA(cx, sol - 1, a * 0.85 - Math.PI * 0.075, epaisse ? l * 0.8 : l, epaisse ? 1.6 : 1.1, k % 2 === 0);
      }
    };
    // le port de chaque famille
    const nTiges = buisson ? Math.max(4, Math.min(9, Math.round(w / 2.2))) : Math.max(1, Math.min(6, Math.round(w / 4)));
    if (port === "prele") {
      for (let k = 0; k < nTiges; k++) {
        const x = cx + (k - (nTiges - 1) / 2) * 2.5, hh = h * (0.7 + hsh(k, 7) * 0.3);
        tige(x, sol, x, sol - hh, C.feuille);
        for (let y = 3; y < hh; y += 3) { P(g, x, sol - y, "#2c2a3e"); for (const s of [-1, 1]) for (let q = 1; q <= Math.max(1, L * (1 - y / hh)); q++) P(gf, x + s * q, sol - y + q * 0.6, C.feuille); }
      }
    } else if (port === "rosette" || port === "rosetteEpaisse" || port === "lineaires" || port === "eventail") {
      if (port === "lineaires") for (let k = 0; k < 7; k++) feuilleA(cx + (k - 3) * 0.6, sol, -Math.PI / 2 + (k - 3) * 0.16, h * 0.55, 0.3, true);
      else if (port === "eventail") for (let k = 0; k < 6; k++) feuilleA(cx + (k - 2.5) * 0.8, sol, -Math.PI / 2 + (k - 2.5) * 0.12, h * (0.5 + 0.1 * (3 - Math.abs(k - 2.5))), 0.9, true);
      else rosette(Math.max(2, w * 0.45), 2, port === "rosetteEpaisse");
      // les hampes florales, nues, qui montent du milieu
      if (!jeune) {
        const n = port === "rosette" ? Math.max(1, Math.min(4, Math.round(w / 5))) : 1;
        for (let k = 0; k < n; k++) { const x = cx + (k - (n - 1) / 2) * 3, hh = h * (0.75 + hsh(k, 11) * 0.25); tige(x, sol - 1, x + (k - (n - 1) / 2), sol - hh); fleurs(x + (k - (n - 1) / 2), sol - hh, x, sol); }
      }
    } else if (port === "rosetteTige") {
      rosette(Math.max(2, w * 0.45), 2);
      tigeFeuillee(cx, cx, h * 0.95, 1);
    } else if (inflo === "capitule" && !jeune && !buisson) {
      // les Astéracées : une tige qui se ramifie en haut, chaque rameau terminé par un capitule
      tigeFeuillee(cx, cx, h * 0.62, 1);
      const nb = Math.max(2, Math.min(6, Math.round(w / 3)));
      for (let k = 0; k < nb; k++) {
        const u = nb === 1 ? 0 : k / (nb - 1) - 0.5, x = cx + u * w * 0.8, hh = h * (0.85 + (0.5 - Math.abs(u)) * 0.3);
        tige(cx, sol - h * 0.6, x, sol - hh);
        if (k % 2) feuilleA(cx + u * w * 0.4, sol - h * 0.72, u > 0 ? -0.4 : -Math.PI + 0.4, L * 0.6, 0.8, true);
        fleurs(x, sol - hh, cx, sol - h * 0.6);
      }
    } else {
      for (let k = 0; k < nTiges; k++) {
        const u = nTiges === 1 ? 0 : k / (nTiges - 1) - 0.5, x0 = cx + u * w * (buisson ? 0.35 : 0.5), x1 = cx + u * w * (buisson ? 0.85 : 0.7);
        tigeFeuillee(x0, x1, h * (0.75 + (0.5 - Math.abs(u)) * 0.5) * (0.92 + hsh(k, graine.length) * 0.16), k + 1);
      }
    }
    if (typeof appliquerSaison === "function") appliquerSaison(fe, saison, graine);
    g.drawImage(fe, 0, 0);
  }
  const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };

  // des branches nues dans la couronne : elles partent du haut du tronc et se divisent en montant
  function branchesNues(gc, x0, y0, rx, haut, r) {
    const pose = (x, y, c) => { gc.fillStyle = c; gc.fillRect(Math.round(x), Math.round(y), 1, 1); };
    const branche = (x, y, a, l, n) => {
      for (let s = 0; s < l; s++) pose(x + Math.cos(a) * s, y + Math.sin(a) * s, n > 1 ? "#6b4a34" : "#8a6a52");
      if (n <= 0) return;
      const xb = x + Math.cos(a) * l, yb = y + Math.sin(a) * l;
      branche(xb, yb, a - 0.45 - r() * 0.2, l * 0.68, n - 1);
      branche(xb, yb, a + 0.45 + r() * 0.2, l * 0.68, n - 1);
    };
    const l = Math.max(3, Math.min(rx * 0.7, haut * 0.35));
    for (const a of [-Math.PI / 2 - 0.55, -Math.PI / 2, -Math.PI / 2 + 0.55]) branche(x0, y0, a, l, 3);
  }
  // le feuillage selon la saison : des trous qui s'agrandissent quand les feuilles tombent (par
  // petits paquets, pas pixel par pixel), les feuilles d'automne dans leur couleur, en gardant
  // l'ombre et la lumière du dessin, et le vert tendre des jeunes feuilles au printemps
  function appliquerSaison(c, f, graine) {
    if (!f || (f.densite >= 1 && !f.automne && !f.jeune)) return;
    const g = c.getContext("2d"), im = g.getImageData(0, 0, c.width, c.height), d = im.data;
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)), [ar, ag, ab] = rgb(f.couleur), g0 = H.hash(graine) % 997;
    const bruit = (x, y, k) => { const v = Math.sin((x + g0) * 12.9898 + (y + k) * 78.233) * 43758.5453; return v - Math.floor(v); };
    for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
      const i = (y * c.width + x) * 4;
      if (d[i + 3] < 10) continue;
      if (bruit(x >> 1, y >> 1, 1) > f.densite) { d[i + 3] = 0; continue; }
      const lum = Math.max(0.72, Math.min(1.3, 0.55 + (d[i] + d[i + 1] + d[i + 2]) / 3 / 180));
      if (bruit(x >> 1, y >> 1, 2) < f.automne) { d[i] = Math.min(255, ar * lum); d[i + 1] = Math.min(255, ag * lum); d[i + 2] = Math.min(255, ab * lum); }
      else if (f.jeune && bruit(x, y, 3) < f.jeune) { d[i] = Math.min(255, d[i] * 0.5 + 90); d[i + 1] = Math.min(255, d[i + 1] * 0.5 + 115); d[i + 2] = Math.min(255, d[i + 2] * 0.5 + 60); }
    }
    g.putImageData(im, 0, 0);
  }

  function dimensionnerIso() {
    const ile = vue.ile;
    // la place au-dessus de l'île pour les plus grandes plantes
    let haut = T * 1.5;
    for (const pl of Object.values(ile.plantes || {})) { const q = H.d.plante(pl.p); if (q) haut = Math.max(haut, hauteurPx(q, ile, 3) + 10); }
    vue.headroom = haut;
    vue.ox = MARGE + ile.lignes * HW;
    vue.oy = MARGE + haut;
    let w = ((ile.cols + ile.lignes) * HW + 2 * MARGE) * vue.zoom, h = (vue.oy + (ile.cols + ile.lignes) * QH + PROF + MARGE) * vue.zoom;
    // (la toile remplit toute la zone d'affichage : du ciel autour de l'île)
    const [zw, zh] = placeZone(w);
    if (zw > w) { vue.ox += (zw - w) / 2 / vue.zoom; w = zw; }
    if (zh > h) { vue.oy += (zh - h) / 2 / vue.zoom; h = zh; }
    const dpr = Math.min(window.devicePixelRatio || 1, 4096 / w, 4096 / h, 3);
    vue.dpr = dpr;
    vue.toile.width = Math.round(w * dpr);
    vue.toile.height = Math.round(h * dpr);
    vue.toile.style.width = w + "px";
    vue.toile.style.height = h + "px";
    vue.fond = H.aqua.toile(vue.toile.width, vue.toile.height);
  }
  // la transformation qui couche le plan (en pixels de plan, T par case) en losanges
  function aplat(ctx, z) { ctx.setTransform((z * HW) / T, (z * QH) / T, (-z * HW) / T, (z * QH) / T, z * vue.ox, z * vue.oy); }

  function peindreFondIso() {
    const ile = vue.ile, ctx = vue.fond.getContext("2d"), r = H.alea(ile.id + "fond"), z = vue.zoom * vue.dpr;
    const saison = document.documentElement.dataset.saison || "printemps";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, vue.fond.width, vue.fond.height);
    ctx.fillStyle = "#8fc3dc";
    ctx.fillRect(0, 0, vue.fond.width, vue.fond.height);
    ctx.setTransform(z, 0, 0, z, 0, 0);
    const W = vue.fond.width / z, Hh = vue.fond.height / z;
    for (let i = 0; i < 18; i++) H.aqua.tache(ctx, r, r() * W, r() * Hh, 40 + r() * 80, 30 + r() * 60, i % 2 ? "#6aa9c9" : "#bfe0ec", { alpha: 0.05, couches: 8 });
    // les deux tranches du bloc : un liseré d'herbe, la terre et ses cailloux, puis la roche
    const C = ile.cols, Lg = ile.lignes;
    const tranche = (a, b, clair) => {
      const [x0, y0] = proj(a[0], a[1]), [x1, y1] = proj(b[0], b[1]), n = Math.round(Math.abs(x1 - x0));
      for (let q = 0; q <= n; q++) {
        const x = x0 + ((x1 - x0) * q) / n, y = y0 + ((y1 - y0) * q) / n;
        for (let d = 0; d < PROF; d++) {
          const v = H.hash(cle(Math.round(x), d)) % 100 / 100;
          let col = d < 2 ? (clair ? "#6cbd5c" : "#3f8a42") : d < PROF * 0.55 ? (v < 0.08 ? "#8a98cc" : v < 0.3 ? (clair ? "#9a6a3c" : "#7a4520") : clair ? "#b9834f" : "#9a6a3c") : v < 0.15 ? "#6b6578" : clair ? "#8a98cc" : "#6b6578";
          ctx.fillStyle = col;
          ctx.fillRect(Math.round(x), Math.round(y + d), 1, 1);
        }
      }
    };
    // (case par case : chaque bord qui donne sur le vide, devant à gauche ou devant à droite)
    for (let y = 0; y < Lg; y++) for (let x = 0; x < C; x++) {
      if (estVide(ile, x, y)) continue;
      if (estVide(ile, x, y + 1)) tranche([x, y + 1], [x + 1, y + 1], true);
      if (estVide(ile, x + 1, y)) tranche([x + 1, y + 1], [x + 1, y], false);
    }
    // le dessus, pixel par pixel, comme un jardin en pixel art : l'herbe en touffes claires et
    // sombres avec des fleurettes, la terre bêchée en sillons, les dalles du chemin avec leurs
    // joints moussus, le gravier, l'eau qui miroite, la serre
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const lw = Math.ceil(W), lh = Math.ceil(Hh), img = new ImageData(lw, lh), px = new Uint32Array(img.data.buffer);
    const rgb = (h) => { const n = parseInt(h.slice(1), 16); return 0xff000000 | ((n & 0xff) << 16) | (n & 0xff00) | (n >> 16); };
    const PAL = {
      herbe: { printemps: ["#2f6b35", "#3f8a42", "#4aa63e", "#6cbd5c", "#9cc77a"], "été": ["#2f6b35", "#3f8a42", "#6a9a3a", "#8fae4a", "#c6cf55"], automne: ["#2f6b35", "#3f8a42", "#4aa63e", "#6a9a3a", "#9cc77a"], hiver: ["#2f5a3a", "#3f6a4a", "#5a7a5a", "#7a8a7a", "#9aa89a"] }[saison] || ["#2f6b35", "#3f8a42", "#4aa63e", "#6cbd5c", "#9cc77a"],
      terre: ["#4b3427", "#7a4520", "#9a6a3c", "#b9834f"], dalle: ["#c2cdec", "#e9e3cd", "#f3f0dc", "#8a98cc"], joint: ["#6b6578", "#4a7a3a", "#5a5466"],
      gravier: ["#8a98cc", "#c2cdec", "#e9e3cd", "#6b6578"], eau: ["#2f8fe0", "#3a9ee8", "#6fb6ee", "#a8d8ec"], serre: ["#a8d8ec", "#d6eef7", "#7f97f2"],
      fleurs: ["#f6ee55", "#ffffff", "#ffb3a8", "#d07ab8", "#8a58cc", "#ff5b4f"],
    };
    const cache = {};
    const c32 = (h) => cache[h] || (cache[h] = rgb(h));
    const hp = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
    for (let y = 0; y < lh; y++) for (let x = 0; x < lw; x++) {
      const [fx, fy] = versCase(x + 0.5, y + 0.5);
      if (fx < 0 || fy < 0 || fx >= C || fy >= Lg) continue;
      const cx0 = Math.floor(fx), cy0 = Math.floor(fy), t2 = caseDe(ile, cx0, cy0).t, h = hp(x, y), n = hp(x >> 2, y >> 1), u = fx - cx0, v = fy - cy0;
      if (t2 === "vide") continue;
      let col;
      if (t2 === "terre") {
        const sillon = Math.floor(v * 5 + n * 0.3) % 2;
        col = PAL.terre[h < 0.1 ? 0 : sillon ? 1 : h > 0.85 ? 3 : 2];
      } else if (t2 === "chemin") {
        const su = u * 2, sv = v * 2, bord = Math.min(su % 1, sv % 1, 1 - (su % 1), 1 - (sv % 1));
        col = bord < 0.09 ? PAL.joint[h < 0.4 ? 1 : h < 0.7 ? 0 : 2] : PAL.dalle[h < 0.12 ? 3 : h < 0.45 ? 0 : h < 0.9 ? 1 : 2];
        if (bord < 0.16 && bord >= 0.09 && h < 0.25) col = PAL.herbe[3];
      } else if (t2 === "gravier") col = PAL.gravier[Math.floor(h * 4)];
      else if (t2 === "eau") col = PAL.eau[h < 0.08 ? 3 : n < 0.3 ? 0 : n < 0.7 ? 1 : 2];
      else if (t2 === "serre") col = (u < 0.05 || v < 0.05) ? PAL.serre[2] : PAL.serre[h < 0.3 ? 1 : 0];
      else if (t2 === "sol") {
        // la terre nue, selon le sol de la case : des mottes plus claires ou plus sombres, des cailloux
        const ts = teintesSol(caseDe(ile, cx0, cy0).sol), nn = hp(x >> 2, y >> 1);
        col = ts.base[h < 0.1 ? 2 : nn < 0.4 ? 0 : nn < 0.8 ? 1 : 3];
        if (hp(x >> 1, y) < ts.cailloux) col = ts.pierres[hp(y, x) < 0.5 ? 0 : 1];
      } else {
        // l'herbe : des plaques plus claires et plus sombres, des brins, quelques fleurettes
        // des touffes : chaque colonne de pixels a ses brins de 2 à 4 pixels de haut, clairs en
        // haut et sombres au pied, sur des plaques d'herbe plus claires ou plus sombres
        const nn = hp(x >> 3, y >> 2) * 0.6 + hp(x >> 4, y >> 3) * 0.4;
        let k = nn < 0.35 ? 1 : nn < 0.75 ? 2 : 3;
        const dec = Math.floor(hp(x, 7) * 4), brin = hp(x, Math.floor((y + dec) / 4)), pos = (y + dec) % 4;
        if (brin > 0.72) k = pos === 0 ? Math.min(4, k + 1) : pos === 3 ? Math.max(0, k - 1) : k;
        else if (h < 0.05) k = Math.max(0, k - 1);
        col = PAL.herbe[k];
        if (h > 0.997) col = PAL.fleurs[Math.floor(hp(y, x) * PAL.fleurs.length)];
      }
      px[y * lw + x] = c32(col);
    }
    const plat = document.createElement("canvas");
    plat.width = lw; plat.height = lh;
    plat.getContext("2d").putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(z, 0, 0, z, 0, 0);
    ctx.drawImage(plat, 0, 0);
    ctx.imageSmoothingEnabled = true;
    // un liseré plus clair au bord du dessus, comme l'herbe qui déborde
    const bords = [];
    for (let y = 0; y < Lg; y++) for (let x = 0; x < C; x++) {
      if (estVide(ile, x, y)) continue;
      if (estVide(ile, x, y + 1)) bords.push([[x, y + 1], [x + 1, y + 1]]);
      if (estVide(ile, x + 1, y)) bords.push([[x + 1, y + 1], [x + 1, y]]);
    }
    for (const [a, b] of bords) {
      const [x0, y0] = proj(a[0], a[1]), [x1, y1] = proj(b[0], b[1]), n2 = Math.round(Math.abs(x1 - x0));
      for (let q = 0; q <= n2; q++) { const xx = x0 + ((x1 - x0) * q) / n2, yy = y0 + ((y1 - y0) * q) / n2; ctx.fillStyle = PAL.herbe[4]; ctx.fillRect(Math.round(xx), Math.round(yy) - 1, 1, 1); if (H.hash(String(q)) % 3 === 0) { ctx.fillStyle = PAL.herbe[2]; ctx.fillRect(Math.round(xx), Math.round(yy) + 1, 1, 2); } }
    }
  }

  // les racines des plantes du bord, dans les tranches : plus la plante est grande, plus elles
  // descendent ; elles partent pile sous le pied
  function racinesIso(ctx, ile) {
    for (const [k, pl] of Object.entries(ile.plantes || {})) {
      const p = H.d.plante(pl.p);
      if (!p) continue;
      const st = stade(ile, pl);
      if (st < 2) continue;
      const [x, y] = k.split(",").map(Number), [sx] = proj(x + 0.5, y + 0.5), hm = hauteurM(p);
      const longueur = Math.min(PROF - 3, 4 + Math.sqrt(hm) * 9) * (st === 3 ? 1 : 0.6);
      const g = H.hash(k);
      // la tranche juste devant elle, à gauche (si la case devant à gauche est vide) ou à droite
      for (const [dist, i, j] of [[0.5, x + 0.5, y + 1], [0.5, x + 1, y + 0.5]]) {
        if ((j === y + 1 && !estVide(ile, x, y + 1)) || (i === x + 1 && !estVide(ile, x + 1, y))) continue;
        const [bx, by] = proj(i, j), force = 1 - dist / 1.6, L = Math.round(longueur * (0.5 + force * 0.5));
        let rx = bx;
        for (let d = 2; d < L; d++) {
          if (d > 3 && (g >> d) % 5 === 0) rx += (g >> (d + 2)) % 2 ? 1 : -1;
          ctx.fillStyle = d < L * 0.6 ? "#4b3427" : "#5a3418";
          ctx.fillRect(Math.round(rx), Math.round(by + d), 1, 1);
          if (d > 2 && d < L - 2 && (g >> (d % 13)) % 4 === 0) { const sens = d % 2 ? 1 : -1; for (let q = 1; q < 4; q++) ctx.fillRect(Math.round(rx + sens * q), Math.round(by + d + q * 0.6), 1, 1); }
        }
      }
    }
  }

  function dessinerIso(ctxDest, sansNuit) {
    const ile = vue.ile, toile = vue.toile, ctx = ctxDest || toile.getContext("2d");
    // une nouvelle grande plante : on fait de la place au-dessus de l'île
    let besoin = T * 1.5;
    for (const pl of Object.values(ile.plantes || {})) { const q = H.d.plante(pl.p); if (q) besoin = Math.max(besoin, hauteurPx(q, ile, 3) + 10); }
    if (!ctxDest && Math.abs(besoin - vue.headroom) > 2) { dimensionnerIso(); peindreFondIso(); }
    const z = vue.zoom * vue.dpr, t = performance.now();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vue.fond, 0, 0);
    ctx.setTransform(z, 0, 0, z, 0, 0);
    racinesIso(ctx, ile);

    // ce qui est à plat sur le sol : cases conseillées, ombres des plantes, bassin, sélection
    ctx.save();
    aplat(ctx, z);
    if (vue.outil === "planter" && vue.depuisSerre && vue.plante && !ile.croquis) {
      const p = H.d.plante(vue.plante);
      if (p) {
        if (!vue.casesBonnes || vue.casesBonnes.id !== p.id || vue.casesBonnes.le < t - 1500) vue.casesBonnes = { id: p.id, le: t, cases: new Set(casesQuiConviennent(ile, p)) };
        ctx.fillStyle = "rgba(157,255,0,0.3)";
        for (const k2 of vue.casesBonnes.cases) { const [x, y] = k2.split(",").map(Number); ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); }
      }
    }
    for (const [k2, pl] of Object.entries(ile.plantes || {})) {
      const [x, y] = k2.split(",").map(Number), q = H.d.plante(pl.p);
      if (!q) continue;
      const st = stade(ile, pl);
      ctx.fillStyle = "rgba(35,33,74,0.18)";
      ctx.beginPath(); ctx.ellipse((x + 0.55) * T, (y + 0.55) * T, T * (st === 3 ? Math.min(1.4, rayonPlante(q, ile) * 0.7) : 0.25), T * (st === 3 ? Math.min(1.4, rayonPlante(q, ile) * 0.7) : 0.25), 0, 0, Math.PI * 2); ctx.fill();
      if (aRecolter(q, ile, pl)) {
        ctx.strokeStyle = "#ff2e9a"; ctx.lineWidth = 2.5; ctx.setLineDash([4, 3]);
        ctx.beginPath(); ctx.arc((x + 0.5) * T, (y + 0.5) * T, T * 0.46, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    if (ile.secrete && ile.mare) dessinerMare(ctx, ile, t);
    if (vue.choisie) { ctx.strokeStyle = "#ff7b00"; ctx.lineWidth = 2.5; ctx.strokeRect(vue.choisie.x * T + 1, vue.choisie.y * T + 1, T - 2, T - 2); }
    dessinerCalqueEtTrace(ctx);
    ctx.restore();

    // ce qui se dresse, du fond vers le devant
    ctx.setTransform(z, 0, 0, z, 0, 0);
    const debout = [], couronnes = [], aCueillir = [];
    // les plantes dessinées plus finement : un pixel du dessin pour un pixel de l'écran
    const finPlantes = Math.max(1, Math.min(3, Math.round(z)));
    vue.boites = [];
    for (const [k2, pl] of Object.entries(ile.plantes || {})) {
      const [x, y] = k2.split(",").map(Number), q = H.d.plante(pl.p);
      if (!q) continue;
      debout.push({ prof: x + y + 1, dessin: () => {
        const st = stade(ile, pl), d = planteDebout(q, ile, st, fleurie(q, ile, pl), finPlantes), [sx, sy] = proj(x + 0.5, y + 0.5);
        const gx = Math.round(sx - d.l / 2), gy = Math.round(sy - d.h + 2);
        ctx.drawImage(d.pied, gx, gy, d.l, d.h);
        if (d.couronne) couronnes.push([d.couronne, gx, gy, d.l, d.h]);
        vue.boites.push({ x, y, g: gx, h: gy + d.h - 2 - d.haut, d: gx + d.l, b: gy + d.h, grande: d.haut > T * 1.2, prof: x + y });
        if (!ile.croquis && pl.eau < 20 && st > 0 && !aRecolter(q, ile, pl)) { ctx.fillStyle = "#3a8fd8"; ctx.fillRect(Math.round(sx + d.l / 2 - 2), Math.round(sy - Math.min(d.haut, T) - 3), 3, 4); }
        if (aRecolter(q, ile, pl)) aCueillir.push([sx, sy - d.haut, d.l, d.haut, x * 7 + y * 13]);
      } });
    }
    const enCalin = vue.calin && vue.luigi && !vue.luigi.cible;
    const perso = (nom, o, echelle, image, sauf) => { const [sx, sy] = proj(o.x + 0.5, o.y + 0.5); H.pixel.dessiner(ctx, nom, sx, sy - (sauf || 0), echelle, image); };
    if ((!ile.croquis || vue.ovo.cible) && !enCalin) {
      const o = vue.ovo, marche = o.cible ? Math.floor(t / 160) % 2 : 0;
      debout.push({ prof: o.x + o.y + 1.02, dessin: () => perso("ovo", o, 1.5, marche, marche ? 1 : 0) });
      if (vue.hongrois) {
        const mm = vue.mesiSuit || (vue.mesiSuit = { x: o.x - 1, y: o.y });
        mm.x += (o.x - 0.9 - mm.x) * 0.08; mm.y += (o.y - mm.y) * 0.08;
        debout.push({ prof: mm.x + mm.y + 1.02, dessin: () => perso("luigi", mm, 1.5, marche) });
      }
    }
    if (vue.luigi && !enCalin) {
      const l = vue.luigi, marche = l.cible ? Math.floor(t / 170) % 2 : 0;
      debout.push({ prof: l.x + l.y + 1.02, dessin: () => perso("luigi", l, 1.5, marche, marche ? 1 : 0) });
    }
    if (enCalin) {
      const o = vue.ovo;
      debout.push({ prof: o.x + o.y + 1.02, dessin: () => {
        const [sx, sy] = proj(o.x + 0.5, o.y + 0.5);
        ctx.save(); ctx.translate(sx - (o.x + 0.5) * T, sy - (o.y + 0.9) * T); dessinerCalin(ctx, T); ctx.restore();
      } });
    }
    if (ile.secrete) {
      const pos = vue.lolo && vue.lolo.course ? H.sons.position(vue.lolo.course, t) : null;
      const visible = !vue.lolo || (vue.lolo.course && pos), galope = !!(pos && pos.enCourse);
      const place = ile.lolo || { x: ile.cols / 2, y: ile.lignes / 2 + 0.6 }, lx = pos ? pos.x : place.x;
      const image = galope ? Math.floor(t / 90) % 4 : Math.floor(t / 700) % 2;
      if (visible) debout.push({ prof: lx + place.y + 0.5, dessin: () => {
        const [sx, sy] = proj(lx, place.y);
        H.pixel.dessiner(ctx, galope ? "loloGalop" : H.memeDehors && H.memeDehors() ? "loloSansMeme" : "lolo", sx, sy - (galope && image % 2 ? 2 : 0), 2, image);
        if (!galope && Math.floor(t / 1400) % 2) { ctx.font = "10px 'Suez One', serif"; ctx.fillStyle = "#ff2e9a"; ctx.fillText("rrr", sx + 12, sy - 60); }
      } });
    }
    if (vue.loloVisite && vue.loloVisite.course) {
      const l = vue.loloVisite, pos = H.sons.position(l.course, t);
      if (pos) {
        const image = pos.enCourse ? Math.floor(t / 90) % 4 : Math.floor(t / 700) % 2;
        debout.push({ prof: pos.x + l.y + 1, dessin: () => { const [sx, sy] = proj(pos.x + 0.5, l.y + 0.5); H.pixel.dessiner(ctx, pos.enCourse ? "loloGalop" : H.memeDehors && H.memeDehors() ? "loloSansMeme" : "lolo", sx, sy - (pos.enCourse && image % 2 ? 2 : 0), 2, image); } });
      }
    }
    if (ile.mare || (ile.animaux && ile.animaux.length)) debout.push({ prof: 0, dessin: () => dessinerAnimaux(ctx, ile, t, proj) });
    // les paniers de la récolte du jour, sur le bord de devant
    paniersIle(ile).forEach((b, i) => {
      const q = H.d.plante(b.p), [bx, by] = placePanier(ile, i);
      if (q) debout.push({ prof: bx + by, dessin: () => { const [sx, sy] = proj(bx, by); ctx.save(); ctx.translate(Math.round(sx), Math.round(sy)); ctx.scale(2, 2); panierRecolte(ctx, 0, 0, q, b.n); ctx.restore(); } });
    });
    // les pots à repiquer, qui flottent devant l'angle de devant (par-dessus tout le reste)
    vue.potsFlottants = [];
    potsDeLaCaisse(ile).forEach((q, i) => {
      const pq = H.d.plante(q.id);
      if (!pq) return;
      const [sx, sy] = proj(q.x, q.y), hy = sy - 12;
      vue.potsFlottants.push({ id: q.id, g: sx - 15, d: sx + 15, h: hy - 30, b: hy + 14 });
      debout.push({ prof: 100 + q.x + q.y, dessin: () => { ctx.save(); ctx.translate(Math.round(sx), Math.round(hy)); ctx.scale(1.7, 1.7); potFlottant(ctx, 0, 0, pq, vue.outil === "planter" && vue.depuisSerre && vue.plante === q.id, t, i); ctx.restore(); } });
    });
    debout.sort((a, b) => a.prof - b.prof).forEach((e) => e.dessin());
    // ce qui vole : un brin récolté vers son panier, en arc
    vue.envols = (vue.envols || []).filter((e) => t - e.t0 < 750);
    for (const e of vue.envols) {
      const u = (t - e.t0) / 750, [ax, ay] = proj(e.de[0], e.de[1]), [bx, by] = proj(e.vers[0], e.vers[1]);
      const x = ax + (bx - ax) * u, y = ay - 20 + (by - 10 - (ay - 20)) * u - Math.sin(Math.PI * u) * 26;
      ctx.fillStyle = FEUILLES_PIX[H.hash(e.p.id) % FEUILLES_PIX.length]; ctx.fillRect(Math.round(x), Math.round(y), 1, 4); ctx.fillRect(Math.round(x) - 1, Math.round(y) + 1, 3, 1);
      ctx.fillStyle = FLEURS_ISO[H.hash(e.p.id) % FLEURS_ISO.length]; ctx.fillRect(Math.round(x), Math.round(y) - 1, 2, 2);
    }
    // les couronnes des arbres par-dessus, un peu transparentes : on voit ce qui pousse dessous
    ctx.save();
    ctx.globalAlpha = 0.72;
    for (const [c, gx, gy, l, hc] of couronnes) ctx.drawImage(c, gx, gy, l, hc);
    ctx.restore();

    // ce qui est prêt à cueillir : un petit panier qui sautille au-dessus de la plante, et des
    // étincelles qui scintillent dans le feuillage
    for (const [sx, haut, l, h, g] of aCueillir) panierACueillir(ctx, sx, haut, l, h, g, t);

    // petits cœurs pendant un câlin
    if (vue.coeurs && vue.coeurs > t && vue.luigi) {
      const tc = (t % 1500) / 1500, [sx, sy] = proj(vue.ovo.x + 0.5, vue.ovo.y + 0.5);
      for (let i = 0; i < 3; i++) { const u = (tc + i / 3) % 1; dessinerCoeur(ctx, sx - 10 + Math.sin(u * 6 + i) * 8, sy - 38 - u * 28, 1 - u); }
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
      for (const v of H.ciel.lumiere(alt)) { ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha + ")"; ctx.fillRect(0, 0, toile.width, toile.height); }
    }
    // (les gros pixels ont la taille des pixels des plantes : leurs feuilles et leurs fleurs, dessinées
    // selon leur famille, restent lisibles ; avant, un gros pixel en couvrait deux ou trois)
    if (!ctxDest) H.retro.appliquer(toile, Math.max(1, Math.round((z / finPlantes) * H.finesse())));
    if (!ctxDest && (vue.voirZones || vue.outil === "zones")) dessinerZonesIso(ctx, z);
  }
  const PANIER = ["..kkkk..", ".k....k.", "kkkkkkkk", "kAaAaAak", "kaAaAaAk", ".kAaAak.", "..kkkk.."];
  // --- les paniers de la récolte et les pots à repiquer ---------------------------------------
  // Chaque récolte va dans un panier d'osier posé au bord de l'île (un panier par plante, trois
  // récoltes au plus par panier) ; les paniers restent là jusqu'au lendemain (sur cet appareil).
  const jourLocal = () => new Date().toLocaleDateString("sv");
  function paniersIle(ile) { const p = (H.local.paniersIles || {})[ile.id]; return p && p.jour === jourLocal() ? p.liste : []; }
  function mettreAuPanier(ile, pid) {
    H.d.majLocal((l) => {
      const tous = Object.assign({}, l.paniersIles), avant = tous[ile.id] && tous[ile.id].jour === jourLocal() ? tous[ile.id].liste : [];
      const liste = avant.map((x) => Object.assign({}, x)), b = liste.find((x) => x.p === pid && x.n < 3);
      if (b) b.n++; else liste.push({ p: pid, n: 1 });
      tous[ile.id] = { jour: jourLocal(), liste: liste.slice(-10) };
      l.paniersIles = tous;
    });
  }
  // la place du panier n° i : sur le bord de devant, à gauche, l'un à côté de l'autre ; sur une île
  // de forme libre, sur les cases de terre de la côte de devant (la mer juste en dessous)
  function placePanier(ile, i) {
    if (!ile.vides || !Object.keys(ile.vides).length) return [0.6 + i * 1.05, ile.lignes - 0.32];
    const cote = [];
    for (let y = ile.lignes - 1; y >= 0; y--) for (let x = 0; x < ile.cols; x++) if (!estVide(ile, x, y) && estVide(ile, x, y + 1)) cote.push([x, y]);
    if (!cote.length) return [0.6 + i * 1.05, ile.lignes - 0.32];
    const [x, y] = cote[i % cote.length];
    return [x + 0.6, y + 0.68];
  }
  function panierRecolte(ctx, sx, sy, p, n) {
    const x0 = Math.round(sx - 6), y0 = Math.round(sy - 6), px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    const fleur = FLEURS_ISO[H.hash(p.id) % FLEURS_ISO.length], feuille = FEUILLES_PIX[H.hash(p.id) % FEUILLES_PIX.length];
    // la récolte en tas, plus haute avec chaque récolte : des brins verts et des fleurs
    for (let k = 0; k < 8 + n * 7; k++) {
      const u = (H.hash(p.id + "|" + k) % 1000) / 1000, v = (H.hash(k + "|" + p.id) % 1000) / 1000, hx = x0 + 2 + Math.round(u * 8), bombe = 1 - Math.abs(u - 0.5) * 2;
      px(hx, y0 - Math.round(v * (1 + n * 1.3) * bombe), k % 3 === 0 ? fleur : k % 3 === 1 ? feuille : assombrir(feuille, 0.7));
    }
    // l'anse, puis le panier tressé
    for (const [x, y] of [[2, -3], [3, -5], [4, -6], [5, -6], [6, -6], [7, -6], [8, -5], [9, -3]]) px(x0 + x, y0 + y, "#7a4520");
    ["kkkkkkkkkkkk", "kAaAaAaAaAak", "kaAaAaAaAaAk", ".kAaAaAaAak.", ".kkkkkkkkkk."].forEach((l, j) => [...l].forEach((c, i) => { if (c !== ".") px(x0 + i, y0 + j, c === "k" ? "#4b3427" : c === "A" ? "#e9b44c" : "#b9834f"); }));
  }
  // un pot de terre cuite qui flotte au bord de l'île, avec son bébé plante
  function potFlottant(ctx, sx, sy, p, choisi, t, g) {
    const bob = Math.round(Math.sin(t / 700 + g) * 2), x0 = Math.round(sx - 4), y0 = Math.round(sy + bob), px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    // son ombre, très pâle, un peu plus bas
    ctx.fillStyle = "rgba(35,33,74,0.12)"; ctx.fillRect(x0 + 1, Math.round(sy) + 10, 7, 1);
    const bebe = plantePetite(p, 14, 2, false);
    ctx.drawImage(bebe, Math.round(sx - bebe.width / 2), y0 + 1 - bebe.height);
    ["kkkkkkkkk", "kCcCcCcCk", ".kcCcCck.", ".kCcCcCk.", "..kkkkk.."].forEach((l, j) => [...l].forEach((c, i) => { if (c !== ".") px(x0 + i, y0 + j, c === "k" ? "#7a2e1e" : c === "C" ? "#c96a3a" : "#d9824f"); }));
    if (choisi) { ctx.strokeStyle = "#f6ee55"; ctx.lineWidth = 1; ctx.strokeRect(Math.round(sx - 8) + 0.5, y0 - 16 + 0.5, 16, 22); }
  }
  // les pots de la caisse de la serre, qui flottent devant l'angle de devant de l'île, de part et
  // d'autre de la pointe (là où rien ne les cache, ni les plantes ni leurs bulles)
  function potsDeLaCaisse(ile) {
    if (ile.croquis || !H.serre) return [];
    const pots = [];
    for (const [id, n] of H.serre.bebes()) for (let k = 0; k < n && pots.length < 14; k++) pots.push(id);
    return pots.map((id, i) => {
      const a = i % 2 === 0, j = Math.floor(i / 2);
      return { id, x: a ? ile.cols + 0.75 : ile.cols - 0.4 - j * 1.1, y: a ? ile.lignes - 0.4 - j * 1.1 : ile.lignes + 0.75 };
    }).filter((q) => q.x > -0.5 && q.y > -0.5);
  }

  function panierACueillir(ctx, sx, haut, l, h, g, t) {
    const saut = Math.round(Math.abs(Math.sin(t / 260 + g)) * 4), x0 = Math.round(sx - 4), y0 = Math.round(haut - 12 - saut);
    const couleurs = { k: "#23214a", A: "#e9b44c", a: "#b9834f" };
    PANIER.forEach((ligne, j) => [...ligne].forEach((ch, i) => { if (couleurs[ch]) { ctx.fillStyle = couleurs[ch]; ctx.fillRect(x0 + i, y0 + j, 1, 1); } }));
    // une petite flèche rose dessous, qui pointe vers la plante
    ctx.fillStyle = "#ff2e9a"; ctx.fillRect(x0 + 3, y0 + 8, 2, 2); ctx.fillRect(x0 + 2, y0 + 8, 4, 1);
    // les étincelles
    for (let k = 0; k < 4; k++) {
      const u = Math.sin(t / 300 + g + k * 1.7);
      if (u < 0.3) continue;
      const ex = Math.round(sx + (H.hash(g + "|" + k) % 100 / 100 - 0.5) * l * 0.9), ey = Math.round(haut + (H.hash(k + "|" + g) % 100 / 100) * h * 0.8);
      ctx.fillStyle = u > 0.8 ? "#ffffff" : "#f6ee55";
      ctx.fillRect(ex, ey - 1, 1, 3); ctx.fillRect(ex - 1, ey, 3, 1);
    }
  }

  // les zones de mi-ombre et d'ombre, en relief : hachures dans les losanges (l'ombre des arbres
  // comprise), liseré jaune là où l'exposition change
  function dessinerZonesIso(ctx, z) {
    const ile = vue.ile;
    ctx.save();
    aplat(ctx, z);
    for (let y = 0; y < ile.lignes; y++) for (let x = 0; x < ile.cols; x++) {
      if (estVide(ile, x, y)) continue;
      const expo = expoIci(ile, x, y);
      if (expo !== "Plein soleil") {
        ctx.save();
        ctx.beginPath(); ctx.rect(x * T, y * T, T, T); ctx.clip();
        ctx.strokeStyle = "#1b1d4a"; ctx.lineWidth = 2;
        const pas = expo === "Ombre" ? 6 : 12;
        ctx.beginPath();
        for (let d = -T; d < T; d += pas) { ctx.moveTo(x * T + d, y * T); ctx.lineTo(x * T + d + T, y * T + T); }
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = "#ffe14d";
      if (x + 1 < ile.cols && expoIci(ile, x + 1, y) !== expo) ctx.fillRect((x + 1) * T - 1.5, y * T, 3, T);
      if (y + 1 < ile.lignes && expoIci(ile, x, y + 1) !== expo) ctx.fillRect(x * T, (y + 1) * T - 1.5, T, 3);
    }
    ctx.restore();
  }

  function rayonPlante(p, ile) {
    const esp = nombre((p.valeurs || {}).espacement);
    if (!esp) return 0.5;
    return Math.max(0.45, esp / 2 / ile.caseM);
  }

  function dessiner(ctxDest, sansNuit) {
    if (vue.iso) return dessinerIso(ctxDest, sansNuit);
    const ile = vue.ile;
    const toile = vue.toile;
    const ctx = ctxDest || toile.getContext("2d");
    const k = T * vue.zoom * vue.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(vue.fond, 0, 0);
    ctx.setTransform(k / T, 0, 0, k / T, vue.bx * k, vue.by * k);
    dessinerCalqueEtTrace(ctx);

    // en repiquant une plante de la caisse : les cases libres où elle se plairait
    if (vue.outil === "planter" && vue.depuisSerre && vue.plante && !ile.croquis) {
      const p = H.d.plante(vue.plante);
      if (p) {
        if (!vue.casesBonnes || vue.casesBonnes.id !== p.id || vue.casesBonnes.le < performance.now() - 1500) vue.casesBonnes = { id: p.id, le: performance.now(), cases: new Set(casesQuiConviennent(ile, p)) };
        ctx.fillStyle = "rgba(157,255,0,0.22)";
        for (const k2 of vue.casesBonnes.cases) { const [x, y] = k2.split(",").map(Number); ctx.fillRect(x * T + 1, y * T + 1, T - 2, T - 2); }
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

    // les paniers de la récolte du jour sur le bord de devant, et les pots à repiquer qui flottent
    // devant l'angle de devant (comme en relief)
    paniersIle(ile).forEach((b, i) => {
      const q = H.d.plante(b.p), [bx, by] = placePanier(ile, i);
      if (q) { ctx.save(); ctx.translate(Math.round(bx * T), Math.round(by * T)); ctx.scale(2, 2); panierRecolte(ctx, 0, 0, q, b.n); ctx.restore(); }
    });
    vue.potsOiseau = [];
    potsDeLaCaisse(ile).forEach((q, i) => {
      const pq = H.d.plante(q.id);
      if (!pq) return;
      vue.potsOiseau.push(q);
      ctx.save(); ctx.translate(Math.round(q.x * T), Math.round(q.y * T)); ctx.scale(1.7, 1.7); potFlottant(ctx, 0, 0, pq, vue.outil === "planter" && vue.depuisSerre && vue.plante === q.id, performance.now(), i); ctx.restore();
    });

    // Lóló et Mémé sur leur île
    if (ile.secrete) {
      const maintenant = performance.now();
      const pos = vue.lolo && vue.lolo.course ? H.sons.position(vue.lolo.course, maintenant) : null;
      const visible = !vue.lolo || (vue.lolo.course && pos);
      const galope = !!(pos && pos.enCourse);
      if (ile.mare) dessinerMare(ctx, ile, maintenant);
      const place = ile.lolo || { x: ile.cols / 2, y: ile.lignes / 2 + 0.6 };
      const lx = pos ? pos.x : place.x;
      const image = galope ? Math.floor(maintenant / 90) % 4 : Math.floor(maintenant / 700) % 2;
      if (visible) H.pixel.dessiner(ctx, galope ? "loloGalop" : H.memeDehors && H.memeDehors() ? "loloSansMeme" : "lolo", lx * T, place.y * T - (galope && image % 2 ? 2 : 0), 2, image);
      if (visible && !galope && Math.floor(maintenant / 1400) % 2) {
        ctx.font = "10px 'Suez One', serif";
        ctx.fillStyle = "#ff2e9a";
        ctx.fillText("rrr", (place.x + 0.4) * T, (place.y - 1.9) * T);
      }
    }

    // les animaux et les insectes (ceux du bassin de Lóló et Mémé, et ceux emmenés par ƟvƟ)
    if (ile.mare || (ile.animaux && ile.animaux.length)) dessinerAnimaux(ctx, ile, performance.now());
    // personnages
    const enCalin = vue.calin && vue.luigi && !vue.luigi.cible;
    if ((!ile.croquis || vue.ovo.cible) && !enCalin) {
      const o = vue.ovo;
      const marche = o.cible ? Math.floor(performance.now() / 160) % 2 : 0;
      H.pixel.dessiner(ctx, "ovo", (o.x + 0.5) * T, (o.y + 0.9) * T - (marche ? 1 : 0), 1.5, marche);
      // pendant le tour en hongrois, Mesi marche à côté d'ƟvƟ
      if (vue.hongrois) {
        const mm = vue.mesiSuit || (vue.mesiSuit = { x: o.x - 1, y: o.y });
        mm.x += (o.x - 0.9 - mm.x) * 0.08;
        mm.y += (o.y - mm.y) * 0.08;
        H.pixel.dessiner(ctx, "luigi", (mm.x + 0.5) * T, (mm.y + 0.9) * T, 1.5, marche);
      }
    }
    if (vue.loloVisite && vue.loloVisite.course) {
      const l = vue.loloVisite;
      const pos = H.sons.position(l.course, performance.now());
      if (pos) {
        const image = pos.enCourse ? Math.floor(performance.now() / 90) % 4 : Math.floor(performance.now() / 700) % 2;
        H.pixel.dessiner(ctx, pos.enCourse ? "loloGalop" : H.memeDehors && H.memeDehors() ? "loloSansMeme" : "lolo", (pos.x + 0.5) * T, (l.y + 0.9) * T - (pos.enCourse && image % 2 ? 2 : 0), 2, image);
      }
    }
    if (vue.luigi && !enCalin) {
      const l = vue.luigi;
      const marche = l.cible ? Math.floor(performance.now() / 170) % 2 : 0;
      H.pixel.dessiner(ctx, "luigi", (l.x + 0.5) * T, (l.y + 0.9) * T - (marche ? 1 : 0), 1.5, marche);
    }
    if (enCalin) dessinerCalin(ctx, T);

    // petits cœurs pendant un câlin
    if (vue.coeurs && vue.coeurs > performance.now() && vue.luigi) {
      const tc = (performance.now() % 1500) / 1500;
      const cx = (vue.ovo.x + 0.5) * T - 10, cy = (vue.ovo.y - 0.3) * T;
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
    // les gros pixels aux couleurs des pochettes
    if (!ctxDest) H.retro.appliquer(toile, H.retro.taillePour(2.5));
    // les zones par-dessus les gros pixels (sinon le voile léger disparaît dans la palette)
    if (!ctxDest && (vue.voirZones || vue.outil === "zones")) dessinerZones(ctx, k);
  }

  // Mi-ombre : hachures espacées ; ombre : hachures serrées ; un liseré jaune là où l'exposition change
  function dessinerZones(ctx, k) {
    const ile = vue.ile;
    const px = Math.max(1, Math.round(k / 12));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, vue.bx * k, vue.by * k);
    for (let y = 0; y < ile.lignes; y++) {
      for (let x = 0; x < ile.cols; x++) {
        if (estVide(ile, x, y)) continue;
        // (l'exposition vraie : celle qu'on a peinte, et l'ombre des arbres, comme en relief)
        const expo = expoIci(ile, x, y);
        const x0 = Math.round(x * k), y0 = Math.round(y * k), w = Math.round((x + 1) * k) - x0, h = Math.round((y + 1) * k) - y0;
        if (expo !== "Plein soleil") {
          const pas = expo === "Ombre" ? 3 * px : 6 * px;
          ctx.fillStyle = "#1b1d4a";
          ctx.beginPath();
          ctx.rect(x0, y0, w, h);
          ctx.save();
          ctx.clip();
          // diagonales en escalier, pixel par pixel
          for (let d = -h; d < w; d += pas) for (let i = 0; i < h; i += px) ctx.fillRect(x0 + d + i, y0 + i, px, px);
          ctx.restore();
        }
        ctx.fillStyle = "#ffe14d";
        const autre = (xx, yy) => xx >= 0 && yy >= 0 && xx < ile.cols && yy < ile.lignes && expoIci(ile, xx, yy) !== expo;
        if (autre(x + 1, y)) ctx.fillRect(x0 + w - px, y0, px, h);
        if (autre(x, y + 1)) ctx.fillRect(x0, y0 + h - px, w, px);
      }
    }
    ctx.restore();
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
      [11, 70, 20, nuitCiel ? "#3a3d62" : "#8fb2d8"],
      [23, 72, 28, nuitCiel ? "#555470" : "#c9d7e6"],
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
      m ? m.temperature + " °C, " + m.libelle : null,
      s.saison,
      H.ciel.nomPhase(s.lune.phase),
      heures.lever ? "soleil " + H.heure(heures.lever) + " – " + H.heure(heures.coucher) : null,
    ].filter(Boolean).join(" · ");
  }

  // --- interaction ---------------------------------------------------------------------
  function caseCliquee(e) {
    const rect = vue.toile.getBoundingClientRect();
    if (vue.iso) {
      const lx = (e.clientX - rect.left) / vue.zoom, ly = (e.clientY - rect.top) / vue.zoom;
      // d'abord les grandes plantes (on touche leur feuillage), de la plus proche à la plus lointaine
      const grande = (vue.boites || []).filter((b) => b.grande && lx >= b.g && lx <= b.d && ly >= b.h && ly <= b.b).sort((a, b) => b.prof - a.prof)[0];
      if (grande) return { x: grande.x, y: grande.y };
      const [fx, fy] = versCase(lx, ly), x = Math.floor(fx), y = Math.floor(fy);
      return dansOuAuBord(x, y);
    }
    const k = T * vue.zoom;
    const x = Math.floor((e.clientX - rect.left) / k - vue.bx);
    const y = Math.floor((e.clientY - rect.top) / k - vue.by);
    return dansOuAuBord(x, y);
  }
  // (avec l'outil de la forme, on peut cliquer juste au-delà du bord, pour agrandir l'île)
  function dansOuAuBord(x, y) {
    const ile = vue.ile, forme = vue.outil === "forme" && (vue.formeMode || "ajouter") === "ajouter";
    if (x < 0 || y < 0 || x >= ile.cols || y >= ile.lignes) return forme && x >= -1 && y >= -1 && x <= ile.cols && y <= ile.lignes ? { x, y } : null;
    return { x, y };
  }

  // La petite bulle d'une plante : son aperçu (sa photo, son dessin ou le dessin automatique),
  // son nom et où elle en est. Sur téléphone, elle s'affiche au toucher et s'efface toute seule.
  const apercus = new Map();
  function apercuPlante(p) {
    const photo = H.photos && H.photos.vignette(p, 160);
    if (photo) return photo;
    if (dessinMain(p)) return dessinMain(p);
    if (!apercus.has(p.id)) apercus.set(p.id, dessinAuto(p));
    return apercus.get(p.id);
  }
  let bulle = null, minuteurBulle = null;
  function cacherBulle() {
    clearTimeout(minuteurBulle);
    if (bulle) bulle.hidden = true;
  }
  // le pot à repiquer ou le panier de récolte sous le pointeur (au bord de l'île), dans les deux vues
  function bordTouche(e) {
    const rect = vue.toile.getBoundingClientRect(), ile = vue.ile;
    if (vue.iso) {
      const lx = (e.clientX - rect.left) / vue.zoom, ly = (e.clientY - rect.top) / vue.zoom;
      return {
        pot: (vue.potsFlottants || []).find((q) => lx >= q.g && lx <= q.d && ly >= q.h && ly <= q.b),
        b: paniersIle(ile).find((x, i) => { const [bx, by] = proj(...placePanier(ile, i)); return Math.abs(lx - bx) < 14 && ly > by - 26 && ly < by + 4; }),
      };
    }
    // (en vue d'oiseau, en cases : le pot avec sa plantule au-dessus, le panier avec son anse)
    const fx = (e.clientX - rect.left) / (T * vue.zoom) - vue.bx, fy = (e.clientY - rect.top) / (T * vue.zoom) - vue.by;
    return {
      pot: (vue.potsOiseau || []).find((q) => Math.abs(fx - q.x) < 0.5 && fy > q.y - 1 && fy < q.y + 0.45),
      b: paniersIle(ile).find((x, i) => { const [bx, by] = placePanier(ile, i); return Math.abs(fx - bx) < 0.45 && fy > by - 0.85 && fy < by + 0.15; }),
    };
  }
  function montrerBulle(e, duree) {
    const { pot, b } = bordTouche(e);
    const c = pot || b ? null : caseCliquee(e);
    const pl = c && (vue.ile.plantes || {})[cle(c.x, c.y)];
    const p = pl ? H.d.plante(pl.p) : pot ? H.d.plante(pot.id) : b ? H.d.plante(b.p) : null;
    if (!p) return cacherBulle();
    if (!bulle) {
      bulle = H.el("div.bulle-plante", { role: "tooltip", hidden: true });
      document.body.appendChild(bulle);
    }
    let etat;
    if (pot) {
      const n = potsDeLaCaisse(vue.ile).filter((q) => q.id === pot.id).length;
      etat = (n > 1 ? n + " bébés" : "Un bébé") + " à repiquer, de la caisse de la serre";
    } else if (b) etat = "Dans le panier : " + (b.n > 1 ? b.n + " récoltes" : "une récolte") + ", déjà parties au labo";
    else {
      const st = stade(vue.ile, pl);
      etat = vue.ile.croquis ? null : NOMS_STADES[st] + (fleurie(p, vue.ile, pl) ? ", en fleur" : "") + (aRecolter(p, vue.ile, pl) ? ", à récolter" : "");
    }
    const cleBulle = p.id + "|" + etat;
    if (bulle.dataset.cle !== cleBulle) {
      bulle.dataset.cle = cleBulle;
      bulle.innerHTML = "";
      bulle.append(...[
        H.el("img", { src: apercuPlante(p), alt: "" }),
        H.el("span.nom-bulle", null, p.nom),
        p.latin ? H.el("em.latin-bulle", null, p.latin) : null,
        etat ? H.el("span.etat-bulle", null, etat) : null
      ].filter(Boolean));
    }
    bulle.hidden = false;
    // à côté du doigt ou du pointeur, sans sortir de l'écran
    const l = bulle.offsetWidth, h = bulle.offsetHeight;
    let x = e.clientX + 16, y = e.clientY + 16;
    if (x + l > window.innerWidth - 8) x = e.clientX - l - 16;
    if (y + h > window.innerHeight - 8) y = e.clientY - h - 16;
    bulle.style.left = Math.max(8, x) + "px";
    bulle.style.top = Math.max(8, y) + "px";
    clearTimeout(minuteurBulle);
    if (duree) minuteurBulle = setTimeout(cacherBulle, duree);
  }

  function clic(e) {
    // d'abord les pots à repiquer et les paniers de la récolte, au bord de l'île
    const { pot, b } = bordTouche(e);
    if (pot) {
      const q = H.d.plante(pot.id);
      vue.plante = pot.id; vue.depuisSerre = true; vue.outil = "planter";
      dessinerOutils(); dessiner();
      if (q) H.toast("Clique sur une case pour y repiquer " + H.leNom(q) + " (en vert, là où elle se plairait).");
      return;
    }
    if (b) { const q = H.d.plante(b.p); if (q) H.toast("Dans ce panier : " + (b.n > 1 ? b.n + " récoltes" : "une récolte") + " " + H.duNom(q) + ", déjà parties au labo."); return; }
    const c = caseCliquee(e);
    if (!c) return;
    if (vue.pointeur && vue.pointeur !== "mouse") montrerBulle(e, 2600);
    if (vue.hongrois && montrerDuDoigt(e, c)) return;
    // Lóló et Mémé
    if (vue.ile.secrete && Math.abs(c.x + 0.5 - vue.ile.cols / 2) < 2.5 && c.y - vue.ile.lignes / 2 > -3 && c.y - vue.ile.lignes / 2 < 1) {
      if (!H.$(".dialogue")) H.lolo.parler(vue.ile);
      return;
    }
    if (vue.outil === "forme") return;
    if (estVide(vue.ile, c.x, c.y)) return;
    marcherVers(c.x, c.y, () => agir(c.x, c.y));
  }

  // Le tour en hongrois avec Mesi : ƟvƟ marche jusqu'à une plante ou un animal, la montre du
  // doigt, et Mesi lui dit son nom en hongrois.
  function montrerDuDoigt(e, c) {
    const rect = vue.toile.getBoundingClientRect(), k = T * vue.zoom;
    let fx = (e.clientX - rect.left) / k - vue.bx, fy = (e.clientY - rect.top) / k - vue.by;
    if (vue.iso) [fx, fy] = versCase((e.clientX - rect.left) / vue.zoom, (e.clientY - rect.top) / vue.zoom);
    const dire = (francais, hongrois) => H.dialogue.dire([
      { qui: "ovo", texte: H.histoires.auHasard(["Et ça ? (ƟvƟ montre du doigt.)", "Comment on dit, ça ?", "Et celui-là ?"]) },
      { qui: "luigi", texte: "« " + hongrois + " ». En français : " + francais + "." },
    ]);
    // un animal près du doigt ?
    const bete = animaux(vue.ile, performance.now()).map((a) => Object.assign(a, { d: Math.hypot(a.x - fx, a.y - fy) })).sort((a, b) => a.d - b.d)[0];
    if (bete && bete.d < 0.9) {
      marcherVers(Math.round(bete.x), Math.round(bete.y), () => dire(NOMS_ANIMAUX[bete.type], HONGROIS_ANIMAUX[bete.type]));
      return true;
    }
    // Lóló et Mémé
    const place = vue.ile.lolo || { x: vue.ile.cols / 2, y: vue.ile.lignes / 2 + 0.6 };
    if (vue.ile.secrete && Math.abs(fx - place.x) < 1.6 && fy > place.y - 2.5 && fy < place.y + 0.5) {
      marcherVers(Math.round(place.x) + 1, Math.round(place.y) - 1, () => H.dialogue.dire([
        { qui: "ovo", texte: "Et Lóló et Mémé ?" },
        { qui: "luigi", texte: "Lóló, c’est un « ló » : un cheval." },
        { qui: "luigi", texte: "Et Mémé… ce n’est pas un mot à traduire. C’est un surnom : c’est comme ça que mon papa m’appelait." },
        { qui: "lolo", texte: "Hiii ! Ló ! J’adore." },
      ]));
      return true;
    }
    // une plante ?
    const pl = (vue.ile.plantes || {})[cle(c.x, c.y)];
    const p = pl && H.d.plante(pl.p);
    if (p) {
      const hu = H.hongrois && H.hongrois.plante(p);
      marcherVers(c.x, c.y, () => (hu ? dire(H.leNom(p), hu) : H.dialogue.dire([{ qui: "luigi", texte: "Celle-là… je ne connais pas son nom hongrois. On demandera à Mamie !" }])));
      return true;
    }
    return false;
  }
  // emmener un canard, une grenouille, un papillon ou une libellule sur une de ses îles
  function emmenerAnimal(depuis) {
    const mesIles = iles().filter((i) => !i.secrete && !i.supprime);
    if (!mesIles.length) return H.toast("Crée d’abord une île à toi.");
    let fermer;
    const type = H.el("select", null, Object.entries(NOMS_ANIMAUX).map(([id, nom]) => H.el("option", { value: id }, nom.replace(/^(le |la |l’)/, ""))));
    const vers = H.el("select", null, mesIles.map((i) => H.el("option", { value: i.id }, i.nom)));
    const corps = H.el("div", null,
      H.el("h2", null, "Emmener un animal"),
      H.el("p.discret", null, "Les canards et les grenouilles vont près de l’eau (s’il y a une mare sur l’île), les papillons et les libellules volettent partout."),
      H.el("label", null, "Quel animal ? ", type),
      H.el("p", null, H.el("label", null, "Sur quelle île ? ", vers)),
      H.el("div.boutons-bas", null, H.el("button.bouton", {
        type: "button",
        onclick() {
          const cible = (H.jeu.iles || {})[vers.value];
          if (!cible) return;
          const eau = Object.entries(cible.cases || {}).filter(([, c]) => c.t === "eau").map(([k2]) => k2.split(",").map(Number));
          const pres = (type.value === "canard" || type.value === "grenouille") && eau.length;
          const [x, y] = pres ? eau[Math.floor(Math.random() * eau.length)] : [Math.floor(Math.random() * cible.cols), Math.floor(Math.random() * cible.lignes)];
          cible.animaux = (cible.animaux || []).concat([{ id: H.uid("animal"), type: type.value, x: x + 0.5, y: y + 0.5, graine: Math.floor(Math.random() * 1000) }]);
          sauver(cible);
          fermer();
          H.toast(NOMS_ANIMAUX[type.value].replace(/^./, (c2) => c2.toUpperCase()) + " part vivre sur « " + cible.nom + " » !");
        },
      }, "Emmener")));
    fermer = H.fenetre(corps);
  }
  function finirTourHongrois() {
    vue.hongrois = false;
    // à la fin du tour, Mesi repart à pied par le bord de l'île
    if (vue.mesiSuit) vue.luigi = { x: vue.mesiSuit.x, y: vue.mesiSuit.y, cible: { x: -2, y: Math.round(vue.mesiSuit.y), partir: true } };
    vue.mesiSuit = null;
    dessinerOutils && dessinerOutils();
    H.dialogue.dire([{ qui: "luigi", texte: "Köszönöm, ƟvƟ ! Merci pour la balade. Szia !" }]);
    if (vue.boutonHongrois) vue.boutonHongrois.hidden = true;
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
    vue.ovo.file.push({ cible: { x, y: estVide(vue.ile, x, y + 1) ? y : y + 1 }, ensuite });
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

  // Décaler toute l'île de dx, dy cases (pour l'agrandir par la gauche ou par le haut, ou la
  // resserrer) : ses cases, ses plantes, ses trous, ses animaux, et ƟvƟ
  function decaler(ile, dx, dy) {
    const bouger = (obj) => {
      const neuf = {};
      for (const [k, v] of Object.entries(obj || {})) {
        const [x, y] = k.split(",").map(Number), nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0) neuf[cle(nx, ny)] = v;
      }
      return neuf;
    };
    ile.cases = bouger(ile.cases); ile.plantes = bouger(ile.plantes); ile.vides = bouger(ile.vides);
    for (const a of ile.animaux || []) { a.x += dx; a.y += dy; }
    ile.cols = Math.max(1, ile.cols + dx); ile.lignes = Math.max(1, ile.lignes + dy);
    if (vue && vue.ile === ile) {
      vue.ovo.x += dx; vue.ovo.y += dy; if (vue.ovo.cible) { vue.ovo.cible.x += dx; vue.ovo.cible.y += dy; }
      if (vue.calque) { vue.calque.x += dx; vue.calque.y += dy; vue.calqueBouge = true; }
    }
  }
  // ajouter la case x, y (qui peut être juste au-delà du bord : l'île s'agrandit, et la nouvelle
  // rangée reste vide sauf cette case)
  function agrandir(ile, x, y) {
    ile.vides = Object.assign({}, ile.vides);
    if (x < 0 || y < 0) {
      const dx = Math.max(0, -x), dy = Math.max(0, -y);
      decaler(ile, dx, dy);
      for (let j = 0; j < ile.lignes; j++) for (let i = 0; i < ile.cols; i++) if (i < dx || j < dy) ile.vides[cle(i, j)] = 1;
      x += dx; y += dy;
    }
    while (x >= ile.cols) { for (let j = 0; j < ile.lignes; j++) ile.vides[cle(ile.cols, j)] = 1; ile.cols++; }
    while (y >= ile.lignes) { for (let i = 0; i < ile.cols; i++) ile.vides[cle(i, ile.lignes)] = 1; ile.lignes++; }
    delete ile.vides[cle(x, y)];
    majTaille(ile);
  }
  // --- dessiner la forme : le pinceau, le contour tracé à main levée, le dessin à décalquer -----
  // ce qu'il faut pour revenir en arrière (la forme, ses cases, ses plantes, ses animaux)
  const copieForme = (ile) => JSON.parse(JSON.stringify({ cols: ile.cols, lignes: ile.lignes, vides: ile.vides || {}, cases: ile.cases || {}, plantes: ile.plantes || {}, animaux: ile.animaux || [], largeur: ile.largeur, longueur: ile.longueur }));
  function memoriserForme() {
    vue.formesAvant = (vue.formesAvant || []).concat([copieForme(vue.ile)]).slice(-12);
  }
  function annulerForme() {
    const avant = (vue.formesAvant || []).pop();
    if (!avant) return;
    const ile = vue.ile, dx = 0;
    Object.assign(ile, avant);
    sauver(ile); dimensionner(); peindreFond(); dessinerOutils(); dessiner();
  }
  // la position d'un point sous le doigt, en cases (avec la virgule)
  function caseFine(e) {
    const rect = vue.toile.getBoundingClientRect();
    if (vue.iso) return versCase((e.clientX - rect.left) / vue.zoom, (e.clientY - rect.top) / vue.zoom);
    const k = T * vue.zoom;
    return [(e.clientX - rect.left) / k - vue.bx, (e.clientY - rect.top) / k - vue.by];
  }
  // un coup de pinceau : un carré de cases sous le doigt, qu'on ajoute ou qu'on enlève
  function coupDePinceau(fx, fy) {
    const ile = vue.ile, r = (vue.pinceau || 1) - 1, ajoute = (vue.formeMode || "ajouter") === "ajouter";
    let change = false;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) + Math.abs(dy) > r * 1.5) continue;
      let x = Math.floor(fx) + dx, y = Math.floor(fy) + dy;
      if (ajoute) {
        if (!estVide(ile, x, y)) continue;
        const avantX = ile.cols, decX = x < 0 ? -x : 0, decY = y < 0 ? -y : 0;
        agrandir(ile, x, y);
        // (si l'île s'est décalée, les cases suivantes du même coup se décalent aussi)
        if (decX || decY) { fx += decX; fy += decY; }
        change = true;
      } else {
        if (estVide(ile, x, y) || (ile.plantes || {})[cle(x, y)]) continue;
        ile.vides = Object.assign({}, ile.vides, { [cle(x, y)]: 1 });
        change = true;
      }
    }
    return change;
  }
  // le contour tracé à main levée : les cases dont le centre est dedans deviennent la terre, les
  // autres la mer ; l'île prend l'emprise du contour (les plantes restent, sur leur case de terre)
  function appliquerContour(trace) {
    const ile = vue.ile;
    const dedans = (x, y) => { let c = false; for (let i = 0, j = trace.length - 1; i < trace.length; j = i++) { const [xi, yi] = trace[i], [xj, yj] = trace[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
    const xs = trace.map((q) => q[0]), ys = trace.map((q) => q[1]);
    const terre = new Set();
    for (let y = Math.floor(Math.min(...ys)); y <= Math.ceil(Math.max(...ys)); y++) for (let x = Math.floor(Math.min(...xs)); x <= Math.ceil(Math.max(...xs)); x++) if (dedans(x + 0.5, y + 0.5)) terre.add(x + "," + y);
    for (const k of Object.keys(ile.plantes || {})) terre.add(k);
    if (terre.size < 1) return false;
    const pts = [...terre].map((k) => k.split(",").map(Number));
    const x0 = Math.min(...pts.map((q) => q[0])), y0 = Math.min(...pts.map((q) => q[1])), x1 = Math.max(...pts.map((q) => q[0])), y1 = Math.max(...pts.map((q) => q[1]));
    decaler(ile, -x0, -y0);
    ile.cols = x1 - x0 + 1; ile.lignes = y1 - y0 + 1;
    const vides = {};
    for (let y = 0; y < ile.lignes; y++) for (let x = 0; x < ile.cols; x++) if (!terre.has((x + x0) + "," + (y + y0))) vides[cle(x, y)] = 1;
    ile.vides = vides;
    majTaille(ile);
    return true;
  }
  // les gestes de l'outil de la forme sur la toile : peindre en glissant, tracer un contour, déplacer le dessin
  function brancherGestesForme(toile) {
    let geste = null, repeint = 0;
    const repeindreBientot = (fort) => {
      const t = performance.now();
      if (!fort && t - repeint < 140) return;
      repeint = t;
      dimensionner(); peindreFond(); dessiner();
    };
    toile.addEventListener("pointerdown", (e) => {
      if (!vue || vue.outil !== "forme" || vue.ile.secrete) return;
      const mode = vue.formeMode || "ajouter";
      if (mode === "deplacer" && !vue.calque) return;
      e.preventDefault();
      toile.setPointerCapture(e.pointerId);
      const [fx, fy] = caseFine(e);
      geste = { mode, dernier: [fx, fy], bouge: false };
      if (mode === "contour") { vue.trace = [[fx, fy]]; dessiner(); }
      else if (mode === "ajouter" || mode === "enlever") { memoriserForme(); if (coupDePinceau(fx, fy)) repeindreBientot(true); }
    });
    toile.addEventListener("pointermove", (e) => {
      if (!geste) return;
      const [fx, fy] = caseFine(e), [ax, ay] = geste.dernier;
      if (Math.hypot(fx - ax, fy - ay) < 0.2) return;
      geste.bouge = true;
      if (geste.mode === "contour") { vue.trace.push([fx, fy]); geste.dernier = [fx, fy]; dessiner(); return; }
      if (geste.mode === "deplacer") { vue.calque.x += fx - ax; vue.calque.y += fy - ay; geste.dernier = [fx, fy]; dessiner(); return; }
      // (entre deux positions, on peint aussi les cases traversées)
      const n = Math.ceil(Math.hypot(fx - ax, fy - ay) / 0.5);
      let change = false;
      for (let i = 1; i <= n; i++) change = coupDePinceau(ax + ((fx - ax) * i) / n, ay + ((fy - ay) * i) / n) || change;
      geste.dernier = caseFine(e);
      if (change) repeindreBientot();
    });
    const fin = () => {
      if (!geste) return;
      const g = geste;
      geste = null;
      vue.ignorerClic = true;
      setTimeout(() => vue && (vue.ignorerClic = false), 50);
      if (g.mode === "contour") {
        const trace = vue.trace || [];
        vue.trace = null;
        if (trace.length > 6) { memoriserForme(); if (appliquerContour(trace)) { sauver(vue.ile); H.bruit("plante"); } }
        dimensionner(); peindreFond(); dessinerOutils(); dessiner();
        return;
      }
      if (g.mode === "deplacer") { garderCalque(); return; }
      rogner(vue.ile);
      sauver(vue.ile);
      if (vue.calqueBouge) garderCalque();
      vue.casesBonnes = null;
      repeindreBientot(true);
      dessinerOutils();
    };
    toile.addEventListener("pointerup", fin);
    toile.addEventListener("pointercancel", fin);
  }
  // le dessin à décalquer : une image (la photo d'un plan fait à la main), posée en transparence sur
  // l'île, en cases ; gardée sur cet appareil seulement
  const reglagesCalque = (ile) => ((H.local.calques || {})[ile.id]) || null;
  function garderCalque() {
    const c = vue.calque, id = vue.ile.id;
    vue.calqueBouge = false;
    H.d.majLocal((l) => { l.calques = Object.assign({}, l.calques); l.calques[id] = c ? { x: c.x, y: c.y, l: c.l, opacite: c.opacite } : undefined; if (!c) delete l.calques[id]; });
  }
  async function chargerCalque(ile) {
    const r = reglagesCalque(ile);
    if (!r) return;
    const url = await H.kv.lire("calque:" + ile.id).catch(() => null);
    if (!url || !vue || vue.ile !== ile) return;
    const img = new Image();
    img.onload = () => { if (vue && vue.ile === ile) { vue.calque = Object.assign({ img }, r); dessinerOutils(); dessiner(); } };
    img.src = url;
  }
  function importerCalque() {
    const inp = H.el("input", { type: "file", accept: "image/*" });
    inp.onchange = async () => {
      const f = inp.files[0];
      if (!f) return;
      const bmp = await createImageBitmap(f).catch(() => null);
      if (!bmp) return H.toast("Cette image ne s’ouvre pas");
      const k = Math.min(1, 1400 / Math.max(bmp.width, bmp.height)), c = H.el("canvas", { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
      c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      const url = c.toDataURL("image/jpeg", 0.85), ile = vue.ile;
      await H.kv.ecrire("calque:" + ile.id, url);
      const img = new Image();
      img.onload = () => {
        const l = Math.max(ile.cols, ile.lignes);
        vue.calque = { img, x: 0, y: 0, l, opacite: 0.5 };
        garderCalque();
        vue.formeMode = "contour";
        dessinerOutils(); dessiner();
        H.toast("Fais le tour de ton dessin d’un seul trait : l’île prendra sa forme.");
      };
      img.src = url;
    };
    inp.click();
  }
  function retirerCalque() {
    vue.calque = null;
    garderCalque();
    dessinerOutils(); dessiner();
  }
  // dessiné à plat, dans le repère des cases (une case = T), en relief comme en vue d'oiseau
  function dessinerCalqueEtTrace(ctx) {
    const c = vue.calque;
    if (c && c.img && vue.outil === "forme") {
      ctx.save();
      ctx.globalAlpha = c.opacite;
      ctx.drawImage(c.img, c.x * T, c.y * T, c.l * T, (c.l * T * c.img.height) / c.img.width);
      ctx.restore();
    }
    if (vue.trace && vue.trace.length > 1) {
      ctx.save();
      ctx.strokeStyle = "#ff2e9a"; ctx.lineWidth = T * 0.12; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath();
      vue.trace.forEach(([x, y], i) => (i ? ctx.lineTo(x * T, y * T) : ctx.moveTo(x * T, y * T)));
      ctx.stroke();
      ctx.restore();
    }
  }

  // les rangées et les colonnes du bord devenues entièrement vides disparaissent
  function rogner(ile) {
    const ligneVide = (j) => { for (let i = 0; i < ile.cols; i++) if (!estVide(ile, i, j)) return false; return true; };
    const colVide = (i) => { for (let j = 0; j < ile.lignes; j++) if (!estVide(ile, i, j)) return false; return true; };
    while (ile.lignes > 1 && ligneVide(0)) decaler(ile, 0, -1);
    while (ile.cols > 1 && colVide(0)) decaler(ile, -1, 0);
    while (ile.lignes > 1 && ligneVide(ile.lignes - 1)) { for (let i = 0; i < ile.cols; i++) delete ile.vides[cle(i, ile.lignes - 1)]; ile.lignes--; }
    while (ile.cols > 1 && colVide(ile.cols - 1)) { for (let j = 0; j < ile.lignes; j++) delete ile.vides[cle(ile.cols - 1, j)]; ile.cols--; }
    majTaille(ile);
  }
  // les mesures de l'île (en mètres) suivent sa nouvelle emprise
  function majTaille(ile) {
    ile.largeur = Math.round(ile.cols * ile.caseM * 10) / 10;
    ile.longueur = Math.round(ile.lignes * ile.caseM * 10) / 10;
    const ech = vue && vue.echelle;
    if (ech) ech.textContent = texteEchelle(ile);
  }

  function agir(x, y) {
    const ile = vue.ile;
    const k = cle(x, y);
    const pl = (ile.plantes || {})[k];
    const libre = (txt) => H.toast(txt);
    if (vue.outil !== "forme" && estVide(ile, x, y)) return;
    switch (vue.outil) {
      case "regarder":
        if (pl) inspecter(x, y);
        else montrerCase(x, y);
        break;
      case "forme": {
        if (ile.secrete) return;
        if ((vue.formeMode || "ajouter") === "enlever") {
          if (estVide(ile, x, y)) return;
          if (pl) return libre("Il y a une plante ici : retire-la d’abord.");
          let reste = 0;
          for (let j = 0; j < ile.lignes; j++) for (let i = 0; i < ile.cols; i++) if (!estVide(ile, i, j)) reste++;
          if (reste <= 1) return libre("Il faut bien garder un peu de terre !");
          ile.vides = Object.assign({}, ile.vides, { [k]: 1 });
          if (ile.cases && ile.cases[k]) { ile.cases = Object.assign({}, ile.cases); delete ile.cases[k]; }
          rogner(ile);
        } else {
          if (!estVide(ile, x, y)) return;
          agrandir(ile, x, y);
        }
        sauver(ile);
        vue.casesBonnes = null;
        H.bruit("plante");
        dimensionner(); peindreFond(); dessiner();
        break;
      }
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
        if (H.journal && p) {
          if (repiquage) H.journal.noter("repiquer:" + ile.id, "j’ai repiqué ", H.leNom(p), " de la serre sur « " + ile.nom + " »");
          else H.journal.noter("planter:" + ile.id, "j’ai planté ", H.leNom(p), " sur « " + ile.nom + " »");
        }
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
            const pq = H.d.plante(q.p);
            if (H.journal && pq) H.journal.noter("arroser:" + ile.id, "j’ai arrosé ", H.leNom(pq), " sur « " + ile.nom + " »");
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
        if (t === "sol") delete ile.cases[k].t;
        if (H.journal) H.journal.noter("amenager:" + ile.id, "j’ai aménagé « " + ile.nom + " » (", t === "sol" ? "de la terre nue" : TUILES[t].nom.toLowerCase(), ")");
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
          const pr = H.d.plante(pl.p);
          if (H.journal && pr) H.journal.noter("retirer:" + ile.id, "j’ai retiré ", H.leNom(pr), " de « " + ile.nom + " »");
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
    // un brin s'envole de la plante jusqu'à son panier
    const deja = paniersIle(ile), iP = deja.findIndex((b) => b.p === p.id && b.n < 3);
    vue.envols = (vue.envols || []).concat({ p, de: [x + 0.5, y + 0.5], vers: placePanier(ile, iP < 0 ? deja.length : iP), t0: performance.now() });
    mettreAuPanier(ile, p.id);
    if (H.journal) H.journal.noter("recolter:" + ile.id, "j’ai récolté ", H.leNom(p), " sur « " + ile.nom + " »");
    if (p.valeurs.cycle === "Annuelle") pl.c = 40;
    sauver(ile);
    H.bruit("recolte");
    H.toast("Récolte : " + p.nom + " (+2 graines, +1 compost" + (gains.paille ? ", +1 paille" : "") + ", et une récolte pour le labo)");
    dessiner();
  }

  // Les bébés plantes de la caisse face à une case : celles qui s'y plairaient (et pourquoi pas les autres)
  const SE_PLAIT = 0.85;
  function caisseIci(ile, x, y) {
    if (!H.serre) return [];
    return H.serre.bebes().map(([id, n]) => {
      const p = H.d.plante(id);
      if (!p) return null;
      const ev = evaluer(ile, x, y, p, null);
      return { p, n, f: ev.facteur, raisons: ev.raisons.filter((r) => !/voisines|s’entend/.test(r)) };
    }).filter(Boolean).sort((a, b) => b.f - a.f);
  }
  // sur combien de cases libres de l'île une plante se plairait
  function casesQuiConviennent(ile, p) {
    const bonnes = [];
    for (let y = 0; y < ile.lignes; y++) for (let x = 0; x < ile.cols; x++) {
      if ((ile.plantes || {})[cle(x, y)]) continue;
      const t = caseDe(ile, x, y).t;
      if (t === "eau" || t === "dalle" || t === "chemin" || t === "vide") continue;
      if (evaluer(ile, x, y, p, null).facteur >= SE_PLAIT) bonnes.push(cle(x, y));
    }
    return bonnes;
  }
  const texteListe = (l) => (l && l.length ? l.join(", ").toLowerCase() : "non précisé");
  // la fenêtre « Ta caisse et le sol » : ce dont chaque plante a besoin, et où elle se plairait sur l'île
  function fenetreCaisse() {
    const ile = vue.ile, bebes = H.serre ? H.serre.bebes() : [];
    let fermer;
    const corps = H.el("div.fenetre-caisse", null,
      H.el("h2", null, "Ta caisse et le sol"),
      H.el("p.discret", null, "Le sol de l’île : " + texteListe(ile.sol) + " · " + (ile.expo || "Plein soleil").toLowerCase() + ". Chaque case peut avoir le sien (outil « Soleil et sol »)."),
      bebes.length ? H.el("ul.liste-caisse", null, bebes.map(([id, n]) => {
        const p = H.d.plante(id);
        if (!p) return null;
        const v = p.valeurs || {}, bonnes = casesQuiConviennent(ile, p);
        return H.el("li", null,
          H.el("b", null, p.nom + " × " + n),
          H.el("span", null, "Sol : " + texteListe(v.sol) + " · exposition : " + texteListe(v.exposition) + (v.arrosage ? " · arrosage " + v.arrosage.toLowerCase() : "")),
          H.el("span" + (bonnes.length ? ".bon" : ".pas-bon"), null, bonnes.length ? "Se plairait sur " + bonnes.length + (bonnes.length > 1 ? " cases" : " case") + " de cette île." : "Ne se plairait nulle part ici sans changer le sol ou l’ombre."),
          H.el("div.pastilles", null,
            bonnes.length ? H.el("button.bouton.petit", { type: "button", onclick: () => { vue.plante = id; vue.depuisSerre = true; vue.outil = "planter"; fermer(); dessinerOutils(); dessiner(); } }, "Montrer où, et la repiquer") : null,
            conseilsSolPlante(ile, p)));
      })) : H.el("p", null, "La caisse est vide. Les bébés plantes prêtes à la serre y arrivent quand on les met en caisse."));
    fermer = H.fenetre(corps);
  }
  // ce qui manque au sol de l'île pour une plante, et les plantes qui peuvent l'apporter
  function conseilsSolPlante(ile, p) {
    const voulu = (p.valeurs || {}).sol || [], ici = new Set(ile.sol || []);
    const idees = voulu.filter((q) => !ici.has(q)).map((q) => {
      const l = plantesQuiApportent(q).filter((x2) => x2.id !== p.id).slice(0, 3);
      return l.length ? "sol " + q.toLowerCase() + " : " + l.map((x2) => x2.nom).join(", ") : null;
    }).filter(Boolean);
    return idees.length ? H.el("span.discret", null, "Pour arranger le sol : " + idees.join(" ; ")) : null;
  }

  function montrerCase(x, y) {
    const c = caseDe(vue.ile, x, y);
    vue.choisie = { x, y };
    vue.panneau.hidden = false;
    vue.panneau.innerHTML = "";
    vue.panneau.append(
      H.el("button.bouton.petit.discret-bouton.fermer-panneau", { type: "button", onclick: () => { vue.panneau.hidden = true; vue.choisie = null; dessiner(); } }, "Fermer"),
      H.el("h3", null, TUILES[c.t].nom),
      H.el("p", null, expoIci(vue.ile, x, y) + (expoIci(vue.ile, x, y) !== c.expo ? " (à l’ombre d’un arbre)" : "") + " · sol " + (c.sol.length ? c.sol.join(", ").toLowerCase() : "non précisé"))
    );
    // ce qu'on pourrait repiquer ici, de ce qui attend dans la caisse
    const caisse = vue.ile.croquis ? [] : caisseIci(vue.ile, x, y);
    if (caisse.length) {
      const bien = caisse.filter((e) => e.f >= SE_PLAIT), moins = caisse.filter((e) => e.f < SE_PLAIT);
      // (append écrit « null » en toutes lettres : on ne garde que les morceaux présents)
      vue.panneau.append(...[
        H.el("p", null, H.el("b", null, "De ta caisse, se plairaient ici : "), bien.length ? bien.map((e) => e.p.nom).join(", ") : "aucune."),
        bien.length ? H.el("div.pastilles", null, bien.map((e) => H.el("button.bouton.petit", { type: "button", onclick: () => { vue.plante = e.p.id; vue.depuisSerre = true; vue.outil = "planter"; dessinerOutils(); dessiner(); } }, "Repiquer " + e.p.nom))) : null,
        moins.length ? H.el("details.caisse-moins", null, H.el("summary.discret", null, "Moins bien ici : " + moins.map((e) => e.p.nom).join(", ")),
          H.el("ul", null, moins.map((e) => H.el("li", null, H.el("b", null, e.p.nom + " : "), e.raisons.join(" ") || "elle ne serait pas à son aise.")))) : null].filter(Boolean));
    }
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
    P.append(...[
      H.el("button.bouton.petit.discret-bouton.fermer-panneau", { type: "button", onclick: () => { P.hidden = true; vue.choisie = null; dessiner(); } }, "Fermer"),
      H.el("h3.nom-plante-ile", null, p.nom),
      H.el("p.discret", null,
        (ile.croquis ? "Adulte" : NOMS_STADES[st].replace(/^./, (c) => c.toUpperCase()) + " · " + Math.round(pl.c) + " %") +
        (fleurie(p, ile, pl) ? " · en fleurs" : "") +
        " · " + caseDe(ile, x, y).expo.toLowerCase()),
      !ile.croquis ? H.el("div.jauges", null,
        H.el("span", null, "Eau "), H.el("span.jauge.jauge-eau", null, H.el("span.jauge-plein", { style: { width: Math.round(pl.eau) + "%" } })),
        H.el("span", null, " Bien-être "), H.el("span.jauge.jauge-bien", null, H.el("span.jauge-plein", { style: { width: pourcent + "%" } }))
      ) : null,
      H.el("p", null, humeur + " (" + pourcent + " %)."),
      ev.raisons.length ? H.el("ul.raisons", null, ev.raisons.map((t) => H.el("li", null, t))) : null,
      ((p.valeurs || {}).amendeSol || []).length
        ? H.el("p.discret", null, "Améliore le sol autour d’elle : " + p.valeurs.amendeSol.join(", ").toLowerCase() + (pl.solAmende ? " (c’est fait)." : " (une fois adulte depuis un jour)."))
        : null,
      conseilsSol(ile, x, y, p)
    ].filter(Boolean));
    const actions = H.el("div.pastilles");
    if (!ile.croquis) {
      const act = (nom, couts, fn, fluo) => actions.appendChild(H.el("button.bouton.petit" + (fluo ? ".actif" : ""), { type: "button", title: cout(couts), onclick: () => { if (payer(couts)) { fn(); sauver(ile); dessiner(); inspecter(x, y); } } }, nom));
      if (aRecolter(p, ile, pl)) actions.appendChild(H.el("button.bouton.petit.actif", { type: "button", onclick: () => { recolter(x, y); inspecter(x, y); } }, "Récolter"));
      const note = (cle2, avant, nom) => H.journal && H.journal.noter(cle2 + ":" + ile.id, avant, nom, " sur « " + ile.nom + " »");
      act("Arroser", { eau: 1, energie: 1 }, () => { pl.eau = 100; H.bruit("eau"); note("arroser", "j’ai arrosé ", H.leNom(p)); });
      act("Pailler", { paille: 1 }, () => { pl.pailleJusqua = H.maintenant() + 14 * 24 * HEURE; note("pailler", "j’ai paillé ", H.leNom(p)); });
      act("Compost", { compost: 1, energie: 1 }, () => { pl.c = Math.min(100, pl.c + 15); note("compost", "j’ai mis du compost ", H.auNom(p)); });
      act("Purin", { purin: 1 }, () => { pl.purinJusqua = H.maintenant() + 7 * 24 * HEURE; note("purin", "j’ai donné du purin ", H.auNom(p)); });
      act("Rayon de soleil", { soleil: 1 }, () => { pl.c = Math.min(100, pl.c + 25); note("soleil", "j’ai offert un rayon de soleil ", H.auNom(p)); });
    }
    actions.appendChild(H.el("button.bouton.petit", { type: "button", onclick: () => H.dessinerPlante(p.id, () => { dessiner(); inspecter(x, y); }) }, p.dessinCarte || p.dessinFace || p.dessinCote ? "Modifier son modèle" : "Dessiner son modèle"));
    actions.appendChild(H.el("button.bouton.petit", { type: "button", onclick: () => H.fiche.carte(p.id) }, "Voir la fiche"));
    P.appendChild(actions);
    dessiner();
    if (!ile.croquis && Math.random() < 0.3) appelerMesi(false, p);
  }

  // --- Mesi et ses « bâtons » (la MTC, sa spécialité) ----------------------------------
  function astuceMTC(p) {
    const v = p.valeurs || {};
    if (!v.mtcSaveur && !v.mtc) return null;
    const premiere = String(v.mtc || "").split("\n").map((l) => l.replace(/^[•\-–#\s]+/, "").replace(/\*\*/g, "").trim()).filter(Boolean)[0] || "";
    const phrases = [];
    if (v.mtcSaveur) phrases.push({ qui: "luigi", texte: "En médecine chinoise, saveur et nature " + H.duNom(p) + " : " + v.mtcSaveur.toLowerCase().replace(/\s*-\s*/g, ", ").replace(/^saveurs?\s*:?\s*/, "") + "." });
    if (premiere) {
      phrases.push({ qui: "luigi", texte: "Dans sa fiche MTC, on lit :" });
      citer(premiere).forEach((texte) => phrases.push({ qui: "luigi", texte }));
    }
    return phrases;
  }

  // Les lignes de la rubrique MTC d'une plante, sans la mise en forme (renvois suivis).
  const lignesMTC = (p, champ) => H.lignesFiche(p, champ || "mtc");
  // une longue ligne de fiche, découpée en bulles d'environ 240 signes, sans couper une phrase
  function decouper(texte, max) {
    max = max || 240;
    const phrases = texte.split(/(?<=[.;!?»)])\s+/);
    const morceaux = [];
    let courant = "";
    for (const ph of phrases) {
      if (courant && (courant + " " + ph).length > max) {
        morceaux.push(courant);
        courant = ph;
      } else courant = courant ? courant + " " + ph : ph;
    }
    if (courant) morceaux.push(courant);
    return morceaux;
  }
  // une citation de la fiche, en une ou plusieurs bulles, entre guillemets
  const citer = (ligne) => {
    const m = decouper(ligne);
    return m.map((x, i) => (i === 0 ? "« " : "") + x + (i === m.length - 1 ? " »" : ""));
  };

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
    const hongrois = vue.ile.secrete && H.hongrois;
    for (;;) {
      if (!p) {
        const choix = plantes.map((q) => ({ valeur: q.id, libelle: q.nom }));
        if (hongrois) choix.unshift({ valeur: "_hu", libelle: "Comment on dit en hongrois ?" });
        const id = await L(intro, choix.concat([{ valeur: null, libelle: "Rien, merci Mesi" }]));
        if (!id) break;
        if (id === "_hu") {
          await L("Viens, on fait un tour ensemble pour en parler ! Montre-moi du doigt une plante ou un animal, et je te dis son nom en hongrois.");
          vue.hongrois = true;
          // Mesi, qui était venue, fait le tour avec ƟvƟ (elle ne repart pas de son côté)
          if (vue.luigi) {
            vue.mesiSuit = { x: vue.luigi.x, y: vue.luigi.y };
            vue.luigi = null;
          }
          if (vue.boutonHongrois) vue.boutonHongrois.hidden = false;
          return;
        }
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
          lignes.slice(0, 4).forEach((l) => repliques.push(...citer(l)));
          if (lignes.length > 4) repliques.push("Et il y a encore " + (lignes.length - 4) + " lignes dans sa fiche !");
        }
      } else if (q === "precautions") {
        const lignes = lignesMTC(p, "precautions");
        if (!lignes.length) repliques.push("Sa fiche ne mentionne pas de précaution particulière.");
        else {
          repliques.push("Côté précautions, sa fiche dit :");
          lignes.slice(0, 4).forEach((l) => repliques.push(...citer(l)));
        }
      }
      await H.dialogue.dire(repliques.map((texte) => ({ qui: "luigi", texte })));
    }
    await L(["À tout à l’heure !", "À ce soir !", "À toute !", "Le temps n’est qu’un concept."][Math.floor(Math.random() * 4)]);
  }

  // Pour une plante qui n'aime pas son sol : les plantes qu'ƟvƟ a notées comme capables de
  // l'arranger (utile aussi pour adapter le terrain d'un·e client·e, sur une île croquis).
  function conseilsSol(ile, x, y, p) {
    const voulu = (p.valeurs || {}).sol || [];
    const ici = new Set(caseDe(ile, x, y).sol);
    const manque = voulu.filter((q) => !ici.has(q));
    const idees = [];
    for (const q of manque) {
      const plantes = plantesQuiApportent(q).filter((x2) => x2.id !== p.id).slice(0, 4);
      if (plantes.length) idees.push("pour un sol " + q.toLowerCase() + " : " + plantes.map((x2) => x2.nom).join(", "));
    }
    return idees.length ? H.el("p.conseil-sol", null, "Pour arranger le sol : " + idees.join(" ; ") + ".") : null;
  }

  // Un câlin et des bisous : Mesi et ƟvƟ se serrent l'un·e contre l'autre en se balançant,
  // trois bisous claquent sur la joue d'ƟvƟ, des petits cœurs s'envolent ; puis Mesi laisse un souvenir.
  async function calin() {
    const t0 = performance.now();
    vue.calin = { t0, bisous: [] };
    vue.coeurs = t0 + 600e3;
    await H.dialogue.dire([{ qui: "ovo", texte: "Viens là, toi !" }]);
    if (!vue || !vue.calin) return;
    const t = performance.now();
    vue.calin.bisous = [250, 800, 1350].map((d) => t + d);
    vue.calin.bisous.forEach((b) => setTimeout(() => H.bruit("bisou"), b - t));
    await H.dialogue.dire([{ qui: "luigi", texte: "Mwah ! Mwah ! Mwah !" }]);
    if (!vue) return;
    // on se lâche doucement, les derniers cœurs finissent de monter
    vue.calin = null;
    vue.coeurs = performance.now() + 1500;
    const cadeau = Math.random() < 0.3 ? "crepe" : ["eau", "graines", "compost", "terre", "soleil"][Math.floor(Math.random() * 5)];
    const n = cadeau === "crepe" ? 1 : 2;
    H.ressources.ajouter(cadeau, n);
    await H.dialogue.dire([{ qui: "luigi", texte: "Tiens, je t’ai apporté " + H.quantiteTexte(cadeau, n).replace(/^1 /, "une ").replace(/^une (outil|rayon|seau|bidon|arrosoir)/, "un $1") + ". À plus tard !" }]);
  }

  // Le dessin du câlin, à la place d'ƟvƟ (ƟvƟ ne bouge pas, Mesi vient se blottir à sa gauche) :
  // on se serre et on se relâche en se balançant ; à chaque bisou, Mesi se penche, une marque
  // rose reste un instant sur la joue d'ƟvƟ et un petit cœur s'en échappe.
  function dessinerCalin(ctx, T) {
    const c = vue.calin, t = performance.now(), o = vue.ovo, k = 1.5;
    const age = t - c.t0;
    // ƟvƟ est au centre de la 23e colonne du dessin (qui en fait 32) : on le garde à sa place
    const x = (o.x + 0.5) * T - 7 * k, y = (o.y + 0.9) * T;
    let image = Math.floor(age / 650) % 2;
    let saut = image === 1 ? 1 : 0;
    for (const b of c.bisous) {
      if (t >= b && t < b + 220) { image = 2; saut = 2; }
      else if (t >= b + 220 && t < b + 700 && image !== 2) image = 3;
    }
    // l'arrivée : Mesi se blottit (le dessin glisse depuis la gauche)
    const entree = Math.min(1, age / 260);
    const glisse = (1 - entree) * (1 - entree) * 10;
    H.pixel.dessiner(ctx, "calin", x - glisse, y - saut, k, image);
    // les petits cœurs des bisous, qui montent de la joue d'ƟvƟ
    for (const b of c.bisous) {
      const u = (t - b) / 900;
      if (u < 0 || u > 1) continue;
      dessinerCoeur(ctx, (o.x + 0.5) * T - 9 * k + Math.sin(u * 7) * 3, y - 15 * k - u * 22, 1 - u);
    }
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
    // pendant le tour en hongrois, Mesi est déjà là, à côté d'ƟvƟ : pas de deuxième Mesi
    if (vue.hongrois || vue.mesiSuit) {
      if (demande && !H.$(".dialogue")) {
        H.jouerCri();
        H.dialogue.dire([{ qui: "luigi", texte: "Je suis juste à côté de toi ! Montre-moi une plante ou un animal, je te dis son nom en hongrois." }]);
      }
      return;
    }
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
      H.jouerCriDe(H.monde === "mesi" ? "ovo" : "mesi");
      H.dialogue.dire([{
        qui: "luigi",
        nom: "Mesi, au loin",
        texte: "ƟvƟ ! Hé, ƟvƟ ! Tu as un moment ?",
        choix: [{ valeur: "parler", libelle: "Parler avec Mesi" }, { valeur: "calin", libelle: "Lui faire un câlin et des bisous" }],
      }]).then((choix) => {
        if (!choix || !vue || vue.luigi) return;
        const fin = choix === "calin"
          ? () => calin().then(() => partirMesi())
          : () => (astuce
            // (Mesi demande d'abord la permission)
            ? H.dialogue.dire([{ qui: "luigi", texte: "Est-ce que je peux bâtonsplainer ?", choix: [{ valeur: "oui", libelle: "Vas-y !" }, { valeur: null, libelle: "Pas maintenant" }] }]).then((r) => (r === "oui" ? H.dialogue.dire(astuce) : null))
            : consulterMesi()).then(() => partirMesi());
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
      if ((vue.coeurs && vue.coeurs > t) || vue.calin) bouge = true;
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
      if (vue.ile.secrete || (vue.ile.animaux && vue.ile.animaux.length)) bouge = true;
      // la lumière du ciel (aube, couchant, nuit) suit l'heure, comme à la ferme
      if (t - (vue.dernierDessin || 0) > 2000) bouge = true;
      if ((bouge && t - (vue.dernierDessin || 0) >= H.cadence(0)) || !vue.dessineUneFois) {
        dessiner();
        vue.dessineUneFois = true;
        vue.dernierDessin = t;
      }
      vue.anim = requestAnimationFrame(pas);
    };
    vue.anim = requestAnimationFrame(pas);
  }

  // --- exports et réglages -----------------------------------------------------------------
  // exporter : la liste des plantes (txt, csv ou pdf), ou le croquis en image
  function exporterIle(ile) {
    let fermer;
    fermer = H.fenetre(H.el("div.formulaire", null,
      H.el("h2", null, "Exporter « " + ile.nom + " »"),
      H.el("div.pastilles", null,
        H.el("button.bouton", { type: "button", onclick: () => { fermer(); exporterListe(ile); } }, "La liste des plantes (txt, csv ou pdf)"),
        H.el("button.bouton", { type: "button", onclick: () => { fermer(); exporterImage(ile); } }, "Le croquis (image)"))));
  }
  function exporterListe(ile) {
    const quantites = {};
    for (const pl of Object.values(ile.plantes || {})) quantites[pl.p] = (quantites[pl.p] || 0) + 1;
    const plantes = Object.keys(quantites).map((id) => H.d.plante(id)).filter(Boolean).sort((a, b) => a.nom.localeCompare(b.nom, "fr"));
    if (!plantes.length) return H.toast("Pas encore de plantes sur cette île");
    H.exporterPlantes(plantes, H.slug(ile.nom), quantites, "Les plantes de « " + ile.nom + " »");
  }

  function exporterImage(ile) {
    // le croquis s'exporte en plan, vu de dessus, à l'échelle
    if (vue.iso || !vue.pourExport) {
      const iso = vue.iso;
      vue.iso = false; vue.pourExport = true; dimensionner(); peindreFond();
      try { exporterImage(ile); } finally { vue.iso = iso; vue.pourExport = false; dimensionner(); peindreFond(); dessiner(); }
      return;
    }
    const c = H.aqua.toile(vue.toile.width, vue.toile.height + 60 * vue.dpr);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#f3f0dc";
    ctx.fillRect(0, 0, c.width, c.height);
    const tmp = H.aqua.toile(vue.toile.width, vue.toile.height);
    const sauvegardeChoix = vue.choisie;
    vue.choisie = null;
    dessiner(tmp.getContext("2d"), true);
    vue.choisie = sauvegardeChoix;
    // le même style que dans le jeu : de gros pixels aux couleurs des pochettes
    H.retro.appliquer(tmp, H.retro.taillePour(2.5));
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

  // offrir l'île en surprise : la date, le petit mot ; on peut changer d'avis avant le jour
  function sectionOffrir(ile, fermer) {
    const c = ile.cadeau && (H.jeu.cadeaux || {})[ile.cadeau];
    if (c && !c.supprime && c.recuLe) return H.el("p.discret", null, "Offerte à " + NOMS[c.pour] + " le " + dateLisible(c.le) + ". Elle l’a reçue.");
    const demain = new Date(); demain.setDate(demain.getDate() + 1);
    const date = H.el("input", { type: "date", min: jourIso(new Date()), value: c && !c.supprime ? c.le : jourIso(demain) });
    const mot = H.el("textarea", { rows: 2, placeholder: "Un petit mot, qui arrivera avec l’île" });
    mot.value = (c && !c.supprime && c.mot) || "";
    const msg = H.el("p.discret.erreur", { role: "alert" });
    return H.el("fieldset.offrir-ile", null,
      H.el("legend", null, "Offrir cette île en surprise à " + NOMS[autre()]),
      H.el("p.discret", null, c && !c.supprime
        ? "Elle arrivera chez " + NOMS[c.pour] + " le " + dateLisible(c.le) + ". D’ici là, tes retouches la suivent."
        : "Le jour venu, l’île arrivera chez " + NOMS[autre()] + ", avec les fiches de ses plantes. Tu peux la retoucher jusque-là."),
      H.el("label", null, "Le jour", date),
      H.el("label", null, "Le petit mot", mot),
      msg,
      H.el("div.boutons-bas", null,
        c && !c.supprime ? H.el("button.bouton.discret-bouton", { type: "button", onclick: () => {
          if (!confirm("Garder l’île pour toi, finalement ?")) return;
          H.jeu.cadeaux = Object.assign({}, H.jeu.cadeaux, { [c.id]: { id: c.id, supprime: true, modifieLe: H.maintenant() } });
          delete ile.cadeau; ile.aOffrir = true; sauver(ile); fermer(); H.router();
        } }, "Ne plus l’offrir") : null,
        H.el("button.bouton", { type: "button", onclick: () => {
          if (!date.value) return (msg.textContent = "Choisis le jour où elle arrivera.");
          if (date.value < jourIso(new Date())) return (msg.textContent = "Ce jour est déjà passé.");
          offrir(ile, date.value, mot.value.trim());
          H.toast("Surprise prête : elle arrivera chez " + NOMS[autre()] + " le " + dateLisible(date.value) + ".");
          fermer(); H.router();
        } }, c && !c.supprime ? "Mettre à jour la surprise" : "Offrir l’île")
      )
    );
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
      ile.mot ? H.el("p", null, H.el("em", null, "Le mot de " + NOMS[ile.offertePar] + " : « " + ile.mot + " »")) : null,
      (!ile.secrete && !ile.croquis && !ile.offertePar) ? sectionOffrir(ile, () => fermer()) : null,
      H.el("div.boutons-bas", null,
        !ile.secrete ? H.el("button.bouton.discret-bouton", { type: "button", onclick: () => { if (confirm("Supprimer l’île « " + ile.nom + " » ?")) { H.jeu.iles[ile.id] = { id: ile.id, supprime: true, modifieLe: H.maintenant() }; H.d.changer("jeu"); fermer(); H.aller("terrain"); } } }, "Supprimer l’île") : null,
        H.el("button.bouton", { type: "submit" }, "Enregistrer")
      )
    ));
  }

  H.vues.terrain = {
    afficher(c, params) {
      vue = null;
      // une île ouverte : la scène en plein écran, seules les ressources restent en haut
      if (params[0]) document.documentElement.dataset.ile = "1";
      else delete document.documentElement.dataset.ile;
      if (params[0]) ouvrirIle(c, params[0]);
      else archipel(c);
    },
    quitter() {
      if (vue) {
        cancelAnimationFrame(vue.anim);
        clearInterval(vue.minuteurMesi);
      }
      H.sons.boucle("pas", false);
      delete document.documentElement.dataset.ile;
      if (bulle) bulle.remove();
      bulle = null;
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

  // Le portrait botanique d'une plante (l'image par défaut en haut de sa fiche) : la plante adulte
  // et en fleur, dessinée selon sa famille, toujours à la même hauteur quelle que soit sa vraie
  // taille, en gros pixels nets sur une feuille de papier.
  const portraits = new Map();
  function portrait(p) {
    const cle = p.id + "|" + ((p.valeurs || {}).famille || "") + "|" + ((p.valeurs || {}).cycle || "");
    if (portraits.has(cle)) return portraits.get(cle);
    const m = hauteurM(p), eff = m <= 2 ? m : 2 + (m - 2) * 0.35;
    // (les arbres et les arbustes en deux fois plus de pixels : on y lit les rameaux et la forme des feuilles)
    const fin = dessinLigneux(p) ? 2 : 1;
    const d0 = planteDebout(p, { caseM: Math.max(0.02, (eff * 2 * HW * 0.55) / 62) }, 3, true, fin), d = Object.assign({}, d0, { l: d0.pied.width, h: d0.pied.height });
    const L = 300, Hh = 360, k = Math.max(1, Math.floor(Math.min((L * 0.8) / d.l, (Hh * 0.82) / d.h)));
    const c = document.createElement("canvas");
    c.width = L; c.height = Hh;
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.fillStyle = "#f6f0de"; g.fillRect(0, 0, L, Hh);
    const x = Math.round(L / 2 - (d.l * k) / 2), y = Math.round(Hh * 0.9 - d.h * k);
    g.fillStyle = "#e3d8bb"; g.fillRect(0, Math.round(Hh * 0.9) - 2 * k, L, Hh);
    g.drawImage(d.pied, x, y, d.l * k, d.h * k);
    if (d.couronne) g.drawImage(d.couronne, x, y, d.l * k, d.h * k);
    const url = c.toDataURL("image/png");
    portraits.set(cle, url);
    return url;
  }

  // Une plante en petit, debout, dessinée selon sa famille (pour les pots de la serre, les récoltes
  // du labo…) : haut, sa hauteur en pixels ; st, son âge (1 : plantule, 2 : jeune, 3 : adulte).
  // Rend une toile, l'origine au pied, en bas au milieu.
  function plantePetite(p, haut, st, fleur) {
    const m = hauteurM(p), eff = m <= 2 ? m : 2 + (m - 2) * 0.35;
    const d = planteDebout(p, { caseM: Math.max(0.02, (eff * 2 * HW * 0.55) / haut) }, st == null ? 3 : st, !!fleur);
    if (!d.couronne) return d.pied;
    const c = document.createElement("canvas");
    c.width = d.l; c.height = d.h;
    const g = c.getContext("2d");
    g.drawImage(d.pied, 0, 0); g.drawImage(d.couronne, 0, 0);
    return c;
  }

  H.terrain = { evaluer, iles, ileSecreteOuverte, dessinAuto, portrait, plantePetite };
  // les îles qu'on peut montrer ailleurs dans le jeu (to-do, devis, carnet, recherche), tout ce qui
  // se partage : l'île de Lóló et Mémé y reste cachée jusqu'à son vrai jour, même en aperçu
  H.ilesVisibles = () => iles().filter((i) => i && (!i.secrete || new Date() >= OUVERTURE_SECRETE));
})();
