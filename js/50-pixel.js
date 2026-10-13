// Personnages en pixels : ƟvƟ (salopette au tournesol), Luigi (salopette au chiendent),
// Lóló le cheval à l'étoile blanche et Mémé la chatte tigrée qui lui fait un câlin.
(function () {
  const H = window.H;

  const PAL = {
    k: "#2b1d14", s: "#f2c29b", S: "#d9a07a", m: "#b8404e", w: "#ffffff", e: "#1a1a1a",
    h: "#3b2416", H: "#5e3b22",              // cheveux d'ƟvƟ : brun foncé bouclé
    c: "#8a4b22", C: "#b06a33",              // cheveux de Luigi : châtain
    r: "#e03a3a", R: "#b02424",              // chemise rouge
    g: "#3aa04a", G: "#257a33",              // chemise verte
    b: "#3a5fd0", B: "#2a439a", y: "#ffd23a", // salopette, boutons
    o: "#ffc21a", O: "#6b3a12",              // tournesol
    v: "#8fd14f", V: "#4e8a2a",              // chiendent
    n: "#7a4520", N: "#3e2210",              // chaussures, cheval
    t: "#c9ad8a", T: "#6b5442", u: "#f0e4d4", // chatte tigrée
    p: "#f4a3b8", l: "#d6eef5",
  };

  // 16 × 22, de face. Cils : petits points au coin des lunettes.
  const OVO = [
    "...kkHkkkkHkk...",
    "..khHhHhhHhHhk..",
    ".khHhhHhhHhhHhk.",
    ".khhssssssssHhk.",
    "..khsssssssshk..",
    "..hkskksskkskh..",
    "..hsklekkelksh..",
    "..hsskksskkssh..",
    "..hpsssSSsssph..",
    "...kssmssmssk...",
    "...ksssmmsssk...",
    "....kksssskk....",
    "..krrbrrrrbrrk..",
    ".krrbbboobbbrrk.",
    ".krrbboOOobbrrk.",
    ".kssbbboobbbssk.",
    "..kkbbybbybbkk..",
    "...kbbbbbbbbk...",
    "...kbbbkkbbbk...",
    "...kbbbkkbbbk...",
    "..knnnk..knnnk..",
    "..kkkkk..kkkkk..",
  ];
  const OVO_MARCHE = OVO.slice(0, 18).concat([
    "...kbbbkkbbbk...",
    "...knnnkkbbbk...",
    "...kkkkk.knnnk..",
    ".........kkkkk..",
  ]);

  // Luigi : un peu plus grand, mulet châtain, chemise verte, chiendent sur la salopette.
  const LUIGI = [
    "....kkkkkkkk....",
    "...kcCccccCck...",
    "..kccCcccCcccck.",
    "..kcssssssssck..",
    "..kcssssssssck..",
    "..ksskksskkssck.",
    "..ksklekkelksck.",
    "..ksskksskkssck.",
    "..kcsssSSsssck..",
    ".kckssmssmsskck.",
    ".kcksssmmssskck.",
    ".kcckksssskkcck.",
    "..kggbggggbggk..",
    ".kggbbbvbvbbggk.",
    ".kggbbbbvbbbggk.",
    ".kggbbbbVbbbggk.",
    ".kssbbbbVbbbssk.",
    "..kkbbybbybbkk..",
    "...kbbbbbbbbk...",
    "...kbbbkkbbbk...",
    "...kbbbkkbbbk...",
    "..knnnk..knnnk..",
    "..kkkkk..kkkkk..",
  ];
  const LUIGI_MARCHE = LUIGI.slice(0, 19).concat([
    "...kbbbkkbbbk...",
    "...knnnkkbbbk...",
    "...kkkkk.knnnk..",
    ".........kkkkk..",
  ]);

  // Lóló (de profil) avec Mémé allongée sur son encolure, les yeux fermés.
  const LOLO = [
    "............................knk.........",
    "............................knk.........",
    "............................knnk........",
    "......................k...kkNnnnk.......",
    ".....................kTkkkTkNnnnwk......",
    ".....................kttTtttknnwwwk.....",
    "......................kTtTttkneewnnk....",
    "......................kkttkknnnnnnnnk...",
    "...................kkkttppttknnnnnnnnk..",
    "................kkktttTttttttknnnnnnnk..",
    "..............kkttTttTtttkttttkknnnnNnk.",
    ".............ktttTttTtttknkttuukknnnnnk.",
    "......kk..kkkkttTttTuuukNnnkkkk..kknnk..",
    ".....kNNkknnnkTkkkkkkkknnnnnk......kk...",
    "....kNNNnnnnnktknnnnnnnnnnnnk...........",
    "....kNNnnnnnnkTknnnnnnnnnnnnk...........",
    "....kNNnnnnnktknnnnnnnnnnnnnk...........",
    "...kNNNnnnnnktknnnnnnnnnnnnnk...........",
    "...kNNNnnnnnnknnnnnnnnnnnnnnk...........",
    "...kNNNknnnnnnnnnnnnnnnnnnnk............",
    "...kNNNkknnnnnnnnnnnnnnnnnnk............",
    "....kNNkknnknnnnnnnnnnnnknnk............",
    "....kNNkknnknnkkkkkkkknnknnk............",
    "....kNk.knnknnk......knnknnk............",
    ".....k..knnknnk......knnknnk............",
    "........knnknnk......knnknnk............",
    "........knnknnk......knnknnk............",
    "........kNNkNNk......kNNkNNk............",
    ".........kk.kk........kk.kk.............",
    "........................................",
  ];
  // deuxième image : la queue balance
  const LOLO_2 = [
    "............................knk.........",
    "............................knk.........",
    "............................knnk........",
    "......................k...kkNnnnk.......",
    ".....................kTkkkTkNnnnwk......",
    ".....................kttTtttknnwwwk.....",
    "......................kTtTttkneewnnk....",
    "......................kkttkknnnnnnnnk...",
    "...................kkkttppttknnnnnnnnk..",
    "................kkktttTttttttknnnnnnnk..",
    "..............kkttTttTtttkttttkknnnnNnk.",
    ".............ktttTttTtttknkttuukknnnnnk.",
    "......k...kkkkttTttTuuukNnnkkkk..kknnk..",
    ".....kNkkknnnkTkkkkkkkknnnnnk......kk...",
    "....kNNNnnnnnktknnnnnnnnnnnnk...........",
    "...kNNNnnnnnnkTknnnnnnnnnnnnk...........",
    "..kNNNNnnnnnktknnnnnnnnnnnnnk...........",
    "..kNNNknnnnnktknnnnnnnnnnnnnk...........",
    "..kNNNknnnnnnknnnnnnnnnnnnnnk...........",
    ".kNNNNkknnnnnnnnnnnnnnnnnnnk............",
    ".kNNNk..knnnnnnnnnnnnnnnnnnk............",
    ".kNNNk..knnknnnnnnnnnnnnknnk............",
    ".kNNNk..knnknnkkkkkkkknnknnk............",
    "..kNk...knnknnk......knnknnk............",
    "...k....knnknnk......knnknnk............",
    "........knnknnk......knnknnk............",
    "........knnknnk......knnknnk............",
    "........kNNkNNk......kNNkNNk............",
    ".........kk.kk........kk.kk.............",
    "........................................",
  ];

  const SPRITES = { ovo: [OVO, OVO_MARCHE], luigi: [LUIGI, LUIGI_MARCHE], lolo: [LOLO, LOLO_2] };
  const cache = new Map();

  function toile(motif) {
    const h = motif.length, w = Math.max(...motif.map((l) => l.length));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    motif.forEach((ligne, y) => {
      for (let x = 0; x < ligne.length; x++) {
        const col = PAL[ligne[x]];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    return c;
  }

  H.pixel = {
    PAL,
    // toile (1 pixel = 1 pixel) d'un personnage ; image 0 = repos, 1 = pas
    sprite(nom, image) {
      const cle = nom + (image || 0);
      if (!cache.has(cle)) cache.set(cle, toile(SPRITES[nom][image || 0]));
      return cache.get(cle);
    },
    // portrait (tête seule) agrandi, en image
    portrait(nom, echelle) {
      const lignes = nom === "lolo" ? SPRITES.lolo[0].slice(0, 14).map((l) => l.slice(18)) : SPRITES[nom][0].slice(0, 12);
      return H.dessinPixel(lignes, PAL, echelle || 5);
    },
    image(nom, echelle, image) {
      return H.dessinPixel(SPRITES[nom][image || 0], PAL, echelle || 3);
    },
    // dessine un personnage centré en bas sur (x, y)
    dessiner(ctx, nom, x, y, echelle, image, miroir) {
      const s = H.pixel.sprite(nom, image);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const w = s.width * echelle, h = s.height * echelle;
      if (miroir) {
        ctx.translate(Math.round(x), 0);
        ctx.scale(-1, 1);
        ctx.drawImage(s, Math.round(-w / 2), Math.round(y - h), w, h);
      } else {
        ctx.drawImage(s, Math.round(x - w / 2), Math.round(y - h), w, h);
      }
      ctx.restore();
    },
  };
})();
