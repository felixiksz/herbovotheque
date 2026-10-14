// La maison d'ƟvƟ et Mesi (balades, histoires, compliments), la balade le long des calanques,
// la cabane de lecture à la bougie (on y entend la pluie) et l'écran du soir :
// de 22 h à 6 h, les flashcartes et le terrain dorment, pour ne pas trop stimuler le cerveau.
(function () {
  const H = window.H;
  const histoires = () => H.histoires;
  const loloLa = () => H.lolo && H.lolo.disponible();

  function bouton(texte, fn, classe) {
    return H.el("button.bouton" + (classe || ""), { type: "button", onclick: fn }, texte);
  }

  // --- une histoire racontée dans les bulles ------------------------------------------
  let loloRaconte = false;
  async function raconter(qui) {
    if (qui === "lolo") {
      loloRaconte = true;
      try {
        return await raconterHistoire(qui);
      } finally {
        loloRaconte = false;
      }
    }
    return raconterHistoire(qui);
  }
  async function blagueLolo() {
    await H.lolo.blague({ etape: (id, i) => (farce = id ? { id, etape: i } : null), raconte: (oui) => (loloRaconte = oui) });
  }
  async function raconterHistoire(qui) {
    const h = histoires();
    const liste = qui === "lolo" ? h.LOLO : h.LUIGI;
    const vues = (H.local.histoiresLues || {})[qui] || [];
    let choix = liste.filter((x) => !vues.includes(x.titre));
    if (!choix.length) choix = liste;
    const histoire = h.auHasard(choix);
    H.d.majLocal((l) => {
      l.histoiresLues = Object.assign({}, l.histoiresLues);
      const deja = (l.histoiresLues[qui] || []).filter((t) => t !== histoire.titre);
      l.histoiresLues[qui] = deja.concat(histoire.titre).slice(-liste.length + 1);
    });
    const intro = qui === "lolo"
      ? { qui: "lolo", texte: "Installe-toi bien. Ce soir : « " + histoire.titre + " »." }
      : { qui: "luigi", texte: "J’ai une petite histoire pour toi : « " + histoire.titre + " »." };
    await H.dialogue.dire([intro].concat(histoire.lignes));
  }

  async function complimentMesi() {
    const vus = H.local.complimentsVus || [];
    let restants = histoires().COMPLIMENTS.filter((c) => !vus.includes(c));
    if (!restants.length) restants = histoires().COMPLIMENTS;
    const c = histoires().auHasard(restants);
    H.d.majLocal((l) => (l.complimentsVus = (l.complimentsVus || []).concat(c).slice(-12)));
    await H.dialogue.dire([{ qui: "luigi", texte: c }]);
  }

  // Mesi prépare une crêpe au chocolat fondu (s'il en reste dans les ressources)
  async function crepeMesi(apres) {
    if (!H.ressources.mangerCrepe()) return;
    H.bruit("recolte");
    await H.dialogue.dire([
      { qui: "luigi", texte: H.histoires.auHasard(["Je t’ai fait une crêpe au chocolat fondu. Attention, c’est chaud !", "Une crêpe, le chocolat qui coule sur les côtés… comme tu aimes.", "Assieds-toi, la crêpe arrive ! J’ai mis double chocolat."]) },
      { qui: "ovo", texte: H.histoires.auHasard(["Mmmh… Tu es le·la meilleur·e.", "J’ai du chocolat jusqu’aux lunettes.", "Merci Mesi ! Je repars plein·e d’énergie."]) },
    ]);
    H.toast("+30 d’énergie, et la pause est finie");
    apres && apres();
  }

  // on coche qui vient se promener : Mesi, Lóló, Mémé (seul·e si personne n'est coché)
  function choixCompagnons() {
    const qui = [["luigi", "Mesi"]].concat(loloLa() ? [["lolo", "Lóló"], ["meme", "Mémé"]] : []);
    const coches = new Set(H.local.compagnons || ["luigi"]);
    const cases = qui.map(([id, nom]) => H.el("label.case", null,
      H.el("input", { type: "checkbox", checked: coches.has(id), onchange: (e) => (e.target.checked ? coches.add(id) : coches.delete(id)) }), " " + nom));
    return H.el("div.choix-compagnons", null,
      H.el("div.pastilles", null, ...cases),
      H.el("div.pastilles", null, bouton("Partir en balade", () => {
        const liste = qui.map(([id]) => id).filter((id) => coches.has(id));
        H.d.majLocal((l) => (l.compagnons = liste));
        H.aller("balade/" + (liste.length ? liste.join("+") : "solo"));
      })));
  }

  // --- l'intérieur du mazet ---------------------------------------------------------------
  // Entre la pochette et l'aquarelle : des aplats aux formes arrondies cernés d'encre nuit, un
  // lavis léger sur les murs, un sol en terrazzo et le grain de risographie. Le lit et ses
  // coussins, la table de chevet et sa lampe (qui éclaire le lit et le canapé), le canapé sous
  // la fenêtre aux volets bleus, la table, les deux chaises et la plante derrière la chaise.
  // Mesi, ƟvƟ, Lóló et Mémé sont là ; la fenêtre suit le ciel (nuages, étoiles, vraie lune).
  const ENCRE = "#23214a";
  const MOMENTS = {
    jour: { murG: "#5fb44f", murD: "#d5dc6a", sol: "#efe4d3", plinthe: "#c9b9a2", lampe: true },
    soir: { murG: "#478f3d", murD: "#b9bf55", sol: "#dccdb8", plinthe: "#b3a28b", lampe: true },
    nuit: { murG: "#2f6136", murD: "#858a45", sol: "#b9aa95", plinthe: "#968670", lampe: true },
  };
  function momentMaison() {
    const alt = H.ciel.etat().soleil.alt;
    return alt > 6 ? "jour" : alt > -6 ? "soir" : "nuit";
  }
  function arrondi(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) return ctx.roundRect(x, y, w, h, r);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function bloc(ctx, x, y, w, h, r, couleur, sansTrait) {
    arrondi(ctx, x, y, w, h, r);
    ctx.fillStyle = couleur;
    ctx.fill();
    if (!sansTrait) ctx.stroke();
  }
  function feuille(ctx, x, y, l, angle, couleur) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(l * 0.5, -l * 0.32, l, 0);
    ctx.quadraticCurveTo(l * 0.5, l * 0.32, 0, 0);
    ctx.fillStyle = couleur;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // la fenêtre en plein cintre, comme dans les mazets
  function cheminFenetre(ctx) {
    ctx.beginPath();
    ctx.moveTo(296, 140);
    ctx.lineTo(296, 74);
    ctx.arc(334, 74, 38, Math.PI, 0);
    ctx.lineTo(372, 140);
    ctx.closePath();
  }

  // La lumière de la lampe, à la manière des pochettes : des aplats aux bords nets, plus clairs
  // vers la lampe, un éventail au mur au-dessus de l'abat-jour et une flaque sur le sol. Elle est
  // toujours allumée ; le soir et la nuit, elle se voit d'autant plus que la pièce est sombre.
  function lumiereLampe(ctx, moment) {
    const k = moment === "nuit" ? 1.5 : moment === "soir" ? 1.2 : 1;
    const aplat = (pts, a, c) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = "rgba(" + (c || "255,228,90") + "," + Math.min(0.7, a * k) + ")";
      ctx.fill();
    };
    aplat([[247, 141], [271, 141], [306, 52], [212, 52]], 0.16, "255,240,150");
    aplat([[240, 163], [278, 163], [470, 300], [50, 300]], 0.2);
    aplat([[246, 163], [272, 163], [392, 300], [128, 300]], 0.16, "255,244,170");
    ctx.beginPath(); ctx.ellipse(259, 300, 186, 15, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,236,130," + Math.min(0.6, 0.16 * k) + ")";
    ctx.fill();
  }

  // le décor fixe, peint une fois pour toutes (la vitre reste transparente pour le ciel)
  function decorMaison(w, h, dpr, moment) {
    const M = MOMENTS[moment];
    const c = document.createElement("canvas");
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d"), S = w / 640, r = H.alea("mazet");
    ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = ENCRE;
    ctx.lineWidth = 1.6;
    // les murs, deux couleurs, avec un lavis d'aquarelle
    ctx.fillStyle = M.murG; ctx.fillRect(0, 0, 214, 230);
    ctx.fillStyle = M.murD; ctx.fillRect(214, 0, 426, 230);
    H.aqua.lavis(ctx, r, [[0, 0], [214, 0], [214, 230], [0, 230]], "#ffffff", { alpha: 0.05, couches: 6, bord: 0.3 });
    H.aqua.lavis(ctx, r, [[214, 0], [640, 0], [640, 230], [214, 230]], "#ffffff", { alpha: 0.05, couches: 6, bord: 0.3 });
    ctx.beginPath(); ctx.moveTo(214, 0); ctx.lineTo(214, 230); ctx.stroke();
    // le sol en terrazzo
    ctx.fillStyle = M.sol; ctx.fillRect(0, 230, 640, 130);
    const eclats = ["#ff5b4f", "#3d5ee8", "#ffd23a", "#4aa63e", "#c93f6e", "#23214a", "#ffffff"];
    for (let i = 0; i < 320; i++) {
      const x = r() * 640, y = 234 + r() * 126, t = 1.2 + r() * 3.2;
      ctx.fillStyle = eclats[Math.floor(r() * eclats.length)];
      ctx.globalAlpha = 0.55 + r() * 0.35;
      ctx.beginPath();
      ctx.ellipse(x, y, t, t * (0.5 + r() * 0.4), r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = M.plinthe; ctx.fillRect(0, 226, 640, 6);
    ctx.beginPath(); ctx.moveTo(0, 232); ctx.lineTo(640, 232); ctx.stroke();
    // le tapis rond, rose, sous Lóló
    ctx.beginPath(); ctx.ellipse(338, 322, 118, 22, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#c93f6e"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(338, 322, 96, 15, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#ffb3a8"; ctx.stroke(); ctx.strokeStyle = ENCRE;

    // la fenêtre : volets bleus, encadrement, rebord et géraniums
    bloc(ctx, 266, 40, 26, 102, 6, "#3d5ee8");
    bloc(ctx, 376, 40, 26, 102, 6, "#3d5ee8");
    for (const x of [270, 380]) for (let y = 52; y < 136; y += 12) { ctx.beginPath(); ctx.moveTo(x + 3, y); ctx.lineTo(x + 15, y); ctx.stroke(); }
    ctx.lineWidth = 7; ctx.strokeStyle = "#f2f0e8"; cheminFenetre(ctx); ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
    ctx.save(); ctx.translate(0, 0); cheminFenetre(ctx); ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    cheminFenetre(ctx); ctx.fill();
    ctx.restore();
    cheminFenetre(ctx); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(334, 36); ctx.lineTo(334, 140); ctx.moveTo(296, 96); ctx.lineTo(372, 96); ctx.strokeStyle = "#f2f0e8"; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.6;
    bloc(ctx, 286, 138, 96, 8, 3, "#f2f0e8");
    bloc(ctx, 300, 124, 22, 15, 4, "#c96a3a");
    bloc(ctx, 346, 124, 22, 15, 4, "#c96a3a");
    for (const [x, y] of [[305, 118], [313, 113], [318, 120], [351, 117], [358, 112], [364, 119]]) {
      ctx.beginPath(); ctx.arc(x, y, 4.2, 0, Math.PI * 2); ctx.fillStyle = "#e5333f"; ctx.fill(); ctx.stroke();
    }

    // le lit et ses coussins
    bloc(ctx, 22, 150, 16, 94, 7, "#e9b44c");
    bloc(ctx, 34, 202, 198, 32, 11, "#f2f0e8");
    bloc(ctx, 74, 196, 160, 40, 13, "#3d5ee8");
    bloc(ctx, 74, 196, 30, 40, 12, "#7f97f2");
    bloc(ctx, 40, 182, 42, 23, 11, "#ffffff");
    bloc(ctx, 64, 187, 40, 21, 10, "#ffb3a8");
    bloc(ctx, 42, 234, 8, 12, 3, "#e9b44c");
    bloc(ctx, 218, 234, 8, 12, 3, "#e9b44c");

    // la table de chevet et sa lampe
    bloc(ctx, 240, 196, 38, 52, 7, "#e9b44c");
    ctx.beginPath(); ctx.moveTo(244, 220); ctx.lineTo(274, 220); ctx.stroke();
    ctx.beginPath(); ctx.arc(259, 210, 2.2, 0, Math.PI * 2); ctx.fillStyle = ENCRE; ctx.fill();
    bloc(ctx, 251, 188, 16, 9, 4, ENCRE, true);
    ctx.beginPath(); ctx.moveTo(259, 188); ctx.lineTo(259, 162); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(247, 141); ctx.lineTo(271, 141); ctx.quadraticCurveTo(275, 141, 277, 147);
    ctx.lineTo(280, 160); ctx.quadraticCurveTo(281, 164, 277, 164);
    ctx.lineTo(241, 164); ctx.quadraticCurveTo(237, 164, 238, 160);
    ctx.lineTo(241, 147); ctx.quadraticCurveTo(243, 141, 247, 141);
    ctx.fillStyle = M.lampe ? "#fff06a" : "#ffd23a"; ctx.fill(); ctx.stroke();

    // le canapé corail sous la fenêtre
    bloc(ctx, 292, 170, 136, 46, 17, "#ff5b4f");
    bloc(ctx, 304, 180, 36, 30, 11, "#ffd23a");
    bloc(ctx, 384, 182, 34, 28, 11, "#f2f0e8");
    bloc(ctx, 286, 206, 148, 30, 13, "#ff7a6b");
    bloc(ctx, 278, 188, 24, 50, 11, "#ff5b4f");
    bloc(ctx, 418, 188, 24, 50, 11, "#ff5b4f");
    bloc(ctx, 292, 236, 8, 9, 3, ENCRE);
    bloc(ctx, 420, 236, 8, 9, 3, ENCRE);

    // la table et ses deux chaises ; la plante dans son grand pot, derrière la chaise de droite
    bloc(ctx, 438, 196, 7, 54, 3, "#3d5ee8");
    bloc(ctx, 436, 246, 38, 8, 3, "#3d5ee8");
    bloc(ctx, 438, 254, 6, 40, 2, "#3d5ee8");
    bloc(ctx, 466, 254, 6, 40, 2, "#3d5ee8");
    for (const [x, y, l, a, c2] of [[618, 238, 46, -1.9, "#2f7a3e"], [618, 238, 54, -1.45, "#4f9a46"], [618, 238, 44, -1.1, "#2f7a3e"], [618, 238, 38, -2.4, "#4f9a46"], [618, 238, 36, -0.7, "#3f8a42"], [618, 200, 34, -1.7, "#3f8a42"], [622, 205, 30, -0.95, "#2f7a3e"], [614, 206, 30, -2.25, "#4f9a46"]]) feuille(ctx, x, y, l, a, c2);
    ctx.beginPath();
    ctx.moveTo(600, 236); ctx.lineTo(636, 236); ctx.lineTo(631, 290); ctx.quadraticCurveTo(630, 294, 626, 294);
    ctx.lineTo(610, 294); ctx.quadraticCurveTo(606, 294, 605, 290); ctx.closePath();
    ctx.fillStyle = "#c96a3a"; ctx.fill(); ctx.stroke();
    bloc(ctx, 597, 232, 42, 8, 3, "#d9824f");
    bloc(ctx, 626, 196, 7, 54, 3, "#3d5ee8");
    bloc(ctx, 596, 246, 38, 8, 3, "#3d5ee8");
    bloc(ctx, 598, 254, 6, 40, 2, "#3d5ee8");
    bloc(ctx, 626, 254, 6, 40, 2, "#3d5ee8");

    // le soir et la nuit, la pièce s'assombrit, sauf là où la lampe éclaire (le lit et le canapé)
    if (moment !== "jour") {
      ctx.fillStyle = moment === "nuit" ? "rgba(20,18,64,0.42)" : "rgba(40,30,90,0.22)";
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, 640, 360); cheminFenetre(ctx); ctx.clip("evenodd");
      ctx.fillRect(0, 0, 640, 360);
      ctx.restore();
    }
    if (M.lampe) lumiereLampe(ctx, moment);
    // le grain de risographie
    const grain = document.createElement("canvas");
    grain.width = grain.height = 128;
    const gc = grain.getContext("2d");
    for (let i = 0; i < 900; i++) {
      gc.fillStyle = i % 3 ? "rgba(35,33,74,0.10)" : "rgba(255,255,255,0.14)";
      gc.fillRect(r() * 128, r() * 128, 1, 1);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = ctx.createPattern(grain, "repeat");
    ctx.fillRect(0, 0, w, h);
    return c;
  }

  // la table du goûter : deux tasses de tilleul et deux assiettes de crêpes au chocolat fondu
  function tableGouter(ctx) {
    bloc(ctx, 478, 223, 9, 70, 3, "#e9b44c");
    bloc(ctx, 584, 223, 9, 70, 3, "#e9b44c");
    bloc(ctx, 468, 212, 134, 11, 4, "#e9b44c");
    for (const [x, sens] of [[503, -1], [558, 1]]) {
      bloc(ctx, x, 201, 11, 12, 3, "#ffffff");
      ctx.beginPath(); ctx.arc(sens < 0 ? x : x + 11, 207, 3.2, sens < 0 ? Math.PI / 2 : -Math.PI / 2, sens < 0 ? (3 * Math.PI) / 2 : Math.PI / 2); ctx.stroke();
    }
    for (const x of [526, 547]) {
      ctx.beginPath(); ctx.ellipse(x, 211, 10.5, 3, 0, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill(); ctx.stroke();
      // la crêpe pliée en quatre, le chocolat qui coule
      ctx.beginPath(); ctx.moveTo(x - 7, 210); ctx.quadraticCurveTo(x - 6, 202, x + 1, 201); ctx.lineTo(x + 7, 210); ctx.closePath();
      ctx.fillStyle = "#f2c26b"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 3, 205); ctx.quadraticCurveTo(x, 203, x + 3, 205); ctx.lineTo(x + 3, 208); ctx.quadraticCurveTo(x + 1.5, 209.5, x, 208);
      ctx.fillStyle = "#5a3020"; ctx.fill();
    }
  }

  // Mesi et ƟvƟ assis·es de profil, le dos contre le dossier. Avec leurs proportions d'enfant
  // (grosse tête, jambes courtes), c'est comme des enfants sur des chaises d'adulte : les
  // cuisses posées sur l'assise, les jambes qui pendent sans toucher le sol et se balancent
  // l'une après l'autre. dos : le bord du dossier ; sens 1 = tourné·e vers la droite.
  function assis(ctx, nom, dos, sens, t, phase, retourne) {
    const k = 4.4, siege = 246, genou = 30;
    const mois = new Date().getMonth(), ete = nom === "ovo" && mois >= 4 && mois <= 8;
    const s = H.pixel.sprite(nom + "Profil", 4);
    const souffle = Math.sin(t / 900 + phase) > 0.6 ? 1 : 0;
    const jambe = (angle, pantalon) => {
      ctx.save();
      ctx.translate(genou - 4, siege - 5);
      ctx.rotate(angle);
      bloc(ctx, -5, -2, 10, 19, 5, pantalon);
      if (ete) {
        bloc(ctx, -5, 14, 15, 4, 2, "#1f6fe0");
        bloc(ctx, -6, 17, 17, 4, 2, "#f6c400");
      } else bloc(ctx, -6, 14, 16, 7, 3.5, "#7a4520");
      ctx.restore();
    };
    ctx.save();
    ctx.translate(dos, 0);
    ctx.scale(sens, 1);
    // la jambe de derrière (plus sombre), la cuisse, puis la jambe de devant, en balançoire
    const balance = Math.sin(t / 520 + phase);
    jambe(-0.15 - balance * 0.32, "#2a439a");
    bloc(ctx, 2 * k, siege - 12, genou - 2 * k + 2, 12, 6, "#3a5fd0");
    jambe(-0.15 + balance * 0.32, "#3a5fd0");
    ctx.imageSmoothingEnabled = false;
    const haut = siege + 2 - 18 * k - souffle;
    ctx.drawImage(s, 0, 12, 16, 6, -3 * k, haut + 12 * k, 16 * k, 6 * k);
    // la tête, retournée vers Lóló quand il raconte
    if (retourne) {
      ctx.save();
      ctx.translate(5 * k, 0);
      ctx.scale(-1, 1);
      ctx.translate(-5 * k, 0);
    }
    ctx.drawImage(s, 0, 0, 16, 12, -3 * k, haut, 16 * k, 12 * k);
    if (retourne) ctx.restore();
    ctx.restore();
  }

  // La chanson d'ƟvƟ et Mesi : Mesi commence, ƟvƟ répond « Na-na-nana ! » sur un petit air,
  // et des notes s'envolent au-dessus de la table.
  let chantJusqua = 0;
  function airNanana() {
    if (!H.local || !H.local.son) return;
    const ctx = H.audio.contexte();
    if (!ctx) return;
    let t = ctx.currentTime + 0.05;
    for (const [f, d] of [[659, 0.2], [784, 0.2], [659, 0.16], [523, 0.5]]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.09 * H.volume("voix")), t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(H.audio.sortie());
      o.start(t);
      o.stop(t + d + 0.05);
      t += d * 0.9;
    }
  }
  async function chanson() {
    chantJusqua = performance.now() + 6000;
    await H.dialogue.dire([{ qui: "luigi", texte: "Tu te rends compte de la chance qu’on a…" }]);
    chantJusqua = performance.now() + 3500;
    airNanana();
    await H.dialogue.dire([{ qui: "ovo", texte: "Na-na-nana !" }]);
  }

  // ce qu'on peut faire en cliquant dans la pièce (rectangles dans le dessin de 640 × 360)
  function zonesMaison(nuit) {
    return [
      { id: "fenetre", x: 266, y: 36, w: 136, h: 108, nom: "Faire une balade", agir: fenetreBalade },
      { id: "meme", x: 152, y: 192, w: 34, h: 20, nom: "Caresser Mémé", agir: () => H.dialogue.dire([{ qui: "meme", texte: H.histoires.auHasard(["Rrr… rrr… (Mémé s’étire sans ouvrir les yeux, puis se rendort en boule.)", "Mrrrou. (Elle tend le menton pour qu’on le gratte.)", "Rrrrrrr… (Mémé ronronne si fort que la couverture vibre.)"]) }]) },
      { id: "lolo", x: 116, y: 156, w: 116, h: 54, nom: "Lóló raconte", agir: async () => {
        const choix = [{ valeur: "drame", libelle: "Un drame !" }, { valeur: "blague", libelle: "Une blague !" }];
        if (H.lolo.leMatin()) choix.unshift({ valeur: "dormi", libelle: "Tu as bien dormi ?" });
        const q = await H.dialogue.dire([{ qui: "lolo", texte: "Hiii ! Un drame ou une blague ?", choix: choix.concat({ valeur: null, libelle: "Plus tard" }) }]);
        if (q === "dormi") H.lolo.bienDormi();
        else if (q === "drame") raconter("lolo");
        else if (q === "blague") blagueLolo();
      } },
      { id: "lit", x: 22, y: 150, w: 214, h: 96, nom: nuit ? "Aller dormir" : "Le lit", agir: () => (nuit ? H.lolo.cacherLaLumiere().then(() => H.aller("dodo/dormir")) : H.dialogue.dire([{ qui: "luigi", texte: "Pas encore l’heure de dormir ! Viens plutôt t’asseoir sur le canapé." }])) },
      { id: "canape", x: 278, y: 168, w: 164, h: 78, nom: "Une douceur de Mesi", agir: () => raconter("luigi") },
      { id: "mesi", x: 572, y: 160, w: 66, h: 136, nom: "Un compliment de Mesi", agir: complimentMesi },
      { id: "ovo", x: 428, y: 160, w: 72, h: 136, nom: "Chanter notre chanson", agir: chanson },
      { id: "table", x: 500, y: 196, w: 72, h: 34, nom: "Le goûter", agir: () => (H.ressources.quantite("crepe") > 0
        ? crepeMesi(() => H.aller("maison"))
        : H.dialogue.dire([{ qui: "luigi", texte: "Plus de crêpe pour l’instant… Quelques flashcartes, et je t’en refais une au chocolat fondu !" }])) },
    ];
  }

  // Mémé roulée en boule au pied du lit, qui respire doucement
  function memeEnBoule(ctx, x, y, t, echelle) {
    const souffle = 1 + Math.sin(t / 700) * 0.035;
    ctx.save();
    ctx.translate(x, y);
    if (echelle) ctx.scale(echelle, echelle);
    ctx.scale(souffle, 1 / souffle);
    ctx.beginPath(); ctx.ellipse(0, 0, 19, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#c9ad8a"; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#6b5442"; ctx.lineWidth = 2.2;
    for (const dx of [-8, -1, 6]) { ctx.beginPath(); ctx.moveTo(dx, -9); ctx.quadraticCurveTo(dx + 3, -3, dx, 2); ctx.stroke(); }
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.6;
    // la queue qui fait le tour, la tête posée dessus, les yeux fermés
    ctx.beginPath(); ctx.moveTo(16, 4); ctx.quadraticCurveTo(10, 13, -10, 9); ctx.lineWidth = 4.2; ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.lineWidth = 2.4; ctx.strokeStyle = "#c9ad8a"; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
    ctx.beginPath(); ctx.ellipse(-13, 1, 8, 7, 0, 0, Math.PI * 2); ctx.fillStyle = "#c9ad8a"; ctx.fill(); ctx.stroke();
    for (const s of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(-13 + s * 2, -5); ctx.lineTo(-13 + s * 6, -10); ctx.lineTo(-13 + s * 7, -3); ctx.fillStyle = "#c9ad8a"; ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-17, 1); ctx.quadraticCurveTo(-15.5, 2.5, -14, 1); ctx.moveTo(-12, 1); ctx.quadraticCurveTo(-10.5, 2.5, -9, 1); ctx.stroke();
    ctx.restore();
  }

  // Lóló, la peluche, couché sur le flanc sur le lit comme sur les photos : robe caramel, longues
  // jambes molles allongées, sabots ronds chocolat, crinière courte, petite étoile blanche. Il dort
  // les yeux fermés et respire lentement ; Mémé est blottie entre ses jambes. Quand il raconte une
  // histoire ou une blague, il dresse le cou, tourne la tête vers ƟvƟ et ouvre ses yeux brillants.
  function loloCouche(ctx, x, y, t, raconte) {
    const souffle = 1 + Math.sin(t / 1100) * 0.025;
    const robe = "#b9834f", clair = "#c99a66", choco = "#4b3427", bouche = "#3a2216";
    const jambe = (x0, y0, x1, y1) => {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      ctx.lineWidth = 10.6; ctx.strokeStyle = ENCRE; ctx.stroke();
      ctx.lineWidth = 7.4; ctx.strokeStyle = robe; ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
      ctx.beginPath(); ctx.ellipse(x1, y1, 5.6, 5, 0, 0, Math.PI * 2); ctx.fillStyle = choco; ctx.fill(); ctx.stroke();
    };
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = "round";
    // la queue chocolat, puis les jambes de derrière, allongées sur la couverture
    ctx.beginPath(); ctx.moveTo(40, -16); ctx.quadraticCurveTo(54, -8, 48, 4);
    ctx.lineWidth = 8; ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.lineWidth = 5; ctx.strokeStyle = choco; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
    jambe(30, -8, 12, 6);
    jambe(36, -6, 22, 9);
    // le corps, long et mou
    ctx.save();
    ctx.translate(8, -14);
    ctx.scale(1, souffle);
    ctx.beginPath(); ctx.ellipse(0, 0, 37, 13, -0.04, 0, Math.PI * 2);
    ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-2, 5, 26, 5, -0.04, 0, Math.PI); ctx.fillStyle = clair; ctx.fill();
    ctx.restore();
    // les jambes de devant, allongées vers l'avant
    jambe(-20, -8, -36, 6);
    jambe(-12, -6, -24, 9);
    // l'encolure (posée, ou dressée pour raconter) et la crinière courte
    const a = raconte ? 1.75 + Math.sin(t / 380) * 0.15 : 0;
    ctx.save();
    ctx.translate(-22, -20);
    ctx.rotate(a);
    ctx.translate(22, 20);
    ctx.beginPath();
    ctx.moveTo(-22, -26); ctx.quadraticCurveTo(-40, -26, -46, -12); ctx.lineTo(-36, -6); ctx.quadraticCurveTo(-32, -16, -18, -12); ctx.closePath();
    ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-20, -27); ctx.quadraticCurveTo(-38, -30, -44, -17);
    ctx.lineWidth = 4; ctx.strokeStyle = choco; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
    ctx.restore();
    // la tête de peluche, au bout du cou
    const [ox, oy] = raconte ? [-25, 11] : [-30, 13];
    const hx = -22 + ox * Math.cos(a) - oy * Math.sin(a), hy = -20 + ox * Math.sin(a) + oy * Math.cos(a);
    teteLolo(ctx, hx, hy, { droite: raconte, angle: raconte ? -0.15 + Math.sin(t / 230) * 0.3 : 0.3, ouvert: raconte, parle: raconte, t });
    ctx.restore();
  }

  // La tête de Lóló : ronde, un long museau doux, les oreilles, l'étoile blanche, les yeux noirs
  // brillants (ou fermés quand il dort ou qu'il fait semblant), la bouche qui bouge quand il parle.
  // o.droite : tournée vers la droite (sinon vers la gauche).
  function teteLolo(ctx, x, y, o) {
    const robe = "#b9834f", clair = "#c99a66", choco = "#4b3427";
    ctx.save();
    ctx.translate(x, y);
    if (o.droite) ctx.scale(-1, 1);
    ctx.rotate(o.angle || 0);
    ctx.scale(o.echelle || 1.3, o.echelle || 1.3);
    ctx.lineWidth = 1.6 / (o.echelle || 1.3);
    ctx.strokeStyle = ENCRE;
    for (const dx of [-3, 2]) {
      ctx.beginPath(); ctx.moveTo(dx - 3.2, -5); ctx.quadraticCurveTo(dx - 2.6, -13.5, dx, -16.5); ctx.quadraticCurveTo(dx + 2.4, -12, dx + 2.4, -5); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    }
    ctx.beginPath(); ctx.ellipse(0, 0, 8.5, 7.2, 0, 0, Math.PI * 2); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-10.5, 2.6, 8.5, 6, 0.15, 0, Math.PI * 2); ctx.fillStyle = clair; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-6, -2); ctx.lineTo(-4, -5); ctx.lineTo(-2.5, -2.5); ctx.lineTo(-0.5, -4.5); ctx.lineTo(-1, -1); ctx.lineTo(-4, 0); ctx.closePath();
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.beginPath(); ctx.ellipse(-16, 2.5, 1.4, 0.9, 0.3, 0, Math.PI * 2); ctx.fillStyle = choco; ctx.fill();
    if (o.ouvert) {
      ctx.beginPath(); ctx.arc(1, -0.5, 2.3, 0, Math.PI * 2); ctx.fillStyle = "#151325"; ctx.fill();
      ctx.beginPath(); ctx.arc(0.3, -1.3, 0.8, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-1.5, 0); ctx.quadraticCurveTo(0.8, 1.8, 3, 0); ctx.stroke();
    }
    if (o.parle) {
      ctx.beginPath(); ctx.ellipse(-14, 6, 2.6, 0.5 + Math.abs(Math.sin((o.t || 0) / 120)) * 1.8, 0, 0, Math.PI * 2); ctx.fillStyle = "#3a2216"; ctx.fill();
    }
    ctx.restore();
  }

  // une jambe de peluche : un boudin caramel cerné d'encre, le sabot rond chocolat au bout
  function jambeLolo(ctx, x0, y0, x1, y1) {
    ctx.save();
    ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.lineWidth = 10.6; ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.lineWidth = 7.4; ctx.strokeStyle = "#b9834f"; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
    ctx.beginPath(); ctx.ellipse(x1, y1, 5.6, 5, 0, 0, Math.PI * 2); ctx.fillStyle = "#4b3427"; ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Les farces de Lóló, dans la maison. etape 0 : on ne se doute de rien ; 1 : il se montre.
  let farce = null;
  function dessinerFarce(ctx, t) {
    const vu = farce.etape >= 1, robe = "#b9834f", choco = "#4b3427";
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = ENCRE;
    if (farce.id === "cache") {
      // caché derrière le canapé : les oreilles qui dépassent du dossier, la queue sur le côté
      if (!vu) {
        for (const dx of [0, 9]) {
          ctx.beginPath(); ctx.moveTo(355 + dx, 171); ctx.quadraticCurveTo(355 + dx, 158, 359 + dx, 152 + Math.sin(t / 300 + dx) * 1.5); ctx.quadraticCurveTo(363 + dx, 159, 363 + dx, 171);
          ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
        }
      } else {
        jambeLolo(ctx, 352, 186, 346, 172);
        jambeLolo(ctx, 378, 186, 384, 172);
        teteLolo(ctx, 366, 156 + Math.sin(t / 160) * 1.5, { droite: true, ouvert: true, parle: true, t, angle: -0.1 });
      }
      ctx.save();
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(441, 222); ctx.quadraticCurveTo(452 + Math.sin(t / 140) * 4, 226, 450, 238);
      ctx.lineWidth = 8; ctx.strokeStyle = ENCRE; ctx.stroke();
      ctx.lineWidth = 5; ctx.strokeStyle = choco; ctx.stroke();
      ctx.restore();
    } else if (farce.id === "plante") {
      // debout dans un grand pot, les jambes de devant levées comme des branches, couvert de feuilles
      const x = 338, y = 332;
      jambeLolo(ctx, x - 7, y - 74, x - 30, y - 104 + (vu ? Math.sin(t / 150) * 4 : 0));
      jambeLolo(ctx, x + 7, y - 74, x + 30, y - 108 - (vu ? Math.sin(t / 150) * 4 : 0));
      ctx.beginPath(); ctx.ellipse(x, y - 60, 15, 30, 0, 0, Math.PI * 2); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
      const tremble = Math.sin(t / 90) * 0.12;
      for (const [fx, fy, l, ang] of [[x - 30, y - 104, 14, -2.4], [x - 28, y - 100, 12, -1.2 + tremble], [x + 30, y - 108, 14, -0.7], [x + 26, y - 104, 12, -1.9], [x - 12, y - 60, 12, -2.8], [x + 12, y - 50, 12, -0.3], [x, y - 128, 12, -1.6], [x + 6, y - 126, 11, -0.9]]) {
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * 0.5, -l * 0.32, l, 0); ctx.quadraticCurveTo(l * 0.5, l * 0.32, 0, 0);
        ctx.fillStyle = "#3f8a42"; ctx.fill(); ctx.stroke();
        ctx.restore();
      }
      teteLolo(ctx, x + 4, y - 102, { droite: true, ouvert: vu, parle: vu, t, angle: vu ? Math.sin(t / 200) * 0.2 : -0.35 });
      ctx.beginPath();
      ctx.moveTo(x - 28, y - 34); ctx.lineTo(x + 28, y - 34); ctx.lineTo(x + 21, y); ctx.lineTo(x - 21, y); ctx.closePath();
      ctx.fillStyle = "#c96a3a"; ctx.fill(); ctx.stroke();
      bloc(ctx, x - 31, y - 38, 62, 8, 3, "#d9824f");
    } else if (farce.id === "tete") {
      // assis sur la tête de Mesi, les jambes qui pendent de chaque côté
      const x = 604, y = 156, bonds = vu ? Math.abs(Math.sin(t / 180)) * 3 : 0;
      jambeLolo(ctx, 594, y + 6 - bonds, 584, y + 30 - bonds);
      jambeLolo(ctx, 616, y + 6 - bonds, 626, y + 30 - bonds);
      ctx.beginPath(); ctx.ellipse(x, y - bonds, 19, 12, -0.1, 0, Math.PI * 2); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
      ctx.save();
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(621, y - 4 - bonds); ctx.quadraticCurveTo(634, y - 10 - bonds, 632, y + 6 - bonds);
      ctx.lineWidth = 7; ctx.strokeStyle = ENCRE; ctx.stroke();
      ctx.lineWidth = 4.4; ctx.strokeStyle = choco; ctx.stroke();
      ctx.restore();
      jambeLolo(ctx, 592, y + 2 - bonds, 588, y + 24 - bonds);
      teteLolo(ctx, 588, y - 16 - bonds, { droite: false, ouvert: vu, parle: vu, t, angle: vu ? Math.sin(t / 200) * 0.2 : 0.15 });
    }
  }

  function sceneMaison(toile) {
    const ctx = toile.getContext("2d");
    const nuit = H.ciel.nuitCalme();
    const zones = zonesMaison(nuit);
    let decor = null, calque = null, cle = "", survol = null, derniere = 0;
    const etoiles = Array.from({ length: 26 }, (_, i) => [296 + ((i * 37) % 76), 36 + ((i * 53) % 100), i % 4]);
    const zoneSous = (e) => {
      const r = toile.getBoundingClientRect(), k = 640 / r.width;
      const x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
      return zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) || null;
    };
    toile.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      survol = zoneSous(e);
      toile.style.cursor = survol ? "pointer" : "default";
    });
    toile.addEventListener("pointerleave", () => (survol = null));
    let pointeur = "mouse";
    toile.addEventListener("pointerdown", (e) => (pointeur = e.pointerType));
    // sur téléphone : un premier toucher montre ce que c'est, le second le fait
    toile.addEventListener("click", (e) => {
      const z = zoneSous(e);
      if (!z || H.$(".dialogue")) return;
      if (pointeur !== "mouse" && survol !== z) {
        survol = z;
        return;
      }
      survol = null;
      z.agir();
    });
    function image(t) {
      if (!document.body.contains(toile)) return;
      requestAnimationFrame(image);
      if (t - derniere < 66) return;
      derniere = t;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = toile.clientWidth || 600, h = Math.round((w * 360) / 640);
      const moment = momentMaison();
      if (cle !== w + "|" + moment + "|" + dpr) {
        cle = w + "|" + moment + "|" + dpr;
        toile.width = Math.round(w * dpr);
        toile.height = Math.round(h * dpr);
        decor = decorMaison(w, h, dpr, moment);
      }
      const S = w / 640;
      ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
      ctx.clearRect(0, 0, 640, 360);
      // le ciel dans la fenêtre
      ctx.save();
      cheminFenetre(ctx); ctx.clip();
      const etat = H.ciel.etat();
      if (moment === "jour") {
        ctx.fillStyle = "#7cc4f0"; ctx.fillRect(290, 30, 90, 116);
        ctx.fillStyle = "#ffffff";
        for (const [v, y, l] of [[0.012, 62, 30], [0.008, 104, 22]]) {
          const x = 280 + ((t * v) % 130);
          arrondi(ctx, x, y, l, 9, 4.5); ctx.fill();
          arrondi(ctx, x + l * 0.25, y - 5, l * 0.5, 9, 4.5); ctx.fill();
        }
      } else {
        const g = ctx.createLinearGradient(0, 36, 0, 140);
        if (moment === "soir") { g.addColorStop(0, "#5a4ab0"); g.addColorStop(1, "#f29a6b"); }
        else { g.addColorStop(0, "#131246"); g.addColorStop(1, "#3a3a9a"); }
        ctx.fillStyle = g; ctx.fillRect(290, 30, 90, 116);
        for (const [x, y, n] of etoiles) {
          ctx.fillStyle = "rgba(255,245,230," + (moment === "nuit" ? 0.5 + 0.5 * Math.sin(t / 600 + n * 2 + x) : 0.35) + ")";
          ctx.fillRect(x, y, 1.6, 1.6);
        }
        if (etat.lune.alt > -2 || moment === "nuit") lunePlate(ctx, 352, 62, 10, etat.lune.phase);
      }
      ctx.restore();
      ctx.drawImage(decor, 0, 0, 640, 360);
      // la vapeur du tilleul
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.4;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.strokeStyle = ENCRE;
      ctx.lineWidth = 1.6;
      // Lóló et Mémé en boule sur le lit ; ƟvƟ et Mesi assis·es face à face pour le goûter.
      // Tout ça se peint sur un calque, assombri le soir et relevé par la lampe, comme le décor.
      if (!calque || calque.width !== toile.width || calque.height !== toile.height) {
        calque = document.createElement("canvas");
        calque.width = toile.width;
        calque.height = toile.height;
      }
      const cc = calque.getContext("2d");
      cc.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
      cc.clearRect(0, 0, 640, 360);
      cc.lineJoin = "round";
      cc.lineCap = "round";
      cc.strokeStyle = ENCRE;
      cc.lineWidth = 1.6;
      if (!farce) loloCouche(cc, 172, 200, t, loloRaconte);
      memeEnBoule(cc, 168, 203, t, 0.75);
      assis(cc, "ovo", 445, 1, t, 2, loloRaconte);
      assis(cc, "luigi", 626, -1, t, 4);
      cc.strokeStyle = ENCRE;
      cc.lineWidth = 1.6;
      tableGouter(cc);
      if (farce) dessinerFarce(cc, t);
      cc.globalCompositeOperation = "source-atop";
      if (moment !== "jour") {
        cc.fillStyle = moment === "nuit" ? "rgba(20,18,64,0.42)" : "rgba(40,30,90,0.22)";
        cc.fillRect(0, 0, 640, 360);
      }
      lumiereLampe(cc, moment);
      cc.globalCompositeOperation = "source-over";
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(calque, 0, 0);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.4;
      for (const cx of [508, 563]) for (let i = 0; i < 2; i++) {
        const u = ((t / 1600) + i * 0.5 + cx / 100) % 1;
        ctx.globalAlpha = 1 - u;
        ctx.beginPath();
        for (let k = 0; k <= 9; k++) {
          const y = 199 - k * 2.2 - u * 10, x = cx - 2 + i * 4 + Math.sin(k / 2 + t / 400 + i) * 2;
          k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.strokeStyle = ENCRE;
      ctx.lineWidth = 1.6;
      // les notes de la chanson, qui montent au-dessus de la table
      if (chantJusqua > t) {
        ctx.font = "16px serif";
        ctx.textAlign = "center";
        for (let i = 0; i < 6; i++) {
          const u = ((t / 1400) + i / 6) % 1;
          ctx.globalAlpha = Math.min(1, (chantJusqua - t) / 600) * (1 - u);
          ctx.fillStyle = i % 2 ? "#ff5b4f" : ENCRE;
          ctx.fillText(i % 3 ? "♪" : "♫", 470 + (i % 3) * 50 + Math.sin(u * 6 + i) * 6, 170 - u * 60);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = "start";
      }
      {
        const v = 0.03 + 0.025 * Math.sin(t / 170) * Math.sin(t / 430);
        ctx.fillStyle = "rgba(255,226,90," + v + ")";
        ctx.beginPath(); ctx.moveTo(240, 163); ctx.lineTo(278, 163); ctx.lineTo(470, 300); ctx.lineTo(50, 300); ctx.closePath(); ctx.fill();
      }
      // le nom de ce qu'on survole
      if (survol) {
        ctx.font = "13px 'Suez One', serif";
        const l = ctx.measureText(survol.nom).width + 18;
        const x = Math.max(4, Math.min(636 - l, survol.x + survol.w / 2 - l / 2)), y = Math.max(4, survol.y - 26);
        ctx.lineWidth = 1.4;
        bloc(ctx, x, y, l, 22, 11, "#f2f0e8");
        ctx.fillStyle = ENCRE;
        ctx.textBaseline = "middle";
        ctx.fillText(survol.nom, x + 9, y + 12);
      }
    }
    requestAnimationFrame(image);
  }

  // --- la maison ------------------------------------------------------------------------
  // La maison, c'est la scène et rien d'autre : pas d'en-tête, pas de titre, pas de papier autour.
  // Tout se fait en cliquant sur la pièce ; une petite porte en haut à gauche ramène à la ferme.
  let toileMaison = null;
  function fenetreBalade() {
    let fermer;
    const corps = H.el("div", null, H.el("h2", null, "Faire une balade"), choixCompagnons());
    fermer = H.fenetre(corps);
    return fermer;
  }
  H.vues.maison = {
    afficher(c) {
      c.appendChild(H.el("div.page-maison", null,
        (toileMaison = H.el("canvas.scene-maison", { role: "img", "aria-label": "L’intérieur du mazet : le lit, le canapé sous la fenêtre, la table, Mesi, Lóló et Mémé" })),
        H.el("a.sortie-maison", { href: "#village", "aria-label": "Retour à la ferme", title: "Retour à la ferme" }, "‹ Ferme")
      ));
      sceneMaison(toileMaison);
    },
  };

  // --- la balade --------------------------------------------------------------------------
  let balade = null;

  // La balade façon pochette de disque : aplats aux formes arrondies, ciel en dégradé,
  // grain de risographie. De jour, le calcaire blanc, la mer turquoise et les pins parasols ;
  // de nuit, des collines sombres sous un ciel violet et la vraie lune.
  function scene(toile, compagnons) {
    const ctx = toile.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = toile.clientWidth || 600;
    const h = window.innerWidth < 640 ? 300 : 360;
    toile.width = Math.round(w * dpr);
    toile.height = Math.round(h * dpr);
    toile.style.height = h + "px";
    const nuit = H.ciel.etat().soleil.alt < -4;
    const etoiles = Array.from({ length: 60 }, (_, i) => [(i * 137.5) % w, (i * 53.3) % (h * 0.45), (i % 3) * 0.3 + 0.4]);
    const tirage = (graine, n) => {
      const r = H.alea(graine);
      return Array.from({ length: n }, () => r());
    };
    const ra = H.alea("arbres-balade");
    const arbres = [], devant = [];
    for (let D = 0; D < CYCLE; D += 160 + ra() * 230) arbres.push([D, 90 + ra() * 90 + (ra() < 0.18 ? 120 : 0)]);
    for (let D = 300; D < CYCLE; D += 1000 + ra() * 900) devant.push([D, h * (1.05 + ra() * 0.3)]);
    // le grain de risographie, une fois pour toutes
    const grain = H.aqua.toile(256, 256);
    {
      const g = grain.getContext("2d"), r = H.alea("grain-balade");
      for (let i = 0; i < 7000; i++) {
        g.fillStyle = r() < 0.55 ? "rgba(35,33,74," + r() * 0.12 + ")" : "rgba(255,255,255," + r() * 0.16 + ")";
        g.fillRect(r() * 256, r() * 256, 1, 1);
      }
    }
    return {
      ctx, dpr, w, h, nuit, etoiles, arbres, devant, grain,
      couvert: H.ciel.couvert(nuit),
      profils: { falaises: tirage("falaises", 24), rochers: tirage("rochers", 24), collines: tirage("collines", 24), collines2: tirage("collines2", 24), nuages: tirage("nuages", 12) },
      decalage: 0, compagnons, derniere: performance.now(),
    };
  }

  // --- les formes en aplat --------------------------------------------------------------------
  const boucler = (x, w, marge) => ((x % (w + marge * 2)) + w + marge * 2) % (w + marge * 2) - marge;
  // des falaises de calcaire aux crêtes arrondies : un flanc au soleil, un flanc à l'ombre
  function falaisesPlates(ctx, w, base, haut, decal, valeurs, clair, ombre, pas) {
    const n = valeurs.length, total = pas * n, d = ((decal % total) + total) % total;
    const v = (k) => valeurs[((k % n) + n) % n];
    const sommet = (k) => base - haut * (0.35 + v(k) * 0.65);
    const creux = (k) => base - haut * 0.3 * Math.min(v(k), v(k + 1));
    const doux = (t) => Math.pow(Math.sin((t * Math.PI) / 2), 0.8);
    const profilY = (x) => {
      const u = (x + d) / pas, k = Math.floor(u), f = u - k;
      return f < 0.5 ? creux(k - 1) + (sommet(k) - creux(k - 1)) * doux(f * 2) : sommet(k) + (creux(k) - sommet(k)) * (1 - doux((1 - f) * 2));
    };
    ctx.fillStyle = clair;
    ctx.beginPath();
    ctx.moveTo(0, base + 2);
    for (let x = 0; x <= w + 3; x += 3) ctx.lineTo(x, profilY(x));
    ctx.lineTo(w, base + 2);
    ctx.fill();
    ctx.fillStyle = ombre;
    for (let k = Math.floor(d / pas) - 1; k < Math.floor((d + w) / pas) + 2; k++) {
      const xs = k * pas + pas * 0.5 - d, xe = (k + 1) * pas - d;
      ctx.beginPath();
      ctx.moveTo(xs, profilY(xs));
      for (let x = xs; x <= xe; x += 3) ctx.lineTo(x, profilY(x));
      ctx.lineTo(xe, base + 2);
      ctx.quadraticCurveTo(xs + pas * 0.1, base - haut * 0.1, xs + pas * 0.06, profilY(xs) + haut * 0.2);
      ctx.closePath();
      ctx.fill();
    }
  }
  // des collines lisses (la nuit)
  function collinesPlates(ctx, w, base, haut, decal, valeurs, couleur, pas) {
    const n = valeurs.length, total = pas * n, d = ((decal % total) + total) % total;
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.moveTo(0, base + 500);
    for (let x = 0; x <= w + 4; x += 4) {
      const u = (x + d) / pas, k = Math.floor(u), f = u - k;
      const a = valeurs[k % n], b2 = valeurs[(k + 1) % n];
      ctx.lineTo(x, base - haut * (0.3 + (a + (b2 - a) * (0.5 - Math.cos(f * Math.PI) / 2)) * 0.7));
    }
    ctx.lineTo(w, base + 500);
    ctx.fill();
  }
  // un pin parasol en aplat : tronc sinueux, branches, couronne en nuage plat
  function pinPlat(ctx, x, base, t, couleur, dessous, tronc) {
    ctx.strokeStyle = tronc;
    ctx.lineWidth = Math.max(2.5, t * 0.045);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x, base);
    ctx.bezierCurveTo(x + t * 0.18, base - t * 0.3, x - t * 0.16, base - t * 0.55, x + t * 0.04, base - t * 0.84);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, t * 0.025);
    ctx.beginPath(); ctx.moveTo(x - t * 0.02, base - t * 0.62); ctx.quadraticCurveTo(x - t * 0.2, base - t * 0.72, x - t * 0.3, base - t * 0.82); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + t * 0.03, base - t * 0.7); ctx.quadraticCurveTo(x + t * 0.2, base - t * 0.76, x + t * 0.32, base - t * 0.86); ctx.stroke();
    const cy = base - t * 0.9;
    ctx.fillStyle = dessous;
    ctx.beginPath(); ctx.ellipse(x + t * 0.02, cy + t * 0.03, t * 0.52, t * 0.07, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.moveTo(x - t * 0.52, cy + t * 0.02);
    for (const [dx, ry] of [[-0.36, 0.1], [-0.14, 0.14], [0.1, 0.13], [0.32, 0.1]]) ctx.ellipse(x + dx * t, cy, t * 0.2, ry * t, 0, Math.PI, 0);
    ctx.lineTo(x + t * 0.54, cy + t * 0.02);
    ctx.closePath();
    ctx.fill();
  }
  // un buisson de garrigue, en aplat
  function buissonPlat(ctx, x, base, t, couleur) {
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.moveTo(x - t, base);
    ctx.ellipse(x - t * 0.45, base, t * 0.55, t * 0.5, 0, Math.PI, 0);
    ctx.ellipse(x + t * 0.35, base, t * 0.65, t * 0.62, 0, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
  // un nuage plat, bien arrondi
  function nuagePlat(ctx, x, y, t, couleur) {
    ctx.fillStyle = couleur;
    ctx.beginPath();
    ctx.ellipse(x, y, t, t * 0.32, 0, 0, Math.PI * 2);
    ctx.ellipse(x - t * 0.35, y - t * 0.12, t * 0.4, t * 0.3, 0, 0, Math.PI * 2);
    ctx.ellipse(x + t * 0.25, y - t * 0.2, t * 0.45, t * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // la lune telle qu'elle est ce soir (phase : 0 nouvelle, 0,5 pleine)
  function lunePlate(ctx, x, y, R, p) {
    ctx.fillStyle = "rgba(243,239,216,0.14)";
    ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
    const k = Math.cos(2 * Math.PI * p);
    ctx.fillStyle = "#f3efd8";
    ctx.beginPath();
    if (p < 0.5) {
      ctx.arc(x, y, R, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(x, y, Math.abs(k) * R, R, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    } else {
      ctx.arc(x, y, R, Math.PI / 2, (3 * Math.PI) / 2, false);
      ctx.ellipse(x, y, Math.abs(k) * R, R, 0, -Math.PI / 2, Math.PI / 2, k > 0);
    }
    ctx.fill();
  }

  // Le chemin passe par la terre rouge : rochers rouges et petite crique où l'on peut se baigner.
  const CYCLE = 4200, ROUGE = [650, 2900], DUNES = [2950, 3550], FALAISES = [3600, 4180];
  function zone(X, [a, b], fondu) {
    const x = ((X % CYCLE) + CYCLE) % CYCLE;
    return Math.max(0, Math.min(1, (x - a) / fondu, (b - x) / fondu));
  }
  const rouge = (X) => zone(X, ROUGE, 320);
  const dunes = (X) => zone(X, DUNES, 220);
  const falaises = (X) => zone(X, FALAISES, 200);
  // le relief du chemin : des collines dans la garrigue, de longues dunes, presque plat au pied des falaises
  function relief(X) {
    const collines = Math.sin(X / 190) * 0.55 + Math.sin(X / 73 + 1.3) * 0.25 + 0.8;
    const dune = Math.sin(X / 120) * 0.5 + 0.5;
    const d = dunes(X), f = falaises(X);
    return collines * (1 - d) * (1 - f * 0.7) + dune * d * 1.2;
  }
  // la perspective aérienne : plus c'est loin, plus la couleur se noie dans le bleu de l'air
  // (ou dans le rose du couchant). Accepte « #rrggbb » et « rgb(r,g,b) ».
  function rvb(c) {
    if (c[0] === "#") return [0, 1, 2].map((i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16));
    return c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
  }
  function brume(c, part, air) {
    const a = rvb(c), b = rvb(air);
    return "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * part)).join(",") + ")";
  }
  function melange(a, b, t) {
    const c = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    return "rgb(" + [0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t)).join(",") + ")";
  }
  // des éléments du décor posés à des moments précis du chemin (dans chaque tour du cycle)
  function poses(liste, b, par, fn) {
    const { w, decalage } = b.s;
    const tour = Math.floor(decalage / CYCLE);
    for (let c = tour - 1; c <= tour + 1; c++) {
      for (const [D, ...reste] of liste) {
        const x = (D + c * CYCLE - decalage) * par + w * 0.5;
        if (x > -400 && x < w + 400) fn(x, ...reste);
      }
    }
  }

  function dessinerBalade() {
    const b = balade;
    if (!b) return;
    const S = b.s, { ctx, dpr, w, h } = S;
    const t = performance.now();
    const dt = Math.min(0.1, (t - S.derniere) / 1000);
    S.derniere = t;
    if (!b.pause) S.decalage += dt * 40;
    const avance = S.decalage;
    const etat = H.ciel.etat();
    const alt = etat.soleil.alt;
    const nuit = alt < -4;
    const ici = rouge(avance);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // le ciel : bleu franc le jour, les vraies couleurs de l'aube et du couchant, violet la nuit
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    if (nuit) {
      g.addColorStop(0, "#15124a"); g.addColorStop(0.55, "#3a3aa8"); g.addColorStop(0.85, "#8a58cc"); g.addColorStop(1, "#d07ab8");
    } else if (alt > 8) {
      g.addColorStop(0, "#2f8fe0"); g.addColorStop(1, "#a9dcf7");
    } else {
      const teinte = H.ciel.teinteCiel(alt, H.ciel.estMatin ? H.ciel.estMatin() : undefined);
      g.addColorStop(0, teinte.haut); g.addColorStop(1, teinte.bas);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (nuit) {
      for (const [x, y, a] of S.etoiles) {
        ctx.fillStyle = "rgba(255,240,250," + (a + Math.sin(t / 700 + x) * 0.15) + ")";
        ctx.fillRect(x, y, 1.6, 1.6);
      }
      // une étoile filante, de temps en temps
      const f = ((t / 1000) % 9) / 9;
      if (f < 0.07) {
        ctx.strokeStyle = "rgba(255,255,255," + (1 - f / 0.07) + ")";
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(w * 0.62 + f * 600, h * 0.08 + f * 300); ctx.lineTo(w * 0.62 + f * 600 - 46, h * 0.08 + f * 300 - 24); ctx.stroke();
      }
    }
    // la vraie lune, avec sa phase de ce soir
    if (alt < 4) lunePlate(ctx, w * 0.8, h * 0.16, 16, etat.lune.phase);
    // les nuages, quand le ciel est couvert
    if (S.couvert) {
      if (S.couvert.voile) {
        ctx.fillStyle = "rgba(" + S.couvert.voile + ")";
        ctx.fillRect(0, 0, w, h * 0.6);
      }
      S.profils.nuages.forEach((v, i) => {
        if (i >= S.couvert.n * 2) return;
        nuagePlat(ctx, boucler(i * 170 + v * 90 - avance * 0.12 - (t / 1000) * 5, w, 120), h * (0.08 + v * 0.22), 50 + v * 50, S.couvert.couleur);
      });
    }
    // au loin : les falaises de calcaire (rouges en terre rouge), ou des collines la nuit ;
    // bleuies par l'air qui les sépare de nous
    const air = nuit ? "#3a3aa8" : alt > 8 ? "#9fcdf0" : H.ciel.teinteCiel(alt, H.ciel.estMatin ? H.ciel.estMatin() : undefined).bas;
    if (nuit) {
      collinesPlates(ctx, w, h * 0.58, h * 0.14, avance * 0.1, S.profils.collines, brume("#2a2c6a", 0.25, air), 160);
    } else {
      falaisesPlates(ctx, w, h * 0.58, h * 0.26, avance * 0.1, S.profils.falaises, brume(melange("#f4f1e8", "#d98a5c", ici), 0.42, air), brume(melange("#cfc8b8", "#b0583a", ici), 0.48, air), 110);
      for (let i = 0; i < 9; i++) buissonPlat(ctx, boucler(i * 140 - avance * 0.1, w, 60), h * 0.58, 16, brume("#4a9a4e", 0.5, air));
    }
    // la mer
    ctx.fillStyle = nuit ? "#26406a" : melange("#12aec4", "#19c1c7", ici);
    ctx.fillRect(0, h * 0.58, w, h * 0.14);
    ctx.fillStyle = nuit ? "#1e3358" : "#0d8fae";
    ctx.fillRect(0, h * 0.58, w, h * 0.02);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 12; i++) ctx.fillRect(boucler(i * 110 - avance * 0.4, w, 40), h * 0.62 + (i % 4) * 7, 22, 1.8);
    // au pied des falaises : une grande paroi de calcaire qui monte juste derrière le chemin
    const f0 = falaises(avance);
    if (f0 > 0.01 && !nuit) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f0 * 1.4);
      falaisesPlates(ctx, w, h * 0.76, h * 0.62, avance * 0.7, S.profils.falaises, brume("#efeadf", 0.1, air), brume("#c9c1ae", 0.12, air), 140);
      ctx.restore();
    }
    // les rochers du rivage : calcaire blanc, ou rouges dans la terre rouge
    if (nuit) collinesPlates(ctx, w, h * 0.73, h * 0.08, avance * 0.55, S.profils.collines2, "#22443c", 110);
    else falaisesPlates(ctx, w, h * 0.73, h * 0.13, avance * 0.6, S.profils.rochers, brume(melange("#ebe6da", "#c9643f", ici), 0.14, air), brume(melange("#bdb5a3", "#9a4527", ici), 0.16, air), 70);
    // le sol du chemin à l'abscisse x de l'écran : il monte et descend avec le relief
    const X = (x) => avance + x - w * 0.42;
    const sol = (x) => h * 0.92 - relief(X(x)) * h * 0.1;
    // dans les dunes : de grandes bosses de sable derrière le chemin
    const d0 = dunes(avance);
    if (d0 > 0.01) {
      ctx.fillStyle = nuit ? "rgba(70,70,90," + d0 + ")" : "rgba(236,213,160," + d0 + ")";
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w + 6; x += 6) ctx.lineTo(x, sol(x) - h * 0.2 - (Math.sin((X(x) * 0.7) / 90) * 0.5 + 0.5) * h * 0.1);
      ctx.lineTo(w, h);
      ctx.fill();
    }
    // le chemin piéton, qui épouse le relief : beige, sable dans les dunes, terre rouge
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w + 6; x += 6) ctx.lineTo(x, sol(x) - h * 0.15);
    ctx.lineTo(w, h);
    const gr = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 10; i++) {
      const xx = (i / 10) * w, rg = rouge(X(xx)), du = dunes(X(xx));
      gr.addColorStop(i / 10, nuit ? melange("#2f4a36", "#5e3a2a", rg) : du > rg ? melange("#e3c08e", "#efd9a6", du) : melange("#e3c08e", "#c9653d", rg));
    }
    ctx.fillStyle = gr;
    ctx.fill();
    for (let i = 0; i < 20; i++) {
      const x = boucler(i * 73 - avance, w, 30);
      ctx.fillStyle = nuit ? "#3a4a3a" : i % 3 ? "#f3e2cf" : "#a8552f";
      ctx.beginPath();
      ctx.ellipse(x, sol(x) - h * (0.11 - (i % 5) * 0.022), 3 + (i % 3), 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // la garrigue au bord du chemin (des oyats dans les dunes), et les pins parasols de toutes tailles
    for (let i = 0; i < 14; i++) {
      const x = boucler(i * 95 - avance * 0.9, w, 50);
      if (dunes(X(x)) > 0.5 && !nuit) {
        ctx.strokeStyle = "#8a9a4a"; ctx.lineWidth = 1.6;
        for (let j = 0; j < 5; j++) { ctx.beginPath(); ctx.moveTo(x + j * 3, sol(x) - h * 0.15); ctx.lineTo(x + j * 3 + (j - 2) * 3, sol(x) - h * 0.15 - 14 - (j % 2) * 6); ctx.stroke(); }
      } else buissonPlat(ctx, x, sol(x) - h * 0.15, 12 + (i % 3) * 5, nuit ? "#163024" : i % 2 ? "#2f7a3e" : "#4f9a46");
    }
    poses(S.arbres, b, 0.85, (x, taille) => {
      if (dunes(X(x)) > 0.6) return;
      if (nuit) pinPlat(ctx, x, sol(x) - h * 0.14, taille, "#132a1e", "#0f2218", "#132a1e");
      else pinPlat(ctx, x, sol(x) - h * 0.14, taille, taille > 160 ? "#1f7a3a" : "#2d8f45", "#155a2a", "#5a3a2a");
    });
    // les promeneurs, de profil : de vrais pas alternés
    const pas = (decale) => (b.pause ? 4 : (Math.floor(t / 170) + decale) % 4);
    const avec = (q) => S.compagnons.includes(q);
    if (avec("lolo")) H.pixel.dessiner(ctx, avec("meme") ? "loloBalade" : "loloSeule", w * 0.2, sol(w * 0.2) - h * 0.05, 2.4, b.pause ? 0 : Math.floor(t / 230) % 4);
    // Mémé sans Lóló trottine devant, sur ses quatre pattes
    if (avec("meme") && !avec("lolo") && !b.baignade) H.pixel.dessiner(ctx, "memePas", w * 0.5, sol(w * 0.5) - h * 0.055, 2.4, b.pause ? 0 : Math.floor(t / 200) % 2);
    if (b.baignade) dessinerBaignade(ctx, b, t, w, h);
    else {
      if (avec("luigi")) H.pixel.dessiner(ctx, "luigiProfil", w * 0.33, sol(w * 0.33) - h * 0.055, 3, pas(2));
      H.pixel.dessiner(ctx, "ovoProfil", w * 0.42, sol(w * 0.42) - h * 0.06, 3, pas(0));
    }
    // devant : l'autre bord du chemin, et parfois un grand pin qui passe tout près
    for (let i = 0; i < 12; i++) buissonPlat(ctx, boucler(i * 110 - avance * 1.25, w, 60), h + 4, 22 + (i % 3) * 8, nuit ? "#10241a" : i % 2 ? "#2f8a3e" : "#3fa04a");
    poses(S.devant, b, 1.3, (x, taille) => pinPlat(ctx, x, h * 1.04, taille, nuit ? "#0f2218" : "#1f6b34", nuit ? "#0b1a12" : "#134a24", nuit ? "#0f2218" : "#4a2e20"));
    // on peut aller se baigner quand le chemin longe la crique aux rochers rouges
    if (b.bain) b.bain.hidden = !(ici > 0.6 && !b.baignade && !H.$(".dialogue"));
    // la pluie, quand il pleut vraiment (ou que Lóló l'a fait tomber)
    const m = H.ciel.meteo || {};
    if ((H.pluieMagique && H.pluieMagique()) || m.type === "pluie" || m.type === "orage") {
      const gouttes = S.gouttes || (S.gouttes = []);
      while (gouttes.length < 120) gouttes.push({ x: Math.random() * (w + 40), y: -Math.random() * h, v: 280 + Math.random() * 200, a: 0.3 + Math.random() * 0.4 });
      ctx.lineWidth = 1.3;
      for (const d of gouttes) {
        d.y += d.v * dt;
        d.x -= d.v * 0.15 * dt;
        if (d.y > h) Object.assign(d, { x: Math.random() * (w + 40), y: -10 - Math.random() * 40 });
        ctx.strokeStyle = "rgba(60,100,165," + d.a.toFixed(2) + ")";
        ctx.beginPath();
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - 2, d.y + 12);
        ctx.stroke();
      }
    }
    // le grain de risographie, puis la lumière de l'aube ou du couchant
    ctx.fillStyle = ctx.createPattern(S.grain, "repeat");
    ctx.fillRect(0, 0, w, h);
    if (!nuit) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const v of H.ciel.lumiere(alt)) {
        ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha * 0.6 + ")";
        ctx.fillRect(0, 0, b.toile.width, b.toile.height);
      }
    }
    b.anim = requestAnimationFrame(dessinerBalade);
  }

  // la tête hors de l'eau, face à face, des ronds dans l'eau ; parfois une bouée flamant rose passe
  function ronds(ctx, x, eau, t, ph) {
    ctx.strokeStyle = "rgba(255,255,255,0.75)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 2; i++) {
      const u = ((t / 45 + ph * 30 + i * 9) % 18) / 18;
      ctx.globalAlpha = 1 - u;
      ctx.beginPath();
      ctx.ellipse(x, eau + 1, 16 + u * 18, 3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function dessinerBaignade(ctx, b, t, w, h) {
    const eau = h * 0.66;
    // ƟvƟ regarde vers la droite ; Mesi, en face, regarde vers ƟvƟ
    const nageurs = [["ovoProfil", w * 0.46, 0, false]];
    if (b.s.compagnons.includes("luigi")) nageurs.push(["luigiProfil", w * 0.56, 1.7, true]);
    for (const [nom, x, ph, miroir] of nageurs) {
      const y = eau + 40 + Math.sin(t / 500 + ph) * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, eau);
      ctx.clip();
      H.pixel.dessiner(ctx, nom, x, y, 3, 4, miroir);
      ctx.restore();
      ronds(ctx, x, eau, t, ph);
    }
    // la bouée flamant rose : elle dérive de droite à gauche, et dit bonjour en passant
    const f = b.flamant || (b.flamant = { prochain: t + 5000 + Math.random() * 9000 });
    if (f.x == null && t > f.prochain) Object.assign(f, { x: w + 40, parle: false });
    if (f.x != null) {
      f.x -= 0.028 * (t - (f.dernier || t));
      const y = eau + 4 + Math.sin(t / 420) * 2.5;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, eau + 3);
      ctx.clip();
      H.pixel.dessiner(ctx, "flamant", f.x, y, 3, 0, true);
      ctx.restore();
      ronds(ctx, f.x, eau, t, 3);
      if (!f.parle && f.x < w * 0.7 && !H.$(".dialogue")) {
        f.parle = true;
        const repliques = [{ qui: "flamant", texte: "Flma-mala-lamama !" }, { qui: "ovo", texte: "Fala-la-lamala !" }];
        if (b.s.compagnons.includes("luigi")) repliques.push({ qui: "luigi", texte: "Fla-fla-mala !" });
        H.dialogue.dire(repliques);
      }
      if (f.x < -60) {
        f.x = null;
        f.prochain = t + 20000 + Math.random() * 25000;
      }
    }
    f.dernier = t;
  }

  async function baignade() {
    const b = balade;
    if (!b || b.baignade || H.$(".dialogue")) return;
    b.baignade = { debut: performance.now() };
    b.pause = true;
    b.bain.hidden = true;
    const s = H.ciel.etat();
    const mois = s.date.getMonth() + 1;
    const froid = [11, 12, 1, 2, 3, 4].includes(mois);
    const nuit = s.soleil.alt < -4;
    const lignes = [{ qui: "ovo", texte: nuit ? "Un bain de minuit dans la crique, sous la lune !" : "L’eau est turquoise au pied des rochers rouges. J’y vais !" }];
    const avec = (q) => b.s.compagnons.includes(q);
    if (avec("luigi")) {
      lignes.push({ qui: "luigi", texte: froid ? "Brrr, elle est fraîche ! Allez, à trois… un, deux… trois !" : "Elle est trop bonne ! On fait la planche ?" });
      lignes.push({ qui: "ovo", texte: froid ? "AAAH ! Elle est glacée… et c’est trop bien." : "On voit les petits poissons entre les rochers !" });
    }
    if (avec("lolo")) lignes.push({ qui: "lolo", texte: "Vas-y, je garde tes affaires sur la terre rouge." });
    if (avec("meme")) lignes.push({ qui: "meme", texte: "Mrrrou. (Mémé refuse de mouiller une seule moustache.)" });
    if (!b.s.compagnons.length) {
      lignes.push({ qui: "ovo", nom: "Balade", texte: froid ? "Personne à l’horizon. Juste ƟvƟ, la mer froide et les rochers rouges." : "Personne à l’horizon. Juste ƟvƟ, la mer tiède et les rochers rouges." });
    }
    await H.dialogue.dire(lignes);
    if (balade === b) b.sortir.hidden = false;
  }

  async function sortirDeLeau() {
    const b = balade;
    if (!b) return;
    b.sortir.hidden = true;
    b.baignade = null;
    b.flamant = null;
    b.pause = false;
    const nuit = H.ciel.etat().soleil.alt < -4;
    await H.dialogue.dire([{ qui: "ovo", texte: nuit ? "Vite, la serviette ! On rentre tout doucement." : "Je sèche au soleil sur la terre rouge, ça sent le pin chaud." }]);
  }

  async function deroulerBalade(compagnons) {
    const avec = (q) => compagnons.includes(q);
    const intro = [];
    if (avec("luigi")) intro.push({ qui: "luigi", texte: "On va voir la mer ? Prends ma main, le chemin est un peu caillouteux." });
    if (avec("lolo")) intro.push({ qui: "lolo", texte: "Hiii ! Une balade ! On marche côte à côte, au pas, tranquilles." });
    if (avec("meme") && avec("lolo")) intro.push({ qui: "meme", texte: "Mrrr… (Mémé se réveille, s’étire et se met debout sur le dos de Lóló : elle voyage sans même avoir à bouger.)" });
    else if (avec("meme")) intro.push({ qui: "meme", texte: "Mrrrou ! (Mémé trottine devant, la queue en l’air, les yeux toujours fermés. Elle connaît le chemin par cœur.)" });
    if (!intro.length) intro.push({ qui: "ovo", nom: "Balade", texte: "ƟvƟ part seul·e sur le petit chemin, entre les pins et la mer." });
    await H.dialogue.dire(intro);
    if (!balade) return;
    if (avec("luigi")) {
      await raconter("luigi");
      if (balade) await complimentMesi();
    }
    if (balade && avec("lolo")) await raconter("lolo");
    if (balade && !avec("luigi") && !avec("lolo")) await H.dialogue.dire(histoires().pensees());
    if (balade && balade.fin) balade.fin.hidden = false;
  }

  H.vues.balade = {
    afficher(c, params) {
      // « luigi+lolo+meme », « solo »… (« lolo » tout court : Lóló avec Mémé sur le dos)
      let compagnons = String(params[0] || "luigi").split("+").filter((q) => ["luigi", "lolo", "meme"].includes(q));
      if (params[0] === "lolo") compagnons = ["lolo", "meme"];
      if (!loloLa()) compagnons = compagnons.filter((q) => q === "luigi");
      const NOMS = { luigi: "Mesi", lolo: "Lóló", meme: "Mémé" };
      const noms = compagnons.map((q) => NOMS[q]);
      const titre = noms.length ? "Balade avec " + (noms.length > 1 ? noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1] : noms[0]) : "Balade en solo";
      const toile = H.el("canvas.toile-balade", { "aria-label": "Balade le long des calanques" });
      const bain = H.el("button.bouton", { type: "button", hidden: true, onclick: () => baignade() }, "Aller se baigner");
      const sortir = H.el("button.bouton", { type: "button", hidden: true, onclick: () => sortirDeLeau() }, "Sortir de l’eau");
      const fin = H.el("div.pastilles.fin-balade", { hidden: true },
        bouton("Continuer la balade", () => { fin.hidden = true; deroulerBalade(compagnons); }),
        bouton("Rentrer à la maison", () => H.aller("maison"))
      );
      c.append(
        H.el("h1", null, titre),
        H.el("div.cadre-balade", null, toile),
        H.el("div.pastilles.actions-balade", null, bain, sortir),
        fin
      );
      balade = { toile, fin, bain, sortir, s: scene(toile, compagnons) };
      dessinerBalade();
      setTimeout(() => balade && deroulerBalade(compagnons), 700);
    },
    quitter() {
      if (balade) cancelAnimationFrame(balade.anim);
      balade = null;
      H.dialogue.fermer();
    },
  };

  // --- la cabane de lecture ----------------------------------------------------------------
  let lecture = null;

  function livres() {
    const h = histoires();
    const liste = [
      { titre: "Les douceurs de Mesi", sous: "histoires pour s’endormir", couverture: "corail", motif: "lune", pages: () => h.auHasard(h.LUIGI) },
      loloLa() ? { titre: "Les drames de Lóló", sous: "absurdes et bouleversants", couverture: "fluo", motif: "fer", pages: () => h.auHasard(h.LOLO) } : null,
      // la nuit, on ne révise pas : seulement des histoires
      H.ciel.nuitCalme() ? null : { titre: "Une fiche au hasard", sous: "l’herbier d’ƟvƟ", couverture: "pin", motif: "feuille", pages: () => {
        const p = h.auHasard(H.d.plantes());
        const v = p.valeurs || {};
        const lignes = H.lignesFiche(p, "description").concat(H.lignesFiche(p, "ethnobotanique"));
        return { titre: p.nom + (p.latin ? " · " + p.latin : ""), lignes: lignes.map((texte) => ({ texte })) };
      } },
      { titre: "Le ciel de cette nuit", sous: "la lune et les étoiles", couverture: "outremer", motif: "etoiles", pages: () => {
        const s = H.ciel.etat();
        const ph = H.ciel.nomPhase(s.lune.phase);
        return { titre: "Le ciel de cette nuit", lignes: [
          { texte: "Ce soir, au-dessus de " + H.jeu.lieu.nom + ", c’est la " + ph + ", éclairée à " + Math.round(s.lune.fraction * 100) + " %." },
          { texte: s.heures.lever ? "Le soleil s’est couché à " + H.heure(s.heures.coucher) + " et se lèvera demain vers " + H.heure(new Date(s.heures.lever.getTime() + 864e5)) + "." : "Le soleil fait des siennes ce soir." },
          { texte: "C’est l’" + (s.saison === "été" ? "été" : s.saison === "automne" ? "automne" : s.saison === "hiver" ? "hiver" : "printemps") + ". Dehors, " + (s.meteo ? s.meteo.libelle + ", " + s.meteo.temperature + " °C." : "la nuit est calme.") },
          { texte: "Ferme les yeux une minute et écoute la pluie sur le toit de la cabane." },
        ] };
      } },
    ];
    return liste.filter(Boolean);
  }

  function lire(livre, zone) {
    const contenu = livre.pages();
    let i = 0;
    const page = () => {
      zone.innerHTML = "";
      const ligne = contenu.lignes[i];
      zone.append(
        H.el("p.titre-livre", null, contenu.titre),
        H.el("p.page-livre", null, ligne.texte),
        H.el("div.pastilles.nav-livre", null,
          i > 0 ? bouton("Page précédente", () => { i--; page(); }, ".petit") : null,
          i < contenu.lignes.length - 1 ? bouton("Page suivante", () => { i++; page(); }, ".petit") : bouton("Refermer le livre", () => (zone.innerHTML = ""), ".petit"),
          H.el("span.numero-page", null, (i + 1) + " / " + contenu.lignes.length)
        )
      );
    };
    page();
  }

  // le petit dessin de chaque couverture, en aplats cernés d'encre nuit
  const MOTIFS = {
    lune: '<circle cx="30" cy="26" r="13" fill="#f2f0e8" stroke="#23214a" stroke-width="2"/><circle cx="36" cy="22" r="11" fill="#ff5b4f"/><path d="M12 44 l3 -6 l3 6 l-6 -4 h6 z" fill="#eeff41" stroke="#23214a" stroke-width="1.2"/>',
    fer: '<path d="M18 14 v18 a12 12 0 0 0 24 0 v-18" fill="none" stroke="#23214a" stroke-width="6" stroke-linecap="round"/><path d="M18 14 v18 a12 12 0 0 0 24 0 v-18" fill="none" stroke="#ff5b4f" stroke-width="2.5" stroke-linecap="round"/>',
    feuille: '<path d="M30 46 C10 34 14 14 30 8 C46 14 50 34 30 46 Z" fill="#9cc06a" stroke="#23214a" stroke-width="2"/><path d="M30 46 V14" stroke="#23214a" stroke-width="1.6"/>',
    etoiles: '<circle cx="40" cy="20" r="8" fill="#eeff41" stroke="#23214a" stroke-width="2"/><circle cx="16" cy="14" r="2" fill="#f2f0e8"/><circle cx="22" cy="34" r="1.6" fill="#f2f0e8"/><circle cx="12" cy="42" r="2.2" fill="#f2f0e8"/><circle cx="44" cy="42" r="1.6" fill="#f2f0e8"/>',
  };

  // le fond de la cabane : une grille bleu nuit qui se bombe autour du doigt ou de la souris
  function grilleCabane(boite) {
    const toile = H.el("canvas.grille-cabane", { "aria-hidden": "true" });
    boite.prepend(toile);
    const ctx = toile.getContext("2d");
    let cible = { x: -999, y: -999 }, souris = { x: -999, y: -999 }, anim = null;
    const suivre = (e) => {
      const r = toile.getBoundingClientRect();
      cible = { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    boite.addEventListener("pointermove", suivre);
    boite.addEventListener("pointerdown", suivre);
    const dessiner = () => {
      if (!document.body.contains(toile)) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = boite.clientWidth, h = boite.clientHeight;
      if (toile.width !== Math.round(w * dpr) || toile.height !== Math.round(h * dpr)) {
        toile.width = Math.round(w * dpr);
        toile.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      souris.x += (cible.x - souris.x) * 0.12;
      souris.y += (cible.y - souris.y) * 0.12;
      const pas = 30, R = 130;
      const tordre = (x, y) => {
        const dx = x - souris.x, dy = y - souris.y, d = Math.hypot(dx, dy);
        if (d > R || d === 0) return [x, y];
        const f = Math.sin((1 - d / R) * Math.PI) * 16;
        return [x + (dx / d) * f, y + (dy / d) * f];
      };
      ctx.strokeStyle = "rgba(150,140,255,0.16)";
      ctx.lineWidth = 1;
      for (let x = 0; x <= w + pas; x += pas) {
        ctx.beginPath();
        for (let y = 0; y <= h; y += 8) {
          const [a, b] = tordre(x, y);
          y ? ctx.lineTo(a, b) : ctx.moveTo(a, b);
        }
        ctx.stroke();
      }
      for (let y = 0; y <= h + pas; y += pas) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const [a, b] = tordre(x, y);
          x ? ctx.lineTo(a, b) : ctx.moveTo(a, b);
        }
        ctx.stroke();
      }
      anim = requestAnimationFrame(dessiner);
    };
    dessiner();
    return () => cancelAnimationFrame(anim);
  }

  H.vues.lecture = {
    afficher(c) {
      // la pluie tombe sur le toit de la cabane, même par beau temps
      H.sons.boucle("pluie", true, 0.32);
      const zone = H.el("div.livre-ouvert");
      c.appendChild(H.el("div.cabane-lecture", null,
        H.el("div.bougie", { "aria-hidden": "true" }, H.el("span.flamme"), H.el("span.cire"), H.el("span.bougeoir"), H.el("span.anse")),
        H.el("h1", null, "Cabane de lecture"),
        H.el("p.discret", null, "Une bougie, un plaid, la pluie sur le toit. Pour les soirs où le sommeil se fait attendre."),
        H.el("div.etagere-livres", null,
          livres().map((l) => H.el("button.livre.livre-" + l.couverture, { type: "button", onclick: () => lire(l, zone) },
            H.el("span.motif", { html: '<svg viewBox="0 0 60 52" width="60" height="52" aria-hidden="true">' + MOTIFS[l.motif] + "</svg>" }),
            H.el("span.titre", null, l.titre),
            H.el("span.sous", null, l.sous)))
        ),
        zone,
        H.el("p", null, H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme"))
      ));
      lecture = grilleCabane(c.querySelector(".cabane-lecture"));
    },
    quitter() {
      if (lecture) lecture();
      lecture = null;
      if (H.sons.majPluie) H.sons.majPluie();
    },
  };

  // --- la nuit : les flashcartes et le terrain dorment -----------------------------------
  H.vues.dodo = {
    afficher(c, params) {
      const dormir = params[0] === "dormir";
      c.appendChild(H.el("div.page-dodo", null,
        H.el("h1", null, dormir ? "Bonne nuit, ƟvƟ" : "Chut… tout dort"),
        H.el("p", null, dormir
          ? "Mesi a soufflé la bougie. Mémé ronronne sur le cou de Lóló. Fais de beaux rêves pleins de fleurs."
          : "Il est tard : les flashcartes et le terrain se reposent jusqu’à 6 h du matin, pour que ton cerveau se repose aussi."),
        dormir ? null : H.el("div.pastilles", null,
          bouton("Faire une balade", () => H.aller("maison")),
          bouton("Aller lire dans la cabane", () => H.aller("lecture")),
          H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme")
        )
      ));
      if (dormir) H.musique.arreter();
    },
  };
})();
