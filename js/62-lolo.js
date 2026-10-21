// Lóló (avec Mémé endormie sur son encolure) : des astuces pour le jeu,
// et des nouvelles des plantes en fleurs, à récolter et à semer en ce moment.
(function () {
  const H = window.H;

  const ASTUCES = [
    "Dans l’herbothèque, le menu « Ranger » réorganise toutes les étagères d’un coup : par famille, par sphère d’action, par préparation…",
    "Avec « Organiser », tu peux créer tes propres étagères, tes propres rubriques de fiches et tes propres préparations.",
    "Les rubriques « à vérifier » attendent ton œil de pro : un clic sur « C’est juste » et elles sont validées.",
    "Sur une fiche, « Réviser cette plante » lance des flashcartes rien que pour elle.",
    "Les flashcartes rapportent des ressources : tu choisis lesquelles dans « Ce que rapportent les cartes ».",
    "Toutes les 15 cartes, une crêpe au chocolat fondu ! Elle redonne de l’énergie et met fin à la pause.",
    "Une carte souvent ratée devient « fragile » et revient plus souvent. C’est fait exprès, pas de panique.",
    "Sur le terrain, l’outil « Soleil et sol » peint les coins d’ombre et les sols différents. Les plantes y font très attention !",
    "Une plante mal placée ne meurt jamais : elle pousse lentement, et elle te dit pourquoi quand tu la regardes.",
    "Les plantes prêtes à récolter sont entourées de rose. La récolte donne des graines et du compost.",
    "Quand il pleut vraiment à Marseille, la pluie arrose tes jardins toute seule. Hiii, pratique !",
    "Un jardin « croquis » sert à dessiner un vrai projet à l’échelle, sans ressources. Tu peux en exporter la liste des plantes et l’image.",
    "Pailler garde l’eau deux semaines, le purin fortifie la plante, et un rayon de soleil la fait pousser d’un coup.",
    "Tu peux dessiner toi-même le modèle d’une plante, de côté, de dessus et de face : « Dessiner son modèle », dans sa fiche.",
    "Le placard à tisanes garde tes mélanges. Le rôle de chaque plante peut même devenir une flashcarte.",
    "Pour les bâtons de médecine chinoise, appelle Mesi : la MTC, c’est son grand bâton, surtout sur les plantes de ton jardin.",
    "En voyage ? Dans les Réglages, tu peux changer de lieu : le ciel, les saisons et la météo suivront.",
    "Relie ton Mac et ton iPhone dans les Réglages pour retrouver partout le même herbier.",
    "Quand le petit drapeau rose de la boîte aux lettres est levé, une lettre de Mesi t’attend. Tu peux lui répondre, ou programmer une lettre pour plus tard.",
    "Dans une fiche, « Stock dans l’herbothèque » note si un bocal est plein, à moitié, presque vide ou vide. Je te dirai quand c’est la saison pour aller en recueillir !",
    "Dans l’herbothèque, coche « seulement les bocaux presque vides ou vides » pour voir ce qu’il faut aller cueillir.",
    "Dans la serre, sème au bon mois : ça lève deux fois plus vite. Les bébés plantes se repiquent ensuite dans tes jardins pour presque rien.",
    "Le curcuma, le gingembre et les autres frileuses se plaisent dans la serre. Garde-les au chaud !",
    "La nuit, les flashcartes et le terrain dorment. Viens plutôt te balader avec moi, ou lire dans la cabane à la bougie.",
    "Au labo, les récoltes deviennent des préparations : séchage, teinture, macérat, distillation… Quand c’est prêt, le bocal de l’herbothèque se remplit.",
    "Va cueillir dans la nature depuis le labo : seulement les plantes dont c’est le mois de récolte !",
    "Au labo, infuse une tisane de ton placard : elle redonne de l’énergie. Mais les bocaux de plantes sèches baissent un peu à chaque tasse.",
    "Pendant la balade, quand le chemin passe par la terre rouge, on peut aller se baigner au pied des rochers.",
    "Chez toi, Mesi te prépare une crêpe au chocolat fondu, s’il en reste dans tes ressources.",
    "Certaines plantes soignent la terre : le trèfle l’enrichit, la consoude lui donne de l’humus… Note-le dans leur fiche, rubrique « Améliore le sol ». Plantées là où la terre est fatiguée, une fois adultes, elles changent le sol autour d’elles. Pratique pour le jardin de tes client·es !",
  ];
  const MEME = [
    "Rrrrrrrr… rrrrrrrr… rrrrrrrr…",
    "(Mémé remue une oreille, sans ouvrir les yeux.)",
    "(Mémé serre un peu plus fort le cou de Lóló.)",
    "Mrrrrrou… rrrrrrrr…",
  ];

  // Les blagues de Lóló (seulement à la maison, jamais dehors), ce sont des farces : il se cache, il fait semblant d'être une plante, il
  // s'assoit sur la tête de quelqu'un. Chaque farce a deux temps : on ne se doute de rien, puis
  // Lóló se montre. ƟvƟ et Mesi disent alors d'une seule voix « Sacré Lóló ! ».
  const FARCES = [
    { id: "cache", etapes: [
      [["ovo", "Mais… où est passé Lóló ?"], ["luigi", "Il était là il y a une seconde !"], ["ovo", "Lóló ? Lólóóó ?"], ["lolo", "(Sous la table, une boule couleur caramel essaie de se faire toute petite. Une queue chocolat frétille.)"]],
      [["lolo", "Hiii ! Coucou ! J’étais caché !"]],
    ] },
    { id: "plante", etapes: [
      [["luigi", "Tiens ? On a une nouvelle plante ?"], ["ovo", "Elle est bizarre… Elle a des sabots, cette plante."], ["lolo", "(La plante ne bouge pas d’un poil. Une feuille tremble un tout petit peu.)"]],
      [["lolo", "Hiii ! C’était moi ! Je faisais l’arbre !"]],
    ] },
    { id: "tete", etapes: [
      [["luigi", "C’est bizarre… j’ai la tête toute chaude, et toute lourde."], ["ovo", "Mesi… tu as un chapeau. Un chapeau couleur caramel."]],
      [["lolo", "Hiii ! Je suis un chapeau !"]],
    ] },
  ];
  // les textes corrigés dans « Les textes du jeu » remplacent ceux d'origine
  const T = (cle, defaut) => (H.textes ? H.textes.valeur(cle, defaut) : defaut);
  const astuces = () => T("astucesLolo", ASTUCES);
  const repliquesMeme = () => T("memeLolo", MEME);
  // Et quelques vraies blagues, ses préférées
  const BLAGUES = [
    { id: "toctoc", lignes: [["lolo", "Toc toc !"], ["ovo", "Qui est là ?"], ["lolo", "Lóló."], ["ovo", "Lóló qui ?"], ["lolo", "Lóló… euh… j’ai oublié la suite ! Hiii !"]] },
    { id: "meme", lignes: [["lolo", "Tu sais pourquoi Mémé dort tout le temps ?"], ["lolo", "Parce que sinon, elle serait réveillée ! Hiii hiii !"]] },
    { id: "moi", lignes: [["lolo", "Qu’est-ce qui est drôle, couleur caramel, et qui fait « hiii » ?"], ["lolo", "C’est moi ! Hiii !"]] },
  ];
  // opts.etape(id, i) : pour animer la farce dans la maison (0 : on ne voit rien, 1 : Lóló se montre) ;
  // opts.raconte(oui) : pendant une blague racontée, Lóló regarde ƟvƟ et tout le monde le regarde
  let dernieresFarces = [];
  async function blague(opts) {
    opts = opts || {};
    const toutes = FARCES.concat(BLAGUES);
    const restantes = toutes.filter((f) => !dernieresFarces.includes(f.id));
    const f = restantes[Math.floor(Math.random() * restantes.length)];
    dernieresFarces = dernieresFarces.concat(f.id).slice(-3);
    if (f.lignes) {
      if (opts.raconte) opts.raconte(true);
      try {
        await H.dialogue.dire(f.lignes.map(([qui, texte]) => ({ qui, texte })).concat({ qui: "duo", texte: "Sacré Lóló !" }));
      } finally {
        if (opts.raconte) opts.raconte(false);
      }
      return;
    }
    try {
      for (let i = 0; i < f.etapes.length; i++) {
        if (opts.etape) opts.etape(f.id, i);
        await H.dialogue.dire(f.etapes[i].map(([qui, texte]) => ({ qui, texte })));
      }
      await H.dialogue.dire([{ qui: "duo", texte: "Sacré Lóló !" }]);
    } finally {
      if (opts.etape) opts.etape(null);
    }
  }
  // Le matin, à la première visite de la journée, on demande d'abord à Lóló s'il a bien dormi
  // (c'est alors la seule chose qu'on lui demande).
  const aujourdhui = () => new Date().toDateString();
  const leMatin = () => new Date().getHours() >= 5 && new Date().getHours() < 12 && (H.local.bonjourLolo || "") !== aujourdhui();
  const bienDormi = async () => {
    H.d.majLocal((l) => (l.bonjourLolo = aujourdhui()));
    await H.dialogue.dire([
      { qui: "duo", texte: "Lóló, tu as bien dormi ?" },
      { qui: "lolo", texte: "Hiiiii !" },
    ]);
  };
  // Le soir, quand il y a trop de lumière pour dormir, Lóló se couche sur nos yeux.
  async function cacherLaLumiere(opts) {
    opts = opts || {};
    await H.dialogue.dire([
      { qui: "ovo", texte: "Il y a trop de lumière… je n’arrive pas à dormir." },
      { qui: "lolo", texte: "Hiii… ne bouge pas, je m’en occupe." },
    ]);
    if (opts.couche) opts.couche();
    await H.dialogue.dire([
      { qui: "lolo", texte: "(Lóló se couche tout doucement sur vos yeux, et cache la lumière avec son corps tout doux.)" },
      { qui: "duo", texte: "Merci Lóló… C’est gentil." },
    ]);
  }

  // Mémé sort par la chatière au plus une fois par jour, quelques heures (entre 2 et 4) ; on la
  // voit partir (ou rentrer) quand on est à la maison à ce moment-là. Pendant ce temps, elle
  // n'est nulle part : personne ne sait ce qu'elle fait dehors. Après l'heure de son retour, elle
  // reste encore un peu « en chemin » : si l'on est à la maison, on la voit passer la chatière.
  // H.jeu.memeSortie : { jour, depart, retour, vuRentrer }
  const EN_CHEMIN = 45 * 60e3;
  H.memeDehors = (t) => {
    t = t || Date.now();
    const s = H.jeu && H.jeu.memeSortie;
    if (!s || t < s.depart) return null;
    if (t < s.retour || (!s.vuRentrer && t < s.retour + EN_CHEMIN)) return s;
    return null;
  };
  // elle peut rentrer : on est dans le temps du retour, et personne ne l'a encore vue
  H.memeVaRentrer = (t) => {
    t = t || Date.now();
    const s = H.jeu && H.jeu.memeSortie;
    return !!s && !s.vuRentrer && t >= s.retour && t < s.retour + EN_CHEMIN;
  };
  // rentrée depuis moins d'une heure
  H.memeRentree = (t) => {
    t = t || Date.now();
    const s = H.jeu && H.jeu.memeSortie;
    return !!s && t >= s.retour && t < s.retour + 3600e3 && !H.memeDehors(t);
  };
  // elle peut sortir aujourd'hui (le jour, et pas encore sortie)
  H.memePeutSortir = () => {
    const h = new Date().getHours(), s = H.jeu && H.jeu.memeSortie;
    return h >= 9 && h < 18 && !H.memeDehors() && (!s || s.jour !== new Date().toDateString());
  };
  H.memeSort = () => {
    const t = Date.now();
    H.jeu.memeSortie = { jour: new Date().toDateString(), depart: t, retour: t + (2 + Math.random() * 2) * 3600e3, vuRentrer: false };
    H.d.changer("jeu");
  };
  H.memeVueRentrer = () => {
    if (!H.jeu.memeSortie) return;
    H.jeu.memeSortie = Object.assign({}, H.jeu.memeSortie, { vuRentrer: true });
    H.d.changer("jeu");
  };

  // une pluie de joie de Lóló en cours (elle arrose toutes les îles)
  H.pluieMagique = () => !!(H.jeu && H.jeu.pluieMagique && H.jeu.pluieMagique > H.maintenant());

  function plantesDuMois(champ, ile) {
    const mois = new Date().getMonth() + 1;
    const toutes = H.d.plantes().filter((p) => ((p.valeurs || {})[champ] || []).includes(mois));
    const ici = ile ? new Set(Object.values(ile.plantes || {}).map((x) => x.p)) : new Set();
    return { ici: toutes.filter((p) => ici.has(p.id)), ailleurs: toutes.filter((p) => !ici.has(p.id)) };
  }

  const liste = (ps, n) => {
    const melange = ps.slice().sort(() => Math.random() - 0.5).slice(0, n);
    if (ps.length <= n) return H.listeNoms(melange);
    return melange.map((p) => H.leNom(p)).join(", ") + " et " + (ps.length - n) + " autres";
  };

  // En fleurs, à récolter, à semer : d'abord sur l'île, puis dans la nature (à aller cueillir).
  function nouvelles(quoi, ile) {
    const champ = { fleurs: "moisFloraison", recolte: "moisRecolte", semis: "moisSemis" }[quoi];
    const { ici, ailleurs } = plantesDuMois(champ, ile);
    const mois = H.MOIS_LONGS[new Date().getMonth()];
    const r = [];
    if (quoi === "fleurs") {
      if (ici.length) r.push("Dans ce jardin, en fleurs en ce moment : " + liste(ici, 5) + " !");
      if (ailleurs.length) r.push("Dans la nature, en fleurs en " + mois + " : " + liste(ailleurs, 6) + ".");
      if (!r.length) r.push("En " + mois + ", rien ne fleurit d’après tes fiches.");
    } else if (quoi === "recolte") {
      if (ici.length) r.push("Dans ce jardin, à récolter en ce moment : " + liste(ici, 5) + " !");
      // les bocaux à remplir dont c'est justement la saison
      const aRefaire = ici.concat(ailleurs).filter((p) => H.d.aRemplir(p));
      if (aRefaire.length) {
        const vide = (p) => (p.preparations || []).some((id) => H.d.stock(p, id) === "vide");
        r.push(aRefaire.length > 1
          ? "Ces bocaux sont presque vides ou vides : " + liste(aRefaire, 4) + ". C’est le bon mois pour aller en cueillir !"
          : "Le bocal " + (H.genre(aRefaire[0]).elision ? "d’" : "de ") + H.nomPhrase(aRefaire[0]) + " est " + (vide(aRefaire[0]) ? "vide" : "presque vide") + " : c’est le bon mois pour aller en cueillir !");
      }
      if (ailleurs.length) r.push("À cueillir dans la nature en " + mois + " : " + liste(ailleurs, 6) + ".");
      if (!r.length) r.push("En " + mois + ", rien n’est à récolter d’après tes fiches.");
    } else {
      if (ici.length) r.push("Dans ce jardin, à ressemer en ce moment : " + liste(ici, 5) + ".");
      if (ailleurs.length) r.push("À semer en " + mois + " : " + liste(ailleurs, 6) + ". Dans la serre, au bon mois, ça lève deux fois plus vite !");
      if (!r.length) r.push("En " + mois + ", rien n’est à semer d’après tes fiches.");
    }
    return r;
  }

  let dejaDites = [];

  async function parler(ile) {
    const L = (texte, choix) => H.dialogue.dire([{ qui: "lolo", texte, choix }]);
    if (leMatin()) {
      const d = await H.dialogue.dire([{ qui: "lolo", texte: "Hiii ! Bonjour !", choix: [{ valeur: "dormi", libelle: "Tu as bien dormi ?" }] }]);
      if (!d) return;
      await bienDormi();
    }
    // sur la ferme, tant qu'il n'y a pas de bassin, Lóló a une idée (une fois par jour)
    if (!ile && H.ferme && H.ferme.aUnBassin && !H.ferme.aUnBassin() && H.local.ideeBassin !== new Date().toDateString()) {
      H.d.majLocal((l) => (l.ideeBassin = new Date().toDateString()));
      await H.dialogue.dire([
        { qui: "lolo", texte: "Hiii ! J’ai une idée ! La nuit, les hérissons, les renards et les sangliers cherchent de l’eau pour boire…" },
        { qui: "lolo", texte: "Si tu creusais un bassin sur la ferme (« Aménager », puis « Bassin »), ils viendraient y boire. On pourrait les regarder par la fenêtre !" },
      ]);
    }
    let intro = "Hiii ! Qu’est-ce que je peux faire pour toi ?";
    for (;;) {
      const q = await L(intro, [
        { valeur: "astuce", libelle: "Une astuce pour le jeu" },
        { valeur: "fleurs", libelle: "Qu’est-ce qui fleurit ?" },
        { valeur: "recolte", libelle: "Qu’est-ce qu’on récolte ou cueille ?" },
        { valeur: "semis", libelle: "Qu’est-ce qu’on sème ?" },
        { valeur: "visite", libelle: "Une visite guidée du jeu" },
        { valeur: null, libelle: "Merci Lóló !" },
      ]);
      if (!q) break;
      if (q === "visite") return visite();
      let repliques = [];
      if (q === "astuce") {
        if (dejaDites.length >= astuces().length) dejaDites = [];
        const restantes = astuces().filter((a) => !dejaDites.includes(a));
        const a = restantes[Math.floor(Math.random() * restantes.length)];
        dejaDites.push(a);
        repliques = [a];
      } else {
        repliques = nouvelles(q, ile);
      }
      const suite = repliques.map((texte) => ({ qui: "lolo", texte }));
      if (Math.random() < 0.35) suite.push({ qui: "meme", texte: H.histoires.auHasard(repliquesMeme()) });
      await H.dialogue.dire(suite);
      intro = "Autre chose ?";
    }
    await L(["Hiii ! À bientôt !", "Mémé et moi, on retourne brouter. À plus !", "Hiii ! Bon jardinage !"][Math.floor(Math.random() * 3)]);
  }

  // Lóló ne vient qu'une fois son île découverte (c'est la surprise du 24 février).
  // Lóló et Mémé sont là dès le début ; seule leur île apparaît le 24 février.
  const disponible = () => true;

  // --- la visite guidée : Lóló fait le tour de tout le jeu, lieu après lieu (proposée au tout
  // début ; on la retrouve dans le menu de Lóló, et dans les réglages)
  function etapesVisite() {
    const mesi = H.monde === "mesi", deMesi = H.local && H.local.role === "mesi";
    return [
      ["ferme", [
        "Hiii ! Suis-moi, je te montre tout. Ici, c’est la ferme. Clique sur une maison pour y entrer, ou n’importe où pour y marcher.",
        "En haut à droite : la truelle pour aménager la ferme, la pousse pour aller aux jardins, le rouage pour les réglages.",
        "Avec la truelle, tu poses des chemins, du gravier, une prairie fleurie, des plantes… « Déplacer » et « Tourner » bougent les maisons et les arbres. « Ferme d’origine » remet tout comme au début.",
        "Le petit carnet juste en dessous (ou Ctrl J), c’est pour noter vite, même les mains pleines de terre : la note file dans le carnet, page « Notes rapides ».",
        "En bas à gauche, les post-it de ta to-do liste : tu peux les cocher direct, ou les replier.",
      ]],
      ["herbotheque", [
        "L’herbothèque : toutes les fiches, rangées sur les étagères. Clique sur un bocal pour ouvrir sa fiche, ou « Nouvelle plante » pour en créer une à toi.",
        "« Organiser », c’est ton atelier de rangement : tu crées tes étagères, tu choisis les plantes qui y vont, tu les montes ou les descends.",
        "Toujours dans « Organiser » : les rubriques des fiches. Texte court, texte long, choix dans une liste, mois de l’année… Chaque rubrique que tu ajoutes apparaît sur toutes les fiches.",
        "Et les préparations : sirop, baume, macérat… Tu inventes les tiennes, avec la forme du contenant : bocal, flacon ambré, compte-gouttes, petit tube.",
        "Dans une fiche : « Modifier » pour remplir ou corriger, « Renommer », « Changer la photo » (une photo à toi, ou une photo libre), et l’étoile pour la mettre en favori.",
        "Et « Dessiner son modèle » : tu dessines la plante toi-même, pixel par pixel, de face, de côté et de dessus. Coche « Montrer mon dessin dans les jardins », et c’est ton dessin qui pousse !",
      ]],
      ["cartes", [
        "Les flashcartes ! Chaque bonne réponse rapporte des ressources pour les jardins. Et toutes les quinze cartes… une crêpe au chocolat fondu !",
        "« Choisir quoi réviser » : des plantes une à une, une étagère entière, et les rubriques des fiches que tu veux apprendre.",
        "« Mes cartes » : tes propres cartes, question et réponse, liées à une plante si tu veux. Et dans « Paramètres avancés », tu règles le rythme : quand revoir une carte ratée, difficile ou facile.",
      ]],
      ["terrain", [
        "Tes jardins ! « Nouveau jardin » pour en commencer un : un jardin de jeu qui pousse pour de vrai, un croquis de projet à l’échelle, ou un jardin surprise à offrir.",
        "En mode Jardin, on plante, on arrose, on récolte. En mode Chantier : « Aménager » pour les chemins, l’eau, les murets en pierres sèches ; « Soleil et sol » pour peindre l’ombre et la terre.",
        "« Forme du jardin » pour dessiner ses contours, et « Relief » pour monter des buttes et des terrasses, avec un talus ou un muret.",
        "La touche V passe en vue d’oiseau. On zoome avec la molette, le pavé tactile ou deux doigts. Et tu peux importer un dessin à décalquer.",
        "Le bouton exporter sort la liste des plantes ou le croquis en PDF. Et dans les réglages du jardin (le rouage), tu peux le renommer ou l’offrir en surprise.",
      ]],
      ["serre", ["La serre : on sème dans les pots, et les bébés plantes vont dans la caisse, prêts à repiquer dans les jardins. Tu peux chercher quoi semer par indication : digestion, sommeil, toux…"]],
      ["labo", ["Le labo : les récoltes deviennent des préparations (les tiennes aussi, celles d’« Organiser »), et on remplit les bocaux de l’herbothèque."]],
      ["tisanes", mesi ? [
        "Tes formules : clique sur les bocaux pour composer, puis la dose et le rang de chaque substance (empereur, ministre, assistant, messager), son action, la préparation.",
        "« Exporter les formules » pour tout garder sur papier.",
      ] : [
        "Le placard à tisanes : « Nouveau mélange », clique sur les bocaux pour composer, puis les proportions, l’effet de chaque plante, la préparation.",
        "« Exporter les recettes » pour tout garder sur papier.",
      ]],
      ["lettres", ["La boîte aux lettres, pour écrire des lettres, même des lettres qui arrivent plus tard : tu choisis la date d’arrivée."]],
      ["carnet", [
        "Le carnet : des pages libres pour tes chantiers, tes visites, tes idées. « + Sous-page » range des pages dans une page.",
        "Tape « / » pour choisir un bloc : titres, listes, cases à cocher, encadré, partie dépliable, image, tableau, deux colonnes… Ou les raccourcis : # pour un titre, - pour une puce, [] pour une case.",
        "Tape « [[ » pour relier une page, une plante, un jardin ou un client. Et #étiquette pour classer : un clic sur l’étiquette montre toutes les pages qui l’ont.",
        "En haut de chaque page, les propriétés : une date, un statut, et « Liée à » pour la relier à d’autres pages.",
        "Le bloc « Vue des pages » montre des pages en liste, en tableau, en galerie ou en calendrier, d’après une étiquette ou les sous-pages.",
        "Les modèles : « Depuis un modèle » pour commencer une page toute prête, « En faire un modèle » pour garder la tienne. Mets {date}, {client} ou {jardin}, ils se remplissent tout seuls.",
        "Sous chaque page : les commentaires, les pièces jointes, l’historique pour revenir en arrière, « Déplacer », « Exporter », les favoris… et la corbeille, pour se rattraper.",
        "Ctrl K cherche partout dans le jeu, et Ctrl J ouvre une note rapide.",
      ]],
      ["taches", ["La to-do liste : une date, un rappel qui sonne, une tâche qui revient chaque semaine, chaque mois ou chaque année, liée à une plante ou à un jardin. Et des idées du mois, d’après tes jardins."]],
      ["devis", [
        "Les devis et les factures. « Mon entreprise » pour tes coordonnées et ton logo, « Mes clients », et « Mes prix » pour ne pas tout retaper.",
        "Dans un devis : des lignes, des titres de partie, des sous-totaux, du texte libre, des sauts de page, et même les plantes d’un jardin d’un coup. Et tu ajoutes tes colonnes, de texte ou de nombres.",
        "« Modèles de PDF » : le style (Classique, Moderne, Herbier, Fenêtre…), la police, la couleur, la place du logo, les parties à montrer, et « + Un champ » pour tes champs en plus.",
        "Quand c’est accepté : « En faire une facture ». Hiii !",
      ]],
      ["maison", ["Et la maison ! Le canapé, le goûter, le dodo… et la porte, pour partir en balade."]],
      ["reglages", [
        "Les réglages : le lieu pour la météo, le jour, la nuit et les sons, le jeu léger si l’appareil rame, la sauvegarde.",
        "Et partout où tu vois « Exporter » : en PDF, en tableau ou en texte, avec un style au choix (Classique, Moderne, Herbier, Carnet de terrain…).",
      ]],
      ...(deMesi ? [["textes", ["Rien que pour toi, Mesi : les textes du jeu. Mes astuces, mes drames, ce que fait Mémé, les histoires du soir… tu changes tout ce que tu veux."]]] : []),
      ["ferme", ["Voilà, tu sais tout ! Hiii ! Tu peux me redemander la visite quand tu veux : clique sur moi à la ferme, ou va dans les réglages."]],
    ];
  }
  let visiteEnCours = false;
  async function visite() {
    if (visiteEnCours) return;
    visiteEnCours = true;
    H.d.majLocal((l) => (l.visiteProposee = true));
    try {
      const etapes = etapesVisite();
      for (let n = 0; n < etapes.length; n++) {
        const [lieu, textes] = etapes[n], derniere = n === etapes.length - 1;
        if (!location.hash.startsWith("#" + lieu)) { H.aller(lieu); await new Promise((r) => setTimeout(r, 900)); }
        // (à la fin de chaque lieu : passer au suivant, ou arrêter ; rien à choisir à la dernière)
        const r = await H.dialogue.dire(textes.map((texte, i) => i === textes.length - 1 && !derniere ? { qui: "lolo", texte, choix: [{ valeur: "suite", libelle: "Lieu suivant" }, { valeur: null, libelle: "Arrêter la visite" }] } : { qui: "lolo", texte }));
        if (derniere) break;
        if (!r) { await H.dialogue.dire([{ qui: "lolo", texte: "D’accord ! Si tu veux la reprendre, clique sur moi à la ferme. Hiii !" }]); break; }
      }
    } finally { visiteEnCours = false; }
  }
  // au tout premier lancement, sur la ferme : Lóló propose la visite (une seule fois)
  function proposerVisite() {
    if (!H.local || H.local.visiteProposee || visiteEnCours || H.$(".dialogue")) return;
    H.d.majLocal((l) => (l.visiteProposee = true));
    H.dialogue.dire([{ qui: "lolo", texte: "Hiii ! Bienvenue ! Moi c’est Lóló, et voici Mémé. Je te fais visiter ?", choix: [{ valeur: "oui", libelle: "Oui, visite !" }, { valeur: null, libelle: "Plus tard" }] }])
      .then((r) => (r ? visite() : H.dialogue.dire([{ qui: "lolo", texte: "D’accord ! Quand tu veux, clique sur moi à la ferme, ou va dans les réglages." }])));
  }

  H.lolo = { parler, blague, bienDormi, leMatin, cacherLaLumiere, disponible, visite, proposerVisite, DEFAUTS: { astucesLolo: ASTUCES, memeLolo: MEME } };
})();

// Une adresse que seul·e Mesi connaît (#surprises) : voir dès maintenant, sur cet appareil,
// la surprise du 24 février : l'île de Lóló et Mémé.
(function () {
  const H = window.H;
  H.vues.surprises = {
    afficher(c) {
      const actif = !!H.local.apercuIleSecrete;
      c.appendChild(H.el("section.reglage", null,
        H.el("h2", null, "Les surprises du 24 février"),
        H.el("p", null, actif
          ? "L’aperçu est activé sur cet appareil : le jardin de Lóló et Mémé est visible avec les autres jardins."
          : "Sur cet appareil, tout reste caché jusqu’au 24 février."),
        H.el("div.pastilles", null,
          H.el("button.bouton" + (actif ? "" : ".actif"), {
            type: "button",
            async onclick() {
              await H.d.majLocal((l) => {
                if (actif) delete l.apercuIleSecrete;
                else l.apercuIleSecrete = true;
              });
              H.router();
            },
          }, actif ? "Tout recacher sur cet appareil" : "Voir les surprises sur cet appareil"),
          H.el("a.bouton.discret-bouton", { href: "#ferme" }, "Retour à la ferme"))
      ));
    },
  };
})();
