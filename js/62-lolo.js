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
    "Quand il pleut vraiment à Marseille, la pluie arrose tes îles toute seule. Hiii, pratique !",
    "Une île « croquis » sert à dessiner un vrai jardin à l’échelle, sans ressources. Tu peux en exporter la liste des plantes et l’image.",
    "Pailler garde l’eau deux semaines, le purin fortifie la plante, et un rayon de soleil la fait pousser d’un coup.",
    "Tu peux dessiner toi-même l’aspect d’une plante sur la carte : « Dessiner son aspect », dans sa fiche.",
    "Le placard à tisanes garde tes mélanges. Le rôle de chaque plante peut même devenir une flashcarte.",
    "Pour les bâtons de médecine chinoise, appelle Mesi : la MTC, c’est son grand bâton, surtout sur les plantes de ton île.",
    "En voyage ? Dans les Réglages, tu peux changer de lieu : le ciel, les saisons et la météo suivront.",
    "Relie ton Mac et ton iPhone dans les Réglages pour retrouver partout le même herbier.",
    "Quand le petit drapeau rose de la boîte aux lettres est levé, une lettre de Mesi t’attend. Tu peux lui répondre, ou programmer une lettre pour plus tard.",
    "Dans une fiche, « Stock dans l’herbothèque » note si un bocal est plein, à moitié, presque vide ou vide. Je te dirai quand c’est la saison pour aller en recueillir !",
    "Dans l’herbothèque, coche « seulement les bocaux presque vides ou vides » pour voir ce qu’il faut aller cueillir.",
    "Dans la serre, sème au bon mois : ça lève deux fois plus vite. Les bébés plantes se repiquent ensuite sur tes îles pour presque rien.",
    "Le curcuma, le gingembre et les autres frileuses se plaisent dans la serre. Garde-les au chaud !",
    "La nuit, les flashcartes et le terrain dorment. Viens plutôt te balader avec moi, ou lire dans la cabane à la bougie.",
    "Au labo, les récoltes deviennent des préparations : séchage, teinture, macérat, distillation… Quand c’est prêt, le bocal de l’herbothèque se remplit.",
    "Va cueillir dans la nature depuis le labo : seulement les plantes dont c’est le mois de récolte !",
    "Au labo, infuse une tisane de ton placard : elle redonne de l’énergie. Mais les bocaux de plantes sèches baissent un peu à chaque tasse.",
    "Pendant la balade, quand le chemin passe par la terre rouge, on peut aller se baigner au pied des rochers.",
    "Chez toi, Mesi te prépare une crêpe au chocolat fondu, s’il en reste dans tes ressources.",
  ];
  const MEME = [
    "Rrrrrrrr… rrrrrrrr… rrrrrrrr…",
    "(Mémé remue une oreille, sans ouvrir les yeux.)",
    "(Mémé serre un peu plus fort le cou de Lóló.)",
    "Mrrrrrou… rrrrrrrr…",
  ];

  const COMPLIMENTS = [
    "Tu as la plus jolie étoile du monde !",
    "Ta crinière brille comme du miel au soleil.",
    "Tu galopes plus vite que le mistral !",
    "Mémé a bien de la chance de dormir sur toi.",
    "Tu sens bon le foin et la lavande.",
    "Tes sabots font la plus jolie musique.",
    "Tu es la plus douce des juments.",
    "Tes yeux pétillent comme la mer aux calanques.",
  ];
  // Les blagues de Lóló (seulement à la maison, jamais dehors), ce sont des farces : il se cache, il fait semblant d'être une plante, il
  // s'assoit sur la tête de quelqu'un. Chaque farce a deux temps : on ne se doute de rien, puis
  // Lóló se montre. ƟvƟ et Mesi disent alors d'une seule voix « Sacré Lóló ! ».
  const FARCES = [
    { id: "cache", etapes: [
      [["ovo", "Mais… où est passé Lóló ?"], ["luigi", "Il était là il y a une seconde !"], ["ovo", "Lóló ? Lólóóó ?"], ["lolo", "(Deux oreilles couleur caramel dépassent, et une queue chocolat qui frétille.)"]],
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
  const DUREE_PLUIE = 10 * 60e3;
  // les textes corrigés dans « Les textes du jeu » remplacent ceux d'origine
  const T = (cle, defaut) => (H.textes ? H.textes.valeur(cle, defaut) : defaut);
  const astuces = () => T("astucesLolo", ASTUCES);
  const repliquesMeme = () => T("memeLolo", MEME);
  const compliments = () => T("complimentsLolo", COMPLIMENTS);
  // Et quelques vraies blagues, ses préférées
  const BLAGUES = [
    { id: "nioc", lignes: [["lolo", "Qu’est-ce qui fait « nioc nioc » ?"], ["lolo", "Un canard qui recule ! Hiii hiii !"]] },
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

  // La pluie de joie : après trois compliments, Lóló fait pleuvoir sur tous les jardins.
  H.pluieMagique = () => !!(H.jeu && H.jeu.pluieMagique && H.jeu.pluieMagique > H.maintenant());

  function faireTomberLaPluie() {
    const t = H.maintenant();
    H.jeu.pluieMagique = t + DUREE_PLUIE;
    // la pluie arrose toutes les plantes de toutes les îles de jeu
    for (const ile of Object.values(H.jeu.iles || {})) {
      if (!ile || ile.supprime || ile.croquis) continue;
      for (const pl of Object.values(ile.plantes || {})) pl.eau = 100;
      ile.modifieLe = t;
    }
    H.d.changer("jeu");
    H.emettre("meteo", H.ciel.meteo);
  }

  async function complimenter() {
    const melange = compliments().slice().sort(() => Math.random() - 0.5).slice(0, 3);
    const choix = await H.dialogue.dire([{
      qui: "ovo",
      texte: "Hmm… qu’est-ce que je pourrais lui dire de gentil ?",
      choix: melange.map((c) => ({ valeur: c, libelle: c })),
    }]);
    if (!choix) return;
    const c = H.jeu.complimentsLolo || { n: 0, le: 0 };
    if (H.maintenant() - c.le > 24 * 3600e3) c.n = 0;
    c.n++;
    c.le = H.maintenant();
    H.jeu.complimentsLolo = c;
    H.d.changer("jeu");
    if (c.n === 1) {
      await H.dialogue.dire([{ qui: "ovo", texte: choix }, { qui: "lolo", texte: "Hiii… merci ! Tu me fais rougir jusqu’aux oreilles." }]);
    } else if (c.n === 2) {
      await H.dialogue.dire([{ qui: "ovo", texte: choix }, { qui: "lolo", texte: "Oh là là, encore ? Mon cœur fait des galops !" }]);
    } else {
      c.n = 0;
      await H.dialogue.dire([
        { qui: "ovo", texte: choix },
        { qui: "lolo", texte: "Hiii ! Tu me rends tellement heureuse que… regarde le ciel !" },
      ]);
      faireTomberLaPluie();
      await H.dialogue.dire([
        { qui: "meme", texte: "Rrrrrrrr… (Mémé sent les premières gouttes, ouvre un œil, et se rendort.)" },
        { qui: "lolo", texte: "Voilà : une pluie de joie pour tous tes jardins ! Ça arrose tout, pendant dix minutes." },
      ]);
    }
  }

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
      if (ici.length) r.push("Sur cette île, en fleurs en ce moment : " + liste(ici, 5) + " !");
      if (ailleurs.length) r.push("Dans la nature, en fleurs en " + mois + " : " + liste(ailleurs, 6) + ".");
      if (!r.length) r.push("En " + mois + ", rien ne fleurit d’après tes fiches.");
    } else if (quoi === "recolte") {
      if (ici.length) r.push("Sur cette île, à récolter en ce moment : " + liste(ici, 5) + " !");
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
      if (ici.length) r.push("Sur cette île, à ressemer en ce moment : " + liste(ici, 5) + ".");
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
    let intro = "Hiii ! Qu’est-ce que je peux faire pour toi ?";
    for (;;) {
      const q = await L(intro, [
        { valeur: "astuce", libelle: "Une astuce pour le jeu" },
        { valeur: "fleurs", libelle: "Qu’est-ce qui fleurit ?" },
        { valeur: "recolte", libelle: "Qu’est-ce qu’on récolte ou cueille ?" },
        { valeur: "semis", libelle: "Qu’est-ce qu’on sème ?" },
        { valeur: "compliment", libelle: "Lui faire un compliment" },
        { valeur: null, libelle: "Merci Lóló !" },
      ]);
      if (!q) break;
      if (q === "compliment") {
        await complimenter();
        intro = "Autre chose ?";
        continue;
      }
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

  H.lolo = { parler, blague, bienDormi, leMatin, cacherLaLumiere, disponible, DEFAUTS: { astucesLolo: ASTUCES, memeLolo: MEME, complimentsLolo: COMPLIMENTS } };
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
          ? "L’aperçu est activé sur cet appareil : l’île de Lóló et Mémé est visible dans l’archipel."
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
          H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme"))
      ));
    },
  };
})();
