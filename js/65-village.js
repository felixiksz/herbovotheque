// Le village : l'herbothèque (tiny house sur roues), la cabane à flashcartes (roulotte),
// la cabane de lecture (cabane en A), la maison d'ƟvƟ et Mesi (mazet), la serre,
// le ponton vers les îles et la boîte aux lettres. Des sapins tout autour.
// On clique sur un lieu, ƟvƟ y marche, puis on entre.
(function () {
  const H = window.H;

  // positions en fractions de la scène (paysage / portrait)
  const LIEUX = {
    herbotheque: { nom: "Herbothèque", hash: "herbotheque", paysage: [0.2, 0.5], portrait: [0.3, 0.3] },
    cartes: { nom: "Cabane à flashcartes", hash: "cartes", paysage: [0.45, 0.42], portrait: [0.74, 0.39] },
    lecture: { nom: "Cabane de lecture", hash: "lecture", paysage: [0.68, 0.38], portrait: [0.27, 0.51] },
    maison: { nom: "Chez ƟvƟ et Mesi", hash: "maison", paysage: [0.38, 0.77], portrait: [0.72, 0.62] },
    serre: { nom: "Serre", hash: "serre", paysage: [0.62, 0.68], portrait: [0.3, 0.74] },
    terrain: { nom: "Ponton vers les îles", hash: "terrain", paysage: [0.88, 0.72], portrait: [0.7, 0.9] },
    lettres: { nom: "Boîte aux lettres", hash: null, paysage: [0.08, 0.82], portrait: [0.1, 0.86] },
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
    roue(ctx, r, -30, -10, 11);
    roue(ctx, r, 2, -10, 11);
    forme(ctx, r, rect(-62, -104, 134, 78), "#d7a873");
    for (const x of [-48, -34, 42, 56]) A().trait(ctx, r, [[x, -102], [x, -28]], { couleur: "#9a6f44", epaisseur: 0.8, alpha: 0.6 });
    forme(ctx, r, [[-72, -102], [78, -128], [82, -114], [-68, -88]], "#6b7a8a", 0.32);
    forme(ctx, r, A().rectArrondi(-20, -78, 26, 52, 4), "#3f7a5a", 0.35);
    const fenetre = A().polygone(r, 30, -74, 12, 12, 14);
    forme(ctx, r, fenetre, "#cfe8ef", 0.35, 1.2);
    forme(ctx, r, rect(14, -48, 40, 8), "#5f8a46", 0.35, 1);
    for (const [dx, c] of [[20, "#f08a9b"], [33, "#ffc21a"], [46, "#b48ad8"]]) A().tache(ctx, r, dx, -50, 4, 4, c, { alpha: 0.5, couches: 4 });
    forme(ctx, r, rect(-26, -26, 20, 5), "#a8743f", 0.35, 1);
    forme(ctx, r, rect(-30, -21, 20, 5), "#a8743f", 0.35, 1);
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
    for (const x of [-40, 40]) forme(ctx, r, A().polygone(r, x, -80, 9, 9, 12), "#cfe8ef", 0.35, 1.2);
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
    cartes: [[-49, -89, 18, 18], [31, -89, 18, 18]],
    lecture: [[-40, -60, 80, 50]],
    maison: [[-42, -64, 18, 22], [32, -64, 18, 22]],
  };
  const DESSINS = { herbotheque: tinyHouse, cartes: roulotte, lecture: cabaneA, maison: mazet, serre };

  function dansLeRepere(ctx, id, fn) {
    const [x, y] = position(id);
    const k = echelle();
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(k, k);
    fn();
    ctx.restore();
  }

  // un sapin à l'aquarelle (trois étages)
  function sapin(ctx, r, x, y, taille) {
    A().trait(ctx, r, [[x, y], [x, y - taille * 0.25]], { couleur: "#5a3a22", epaisseur: Math.max(1.5, taille / 18) });
    for (let i = 0; i < 3; i++) {
      const base = y - taille * (0.15 + i * 0.25), large = taille * (0.38 - i * 0.09);
      A().lavis(ctx, r, [[x, base - taille * 0.4], [x + large, base], [x - large, base]], i % 2 ? "#3f6b4a" : "#35603f", { alpha: 0.22, couches: 8, bord: 0.04 });
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
    // mer et ponton
    const mer = portrait ? [[0, h * 0.93], [w, h * 0.86], [w, h], [0, h]] : [[w * 0.74, h], [w * 0.78, h * 0.62], [w * 0.88, h * 0.55], [w, h * 0.52], [w, h]];
    H.aqua.lavis(ctx, r, mer, "#79b5d3", { alpha: 0.12, couches: 14, bord: 0.08 });
    for (let i = 0; i < 8; i++) {
      const x = portrait ? r() * w : w * (0.8 + r() * 0.2), y = portrait ? h * (0.93 + r() * 0.06) : h * (0.62 + r() * 0.35);
      H.aqua.trait(ctx, r, [[x, y], [x + 18, y + 1]], { couleur: "#ffffff", epaisseur: 1.4, alpha: 0.6 });
    }
    // sapins tout autour du village (derrière les maisons)
    const k = echelle();
    const sapins = portrait
      ? [[0.04, 0.24], [0.12, 0.23], [0.9, 0.24], [0.97, 0.26], [0.03, 0.4], [0.96, 0.5], [0.04, 0.63], [0.95, 0.75], [0.5, 0.235], [0.6, 0.24]]
      : [[0.02, 0.3], [0.06, 0.29], [0.1, 0.31], [0.3, 0.29], [0.34, 0.3], [0.55, 0.29], [0.58, 0.31], [0.8, 0.29], [0.84, 0.3], [0.03, 0.5], [0.05, 0.64], [0.95, 0.4], [0.27, 0.95], [0.5, 0.96]];
    for (const [fx, fy] of sapins) sapin(ctx, r, fx * w, fy * h, (46 + r() * 22) * k);
    // chemin de terre qui relie les lieux
    const ordre = portrait ? ["herbotheque", "cartes", "lecture", "maison", "serre", "lettres", "terrain"] : ["lettres", "herbotheque", "cartes", "lecture", "serre", "maison", "terrain"];
    const pts = ordre.map((l) => position(l));
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      for (let j = 0; j <= 12; j++) {
        const u = j / 12;
        H.aqua.tache(ctx, r, x0 + (x1 - x0) * u, y0 + 28 * k + (y1 - y0) * u, 22 * k, 10 * k, "#d8c39a", { alpha: 0.06, couches: 4 });
      }
    }
    // fleurs dans la prairie
    const fleurs = ["#f2c94c", "#f08a9b", "#ffffff", "#b48ad8", "#ff7b00"];
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = h * (horizon + 0.05) + r() * h * 0.66;
      H.aqua.tache(ctx, r, x, y, 2.2, 2, fleurs[i % fleurs.length], { alpha: 0.35, couches: 3 });
    }
    for (const [id, fn] of Object.entries(DESSINS)) dansLeRepere(ctx, id, () => fn(ctx, H.alea("maison-" + id)));
    dessinerPonton(ctx, r, ...position("terrain"), portrait);
    dessinerBoite(ctx, r, ...position("lettres"));
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

  function dessinerBoite(ctx, r, x, y) {
    const k = echelle();
    H.aqua.trait(ctx, r, [[x, y], [x, y - 34 * k]], { couleur: "#6b4423", epaisseur: 3 });
    const boite = H.aqua.rectArrondi(x - 15 * k, y - 52 * k, 30 * k, 20 * k, 8 * k);
    H.aqua.lavis(ctx, r, boite, "#3a5fd0", { alpha: 0.35, couches: 6 });
    H.aqua.trait(ctx, r, boite.concat([boite[0]]), { epaisseur: 1.3 });
    H.aqua.trait(ctx, r, [[x + 15 * k, y - 50 * k], [x + 15 * k, y - 64 * k], [x + 24 * k, y - 60 * k], [x + 15 * k, y - 56 * k]], { couleur: "#ff2e9a", epaisseur: 1.8 });
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
      const image = galope ? Math.floor(performance.now() / 120) % 2 : Math.floor(performance.now() / 700) % 2;
      scene.loloY = portrait ? py - 70 : py - 10;
      if (scene.loloX != null) H.pixel.dessiner(ctx, "lolo", scene.loloX, scene.loloY - (galope && image ? 3 : 0), 2 * Math.max(0.7, k), image);
    }
    // le soir, Mesi attend ƟvƟ devant le mazet
    const soir = H.ciel.etat().soleil.alt < 3 && new Date().getHours() >= 15;
    if (soir || H.ciel.nuitCalme()) {
      const [mx, my] = position("maison");
      H.pixel.dessiner(ctx, "luigi", mx - 46 * k, my + 2, 3 * Math.max(0.6, k), 0);
    }
    const m = H.ciel.meteo || {};
    if ((H.pluieMagique && H.pluieMagique()) || m.type === "pluie" || m.type === "orage") {
      ctx.strokeStyle = "rgba(60,100,165,0.6)";
      ctx.lineWidth = 1.5;
      const t = performance.now() / 1000;
      ctx.beginPath();
      for (let i = 0; i < 150; i++) {
        const x = (i * 97.3) % w, y = ((i * 53.1 + t * (380 + (i % 5) * 30)) % (h + 20)) - 10;
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 13);
      }
      ctx.stroke();
    }
    const o = scene.ovo;
    const marche = o.cible ? Math.floor(performance.now() / 160) % 2 : 0;
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
      const [x, y] = position(depart);
      scene.ovo.x = x + 92 * echelle();
      scene.ovo.y = y + 10;
      scene.ovo.place = true;
    }
  }

  function aller(id) {
    const [x, y] = position(id);
    scene.ovo.cible = { x: x + 88 * echelle(), y: y + 10, id };
    if (document.visibilityState === "hidden") arriver(id);
  }

  function arriver(id) {
    scene.ovo.cible = null;
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
      if (o.cible) {
        const dx = o.cible.x - o.x, dy = o.cible.y - o.y, d = Math.hypot(dx, dy), v = 260 * dt;
        if (d <= v) {
          o.x = o.cible.x;
          o.y = o.cible.y;
          const id = o.cible.id;
          dessiner();
          return arriver(id);
        }
        o.x += (dx / d) * v;
        o.y += (dy / d) * v;
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
    if (H.base.message) H.afficherMessageAccueil();
    else H.dialogue.dire([{ qui: "ovo", texte: "La boîte aux lettres est vide… pour l’instant !" }]);
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
      const toile = H.el("canvas.toile-village", { "aria-label": "Le village" });
      boite.appendChild(toile);
      c.appendChild(boite);
      const liens = H.el("nav.liens-village", { "aria-label": "Lieux du village" },
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
        scene.ovo.place = false;
        dimensionner();
      }, 200);
      window.addEventListener("resize", scene.redim);
    },
    quitter() {
      if (scene) {
        cancelAnimationFrame(scene.anim);
        window.removeEventListener("resize", scene.redim);
      }
      scene = null;
    },
  };

  H.sur("ciel", () => scene && peindreFond());
})();
