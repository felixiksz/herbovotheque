// L'écran d'accueil, là où l'on tape le mot de passe, et l'écran de veille : des plantes
// médicinales en silhouette, à la Roger Brown, devant les collines des calanques, le jour, le soir
// et la nuit (des lucioles). (Les fiches ne sont pas encore ouvertes : l'heure du lever et du
// coucher vient d'une petite table pour Marseille.)
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
  // Les plantes en silhouette, à la Roger Brown : une rangée de plantes médicinales en ombres nettes
  // (fenouil, lavande, achillée, graminées), chacune selon sa famille, qui se balancent doucement
  // devant les collines des calanques ; une brume claire monte du vallon derrière elles ; une seule
  // couleur vive pour les fleurs ; la nuit, des lucioles. Jamais de gris : ombres bleues, lumière chaude.
  const SIL = (() => {
    const hsh = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    const bruit = (x, g) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return hsh(i, g) * (1 - u) + hsh(i + 1, g) * u; };
    const mel = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
    const deg = (arr, t) => { t = Math.max(0, Math.min(1, t)); for (let k = 1; k < arr.length; k++) if (t <= arr[k][0]) { const [t0, c0] = arr[k - 1], [t1, c1] = arr[k]; return mel(c0, c1, (t - t0) / (t1 - t0 || 1)); } return arr[arr.length - 1][1]; };
    const MOM = {
      jour: { ciel: [[0, [44, 100, 200]], [1, [168, 212, 244]]], lum: [255, 236, 190], lumF: 0, loin: [150, 196, 244], pres: [56, 104, 196], val: 1, sil: "#1c3424" },
      soir: { ciel: [[0, [74, 50, 150]], [0.6, [236, 116, 120]], [1, [255, 196, 128]]], lum: [255, 168, 116], lumF: 0.3, loin: [246, 162, 168], pres: [96, 64, 156], val: 0.85, sil: "#24183a" },
      nuit: { ciel: [[0, [10, 10, 44]], [1, [40, 54, 130]]], lum: [70, 96, 190], lumF: 0.5, loin: [62, 80, 168], pres: [20, 26, 92], val: 0.5, sil: "#08120e" },
    };
    const K = { clair: [255, 240, 196], milieu: [240, 220, 182], fond: [80, 100, 196], strate: [170, 180, 240], garrigue: [86, 150, 64], garrigueS: [34, 92, 70] };
    function collines(d, m) {
      const pose = (x, y, c) => { const k = (y * W + x) * 4, o = ((TRAME[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 10; d.data[k] = c[0] + o; d.data[k + 1] = c[1] + o; d.data[k + 2] = c[2] + o; d.data[k + 3] = 255; };
      const CIEL = 20, PIED = 150, N = 6;
      for (let y = 0; y < HAUT; y++) { const c = deg(m.ciel, y / CIEL); for (let x = 0; x < W; x++) pose(x, y, c); }
      for (let k = 0; k < N; k++) {
        const f = k / (N - 1), yb = CIEL + 4 + (PIED - CIEL - 4) * Math.pow(f, 1.05), Hc = 6 + 26 * f, P = 50 + 90 * f, air = Math.pow(1 - f, 0.75) * 0.85;
        const bleu = mel(m.pres, m.loin, Math.pow(1 - f, 0.8)), v = (0.72 + 0.28 * (1 - f)) * m.val;
        const teinte = (c) => { let r = mel([c[0] * v, c[1] * v, c[2] * v], bleu, air); if (m.lumF) r = mel(r, m.lum, m.lumF * 0.4 * (1 - f)); return r; };
        for (let x = 0; x < W; x++) {
          const u = Math.abs(x - W / 2) + k * 11 + 148, top = yb - Hc * (0.22 + 0.5 * bruit(u / (P * 0.5), k + 15) + 0.6 * Math.pow(bruit(u / (P * 0.3), k + 18), 2.4) + 0.1 * bruit(u / 12, k + 19)) + (bruit(x / 40, k + 77) - 0.5) * 4;
          for (let y = Math.max(0, Math.floor(top)); y < HAUT; y++) {
            const dep = y - top, vv = Math.min(1, dep / Math.max(1, yb - top));
            let c;
            if (y >= yb) c = hsh(x >> 1, (y >> 1) + k * 7) > 0.55 ? K.garrigue : K.garrigueS;
            else {
              c = deg([[0, K.clair], [0.4, K.milieu], [1, K.fond]], Math.pow(vv, 0.8));
              const sb = (yb - y) / 3 + bruit(x / 14, k + 21) * 1.4, b = Math.floor(sb);
              if (dep > 1 && b % 3 !== 0 && hsh(x >> 1, y + k * 13) > 0.32) c = hsh(x, y + k) < 0.35 ? K.garrigueS : K.garrigue;
              else if (sb - b > 0.8) c = mel(c, K.fond, 0.3);
            }
            if (dep < 1) c = mel(K.fond, [36, 40, 120], 0.5);
            pose(x, y, teinte(c));
          }
        }
      }
      // la brume claire du vallon, derrière les plantes
      // (la nuit, une brume bleu profond, jamais grisée)
      const nuit = m === MOM.nuit, brume = nuit ? [44, 64, 156] : mel(mel(m.loin, K.clair, 0.45), m.lum, 0.25), amax = nuit ? 0.6 : 0.82;
      for (let y = 70; y < HAUT; y++) { const a = Math.min(amax, Math.pow((y - 70) / 90, 0.9) * 0.9); for (let x = 0; x < W; x++) { const k = (y * W + x) * 4; for (let q = 0; q < 3; q++) d.data[k + q] += (brume[q] - d.data[k + q]) * a; } }
    }
    function plantes(g, m, t) {
      const sil = m.sil, PL = [["ombelle", 64, "#f6ee55"], ["epi", 46, "#8a58cc"], ["gram", 34, "#c99a5a"], ["corymbe", 56, "#f3f0dc"], ["epi", 40, "#8a58cc"], ["gram", 30, "#c99a5a"]];
      const n = Math.max(6, Math.round(W / 22));
      for (let q = 0; q < n; q++) {
        const [sorte, h0, fleur] = PL[q % PL.length], h = h0 * (0.9 + hsh(q, 3) * 0.2), x0 = ((q + 0.5) / n) * W, bal = Math.sin(t / 1300 + q * 0.8) * 2;
        const tige = (x, y, l) => { g.fillStyle = sil; g.fillRect(x | 0, y | 0, l || 2, 1); };
        const haut = (u) => [x0 + bal * u * u, HAUT - h * u];
        for (let k = 0; k <= h; k++) {
          const [x, y] = haut(k / h); tige(x, y);
          if (sorte !== "gram" && k % 7 === 3 && k < h - 6) for (const s of [-1, 1]) for (let e = 1; e <= 6; e++) tige(x + s * e - (s < 0 ? 1 : 0), y - e * 0.7 + (e > 4 ? e - 4 : 0), e < 4 ? 2 : 1);
          if (sorte === "gram" && k % 5 === 2 && k < h * 0.7) { const s = (k / 5) % 2 ? 1 : -1; for (let e = 1; e <= 8; e++) tige(x + s * e * 0.7, y - e, 1); }
        }
        const [tx, ty] = haut(1);
        if (sorte === "ombelle") for (let r = -6; r <= 6; r++) { const yy = ty - 2 + (r * r) / 12; g.fillStyle = sil; for (let k = 0; k < 4; k++) g.fillRect((tx + (r * k) / 4) | 0, (ty - ((ty - yy) * k) / 4) | 0, 1, 1); g.fillStyle = fleur; g.fillRect((tx + r) | 0, (yy - 1) | 0, 1, 1); }
        else if (sorte === "epi") { g.fillStyle = fleur; for (let k = 0; k < 10; k++) g.fillRect((tx + (k % 2 ? 1 : -1)) | 0, (ty + k) | 0, 1, 1); }
        else if (sorte === "corymbe") { g.fillStyle = fleur; for (let r = -4; r <= 4; r++) { g.fillRect((tx + r) | 0, (ty - 2 + Math.abs(r) * 0.3) | 0, 1, 1); g.fillRect((tx + r) | 0, (ty - 1 + Math.abs(r) * 0.3) | 0, 1, 1); } }
        else { g.fillStyle = fleur; for (let k = 0; k < 6; k++) { g.fillRect((tx - 2 + k * 0.6) | 0, (ty - k) | 0, 1, 1); g.fillRect((tx + 2 - k * 0.6) | 0, (ty - k) | 0, 1, 1); } }
      }
      if (m === MOM.nuit) for (let k = 0; k < 14; k++) {
        const x = (hsh(k, 3) * W + Math.sin(t / 2000 + k) * 14) | 0, y = (70 + hsh(k, 4) * 80 + Math.sin(t / 1400 + k * 2) * 8) | 0;
        if (Math.sin(t / 500 + k * 5) > 0) { g.fillStyle = "#f6ee55"; g.fillRect(x, y, 1, 1); g.fillStyle = "rgba(246,238,85,0.35)"; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); }
      }
      if (m === MOM.nuit) for (let k = 0; k < 24; k++) { const x = (hsh(k, 8) * W) | 0, y = (hsh(k, 9) * 16) | 0; if (Math.sin(t / 700 + k * 3) > -0.3) { g.fillStyle = "#f3f0dc"; g.fillRect(x, y, 1, 1); } }
    }
    return {
      moment: () => momentAccueil(),
      peindre(c, mo) { const d = c.createImageData(W, HAUT); collines(d, MOM[mo]); c.putImageData(d, 0, 0); },
      animer(c, t, mo) { plantes(c, MOM[mo], t); },
    };
  })();
  // le moment de la journée : le soir une heure autour du lever et du coucher du soleil
  function momentAccueil() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60, m = d.getMonth();
    if (Math.abs(h - COUCHER[m]) < 0.8 || Math.abs(h - LEVER[m]) < 0.6) return "soir";
    return h < LEVER[m] || h >= COUCHER[m] ? "nuit" : "jour";
  }

  // Peint la scène (jour ou nuit) dans une toile à la forme de l'écran, et l'anime tant que
  // continuer() le permet. Renvoie de quoi arrêter l'animation.
  function lancerScene(toile, nuit, continuer) {
    const mo = momentAccueil();
    W = Math.max(70, Math.min(360, Math.round((HAUT * innerWidth) / Math.max(1, innerHeight))));
    toile.width = W; toile.height = HAUT;
    const fond = document.createElement("canvas");
    fond.width = W; fond.height = HAUT;
    SIL.peindre(fond.getContext("2d"), mo);
    const c = toile.getContext("2d");
    c.drawImage(fond, 0, 0);
    SIL.animer(c, 0, mo);
    let anim = null;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      let avant = 0;
      const tour = (t) => {
        if (!continuer()) return;
        if (t - avant > H.cadence(110)) { avant = t; c.drawImage(fond, 0, 0); SIL.animer(c, t, mo); }
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
    titre.textContent = H.monde === "mesi" ? "L’herbothèque de Mesi" : "L’herbothèque d’ƟvƟ";
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
