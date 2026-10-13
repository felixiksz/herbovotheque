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
    ctx.strokeStyle = opts.couleur || "#2b2622";
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
  function papier(nuit) {
    const cle = "papier" + (nuit ? "n" : "j");
    if (cache.has(cle)) return cache.get(cle);
    const w = 420, h = 420, c = toile(w, h), ctx = c.getContext("2d"), r = H.alea(7);
    ctx.fillStyle = nuit ? "#1d1b2e" : "#f8f2e4";
    ctx.fillRect(0, 0, w, h);
    const teintes = nuit ? ["#262340", "#212a44", "#2a2442"] : ["#efe2c8", "#f3e9d2", "#eadcc0"];
    // chaque tache est répétée de l'autre côté des bords : le motif se raccorde sans couture
    for (let i = 0; i < 9; i++) {
      const x = r() * w, y = r() * h, rx = 50 + r() * 90, ry = 40 + r() * 80, t = teintes[i % 3];
      const graine = Math.floor(r() * 1e9);
      for (const dx of [-w, 0, w]) {
        for (const dy of [-h, 0, h]) {
          tache(ctx, H.alea(graine), x + dx, y + dy, rx, ry, t, { alpha: nuit ? 0.035 : 0.045, couches: 10 });
        }
      }
    }
    grain(ctx, r, w, h, 2600, nuit ? 0.1 : 0.08);
    const url = c.toDataURL("image/png");
    cache.set(cle, url);
    return url;
  }

  // --- planche d'étagère -----------------------------------------------------
  function planche() {
    if (cache.has("planche")) return cache.get("planche");
    const w = 600, h = 36, c = toile(w, h), ctx = c.getContext("2d"), r = H.alea(3);
    lavis(ctx, r, [[0, 6], [w, 4], [w, h - 4], [0, h - 2]], "#a8743f", { alpha: 0.18, couches: 10, bord: 0.04 });
    lavis(ctx, r, [[0, 4], [w, 5], [w, 12], [0, 11]], "#d9a564", { alpha: 0.2, couches: 6, bord: 0.04 });
    for (let i = 0; i < 9; i++) {
      const y = 12 + r() * (h - 18);
      const pts = [];
      for (let x = 0; x <= w; x += 30) pts.push([x, y + Math.sin(x / 40 + i) * 1.5]);
      trait(ctx, r, pts, { couleur: "#6b4423", epaisseur: 0.8, alpha: 0.25 });
    }
    trait(ctx, r, [[0, 5], [w, 4]], { epaisseur: 1.2, alpha: 0.6 });
    trait(ctx, r, [[0, h - 3], [w, h - 4]], { epaisseur: 1.4, alpha: 0.7 });
    const url = c.toDataURL("image/png");
    cache.set("planche", url);
    return url;
  }

  // --- bocaux ------------------------------------------------------------------
  // Chaque forme : contour du verre, zone du contenu, bouchon.
  const FORMES = {
    bocal: { w: 74, h: 96 },
    flacon: { w: 50, h: 100 },
    "compte-gouttes": { w: 40, h: 92 },
    pot: { w: 76, h: 66 },
    tube: { w: 26, h: 88 },
  };

  // Niveau du stock : plein, à moitié, presque vide, vide (fraction du contenu dessiné).
  const NIVEAUX = { plein: 1, moitie: 0.55, "presque-vide": 0.18, vide: 0 };

  // contenu qui remplit le bas d'une zone (x, y, w, h) selon la fraction
  function contenu(x, y, w, h, fraction, rayon) {
    const hc = h * fraction;
    return rectArrondi(x, y + h - hc, w, hc, Math.min(rayon, hc / 2));
  }

  function dessinerBocal(forme, teinte, graine, fraction) {
    if (fraction == null) fraction = 1;
    const S = 2;
    const f = FORMES[forme] || FORMES.bocal;
    const W = (f.w + 12) * S, Hh = (f.h + 8) * S;
    const c = toile(W, Hh), ctx = c.getContext("2d"), r = H.alea(graine);
    ctx.scale(S, S);
    const x0 = 6, bas = f.h + 4;
    const verre = "#bfe3e8", ambre = "#b5651d";

    if (forme === "bocal") {
      const corps = rectArrondi(x0, 22, f.w, f.h - 18, 12);
      if (fraction > 0) lavis(ctx, r, contenu(x0 + 4, 40, f.w - 8, f.h - 40, fraction, 9), teinte, { alpha: 0.16, couches: 14, bord: 0.18 });
      tache(ctx, r, x0 + f.w * 0.35, 58, 10, 6, "#ffffff", { alpha: 0.05, couches: 6 });
      lavis(ctx, r, corps, verre, { alpha: 0.05, couches: 8 });
      trait(ctx, r, corps.concat([corps[0]]), { epaisseur: 1.5 });
      const couvercle = rectArrondi(x0 + 4, 8, f.w - 8, 16, 4);
      lavis(ctx, r, couvercle, "#c9a26b", { alpha: 0.25, couches: 10 });
      trait(ctx, r, couvercle.concat([couvercle[0]]), { epaisseur: 1.4 });
      trait(ctx, r, [[x0 + 10, 30], [x0 + 10, 64]], { couleur: "#ffffff", epaisseur: 3, alpha: 0.6 });
    } else if (forme === "flacon" || forme === "compte-gouttes") {
      const large = forme === "flacon";
      const col = large ? 14 : 10;
      const cx = x0 + f.w / 2;
      const epaule = large ? 34 : 40;
      const corps = [
        [cx - col / 2, epaule - 10], [cx - col / 2, epaule - 2], [x0 + 2, epaule + 10], [x0, epaule + 18],
        [x0, bas - 6], [x0 + 4, bas], [x0 + f.w - 4, bas], [x0 + f.w, bas - 6], [x0 + f.w, epaule + 18],
        [x0 + f.w - 2, epaule + 10], [cx + col / 2, epaule - 2], [cx + col / 2, epaule - 10],
      ];
      lavis(ctx, r, corps, ambre, { alpha: 0.13, couches: 14, bord: 0.1 });
      if (fraction > 0) lavis(ctx, r, contenu(x0 + 3, epaule + 22, f.w - 6, bas - epaule - 26, fraction, 4), "#6b3410", { alpha: 0.12, couches: 10 });
      trait(ctx, r, corps, { epaisseur: 1.5 });
      if (large) {
        const bouchon = rectArrondi(cx - col / 2 - 4, epaule - 26, col + 8, 18, 3);
        lavis(ctx, r, bouchon, "#2b2622", { alpha: 0.3, couches: 8 });
        trait(ctx, r, bouchon.concat([bouchon[0]]), { epaisseur: 1.3 });
      } else {
        const bague = rectArrondi(cx - col / 2 - 3, epaule - 18, col + 6, 9, 2);
        lavis(ctx, r, bague, "#2b2622", { alpha: 0.35, couches: 8 });
        trait(ctx, r, bague.concat([bague[0]]), { epaisseur: 1.2 });
        const poire = polygone(r, cx, epaule - 30, 6, 12, 14);
        lavis(ctx, r, poire, "#2b2622", { alpha: 0.28, couches: 8, bord: 0.05 });
        trait(ctx, r, poire.concat([poire[0]]), { epaisseur: 1.2 });
      }
      trait(ctx, r, [[x0 + 6, epaule + 24], [x0 + 6, bas - 14]], { couleur: "#fff3dc", epaisseur: 2.4, alpha: 0.55 });
    } else if (forme === "pot") {
      const corps = rectArrondi(x0, 18, f.w, f.h - 14, 10);
      if (fraction > 0) {
        lavis(ctx, r, contenu(x0 + 4, 30, f.w - 8, f.h - 30, fraction, 8), "#e2b33c", { alpha: 0.13, couches: 12 });
        lavis(ctx, r, contenu(x0 + 8, 38, f.w - 16, f.h - 44, fraction, 6), teinte, { alpha: 0.12, couches: 10, bord: 0.2 });
      }
      lavis(ctx, r, corps, verre, { alpha: 0.05, couches: 8 });
      trait(ctx, r, corps.concat([corps[0]]), { epaisseur: 1.5 });
      const couvercle = rectArrondi(x0 - 2, 6, f.w + 4, 14, 4);
      lavis(ctx, r, couvercle, "#d8d2c4", { alpha: 0.3, couches: 10 });
      trait(ctx, r, couvercle.concat([couvercle[0]]), { epaisseur: 1.4 });
    } else if (forme === "tube") {
      const corps = rectArrondi(x0, 22, f.w, f.h - 18, 6);
      if (fraction > 0) lavis(ctx, r, contenu(x0 + 3, 40, f.w - 6, f.h - 40, fraction, 5), "#ffffff", { alpha: 0.4, couches: 6 });
      const hg = (f.h - 50) * fraction;
      for (let i = 0; i < Math.round(26 * fraction); i++) {
        tache(ctx, r, x0 + 5 + r() * (f.w - 10), 44 + (f.h - 50 - hg) + r() * hg, 2.2, 2.2, "#d9d3c7", { alpha: 0.25, couches: 3 });
      }
      lavis(ctx, r, corps, verre, { alpha: 0.06, couches: 6 });
      trait(ctx, r, corps.concat([corps[0]]), { epaisseur: 1.3 });
      const bouchon = rectArrondi(x0 - 2, 6, f.w + 4, 18, 3);
      lavis(ctx, r, bouchon, teinte, { alpha: 0.3, couches: 10 });
      trait(ctx, r, bouchon.concat([bouchon[0]]), { epaisseur: 1.3 });
    }
    return c.toDataURL("image/png");
  }

  function bocal(forme, teinte, niveau) {
    const fraction = NIVEAUX[niveau] == null ? 1 : NIVEAUX[niveau];
    const cle = "bocal|" + forme + "|" + teinte + "|" + fraction;
    // même graine quel que soit le niveau : le bocal reste le même, seul le contenu baisse
    if (!cache.has(cle)) cache.set(cle, dessinerBocal(forme, teinte, "bocal|" + forme + "|" + teinte, fraction));
    return cache.get(cle);
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
    H.aqua.lavis(ctx, r, loin.concat([[w + 20, yBase + 4], [-20, yBase + 4]]), nuit ? "#4a4f74" : "#a9b6c9", { alpha: 0.14, couches: 10, bord: 0.03 });
    const pres = crete(r, w, yBase + hauteur * 0.08, hauteur, w / 10);
    H.aqua.lavis(ctx, r, pres.concat([[w + 20, yBase + hauteur * 0.12], [-20, yBase + hauteur * 0.12]]), nuit ? "#6b6a86" : "#e9e1cf", { alpha: 0.22, couches: 12, bord: 0.03 });
    // ombre des falaises et fissures verticales
    for (let i = 1; i < pres.length; i++) {
      const [x0, y0] = pres[i - 1], [x1, y1] = pres[i];
      // une pente très raide orientée vers la droite reste à l'ombre (lumière venant de l'est)
      if (y1 - y0 > (x1 - x0) * 1.3 && y1 - y0 > hauteur * 0.08) {
        H.aqua.lavis(ctx, r, [[x0, y0], [x1, y1], [x1 + 2, yBase + hauteur * 0.1], [x0, yBase + hauteur * 0.1]], nuit ? "#3a3a58" : "#c4b8a2", { alpha: 0.1, couches: 4 });
      }
      if (r() < 0.035) {
        const xc = x0 + (x1 - x0) * r();
        H.aqua.trait(ctx, r, [[xc, Math.max(y0, y1) + 4], [xc + (r() - 0.5) * 4, yBase + hauteur * 0.05]], { couleur: nuit ? "#2a2a40" : "#a89c86", epaisseur: 0.8, alpha: 0.35 });
      }
    }
    // pins d'Alep en bas des falaises
    for (let i = 0; i < Math.round(w / 40); i++) {
      const x = r() * w, y = yBase + hauteur * (0.02 + r() * 0.1);
      H.aqua.tache(ctx, r, x, y, 5 + r() * 6, 3 + r() * 3, nuit ? "#2e3e3a" : "#5f7a4a", { alpha: 0.18, couches: 5 });
    }
  }

  H.aqua = { NIVEAUX, calanques, crete, toile, tache, lavis, trait, polygone, deformer, rectArrondi, grain, papier, planche, bocal, teintePlante, FORMES, TEINTES_PLANTES };
})();
