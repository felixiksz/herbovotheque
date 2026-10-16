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
    // les clairs : crème, calcaire, gris de route
    "#f3f0dc", "#e9e3cd", "#c9c9c4", "#9a9a9a",
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

  let petit = null, pc = null;
  // taille : la taille d'un gros pixel, en pixels de la toile ; trame : de 0 (aplats francs,
  // dégradés en paliers) à 1 (la trame habituelle)
  // defile : { x, depuis } fait glisser la trame avec le décor, sous la ligne « depuis » (de 0 à 1),
  // pour qu'un sol qui défile emporte ses petits points avec lui
  function appliquer(toile, taille, trame, defile, enPlus) {
    const forceTrame = trame == null ? 1 : trame;
    actuel = jeu(enPlus);
    const W = toile.width, Hh = toile.height;
    if (!W || !Hh) return;
    const sw = Math.max(1, Math.ceil(W / taille)), sh = Math.max(1, Math.ceil(Hh / taille));
    if (!petit) {
      petit = document.createElement("canvas");
      pc = petit.getContext("2d", { willReadFrequently: true });
    }
    if (petit.width !== sw || petit.height !== sh) {
      petit.width = sw;
      petit.height = sh;
    }
    // chaque gros pixel prend une couleur franche (pas de mélange flou sur les contours)
    pc.imageSmoothingEnabled = false;
    pc.clearRect(0, 0, sw, sh);
    pc.drawImage(toile, 0, 0, W, Hh, 0, 0, sw, sh);
    const img = pc.getImageData(0, 0, sw, sh), d = img.data;
    const dx = defile ? Math.round(defile.x / taille) : 0, ligneDefile = defile ? Math.floor(defile.depuis * sh) : sh;
    for (let y = 0, i = 0; y < sh; y++) {
      const decale = y >= ligneDefile ? dx : 0;
      for (let x = 0; x < sw; x++, i += 4) {
        if (d[i + 3] < 10) continue;
        // un peu plus saturé et contrasté, comme les pochettes, avant de choisir la couleur
        const o = TRAME[((y & 3) << 2) | ((x + decale) & 3)] * forceTrame;
        const m = (d[i] + d[i + 1] + d[i + 2]) / 3;
        const rs = (v) => Math.max(0, Math.min(255, m + (v - m) * 1.12 + o));
        const r = rs(d[i]), g = rs(d[i + 1]), b = rs(d[i + 2]);
        const c = actuel.pal[proche(r, g, b)];
        d[i] = c[0];
        d[i + 1] = c[1];
        d[i + 2] = c[2];
        d[i + 3] = 255;
      }
    }
    pc.putImageData(img, 0, 0);
    const ctx = toile.getContext("2d");
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, W, Hh);
    ctx.drawImage(petit, 0, 0, sw * taille, sh * taille);
    ctx.restore();
  }
  // la taille d'un gros pixel pour une toile affichée à l'écran : n points d'écran
  // (la taille des gros pixels reste la même qu'avant, même sur un écran très fin : la toile, elle, est
  // calculée à la vraie résolution de l'écran, sans agrandissement)
  const taillePour = (n) => Math.max(1, Math.round((n || 3) * Math.min(2, window.devicePixelRatio || 1)));

  H.retro = { appliquer, taillePour, PALETTE };
})();
