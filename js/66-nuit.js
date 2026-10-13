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
  async function raconter(qui) {
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

  // --- la maison ------------------------------------------------------------------------
  H.vues.maison = {
    afficher(c) {
      const nuit = H.ciel.nuitCalme();
      const soir = new Date().getHours() >= 18;
      c.appendChild(H.el("div.page-maison", null,
        H.el("h1", null, "Chez ƟvƟ et Mesi"),
        H.el("p.discret", null, nuit
          ? "Les lumières sont douces, la tisane est encore tiède. La ferme s’endort."
          : soir
            ? "Mesi t’attend avec une tisane de tilleul. On se retrouve ici chaque soir."
            : "Le mazet est calme. Mesi arrose les géraniums de la fenêtre."),
        H.el("h2", null, "Faire une balade"),
        H.el("div.pastilles", null,
          bouton("Avec Mesi", () => H.aller("balade/luigi")),
          loloLa() ? bouton("Avec Lóló et Mémé", () => H.aller("balade/lolo")) : null,
          bouton("Seul·e", () => H.aller("balade/solo"))
        ),
        H.el("h2", null, "Écouter une histoire"),
        H.el("div.pastilles", null,
          bouton("Une douceur de Mesi", () => raconter("luigi")),
          loloLa() ? bouton("Un drame de Lóló", () => raconter("lolo")) : null,
          bouton("Un compliment de Mesi", complimentMesi)
        ),
        H.ressources.quantite("crepe") > 0
          ? H.el("div", null,
              H.el("h2", null, "Le goûter"),
              H.el("div.pastilles", null, bouton("Manger une crêpe au chocolat fondu (" + H.ressources.quantite("crepe") + ")", () => crepeMesi(() => H.aller("maison")))))
          : null,
        nuit ? H.el("div", null, H.el("h2", null, "Bonne nuit"), H.el("div.pastilles", null, bouton("Aller dormir", () => H.aller("dodo/dormir")))) : null,
        H.el("p", null, H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme"))
      ));
    },
  };

  // --- la balade --------------------------------------------------------------------------
  let balade = null;

  // La balade façon pochette de disque : aplats aux formes arrondies, ciel en dégradé,
  // grain de risographie. De jour, le calcaire blanc, la mer turquoise et les pins parasols ;
  // de nuit, des collines sombres sous un ciel violet et la vraie lune.
  function scene(toile, compagnon) {
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
      decalage: 0, compagnon, derniere: performance.now(),
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
  const CYCLE = 4200, ROUGE = [650, 2900];
  function rouge(X) {
    const x = ((X % CYCLE) + CYCLE) % CYCLE;
    return Math.max(0, Math.min(1, (x - ROUGE[0]) / 320, (ROUGE[1] - x) / 320));
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
    // au loin : les falaises de calcaire (rouges en terre rouge), ou des collines la nuit
    if (nuit) {
      collinesPlates(ctx, w, h * 0.58, h * 0.14, avance * 0.1, S.profils.collines, "#2a2c6a", 160);
    } else {
      falaisesPlates(ctx, w, h * 0.58, h * 0.26, avance * 0.1, S.profils.falaises, melange("#f4f1e8", "#d98a5c", ici), melange("#cfc8b8", "#b0583a", ici), 110);
      for (let i = 0; i < 9; i++) buissonPlat(ctx, boucler(i * 140 - avance * 0.1, w, 60), h * 0.58, 16, "#4a9a4e");
    }
    // la mer
    ctx.fillStyle = nuit ? "#26406a" : melange("#12aec4", "#19c1c7", ici);
    ctx.fillRect(0, h * 0.58, w, h * 0.14);
    ctx.fillStyle = nuit ? "#1e3358" : "#0d8fae";
    ctx.fillRect(0, h * 0.58, w, h * 0.02);
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    for (let i = 0; i < 12; i++) ctx.fillRect(boucler(i * 110 - avance * 0.4, w, 40), h * 0.62 + (i % 4) * 7, 22, 1.8);
    // les rochers du rivage : calcaire blanc, ou rouges dans la terre rouge
    if (nuit) collinesPlates(ctx, w, h * 0.73, h * 0.08, avance * 0.55, S.profils.collines2, "#22443c", 110);
    else falaisesPlates(ctx, w, h * 0.73, h * 0.13, avance * 0.6, S.profils.rochers, melange("#ebe6da", "#c9643f", ici), melange("#bdb5a3", "#9a4527", ici), 70);
    // le chemin piéton : beige, puis la terre rouge
    const bandes = 30;
    for (let i = 0; i < bandes; i++) {
      const x0 = (i / bandes) * w, X = avance + x0 + w / bandes / 2 - w * 0.42;
      ctx.fillStyle = nuit ? melange("#2f4a36", "#5e3a2a", rouge(X)) : melange("#e3c08e", "#c9653d", rouge(X));
      ctx.fillRect(Math.floor(x0), h * 0.72, Math.ceil(w / bandes) + 1, h * 0.28);
    }
    for (let i = 0; i < 20; i++) {
      const x = boucler(i * 73 - avance, w, 30);
      ctx.fillStyle = nuit ? "#3a4a3a" : i % 3 ? "#f3e2cf" : "#a8552f";
      ctx.beginPath();
      ctx.ellipse(x, h * (0.78 + (i % 5) * 0.035), 3 + (i % 3), 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    // la garrigue au bord du chemin, et les pins parasols de toutes tailles
    for (let i = 0; i < 14; i++) buissonPlat(ctx, boucler(i * 95 - avance * 0.9, w, 50), h * 0.74, 12 + (i % 3) * 5, nuit ? "#163024" : i % 2 ? "#2f7a3e" : "#4f9a46");
    poses(S.arbres, b, 0.85, (x, taille) => {
      if (nuit) pinPlat(ctx, x, h * 0.76, taille, "#132a1e", "#0f2218", "#132a1e");
      else pinPlat(ctx, x, h * 0.76, taille, taille > 160 ? "#1f7a3a" : "#2d8f45", "#155a2a", "#5a3a2a");
    });
    // les promeneurs, de profil : de vrais pas alternés
    const sol = h * 0.9;
    const pas = (decale) => (b.pause ? 4 : (Math.floor(t / 170) + decale) % 4);
    if (S.compagnon === "lolo") H.pixel.dessiner(ctx, "loloBalade", w * 0.22, sol + 4, 2.4, b.pause ? 0 : Math.floor(t / 230) % 4);
    if (b.baignade) dessinerBaignade(ctx, b, t, w, h);
    else {
      if (S.compagnon === "luigi") H.pixel.dessiner(ctx, "luigiProfil", w * 0.33, sol + 2, 3, pas(2));
      H.pixel.dessiner(ctx, "ovoProfil", w * 0.42, sol, 3, pas(0));
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
    if (b.s.compagnon === "luigi") nageurs.push(["luigiProfil", w * 0.56, 1.7, true]);
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
        H.dialogue.dire([
          { qui: "flamant", texte: "Flma-mala-lamama !" },
          { qui: "ovo", texte: H.histoires.auHasard(["Euh… bonjour, madame la bouée ?", "Flma-mala-lamama à toi aussi !", "Elle a l’air très sûre d’elle."]) },
        ]);
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
    if (b.s.compagnon === "luigi") {
      lignes.push({ qui: "luigi", texte: froid ? "Brrr, elle est fraîche ! Allez, à trois… un, deux… trois !" : "Elle est trop bonne ! On fait la planche ?" });
      lignes.push({ qui: "ovo", texte: froid ? "AAAH ! Elle est glacée… et c’est trop bien." : "On voit les petits poissons entre les rochers !" });
    } else if (b.s.compagnon === "lolo") {
      lignes.push({ qui: "lolo", texte: "Vas-y, je garde tes affaires sur la terre rouge." });
      lignes.push({ qui: "meme", texte: "Mrrrou. (Mémé refuse de mouiller une seule moustache.)" });
    } else {
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

  async function deroulerBalade(compagnon) {
    const intro = {
      luigi: [{ qui: "luigi", texte: "On va voir la mer ? Prends ma main, le chemin est un peu caillouteux." }],
      lolo: [
        { qui: "lolo", texte: "Hiii ! Une balade ! On marche côte à côte, au pas, tranquilles." },
        { qui: "meme", texte: "Mrrr… (Mémé se réveille, s’étire et se met debout sur le dos de Lóló : elle voyage sans même avoir à bouger.)" },
      ],
      solo: [{ qui: "ovo", nom: "Balade", texte: "ƟvƟ part seul·e sur le petit chemin, entre les pins et la mer." }],
    }[compagnon];
    await H.dialogue.dire(intro);
    if (!balade) return;
    if (compagnon === "luigi") {
      await raconter("luigi");
      if (balade) await complimentMesi();
    } else if (compagnon === "lolo") {
      await raconter("lolo");
    } else {
      await H.dialogue.dire(histoires().pensees());
    }
    if (balade && balade.fin) balade.fin.hidden = false;
  }

  H.vues.balade = {
    afficher(c, params) {
      let compagnon = ["luigi", "lolo", "solo"].includes(params[0]) ? params[0] : "luigi";
      if (compagnon === "lolo" && !loloLa()) compagnon = "solo";
      const toile = H.el("canvas.toile-balade", { "aria-label": "Balade le long des calanques" });
      const bain = H.el("button.bouton", { type: "button", hidden: true, onclick: () => baignade() }, "Aller se baigner");
      const sortir = H.el("button.bouton", { type: "button", hidden: true, onclick: () => sortirDeLeau() }, "Sortir de l’eau");
      const fin = H.el("div.pastilles.fin-balade", { hidden: true },
        bouton("Continuer la balade", () => { fin.hidden = true; deroulerBalade(compagnon); }),
        bouton("Rentrer à la maison", () => H.aller("maison"))
      );
      c.append(
        H.el("h1", null, compagnon === "solo" ? "Balade en solo" : compagnon === "lolo" ? "Balade avec Lóló et Mémé" : "Balade avec Mesi"),
        H.el("div.cadre-balade", null, toile),
        H.el("div.pastilles.actions-balade", null, bain, sortir),
        fin
      );
      balade = { toile, fin, bain, sortir, s: scene(toile, compagnon) };
      dessinerBalade();
      setTimeout(() => balade && deroulerBalade(compagnon), 700);
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
