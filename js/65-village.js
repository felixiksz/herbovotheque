// La ferme : l'herbothèque (tiny house sur roues), la cabane à flashcartes (roulotte),
// la cabane de lecture (cabane en A), le labo (cabanon de pierre), la maison d'ƟvƟ et Mesi
// (mazet), la serre, le ponton vers les îles et la boîte aux lettres. Autour, la garrigue
// des calanques : pins parasols, pins d'Alep, chênes verts, romarin, thym, cistes…
// On clique sur un lieu, ƟvƟ y va en suivant le chemin, puis on entre.
(function () {
  const H = window.H;

  // positions en fractions de la scène (paysage / portrait)
  const LIEUX = {
    herbotheque: { nom: "Herbothèque", hash: "herbotheque", paysage: [0.17, 0.48], portrait: [0.27, 0.31] },
    cartes: { nom: "Cabane à flashcartes", hash: "cartes", paysage: [0.45, 0.42], portrait: [0.73, 0.38] },
    lecture: { nom: "Cabane de lecture", hash: "lecture", paysage: [0.68, 0.38], portrait: [0.27, 0.47] },
    labo: { nom: "Labo", hash: "labo", paysage: [0.21, 0.8], portrait: [0.73, 0.55] },
    maison: { nom: "Chez ƟvƟ et Mesi", hash: "maison", paysage: [0.41, 0.77], portrait: [0.73, 0.73] },
    serre: { nom: "Serre", hash: "serre", paysage: [0.62, 0.68], portrait: [0.27, 0.65] },
    terrain: { nom: "Ponton vers les îles", hash: "terrain", paysage: [0.88, 0.72], portrait: [0.7, 0.93] },
    lettres: { nom: "Boîte aux lettres", hash: null, paysage: [0.06, 0.87], portrait: [0.12, 0.86] },
  };
  // le chemin de terre passe devant chaque lieu, dans cet ordre : ƟvƟ le suit sans traverser les maisons
  const CHEMIN = {
    paysage: ["lettres", "labo", "herbotheque", "cartes", "lecture", "serre", "maison", "terrain"],
    portrait: ["herbotheque", "cartes", "lecture", "labo", "serre", "lettres", "maison", "terrain"],
  };

  let scene = null;
  let galopDejaVu = false;

  const disposition = () => (scene && scene.w / scene.h < 1 ? "portrait" : "paysage");
  // les maisons rapetissent sur téléphone
  const echelle = () => Math.max(0.5, Math.min(1, scene.w / 1000));

  function position(lieu) {
    const [fx, fy] = LIEUX[lieu][disposition()];
    return [fx * scene.w, fy * scene.h];
  }
  // l'endroit du chemin où ƟvƟ se tient devant un lieu
  function devant(lieu) {
    const [x, y] = position(lieu);
    return [x + 88 * echelle(), y + 10];
  }

  // --- dessins des bâtiments (coordonnées locales : (0, 0) = milieu du bas) ------------
  const A = () => H.aqua;
  function forme(ctx, r, pts, couleur, alpha, epaisseur) {
    A().lavis(ctx, r, pts, couleur, { alpha: alpha || 0.28, couches: 10, bord: 0.03 });
    A().trait(ctx, r, pts.concat([pts[0]]), { epaisseur: epaisseur || 1.5 });
  }
  const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  function roue(ctx, r, x, y, rayon, couleur) {
    const c = A().polygone(r, x, y, rayon, rayon, 16);
    forme(ctx, r, c, couleur || "#3e3a36", 0.4, 1.3);
    A().tache(ctx, r, x, y, rayon * 0.35, rayon * 0.35, "#d9d2c4", { alpha: 0.5, couches: 4 });
  }

  // A · tiny house sur roues : l'herbothèque
  function tinyHouse(ctx, r) {
    forme(ctx, r, rect(-70, -26, 150, 7), "#6b5442", 0.4);
    roue(ctx, r, 8, -10, 11);
    roue(ctx, r, 40, -10, 11);
    forme(ctx, r, rect(-62, -104, 134, 78), "#d7a873");
    for (const x of [-12, 2, 62]) A().trait(ctx, r, [[x, -102], [x, -28]], { couleur: "#9a6f44", epaisseur: 0.8, alpha: 0.6 });
    forme(ctx, r, [[-72, -102], [78, -128], [82, -114], [-68, -88]], "#6b7a8a", 0.32);
    forme(ctx, r, A().rectArrondi(-50, -78, 26, 52, 4), "#3f7a5a", 0.35);
    const fenetre = A().polygone(r, 30, -74, 12, 12, 14);
    forme(ctx, r, fenetre, "#cfe8ef", 0.35, 1.2);
    forme(ctx, r, rect(14, -48, 40, 8), "#5f8a46", 0.35, 1);
    for (const [dx, c] of [[20, "#f08a9b"], [33, "#ffc21a"], [46, "#b48ad8"]]) A().tache(ctx, r, dx, -50, 4, 4, c, { alpha: 0.5, couches: 4 });
    // escalier de bois, de la porte jusqu'au sol
    forme(ctx, r, [[-20, -26], [-20, 0], [-84, 0], [-84, -9], [-70, -9], [-70, -18], [-56, -18], [-56, -26]], "#a8743f", 0.38, 1.1);
    A().trait(ctx, r, [[-56, -18], [-20, -18]], { couleur: "#6b4423", epaisseur: 0.8, alpha: 0.6 });
    A().trait(ctx, r, [[-70, -9], [-20, -9]], { couleur: "#6b4423", epaisseur: 0.8, alpha: 0.6 });
    A().trait(ctx, r, [[-84, -9], [-84, -30], [-56, -48]], { couleur: "#6b4423", epaisseur: 1.1 });
  }

  // B · roulotte bohème : la cabane à flashcartes
  function roulotte(ctx, r) {
    const corps = [[-64, -32]];
    for (let i = 0; i <= 16; i++) {
      const a = Math.PI + (i / 16) * Math.PI;
      corps.push([Math.cos(a) * 66, -86 + Math.sin(a) * 58]);
    }
    corps.push([64, -32]);
    forme(ctx, r, corps, "#e9b44c", 0.3);
    A().trait(ctx, r, corps.slice(1, -1), { couleur: "#c4623a", epaisseur: 5, alpha: 0.6 });
    forme(ctx, r, rect(-66, -36, 132, 8), "#6b5442", 0.4);
    roue(ctx, r, -38, -16, 15, "#c4623a");
    roue(ctx, r, 38, -16, 15, "#c4623a");
    forme(ctx, r, A().rectArrondi(-13, -86, 26, 50, 12), "#3a5f8a", 0.35);
    // une grande fenêtre à croisillons, et une plus petite de l'autre côté
    forme(ctx, r, A().rectArrondi(-56, -92, 34, 36, 8), "#cfe8ef", 0.35, 1.2);
    A().trait(ctx, r, [[-39, -91], [-39, -57]], { epaisseur: 0.9 });
    A().trait(ctx, r, [[-55, -74], [-23, -74]], { epaisseur: 0.9 });
    forme(ctx, r, A().rectArrondi(26, -88, 24, 26, 8), "#cfe8ef", 0.35, 1.2);
    // escalier de bois devant la porte, jusqu'au sol
    forme(ctx, r, [[-14, -36], [14, -36], [19, 0], [-19, 0]], "#a8743f", 0.38, 1.1);
    for (const y of [-27, -18, -9]) A().trait(ctx, r, [[-15 - (y + 36) / 7, y], [15 + (y + 36) / 7, y]], { couleur: "#6b4423", epaisseur: 0.9, alpha: 0.7 });
    forme(ctx, r, rect(33, -158, 7, 22), "#3e3a36", 0.45, 1.2);
    // petites cartes pendues à une ficelle sous l'arrondi
    A().trait(ctx, r, [[-48, -110], [48, -110]], { couleur: "#2b2622", epaisseur: 0.8 });
    for (let i = 0; i < 4; i++) forme(ctx, r, rect(-40 + i * 22, -109, 11, 15), i % 2 ? "#fbf6ea" : "#ff7b00", 0.45, 0.8);
  }

  // C · cabane en A : la cabane de lecture
  function cabaneA(ctx, r) {
    forme(ctx, r, rect(-78, -10, 156, 10), "#a8743f", 0.38);
    forme(ctx, r, [[0, -138], [78, -10], [-78, -10]], "#4f6b4a", 0.32);
    forme(ctx, r, [[0, -110], [54, -10], [-54, -10]], "#d6eef5", 0.3, 1.2);
    A().trait(ctx, r, [[0, -110], [0, -10]], { epaisseur: 1 });
    A().trait(ctx, r, [[-26, -58], [26, -58]], { epaisseur: 1 });
    A().trait(ctx, r, [[-38, -36], [38, -36]], { epaisseur: 1 });
    forme(ctx, r, rect(-10, -36, 20, 26), "#c9a26b", 0.35, 1.2);
    // une petite pile de livres et une bougie derrière la vitre
    for (const [dx, c] of [[-30, "#c4623a"], [-24, "#3a5f8a"], [-18, "#e9b44c"]]) forme(ctx, r, rect(dx, -30, 5, 18), c, 0.45, 0.8);
    forme(ctx, r, rect(20, -24, 4, 12), "#fbf6ea", 0.5, 0.8);
    A().tache(ctx, r, 22, -28, 2.4, 3.6, "#ffb24a", { alpha: 0.6, couches: 4 });
  }

  // D · mazet provençal : chez ƟvƟ et Mesi
  function mazet(ctx, r) {
    forme(ctx, r, rect(-62, -86, 118, 86), "#ece2cc", 0.32);
    for (const [x, y, w] of [[-56, -26, 16], [32, -72, 18], [-50, -72, 14], [36, -20, 15], [-8, -50, 12]]) forme(ctx, r, A().rectArrondi(x, y, w, 9, 3), "#d8cbb0", 0.4, 0.8);
    forme(ctx, r, [[-72, -84], [-2, -118], [68, -84]], "#c4623a", 0.32);
    for (let rangee = 0; rangee < 2; rangee++) {
      const pts = [];
      for (let x = -52 + rangee * 16; x <= 48 - rangee * 16; x += 5) pts.push([x, -96 - rangee * 10 + (Math.floor(x / 5) % 2 ? 3 : 0)]);
      A().trait(ctx, r, pts, { couleur: "#7a3a1a", epaisseur: 0.9, alpha: 0.6 });
    }
    forme(ctx, r, A().rectArrondi(-15, -50, 26, 50, 12), "#7d8fd1", 0.38);
    for (const x of [-48, 26]) {
      forme(ctx, r, rect(x + 6, -64, 18, 22), "#cfe8ef", 0.35, 1.1);
      forme(ctx, r, rect(x - 2, -64, 8, 22), "#7d8fd1", 0.4, 1);
      forme(ctx, r, rect(x + 24, -64, 8, 22), "#7d8fd1", 0.4, 1);
    }
    // l'olivier à côté de la maison
    A().trait(ctx, r, [[78, 0], [76, -40]], { couleur: "#6b5442", epaisseur: 3 });
    A().tache(ctx, r, 76, -54, 20, 15, "#9aae7a", { alpha: 0.2, couches: 10 });
    for (let i = 0; i < 5; i++) A().tache(ctx, r, -54 + i * 8, -2, 3, 3, "#9b7fd6", { alpha: 0.5, couches: 3 });
  }

  // G · cabanon de pierre : le labo (alambic, flacons, bouquets qui sèchent sous la treille)
  function labo(ctx, r) {
    A().trait(ctx, r, [[-90, 0], [-90, -70]], { couleur: "#6b5442", epaisseur: 2.4 });
    A().trait(ctx, r, [[-96, -70], [-50, -76]], { couleur: "#6b5442", epaisseur: 2.4 });
    for (const [x, c] of [[-84, "#7a9a5a"], [-75, "#b48ad8"], [-66, "#d9b84a"], [-57, "#6f8a78"]]) {
      A().trait(ctx, r, [[x, -73], [x, -64]], { epaisseur: 0.6 });
      A().lavis(ctx, r, [[x - 4, -64], [x + 4, -64], [x + 1, -47], [x - 1, -47]], c, { alpha: 0.5, couches: 5 });
    }
    forme(ctx, r, rect(-52, -84, 112, 84), "#e3d6bc", 0.32);
    for (const [x, y, w] of [[-46, -18, 16], [30, -70, 18], [-44, -78, 14], [44, -30, 12], [-20, -12, 12]]) forme(ctx, r, A().rectArrondi(x, y, w, 9, 3), "#d0c2a4", 0.4, 0.8);
    forme(ctx, r, [[-62, -80], [70, -104], [72, -94], [-60, -72]], "#c4623a", 0.32);
    // cheminée et un filet de fumée
    forme(ctx, r, rect(40, -124, 12, 30), "#b9a88a", 0.4, 1.2);
    for (let i = 0; i < 3; i++) A().tache(ctx, r, 47 + i * 7, -134 - i * 12, 5 + i * 2, 4 + i * 1.5, "#ffffff", { alpha: 0.3, couches: 4 });
    // grande fenêtre : une étagère de flacons et l'alambic de cuivre
    forme(ctx, r, rect(-40, -66, 46, 36), "#f3e6c8", 0.35, 1.2);
    A().trait(ctx, r, [[-40, -50], [6, -50]], { couleur: "#6b5442", epaisseur: 1 });
    for (const [dx, c] of [[-35, "#3f7a5a"], [-28, "#b5651d"], [-21, "#7d8fd1"], [-14, "#c4623a"], [-7, "#e9b44c"]]) forme(ctx, r, rect(dx, -62, 5, 11), c, 0.5, 0.7);
    A().tache(ctx, r, -22, -38, 8, 6, "#c87533", { alpha: 0.6, couches: 5 });
    A().trait(ctx, r, [[-22, -44], [-22, -48], [-8, -42]], { couleur: "#8a4a1a", epaisseur: 1.2 });
    forme(ctx, r, A().rectArrondi(18, -52, 24, 52, 10), "#5f8a46", 0.38);
    for (let i = 0; i < 4; i++) A().tache(ctx, r, -44 + i * 9, -3, 3, 3, "#9b7fd6", { alpha: 0.5, couches: 3 });
  }

  // F · petite serre
  function serre(ctx, r) {
    forme(ctx, r, rect(-66, -20, 132, 20), "#d8cbb0", 0.38);
    const verre = [[-66, -20]];
    for (let i = 0; i <= 14; i++) {
      const a = Math.PI + (i / 14) * Math.PI;
      verre.push([Math.cos(a) * 66, -74 + Math.sin(a) * 48]);
    }
    verre.push([66, -20]);
    for (let i = 0; i < 6; i++) A().tache(ctx, r, -50 + i * 20, -32, 8 + (i % 2) * 3, 8, ["#5f8a46", "#6f9a4f", "#7a9a4a"][i % 3], { alpha: 0.3, couches: 6 });
    for (const [x, c] of [[-30, "#f08a9b"], [10, "#ffc21a"], [42, "#b48ad8"]]) A().tache(ctx, r, x, -40, 3, 3, c, { alpha: 0.6, couches: 3 });
    A().lavis(ctx, r, verre, "#d6eef5", { alpha: 0.18, couches: 8, bord: 0.02 });
    A().trait(ctx, r, verre, { epaisseur: 1.5 });
    for (const x of [-44, -22, 0, 22, 44]) A().trait(ctx, r, [[x, -20], [x, -74 - Math.sqrt(Math.max(0, 66 * 66 - x * x)) * 48 / 66]], { epaisseur: 0.9, alpha: 0.7 });
    A().trait(ctx, r, [[-66, -50], [66, -50]], { epaisseur: 0.9, alpha: 0.7 });
    A().tache(ctx, r, 0, -124, 3.5, 3.5, "#ff7b00", { alpha: 0.6, couches: 4 });
  }

  // fenêtres qui s'allument le soir (coordonnées locales)
  const FENETRES = {
    herbotheque: [[18, -86, 24, 24]],
    cartes: [[-56, -92, 34, 36], [26, -88, 24, 26]],
    lecture: [[-40, -60, 80, 50]],
    labo: [[-40, -66, 46, 36]],
    maison: [[-42, -64, 18, 22], [32, -64, 18, 22]],
  };
  const DESSINS = { herbotheque: tinyHouse, cartes: roulotte, lecture: cabaneA, labo, maison: mazet, serre };

  function dansLeRepere(ctx, id, fn) {
    const [x, y] = position(id);
    const k = echelle();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    fn();
    ctx.restore();
  }

  // --- la garrigue des calanques, à l'aquarelle ---------------------------------------
  // pin parasol : tronc fin un peu penché, couronne large et plate.
  // partie : "tronc" ou "couronne" pour les grands pins (tronc derrière la maison, couronne par-dessus)
  function pinParasol(ctx, r, x, y, t, partie) {
    const pen = (r() - 0.5) * t * 0.35;
    const rc = H.alea("couronne" + Math.floor(r() * 1e9));
    if (partie !== "couronne") {
      A().trait(ctx, r, [[x, y], [x + pen * 0.4, y - t * 0.45], [x + pen, y - t * 0.8]], { couleur: "#6b4a32", epaisseur: Math.max(1.6, t / 15) });
      A().trait(ctx, r, [[x + pen * 0.7, y - t * 0.66], [x + pen - t * 0.2, y - t * 0.84]], { couleur: "#6b4a32", epaisseur: Math.max(1, t / 26) });
      A().trait(ctx, r, [[x + pen * 0.8, y - t * 0.72], [x + pen + t * 0.22, y - t * 0.86]], { couleur: "#6b4a32", epaisseur: Math.max(1, t / 28) });
    }
    if (partie === "tronc") return;
    const cx = x + pen, cy = y - t * 0.9;
    A().tache(ctx, rc, cx, cy + t * 0.05, t * 0.52, t * 0.09, "#2a4a2a", { alpha: 0.24, couches: 7 });
    for (let i = 0; i < 7; i++) A().tache(ctx, rc, cx + (i - 3) * t * 0.12, cy - (i % 2) * t * 0.05 - (i > 1 && i < 5 ? t * 0.03 : 0), t * 0.2, t * 0.1, i % 2 ? "#3f6b3a" : "#4d7a42", { alpha: 0.22, couches: 8 });
    for (let i = 0; i < 3; i++) A().tache(ctx, rc, cx + (i - 1) * t * 0.22, cy - t * 0.07, t * 0.12, t * 0.05, "#6f9a5a", { alpha: 0.16, couches: 5 });
  }
  // les grands pins parasols qui surplombent les maisons : [lieu, décalage, hauteur du toit].
  // Le tronc pousse juste derrière la maison et la couronne s'étale au-dessus de son toit.
  const GRANDS_PINS = [["herbotheque", -50, 128], ["cartes", 72, 158], ["lecture", 82, 138], ["labo", -42, 124], ["maison", 52, 118], ["serre", -62, 124], ["terrain", -70, 150]];
  // pin d'Alep : tronc tortueux, feuillage clair et léger
  function pinAlep(ctx, r, x, y, t) {
    const pts = [[x, y]];
    let px = x;
    for (let i = 1; i <= 4; i++) {
      px += (r() - 0.5) * t * 0.2;
      pts.push([px, y - t * 0.17 * i]);
    }
    A().trait(ctx, r, pts, { couleur: "#7a6a5a", epaisseur: Math.max(1.4, t / 17) });
    for (let i = 0; i < 6; i++) A().tache(ctx, r, px + (r() - 0.5) * t * 0.55, y - t * (0.5 + r() * 0.35), t * (0.13 + r() * 0.08), t * (0.09 + r() * 0.05), i % 2 ? "#7a9466" : "#68875a", { alpha: 0.2, couches: 7 });
  }
  // chêne vert : petit tronc, couronne ronde et sombre
  function cheneVert(ctx, r, x, y, t) {
    A().trait(ctx, r, [[x, y], [x, y - t * 0.35]], { couleur: "#5a4636", epaisseur: Math.max(1.6, t / 14) });
    for (let i = 0; i < 5; i++) A().tache(ctx, r, x + (r() - 0.5) * t * 0.4, y - t * (0.5 + r() * 0.2), t * 0.24, t * 0.2, i % 2 ? "#35583a" : "#46663e", { alpha: 0.2, couches: 8 });
  }
  const ARBRES = [pinParasol, pinParasol, pinAlep, pinParasol, cheneVert, pinAlep];

  // les petits arbustes : romarin, thym, ciste, lentisque, cade
  function arbuste(ctx, r, x, y, t, sorte) {
    if (sorte === 0) {
      // romarin : tiges dressées gris-vert, petites fleurs bleues
      for (let i = 0; i < 7; i++) {
        const dx = (i - 3) * t * 0.12;
        A().trait(ctx, r, [[x + dx * 0.5, y], [x + dx, y - t * (0.6 + r() * 0.4)]], { couleur: "#6f8a78", epaisseur: 1.6, alpha: 0.7 });
      }
      for (let i = 0; i < 5; i++) A().tache(ctx, r, x + (r() - 0.5) * t * 0.8, y - t * (0.3 + r() * 0.6), 1.6, 1.6, "#7d8fd1", { alpha: 0.6, couches: 2 });
    } else if (sorte === 1) {
      // thym : un coussin bas, gris-vert, piqué de mauve
      A().tache(ctx, r, x, y - t * 0.2, t * 0.55, t * 0.22, "#8a9a7a", { alpha: 0.3, couches: 6 });
      for (let i = 0; i < 6; i++) A().tache(ctx, r, x + (r() - 0.5) * t, y - t * (0.15 + r() * 0.25), 1.4, 1.4, "#c58ac8", { alpha: 0.6, couches: 2 });
    } else if (sorte === 2) {
      // ciste : buisson rond, fleurs roses froissées
      A().tache(ctx, r, x, y - t * 0.35, t * 0.45, t * 0.33, "#7a9a5a", { alpha: 0.26, couches: 7 });
      for (let i = 0; i < 3; i++) A().tache(ctx, r, x + (r() - 0.5) * t * 0.7, y - t * (0.25 + r() * 0.4), 2.6, 2.4, i % 2 ? "#f3b4cf" : "#ffffff", { alpha: 0.65, couches: 3 });
    } else if (sorte === 3) {
      // lentisque : boule vert sombre
      A().tache(ctx, r, x - t * 0.15, y - t * 0.3, t * 0.36, t * 0.28, "#466a3e", { alpha: 0.26, couches: 7 });
      A().tache(ctx, r, x + t * 0.2, y - t * 0.26, t * 0.3, t * 0.24, "#3d5e38", { alpha: 0.24, couches: 7 });
    } else {
      // cade : petit genévrier en flamme
      A().lavis(ctx, r, [[x, y - t * 1.1], [x + t * 0.28, y], [x - t * 0.28, y]], "#4d6b50", { alpha: 0.26, couches: 7, bord: 0.05 });
    }
  }

  function peindreFond() {
    const { w, h } = scene;
    const S = scene.dpr;
    const c = H.aqua.toile(Math.round(w * S), Math.round(h * S));
    const ctx = c.getContext("2d");
    ctx.scale(S, S);
    const r = H.alea("village");
    const saison = document.documentElement.dataset.saison || "printemps";
    const herbe = { printemps: "#a6cf80", "été": "#c3cc74", automne: "#c2ab62", hiver: "#9aae92" }[saison];
    const portrait = disposition() === "portrait";
    const horizon = portrait ? 0.2 : 0.27;
    // ciel
    const s = H.ciel.etat();
    const t = H.ciel.teinteCiel(s.soleil.alt);
    const g = ctx.createLinearGradient(0, 0, 0, h * (horizon + 0.03));
    g.addColorStop(0, t.haut);
    g.addColorStop(1, t.bas);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * (horizon + 0.03));
    // les calanques à l'horizon
    H.aqua.calanques(ctx, r, w, h * (horizon - 0.015), h * (portrait ? 0.07 : 0.15), document.documentElement.dataset.theme === "nuit");
    // prairie
    ctx.fillStyle = herbe;
    ctx.fillRect(0, h * horizon, w, h);
    for (let i = 0; i < 30; i++) H.aqua.tache(ctx, r, r() * w, h * (horizon + 0.03) + r() * h * 0.7, 30 + r() * 60, 14 + r() * 30, i % 2 ? "#8fb066" : "#d2dd98", { alpha: 0.018, couches: 6 });
    // sous les grands pins : la terre rouge et caillouteuse, et leur ombre portée selon le soleil
    const kp = echelle();
    const soleil = H.ciel.etat().soleil;
    const ombreX = Math.sin((soleil.az || 0) * Math.PI / 180);
    const grandsPins = GRANDS_PINS.map(([id, dx, toit]) => {
      const [x, y] = position(id);
      return { id, x: x + dx * kp, y: y - 20 * kp, t: ((toit - 8) / 0.9) * kp };
    });
    for (const { x, y, t } of grandsPins) {
      H.aqua.tache(ctx, r, x, y + t * 0.02, t * 0.6, t * 0.19, "#b45e36", { alpha: 0.22, couches: 9 });
      H.aqua.tache(ctx, r, x + t * 0.1, y + t * 0.04, t * 0.35, t * 0.1, "#c97a4a", { alpha: 0.16, couches: 6 });
      for (let i = 0; i < 26; i++) H.aqua.tache(ctx, r, x + (r() - 0.5) * t * 1.05, y + (r() - 0.5) * t * 0.3, 1.4 + r() * 2.4, 1 + r() * 1.5, r() < 0.5 ? "#ece3d2" : "#9a8a78", { alpha: 0.55, couches: 2 });
      // quelques aiguilles et pignes tombées
      for (let i = 0; i < 4; i++) H.aqua.tache(ctx, r, x + (r() - 0.5) * t * 0.8, y + (r() - 0.5) * t * 0.2, 2.6, 2, "#7a4a2a", { alpha: 0.5, couches: 3 });
      if (soleil.alt > 0) H.aqua.tache(ctx, r, x + ombreX * t * 0.4, y + t * 0.02, t * 0.55, t * 0.16, "#26331d", { alpha: 0.11, couches: 9 });
    }
    // mer et ponton
    const mer = portrait ? [[0, h * 0.93], [w, h * 0.86], [w, h], [0, h]] : [[w * 0.74, h], [w * 0.78, h * 0.62], [w * 0.88, h * 0.55], [w, h * 0.52], [w, h]];
    H.aqua.lavis(ctx, r, mer, "#79b5d3", { alpha: 0.12, couches: 14, bord: 0.08 });
    for (let i = 0; i < 8; i++) {
      const x = portrait ? r() * w : w * (0.8 + r() * 0.2), y = portrait ? h * (0.93 + r() * 0.06) : h * (0.62 + r() * 0.35);
      H.aqua.trait(ctx, r, [[x, y], [x + 18, y + 1]], { couleur: "#ffffff", epaisseur: 1.4, alpha: 0.6 });
    }
    // pins parasols, pins d'Alep et chênes verts tout autour de la ferme (derrière les maisons)
    const k = echelle();
    const arbres = portrait
      ? [[0.04, 0.24], [0.13, 0.23], [0.88, 0.24], [0.97, 0.26], [0.03, 0.4], [0.97, 0.47], [0.04, 0.57], [0.96, 0.64], [0.5, 0.235], [0.6, 0.24], [0.4, 0.22]]
      : [[0.02, 0.3], [0.07, 0.29], [0.11, 0.31], [0.15, 0.285], [0.24, 0.3], [0.3, 0.29], [0.35, 0.3], [0.4, 0.285], [0.5, 0.3], [0.55, 0.29], [0.59, 0.31], [0.64, 0.285], [0.75, 0.3], [0.8, 0.29], [0.85, 0.3], [0.9, 0.285], [0.03, 0.52], [0.04, 0.66], [0.95, 0.4], [0.3, 0.96], [0.56, 0.97], [0.86, 0.32]];
    arbres.forEach(([fx, fy], i) => ARBRES[i % ARBRES.length](ctx, r, fx * w, fy * h, (62 + r() * 26) * k));
    // le chemin de terre passe devant chaque lieu
    const pts = CHEMIN[disposition()].map((l) => devant(l));
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      const n = Math.max(6, Math.round(Math.hypot(x1 - x0, y1 - y0) / (14 * k)));
      for (let j = 0; j <= n; j++) {
        const u = j / n;
        H.aqua.tache(ctx, r, x0 + (x1 - x0) * u, y0 - 2 + (y1 - y0) * u, 20 * k, 9 * k, "#d8c39a", { alpha: 0.06, couches: 4 });
      }
    }
    // romarin, thym, cistes, lentisques et cades, loin des maisons, du chemin et de la mer
    const libre = (x, y) => {
      for (const id of Object.keys(LIEUX)) {
        const [lx, ly] = position(id);
        if (x > lx - 92 * k && x < lx + 108 * k && y > ly - 140 * k && y < ly + 40 * k) return false;
      }
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const u = Math.max(0, Math.min(1, ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / ((x1 - x0) ** 2 + (y1 - y0) ** 2 || 1)));
        if (Math.hypot(x - x0 - u * (x1 - x0), y - y0 - u * (y1 - y0)) < 22 * k) return false;
      }
      if (portrait ? y > h * 0.84 : x > w * 0.74 && y > h * 0.5) return false;
      return true;
    };
    const buissons = [];
    for (let essai = 0; essai < 1500 && buissons.length < (portrait ? 70 : 110); essai++) {
      const x = r() * w, y = h * (horizon + 0.05) + r() * h * (0.95 - horizon);
      if (libre(x, y)) buissons.push([x, y, Math.floor(r() * 5), (14 + r() * 12) * k]);
    }
    // touffes d'herbes sèches entre les buissons
    for (let i = 0; i < (portrait ? 90 : 140); i++) {
      const x = r() * w, y = h * (horizon + 0.04) + r() * h * (0.95 - horizon);
      if (!libre(x, y)) continue;
      for (let j = 0; j < 3; j++) H.aqua.trait(ctx, r, [[x + j * 2, y], [x + j * 2 + (j - 1) * 3, y - (5 + r() * 5) * k]], { couleur: r() < 0.5 ? "#8a9a5a" : "#b0a060", epaisseur: 1, alpha: 0.6 });
    }
    buissons.sort((a, b) => a[1] - b[1]).forEach(([x, y, sorte, t]) => arbuste(ctx, r, x, y, t, sorte));
    // les troncs des grands pins, derrière les maisons
    for (const g of grandsPins) pinParasol(ctx, H.alea("grand-pin-" + g.id), g.x, g.y, g.t, "tronc");
    // fleurs dans la prairie
    const fleurs = ["#f2c94c", "#f08a9b", "#ffffff", "#b48ad8", "#ff7b00"];
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = h * (horizon + 0.05) + r() * h * 0.66;
      H.aqua.tache(ctx, r, x, y, 2.2, 2, fleurs[i % fleurs.length], { alpha: 0.35, couches: 3 });
    }
    for (const [id, fn] of Object.entries(DESSINS)) dansLeRepere(ctx, id, () => fn(ctx, H.alea("maison-" + id)));
    // les couronnes des grands pins surplombent les toits
    for (const g of grandsPins) pinParasol(ctx, H.alea("grand-pin-" + g.id), g.x, g.y, g.t, "couronne");
    dessinerPonton(ctx, r, ...position("terrain"), portrait);
    dessinerBoite(ctx, r, ...position("lettres"), H.lettres && H.lettres.aLire() > 0);
    scene.fond = c;
  }

  function dessinerPonton(ctx, r, x, y, portrait) {
    const k = echelle();
    const long = 120 * k;
    for (let i = 0; i < 9; i++) {
      const u = i / 8;
      const px = portrait ? x - 26 * k : x - 20 * k + u * long * 0.7, py = portrait ? y - 6 * k + u * long * 0.5 : y - 10 * k + u * long * 0.25;
      const planche = [[px - 24 * k, py - 4 * k], [px + 24 * k, py - 4 * k], [px + 24 * k, py + 4 * k], [px - 24 * k, py + 4 * k]];
      H.aqua.lavis(ctx, r, planche, "#b07a45", { alpha: 0.35, couches: 4, bord: 0.03 });
      H.aqua.trait(ctx, r, planche.concat([planche[0]]), { epaisseur: 0.9, alpha: 0.6 });
    }
    const bx = portrait ? x + 40 * k : x + 80 * k, by = portrait ? y + 30 * k : y + 46 * k;
    const barque = [[bx - 26 * k, by - 6 * k], [bx + 26 * k, by - 6 * k], [bx + 18 * k, by + 8 * k], [bx - 18 * k, by + 8 * k]];
    H.aqua.lavis(ctx, r, barque, "#e9e2cf", { alpha: 0.4, couches: 6 });
    H.aqua.trait(ctx, r, barque.concat([barque[0]]), { epaisseur: 1.3 });
    H.aqua.trait(ctx, r, [[bx - 20 * k, by - 1 * k], [bx + 20 * k, by - 1 * k]], { couleur: "#ff2e9a", epaisseur: 2, alpha: 0.8 });
  }

  function dessinerBoite(ctx, r, x, y, drapeau) {
    const k = echelle();
    H.aqua.trait(ctx, r, [[x, y], [x, y - 34 * k]], { couleur: "#6b4423", epaisseur: 3 });
    const boite = H.aqua.rectArrondi(x - 15 * k, y - 52 * k, 30 * k, 20 * k, 8 * k);
    H.aqua.lavis(ctx, r, boite, "#3a5fd0", { alpha: 0.35, couches: 6 });
    H.aqua.trait(ctx, r, boite.concat([boite[0]]), { epaisseur: 1.3 });
    // le drapeau levé : une lettre attend ; baissé : rien de neuf
    if (drapeau) H.aqua.trait(ctx, r, [[x + 15 * k, y - 46 * k], [x + 15 * k, y - 66 * k], [x + 26 * k, y - 62 * k], [x + 15 * k, y - 58 * k]], { couleur: "#ff2e9a", epaisseur: 2.2 });
    else H.aqua.trait(ctx, r, [[x + 13 * k, y - 40 * k], [x + 24 * k, y - 40 * k], [x + 21 * k, y - 34 * k], [x + 15 * k, y - 40 * k]], { couleur: "#ff2e9a", epaisseur: 1.6, alpha: 0.7 });
  }

  function dessiner() {
    if (!scene) return;
    const { ctx, w, h, dpr } = scene;
    const k = echelle();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene.fond, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // étiquettes des lieux (kraft, Beth Ellen)
    ctx.textAlign = "center";
    for (const [id, l] of Object.entries(LIEUX)) {
      let [x, y] = position(id);
      const survol = scene.survol === id;
      ctx.font = Math.round(19 * Math.max(0.8, k)) + "px 'Beth Ellen', cursive";
      const tw = ctx.measureText(l.nom).width + 16;
      const ey = y + 24 * Math.max(0.8, k);
      x = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, x));
      ctx.fillStyle = survol ? "#ff7b00" : "#c9a878";
      ctx.fillRect(x - tw / 2, ey - 14, tw, 24);
      ctx.strokeStyle = "rgba(60,40,20,0.5)";
      ctx.strokeRect(x - tw / 2 + 0.5, ey - 13.5, tw - 1, 23);
      ctx.fillStyle = "#3a2614";
      ctx.fillText(l.nom, x, ey + 4);
    }
    // Lóló et Mémé viennent se promener au village une fois leur île découverte
    if (H.terrain && H.terrain.ileSecreteOuverte() && H.jeu.vu.ileSecrete) {
      const [px, py] = position("terrain");
      const portrait = disposition() === "portrait";
      const cible = portrait ? w - 60 : px - 90;
      if (scene.loloX == null && !scene.attenteGalop) {
        // une fois par visite, Lóló arrive au galop avec Mémé sur le dos : d'abord le bruit, puis elle
        if (galopDejaVu) scene.loloX = cible;
        else {
          galopDejaVu = true;
          scene.attenteGalop = true;
          H.sons.galop(-60, cible, true, 0.6).then((c) => scene && (scene.courseLolo = c));
        }
      }
      let galope = false;
      if (scene.courseLolo) {
        const pos = H.sons.position(scene.courseLolo, performance.now());
        scene.loloX = pos ? pos.x : null;
        galope = !!(pos && pos.enCourse);
      }
      const image = galope ? Math.floor(performance.now() / 90) % 4 : Math.floor(performance.now() / 700) % 2;
      scene.loloY = portrait ? py - 70 : py - 10;
      if (scene.loloX != null) H.pixel.dessiner(ctx, galope ? "loloGalop" : "lolo", scene.loloX, scene.loloY - (galope && image % 2 ? 3 : 0), 2 * Math.max(0.7, k), image);
    }
    // le soir, Mesi attend ƟvƟ devant le mazet
    const soir = H.ciel.etat().soleil.alt < 3 && new Date().getHours() >= 15;
    if (soir || H.ciel.nuitCalme()) {
      const [mx, my] = position("maison");
      H.pixel.dessiner(ctx, "luigi", mx - 46 * k, my + 2, 3 * Math.max(0.6, k), 0);
    }
    const maintenant = performance.now();
    const dt = Math.min(0.1, (maintenant - (scene.tPrec || maintenant)) / 1000);
    scene.tPrec = maintenant;
    const m = H.ciel.meteo || {};
    if ((H.pluieMagique && H.pluieMagique()) || m.type === "pluie" || m.type === "orage") dessinerPluie(ctx, w, h, dt, m.type === "orage");
    else scene.pluie = null;
    dessinerGoelands(ctx, w, dt);
    const o = scene.ovo;
    const marche = o.chemin && o.chemin.length ? Math.floor(performance.now() / 160) % 2 : 0;
    H.pixel.dessiner(ctx, "ovo", o.x, o.y - (marche ? 2 : 0), 3 * Math.max(0.6, k), marche);
    // lumière du moment (nuit, aube, couchant)
    const alt = H.ciel.etat().soleil.alt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const v of H.ciel.lumiere(alt)) {
      ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha + ")";
      ctx.fillRect(0, 0, scene.toile.width, scene.toile.height);
    }
    if (alt < 2) {
      // fenêtres allumées ; la bougie de la cabane de lecture vacille
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const vacille = 0.45 + Math.sin(performance.now() / 180) * 0.08 + Math.random() * 0.05;
      for (const [id, fenetres] of Object.entries(FENETRES)) {
        dansLeRepere(ctx, id, () => {
          ctx.fillStyle = id === "lecture" ? "rgba(255,180,90," + vacille + ")" : "rgba(255,210,110,0.5)";
          for (const [x, y, fw, fh] of fenetres) {
            if (id === "lecture") {
              ctx.beginPath();
              ctx.moveTo(0, -110);
              ctx.lineTo(54, -10);
              ctx.lineTo(-54, -10);
              ctx.closePath();
              ctx.fill();
            } else ctx.fillRect(x, y, fw, fh);
          }
        });
      }
    }
  }

  // --- la pluie : des gouttes au hasard, de plus en plus nombreuses, qui éclatent au sol -----
  function goutte(w, h, debut) {
    const v = 300 + Math.random() * 240;
    return { x: Math.random() * (w + 60), y: -20 - Math.random() * (debut ? h * 0.5 : 80), v, l: 7 + v / 45 + Math.random() * 5, a: 0.3 + Math.random() * 0.4, fin: h * (0.3 + Math.random() * 0.7) };
  }
  function dessinerPluie(ctx, w, h, dt, orage) {
    const p = scene.pluie || (scene.pluie = { gouttes: [], eclats: [], debut: performance.now(), vent: 0.12 + Math.random() * 0.18 });
    // la pluie commence par quelques gouttes, puis s'installe en une dizaine de secondes
    const voulu = Math.round((orage ? 230 : 170) * Math.min(1, (performance.now() - p.debut) / 10000) ** 1.5);
    while (p.gouttes.length < voulu) p.gouttes.push(goutte(w, h, true));
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineWidth = 1.4;
    for (const g of p.gouttes) {
      g.y += g.v * dt;
      g.x -= g.v * p.vent * dt;
      if (g.y > g.fin) {
        if (Math.random() < 0.6) p.eclats.push({ x: g.x, y: g.fin, t: 0 });
        Object.assign(g, goutte(w, h, false));
        continue;
      }
      ctx.strokeStyle = "rgba(60,100,165," + g.a.toFixed(2) + ")";
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x - g.l * p.vent, g.y + g.l);
      ctx.stroke();
    }
    // petits ronds d'éclaboussure
    ctx.lineWidth = 1;
    p.eclats = p.eclats.filter((e) => (e.t += dt) < 0.3);
    for (const e of p.eclats) {
      ctx.strokeStyle = "rgba(60,100,165," + (0.5 * (1 - e.t / 0.3)).toFixed(2) + ")";
      ctx.beginPath();
      ctx.ellipse(e.x, e.y, 2 + e.t * 18, 1 + e.t * 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- des goélands qui traversent le ciel quand on les entend crier ---------------------
  function lancerGoelands() {
    if (!scene) return;
    const portrait = disposition() === "portrait";
    const haut = scene.h * (portrait ? 0.17 : 0.24);
    const sens = Math.random() < 0.5 ? 1 : -1;
    const n = 1 + Math.floor(Math.random() * 3);
    const y0 = haut * (0.2 + Math.random() * 0.5);
    scene.goelands = scene.goelands || [];
    for (let i = 0; i < n; i++) {
      scene.goelands.push({
        x: sens > 0 ? -30 - i * (30 + Math.random() * 40) : scene.w + 30 + i * (30 + Math.random() * 40),
        y: y0 + (Math.random() - 0.5) * haut * 0.35,
        v: sens * (55 + Math.random() * 30),
        taille: (10 + Math.random() * 5) * Math.max(0.7, echelle()),
        f: 5 + Math.random() * 2,
        ph: Math.random() * 6,
        plane: Math.random() * 6,
      });
    }
  }
  function dessinerGoelands(ctx, w, dt) {
    if (!scene.goelands || !scene.goelands.length) return;
    const t = performance.now() / 1000;
    ctx.save();
    ctx.lineCap = ctx.lineJoin = "round";
    scene.goelands = scene.goelands.filter((g) => {
      g.x += g.v * dt;
      g.y += Math.sin(t * 0.8 + g.ph) * 6 * dt;
      // battements, puis un moment de vol plané
      const b = Math.sin(t * 1.2 + g.plane) > 0.3 ? 0.15 : Math.sin(t * g.f + g.ph);
      const e = g.taille;
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      for (const passe of [0, 1]) {
        if (passe) {
          ctx.strokeStyle = "#4a4540";
          ctx.lineWidth = 1.3;
        }
        ctx.beginPath();
        ctx.moveTo(g.x - e, g.y - b * e * 0.45);
        ctx.quadraticCurveTo(g.x - e * 0.45, g.y - e * 0.4 - b * e * 0.25, g.x, g.y);
        ctx.quadraticCurveTo(g.x + e * 0.45, g.y - e * 0.4 - b * e * 0.25, g.x + e, g.y - b * e * 0.45);
        ctx.stroke();
      }
      return g.v > 0 ? g.x < w + 60 : g.x > -60;
    });
    ctx.restore();
  }

  function dimensionner() {
    const largeur = scene.boite.clientWidth || 800;
    const portrait = largeur < 640;
    scene.w = largeur;
    scene.h = portrait ? Math.round(largeur * 1.75) : Math.round(largeur * 0.6);
    scene.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scene.toile.width = Math.round(scene.w * scene.dpr);
    scene.toile.height = Math.round(scene.h * scene.dpr);
    scene.toile.style.height = scene.h + "px";
    peindreFond();
    if (!scene.ovo.place) {
      const depart = H.ciel.nuitCalme() ? "maison" : scene.depart || "herbotheque";
      [scene.ovo.x, scene.ovo.y] = devant(depart);
      scene.ovo.noeud = depart;
      scene.ovo.chemin = null;
      scene.ovo.place = true;
    }
  }

  // ƟvƟ suit le chemin de lieu en lieu jusqu'à celui qu'on a choisi
  function aller(id) {
    const o = scene.ovo, liste = CHEMIN[disposition()];
    const enRoute = o.chemin && o.chemin.length;
    let i = liste.indexOf(enRoute ? o.chemin[0] : o.noeud);
    const j = liste.indexOf(id);
    if (i < 0) i = j;
    const chemin = enRoute ? [liste[i]] : [];
    for (let n = i; n !== j; n += j > i ? 1 : -1) chemin.push(liste[n + (j > i ? 1 : -1)]);
    if (!chemin.length) chemin.push(id);
    o.chemin = chemin;
    o.but = id;
    if (document.visibilityState === "hidden") {
      [o.x, o.y] = devant(id);
      o.noeud = id;
      arriver(id);
    }
  }

  function arriver(id) {
    scene.ovo.chemin = null;
    H.d.majLocal((l) => (l.dernierLieu = id));
    if (id === "lettres") return ouvrirLettres();
    H.bruit("ouvre");
    H.aller(LIEUX[id].hash);
  }

  function boucle() {
    let derniere = performance.now();
    const pas = (t) => {
      if (!scene) return;
      const dt = Math.min(0.1, (t - derniere) / 1000);
      derniere = t;
      const o = scene.ovo;
      if (o.chemin && o.chemin.length) {
        const [cx, cy] = devant(o.chemin[0]);
        const dx = cx - o.x, dy = cy - o.y, d = Math.hypot(dx, dy), v = 260 * dt;
        if (d <= v) {
          o.x = cx;
          o.y = cy;
          o.noeud = o.chemin.shift();
          if (!o.chemin.length) {
            dessiner();
            return arriver(o.but);
          }
        } else {
          o.x += (dx / d) * v;
          o.y += (dy / d) * v;
        }
      }
      dessiner();
      scene.anim = requestAnimationFrame(pas);
    };
    scene.anim = requestAnimationFrame(pas);
  }

  function lieuSous(e) {
    const rect = scene.toile.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let meilleur = null, dmin = 90 * Math.max(0.6, echelle());
    for (const id of Object.keys(LIEUX)) {
      const [lx, ly] = position(id);
      const d = Math.hypot(lx - x, ly - 40 * echelle() - y);
      if (d < dmin) {
        dmin = d;
        meilleur = id;
      }
    }
    return meilleur;
  }

  function ouvrirLettres() {
    H.bruit("ouvre");
    H.aller("lettres");
  }

  // --- les nouvelles du jour, sous la carte -------------------------------------------
  function nouvelles() {
    const s = H.ciel.etat();
    const mois = s.date.getMonth() + 1;
    const h = s.date.getHours();
    const salut = h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : h < 22 ? "Bonsoir" : "Bonne nuit";
    const plantes = H.d.plantes();
    const enFleurs = plantes.filter((p) => ((p.valeurs || {}).moisFloraison || []).includes(mois));
    const aRecolter = plantes.filter((p) => ((p.valeurs || {}).moisRecolte || []).includes(mois));
    const aSemer = plantes.filter((p) => ((p.valeurs || {}).moisSemis || []).includes(mois));
    const echantillon = (liste) => liste.slice().sort(() => Math.random() - 0.5).slice(0, 6).map((p) => H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, p.nom));
    const virgules = (els) => els.flatMap((e, i) => (i ? [", ", e] : [e]));
    const m = s.meteo;
    return H.el("section.nouvelles", null,
      H.el("h2", null, salut + " ƟvƟ"),
      H.el("p.discret", null, [
        s.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        H.jeu.lieu.nom,
        m ? m.temperature + " °C, " + m.libelle : null,
        s.saison,
        H.ciel.nomPhase(s.lune.phase),
      ].filter(Boolean).join(" · ")),
      H.ciel.nuitCalme()
        ? H.el("p", null, "Il est tard : les flashcartes et le terrain dorment jusqu’à demain matin. Viens plutôt te balader ou lire dans la cabane, à la lueur de la bougie.")
        : null,
      enFleurs.length ? H.el("p", null, H.el("strong", null, "En fleurs ce mois-ci : "), ...virgules(echantillon(enFleurs)), enFleurs.length > 6 ? " et " + (enFleurs.length - 6) + " autres." : ".") : null,
      aRecolter.length ? H.el("p", null, H.el("strong", null, "À récolter : "), ...virgules(echantillon(aRecolter)), aRecolter.length > 6 ? "…" : ".") : null,
      aSemer.length ? H.el("p", null, H.el("strong", null, "À semer : "), ...virgules(echantillon(aSemer)), aSemer.length > 6 ? "…" : ".") : null
    );
  }

  H.vues.village = {
    afficher(c) {
      const boite = H.el("div.village");
      const toile = H.el("canvas.toile-village", { "aria-label": "La ferme" });
      boite.appendChild(toile);
      c.appendChild(boite);
      const liens = H.el("nav.liens-village", { "aria-label": "Lieux de la ferme" },
        Object.entries(LIEUX).map(([id, l]) => H.el("button.bouton.petit", { type: "button", onclick: () => aller(id) }, l.nom)),
        H.lolo && H.lolo.disponible() ? H.el("button.bouton.petit", { type: "button", onclick: () => !H.$(".dialogue") && H.lolo.parler(null) }, "Parler à Lóló") : null
      );
      c.appendChild(liens);
      c.appendChild(nouvelles());
      scene = { boite, toile, ctx: toile.getContext("2d"), ovo: { x: 0, y: 0, cible: null }, depart: H.local.dernierLieu && LIEUX[H.local.dernierLieu] ? H.local.dernierLieu : "herbotheque" };
      dimensionner();
      dessiner();
      boucle();
      toile.addEventListener("click", (e) => {
        // toucher Lóló (une fois son île découverte) : elle raconte des astuces et les plantes du moment
        if (scene.loloX != null && H.lolo && H.lolo.disponible()) {
          const r = toile.getBoundingClientRect();
          const x = e.clientX - r.left, y = e.clientY - r.top;
          if (Math.abs(x - scene.loloX) < 45 && y > scene.loloY - 70 && y < scene.loloY + 10) {
            if (!H.$(".dialogue")) H.lolo.parler(null);
            return;
          }
        }
        const id = lieuSous(e);
        if (id) aller(id);
      });
      toile.addEventListener("mousemove", (e) => {
        const id = lieuSous(e);
        if (id !== scene.survol) {
          scene.survol = id;
          toile.style.cursor = id ? "pointer" : "default";
        }
      });
      scene.redim = H.anti(() => {
        if (!scene) return;
        scene.depart = scene.ovo.noeud || scene.depart;
        scene.ovo.place = false;
        dimensionner();
      }, 200);
      window.addEventListener("resize", scene.redim);
      // en journée, des goélands passent parfois au-dessus de la ferme peu après l'arrivée
      scene.minuteurGoelands = setTimeout(() => {
        if (scene && H.ciel.etat().soleil.alt > 2 && !H.ciel.nuitCalme() && Math.random() < 0.6) {
          if (H.sons && H.sons.goeland) H.sons.goeland();
          lancerGoelands();
        }
      }, 4000 + Math.random() * 8000);
    },
    quitter() {
      if (scene) {
        cancelAnimationFrame(scene.anim);
        clearTimeout(scene.minuteurGoelands);
        window.removeEventListener("resize", scene.redim);
      }
      scene = null;
    },
  };

  H.sur("ciel", () => scene && peindreFond());
  H.sur("goeland", () => scene && lancerGoelands());
  H.sur("lettres", () => {
    if (!scene) return;
    const leve = H.lettres.aLire() > 0;
    if (leve !== scene.drapeau) {
      scene.drapeau = leve;
      peindreFond();
    }
  });
})();
