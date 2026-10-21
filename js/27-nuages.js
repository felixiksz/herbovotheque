// Les nuages du jeu, peints comme des tableaux : un mélange de petites touches posées côte à côte
// (Signac, Cross) et de courts coups de pinceau horizontaux (les fauves). Le haut du nuage prend la
// lumière du moment (pêche et crème le jour, jaune et orangé au couchant, lilas sous la lune), le
// dessous reste dans l'ombre, toujours bleue ou violette, jamais grise. Chaque nuage est peint une
// fois en petits pixels, puis gardé.
(function () {
  const H = window.H;
  // (des tons voisins dans chaque rangée, et peu d'écart entre le haut et l'ombre : un nuage doux)
  const TONS = {
    jour: { haut: ["#fff8ec", "#fff3e4", "#fdf0f0", "#fff6dc"], milieu: ["#f9e6ec", "#f2ecf8", "#fbe8e0", "#eef0fa"], ombre: ["#e0e2f4", "#e4dcf2", "#dae2f2", "#e6e0f0"] },
    aube: { haut: ["#ffe6d8", "#fff0d8", "#ffe4dc", "#ffecd0"], milieu: ["#f8cfdc", "#fbd6d0", "#f2cde0", "#f6d4d8"], ombre: ["#d4cbe8", "#d0d0ec", "#dacbe6", "#cdd2ea"] },
    soir: { haut: ["#ffdca0", "#ffd2a8", "#ffd8b4", "#ffe0a8"], milieu: ["#f6b4c4", "#f2b0c8", "#f8bab4", "#f4b8cc"], ombre: ["#c4a4dc", "#bca8dc", "#c8a8d8", "#b8acdc"] },
    nuit: { haut: ["#a8b2dc", "#aeb6e0", "#a4aed8", "#b0b8e0"], milieu: ["#8a92c8", "#868ec6", "#8e94ca", "#848cc4"], ombre: ["#6c72b0", "#6a70ae", "#7076b2", "#686eac"] },
    couvert: { haut: ["#9aa2d2", "#a0a6d4", "#9ca0ce", "#a2a8d6"], milieu: ["#7e84bc", "#8288be", "#7c80b8", "#8086bc"], ombre: ["#62689e", "#666aa0", "#60669c", "#6a6ea4"] },
    // (sous la pluie : plus lourds, bleu ardoise ; sous l'orage : indigo et violet ; jamais de gris)
    pluie: { haut: ["#8a94c4", "#8e96c6", "#8690c0", "#9098c8"], milieu: ["#6a72aa", "#6e74ac", "#6870a6", "#7076ae"], ombre: ["#4c5288", "#50568a", "#4a5084", "#52588c"] },
    orage: { haut: ["#7a72b0", "#7e76b4", "#7670ac", "#8078b6"], milieu: ["#56508e", "#5a5492", "#544e8a", "#5c5694"], ombre: ["#38326a", "#3c366e", "#363066", "#3e3870"] },
    nuitCouvert: { haut: ["#5a5e96", "#5e6298", "#585c92", "#60649a"], milieu: ["#444880", "#484c84", "#42467e", "#4a4e86"], ombre: ["#2e3266", "#32366a", "#2c3064", "#34386c"] },
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
      const col = rangee[Math.floor(a * rangee.length)];
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
  // (la météo d'abord : orage, pluie, couvert — de nuit, couvert plus sombre ; sinon selon l'heure)
  function moment(alt, couvert, type) {
    type = type || (H.ciel && H.ciel.meteo || {}).type;
    if (type === "orage") return "orage";
    if (type === "pluie") return "pluie";
    if (couvert) return alt < 0 ? "nuitCouvert" : "couvert";
    if (alt < 0) return "nuit";
    if (alt < 8) return new Date().getHours() < 12 ? "aube" : "soir";
    return "jour";
  }
  H.nuages = { sprite, moment, TONS };
})();
