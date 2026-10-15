// Pinceau aquarelle : taches superposées très transparentes aux bords déformés,
// trait d'encre un peu tremblé. Les images sont dessinées une fois puis gardées.
(function () {
  const H = window.H;
  const cache = new Map();

  function toile(w, h) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    return c;
  }

  function polygone(r, cx, cy, rx, ry, n) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const k = 0.88 + r() * 0.24;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  function deformer(r, pts, force) {
    const out = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      out.push(a);
      const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const g = (r() + r() + r() - 1.5) * d * force;
      out.push([(a[0] + b[0]) / 2 + g * (r() - 0.5) * 2, (a[1] + b[1]) / 2 + g * (r() - 0.5) * 2]);
    }
    return out;
  }
  function remplir(ctx, pts) {
    ctx.beginPath();
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
    ctx.fill();
  }

  // Tache ovale (cx, cy, rx, ry).
  function tache(ctx, r, cx, cy, rx, ry, couleur, opts) {
    opts = opts || {};
    const couches = opts.couches || 18;
    let base = polygone(r, cx, cy, rx, ry, 10);
    for (let k = 0; k < 2; k++) base = deformer(r, base, opts.bord || 0.45);
    ctx.save();
    ctx.fillStyle = couleur;
    ctx.globalAlpha = opts.alpha || 0.06;
    for (let l = 0; l < couches; l++) {
      let s = base;
      for (let k = 0; k < 3; k++) s = deformer(r, s, 0.55);
      remplir(ctx, s);
    }
    ctx.restore();
  }

  // Tache qui suit une forme quelconque (liste de points).
  function lavis(ctx, r, pts, couleur, opts) {
    opts = opts || {};
    ctx.save();
    ctx.fillStyle = couleur;
    ctx.globalAlpha = opts.alpha || 0.07;
    for (let l = 0; l < (opts.couches || 14); l++) {
      let s = pts;
      for (let k = 0; k < 2; k++) s = deformer(r, s, opts.bord || 0.12);
      remplir(ctx, s);
    }
    ctx.restore();
  }

  // Trait d'encre tremblé passant par les points.
  function trait(ctx, r, pts, opts) {
    opts = opts || {};
    ctx.save();
    ctx.strokeStyle = opts.couleur || "#23214a";
    ctx.lineWidth = opts.epaisseur || 1.6;
    ctx.lineCap = ctx.lineJoin = "round";
    ctx.globalAlpha = opts.alpha || 0.85;
    const passes = opts.passes || 1;
    for (let p = 0; p < passes; p++) {
      ctx.beginPath();
      pts.forEach((q, i) => {
        const j = opts.tremble == null ? 0.7 : opts.tremble;
        const x = q[0] + (r() - 0.5) * j, y = q[1] + (r() - 0.5) * j;
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      });
      if (opts.ferme) ctx.closePath();
      ctx.stroke();
    }
    ctx.restore();
  }

  // Contour arrondi en points (rectangle à coins ronds), pour bocaux et flacons.
  function rectArrondi(x, y, w, h, rr, pas) {
    const pts = [];
    pas = pas || 6;
    const coin = (cx, cy, a0) => {
      for (let i = 0; i <= pas; i++) {
        const a = a0 + (i / pas) * (Math.PI / 2);
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
    };
    coin(x + w - rr, y + rr, -Math.PI / 2);
    coin(x + w - rr, y + h - rr, 0);
    coin(x + rr, y + h - rr, Math.PI / 2);
    coin(x + rr, y + rr, Math.PI);
    return pts;
  }

  function grain(ctx, r, w, h, n, alpha) {
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = "rgba(120,95,60," + r() * alpha + ")";
      ctx.fillRect(r() * w, r() * h, 1.2, 1.2);
    }
  }

  // --- papier de fond --------------------------------------------------------
  // Le papier du fond : un papier recyclé clair, avec de petites fibres et quelques paillettes
  // de couleur (la nuit, le même en bleu nuit). Le motif se répète sans couture.
  function papier(nuit) {
    const cle = "papier" + (nuit ? "n" : "j");
    if (cache.has(cle)) return cache.get(cle);
    const w = 320, h = 320, c = toile(w, h), ctx = c.getContext("2d"), r = H.alea(7);
    ctx.fillStyle = nuit ? "#1c1b3a" : "#f2f0e8";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = nuit ? "rgba(243,234,216," + (0.02 + r() * 0.04) + ")" : "rgba(35,33,74," + (0.02 + r() * 0.04) + ")";
      ctx.fillRect(r() * w, r() * h, 1, 1);
    }
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 140; i++) {
      const a = r() * w, b = r() * h, l = 3 + r() * 9, ang = r() * Math.PI;
      ctx.strokeStyle = nuit ? (r() < 0.7 ? "rgba(160,150,200,0.22)" : "rgba(255,255,255,0.12)") : (r() < 0.7 ? "rgba(140,128,110,0.25)" : "rgba(255,255,255,0.8)");
      for (const dx of [-w, 0, w]) {
        for (const dy of [-h, 0, h]) {
          ctx.beginPath();
          ctx.moveTo(a + dx, b + dy);
          ctx.quadraticCurveTo(a + dx + Math.cos(ang) * l * 0.5 + 2, b + dy + Math.sin(ang) * l * 0.5, a + dx + Math.cos(ang) * l, b + dy + Math.sin(ang) * l);
          ctx.stroke();
        }
      }
    }
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = ["rgba(255,91,79,0.35)", "rgba(56,38,242,0.3)", "rgba(31,59,44,0.3)"][i % 3];
      ctx.fillRect(r() * w, r() * h, 1.5, 1.2);
    }
    const url = c.toDataURL("image/png");
    cache.set(cle, url);
    return url;
  }

  // --- planche d'étagère -----------------------------------------------------
  // la planche d'étagère en pixels : bois clair sur le dessus, chant plus sombre, veines
  function planche() {
    if (cache.has("planchepx")) return cache.get("planchepx");
    const c = document.createElement("canvas");
    c.width = 200; c.height = 5;
    const g = c.getContext("2d");
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    R(0, 0, 200, 1, "#23214a"); R(0, 1, 200, 1, "#e9b44c"); R(0, 2, 200, 2, "#b9834f"); R(0, 4, 200, 1, "#23214a");
    for (let x = 0; x < 200; x += 7) R(x + ((x * 13) % 5), 2 + ((x / 7) % 2), 3, 1, "#9a6a3c");
    const url = c.toDataURL("image/png");
    cache.set("planchepx", url);
    return url;
  }
  // --- bocaux ------------------------------------------------------------------
  // Chaque forme : contour du verre, zone du contenu, bouchon.
  const FORMES = {
    bocal: { w: 74, h: 96 },
    flacon: { w: 50, h: 100 },
    "compte-gouttes": { w: 40, h: 92 },
    "huile-essentielle": { w: 34, h: 80 },
    pot: { w: 76, h: 66 },
    tube: { w: 26, h: 88 },
  };

  // Niveau du stock : plein, à moitié, presque vide, vide (fraction du contenu dessiné).
  const NIVEAUX = { plein: 1, moitie: 0.55, "presque-vide": 0.18, vide: 0 };

  function bocal(forme, teinte, niveau) {
    const fraction = NIVEAUX[niveau] == null ? 1 : NIVEAUX[niveau];
    const cle = "bocalpx|" + forme + "|" + teinte + "|" + fraction;
    if (!cache.has(cle)) cache.set(cle, bocalPixel(forme, teinte, fraction));
    return cache.get(cle);
  }

  // Les bocaux en gros pixels, comme la ferme : verre clair ou ambré cerné d'encre, le contenu
  // qui baisse avec le stock, le couvercle ou le bouchon de chaque forme. (Un pixel du dessin
  // fait environ trois pixels à l'écran.)
  function bocalPixel(forme, teinte, fraction) {
    const f = FORMES[forme] || FORMES.bocal;
    const W = Math.round((f.w + 12) / 3), Hh = Math.round((f.h + 8) / 3);
    const c = document.createElement("canvas");
    c.width = W; c.height = Hh;
    const g = c.getContext("2d");
    const R = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const E = "#23214a", VERRE = "#d6eef7", REFLET = "#ffffff", AMBRE = "#b5651d", AMBRE_F = "#7a4520";
    const sombre = (hex, k) => "#" + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * k).toString(16).padStart(2, "0")).join("");
    const t = /^#[0-9a-f]{6}$/i.test(teinte) ? teinte : "#6f8a3c";
    // un corps : cadre d'encre, verre, contenu jusqu'à la fraction, reflet
    const corps = (x, y, w, h, verre, contenuCol, reflet) => {
      R(x, y, w, h, E); R(x + 1, y + 1, w - 2, h - 2, verre);
      const hc = Math.round((h - 3) * fraction);
      if (hc > 0) { R(x + 1, y + h - 1 - hc, w - 2, hc, contenuCol); R(x + 1, y + h - 1 - hc, w - 2, 1, sombre(contenuCol, 0.8)); for (let k = 0; k < (w * hc) / 6; k++) R(x + 2 + ((k * 7) % Math.max(1, w - 4)), y + h - 2 - ((k * 5) % Math.max(1, hc)), 1, 1, sombre(contenuCol, 0.75)); }
      if (reflet) R(x + 2, y + 2, 1, Math.max(2, Math.round(h * 0.45)), REFLET);
    };
    if (forme === "bocal") {
      corps(1, 6, W - 2, Hh - 7, VERRE, t, true);
      R(2, 1, W - 4, 6, E); R(3, 2, W - 6, 4, "#ff5b4f"); R(3, 2, W - 6, 1, "#ff8f7a"); R(3, 5, W - 6, 1, "#d23a2a");
    } else if (forme === "pot") {
      corps(1, 5, W - 2, Hh - 6, VERRE, "#e9b44c", true);
      if (fraction > 0) R(4, Hh - 2 - Math.round((Hh - 9) * fraction * 0.7), W - 8, Math.max(1, Math.round((Hh - 9) * fraction * 0.7)), t);
      R(0, 1, W, 5, E); R(1, 2, W - 2, 3, "#f3ee6a"); R(1, 2, W - 2, 1, "#fffbb0");
    } else if (forme === "tube") {
      corps(1, 6, W - 2, Hh - 7, VERRE, "#f3f0dc", false);
      R(0, 1, W, 6, E); R(1, 2, W - 2, 4, t);
    } else if (forme === "huile-essentielle") {
      corps(1, 10, W - 2, Hh - 11, AMBRE, AMBRE_F, true);
      R(1, Math.round(Hh * 0.55), W - 2, 4, E); R(2, Math.round(Hh * 0.55) + 1, W - 4, 2, "#efe2c4");
      R(2, 5, W - 4, 6, E); R(3, 6, W - 6, 4, "#2a2540");
      for (let x = 3; x < W - 3; x += 2) R(x, 6, 1, 4, "#4a4560");
      R(3, 1, W - 6, 5, E); R(4, 2, W - 8, 3, "#2a2540");
    } else {
      // flacon ou compte-gouttes : épaules, goulot, et le bouchon bleu ou la poire rouge
      const large = forme === "flacon", cx = Math.floor(W / 2), col = large ? 3 : 2;
      corps(1, 13, W - 2, Hh - 14, AMBRE, AMBRE_F, true);
      R(cx - col - 1, 9, col * 2 + 2, 5, E); R(cx - col, 10, col * 2, 4, AMBRE);
      if (large) { R(cx - col - 2, 3, col * 2 + 4, 7, E); R(cx - col - 1, 4, col * 2 + 2, 5, "#3d5ee8"); R(cx - col - 1, 4, col * 2 + 2, 1, "#7f97f2"); }
      else { R(cx - col - 1, 7, col * 2 + 2, 3, E); R(cx - 2, 1, 4, 7, E); R(cx - 1, 2, 2, 5, "#ff5b4f"); }
    }
    return c.toDataURL("image/png");
  }

  // Couleur de la plante dans le bocal : verte, brune, dorée ou fleurie.
  const TEINTES_PLANTES = ["#6f8a3c", "#8a9a4a", "#5d7a3a", "#a08a4a", "#7a5a32", "#b89a52", "#9b6a8a", "#c27a3a", "#7d8a6a", "#4f6b4a"];
  function teintePlante(p) {
    if (p.couleur) return p.couleur;
    return TEINTES_PLANTES[H.hash(p.id) % TEINTES_PLANTES.length];
  }

  // Ligne de crête découpée, comme les calanques vues de loin : des pics, des à-pics, des replats.
  function crete(r, w, yBase, hauteur, pas) {
    // quelques sommets, puis on subdivise chaque segment en déplaçant son milieu (relief naturel)
    const n = Math.max(3, Math.round(w / (pas * 2.2)));
    let pts = [];
    for (let i = 0; i <= n; i++) {
      const creux = r() < 0.25; // une crique entre deux massifs
      pts.push([(i / n) * (w + 40) - 20, yBase - hauteur * (creux ? 0.15 + r() * 0.2 : 0.45 + r() * 0.55)]);
    }
    for (let niveau = 0; niveau < 6; niveau++) {
      const suivants = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        const d = x1 - x0;
        // le calcaire casse net : déplacements forts, parfois des à-pics
        const ym = (y0 + y1) / 2 + (r() - 0.5) * d * (niveau < 2 ? 0.55 : 0.45);
        suivants.push([x0, y0], [x0 + d * (0.35 + r() * 0.3), ym]);
      }
      suivants.push(pts[pts.length - 1]);
      pts = suivants.map(([x, y]) => [x, Math.max(yBase - hauteur, Math.min(yBase - 2, y))]);
    }
    return pts;
  }

  // Les calanques à l'horizon : un plan lointain bleuté, un plan plus proche de calcaire clair,
  // avec des fissures et quelques pins d'Alep au pied.
  function calanques(ctx, r, w, yBase, hauteur, nuit) {
    const loin = crete(r, w, yBase, hauteur * 0.75, w / 14);
    H.aqua.lavis(ctx, r, loin.concat([[w + 20, yBase + 4], [-20, yBase + 4]]), nuit ? "#4a4f74" : "#8fb2d8", { alpha: 0.14, couches: 10, bord: 0.03 });
    const pres = crete(r, w, yBase + hauteur * 0.08, hauteur, w / 10);
    H.aqua.lavis(ctx, r, pres.concat([[w + 20, yBase + hauteur * 0.12], [-20, yBase + hauteur * 0.12]]), nuit ? "#6b6a86" : "#cfdbe8", { alpha: 0.22, couches: 12, bord: 0.03 });
    // ombre des falaises et fissures verticales
    for (let i = 1; i < pres.length; i++) {
      const [x0, y0] = pres[i - 1], [x1, y1] = pres[i];
      // une pente très raide orientée vers la droite reste à l'ombre (lumière venant de l'est)
      if (y1 - y0 > (x1 - x0) * 1.3 && y1 - y0 > hauteur * 0.08) {
        H.aqua.lavis(ctx, r, [[x0, y0], [x1, y1], [x1 + 2, yBase + hauteur * 0.1], [x0, yBase + hauteur * 0.1]], nuit ? "#3a3a58" : "#a6b8cf", { alpha: 0.1, couches: 4 });
      }
      if (r() < 0.035) {
        const xc = x0 + (x1 - x0) * r();
        H.aqua.trait(ctx, r, [[xc, Math.max(y0, y1) + 4], [xc + (r() - 0.5) * 4, yBase + hauteur * 0.05]], { couleur: nuit ? "#2a2a40" : "#8d9db4", epaisseur: 0.8, alpha: 0.35 });
      }
    }
    // pins d'Alep en bas des falaises
    for (let i = 0; i < Math.round(w / 40); i++) {
      const x = r() * w, y = yBase + hauteur * (0.02 + r() * 0.1);
      H.aqua.tache(ctx, r, x, y, 5 + r() * 6, 3 + r() * 3, nuit ? "#2e3e3a" : "#6a8a90", { alpha: 0.18, couches: 5 });
    }
  }

  // des nuages à l'aquarelle entre y0 et y1 ; « ventre » : le dessous plus sombre des nuages de pluie
  function nuages(ctx, r, x0, w, y0, y1, opts) {
    const n = opts.n || 5;
    for (let i = 0; i < n; i++) {
      const cx = x0 + (i + 0.2 + r() * 0.6) * (w / n), cy = y0 + r() * (y1 - y0);
      const large = (w / n) * (0.55 + r() * 0.55), haut = large * 0.3;
      if (opts.ventre) tache(ctx, r, cx, cy + haut * 0.3, large * 0.5, haut * 0.32, opts.ventre, { alpha: 0.2, couches: 6 });
      for (let j = 0; j < 7; j++) {
        tache(ctx, r, cx + (r() - 0.5) * large * 0.9, cy - (j % 3 === 0 ? haut * 0.35 : 0) + (r() - 0.5) * haut * 0.4,
          large * (0.2 + r() * 0.16), haut * (0.45 + r() * 0.35), opts.couleur, { alpha: opts.alpha || 0.24, couches: 7 });
      }
    }
  }

  H.aqua = { nuages, NIVEAUX, calanques, crete, toile, tache, lavis, trait, polygone, deformer, rectArrondi, grain, papier, planche, bocal, teintePlante, FORMES, TEINTES_PLANTES };
})();
