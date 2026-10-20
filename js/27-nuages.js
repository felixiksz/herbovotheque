// Les nuages du jeu, peints comme des tableaux : un mélange de petites touches posées côte à côte
// (Signac, Cross) et de courts coups de pinceau horizontaux (les fauves). Le haut du nuage prend la
// lumière du moment (pêche et crème le jour, jaune et orangé au couchant, lilas sous la lune), le
// dessous reste dans l'ombre, toujours bleue ou violette, jamais grise. Chaque nuage est peint une
// fois en petits pixels, puis gardé.
(function () {
  const H = window.H;
  const TONS = {
    jour: { haut: ["#fff6d8", "#f3f0dc", "#ffd2c0", "#ffe08a"], milieu: ["#f6c8d8", "#d6eef7", "#ffb3a8", "#e9e3f5"], ombre: ["#c2cdec", "#b48ad8", "#a8b8e0", "#8a98cc"] },
    aube: { haut: ["#ffd2c0", "#ffe08a", "#fff6d8", "#ffb3a8"], milieu: ["#f4a3b8", "#ffb3a8", "#d07ab8", "#f6c8d8"], ombre: ["#8a98cc", "#9a84c4", "#b48ad8", "#7f97f2"] },
    soir: { haut: ["#ffd23a", "#ff9a5a", "#ffd2c0", "#ffe08a"], milieu: ["#e86a8a", "#d07ab8", "#ff7b6a", "#f4a3b8"], ombre: ["#8a58cc", "#5b3c8f", "#6a4aa0", "#3a3aa8"] },
    nuit: { haut: ["#c2cdec", "#a8b4e0", "#d6e0f7", "#8a98cc"], milieu: ["#5b62a8", "#6a6ab8", "#4a4f96", "#7a84c4"], ombre: ["#2a2c6a", "#363a80", "#26286a", "#3a3aa8"] },
    couvert: { haut: ["#a8b4e0", "#9a84c4", "#c2cdec", "#8a98cc"], milieu: ["#5b5fa8", "#6a5aa0", "#4a4f96", "#7a84c4"], ombre: ["#3a3a7a", "#2e3270", "#4a3a80", "#26286a"] },
  };
  const hasard = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const sprites = new Map();
  // un nuage de « taille » pixels de scène, peint en pixels de taille gp ; renvoie une petite toile
  // (à dessiner agrandie de gp, sans lissage), dont la base est aux deux tiers de la hauteur
  function sprite(taille, gp, moment, graine) {
    gp = gp || 1;
    const tons = TONS[moment] || TONS.jour;
    const cle = Math.round(taille) + "|" + gp.toFixed(2) + "|" + moment + "|" + (graine || 0);
    if (sprites.has(cle)) return sprites.get(cle);
    const k = 1 / gp, L = Math.max(8, Math.ceil(taille * 2.3 * k)), Hh = Math.max(6, Math.ceil(taille * 1.7 * k));
    const r = hasard(((graine || 1) * 2654435761) >>> 0);
    // la forme : une rangée de boules sur une base presque plate, et par-dessus deux ou trois boules
    // qui montent, comme un cumulus (le sommet un peu décalé, jamais parfaitement symétrique)
    const base = Hh * 0.86, T = taille * k, n = 4 + Math.floor(r() * 3), boules = [];
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1) - 0.5, rr = T * (0.3 + 0.2 * Math.cos(u * 2.4)) * (0.85 + r() * 0.3);
      boules.push([L / 2 + u * L * 0.6, base - rr * (0.6 + r() * 0.2), rr]);
    }
    const decale = (r() - 0.5) * L * 0.18;
    for (let i = 0, m = 2 + Math.floor(r() * 2); i < m; i++) {
      const u = m > 1 ? i / (m - 1) - 0.5 : 0, rr = T * (0.36 + 0.12 * r()) * (1 - Math.abs(u) * 0.4);
      boules.push([L / 2 + decale + u * L * 0.32, base - T * (0.62 + 0.18 * r()) - rr * 0.7, rr]);
    }
    const dedans = (x, y) => {
      if (y > base + 0.5) return null;
      let best = null;
      for (const b of boules) { const d = Math.hypot(x - b[0], y - b[1]) / b[2]; if (d <= 1 && (!best || d < best.d)) best = { d, b }; }
      return best;
    };
    const c = document.createElement("canvas");
    c.width = L; c.height = Hh;
    const g = c.getContext("2d");
    const touche = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    // d'abord un fond de touches, pour que le nuage soit plein ; puis des coups de pinceau par-dessus
    for (let y = 0; y < Hh; y += 2) for (let x = 0; x < L; x += 2) {
      const q = dedans(x + 1, y + 1);
      if (!q) continue;
      // (la lumière vient d'en haut : le haut de chaque boule, et tout le haut du nuage, s'éclairent)
      const hauteur = Math.min((y - (q.b[1] - q.b[2])) / (2 * q.b[2]), y / base + 0.15), a = r();
      const rangee = y > base - 2 ? tons.ombre : hauteur < 0.38 ? tons.haut : hauteur < 0.72 ? tons.milieu : tons.ombre;
      let col = rangee[Math.floor(a * rangee.length)];
      if (a < 0.08) col = tons.ombre[0];
      if (a > 0.95 && rangee !== tons.ombre) col = tons.haut[0];
      // (le bord du nuage s'effiloche un peu : quelques touches tombent juste à côté)
      touche(x + (q.d > 0.85 ? Math.round((r() - 0.5) * 2) : 0), y, 2, 2, col);
    }
    for (let i = 0, nb = Math.ceil(L * Hh / 14); i < nb; i++) {
      const x = r() * L, y = Math.floor(r() * Hh / 2) * 2, q = dedans(x, y + 1);
      if (!q || q.d > 0.9) continue;
      const hauteur = (y - (q.b[1] - q.b[2])) / (2 * q.b[2]), a = r();
      const rangee = hauteur < 0.32 ? tons.haut : hauteur < 0.68 ? tons.milieu : tons.ombre;
      touche(x - 1, y, 3 + Math.floor(a * 4), 2, rangee[Math.floor(r() * rangee.length)]);
    }
    if (sprites.size > 80) sprites.clear();
    sprites.set(cle, c);
    return c;
  }
  // le moment qui colore les nuages, d'après la hauteur du soleil (et la couverture du ciel)
  function moment(alt, couvert) {
    if (couvert) return "couvert";
    if (alt < 0) return "nuit";
    if (alt < 8) return new Date().getHours() < 12 ? "aube" : "soir";
    return "jour";
  }
  H.nuages = { sprite, moment, TONS };
})();
