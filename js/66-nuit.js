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
    // après celui-là, on chante ensemble
    if (/^Le monde a de la chance de t’avoir/.test(c)) {
      airNanana();
      await H.dialogue.dire([{ qui: "duo", texte: "Ta-ta-tata !" }]);
    }
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
  const MOMENTS = {
    // le mur du lit bleu foncé, le mur de la baie vert foncé
    jour: { murG: "#26406a", murD: "#2f6b35", sol: "#c93f6e", plinthe: "#7a2444", ombreMur: "rgba(15,13,58,0.45)", lampe: true },
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
  const BAIE = { x: 290, y: 24, w: 146, h: 150 };
  function cheminFenetre(ctx) {
    ctx.beginPath();
    ctx.rect(BAIE.x, BAIE.y, BAIE.w, BAIE.h);
  }
  // Le dehors, derrière la vitre : le ciel du moment, des arbres au loin, plus sombres et bleuis,
  // puis des arbres tout proches. Le jour, le soleil les éclaire par le haut ; le soir et la nuit,
  // c'est la lumière du salon qui éclaire le bas de leur feuillage et leurs troncs.
  function dehorsBaie(ctx, t, moment, etat) {
    const { x: X, y: Y, w: L, h: Hh } = BAIE, bas = Y + Hh;
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
      for (const [v, y, l] of [[0.010, 44, 34], [0.006, 70, 24]]) {
        const x = X - 40 + ((t * v) % (L + 80));
        arrondi(ctx, x, y, l, 9, 4.5); ctx.fill();
        arrondi(ctx, x + l * 0.25, y - 5, l * 0.5, 9, 4.5); ctx.fill();
      }
    } else {
      for (let i = 0; i < 22; i++) {
        const x = X + r() * L, y = Y + r() * 70, n = i % 4;
        ctx.fillStyle = "rgba(255,245,230," + (moment === "nuit" ? 0.5 + 0.5 * Math.sin(t / 600 + n * 2 + x) : 0.3) + ")";
        ctx.fillRect(x, y, 1.8, 1.8);
      }
      if (etat.lune.alt > -2 || moment === "nuit") lunePlate(ctx, X + L - 30, Y + 30, 10, etat.lune.phase);
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

  // L'éclairage du soir et de la nuit. L'air de la pièce est clair (ni vapeur ni fumée) : les
  // lampes ne font pas de halo, elles éclairent seulement ce qui est près d'elles. On assombrit
  // donc toute la pièce, sauf autour des deux lampes, où les murs, le sol, les meubles et les
  // visages gardent leurs couleurs, réchauffées. La lampe de chevet éclaire surtout vers le bas
  // et vers le haut (par les ouvertures de l'abat-jour) ; la boule, la table et les visages dessous.
  const LAMPES = [
    { x: 259, y: 175, rx: 165, ry: 130, chaud: "255,190,110" },
    { x: 535, y: 195, rx: 175, ry: 135, chaud: "255,160,80" },
  ];
  const masques = {};
  function masqueNuit(moment) {
    if (masques[moment]) return masques[moment];
    const K = 2, c = document.createElement("canvas");
    c.width = 640 * K; c.height = 360 * K;
    const g = c.getContext("2d");
    g.scale(K, K);
    g.fillStyle = moment === "nuit" ? "rgba(35,30,110,0.46)" : "rgba(50,40,120,0.26)";
    g.fillRect(0, 0, 640, 360);
    // là où la lampe éclaire, l'ombre s'en va
    g.globalCompositeOperation = "destination-out";
    for (const l of LAMPES) {
      g.save(); g.translate(l.x, l.y); g.scale(1, l.ry / l.rx);
      const d = g.createRadialGradient(0, 0, 0, 0, 0, l.rx);
      d.addColorStop(0, "rgba(0,0,0,1)"); d.addColorStop(0.45, "rgba(0,0,0,0.75)"); d.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = d; g.beginPath(); g.arc(0, 0, l.rx, 0, Math.PI * 2); g.fill();
      g.restore();
    }
    return (masques[moment] = c);
  }
  // (la composition et le découpage sont réglés par l'appelant)
  function assombrir(ctx, moment) {
    if (moment === "jour") return;
    ctx.drawImage(masqueNuit(moment), 0, 0, 640, 360);
  }
  // La couleur chaude de l'ampoule sur les surfaces éclairées. surDecor : le décor, entièrement
  // peint, où l'on mêle la couleur en « lumière douce » (les teintes et les reliefs restent) ;
  // sinon les personnages, où l'on pose un voile chaud léger seulement sur leurs pixels.
  function eclairer(ctx, moment, surDecor) {
    if (moment === "jour") return;
    const fort = moment === "nuit" ? 1 : 0.7;
    ctx.save();
    if (surDecor) ctx.globalCompositeOperation = "soft-light";
    for (const l of LAMPES) {
      ctx.save(); ctx.translate(l.x, l.y); ctx.scale(1, l.ry / l.rx);
      const d = ctx.createRadialGradient(0, 0, 0, 0, 0, l.rx * 0.8);
      const a = (surDecor ? 0.6 : 0.2) * fort;
      d.addColorStop(0, "rgba(" + l.chaud + "," + a + ")"); d.addColorStop(1, "rgba(" + l.chaud + ",0)");
      ctx.fillStyle = d; ctx.beginPath(); ctx.arc(0, 0, l.rx * 0.8, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  // Le soleil qui entre par la baie vitrée et se pose sur le sol et le canapé : trois rectangles de
  // lumière déformés par la perspective, coupés par les montants de la fenêtre, et tachetés par
  // l'ombre des feuilles des arbres dehors, qui bougent doucement avec le vent. Le matin la lumière
  // part vers la droite, l'après-midi vers la gauche ; par temps couvert, elle s'efface.
  const FEUILLES = Array.from({ length: 46 }, (_, i) => {
    const a = Math.sin(i * 12.9898) * 43758.5453, b = Math.sin(i * 78.233) * 12345.678;
    return [a - Math.floor(a), b - Math.floor(b), 3 + ((i * 7) % 6), i * 0.7];
  });
  function soleilParLaBaie(ctx, t, etat, moment) {
    const s = etat.soleil, m = H.ciel.meteo || {};
    if (s.alt < 2) return;
    const couvert = m.nuages != null ? m.nuages / 100 : 0;
    const force = Math.max(0, 1 - couvert * 0.9) * Math.min(1, s.alt / 12) * (moment === "soir" ? 0.7 : 1);
    if (force < 0.08) return;
    // le soleil haut fait une tache courte, bas une tache longue ; il tourne avec l'azimut
    const pente = Math.max(-1.2, Math.min(1.2, (180 - s.az) / 55)), long = Math.max(0.35, Math.min(1.1, 18 / Math.max(6, s.alt)));
    const { x: fx, y: fy, w: fw, h: fh } = BAIE;
    // un point de la vitre (x, y) → où sa lumière tombe sur le sol
    const sol = (x, y) => { const d = (y - fy) / fh; return [x + pente * 120 * d * long, 232 + d * 118 * long]; };
    const vent = Math.sin(t / 2100) * 5 + Math.sin(t / 830) * 2;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 160, 640, 200); ctx.clip();
    const chaud = moment === "soir" ? "255,190,120" : "255,236,180";
    for (let k = 0; k < 3; k++) {
      const x0 = fx + (fw * k) / 3 + 5, x1 = fx + (fw * (k + 1)) / 3 - 5, y0 = fy + 5, y1 = fy + fh - 5;
      const q = [sol(x0, y0), sol(x1, y0), sol(x1, y1), sol(x0, y1)];
      ctx.save();
      ctx.beginPath(); q.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
      ctx.clip();
      ctx.fillStyle = "rgba(" + chaud + "," + 0.62 * force + ")";
      ctx.fillRect(0, 160, 640, 200);
      // l'ombre tachetée des feuilles, aplatie par la perspective
      ctx.fillStyle = "rgba(60,40,90," + 0.42 * force + ")";
      for (const [u, v, r, ph] of FEUILLES) {
        const [x, y] = sol(fx + u * fw + vent * (0.6 + v), fy + v * fh * 0.85);
        const rr = r * (0.8 + 0.2 * Math.sin(t / 900 + ph));
        ctx.beginPath(); ctx.ellipse(x, y, rr * 1.6, rr * 0.6 * long + 1, 0.2, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // Les flammes derrière la vitre de la cheminée, qui dansent, et leur lueur qui se pose sur le sol et
  // le mur autour (sans halo dans l'air), plus forte le soir.
  function feuDuPoele(ctx, t, moment) {
    const vac = 0.85 + Math.sin(t / 130) * 0.08 + Math.sin(t / 57) * 0.05;
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    const g = ctx.createRadialGradient(472, 150, 0, 472, 150, 160);
    const a = (moment === "jour" ? 0.4 : 0.75) * vac;
    g.addColorStop(0, "rgba(255,150,60," + a + ")"); g.addColorStop(1, "rgba(255,150,60,0)");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(472, 160, 160, 120, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // les flammes dans la vitre
    ctx.save();
    ctx.beginPath(); ctx.rect(462, 98, 20, 18); ctx.clip();
    ctx.fillStyle = "#d23a2a"; ctx.fillRect(462, 110, 20, 6);
    for (let k = 0; k < 5; k++) {
      const x = 463 + k * 4, hh = 7 + Math.abs(Math.sin(t / (90 + k * 23) + k)) * 9;
      ctx.fillStyle = "#ff8f2e"; ctx.fillRect(x, 116 - hh, 3, hh);
      ctx.fillStyle = "#ffd23a"; ctx.fillRect(x + 1, 116 - hh * 0.6, 1.5, hh * 0.6);
    }
    ctx.restore();
  }

  // le décor fixe, peint une fois pour toutes (la vitre reste transparente pour le ciel)
  // eteint : pour dormir, les deux lampes éteintes (la pièce est sombre partout)
  function decorMaison(w, h, dpr, moment, eteint) {
    const M = MOMENTS[moment];
    const c = document.createElement("canvas");
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext("2d"), S = w / 640, r = H.alea("mazet");
    ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = ENCRE;
    ctx.lineWidth = 2.2;
    // les murs, deux couleurs franches, plus sombres vers le plafond et dans le coin
    ctx.fillStyle = M.murG; ctx.fillRect(0, 0, 214, 230);
    ctx.fillStyle = M.murD; ctx.fillRect(214, 0, 426, 230);
    const plafond = ctx.createLinearGradient(0, 0, 0, 70);
    plafond.addColorStop(0, M.ombreMur); plafond.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = plafond; ctx.fillRect(0, 0, 640, 70);
    const coin = ctx.createLinearGradient(214, 0, 260, 0);
    coin.addColorStop(0, M.ombreMur); coin.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = coin; ctx.fillRect(214, 0, 46, 230);
    ctx.beginPath(); ctx.moveTo(214, 0); ctx.lineTo(214, 230); ctx.stroke();
    // le sol en terrazzo
    ctx.fillStyle = M.sol; ctx.fillRect(0, 230, 640, 130);
    // un terrazzo dans les tons du sol magenta, avec quelques éclats vifs
    const eclats = ["#e04bb0", "#a8325b", "#ff5b4f", "#e04bb0", "#a8325b", "#ffd23a", "#3d5ee8"];
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
    ctx.fillStyle = "#3d5ee8"; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(338, 322, 96, 15, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "#7f97f2"; ctx.stroke(); ctx.strokeStyle = ENCRE;

    // la baie vitrée : on la découpe (le dehors se peint derrière), puis le cadre et les montants
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    cheminFenetre(ctx); ctx.fill();
    ctx.restore();
    ctx.lineWidth = 7; ctx.strokeStyle = "#f3f0dc"; cheminFenetre(ctx); ctx.stroke();
    ctx.lineWidth = 2.2; ctx.strokeStyle = ENCRE;
    ctx.strokeRect(BAIE.x - 4, BAIE.y - 4, BAIE.w + 8, BAIE.h + 8);
    ctx.strokeRect(BAIE.x + 3, BAIE.y + 3, BAIE.w - 6, BAIE.h - 6);
    for (const u of [1 / 3, 2 / 3]) {
      const x = BAIE.x + BAIE.w * u;
      ctx.fillStyle = "#f3f0dc"; ctx.fillRect(x - 3, BAIE.y, 6, BAIE.h);
      ctx.beginPath(); ctx.moveTo(x - 3, BAIE.y + 3); ctx.lineTo(x - 3, BAIE.y + BAIE.h); ctx.moveTo(x + 3, BAIE.y + 3); ctx.lineTo(x + 3, BAIE.y + BAIE.h); ctx.stroke();
    }

    // au-dessus du lit, deux photos dans des cadres en bois naturel : ƟvƟ et Mesi qui se tiennent
    // la main au bord de la mer, et Lóló et Mémé qui sourient. Elles sont dessinées case par case,
    // chaque case tombant pile sur un gros pixel de l'écran, pour que les visages restent nets.
    photoEncadree(ctx, 24, 56, PHOTO_DUO, w);
    photoEncadree(ctx, 126, 66, PHOTO_LOLO, w);

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
    ctx.fillStyle = eteint ? "#e9e3cd" : M.lampe ? "#fff06a" : "#ffd23a"; ctx.fill(); ctx.stroke();

    // le canapé corail sous la fenêtre
    bloc(ctx, 292, 170, 126, 46, 17, "#ff5b4f");
    bloc(ctx, 304, 180, 36, 30, 11, "#ffd23a");
    bloc(ctx, 374, 182, 34, 28, 11, "#f2f0e8");
    bloc(ctx, 286, 206, 138, 30, 13, "#ff7a6b");
    bloc(ctx, 278, 188, 24, 50, 11, "#ff5b4f");
    bloc(ctx, 406, 188, 24, 50, 11, "#ff5b4f");
    bloc(ctx, 292, 236, 8, 9, 3, ENCRE);
    bloc(ctx, 410, 236, 8, 9, 3, ENCRE);

    // la cheminée suspendue, en fonte noire, accrochée à son conduit au-dessus de la table :
    // une hotte ronde avec sa vitre, bien en vue au-dessus des têtes
    bloc(ctx, 467, 0, 10, 72, 2, "#4a4560");
    ctx.beginPath(); ctx.moveTo(452, 72); ctx.lineTo(492, 72); ctx.quadraticCurveTo(500, 104, 492, 136); ctx.lineTo(452, 136); ctx.quadraticCurveTo(444, 104, 452, 72); ctx.closePath();
    ctx.fillStyle = "#3a3550"; ctx.fill(); ctx.stroke();
    bloc(ctx, 448, 134, 48, 6, 3, "#4a4560");
    bloc(ctx, 460, 96, 24, 22, 4, "#1b1d4a");
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
      ctx.save();
      // (toute la pièce sauf la vitre : cheminFenetre recommencerait le tracé)
      ctx.beginPath(); ctx.rect(0, 0, 640, 360); ctx.rect(BAIE.x, BAIE.y, BAIE.w, BAIE.h); ctx.clip("evenodd");
      if (eteint) { ctx.fillStyle = "rgba(20,18,70,0.62)"; ctx.fillRect(0, 0, 640, 360); }
      else { assombrir(ctx, moment); eclairer(ctx, moment, true); }
      ctx.restore();
    }
    plafonnier(ctx, moment, eteint);
    return c;
  }

  // --- les photos du mur ---
  const PAL_PHOTO = {
    C: "#6fb6ee", B: "#a8d8ec", S: "#12aec4", W: "#f3f0dc", Y: "#efe8d4", y: "#ddd2ba", G: "#6cbd5c", g: "#3f8a42",
    h: "#3b2416", c: "#8a4b22", s: "#f2c29b", a: "#9a9a9a", q: "#ee9a7e", m: "#b8404e", r: "#e03a3a", e: "#3aa04a", b: "#3a5fd0", n: "#7a4520",
    k: "#5a3418", M: "#3e2210", L: "#c08850", w: "#f3f0dc", E: "#1b1d4a", N: "#3e2210", z: "#3a2216",
    o: "#2a2246", t: "#d8bf98", T: "#6b5442", u: "#f3ead8", p: "#f4a3b8",
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
  const OVO_PHOTO = [".hhh.", "hhhhh", "hasah", "hsssh", ".sms.", "rbbbr", "rbbbr", "sbbbs", ".bbb.", ".b.b.", ".n.n."];
  const MESI_PHOTO = [".ccc.", "ccccc", "cqsqc", ".sss.", ".sms.", "ebbbe", "ebbbe", "sbbbs", ".bbb.", ".b.b.", ".n.n."];
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
  function photoEncadree(ctx, x0, y0, grille, largeurToile) {
    // la taille d'une case : un gros pixel de l'écran (sur les petits écrans, la photo rétrécit)
    const S = largeurToile / 640, gros = 4 / S, larg = grille[0].length, haut = grille.length;
    const cell = Math.min(gros, 92 / larg), aligne = (v) => (cell === gros ? Math.round(v / cell) * cell : v);
    const bord = cell * 2, x = aligne(x0), y = aligne(y0), W2 = larg * cell + bord * 2, H2 = haut * cell + bord * 2;
    ctx.fillStyle = "#c9a878"; ctx.fillRect(x, y, W2, H2);
    ctx.fillStyle = "#e0c49a"; ctx.fillRect(x, y, W2, cell);
    ctx.fillStyle = "#9a6a3c"; ctx.fillRect(x, y + H2 - cell, W2, cell); ctx.fillRect(x + W2 - cell, y, cell, H2);
    grille.forEach((l, j) => [...l].forEach((ch, i) => { ctx.fillStyle = PAL_PHOTO[ch] || "#a8d8ec"; ctx.fillRect(x + bord + i * cell, y + bord + j * cell, cell + 0.05, cell + 0.05); }));
    ctx.strokeStyle = ENCRE; ctx.lineWidth = 2.2;
    ctx.strokeRect(x, y, W2, H2);
  }

  // Le plafonnier : une boule orange qui pend du plafond au bout d'un fil couleur cuivre,
  // au-dessus de la table du goûter (sa lumière sur la table et les visages : voir eclairer).
  const BOULE = { x: 535, y: 116, r: 15 };
  function plafonnier(ctx, moment, eteint) {
    const { x, y, r } = BOULE;
    // le fil de cuivre, et la petite cloche qui le tient au plafond
    ctx.strokeStyle = "#c87533"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y - r - 3); ctx.stroke();
    ctx.fillStyle = "#c87533"; ctx.fillRect(x - 7, 0, 14, 4);
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
  let chantJusqua = 0, canapeJusqua = 0;
  // après le goûter, ƟvƟ et Mesi vont s'asseoir sur le canapé pour écouter de la musique
  function allerSurLeCanape() {
    canapeJusqua = performance.now() + 150000;
    chantJusqua = canapeJusqua;
    if (H.local.musique && H.musique) H.musique.jouer();
  }
  H.maison = { canape: allerSurLeCanape };
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

  // Le soir, ƟvƟ peut raconter sa journée à Mesi (tout ce qu'iel a fait, dans l'ordre), ou
  // chanter leur chanson.
  async function soireeOvo() {
    const q = await H.dialogue.dire([{ qui: "luigi", texte: "Alors, c’était comment, ta journée ?", choix: [{ valeur: "raconter", libelle: "Raconter ma journée" }, { valeur: "chanter", libelle: "Chanter notre chanson" }, { valeur: null, libelle: "Plus tard" }] }]);
    if (q === "chanter") return chanson();
    if (q !== "raconter") return;
    const lignes = H.journal ? H.journal.recit() : [];
    if (!lignes.length) return H.dialogue.dire([{ qui: "ovo", texte: "Aujourd’hui, je n’ai pas fait grand-chose… je me suis surtout reposé·e." }, { qui: "luigi", texte: "Ça fait du bien aussi, des journées comme ça." }]);
    await H.dialogue.dire(lignes.map((texte) => ({ qui: "ovo", texte })));
    await H.dialogue.dire([{ qui: "luigi", texte: H.histoires.auHasard(["Quelle journée ! Je suis fière de toi.", "Tu as bien travaillé, mon cœur. Viens te reposer.", "Eh bien ! Tu mérites une crêpe, toi."]) }]);
  }

  // ce qu'on peut faire en cliquant dans la pièce (rectangles dans le dessin de 640 × 360)
  function zonesMaison(nuit) {
    // on peut aller faire dodo à partir de 21 h
    const heure = new Date().getHours(), dodo = heure >= 21 || heure < 6;
    return [
      { id: "fenetre", x: 290, y: 24, w: 146, h: 140, nom: "Faire une balade", agir: fenetreBalade },
      { id: "meme", x: 152, y: 192, w: 34, h: 20, nom: "Caresser Mémé", agir: () => H.dialogue.dire([{ qui: "meme", texte: H.histoires.auHasard(["Rrr… rrr… (Mémé s’étire sans ouvrir les yeux, puis se rendort en boule.)", "Mrrrou. (Elle tend le menton pour qu’on le gratte.)", "Rrrrrrr… (Mémé ronronne si fort que la couverture vibre.)"]) }]) },
      { id: "lolo", x: 116, y: 156, w: 116, h: 54, nom: "Lóló raconte", agir: async () => {
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
      { id: "lit", x: 22, y: 150, w: 214, h: 96, nom: dodo ? "Aller faire dodo" : "Le lit", agir: () => (dodo ? H.aller("dodo/dormir") : H.dialogue.dire([{ qui: "luigi", texte: "Pas encore l’heure de dormir ! Viens plutôt t’asseoir sur le canapé." }])) },
      { id: "canape", x: 278, y: 168, w: 152, h: 78, nom: "Une douceur de Mesi", agir: () => raconter("luigi") },
      { id: "mesi", x: 572, y: 160, w: 66, h: 136, nom: "Un compliment de Mesi", agir: complimentMesi },
      { id: "ovo", x: 428, y: 160, w: 72, h: 136, get nom() { return new Date().getHours() >= 17 ? "Raconter ma journée" : "Chanter notre chanson"; }, agir: () => (new Date().getHours() >= 17 ? soireeOvo() : chanson()) },
      { id: "poele", x: 444, y: 10, w: 56, h: 132, get nom() { return cheminee.feuActif() ? "Le feu" : "Faire du feu"; }, agir: () => cheminee.allumer() },
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
      ctx.beginPath(); ctx.moveTo(429, 222); ctx.quadraticCurveTo(440 + Math.sin(t / 140) * 4, 226, 438, 238);
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
      // le dehors, derrière la baie vitrée
      ctx.save();
      cheminFenetre(ctx); ctx.clip();
      const etat = H.ciel.etat();
      dehorsBaie(ctx, t, moment, etat);
      ctx.restore();
      ctx.drawImage(decor, 0, 0, 640, 360);
      // le jour, le soleil entre par la baie : l'ombre du cadre et des feuilles qui bougent
      if (moment !== "nuit") soleilParLaBaie(ctx, t, etat, moment);
      if (cheminee.feuActif()) feuDuPoele(ctx, t, moment);
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
      cc.lineWidth = 2.2;
      if (!farce) loloCouche(cc, 172, 200, t, loloRaconte);
      memeEnBoule(cc, 168, 203, t, 0.75);
      const surCanape = canapeJusqua > t;
      if (surCanape) {
        // sur le canapé, face à face, les jambes qui se balancent au-dessus du tapis
        assis(cc, "ovo", 300, 1, t, 2, loloRaconte, 216);
        assis(cc, "luigi", 412, -1, t, 4, false, 216);
      } else {
        assis(cc, "ovo", 445, 1, t, 2, loloRaconte);
        assis(cc, "luigi", 626, -1, t, 4);
      }
      cc.strokeStyle = ENCRE;
      cc.lineWidth = 1.6;
      tableGouter(cc);
      // la tête de Mesi : à table (dos 626) ou sur le canapé (dos 412, siège plus bas de 30)
      if (farce) dessinerFarce(cc, t, surCanape ? { x: 390, y: 126 } : { x: 604, y: 156 });
      cc.globalCompositeOperation = "source-atop";
      assombrir(cc, moment);
      eclairer(cc, moment, false);
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
          ctx.fillStyle = i % 2 ? "#ff5b4f" : "#f3f0dc";
          const base = canapeJusqua > t ? 318 : 470;
          ctx.fillText(i % 3 ? "♪" : "♫", base + (i % 3) * 40 + Math.sin(u * 6 + i) * 6, 170 - u * 60);
        }
        ctx.globalAlpha = 1;
        ctx.textAlign = "start";
      }
      // de gros pixels aux couleurs des pochettes ; le nom survolé reste net, par-dessus
      H.retro.appliquer(toile, H.retro.taillePour(4), 0.3);
      ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
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
      const bandes = ["#6b6578", "#c9c9c4", "#f3f0dc", "#ffffff", "#c9c9c4", "#9a9a9a"];
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
      g.fillStyle = "#9a9a9a"; g.fillRect(Math.round(cx) - 4, Math.round(haut), 8, 2);
      for (const [i, j] of [[0.15, 9.15], [1.0, 9.15], [1.0, 8.15]]) { const [x, y] = PI_(i, j, 0); g.fillStyle = "#2a2540"; g.fillRect(Math.round(x), Math.round(y) - 3, 1, 3); }
      boiteIso(g, 0.1, 8.1, 0.95, 1.05, 14, { dessus: "#4a4560", gauche: "#3a3550", droite: "#2a2540" }, 3);
      const [vx, vy] = PI_(0.35, 9.15, 12);
      g.fillStyle = o.feu ? "#d23a2a" : "#1b1d4a"; g.fillRect(Math.round(vx), Math.round(vy), 8, 6);
      g.fillStyle = "#9a9a9a"; g.fillRect(Math.round(vx) - 1, Math.round(vy) - 1, 10, 1);
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
      if (dodo) { if (!H.$(".dialogue")) H.lolo.cacherLaLumiere({ couche: () => {} }); return; }
      const z = zoneSous(e);
      if (!z || H.$(".dialogue")) return;
      if (pointeur !== "mouse" && (!survol || survol.id !== z.id)) { survol = z; return; }
      survol = null;
      z.agir();
    });
    function image(t) {
      if (!document.body.contains(toile)) return;
      requestAnimationFrame(image);
      if (t - derniere < 66) return;
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
      const w = toile.clientWidth || 600, dpr = Math.min(2, window.devicePixelRatio || 1), h = Math.round((w * MI.H) / MI.L);
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
      c.appendChild(H.el("div.page-maison.relief", null,
        (toileMaison = H.el("canvas.scene-maison", { role: "img", "aria-label": "L’intérieur du mazet : le lit, le canapé sous la fenêtre, la table, Mesi, Lóló et Mémé" })),
        H.el("a.sortie-maison", { href: "#village", "aria-label": "Retour à la ferme", title: "Retour à la ferme" }, "‹ Ferme")
      ));
      sceneMaisonIso(toileMaison, false);
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = toile.clientWidth || 600;
    const h = window.innerWidth < 640 ? 300 : 360;
    toile.width = Math.round(w * dpr);
    toile.height = Math.round(h * dpr);
    toile.style.height = h + "px";
    const nuit = H.ciel.etat().soleil.alt < -4;
    const rEt = H.alea("etoiles-balade");
    const etoiles = Array.from({ length: 70 }, () => [rEt() * w, rEt() * rEt() * h * 0.5, rEt() * 0.6 + 0.35]);
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
    if (TELEPHONE && S.derniere && t - S.derniere < 30) {
      b.anim = requestAnimationFrame(dessinerBalade);
      return;
    }
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
    if (avec("meme") && !avec("lolo") && !b.baignade) H.pixel.dessiner(ctx, "memePas", w * 0.5, sol(w * 0.5) - h * 0.055, 2.4, b.pause ? 0 : Math.floor(t / 200) % 2);
    // Mémé n'aime pas l'eau : pendant la baignade, elle dort en boule sur la plage
    if (avec("meme") && !avec("lolo") && b.baignade) {
      ctx.save();
      ctx.lineJoin = "round"; ctx.lineCap = "round"; ctx.strokeStyle = "#23214a"; ctx.lineWidth = 1.6;
      memeEnBoule(ctx, w * 0.5, sol(w * 0.5) - h * 0.16, t, 1.1);
      ctx.restore();
    }
    if (!b.baignade) {
      if (avec("luigi")) H.pixel.dessiner(ctx, "luigiProfil", w * 0.33, sol(w * 0.33) - h * 0.055, 3, pas(2));
      H.pixel.dessiner(ctx, "ovoProfil", w * 0.42, sol(w * 0.42) - h * 0.06, 3, pas(0));
    }
    // devant : l'autre bord du chemin, et parfois un grand pin qui passe tout près
    for (let i = 0; i < 12; i++) buissonPlat(ctx, boucler(i * 110 - avance * 1.25, w, 60), h + 4, 22 + (i % 3) * 8, nuit ? "#10241a" : i % 2 ? "#2f8a3e" : "#3fa04a");
    poses(S.devant, b, 1.3, (x, taille) => pinPlat(ctx, x, h * 1.04, taille, nuit ? "#0f2218" : "#1f6b34", nuit ? "#0b1a12" : "#134a24", nuit ? "#0f2218" : "#4a2e20"));
    // on peut aller se baigner quand le chemin longe la crique aux rochers rouges
    if (b.bain) b.bain.hidden = !(ici > 0.6 && !b.baignade && !H.$(".dialogue") && !cheminee.froid());
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
    // le grain de risographie (celui du sol avance avec le chemin), puis la lumière de l'aube ou du couchant
    const grain = ctx.createPattern(S.grain, "repeat");
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h * 0.72);
    ctx.save();
    ctx.translate(-(avance % S.grain.width), 0);
    ctx.fillRect(avance % S.grain.width, h * 0.72, w, h * 0.28);
    ctx.restore();
    if (!nuit) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      for (const v of H.ciel.lumiere(alt)) {
        ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha * 0.6 + ")";
        ctx.fillRect(0, 0, b.toile.width, b.toile.height);
      }
    }
    // la trame des gros pixels glisse avec le chemin, sous la ligne du rivage
    H.retro.appliquer(b.toile, H.retro.taillePour(3), 0.7, { x: avance * (b.toile.width / w), depuis: 0.72 });
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
    const sortie = b.sortieEau ? Math.min(1, (t - b.sortieEau) / 1400) : 0;
    for (const [nom, x, ph, miroir] of nageurs) {
      const y = eau + 40 + Math.sin(t / 500 + ph) * 2 * (1 - sortie) - sortie * 44;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, eau);
      ctx.clip();
      H.pixel.dessiner(ctx, nom, x, y, 3, 4, miroir);
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

  async function sortirDeLeau() {
    const b = balade;
    if (!b || b.sortieEau) return;
    b.sortir.hidden = true;
    b.flamant = null;
    // on se hisse hors de l'eau…
    b.sortieEau = performance.now();
    await new Promise((r) => setTimeout(r, 1500));
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
    tg.gain.value = 0.35;
    trem.connect(tg).connect(g.gain);
    const v = 0.05 * H.volume("bruitages");
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
    let derniere = 0, prochainRonflement = performance.now() + 6000 + Math.random() * 8000, zzz = 0, decor = null, cle = "", calque = null;
    const surLesYeux = { oui: false };
    // un clic : « il y a trop de lumière… » et Lóló vient cacher la lumière avec son corps
    toile.addEventListener("click", () => {
      if (H.$(".dialogue") || surLesYeux.oui) return;
      H.lolo.cacherLaLumiere({ couche: () => (surLesYeux.oui = true) });
    });
    // une tête endormie, de face sur l'oreiller (le sprite du jeu, les paupières closes)
    const tete = (ctx, nom, x, y) => {
      const sp = H.pixel.sprite(nom, 0), k = 3;
      ctx.save(); ctx.imageSmoothingEnabled = false;
      ctx.drawImage(sp, 0, 0, 16, 12, x, y, 16 * k, 12 * k);
      ctx.fillStyle = H.pixel.PAL.s;
      for (const ex of [6, 9]) ctx.fillRect(x + ex * k, y + 6 * k, k, k);
      ctx.fillStyle = ENCRE;
      for (const ex of [6, 9]) ctx.fillRect(x + (ex - 0.3) * k, y + 6.6 * k, k * 1.6, k * 0.45);
      ctx.restore();
    };
    function image(t) {
      if (!document.body.contains(toile)) return;
      requestAnimationFrame(image);
      if (t - derniere < 66) return;
      derniere = t;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = toile.clientWidth || 600, h = Math.round((w * 360) / 640);
      if (cle !== w + "|" + dpr) {
        cle = w + "|" + dpr;
        toile.width = Math.round(w * dpr); toile.height = Math.round(h * dpr);
        decor = decorMaison(w, h, dpr, "nuit", true);
      }
      const S = w / 640;
      ctx.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
      ctx.clearRect(0, 0, 640, 360);
      // la nuit derrière la baie
      ctx.save(); cheminFenetre(ctx); ctx.clip();
      dehorsBaie(ctx, t, "nuit", H.ciel.etat());
      ctx.restore();
      ctx.drawImage(decor, 0, 0, 640, 360);
      if (!calque || calque.width !== toile.width || calque.height !== toile.height) { calque = document.createElement("canvas"); calque.width = toile.width; calque.height = toile.height; }
      const cc = calque.getContext("2d");
      cc.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
      cc.clearRect(0, 0, 640, 360);
      cc.lineJoin = "round"; cc.lineCap = "round"; cc.strokeStyle = ENCRE; cc.lineWidth = 1.6;
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

      // Lóló au pied du lit, Mémé en boule sur la couverture ; s'il y a trop de lumière, Lóló vient
      // se coucher sur les yeux de tout le monde
      ctx.save();
      if (surLesYeux.oui) { ctx.translate(92, 178); ctx.scale(0.72, 0.72); }
      else { ctx.translate(196, 196); ctx.scale(0.72, 0.72); }
      loloCouche(ctx, 0, 0, t, false);
      ctx.restore();
      memeEnBoule(ctx, 160, 186, t, 0.62);
      }

      // tout le monde est dans le noir, comme la pièce (seulement sur leurs pixels)
      cc.globalCompositeOperation = "source-atop";
      cc.fillStyle = "rgba(20,18,70,0.22)"; cc.fillRect(0, 0, 640, 360);
      cc.globalCompositeOperation = "source-over";
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(calque, 0, 0); ctx.restore();

      // la lune entre par les trois vitres et se pose sur le sol, en biais, avec l'ombre des branches
      const vent = Math.sin(t / 1800) * 6, { x: fx, y: fy, w: fw, h: fh } = BAIE;
      const proj = (x, y) => [x - (y - fy) * 0.75 - 40, 232 + (y - fy) * 0.62];
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 232, 640, 128); ctx.clip();
      for (let k = 0; k < 3; k++) {
        const x0 = fx + (fw * k) / 3 + 4, x1 = fx + (fw * (k + 1)) / 3 - 4, y0 = fy + 4, y1 = fy + fh - 4;
        const q = [proj(x0, y0), proj(x1, y0), proj(x1, y1), proj(x0, y1)];
        ctx.beginPath(); q.forEach(([x, y], n) => (n ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
        ctx.fillStyle = "rgba(150,185,245,0.15)"; ctx.fill();
      }
      ctx.fillStyle = "rgba(14,16,48,0.18)";
      for (const [dx, dy] of [[30, 30], [46, 22], [24, 96], [40, 88], [70, 64], [96, 44], [110, 110]]) {
        const [x, y] = proj(fx + dx + vent * 1.4, fy + dy);
        ctx.beginPath(); ctx.ellipse(x, y, 11, 4.5, 0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();

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
        ctx.fillText("rrr…", 154 + u * 10, 176 - u * 30);
        ctx.globalAlpha = 1;
      }
      // tout passe en gros pixels, aux couleurs des pochettes
      H.retro.appliquer(toile, H.retro.taillePour(4), 0.3);
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
