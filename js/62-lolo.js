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
  // les compliments qu'on peut faire à Lóló : trois dans la journée, et il fait pleuvoir de joie
  const COMPLIMENTS = [
    "Tu as la plus jolie étoile du monde !",
    "Ta crinière brille comme du miel au soleil.",
    "Tu galopes plus vite que le mistral !",
    "Mémé a bien de la chance de dormir sur toi.",
    "Tu sens bon le foin et la lavande.",
    "Tes sabots font la plus jolie musique.",
    "Tu es le plus doux des chevaux.",
    "Tes yeux pétillent comme la mer aux calanques.",
  ];
  const compliments = () => T("complimentsLolo", COMPLIMENTS);
  const DUREE_PLUIE = 10 * 60e3;
  // La pluie de joie : après trois compliments, Lóló fait pleuvoir sur tous les jardins (elle
  // arrose toutes les plantes, pendant dix minutes).
  function faireTomberLaPluie() {
    const t = H.maintenant();
    H.jeu.pluieMagique = t + DUREE_PLUIE;
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
    const choix = await H.dialogue.dire([{ qui: "ovo", texte: "Hmm… qu’est-ce que je pourrais lui dire de gentil ?", choix: melange.map((c) => ({ valeur: c, libelle: c })) }]);
    if (!choix) return;
    const c = H.jeu.complimentsLolo || { n: 0, le: 0 };
    if (H.maintenant() - c.le > 24 * 3600e3) c.n = 0;
    c.n++;
    c.le = H.maintenant();
    H.jeu.complimentsLolo = c;
    H.d.changer("jeu");
    if (c.n === 1) await H.dialogue.dire([{ qui: "ovo", texte: choix }, { qui: "lolo", texte: "Hiii… merci ! Tu me fais rougir jusqu’aux oreilles." }]);
    else if (c.n === 2) await H.dialogue.dire([{ qui: "ovo", texte: choix }, { qui: "lolo", texte: "Oh là là, encore ? Mon cœur fait des galops !" }]);
    else {
      c.n = 0;
      await H.dialogue.dire([{ qui: "ovo", texte: choix }, { qui: "lolo", texte: "Hiii ! Tu me rends tellement heureux que… regarde le ciel !" }]);
      faireTomberLaPluie();
      await H.dialogue.dire([
        { qui: "meme", texte: "Rrrrrrrr… (Mémé sent les premières gouttes, ouvre un œil, et se rendort.)" },
        { qui: "lolo", texte: "Voilà : une pluie de joie pour tous tes jardins ! Ça arrose tout, pendant dix minutes." },
      ]);
    }
  }
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
        { valeur: "compliment", libelle: "Lui faire un compliment" },
        { valeur: "visite", libelle: "Une visite guidée du jeu" },
        { valeur: "carnet", libelle: "Explique-moi le carnet" },
        { valeur: null, libelle: "Merci Lóló !" },
      ]);
      if (!q) break;
      if (q === "compliment") { await complimenter(); intro = "Autre chose ?"; continue; }
      if (q === "visite") return visite();
      if (q === "carnet") return visiteCarnet();
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
  // Chaque étape : un lieu, puis des répliques. Pendant chaque réplique, Lóló montre ce dont il
  // parle : il ouvre la fenêtre ou l'onglet (« ouvrir »), encadre d'un cadre qui clignote ce qu'il
  // présente (« montrer »), ou referme les fenêtres ouvertes (« fermer »). On désigne un élément par
  // son texte (ou son titre), ou par « css:… ».
  function etapesCarnet() {
    return [{ lieu: null, lignes: [
      { t: "Le carnet ! Je t’ai préparé une page d’exemple, avec un bloc de chaque sorte. Tu pourras tout essayer dedans, puis la garder ou la mettre à la corbeille.", avant: () => { const p = H.carnet && H.carnet.pageExemple(); if (p) H.aller("carnet/" + p.id); } },
      { montrer: ["+ Nouvelle page", "+ Sous-page"], t: "Les pages se rangent les unes dans les autres, comme des tiroirs : « + Nouvelle page » en crée une, « + Sous-page » en range une nouvelle dans la page ouverte. À gauche, l’arbre de toutes tes pages." },
      { montrer: "Déplacer", t: "« Déplacer » range la page ailleurs, dans une autre page." },
      { montrer: "css:.bloc-carnet.bloc-p", t: "Pour écrire, clique n’importe où dans la page. Tape « / » au début d’une ligne : une liste s’ouvre pour choisir un bloc. Titre, liste, case à cocher, citation, encadré, partie dépliable, image, tableau, feuille de calcul, deux colonnes, vue des pages…" },
      { montrer: "css:.bloc-carnet.bloc-p .outils-bloc", t: "Quand tu passes sur un bloc, deux petits boutons apparaissent à sa gauche : « + » ajoute un bloc dessous, et « ⋮⋮ » le transforme (un texte devient une liste, un titre…), le monte, le descend, le duplique ou le supprime." },
      { montrer: ["css:.bloc-carnet.bloc-puce", "css:.bloc-carnet.bloc-todo"], t: "Il y a des raccourcis, à taper au début d’une ligne : « - » pour une puce, « [] » pour une case à cocher, « # » pour un titre, « > » pour une citation, « !> » pour un encadré, « >> » pour une partie dépliable, « --- » pour un trait." },
      { montrer: "css:.bloc-carnet.bloc-encadre", t: "L’encadré : la pastille change sa couleur." },
      { montrer: "css:.bloc-carnet.bloc-toggle", t: "La partie dépliable : la flèche l’ouvre et la referme, pour ranger ce qui est long." },
      { montrer: ["css:a.lien-carnet", "css:a.etiquette-carnet"], t: "Tape « [[ » : une liste s’ouvre pour relier une page, une plante, un jardin ou un client, et le lien devient cliquable. Un mot précédé de # devient une étiquette : un clic dessus montre toutes les pages qui l’ont." },
      { montrer: "css:.bloc-carnet.bloc-tableau", t: "Le bloc Tableau : des lignes et des colonnes pour une liste simple. En dessous : « + ligne », « + colonne »…" },
      { montrer: "css:.bloc-carnet.bloc-feuille", t: "La feuille de calcul, c’est comme Excel ! Chaque case a un nom (B2), et une case qui commence par « = » calcule : =B2*C2, =SOMME(B2:B4), =MOYENNE(…). Clique sur une case pour voir sa formule." },
      { montrer: ["Trier ↑", "Filtrer", "Importer", "Exporter .xlsx", "Formules ?"], t: "Clique sur la lettre d’une colonne pour la choisir, puis « Trier » ou « Filtrer ». « Importer » ouvre un fichier Excel ou .csv, « Exporter .xlsx » en fait un vrai fichier Excel (les formules restent), et « Formules ? » les rappelle toutes." },
      { montrer: "css:.bloc-carnet.bloc-vue", t: "Le bloc « Vue des pages » montre d’autres pages : les sous-pages de celle-ci (comme ici), toutes les pages, ou celles d’une étiquette. En liste, en tableau, en galerie ou en calendrier : clique sur les boutons pour changer." },
      { montrer: "css:.proprietes-page", t: "En haut de chaque page, les propriétés : une date, un statut (à faire, en cours, fait), et « Liée à » pour la relier à d’autres pages. La vue en tableau les montre, et le calendrier range les pages par date." },
      { montrer: "En faire un modèle", t: "Les modèles : « En faire un modèle » garde une page comme modèle. Ensuite, « Depuis un modèle » crée une nouvelle page toute prête. Écris {date}, {client} ou {jardin} dans un modèle : ils sont remplis à la création." },
      { montrer: "Depuis un modèle", t: "Le voilà : il y a déjà trois modèles du jeu, et les tiens s’ajoutent à côté." },
      { montrer: ["Historique", "Mettre en favori", "Exporter", "Corbeille"], t: "Pour chaque page : l’historique pour revenir à une version d’avant, l’étoile des favoris, « Exporter » (PDF, texte, tableau ou Excel), et la corbeille, pour se rattraper." },
      { montrer: ["css:.commentaires-carnet", "Joindre un fichier"], t: "Tout en bas : les commentaires, et les pièces jointes (une photo, un PDF…)." },
      { montrer: "Chercher partout", t: "Et « Chercher partout » (ou " + H.touche("K") + ") cherche dans tout le jeu : pages, plantes, jardins, clients. " + H.touche("J") + " ouvre une note rapide, qui file dans la page « Notes rapides »." },
    ] }];
  }
  function etapesVisite() {
    const mesi = H.monde === "mesi", deMesi = H.local && H.local.role === "mesi";
    return [
      { lieu: "ferme", lignes: [
        { t: "Hiii ! Suis-moi, je te montre tout. Ici, c’est la ferme. Clique sur une maison pour y entrer, ou n’importe où pour y marcher." },
        { montrer: "css:.outils-ferme", t: "En haut à droite : la truelle pour aménager la ferme, la pousse pour aller aux jardins, le rouage pour les réglages." },
        { ouvrir: "Aménager la ferme", montrer: ["Déplacer", "Tourner", "Ferme d’origine"], t: "Avec la truelle, tu poses des chemins, du gravier, une prairie fleurie, des plantes… « Déplacer » et « Tourner » bougent les maisons et les arbres. « Ferme d’origine » remet tout comme au début." },
        { cliquer: "Terminer", montrer: "css:.note-rapide-bouton", t: "Le petit carnet (ou " + H.touche("J") + "), c’est pour noter vite, même les mains pleines de terre : la note file dans le carnet, page « Notes rapides »." },
        { montrer: "css:.coin-ferme", t: "En bas à gauche, les post-it de ta to-do liste : tu peux les cocher direct, ou les replier." },
      ] },
      { lieu: "herbotheque", lignes: [
        { montrer: "css:a.bocal", t: "L’herbothèque : toutes les fiches, rangées sur les étagères. Clique sur un bocal pour ouvrir sa fiche, ou « Ajouter une plante » pour en créer une à toi." },
        { ouvrir: "Organiser", montrer: "Étagères", t: "« Organiser », c’est ton atelier de rangement. Les étagères : tu en crées, tu choisis les plantes qui y vont, tu les montes ou les descends." },
        { ouvrir: "Rubriques des fiches", t: "Les rubriques des fiches : texte court, texte long, choix dans une liste, mois de l’année… Chaque rubrique que tu ajoutes apparaît sur toutes les fiches." },
        { ouvrir: "Préparations", t: "Les préparations : sirop, baume, macérat… Tu inventes les tiennes, avec la forme du contenant : bocal, flacon ambré, compte-gouttes, petit tube." },
        { fermer: true, ouvrir: "css:a.bocal", montrer: ["css:.crayon-nom", "css:.crayon-photo"], t: "Dans une fiche : le crayon à côté du nom pour la renommer, « Changer » pour la photo (une à toi, ou une photo libre), les crayons des rubriques pour remplir, et l’étoile pour les favoris." },
        { montrer: "Dessiner son modèle", t: "Et « Dessiner son modèle » : tu dessines la plante toi-même, pixel par pixel, de face, de côté et de dessus. Coche « Montrer mon dessin dans les jardins », et c’est ton dessin qui pousse !" },
      ] },
      { lieu: "cartes", lignes: [
        { t: "Les flashcartes ! Chaque bonne réponse rapporte des ressources pour les jardins. Et toutes les quinze cartes… une crêpe au chocolat fondu !" },
        { ouvrir: "Choisir quoi réviser", t: "« Choisir quoi réviser » : des plantes une à une, une étagère entière, et les rubriques des fiches que tu veux apprendre." },
        { ouvrir: "Mes cartes", t: "« Mes cartes » : tes propres cartes, question et réponse, liées à une plante si tu veux." },
        { ouvrir: "Paramètres avancés", t: "Et dans « Paramètres avancés », tu règles le rythme : quand revoir une carte ratée, difficile ou facile." },
      ] },
      { lieu: "terrain", lignes: [
        { montrer: "Nouveau jardin", t: "Tes jardins ! « Nouveau jardin » pour en commencer un : un jardin de jeu qui pousse pour de vrai, un croquis de projet à l’échelle, ou un jardin surprise à offrir." },
        { ouvrir: "css:a.carte-ile:not(.brume)", montrer: "css:.modes-ile", t: "Dans un jardin, deux modes. En mode Jardin, on regarde, on plante, on arrose, on récolte." },
        { ouvrir: "Chantier", montrer: ["Aménager", "Déplacer"], t: "En mode Chantier : « Aménager » pour les chemins, l’eau, les murets ; « Déplacer » pour bouger une plante sans la replanter." },
        { ouvrir: "Soleil et sol", t: "« Soleil et sol » : tu peins l’ombre et la mi-ombre, et la sorte de terre, case par case." },
        { ouvrir: "Forme du jardin", t: "« Forme du jardin » : tu dessines ses contours au pinceau, ou d’un seul trait, et tu peux décalquer un dessin à toi." },
        { ouvrir: "Relief", montrer: "Pente douce", t: "« Relief » : des buttes en pente douce, des talus, ou des terrasses à muret, cran par cran." },
        { cliquer: "Jardin", montrer: ["css:.barre-vue", "css:.terrain-tete"], t: "La touche V (ou l’oiseau) passe en vue d’oiseau, et on zoome avec la molette ou deux doigts. En haut : exporter la liste des plantes ou le croquis, et le rouage du jardin pour le renommer ou l’offrir en surprise." },
      ] },
      { lieu: "serre", lignes: [{ t: "La serre : on sème dans les pots, et les bébés plantes vont dans la caisse, prêts à repiquer dans les jardins. Tu peux chercher quoi semer par indication : digestion, sommeil, toux…" }] },
      { lieu: "labo", lignes: [{ t: "Le labo : les récoltes deviennent des préparations (les tiennes aussi, celles d’« Organiser »), et on remplit les bocaux de l’herbothèque." }] },
      { lieu: "tisanes", lignes: mesi ? [
        { t: "Tes formules : clique sur les bocaux pour composer, puis la dose et le rang de chaque substance (empereur, ministre, assistant, messager), son action, la préparation." },
        { montrer: "Exporter les formules", t: "« Exporter les formules » pour tout garder sur papier, ou dans Excel." },
      ] : [
        { montrer: "Nouveau mélange", t: "Le placard à tisanes : « Nouveau mélange », puis clique sur les bocaux pour composer, les proportions, l’effet de chaque plante, la préparation." },
        { montrer: "Exporter les recettes", t: "« Exporter les recettes » pour tout garder sur papier, ou dans Excel." },
      ] },
      { lieu: "lettres", lignes: [{ montrer: "Écrire une lettre", t: "La boîte aux lettres, pour écrire des lettres, même des lettres qui arrivent plus tard : tu choisis la date d’arrivée." }] },
      { lieu: null, lignes: etapesCarnet()[0].lignes },
      { lieu: "taches", lignes: [{ montrer: "Nouvelle tâche", t: "La to-do liste : une date, un rappel qui sonne, une tâche qui revient chaque semaine, chaque mois ou chaque année, liée à une plante ou à un jardin. Et des idées du mois, d’après tes jardins." }] },
      { lieu: "devis", lignes: [
        { montrer: ["Mon entreprise", "Mes clients", "Mes prix"], t: "Les devis et les factures. « Mon entreprise » pour tes coordonnées et ton logo, « Mes clients », et « Mes prix » pour ne pas tout retaper." },
        { t: "Dans un devis : des lignes, des titres de partie, des sous-totaux, du texte libre, des sauts de page, et même les plantes d’un jardin d’un coup. Et tu ajoutes tes colonnes, de texte ou de nombres." },
        { montrer: "Modèles de PDF", t: "« Modèles de PDF » : le style, la police, la couleur, la place du logo, les parties à montrer, et tes champs en plus. Quand c’est accepté : « En faire une facture ». Hiii !" },
      ] },
      { lieu: "maison", lignes: [{ t: "Et la maison ! Le canapé, le goûter, le dodo… et la porte, pour partir en balade." }] },
      { lieu: "reglages", lignes: [
        { t: "Les réglages : le lieu pour la météo, le jour, la nuit et les sons, le jeu léger si l’appareil rame, la sauvegarde." },
        { t: "Et partout où tu vois « Exporter » : en PDF (avec un style au choix), en texte, en tableau .csv, ou en vrai fichier Excel." },
      ] },
      ...(deMesi ? [{ lieu: "textes", lignes: [{ t: "Rien que pour toi, Mesi : les textes du jeu. Mes astuces, mes drames, ce que fait Mémé, les histoires du soir… tu changes tout ce que tu veux." }] }] : []),
      { lieu: "ferme", lignes: [{ t: "Voilà, tu sais tout ! Hiii ! Tu peux me redemander la visite quand tu veux : clique sur moi à la ferme, ou va dans les réglages. Et sur l’accueil du carnet, « Lóló m’explique le carnet »." }] },
    ];
  }

  // --- ce que Lóló montre pendant la visite -----------------------------------------------------
  const attendre = (ms) => new Promise((r) => setTimeout(r, ms));
  const visible = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
  // (sans les petits signes du début : « ☆ Mettre en favori », « + Sous-page »…)
  const norme = (t) => String(t || "").replace(/\s+/g, " ").trim().toLowerCase().replace(/^[^\p{L}\p{N}«+−]+/u, "");
  function trouver(cible) {
    if (!cible) return null;
    if (cible.startsWith("css:")) return [...document.querySelectorAll(cible.slice(4))].find((e) => visible(e) && !e.closest(".dialogue")) || null;
    const c = norme(cible);
    const els = [...document.querySelectorAll("button, a, summary, label, [role=tab], h2, h3, .icone-bureau")].filter((e) => visible(e) && !e.closest(".dialogue"));
    const titre = (e) => norme(e.getAttribute("title") || e.getAttribute("aria-label"));
    return els.find((e) => norme(e.textContent) === c) || els.find((e) => titre(e) === c) || els.find((e) => norme(e.textContent).startsWith(c)) || els.find((e) => titre(e).startsWith(c)) || null;
  }
  let montres = [];
  function eteindre() { montres.forEach((e) => e.classList.remove("lolo-montre")); montres = []; }
  function montrer(cible, defiler) {
    const e = trouver(cible);
    if (!e) return null;
    e.classList.add("lolo-montre");
    montres.push(e);
    if (defiler) e.scrollIntoView({ block: "center", behavior: "smooth" });
    return e;
  }
  const fermerFenetres = () => document.querySelectorAll(".voile .fermer-fenetre-pixel").forEach((b) => b.click());
  async function preparer(l) {
    eteindre();
    if (l.fermer) { fermerFenetres(); await attendre(300); }
    if (l.avant) { l.avant(); await attendre(900); }
    if (l.cliquer) { const e = trouver(l.cliquer); if (e) { e.click(); await attendre(500); } }
    if (l.ouvrir) {
      const e = montrer(l.ouvrir, true);
      if (e) { await attendre(650); e.click(); await attendre(900); eteindre(); }
      // (l'onglet ou le bouton qu'il vient d'ouvrir reste encadré, s'il n'a rien d'autre à montrer)
      if (!l.montrer) montrer(l.ouvrir, true);
    }
    [].concat(l.montrer || []).forEach((m, k) => montrer(m, k === 0));
  }

  let visiteEnCours = false;
  async function visite(etapes) {
    if (visiteEnCours) return;
    visiteEnCours = true;
    etapes = etapes || etapesVisite();
    H.d.majLocal((l) => (l.visiteProposee = true));
    try {
      for (let n = 0; n < etapes.length; n++) {
        const { lieu, lignes } = etapes[n], derniere = n === etapes.length - 1;
        fermerFenetres();
        if (lieu && !location.hash.startsWith("#" + lieu)) { H.aller(lieu); await attendre(900); }
        let arret = false;
        for (let k = 0; k < lignes.length; k++) {
          await preparer(lignes[k]);
          const fin = k === lignes.length - 1;
          // (à la fin de chaque lieu : passer au suivant, ou arrêter ; rien à choisir à la dernière)
          const r = await H.dialogue.dire([fin && !derniere ? { qui: "lolo", texte: lignes[k].t, choix: [{ valeur: "suite", libelle: "Lieu suivant" }, { valeur: null, libelle: "Arrêter la visite" }] } : { qui: "lolo", texte: lignes[k].t }]);
          if (fin && !derniere && !r) arret = true;
        }
        eteindre();
        if (arret) { await H.dialogue.dire([{ qui: "lolo", texte: "D’accord ! Si tu veux la reprendre, clique sur moi à la ferme. Hiii !" }]); break; }
      }
    } finally { eteindre(); visiteEnCours = false; }
  }
  // la visite du carnet seule (depuis l'accueil du carnet, ou le menu de Lóló)
  const visiteCarnet = () => visite(etapesCarnet().map((e) => Object.assign({}, e, { lignes: e.lignes.concat({ t: "Voilà pour le carnet ! Hiii ! Tu peux me redemander quand tu veux, depuis l’accueil du carnet." }) })));
  // au tout premier lancement, sur la ferme : Lóló propose la visite (une seule fois)
  function proposerVisite() {
    if (!H.local || H.local.visiteProposee || visiteEnCours || H.$(".dialogue")) return;
    H.d.majLocal((l) => (l.visiteProposee = true));
    H.dialogue.dire([{ qui: "lolo", texte: "Hiii ! Bienvenue ! Moi c’est Lóló, et voici Mémé. Je te fais visiter ?", choix: [{ valeur: "oui", libelle: "Oui, visite !" }, { valeur: null, libelle: "Plus tard" }] }])
      .then((r) => (r ? visite() : H.dialogue.dire([{ qui: "lolo", texte: "D’accord ! Quand tu veux, clique sur moi à la ferme, ou va dans les réglages." }])));
  }

  H.lolo = { parler, blague, bienDormi, leMatin, cacherLaLumiere, disponible, visite: () => visite(), visiteCarnet, proposerVisite, DEFAUTS: { astucesLolo: ASTUCES, memeLolo: MEME, complimentsLolo: COMPLIMENTS } };
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
