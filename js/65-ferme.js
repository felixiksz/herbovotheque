// La ferme, en pixel art isométrique : un bloc de terre posé au bord de la mer, avec ses tiny
// houses, la roulotte, la serre, la boîte aux lettres et le ponton. Des chemins de terre battue
// font le tour des maisons ; ƟvƟ les suit, et la vue ne la suit que quand elle marche. Le soleil
// se lève à droite et se couche à gauche, puis la lune ; ce sont les deux sources de lumière, et
// les ombres portées en dépendent. À l'horizon, la forêt devant les calanques.
(function () {
  const H = window.H;
  let W = 320, Ht = 180;
  const N = 26;
  let nuit = false, cote = 1, periode = "apres", drapeau = false;

  const hash = (x, y) => { let h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  let graine = 11;
  const alea = () => ((graine = (graine * 9301 + 49297) % 233280) / 233280);

  // --- les outils du pixel : rien n'est flou, tout est rempli ligne par ligne ---
  function pixel(c, x, y, col) { c.fillStyle = col; c.fillRect(x | 0, y | 0, 1, 1); }
  function remplir(c, pts, col) {
    const ys = pts.map((p) => p[1]), y0 = Math.ceil(Math.min(...ys)), y1 = Math.floor(Math.max(...ys));
    c.fillStyle = col;
    for (let y = y0; y <= y1; y++) {
      const xs = [];
      for (let i = 0; i < pts.length; i++) {
        const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length];
        if ((ay <= y + 0.5 && by > y + 0.5) || (by <= y + 0.5 && ay > y + 0.5)) xs.push(ax + ((y + 0.5 - ay) / (by - ay)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) { const a = Math.round(xs[i]), b = Math.round(xs[i + 1]); if (b > a) c.fillRect(a, y, b - a, 1); }
    }
  }
  function ligne(c, x0, y0, x1, y1, col) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy; c.fillStyle = col;
    for (;;) { c.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
  }
  function contour(c, pts, col) { for (let i = 0; i < pts.length; i++) ligne(c, pts[i][0], pts[i][1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1], col); }
  function ovale(c, cx, cy, rx, ry, col, texture) {
    for (let y = -ry; y <= ry; y++) {
      const l = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry + 0.01))));
      if (!texture) { c.fillStyle = col; c.fillRect(Math.round(cx - l), Math.round(cy + y), l * 2 + 1, 1); }
      else for (let x = -l; x <= l; x++) pixel(c, cx + x, cy + y, texture(x, y, l));
    }
  }
  const toileDe = (w, h) => { const t = document.createElement("canvas"); t.width = w; t.height = h; const c = t.getContext("2d"); c.imageSmoothingEnabled = false; return [t, c]; };

  // --- la carte : terre rouge, garrigue, et la mer qui borde le bloc à droite ---
  const sol = (i, j) => {
    const n = Math.sin(i * 0.5 + 1.3) + Math.cos(j * 0.45 - 0.7) + Math.sin((i + j) * 0.25);
    return n > 1.0 ? "herbe" : n > 0.2 ? "garrigue" : "terre";
  };
  const TEX = {
    herbe: ["#4aa63e", "#3f8a42", "#6cbd5c", "#2f6b35"],
    garrigue: ["#9cc77a", "#6cbd5c", "#b8cf6a", "#4aa63e"],
    terre: ["#c96a3a", "#d9824f", "#b2552e", "#e8714a"],
  };
  const OX = N * 8, OY = 6;
  const iso = (i, j) => [OX + (i - j) * 8, OY + (i + j) * 4];
  const MAISONS = [
    { id: "maison", hash: "maison", nom: "Chez ƟvƟ et Mesi", i: 11, j: 11, w: 2, d: 4, h: 14, genre: "tiny", terrasse: true, solaire: true,
      t: { clair: "#e8714a", ombre: "#b2552e", planche: "#c95a3a", trait: "#7a2e1e", toitC: "#3a5a8a", toitO: "#26406a", porte: "#7f97f2" } },
    { id: "herbo", hash: "herbotheque", nom: "Herbothèque", i: 5, j: 6, w: 2, d: 4, h: 13, genre: "tiny", roues: true,
      t: { clair: "#b9834f", ombre: "#8a5c34", planche: "#9a6a3c", trait: "#4b3427", toitC: "#6b6578", toitO: "#4a4560", porte: "#2f6b35" } },
    { id: "cartes", hash: "cartes", nom: "Cabane à flashcartes", i: 11, j: 4, w: 3, d: 2, h: 11, genre: "roulotte" },
    { id: "labo", hash: "labo", nom: "Labo", i: 4, j: 15, w: 2, d: 3, h: 12, genre: "tiny", poele: true, treille: true,
      t: { clair: "#6cbd5c", ombre: "#3f8a42", planche: "#4aa63e", trait: "#1e3d25", toitC: "#9a9a9a", toitO: "#6b6578", porte: "#e9b44c" } },
    { id: "serre", hash: "serre", nom: "Serre", i: 17, j: 13, w: 3, d: 4, h: 11, genre: "serre" },
    { id: "lettres", hash: "lettres", nom: "Boîte aux lettres", i: 9, j: 17, w: 1, d: 1, h: 0, genre: "boite" },
    { id: "ponton", hash: "terrain", nom: "Ponton vers les îles", i: 23, j: 18, w: 1, d: 1, h: 0, genre: "ponton" },
  ];
  const parId = Object.fromEntries(MAISONS.map((m) => [m.id, m]));
  const porte = (m) => [m.i + m.w / 2, m.j + m.d + 0.7];
  const LIENS = [["maison", "herbo"], ["maison", "cartes"], ["maison", "labo"], ["maison", "serre"], ["maison", "lettres"], ["maison", "ponton"],
    ["herbo", "cartes"], ["cartes", "serre"], ["herbo", "labo"], ["serre", "ponton"], ["labo", "lettres"]];
  // la grille des passages, en demi-cases : on ne traverse ni les maisons ni l'eau
  const RG = 2, G = N * RG;
  const occupe = (x, y, marge) => MAISONS.some((m) => m.genre !== "ponton" && x > m.i - marge && x < m.i + m.w + marge && y > m.j - marge && y < m.j + m.d + marge);
  function passage(a, b) {
    const cle = (x, y) => y * G + x, versG = ([x, y]) => [Math.max(0, Math.min(G - 1, Math.floor(x * RG))), Math.max(0, Math.min(G - 1, Math.floor(y * RG)))];
    const [sx, sy] = versG(a), [tx, ty] = versG(b);
    const cout = new Map([[cle(sx, sy), 0]]), venu = new Map(), ouverts = [[0, sx, sy]];
    while (ouverts.length) {
      ouverts.sort((p, q) => p[0] - q[0]);
      const [, x, y] = ouverts.shift();
      if (x === tx && y === ty) break;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= G || ny >= G) continue;
        const wx = (nx + 0.5) / RG, wy = (ny + 0.5) / RG;
        if (occupe(wx, wy, 0.45) && !(nx === tx && ny === ty)) continue;
        // un peu plus cher près des murs, et un léger hasard pour que le chemin serpente
        const c = cout.get(cle(x, y)) + Math.hypot(dx, dy) + (occupe(wx, wy, 1.1) ? 0.8 : 0) + hash(nx * 3, ny * 5) * 0.35;
        if (c < (cout.get(cle(nx, ny)) ?? Infinity)) { cout.set(cle(nx, ny), c); venu.set(cle(nx, ny), [x, y]); ouverts.push([c + Math.hypot(tx - nx, ty - ny), nx, ny]); }
      }
    }
    const pts = [b];
    let k = [tx, ty];
    while (venu.has(cle(k[0], k[1]))) { k = venu.get(cle(k[0], k[1])); pts.push([(k[0] + 0.5) / RG, (k[1] + 0.5) / RG]); }
    pts.push(a);
    pts.reverse();
    // arrondir les angles (trois passes de Chaikin)
    let q = pts;
    for (let n = 0; n < 3; n++) { const r = [q[0]]; for (let i = 0; i < q.length - 1; i++) { const [x0, y0] = q[i], [x1, y1] = q[i + 1]; r.push([x0 * 0.75 + x1 * 0.25, y0 * 0.75 + y1 * 0.25], [x0 * 0.25 + x1 * 0.75, y0 * 0.25 + y1 * 0.75]); } r.push(q[q.length - 1]); q = r; }
    return q;
  }
  const chemins = LIENS.map(([a, b], n) => {
    const pts = passage(porte(parId[a]), porte(parId[b]));
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { a, b, pts, cum, long: cum[cum.length - 1], n };
  });
  // un point du chemin, de 0 (départ) à 1 (arrivée)
  function point(c, t) {
    const d = t * c.long;
    let i = 1;
    while (i < c.cum.length - 1 && c.cum[i] < d) i++;
    const u = (d - c.cum[i - 1]) / (c.cum[i] - c.cum[i - 1] || 1);
    return [c.pts[i - 1][0] + (c.pts[i][0] - c.pts[i - 1][0]) * u, c.pts[i - 1][1] + (c.pts[i][1] - c.pts[i - 1][1]) * u];
  }
  const surChemin = (x, y, marge) => chemins.some((c) => c.pts.some(([px, py]) => Math.hypot(px - x, py - y) < (marge || 1)));
  const dansMaison = (x, y) => MAISONS.some((m) => x > m.i - 1 && x < m.i + m.w + 1 && y > m.j - 1 && y < m.j + m.d + 1.8);
  const dansJardin = () => false;


  // --- aménager : des objets posés et des sols peints, rangés avec les éléments de la ferme ---
  const OBJETS = { plante: "Plante", pierre: "Pierre", dalle: "Pas japonais", pot: "Pot", banc: "Banc" };
  const PINCEAUX = { gravier: "Gravier", terreRouge: "Terre rouge", terrazzo: "Terrazzo", prairie: "Prairie fleurie", bassin: "Bassin" };
  const TEXTURES_PINCEAUX = {
    gravier: ["#c9c9c4", "#9a9a9a", "#e9e3cd", "#6b6578"],
    terreRouge: ["#c96a3a", "#b2552e", "#d9824f", "#9a6a3c"],
    terrazzo: ["#f3f0dc", "#e9e3cd", "#ff5b4f", "#3d5ee8"],
    prairie: ["#6cbd5c", "#9cc77a", "#d07ab8", "#f6ee55"],
    bassin: ["#12aec4", "#0d8fae", "#a8d8ec", "#26406a"],
  };
  const elementsIso = () => Object.values((H.jeu.ferme || {}).elements || {}).filter((e) => e && e.iso && !e.supprime);
  function enregistrer(e) {
    H.jeu.ferme = H.jeu.ferme || {};
    H.jeu.ferme.elements = H.jeu.ferme.elements || {};
    e.modifieLe = H.maintenant();
    H.jeu.ferme.elements[e.id] = e;
    H.d.changer("jeu");
  }

  // --- le sol, peint une fois (et repeint quand on aménage) : les losanges texturés, les côtés
  // du bloc, la terre rouge sous les pins, les chemins, les fleurs sauvages ---
  const [sol0, sc] = toileDe(N * 16 + 16, N * 8 + 44);
  function losange(c, i, j, couleurs, k) {
    const [cx, cy] = iso(i, j);
    for (let r = 0; r < 8; r++) {
      const hw = r < 4 ? 2 * r + 1 : 2 * (7 - r) + 1;
      for (let x = -hw; x < hw; x++) {
        const v = hash(cx + x + k, cy + r);
        pixel(c, cx + x, cy + r, v < 0.55 ? couleurs[0] : v < 0.8 ? couleurs[1] : v < 0.95 ? couleurs[2] : couleurs[3]);
      }
    }
  }
  function peindreSol() {
  sc.clearRect(0, 0, sol0.width, sol0.height);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) losange(sc, i, j, TEX[sol(i, j)], 0);
  // les côtés du bloc : un liseré d'herbe, la terre et ses cailloux, puis la roche ; à gauche au soleil, à droite à l'ombre
  function coteBloc(c, x0, y0, x1, y1, clair) {
    const pas = Math.max(Math.abs(x1 - x0), 1);
    for (let s = 0; s <= pas; s++) {
      const x = Math.round(x0 + ((x1 - x0) * s) / pas), y = Math.round(y0 + ((y1 - y0) * s) / pas);
      for (let d = 0; d < 34; d++) {
        const v = hash(x * 3, y + d * 7);
        let col;
        if (d < 2) col = clair ? "#6cbd5c" : "#3f8a42";
        else if (d < 18) col = v < 0.08 ? "#9a9a9a" : v < 0.3 ? (clair ? "#9a6a3c" : "#7a4520") : clair ? "#b9834f" : "#9a6a3c";
        else col = v < 0.15 ? "#6b6578" : clair ? "#9a9a9a" : "#6b6578";
        if (d === 18 && v < 0.6) col = clair ? "#7a4520" : "#4b3427";
        pixel(c, x, y + d, col);
      }
    }
  }
  { const [ax, ay] = iso(0, N), [bx, by] = iso(N, N), [cx, cy] = iso(N, 0); coteBloc(sc, ax, ay, bx, by, true); coteBloc(sc, bx, by, cx, cy, false); }
  }
  // la terre rouge sous les pins, posée avant les chemins
  const ESPECES = ["pin", "pin", "pin", "pin", "cedre", "araucaria", "figuier", "yucca", "romarin", "romarin", "romarin", "genevrier", "agave", "agave"];
  const plantes = [];
  for (let n = 0; n < 420 && plantes.length < 150; n++) {
    const x = 0.6 + alea() * (N - 1.2), y = 0.6 + alea() * (N - 1.2), e = ESPECES[Math.floor(alea() * ESPECES.length)];
    if (dansMaison(x, y) || dansJardin(x, y) || surChemin(x, y, 1.2)) continue;
    const grand = e === "pin" || e === "cedre" || e === "araucaria";
    if (plantes.some((p) => Math.hypot(p.x - x, p.y - y) < (grand ? 2 : 0.9))) continue;
    plantes.push({ x, y, e, v: Math.floor(alea() * 3), fleur: e === "agave" && alea() < 0.08 });
  }
  function peindreSol2() {
  for (const p of plantes) if (p.e === "pin") { const [x, y] = iso(p.x, p.y); ovale(sc, x, y + 4, 9, 4, null, (dx, dy) => (hash(x + dx, y + dy) < 0.15 ? "#9a9a9a" : hash(x + dx * 2, y + dy) < 0.5 ? "#c96a3a" : "#b2552e")); }
  // des chemins de terre battue : la largeur varie, ils ondulent un peu, quelques cailloux,
  // et l'herbe mord sur les bords
  for (const c of chemins) for (let s = 0; s <= 1; s += 0.6 / (c.long * 8)) {
    const [x, y] = point(c, s), [px0, py0] = iso(x, y);
    const ond = Math.sin(s * c.long * 1.3 + c.n) * 0.8, larg = 2.6 + Math.sin(s * c.long * 0.9 + c.n * 2) * 0.9 + hash(Math.round(s * 100), c.n) * 0.6;
    const px = px0 + ond, py = py0;
    ovale(sc, px, py + 4, Math.round(larg + 1), Math.max(1, Math.round(larg / 2)), null, (dx, dy, l) => {
      const v = hash(Math.round(px + dx), Math.round(py + dy));
      if (Math.abs(dx) >= l - 1 && v < 0.45) return v < 0.2 ? "#6cbd5c" : "#9cc77a";
      return v < 0.05 ? "#9a9a9a" : v < 0.09 ? "#f3f0dc" : v < 0.55 ? "#d9b48a" : v < 0.85 ? "#c9a06a" : "#e9c99a";
    });
  }
  // des fleurs sauvages en touffes éparses, jamais en rangs : lavande, coquelicots, thym
  graine = 29;
  for (let k = 0; k < 26; k++) {
    const x0 = 1 + alea() * (N - 2), y0 = 1 + alea() * (N - 2), sorte = Math.floor(alea() * 3);
    if (dansMaison(x0, y0) || surChemin(x0, y0, 1)) continue;
    const n = 3 + Math.floor(alea() * 6);
    for (let q = 0; q < n; q++) {
      const x = x0 + (alea() - 0.5) * 1.6, y = y0 + (alea() - 0.5) * 1.6, [px, py] = iso(x, y);
      const tons = [["#8a58cc", "#5b3c8f"], ["#e03a3a", "#ff5b4f"], ["#d07ab8", "#8a58cc"]][sorte];
      pixel(sc, px, py + 3, "#3f8a42"); pixel(sc, px, py + 2, tons[0]); if (alea() < 0.6) pixel(sc, px + 1, py + 2, tons[1]); if (alea() < 0.4) pixel(sc, px - 1, py + 3, "#2f6b35");
    }
  }
  // les sols peints en aménageant, par-dessus le reste
  for (const e of elementsIso()) if (e.sol && PINCEAUX[e.sol]) losange(sc, e.i, e.j, TEXTURES_PINCEAUX[e.sol], 3);
  }

  // --- les sprites, dessinés une fois chacun (ancre : en bas au milieu) ---
  const sprites = new Map();
  function sprite(cle, w, h, f) {
    cle = cle + "|" + cote + (nuit ? "n" : "j");
    if (!sprites.has(cle)) { const [t, c] = toileDe(w, h); f(c, w, h); sprites.set(cle, t); }
    return sprites.get(cle);
  }
  // un feuillage en boule : trois verts, le clair en haut à gauche (le soleil), le sombre en bas à droite
  const feuillage = (c, cx, cy, rx, ry, tons) => ovale(c, cx, cy, rx, ry, null, (x, y, l) => {
    const v = hash(cx * 7 + x, cy * 5 + y), lum = ((cote < 0 ? x : -x) / (rx + 1)) * (cote === 0 ? 0.3 : 1) - y / (ry + 1);
    if (Math.abs(x) >= l - 0 && v < 0.5) return tons[3];
    return lum + v * 0.6 > 0.7 ? tons[2] : lum + v * 0.6 > -0.1 ? tons[1] : tons[0];
  });
  const VERTS_PIN = ["#1e3d25", "#2f6b35", "#4aa63e", "#173a26"], VERTS_BLEUS = ["#1e3d25", "#26406a", "#3f8a42", "#173a26"];
  function dessinPlante(p) {
    switch (p.e) {
      case "pin": return sprite("pin" + p.v, 36, 40, (c) => {
        const h = 22 + p.v * 4;
        for (let y = 0; y < h; y++) { const x = 18 + Math.round(Math.sin(y / 6) * 1.5); pixel(c, x, 39 - y, "#7a4520"); pixel(c, x + 1, 39 - y, "#4b3427"); }
        feuillage(c, 17, 39 - h - 1, 15, 4, VERTS_PIN); feuillage(c, 15, 39 - h - 4, 10, 3, VERTS_PIN);
      });
      case "cedre": return sprite("cedre" + p.v, 26, 36, (c) => {
        for (let y = 0; y < 8; y++) { pixel(c, 13, 35 - y, "#4b3427"); pixel(c, 12, 35 - y, "#7a4520"); }
        for (let k = 0; k < 4; k++) feuillage(c, 13, 26 - k * 6, 11 - k * 2, 3, VERTS_BLEUS);
      });
      case "araucaria": return sprite("arau" + p.v, 34, 58, (c) => {
        // d'après la photo : une silhouette en pyramide, des étages de branches tout le long du
        // tronc, de plus en plus courts vers le haut ; chaque branche part à l'horizontale puis se
        // redresse franchement au bout, avec de petits rameaux qui pointent vers le haut
        for (let y = 0; y < 52; y++) { pixel(c, 16, 57 - y, y % 3 === 0 ? "#2f6b35" : "#3f8a42"); pixel(c, 17, 57 - y, "#2f6b35"); }
        const vert = (x, y, clair) => { pixel(c, x, y, clair ? "#4aa63e" : "#2f6b35"); pixel(c, x, y + 1, "#1e3d25"); };
        const etages = 7;
        for (let k = 0; k < etages; k++) {
          const y0 = 50 - k * 6.4, l = Math.round(14 - k * 1.7);
          for (const dir of [-1, 1]) {
            for (let s = 1; s <= l; s++) {
              const x = 16.5 + dir * s, y = Math.round(y0 - s * 0.15);
              vert(x, y, s % 2 === 0);
              // de petits rameaux dressés le long de la branche
              if (s % 4 === 2 && s < l - 1) { vert(x, y - 1, true); vert(x, y - 2, false); }
            }
            // le bout de la branche se redresse
            const xb = 16.5 + dir * l, yb = Math.round(y0 - l * 0.15);
            for (let u = 1; u <= 4; u++) vert(xb + (u === 1 ? dir : 0), yb - u, u % 2 === 0);
          }
        }
        // la pointe, avec deux petits bras relevés
        for (let u = 0; u < 5; u++) vert(16.5, 6 - u, u % 2 === 0);
        vert(15, 4, true); vert(14, 3, false); vert(18, 4, true); vert(19, 3, false);
      });
      case "figuier": return sprite("fig" + p.v, 18, 18, (c) => {
        for (const [x, y, rx, ry] of [[9, 13, 3, 4], [5, 8, 3, 3], [12, 7, 3, 3], [9, 3, 2, 3]]) { ovale(c, x, y, rx, ry, null, (dx, dy, l) => (Math.abs(dx) >= l ? "#2f6b35" : dx < 0 ? "#9cc77a" : "#6cbd5c")); }
        pixel(c, 4, 5, "#e04bb0"); pixel(c, 13, 4, "#ffd23a"); pixel(c, 9, 0, "#e04bb0");
      });
      case "yucca": return sprite("yuc" + p.v, 20, 24, (c) => {
        for (let y = 0; y < 9; y++) { pixel(c, 10, 23 - y, "#9a6a3c"); pixel(c, 11, 23 - y, "#7a4520"); }
        for (let k = 0; k < 11; k++) { const a = -Math.PI / 2 + (k - 5) * 0.3; ligne(c, 10, 14, 10 + Math.cos(a) * 8, 14 + Math.sin(a) * 8, k % 2 ? "#3f8a42" : "#6cbd5c"); }
      });
      case "romarin": return sprite("rom" + p.v, 14, 10, (c) => {
        feuillage(c, 7, 6, 6, 3, ["#2f6b35", "#3f8a42", "#7fb0a6", "#1e3d25"]);
        pixel(c, 4, 4, "#8a58cc"); pixel(c, 9, 5, "#8a58cc"); pixel(c, 6, 3, "#d07ab8");
      });
      case "genevrier": return sprite("gen" + p.v, 12, 22, (c) => {
        remplir(c, [[6, 0], [11, 21], [1, 21]], "#1e3d25"); remplir(c, [[6, 1], [6, 21], [2, 21]], "#2f6b35");
        for (let k = 0; k < 10; k++) pixel(c, 3 + (k % 4), 6 + k * 1.5, "#3f8a42");
      });
      case "agave": return sprite("aga" + p.v + (p.fleur ? "f" : ""), 24, p.fleur ? 58 : 14, (c, w, h) => {
        // la grosse rosette bleu-gris, aux feuilles épaisses et pointues
        for (let k = 0; k < 11; k++) {
          const a = -Math.PI + (k / 10) * Math.PI, l = 8 + (k % 3);
          for (let s = 0; s <= l; s++) { const x = 12 + Math.cos(a) * s, y = h - 2 + Math.sin(a) * s * 0.75; pixel(c, x, y, s < l - 2 ? "#5b8f8a" : "#7fb0a6"); if (s < l - 3) pixel(c, x + 1, y, "#7fb0a6"); }
        }
        if (p.fleur) {
          // la hampe, très haute, comme une asperge géante
          for (let y = 0; y < 44; y++) { pixel(c, 12, h - 5 - y, y < 30 ? "#7a8a4a" : "#9a6a3c"); pixel(c, 13, h - 5 - y, "#5a6a3a"); }
          // en haut, de courts bras horizontaux, chacun avec un bouquet de fleurs jaunes
          for (let k = 0; k < 6; k++) {
            const y = h - 47 + k * 3, dir = k % 2 ? 1 : -1, l = 3 + (k < 3 ? k : 5 - k);
            for (let s = 1; s <= l; s++) pixel(c, 12.5 + dir * s, y, "#9a6a3c");
            const bx = 12.5 + dir * l;
            for (const [dx, dy, col] of [[0, -1, "#f6ee55"], [-1, -2, "#ffd23a"], [1, -2, "#ffd23a"], [0, -2, "#f6ee55"], [-1, -1, "#e9b44c"], [1, -1, "#e9b44c"], [0, -3, "#f6ee55"]]) pixel(c, bx + dx, y + dy, col);
          }
        }
      });
    }
  }
  // une maison isométrique, pixel par pixel : face gauche au soleil, face droite à l'ombre, un trait foncé de la même teinte
  function boiteIso(c, ox, oy, w, d, h, t) {
    const A = [ox - d * 8, oy - d * 4], B = [ox, oy], C = [ox + w * 8, oy - w * 4], D = [ox + (w - d) * 8, oy - (w + d) * 4];
    const g = [[A[0], A[1] - h], [B[0], B[1] - h], B, A], dr = [[B[0], B[1] - h], [C[0], C[1] - h], C, B];
    remplir(c, g, cote < 0 ? t.ombre : t.clair); remplir(c, dr, cote < 0 ? t.clair : t.ombre);
    for (let k = 0; k < 40; k++) { const u = hash(k, ox), v = hash(ox, k); pixel(c, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - h * v, t.grain); }
    contour(c, g, t.trait); contour(c, dr, t.trait);
    return { A, B, C, D };
  }
  function fenetre(c, x, y, face, allume) {
    const col = allume ? "#f6ee55" : "#a8d8ec", pente = face === "g" ? 0.5 : -0.5;
    for (let dx = 0; dx < 4; dx++) for (let dy = 0; dy < 5; dy++) pixel(c, x + dx, y + dy + Math.round(dx * pente), dy === 0 || (dx === 1 && !allume) ? "#6fb6ee" : col);
    for (let dy = -1; dy < 6; dy++) { pixel(c, x - 1, y + dy - Math.round(pente), "#4b3427"); }
  }
  function dessinMaison(m) {
    const larg = (m.w + m.d) * 8 + 24, haut = m.h + (m.w + m.d) * 4 + 44;
    return sprite(m.id + (nuit ? "n" : "j") + (m.genre === "boite" && drapeau ? "d" : ""), larg, haut, (c, w, h) => {
      const ox = m.d * 8 + 12, oy = h - 6;
      const T = {
        mazet: { clair: "#f3f0dc", ombre: "#c9c4b0", trait: "#7a6a56", grain: "#e9e3cd", toitC: "#e8714a", toitO: "#b2552e" },
        herbo: { clair: "#b9834f", ombre: "#8a5c34", trait: "#4b3427", grain: "#9a6a3c", toitC: "#3a5a8a", toitO: "#26406a" },
        roulotte: { clair: "#ffd23a", ombre: "#e9a83a", trait: "#9a6a3c", grain: "#f6ee55", toitC: "#ff5b4f", toitO: "#c93f6e" },
        labo: { clair: "#e9e3cd", ombre: "#b8ae94", trait: "#6b6578", grain: "#c9c9c4", toitC: "#e8714a", toitO: "#b2552e" },
        serre: { clair: "#d6eef7", ombre: "#a8d8ec", trait: "#2f6b35", grain: "#ffffff", toitC: "#e9f6fb", toitO: "#bfe3f2" },
      }[m.genre];
      if (m.genre === "tiny") { tinyHouse(c, ox, oy, m); return; }
      if (m.genre === "boite") {
        for (let y = 0; y < 9; y++) pixel(c, w / 2, h - 2 - y, "#7a4520");
        remplir(c, [[w / 2 - 4, h - 15], [w / 2 + 3, h - 15], [w / 2 + 4, h - 10], [w / 2 - 3, h - 10]], "#3d5ee8"); contour(c, [[w / 2 - 4, h - 15], [w / 2 + 3, h - 15], [w / 2 + 4, h - 10], [w / 2 - 3, h - 10]], "#26406a");
        // le drapeau levé : une lettre attend
        if (drapeau) { for (let y = 0; y < 5; y++) pixel(c, w / 2 + 3, h - 20 + y, "#e04bb0"); pixel(c, w / 2 + 4, h - 20, "#e04bb0"); pixel(c, w / 2 + 5, h - 20, "#e04bb0"); pixel(c, w / 2 + 4, h - 19, "#e04bb0"); }
        else for (let x = 0; x < 4; x++) pixel(c, w / 2 + 3 + x, h - 12, "#e04bb0");
        return;
      }
      if (m.genre === "ponton") {
        for (let k = 0; k < 5; k++) { const x = 4 + k * 3, y = h - 8 - k * 2; remplir(c, [[x, y], [x + 8, y - 4], [x + 12, y - 2], [x + 4, y + 2]], k % 2 ? "#b9834f" : "#9a6a3c"); }
        return;
      }
      if (m.genre === "a") {
        const A = [ox - m.d * 8, oy - m.d * 4], B = [ox, oy], C = [ox + m.w * 8, oy - m.w * 4], D = [ox + (m.w - m.d) * 8, oy - (m.w + m.d) * 4];
        const S = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - 30], R = [(C[0] + D[0]) / 2, (C[1] + D[1]) / 2 - 30];
        remplir(c, [D, A, S, R], "#3f8a42"); contour(c, [D, A, S, R], "#1e3d25");
        remplir(c, [A, B, S], "#a8d8ec"); remplir(c, [[A[0] + 5, A[1] - 2], [B[0] - 5, B[1] - 2], [S[0], S[1] + 9]], nuit ? "#f6ee55" : "#6fb6ee"); contour(c, [A, B, S], "#26406a");
        remplir(c, [B, C, R, S], "#2f6b35"); contour(c, [B, C, R, S], "#1e3d25");
        ligne(c, S[0], S[1] + 2, S[0], (A[1] + B[1]) / 2, "#26406a");
        return;
      }
      // la tiny house et la roulotte sont sur roues : la caisse est surélevée
      const surRoues = m.genre === "herbo" || m.genre === "roulotte";
      const lev = surRoues ? 5 : 0;
      if (surRoues) {
        // le châssis sombre sous la caisse
        const a0 = [ox - m.d * 8, oy - m.d * 4], c0 = [ox + m.w * 8, oy - m.w * 4];
        ligne(c, a0[0] + 2, a0[1] - 2, ox, oy - 2, "#4b3427"); ligne(c, ox, oy - 2, c0[0] - 2, c0[1] - 2, "#4b3427");
      }
      if (m.genre === "roulotte") {
        dessinRoulotte(c, ox, oy - lev, m, T);
        return;
      }
      const { A, B, C, D } = boiteIso(c, ox, oy - lev, m.w, m.d, m.h, T);
      const H2 = m.h;
      if (m.genre === "herbo") {
        // le bardage de bois en planches verticales
        for (let k = 1; k < 10; k++) { const u = k / 10; ligne(c, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - 1, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - H2 + 1, "#9a6a3c"); }
        // deux roues sous la longue façade, et une petite marche devant la porte
        for (const u of [0.3, 0.62]) { const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u + lev; ovale(c, x, y - 1, 3, 3, null, (dx, dy) => (dx * dx + dy * dy > 5 ? "#23214a" : dx === 0 && dy === 0 ? "#9a9a9a" : "#4b3427")); }
        const mx = A[0] + (B[0] - A[0]) * 0.52, my = A[1] + (B[1] - A[1]) * 0.52 + lev;
        remplir(c, [[mx - 3, my - 1], [mx + 3, my + 2], [mx + 3, my + 4], [mx - 3, my + 1]], "#b9834f"); contour(c, [[mx - 3, my - 1], [mx + 3, my + 2], [mx + 3, my + 4], [mx - 3, my + 1]], "#4b3427");
      }
      if (m.genre === "labo") {
        // des pierres sèches, avec leurs joints
        for (let k = 0; k < 26; k++) { const u = hash(k, 3), v = hash(3, k); const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u - 2 - v * (H2 - 4); remplir(c, [[x - 2, y], [x + 1, y + 1], [x + 1, y - 1], [x - 2, y - 2]], hash(k, 9) < 0.5 ? "#d9d0b8" : "#c9c9c4"); contour(c, [[x - 2, y], [x + 1, y + 1], [x + 1, y - 1], [x - 2, y - 2]], "#9a9a9a"); }
      }
      if (m.genre === "serre") {
        for (let k = 1; k < 4; k++) { const u = k / 4; ligne(c, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - H2, "#2f6b35"); ligne(c, B[0] + (C[0] - B[0]) * u, B[1] + (C[1] - B[1]) * u, B[0] + (C[0] - B[0]) * u, B[1] + (C[1] - B[1]) * u - H2, "#2f6b35"); }
        for (let k = 0; k < 7; k++) { const u = 0.1 + k * 0.12; feuillage(c, A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - 3, 2, 2, ["#2f6b35", "#4aa63e", "#9cc77a", "#1e3d25"]); }
      } else {
        fenetre(c, A[0] + (B[0] - A[0]) * 0.3 - 2, A[1] + (B[1] - A[1]) * 0.3 - H2 + 4, "g", nuit);
        if (m.d > 1) fenetre(c, A[0] + (B[0] - A[0]) * 0.72 - 2, A[1] + (B[1] - A[1]) * 0.72 - H2 + 4, "g", nuit);
        fenetre(c, B[0] + (C[0] - B[0]) * 0.65 - 2, B[1] + (C[1] - B[1]) * 0.65 - H2 + 4, "d", nuit);
        // la porte, sur la façade au soleil
        const px = A[0] + (B[0] - A[0]) * 0.52, py = A[1] + (B[1] - A[1]) * 0.52;
        remplir(c, [[px - 2, py - 1], [px + 3, py + 1], [px + 3, py - 9], [px - 2, py - 11]], m.genre === "mazet" ? "#7f97f2" : "#2f6b35");
        contour(c, [[px - 2, py - 1], [px + 3, py + 1], [px + 3, py - 9], [px - 2, py - 11]], T.trait);
      }
      // le toit
      const fh = m.genre === "herbo" ? 4 : m.genre === "roulotte" ? 9 : 11;
      const P = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - H2 - fh], Q = [(C[0] + D[0]) / 2, (C[1] + D[1]) / 2 - H2 - fh];
      const a = [A[0], A[1] - H2], b = [B[0], B[1] - H2], cc = [C[0], C[1] - H2], dd = [D[0], D[1] - H2];
      if (m.genre === "herbo") {
        const toit = [[a[0] - 1, a[1]], [b[0] + 1, b[1] + 1], [cc[0] + 1, cc[1] - 4], [dd[0] - 1, dd[1] - 5]];
        remplir(c, toit, T.toitC); contour(c, toit, T.trait);
        for (let k = 0; k < 6; k++) ligne(c, a[0] + k * 3, a[1] + k * 1.5, dd[0] + k * 3, dd[1] - 5 + k * 1.5, T.toitO);
      } else {
        remplir(c, [dd, a, P, Q], T.toitO); contour(c, [dd, a, P, Q], T.trait);
        remplir(c, [a, b, P], m.genre === "serre" ? "#e9f6fb" : T.clair); contour(c, [a, b, P], T.trait);
        remplir(c, [b, cc, Q, P], T.toitC); contour(c, [b, cc, Q, P], T.trait);
        // les tuiles en rangées sur le pan au soleil
        if (m.genre === "mazet" || m.genre === "labo") for (let k = 1; k < 5; k++) { const u = k / 5; ligne(c, b[0] + (P[0] - b[0]) * u, b[1] + (P[1] - b[1]) * u, cc[0] + (Q[0] - cc[0]) * u, cc[1] + (Q[1] - cc[1]) * u, T.toitO); }
        if (m.genre === "roulotte") for (let k = 0; k < 4; k++) remplir(c, [[a[0] + 4 + k * 4, a[1] + 2 + k * 2], [a[0] + 7 + k * 4, a[1] + 3 + k * 2], [a[0] + 7 + k * 4, a[1] + 7 + k * 2], [a[0] + 4 + k * 4, a[1] + 6 + k * 2]], k % 2 ? "#f3f0dc" : "#ff5b4f");
      }
      if (m.genre === "labo") treille(c, A[0] - 2, A[1] - 1);
      if (m.genre === "labo") { const kx = Math.round(Q[0] - 6), ky = Math.round(Q[1] + 6); remplir(c, [[kx, ky], [kx + 4, ky + 2], [kx + 4, ky - 8], [kx, ky - 10]], "#b8ae94"); contour(c, [[kx, ky], [kx + 4, ky + 2], [kx + 4, ky - 8], [kx, ky - 10]], "#6b6578"); m.cheminee = [kx + 2, ky - 10 - h]; }
      if (m.genre === "roulotte") { for (const u of [0.25, 0.8]) { const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u; ovale(c, x, y, 3, 3, null, (dx, dy, l) => (dx * dx + dy * dy > 4 ? "#4b3427" : "#c96a3a")); } }
    });
  }
  // une tiny house : bardage en planches, coins clairs, toit en tôle à joints debout et débord,
  // grandes fenêtres, terrasse avec marches, et parfois des roues ou un tuyau de poêle
  function tinyHouse(c, ox, oy, m) {
    const T = m.t, h = m.h, lev = m.roues ? 5 : 1;
    const B = [ox, oy - lev], A = [B[0] - m.d * 8, B[1] - m.d * 4], C = [B[0] + m.w * 8, B[1] - m.w * 4], D = [A[0] + m.w * 8, A[1] - m.w * 4];
    const g = [[A[0], A[1] - h], [B[0], B[1] - h], B, A], dr = [[B[0], B[1] - h], [C[0], C[1] - h], C, B];
    if (m.roues) { ligne(c, A[0] + 2, A[1] + 2, B[0], B[1] + 2, "#4b3427"); ligne(c, B[0], B[1] + 2, C[0] - 2, C[1] + 2, "#4b3427"); }
    else { remplir(c, [[A[0], A[1]], [B[0], B[1]], [B[0], B[1] + 1], [A[0], A[1] + 1]], "#6b6578"); remplir(c, [[B[0], B[1]], [C[0], C[1]], [C[0], C[1] + 1], [B[0], B[1] + 1]], "#4a4560"); }
    remplir(c, g, cote < 0 ? T.ombre : T.clair); remplir(c, dr, cote < 0 ? T.clair : T.ombre);
    // le bardage : une planche toutes les trois lignes
    for (let y = 3; y < h; y += 3) { ligne(c, A[0], A[1] - y, B[0], B[1] - y, T.planche); ligne(c, B[0], B[1] - y, C[0], C[1] - y, T.trait); }
    contour(c, g, T.trait); contour(c, dr, T.trait);
    // les coins clairs
    for (const [x, y] of [A, B, C]) ligne(c, x, y, x, y - h, "#f3f0dc");
    // deux grandes fenêtres sur la longue façade, une petite sur le pignon
    const fen = (x, y, lw, lh, pente) => {
      const q = [[x, y], [x + lw, y + lw * pente], [x + lw, y + lw * pente - lh], [x, y - lh]];
      remplir(c, q, nuit ? "#f6ee55" : "#a8d8ec"); contour(c, q, "#f3f0dc");
      if (!nuit) ligne(c, x + 1, y - lh + 2, x + 2, y - lh + 1 + pente, "#d6eef7");
    };
    fen(A[0] + 3, A[1] - 3 + 1.5, 6, 6, 0.5);
    if (m.d > 3) fen(A[0] + 19, A[1] + 9 - 3 + 1.5 - 1, 5, 6, 0.5);
    fen(B[0] + 4, B[1] - 4 - 1, 4, 5, -0.5);
    // la porte et sa terrasse de bois, avec deux marches
    const px = A[0] + (B[0] - A[0]) * 0.62, py = A[1] + (B[1] - A[1]) * 0.62;
    const porte = [[px - 2, py - 1], [px + 3, py + 1.5], [px + 3, py - 9.5], [px - 2, py - 12]];
    remplir(c, porte, T.porte); contour(c, porte, T.trait); pixel(c, px + 2, py - 5, "#f6ee55");
    if (m.terrasse || m.roues) {
      const tr = [[px - 6, py - 1], [px + 6, py + 5], [px + 9, py + 3.5], [px - 3, py - 2.5]];
      remplir(c, tr, "#b9834f"); contour(c, tr, "#7a4520");
      for (let k = 1; k < 4; k++) ligne(c, px - 6 + k * 3, py - 1 + k * 1.5, px - 3 + k * 3, py - 2.5 + k * 1.5, "#9a6a3c");
      if (m.terrasse) for (const [x, y] of [[px - 6, py - 1], [px - 3, py + 0.5], [px, py + 2]]) ligne(c, x, y, x, y - 5, "#7a4520");
      for (let k = 0; k < 2; k++) remplir(c, [[px + 1 + k, py + 5 + k * 2], [px + 7 + k, py + 8 + k * 2], [px + 7 + k, py + 9 + k * 2], [px + 1 + k, py + 6 + k * 2]], "#9a6a3c");
    }
    if (m.roues) for (const u of [0.25, 0.52]) { const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u + lev; ovale(c, x, y - 1, 3, 3, null, (dx, dy) => (dx * dx + dy * dy > 5 ? "#23214a" : dx === 0 && dy === 0 ? "#9a9a9a" : "#4b3427")); }
    // le toit à deux pans, faîtage dans la longueur, pignon sur le petit côté, débord
    const a = [A[0] - 1, A[1] - h + 1], b = [B[0] + 1, B[1] - h + 1.5], cc = [C[0] + 1, C[1] - h], dd = [D[0] - 1, D[1] - h];
    const fh = 8 + m.w * 2;
    const R1 = [(b[0] + cc[0]) / 2, (b[1] + cc[1]) / 2 - fh], R2 = [(a[0] + dd[0]) / 2, (a[1] + dd[1]) / 2 - fh];
    remplir(c, [R2, R1, cc, dd], T.toitO); contour(c, [R2, R1, cc, dd], T.trait);
    const pignon = [[B[0], B[1] - h], [C[0], C[1] - h], [R1[0], R1[1] + 2]];
    remplir(c, pignon, cote < 0 ? T.clair : T.ombre); contour(c, pignon, T.trait);
    fen(R1[0] - 2, R1[1] + 9, 3, 3, -0.5);
    const devant = [a, b, R1, R2];
    remplir(c, devant, T.toitC); contour(c, devant, T.trait);
    // les joints debout de la tôle
    for (let k = 1; k < 9; k++) { const u = k / 9; ligne(c, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, R2[0] + (R1[0] - R2[0]) * u, R2[1] + (R1[1] - R2[1]) * u, T.toitO); }
    // des panneaux solaires sur le pan au soleil : bleu nuit, une grille claire, un reflet du ciel
    if (m.solaire) {
      const sur = (u, v) => [a[0] + (b[0] - a[0]) * u + (R2[0] - a[0]) * v, a[1] + (b[1] - a[1]) * u + (R2[1] - a[1]) * v];
      for (let k = 0; k < 3; k++) for (let r = 0; r < 2; r++) {
        const u0 = 0.12 + k * 0.27, v0 = 0.18 + r * 0.38, du = 0.24, dv = 0.32;
        const q = [sur(u0, v0), sur(u0 + du, v0), sur(u0 + du, v0 + dv), sur(u0, v0 + dv)];
        remplir(c, q, "#232a63"); contour(c, q, "#9a9a9a");
        const m1 = sur(u0 + du / 2, v0), m2 = sur(u0 + du / 2, v0 + dv);
        ligne(c, m1[0], m1[1], m2[0], m2[1], "#3a5a8a");
        const re = sur(u0 + 0.05, v0 + dv - 0.08);
        pixel(c, re[0], re[1], nuit ? "#3a3aa8" : "#a8d8ec");
      }
    }
    // le tuyau de poêle, sur le pan arrière : c'est de là que sort la fumée
    if (m.poele) {
      const kx = Math.round(R2[0] + (R1[0] - R2[0]) * 0.3 + 2), ky = Math.round(R2[1] + (R1[1] - R2[1]) * 0.3 + 1);
      for (let y = 0; y < 8; y++) { pixel(c, kx, ky - y, "#4a4560"); pixel(c, kx + 1, ky - y, "#6b6578"); }
      remplir(c, [[kx - 1, ky - 8], [kx + 3, ky - 8], [kx + 2, ky - 10], [kx, ky - 10]], "#4a4560");
      m.cheminee = [kx + 1, ky - 11];
    }
    if (m.treille) treille(c, A[0] - 3, A[1] + 1);
    m.hTot = h + fh + lev;
  }

  // la roulotte : un toit en tonneau, une façade arrondie, de grandes roues à rayons, un timon,
  // et la guirlande de petites cartes
  function dessinRoulotte(c, ox, oy, m, T) {
    const h = m.h, A = [ox - m.d * 8, oy - m.d * 4], B = [ox, oy], C = [ox + m.w * 8, oy - m.w * 4];
    const vx = C[0] - B[0], vy = C[1] - B[1];
    const arc = [];
    for (let k = 0; k <= 12; k++) { const u = k / 12; arc.push([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u - h - Math.sin(Math.PI * u) * 9]); }
    // le toit en tonneau, rouge corail, avec ses lattes
    remplir(c, arc.concat(arc.slice().reverse().map(([x, y]) => [x + vx, y + vy])), T.toitC);
    for (let k = 2; k < 12; k += 2) ligne(c, arc[k][0], arc[k][1], arc[k][0] + vx, arc[k][1] + vy, T.toitO);
    contour(c, arc.concat(arc.slice().reverse().map(([x, y]) => [x + vx, y + vy])), T.trait);
    // la longue face à l'ombre
    const dr = [[B[0], B[1] - h], [C[0], C[1] - h], C, B];
    remplir(c, dr, cote < 0 ? T.clair : T.ombre); contour(c, dr, T.trait);
    for (const u of [0.3, 0.7]) { const x = B[0] + vx * u, y = B[1] + vy * u - h + 3; ovale(c, x, y + 1, 2, 2, null, (dx, dy) => (dx * dx + dy * dy > 2 ? "#9a6a3c" : nuit ? "#f6ee55" : "#a8d8ec")); }
    // la façade arrondie au soleil, avec sa porte bleue et la guirlande de cartes
    const g = [A, B].concat(arc.slice().reverse());
    remplir(c, g, cote < 0 ? T.ombre : T.clair); contour(c, g, T.trait);
    const px = A[0] + (B[0] - A[0]) * 0.5, py = A[1] + (B[1] - A[1]) * 0.5;
    remplir(c, [[px - 2, py - 1], [px + 3, py + 1], [px + 3, py - 10], [px - 2, py - 12]], "#3d5ee8"); contour(c, [[px - 2, py - 1], [px + 3, py + 1], [px + 3, py - 10], [px - 2, py - 12]], "#26406a");
    for (let k = 1; k < 6; k++) { const u = k / 6, x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u - h - Math.sin(Math.PI * u) * 5 + 2; pixel(c, x, y, k % 2 ? "#ff5b4f" : "#f3f0dc"); pixel(c, x, y + 1, k % 2 ? "#ff5b4f" : "#f3f0dc"); }
    // l'escalier de bois devant la porte
    for (let k = 0; k < 3; k++) remplir(c, [[px - 3 - k, py + 1 + k * 2], [px + 3 - k, py + 4 + k * 2], [px + 3 - k, py + 5 + k * 2], [px - 3 - k, py + 2 + k * 2]], k % 2 ? "#9a6a3c" : "#b9834f");
    // deux grandes roues à rayons, sous la longue face
    for (const u of [0.2, 0.8]) {
      const x = B[0] + vx * u, y = B[1] + vy * u + 4;
      ovale(c, x, y, 4, 4, null, (dx, dy) => { const r2 = dx * dx + dy * dy; return r2 > 10 ? "#4b3427" : r2 < 2 ? "#e9b44c" : dx === 0 || dy === 0 ? "#9a6a3c" : null; });
    }
    // le timon, devant
    ligne(c, A[0] + 2, A[1] + 3, A[0] - 6, A[1] + 7, "#4b3427");
  }
  // la treille du labo : deux poteaux, une poutre, une vigne et des bouquets qui sèchent
  function treille(c, x, y) {
    for (const dx of [0, 14]) for (let k = 0; k < 18; k++) pixel(c, x + dx, y - k, "#7a4520");
    ligne(c, x - 2, y - 18, x + 16, y - 22, "#9a6a3c");
    for (let k = 0; k < 9; k++) { pixel(c, x + k * 2, y - 19 - k * 0.45, "#4aa63e"); pixel(c, x + k * 2 + 1, y - 20 - k * 0.45, "#2f6b35"); }
    for (const [dx, col] of [[3, "#8a58cc"], [7, "#e9b44c"], [11, "#6cbd5c"]]) { const yy = y - 18 - dx * 0.25; ligne(c, x + dx, yy, x + dx, yy + 3, "#4b3427"); remplir(c, [[x + dx - 2, yy + 3], [x + dx + 2, yy + 3], [x + dx + 1, yy + 8], [x + dx - 1, yy + 8]], col); }
  }

  // ƟvƟ en pixels : boucles brunes, lunettes, chemise rouge, salopette bleue
  const OVO = ["..hhhh..", ".hhhhhh.", ".hssssh.", ".haaaah.", "..ssss..", ".rrbbrr.", ".rbbbbr.", "..bbbb..", "..b..b..", "..n..n.."];
  const OVO2 = OVO.slice(0, 8).concat(["..b..b..", ".n....n."]);
  const PAL = { h: "#3b2416", s: "#f2c29b", a: "#9a9a9a", r: "#e03a3a", b: "#3a5fd0", n: "#7a4520" };
  function dessinOvo(c, x, y, image) {
    const g = image ? OVO2 : OVO;
    g.forEach((l, j) => [...l].forEach((ch, i) => { if (PAL[ch]) pixel(c, x - 4 + i, y - g.length + j, PAL[ch]); }));
  }
  // Mesi, toute petite : mulet châtain, lunettes, chemise verte
  const MESI = ["..cccc..", ".cccccc.", ".cssssc.", ".cqqqqc.", "..ssss..", ".ggbbgg.", ".gbbbbg.", "..bbbb..", "..b..b..", "..n..n.."];
  const PAL_MESI = { c: "#8a4b22", s: "#f2c29b", q: "#ee9a7e", g: "#3aa04a", b: "#3a5fd0", n: "#7a4520" };
  function dessinMesi(c, x, y) { MESI.forEach((l, j) => [...l].forEach((ch, i) => { if (PAL_MESI[ch]) pixel(c, x - 4 + i, y - MESI.length + j, PAL_MESI[ch]); })); }
  // Lóló, la peluche caramel, avec Mémé roulée sur son dos ; deux images pour le pas
  const LOLO = [
    "........kk..",
    ".......knwk.",
    "...tt.knnnnk",
    "Nnnnnnnnnk..",
    ".nnnnnnnnk..",
    ".n.n...n.n..",
    ".N.N...N.N..",
  ];
  const LOLO2 = LOLO.slice(0, 5).concat(["..n.n.n.n...", "..N.N.N.N..."]);
  const PAL_LOLO = { k: "#7a4520", n: "#b9834f", N: "#4b3427", w: "#f3f0dc", t: "#c9ad8a" };
  function dessinLolo(c, x, y, image, gauche) {
    const g = image ? LOLO2 : LOLO;
    g.forEach((l, j) => [...l].forEach((ch, i) => { if (PAL_LOLO[ch]) pixel(c, gauche ? x + 6 - i : x - 6 + i, y - g.length + j, PAL_LOLO[ch]); }));
  }
  // les objets posés en aménageant
  function dessinObjet(c, e, x, y) {
    if (e.type === "pierre") { ovale(c, x, y - 2, 4, 2, null, (dx, dy) => (dy < 0 && dx < 1 ? "#c9c9c4" : "#9a9a9a")); return; }
    if (e.type === "dalle") { ovale(c, x, y, 4, 2, null, (dx, dy) => (Math.abs(dx) > 2 ? "#c9a06a" : "#e9e3cd")); return; }
    if (e.type === "pot") { remplir(c, [[x - 3, y - 6], [x + 3, y - 6], [x + 2, y], [x - 2, y]], "#c96a3a"); ovale(c, x, y - 8, 3, 2, "#4aa63e"); pixel(c, x - 1, y - 9, "#e04bb0"); return; }
    if (e.type === "banc") { remplir(c, [[x - 6, y - 4], [x + 2, y], [x + 6, y - 2], [x - 2, y - 6]], "#b9834f"); contour(c, [[x - 6, y - 4], [x + 2, y], [x + 6, y - 2], [x - 2, y - 6]], "#7a4520"); for (const [dx, dy] of [[-5, -3], [1, 0], [5, -2]]) ligne(c, x + dx, y + dy, x + dx, y + dy + 3, "#4b3427"); return; }
    if (e.type === "plante") {
      const p = e.plante && H.d.plante(e.plante), fleur = p ? ["#e04bb0", "#f6ee55", "#8a58cc", "#ff5b4f", "#f3f0dc"][(p.nom.length) % 5] : "#e04bb0";
      ovale(c, x, y - 3, 4, 3, null, (dx, dy) => (hash(x + dx, y + dy) < 0.15 ? fleur : dy < 0 ? "#4aa63e" : "#2f6b35"));
    }
  }
  // --- le fond : le ciel en bandes, deux rangées de montagnes bleuies, la forêt, la mer ---
  let fond = null, fc = null;
  function peindreFond() {
    [fond, fc] = toileDe(W + 80, Math.max(Ht + 40, 220));
    const CIELS = {
      aube: ["#3a3aa8", "#8a58cc", "#d07ab8", "#ffb3a8", "#ffd23a"],
      matin: ["#2f8fe0", "#4a9ee6", "#6fb6ee", "#8fc7f0", "#a8d8ec"],
      midi: ["#2f8fe0", "#4a9ee6", "#6fb6ee", "#8fc7f0", "#a8d8ec"],
      apres: ["#2f8fe0", "#4a9ee6", "#6fb6ee", "#8fc7f0", "#d6eef7"],
      crepuscule: ["#2a2c6a", "#5b3c8f", "#c93f6e", "#ff5b4f", "#e9b44c"],
      nuit: ["#15124a", "#1b1d4a", "#232a63", "#2a2c6a", "#3a3aa8"],
    };
    CIELS[periode].forEach((col, k) => { fc.fillStyle = col; fc.fillRect(0, k * 12, W + 80, 12); });
    if (nuit) for (let k = 0; k < 50; k++) pixel(fc, hash(k, 1) * (W + 80), hash(1, k) * hash(k, 2) * 60, "#f3f0dc");
    else for (const [x, y] of [[40, 14], [180, 8], [270, 18]]) { ovale(fc, x, y, 14, 3, periode === "crepuscule" ? "#ffb3a8" : "#f3f0dc"); ovale(fc, x + 6, y - 3, 8, 3, periode === "crepuscule" ? "#ffd23a" : "#ffffff"); }
    // les calanques : des crêtes de calcaire découpées, des à-pics, une face au soleil, une à
    // l'ombre ; la plus lointaine bleuie par l'air
    const crete = (base, haut, graineC) => {
      graine = graineC;
      // des massifs arrondis aux crêtes dentelées, et de vraies falaises, raides mais jamais verticales
      const ph = [alea() * 6, alea() * 6, alea() * 6];
      const prof = [];
      let y = base - haut * 0.5;
      for (let x = 0; x < W + 80; x++) {
        const voulu = base - haut * (0.45 + 0.3 * Math.sin(x / 41 + ph[0]) + 0.18 * Math.sin(x / 17 + ph[1]) + 0.07 * Math.sin(x / 5 + ph[2])) + (alea() - 0.5) * 2;
        const pas = alea() < 0.15 ? 3 : 1.2; // ici et là, une pente de falaise
        y += Math.max(-pas, Math.min(pas, voulu - y));
        y = Math.max(base - haut, Math.min(base - 2, y));
        prof.push(Math.round(y));
      }
      return prof;
    };
    // les faces au soleil prennent la couleur de la lumière (rose à l'aube, crème le jour, orangée
    // au couchant) ; les faces à l'ombre sont bleu-violet
    const LUM = { aube: ["#e0b8d8", "#ffd2c0"], matin: ["#c8d6ea", "#f3f0dc"], midi: ["#c8d6ea", "#f3f0dc"], apres: ["#c8d6ea", "#f3f0dc"], crepuscule: ["#d8a0b8", "#ffc890"], nuit: ["#2a2c6a", "#3a3a6a"] }[periode];
    const OMB = { aube: ["#7f6fb8", "#8a58cc"], crepuscule: ["#6a4a9a", "#8a58cc"], nuit: ["#1b1d4a", "#232a63"] }[periode] || ["#8fa6c8", "#7f97c8"];
    const couches = [
      { base: 70, haut: 30, g: 5, clair: LUM[0], ombre: OMB[0] },
      { base: 78, haut: 24, g: 9, clair: LUM[1], ombre: OMB[1], fissures: nuit ? "#1b1d4a" : "#9a9a9a" },
    ];
    for (const k of couches) {
      const prof = crete(k.base, k.haut, k.g);
      for (let x = 0; x < W + 80; x++) {
        // la pente qui regarde à l'opposé du soleil reste à l'ombre
        // la pente moyenne sur quelques pixels : de vraies faces d'ombre, pas des rayures
        const pente = (prof[Math.min(W + 79, x + 4)] - prof[Math.max(0, x - 4)]) * (cote < 0 ? -1 : 1);
        for (let y = prof[x]; y < 92; y++) {
          // une trame à la limite entre lumière et ombre, comme sur les pixels d'époque
          let col = pente > 2.6 ? k.ombre : pente > 1.4 ? ((x + y) % 2 ? k.ombre : k.clair) : k.clair;
          if (k.fissures && hash(x, 4) < 0.04 && y > prof[x] + 3) col = k.fissures;
          pixel(fc, x, y, col);
        }
      }
      // un peu de garrigue au pied des falaises
      if (k.fissures) for (let x = 0; x < W + 80; x += 2) { const hh = Math.round(hash(x, 5) * 3); for (let y = 0; y < hh; y++) pixel(fc, x, k.base - 1 - y, nuit ? "#173a26" : "#3f8a42"); }
    }
    // la forêt devant les calanques
    for (let x = 0; x < W + 80; x += 3) { const hh = 6 + Math.round(hash(x, 3) * 5); for (let y = 0; y < hh; y++) pixel(fc, x, 86 - y, y > hh - 2 ? (nuit ? "#2f6b35" : "#3f8a42") : nuit ? "#173a26" : "#2f6b35"); pixel(fc, x + 1, 86 - hh + 1, nuit ? "#173a26" : "#1e3d25"); }
    fc.fillStyle = nuit ? "#173a26" : "#1e3d25"; fc.fillRect(0, 86, W + 80, 4);
    fc.fillStyle = nuit ? "#26406a" : "#12aec4"; fc.fillRect(0, 90, W + 80, 400);
    fc.fillStyle = nuit ? "#3a5a8a" : "#a8d8ec";
    for (let k = 0; k < 60; k++) fc.fillRect(hash(k, 9) * (W + 80), 94 + hash(9, k) * 86, 4, 1);
  }
  let fondCle = null;

  // l'enveloppe convexe d'un nuage de points (pour l'ombre d'une maison)
  function enveloppe(pts) {
    const p = pts.map(([x, y]) => [Math.round(x), Math.round(y)]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const croix = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const bas = [], haut = [];
    for (const q of p) { while (bas.length >= 2 && croix(bas[bas.length - 2], bas[bas.length - 1], q) <= 0) bas.pop(); bas.push(q); }
    for (const q of p.slice().reverse()) { while (haut.length >= 2 && croix(haut[haut.length - 2], haut[haut.length - 1], q) <= 0) haut.pop(); haut.push(q); }
    return bas.slice(0, -1).concat(haut.slice(0, -1));
  }

  // --- le moment : le vrai soleil du lieu choisi (lever à droite, coucher à gauche), puis la lune ---
  function moment() {
    const s = H.ciel.etat(), maintenant = Date.now();
    const lever = s.heures && s.heures.lever ? +s.heures.lever : new Date().setHours(7, 0, 0, 0);
    const coucher = s.heures && s.heures.coucher ? +s.heures.coucher : new Date().setHours(19, 30, 0, 0);
    if (maintenant >= lever && maintenant < coucher) {
      const u = (maintenant - lever) / (coucher - lever);
      const per = u < 0.1 ? "aube" : u < 0.38 ? "matin" : u < 0.6 ? "midi" : u < 0.9 ? "apres" : "crepuscule";
      return { astre: "soleil", u, periode: per, cote: per === "aube" || per === "matin" ? -1 : per === "midi" ? 0 : 1, nuit: false, phase: s.lune.phase };
    }
    const debut = maintenant >= coucher ? coucher : coucher - 864e5, fin = maintenant >= coucher ? lever + 864e5 : lever;
    const u = Math.max(0, Math.min(1, (maintenant - debut) / (fin - debut)));
    return { astre: "lune", u, periode: "nuit", cote: u < 0.45 ? -1 : 1, nuit: true, phase: s.lune.phase };
  }

  // --- la scène ---
  let scene = null, galopDejaVu = false;
  const laboActif = () => !!(H.labo && H.labo.enCours && H.labo.enCours());

  function dimensionner() {
    const b = scene.boite, cw = b.clientWidth || 800, ch = b.clientHeight || 500;
    // des pixels entiers : chaque pixel du dessin fait 2 à 6 pixels d'écran
    const k = Math.max(2, Math.floor(Math.min(cw, ch) / 190));
    W = Math.max(120, Math.floor(cw / k));
    Ht = Math.max(120, Math.floor(ch / k));
    scene.k = k;
    scene.toile.width = W;
    scene.toile.height = Ht;
    scene.toile.style.width = W * k + "px";
    scene.toile.style.height = Ht * k + "px";
    scene.ctx = scene.toile.getContext("2d");
    scene.ctx.imageSmoothingEnabled = false;
    [scene.ombres, scene.sh] = toileDe(W, Ht);
    fondCle = null;
    const [sx, sy] = iso(scene.ovo.x, scene.ovo.y);
    scene.cam.x = sx - W / 2; scene.cam.y = sy - Ht / 2 - 10;
  }

  // ƟvƟ marche de maison en maison par les chemins
  function trajetVers(id) {
    const perso = scene.ovo;
    const file = [[perso.lieu]], vus = new Set([perso.lieu]);
    while (file.length) {
      const route = file.shift(), ici = route[route.length - 1];
      if (ici === id) return route;
      for (const c of chemins) { const v = c.a === ici ? c.b : c.b === ici ? c.a : null; if (v && !vus.has(v)) { vus.add(v); file.push(route.concat(v)); } }
    }
    return [perso.lieu];
  }
  function aller(id) {
    const perso = scene.ovo, etapes = trajetVers(id), pts = [];
    for (let k = 0; k < etapes.length - 1; k++) {
      const c = chemins.find((c) => (c.a === etapes[k] && c.b === etapes[k + 1]) || (c.b === etapes[k] && c.a === etapes[k + 1]));
      const sens = c.a === etapes[k];
      for (let s = 0; s <= 1; s += 0.12 / c.long) pts.push(point(c, sens ? s : 1 - s));
    }
    perso.trajet = pts.length ? pts : null;
    perso.i = 0;
    perso.but = id;
    if (!perso.trajet) arriver(id);
  }
  function arriver(id) {
    const m = parId[id];
    scene.ovo.lieu = id;
    H.d.majLocal((l) => (l.dernierLieu = id));
    if (m && m.hash) H.aller(m.hash);
  }

  function dessiner(t) {
    const { ctx } = scene, perso = scene.ovo;
    const mo = moment();
    drapeau = !!(H.lettres && H.lettres.aLire() > 0);
    if (fondCle !== mo.periode + mo.cote + W) {
      nuit = mo.nuit; cote = mo.cote; periode = mo.periode;
      peindreFond(); sprites.clear(); fondCle = mo.periode + mo.cote + W;
    }
    const [sx, sy] = iso(perso.x, perso.y);
    scene.cam.x += (sx - W / 2 - scene.cam.x) * 0.06;
    scene.cam.y += (sy - Ht / 2 - 10 - scene.cam.y) * 0.06;
    if (perso.trajet) {
      perso.i = Math.min(perso.trajet.length - 1, perso.i + 0.5);
      [perso.x, perso.y] = perso.trajet[Math.floor(perso.i)];
      scene.traces.push([perso.x, perso.y]);
      if (scene.traces.length > 400) scene.traces.shift();
      if (perso.i >= perso.trajet.length - 1) { perso.trajet = null; arriver(perso.but); }
    }
    const cx = Math.round(scene.cam.x), cy = Math.round(scene.cam.y);
    ctx.fillStyle = nuit ? "#15124a" : "#2f8fe0";
    ctx.fillRect(0, 0, W, Ht);
    ctx.drawImage(fond, -40 - Math.round(cx * 0.05), Math.round(-cy * 0.08) - 10);
    // le soleil ou la lune, qui traverse le ciel de droite à gauche
    {
      const ax = Math.round(W * (0.92 - 0.84 * mo.u)), ay = Math.max(9, Math.round(58 - Math.sin(Math.PI * mo.u) * 44 - cy * 0.08 - 10));
      if (mo.astre === "soleil") {
        const bas = mo.periode === "aube" || mo.periode === "crepuscule";
        ovale(ctx, ax, ay, 8, 8, bas ? "rgba(255,91,79,0.35)" : "rgba(246,238,85,0.3)");
        ovale(ctx, ax, ay, 5, 5, bas ? "#ff5b4f" : "#f6ee55"); ovale(ctx, ax - 1, ay - 1, 3, 3, bas ? "#ffd23a" : "#fff8b0");
      } else {
        const f = mo.phase;
        ovale(ctx, ax, ay, 5, 5, null, (x) => { const ombre = f < 0.5 ? x / 5 < 1 - f * 4 : x / 5 > (f - 0.5) * 4 - 1; return ombre ? "rgba(243,240,220,0.12)" : "#f3f0dc"; });
      }
    }
    ctx.drawImage(sol0, -cx, -cy);
    // Lóló : la première fois, il arrive au galop depuis le bord ; ensuite il suit ƟvƟ
    const lo = scene.lolo;
    if (lo.course) {
      const pos = H.sons.position(lo.course, performance.now());
      if (pos) {
        const k = pos.x / 100;
        lo.x = lo.x0 + (perso.x - 1 - lo.x0) * k; lo.y = lo.y0 + (perso.y + 0.4 - lo.y0) * k;
        lo.marche = pos.enCourse;
        if (!pos.enCourse) lo.course = null;
      }
    } else if (lo.x != null && scene.traces.length > 14 && perso.trajet) {
      const [tx, ty] = scene.traces[scene.traces.length - 14];
      lo.marche = Math.hypot(tx - lo.x, ty - lo.y) > 0.05;
      lo.gauche = tx < lo.x;
      lo.x += (tx - lo.x) * 0.2; lo.y += (ty - lo.y) * 0.2;
    } else lo.marche = false;
    // tout ce qui se dresse, trié du fond vers le devant
    const objets = [];
    for (const p of plantes) objets.push({ prof: p.x + p.y, p });
    for (const m of MAISONS) objets.push({ prof: m.i + m.w + m.j + m.d, m });
    for (const e of elementsIso()) if (e.type) objets.push({ prof: e.i + e.j, e });
    objets.push({ prof: perso.x + perso.y + 0.02, ovo: true });
    if (lo.x != null) objets.push({ prof: lo.x + lo.y + 0.01, lolo: true });
    const soir = (H.ciel.etat().soleil.alt < 3 && new Date().getHours() >= 15) || H.ciel.nuitCalme();
    const pm = porte(parId.maison);
    if (soir) objets.push({ prof: pm[0] + pm[1] - 0.6 + 0.5, mesi: true });
    objets.sort((a, b) => a.prof - b.prof);
    // les ombres portées, comme celles d'un modèle en relief
    {
      const { sh, ombres } = scene;
      const alt = Math.max(0.18, Math.sin(Math.PI * mo.u));
      const Lg = Math.min(2.4, 0.55 / alt), dx = (2 * mo.u - 1) * Lg, dy = -0.32 * Lg;
      sh.clearRect(0, 0, W, Ht);
      const projette = (pts, hh) => remplir(sh, enveloppe(pts.concat(pts.map(([x, y]) => [x + dx * hh, y + dy * hh]))), "#1b1d4a");
      for (const o of objets) {
        if (o.m) {
          const m = o.m;
          if (m.genre === "ponton") continue;
          const hh = m.genre === "boite" ? 15 : m.hTot || m.h + 10;
          projette([iso(m.i, m.j), iso(m.i + m.w, m.j), iso(m.i + m.w, m.j + m.d), iso(m.i, m.j + m.d)].map(([x, y]) => [x - cx, y - cy + 4]), hh);
        } else if (o.p) {
          const e = o.p.e, [x, y] = iso(o.p.x, o.p.y), bx = x - cx, by = y - cy + 4;
          const H0 = { pin: 26, cedre: 22, araucaria: 40, figuier: 10, yucca: 14, romarin: 4, genevrier: 18, agave: 4 }[e] || 6;
          const R0 = { pin: 13, cedre: 8, araucaria: 9, figuier: 4, yucca: 6, romarin: 4, genevrier: 3, agave: 6 }[e] || 4;
          ligne(sh, bx, by, bx + dx * H0, by + dy * H0, "#1b1d4a");
          ovale(sh, bx + dx * H0, by + dy * H0, Math.round(R0 * 0.9), Math.max(1, Math.round(R0 / 2.4)), "#1b1d4a");
        } else {
          const qui = o.ovo ? perso : o.lolo ? lo : o.mesi ? { x: pm[0] - 0.6, y: pm[1] + 0.5 } : null;
          if (qui) { const [x, y] = iso(qui.x, qui.y); ligne(sh, x - cx, y - cy + 4, x - cx + dx * 8, y - cy + 4 + dy * 8, "#1b1d4a"); }
        }
      }
      ctx.globalAlpha = nuit ? 0.14 : periode === "aube" || periode === "crepuscule" ? 0.2 : 0.26;
      ctx.drawImage(ombres, 0, 0);
      ctx.globalAlpha = 1;
    }
    const pas = Math.floor(t / 150) % 2;
    for (const o of objets) {
      if (o.p) { const s = dessinPlante(o.p), [x, y] = iso(o.p.x, o.p.y); ctx.drawImage(s, Math.round(x - s.width / 2) - cx, Math.round(y + 4 - s.height) - cy); }
      else if (o.m) {
        const m = o.m, s = dessinMaison(m), [x, y] = iso(m.i + m.w, m.j + m.d);
        const px = Math.round(x - m.w * 8 - 12) - cx, py = Math.round(y - s.height + 6) - cy;
        ctx.drawImage(s, px, py);
        m.posSprite = [px, py];
      } else if (o.e) { const [x, y] = iso(o.e.i, o.e.j); dessinObjet(ctx, o.e, Math.round(x) - cx, Math.round(y) + 4 - cy); }
      else if (o.ovo) { const [x, y] = iso(perso.x, perso.y); dessinOvo(ctx, Math.round(x) - cx, Math.round(y) + 4 - cy, perso.trajet && pas); }
      else if (o.lolo) { const [x, y] = iso(lo.x, lo.y); dessinLolo(ctx, Math.round(x) - cx, Math.round(y) + 4 - cy, lo.marche && pas, lo.gauche); lo.ecran = [Math.round(x) - cx, Math.round(y) + 4 - cy]; }
      else if (o.mesi) { const [x, y] = iso(pm[0] - 0.6, pm[1] + 0.5); dessinMesi(ctx, Math.round(x) - cx, Math.round(y) + 4 - cy); }
    }
    // un filet de fumée sort du tuyau de poêle du labo, quand une préparation est en cours
    const labo = parId.labo;
    if (laboActif() && labo.posSprite && labo.cheminee) {
      const lx = labo.posSprite[0] + labo.cheminee[0], ly = labo.posSprite[1] + labo.cheminee[1];
      for (let k = 0; k < 5; k++) { const u = ((t / 2400) + k / 5) % 1; ovale(ctx, lx + Math.round(Math.sin(u * 5 + k) * 2 + u * 5), ly - Math.round(u * 24), 1 + Math.round(u * 3), 1 + Math.round(u * 2), u < 0.5 ? "#f3f0dc" : "#c9c9c4"); }
    }
    // la pluie, quand il pleut vraiment (ou la pluie de joie de Lóló)
    const m = H.ciel.meteo || {};
    if ((H.pluieMagique && H.pluieMagique()) || m.type === "pluie" || m.type === "orage") {
      ctx.fillStyle = nuit ? "rgba(168,216,236,0.5)" : "rgba(214,238,247,0.75)";
      for (let k = 0; k < 90; k++) { const x = (hash(k, 1) * W + t / 9) % W, y = (hash(1, k) * Ht + t / 2.2 * (0.8 + hash(k, 3) * 0.4)) % Ht; ctx.fillRect(Math.round(x), Math.round(y), 1, 3); }
    }
    // des goélands qui traversent le ciel de temps en temps
    if (scene.goelands && t - scene.goelands < 9000) {
      const u = (t - scene.goelands) / 9000;
      for (let k = 0; k < 3; k++) { const x = Math.round(W * (1.1 - u * 1.3) + k * 9), y = Math.round(18 + k * 5 + Math.sin(t / 200 + k) * 2), aile = Math.floor(t / 180 + k) % 2; pixel(ctx, x, y, "#f3f0dc"); pixel(ctx, x - 1, y - aile, "#f3f0dc"); pixel(ctx, x + 1, y - aile, "#f3f0dc"); pixel(ctx, x - 2, y - aile + 1, "#c9c9c4"); pixel(ctx, x + 2, y - aile + 1, "#c9c9c4"); }
    }
    // la lumière du moment
    const teinte = { nuit: "rgba(20,18,64,0.3)", aube: "rgba(255,179,168,0.12)", crepuscule: "rgba(255,91,79,0.13)" }[periode];
    if (teinte) { ctx.fillStyle = teinte; ctx.fillRect(0, 0, W, Ht); }
    // le nom de la maison survolée (ou touchée une première fois), en VT323 net, par-dessus
    scene.survol = null;
    const pt = scene.pointeur;
    if (pt && !scene.amenager) for (const mm of MAISONS) { const [x, y] = iso(mm.i + mm.w / 2, mm.j + mm.d / 2); if (Math.abs(pt.x - (x - cx)) < 6 + mm.w * 6 && pt.y > y - cy - 28 && pt.y < y - cy + 10) scene.survol = mm; }
    const montre = scene.survol || scene.choisi;
    if (montre) {
      const [x0, y0] = iso(montre.i + montre.w / 2, montre.j + montre.d / 2);
      scene.etiquette.textContent = montre.nom;
      scene.etiquette.style.left = (x0 - cx) * scene.k + "px";
      scene.etiquette.style.top = Math.max(14, y0 - cy - 34) * scene.k + "px";
      scene.etiquette.hidden = false;
    } else scene.etiquette.hidden = true;
    scene.toile.style.cursor = scene.amenager ? (scene.amenager.outil === "deplacer" ? "grab" : "crosshair") : montre || scene.surLolo ? "pointer" : "default";
  }

  function boucle() {
    const pas = (t) => {
      if (!scene) return;
      dessiner(t);
      scene.anim = requestAnimationFrame(pas);
    };
    scene.anim = requestAnimationFrame(pas);
  }

  // --- aménager : la barre façon console, en bas ---
  const versMonde = (x, y) => {
    const X = x + Math.round(scene.cam.x) - OX, Y = y + Math.round(scene.cam.y) - OY - 4;
    return [(X / 8 + Y / 4) / 2, (Y / 4 - X / 8) / 2];
  };
  function barreAmenager() {
    const a = scene.amenager;
    const barre = H.el("div.outils-ferme");
    const outil = (id, nom) => H.el("button.bouton.petit" + (a.outil === id ? ".actif" : ""), { type: "button", onclick: () => { a.outil = id; majBarre(); } }, nom);
    const plante = a.plante && H.d.plante(a.plante);
    barre.append(
      H.el("div.pastilles", null,
        H.el("button.bouton.petit" + (a.outil === "plante" ? ".actif" : ""), {
          type: "button",
          onclick: () => H.choisirPlantes(a.plante ? [a.plante] : [], (ids) => { a.plante = ids[0] || a.plante; a.outil = "plante"; majBarre(); }, "Quelle plante poser ?", { un: true }),
        }, plante ? "Plante : " + plante.nom : "Choisir une plante"),
        ...Object.entries(OBJETS).filter(([id]) => id !== "plante").map(([id, nom]) => outil(id, nom))),
      H.el("div.pastilles", null, ...Object.entries(PINCEAUX).map(([id, nom]) => outil(id, nom))),
      H.el("div.pastilles", null,
        outil("deplacer", "Déplacer"),
        outil("gomme", "Gomme"),
        H.el("button.bouton.petit", { type: "button", onclick() {
          const id = a.poses.pop();
          const e = id && ((H.jeu.ferme || {}).elements || {})[id];
          if (!e) return H.toast("Rien à annuler");
          enregistrer(Object.assign({}, e, { supprime: true }));
          peindreSol(); peindreSol2();
        } }, "Annuler le dernier"),
        H.el("button.bouton.petit.terminer", { type: "button", onclick: () => basculerAmenager(false) }, "Terminer"))
    );
    return barre;
  }
  function majBarre() {
    if (!scene || !scene.amenager) return;
    const nouvelle = barreAmenager();
    scene.barre.replaceWith(nouvelle);
    scene.barre = nouvelle;
  }
  function basculerAmenager(oui) {
    if (oui && !scene.amenager) {
      scene.amenager = { outil: "pierre", plante: null, poses: [] };
      scene.barre = barreAmenager();
      scene.boite.appendChild(scene.barre);
      H.toast("Clique sur la ferme pour poser, glisse pour peindre.");
    } else if (!oui && scene.amenager) {
      scene.amenager = null;
      if (scene.barre) scene.barre.remove();
      scene.barre = null;
    }
  }
  function agirAmenager(e, debut) {
    const a = scene.amenager, [i, j] = versMonde(e.x, e.y);
    if (i < 0 || j < 0 || i >= N || j >= N) return;
    const ci = Math.floor(i), cj = Math.floor(j);
    if (PINCEAUX[a.outil]) {
      const id = "iso-sol-" + ci + "," + cj;
      const avant = ((H.jeu.ferme || {}).elements || {})[id];
      if (avant && avant.sol === a.outil && !avant.supprime) return;
      enregistrer({ id, iso: true, sol: a.outil, i: ci, j: cj });
      a.poses.push(id);
      losange(sc, ci, cj, TEXTURES_PINCEAUX[a.outil], 3);
      return;
    }
    if (!debut) return;
    const proche = elementsIso().filter((x) => x.type).map((x) => [x, Math.hypot(x.i - i, x.j - j)]).sort((p, q) => p[1] - q[1])[0];
    if (a.outil === "gomme") {
      if (proche && proche[1] < 0.8) { enregistrer(Object.assign({}, proche[0], { supprime: true })); return; }
      const s = ((H.jeu.ferme || {}).elements || {})["iso-sol-" + ci + "," + cj];
      if (s && !s.supprime) { enregistrer(Object.assign({}, s, { supprime: true })); peindreSol(); peindreSol2(); }
      return;
    }
    if (a.outil === "deplacer") { if (proche && proche[1] < 0.8) a.prise = proche[0]; return; }
    if (OBJETS[a.outil]) {
      if (a.outil === "plante" && !a.plante) return H.toast("Choisis d’abord une plante");
      const el = { id: H.uid("iso"), iso: true, type: a.outil, i, j };
      if (a.outil === "plante") el.plante = a.plante;
      enregistrer(el);
      a.poses.push(el.id);
      H.bruit("plante");
    }
  }

  H.ferme = { scene: () => scene };
  H.vues.village = {
    afficher(c) {
      const boite = H.el("div.village");
      const toile = H.el("canvas.toile-village", { "aria-label": "La ferme" });
      const etiquette = H.el("div.etiquette-ferme", { hidden: true });
      boite.append(toile, etiquette, H.el("div.pastilles-scene", null,
        H.el("button.pastille-scene", { type: "button", onclick: () => scene && basculerAmenager(!scene.amenager) }, "Aménager"),
        H.el("a.pastille-scene", { href: "#reglages" }, "Réglages")
      ));
      c.appendChild(boite);
      const depart = H.ciel.nuitCalme() ? "maison" : H.local.dernierLieu && parId[H.local.dernierLieu] ? H.local.dernierLieu : "maison";
      const [px, py] = porte(parId[depart]);
      scene = { boite, toile, etiquette, cam: { x: 0, y: 0 }, ovo: { x: px, y: py, trajet: null, i: 0, lieu: depart }, traces: [], lolo: { x: null, y: null } };
      dimensionner();
      peindreSol(); peindreSol2();
      const [sx, sy] = iso(px, py);
      scene.cam.x = sx - W / 2; scene.cam.y = sy - Ht / 2 - 10;
      // Lóló : la première fois de la visite, il arrive au galop ; ensuite il est là, à côté d'ƟvƟ
      if (galopDejaVu) Object.assign(scene.lolo, { x: px - 1, y: py + 0.4 });
      else {
        galopDejaVu = true;
        Object.assign(scene.lolo, { x0: -1, y0: py + 0.4, x: null, y: null });
        H.sons.galop(0, 100, true, 0.6).then((course) => scene && (scene.lolo.course = course, scene.lolo.x = -1, scene.lolo.y = py + 0.4));
      }
      const pos = (e) => { const b = toile.getBoundingClientRect(); return { x: ((e.clientX - b.left) / b.width) * W, y: ((e.clientY - b.top) / b.height) * Ht }; };
      toile.addEventListener("pointerdown", (e) => {
        scene.typePointeur = e.pointerType;
        if (scene.amenager) { scene.peint = true; agirAmenager(pos(e), true); }
      });
      toile.addEventListener("pointermove", (e) => {
        const p = pos(e);
        if (e.pointerType === "mouse") scene.pointeur = p;
        scene.surLolo = !!(scene.lolo.ecran && Math.abs(p.x - scene.lolo.ecran[0]) < 8 && p.y > scene.lolo.ecran[1] - 10 && p.y < scene.lolo.ecran[1] + 2);
        if (scene.amenager && scene.peint) {
          const a = scene.amenager;
          if (a.prise) { const [i, j] = versMonde(p.x, p.y); Object.assign(a.prise, { i, j }); }
          else if (PINCEAUX[a.outil]) agirAmenager(p, false);
        }
      });
      const lacher = () => {
        if (scene && scene.amenager && scene.amenager.prise) { enregistrer(scene.amenager.prise); scene.amenager.prise = null; }
        if (scene) scene.peint = false;
      };
      toile.addEventListener("pointerup", lacher);
      toile.addEventListener("pointerleave", () => { lacher(); if (scene) scene.pointeur = null; });
      toile.addEventListener("click", (e) => {
        if (scene.amenager) return;
        const p = pos(e);
        // toucher Lóló : il parle (astuces, plantes du moment)
        if (scene.lolo.ecran && Math.abs(p.x - scene.lolo.ecran[0]) < 8 && p.y > scene.lolo.ecran[1] - 10 && p.y < scene.lolo.ecran[1] + 2) {
          if (!H.$(".dialogue")) H.lolo.parler(null);
          return;
        }
        scene.pointeur = p;
        dessiner(performance.now());
        const m = scene.survol;
        if (scene.typePointeur === "touch" || scene.typePointeur === "pen") {
          // sur téléphone : un premier toucher montre le nom, un second y va
          scene.pointeur = null;
          if (m && scene.choisi === m) { scene.choisi = null; aller(m.id); }
          else scene.choisi = m;
        } else if (m) aller(m.id);
      });
      // la page n'a sa taille définitive qu'une fois affichée : on se remesure dès qu'elle change
      scene.surRedim = () => scene && (dimensionner(), dessiner(performance.now()));
      scene.obs = new ResizeObserver(() => scene && scene.surRedim());
      scene.obs.observe(boite);
      scene.surGoeland = () => scene && (scene.goelands = performance.now());
      H.sur("goeland", scene.surGoeland);
      boucle();
      bonjourDuMatin();
    },
    quitter() {
      if (!scene) return;
      cancelAnimationFrame(scene.anim);
      if (scene.obs) scene.obs.disconnect();
      scene = null;
    },
  };

  // Le matin, à la première visite de la journée, Mesi et ƟvƟ se disent bonjour comme d'habitude :
  // « Jó reggelt ! » ou « BMBB ! » (bon matin BB), et « JSQTBD ? » (j'espère que t'as bien dormi)
  function bonjourDuMatin() {
    const h = new Date().getHours(), jour = new Date().toDateString();
    if (h < 5 || h >= 12 || H.local.bonjourMesi === jour) return;
    H.d.majLocal((l) => (l.bonjourMesi = jour));
    const salut = () => (Math.random() < 0.5 ? "Jó reggelt !" : "BMBB !");
    setTimeout(() => H.dialogue.dire([
      { qui: "luigi", texte: salut() + " JSQTBD ?" },
      { qui: "ovo", texte: salut() + " Oui, et toi ? JSQTBD aussi !" },
    ]), 1200);
  }
})();
