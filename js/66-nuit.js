// La maison d'ƟvƟ et Mesi (balades, histoires), la balade le long des calanques,
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

  // Mesi prépare une crêpe au chocolat fondu (s'il en reste dans les ressources)
  async function crepeMesi(apres) {
    if (!H.ressources.mangerCrepe()) return;
    H.bruit("recolte");
    if (H.journal) H.journal.noter("crepe", "j’ai mangé une crêpe au chocolat fondu");
    await H.dialogue.dire([
      { qui: "luigi", texte: H.histoires.auHasard(["Je t’ai fait une crêpe au chocolat fondu. Attention, c’est chaud !", "Une crêpe, le chocolat qui coule sur les côtés… comme tu aimes.", "Assieds-toi, la crêpe arrive ! J’ai mis double chocolat."]) },
      { qui: "ovo", texte: H.histoires.auHasard(["Mmmh… Tu es le·la meilleur·e.", "J’ai du chocolat jusqu’aux lunettes.", "Merci Mesi ! Je repars plein·e d’énergie."]) },
    ]);
    H.toast("+30 d’énergie, et la pause est finie");
    await H.dialogue.dire([{ qui: "luigi", texte: H.histoires.auHasard(["On va sur le canapé écouter un peu de musique ?", "Viens, on se met sur le canapé, je mets de la musique.", "Allez, canapé et musique !"]) }]);
    allerSurLeCanape();
    apres && apres();
  }

  // on coche qui vient se promener : Mesi, Lóló, Mémé (seul·e si personne n'est coché)
  function choixCompagnons() {
    const qui = [["luigi", "Mesi"]].concat(loloLa() ? [["lolo", "Lóló"]].concat(H.memeDehors() ? [] : [["meme", "Mémé"]]) : []);
    const coches = new Set(H.local.compagnons || ["luigi"]);
    const cases = qui.map(([id, nom]) => H.el("label.case", null,
      H.el("input", { type: "checkbox", checked: coches.has(id), onchange: (e) => (e.target.checked ? coches.add(id) : coches.delete(id)) }), " " + nom));
    return H.el("div.choix-compagnons", null,
      H.el("div.pastilles", null, ...cases),
      H.el("div.pastilles", null, bouton("Partir en balade", () => {
        const liste = qui.map(([id]) => id).filter((id) => coches.has(id));
        H.d.majLocal((l) => (l.compagnons = liste));
        // à la maison, ceux qui viennent descendent d'abord jusqu'à la porte
        if (H.maison && H.maison.balade && document.documentElement.dataset.vue === "maison") H.maison.balade(liste);
        else H.aller("balade/" + (liste.length ? liste.join("+") : "solo"));
      })));
  }

  // --- le feu de cheminée ------------------------------------------------------------------
  // Sous 16 °C, on peut faire du feu dans le poêle de la maison. Il faut du bois sec : il est rangé
  // dehors, contre la maison, et ƟvƟ va en chercher une brassée (on en garde six bûches au plus).
  // Une bûche fait un feu de quatre heures. Quand le feu brûle, la fumée sort de la cheminée, et
  // il fait trop froid pour se baigner pendant les balades.
  const FROID = 16, FEU_DUREE = 4 * 3600e3, BOIS_MAX = 6;
  const cheminee = {
    temperature: () => { const m = H.ciel.meteo || {}; return m.temperature; },
    froid: () => { const tp = cheminee.temperature(); return tp != null && tp < FROID; },
    bois: () => (H.jeu.cheminee || {}).bois || 0,
    feuActif: () => { const f = (H.jeu.cheminee || {}).feu; return !!f && H.maintenant() - f < FEU_DUREE; },
    majJeu(fn) { H.jeu.cheminee = Object.assign({ bois: 0, feu: 0 }, H.jeu.cheminee); fn(H.jeu.cheminee); H.d.changer("jeu"); },
    // sur la ferme, à côté de la maison
    async prendreBois() {
      if (!cheminee.froid()) return H.dialogue.dire([{ qui: "luigi", texte: "Il fait " + (cheminee.temperature() != null ? cheminee.temperature() + " °C" : "doux") + " : pas besoin de bois pour l’instant." }]);
      if (cheminee.bois() >= BOIS_MAX) return H.dialogue.dire([{ qui: "ovo", texte: "Il y a déjà assez de bois dans la maison pour ce soir." }]);
      const n = Math.min(3, BOIS_MAX - cheminee.bois());
      cheminee.majJeu((c) => (c.bois += n));
      if (H.journal) H.journal.noter("bois", "je suis allé·e chercher du bois sec");
      return H.dialogue.dire([{ qui: "ovo", texte: "Une brassée de bois sec, " + n + " bûches : on aura bien chaud." }]);
    },
    // dans la maison, en touchant le poêle
    async allumer() {
      if (cheminee.feuActif()) return H.dialogue.dire([{ qui: "luigi", texte: H.histoires.auHasard(["Écoute le bois qui crépite… on est bien.", "Rien de mieux qu’un feu quand il fait froid dehors."]) }]);
      if (!cheminee.froid()) return H.dialogue.dire([{ qui: "luigi", texte: "Il fait " + (cheminee.temperature() != null ? cheminee.temperature() + " °C" : "doux") + " : pas besoin de faire du feu." }]);
      if (!cheminee.bois()) return H.dialogue.dire([{ qui: "luigi", texte: "Il n’y a plus de bois sec. Va en chercher dehors : il est rangé contre la maison." }]);
      cheminee.majJeu((c) => { c.bois -= 1; c.feu = H.maintenant(); });
      if (H.journal) H.journal.noter("feu", "j’ai allumé un feu dans la cheminée");
      return H.dialogue.dire([{ qui: "ovo", texte: "Une bûche dans le poêle, une allumette… le feu prend." }]);
    },
  };
  H.cheminee = cheminee;

  // --- l'intérieur du mazet ---------------------------------------------------------------
  // Entre la pochette et l'aquarelle : des aplats aux formes arrondies cernés d'encre nuit, un
  // lavis léger sur les murs, un sol en terrazzo et le grain de risographie. Le lit et ses
  // coussins, la table de chevet et sa lampe (qui éclaire le lit et le canapé), le canapé sous
  // la fenêtre aux volets bleus, la table, les deux chaises et la plante derrière la chaise.
  // Mesi, ƟvƟ, Lóló et Mémé sont là ; la fenêtre suit le ciel (nuages, étoiles, vraie lune).
  const ENCRE = "#23214a";
  // La maison vue en coupe, de la terre au faîte, aux proportions d'un écran de téléphone : le
  // rez-de-chaussée (l'entrée, la table du goûter), le salon (la grande baie, le canapé en L, le
  // poêle, les enceintes) et le grenier sous le toit (le lit, sous le velux), reliés par un
  // escalier en colimaçon. Autour, le dehors : le ciel, le jardin, la terre sous la maison ; plus
  // l'écran est large ou haut, plus on en voit. Les dessins d'avant (canapé, table, plante…)
  // gardent leurs mesures, décalées (DX, puis leur place dans la maison).
  const LARGE = 560, DX = 96;
  const NIV = {
    grenier: { plafond: -250, plancher: -16, sol: -4 },
    salon: { plafond: 12, plancher: 242, sol: 250 },
    bas: { plafond: 272, plancher: 502, sol: 510 },
  };
  const SOL_DEHORS = 518, CAGE = 84;
  // l'épaisseur des murs extérieurs (vus coupés)
  const EP_MUR = 18;
  // ce qu'on peint de la maison (le reste, c'est le dehors)
  // (la boîte descend un mètre sous la maison : on voit la terre, et les vers de terre qui y creusent)
  const BOITE = { x: -30, y: -272, w: LARGE + 60, h: 900 };
  const FAITE = { x: LARGE / 2, y: -250 }, EGOUT = { dx: 24, y: -96 }, EP_TOIT = 12;
  // le dessus du toit en chaque x (le faîte au milieu, les deux pentes qui débordent un peu)
  const toitY = (x) => {
    const x0 = -EGOUT.dx, x1 = LARGE + EGOUT.dx;
    return x < FAITE.x ? EGOUT.y + ((FAITE.y - EGOUT.y) * (x - x0)) / (FAITE.x - x0) : FAITE.y + ((EGOUT.y - FAITE.y) * (x - FAITE.x)) / (x1 - FAITE.x);
  };
  // les places des dessins d'avant dans la maison
  const CANAPE_T = { x: 34, y: -6 }, TABLE_T = { x: -165, y: 216 }, PLANTE_T = { x: -167, y: 261 }, ENC_DY = 18;
  // poser la maison sur une toile à sa taille : k pixels par unité
  const repere = (ctx, k) => ctx.setTransform(k, 0, 0, k, -BOITE.x * k, -BOITE.y * k);
  // la taille d'un gros pixel : la même partout dans le dessin, quel que soit l'écran
  let pixK = 1; // (pixels de la toile par unité du dessin, pour s'aligner sur les gros pixels)
  const grosPixel = () => Math.max(1, Math.round(2.3 * pixK * H.finesse()));
  // une case des petits dessins « en vrais pixels » (Mémé, les photos) : elle garde sa taille dans
  // le dessin ; quand les gros pixels sont plus fins, elle en contient plusieurs (n × n), qui
  // laissent place au modelé et au grain
  const caseDessin = () => { const g = grosPixel() / pixK, n = Math.max(1, Math.round(2.3 / g)); return { cell: g * n, n, g }; };
  const teinte = (hex, d, t) => { const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)); return "rgb(" + v.map((x, i) => Math.round(x + (d[i] - x) * t)).join(",") + ")"; };
  // Où poser la maison sur l'écran : elle tient toujours en entier, au milieu en largeur, avec un
  // peu plus de ciel au-dessus que de terre en dessous. (Une toile de 2,6 millions de pixels au
  // plus : au-delà, les gros pixels n'y gagnent rien, sauf de la lenteur.)
  function vueMaison(toile) {
    const cw = toile.clientWidth || 400, ch = toile.clientHeight || 700;
    const dpr = Math.min(3, window.devicePixelRatio || 1, Math.sqrt(2.6e6 / (cw * ch)));
    const echelle = Math.min(cw / BOITE.w, ch / (BOITE.h + 30)), K = echelle * dpr;
    const taille = Math.max(1, Math.round(2.3 * K * H.finesse())), W = Math.round(cw * dpr), Hc = Math.round(ch * dpr);
    // (la maison tombe pile sur la grille des gros pixels)
    const px = Math.round(((W - BOITE.w * K) / 2) / taille) * taille, py = Math.round(((Hc - BOITE.h * K) * 0.6) / taille) * taille;
    return { dpr, K, taille, W, Hc, px, py };
  }
  const mondeRepere = (ctx, v) => ctx.setTransform(v.K, 0, 0, v.K, v.px - BOITE.x * v.K, v.py - BOITE.y * v.K);
  const toileVide = (modele) => { const c = document.createElement("canvas"); c.width = modele.width; c.height = modele.height; return c; };
  const fenetresOuvertes = () => !!(H.local && H.local.fenetresOuvertes);
  const MOMENTS = {
    // le mur du lit bleu foncé, le mur de la baie vert foncé
    // (les murs intérieurs en pastel très clair : bleu pour la cage et le grenier, vert au salon, rose en bas)
    jour: { murG: "#d8e6f6", murD: "#d9efdd", murBas: "#f7dfe9", sol: "#c93f6e", plinthe: "#7a2444", ombreMur: "rgba(60,70,170,0.22)", lampe: true },
    soir: { murG: "#232a63", murD: "#1e5a30", sol: "#b2365f", plinthe: "#6a1f3d", ombreMur: "rgba(15,13,58,0.5)", lampe: true },
    nuit: { murG: "#1b1d4a", murD: "#1e3d25", sol: "#9a2f55", plinthe: "#5a1a34", ombreMur: "rgba(15,13,58,0.55)", lampe: true },
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
    if (ECL) { modele(ctx, x, y, w, h, r); arrondi(ctx, x, y, w, h, r); }
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
  // la baie vitrée, au-dessus du canapé : on voit le dehors, les arbres et le ciel
  // la grande baie vitrée du salon, du plafond jusqu'au sol, derrière le canapé ; la fenêtre du
  // rez-de-chaussée, au-dessus de la plante
  const BAIE = { x: 240, y: 28, w: 264, h: 214 };
  const FENETRE_BAS = { x: 486, y: 298, w: 62, h: 112 };
  function cheminFenetre(ctx, R) {
    R = R || BAIE;
    ctx.beginPath();
    ctx.rect(R.x, R.y, R.w, R.h);
  }
  // le velux, dans la pente du toit, juste au-dessus des oreillers : il ouvre sur le vrai ciel
  const VELUX = { x0: 300, x1: 392, prof: 46 };
  const veluxY = (x) => toitY(x) + EP_TOIT + 3;
  function cheminVelux(ctx) {
    const { x0, x1, prof } = VELUX;
    ctx.moveTo(x0, veluxY(x0)); ctx.lineTo(x1, veluxY(x1)); ctx.lineTo(x1, veluxY(x1) + prof); ctx.lineTo(x0, veluxY(x0) + prof); ctx.closePath();
  }
  const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
  // Le dehors, tout autour de la maison (R : ce qu'on en voit) : le ciel du moment, ses nuages qui
  // passent (on les voit aussi par le velux), la nuit les étoiles et la vraie lune ; les collines
  // au loin, des pins, l'herbe, et sous la maison, la terre et ses cailloux.
  function dehorsMonde(ctx, t, moment, etat, R, p) {
    const matin = new Date().getHours() < 12, nuit = moment !== "jour";
    const CIEL = moment === "jour" ? ["#2f8fe0", "#6fb6ee", "#a8d8ec", "#d6eef7"]
      : moment === "soir" ? (matin ? ["#3a3aa8", "#8a58cc", "#d07ab8", "#ffb3a8", "#ffd23a"] : ["#2a2c6a", "#5b3c8f", "#c93f6e", "#ff5b4f", "#ffb36b"])
      : ["#15124a", "#1b1d4a", "#232a63", "#2a2c6a", "#3a3aa8"];
    const g = ctx.createLinearGradient(0, Math.min(R.y0, -400), 0, SOL_DEHORS);
    CIEL.forEach((c, k) => g.addColorStop(k / (CIEL.length - 1), c));
    ctx.fillStyle = g; ctx.fillRect(R.x0 - 2, R.y0 - 2, R.x1 - R.x0 + 4, SOL_DEHORS - R.y0 + 2);
    // les étoiles, une par case de ciel au plus (toujours aux mêmes places)
    if (nuit) {
      const C = 40;
      for (let i = Math.floor(R.x0 / C); i * C < R.x1; i++) for (let j = Math.floor(R.y0 / C); j * C < SOL_DEHORS - 90; j++) {
        const h = hsh(i, j);
        if (h > 0.55) continue;
        const x = i * C + hsh(i + 7, j) * C, y = j * C + hsh(i, j + 7) * C, grosse = h < 0.06;
        const a = moment === "nuit" ? 0.45 + 0.55 * Math.sin(t / 700 + h * 40 + x) : 0.3;
        ctx.fillStyle = "rgba(255,245,230," + Math.max(0.1, a).toFixed(2) + ")";
        ctx.fillRect(x, y, grosse ? 2.6 : 1.8, grosse ? 2.6 : 1.8);
      }
      // dans le velux, une ou deux étoiles, qu'ƟvƟ regarde depuis son oreiller
      for (const [dx, dy, ph] of [[24, 14, 0], [64, 26, 2]]) {
        const x = VELUX.x0 + dx, y = veluxY(VELUX.x0 + dx) + dy, a = moment === "nuit" ? 0.6 + 0.4 * Math.sin(t / 650 + ph) : 0.35;
        ctx.fillStyle = "rgba(255,245,230," + a.toFixed(2) + ")";
        ctx.fillRect(x - 1, y - 1, 2.6, 2.6);
      }
      if (etat.lune.alt > -2) lunePlate(ctx, Math.min(R.x1 - 60, LARGE + 150), Math.max(R.y0 + 64, -330), 14, etat.lune.phase);
    }
    // les nuages, plus nombreux quand le ciel est couvert ; ils passent aussi derrière le velux
    const m = H.ciel.meteo || {}, couvert = m.nuages != null ? m.nuages / 100 : 0.3;
    const n = Math.round(2 + couvert * 6), large = R.x1 - R.x0 + 240;
    ctx.fillStyle = moment === "jour" ? "#f3f0dc" : moment === "soir" ? "rgba(255,179,168,0.75)" : "rgba(58,58,168," + (0.25 + couvert * 0.5).toFixed(2) + ")";
    for (let i = 0; i < n; i++) {
      const l = 46 + hsh(i, 3) * 50, y = -350 + i * (240 / n) + hsh(i, 9) * 20;
      const x = R.x0 - 120 + ((t * (0.004 + hsh(i, 5) * 0.006) + hsh(i, 1) * large) % large);
      arrondi(ctx, x, y, l, 12, 6); ctx.fill();
      arrondi(ctx, x + l * 0.22, y - 8, l * 0.5, 13, 6.5); ctx.fill();
    }
    // Le paysage, comme si on coupait l'île de la ferme en deux, droit à travers la maison, et
    // qu'on regardait depuis la serre : au loin la mer, les calanques et les montagnes ; derrière,
    // l'araucaria, le labo et la boîte aux lettres à gauche, la roulotte jaune à droite ; tout près,
    // les grands pins ; l'île s'arrête à ses bords, coupée comme sur la maquette de la ferme
    // (l'herbe, la terre rouge, la roche), et la mer autour. Il est dessiné en vrais pixels, case
    // par case sur la grille des gros pixels (voir paysagePixels), puis on y ajoute ce qui bouge.
    const pa = paysagePixels(R, p, moment);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pa.toile, pa.x0, pa.y0, pa.toile.width * p, pa.toile.height * p);
    ctx.restore();
    // de temps en temps, un ver de terre creuse sa galerie dans la terre de l'île
    const g0 = Math.max(R.x0, PAYS.ile.g + 40), g1 = Math.min(R.x1, PAYS.ile.d - 40);
    if (g1 > g0 && R.y1 > SOL_DEHORS + 40) {
      const P = 23000, n0 = Math.floor(t / P);
      for (const k of [n0 - 1, n0]) {
        if (hsh(k, 11) > 0.65) continue;
        const u = (t - k * P) / 15000;
        if (u < 0 || u > 1.5) continue;
        const sens = hsh(k, 14) < 0.5 ? -1 : 1, x0 = g0 + 60 + hsh(k, 12) * Math.max(0, g1 - g0 - 120), y0 = SOL_DEHORS + 40 + hsh(k, 13) * 90;
        const pos = (v) => [x0 + sens * v * 80, y0 + Math.sin(v * 6 + k) * 6 - v * 8];
        const chemin = (a, b) => { ctx.beginPath(); for (let v = Math.max(0, a), i = 0; v <= b + 1e-6; v += 0.02, i++) { const [x, y] = pos(v); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } };
        const tete = Math.min(1, u);
        ctx.lineCap = "round";
        ctx.strokeStyle = moment === "jour" ? "#4b3427" : "#1b1d4a"; ctx.lineWidth = 6; chemin(0, tete); ctx.stroke();
        if (u < 1.15) {
          const ondule = Math.sin(t / 160) * 0.015;
          ctx.strokeStyle = ENCRE; ctx.lineWidth = 5; chemin(tete - 0.2 + ondule, tete); ctx.stroke();
          ctx.strokeStyle = moment === "nuit" ? "#a86a7a" : "#e88a9a"; ctx.lineWidth = 3; chemin(tete - 0.2 + ondule, tete); ctx.stroke();
        }
      }
    }
    // La nuit, des bêtes traversent dehors, comme à la ferme : un renard qui trotte, une laie et ses
    // marcassins, un hérisson. Elles passent derrière la maison et ressortent de l'autre côté.
    if (moment === "nuit" && H.ferme && H.ferme.betes) {
      // (à l'heure de l'horloge : une traversée toutes les quatre-vingts secondes au plus)
      const tn = Date.now(), B = H.ferme.betes, P = 80000, k = Math.floor(tn / P);
      if (hsh(k, 31) < 0.75) {
        const esp = ["renard", "renard", "sanglier", "herisson"][Math.floor(hsh(k, 32) * 4)];
        const u = (tn - k * P) / { renard: 22000, sanglier: 34000, herisson: 46000 }[esp];
        if (u >= 0 && u <= 1.2) {
          const sens = hsh(k, 33) < 0.5 ? 1 : -1, g0 = Math.max(R.x0, PAYS.ile.g) - 60, g1 = Math.min(R.x1, PAYS.ile.d) + 60;
          const xA = sens > 0 ? g0 : g1, xB = sens > 0 ? g1 : g0, y = SOL_DEHORS + 8 + hsh(k, 34) * 10, s = p * 3, pas = Math.floor(t / 150) % 2;
          // (dessinées de profil, la tête à droite : on les retourne quand elles vont à gauche)
          const bete = (grille, pal, x) => {
            const L = grille[0].length;
            grille.forEach((l, j) => [...l].forEach((ch, i) => { const c = pal[ch]; if (!c) return; const ii = sens < 0 ? L - 1 - i : i; ctx.fillStyle = c; ctx.fillRect(Math.round(x + (ii - L / 2) * s), Math.round(y + (j - grille.length) * s), Math.ceil(s), Math.ceil(s)); }));
          };
          const x = xA + (xB - xA) * u;
          if (esp === "renard") bete(pas ? B.RENARD_PAS : B.RENARD, B.PAL_BETES, x);
          else if (esp === "herisson") bete(pas ? B.HERISSON_PAS : B.HERISSON, B.PAL_BASSIN, x);
          else {
            bete(pas ? B.SANGLIER_PAS : B.SANGLIER, B.PAL_BETES, x);
            for (let m = 1; m <= 2 + Math.floor(hsh(k, 35) * 2); m++) bete((pas + m) % 2 ? B.MARCASSIN_PAS : B.MARCASSIN, B.PAL_BETES, x - sens * (22 + m * 12) * p);
          }
        }
      }
    }
    // les guirlandes : de la maison au premier arbre, puis d'arbre en arbre, en festons
    const lumBas = moment !== "jour" && guirlandesAllumees(), bas = SOL_DEHORS + 2;
    const accroches = { g: [[0, 150]], d: [[LARGE, 150]] };
    for (const a of ARBRES) {
      if (!a.pres) continue;
      accroches[a.x < 0 ? "g" : "d"].push(a.cypres ? [a.x, bas - a.h * 0.62] : (() => { const g = pinGeo(a); return [g.cx, g.haut + g.ep * 0.85]; })());
    }
    for (const cote of ["g", "d"]) {
      const pts = accroches[cote].sort((a, b) => (cote === "g" ? b[0] - a[0] : a[0] - b[0]));
      for (let k = 0; k + 1 < pts.length; k++) guirlande(ctx, pts[k], pts[k + 1], lumBas, t, k);
    }
    ctx.lineWidth = 2.2; ctx.strokeStyle = ENCRE;
  }

  // --- le paysage en vrais pixels ---------------------------------------------------------------
  // Les repères du paysage (dans le dessin) : l'horizon, la surface de la mer, le fond de l'île,
  // ses bords ; et les arbres tout autour de la maison (les grands pins des guirlandes, les cyprès,
  // les pins plus loin).
  const PAYS = { horizon: SOL_DEHORS - 46, mer: SOL_DEHORS + 400, fond: SOL_DEHORS + 300, ile: { g: -870, d: 1650 } };
  const ARBRES = [
    ...[[-300, 300], [LARGE + 104, 320]].map(([x, h]) => ({ x, h, cypres: true, pres: true })),
    ...[-216, -380, -480, -620, -760, LARGE + 46, LARGE + 170, LARGE + 290, LARGE + 760, LARGE + 900].map((x) => {
      const pres = x > -400 && x < LARGE + 200;
      return { x, pres, h: pres ? 330 + hsh(x, 2) * 60 : 230 + hsh(x, 2) * 90, pe: (hsh(x, 4) - 0.5) * 24, rx: (pres ? 46 : 36) + hsh(x, 5) * 12, enY: hsh(x, 9) < 0.45 };
    }),
  ];
  function pinGeo(a) {
    const h = a.h, bas = SOL_DEHORS + 2, pench = (a.pe / Math.max(1, h)) * 3, fourche = 0.52 + hsh(a.x, 1) * 0.12;
    const fx = a.x + pench * h * fourche, fy = bas - h * fourche, L = h * (0.5 + hsh(a.x, 2) * 0.12);
    return { fx, fy, L, cx: fx + pench * h * 0.12, haut: bas - h, ep: h * 0.2 };
  }
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
  const RGB = new Map();
  const rgb = (c) => { let v = RGB.get(c); if (!v) RGB.set(c, (v = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)))); return v; };
  const bruit1 = (x, g) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hsh(i, g) * (1 - u) + hsh(i + 1, g) * u; };
  // ce que le soir et la nuit font aux couleurs du jour (les ampoules des guirlandes restent chaudes)
  const TEINTE = { soir: { m: [0.66, 0.5, 0.72], a: [26, 8, 40] }, nuit: { m: [0.26, 0.3, 0.55], a: [10, 10, 26] } };
  let cachePaysage = { cle: "" }, decorGarde = { cle: "" };
  // les guirlandes dehors s'allument le soir, sauf si on les a éteintes (le même interrupteur
  // pour la ferme et pour la maison)
  const guirlandesAllumees = () => !(H.local && H.local.guirlandesEteintes);
  function paysagePixels(R, p, moment) {
    const i0 = Math.floor(R.x0 / p), j0 = Math.floor(R.y0 / p);
    const W = Math.ceil(R.x1 / p) - i0 + 1, Hh = Math.ceil(R.y1 / p) - j0 + 1;
    const cle = [i0, j0, W, Hh, p.toFixed(4), moment, guirlandesAllumees()].join("|");
    if (cachePaysage.cle === cle) return cachePaysage;
    const img = new ImageData(W, Hh), d = img.data, brille = new Uint8Array(W * Hh);
    const X = (i) => (i0 + i + 0.5) * p, Y = (j) => (j0 + j + 0.5) * p;
    const I = (x) => Math.floor(x / p) - i0, J = (y) => Math.floor(y / p) - j0;
    const dans = (i, j) => i >= 0 && j >= 0 && i < W && j < Hh;
    const pose = (i, j, c, lum) => {
      if (!dans(i, j)) return;
      const k = (j * W + i) * 4, v = rgb(c);
      d[k] = v[0]; d[k + 1] = v[1]; d[k + 2] = v[2]; d[k + 3] = 255;
      brille[j * W + i] = lum ? 1 : 0;
    };
    const plein = (i, j) => dans(i, j) && d[(j * W + i) * 4 + 3] > 0;
    const seuil = (i, j) => BAYER[((j + j0) & 3) * 4 + ((i + i0) & 3)];
    const tram = (i, j, f, a, b) => (f > seuil(i, j) ? b : a);
    const H_ = PAYS.horizon, unite = (v) => Math.max(1, Math.round(v / p));
    // Les collines des calanques, vues depuis la plage vers les terres, un peu d'en haut (presque en
    // isométrie) : très peu de ciel tout en haut, puis huit rangées qui défilent jusqu'au pied de
    // la maison, de plus en plus pâles et bleutées au loin. Le calcaire en couches horizontales, ses
    // corniches et sa falaise claire au pied ; la garrigue entre les gradins et sur les plateaux, de
    // petits pins en rythme ; des vallons de garrigue sombre entre les rangées. Pas d'eau ici.
    // (les couleurs sont celles du jour : le soir et la nuit les teintent, plus bas)
    // (jamais de gris : les ombres sont bleues, la lumière chaude)
    const C3 = { brume: [118, 164, 222], clair: [255, 240, 196], milieu: [240, 220, 182], sombre: [150, 156, 206], fond: [96, 108, 172], strate: [178, 184, 224], garrigue: [92, 148, 66], garrigueS: [38, 92, 70] };
    const melC = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const degrade = (arrets, t) => { t = Math.max(0, Math.min(1, t)); for (let k = 1; k < arrets.length; k++) if (t <= arrets[k][0]) { const [t0, c0] = arrets[k - 1], [t1, c1] = arrets[k]; return melC(c0, c1, (t - t0) / (t1 - t0 || 1)); } return arrets[arrets.length - 1][1]; };
    const bruit2 = (x, y, g) => { const a0 = Math.floor(x), b0 = Math.floor(y), fx = x - a0, fy = y - b0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const A = hsh(a0 + b0 * 57, g), B = hsh(a0 + 1 + b0 * 57, g), Cc = hsh(a0 + (b0 + 1) * 57, g), D = hsh(a0 + 1 + (b0 + 1) * 57, g); return (A * (1 - u) + B * u) * (1 - v) + (Cc * (1 - u) + D * u) * v; };
    const poseRVB = (i, j, c) => { if (!dans(i, j)) return; const k = (j * W + i) * 4; d[k] = c[0]; d[k + 1] = c[1]; d[k + 2] = c[2]; d[k + 3] = 255; brille[j * W + i] = 0; };
    {
      const MIL = LARGE / 2, haut0 = Math.min(R.y0, -400), CIEL = haut0 + (SOL_DEHORS - haut0) * 0.07, PIED = SOL_DEHORS + 24, N = 8;
      for (let k = 0; k < N; k++) {
        const f = k / (N - 1), yb = CIEL + 28 + (PIED - CIEL - 28) * Math.pow(f, 1.05);
        const Hc = 70 + 240 * f, P = 260 + 420 * f, dec = hsh(k, 71) * P, air = Math.pow(1 - f, 0.75) * (moment === "nuit" ? 0.7 : 0.88);
        // La perspective aérienne, comme chez les peintres flamands : le plus proche est le plus sombre,
        // vert profond et chaud, très contrasté ; en s'éloignant, chaque rangée s'éclaircit, perd ses
        // contrastes et tourne au bleu-vert, puis à un bleu pâle qui rejoint presque le ciel.
        const valeur = 0.7 + 0.3 * (1 - f), bleu = melC([70, 112, 172], [206, 224, 242], Math.pow(1 - f, 0.8));
        const teinte = (c) => melC([c[0] * valeur, c[1] * valeur, c[2] * valeur], bleu, air);
        const ybx = (x) => yb + (bruit1(x / 140, k + 77) - 0.5) * (14 + 26 * f);
        const massif = (x) => {
          const u = Math.abs(x - MIL) + (x < MIL ? 11 + k * 7 : 0) + dec;
          const forme = 0.42 * bruit1(u / (P * 0.55), k + 15) + 0.2 * bruit1(u / (P * 0.18), k + 16) + 0.08 * bruit1(u / 26, k + 17) + 0.95 * Math.pow(bruit1(u / (P * 0.3), k + 18), 2.6);
          // (jamais de long plateau tout droit : une ondulation douce en plus, et le pied lui aussi ondule)
          return ybx(x) - Hc * (0.22 + 0.58 * forme + 0.12 * bruit1(u / 55, k + 19));
        };
        const PLATEAU = Hc * 0.4;
        for (let i = 0; i < W; i++) {
          const x = X(i), top = massif(x);
          // une ou deux falaises nues, pour varier : du calcaire à pic, sans garrigue
          const nue = (k === 3 && Math.abs(x - (MIL - 520)) < 150) || (k === 5 && Math.abs(x - (MIL + 540)) < 170);
          const falaise = nue ? 1e4 : Hc * (0.16 + 0.16 * bruit1((Math.abs(x - MIL) + dec) / (P * 0.4), k + 50));
          // (chaque rangée descend jusqu'au pied du paysage : pas de trou entre deux rangées)
          const ybi = ybx(x), pente = massif(x + p) - massif(x - p);
          for (let j = Math.max(0, J(top)); j < Math.min(Hh, J(PIED + 90)); j++) {
            const y = Y(j), dep = y - top, v = Math.min(1, dep / Math.max(1, ybi - top));
            if (nue) {
              // La falaise nue : du calcaire à pic, sans un brin de vert. Des bancs en couches qui
              // ondulent, des corniches éclairées dessus et leur ombre bleue dessous, des fissures
              // verticales, des pans plus clairs face au soleil, et le pied dans l'ombre.
              const prof = y - top, sb = prof / 7 + bruit1(x / 33, k + 52) * 1.6 + bruit1(x / 9, k + 53) * 0.3, dansB = sb - Math.floor(sb);
              let c = degrade([[0, C3.clair], [0.45, C3.milieu], [1, melC(C3.fond, C3.sombre, 0.4)]], Math.min(1, prof / (Hc * 1.3)));
              if (pente < -p) c = melC(c, C3.clair, 0.3); else if (pente > p) c = melC(c, C3.fond, 0.35);
              if (dansB < 0.16) c = melC(c, C3.clair, 0.45);
              else if (dansB > 0.8) c = melC(c, C3.fond, 0.45);
              const pan = bruit2(x / 18, y / 26, k + 54);
              if (pan > 0.66) c = melC(c, C3.clair, 0.25); else if (pan < 0.25) c = melC(c, C3.sombre, 0.3);
              const fis = Math.floor((x + bruit1(y / 20, k + 55) * 9) / (p * 4));
              if (hsh(fis, k + 56) < 0.16 && hsh(fis, Math.floor(y / 30) + k) < 0.7) c = melC(c, C3.fond, 0.55);
              if (dep < p * 1.1) c = melC(C3.fond, [36, 40, 110], 0.5);
              poseRVB(i, j, teinte(c));
              continue;
            }
            // le vallon au pied de la rangée : de la garrigue en petites touffes, jamais un aplat
            if (y >= ybi) { const g = bruit2(x / 7, y / 5, k + 61) + (hsh(i + i0, j + j0) - 0.5) * 0.3; poseRVB(i, j, teinte(g > 0.62 ? C3.garrigue : g > 0.3 ? melC(C3.garrigue, C3.garrigueS, 0.6) : C3.garrigueS)); continue; }
            let c = degrade([[0, C3.clair], [0.4, C3.milieu], [1, C3.fond]], Math.pow(v, 0.8));
            if (ybi - y < falaise) {
              const fv = 1 - (ybi - y) / falaise, sb2 = (ybi - y) / 6 + bruit1(x / 45, k + 51) * 1.4 + bruit1(x / 11, k + 57) * 0.35;
              c = melC(melC(C3.clair, C3.milieu, 0.3), C3.fond, Math.pow(fv, 2) * 0.7);
              if (sb2 - Math.floor(sb2) < 0.25) c = melC(c, C3.strate, 0.55);
              if ((ybi - y) > falaise - p * 1.2) c = melC(c, C3.garrigueS, 0.5);
            } else {
              const sb = (ybi - y) / 9 + bruit1(x / 37, k + 21) * 1.8 + bruit1(x / 10, k + 22) * 0.4, bande = Math.floor(sb), dansB = sb - bande;
              const sommet = dep < (ybi - top) * 0.12;
              const vert = !sommet && (bande % 3 !== 0 || dep < PLATEAU) && bruit2(x / 19, y / 9, k + 31) > 0.34 - f * 0.14;
              if (vert) c = melC(dansB < 0.35 ? C3.garrigueS : C3.garrigue, c, 0.2 + bruit2(x / 6, y / 5, k + 33) * 0.25);
              else if (dansB > 0.82) c = melC(c, C3.fond, 0.3);
              else if (dansB < 0.18) c = melC(c, C3.clair, 0.4);
            }
            if (dep < p * 1.1) c = melC(C3.fond, [36, 40, 110], 0.5);
            poseRVB(i, j, teinte(c));
          }
          // de petits pins sur les plateaux, en rythme
          if (!nue && k >= 3 && hsh(Math.floor((x + k * 37) / 26), k + 41) < 0.18 && ((Math.floor(x) % 26) + 26) % 26 < p) {
            const r = 3 + f * 6;
            for (let jj = J(top - r * 0.8); jj <= J(top + r * 0.4); jj++) for (let ii = I(x - r * 1.3); ii <= I(x + r * 1.3); ii++) {
              const dx = (X(ii) - x) / (r * 1.3), dy = (Y(jj) - (top - r * 0.2)) / (r * 0.6);
              // (jamais au-dessus de la crête : pas de taches sur le ciel)
              if (dx * dx + dy * dy <= 1 && Y(jj) >= massif(X(ii)) + p) poseRVB(ii, jj, teinte(dy < -0.3 ? C3.garrigue : C3.garrigueS));
            }
          }
        }
      }
    }
    // --- les petites formes en pixels ---
    const ovale = (cx, cy, rx, ry, fn) => {
      for (let j = J(cy - ry); j <= J(cy + ry); j++) for (let i = I(cx - rx); i <= I(cx + rx); i++) {
        const dx = (X(i) - cx) / rx, dy = (Y(j) - cy) / ry;
        if (dx * dx + dy * dy <= 1) fn(i, j, dx, dy);
      }
    };
    // un feuillage en touffes : de petits paquets d'aiguilles, chacun éclairé en haut à gauche,
    // sombre en bas à droite (les touffes du fond d'abord, celles du dessus ensuite)
    const touffes = (cx, cy, rx, ry, graine, lumineux, f) => {
      // (d'abord le cœur du feuillage, plein et sombre, puis les touffes par-dessus)
      ovale(cx, cy + ry * 0.1, rx * 0.92, ry * 0.85, (i, j, dx, dy) => {
        if (lumineux && dy > 0.45) return pose(i, j, "#e9b44c", true);
        const c = dy > 0.5 ? "#1e3d25" : "#2f6b35";
        pose(i, j, f ? brume(c, f) : c);
      });
      const n = Math.max(6, Math.round((rx * ry) / 14)), liste = [];
      for (let k = 0; k < n; k++) {
        const a = hsh(graine, k) * Math.PI * 2, r = Math.sqrt(hsh(graine, k + 99));
        liste.push([cx + Math.cos(a) * r * (rx - 5), cy + Math.sin(a) * r * (ry - 3), 7 + hsh(graine, k + 7) * 6]);
      }
      liste.sort((u, v) => v[1] - u[1]);
      for (const [x, y, r] of liste) {
        const haut = (cy - y) / ry;
        ovale(x, y, r, r * 0.8, (i, j, dx, dy) => {
          const h = hsh(i + i0, j + j0), e = dx * dx + dy * dy;
          let c = e > 0.8 && dy > 0 ? "#1e3d25" : dx + dy < -0.7 ? (haut > 0.1 ? "#9cc77a" : "#6cbd5c") : dx + dy < -0.1 ? (h < 0.3 ? "#6cbd5c" : "#4aa63e") : dy > 0.35 ? "#2f6b35" : (h < 0.25 ? "#4aa63e" : "#3f8a42");
          if (lumineux && haut < -0.3 && dy > 0.2) return pose(i, j, h < 0.5 ? "#e9b44c" : "#ffc46b", true);
          pose(i, j, f ? brume(c, f) : c);
        });
      }
    };
    const rect = (x, y, w, h, c) => { for (let j = J(y); j < J(y + h); j++) for (let i = I(x); i < I(x + w); i++) pose(i, j, c); };
    const trait = (x0, y0, x1, y1, ep, fn) => {
      const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / p));
      for (let s = 0; s <= n; s++) {
        const x = x0 + ((x1 - x0) * s) / n, y = y0 + ((y1 - y0) * s) / n;
        for (let e = -Math.floor(ep / 2); e < Math.ceil(ep / 2); e++) fn(I(x) + e, J(y), e, s / n);
      }
    };
    const bas = SOL_DEHORS + 2, brume = (c, f) => { const v = rgb(c), b = rgb("#d6eef7"); return "#" + v.map((x, k) => Math.round(x + (b[k] - x) * f).toString(16).padStart(2, "0")).join(""); };
    // l'araucaria, derrière la maison : un tronc droit et ses étages de branches bien fournis
    {
      const x = -64, h = 760, f = 0.12;
      trait(x, bas, x, bas - h, unite(9), (i, j, e) => pose(i, j, brume(e < 0 ? "#5e3d28" : e > 0 ? "#2e1c12" : "#45291a", f)));
      // D'après la photo : des étages de branches bien séparés tout le long du tronc, de plus en
      // plus courts vers le haut. Chaque branche monte en biais, s'incurve et se redresse au bout ;
      // elle porte des rameaux couverts d'aiguilles serrées qui forment une longue fronde plate,
      // large vers le milieu et effilée au bout, comme une plume : claire dessus, sombre dessous.
      const fronde = (x0, y0, L, angle, courbe, k, s) => {
        const pt = (t) => { const a = angle - courbe * t * t; return [x0 + s * Math.cos(a) * L * t, y0 - Math.sin(a) * L * t]; };
        const N = Math.max(8, Math.round(L / p));
        for (let n = 0; n <= N; n++) {
          const t = n / N, [ax, ay] = pt(t), [bx, by] = pt(Math.min(1, t + 0.02));
          const tx = (bx - ax) || s * 0.01, ty = by - ay, l = Math.hypot(tx, ty) || 1, ux = tx / l, uy = ty / l;
          const larg = L * 0.13 * Math.pow(Math.sin(Math.PI * (0.12 + 0.88 * t)), 0.75) * (1 - t * 0.35);
          // les rameaux d'aiguilles se dressent au-dessus de la branche, vers le haut et un peu vers le bout
          // (une sur deux, longues et bien séparées, pour qu'on les voie une à une)
          if (n % 2 === 0 && hsh(n + k * 41, s + 3) > 0.1) {
            const lg = 3.6 + hsh(n + 7, k) * 1.2, ex = ax + ux * larg * 1.5 + (hsh(n, k) - 0.5) * p, ey = ay - larg * lg;
            trait(ax, ay, ex, ey, 1, (i2, j2, e, v) => pose(i2, j2, brume(v > 0.75 ? "#3a6e40" : v > 0.35 ? "#24502f" : "#173a26", f)));
          }
          trait(ax, ay, bx, by, t < 0.5 ? 2 : 1, (i2, j2) => pose(i2, j2, brume(t < 0.3 ? "#3a2618" : "#1f4229", f)));
        }
      };
      const ETAGES = 11;
      for (let k = 0; k < ETAGES; k++) {
        const u = k / (ETAGES - 1), y = bas - h * (0.16 + 0.8 * u), L = (175 * Math.pow(1 - u, 0.9) + 30) * (0.9 + hsh(k, 61) * 0.2);
        const angle = 0.42 + u * 0.3, courbe = -0.35 - u * 0.15;
        for (const s of [-1, 1]) fronde(x, y, L, angle + (hsh(k, s + 63) - 0.5) * 0.1, courbe, k, s);
        // et une branche vue de face, plus courte, qui pointe vers nous (en raccourci)
        if (k % 2 === 0 && k < ETAGES - 2) fronde(x, y + 4, L * 0.35, 1.25, -0.4, k + 50, hsh(k, 70) < 0.5 ? -1 : 1);
      }
      // la pointe, droite, avec son dernier petit étage
      fronde(x, bas - h + 4, 34, 1.45, 0, 99, 1);
      for (const s of [-1, 1]) fronde(x, bas - h + 26, 26, 0.75, -0.3, 98, s);
    }
    // l'herbothèque, derrière à gauche : la tiny house sur roues, de profil, bois orangé à clin,
    // toit de tuiles en terre cuite, porte verte et ses deux marches
    {
      const x = -700, w = 270, hm = 130, roues = 26, mur = bas - roues - 10 - hm, toitH = 70, f = 0.16, b = (c) => brume(c, f);
      rect(x - 6, bas - roues - 12, w + 12, 8, b("#2c2a3e")); rect(x + w + 6, bas - roues - 10, 34, 4, b("#2c2a3e"));
      for (const u of [0.32, 0.5]) ovale(x + w * u, bas - roues, roues, roues, (i, j, dx, dy) => { const e = dx * dx + dy * dy; pose(i, j, b(e > 0.72 ? "#23214a" : e < 0.06 ? "#8a98cc" : "#4a4560")); });
      for (let j = J(mur); j < J(mur + hm); j++) { const y = Y(j), rang = Math.floor((y - mur) / 9); for (let i = I(x); i < I(x + w); i++) pose(i, j, b((y - mur) % 9 < 2 ? "#8a5c34" : rang % 2 ? "#b9834f" : "#c08a55")); }
      rect(x, mur, 6, hm, b("#f3f0dc")); rect(x + w - 6, mur, 6, hm, b("#f3f0dc"));
      for (const [fx, fw] of [[24, 58], [196, 46]]) { rect(x + fx - 4, mur + 22, fw + 8, 54, b("#f3f0dc")); rect(x + fx, mur + 26, fw, 46, b("#a8d8ec")); rect(x + fx + fw / 2 - 1.5, mur + 26, 3, 46, b("#f3f0dc")); }
      rect(x + 107, mur + 18, 50, hm - 18, b("#4b3427")); rect(x + 110, mur + 21, 44, hm - 21, b("#2f6b35")); rect(x + 144, mur + 64, 5, 5, b("#f6ee55"));
      for (let k = 0; k < 2; k++) rect(x + 104 - k * 8, mur + hm + k * 10, 60 + k * 16, 10, b(k ? "#9a6a3c" : "#b9834f"));
      for (let j = J(mur - toitH); j < J(mur + 6); j++) {
        const y = Y(j), u = (y - (mur - toitH)) / (toitH + 6), deb = 12 + u * 10, rang = Math.floor((y - (mur - toitH)) / 10), dansR = (y - (mur - toitH)) % 10;
        for (let i = I(x - deb); i < I(x + w + deb); i++) { const xx = X(i); pose(i, j, b(dansR < 2 ? "#b2552e" : ((xx - x + rang * 9) % 18 + 18) % 18 < 2 ? "#c95a3a" : dansR < 5 ? "#ef8a5c" : "#e8714a")); }
      }
      rect(x - 22, mur - toitH - 6, w + 44, 6, b("#b2552e"));
    }
    // la boîte aux lettres bleue, sur son piquet
    rect(-522, bas - 64, 6, 64, "#7a4520"); rect(-538, bas - 90, 38, 28, "#3d5ee8"); rect(-538, bas - 90, 38, 4, "#7f97f2"); rect(-504, bas - 104, 4, 16, "#ff5b4f");
    // la roulotte des flashcartes, derrière à droite, de profil : la caisse jaune, une fenêtre ronde,
    // la porte bleue, le toit en tonneau en terre cuite et ses grandes roues à rayons
    {
      const x = 930, w = 250, hm = 120, r = 34, mur = bas - r * 2 - 8 - hm + 30, f = 0.1, b = (c) => brume(c, f);
      rect(x - 4, bas - r - 14, w + 8, 8, b("#4b3427")); rect(x - 60, bas - r - 10, 58, 5, b("#7a4520"));
      for (let j = J(mur); j < J(mur + hm); j++) { const y = Y(j); for (let i = I(x); i < I(x + w); i++) pose(i, j, b((y - mur) % 14 < 2 ? "#d49a22" : "#f2c23a")); }
      rect(x, mur, w, 6, b("#c96a3a")); rect(x, mur + hm - 8, w, 8, b("#c96a3a"));
      ovale(x + w * 0.3, mur + hm * 0.42, 20, 20, (i, j, dx, dy) => pose(i, j, b(dx * dx + dy * dy > 0.7 ? "#f3f0dc" : "#a8d8ec")));
      rect(x + w * 0.62, mur + 18, 48, hm - 24, b("#3d5ee8")); rect(x + w * 0.62 + 36, mur + 60, 5, 5, b("#f6ee55"));
      ovale(x + w / 2, mur + 4, w / 2 + 16, 62, (i, j, dx, dy) => { if (dy > 0) return; pose(i, j, b(dy > -0.12 ? "#b2552e" : Math.floor((dx + 1) * 9) % 2 ? "#e8714a" : "#d9653e")); });
      for (const u of [0.22, 0.78]) ovale(x + w * u, bas - r, r, r, (i, j, dx, dy) => { const e = dx * dx + dy * dy, a = Math.atan2(dy, dx); if (e > 0.72) pose(i, j, b("#23214a")); else if (e < 0.06) pose(i, j, b("#8a98cc")); else if (Math.abs(Math.sin(a * 4)) < 0.18) pose(i, j, b("#7a4520")); });
    }
    // le petit porche devant la porte, à gauche de la maison : la terrasse en planches, deux
    // poteaux, l'auvent de tuiles, et le bois sec rangé contre le mur, à l'abri
    {
      const m = -10, x0 = -184, haut = (x) => 326 + ((m - x) * 26) / (m - x0);
      for (let j = J(504); j < J(SOL_DEHORS + 2); j++) for (let i = I(x0); i < I(m); i++) {
        const x = X(i), y = Y(j), lame = Math.floor((x - x0) / 15);
        let c = y > SOL_DEHORS - 3 ? "#7a4520" : lame % 2 ? "#b9834f" : "#c49a6c";
        if ((x - x0) % 15 < p) c = "#9a6a3c";
        if (y < 504 + p) c = "#e9c99a";
        pose(i, j, c);
      }
      for (const x of [-178, -104]) { rect(x, haut(x) + 2, 8, 504 - haut(x) - 2, "#9a6a3c"); rect(x, haut(x) + 2, 3, 504 - haut(x) - 2, "#c49a6c"); }
      for (let i = I(x0 - 8); i < I(m); i++) {
        const y = haut(X(i));
        for (let j = J(y - 10); j < J(y + 5); j++) {
          const yy = Y(j);
          pose(i, j, yy < y - 5 ? (((i + i0) >> 1) % 2 ? "#e8714a" : "#c96a3a") : yy < y ? "#b2552e" : "#c49a6c");
        }
      }
      for (let r = 0; r < 5; r++) for (let k = 0; k < 5; k++) {
        const cx = -84 + k * 15 + (r % 2) * 7, cy = 496 - r * 13;
        if (cx > -20 || (r === 4 && k > 2)) continue;
        ovale(cx, cy, 7.5, 6.5, (i, j, dx, dy) => {
          const e = dx * dx + dy * dy;
          pose(i, j, e > 0.62 ? "#7a4520" : e > 0.3 ? "#e9c99a" : e > 0.14 ? "#c49a6c" : dx + dy < 0 ? "#f3f0dc" : "#e9c99a");
        });
      }
    }
    // l'île : l'herbe en touffes, la terre rouge, la terre et ses cailloux, la roche en pavés, les bords
    const { g: IG, d: ID } = PAYS.ile, F = PAYS.fond;
    const bord = (x, y) => (x < (IG + ID) / 2 ? IG + (y - SOL_DEHORS) * 0.18 + hsh(Math.floor(y / 9), 5) * 6 : ID - (y - SOL_DEHORS) * 0.18 - hsh(Math.floor(y / 9), 6) * 6);
    for (let i = 0; i < W; i++) {
      const x = X(i), xi = i + i0;
      if (x < IG || x > ID) continue;
      for (let j = Math.max(0, J(SOL_DEHORS)); j < Hh; j++) {
        const y = Y(j);
        const fondIci = F + hsh(Math.floor(x / 24), 7) * 10;
        if (y > fondIci) break;
        if ((x < (IG + ID) / 2 && x < bord(x, y)) || (x >= (IG + ID) / 2 && x > bord(x, y))) continue;
        const prof = y - SOL_DEHORS, h = hsh(xi, j + j0);
        let c;
        if (prof < 2 * p) c = h < 0.2 ? "#2f6b35" : "#3f8a42";
        else if (prof < 18) c = h < 0.12 ? "#7a4520" : h < 0.45 ? "#e8714a" : h < 0.9 ? "#c96a3a" : "#9a6a3c";
        // (de la terre jusqu'en bas, sans couche de roche)
        else c = h < 0.18 ? "#4b3427" : h < 0.6 ? "#9a6a3c" : "#7a4520";
        pose(i, j, c);
      }
      // les touffes d'herbe au-dessus du sol
      const hT = hsh(xi, 31) < 0.45 ? 1 : hsh(xi, 31) < 0.8 ? 2 : 3, js = J(SOL_DEHORS);
      for (let k = 1; k <= hT; k++) pose(i, js - k, k === hT ? (hsh(xi, 33) < 0.5 ? "#9cc77a" : "#6cbd5c") : "#4aa63e");
    }
    // les cailloux dans la terre, avec leur reflet et leur ombre
    for (let ci = Math.floor(Math.max(R.x0, IG) / 30); ci * 30 < Math.min(R.x1, ID); ci++) for (let cj = 0; cj < 6; cj++) {
      if (hsh(ci, cj + 49) > 0.6) continue;
      if (hsh(ci, cj + 50) > 0.45) continue;
      const cx = ci * 30 + hsh(ci, cj + 51) * 30, cy = SOL_DEHORS + 24 + cj * 16 + hsh(ci, cj + 52) * 10, rr = 4 + hsh(ci, cj + 53) * 5;
      ovale(cx, cy, rr * 1.4, rr, (i, j, dx, dy) => pose(i, j, dx * dx + dy * dy > 0.7 ? "#4b3427" : dx + dy < -0.6 ? "#c2cdec" : "#8a98cc"));
    }
    // les racines des grands pins, qui descendent dans la terre
    for (const a of ARBRES) {
      if (a.cypres || a.x < IG || a.x > ID) continue;
      for (let r = 0; r < 4; r++) {
        let x = a.x + (r - 1.5) * 4, y = bas + 2;
        const dir = (r - 1.5) * 0.5;
        for (let s = 0; s < 14; s++) {
          const nx = x + dir * 5 + (hsh(a.x + r, s) - 0.5) * 6, ny = y + 4;
          trait(x, y, nx, ny, 1, (i, j) => pose(i, j, s % 3 ? "#4b3427" : "#7a4520"));
          x = nx; y = ny;
        }
      }
    }
    // la garrigue, le long du sol : romarin, lentisque, lavande
    for (let x = Math.floor(R.x0 / 23) * 23; x < R.x1; x += 23) {
      if (x < IG + 30 || x > ID - 30 || (x > -200 && x < LARGE + 40) || hsh(x, 21) > 0.6) continue;
      const sorte = Math.floor(hsh(x, 22) * 3), r = 10 + hsh(x, 23) * 10;
      const T = [["#9cc77a", "#4aa63e", "#2f6b35"], ["#a8d8ec", "#7f97f2", "#3a3aa8"], ["#9cc77a", "#3f8a42", "#1e3d25"]][sorte];
      ovale(x, bas - r * 0.55, r, r * 0.6, (i, j, dx, dy) => {
        let c = dy < -0.45 || dx < -0.6 ? T[0] : dy > 0.4 || dx > 0.6 ? T[2] : T[1];
        if (hsh(i + i0, j + j0) < 0.18) c = T[0];
        if (sorte === 1 && dy < -0.3 && hsh(i + i0, j + j0 + 9) < 0.3) c = "#8a58cc";
        pose(i, j, c);
      });
    }
    // les arbres, au premier plan ; le soir, le dessous des pins des guirlandes brille
    const nuitLum = moment !== "jour" && guirlandesAllumees();
    // un pin parasol : le tronc penche, se divise en branches en éventail, sous une ombrelle large
    // et plate faite de paquets d'aiguilles, le dessus éclairé, le dessous presque droit
    function pinParasol(a, ecorce0, lum) {
      const g = pinGeo(a), h = a.h;
      // L'écorce du pin parasol : de grandes plaques brun-rouge, séparées de fissures profondes et
      // sombres, plus claires côté soleil ; le tronc ondule un peu, s'évase au pied.
      const ecorce = (i, j, e, ep) => {
        const xi = i + i0, yj = j + j0, plaque = hsh(Math.floor((yj + (xi % 3) * 0.7) / 2.6), xi >> 1);
        const bord = e / Math.max(1, (ep || 2) / 2);
        let c = bord < -0.35 ? (plaque < 0.5 ? "#d38a56" : "#c0703f") : bord > 0.45 ? (plaque < 0.5 ? "#7a3f26" : "#6a3420") : plaque < 0.5 ? "#a8582f" : "#b8683c";
        if (plaque < 0.14 || (yj % 3 === 0 && plaque < 0.55) || (xi % 4 === 0 && plaque > 0.85)) c = "#4b2a1c";
        pose(i, j, c);
      };
      for (let k = 0; k < 24; k++) {
        const u = k / 24, u2 = (k + 1) / 24, ond = (v) => Math.sin(v * Math.PI * 1.6 + a.x) * h * 0.018;
        const ep = unite((17 - 7 * u) * (1 + Math.max(0, 0.12 - u) * 3));
        trait(a.x + (g.fx - a.x) * u * (0.6 + 0.4 * u) + ond(u), bas - (bas - g.fy) * u, a.x + (g.fx - a.x) * u2 * (0.6 + 0.4 * u2) + ond(u2), bas - (bas - g.fy) * u2, ep, (i, j, e) => ecorce(i, j, e, ep));
      }
      const nb = 4 + Math.floor(hsh(a.x, 3) * 2);
      for (let k = 0; k < nb; k++) {
        const t = k / (nb - 1), bx = g.cx + (t - 0.5) * g.L * 1.5, by = g.haut + g.ep * (0.75 + hsh(a.x, k + 4) * 0.2);
        const mx = g.fx + (bx - g.fx) * 0.45 + (hsh(a.x, k + 9) - 0.5) * 10, my = g.fy + (by - g.fy) * 0.55;
        trait(g.fx, g.fy, mx, my, unite(6), (i, j, e) => ecorce(i, j, e, unite(6))); trait(mx, my, bx, by, unite(4), (i, j, e) => ecorce(i, j, e, unite(4)));
      }
      // L'ombrelle : beaucoup de petites touffes d'aiguilles (des pompons), serrées en dôme plat.
      // Chaque pompon est fait d'aiguilles qui rayonnent de son centre : son bord est hérissé, le
      // dessus pris par la lumière (vert tendre côté soleil), le dessous dans l'ombre (vert bleuté
      // très sombre) ; entre les pompons, des creux sombres, et çà et là un trou de ciel.
      const pompons = [], n = Math.round(g.L / 7);
      for (let q = 0; q < n; q++) {
        const t = hsh(a.x, q + 20), u = (t - 0.5) * 2, dome = 1 - u * u;
        const px = g.cx + u * g.L * 0.86, py = g.haut + g.ep * (0.62 - dome * 0.5) + (hsh(a.x, q + 30) - 0.5) * g.ep * 0.55;
        const r = g.L * (0.09 + hsh(a.x, q + 40) * 0.06);
        pompons.push([px, py, r, q]);
      }
      // (les pompons du haut et du fond d'abord ; ceux du bord inférieur passent devant)
      pompons.sort((A, B) => A[1] - B[1]);
      for (const [px, py, r, q] of pompons) {
        const ry = r * 0.72;
        ovale(px, py, r * 1.25, ry * 1.25, (i, j, dx, dy) => {
          const x = X(i), y = Y(j), ax = (x - px) / r, ay = (y - py) / ry, ang = Math.atan2(ay, ax), d2 = ax * ax + ay * ay;
          // le bord hérissé : chaque aiguille dépasse plus ou moins
          const aiguille = hsh(Math.floor((ang + Math.PI) * 9) + q * 31, 7);
          if (d2 > 0.62 + aiguille * 0.95 || (ay > 0.55 && d2 > 0.75)) return;
          if (lum && ay > 0.3) {
            // (les ampoules pendent dessous : la lumière monte dans les aiguilles et s'y perd)
            const f = Math.min(1, (ay - 0.3) / 0.65), chaud = hsh(i + i0, j + j0) < 0.5 ? "#e9b44c" : "#ffc46b";
            return pose(i, j, f < 0.5 ? tram(i, j, f * 2, "#173a2c", "#7a5a2a") : tram(i, j, (f - 0.5) * 2, "#7a5a2a", chaud), f > 0.75);
          }
          // les aiguilles qui rayonnent : des traits fins, plus clairs, de la base au bout
          const rai = hsh(Math.floor((ang + Math.PI) * 14) + q * 17, Math.floor(Math.sqrt(d2) * 3));
          const soleil = -(ax * 0.7 + ay) / 1.3;
          let c;
          if (ay > 0.35) c = rai < 0.25 ? "#26503a" : "#173a2c";
          else if (soleil > 0.45) c = rai < 0.3 ? "#9cc77a" : rai < 0.7 ? "#6cb05a" : "#4a9a46";
          else if (soleil > 0.05) c = rai < 0.3 ? "#4f9e4a" : rai < 0.7 ? "#3a7f40" : "#2c6a3c";
          else c = rai < 0.3 ? "#3a7f40" : rai < 0.7 ? "#2c6a3c" : "#1f5034";
          // le creux au cœur du pompon, où les aiguilles se rejoignent
          if (d2 < 0.08 && ay > -0.2) c = "#173a2c";
          pose(i, j, c);
        });
      }
      // le dessous de l'ombrelle, presque droit, dans l'ombre bleue ; quelques trous de ciel par-dessus
      for (let x = g.cx - g.L * 0.8; x < g.cx + g.L * 0.8; x += p) {
        const y = g.haut + g.ep * 0.82 + Math.sin(x / 11 + a.x) * g.ep * 0.06;
        if (hsh(Math.floor(x / 6), a.x) < 0.8) pose(I(x), J(y), lum ? (hsh(Math.floor(x / 3), a.x + 5) < 0.75 ? "#5a4a2a" : "#c98a3a") : "#173a2c", false);
      }
    }
    const couronne = (cx, cy, rx, ry, lumineux) => touffes(cx, cy, rx, ry, Math.round(cx * 7 + cy), lumineux);
    for (const a of ARBRES) {
      if (a.x < IG + 20 || a.x > ID - 20 || a.x < R.x0 - 120 || a.x > R.x1 + 120) continue;
      const lum = nuitLum && a.pres;
      if (a.cypres) {
        for (let j = J(bas - a.h); j < J(bas); j++) {
          const y = Y(j), u = (bas - y) / a.h, demi = 15 * Math.sin(Math.min(1, u * 1.15) * Math.PI) * (u > 0.8 ? 0.9 : 1) + 3;
          for (let i = I(a.x - demi); i <= I(a.x + demi); i++) {
            const dx = (X(i) - a.x) / demi, h = hsh(i + i0, j + j0);
            pose(i, j, dx < -0.4 ? (h < 0.4 ? "#4aa63e" : "#3f8a42") : dx > 0.45 ? "#1e3d25" : h < 0.15 ? "#3f8a42" : "#2f6b35");
          }
        }
        if (lum) ovale(a.x, bas - a.h * 0.62 + 6, 16, 9, (i, j, dx, dy) => { if (dy > -0.2) pose(i, j, tram(i, j, Math.min(1, (dy + 0.2) / 1.1), "#1e3d25", dy > 0.5 ? "#e9b44c" : "#7a5a2a"), dy > 0.6); });
        continue;
      }
      const ecorce = (i, j, e) => pose(i, j, e < 0 ? "#9a6a3c" : e > 0 ? "#4b3427" : "#7a4520");
      pinParasol(a, ecorce, lum);
    }
    // le soir et la nuit, tout se teinte (sauf ce qui brille)
    const te = TEINTE[moment];
    if (te) for (let q = 0, k = 0; q < W * Hh; q++, k += 4) {
      if (!d[k + 3] || brille[q]) continue;
      for (let c = 0; c < 3; c++) d[k + c] = Math.min(255, d[k + c] * te.m[c] + te.a[c]);
    }
    const toile = document.createElement("canvas");
    toile.width = W; toile.height = Hh;
    toile.getContext("2d").putImageData(img, 0, 0);
    cachePaysage = { cle, toile, x0: i0 * p, y0: j0 * p };
    return cachePaysage;
  }
  // une guirlande tendue entre deux accroches, qui pend un peu ; le soir, ses ampoules s'allument
  function guirlande(ctx, [x0, y0], [x1, y1], allumee, t, k) {
    const creux = 18 + Math.abs(x1 - x0) * 0.08, mx = (x0 + x1) / 2, my = (y0 + y1) / 2 + creux * 2;
    const pt = (u) => [(1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * my + u * u * y1];
    ctx.strokeStyle = "#2c2a3e"; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / 13));
    for (let i = 1; i < n; i++) {
      const [x, y] = pt(i / n);
      if (allumee) {
        const a = 0.75 + 0.25 * Math.sin(t / 500 + i * 1.7 + k);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        // un cœur vif, puis un halo large et doux qui éclaire l'air et ce qui est autour
        const g = ctx.createRadialGradient(x, y + 2, 0, x, y + 2, 9);
        g.addColorStop(0, "rgba(255,210,110," + (0.45 * a).toFixed(2) + ")"); g.addColorStop(1, "rgba(255,210,110,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 9, y - 7, 18, 18);
        const h2 = ctx.createRadialGradient(x, y + 6, 0, x, y + 6, 30);
        h2.addColorStop(0, "rgba(255,190,100," + (0.16 * a).toFixed(2) + ")"); h2.addColorStop(0.6, "rgba(255,170,90," + (0.06 * a).toFixed(2) + ")"); h2.addColorStop(1, "rgba(255,170,90,0)");
        ctx.fillStyle = h2; ctx.fillRect(x - 30, y - 24, 60, 60);
        ctx.restore();
        ctx.fillStyle = "#fff06a";
      } else ctx.fillStyle = "#e9e3cd";
      ctx.fillRect(x - 1.3, y + 0.5, 2.6, 3);
    }
    ctx.lineWidth = 2.2; ctx.strokeStyle = ENCRE;
  }
  // les vitres de la maison : elles restent transparentes, et laissent voir le vrai paysage de
  // dehors (peint derrière la maison, avec sa pluie), comme le velux. Seul un léger reflet de vitre.
  function fenetresDehors(m, t, moment) {
    for (const R of [BAIE, FENETRE_BAS]) {
      m.save(); cheminFenetre(m, R); m.clip();
      m.clearRect(R.x - 2, R.y - 2, R.w + 4, R.h + 4);
      m.fillStyle = moment === "jour" ? "rgba(214,238,247,0.10)" : "rgba(40,50,110,0.12)";
      m.fillRect(R.x, R.y, R.w, R.h);
      m.restore();
    }
  }
  // Poser une image : le dehors d'abord, puis la maison peinte (M) par-dessus. Rend ce qu'on voit
  // du dehors, et laisse la toile dans le repère du dessin.
  function poserMaison(ctx, v, t, moment, etat, M) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, v.W, v.Hc);
    mondeRepere(ctx, v);
    const R = { x0: BOITE.x - v.px / v.K, y0: BOITE.y - v.py / v.K, x1: BOITE.x + (v.W - v.px) / v.K, y1: BOITE.y + (v.Hc - v.py) / v.K };
    dehorsMonde(ctx, t, moment, etat, R, v.taille / v.K);
    pluieDehors(ctx, t, R, v.taille / v.K, moment);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(M, v.px, v.py);
    mondeRepere(ctx, v);
    return R;
  }

  // Quand il pleut vraiment (ou que Lóló fait tomber sa pluie de joie), on le voit dehors tout
  // autour de la maison : un voile gris, et des gouttes en gros pixels qui tombent en biais.
  function pluieDehors(ctx, t, R, p, moment) {
    const m = H.ciel.meteo || {};
    if (!((H.pluieMagique && H.pluieMagique()) || m.type === "pluie" || m.type === "orage")) return;
    const L = R.x1 - R.x0, Hh = R.y1 - R.y0, fort = m.type === "orage" ? 1.6 : 1;
    ctx.fillStyle = moment === "jour" ? "rgba(96,108,130,0.12)" : "rgba(20,22,50,0.18)";
    ctx.fillRect(R.x0, R.y0, L, Hh);
    ctx.fillStyle = moment === "jour" ? "rgba(214,236,248,0.75)" : "rgba(150,170,220,0.55)";
    const n = Math.max(24, Math.round((420 * fort * L * Hh) / 1.6e6)), cale = (v) => Math.round(v / p) * p;
    for (let k = 0; k < n; k++) {
      const v = (0.55 + hsh(k, 7) * 0.35) * fort, y0 = (hsh(k, 3) * Hh + t * v) % (Hh + 40), x = R.x0 + ((hsh(k, 5) * (L + 80) - y0 * 0.22) % (L + 80) + L + 80) % (L + 80) - 40;
      const y = R.y0 + y0 - 20;
      for (let s = 0; s < 4; s++) ctx.fillRect(cale(x - s * p * 0.25), cale(y + s * p), p, p);
    }
  }

  // Le dehors, derrière la vitre : le ciel du moment, des arbres au loin, plus sombres et bleuis,
  // puis des arbres tout proches. Le jour, le soleil les éclaire par le haut ; le soir et la nuit,
  // c'est la lumière du salon qui éclaire le bas de leur feuillage et leurs troncs.
  function dehorsBaie(ctx, t, moment, etat, F) {
    const { x: X, y: Y, w: L, h: Hh } = F || BAIE, bas = Y + Hh;
    const matin = new Date().getHours() < 12;
    const CIEL = moment === "jour" ? ["#2f8fe0", "#6fb6ee", "#a8d8ec", "#d6eef7"]
      : moment === "soir" ? (matin ? ["#3a3aa8", "#8a58cc", "#d07ab8", "#ffb3a8", "#ffd23a"] : ["#2a2c6a", "#5b3c8f", "#c93f6e", "#ff5b4f", "#ffb36b"])
      : ["#15124a", "#1b1d4a", "#232a63", "#2a2c6a", "#3a3aa8"];
    const g = ctx.createLinearGradient(0, Y, 0, bas - 30);
    CIEL.forEach((c, k) => g.addColorStop(k / (CIEL.length - 1), c));
    ctx.fillStyle = g;
    ctx.fillRect(X, Y, L, Hh);
    const r = H.alea("baie");
    if (moment === "jour") {
      ctx.fillStyle = "#f3f0dc";
      for (const [v, y, l] of [[0.010, Y + 26, 34], [0.006, Y + 52, 24]]) {
        const x = X - 40 + ((t * v) % (L + 80));
        arrondi(ctx, x, y, l, 9, 4.5); ctx.fill();
        arrondi(ctx, x + l * 0.25, y - 5, l * 0.5, 9, 4.5); ctx.fill();
      }
    } else {
      for (let i = 0; i < 40; i++) {
        const x = X + r() * L, y = Y + r() * Hh * 0.45, n = i % 4;
        ctx.fillStyle = "rgba(255,245,230," + (moment === "nuit" ? 0.5 + 0.5 * Math.sin(t / 600 + n * 2 + x) : 0.3) + ")";
        ctx.fillRect(x, y, 1.8, 1.8);
      }
      // (la lune, on la voit dans le vrai ciel, au-dessus de la maison)
    }
    // au loin, une rangée d'arbres ronds, plus sombres et bleuis par l'air
    const loin = moment === "jour" ? "#9cc77a" : moment === "soir" ? "#4a3a7a" : "#1b1d4a";
    ctx.fillStyle = loin;
    for (let x = X - 6; x < X + L + 6; x += 9 + r() * 6) {
      const hh = 26 + r() * 22;
      ctx.beginPath(); ctx.ellipse(x, bas - hh, 8 + r() * 5, 10 + r() * 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillRect(x - 8, bas - hh, 16, hh);
    }
    // tout près, deux pins et un cyprès ; le côté éclairé change avec le moment
    const pres = moment === "jour" ? "#2f6b35" : moment === "soir" ? "#2a2450" : "#10102e";
    const eclaire = moment === "jour" ? "#4aa63e" : moment === "soir" ? "#ff9a5a" : "#e9b44c";
    const tronc = moment === "jour" ? "#7a4520" : moment === "soir" ? "#3a2440" : "#1a1430";
    const lumBas = moment !== "jour";
    const houppe = (cx, cy, rx, ry) => {
      ctx.fillStyle = pres;
      ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
      // le bord éclairé : en haut le jour (le soleil), en bas le soir (la lumière du salon)
      ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
      ctx.fillStyle = eclaire;
      ctx.beginPath(); ctx.ellipse(cx + (lumBas ? 0 : -rx * 0.2), cy + (lumBas ? ry * 0.75 : -ry * 0.7), rx * 0.95, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = pres;
      ctx.beginPath(); ctx.ellipse(cx + (lumBas ? 0 : -rx * 0.2), cy + (lumBas ? ry * 1.05 : -ry * 1.0), rx * 0.95, ry * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    };
    const pin = (x, haut, rx, penche) => {
      ctx.strokeStyle = tronc; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(x, bas + 4); ctx.quadraticCurveTo(x + penche * 0.4, bas - haut * 0.5, x + penche, bas - haut); ctx.stroke();
      if (lumBas) { ctx.strokeStyle = eclaire; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 2, bas + 4); ctx.quadraticCurveTo(x - 2 + penche * 0.4, bas - haut * 0.5, x - 2 + penche, bas - haut * 0.8); ctx.stroke(); }
      houppe(x + penche - rx * 0.4, bas - haut - 6, rx * 0.7, 9);
      houppe(x + penche + rx * 0.35, bas - haut - 2, rx * 0.75, 10);
      houppe(x + penche, bas - haut - 12, rx * 0.6, 8);
    };
    pin(X + 26, 92, 30, 8);
    pin(X + L * 0.56, 78, 28, 6);
    pin(X + L - 40, 104, 34, -10);
    // le cyprès, fin et sombre
    ctx.fillStyle = pres;
    ctx.beginPath(); ctx.moveTo(X + 72, bas - 112); ctx.quadraticCurveTo(X + 86, bas - 60, X + 82, bas); ctx.lineTo(X + 62, bas); ctx.quadraticCurveTo(X + 58, bas - 60, X + 72, bas - 112); ctx.fill();
    ctx.fillStyle = eclaire;
    ctx.beginPath(); ctx.moveTo(lumBas ? X + 64 : X + 70, lumBas ? bas - 40 : bas - 108); ctx.quadraticCurveTo(lumBas ? X + 72 : X + 62, lumBas ? bas - 20 : bas - 70, lumBas ? X + 70 : X + 64, lumBas ? bas : bas - 40); ctx.lineTo(lumBas ? X + 64 : X + 66, lumBas ? bas : bas - 40); ctx.fill();
    // des reflets sur la vitre : deux traits de lumière le jour, la lampe qui se reflète le soir
    ctx.fillStyle = moment === "jour" ? "rgba(255,255,255,0.16)" : "rgba(255,200,110,0.1)";
    for (const [dx, l] of [[22, 7], [36, 3]]) { ctx.beginPath(); ctx.moveTo(X + dx, bas); ctx.lineTo(X + dx + l, bas); ctx.lineTo(X + dx + l + 60, Y); ctx.lineTo(X + dx + 60, Y); ctx.fill(); }
    ctx.lineWidth = 2.2;
  }

  // La lumière de la pièce. Une lumière ne se pose pas sur les choses comme un voile : elle change
  // leur couleur. On peint donc d'abord la pièce dans ses vraies couleurs, puis chaque point est
  // multiplié par la couleur de la lumière qu'il reçoit : la lumière de la pièce partout (claire
  // et un peu froide le jour, violette au crépuscule, bleu nuit la nuit), le ciel qui entre par la
  // baie, et le soir les deux lampes, chaudes. Près d'une lampe, une couleur se réchauffe et
  // s'éclaircit ; loin, elle s'assombrit et bleuit, sans jamais devenir grise. Tout près des
  // ampoules, les surfaces prennent en plus un reflet vif de la couleur de la lampe. Chaque
  // meuble a son modelé : le côté tourné vers la lumière s'éclaire d'un liseré de sa couleur,
  // l'autre côté passe dans l'ombre (teintée de la couleur de la pièce) ; devant la baie, le
  // canapé est en contre-jour, le haut des formes s'allume. Le soleil et le feu, qui bougent,
  // s'ajoutent à chaque image de la même façon (couleur de la chose × couleur de la lumière).
  // eteint : pour dormir, les lampes éteintes ; seule la nuit entre par la baie
  const rgba = (c, a) => "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a == null ? 1 : a) + ")";
  const SOLEIL = { jour: [255, 238, 196], soir: [255, 168, 104] };
  const FEU_COUL = [255, 122, 40];
  function lumieres(moment, eteint) {
    const lampes = !eteint && moment !== "jour";
    const ciel = { jour: [66, 62, 46], soir: [130, 72, 66], nuit: [26, 34, 70] }[moment];
    const rim = moment === "jour" ? [255, 248, 222] : moment === "soir" ? [255, 172, 140] : [170, 190, 255];
    const sources = [
      // le ciel qui entre par la grande baie, par la petite fenêtre du bas et par le velux
      { x: BAIE.x + BAIE.w / 2, y: 200, rx: 300, ry: 150, col: ciel, rim, poids: lampes ? 0.3 : 1, etage: "salon" },
      { x: FENETRE_BAS.x + FENETRE_BAS.w / 2 - 20, y: 420, rx: 230, ry: 130, col: ciel.map((v) => v * 0.7), rim, poids: lampes ? 0.3 : 0.8, etage: "bas" },
      { x: 346, y: -90, rx: 250, ry: 120, col: ciel, rim, poids: lampes ? 0.3 : 1, etage: "grenier" },
    ];
    if (lampes) {
      // la petite lampe posée sur l'enceinte, à côté du canapé ; la lampe de chevet ; la boule
      sources.push({ x: LAMPE.x, y: LAMPE.y + ENC_DY + 34, rx: 420, ry: 290, douce: true, col: [215, 148, 70], rim: [255, 214, 140], poids: 1, eclat: [150, 92, 30], re: 60, etage: "salon" });
      sources.push({ x: CHEVET.x, y: CHEVET.y + 30, rx: 375, ry: 220, douce: true, col: [215, 148, 70], rim: [255, 214, 140], poids: 1, eclat: [150, 92, 30], re: 60, etage: "grenier" });
      sources.push({ x: BOULE.x, y: BOULE.y + 80, rx: 430, ry: 310, douce: true, col: [222, 128, 52], rim: [255, 190, 110], poids: 1, eclat: [160, 82, 24], re: 75, ey: BOULE.y + 92, table: true, etage: "bas" });
    }
    return {
      ambiant: eteint ? [38, 42, 94] : { jour: [250, 246, 240], soir: [118, 96, 146], nuit: [50, 54, 110] }[moment],
      // le jour, la lumière du dehors remplit toute la maison : les couleurs s'éclaircissent un peu
      // partout, et davantage près des fenêtres
      jour: !eteint && moment === "jour",
      ombre: { jour: "50,46,120", soir: "70,26,96", nuit: "16,16,64" }[moment],
      sources,
    };
  }
  // une tache de lumière douce (ronde, aplatie)
  function tache(g, x, y, rx, ry, col, a, douce) {
    a = a == null ? 1 : a;
    g.save(); g.translate(x, y); g.scale(1, ry / rx);
    const d = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    // (une chute douce, sans bord : la lumière s'éteint peu à peu)
    // (douce : la lumière des lampes porte loin, et ne s'éteint qu'à la fin)
    for (const [u, f] of douce ? [[0, 1], [0.3, 0.88], [0.55, 0.62], [0.75, 0.34], [0.9, 0.12], [1, 0]] : [[0, 1], [0.2, 0.86], [0.4, 0.6], [0.6, 0.32], [0.8, 0.1], [1, 0]]) d.addColorStop(u, rgba(col, a * f));
    g.fillStyle = d; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  // une lumière reste à son étage (les planchers l'arrêtent)
  function etage(g, s, fn) {
    const H0 = { grenier: [BOITE.y, 12], salon: [0, NIV.bas.plafond], bas: [NIV.bas.plafond - 14, BOITE.y + BOITE.h] }[s.etage];
    g.save(); g.beginPath(); g.rect(BOITE.x, H0[0], BOITE.w, H0[1] - H0[0]); g.clip(); fn(); g.restore();
  }
  // la carte de la lumière reçue en chaque point (k : échelle du dessin vers les pixels)
  function carteLumiere(lw, lh, k, L) {
    const c = document.createElement("canvas"), g = c.getContext("2d");
    c.width = lw; c.height = lh;
    repere(g, k);
    g.fillStyle = rgba(L.ambiant); g.fillRect(BOITE.x, BOITE.y, BOITE.w, BOITE.h);
    g.globalCompositeOperation = "lighter";
    for (const s of L.sources) etage(g, s, () => tache(g, s.x, s.y, s.rx, s.ry, s.col, 1, s.douce));
    // sous la table, le plateau fait de l'ombre : la boule (juste au-dessus) n'y arrive pas
    g.globalCompositeOperation = "source-over";
    g.filter = "blur(" + Math.round(5 * k) + "px)";
    const y0 = 226 + TABLE_T.y, sousLaTable = g.createLinearGradient(0, y0, 0, y0 + 68);
    if (L.sources.some((s) => s.table)) {
      sousLaTable.addColorStop(0, rgba(L.ambiant, 0)); sousLaTable.addColorStop(0.35, rgba(L.ambiant, 0.3));
      sousLaTable.addColorStop(0.8, rgba(L.ambiant, 0.75)); sousLaTable.addColorStop(1, rgba(L.ambiant, 0.85));
    } else {
      sousLaTable.addColorStop(0, "rgba(0,0,0,0)"); sousLaTable.addColorStop(1, "rgba(0,0,0,0.14)");
    }
    g.fillStyle = sousLaTable;
    g.fillRect(476 + TABLE_T.x, y0, 118, 70);
    g.filter = "none";
    return c;
  }
  // les reflets vifs tout près des ampoules (null s'il n'y en a pas)
  function carteEclats(lw, lh, k, L) {
    const avec = L.sources.filter((s) => s.eclat);
    if (!avec.length && !L.jour) return null;
    const c = document.createElement("canvas"), g = c.getContext("2d");
    c.width = lw; c.height = lh;
    repere(g, k);
    g.fillStyle = L.jour ? "rgb(52,50,42)" : "#000"; g.fillRect(BOITE.x, BOITE.y, BOITE.w, BOITE.h);
    g.globalCompositeOperation = "lighter";
    if (L.jour) for (const s of L.sources) etage(g, s, () => tache(g, s.x, s.y, s.rx * 0.8, s.ry * 0.8, [70, 68, 56]));
    for (const s of avec) etage(g, s, () => tache(g, s.x, s.ey || s.y + 30, s.re, s.re * 0.6, s.eclat));
    return c;
  }
  const tampons = {};
  function tampon(nom, w, h) {
    let c = tampons[nom];
    if (!c) c = tampons[nom] = document.createElement("canvas");
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const g = c.getContext("2d");
    g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "source-over"; g.globalAlpha = 1;
    g.clearRect(0, 0, w, h);
    return c;
  }
  // éclaire une couche peinte dans ses vraies couleurs (« couleurs ») : multipliée par la carte de
  // lumière (force < 1 : à moitié seulement), puis les reflets ; sa transparence est gardée
  function eclairerCouche(dest, couleurs, carte, eclats, force) {
    const g = dest.getContext("2d");
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = "source-over"; g.drawImage(couleurs, 0, 0);
    g.globalCompositeOperation = "multiply"; g.globalAlpha = force == null ? 1 : force; g.drawImage(carte, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = "destination-in"; g.drawImage(couleurs, 0, 0);
    g.restore();
    if (eclats) ajouterLumiere(dest, couleurs, eclats, 1);
  }
  // ajoute une lumière (masque : sa couleur en chaque point, noir ailleurs) : couleur × lumière
  function ajouterLumiere(dest, couleurs, masque, alpha) {
    const t = tampon("ajout", dest.width, dest.height), tg = t.getContext("2d");
    tg.drawImage(couleurs, 0, 0);
    tg.globalCompositeOperation = "multiply"; tg.drawImage(masque, 0, 0);
    tg.globalCompositeOperation = "destination-in"; tg.drawImage(couleurs, 0, 0);
    const g = dest.getContext("2d");
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = "lighter"; g.globalAlpha = alpha; g.drawImage(t, 0, 0); g.restore();
  }
  // le modelé d'une forme : liseré du côté de la lumière la plus présente, ombre de l'autre côté
  let ECL = null; // { k, L } pendant qu'on peint la pièce
  function modele(ctx, x, y, w, h, r) {
    if (w * h < 90) return;
    const m = ctx.getTransform(), k = ECL.k, X = x + w / 2, Y = y + h / 2;
    const cx = (m.a * X + m.c * Y + m.e) / k, cy = (m.b * X + m.d * Y + m.f) / k;
    let meilleure = null, v = 0;
    for (const src of ECL.L.sources) {
      const d = Math.hypot(src.x - cx, src.y - cy), f = src.poids / (1 + (d / 260) ** 2);
      if (f > v) { v = f; meilleure = src; }
    }
    if (!meilleure) return;
    // la direction de la lumière, ramenée dans le repère de la forme (miroirs et rotations compris)
    const vx = meilleure.x - cx, vy = meilleure.y - cy, inv = m.inverse();
    let lx = inv.a * vx + inv.c * vy, ly = inv.b * vx + inv.d * vy;
    const n = Math.hypot(lx, ly) || 1;
    lx /= n; ly /= n;
    const f = Math.min(1, v * 1.5);
    ctx.save();
    arrondi(ctx, x, y, w, h, r); ctx.clip();
    const gr = ctx.createLinearGradient(X + (lx * w) / 2, Y + (ly * h) / 2, X - (lx * w) / 2, Y - (ly * h) / 2);
    gr.addColorStop(0, rgba(meilleure.rim, 0.2 * f)); gr.addColorStop(0.45, "rgba(0,0,0,0)"); gr.addColorStop(1, "rgba(" + ECL.L.ombre + ",0.34)");
    ctx.fillStyle = gr; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    const ep = Math.max(1.4, Math.min(3, Math.min(w, h) * 0.12));
    ctx.translate(-lx * ep, -ly * ep);
    arrondi(ctx, x, y, w, h, r);
    ctx.lineWidth = ep * 1.4; ctx.strokeStyle = rgba(meilleure.rim, 0.55 * f); ctx.stroke();
    ctx.restore();
  }
  // les ombres de contact, au pied des meubles (dans les mesures élargies)
  function ombresAuSol(ctx) {
    for (const [x0, x1, y] of [[86, 160, 512], [172, 204, 252], [518, 550, 252], [222, 518, 254], [269, 311, 512], [299, 439, 512], [429, 471, 512], [483, 527, 512]]) {
      const cx = (x0 + x1) / 2, rx = (x1 - x0) / 2 + 6;
      ctx.save(); ctx.translate(cx, y); ctx.scale(1, 7 / rx);
      const d = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
      d.addColorStop(0, "rgba(28,18,60,0.5)"); d.addColorStop(0.7, "rgba(28,18,60,0.22)"); d.addColorStop(1, "rgba(28,18,60,0)");
      ctx.fillStyle = d; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  // Les teintes que la lumière fait naître (pour le passage en gros pixels) : chaque matière de la
  // pièce sous chaque lumière, pour que les dégradés chauds et froids ne soient pas ramenés aux
  // seules couleurs franches de la palette du jeu.
  const MATIERES = ["#d8e6f6", "#d9efdd", "#f7dfe9", "#26406a", "#2f6b35", "#c93f6e", "#7a2444", "#e9b44c", "#ff5b4f", "#ff7a6b", "#ffd23a", "#3d5ee8", "#7f97f2", "#f2f0e8", "#ffffff", "#ffb3a8", "#2c2a3e", "#c9ccd6", "#3f8a42", "#4f9a46", "#c96a3a", "#f2c29b", "#b9834f", "#7a4520", "#e04bb0", "#f3f0dc", "#23214a"]
    .map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  const palettes = {};
  function paletteMaison(moment, eteint) {
    const cle = moment + (eteint ? "e" : "");
    if (palettes[cle]) return palettes[cle];
    const L = lumieres(moment, eteint), plus = (a, b, f) => a.map((v, i) => v + b[i] * f);
    const lumi = [L.ambiant];
    for (const src of L.sources) { lumi.push(plus(L.ambiant, src.col, 0.5), plus(L.ambiant, src.col, 1)); if (src.eclat) lumi.push(plus(plus(L.ambiant, src.col, 1), src.eclat, 1)); }
    if (SOLEIL[moment]) lumi.push(plus(plus(L.ambiant, L.sources[0].col, 1), SOLEIL[moment], 0.8));
    lumi.push(plus(L.ambiant, LUNE_COUL, 0.6), plus(L.ambiant, LUNE_COUL, 1));
    lumi.push(plus(L.ambiant, FEU_COUL, 0.7));
    const out = [];
    for (const m of MATIERES) for (const l of lumi) {
      const c = m.map((v, i) => Math.min(255, (v * Math.min(255, l[i])) / 255 + (v * Math.max(0, l[i] - 255)) / 255));
      if (!out.some((o) => Math.abs(o[0] - c[0]) + Math.abs(o[1] - c[1]) + Math.abs(o[2] - c[2]) < 18)) out.push(c.map(Math.round));
    }
    return (palettes[cle] = out);
  }

  // Le soleil qui entre par la baie vitrée et se pose sur le sol et le canapé : trois rectangles de
  // lumière déformés par la perspective, coupés par les montants de la fenêtre, et tachetés par
  // l'ombre des feuilles des arbres dehors, qui bougent doucement avec le vent. Le matin la lumière
  // part vers la droite, l'après-midi vers la gauche ; par temps couvert, elle s'efface.
  const FEUILLES = Array.from({ length: 46 }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
    return [a - Math.floor(a), b - Math.floor(b), 3 + ((i * 7) % 6), i * 0.7];
  });
  // La lumière du ciel se voit toujours, que les lampes soient allumées ou non : le jour le soleil,
  // la nuit la lune (plus ou moins selon sa phase ; même sans lune, la nuit claire un peu), au
  // crépuscule une lueur mauve. Elle entre par la baie (sur le canapé et le sol) et par le velux
  // (sur le lit). On rend le masque de cette lumière : sa couleur en chaque point, noir ailleurs.
  const LUNE_COUL = [120, 150, 220], CREPUSCULE = [170, 120, 170];
  function masqueCiel(t, etat, decor) {
    const s = etat.soleil, lu = etat.lune, m = H.ciel.meteo || {};
    const couvert = m.nuages != null ? m.nuages / 100 : 0;
    let force, col, astre, feuilles = false;
    if (s.alt >= 2) {
      force = Math.max(0, 1 - couvert * 0.9) * Math.min(1, s.alt / 12) * (s.alt > 6 ? 1 : 0.7);
      col = SOLEIL[s.alt > 6 ? "jour" : "soir"]; astre = s; feuilles = true;
    } else if (s.alt > -6) {
      force = 0.4 * Math.max(0.3, 1 - couvert * 0.6); col = CREPUSCULE; astre = { alt: 20, az: s.az };
    } else {
      const levee = lu.alt > 0;
      force = Math.max(0.3, 1 - couvert * 0.7) * (levee ? 0.5 + 0.5 * (lu.fraction != null ? lu.fraction : 0.5) : 0.4);
      col = LUNE_COUL; astre = levee ? lu : { alt: 35, az: 180 }; feuilles = levee;
    }
    if (force < 0.08) return null;
    // l'astre haut fait une tache courte, bas une tache longue ; elle tourne avec l'azimut
    const pente = Math.max(-1.2, Math.min(1.2, (180 - astre.az) / 55)), long = Math.max(0.35, Math.min(1.1, 18 / Math.max(6, astre.alt)));
    const { x: fx, y: fy, w: fw, h: fh } = BAIE;
    // un point de la vitre → où sa lumière tombe : le haut sur le dossier du canapé, le bas sur le sol
    const sol = (x, y) => { const d = (y - fy) / fh; return [x + pente * 90 * d * long, 150 + d * 104 * long]; };
    const vent = Math.sin(t / 2100) * 5 + Math.sin(t / 830) * 2;
    const masque = tampon("ciel", decor.width, decor.height), g = masque.getContext("2d");
    repere(g, decor.k);
    g.fillStyle = "#000"; g.fillRect(BOITE.x, BOITE.y, BOITE.w, BOITE.h);
    const couleur = "rgb(" + col.map((v) => Math.round(v * force)).join(",") + ")";
    g.save();
    // (seulement sur le canapé et sur le sol du salon, pas sur le mur)
    g.beginPath(); g.rect(220, 140, 300, 112); g.rect(0, NIV.salon.plancher, LARGE, 16); g.clip();
    for (let k = 0; k < 3; k++) {
      const x0 = fx + (fw * k) / 3 + 5, x1 = fx + (fw * (k + 1)) / 3 - 5, y0 = fy + 5, y1 = fy + fh - 5;
      const q = [sol(x0, y0), sol(x1, y0), sol(x1, y1), sol(x0, y1)];
      g.save();
      g.beginPath(); q.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.clip();
      g.fillStyle = couleur; g.fillRect(BOITE.x, 100, BOITE.w, 200);
      // l'ombre tachetée des feuilles des arbres dehors, aplatie par la perspective
      if (feuilles) {
        g.fillStyle = "rgba(0,0,0,0.7)";
        for (const [u, v, r, ph] of FEUILLES) {
          const [x, y] = sol(fx + u * fw + vent * (0.6 + v), fy + v * fh * 0.6);
          const rr = r * (0.8 + 0.2 * Math.sin(t / 900 + ph));
          g.beginPath(); g.ellipse(x, y, rr * 1.6, rr * 0.6 * long + 1, 0.2, 0, Math.PI * 2); g.fill();
        }
      }
      g.restore();
    }
    g.restore();
    // par le velux, la lumière tombe sur le lit (les oreillers, la couverture) et le plancher
    g.save();
    g.beginPath(); g.rect(160, -130, 290, 126); g.clip();
    const dv = pente * 60 * long, { x0, x1, prof } = VELUX;
    const q = [[x0 + dv - 6, -104], [x1 + dv + 6, -112], [x1 + dv + 10, -6], [x0 + dv - 10, -6]];
    g.beginPath(); q.forEach(([x, y], n) => (n ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath();
    g.filter = "blur(" + Math.round(3 * decor.k) + "px)";
    g.fillStyle = couleur; g.fill();
    g.filter = "none";
    g.restore();
    masque.force = force; masque.col = col; masque.pente = dv;
    return masque;
  }
  // le rai de lumière du velux, dans l'air de la mezzanine (à peine visible)
  function raiDuVelux(ctx, masque) {
    const { x0, x1, prof } = VELUX, dv = masque.pente;
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createLinearGradient(0, veluxY(x0) + prof, 0, -20);
    g.addColorStop(0, rgba(masque.col, 0.16 * masque.force)); g.addColorStop(1, rgba(masque.col, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(x0, veluxY(x0) + prof); ctx.lineTo(x1, veluxY(x1) + prof); ctx.lineTo(x1 + dv + 10, -20); ctx.lineTo(x0 + dv - 10, -20); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Les flammes derrière la vitre de la cheminée, qui dansent, et leur lueur qui se pose sur le sol et
  // le mur autour (sans halo dans l'air), plus forte le soir.
  // la lumière du feu en chaque point (elle vacille)
  function masqueFeu(t, decor) {
    // (plusieurs battements mêlés, et de temps en temps une flambée : un feu ne bat jamais régulier)
    const flambee = Math.max(0, Math.sin(t / 1700) * Math.sin(t / 730)) * 0.25;
    const vac = 0.72 + Math.sin(t / 130) * 0.12 + Math.sin(t / 57 + 1) * 0.07 + Math.sin(t / 23 + 2) * 0.05 + flambee;
    const bx = Math.sin(t / 210) * 3 + Math.sin(t / 77) * 1.5, by = Math.sin(t / 160 + 1) * 2;
    const masque = tampon("feu", decor.width, decor.height), g = masque.getContext("2d");
    repere(g, decor.k);
    g.fillStyle = "#000"; g.fillRect(BOITE.x, BOITE.y, BOITE.w, BOITE.h);
    // la lumière sort seulement par la vitre, vers l'avant : elle se pose sur le sol devant le
    // poêle ; ni sur le mur derrière, ni sous le poêle
    const cx = POELE.x + POELE.w / 2;
    g.save();
    g.beginPath(); g.rect(0, NIV.bas.plancher, LARGE, 16); g.clip();
    g.globalCompositeOperation = "lighter";
    tache(g, cx + bx, NIV.bas.sol + by * 0.3, 190, 16, FEU_COUL, vac);
    tache(g, cx + bx * 0.6, NIV.bas.plancher + 2, 70, 6, FEU_COUL, vac * 0.8);
    g.restore();
    return masque;
  }
  function feuDuPoele(ctx, t, moment, decor) {
    ajouterLumiere(ctx.canvas, decor.couleurs, masqueFeu(t, decor), moment === "jour" ? 0.5 : 0.95);
    // les flammes derrière la vitre du poêle
    const { x: vx, y: vy, w: vw, h: vh } = POELE.vitre;
    ctx.save();
    ctx.beginPath(); ctx.rect(vx, vy, vw, vh); ctx.clip();
    ctx.fillStyle = "#d23a2a"; ctx.fillRect(vx, vy + vh - 7, vw, 7);
    for (let k = 0; k < 8; k++) {
      const x = vx + 1 + k * 4, hh = 9 + Math.abs(Math.sin(t / (90 + k * 23) + k)) * 13;
      ctx.fillStyle = "#ff8f2e"; ctx.fillRect(x, vy + vh - hh, 3, hh);
      ctx.fillStyle = "#ffd23a"; ctx.fillRect(x + 1, vy + vh - hh * 0.6, 1.5, hh * 0.6);
    }
    // les bûches qui brûlent, au fond
    ctx.fillStyle = "#3a2418"; ctx.fillRect(vx + 4, vy + vh - 5, vw - 8, 4);
    ctx.restore();
  }

  // le décor fixe, peint une fois pour toutes (la vitre reste transparente pour le ciel)
  // eteint : pour dormir, les deux lampes éteintes (la pièce est sombre partout)
  function decorMaison(K, moment, eteint) {
    // (les vraies couleurs, celles du plein jour : c'est la lumière qui les change ensuite)
    const L = lumieres(moment, eteint), k = K, r = H.alea("mazet");
    const nouvelle = () => { const c = document.createElement("canvas"); c.width = Math.ceil(BOITE.w * k); c.height = Math.ceil(BOITE.h * k); return c; };
    const prete = (c) => { const g = c.getContext("2d"); repere(g, k); g.lineJoin = "round"; g.lineCap = "round"; g.strokeStyle = ENCRE; g.lineWidth = 2.2; return g; };
    pixK = k;
    ECL = { k, L };
    const a = nouvelle(), ctx = prete(a);
    // les murs, les sols, le grenier sous le toit, les fenêtres, les photos
    coupe(ctx, r);
    // le poêle à bois du salon, et son conduit argenté qui traverse le grenier et sort par le toit
    poeleABois(ctx, moment, eteint);

    // (les meubles sur un plan à part, devant les murs : les rideaux se glissent entre les deux)
    const a2 = nouvelle(), cm = prete(a2);
    // au salon : les enceintes de chaque côté de la baie (la petite lampe sur celle de gauche) et
    // le grand canapé en L
    cm.save(); cm.translate(0, ENC_DY);
    for (const x of ENCEINTES) enceinte(cm, x);
    lampeEnceinte(cm, "#e9e3cd", true);
    cm.restore();
    cm.save(); cm.translate(CANAPE_T.x, CANAPE_T.y); canapeL(cm); cm.restore();
    // l'escalier en colimaçon, du rez-de-chaussée au salon, puis du salon au grenier
    escalier(cm, NIV.bas.sol, NIV.salon.sol);
    escalier(cm, NIV.salon.sol, NIV.grenier.sol);
    // au grenier : le lit, et l'étagère de livres sous la pente
    litGrenier(cm);
    etagere(cm, r);
    // en bas : la plante, sous la petite fenêtre, et les chaises de la table du goûter
    cm.save();
    cm.translate(PLANTE_T.x, PLANTE_T.y);
    for (const [x, y, l, a0, c2] of [[0, 226, 58, -1.9, "#2f7a3e"], [0, 226, 66, -1.45, "#4f9a46"], [0, 226, 54, -1.1, "#2f7a3e"], [0, 226, 46, -2.4, "#4f9a46"], [0, 226, 42, -0.7, "#3f8a42"], [0, 196, 40, -1.7, "#3f8a42"], [4, 202, 36, -0.95, "#2f7a3e"], [-4, 202, 36, -2.25, "#4f9a46"]]) feuille(cm, PLANTE + x, y, l, a0, c2);
    cm.beginPath();
    cm.moveTo(PLANTE - 12, 228); cm.lineTo(PLANTE + 12, 228); cm.lineTo(PLANTE + 9, 246); cm.quadraticCurveTo(PLANTE + 8, 249, PLANTE + 5, 249);
    cm.lineTo(PLANTE - 5, 249); cm.quadraticCurveTo(PLANTE - 8, 249, PLANTE - 9, 246); cm.closePath();
    cm.fillStyle = "#c96a3a"; cm.fill(); cm.stroke();
    bloc(cm, PLANTE - 14, 224, 28, 6, 2, "#d9824f");
    cm.restore();
    cm.save(); cm.translate(TABLE_T.x, TABLE_T.y); chaises(cm); cm.restore();

    // la boule éteinte reçoit la lumière de la pièce comme le reste
    const allumee = !eteint && moment !== "jour";
    if (!allumee) plafonnier(ctx, moment, true);
    // les chaises à part (pour qu'elles restent devant la lumière qui entre)
    const ch = nouvelle(), cg = prete(ch);
    cg.save(); cg.translate(TABLE_T.x, TABLE_T.y); chaises(cg); cg.restore();
    ECL = null;

    // puis la lumière
    const carte = carteLumiere(a.width, a.height, k, L), reflets = carteEclats(a.width, a.height, k, L);
    const c = nouvelle();
    eclairerCouche(c, a, carte, reflets);
    const c2 = nouvelle();
    eclairerCouche(c2, a2, carte, reflets);
    // (les vraies couleurs de tout, pour le soleil, la lune et le feu)
    const tout = nouvelle();
    tout.getContext("2d").drawImage(a, 0, 0); tout.getContext("2d").drawImage(a2, 0, 0);
    const chL = nouvelle();
    eclairerCouche(chL, ch, carte, reflets);
    // ce qui brille par soi-même : les abat-jour allumés et la boule
    const g = prete(c2);
    if (allumee) {
      g.save(); versLeLit(g); g.translate(-264, 0); abatJour(g, "#fff06a"); g.restore();
      g.save(); g.translate(0, ENC_DY); lampeEnceinte(g, "#fff06a"); g.restore();
      plafonnier(g, moment, false);
    }
    Object.assign(c, { couleurs: tout, meubles: c2, carte, eclats: reflets, chaises: chL, k, L });
    return c;
  }

  // La maison coupée de haut en bas. En bas, le rez-de-chaussée (mur violet) ; au milieu, le salon
  // (mur vert) ; la cage de l'escalier, à gauche, en bleu. Les sols en terrazzo, les planchers en
  // bois, les murs extérieurs en crépi clair, les fondations en pierre. En haut, le grenier.
  function coupe(ctx, r) {
    const M = MOMENTS.jour;
    ctx.fillStyle = M.murBas; ctx.fillRect(0, NIV.bas.plafond, LARGE, NIV.bas.plancher - NIV.bas.plafond);
    ctx.fillStyle = M.murD; ctx.fillRect(0, NIV.salon.plafond, LARGE, NIV.salon.plancher - NIV.salon.plafond);
    const eclats = ["#e04bb0", "#a8325b", "#ff5b4f", "#e04bb0", "#a8325b", "#ffd23a", "#3d5ee8"];
    for (const n of [NIV.salon, NIV.bas]) {
      const hh = n.plancher - n.plafond;
      ctx.fillStyle = M.murG; ctx.fillRect(0, n.plafond, CAGE, hh);
      // plus sombre vers le plafond et dans le coin de la cage
      const pl = ctx.createLinearGradient(0, n.plafond, 0, n.plafond + 60);
      pl.addColorStop(0, M.ombreMur); pl.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = pl; ctx.fillRect(0, n.plafond, LARGE, 60);
      const co = ctx.createLinearGradient(CAGE, 0, CAGE + 40, 0);
      co.addColorStop(0, M.ombreMur); co.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = co; ctx.fillRect(CAGE, n.plafond, 40, hh);
      ctx.beginPath(); ctx.moveTo(CAGE, n.plafond); ctx.lineTo(CAGE, n.plancher); ctx.stroke();
      // le sol en terrazzo magenta, avec ses éclats
      ctx.fillStyle = M.sol; ctx.fillRect(0, n.plancher, LARGE, 16);
      for (let i = 0; i < 110; i++) {
        const x = r() * LARGE, y = n.plancher + 3 + r() * 11, t = 1 + r() * 2.2;
        ctx.fillStyle = eclats[Math.floor(r() * eclats.length)];
        ctx.globalAlpha = 0.55 + r() * 0.35;
        ctx.beginPath(); ctx.ellipse(x, y, t, t * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = M.plinthe; ctx.fillRect(0, n.plancher - 4, LARGE, 4);
      ctx.beginPath(); ctx.moveTo(0, n.plancher); ctx.lineTo(LARGE, n.plancher); ctx.moveTo(0, n.plancher + 16); ctx.lineTo(LARGE, n.plancher + 16); ctx.stroke();
    }
    // le plancher entre le salon et le rez-de-chaussée
    ctx.fillStyle = "#7a4520"; ctx.fillRect(-10, NIV.salon.plancher + 16, LARGE + 20, NIV.bas.plafond - NIV.salon.plancher - 16);
    ctx.beginPath(); ctx.moveTo(-EP_MUR, NIV.bas.plafond); ctx.lineTo(LARGE + EP_MUR, NIV.bas.plafond); ctx.stroke();
    // le tapis du salon, devant le canapé
    ctx.beginPath(); ctx.ellipse(372, NIV.salon.sol + 1, 118, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "#3d5ee8"; ctx.fill(); ctx.stroke();
    ombresAuSol(ctx);

    // les vitres : on les découpe (le dehors se peint derrière), puis les cadres en bois naturel
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    cheminFenetre(ctx, BAIE); ctx.fill();
    cheminFenetre(ctx, FENETRE_BAS); ctx.fill();
    ctx.restore();
    const cadre = (F) => {
      ctx.lineWidth = 7; ctx.strokeStyle = "#c49a6c"; cheminFenetre(ctx, F); ctx.stroke();
      ctx.lineWidth = 2.2; ctx.strokeStyle = ENCRE;
      ctx.strokeRect(F.x - 4, F.y - 4, F.w + 8, F.h + 8);
      ctx.strokeRect(F.x + 3, F.y + 3, F.w - 6, F.h - 6);
    };
    const montant = (F, x) => {
      ctx.fillStyle = "#c49a6c"; ctx.fillRect(x - 3, F.y, 6, F.h);
      ctx.beginPath(); ctx.moveTo(x - 3, F.y + 3); ctx.lineTo(x - 3, F.y + F.h); ctx.moveTo(x + 3, F.y + 3); ctx.lineTo(x + 3, F.y + F.h); ctx.stroke();
    };
    cadre(BAIE);
    // (grande ouverte : les deux vantaux de droite ont glissé derrière celui de gauche)
    if (!fenetresOuvertes()) { montant(BAIE, BAIE.x + BAIE.w / 3); montant(BAIE, BAIE.x + (2 * BAIE.w) / 3); }
    else { montant(BAIE, BAIE.x + BAIE.w / 3); montant(BAIE, BAIE.x + BAIE.w / 3 + 8); montant(BAIE, BAIE.x + BAIE.w / 3 + 16); }
    cadre(FENETRE_BAS);
    montant(FENETRE_BAS, FENETRE_BAS.x + FENETRE_BAS.w / 2);
    bloc(ctx, FENETRE_BAS.x - 8, FENETRE_BAS.y + FENETRE_BAS.h + 3, FENETRE_BAS.w + 16, 5, 2, "#c49a6c");

    // au rez-de-chaussée, de chaque côté de la boule, deux photos dans des cadres en bois
    // naturel : ƟvƟ et Mesi en salopette qui se tiennent la main au bord de la mer, et Lóló et
    // Mémé qui sourient. Dessinées case par case, chaque case tombant pile sur un gros pixel.
    photoEncadree(ctx, 270, 318, PHOTO_DUO);
    photoEncadree(ctx, 408, 312, PHOTO_LOLO);

    // en haut, le grenier
    grenier(ctx);
    // les murs extérieurs, coupés : du crépi clair, du toit jusqu'aux fondations
    ctx.fillStyle = "#e9e3cd";
    for (const [x0, x1] of [[-EP_MUR, 0], [LARGE, LARGE + EP_MUR]]) {
      ctx.beginPath(); ctx.moveTo(x0, toitY(x0) + EP_TOIT); ctx.lineTo(x1, toitY(x1) + EP_TOIT); ctx.lineTo(x1, SOL_DEHORS); ctx.lineTo(x0, SOL_DEHORS); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }
    // la porte d'entrée, dans le mur de gauche : on la voit coupée, dans l'épaisseur du mur (le
    // linteau au-dessus, la vitre par la tranche, la poignée dehors). C'est par là qu'on sort sur
    // le petit porche, et qu'on part en balade.
    ctx.fillStyle = "#b9834f"; ctx.fillRect(PORTE.x, PORTE.y, PORTE.w, PORTE.h); ctx.strokeRect(PORTE.x, PORTE.y, PORTE.w, PORTE.h);
    ctx.fillStyle = "#a8d8ec"; ctx.fillRect(PORTE.x + PORTE.w / 2 - 2, PORTE.y + 12, 4, 44);
    ctx.fillStyle = "#7a4520"; ctx.fillRect(PORTE.x - 3, PORTE.y - 7, PORTE.w + 6, 7); ctx.strokeRect(PORTE.x - 3, PORTE.y - 7, PORTE.w + 6, 7);
    ctx.beginPath(); ctx.arc(PORTE.x - 2, PORTE.y + 92, 2.8, 0, Math.PI * 2); ctx.fillStyle = "#ffd23a"; ctx.fill(); ctx.stroke();
    // la chatière de Mémé, en bas de la porte : son cadre sombre et son rabat
    ctx.fillStyle = "#4b3427"; ctx.fillRect(PORTE.x - 1, PORTE.y + PORTE.h - 32, PORTE.w + 2, 26); ctx.strokeRect(PORTE.x - 1, PORTE.y + PORTE.h - 32, PORTE.w + 2, 26);
    ctx.fillStyle = "#c99a3a"; ctx.fillRect(PORTE.x + 2, PORTE.y + PORTE.h - 29, PORTE.w - 4, 20);
    // les fondations, en pierre
    ctx.fillStyle = "#8a98cc"; ctx.fillRect(-EP_MUR - 4, SOL_DEHORS, LARGE + 2 * EP_MUR + 8, 14); ctx.strokeRect(-EP_MUR - 4, SOL_DEHORS, LARGE + 2 * EP_MUR + 8, 14);
    // les trémies de l'escalier, dans les planchers
    const { x: ex, r: er } = ESCALIER, tx = ex - er - 6, tw = er * 2 + 12;
    ctx.fillStyle = "#1b1d4a";
    for (const [y0, hh] of [[NIV.grenier.plancher, 28], [NIV.salon.plancher, NIV.bas.plafond - NIV.salon.plancher]]) { ctx.fillRect(tx, y0, tw, hh); ctx.strokeRect(tx, y0, tw, hh); }
  }

  // Le grenier, sous le toit à deux pentes (vu en coupe) : le mur du fond bleu, l'ombre sous les
  // pentes, les tuiles terracotta et les planches du toit, le velux, le plancher en bois.
  function grenier(ctx) {
    const pente = (d) => { ctx.lineTo(-EGOUT.dx, toitY(-EGOUT.dx) + d); ctx.lineTo(FAITE.x, FAITE.y + d); ctx.lineTo(LARGE + EGOUT.dx, toitY(LARGE + EGOUT.dx) + d); };
    const bande = (d0, d1) => {
      ctx.beginPath();
      ctx.moveTo(-EGOUT.dx, toitY(-EGOUT.dx) + d0); pente(d0);
      ctx.lineTo(LARGE + EGOUT.dx, toitY(LARGE + EGOUT.dx) + d1); ctx.lineTo(FAITE.x, FAITE.y + d1); ctx.lineTo(-EGOUT.dx, toitY(-EGOUT.dx) + d1); ctx.closePath();
    };
    // le mur du fond
    ctx.save();
    ctx.beginPath(); ctx.moveTo(0, NIV.grenier.plancher); ctx.lineTo(0, toitY(0)); ctx.lineTo(FAITE.x, FAITE.y); ctx.lineTo(LARGE, toitY(LARGE)); ctx.lineTo(LARGE, NIV.grenier.plancher); ctx.closePath(); ctx.clip();
    ctx.fillStyle = MOMENTS.jour.murG; ctx.fillRect(0, BOITE.y, LARGE, NIV.grenier.plancher - BOITE.y);
    // le dessous du toit (le rampant), vu en fuite au-dessus du lit : un lambris, des chevrons
    // parallèles aux côtés du velux et une panne en bas qui suit la pente. C'est lui qui explique
    // qu'on voie le velux de biais : il est posé entre deux chevrons, dans ce plafond penché.
    const RAMP = 64;
    bande(EP_TOIT - 2, RAMP); ctx.fillStyle = "#a8774c"; ctx.fill();
    ctx.strokeStyle = "#8a5c38"; ctx.lineWidth = 1;
    for (let d = EP_TOIT + 8; d < RAMP; d += 9) { ctx.beginPath(); ctx.moveTo(-EGOUT.dx, toitY(-EGOUT.dx) + d); pente(d); ctx.stroke(); }
    const xs = [];
    for (let x = 10; x < LARGE; x += 44) if (x < VELUX.x0 - 22 || x > VELUX.x1 + 22) xs.push(x);
    xs.push(VELUX.x0 - 13, VELUX.x1 + 13);
    for (const x of xs) {
      if (Math.abs(x - FAITE.x) < 6) continue;
      const y0 = (u) => toitY(u) + EP_TOIT - 2, y1 = (u) => toitY(u) + RAMP + 2;
      ctx.beginPath(); ctx.moveTo(x - 4, y0(x - 4)); ctx.lineTo(x + 4, y0(x + 4)); ctx.lineTo(x + 4, y1(x + 4)); ctx.lineTo(x - 4, y1(x - 4)); ctx.closePath();
      ctx.fillStyle = "#7a4f32"; ctx.fill(); ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.4; ctx.stroke();
      ctx.strokeStyle = "#c49a6c"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 2, y0(x - 2) + 2); ctx.lineTo(x - 2, y1(x - 2) - 2); ctx.stroke();
    }
    bande(RAMP, RAMP + 8); ctx.fillStyle = "#7a4f32"; ctx.fill(); ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.strokeStyle = "#c49a6c"; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-EGOUT.dx, toitY(-EGOUT.dx) + RAMP + 2); pente(RAMP + 2); ctx.stroke();
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    // l'ombre sous les pentes, de plus en plus douce
    for (let i = 0; i < 4; i++) { ctx.fillStyle = "rgba(15,13,58,0.13)"; bande(EP_TOIT - 2, EP_TOIT + 12 + i * 10); ctx.fill(); }
    ctx.restore();
    // le velux : on le découpe (on y voit le vrai ciel, peint avec le dehors), puis son cadre
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath(); cheminVelux(ctx); ctx.fillStyle = "#000"; ctx.fill();
    ctx.restore();
    const { x0, x1, prof } = VELUX;
    // (tous les bords suivent la pente du toit : le cadre et la fenêtre restent parallèles)
    ctx.beginPath(); ctx.moveTo(x0 - 4, veluxY(x0 - 4) + prof + 3); ctx.lineTo(x1 + 4, veluxY(x1 + 4) + prof + 3); ctx.lineTo(x1 + 8, veluxY(x1 + 8) + prof + 11); ctx.lineTo(x0 - 8, veluxY(x0 - 8) + prof + 11); ctx.closePath();
    ctx.fillStyle = "#c49a6c"; ctx.fill(); ctx.stroke();
    ctx.lineWidth = 7; ctx.strokeStyle = "#c49a6c"; ctx.beginPath(); cheminVelux(ctx); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = ENCRE;
    for (const d of [-4, 3]) {
      ctx.beginPath();
      ctx.moveTo(x0 - d, veluxY(x0 - d) - d); ctx.lineTo(x1 + d, veluxY(x1 + d) - d); ctx.lineTo(x1 + d, veluxY(x1 + d) + prof + d); ctx.lineTo(x0 - d, veluxY(x0 - d) + prof + d); ctx.closePath();
      ctx.stroke();
    }
    const xm = (x0 + x1) / 2;
    bloc(ctx, xm - 9, veluxY(xm) + 1, 18, 4, 2, "#c9ccd6");
    // les planches du toit, puis les tuiles par-dessus
    bande(-1, EP_TOIT); ctx.fillStyle = "#c49a6c"; ctx.fill(); ctx.stroke();
    bande(-8, 0); ctx.fillStyle = "#c96a3a"; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = "#8a4224"; ctx.lineWidth = 1.4;
    for (let x = -EGOUT.dx + 4; x < LARGE + EGOUT.dx; x += 11) { ctx.beginPath(); ctx.moveTo(x, toitY(x) - 7); ctx.lineTo(x, toitY(x) - 1); ctx.stroke(); }
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    // le plancher du grenier, puis sa poutre (le plafond du salon)
    ctx.fillStyle = "#b9834f"; ctx.fillRect(0, NIV.grenier.plancher, LARGE, 16);
    ctx.strokeStyle = "#9a6a3c"; ctx.lineWidth = 1.2;
    for (let x = 20; x < LARGE; x += 46) { ctx.beginPath(); ctx.moveTo(x, NIV.grenier.plancher + 1); ctx.lineTo(x - 5, NIV.grenier.plancher + 15); ctx.stroke(); }
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    ctx.fillStyle = "#7a4520"; ctx.fillRect(-EP_MUR, 0, LARGE + 2 * EP_MUR, NIV.salon.plafond);
    ctx.beginPath(); ctx.moveTo(0, NIV.grenier.plancher); ctx.lineTo(LARGE, NIV.grenier.plancher); ctx.moveTo(-EP_MUR, 0); ctx.lineTo(LARGE + EP_MUR, 0); ctx.moveTo(-EP_MUR, NIV.salon.plafond); ctx.lineTo(LARGE + EP_MUR, NIV.salon.plafond); ctx.stroke();
  }

  // L'escalier en colimaçon, d'un étage à l'autre : un mât de bois, des marches qui tournent
  // autour (celles de derrière plus sombres, cachées en partie par le mât), et la rampe qui
  // s'enroule en suivant le bord des marches.
  const ESCALIER = { x: 42, r: 34 };
  function escalier(ctx, bas, haut) {
    const { x: cx, r: R } = ESCALIER, n = 14, pas = (bas - haut) / n;
    const marches = Array.from({ length: n }, (_, i) => ({ y: bas - (i + 1) * pas, a: 0.5 + i * 0.68 }));
    const marche = (m) => {
      const x1 = cx + R * Math.sin(m.a), devant = Math.cos(m.a) > 0;
      const g = Math.min(cx, x1) - 2, l = Math.abs(x1 - cx) + 4;
      if (l > 6) bloc(ctx, g, m.y - 3, l, 6, 2.5, devant ? "#c49a6c" : "#9a6a3c");
    };
    const rampe = (devant) => {
      ctx.strokeStyle = "#7a4520";
      for (let i = 0; i < n; i++) {
        const m = marches[i], s = marches[i + 1] || { y: m.y - pas, a: m.a + 0.68 };
        if ((Math.cos((m.a + s.a) / 2) > 0) !== devant) continue;
        ctx.lineWidth = 3.4;
        ctx.beginPath(); ctx.moveTo(cx + (R + 1) * Math.sin(m.a), m.y - 30); ctx.lineTo(cx + (R + 1) * Math.sin(s.a), s.y - 30); ctx.stroke();
        // les barreaux, du bord de la marche à la rampe
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(cx + R * Math.sin(m.a), m.y - 2); ctx.lineTo(cx + (R + 1) * Math.sin(m.a), m.y - 30); ctx.stroke();
      }
      ctx.lineWidth = 2.2; ctx.strokeStyle = ENCRE;
    };
    rampe(false);
    for (const m of marches) if (Math.cos(m.a) <= 0) marche(m);
    bloc(ctx, cx - 4, haut - 34, 8, bas - haut + 34, 3, "#b9834f");
    for (const m of marches) if (Math.cos(m.a) > 0) marche(m);
    rampe(true);
  }

  // Les enceintes, en noyer, de chaque côté de la baie : un tweeter et deux haut-parleurs. Quand
  // la musique joue, les membranes battent (voir membranes).
  const ENCEINTES = [176, 522], HP = [[163, 4.5], [186, 9], [212, 9]];
  function enceinte(ctx, x) {
    bloc(ctx, x + 3, 226, 4, 6, 1, ENCRE);
    bloc(ctx, x + 19, 226, 4, 6, 1, ENCRE);
    bloc(ctx, x, 150, 26, 78, 4, "#7a4520");
    for (const [cy, rr] of HP) {
      ctx.beginPath(); ctx.arc(x + 13, cy, rr, 0, Math.PI * 2); ctx.fillStyle = "#2c2a3e"; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 13, cy, rr * 0.4, 0, Math.PI * 2); ctx.fillStyle = "#8a98cc"; ctx.fill();
    }
  }
  function membranes(ctx, t) {
    ctx.save();
    ctx.lineWidth = 1.4;
    for (const x of ENCEINTES) for (const [cy, rr] of HP.slice(1)) {
      const u = (t / 420 + x / 97 + cy / 31) % 1;
      ctx.strokeStyle = "rgba(243,240,220," + (0.55 * (1 - u)).toFixed(2) + ")";
      ctx.beginPath(); ctx.arc(x + 13, cy + ENC_DY, rr * (0.45 + 0.5 * u), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // la petite lampe posée sur l'enceinte de gauche (son abat-jour s'allume le soir)
  const LAMPE = { x: 189, y: 121 };
  function lampeEnceinte(ctx, couleur, pied) {
    const x = LAMPE.x;
    if (pied) {
      bloc(ctx, x - 7, 142, 14, 8, 3, "#e9b44c");
      ctx.beginPath(); ctx.moveTo(x, 142); ctx.lineTo(x, 128); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(x - 9, 110); ctx.lineTo(x + 9, 110); ctx.lineTo(x + 16, 130); ctx.lineTo(x - 16, 130); ctx.closePath();
    ctx.fillStyle = couleur; ctx.fill(); ctx.stroke();
  }

  // Le grand canapé corail en L, devant la baie : le dossier tout du long, l'assise, l'accoudoir de
  // droite, et à gauche la méridienne qui avance vers nous, où Lóló et Mémé dorment (un plaid bleu
  // plié sur l'accoudoir). ƟvƟ et Mesi s'y affalent pour écouter de la musique.
  function canapeL(ctx) {
    bloc(ctx, 200, 150, 268, 58, 18, "#ff5b4f");
    bloc(ctx, 334, 160, 40, 34, 12, "#ffd23a");
    bloc(ctx, 412, 162, 38, 32, 12, "#f2f0e8");
    bloc(ctx, 300, 196, 168, 38, 13, "#ff7a6b");
    bloc(ctx, 454, 176, 26, 64, 11, "#ff5b4f");
    bloc(ctx, 462, 238, 8, 9, 3, ENCRE);
    // la méridienne
    bloc(ctx, 188, 172, 24, 82, 11, "#ff5b4f");
    bloc(ctx, 196, 200, 130, 30, 13, "#ff7a6b");
    bloc(ctx, 196, 224, 130, 30, 11, "#ff5b4f");
    // le plaid plié, posé sur l'accoudoir, qui retombe un peu
    bloc(ctx, 186, 168, 30, 14, 6, "#3d5ee8");
    bloc(ctx, 204, 176, 12, 40, 5, "#3d5ee8");
    ctx.strokeStyle = "#7f97f2"; ctx.lineWidth = 2;
    for (const y of [190, 202]) { ctx.beginPath(); ctx.moveTo(206, y); ctx.lineTo(214, y); ctx.stroke(); }
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    bloc(ctx, 200, 252, 8, 8, 3, ENCRE);
    bloc(ctx, 314, 252, 8, 8, 3, ENCRE);
  }

  // Le lit du grenier : le même lit qu'avant, tourné (la tête à droite, juste sous le velux), posé
  // sur le plancher, et sa table de chevet avec la lampe. (Dessiné dans ses mesures d'avant ;
  // versLeLit le retourne et le monte au grenier.)
  const LIT = { x: 404, y: -250 };
  const CHEVET = { x: 409, y: -98 };
  function versLeLit(ctx) { ctx.translate(LIT.x, LIT.y); ctx.scale(-1, 1); }
  function litGrenier(cm) {
    cm.save();
    versLeLit(cm);
    bloc(cm, 22, 150, 16, 94, 7, "#e9b44c");
    bloc(cm, 34, 202, 198, 32, 11, "#f2f0e8");
    bloc(cm, 74, 196, 160, 40, 13, "#3d5ee8");
    bloc(cm, 74, 196, 30, 40, 12, "#7f97f2");
    bloc(cm, 40, 182, 42, 23, 11, "#ffffff");
    bloc(cm, 64, 187, 40, 21, 10, "#ffb3a8");
    bloc(cm, 42, 234, 8, 12, 3, "#e9b44c");
    bloc(cm, 218, 234, 8, 12, 3, "#e9b44c");
    // la table de chevet et sa lampe, côté tête
    cm.translate(-264, 0);
    bloc(cm, 240, 196, 38, 52, 7, "#e9b44c");
    cm.beginPath(); cm.moveTo(244, 220); cm.lineTo(274, 220); cm.stroke();
    cm.beginPath(); cm.arc(259, 210, 2.2, 0, Math.PI * 2); cm.fillStyle = ENCRE; cm.fill();
    bloc(cm, 251, 188, 16, 9, 4, ENCRE, true);
    cm.beginPath(); cm.moveTo(259, 188); cm.lineTo(259, 162); cm.stroke();
    abatJour(cm, "#e9e3cd");
    cm.restore();
  }
  // une étagère basse sous la pente de droite, avec les livres
  function etagere(ctx, r) {
    bloc(ctx, 444, -58, 92, 54, 4, "#b9834f");
    ctx.beginPath(); ctx.moveTo(448, -31); ctx.lineTo(532, -31); ctx.stroke();
    const LIVRES = ["#ff5b4f", "#3d5ee8", "#ffd23a", "#2f6b35", "#e04bb0", "#f3f0dc", "#c96a3a", "#7f97f2"];
    for (const [y0, y1] of [[-55, -31], [-29, -7]]) {
      let x = 450;
      while (x < 524) {
        const l = 6 + Math.floor(r() * 5), hh = (y1 - y0) * (0.7 + r() * 0.28);
        if (x + l > 530) break;
        bloc(ctx, x, y1 - hh, l, hh, 1, LIVRES[Math.floor(r() * LIVRES.length)]);
        x += l + (r() < 0.15 ? 6 : 1);
      }
    }
  }

  // l'abat-jour de la lampe de chevet
  function abatJour(ctx, couleur) {
    ctx.beginPath();
    ctx.moveTo(247, 141); ctx.lineTo(271, 141); ctx.quadraticCurveTo(275, 141, 277, 147);
    ctx.lineTo(280, 160); ctx.quadraticCurveTo(281, 164, 277, 164);
    ctx.lineTo(241, 164); ctx.quadraticCurveTo(237, 164, 238, 160);
    ctx.lineTo(241, 147); ctx.quadraticCurveTo(243, 141, 247, 141);
    ctx.fillStyle = couleur; ctx.fill(); ctx.stroke();
  }

  // la plante (son milieu, dans les mesures d'avant le décalage)
  const PLANTE = 672;
  // la porte d'entrée : bois clair, une petite vitre en haut, deux panneaux moulurés, la poignée
  const PORTE = { x: -EP_MUR, y: 342, w: EP_MUR, h: 160 };
  function porteEntree(ctx) {
    const { x, y, w, h } = PORTE;
    bloc(ctx, x - 6, y - 7, w + 12, h + 7, 2, "#7a4520");
    bloc(ctx, x, y, w, h, 2, "#b9834f");
    bloc(ctx, x + 8, y + 10, w - 16, 40, 2, "#a8d8ec");
    ctx.beginPath(); ctx.moveTo(x + w / 2, y + 10); ctx.lineTo(x + w / 2, y + 50); ctx.stroke();
    bloc(ctx, x + 8, y + 60, w - 16, 42, 2, "#c99a3a");
    bloc(ctx, x + 8, y + 110, w - 16, 40, 2, "#c99a3a");
    ctx.beginPath(); ctx.arc(x + w - 9, y + 92, 3.2, 0, Math.PI * 2); ctx.fillStyle = "#ffd23a"; ctx.fill(); ctx.stroke();
    bloc(ctx, x - 8, y + h - 2, w + 16, 4, 1, "#9a6a3c");
  }
  // Les rideaux terracotta, de chaque côté de la baie, tenus par une tringle de bois, jusqu'au sol,
  // contre le mur (derrière le canapé et la table de chevet). Quand les fenêtres sont grandes
  // ouvertes, ils ondulent doucement dans le courant d'air.
  // (dans les mesures d'avant le décalage : on les peint avec les personnages, qui reçoivent la lumière)
  // les rideaux de l'image, éclairés comme la pièce (on les peint entre les murs et les meubles)
  function rideauxEclaires(decor, t) {
    const c = tampon("rideaux", decor.width, decor.height), g = c.getContext("2d");
    repere(g, decor.k); g.translate(DX, 0);
    rideaux(g, t, fenetresOuvertes());
    const vraies = tampon("rideauxVrais", decor.width, decor.height);
    vraies.getContext("2d").drawImage(c, 0, 0);
    eclairerCouche(c, vraies, decor.carte, decor.eclats);
    return c;
  }
  function rideaux(ctx, t, ouvert) {
    const x0 = BAIE.x - DX, x1 = x0 + BAIE.w, haut = BAIE.y - 10, bas = BAIE.y + BAIE.h + 6;
    ctx.save();
    ctx.fillStyle = "#7a4520"; ctx.fillRect(x0 - 38, haut - 4, BAIE.w + 76, 4);
    ctx.fillStyle = ENCRE; ctx.fillRect(x0 - 40, haut - 5, 3, 6); ctx.fillRect(x1 + 37, haut - 5, 3, 6);
    const TONS = ["#c96a3a", "#a9512c", "#d97a48", "#b85e33"];
    for (const [cote, xa] of [[-1, x0 - 34], [1, x1 - 8]]) {
      const plis = 6, l = 42, lp = l / plis;
      for (let i = 0; i < plis; i++) {
        for (let y = haut; y < bas; y += 2) {
          const u = (y - haut) / (bas - haut);
          // le courant d'air pousse le bas du rideau vers la pièce, en vagues
          const vent = ouvert ? (Math.sin(t / 900 + cote + i * 0.35) * 6 + Math.sin(t / 340 + i + cote * 2) * 2) * u * u : 0;
          const pli = Math.sin(u * 4 + i * 1.3 + (ouvert ? t / 600 : 0)) * (ouvert ? 1.2 : 0.4);
          const x = xa + i * lp + vent + pli;
          ctx.fillStyle = y > bas - 6 ? "#8a4224" : TONS[i % 4];
          ctx.fillRect(Math.round(x), y, Math.ceil(lp) + 1, 2);
          if (i === 0 || i === plis - 1) { ctx.fillStyle = ENCRE; ctx.fillRect(Math.round(x + (i === 0 ? 0 : lp)), y, 1, 2); }
        }
      }
      // les anneaux sur la tringle
      for (let i = 0; i <= plis; i++) { ctx.fillStyle = "#e9b44c"; ctx.fillRect(Math.round(xa + i * lp) - 1, haut - 5, 3, 3); }
    }
    ctx.restore();
  }
  // les deux chaises bleues de la table
  function chaises(ctx) {
    bloc(ctx, 438, 196, 7, 54, 3, "#3d5ee8");
    bloc(ctx, 436, 246, 38, 8, 3, "#3d5ee8");
    bloc(ctx, 438, 254, 6, 40, 2, "#3d5ee8");
    bloc(ctx, 466, 254, 6, 40, 2, "#3d5ee8");
    bloc(ctx, 626, 196, 7, 54, 3, "#3d5ee8");
    bloc(ctx, 596, 246, 38, 8, 3, "#3d5ee8");
    bloc(ctx, 598, 254, 6, 40, 2, "#3d5ee8");
    bloc(ctx, 626, 254, 6, 40, 2, "#3d5ee8");
  }

  // Le poêle à bois, tout à gauche, posé sur le sol : un corps de fonte noire sur quatre pieds, une
  // grande vitre (le feu derrière, voir feuDuPoele) et une poignée. Son conduit monte tout droit
  // jusqu'au plafond : de l'inox argenté, poli comme un miroir, qui reflète la pièce en bandes
  // étirées (le plafond sombre en haut, le mur bleu, le sol magenta en bas, la fenêtre en un
  // trait clair). À côté, les bûches qu'on a rapportées de dehors.
  const POELE = { x: 90, y: 420, w: 66, h: 80, vitre: { x: 104, y: 440, w: 34, h: 34 } };
  function poeleABois(ctx, moment, eteint) {
    const M = MOMENTS[moment], { x, y, w, h, vitre } = POELE, cx = x + w / 2;
    // (on ne voit pas le conduit traverser la maison : seulement une petite cheminée sur le toit)
    {
      const cl = cx - 11, cw = 22, bas = toitY(cx + cw / 2) + 2, sommet = toitY(cx) - 30;
      bloc(ctx, cl, sommet, cw, bas - sommet, 2, "#c96a3a");
      ctx.strokeStyle = "#8a4224"; ctx.lineWidth = 1.2;
      for (let yy = sommet + 7; yy < bas - 2; yy += 7) { ctx.beginPath(); ctx.moveTo(cl + 1, yy); ctx.lineTo(cl + cw - 1, yy); ctx.stroke(); }
      for (let yy = sommet, r = 0; yy < bas - 2; yy += 7, r++) { const xx = cl + (r % 2 ? 7 : 14); ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx, Math.min(bas, yy + 7)); ctx.stroke(); }
      ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
      bloc(ctx, cl - 4, sommet - 6, cw + 8, 7, 2, "#7a4520");
    }
    // la buse, puis le corps du poêle
    bloc(ctx, cx - 12, y - 6, 24, 8, 2, "#2c2a3e");
    bloc(ctx, x - 4, y, w + 8, 9, 3, "#3a3550");
    bloc(ctx, x, y + 8, w, h - 8, 5, "#2c2a3e");
    bloc(ctx, x + 8, y + h, 6, 10, 2, "#2c2a3e");
    bloc(ctx, x + w - 14, y + h, 6, 10, 2, "#2c2a3e");
    // la vitre (sombre quand le feu est éteint) et sa poignée
    bloc(ctx, vitre.x - 4, vitre.y - 4, vitre.w + 8, vitre.h + 8, 4, "#4a4560");
    ctx.fillStyle = eteint || !cheminee.feuActif() ? "#1b1d4a" : "#2a1410";
    ctx.fillRect(vitre.x, vitre.y, vitre.w, vitre.h);
    ctx.strokeRect(vitre.x, vitre.y, vitre.w, vitre.h);
    bloc(ctx, x + w - 12, vitre.y + 10, 5, 14, 2, "#c9ccd6");
    // le cendrier sous la vitre
    ctx.beginPath(); ctx.moveTo(x + 8, y + h - 12); ctx.lineTo(x + w - 8, y + h - 12); ctx.stroke();
    // les bûches rapportées de dehors, en petit tas à côté
    const n = cheminee.bois();
    for (let k = 0; k < n; k++) {
      const rang = k < 3 ? 0 : k < 5 ? 1 : 2, i = k < 3 ? k : k < 5 ? k - 3 : 0;
      const bx = x + w + 8 + i * 8 + rang * 4, by = y + h + 6 - rang * 7;
      bloc(ctx, bx - 4, by - 3, 9, 7, 3.5, "#7a4520");
      ctx.beginPath(); ctx.arc(bx, by + 0.5, 1.6, 0, Math.PI * 2); ctx.fillStyle = "#e9c99a"; ctx.fill();
    }
  }

  // --- les photos du mur ---
  const PAL_PHOTO = {
    C: "#6fb6ee", B: "#a8d8ec", S: "#12aec4", W: "#f3f0dc", Y: "#efe8d4", y: "#ddd2ba", G: "#6cbd5c", g: "#3f8a42",
    h: "#3b2416", c: "#8a4b22", s: "#f2c29b", a: "#8a98cc", q: "#ee9a7e", m: "#b8404e", r: "#e03a3a", e: "#3aa04a", b: "#3a5fd0", n: "#7a4520",
    k: "#5a3418", M: "#3e2210", L: "#c08850", w: "#f3f0dc", E: "#1b1d4a", N: "#3e2210", z: "#3a2216",
    j: "#2a439a", o: "#2a2246", t: "#d8bf98", T: "#6b5442", u: "#f3ead8", p: "#f4a3b8",
  };
  // une grille de cases : chaque ligne a son fond, puis les personnages posés par-dessus
  function grillePhoto(fonds, poses, largeur) {
    return fonds.map((f, y) => {
      const l = (typeof f === "function" ? Array.from({ length: largeur }, (_, x) => f(x)) : Array(largeur).fill(f));
      for (const [gx, gy, motif] of poses) {
        const ligne = motif[y - gy];
        if (ligne) [...ligne].forEach((ch, i) => { if (ch !== ".") l[gx + i] = ch; });
      }
      return l.join("");
    });
  }
  // ƟvƟ (boucles brunes, lunettes argentées, chemise rouge) et Mesi (cheveux courts, lunettes pêche,
  // chemise verte), en salopette, avec un petit sourire ; leurs mains se rejoignent au milieu
  const OVO_PHOTO = [".hhh.", "hhhhh", "hasah", "hsssh", ".sms.", "rbrbr", "rbbbr", "sbjbs", ".bbb.", ".b.b.", ".n.n."];
  const MESI_PHOTO = [".ccc.", "ccccc", "cqsqc", ".sss.", ".sms.", "ebebe", "ebbbe", "sbjbs", ".bbb.", ".b.b.", ".n.n."];
  const PHOTO_DUO = grillePhoto(
    ["C", "C", "C", "C", "B", "B", "B", "B", "S", "S", (x) => (x % 2 ? "W" : "S"), "Y", (x) => (x % 5 === 2 ? "y" : "Y"), "Y", (x) => (x % 7 === 4 ? "y" : "Y"), "Y"],
    [[6, 4, OVO_PHOTO], [13, 4, MESI_PHOTO], [10, 11, ["ssss"]]],
    24
  );
  // Lóló de profil (tête et encolure, l'étoile, le sourire) et Mémé de face, les yeux fermés, qui sourit
  const LOLO_PHOTO = ["...........", "...kk......", "..kMLk.....", ".kMLLLk....", ".kMLwLLk...", "kMLLLELLk..", "kMLLLLLLLk.", "kMLLLLLLLLk", "kMLLLLLLNLk", ".kMLLLzzLLk", ".kMLLLLLzk.", "..kMLLLLk..", "..kMLLLLk..", "..kMLLLLLk.", "..kMLLLLLk.", "..kMLLLLLk."];
  const MEME_PHOTO = ["........", "........", "........", "........", "........", ".o....o.", "oTo..oTo", "otttttto", "oTttttTo", "otottoto", "ouuppuuo", "ououuouo", ".ouuuuo.", "otttttto", "oTttttTo", "otttttto"];
  const PHOTO_LOLO = grillePhoto(
    ["C", "C", "C", "B", "B", "B", "B", "B", "B", "B", "B", "G", (x) => (x % 4 === 1 ? "g" : "G"), "G", (x) => (x % 3 === 0 ? "g" : "G"), "G"],
    [[0, 0, LOLO_PHOTO], [12, 0, MEME_PHOTO]],
    20
  );
  function photoEncadree(ctx, x0, y0, grille) {
    // la taille d'une case : un gros pixel (chaque case tombe pile sur un gros pixel de l'écran)
    const m = ctx.getTransform(), cell = caseDessin().cell, ox = m.e / pixK, oy = m.f / pixK, larg = grille[0].length, haut = grille.length;
    const bord = cell * 2, x = Math.round((x0 + ox) / cell) * cell - ox, y = Math.round((y0 + oy) / cell) * cell - oy, W2 = larg * cell + bord * 2, H2 = haut * cell + bord * 2;
    ctx.fillStyle = "#c9a878"; ctx.fillRect(x, y, W2, H2);
    ctx.fillStyle = "#e0c49a"; ctx.fillRect(x, y, W2, cell);
    ctx.fillStyle = "#9a6a3c"; ctx.fillRect(x, y + H2 - cell, W2, cell); ctx.fillRect(x + W2 - cell, y, cell, H2);
    grille.forEach((l, j) => [...l].forEach((ch, i) => { ctx.fillStyle = PAL_PHOTO[ch] || "#a8d8ec"; ctx.fillRect(x + bord + i * cell, y + bord + j * cell, cell + 0.05, cell + 0.05); }));
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    ctx.strokeRect(x, y, W2, H2);
  }

  // Le plafonnier : une boule orange qui pend du plafond au bout d'un fil couleur cuivre,
  // au-dessus de la table du goûter (sa lumière sur la table et les visages : voir eclairer).
  const BOULE = { x: 535 + TABLE_T.x, y: 116 + TABLE_T.y, r: 15 };
  function plafonnier(ctx, moment, eteint) {
    const { x, y, r } = BOULE;
    // le fil de cuivre, et la petite cloche qui le tient au plafond
    ctx.strokeStyle = "#c87533"; ctx.lineWidth = 3;
    const plafond = NIV.bas.plafond;
    ctx.beginPath(); ctx.moveTo(x, plafond); ctx.lineTo(x, y - r - 3); ctx.stroke();
    ctx.fillStyle = "#c87533"; ctx.fillRect(x - 7, plafond, 14, 4);
    ctx.fillRect(x - 3, y - r - 5, 6, 5);
    // la boule : orange vif, plus claire là où l'ampoule brille, plus sombre en dessous
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = eteint ? "#9a4a20" : "#ff8f2e"; ctx.fill();
    if (eteint) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); return; }
    ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = "#d9601a"; ctx.beginPath(); ctx.arc(x, y + r * 0.9, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ffc46b"; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#fff0b0"; ctx.beginPath(); ctx.arc(x - r * 0.38, y - r * 0.4, r * 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
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
  function assis(ctx, nom, dos, sens, t, phase, retourne, hauteurSiege) {
    const k = 4.4, siege = hauteurSiege || 246, genou = 30;
    const mois = new Date().getMonth(), ete = nom === "ovo" && mois >= 4 && mois <= 8;
    const s = H.pixel.detail(H.pixel.sprite(nom + "Profil", 4)), f = s.f || 1;
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
    ctx.drawImage(s, 0, 12 * f, 16 * f, 6 * f, -3 * k, haut + 12 * k, 16 * k, 6 * k);
    // la tête, retournée vers Lóló quand il raconte
    if (retourne) {
      ctx.save();
      ctx.translate(5 * k, 0);
      ctx.scale(-1, 1);
      ctx.translate(-5 * k, 0);
    }
    ctx.drawImage(s, 0, 0, 16 * f, 12 * f, -3 * k, haut, 16 * k, 12 * k);
    if (retourne) ctx.restore();
    ctx.restore();
  }

  // La chanson d'ƟvƟ et Mesi : Mesi commence, puis toutes les deux chantent « Na-na-nana ! » à
  // l'unisson, sur do-do-la-sol,
  // et des notes s'envolent au-dessus de la table.
  let chantJusqua = 0, canapeJusqua = 0;
  // après le goûter, ƟvƟ et Mesi vont s'asseoir sur le canapé pour écouter de la musique
  function allerSurLeCanape() {
    partir("canape", () => {
      canapeJusqua = performance.now() + 150000;
      chantJusqua = canapeJusqua;
      if (H.local.musique && H.musique) H.musique.jouer();
    });
  }

  // --- monter et descendre l'escalier -----------------------------------------------------------
  // ƟvƟ et Mesi vont d'une place à l'autre à pied : sur leur étage jusqu'au pied de l'escalier, le
  // colimaçon (un étage après l'autre, en tournant autour du mât), puis jusqu'à leur nouvelle
  // place. Mesi suit ƟvƟ de près.
  const PLACES = {
    table: { niv: "bas", ovo: 300, luigi: 440 },
    // (Lóló et Mémé dorment sur le canapé ; ils en descendent pour la balade, ou pour sortir)
    canape: { niv: "salon", ovo: 382, luigi: 480, lolo: 300, meme: 288 },
    lit: { niv: "grenier", ovo: 300, luigi: 340 },
    porte: { niv: "bas", ovo: 40, luigi: 82, lolo: 136, meme: 186 },
    chatiere: { niv: "bas", meme: -6 },
  };
  // les dessins de chacun·e quand il ou elle marche (Mémé sur le dos de Lóló s'ils viennent tous les deux)
  const ALLURE = {
    ovo: () => ({ nom: "ovoProfil", e: 4.4, images: 4, arret: 4 }),
    luigi: () => ({ nom: "luigiProfil", e: 4.4, images: 4, arret: 4 }),
    lolo: (avecMeme) => ({ nom: avecMeme ? "loloBalade" : "loloSeule", e: 3.5, images: 4, arret: 0 }),
    // (Mémé fait la moitié de la taille de Lóló)
    meme: () => ({ nom: "memePas", e: 4.5, images: 2, arret: 0 }),
  };
  const ETAGES = ["bas", "salon", "grenier"], VITESSE = 0.11, DUREE_ETAGE = 2600;
  let place = "table", trajet = null, placeDepuis = 0;
  function segments(qui, de, vers) {
    const a = PLACES[de], b = PLACES[vers], pied = ESCALIER.x + ESCALIER.r + 18, segs = [];
    const marche = (niv, x0, x1) => { if (Math.abs(x1 - x0) > 1) segs.push({ type: "marche", y: NIV[niv].sol, x0, x1, d: Math.abs(x1 - x0) / VITESSE }); };
    const ia = ETAGES.indexOf(a.niv), ib = ETAGES.indexOf(b.niv);
    if (ia === ib) { marche(a.niv, a[qui], b[qui]); return segs; }
    marche(a.niv, a[qui], pied);
    const sens = ib > ia ? 1 : -1;
    for (let k = ia; k !== ib; k += sens) {
      const bas = NIV[ETAGES[Math.min(k, k + sens)]].sol, haut = NIV[ETAGES[Math.max(k, k + sens)]].sol;
      segs.push({ type: "escalier", bas, haut, monte: sens > 0, d: DUREE_ETAGE });
    }
    marche(b.niv, pied, b[qui]);
    return segs;
  }
  function partir(vers, ensuite) {
    if (trajet) return;
    if (place === vers || H.sansAnimation()) { place = vers; placeDepuis = performance.now(); if (ensuite) ensuite(); return; }
    const de = place;
    trajet = { t0: performance.now(), vers, ensuite, gens: ["ovo", "luigi"].map((qui, k) => ({ qui, retard: k * 450, segs: segments(qui, de, vers) })) };
    trajet.fin = Math.max(...trajet.gens.map((g) => g.retard + g.segs.reduce((n, x) => n + x.d, 0)));
  }
  const duree = (g) => g.retard + g.segs.reduce((n, x) => n + x.d, 0);
  // La balade : ƟvƟ choisit d'abord avec qui partir (ou seul·e) ; ceux qui viennent descendent
  // jusqu'à la porte, et la balade commence quand tout le monde est là. Mémé, si elle vient avec
  // Lóló, voyage sur son dos.
  function partirEnBalade(liste) {
    if (trajet) return;
    if (H.sansAnimation()) { H.d.majLocal((l) => (l.compagnons = liste)); H.aller("balade/" + (liste.length ? liste.join("+") : "solo")); return; }
    const lolo = liste.includes("lolo"), avecMeme = liste.includes("meme");
    const marcheurs = ["ovo"].concat(liste.filter((q) => q === "luigi" || q === "lolo" || (q === "meme" && !lolo)));
    const gens = marcheurs.map((qui, k) => ({ qui, retard: k * 500, allure: ALLURE[qui](avecMeme), segs: segments(qui, qui === "lolo" || qui === "meme" ? "canape" : place, "porte") }));
    trajet = {
      t0: performance.now(), vers: "porte", gens, balade: liste,
      // ceux qui ne sont plus à leur place (Mémé est partie sur le dos de Lóló)
      partis: new Set(marcheurs.concat(avecMeme ? ["meme"] : [])),
      ensuite: () => { H.d.majLocal((l) => (l.compagnons = liste)); H.aller("balade/" + (liste.length ? liste.join("+") : "solo")); },
    };
    trajet.fin = Math.max(...gens.map(duree)) + 300;
  }
  // Mémé qui sort par la chatière, ou qui rentre et remonte se coucher sur le canapé
  let memeVa = null, entreeMaison = 0, memeEssai = 0, fermerBalade = null;
  function memeTraverse(sortir) {
    if (H.sansAnimation()) return;
    const g = { qui: "meme", retard: 0, allure: ALLURE.meme(), segs: sortir ? segments("meme", "canape", "chatiere") : segments("meme", "chatiere", "canape") };
    memeVa = { t0: performance.now(), sortir, gens: [g], fin: duree(g) };
  }
  function dansSeg(sg, u) {
    if (sg.type === "marche") return { x: sg.x0 + (sg.x1 - sg.x0) * u, y: sg.y, gauche: sg.x1 < sg.x0, marche: u < 1 };
    const v = sg.monte ? u : 1 - u, a = 0.5 + v * 13 * 0.68, R = ESCALIER.r * 0.8;
    return { x: ESCALIER.x + R * Math.sin(a), y: sg.bas - v * (sg.bas - sg.haut), gauche: (sg.monte ? 1 : -1) * Math.cos(a) < 0, marche: true };
  }
  // où en est chacun·e : les pieds (x, y), le sens, et s'il ou elle marche encore
  function positionSur(g, dt) {
    let t = dt - g.retard;
    if (!g.segs.length) return null;
    if (t <= 0) return Object.assign(dansSeg(g.segs[0], 0), { marche: false });
    for (const sg of g.segs) {
      if (t <= sg.d) return dansSeg(sg, t / sg.d);
      t -= sg.d;
    }
    return Object.assign(dansSeg(g.segs[g.segs.length - 1], 1), { marche: false });
  }
  H.maison = { canape: allerSurLeCanape, balade: (liste) => { if (fermerBalade) fermerBalade(); fermerBalade = null; partirEnBalade(liste); } };
  function airNanana() {
    if (!H.local || !H.local.son) return;
    const ctx = H.audio.contexte();
    if (!ctx) return;
    let t = ctx.currentTime + 0.05;
    // do-do, puis ça monte : la-sol (« na », « na », puis « na-na » plus vite, la dernière tenue)
    for (const [f, d] of [[523.25, 0.24], [523.25, 0.24], [880, 0.15], [784, 0.55]]) {
      // deux voix à l'unisson, à peine décalées, comme deux personnes qui chantent ensemble
      for (const desaccord of [-5, 6]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = f;
        o.detune.value = desaccord;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.06 * H.volume("voix")), t + 0.025);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        o.connect(g).connect(H.audio.sortie());
        o.start(t);
        o.stop(t + d + 0.05);
      }
      t += d * 0.92;
    }
  }
  async function chanson() {
    chantJusqua = performance.now() + 6000;
    await H.dialogue.dire([{ qui: "luigi", texte: "Tu te rends compte de la chance qu’on a…" }]);
    chantJusqua = performance.now() + 3500;
    airNanana();
    await H.dialogue.dire([{ qui: "duo", texte: "Na-na-nana !" }]);
  }

  // Le soir (à partir de 17 h), en touchant Mesi, ƟvƟ peut lui raconter sa journée : tout ce
  // qu'iel a fait, dans l'ordre et dans le détail. Une fois racontée, on ne la raconte plus.
  // (et seulement si ƟvƟ a vraiment fait quelque chose aujourd'hui)
  const peutRaconter = () => new Date().getHours() >= 17 && H.local.journeeRacontee !== new Date().toDateString() && !!(H.journal && H.journal.recit().length);
  async function soireeOvo() {
    const q = await H.dialogue.dire([{ qui: "luigi", texte: "Alors, c’était comment, ta journée ?", choix: [{ valeur: "raconter", libelle: "Raconter ma journée" }, { valeur: null, libelle: "Plus tard" }] }]);
    if (q !== "raconter") return;
    H.d.majLocal((l) => (l.journeeRacontee = new Date().toDateString()));
    const lignes = H.journal ? H.journal.recit() : [];
    if (!lignes.length) return H.dialogue.dire([{ qui: "ovo", texte: "Aujourd’hui, je n’ai pas fait grand-chose… je me suis surtout reposé·e." }, { qui: "luigi", texte: "Ça fait du bien aussi, des journées comme ça." }]);
    await H.dialogue.dire(lignes.map((texte) => ({ qui: "ovo", texte })));
    await H.dialogue.dire([{ qui: "luigi", texte: H.histoires.auHasard(["Quelle journée ! Je suis fière de toi.", "Tu as bien travaillé, mon cœur. Viens te reposer.", "Eh bien ! Tu mérites une crêpe, toi."]) }]);
  }

  // la nuit, depuis le lit, on regarde les étoiles par le velux
  function regarderLeCiel() {
    const etat = H.ciel.etat(), jour = momentMaison() === "jour", m = H.ciel.meteo || {};
    const couvert = m.nuages != null && m.nuages > 70;
    const lignes = jour
      ? (couvert ? ["Des nuages tout gris qui passent au-dessus du velux… On dirait un troupeau de moutons pressés.", "Le ciel est tout couvert. On verra les étoiles une autre nuit."] : ["Un grand carré de ciel bleu au-dessus du lit. Ce soir, on verra les étoiles d’ici.", "Un nuage en forme de crêpe passe lentement… J’ai faim, du coup."])
      : (couvert ? ["Les nuages cachent les étoiles ce soir… Elles sont quand même là, derrière."] : ["Regarde ! Il y en a tellement… On dirait du sucre renversé sur un tissu bleu.", "Je reconnais la Grande Ourse, là, la casserole.", "Une étoile filante ! Vite, un vœu… (ƟvƟ ferme les yeux et sourit.)"].concat(etat.lune.alt > 0 ? ["La lune nous regarde dormir. Ce soir : " + H.ciel.nomPhase(etat.lune.phase) + "."] : []));
    return H.dialogue.dire([{ qui: "ovo", texte: H.histoires.auHasard(lignes) }]);
  }
  function basculerMusique() {
    if (!H.musique) return;
    if (H.musique.enCours()) { H.musique.arreter(); H.d.majLocal((l) => (l.musique = false)); return; }
    H.d.majLocal((l) => (l.musique = true));
    H.musique.jouer();
    partir("canape", () => (canapeJusqua = performance.now() + 150000));
  }
  // ce qu'on peut faire en cliquant dans la pièce (rectangles dans le dessin ; la mezzanine au-dessus du zéro)
  function zonesMaison(nuit) {
    // on peut aller faire dodo à partir de 21 h
    const heure = new Date().getHours(), dodo = heure >= 21 || heure < 6;
    const zones = [
      { id: "fenetre", x: BAIE.x, y: BAIE.y, w: BAIE.w, h: 110, get nom() { return fenetresOuvertes() ? "Fermer les fenêtres" : "Ouvrir grand les fenêtres"; }, agir: basculerFenetres },
      { id: "meme", x: 274, y: 188, w: 56, h: 26, get nom() { return H.memeDehors() ? "La place de Mémé" : "Caresser Mémé"; }, agir: () => {
        // sortie par la chatière : on ne sait pas ce qu'elle fait dehors
        if (H.memeDehors()) return H.dialogue.dire([{ qui: "ovo", nom: "La place de Mémé", texte: H.histoires.auHasard([
          "(La place de Mémé est vide, encore un peu tiède. Elle est sortie par la chatière.)",
          "Mémé est partie en vadrouille par la chatière… Qui sait ce qu’elle fabrique dehors ?",
          "(Personne ne sait où va Mémé quand elle sort. Elle rentrera quand elle l’aura décidé.)",
        ]) }].concat(Math.random() < 0.5 ? [{ qui: "lolo", texte: "Hiii… Mémé ne me dit jamais où elle va." }] : []));
        if (H.sons.caresseMeme) H.sons.caresseMeme();
        return H.dialogue.dire([{ qui: "meme", texte: H.memeRentree()
          ? H.histoires.auHasard(["Mrrrou. (Mémé est rentrée de sa vadrouille, une brindille de thym dans les poils, l’air très contente d’elle.)", "Rrr… (Elle sent le dehors et la terre. Elle ne dira rien de ce qu’elle a fait.)"])
          : H.histoires.auHasard(["Rrr… rrr… (Mémé s’étire sans ouvrir les yeux, puis se rendort en boule.)", "Mrrrou. (Elle tend le menton pour qu’on le gratte.)", "Rrrrrrr… (Mémé ronronne si fort que le canapé vibre.)"]) }]);
      } },
      { id: "lolo", x: 246, y: 150, w: 116, h: 54, nom: "Parler avec Lóló", agir: async () => {
        // le premier matin de la journée, on lui demande seulement s'il a bien dormi
        if (H.lolo.leMatin()) {
          const d = await H.dialogue.dire([{ qui: "lolo", texte: "Hiii ! Bonjour !", choix: [{ valeur: "dormi", libelle: "Tu as bien dormi ?" }] }]);
          if (d) await H.lolo.bienDormi();
          return;
        }
        // des fois, on dit « balague » au lieu de « blague »
        const blague = Math.random() < 0.3 ? "balague" : "blague";
        const choix = [{ valeur: "drame", libelle: "Un drame !" }, { valeur: "blague", libelle: "Une " + blague + " !" }];
        const q = await H.dialogue.dire([{ qui: "lolo", texte: "Hiii ! Un drame ou une " + blague + " ?", choix: choix.concat({ valeur: null, libelle: "Plus tard" }) }]);
        if (q === "drame") raconter("lolo");
        else if (q === "blague") blagueLolo();
      } },
      { id: "lit", x: 168, y: -112, w: 262, h: 108, nom: dodo ? "Aller faire dodo" : "Le lit", agir: () => (dodo ? partir("lit", () => H.aller("dodo/dormir")) : H.dialogue.dire([{ qui: "luigi", texte: "Pas encore l’heure de dormir ! Viens plutôt t’asseoir sur le canapé." }])) },
      { id: "velux", x: VELUX.x0, y: veluxY(VELUX.x0) - 4, w: VELUX.x1 - VELUX.x0, h: veluxY(VELUX.x1) + VELUX.prof - veluxY(VELUX.x0) + 8, get nom() { return momentMaison() === "jour" ? "Regarder le ciel" : "Regarder les étoiles"; }, agir: regarderLeCiel },
      { id: "enceintes", x: 172, y: 124, w: 34, h: 128, get nom() { return H.musique && H.musique.enCours() ? "Couper la musique" : "Mettre de la musique"; }, agir: basculerMusique },
      { id: "enceinte", x: 518, y: 164, w: 34, h: 88, get nom() { return H.musique && H.musique.enCours() ? "Couper la musique" : "Mettre de la musique"; }, agir: basculerMusique },
      { id: "canape", x: 364, y: 144, w: 150, h: 96, nom: "Une douceur de Mesi", agir: () => raconter("luigi") },
      // le soir, c'est à Mesi qu'ƟvƟ raconte sa journée (une fois par soir)
      { id: "mesi", x: 572 + TABLE_T.x, y: 160 + TABLE_T.y, w: 66, h: 136, get nom() { return peutRaconter() ? "Raconter ma journée à Mesi" : "Mesi"; }, agir: () => (peutRaconter() ? soireeOvo() : H.dialogue.dire([{ qui: "luigi", texte: "Ce soir, tu me raconteras ta journée ?" }])) },
      { id: "ovo", x: 428 + TABLE_T.x, y: 160 + TABLE_T.y, w: 72, h: 136, nom: "Chanter notre chanson", agir: () => chanson() },
      { id: "table", x: 500 + TABLE_T.x, y: 196 + TABLE_T.y, w: 72, h: 34, nom: "Le goûter", agir: () => (H.ressources.quantite("crepe") > 0
        ? crepeMesi(() => H.aller("maison"))
        : H.dialogue.dire([{ qui: "luigi", texte: "Plus de crêpe pour l’instant… Quelques flashcartes, et je t’en refais une au chocolat fondu !" }])) },
      { id: "poele", x: POELE.x - 6, y: 300, w: POELE.w + 12, h: 212, get nom() { return cheminee.feuActif() ? "Le feu" : "Faire du feu"; }, agir: () => cheminee.allumer() },
      { id: "bois", x: -92, y: 430, w: 78, h: 80, nom: "Prendre du bois sec", agir: () => cheminee.prendreBois() },
      { id: "porte", x: -190, y: 322, w: 200, h: 196, nom: "Sortir faire une balade", agir: () => !trajet && fenetreBalade() },
      // les guirlandes dehors, accrochées de la maison aux arbres : on les allume ou on les éteint
      ...[[-EP_MUR - 250, 100], [LARGE + EP_MUR + 10, 100]].map(([x, y], k) => ({ id: "guirlandes" + k, x, y, w: 240, h: 110,
        get nom() { return momentMaison() === "jour" ? "Les guirlandes" : guirlandesAllumees() ? "Éteindre les guirlandes" : "Allumer les guirlandes"; },
        agir: () => (momentMaison() === "jour" ? H.dialogue.dire([{ qui: "luigi", texte: "Elles s’allumeront ce soir." }]) : H.d.majLocal((l) => { l.guirlandesEteintes = !l.guirlandesEteintes; })) })),
    ];
    return zones;
  }

  // Mémé roulée en boule au pied du lit, qui respire doucement
  // Mémé roulée en boule au pied du lit, en vrais pixels : chaque case tombe pile sur un gros
  // pixel de l'écran (un si petit dessin, peint en traits puis passé en gros pixels, devenait une
  // tache floue dès que Lóló n'était plus couché autour d'elle). La tête à gauche, les yeux
  // fermés, la queue ramenée devant ; de temps en temps, son dos se soulève en respirant.
  const MEME_DORT = [
    ".k..k.......",
    "kTkkTkkkkk..",
    "kttttktTtTk.",
    "ktkktTttTttk",
    "kupuuttTttTk",
    ".kuuTTTTTtk.",
    "..kkkkkkkk..",
  ];
  // en plus grand, pour la plage (où chaque case est plus petite) : la tête posée sur les pattes,
  // les oreilles dressées, le museau crème et le nez rose, le dos tigré, la queue enroulée devant
  const MEME_DORT_GRAND = [
    "..k...k...........",
    ".kTk.kTk...kkkkk..",
    ".kttkttk.kkTttTtk.",
    "kttttttkkttTttTttk",
    "ktkttktttTttTttTtk",
    "kttuputtttTttTtttk",
    ".kuuuuttTttTttTttk",
    ".kkuutttttttttttk.",
    "..kTTTTttttttTTk..",
    "...kkkkkkkkkkkk...",
  ];
  // (cellFixe : la taille d'une case quand la scène n'a pas la grille de la maison, en balade ;
  // fois : combien de cases de la maison pour une case du dessin ; Mémé fait la moitié de Lóló)
  function memeEnBoule(ctx, x, y, t, cellFixe, fois) {
    let cd = cellFixe ? { cell: cellFixe, n: 1, g: cellFixe } : caseDessin();
    if (fois > 1) cd = { cell: cd.cell * fois, n: cd.n * fois, g: cd.g };
    const m = ctx.getTransform(), cell = cd.cell, ox = cellFixe ? 0 : m.e / pixK, oy = cellFixe ? 0 : m.f / pixK;
    const grand = cellFixe || fois > 2, grille = grand ? MEME_DORT_GRAND : MEME_DORT, tete = grand ? 8 : 5;
    const L = grille[0].length, Hh = grille.length, inspire = Math.sin(t / 700) > 0.55;
    const X = Math.round((x + ox - (L * cell) / 2) / cell) * cell - ox, Y = Math.round((y + oy - Hh * cell * 0.6) / cell) * cell - oy;
    grille.forEach((ligne, j) => [...ligne].forEach((ch, i) => {
      if (ch === ".") return;
      // (le dos se soulève : les cases du haut du corps montent d'un cran)
      const leve = inspire && j <= 2 && i >= tete ? -cell : 0;
      ctx.fillStyle = H.pixel.PAL[ch];
      ctx.fillRect(X + i * cell, Y + j * cell + leve, cell + 0.05, cell + 0.05);
      if (leve && j === 2) { ctx.fillStyle = H.pixel.PAL.t; ctx.fillRect(X + i * cell, Y + j * cell, cell + 0.05, cell + 0.05); }
      // (en plus fin : le pelage éclairé en haut, plus sombre en bas, et quelques poils)
      if (cd.n > 1 && ch !== "k") {
        const vide = (a, b) => { const l = grille[b]; return !l || !l[a] || l[a] === "." || l[a] === "k"; }, g = cd.g, x0 = X + i * cell, y0 = Y + j * cell + leve;
        for (let sy = 0; sy < cd.n; sy++) for (let sx = 0; sx < cd.n; sx++) {
          const v = Math.sin((i * cd.n + sx) * 127.1 + (j * cd.n + sy) * 311.7) * 43758.5453, gr = v - Math.floor(v);
          let c = null;
          if (sy === 0 && vide(i, j - 1)) c = teinte(H.pixel.PAL[ch], [255, 250, 235], 0.25);
          else if (sy === cd.n - 1 && vide(i, j + 1)) c = teinte(H.pixel.PAL[ch], [35, 33, 74], 0.28);
          else if (gr < 0.18) c = teinte(H.pixel.PAL[ch], gr < 0.09 ? [255, 250, 235] : [35, 33, 74], 0.18);
          if (c) { ctx.fillStyle = c; ctx.fillRect(x0 + sx * g, y0 + sy * g, g + 0.05, g + 0.05); }
        }
      }
    }));
  }

  // Mémé couchée en rond, dessinée comme Lóló (en traits, puis passée aux gros pixels de la
  // maison) : la moitié de sa taille, une chatte tigrée beige, le museau crème, le nez rose, les
  // yeux toujours fermés, la queue enroulée devant ; son dos se soulève quand elle respire.
  function memeCouchee(ctx, x, y, t) {
    const souffle = 1 + Math.sin(t / 900) * 0.04, robe = "#c9ad8a", raie = "#6b5442", creme = "#f0e4d4";
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.6;
    // le corps en boule, et ses rayures
    ctx.save();
    ctx.translate(4, -9); ctx.scale(1, souffle);
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    ctx.strokeStyle = raie; ctx.lineWidth = 2.2;
    for (const dx of [-8, -1, 6, 12]) { ctx.beginPath(); ctx.moveTo(dx, -9.5 + Math.abs(dx) * 0.08); ctx.quadraticCurveTo(dx + 2.5, -4, dx + 1, 0); ctx.stroke(); }
    ctx.restore();
    // la queue enroulée devant, rayée
    ctx.beginPath(); ctx.moveTo(19, -4); ctx.quadraticCurveTo(18, 3, 4, 2.5); ctx.quadraticCurveTo(-8, 2, -12, -1);
    ctx.lineWidth = 6.4; ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.lineWidth = 3.8; ctx.strokeStyle = robe; ctx.stroke();
    ctx.lineWidth = 1.8; ctx.strokeStyle = raie;
    for (const qx of [12, 4, -4]) { ctx.beginPath(); ctx.moveTo(qx, 0.5); ctx.lineTo(qx - 0.5, 4); ctx.stroke(); }
    // la tête, posée sur les pattes, à gauche
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-19, -14); ctx.lineTo(-17, -21); ctx.lineTo(-13, -15.5); ctx.closePath(); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-10, -15.5); ctx.lineTo(-6, -20.5); ctx.lineTo(-5, -13.5); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-12, -8.5, 8.5, 7, 0, 0, Math.PI * 2); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(-13, -5, 4.6, 3, 0, 0, Math.PI * 2); ctx.fillStyle = creme; ctx.fill();
    ctx.fillStyle = "#f4a3b8"; ctx.beginPath(); ctx.ellipse(-13, -6.6, 1.4, 1, 0, 0, Math.PI * 2); ctx.fill();
    // les yeux fermés : deux petits arcs
    ctx.lineWidth = 1.3;
    for (const ex of [-16, -9.5]) { ctx.beginPath(); ctx.arc(ex, -10, 1.8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
    ctx.strokeStyle = raie; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-12, -15.2); ctx.lineTo(-12, -12.5); ctx.stroke();
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
    // la crinière chocolat, bien épaisse pour qu'on la voie en gros pixels, avec des mèches
    ctx.beginPath(); ctx.moveTo(-18, -28); ctx.quadraticCurveTo(-38, -32, -45, -16);
    ctx.lineWidth = 8; ctx.strokeStyle = ENCRE; ctx.stroke();
    ctx.lineWidth = 5.5; ctx.strokeStyle = choco; ctx.stroke();
    ctx.fillStyle = choco;
    for (const [mx, my, dx, dy] of [[-24, -31, -3, -5], [-31, -31, -4, -4], [-38, -27, -6, -2], [-43, -21, -6, 1]]) {
      ctx.beginPath(); ctx.moveTo(mx + 3, my + 2); ctx.lineTo(mx + dx, my + dy); ctx.lineTo(mx - 2, my + 3); ctx.closePath(); ctx.fill();
    }
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
    // une vraie tête de cheval : longue, le front plat qui descend vers un grand museau doux,
    // les joues rondes à l'arrière, de petites oreilles pointues couchées vers l'arrière
    for (const [dx, pench] of [[1.5, -0.35], [4.5, -0.15]]) {
      ctx.save(); ctx.translate(dx, -6.5); ctx.rotate(pench);
      ctx.beginPath(); ctx.moveTo(-2.2, 1); ctx.quadraticCurveTo(-1.4, -5, 0.6, -7.5); ctx.quadraticCurveTo(2, -4.5, 2, 1); ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(5, -4);
    ctx.quadraticCurveTo(0, -8, -6, -5.5);
    ctx.lineTo(-18, 0);
    ctx.quadraticCurveTo(-24, 2.5, -22.5, 6.5);
    ctx.quadraticCurveTo(-21, 9.5, -16, 8.5);
    ctx.quadraticCurveTo(-10, 7.5, -4, 8);
    ctx.quadraticCurveTo(5, 9.5, 7, 3);
    ctx.quadraticCurveTo(8, -1.5, 5, -4);
    ctx.closePath();
    ctx.fillStyle = robe; ctx.fill(); ctx.stroke();
    // le museau plus clair, et la naseau
    ctx.save(); ctx.clip();
    ctx.beginPath(); ctx.ellipse(-19, 5, 6, 5, 0.2, 0, Math.PI * 2); ctx.fillStyle = clair; ctx.fill();
    // l'étoile blanche sur le front, assez grande pour rester visible une fois passée en gros
    // pixels, même dans la pénombre de la chambre
    ctx.save(); ctx.translate(-9, -2.4); ctx.scale(1.7, 1.7);
    ctx.beginPath(); ctx.moveTo(-1.8, 0.1); ctx.lineTo(-0.4, -1.7); ctx.lineTo(0.6, -0.1); ctx.lineTo(2.2, -0.3); ctx.lineTo(0.9, 1.3); ctx.lineTo(-1, 1.7); ctx.closePath();
    ctx.fillStyle = "#ffffff"; ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.beginPath(); ctx.ellipse(-20.5, 3.5, 1.5, 1, 0.5, 0, Math.PI * 2); ctx.fillStyle = choco; ctx.fill();
    // la joue ronde
    ctx.beginPath(); ctx.arc(1.5, 3.5, 3.8, 0.4, 2.6); ctx.stroke();
    // le toupet chocolat entre les oreilles
    ctx.beginPath(); ctx.moveTo(2, -6.5); ctx.quadraticCurveTo(-3, -9, -6, -4.5); ctx.quadraticCurveTo(-2, -5.5, 1, -4); ctx.closePath(); ctx.fillStyle = choco; ctx.fill();
    // l'œil, haut sur le côté de la tête
    if (o.ouvert) {
      ctx.beginPath(); ctx.arc(-2.5, -2, 2, 0, Math.PI * 2); ctx.fillStyle = "#151325"; ctx.fill();
      ctx.beginPath(); ctx.arc(-3.1, -2.7, 0.7, 0, Math.PI * 2); ctx.fillStyle = "#ffffff"; ctx.fill();
    } else {
      ctx.beginPath(); ctx.moveTo(-4.5, -1.5); ctx.quadraticCurveTo(-2.5, 0.2, -0.5, -1.5); ctx.stroke();
    }
    // la bouche qui bouge quand il raconte
    if (o.parle) {
      ctx.beginPath(); ctx.ellipse(-18.5, 7.8, 2.6, 0.5 + Math.abs(Math.sin((o.t || 0) / 120)) * 1.6, 0.1, 0, Math.PI * 2); ctx.fillStyle = "#3a2216"; ctx.fill();
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
  // tete : où est la tête de Mesi (à table, ou sur le canapé) pour la farce où Lóló s'y assoit
  function dessinerFarce(ctx, t, tete) {
    const vu = farce.etape >= 1, robe = "#b9834f", choco = "#4b3427";
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = ENCRE;
    if (farce.id === "cache") {
      // caché sous la table du goûter (dans les mesures de la table), roulé en boule : on ne voit
      // que son dos caramel, ses oreilles et sa queue qui frétille ; puis il lève la tête
      ctx.save();
      ctx.translate(536, 286);
      ctx.scale(0.62, 0.62);
      loloCouche(ctx, 0, 0, t, vu);
      ctx.restore();
      ctx.save();
      ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(564, 280); ctx.quadraticCurveTo(576 + Math.sin(t / 140) * 4, 282, 574, 292);
      ctx.lineWidth = 7; ctx.strokeStyle = ENCRE; ctx.stroke();
      ctx.lineWidth = 4.5; ctx.strokeStyle = choco; ctx.stroke();
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
      // assis sur la tête de Mesi, les jambes qui pendent de chaque côté ; il suit Mesi où qu'elle soit
      ctx.save();
      ctx.translate(((tete && tete.x) || 604) - 604, ((tete && tete.y) || 156) - 156);
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
      ctx.restore();
    }
  }

  function sceneMaison(toile) {
    const ctx = toile.getContext("2d");
    const nuit = H.ciel.nuitCalme();
    const zones = zonesMaison(nuit);
    let decor = null, calque = null, M = null, vue = null, cle = "", survol = null, derniere = 0;
    trajet = null;
    memeVa = null;
    entreeMaison = performance.now();
    place = canapeJusqua > performance.now() ? "canape" : "table";
    const zoneSous = (e) => {
      if (!vue) return null;
      const r = toile.getBoundingClientRect();
      const x = ((e.clientX - r.left) * vue.dpr - vue.px) / vue.K + BOITE.x, y = ((e.clientY - r.top) * vue.dpr - vue.py) / vue.K + BOITE.y;
      return zones.find((z) => x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) || null;
    };
    toile.addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      survol = zoneSous(e);
      toile.style.cursor = survol ? "pointer" : "default";
    });
    // (au doigt, le navigateur envoie « pointerleave » à chaque fois qu'on lève le doigt : on ne
    // l'écoute que pour la souris, sinon le second toucher ne retrouvait jamais le premier)
    toile.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") survol = null; });
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
      if (t - derniere < H.cadence(66)) return;
      derniere = t;
      const v = vueMaison(toile), moment = momentMaison();
      // (le décor change aussi quand le feu prend ou s'éteint, et avec le tas de bûches)
      const cleD = [v.W, v.Hc, v.K, v.taille, moment, cheminee.feuActif(), cheminee.bois(), fenetresOuvertes(), guirlandesAllumees()].join("|");
      if (cle !== cleD) {
        cle = cleD;
        vue = v;
        toile.width = v.W;
        toile.height = v.Hc;
        // (le décor reste en mémoire d'une visite à l'autre : rentrer à la maison va plus vite)
        if (decorGarde.cle !== cleD) decorGarde = { cle: cleD, decor: decorMaison(v.K, moment) };
        decor = decorGarde.decor;
        M = toileVide(decor); calque = toileVide(decor);
      }
      pixK = v.K;
      const etat = H.ciel.etat(), m = M.getContext("2d");
      m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, M.width, M.height);
      repere(m, v.K);
      // le dehors proche, derrière les vitres (par le velux, c'est le vrai ciel, peint avec le dehors)
      fenetresDehors(m, t, moment, etat);
      m.drawImage(decor, BOITE.x, BOITE.y, BOITE.w, BOITE.h);
      m.drawImage(rideauxEclaires(decor, t), BOITE.x, BOITE.y, BOITE.w, BOITE.h);
      m.drawImage(decor.meubles, BOITE.x, BOITE.y, BOITE.w, BOITE.h);
      // le soleil (ou la lune) entre par la baie et par le velux : l'ombre du cadre et des
      // feuilles qui bougent
      const ciel = masqueCiel(t, etat, decor);
      if (ciel) {
        ajouterLumiere(M, decor.couleurs, ciel, 1);
        m.drawImage(decor.chaises, BOITE.x, BOITE.y, BOITE.w, BOITE.h);
        raiDuVelux(m, ciel);
      }
      const feu = cheminee.feuActif();
      if (feu) feuDuPoele(m, t, moment, decor);
      // Lóló et Mémé sur le canapé ; ƟvƟ et Mesi à la table du goûter (ou sur le canapé). Tout ça
      // se peint sur un calque, qui reçoit la même lumière que la maison.
      const cc = calque.getContext("2d");
      cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, calque.width, calque.height);
      repere(cc, v.K);
      cc.lineJoin = "round"; cc.lineCap = "round"; cc.strokeStyle = ENCRE; cc.lineWidth = 2.2;
      ECL = { k: decor.k, L: decor.L };
      // en route d'une place à l'autre (dans l'escalier, ou sur un étage) ; on les dessine par-dessus
      // le reste, pour qu'ils passent devant Lóló et le canapé
      let enRoute = false, marcheurs = [], partis = new Set();
      if (trajet) {
        const dt = t - trajet.t0;
        if (dt >= trajet.fin && !trajet.balade) { place = trajet.vers; placeDepuis = t; const e = trajet.ensuite; trajet = null; if (e) e(); }
        else {
          // (la balade : tout le monde attend devant la porte, puis on part)
          if (trajet.balade && dt >= trajet.fin && !trajet.lance) { trajet.lance = true; setTimeout(trajet.ensuite, 0); }
          enRoute = true;
          partis = trajet.partis || new Set(trajet.gens.map((g) => g.qui));
          marcheurs = trajet.gens.map((g) => [g, positionSur(g, Math.min(dt, trajet.fin))]).filter((m) => m[1]);
        }
      }
      // Mémé passe la chatière (pour sortir, ou en rentrant)
      if (!memeVa && !trajet && !H.$(".dialogue")) {
        if (H.memeVaRentrer && H.memeVaRentrer()) { H.memeVueRentrer(); memeTraverse(false); }
        else if (H.memePeutSortir && H.memePeutSortir() && t - entreeMaison > 30000 && t - memeEssai > 10000) {
          memeEssai = t;
          if (Math.random() < 0.08) { H.memeSort(); memeTraverse(true); }
        }
      }
      if (memeVa) {
        const dt = t - memeVa.t0;
        if (dt >= memeVa.fin) { if (H.bruit) H.bruit("ouvre"); memeVa = null; }
        else { partis.add("meme"); marcheurs.push([memeVa.gens[0], positionSur(memeVa.gens[0], dt)]); }
      }
      // la musique finie, on redescend à la table ; devant la porte, si on n'est pas parti, on revient
      if (!trajet && place === "canape" && canapeJusqua < t) partir("table");
      if (!trajet && place === "porte" && t - placeDepuis > 2500 && !H.$(".fenetre, .voile, .dialogue")) partir("table");
      if (!enRoute && (place === "porte" || place === "lit")) {
        const pl = PLACES[place];
        for (const qui of ["ovo", "luigi"]) H.pixel.dessiner(cc, qui + "Profil", pl[qui], NIV[pl.niv].sol, 4.4, 4, place === "porte");
      }
      const surCanape = !enRoute && place === "canape", ici = (qui) => !partis.has(qui);
      cc.save();
      cc.translate(DX + CANAPE_T.x, CANAPE_T.y);
      if (!farce && ici("lolo")) loloCouche(cc, 172, 200, t, loloRaconte);
      if (!H.memeDehors() && ici("meme")) memeCouchee(cc, 176, 206, t);
      if (place === "canape" && (surCanape || ici("luigi"))) {
        // sur le canapé, face à face, les jambes qui se balancent au-dessus du tapis
        if (ici("ovo")) assis(cc, "ovo", 240, 1, t, 2, loloRaconte, 210);
        if (ici("luigi")) assis(cc, "luigi", 362, -1, t, 4, false, 210);
        // la tête de Mesi sur le canapé (dos 362, siège plus bas de 36)
        if (farce && farce.id === "tete") dessinerFarce(cc, t, { x: 340, y: 120 });
      }
      cc.restore();
      cc.save();
      cc.translate(TABLE_T.x, TABLE_T.y);
      if (place === "table") {
        if (ici("ovo")) assis(cc, "ovo", 445, 1, t, 2, loloRaconte);
        if (ici("luigi")) assis(cc, "luigi", 626, -1, t, 4);
      }
      cc.strokeStyle = ENCRE;
      cc.lineWidth = 1.6;
      tableGouter(cc);
      if (farce && farce.id === "tete" && !enRoute && place === "table") dessinerFarce(cc, t, { x: 604, y: 156 });
      // caché sous la table du goûter
      if (farce && farce.id === "cache") dessinerFarce(cc, t);
      cc.restore();
      for (const [g, ps] of marcheurs) {
        const a = g.allure || ALLURE[g.qui]();
        H.pixel.dessiner(cc, a.nom, ps.x, ps.y, a.e, ps.marche ? Math.floor(t / (a.images === 2 ? 180 : 140)) % a.images : a.arret, ps.gauche);
      }
      // la fausse plante, au rez-de-chaussée, entre le poêle et la table (là où il y avait la porte)
      if (farce && farce.id === "plante") { cc.save(); cc.translate(226 - 338, NIV.bas.sol - 332); dessinerFarce(cc, t); cc.restore(); }
      ECL = null;
      // les personnages reçoivent la même lumière que la maison (celle du ciel et du feu aussi),
      // sans les reflets vifs des ampoules : les visages restent dans la lumière du moment
      {
        const vraies = tampon("persos", calque.width, calque.height);
        vraies.getContext("2d").drawImage(calque, 0, 0);
        eclairerCouche(calque, vraies, decor.carte, null);
        if (ciel) ajouterLumiere(calque, vraies, ciel, 1);
        if (feu) ajouterLumiere(calque, vraies, masqueFeu(t, decor), moment === "jour" ? 0.4 : 0.8);
      }
      m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.drawImage(calque, 0, 0); m.restore();
      // la vapeur du tilleul, et les notes de la chanson qui montent
      m.save();
      m.translate(TABLE_T.x, TABLE_T.y);
      m.strokeStyle = "rgba(255,255,255,0.75)";
      m.lineWidth = 1.4;
      for (const cx of [508, 563]) for (let i = 0; i < 2; i++) {
        const u = ((t / 1600) + i * 0.5 + cx / 100) % 1;
        m.globalAlpha = 1 - u;
        m.beginPath();
        for (let k = 0; k <= 9; k++) {
          const y = 199 - k * 2.2 - u * 10, x = cx - 2 + i * 4 + Math.sin(k / 2 + t / 400 + i) * 2;
          k ? m.lineTo(x, y) : m.moveTo(x, y);
        }
        m.stroke();
      }
      m.restore();
      if (chantJusqua > t) {
        m.save();
        if (canapeJusqua > t) m.translate(DX + CANAPE_T.x, CANAPE_T.y); else m.translate(TABLE_T.x, TABLE_T.y);
        m.font = "16px serif";
        m.textAlign = "center";
        for (let i = 0; i < 6; i++) {
          const u = ((t / 1400) + i / 6) % 1;
          m.globalAlpha = Math.min(1, (chantJusqua - t) / 600) * (1 - u);
          m.fillStyle = i % 2 ? "#ff5b4f" : "#f3f0dc";
          const base = canapeJusqua > t ? 262 : 470;
          m.fillText(i % 3 ? "♪" : "♫", base + (i % 3) * 40 + Math.sin(u * 6 + i) * 6, 170 - u * 60);
        }
        m.restore();
      }
      // les enceintes : quand la musique joue, les membranes battent
      if (H.musique && H.musique.enCours()) membranes(m, t);
      // le dehors tout autour, la maison par-dessus
      const R = poserMaison(ctx, v, t, moment, etat, M);
      // de gros pixels aux couleurs des pochettes ; le nom survolé reste net, par-dessus
      H.retro.appliquer(toile, v.taille, 0.6, null, paletteMaison(moment, false));
      mondeRepere(ctx, v);
      // le nom de ce qu'on survole
      if (survol) {
        // (comme les menus des scènes : un bloc d'encre cerné de corail, la police pixel en crème)
        const f = Math.max(1, 0.9 / (v.K / v.dpr));
        ctx.save();
        ctx.translate(survol.x + survol.w / 2, survol.y);
        ctx.scale(f, f);
        ctx.font = "19px VT323, monospace";
        const nomZone = H.permuter ? H.permuter(survol.nom) : survol.nom;
        const l = Math.round(ctx.measureText(nomZone).width) + 28;
        const xg = (R.x0 + 8 - (survol.x + survol.w / 2)) / f, xd = (R.x1 - 8 - (survol.x + survol.w / 2)) / f - l;
        const x = Math.round(Math.max(xg, Math.min(xd, -l / 2))), y = -30;
        ctx.fillStyle = "rgba(15,16,53,0.6)"; ctx.fillRect(x + 4, y + 4, l + 6, 28);
        ctx.fillStyle = "#1b1d4a"; ctx.fillRect(x - 3, y - 3, l + 6, 28);
        ctx.strokeStyle = "#ff5b4f"; ctx.lineWidth = 2; ctx.strokeRect(x - 1, y - 1, l + 2, 24);
        ctx.fillStyle = "#f6ee55"; ctx.font = "11px VT323, monospace"; ctx.textBaseline = "middle";
        ctx.fillText("▶", x + 6, y + 11);
        ctx.font = "19px VT323, monospace"; ctx.fillStyle = "#f3f0dc";
        ctx.fillText(nomZone, x + 18, y + 12);
        ctx.restore();
      }
    }
    requestAnimationFrame(image);
  }

  // --- la maison ------------------------------------------------------------------------
  // La maison, c'est la scène et rien d'autre : pas d'en-tête, pas de titre, pas de papier autour.
  // Tout se fait en cliquant sur la pièce ; une petite porte en haut à gauche ramène à la ferme.
  let toileMaison = null;
  // ouvrir grand les fenêtres (ou les refermer) : l'air entre, les rideaux bougent, on entend mieux le dehors
  function basculerFenetres() {
    H.d.majLocal((l) => (l.fenetresOuvertes = !l.fenetresOuvertes));
    H.bruit && H.bruit("ouvre");
    if (H.sons && H.sons.majVolumes) H.sons.majVolumes();
  }
  function fenetreBalade() {
    let fermer;
    const corps = H.el("div", null, H.el("h2", null, "Faire une balade"), choixCompagnons());
    fermer = fermerBalade = H.fenetre(corps, { classe: "menu-scene" });
    return fermer;
  }
  // --- la maison en relief (isométrique) ----------------------------------------------------
  // La même pièce, vue en coin comme la ferme : le sol en terrazzo, le mur bleu du lit et le mur
  // vert de la baie. Le lit sous les photos, la table de chevet et sa lampe, le canapé sous la
  // baie, la table du goûter sous la boule orange, le poêle en fonte dans le coin (le feu à hauteur
  // de genoux), la plante, le tapis. Tout est dessiné en petits pixels, puis agrandi sans flou.
  const MI = { HW: 16, QH: 8, MUR: 60, N: 8, M: 9.5 };
  MI.L = (MI.N + MI.M) * MI.HW + 24;
  MI.OX = 12 + MI.M * MI.HW;
  MI.OY = MI.MUR + 22;
  MI.H = MI.OY + (MI.N + MI.M) * MI.QH + 10;
  const PI_ = (i, j, z) => [MI.OX + (i - j) * MI.HW, MI.OY + (i + j) * MI.QH - (z || 0)];
  function polyIso(g, pts, col, trait) {
    g.beginPath();
    pts.forEach(([x, y], k) => (k ? g.lineTo(Math.round(x), Math.round(y)) : g.moveTo(Math.round(x), Math.round(y))));
    g.closePath();
    g.fillStyle = col; g.fill();
    if (trait) { g.strokeStyle = trait; g.lineWidth = 1; g.stroke(); }
  }
  // une boîte posée au sol : le dessus et les deux faces qu'on voit
  function boiteIso(g, i, j, w, d, h, c, z0) {
    const z = z0 || 0;
    polyIso(g, [PI_(i, j + d, z), PI_(i + w, j + d, z), PI_(i + w, j + d, z + h), PI_(i, j + d, z + h)], c.gauche || c.dessus, ENCRE);
    polyIso(g, [PI_(i + w, j, z), PI_(i + w, j + d, z), PI_(i + w, j + d, z + h), PI_(i + w, j, z + h)], c.droite || c.dessus, ENCRE);
    polyIso(g, [PI_(i, j, z + h), PI_(i + w, j, z + h), PI_(i + w, j + d, z + h), PI_(i, j + d, z + h)], c.dessus, ENCRE);
  }
  // un rectangle sur le mur de gauche (i = 0) ou de droite (j = 0)
  const surMurG = (j0, j1, z0, z1) => [PI_(0, j0, z0), PI_(0, j1, z0), PI_(0, j1, z1), PI_(0, j0, z1)];
  const surMurD = (i0, i1, z0, z1) => [PI_(i0, 0, z0), PI_(i1, 0, z0), PI_(i1, 0, z1), PI_(i0, 0, z1)];

  // le décor fixe en relief (selon le moment, et lampes éteintes pour dormir)
  function decorIso(moment, eteint) {
    const c = document.createElement("canvas");
    c.width = MI.L; c.height = MI.H;
    const g = c.getContext("2d"), M = MOMENTS[moment], r = H.alea("maison-iso");
    // les murs
    polyIso(g, [PI_(0, MI.M, 0), PI_(0, 0, 0), PI_(0, 0, MI.MUR), PI_(0, MI.M, MI.MUR)], M.murG, ENCRE);
    polyIso(g, [PI_(0, 0, 0), PI_(MI.N, 0, 0), PI_(MI.N, 0, MI.MUR), PI_(0, 0, MI.MUR)], M.murD, ENCRE);
    // la plinthe
    polyIso(g, [PI_(0, MI.M, 0), PI_(0, 0, 0), PI_(0, 0, 3), PI_(0, MI.M, 3)], M.plinthe);
    polyIso(g, [PI_(0, 0, 0), PI_(MI.N, 0, 0), PI_(MI.N, 0, 3), PI_(0, 0, 3)], M.plinthe);
    // le sol en terrazzo, avec ses éclats
    polyIso(g, [PI_(0, 0), PI_(MI.N, 0), PI_(MI.N, MI.M), PI_(0, MI.M)], M.sol, ENCRE);
    const eclats = ["#e04bb0", "#a8325b", "#ff5b4f", "#ffd23a", "#3d5ee8", "#f3f0dc"];
    for (let k = 0; k < 160; k++) { const [x, y] = PI_(r() * MI.N, r() * MI.M); g.fillStyle = eclats[k % eclats.length]; g.fillRect(Math.round(x), Math.round(y), 1, 1); }
    // la baie vitrée sur le mur vert (le dehors y est peint à chaque image) : on la découpe
    g.save(); g.globalCompositeOperation = "destination-out";
    polyIso(g, surMurD(4.3, 7.5, 16, 52), "#000");
    g.restore();
    g.lineWidth = 1;
    polyIso(g, surMurD(4.3, 7.5, 16, 52), "rgba(0,0,0,0)", "#f3f0dc");
    for (const u of [5.37, 6.43]) { const [a, b] = [PI_(u, 0, 16), PI_(u, 0, 52)]; g.fillStyle = "#f3f0dc"; g.fillRect(Math.round(a[0]) - 1, Math.round(b[1]), 2, Math.round(a[1] - b[1])); }
    polyIso(g, surMurD(4.2, 7.6, 14, 16), "#f3f0dc", ENCRE);
    // les deux photos au-dessus du lit, dans leurs cadres en bois clair
    for (const [j0, j1, z0, z1, img] of [[1.6, 2.7, 30, 42, PHOTO_DUO], [2.9, 3.7, 31, 41, PHOTO_LOLO]]) {
      polyIso(g, surMurG(j0, j1, z0, z1), "#c9a06a", ENCRE);
      const w = Math.round((j1 - j0) * MI.HW) - 2, h = z1 - z0 - 2, [x0, y0] = PI_(0, j0, z1 - 1);
      // la photo, réduite et inclinée comme le mur
      const lignes = img.length, cols = img[0].length;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const ch = img[Math.floor((y / h) * lignes)][Math.floor((x / w) * cols)];
        g.fillStyle = PAL_PHOTO[ch] || "#a8d8ec";
        g.fillRect(Math.round(x0 - x - 1), Math.round(y0 + y + x * (MI.QH / MI.HW) + 1), 1, 1);
      }
    }
    // le tapis bleu, au milieu
    g.save(); g.translate(...PI_(3.9, 5.1)); g.scale(1, 0.5);
    g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.fillStyle = "#3d5ee8"; g.fill(); g.strokeStyle = ENCRE; g.stroke();
    g.beginPath(); g.arc(0, 0, 23, 0, Math.PI * 2); g.strokeStyle = "#7f97f2"; g.stroke();
    g.restore();
    return c;
  }

  // les meubles et les personnages, du fond vers le devant
  function meublesIso(g, t, o) {
    const items = [];
    const ajouter = (prof, f) => items.push([prof, f]);
    // le poêle à bois, tout à gauche, par terre contre le mur bleu, sur ses pieds ; le feu derrière
    // sa vitre, à hauteur de genoux ; son conduit argenté monte jusqu'au plafond et reflète les
    // couleurs de la pièce (le sol magenta en bas, le mur bleu, la lampe) ; quelques bûches à côté
    ajouter(7.6, () => {
      const [cx] = PI_(0.3, 8.6, 0), haut = PI_(0.3, 8.6, MI.MUR)[1], bas = PI_(0.3, 8.6, 16)[1];
      const bandes = ["#6b6578", "#c2cdec", "#f3f0dc", "#ffffff", "#c2cdec", "#8a98cc"];
      for (let y = Math.round(haut); y < Math.round(bas); y++) {
        const u = (y - haut) / (bas - haut);
        bandes.forEach((col, k) => {
          let c2 = col;
          // les reflets : le mur bleu sur le côté, le sol magenta vers le bas, l'éclat de la lampe
          if (k === 0 || k === 5) c2 = u > 0.75 ? "#a8325b" : "#3d5ee8";
          if (k === 1 && u > 0.85) c2 = "#e04bb0";
          if (k === 4 && Math.abs(u - 0.55) < 0.04) c2 = "#ffd23a";
          g.fillStyle = c2; g.fillRect(Math.round(cx) - 3 + k, y, 1, 1);
        });
      }
      g.fillStyle = "#8a98cc"; g.fillRect(Math.round(cx) - 4, Math.round(haut), 8, 2);
      for (const [i, j] of [[0.15, 9.15], [1.0, 9.15], [1.0, 8.15]]) { const [x, y] = PI_(i, j, 0); g.fillStyle = "#2a2540"; g.fillRect(Math.round(x), Math.round(y) - 3, 1, 3); }
      boiteIso(g, 0.1, 8.1, 0.95, 1.05, 14, { dessus: "#4a4560", gauche: "#3a3550", droite: "#2a2540" }, 3);
      const [vx, vy] = PI_(0.35, 9.15, 12);
      g.fillStyle = o.feu ? "#d23a2a" : "#1b1d4a"; g.fillRect(Math.round(vx), Math.round(vy), 8, 6);
      g.fillStyle = "#8a98cc"; g.fillRect(Math.round(vx) - 1, Math.round(vy) - 1, 10, 1);
      if (o.feu) for (let k = 0; k < 3; k++) { const hh = 2 + Math.round(Math.abs(Math.sin(t / (110 + k * 37) + k)) * 4); g.fillStyle = "#ff8f2e"; g.fillRect(Math.round(vx) + 1 + k * 2, Math.round(vy) + 6 - hh, 2, hh); g.fillStyle = "#ffd23a"; g.fillRect(Math.round(vx) + 1 + k * 2, Math.round(vy) + 5, 1, 1); }
      // les bûches, à côté
      for (const [i, j, z] of [[1.3, 8.6, 0], [1.3, 8.95, 0], [1.3, 8.78, 2]]) { const [x, y] = PI_(i, j, z); g.fillStyle = "#7a4520"; g.fillRect(Math.round(x) - 4, Math.round(y) - 3, 8, 3); g.fillStyle = "#e9c99a"; g.fillRect(Math.round(x) - 5, Math.round(y) - 3, 2, 3); }
    });
    if (o.jour) ajouter(0.1, () => soleilIso(g, t, "sol"));
    // le lit contre le mur bleu, la tête sous les photos
    ajouter(4, () => {
      boiteIso(g, 0, 1.3, 3.4, 2.6, 6, { dessus: "#e9b44c", gauche: "#c99a3a", droite: "#b9834f" });
      boiteIso(g, 0, 1.3, 0.3, 2.6, 16, { dessus: "#e9b44c", gauche: "#c99a3a", droite: "#e9b44c" });
      boiteIso(g, 0.3, 1.4, 3.0, 2.4, 3, { dessus: "#f2f0e8", gauche: "#d6d2c0", droite: "#d6d2c0" }, 6);
      boiteIso(g, 0.4, 1.5, 0.85, 1.1, 3, { dessus: "#ffffff", gauche: "#e9e3cd", droite: "#e9e3cd" }, 9);
      boiteIso(g, 0.4, 2.7, 0.85, 1.05, 3, { dessus: "#ffb3a8", gauche: "#e8908a", droite: "#e8908a" }, 9);
      if (!o.dodo) boiteIso(g, 1.45, 1.4, 1.85, 2.4, 2, { dessus: "#3d5ee8", gauche: "#2f4bc8", droite: "#2f4bc8" }, 9);
    });
    // la table de chevet et sa lampe
    ajouter(5.2, () => {
      boiteIso(g, 0.1, 4.05, 0.9, 0.8, 10, { dessus: "#e9b44c", gauche: "#c99a3a", droite: "#b9834f" });
      const [x, y] = PI_(0.55, 4.45, 10);
      g.fillStyle = ENCRE; g.fillRect(Math.round(x), Math.round(y) - 7, 1, 7);
      polyIso(g, [[x - 4, y - 7], [x + 4, y - 7], [x + 3, y - 12], [x - 3, y - 12]], o.lampes ? "#fff06a" : "#e9e3cd", ENCRE);
    });
    // le canapé corail sous la baie
    ajouter(5.6, () => {
      boiteIso(g, 4.4, 0.1, 3.0, 1.3, 7, { dessus: "#ff7b6b", gauche: "#ff5b4f", droite: "#d23a2a" });
      boiteIso(g, 4.4, 0.1, 3.0, 0.4, 15, { dessus: "#ff5b4f", gauche: "#e04a3f", droite: "#d23a2a" });
      boiteIso(g, 4.4, 0.1, 0.35, 1.3, 11, { dessus: "#ff5b4f", gauche: "#e04a3f", droite: "#d23a2a" });
      boiteIso(g, 7.05, 0.1, 0.35, 1.3, 11, { dessus: "#ff5b4f", gauche: "#e04a3f", droite: "#d23a2a" });
      boiteIso(g, 4.9, 0.55, 0.8, 0.3, 6, { dessus: "#ffd23a", gauche: "#e9b44c", droite: "#c99a3a" }, 7);
      boiteIso(g, 6.1, 0.55, 0.8, 0.3, 6, { dessus: "#f2f0e8", gauche: "#d6d2c0", droite: "#c9c4b0" }, 7);
      if (o.jour) soleilIso(g, t, "canape");
    });
    // les deux chaises de la table, derrière ƟvƟ et Mesi
    for (const [i, j, prof] of [[4.3, 4.0, 8.4], [7.35, 4.0, 11.2]]) ajouter(prof, () => {
      boiteIso(g, i, j, 0.55, 0.55, 1.5, { dessus: "#3d5ee8", gauche: "#2f4bc8", droite: "#23214a" }, 8);
      for (const [di, dj] of [[0, 0.55], [0.55, 0.55], [0.55, 0]]) { const [x, y] = PI_(i + di, j + dj, 0); g.fillStyle = "#2f4bc8"; g.fillRect(Math.round(x), Math.round(y) - 8, 1, 8); }
      boiteIso(g, i, j, 0.12, 0.55, 12, { dessus: "#3d5ee8", gauche: "#2f4bc8", droite: "#23214a" }, 9.5);
    });
    // la plante dans son grand pot, dans le coin de la baie
    ajouter(7.8, () => {
      boiteIso(g, 7.45, 0.2, 0.45, 0.45, 8, { dessus: "#7a4520", gauche: "#c96a3a", droite: "#9a4a2a" });
      const [x, y] = PI_(7.68, 0.42, 8);
      for (const [dx, dy, l] of [[-6, -10, 9], [5, -12, 10], [0, -16, 12], [-3, -14, 8], [7, -6, 7]]) { g.strokeStyle = l > 9 ? "#2f7a3e" : "#4f9a46"; g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + dx * 0.4, y + dy * 0.8, x + dx, y + dy); g.stroke(); }
    });
    // la table du goûter et ses deux chaises
    ajouter(9.4, () => {
      boiteIso(g, 5.2, 3.6, 2.0, 1.4, 1.5, { dessus: "#e9b44c", gauche: "#c99a3a", droite: "#b9834f" }, 11);
      for (const [i, j] of [[5.3, 4.85], [7.05, 4.85], [7.05, 3.7]]) { const [x, y] = PI_(i, j, 0); g.fillStyle = "#b9834f"; g.fillRect(Math.round(x), Math.round(y) - 11, 2, 11); }
      // deux tasses et une assiette de crêpes
      for (const [i, j, col] of [[5.7, 4.0, "#f3f0dc"], [6.7, 4.6, "#f3f0dc"]]) { const [x, y] = PI_(i, j, 12.5); g.fillStyle = col; g.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 3); g.fillStyle = ENCRE; g.fillRect(Math.round(x) - 1, Math.round(y) - 3, 3, 1); }
      const [ax, ay] = PI_(6.2, 4.3, 12.5); g.fillStyle = "#f3f0dc"; g.fillRect(Math.round(ax) - 4, Math.round(ay) - 1, 8, 2); g.fillStyle = "#c96a3a"; g.fillRect(Math.round(ax) - 3, Math.round(ay) - 2, 6, 1); g.fillStyle = "#4b3427"; g.fillRect(Math.round(ax) - 1, Math.round(ay) - 2, 2, 1);
    });
    // les personnages
    // (chaque personnage garde de quoi se redessiner : la nuit, on le découpe dans l'ombre pour que
    // les visages restent en couleurs)
    o.persos = [];
    const garder = (f) => { f(g); o.persos.push(f); };
    const perso = (prof, nom, i, j, image, miroir, z) => ajouter(prof, () => { const [x, y] = PI_(i, j, z || 0); garder((gg) => H.pixel.dessiner(gg, nom, x, y, 1, image, miroir)); o.boites[nom] = [x - 9, y - 26, x + 9, y]; });
    if (o.dodo) {
      // ƟvƟ et Mesi en cuillère, couché·es sur le côté : Mesi derrière (contre le mur), ƟvƟ devant.
      // Les têtes sur les oreillers, les épaules qui dépassent de la couverture, et le bras de Mesi
      // posé sur ƟvƟ. La couverture se bombe sur leurs deux corps et se soulève doucement.
      ajouter(4.5, () => {
        const sf = Math.sin(t / 1300);
        const dormeur = (nom, i, j) => {
          const s2 = H.pixel.sprite(nom, 0), [x, y] = PI_(i, j, 12), X = Math.round(x), Y = Math.round(y);
          garder((gg) => {
            gg.imageSmoothingEnabled = false;
            // les épaules (le haut du corps), en biais vers le pied du lit, puis la tête par-dessus
            gg.drawImage(s2, 0, 12, 16, 6, X - 3, Y, 16, 6);
            gg.drawImage(s2, 0, 0, 16, 12, X - 8, Y - 10, 16, 12);
            gg.fillStyle = H.pixel.PAL.s; gg.fillRect(X - 2, Y - 4, 2, 1); gg.fillRect(X + 1, Y - 4, 2, 1);
          });
        };
        const couverture = (j0, j1, col, lever) => {
          const pts = [];
          for (let u = 1.2; u <= 3.3; u += 0.1) { const bosse = Math.max(0, Math.sin((u - 1.2) * 2.6)) * 4 + Math.max(0, Math.sin((u - 1.6) * 1.6)) * 3 + (u < 2.1 ? lever : 0); pts.push(PI_(u, j0, 9 + bosse)); }
          for (let u = 3.3; u >= 1.2; u -= 0.1) pts.push(PI_(u, j1, 9));
          polyIso(g, pts, col, ENCRE);
        };
        dormeur("luigi", 0.85, 2.15);
        couverture(1.5, 2.6, "#3a3aa8", sf * 0.5);
        dormeur("ovo", 0.95, 3.0);
        couverture(2.5, 3.75, "#3d5ee8", sf * 0.7);
        // le revers clair de la couverture, sous les mentons
        polyIso(g, [PI_(1.2, 1.5, 11), PI_(1.2, 3.75, 11), PI_(1.35, 3.75, 11), PI_(1.35, 1.5, 11)], "#f3f0dc");
        // le bras de Mesi, par-dessus la couverture, autour d'ƟvƟ
        const s2 = H.pixel.sprite("luigi", 0), manche = s2.getContext("2d").getImageData(3, 14, 1, 1).data;
        const [ax, ay] = PI_(1.3, 2.35, 15), [bx, by] = PI_(1.55, 3.25, 15);
        garder((gg) => {
          gg.strokeStyle = "rgb(" + manche[0] + "," + manche[1] + "," + manche[2] + ")"; gg.lineWidth = 2;
          gg.beginPath(); gg.moveTo(ax, ay); gg.quadraticCurveTo((ax + bx) / 2, Math.min(ay, by) - 3, bx, by); gg.stroke();
          gg.fillStyle = H.pixel.PAL.s; gg.fillRect(Math.round(bx) - 1, Math.round(by) - 1, 3, 2);
        });
      });
      ajouter(4.6, () => { const [x, y] = PI_(2.95, 2.3, 9); g.save(); g.translate(x, y); g.scale(0.55, 0.55); H.pixel.dessiner(g, "lolo", 0, 0, 1, 0); g.restore(); });
      ajouter(4.65, () => { const [x, y] = PI_(2.6, 3.2, 12); H.pixel.dessiner(g, "memePas", x, y, 0.7, 0); });
    } else {
      ajouter(4.6, () => { const [x, y] = PI_(2.4, 2.3, 9), im = Math.floor(t / 900) % 2; garder((gg) => { gg.save(); gg.translate(x, y); gg.scale(0.6, 0.6); H.pixel.dessiner(gg, "lolo", 0, 0, 1, im); gg.restore(); }); o.boites.lolo = [x - 12, y - 18, x + 12, y]; });
      ajouter(4.7, () => { const [x, y] = PI_(1.9, 3.3, 9); garder((gg) => H.pixel.dessiner(gg, "memePas", x, y, 0.8, 0)); o.boites.meme = [x - 6, y - 8, x + 6, y]; });
      if (o.canape) { perso(6.5, "ovo", 5.3, 0.95, 0, false, 7); perso(7.5, "luigi", 6.6, 0.95, 0, true, 7); }
      else { perso(8.8, "ovo", 4.75, 4.3, 0); perso(11.6, "luigi", 7.75, 4.3, 0, true); }
    }
    items.sort((a, b) => a[0] - b[0]).forEach(([, f]) => f());
    // la boule orange au bout de son fil de cuivre, au-dessus de la table
    const [bx, by] = PI_(6.2, 4.3, 27);
    g.fillStyle = "#c87533"; g.fillRect(Math.round(bx), 0, 1, Math.round(by) - 5);
    g.beginPath(); g.arc(Math.round(bx), Math.round(by), 5, 0, Math.PI * 2); g.fillStyle = o.lampes ? "#ff8f2e" : "#9a4a20"; g.fill(); g.strokeStyle = ENCRE; g.stroke();
    if (o.lampes) { g.fillStyle = "#ffc46b"; g.fillRect(Math.round(bx) - 2, Math.round(by) - 3, 2, 2); }
  }

  // Le soleil de la baie : trois taches (une par vitre) avec l'ombre des feuilles qui bougent.
  // « sol » : sur le sol, avant les meubles (les chaises et les personnages passent devant) ;
  // « canape » : sur l'assise et le dossier du canapé, posé juste après lui
  function soleilIso(g, t, ou) {
    const etat = H.ciel.etat(), m = H.ciel.meteo || {}, force = Math.max(0, 1 - (m.nuages || 0) / 110) * Math.min(1, etat.soleil.alt / 12);
    if (force <= 0.1) return;
    const lum = "rgba(255,236,180," + 0.55 * force + ")", vent = Math.sin(t / 2100) * 0.2;
    for (let k = 0; k < 3; k++) {
      const i0 = 4.4 + k * 1.05, i1 = i0 + 0.95;
      if (ou === "sol") polyIso(g, [PI_(i0 - 0.15, 1.4), PI_(i1 - 0.15, 1.4), PI_(i1 - 0.45, 3.1), PI_(i0 - 0.45, 3.1)], lum);
      else {
        polyIso(g, [PI_(i0, 0.5, 15), PI_(i1, 0.5, 15), PI_(i1 - 0.05, 1.3, 7), PI_(i0 - 0.05, 1.3, 7)], lum);
        polyIso(g, [PI_(i0, 0.12, 15), PI_(i1, 0.12, 15), PI_(i1, 0.5, 15), PI_(i0, 0.5, 15)], lum);
      }
    }
    g.fillStyle = "rgba(60,40,90," + 0.32 * force + ")";
    for (let k = 0; k < 9; k++) {
      const [x, y] = ou === "sol" ? PI_(4.4 + ((k * 0.37) % 3) + vent, 1.6 + ((k * 0.61) % 1.3)) : PI_(4.6 + ((k * 0.41) % 2.8) + vent, 0.6 + ((k * 0.29) % 0.6), 10);
      g.beginPath(); g.ellipse(x, y, 3, 1.5, 0, 0, Math.PI * 2); g.fill();
    }
  }

  // le dehors, dans la baie : le ciel du moment, des arbres au loin et un pin tout près
  function dehorsIso(g, t, moment) {
    const ciel = { jour: ["#6fb6ee", "#a8d8ec"], soir: ["#5b3c8f", "#ff8f2e"], nuit: ["#15124a", "#232a63"] }[moment];
    g.save();
    polyIso(g, surMurD(4.3, 7.5, 16, 52), ciel[0]);
    g.clip();
    for (let z = 16; z < 34; z++) { const [a] = [PI_(4.3, 0, z)]; g.fillStyle = ciel[1]; g.globalAlpha = (34 - z) / 18; g.fillRect(a[0], a[1] - 60, 60, 1); }
    g.globalAlpha = 1;
    // des collines et des arbres sombres au loin, un pin parasol devant
    for (let k = 0; k < 7; k++) { const [x, y] = PI_(4.3 + k * 0.5, 0, 20 + (k % 3) * 2); g.fillStyle = moment === "nuit" ? "#10241d" : "#2f6b35"; g.beginPath(); g.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2); g.fill(); }
    const vent = Math.sin(t / 1800) * 1.5, [px, py] = PI_(6.6, 0, 16);
    g.fillStyle = moment === "nuit" ? "#0e1030" : "#4b3427"; g.fillRect(Math.round(px), Math.round(py) - 26, 2, 26);
    g.fillStyle = moment === "nuit" ? "#0e1030" : "#3f8a42"; g.beginPath(); g.ellipse(px + vent, py - 28, 12, 4, 0, 0, Math.PI * 2); g.fill();
    if (moment === "nuit") for (let k = 0; k < 6; k++) { const [x, y] = PI_(4.5 + k * 0.5, 0, 44 + (k * 7) % 6); if (Math.sin(t / 700 + k) > 0) { g.fillStyle = "#f3f0dc"; g.fillRect(Math.round(x), Math.round(y), 1, 1); } }
    g.restore();
  }

  // la lumière : le soir et la nuit, la pièce s'assombrit sauf près des lampes et du feu ; le
  // jour, le soleil entre par la baie et se pose sur le sol ; pour dormir, la lune, douce et bleue
  function lumiereIso(g, t, moment, o) {
    if (moment === "jour" && !o.dodo) return; // (le soleil est posé avec les meubles, voir soleilIso)
    // l'ombre, avec des trous de lumière (lampes, feu)
    const sombre = document.createElement("canvas");
    sombre.width = MI.L; sombre.height = MI.H;
    const s = sombre.getContext("2d");
    s.fillStyle = o.dodo ? "rgba(20,18,70,0.6)" : moment === "nuit" ? "rgba(35,30,110,0.5)" : "rgba(50,40,120,0.3)";
    s.fillRect(0, 0, MI.L, MI.H);
    s.globalCompositeOperation = "destination-out";
    const trou = (x, y, rx, ry, a) => { s.save(); s.translate(x, y); s.scale(1, ry / rx); const d = s.createRadialGradient(0, 0, 0, 0, 0, rx); d.addColorStop(0, "rgba(0,0,0," + a + ")"); d.addColorStop(1, "rgba(0,0,0,0)"); s.fillStyle = d; s.beginPath(); s.arc(0, 0, rx, 0, Math.PI * 2); s.fill(); s.restore(); };
    if (o.lampes) { trou(...PI_(0.6, 4.4, 12), 44, 30, 1); trou(...PI_(6.2, 4.3, 18), 50, 32, 1); }
    if (o.feu) trou(...PI_(0.9, 9.2, 6), 36 + Math.sin(t / 130) * 2, 24, 0.95);
    // les personnages restent en couleurs : on les découpe presque entièrement dans l'ombre (il
    // leur reste juste un léger voile de nuit)
    s.globalAlpha = 0.8;
    for (const f of o.persos || []) f(s);
    s.globalAlpha = 1;
    g.drawImage(sombre, 0, 0);
    // la lune par la baie, sur le sol, très douce et bleutée
    if (o.dodo || moment === "nuit") for (let k = 0; k < 3; k++) { const i0 = 4.4 + k * 1.05; polyIso(g, [PI_(i0, 0.1), PI_(i0 + 0.95, 0.1), PI_(i0 + 0.45, 3), PI_(i0 - 0.5, 3)], "rgba(150,185,245,0.12)"); }
  }

  function sceneMaisonIso(toile, dodo) {
    const ctx = toile.getContext("2d"), nuit = H.ciel.nuitCalme();
    const base = dodo ? [] : zonesMaison(nuit), parId = Object.fromEntries(base.map((z) => [z.id, z]));
    const petite = document.createElement("canvas");
    petite.width = MI.L; petite.height = MI.H;
    const g = petite.getContext("2d");
    let decor = null, cle = "", survol = null, derniere = 0, pointeur = "mouse", prochainRonflement = performance.now() + 8000;
    const o = { boites: {} };
    // ce qu'on peut toucher, en petits pixels : le meuble ou le personnage sous le doigt
    const zones = () => {
      const z = [];
      const rect = (id, x0, y0, x1, y1) => parId[id] && z.push(Object.assign({}, parId[id], { r: [x0, y0, x1, y1] }));
      const bbox = (pts) => [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
      for (const id of ["ovo", "luigi", "lolo", "meme"]) if (o.boites[id]) rect(id === "luigi" ? "mesi" : id, ...o.boites[id]);
      rect("poele", ...bbox([PI_(0.1, 9.15, 0), PI_(1.05, 8.1, 0), PI_(0.3, 8.6, MI.MUR)]));
      rect("table", ...bbox([PI_(5.2, 5, 12), PI_(7.2, 3.6, 12), PI_(7.2, 5, 0)]));
      rect("fenetre", ...bbox(surMurD(4.3, 7.5, 16, 52)));
      rect("canape", ...bbox([PI_(4.4, 1.4, 0), PI_(7.4, 0.1, 15), PI_(7.4, 1.4, 0)]));
      rect("lit", ...bbox([PI_(0, 3.9, 0), PI_(3.4, 1.3, 16), PI_(3.4, 3.9, 0)]));
      return z;
    };
    const versPetit = (e) => { const r = toile.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * MI.L, ((e.clientY - r.top) / r.height) * MI.H]; };
    const zoneSous = (e) => { const [x, y] = versPetit(e); return zones().find((z) => x >= z.r[0] && x <= z.r[2] && y >= z.r[1] && y <= z.r[3]) || null; };
    toile.addEventListener("pointermove", (e) => { if (e.pointerType !== "mouse") return; survol = zoneSous(e); toile.style.cursor = survol ? "pointer" : "default"; });
    toile.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") survol = null; });
    toile.addEventListener("pointerdown", (e) => (pointeur = e.pointerType));
    toile.addEventListener("click", (e) => {
      if (dodo) return;
      const z = zoneSous(e);
      if (!z || H.$(".dialogue")) return;
      if (pointeur !== "mouse" && (!survol || survol.id !== z.id)) { survol = z; return; }
      survol = null;
      z.agir();
    });
    function image(t) {
      if (!document.body.contains(toile)) return;
      requestAnimationFrame(image);
      if (t - derniere < H.cadence(66)) return;
      derniere = t;
      const moment = dodo ? "nuit" : momentMaison();
      if (cle !== moment + (dodo ? "d" : "")) { cle = moment + (dodo ? "d" : ""); decor = decorIso(moment, dodo); }
      Object.assign(o, { dodo, jour: !dodo && moment === "jour", lampes: !dodo, feu: H.cheminee && H.cheminee.feuActif(), canape: !dodo && canapeJusqua > t });
      g.clearRect(0, 0, MI.L, MI.H);
      dehorsIso(g, t, moment);
      g.drawImage(decor, 0, 0);
      meublesIso(g, t, o);
      lumiereIso(g, t, moment, o);
      // à l'écran : agrandi sans flou, aux couleurs des pochettes
      const w = toile.clientWidth || 600, dpr = Math.min(3, window.devicePixelRatio || 1), h = Math.round((w * MI.H) / MI.L);
      if (toile.width !== Math.round(w * dpr)) { toile.width = Math.round(w * dpr); toile.height = Math.round(h * dpr); }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, toile.width, toile.height);
      ctx.drawImage(petite, 0, 0, toile.width, toile.height);
      H.retro.appliquer(toile, Math.max(2, Math.round(toile.width / MI.L)), 0.15);
      // le nom de ce qu'on survole
      if (survol) {
        const k = toile.width / MI.L, [x0, y0, x1] = survol.r;
        ctx.font = Math.round(13 * dpr) + "px 'Suez One', serif";
        const tw = ctx.measureText(survol.nom).width, x = Math.max(4, Math.min(toile.width - tw - 12, ((x0 + x1) / 2) * k - tw / 2)), y = Math.max(18 * dpr, y0 * k - 6 * dpr);
        ctx.fillStyle = "#23214a"; ctx.fillRect(x - 6, y - 15 * dpr, tw + 12, 20 * dpr);
        ctx.fillStyle = "#f3f0dc"; ctx.fillText(survol.nom, x, y);
      }
      // pour dormir : Mémé ronfle de temps en temps
      if (dodo && t > prochainRonflement) { prochainRonflement = t + 12000 + Math.random() * 16000; ronflement(); }
    }
    requestAnimationFrame(image);
  }

  H.vues.maison = {
    afficher(c) {
      c.appendChild(H.el("div.page-maison", null,
        (toileMaison = H.el("canvas.scene-maison", { role: "img", "aria-label": "L’intérieur du mazet : le lit, le canapé sous la fenêtre, la table, Mesi, Lóló et Mémé" })),
        H.el("a.sortie-maison", { href: "#village", "aria-label": "Retour à la ferme", title: "Retour à la ferme" }, "‹ Ferme")
      ));
      sceneMaison(toileMaison);
      // le jour de l'anniversaire d'ƟvƟ, une fois : une coupe de champagne
      if (H.champagne && H.champagne.anniversaire() && H.local.champagneOffert !== new Date().toDateString()) {
        setTimeout(async () => {
          if (!toileMaison || !document.body.contains(toileMaison) || H.$(".dialogue")) return;
          H.d.majLocal((l) => (l.champagneOffert = new Date().toDateString()));
          const q = await H.dialogue.dire([{ qui: "luigi", texte: "Joyeux anniversaire, mon cœur ! J’ai mis une bouteille au frais… une coupe de champagne ?", choix: [{ valeur: "oui", libelle: "Oh oui !" }, { valeur: null, libelle: "Non merci" }] }]);
          if (q !== "oui") return H.dialogue.dire([{ qui: "luigi", texte: "Alors je garde la bouteille pour ce soir." }]);
          H.champagne.boire();
          await H.dialogue.dire([{ qui: "ovo", texte: "Santé ! Les bulles me chatouillent le nez." }, { qui: "luigi", texte: "Doucement, hein… les bulles, ça monte vite à la tête !" }]);
        }, 1800);
      }
    },
  };

  // --- la balade --------------------------------------------------------------------------
  let balade = null;

  // La balade façon pochette de disque : aplats aux formes arrondies, ciel en dégradé,
  // grain de risographie. De jour, le calcaire blanc, la mer turquoise et les pins parasols ;
  // de nuit, des collines sombres sous un ciel violet et la vraie lune.
  function scene(toile, compagnons) {
    const ctx = toile.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = toile.clientWidth || 600;
    const h = window.innerWidth < 640 ? 300 : 360;
    // sur un écran en hauteur (téléphone), le paysage garde ses proportions : on ajoute du ciel
    // au-dessus et de la garrigue au premier plan, au lieu de laisser du vide
    const portrait = window.innerHeight > window.innerWidth * 1.15;
    const Htot = portrait ? Math.max(h, Math.min(window.innerHeight - 30, Math.round(w * 2))) : h;
    const haut = Math.round((Htot - h) * 0.55), bas = Htot - h - haut;
    toile.width = Math.round(w * dpr);
    toile.height = Math.round(Htot * dpr);
    toile.style.height = Htot + "px";
    const nuit = H.ciel.etat().soleil.alt < -4;
    const rEt = H.alea("etoiles-balade");
    const etoiles = Array.from({ length: 70 + Math.round(haut / 3) }, () => [rEt() * w, rEt() * rEt() * (h * 0.5 + haut) - haut, rEt() * 0.6 + 0.35]);
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
      ctx, dpr, w, h, haut, bas, Htot, nuit, etoiles, arbres, devant, grain,
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
    return profilY;
  }
  // Les calanques au loin, comme à la ferme et sur les affiches de Cassis : un cap bleui par l'air
  // qui finit en falaise dans la mer, puis des massifs de calcaire clair, coiffés de pins, avec des
  // plaques de garrigue sur les pentes ; l'ombre est bleu lilas.
  const hasardX = (n) => { const v = Math.sin(n * 12.9898) * 43758.5453; return v - Math.floor(v); };
  function calanquesBalade(ctx, w, base, haut, decal, valeurs, air, nuit, ici) {
    const C = nuit
      ? { loin: "#2e3270", clair: "#4a4a82", ombre: "#2a2c6a", pins: ["#1e3d35", "#173a26", "#10241d"], tronc: "#2a1d1b" }
      : { loin: brume("#94a6d2", 0.35, air), clair: brume(melange("#efe8d4", "#d98a5c", ici), 0.3, air), ombre: brume(melange("#a7b0d0", "#b0583a", ici), 0.3, air), pins: [brume("#6cbd5c", 0.22, air), brume("#3f8a42", 0.22, air), brume("#2f6b35", 0.22, air)], tronc: brume("#7a4520", 0.3, air) };
    // Par endroits, on ne voit plus l'autre côté de la baie : le chemin longe le large, et la mer
    // rejoint le ciel. Les falaises s'y abaissent en pente douce, comme la fin d'un cap.
    const terre = (x) => Math.max(0, Math.min(1, (Math.sin((x + decal * 4) / 300) + Math.sin((x + decal * 4) / 760 + 1.7) * 0.6 + 0.3) * 1.6));
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, base + 3);
    for (let x = 0; x <= w + 4; x += 4) ctx.lineTo(x, base + 3 - (haut * 1.6 + 20) * terre(x));
    ctx.lineTo(w + 4, base + 3);
    ctx.closePath();
    ctx.clip();
    // le cap lointain, qui glisse très lentement
    const periode = w * 2.2, x0 = ((w * 0.5 - decal * 0.4) % periode + periode) % periode - w * 0.3, L = w * 0.55;
    ctx.fillStyle = C.loin;
    ctx.beginPath();
    ctx.moveTo(x0, base);
    for (let k = 0; k <= 30; k++) { const u = k / 30; ctx.lineTo(x0 + u * L, base - haut * 0.95 * Math.pow(u, 0.75) - Math.sin(u * 9) * 2); }
    ctx.lineTo(x0 + L + haut * 0.35, base);
    ctx.closePath();
    ctx.fill();
    // les massifs, avec leur face d'ombre
    const profil = falaisesPlates(ctx, w, base, haut, decal, valeurs, C.clair, C.ombre, 110);
    // des plaques de garrigue accrochées aux pentes
    for (let x = 0; x < w; x += 6) {
      const wx = Math.floor((x + decal) / 6), y = profil(x);
      if (hasardX(wx) < 0.22) {
        const yy = y + 6 + hasardX(wx + 7) * (base - y - 10);
        ctx.fillStyle = C.pins[hasardX(wx + 3) < 0.5 ? 1 : 2];
        ctx.fillRect(x, yy, 6 + hasardX(wx + 5) * 6, 3);
      }
    }
    // les pins qui coiffent les sommets, et çà et là un pin parasol qui dépasse
    for (let x = 0; x < w; x += 3) {
      const y = profil(x), pente = Math.abs(profil(x + 4) - profil(x - 4));
      if (pente > 7) continue;
      const wx = Math.floor((x + decal) / 3), ep = 2 + hasardX(wx) * 4;
      ctx.fillStyle = C.pins[1]; ctx.fillRect(x, y - 1, 3, ep);
      ctx.fillStyle = C.pins[0]; ctx.fillRect(x, y - 1, 3, 1.5);
      if (hasardX(wx + 11) < 0.04) {
        ctx.fillStyle = C.tronc; ctx.fillRect(x + 1, y - 8, 1.5, 8);
        ctx.fillStyle = C.pins[1]; ctx.fillRect(x - 6, y - 11, 15, 3);
        ctx.fillStyle = C.pins[0]; ctx.fillRect(x - 4, y - 13, 11, 2);
      }
    }
    ctx.restore();
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
    // un pin sur trois environ pousse en Y : le tronc se sépare en deux, et la couronne aussi
    if (Math.round(t) % 3 === 0) return pinEnY(ctx, x, base, t, couleur, dessous, tronc);
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
  function pinEnY(ctx, x, base, t, couleur, dessous, tronc) {
    ctx.strokeStyle = tronc;
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2.5, t * 0.05);
    const fx = x + t * 0.04, fy = base - t * 0.42;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + t * 0.08, base - t * 0.22, fx, fy); ctx.stroke();
    ctx.lineWidth = Math.max(2, t * 0.035);
    const couronnes = [[x - t * 0.3, base - t * 0.84, 0.3], [x + t * 0.34, base - t * 0.92, 0.34]];
    for (const [cx, cy] of couronnes) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo((fx + cx) / 2 + (cx - fx) * 0.1, cy + t * 0.2, cx, cy + t * 0.02); ctx.stroke(); }
    for (const [cx, cy, l] of couronnes) {
      ctx.fillStyle = dessous;
      ctx.beginPath(); ctx.ellipse(cx, cy + t * 0.03, t * l, t * 0.06, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = couleur;
      ctx.beginPath();
      ctx.moveTo(cx - t * l, cy + t * 0.02);
      for (const [dx, ry] of [[-0.55, 0.08], [-0.15, 0.11], [0.3, 0.09]]) ctx.ellipse(cx + dx * t * l, cy, t * l * 0.42, ry * t, 0, Math.PI, 0);
      ctx.lineTo(cx + t * l, cy + t * 0.02);
      ctx.closePath();
      ctx.fill();
    }
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

  const TELEPHONE = window.matchMedia && matchMedia("(pointer: coarse)").matches;
  function dessinerBalade() {
    const b = balade;
    if (!b) return;
    const S = b.s, { ctx, dpr, w, h } = S;
    const t = performance.now();
    // sur téléphone, une image sur deux suffit : le filtre en gros pixels coûte cher
    if (S.derniere && t - S.derniere < H.cadence(TELEPHONE ? 30 : 0)) {
      b.anim = requestAnimationFrame(dessinerBalade);
      return;
    }
    const dt = Math.min(Math.max(0.1, H.ips() ? 1.5 / H.ips() : 0.1), (t - S.derniere) / 1000);
    S.derniere = t;
    if (!b.pause) S.decalage += dt * 40;
    const avance = S.decalage;
    const etat = H.ciel.etat();
    const alt = etat.soleil.alt;
    const nuit = alt < -4;
    const ici = rouge(avance);
    const haut = S.haut || 0, bas = S.bas || 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, dpr * haut);
    // le ciel : bleu franc le jour, les vraies couleurs de l'aube et du couchant, violet la nuit
    const g = ctx.createLinearGradient(0, -haut, 0, h * 0.6);
    if (nuit) {
      g.addColorStop(0, "#15124a"); g.addColorStop(0.55, "#3a3aa8"); g.addColorStop(0.85, "#8a58cc"); g.addColorStop(1, "#d07ab8");
    } else if (alt > 8) {
      g.addColorStop(0, "#2f8fe0"); g.addColorStop(1, "#a9dcf7");
    } else {
      const teinte = H.ciel.teinteCiel(alt, H.ciel.estMatin ? H.ciel.estMatin() : undefined);
      g.addColorStop(0, teinte.haut); g.addColorStop(1, teinte.bas);
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, -haut, w, h + haut);
    if (nuit) {
      // (des étoiles posées sur les gros pixels, qui ne clignotent pas : seule une sur huit scintille,
      // lentement ; avant, toutes vacillaient et le passage en gros pixels les faisait clignoter)
      S.etoiles.forEach(([x, y, a], i) => {
        const scintille = i % 8 === 0 ? (Math.sin(t / 2600 + i) > 0.6 ? 0.25 : 0) : 0;
        ctx.fillStyle = "rgba(255,240,250," + Math.min(1, a + scintille) + ")";
        ctx.fillRect(Math.round(x), Math.round(y), 2, 2);
      });
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
        ctx.fillRect(0, -haut, w, h * 0.6 + haut);
      }
      S.profils.nuages.forEach((v, i) => {
        if (i >= S.couvert.n * 2) return;
        nuagePlat(ctx, boucler(i * 170 + v * 90 - avance * 0.12 - (t / 1000) * 5, w, 120), h * (0.08 + v * 0.22), 50 + v * 50, S.couvert.couleur);
      });
    }
    // au loin : les falaises de calcaire (rouges en terre rouge), ou des collines la nuit ;
    // bleuies par l'air qui les sépare de nous
    const air = nuit ? "#3a3aa8" : alt > 8 ? "#9fcdf0" : H.ciel.teinteCiel(alt, H.ciel.estMatin ? H.ciel.estMatin() : undefined).bas;
    calanquesBalade(ctx, w, h * 0.58, h * 0.24, avance * 0.1, S.profils.falaises, air, nuit, ici);
    // la mer
    // claire et lisse vers l'horizon, plus profonde et plus détaillée en s'approchant
    const gm = ctx.createLinearGradient(0, h * 0.58, 0, h * 0.72);
    (nuit ? ["#3a3aa8", "#26406a", "#1e3358"] : [brume("#d6eef7", 0.2, air), "#6fb6ee", melange("#12aec4", "#19c1c7", ici), "#0d8fae"]).forEach((c2, k, l) => gm.addColorStop(k / (l.length - 1), c2));
    ctx.fillStyle = gm;
    ctx.fillRect(0, h * 0.58, w, h * 0.14);
    for (let i = 0; i < 18; i++) {
      const u = 0.15 + (i % 6) / 6 * 0.85, y = h * (0.585 + u * 0.13);
      ctx.fillStyle = nuit ? "rgba(168,216,236," + (0.2 + u * 0.4) + ")" : "rgba(255,255,255," + (0.3 + u * 0.55) + ")";
      ctx.fillRect(boucler(i * 97 - avance * (0.2 + u * 0.3), w, 40), y, 4 + u * 22, 1 + u);
    }
    // la baignade se passe dans la mer : derrière les rochers, le chemin et la garrigue
    if (b.baignade) dessinerBaignade(ctx, b, t, w, h);
    // au pied des falaises : une grande paroi de calcaire qui monte juste derrière le chemin
    const f0 = falaises(avance);
    if (f0 > 0.01 && !nuit) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, f0 * 1.4);
      falaisesPlates(ctx, w, h * 0.76, h * 0.62, avance * 0.7, S.profils.falaises, brume("#efe8d4", 0.1, air), brume("#a7b0d0", 0.12, air), 140);
      ctx.restore();
    }
    // les rochers du rivage : calcaire blanc, ou rouges dans la terre rouge
    if (nuit) collinesPlates(ctx, w, h * 0.73, h * 0.08, avance * 0.55, S.profils.collines2, "#22443c", 110);
    else falaisesPlates(ctx, w, h * 0.73, h * 0.13, avance * 0.6, S.profils.rochers, brume(melange("#efe8d4", "#c9643f", ici), 0.14, air), brume(melange("#a7b0d0", "#9a4527", ici), 0.16, air), 70);
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
    if (avec("meme") && !avec("lolo") && !b.baignade) H.pixel.dessiner(ctx, "memePas", w * 0.5, sol(w * 0.5) - h * 0.055, 3.1, b.pause ? 0 : Math.floor(t / 200) % 2);
    // Mémé n'aime pas l'eau : pendant la baignade, elle dort en boule sur la plage
    // sortis de l'eau : sur la plage, enroulé·es dans une serviette, on se frotte les cheveux
    if (b.baignade && b.sortieEau && t - b.sortieEau >= SORTIE_EAU) {
      const frotte = Math.floor(t / 260) % 2;
      H.pixel.dessiner(ctx, "ovoServiette", w * 0.36, sol(w * 0.36) - h * 0.055, 3, frotte, false);
      if (avec("luigi")) H.pixel.dessiner(ctx, "luigiServiette", w * 0.43, sol(w * 0.43) - h * 0.055, 3, 1 - frotte, true);
    }
    if (avec("meme") && !avec("lolo") && b.baignade) {
      ctx.save();
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = "#23214a"; ctx.lineWidth = 1.6;
      memeEnBoule(ctx, w * 0.5, sol(w * 0.5) - 10, t, 2.8);
      ctx.restore();
    }
    if (!b.baignade) {
      if (avec("luigi")) H.pixel.dessiner(ctx, "luigiProfil", w * 0.33, sol(w * 0.33) - h * 0.055, 3, pas(2));
      H.pixel.dessiner(ctx, "ovoProfil", w * 0.42, sol(w * 0.42) - h * 0.06, 3, pas(0));
    }
    // devant : l'autre bord du chemin, et parfois un grand pin qui passe tout près
    for (let i = 0; i < 12; i++) buissonPlat(ctx, boucler(i * 110 - avance * 1.25, w, 60), h + 4, 22 + (i % 3) * 8, nuit ? "#10241a" : i % 2 ? "#2f8a3e" : "#3fa04a");
    poses(S.devant, b, 1.3, (x, taille) => pinPlat(ctx, x, h * 1.04, taille, nuit ? "#0f2218" : "#1f6b34", nuit ? "#0b1a12" : "#134a24", nuit ? "#0f2218" : "#4a2e20"));
    // On peut aller se baigner quand le chemin longe la crique aux rochers rouges. En y arrivant,
    // on s'arrête (même si quelqu'un est en train de raconter une histoire) ; une fois la bulle
    // fermée, on attend un moment devant la crique avant de repartir. S'il fait froid, ƟvƟ le dit.
    const parle = !!H.$(".dialogue");
    if (ici > 0.6 && !b.baignade && !b.criqueVue) { b.criqueVue = true; b.attenteCrique = true; b.criqueDepuis = 0; b.pause = true; }
    if (ici < 0.2 && !b.baignade) b.criqueVue = false;
    if (b.attenteCrique && !b.baignade && !parle) {
      if (!b.criqueDepuis) {
        b.criqueDepuis = t;
        if (cheminee.froid()) H.dialogue.dire([{ qui: "ovo", texte: "La crique est belle… mais l’eau est bien trop froide aujourd’hui pour se baigner. On continue !" }]);
      }
      if (t - b.criqueDepuis > (cheminee.froid() ? 1500 : 14000)) { b.attenteCrique = false; b.pause = false; }
    }
    if (b.bain) b.bain.hidden = !(ici > 0.6 && !b.baignade && !parle && !cheminee.froid());
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
    // sur téléphone, le premier plan continue sous le chemin : la garrigue, de plus en plus près
    if (bas > 0) {
      ctx.fillStyle = nuit ? "#0d1d15" : "#2a7a36";
      ctx.fillRect(0, h - 2, w, bas + 4);
      for (let rang = 0; rang < 4; rang++) {
        const y = h + (bas * (rang + 0.6)) / 4, vite = 1.3 + rang * 0.25;
        for (let i = 0; i < 9; i++) buissonPlat(ctx, boucler(i * (120 + rang * 30) + rang * 47 - avance * vite, w, 80), y, 26 + rang * 10 + (i % 3) * 8, nuit ? ["#10241a", "#0f2218", "#0b1a12", "#081410"][rang] : ["#3fa04a", "#2f8a3e", "#2a7a36", "#1f6b34"][rang]);
      }
    }
    // le grain de risographie (celui du sol avance avec le chemin), puis la lumière de l'aube ou du couchant
    const grain = ctx.createPattern(S.grain, "repeat");
    ctx.fillStyle = grain;
    ctx.fillRect(0, -haut, w, h * 0.72 + haut);
    ctx.save();
    ctx.translate(-(avance % S.grain.width), 0);
    ctx.fillRect(avance % S.grain.width, h * 0.72, w, h * 0.28 + bas);
    ctx.restore();
    if (!nuit) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const v of H.ciel.lumiere(alt)) {
        ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha * 0.6 + ")";
        ctx.fillRect(0, 0, b.toile.width, b.toile.height);
      }
    }
    // la trame des gros pixels glisse avec le chemin, sous la ligne du rivage
    H.retro.appliquer(b.toile, H.retro.taillePour(3), 0.7, { x: avance * (b.toile.width / w), depuis: (haut + h * 0.72) / (S.Htot || h) });
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
    // (sans vêtements, avec les lunettes de piscine bleutées)
    const nageurs = [["ovoNage", w * 0.46, 0, false]];
    if (b.s.compagnons.includes("luigi")) nageurs.push(["luigiNage", w * 0.56, 1.7, true]);
    // pour sortir, on marche dans l'eau vers la plage : on émerge peu à peu, l'eau jusqu'aux hanches,
    // puis on est sur la plage (voir sechage)
    const sortie = b.sortieEau ? Math.min(1, (t - b.sortieEau) / SORTIE_EAU) : 0;
    if (sortie >= 1) return;
    for (const [nom, x0, ph, miroir] of nageurs) {
      const x = x0 - sortie * w * 0.14, y = eau + 40 + Math.sin(t / 500 + ph) * 2 * (1 - sortie) - sortie * 19;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, eau);
      ctx.clip();
      // (on marche vers la gauche : tout le monde se tourne de ce côté)
      H.pixel.dessiner(ctx, nom, x, y, 3, sortie ? Math.floor(t / 190) % 4 : 4, sortie ? true : miroir);
      ctx.restore();
      ronds(ctx, x, eau, t, ph);
    }
    if (b.sortieEau) return;
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
    if (H.journal) H.journal.noter("baignade", "je me suis baigné·e dans la mer");
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

  const SORTIE_EAU = 2800;
  async function sortirDeLeau() {
    const b = balade;
    if (!b || b.sortieEau) return;
    b.sortir.hidden = true;
    b.flamant = null;
    // on marche dans l'eau jusqu'à la plage, puis on s'essuie…
    b.sortieEau = performance.now();
    await new Promise((r) => setTimeout(r, SORTIE_EAU + 600));
    if (balade !== b) return;
    // … puis on rentre directement se réchauffer à la maison
    const lignes = [{ qui: "ovo", texte: "Brrr ! Vite, une serviette, et on rentre se réchauffer à la maison !" }];
    if (b.s.compagnons.includes("luigi")) lignes.push({ qui: "luigi", texte: "Je nous prépare un tilleul bien chaud. Allez, on rentre !" });
    await H.dialogue.dire(lignes);
    if (balade === b) H.aller("maison");
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
      if (H.journal) H.journal.noter("balade", "on est allé·es se balader dans les calanques");
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
      c.append(H.el("div.cadre-balade", { "aria-label": titre },
        toile,
        H.el("a.sortie-maison", { href: "#maison", title: "Rentrer à la maison" }, "‹ Maison"),
        H.el("div.pastilles.actions-balade", null, bain, sortir, fin)
      ));
      balade = { toile, fin, bain, sortir, s: scene(toile, compagnons) };
      if (H.ciel.etat().soleil.alt < -4) H.sons.criquets(true);
      dessinerBalade();
      setTimeout(() => balade && deroulerBalade(compagnons), 700);
    },
    quitter() {
      if (balade) cancelAnimationFrame(balade.anim);
      H.sons.criquets(false);
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
      H.ciel.nuitCalme() ? null : { titre: "Une fiche au hasard", sous: H.fixe(H.monde === "mesi" ? "l’herbier de Mesi" : "l’herbier d’ƟvƟ"), couverture: "pin", motif: "feuille", pages: () => {
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
      const dpr = Math.min(3, window.devicePixelRatio || 1), w = boite.clientWidth, h = boite.clientHeight;
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

  // --- la nuit -------------------------------------------------------------------------
  // De 22 h à 6 h, on ne fait plus que dormir ou se balader (pour éviter les insomnies).
  // « Aller faire dodo » : tout le monde dort dans le même lit. Par la fenêtre, les étoiles et
  // la lune ; leur lumière entre par les vitres et se pose sur le parquet, où l'ombre des
  // branches d'un arbre se balance. Mémé ronfle, des fois.
  function ronflement() {
    if (!H.local || !H.local.son) return;
    const ctx = H.audio.contexte();
    if (!ctx) return;
    const t = ctx.currentTime, d = 1.4;
    const n = Math.floor(ctx.sampleRate * d), buf = ctx.createBuffer(1, n, ctx.sampleRate), x = buf.getChannelData(0);
    for (let k = 0; k < n; k++) x[k] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain(), trem = ctx.createOscillator(), tg = ctx.createGain();
    src.buffer = buf;
    lp.type = "lowpass";
    lp.frequency.value = 420;
    trem.frequency.value = 26;
    // (un ronflement tout doux : la vibration reste à la mesure du souffle)
    const v = 0.022 * H.volume("bruitages");
    tg.gain.value = v * 0.45;
    trem.connect(tg).connect(g.gain);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(v, t + 0.5);
    g.gain.linearRampToValueAtTime(0.0001, t + d);
    src.connect(lp).connect(g).connect(H.audio.sortie());
    src.start(t);
    trem.start(t);
    src.stop(t + d);
    trem.stop(t + d);
  }

  // « Aller faire dodo » : la même pièce que la maison, lampes éteintes. ƟvƟ et Mesi dorment en
  // cuillère dans le lit, sous les photos : Mesi derrière, son bras posé sur ƟvƟ. Lóló dort au
  // pied du lit, Mémé en boule sur la couverture. Par la baie, la nuit ; la lune entre par les
  // vitres et se pose sur le sol, avec l'ombre des branches qui bougent.
  function sceneDodo(toile, sortie) {
    const ctx = toile.getContext("2d");
    let derniere = 0, prochainRonflement = performance.now() + 6000 + Math.random() * 8000, zzz = 0, decor = null, cle = "", calque = null, M = null;
    const surLesYeux = { oui: false };
    // une tête endormie, de face sur l'oreiller : les lunettes enlevées, les yeux fermés ; Mesi
    // dort avec son masque de sommeil sur les yeux
    const tete = (ctx, nom, x, y) => {
      const sp = H.pixel.detail(H.pixel.dort(nom)), k = 3, f = sp.f || 1;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp, 0, 0, 16 * f, 12 * f, x, y, 16 * k, 12 * k);
      // (dans le monde de Mesi, les deux personnages sont échangés : son visage est dans l'autre case)
      const mesi = H.monde === "mesi" ? nom === "ovo" : nom === "luigi";
      if (mesi) {
        ctx.fillStyle = "#2c2a3e"; ctx.fillRect(x + 2 * k, y + 6 * k, 12 * k, k * 0.7);
        ctx.fillStyle = "#3a3aa8"; ctx.fillRect(x + 4 * k, y + 5.3 * k, 8 * k, 2.4 * k);
        ctx.fillStyle = "#7f97f2"; ctx.fillRect(x + 4.5 * k, y + 5.5 * k, 7 * k, 0.6 * k);
        ctx.fillStyle = ENCRE; ctx.fillRect(x + 4 * k, y + 7.5 * k, 8 * k, 0.3 * k);
      } else {
        ctx.fillStyle = ENCRE;
        for (const ex of [6, 9]) ctx.fillRect(x + (ex - 0.3) * k, y + 6.6 * k, k * 1.6, k * 0.45);
      }
      ctx.restore();
    };
    function image(t) {
      if (!document.body.contains(toile)) return;
      requestAnimationFrame(image);
      if (t - derniere < H.cadence(66)) return;
      derniere = t;
      const v = vueMaison(toile), cleD = [v.W, v.Hc, v.K, v.taille, fenetresOuvertes()].join("|");
      if (cle !== cleD) {
        cle = cleD;
        toile.width = v.W; toile.height = v.Hc;
        decor = decorMaison(v.K, "nuit", true);
        M = toileVide(decor); calque = toileVide(decor);
      }
      pixK = v.K;
      const etat = H.ciel.etat(), m = M.getContext("2d");
      m.setTransform(1, 0, 0, 1, 0, 0); m.clearRect(0, 0, M.width, M.height);
      repere(m, v.K);
      // la nuit derrière les vitres ; par le velux, le vrai ciel (peint avec le dehors)
      fenetresDehors(m, t, "nuit", etat);
      m.drawImage(decor, BOITE.x, BOITE.y, BOITE.w, BOITE.h);
      m.drawImage(rideauxEclaires(decor, t), BOITE.x, BOITE.y, BOITE.w, BOITE.h);
      m.drawImage(decor.meubles, BOITE.x, BOITE.y, BOITE.w, BOITE.h);
      // la lune entre par la baie et par le velux, sur le sol et sur le lit
      const ciel = masqueCiel(t, etat, decor);
      if (ciel) { ajouterLumiere(M, decor.couleurs, ciel, 1); m.drawImage(decor.chaises, BOITE.x, BOITE.y, BOITE.w, BOITE.h); raiDuVelux(m, ciel); }
      const cc = calque.getContext("2d");
      cc.setTransform(1, 0, 0, 1, 0, 0); cc.clearRect(0, 0, calque.width, calque.height);
      repere(cc, v.K);
      cc.lineJoin = "round"; cc.lineCap = "round"; cc.strokeStyle = ENCRE; cc.lineWidth = 1.6;
      // en bas, la table du goûter reste à sa place
      cc.save();
      cc.translate(TABLE_T.x, TABLE_T.y);
      cc.strokeStyle = ENCRE; cc.lineWidth = 1.6;
      tableGouter(cc);
      cc.restore();
      // en haut, dans le lit du grenier
      cc.save();
      versLeLit(cc);
      {
      const ctx = cc;

      // ƟvƟ et Mesi en cuillère : Mesi derrière, un peu plus haut ; ƟvƟ devant
      tete(ctx, "luigi", 34, 158);
      tete(ctx, "ovo", 56, 170);
      // La couverture en relief : on devine les deux corps dessous, couchés sur le côté. Derrière,
      // Mesi (épaule, hanche, genoux pliés), un peu plus haut ; devant, ƟvƟ, blotti·e contre elle.
      // Les bosses s'éclairent sur le dessus, les creux restent dans l'ombre, et le tout se soulève
      // doucement avec les respirations.
      const sf = Math.sin(t / 1300) * 1.2, sg = Math.sin(t / 1500 + 1) * 1.2;
      const corps = (dy, souffle, bosses) => {
        // bosses : [x, hauteur] le long du corps, de l'épaule aux pieds
        ctx.beginPath();
        ctx.moveTo(84, 238);
        ctx.lineTo(84, 214 + dy);
        let px = 84, py = 214 + dy;
        for (const [x, hh] of bosses) {
          const y = 214 + dy - hh - (x < 170 ? souffle : 0);
          ctx.quadraticCurveTo((px + x) / 2, Math.min(py, y) - 4, x, y);
          px = x; py = y;
        }
        ctx.quadraticCurveTo(232, py, 236, 214 + dy + 4);
        ctx.lineTo(236, 238); ctx.closePath();
      };
      // Mesi, derrière
      ctx.lineWidth = 2.4;
      corps(-8, sf, [[104, 30], [130, 16], [168, 30], [194, 12], [218, 22]]);
      ctx.fillStyle = "#3a3aa8"; ctx.fill(); ctx.stroke();
      // ƟvƟ, devant, plus bas
      corps(8, sg, [[100, 22], [124, 8], [160, 24], [186, 6], [210, 16]]);
      ctx.fillStyle = "#3d5ee8"; ctx.fill(); ctx.stroke();
      // les reflets sur le haut des bosses, et les plis dans les creux
      ctx.lineWidth = 3;
      ctx.strokeStyle = "#7f97f2";
      for (const [x0, x1, y] of [[92, 108, 202], [148, 170, 200], [200, 216, 208]]) { ctx.beginPath(); ctx.moveTo(x0, y + 1 - sg * 0.5); ctx.quadraticCurveTo((x0 + x1) / 2, y - 2 - sg * 0.5, x1, y + 1 - sg * 0.5); ctx.stroke(); }
      ctx.strokeStyle = "#232a63";
      for (const [x, y] of [[124, 214], [186, 218], [142, 226], [206, 228]]) { ctx.beginPath(); ctx.moveTo(x - 6, y); ctx.quadraticCurveTo(x, y + 4, x + 7, y + 1); ctx.stroke(); }
      ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
      // le revers clair de la couverture, sous les mentons
      ctx.beginPath(); ctx.moveTo(84, 214 - sf); ctx.quadraticCurveTo(96, 200 - sf, 110, 204 - sf); ctx.lineTo(110, 210 - sf); ctx.quadraticCurveTo(96, 207 - sf, 84, 220 - sf); ctx.closePath();
      ctx.fillStyle = "#f3f0dc"; ctx.fill(); ctx.stroke();
      // le bras de Mesi posé sur ƟvƟ, par-dessus la couverture
      ctx.lineWidth = 8.5; ctx.strokeStyle = ENCRE;
      ctx.beginPath(); ctx.moveTo(92, 194 - sf); ctx.quadraticCurveTo(108, 196 - sf, 124, 204); ctx.stroke();
      ctx.lineWidth = 5.5; ctx.strokeStyle = "#ffb3a8"; ctx.stroke();
      ctx.lineWidth = 1.6; ctx.strokeStyle = ENCRE;
      ctx.beginPath(); ctx.ellipse(126, 205, 4, 3, 0.4, 0, Math.PI * 2); ctx.fillStyle = "#f2c29b"; ctx.fill(); ctx.stroke();

      // Lóló dort sur nous, couché en travers de la couverture ; s'il y a trop de lumière, il
      // monte se coucher sur les yeux de tout le monde
      ctx.save();
      if (surLesYeux.oui) { ctx.translate(92, 178); ctx.scale(0.72, 0.72); }
      else { ctx.translate(152, 190); ctx.scale(0.72, 0.72); }
      loloCouche(ctx, 0, 0, t, false);
      ctx.restore();
      }
      cc.restore();
      // Mémé, roulée en boule sur la couverture, sur nous aussi (hors du lit retourné, pour que
      // ses cases tombent pile sur les gros pixels)
      memeCouchee(cc, LIT.x - 122, LIT.y + 190, t);

      // tout le monde reçoit la lumière de la nuit, comme le décor (et celle de la lune)
      {
        const vraies = tampon("persos", calque.width, calque.height);
        vraies.getContext("2d").drawImage(calque, 0, 0);
        eclairerCouche(calque, vraies, decor.carte, null);
        if (ciel) ajouterLumiere(calque, vraies, ciel, 1);
      }
      m.save(); m.setTransform(1, 0, 0, 1, 0, 0); m.drawImage(calque, 0, 0); m.restore();
      // le dehors tout autour, la maison par-dessus
      poserMaison(ctx, v, t, "nuit", etat, M);

      // de temps en temps, Mémé ronfle : un petit « rrr » s'envole
      if (t > prochainRonflement) {
        prochainRonflement = t + 12000 + Math.random() * 16000;
        zzz = t;
        ronflement();
      }
      if (t - zzz < 2600) {
        const u = (t - zzz) / 2600;
        ctx.globalAlpha = 1 - u;
        ctx.font = "16px VT323, monospace";
        ctx.fillStyle = "#f3f0dc";
        ctx.fillText("rrr…", LIT.x - 130 + u * 10, LIT.y + 172 - u * 30);
        ctx.globalAlpha = 1;
      }
      // tout passe en gros pixels, aux couleurs des pochettes
      H.retro.appliquer(toile, grosPixel(), 0.6, null, paletteMaison("nuit", true));
    }
    requestAnimationFrame(image);
  }

  H.vues.dodo = {
    afficher(c, params) {
      if (params[0] === "dormir") {
        const toile = H.el("canvas.scene-maison", { role: "img", "aria-label": "Tout le monde dort dans le même lit. Par la fenêtre, les étoiles ; la lumière de la nuit se pose sur le parquet." });
        c.appendChild(H.el("div.page-maison", null, toile, H.el("a.sortie-maison", { href: "#maison", title: "Se réveiller" }, "‹ Se réveiller")));
        H.musique.arreter();
        sceneDodo(toile);
        return;
      }
      // la nuit, le reste du jeu dort : on propose seulement de dormir ou de se balader
      c.appendChild(H.el("div.page-dodo", null,
        H.el("div.boite-nuit", null,
          H.el("p", null, "Il est tard. Jusqu’à 6 h du matin, on ne fait plus que dormir ou se balader, pour que ton cerveau se repose aussi."),
          H.el("div.choix-nuit", null,
            H.el("button.bouton", { type: "button", onclick: () => H.aller("dodo/dormir") }, "Aller faire dodo"),
            H.el("button.bouton", { type: "button", onclick: fenetreBalade }, "Faire une balade")
          )
        )
      ));
    },
  };
})();
