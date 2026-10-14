// Le style du jeu : de gros pixels aux couleurs des pochettes Betonkust. Chaque scène est
// d'abord peinte normalement, puis réduite en gros pixels, et chaque pixel est ramené à la
// palette avec une petite trame, comme une impression en risographie. Les textes, les bulles
// et les fenêtres ne passent pas par là : ils restent nets.
(function () {
  const H = window.H;
  const PALETTE = [
    // encres et nuits
    "#23214a", "#15124a", "#2a2c6a", "#3a3aa8", "#8a58cc", "#d07ab8",
    // ciels et mer
    "#2f8fe0", "#7cc4f0", "#a9dcf7", "#d6eef7", "#12aec4", "#0d8fae", "#26406a",
    // papier, calcaire, gris
    "#ffffff", "#f2f0e8", "#e6dfcf", "#c9c1ae", "#9e9585", "#6b6578",
    // jaunes, corail, rouges, roses, peau
    "#fff06a", "#ffd23a", "#e9b44c", "#ff5b4f", "#e8714a", "#e03a3a", "#c93f6e", "#ffb3a8", "#f2c29b", "#d9a07a",
    // verts
    "#d5dc6a", "#9cc77a", "#5fb44f", "#3f8a42", "#2f7a3e", "#1f6b34", "#173a26",
    // bruns et terre rouge
    "#b9834f", "#9a6a3c", "#7a4520", "#4b3427", "#c96a3a",
    // outremer
    "#3d5ee8", "#7f97f2",
  ].map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));
  // la couleur de palette la plus proche, retenue pour chaque teinte déjà rencontrée
  const table = new Int16Array(32768).fill(-1);
  function proche(r, g, b) {
    const cle = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let i = table[cle];
    if (i >= 0) return i;
    let mieux = 1e9;
    for (let k = 0; k < PALETTE.length; k++) {
      const [pr, pg, pb] = PALETTE[k];
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
  // taille : la taille d'un gros pixel, en pixels de la toile
  function appliquer(toile, taille) {
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
    for (let y = 0, i = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++, i += 4) {
        if (d[i + 3] < 10) continue;
        const o = TRAME[((y & 3) << 2) | (x & 3)];
        const r = Math.max(0, Math.min(255, d[i] + o)), g = Math.max(0, Math.min(255, d[i + 1] + o)), b = Math.max(0, Math.min(255, d[i + 2] + o));
        const c = PALETTE[proche(r, g, b)];
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
  const taillePour = (n) => Math.max(1, Math.round((n || 3) * Math.min(2, window.devicePixelRatio || 1)));

  H.retro = { appliquer, taillePour, PALETTE };
})();
