// L'écran d'accueil, là où l'on tape le mot de passe : une scène en pixels dans les calanques.
// Le jour, des plantes médicinales en gros plan devant la mer ; la nuit, un jardin sauvage sous de
// grands pins parasols, la lune sur l'eau et des lucioles. (Les fiches ne sont pas encore ouvertes : l'heure
// du lever et du coucher vient d'une petite table pour Marseille.)
(function () {
  const H = (window.H = window.H || {});
  const HAUT = 160;
  let W = 256;
  const TRAME = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const P = (c, x, y, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); };
  const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x | 0, y | 0, Math.max(1, w | 0), Math.max(1, h | 0)); };
  const tr = (x, y) => TRAME[(y & 3) * 4 + (x & 3)];

  // le lever et le coucher du soleil à Marseille, mois par mois (en heures)
  const LEVER = [8.1, 7.6, 7, 7.1, 6.5, 6, 6.1, 6.6, 7.2, 7.7, 7.3, 7.9];
  const COUCHER = [17.3, 18, 18.6, 20.2, 20.8, 21.3, 21.3, 20.8, 20, 19.1, 17.4, 17];
  function estNuit() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60, m = d.getMonth();
    return h < LEVER[m] || h >= COUCHER[m];
  }

  function degrade(c, stops, y0, y1) {
    for (let y = y0; y < y1; y++) {
      const t = ((y - y0) / Math.max(1, y1 - y0 - 1)) * (stops.length - 1), k = Math.floor(t), f = t - k;
      for (let x = 0; x < W; x++) P(c, x, y, f * 16 > tr(x, y) + 0.5 ? stops[Math.min(k + 1, stops.length - 1)] : stops[k]);
    }
  }
  function ovale(c, cx, cy, rx, ry, col) {
    for (let dy = -ry; dy <= ry; dy++) for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx + 0.5) + (dy * dy) / (ry * ry + 0.5) > 1) continue;
      const k = typeof col === "function" ? col(dx, dy) : col;
      if (k) P(c, cx + dx, cy + dy, k);
    }
  }
  function calanques(c, base, massifs, C, soleil) {
    const haut = new Array(W).fill(base);
    massifs.forEach(([a, b, h, g]) => {
      a *= W; b *= W;
      for (let x = Math.max(0, Math.floor(a)); x < Math.min(W, b); x++) {
        const u = (x - a) / (b - a), d = Math.pow(Math.max(0, Math.sin(Math.PI * u)), 0.42);
        const y = Math.round(base - h * d - Math.sin(x / 5 + g) * 1.1 - hash(x, g) * 1.4);
        if (y < haut[x]) haut[x] = y;
      }
    });
    for (let x = 0; x < W; x++) {
      if (haut[x] >= base) continue;
      const pente = (haut[Math.min(W - 1, x + 3)] - haut[Math.max(0, x - 3)]) * soleil, H0 = base - haut[x];
      for (let y = haut[x]; y < base; y++) {
        const p = (y - haut[x]) / Math.max(1, H0);
        let col = pente > 2.2 ? C.ombre : pente > 1 ? ((x + y) % 2 ? C.ombre : C.clair) : p > 0.72 ? ((x + y) % 2 ? C.moyen : C.clair) : C.clair;
        if (col === C.clair && y % 5 === 0 && hash(x >> 2, y) < 0.55) col = C.moyen;
        const tache = hash(x >> 2, (y / 3) | 0);
        if (p < 0.6 && tache < 0.12) col = tache < 0.05 ? C.pins[2] : C.pins[1];
        P(c, x, y, col);
      }
      if (Math.abs(pente) < 1.6) { const ep = 1 + Math.round(hash(x, 23) * 2.6); for (let k = 0; k < ep; k++) P(c, x, haut[x] + k - 1, k === 0 ? C.pins[0] : C.pins[1]); }
      if (hash(x, 24) < 0.035 && Math.abs(pente) < 1.2 && H0 > 10) {
        for (let k = 1; k <= 3; k++) P(c, x, haut[x] - k, C.tronc);
        R(c, x - 3, haut[x] - 5, 7, 1, C.pins[1]); R(c, x - 2, haut[x] - 6, 5, 1, C.pins[0]);
      }
    }
  }
  function cap(c, x0, x1, base, h, col, colFace) {
    for (let x = Math.floor(x0); x < x1 + h * 0.3 && x < W; x++) {
      const u = Math.min(1, (x - x0) / (x1 - x0));
      let y = Math.round(base - h * Math.pow(u, 0.8) - Math.sin(x / 7) * 0.8);
      if (x > x1) y = Math.round(base - h + (x - x1) * 3.3);
      for (let yy = y; yy < base; yy++) P(c, x, yy, x > x1 - 1 ? colFace : col);
    }
  }
  // la mer : claire et lisse vers l'horizon, plus profonde et plus détaillée en s'approchant
  function mer(c, y0, y1, stops, reflet) {
    degrade(c, stops, y0, y1);
    for (let k = 0; k < W / 3; k++) {
      const u = Math.pow(hash(3, k), 1.4); if (u < 0.12) continue;
      R(c, (hash(k, 3) * W) | 0, y0 + 1 + ((u * (y1 - y0 - 2)) | 0), 1 + ((u * 4) | 0), 1, reflet);
    }
  }
  function lavande(c, x, y, C) {
    ovale(c, x, y - 1, 3, 2, (dx) => (hash(x + dx, y) < 0.5 ? C.feuille : C.feuilleOmbre));
    for (let k = -3; k <= 3; k++) { if (hash(x + k, y) < 0.25) continue; const hh = 2 + Math.round(hash(k, x) * 2); for (let j = 0; j < hh; j++) P(c, x + k, y - 3 - j, j === hh - 1 ? C.fleurClair : (j + k) % 2 ? C.fleur : C.fleurOmbre); }
  }

  // Un pin parasol : un tronc qui penche et se partage en Y, et une couronne large et plate faite de
  // nuages d'aiguilles. Tout est sombre, sauf le bord tourné vers la lune.
  const PIN = "#07061f", PIN_BORD = "#24285e", PIN_TRONC = "#0b0820";
  function pinParasol(c, xPied, xCime, yCime, largeur, lune) {
    const yPied = HAUT + 2, haut = yPied - yCime;
    // le tronc, épais en bas, et la fourche aux deux tiers
    const fourche = 0.62;
    const tronc = (u) => [xPied + (xCime - xPied) * Math.pow(u, 1.3) + Math.sin(u * 3) * 2, yPied - haut * u];
    for (let u = 0; u < fourche; u += 0.004) { const [x, y] = tronc(u); R(c, x - 1, y, 2 + (u < 0.3 ? 1 : 0), 1, PIN_TRONC); }
    const [fx, fy] = tronc(fourche);
    const branches = [[-largeur * 0.55, yCime + 7], [largeur * 0.5, yCime + 6], [-largeur * 0.1, yCime + 4], [largeur * 0.2, yCime + 4]];
    for (const [dx, by] of branches) for (let u = 0; u <= 1; u += 0.02) R(c, fx + (xCime + dx - fx) * u + Math.sin(u * 3) * 1.5, fy + (by - fy) * u, u < 0.5 ? 2 : 1, 1, PIN_TRONC);
    // la couronne : des nuages plats, le dessous presque droit
    const nuages = [];
    for (let k = 0; k < 12; k++) {
      const u = (k / 11 - 0.5) * 2;
      nuages.push([xCime + u * largeur * 0.78 + (hash(k, xPied) - 0.5) * 6, yCime + 5 + u * u * 4 + (hash(xPied, k) - 0.5) * 3, largeur * (0.2 + hash(k, 7) * 0.1), 5 + hash(7, k) * 3]);
    }
    // le dôme, par-dessus
    for (let k = 0; k < 5; k++) {
      const u = (k / 4 - 0.5) * 2;
      nuages.push([xCime + u * largeur * 0.45 + (hash(k, 3) - 0.5) * 4, yCime + 1 + u * u * 2, largeur * (0.22 + hash(3, k) * 0.08), 5 + hash(k, 5) * 2]);
    }
    const dedans = (x, y) => nuages.some(([cx, cy, rx, ry]) => ((x - cx) * (x - cx)) / (rx * rx) + ((y - cy) * (y - cy)) / (ry * ry) < 1 - hash(x, y) * 0.25);
    const x0 = Math.floor(xCime - largeur * 1.2), x1 = Math.ceil(xCime + largeur * 1.2);
    for (let y = yCime - 6; y < yCime + 18; y++) for (let x = x0; x <= x1; x++) {
      if (x < 0 || x >= W || y < 0 || !dedans(x, y)) continue;
      // le bord vers la lune : si le pixel d'à côté, côté lune, est du ciel
      const sx = Math.sign(lune[0] - x), sy = Math.sign(lune[1] - y);
      P(c, x, y, !dedans(x + sx, y + sy) && hash(x, y + 9) < 0.8 ? PIN_BORD : PIN);
    }
  }
  // Les herbes folles du premier plan : graminées, fenouil sauvage aux ombelles, carotte sauvage
  // blanche sous la lune, chardons.
  function herbesFolles(c) {
    for (let x = 0; x < W; x += 1 + Math.round(hash(x, 31) * 2)) {
      const h = 8 + Math.round(hash(x, 32) * 18), pente = (hash(x, 33) - 0.5) * 6;
      for (let j = 0; j < h; j++) P(c, x + Math.round((j / h) * (j / h) * pente), HAUT - j, j > h - 3 ? "#2e5048" : j > h * 0.6 ? "#1a3a30" : "#0e261e");
      if (hash(x, 34) < 0.18) for (let j = 0; j < 4; j++) P(c, x + Math.round(pente) + (j % 2), HAUT - h - j, "#3a5a50");
    }
    for (let k = 0; k < Math.max(2, W / 40); k++) {
      const x = Math.round(((k + 0.5) / Math.max(2, W / 40)) * W + (hash(k, 41) - 0.5) * 20), h = 44 + Math.round(hash(41, k) * 20);
      for (let j = 0; j < h; j++) P(c, x + Math.round(Math.sin(j / 15) * 2), HAUT - j, "#14302a");
      const tx = x + Math.round(Math.sin(h / 15) * 2), ty = HAUT - h;
      for (let r = -6; r <= 6; r++) { const yy = ty - 2 + Math.round((r * r) / 12); P(c, tx + r, yy, hash(r, x) < 0.5 ? "#6a6a3a" : "#4a5030"); if (r % 3 === 0) for (let m = 1; m < 3; m++) P(c, tx + Math.round((r * m) / 3), ty + 2 - m, "#14302a"); }
    }
    for (let k = 0; k < Math.max(3, W / 22); k++) {
      const x = Math.round(hash(k, 51) * W), h = 18 + Math.round(hash(51, k) * 14);
      for (let j = 0; j < h; j++) P(c, x, HAUT - j, "#173a2e");
      for (let r = -3; r <= 3; r++) { P(c, x + r, HAUT - h - Math.round((3 - Math.abs(r)) / 2), hash(r, k) < 0.7 ? "#c8c8e0" : "#9a9ac0"); }
    }
    for (let k = 0; k < Math.max(2, W / 50); k++) {
      const x = Math.round(hash(k, 61) * W), h = 14 + Math.round(hash(61, k) * 8);
      for (let j = 0; j < h; j++) P(c, x, HAUT - j, "#1a3a30");
      ovale(c, x, HAUT - h - 1, 1, 1, "#5b3c8f"); P(c, x, HAUT - h - 3, "#8a58cc"); P(c, x - 2, HAUT - h - 2, "#1a3a30"); P(c, x + 2, HAUT - h - 2, "#1a3a30");
    }
  }

  // --- la nuit : le jardin sauvage sous les pins ---
  const NUIT = {
    peindre(c) {
      degrade(c, ["#0f0d3a", "#15124a", "#1b1d4a", "#232a63", "#3a3aa8", "#5b3c8f"], 0, 88);
      for (let k = 0; k < W / 2.6; k++) P(c, (hash(k, 1) * W) | 0, (hash(1, k) * hash(k, 2) * 72) | 0, hash(k, 4) < 0.25 ? "#f6ee55" : "#d6eef7");
      // la lune en croissant, à l'écart du titre
      const lx = Math.round(W * 0.8), ly = 46;
      for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) { if (dx * dx + dy * dy > 36) continue; P(c, lx + dx, ly + dy, (dx - 3) * (dx - 3) + (dy + 1) * (dy + 1) < 28 ? "#232a63" : "#f3f0dc"); }
      cap(c, W * 0.55, W * 0.86, 88, 26, "#2e3270", "#262a63");
      calanques(c, 88, [[-0.05, 0.27, 30, 1], [0.19, 0.46, 22, 2], [0.41, 0.66, 16, 3]], { clair: "#4a4a82", moyen: "#3c3c74", ombre: "#2a2c6a", pins: ["#2e4a5a", "#26405a", "#20344e"], tronc: "#2a1d1b" }, 1);
      mer(c, 88, 112, ["#3a3aa8", "#26406a", "#1e3358", "#1b1d4a"], "#3a5a8a");
      for (let y = 90; y < 112; y++) { const l = 2 + ((y - 90) / 4) | 0; if (hash(y, 5) < 0.7) R(c, lx - l / 2 + Math.round(Math.sin(y) * 2), y, l, 1, "#a8d8ec"); }
      // le jardin sauvage, au clair de lune
      for (let y = 112; y < HAUT; y++) for (let x = 0; x < W; x++) P(c, x, y, hash(x, y) < 0.2 ? "#0c1f19" : hash(x >> 1, y) < 0.55 ? "#123024" : "#163a2a");
      for (let x = 0; x < W; x++) P(c, x, 112, "#22403a");
      const SOMBRE = { feuille: "#22403a", feuilleOmbre: "#1a3530", fleur: "#4a3480", fleurOmbre: "#33265e", fleurClair: "#7a54b8" };
      for (const [y, d] of [[121, 11], [131, 13]]) for (let x = 4 + (y % 7); x < W; x += d + Math.round(hash(x, y) * 6)) lavande(c, x, y, SOMBRE);
      herbesFolles(c);
      // les grands pins parasols, en silhouette contre le ciel ; la lune éclaire le bord de leurs couronnes
      const lune = [lx, ly];
      pinParasol(c, Math.round(W * 0.06), Math.round(W * 0.14), 13, Math.max(30, W * 0.24), lune);
      if (W > 150) pinParasol(c, Math.round(W * 0.98), Math.round(W * 0.9), 18, W * 0.17, lune);
      if (W > 230) pinParasol(c, Math.round(W * 0.4), Math.round(W * 0.46), 30, W * 0.1, lune);
    },
    animer(c, t) {
      for (let k = 0; k < 14; k++) {
        const x = (hash(k, 1) * W + Math.sin(t / 900 + k * 2) * 12) | 0, y = (114 + hash(1, k) * 44 + Math.cos(t / 700 + k) * 6) | 0;
        const v = Math.sin(t / 400 + k * 1.7);
        if (v > -0.2) { P(c, x, y, "#f6ee55"); if (v > 0.6) { P(c, x + 1, y, "#e9b44c"); P(c, x, y - 1, "#e9b44c"); } }
      }
      for (let k = 0; k < 6; k++) if (Math.sin(t / 250 + k * 3) > 0.7) P(c, (hash(k, 13) * W) | 0, (hash(13, k) * 60) | 0, "#f3f0dc");
    },
  };

  // --- le jour : les plantes médicinales en gros plan ---
  const JOUR = {
    peindre(c) {
      degrade(c, ["#6fb6ee", "#a8d8ec", "#d6eef7", "#f3ead8"], 0, 72);
      calanques(c, 72, [[-0.08, 0.35, 26, 4], [0.27, 0.59, 18, 6], [0.51, 0.82, 24, 8], [0.77, 1.1, 14, 2]], { clair: "#e4e0d8", moyen: "#d6d2cc", ombre: "#b4bad6", pins: ["#a8c4a0", "#94b29a", "#84a29a"], tronc: "#9a8a7a" }, -1);
      mer(c, 72, 92, ["#d6eef7", "#a8d8ec", "#4ab8cc", "#3aa8c4"], "#f3f0dc");
      for (let y = 92; y < HAUT; y++) for (let x = 0; x < W; x++) { const v = hash(x, y); P(c, x, y, v < 0.18 ? "#1e3d25" : v < 0.5 ? "#2f6b35" : v < 0.85 ? "#3f8a42" : "#c96a3a"); }
      for (let x = 0; x < W; x += 2) { const hh = 6 + ((hash(x, 2) * 10) | 0); for (let j = 0; j < hh; j++) P(c, x + Math.round((j / hh) * (hash(x, 3) - 0.5) * 4), 104 - j, j > hh - 3 ? "#6cbd5c" : "#3f8a42"); }
      const X = (f) => Math.round(f * W);
      // le fenouil : de grandes tiges et des ombelles jaunes
      for (const [f, h] of [[0.12, 66], [0.2, 54], [0.81, 70], [0.9, 58]]) {
        const x = X(f);
        for (let y = 0; y < h; y++) { const xx = x + Math.round(Math.sin(y / 14) * 2); P(c, xx, HAUT - y, "#7a9a3a"); if (y % 9 === 4) { P(c, xx + 1, HAUT - y, "#9cc77a"); P(c, xx + 2, HAUT - y - 1, "#9cc77a"); } }
        const tx = x + Math.round(Math.sin(h / 14) * 2), ty = HAUT - h;
        for (let r = -7; r <= 7; r++) { const yy = ty - 3 + Math.round((r * r) / 14); ovale(c, tx + r, yy, 1, 1, hash(r, x) < 0.5 ? "#f6ee55" : "#e9b44c"); if (r % 2) for (let k = 0; k < 3; k++) P(c, tx + Math.round(r * (k / 3)), ty - Math.round(((yy - ty) * k) / 3) + 2 - k, "#7a9a3a"); }
      }
      // l'immortelle, argentée, aux bouquets jaune d'or
      for (const f of [0.27, 0.36, 0.69]) {
        const x = X(f);
        for (let k = -6; k <= 6; k += 2) for (let y = 0; y < 18 - Math.abs(k); y++) P(c, x + k + Math.round((y / 18) * k * 0.3), HAUT - y - 10, y % 3 ? "#b8c4a8" : "#9aa88a");
        for (const [dx, dy] of [[-5, -26], [0, -30], [5, -27], [-2, -24], [3, -23]]) ovale(c, x + dx, HAUT + dy, 2, 1, (a, b) => (hash(a + dx, b + x) < 0.5 ? "#f6c400" : "#e9b44c"));
      }
      // le thym en coussins fleuris, la sauge, des coquelicots
      for (const f of [0.05, 0.44, 0.59, 0.96]) { const x = X(f); ovale(c, x, HAUT - 6, 11, 6, (dx, dy) => (hash(x + dx, dy) < 0.32 ? "#d07ab8" : hash(dx, x + dy) < 0.5 ? "#6b7a5a" : "#556a4a")); }
      for (const f of [0.5, 0.76]) { const x = X(f); for (let k = 0; k < 7; k++) { const a = -Math.PI + (k / 6) * Math.PI; for (let s = 0; s < 10; s++) ovale(c, x + Math.round(Math.cos(a) * s), HAUT - 12 + Math.round(Math.sin(a) * s * 0.8), 1, 1, s > 7 ? "#b4c8b0" : "#8fa88a"); } }
      for (const [f, h] of [[0.4, 34], [0.55, 40], [0.63, 30], [0.17, 28]]) { const x = X(f); for (let y = 0; y < h; y++) P(c, x + Math.round(Math.sin(y / 6)), HAUT - y, "#4a8a3a"); const yy = HAUT - h; ovale(c, x, yy, 3, 2, "#e5333f"); P(c, x, yy, "#3e2210"); P(c, x - 1, yy - 2, "#ff5b4f"); }
    },
    animer(c, t) {
      for (let k = 0; k < 10; k++) { const x = ((hash(k, 4) * W + t / 120) % W) | 0, y = 78 + ((hash(4, k) * 12) | 0); if (Math.sin(t / 350 + k) > 0.4) R(c, x, y, 2, 1, "#f3f0dc"); }
      const u = (t / 6000) % 1, bx = Math.round(W * 0.2 + W * 0.6 * u + Math.sin(t / 180) * 6), by = Math.round(110 + Math.sin(t / 260) * 10);
      P(c, bx, by, "#f6c400"); P(c, bx + 1, by, "#3e2210"); P(c, bx, by - 1, "#d6eef7");
    },
  };

  // Peint la scène (jour ou nuit) dans une toile à la forme de l'écran, et l'anime tant que
  // continuer() le permet. Renvoie de quoi arrêter l'animation.
  function lancerScene(toile, nuit, continuer) {
    const S = nuit ? NUIT : JOUR;
    W = Math.max(70, Math.min(360, Math.round((HAUT * innerWidth) / Math.max(1, innerHeight))));
    toile.width = W; toile.height = HAUT;
    const fond = document.createElement("canvas");
    fond.width = W; fond.height = HAUT;
    S.peindre(fond.getContext("2d"));
    const c = toile.getContext("2d");
    c.drawImage(fond, 0, 0);
    let anim = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let avant = 0;
      const tour = (t) => {
        if (!continuer()) return;
        if (t - avant > 110) { avant = t; c.drawImage(fond, 0, 0); S.animer(c, t); }
        anim = requestAnimationFrame(tour);
      };
      anim = requestAnimationFrame(tour);
    }
    return () => cancelAnimationFrame(anim);
  }

  let arreter = null;
  function preparer(force) {
    const verrou = document.getElementById("verrou"), toile = document.getElementById("scene-verrou");
    if (!verrou || !toile) return;
    const nuit = force ? force === "nuit" : estNuit();
    verrou.dataset.moment = nuit ? "nuit" : "jour";
    const etiquette = verrou.querySelector("label[for=mdp]"), bouton = verrou.querySelector("button[type=submit]");
    if (etiquette) etiquette.textContent = nuit ? "Chut… le mot de passe ?" : "Mot de passe";
    if (bouton) bouton.textContent = nuit ? "Entrer" : "Ouvrir";
    if (arreter) arreter();
    arreter = lancerScene(toile, nuit, () => !verrou.hidden); // une fois le jeu ouvert, on arrête
  }

  // L'écran de veille : après quelques minutes sans toucher au jeu, la scène de l'accueil revient
  // par-dessus, comme un économiseur d'écran. Un toucher (ou une touche) ramène là où on était,
  // sans redemander le mot de passe.
  const VEILLE = 3 * 60e3;
  let veille = null, minuteurVeille = null;
  function endormir() {
    const verrou = document.getElementById("verrou");
    if (veille || !verrou || !verrou.hidden || document.visibilityState === "hidden") return;
    const nuit = estNuit();
    const toile = document.createElement("canvas");
    toile.setAttribute("aria-hidden", "true");
    veille = document.createElement("div");
    veille.className = "verrou veille";
    veille.dataset.moment = nuit ? "nuit" : "jour";
    veille.setAttribute("role", "button");
    veille.setAttribute("aria-label", "Revenir au jeu");
    const titre = document.createElement("h1");
    titre.className = "titre-jeu";
    titre.textContent = "L’herbothèque d’ƟvƟ";
    const aide = document.createElement("p");
    aide.className = "veille-aide";
    aide.textContent = "Touche l’écran pour revenir";
    veille.append(toile, titre, aide);
    document.body.appendChild(veille);
    const ici = veille;
    const stop = lancerScene(toile, nuit, () => veille === ici);
    const reveiller = (e) => { if (e) { e.preventDefault(); e.stopPropagation(); } stop(); ici.remove(); if (veille === ici) veille = null; guetter(); };
    // au clic (pas au simple appui) : le clic ne passe pas au jeu en dessous
    ici.addEventListener("click", reveiller);
    ici.addEventListener("keydown", reveiller);
  }
  function guetter() {
    clearTimeout(minuteurVeille);
    if (veille) return;
    minuteurVeille = setTimeout(endormir, VEILLE);
  }
  for (const ev of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart", "scroll"]) window.addEventListener(ev, () => {
    if (veille && ev === "keydown") { veille.click(); return; }
    if (!veille) guetter();
  }, { passive: true });
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && guetter());
  guetter();

  H.accueil = { preparer, endormir };
  let attente = null;
  window.addEventListener("resize", () => { clearTimeout(attente); attente = setTimeout(() => !document.getElementById("verrou").hidden && preparer(), 200); });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => preparer());
  else preparer();
})();
