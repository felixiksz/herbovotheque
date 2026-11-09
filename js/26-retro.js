// Le style du jeu : de gros pixels aux couleurs des pochettes Betonkust. Chaque scène est
// d'abord peinte normalement, puis réduite en gros pixels, et chaque pixel est ramené à la
// palette avec une petite trame, comme une impression en risographie. Les textes, les bulles
// et les fenêtres ne passent pas par là : ils restent nets.
(function () {
  const H = window.H;
  // d'après les pochettes de Betonkust (Parallel B, Center Parcs, Hotel Breukelen, Sent Items,
  // Concrete Coast) : des fonds très sombres mais jamais noirs (marine, indigo, vert profond)
  // contre des couleurs claires et saturées ; ni noir ni blanc absolus
  const PALETTE = [
    // les sombres : marine, indigo, nuit, vert profond, brun
    "#1b1d4a", "#232a63", "#2a2c6a", "#3a3aa8", "#1e3d25", "#4b3427",
    // les ciels et l'eau
    "#2f8fe0", "#6fb6ee", "#a8d8ec", "#d6eef7", "#12aec4", "#0d8fae", "#26406a",
    // les clairs : crème, calcaire ; jamais de gris : les ombres sont bleues (bleus pâles de l'air,
    // bleus d'ombre), les lumières chaudes (jaune pâle, abricot, rose)
    "#f3f0dc", "#e9e3cd", "#c2cdec", "#8a98cc", "#b4cdea", "#94b4dc", "#7896c8", "#5f7fb8",
    "#ffe9b8", "#ffd9c0", "#f6c6d0",
    // les bleu-vert du lointain
    "#86ad8a", "#6f9c9a", "#4f8a7e",
    // jaunes, corail, rouges, roses, peau
    "#f6ee55", "#ffd23a", "#e9b44c", "#ffc46b", "#ff8f2e", "#ff5b4f", "#e8714a", "#d23a2a", "#c93f6e", "#e04bb0", "#ffb3a8", "#f2c29b", "#d9a07a",
    // violets
    "#5b3c8f", "#8a58cc", "#d07ab8",
    // verts : chartreuse, prairie, garrigue, pin
    "#c6cf55", "#9cc77a", "#6cbd5c", "#4aa63e", "#3f8a42", "#2f6b35",
    // bruns et terre rouge
    "#b9834f", "#9a6a3c", "#7a4520", "#c96a3a",
    // outremer
    "#3d5ee8", "#7f97f2",
  ].map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  // la couleur de palette la plus proche, retenue pour chaque teinte déjà rencontrée ; une scène
  // peut ajouter ses propres teintes (celles que fait naître sa lumière, par exemple)
  const jeux = new Map(), base = { pal: PALETTE, table: new Int16Array(32768).fill(-1) };
  function jeu(enPlus) {
    if (!enPlus || !enPlus.length) return base;
    let j = jeux.get(enPlus);
    if (!j) jeux.set(enPlus, (j = { pal: PALETTE.concat(enPlus), table: new Int16Array(32768).fill(-1) }));
    return j;
  }
  let actuel = base;
  function proche(r, g, b) {
    const { pal, table } = actuel;
    const cle = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let i = table[cle];
    if (i >= 0) return i;
    let mieux = 1e9;
    for (let k = 0; k < pal.length; k++) {
      const [pr, pg, pb] = pal[k];
      const dr = r - pr, dg = g - pg, db = b - pb;
      const d = 2 * dr * dr + 4 * dg * dg + 3 * db * db;
      if (d < mieux) { mieux = d; i = k; }
    }
    table[cle] = i;
    return i;
  }
  // une trame légère (matrice de Bayer 4 × 4) : les aplats restent francs, les dégradés vibrent un peu
  const TRAME = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v / 16 - 0.47) * 9);

  const petites = new Map();
  // taille : la taille d'un gros pixel, en pixels de la toile ; trame : de 0 (aplats francs,
  // dégradés en paliers) à 1 (la trame habituelle)
  // defile : { x, depuis } fait glisser la trame avec le décor, sous la ligne « depuis » (de 0 à 1),
  // pour qu'un sol qui défile emporte ses petits points avec lui
  // zone : { x, y, w, h } en pixels de la toile, pour ne traiter que ce qui se voit à l'écran (la trame
  // reste calée sur toute la toile)
  function appliquer(toile, taille, trame, defile, enPlus, cible, zone) {
    const forceTrame = trame == null ? 1 : trame;
    actuel = jeu(enPlus);
    let zx = 0, zy = 0, W = toile.width, Hh = toile.height;
    if (zone && !cible) {
      zx = Math.max(0, Math.floor(zone.x / taille) * taille); zy = Math.max(0, Math.floor(zone.y / taille) * taille);
      W = Math.min(toile.width - zx, Math.ceil((zone.x + zone.w - zx) / taille) * taille); Hh = Math.min(toile.height - zy, Math.ceil((zone.y + zone.h - zy) / taille) * taille);
    }
    if (W <= 0 || Hh <= 0) return;
    const ox = zx / taille, oy = zy / taille;
    const sw = Math.max(1, Math.ceil(W / taille)), sh = Math.max(1, Math.ceil(Hh / taille));
    // (une petite toile de travail par taille : deux scènes qui se succèdent ne la redimensionnent
    // plus à chaque image, ce qui faisait clignoter certaines tablettes)
    const cleP = sw + "x" + sh;
    let tp = petites.get(cleP);
    if (!tp) {
      if (petites.size > 6) petites.clear();
      const c = document.createElement("canvas");
      c.width = sw; c.height = sh;
      tp = { c, g: c.getContext("2d", { willReadFrequently: true }) };
      petites.set(cleP, tp);
    }
    const petit = tp.c, pc = tp.g;
    // chaque gros pixel prend une couleur franche (pas de mélange flou sur les contours)
    pc.imageSmoothingEnabled = false;
    pc.clearRect(0, 0, sw, sh);
    pc.drawImage(toile, zx, zy, W, Hh, 0, 0, sw, sh);
    const img = pc.getImageData(0, 0, sw, sh), d = img.data;
    const dx = defile ? Math.round(defile.x / taille) : 0, ligneDefile = defile ? Math.floor(defile.depuis * sh) : sh;
    // (le résultat de chaque teinte, à chaque place de la trame, est retenu : une grande toile ne
    // refait plus le calcul et la recherche dans la palette pour chacun de ses millions de points)
    const pal = actuel.pal, memo = actuel.memo || (actuel.memo = new Map());
    let deja = memo.get(forceTrame);
    if (!deja) memo.set(forceTrame, (deja = new Int16Array(1 << 19).fill(-1)));
    // (chaque point lu et écrit d'un seul coup ; et comme les aplats se répètent, on garde, pour chaque
    // place de la trame, la dernière couleur traitée et son résultat : on ne recalcule que ce qui change)
    const u32 = new Uint32Array(d.buffer, d.byteOffset, d.length >> 2);
    const pal32 = actuel.pal32 || (actuel.pal32 = pal.map((c) => ((255 << 24) | (c[2] << 16) | (c[1] << 8) | c[0]) >>> 0));
    const dernierIn = new Uint32Array(16), dernierOut = new Uint32Array(16);
    for (let y = 0, i = 0; y < sh; y++) {
      const decaleL = y >= ligneDefile ? dx : 0, ty = ((y + oy) & 3) << 2, lignes = defile && defile.lignes;
      for (let x = 0; x < sw; x++, i++) {
        const v = u32[i];
        if ((v >>> 24) < 10) continue;
        const decale = lignes && lignes.length === sw ? (y >= lignes[x] ? dx : 0) : decaleL;
        const ti = ty | ((x + ox + decale) & 3);
        if (v === dernierIn[ti] && v !== 0) { u32[i] = dernierOut[ti]; continue; }
        const r = v & 255, g = (v >>> 8) & 255, b = (v >>> 16) & 255;
        const k = ((((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)) << 4) | ti;
        let p = deja[k];
        if (p < 0) {
          // un peu plus saturé et contrasté, comme les pochettes, avant de choisir la couleur
          const o = TRAME[ti] * forceTrame, m = (r + g + b) / 3;
          const rs = (vv) => Math.max(0, Math.min(255, m + (vv - m) * 1.12 + o));
          p = deja[k] = proche(rs(r), rs(g), rs(b));
        }
        dernierIn[ti] = v; dernierOut[ti] = pal32[p];
        u32[i] = pal32[p];
      }
    }
    // (la petite image, déjà en gros pixels, posée telle quelle dans une autre toile que l'écran
    // agrandit : bien plus léger pour une tablette que de repeindre une grande toile)
    if (cible) {
      if (cible.width !== sw || cible.height !== sh) { cible.width = sw; cible.height = sh; }
      cible.getContext("2d").putImageData(img, 0, 0);
      return;
    }
    pc.putImageData(img, 0, 0);
    const ctx = toile.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(zx, zy, W, Hh);
    ctx.drawImage(petit, 0, 0, sw, sh, zx, zy, sw * taille, sh * taille);
    ctx.restore();
  }
  // la taille d'un gros pixel pour une toile affichée à l'écran : n points d'écran
  // (la taille des gros pixels reste la même qu'avant, même sur un écran très fin : la toile, elle, est
  // calculée à la vraie résolution de l'écran, sans agrandissement)
  // (H.finesse : la taille des gros pixels choisie dans les réglages, de très fins à très gros)
  H.finesse = () => (H.local && H.local.finesse) || 1;
  const taillePour = (n) => Math.max(1, Math.round((n || 3) * Math.min(2, window.devicePixelRatio || 1) * H.finesse()));

  H.retro = { appliquer, taillePour, PALETTE };
})();
