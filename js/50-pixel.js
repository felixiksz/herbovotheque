// Personnages en pixels : ƟvƟ (salopette au tournesol), Mesi (salopette au chiendent),
// Lóló le cheval à l'étoile blanche et Mémé la chatte tigrée qui lui fait un câlin.
(function () {
  const H = window.H;

  const PAL = {
    k: "#2a2246", s: "#f2c29b", S: "#d9a07a", m: "#b8404e", w: "#ffffff", e: "#23214a",
    h: "#3b2416", H: "#5e3b22",              // cheveux d'ƟvƟ : brun foncé bouclé
    c: "#8a4b22", C: "#b06a33",              // cheveux de Mesi : châtain
    r: "#e03a3a", R: "#b02424",              // chemise rouge
    g: "#3aa04a", G: "#257a33",              // chemise verte
    b: "#3a5fd0", B: "#2a439a", y: "#ffd23a", // salopette, boutons
    o: "#ffc21a", O: "#6b3a12",              // tournesol
    v: "#8fd14f", V: "#4e8a2a",              // chiendent
    n: "#7a4520", N: "#3e2210",              // chaussures, cheval
    t: "#c9a57a", T: "#8a6c52", u: "#f6efe2", E: "#8f5236", // Mémé, comme sa peluche : beige caramel, rayures gris-brun, ventre et pattes blancs, oreilles brunes
    p: "#f4a3b8", l: "#d6eef5",
    a: "#a3acb7", q: "#ee9a7e",
    M: "#3e2210",                              // crinière (sans contour)
    z: "#1f6fe0", Z: "#16509f", Y: "#f6c400", X: "#c99a00", // sandales Adidas Lego d'ƟvƟ (l'été)
    f: "#ff7fa6", F: "#d9577e",
    i: "#5fb6ea", j: "#e9e3cd", // verres bleutés des lunettes de piscine ; rayure claire des serviettes               // la bouée flamant rose               // montures : argentée (ƟvƟ), pêche pastel (Mesi)
  };

  // 16 × 22, de face. Cils : petits points au coin des lunettes de vue (verres transparents).
  const OVO = [
    "...kkHkkkkHkk...",
    "..khHhHhhHhHhk..",
    ".khHhhHhhHhhHhk.",
    ".khhssssssssHhk.",
    "..khsssssssshk..",
    "..hksaassaaskh..",
    "..haaseaaesaah..",
    "..hssaassaassh..",
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

  // l'été (de mai à septembre), ƟvƟ porte ses sandales Adidas Lego : dessus bleu,
  // liseré rouge, grosse semelle jaune
  const OVO_ETE = OVO.slice(0, 19).concat([
    "...kssskksssk...",
    "..kzrzzk.kzzrzk.",
    "..kYYYYk.kYYYYk.",
    "..kkkkkk.kkkkkk.",
  ]);
  const OVO_MARCHE_ETE = OVO.slice(0, 18).concat([
    "...kbbbkkbbbk...",
    "...kzrzkksssk...",
    "...kYYYk.kzrzk..",
    "...kkkkk.kYYYk..",
    ".........kkkkk..",
  ]);

  // Mesi : un peu plus grand, mulet châtain, chemise verte, chiendent sur la salopette.
  const LUIGI = [
    "....kkkkkkkk....",
    "...kcCccccCck...",
    "..kccCcccCcccck.",
    "..kcssssssssck..",
    "..kcssssssssck..",
    "..kssqqssqqssck.",
    "..kqqseqqesqqck.",
    "..kssqqssqqssck.",
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
    "......................k...kkNnwnk.......",
    ".....................kTkkkTkNnwwnk......",
    ".....................kttTtttknnnnnk.....",
    "......................kTtTttkneennnk....",
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

  // --- de profil (vers la droite), pour la balade : jambes et bras posés à chaque image -----
  // Salopette vue de côté : la bavette devant, la bretelle qui passe sur l'épaule et redescend
  // dans le dos, la chemise visible sur le flanc, le bouton sur la hanche.
  // ƟvƟ : boucles brunes, lunettes rondes, longs cils, tournesol sur la salopette
  const OVO_PROFIL = [
    "....kkkkkkk.....",
    "...kHhHhHhHkk...",
    "..kHhHhhHhhHhk..",
    ".khHhhHhhhHhhHk.",
    ".kHhhHhhsssshHk.",
    ".khHhhhssssaesk.",
    ".kHhsSaaaaaeask.",
    ".khHhsssssasassk",
    "..kHhssssssapsk.",
    "..khhsssssssmsk.",
    "...kkhsssssssk..",
    ".....kkssssk....",
    "....krrrbbrrk...",
    "...krrbrrrbbbk..",
    "...krbrrrrboOk..",
    "...kbrrrrrbbok..",
    "...kbbbbbybbbk..",
    "....kbbbbbbbk...",
  ];
  // ƟvƟ assis·e de dos, qui regarde la mer : les boucles brunes, la nuque, les bretelles de la
  // salopette sur la chemise rouge, les mains posées de chaque côté, le fond de la salopette
  const OVO_DOS_ASSIS = [
    "....kkkkkkk.....",
    "...kHhHhHhHkk...",
    "..kHhHhhHhhHhk..",
    ".khHhhHhhhHhhHk.",
    ".kHhHhHhHhHhHhk.",
    ".khHhhHhhHhhHhk.",
    ".kHhHhhHhhHhHhk.",
    "..khHhHhHhHhHk..",
    "..kshHhHhHhHsk..",
    "...kksssssskk...",
    "..krrbrrrrbrrk..",
    ".krrrbrrrrbrrrk.",
    ".krRrbrrrrbrRrk.",
    ".ksRrbbbbbbrRsk.",
    ".kskbbbbbbbbksk.",
    "..kbbbbbbbbbbk..",
    "..kBbbbbbbbbBk..",
    "...kkkkkkkkkk...",
  ];
  // ƟvƟ debout de dos, qui regarde le paysage : le haut comme assis·e, puis le fond de la salopette
  // et les deux jambes côte à côte (même hauteur que de profil : les pieds au même endroit)
  const OVO_DOS = OVO_DOS_ASSIS.slice(0, 15).concat([
    "..kbbbbbbbbbbk..",
    "..kBbbbbbbbbBk..",
    "...kbbbBBbbbk...",
    "...kbbk..kbbk...",
    "...kbbk..kbbk...",
    "...kBbk..kbBk...",
    "...knnk..knnk...",
    "...kkkk..kkkk...",
  ]);
  // Mesi de dos : le mulet châtain qui couvre la nuque, la chemise verte
  const LUIGI_DOS = OVO_DOS.map((l, y) => (y === 8 ? "..kcCcCcCcCcCk.." : l.replace(/h/g, "c").replace(/H/g, "C").replace(/r/g, "g").replace(/R/g, "G")));
  // Mesi et ƟvƟ de dos, serré·es l'une contre l'autre devant le paysage : Mesi, un peu plus grande,
  // passe le bras sur les épaules d'ƟvƟ (la main posée sur l'autre épaule) ; ƟvƟ passe le sien
  // autour de la taille de Mesi (la main sur sa hanche)
  function dosEnlaces() {
    const W = 30, g = Array.from({ length: 25 }, () => Array(W).fill("."));
    const poserGrille = (grille, ox, oy) => grille.forEach((l, y) => l.split("").forEach((c, x) => { if (c !== "." && g[y + oy]) g[y + oy][x + ox] = c; }));
    // (Mesi : deux pixels de jambes en plus)
    const mesi = LUIGI_DOS.slice(0, 19).concat(["...kbbk..kbbk...", "...kbbk..kbbk..."], LUIGI_DOS.slice(19));
    poserGrille(mesi, 0, 0);
    poserGrille(OVO_DOS, 11, 2);
    // le bras d'ƟvƟ autour de la taille de Mesi (manche rouge)
    for (let x = 3; x <= 13; x++) { const y = Math.round(15 + (13 - x) / 10); g[y][x] = "r"; g[y + 1][x] = "R"; }
    [[2, 16], [2, 17], [1, 16], [1, 17]].forEach(([x, y]) => (g[y][x] = "s"));
    [[0, 16], [0, 17], [1, 18], [2, 18], [1, 15], [2, 15]].forEach(([x, y]) => (g[y][x] = "k"));
    // le bras de Mesi sur les épaules d'ƟvƟ (manche verte), qui descend de son épaule à celle d'ƟvƟ
    for (let x = 12; x <= 24; x++) { const y = Math.round(11 + ((x - 12) * 2) / 12); g[y][x] = "g"; g[y + 1][x] = "G"; }
    [[25, 13], [25, 14], [26, 13], [26, 14]].forEach(([x, y]) => (g[y][x] = "s"));
    [[27, 13], [27, 14], [25, 15], [26, 15], [25, 12], [26, 12]].forEach(([x, y]) => (g[y][x] = "k"));
    return g.map((l) => l.join(""));
  }
  // Mesi : mulet châtain, lunettes, chemise verte, chiendent sur la salopette
  const LUIGI_PROFIL = [
    "....kkkkkkk.....",
    "...kcCcCcCckk...",
    "..kcCccCccCcck..",
    "..kcccCcccCccck.",
    "..kCccccsssscck.",
    ".kcCccsssssqssk.",
    ".kcCcSqqqqqeqsk.",
    ".kcCcsssssqsqssk",
    ".kcCcssssssqssk.",
    ".kcCcsssssssmsk.",
    ".kcCcksssssssk..",
    "..kcck.kssssk...",
    "....kgggbbggk...",
    "...kggbgggbbvk..",
    "...kgbggggbvVk..",
    "...kbgggggbbVk..",
    "...kbbbbbybbbk..",
    "....kbbbbbbbk...",
  ];

  function poser(g, x, y, c) {
    if (g[y] && x >= 0 && x < g[y].length) g[y][x] = c;
  }
  // un trait noir autour de ce qui vient d'être dessiné (jambes, bras, sabots) ; la crinière reste libre
  function contour(g) {
    const out = g.map((l) => l.slice());
    for (let y = 0; y < g.length; y++) {
      for (let x = 0; x < g[y].length; x++) {
        if (g[y][x] !== ".") continue;
        if ([[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]].some(([a, b]) => g[b] && g[b][a] && g[b][a] !== "." && g[b][a] !== "k" && g[b][a] !== "M")) out[y][x] = "k";
      }
    }
    return out.map((l) => l.join(""));
  }
  // images 0 à 3 : un pas, puis l'autre (pieds alternés, bras opposés) ; 4 : à l'arrêt
  const PAS = [[3, false, -3, false], [0, false, 0, true], [-3, false, 3, false], [0, true, 0, false], [0, false, 0, false]];
  const MAINS = [[3, 16], [8, 17], [13, 16], [8, 17], [7, 17]];
  // tenue : "nage" (sans vêtements, lunettes de piscine bleutées à la place des lunettes, pieds nus)
  // ou "serviette:<couleur>" (sortis de l'eau, une serviette enroulée de la poitrine aux genoux,
  // une main qui frotte les cheveux)
  const HABITS = "rRgGbByoOvV";
  function enMaillot(haut, lunettes) {
    return haut.map((l, y) => l.split("").map((c, x) => {
      if (y >= 12 && HABITS.includes(c)) return "s";
      // le tout petit relief de la poitrine, de profil
      if (y === 13 && x === 13) return "S";
      if (lunettes && y >= 5 && y <= 7 && (c === "a" || c === "q")) return x >= 10 ? "i" : "s";
      // l'élastique des lunettes, qui fait le tour de la tête
      if (lunettes && y === 6 && x >= 2 && x <= 9 && c !== "k") return "Z";
      return c;
    }).join(""));
  }
  function profil(haut, manche, image, sandales, tenue) {
    const g = Array.from({ length: 24 }, () => Array(16).fill("."));
    const b = image % 2 || image === 4 ? 0 : 1; // le corps descend d'un pixel quand les jambes s'écartent
    const serviette = tenue && tenue.startsWith("serviette") ? tenue.split(":")[1] : null;
    // (« pieds » : à la maison, pieds nus, le reste habillé)
    const pieds = tenue === "pieds";
    if (pieds) { sandales = false; tenue = null; }
    if (tenue) { haut = enMaillot(haut, tenue === "nage"); manche = "s"; sandales = false; }
    haut.forEach((l, y) => l.split("").forEach((c, x) => c !== "." && poser(g, x, y + b, c)));
    const jambe = (dx, leve, pantalon, chaussure) => {
      const bas = leve ? 20 : 21;
      for (let y = 18 + b; y < bas; y++) {
        const x = 7 + Math.round((dx * (y - 17 - b)) / (bas - 17 - b));
        poser(g, x, y, pantalon);
        poser(g, x + 1, y, pantalon);
      }
      if (sandales) {
        // dessus bleu au liseré rouge, puis la grosse semelle jaune
        const fonce = chaussure === "N";
        [fonce ? "Z" : "z", "r", fonce ? "Z" : "z"].forEach((c, i) => poser(g, 7 + dx + i, bas, c));
        for (let i = -1; i < 3; i++) poser(g, 7 + dx + i, bas + 1, fonce ? "X" : "Y");
      } else for (let i = 0; i < 3; i++) poser(g, 7 + dx + i, bas, chaussure);
    };
    const [dxD, leveD, dxA, leveA] = PAS[image];
    jambe(dxA, leveA, tenue ? "S" : "B", tenue || pieds ? "S" : "N"); // la jambe de derrière, plus sombre
    jambe(dxD, leveD, tenue ? "s" : "b", tenue || pieds ? "s" : "n");
    if (serviette) {
      // la serviette enroulée, avec deux rayures claires
      for (let y = 13 + b; y <= 19; y++) for (let x = 3; x <= 13; x++) {
        if (g[y][x] !== "." && g[y][x] !== "k") poser(g, x, y, y === 15 + b || y === 18 ? "j" : serviette);
      }
      for (let y = 18; y <= 19; y++) for (let x = 5; x <= 11; x++) if (g[y][x] === ".") poser(g, x, y, y === 18 ? "j" : serviette);
    }
    const [mx, my] = serviette ? [[11, 4], [12, 6]][Number(tenue.split(":")[2] || 0)] : MAINS[image];
    for (let i = 0; i <= 4; i++) {
      const x = Math.round(8 + ((mx - 8) * i) / 4), y = Math.round(13 + b + ((my + b - 13 - b) * i) / 4);
      poser(g, x, y, i < 2 ? manche : "s");
    }
    return contour(g);
  }
  // Mémé réveillée, debout sur ses quatre pattes (les yeux toujours fermés) :
  // corps allongé à l'horizontale, pattes droites, tête en avant, queue dressée
  // (comme sa peluche : les oreilles rondes bordées de brun, le front rayé, les yeux fermés, le
  // museau blanc et le nez rose, le poitrail et les pattes blancs, la queue rayée au bout clair)
  const MEME_DEBOUT = [
    "..........kEkkEk",
    ".ku......ktTtTtk",
    "kuTk.....ktkkttk",
    ".kTk....ktuuuupk",
    "..kTk....kuuuuk.",
    "...kTkkkkTtTuuk.",
    "...ktTtTtTttuuk.",
    "...kTtTtTtTtuuk.",
    "...kTukkkkkTuk..",
    "...ktuk...ktuk..",
    "...kuuk...kuuk..",
    "....kk.....kk...",
  ];
  // Mémé allongée sur l'encolure de Lóló, de face : les oreilles rondes, les yeux fermés, le museau
  // blanc et le nez rose, le dos rayé, le poitrail blanc, les pattes blanches posées sur l'encolure,
  // la queue rayée qui pend (posée sur Lóló dessiné sans elle, à la colonne 13, ligne 3)
  const MEME_COUCHEE = [
    "........kEk.kEk...",
    ".......kEuEkEuEk..",
    ".......ktTtTtTtk..",
    ".......ktkktkktk..",
    ".......kuuuuuuuk..",
    "...kkkkkuuupuuuk..",
    "..ktTttTtkuuukk...",
    ".kTttTttTtuuuuuuk.",
    "kTttTttTttuukkuuuk",
    "kttTuuuuuuuk.kkkk.",
    "kTkkkkkkkkk.......",
    "ktk...............",
    "kuk...............",
  ];
  const avecMemeCouchee = (g) => { MEME_COUCHEE.forEach((l, y) => l.split("").forEach((c, x) => { if (c !== "." && g[y + 3]) g[y + 3][x + 13] = c; })); return g; };
  // Lóló sans Mémé couchée sur l'encolure : l'encolure et la crinière redessinées
  const ENCOLURE = [
    [0, 28, "knk"],
    [1, 28, "knk"],
    [2, 28, "knnk"],
    [3, 26, "kMNnwnk"],
    [4, 25, "kMNnnwwnk"],
    [5, 24, "kMNnnnnnnnk"],
    [6, 23, "kMNnnnneennnk"],
    [7, 22, "kMN" + "n".repeat(11) + "k"],
    [8, 21, "kMN" + "n".repeat(13) + "k"],
    [9, 20, "kMN" + "n".repeat(14) + "k"],
    [10, 19, "kMN" + "n".repeat(8) + "kknnnnNnk"],
    [11, 18, "kMN" + "n".repeat(9) + "kkknnnnnk"],
    [12, 17, "kMN" + "n".repeat(9) + "k...kknnk"],
    [13, 13, "kkkk" + "n".repeat(11) + "k......kk"],
  ];
  const cou = (y) => 30 - y; // la crinière, le long de la crête de l'encolure
  function sansMeme(g, avecChat) {
    for (let y = 0; y <= 13; y++) for (let x = y === 13 ? 13 : 14; x < g[y].length; x++) g[y][x] = ".";
    for (let y = 14; y <= 18; y++) for (let x = 13; x <= 15; x++) if ("ktT".includes(g[y][x])) g[y][x] = "n";
    // la croupe : une seule ligne de dos, sans bosse
    for (let x = 10; x <= 13; x++) g[12][x] = ".";
    for (let x = 10; x <= 12; x++) g[13][x] = "k";
    for (const [y, x0, l] of ENCOLURE) l.split("").forEach((c, i) => c !== "." && (g[y][x0 + i] = c));
    if (avecChat !== false) MEME_DEBOUT.forEach((l, y) => l.split("").forEach((c, x) => c !== "." && poser(g, x + 4, y + 2, c)));
    return g;
  }
  // Mémé qui marche toute seule : pattes droites, puis écartées
  const MEME_PAS = MEME_DEBOUT.slice(0, 8).concat([
    "...kTukkkkkTuk..",
    "..kTuk.....kTuk.",
    "..kuuk.....kuuk.",
    "...kk.......kk..",
  ]);
  // au galop, la crinière flotte au vent derrière les oreilles
  function criniereAuVent(g, image, cote) {
    for (let brin = 0; brin < 3; brin++) {
      for (let i = 0; i < 9 - brin * 2; i++) {
        const x = (cote ? cou(4 + brin * 3) - 2 : 27) - i;
        const y = (cote ? 4 + brin * 3 : 2 + brin) - Math.floor(i / 4) + Math.round(Math.sin(i * 0.9 + image * 1.6 + brin) * 0.8);
        if (g[y] && g[y][x] === ".") g[y][x] = "M";
      }
    }
  }
  // Lóló au pas (ou au galop) : les jambes en diagonale avancent ensemble, celles de l'autre côté plus sombres
  function loloAuPas(image, opts) {
    opts = opts || {};
    let g = (image < 2 ? LOLO : LOLO_2).map((l) => l.split(""));
    if (opts.memeDebout) g = sansMeme(g);
    else if (opts.seule) g = sansMeme(g, false);
    for (let y = 23; y < g.length; y++) for (let x = 8; x < g[y].length; x++) g[y][x] = ".";
    const th = (image * Math.PI) / 2;
    for (const [x0, phase, c] of [[9, Math.PI, "N"], [22, 0, "N"], [12, 0, "n"], [25, Math.PI, "n"]]) {
      const a = th + phase;
      const dx = Math.round((opts.galop ? 3 : 2) * Math.cos(a));
      const bas = Math.sin(a) < -0.5 ? 26 : 27;
      for (let y = 23; y < bas; y++) {
        const x = x0 + Math.round((dx * (y - 22)) / (bas - 22));
        poser(g, x, y, c);
        poser(g, x + 1, y, c);
      }
      poser(g, x0 + dx, bas, "e");
      poser(g, x0 + dx + 1, bas, "e");
    }
    if (opts.galop) criniereAuVent(g, image, opts.memeDebout);
    return contour(g);
  }

  // une bouée flamant rose, qui flotte et qui parle (« Flma-mala-lamama ! »)
  const FLAMANT = [
    "..........kkk.......",
    ".........kfffk......",
    "........kffwek......",
    "........kfffkkk.....",
    "........kffk.kyk....",
    "........kffk..kk....",
    ".........kffk.......",
    "..........kffk......",
    "..........kffk......",
    "...kkkkkkkkffk......",
    "..kffffffffffffk....",
    ".kfFFFFFFFFFFFFfk...",
    "kfFkkkkkkkkkkkkFfk..",
    ".kfFFFFFFFFFFFFfk...",
    "..kffffffffffffk....",
    "...kkkkkkkkkkkk.....",
  ];

  // Le câlin, de face : Mesi et ƟvƟ côte à côte, penché·es l'un·e vers l'autre, tempe contre
  // tempe, les yeux fermés ; le bras de Mesi sur l'épaule d'ƟvƟ, celui d'ƟvƟ autour de la
  // taille de Mesi. Images : 0 le câlin, 1 on se serre un peu plus, 2 et 3 un bisou sur la joue
  // (Mesi se penche encore, une petite marque rose sur la joue d'ƟvƟ).
  function calin(image, ete) {
    const W = 32, Hh = 23, g = Array.from({ length: Hh }, () => Array(W).fill("."));
    const serre = image === 1 ? 1 : 0, bisou = image === 2, apres = image === 3;
    const xm = 1, xo = 15 - serre;
    // le bras qui entoure l'autre disparaît du dessin de face : il passe derrière
    const sansBras = (motif, cote) => motif.map((l, y) => {
      if (y < 12 || y > 16) return l;
      const a = l.split("");
      if (cote === "droit") { a[12] = "k"; a[13] = "."; a[14] = "."; }
      else { a[1] = "."; a[2] = "."; a[3] = "k"; }
      return a.join("");
    });
    const poserPenche = (motif, x0, y0, penche) => motif.forEach((l, y) => {
      const d = Math.round((penche * Math.max(0, 12 - y)) / 12);
      l.split("").forEach((c, x) => c !== "." && poser(g, x0 + x + d, y0 + y, c === "e" ? "S" : c));
    });
    const bande = (x1, x2, y, haut, bas) => {
      for (let x = x1; x <= x2; x++) { poser(g, x, y - 1, "k"); poser(g, x, y, haut); poser(g, x, y + 1, bas); poser(g, x, y + 2, "k"); }
    };
    // le bras d'ƟvƟ passe derrière Mesi, à la taille ; celui de Mesi derrière ƟvƟ, aux épaules
    bande(xm + 4, xo + 4, 15, "r", "R");
    poserPenche(sansBras(LUIGI, "droit"), xm, 0, bisou ? 3 : 2);
    bande(xm + 11, xo + 11, 12, "g", "G");
    poserPenche(sansBras(ete ? OVO_ETE : OVO, "gauche"), xo, 1, -2);
    // les mains : celle de Mesi sur l'épaule d'ƟvƟ, celle d'ƟvƟ sur la hanche de Mesi
    [[xo + 12, 12], [xo + 13, 12], [xo + 12, 13], [xo + 13, 13]].forEach(([x, y]) => poser(g, x, y, "s"));
    [[xo + 12, 11], [xo + 13, 11], [xo + 14, 12], [xo + 14, 13], [xo + 12, 14], [xo + 13, 14]].forEach(([x, y]) => poser(g, x, y, "k"));
    [[xm + 4, 15], [xm + 5, 15], [xm + 4, 16], [xm + 5, 16]].forEach(([x, y]) => poser(g, x, y, "s"));
    [[xm + 3, 15], [xm + 3, 16], [xm + 4, 17], [xm + 5, 17]].forEach(([x, y]) => poser(g, x, y, "k"));
    if (bisou) {
      // la bouche de Mesi en cul-de-poule, tournée vers ƟvƟ
      [[6, 9], [9, 9], [7, 10], [8, 10]].forEach(([x, y]) => poser(g, xm + 1 + x, y, "s"));
      poser(g, xm + 1 + 10, 9, "m");
      poser(g, xm + 1 + 10, 10, "m");
    }
    // la petite marque rose sur la joue d'ƟvƟ
    if (bisou || apres) { poser(g, xo + 2, 9, "f"); poser(g, xo + 3, 9, "f"); }
    return g.map((l) => l.join(""));
  }

  const SPRITES = {
    calin: [0, 1, 2, 3].map((i) => calin(i)),
    calinEte: [0, 1, 2, 3].map((i) => calin(i, true)),
    flamant: [FLAMANT],
    ovoDosAssis: [OVO_DOS_ASSIS],
    ovoDos: [OVO_DOS],
    luigiDos: [LUIGI_DOS],
    dosEnlaces: [dosEnlaces()],
    ovo: [OVO, OVO_MARCHE],
    luigi: [LUIGI, LUIGI_MARCHE],
    // (Lóló dessiné sans Mémé, puis Mémé couchée posée par-dessus)
    lolo: [LOLO, LOLO_2].map((G) => contour(avecMemeCouchee(sansMeme(G.map((l) => l.split("")), false)))),
    ovoProfil: [0, 1, 2, 3, 4].map((i) => profil(OVO_PROFIL, "r", i)),
    ovoEte: [OVO_ETE, OVO_MARCHE_ETE],
    ovoProfilEte: [0, 1, 2, 3, 4].map((i) => profil(OVO_PROFIL, "r", i, true)),
    luigiProfil: [0, 1, 2, 3, 4].map((i) => profil(LUIGI_PROFIL, "g", i)),
    // pieds nus, à la maison
    ovoPieds: [0, 1, 2, 3, 4].map((i) => profil(OVO_PROFIL, "r", i, false, "pieds")),
    luigiPieds: [0, 1, 2, 3, 4].map((i) => profil(LUIGI_PROFIL, "g", i, false, "pieds")),
    // pour se baigner, puis se sécher sur la plage
    ovoNage: [0, 1, 2, 3, 4].map((i) => profil(OVO_PROFIL, "r", i, false, "nage")),
    luigiNage: [0, 1, 2, 3, 4].map((i) => profil(LUIGI_PROFIL, "g", i, false, "nage")),
    ovoServiette: [0, 1].map((i) => profil(OVO_PROFIL, "r", 4, false, "serviette:y:" + i)),
    luigiServiette: [0, 1].map((i) => profil(LUIGI_PROFIL, "g", 4, false, "serviette:p:" + i)),
    loloPas: [0, 1, 2, 3].map((i) => loloAuPas(i)),
    loloGalop: [0, 1, 2, 3].map((i) => loloAuPas(i, { galop: true })),
    loloBalade: [0, 1, 2, 3].map((i) => loloAuPas(i, { memeDebout: true })),
    loloSeule: [0, 1, 2, 3].map((i) => loloAuPas(i, { seule: true })),
    // Lóló sans Mémé sur l'encolure (quand Mémé est sortie par la chatière)
    loloSansMeme: [LOLO, LOLO_2].map((G) => contour(sansMeme(G.map((l) => l.split("")), false))),
    memePas: [MEME_DEBOUT, MEME_PAS],
    // Lóló de dos, qui regarde le paysage : les oreilles et la crinière, la croupe, la queue, les quatre pattes
    loloDos: [[".......kk..kk.....", "......knk..knk....", "......knnkknnk....", ".......kMMMMk.....", "........kMMk......", "....kkkkkMMkkkk...", "...knnnnnMMnnnnk..", "..knnnnnnnnnnnnnk.", "..knnnnnnnnnnnnnk.", ".knnnnnnMMnnnnnnk.", ".knnnnnnMMnnnnnnk.", ".knnnnnMMMMnnnnnk.", ".knnnnnMMMMnnnnnk.", "..knnnnMMMMnnnnk..", "..knnnkMMMMknnnk..", "..knnk.MMMM.knnk..", "..knnk.kMMk.knnk..", "..knnk..kk..knnk..", "..knnk......knnk..", "..kNNk......kNNk..", "...kk........kk..."]],
  };
  const cache = new Map();
  // Lóló est une peluche : robe caramel, crinière, queue et sabots chocolat
  const PAL_LOLO = Object.assign({}, PAL, { n: "#b9834f", N: "#5a3a26", M: "#4b3427" });

  function toile(motif, palette) {
    const pal = palette || PAL;
    const h = motif.length, w = Math.max(...motif.map((l) => l.length));
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    motif.forEach((ligne, y) => {
      for (let x = 0; x < ligne.length; x++) {
        const col = pal[ligne[x]];
        if (col) {
          ctx.fillStyle = col;
          ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    return c;
  }

  // Dans le monde de Mesi, c'est elle qu'on joue : partout où le jeu dessine ƟvƟ (le personnage
  // qu'on joue), on voit Mesi, et ƟvƟ prend la place de la compagne.
  function perso(nom) {
    if (H.monde !== "mesi" || typeof nom !== "string") return nom;
    const n = nom.startsWith("ovo") ? "luigi" + nom.slice(3) : nom.startsWith("luigi") ? "ovo" + nom.slice(5) : nom;
    return SPRITES[n] ? n : nom;
  }
  // Les personnages en plus détaillé, quand les gros pixels sont plus fins (réglages) : chaque
  // case du dessin devient 2 × 2 ou 3 × 3 cases, sans rien lisser, et on y ajoute ce qu'un dessin
  // plus fin laisse voir : le modelé (le bord éclairé en haut à gauche, ombré en bas à droite), le
  // grain du tissu, des mèches dans les cheveux, un petit reflet dans les yeux.
  const detailles = new WeakMap();
  const CLAIR = [255, 250, 235], NUIT = [35, 33, 74];
  const vers = (c, d, t) => [0, 1, 2].map((i) => Math.round(c[i] + (d[i] - c[i]) * t));
  const grain = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
  function detailler(base, f) {
    const w = base.width, h = base.height, src = base.getContext("2d").getImageData(0, 0, w, h).data;
    const out = document.createElement("canvas");
    out.width = w * f; out.height = h * f;
    const og = out.getContext("2d"), img = og.createImageData(w * f, h * f), d = img.data;
    const at = (x, y) => { if (x < 0 || y < 0 || x >= w || y >= h) return null; const k = (y * w + x) * 4; return src[k + 3] < 10 ? null : [src[k], src[k + 1], src[k + 2]]; };
    const pareil = (a, b) => !!a && !!b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    const sombre = (c) => !!c && c[0] + c[1] + c[2] < 230;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = at(x, y);
      if (!c) continue;
      const haut = at(x, y - 1), bas = at(x, y + 1), g = at(x - 1, y), dr = at(x + 1, y);
      const cheveux = c[0] > c[2] + 25 && c[0] + c[1] + c[2] < 420 && c[1] < c[0];
      const tissu = c[2] > c[0] + 30 || (c[1] > c[0] + 20 && c[1] > c[2]);
      const oeil = sombre(c) && haut && g && bas && dr && !sombre(haut) && !sombre(g) && !sombre(bas) && !sombre(dr);
      for (let sy = 0; sy < f; sy++) for (let sx = 0; sx < f; sx++) {
        const X = x * f + sx, Y = y * f + sy, gr = grain(X, Y);
        let col = c;
        if (oeil) { if (sx === 0 && sy === 0) col = [243, 240, 220]; }
        else if (!sombre(c)) {
          if ((sy === 0 && !pareil(haut, c)) || (sx === 0 && !pareil(g, c))) col = vers(c, CLAIR, 0.24);
          else if ((sy === f - 1 && !pareil(bas, c)) || (sx === f - 1 && !pareil(dr, c))) col = vers(c, NUIT, 0.3);
          else if (cheveux && (X + Y) % 3 === 0) col = vers(c, CLAIR, 0.2);
          else if (tissu && (X + Y) % 2 === 0 && gr < 0.35) col = vers(c, NUIT, 0.16);
          else if (gr < 0.07) col = vers(c, CLAIR, 0.14);
        }
        const k = (Y * w * f + X) * 4;
        d[k] = col[0]; d[k + 1] = col[1]; d[k + 2] = col[2]; d[k + 3] = 255;
      }
    }
    og.putImageData(img, 0, 0);
    out.f = f;
    return out;
  }
  // le dessin à employer : le sprite tel quel, ou sa version détaillée selon la finesse choisie
  function detail(base) {
    const fin = H.finesse ? H.finesse() : 1, f = fin <= 0.5 ? 3 : fin < 1 ? 2 : 1;
    if (f === 1 || !base) return base;
    let m = detailles.get(base);
    if (!m) detailles.set(base, (m = {}));
    return m[f] || (m[f] = detailler(base, f));
  }
  H.pixel = {
    PAL,
    detail,
    perso,
    // toile (1 pixel = 1 pixel) d'un personnage ; image 0 = repos, 1 = pas
    sprite(nom, image) {
      nom = perso(nom);
      // de mai à septembre, ƟvƟ est en sandales
      const mois = new Date().getMonth();
      if (mois >= 4 && mois <= 8 && SPRITES[nom + "Ete"]) nom += "Ete";
      const cle = nom + (image || 0);
      if (!cache.has(cle)) cache.set(cle, toile(SPRITES[nom][image || 0], nom.startsWith("lolo") ? PAL_LOLO : PAL));
      return cache.get(cle);
    },
    // la tête qui dort, de face : sans les lunettes (posées sur la table de chevet), les yeux fermés
    dort(nom) {
      nom = perso(nom);
      const cle = nom + "-dort";
      if (!cache.has(cle)) cache.set(cle, toile(SPRITES[nom][0].slice(0, 12).map((l, y) => l.split("").map((c) => (y >= 5 && y <= 7 && "aqe".includes(c) ? "s" : c)).join("")), PAL));
      return cache.get(cle);
    },
    // portrait (tête seule) agrandi, en image
    portrait(nom, echelle) {
      nom = perso(nom);
      // ƟvƟ et Mesi qui parlent d'une seule voix : les deux visages côte à côte
      if (nom === "duo") return H.dessinPixel(SPRITES.ovo[0].slice(0, 12).map((l, i) => l + SPRITES.luigi[0][i]), PAL, (echelle || 5) * 0.75);
      if (nom === "lolo") return H.dessinPixel(SPRITES.lolo[0].slice(0, 14).map((l) => l.slice(18)), PAL_LOLO, echelle || 5);
      const lignes = nom === "lolo" ? SPRITES.lolo[0].slice(0, 14).map((l) => l.slice(18)) : nom === "flamant" ? SPRITES.flamant[0].slice(0, 10).map((l) => l.slice(6, 18)) : SPRITES[nom][0].slice(0, 12);
      return H.dessinPixel(lignes, PAL, echelle || 5);
    },
    image(nom, echelle, image) {
      nom = perso(nom);
      return H.dessinPixel(SPRITES[nom][image || 0], PAL, echelle || 3);
    },
    // dessine un personnage centré en bas sur (x, y)
    dessiner(ctx, nom, x, y, echelle, image, miroir) {
      const s0 = H.pixel.sprite(nom, image), s = detail(s0);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      const w = s0.width * echelle, h = s0.height * echelle;
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
