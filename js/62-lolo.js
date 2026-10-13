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
    "Pour les bâtons de médecine chinoise, appelle Luigi : il connaît plein de choses sur les plantes de ton île.",
    "En voyage ? Dans les Réglages, tu peux changer de lieu : le ciel, les saisons et la météo suivront.",
    "Relie ton Mac et ton iPhone dans les Réglages pour retrouver partout le même herbier.",
    "La boîte aux lettres du village garde le tout premier message qu’on t’a écrit.",
  ];
  const MEME = [
    "Rrrrr… rrrrr…",
    "(Mémé remue une oreille, sans ouvrir les yeux.)",
    "(Mémé serre un peu plus fort le cou de Lóló.)",
    "Mrrrou…",
  ];

  function plantesDuMois(champ, ile) {
    const mois = new Date().getMonth() + 1;
    const toutes = H.d.plantes().filter((p) => ((p.valeurs || {})[champ] || []).includes(mois));
    const ici = ile ? new Set(Object.values(ile.plantes || {}).map((x) => x.p)) : new Set();
    return { ici: toutes.filter((p) => ici.has(p.id)), ailleurs: toutes.filter((p) => !ici.has(p.id)) };
  }

  const liste = (ps, n) => {
    const melange = ps.slice().sort(() => Math.random() - 0.5).slice(0, n).map((p) => p.nom);
    return melange.join(", ") + (ps.length > n ? " et " + (ps.length - n) + " autres" : "");
  };

  function nouvelles(champ, verbe, ile) {
    const { ici, ailleurs } = plantesDuMois(champ, ile);
    const mois = H.MOIS_LONGS[new Date().getMonth()];
    if (!ici.length && !ailleurs.length) return ["En " + mois + ", rien " + verbe.rien + " d’après tes fiches."];
    const r = [];
    if (ici.length) r.push("Sur cette île, " + verbe.ici + " en ce moment : " + liste(ici, 5) + " !");
    if (ailleurs.length) r.push((ici.length ? "Et dans l’herbothèque, " : "Dans l’herbothèque, ") + verbe.ailleurs + " en " + mois + " : " + liste(ailleurs, 6) + ".");
    return r;
  }

  let dejaDites = [];

  async function parler(ile) {
    const L = (texte, choix) => H.dialogue.dire([{ qui: "lolo", texte, choix }]);
    let intro = "Hiii ! Qu’est-ce que je peux faire pour toi ?";
    for (;;) {
      const q = await L(intro, [
        { valeur: "astuce", libelle: "Une astuce pour le jeu" },
        { valeur: "fleurs", libelle: "Qu’est-ce qui fleurit ?" },
        { valeur: "recolte", libelle: "Qu’est-ce qu’on récolte ?" },
        { valeur: "semis", libelle: "Qu’est-ce qu’on sème ?" },
        { valeur: null, libelle: "Merci Lóló !" },
      ]);
      if (!q) break;
      let repliques = [];
      if (q === "astuce") {
        if (dejaDites.length >= ASTUCES.length) dejaDites = [];
        const restantes = ASTUCES.filter((a) => !dejaDites.includes(a));
        const a = restantes[Math.floor(Math.random() * restantes.length)];
        dejaDites.push(a);
        repliques = [a];
      } else if (q === "fleurs") {
        repliques = nouvelles("moisFloraison", { ici: "en fleurs", ailleurs: "en fleurs", rien: "ne fleurit" }, ile);
      } else if (q === "recolte") {
        repliques = nouvelles("moisRecolte", { ici: "à récolter", ailleurs: "à récolter", rien: "n’est à récolter" }, ile);
      } else if (q === "semis") {
        repliques = nouvelles("moisSemis", { ici: "à ressemer", ailleurs: "à semer", rien: "n’est à semer" }, ile);
      }
      const suite = repliques.map((texte) => ({ qui: "lolo", texte }));
      if (Math.random() < 0.35) suite.push({ qui: "meme", texte: MEME[Math.floor(Math.random() * MEME.length)] });
      await H.dialogue.dire(suite);
      intro = "Autre chose ?";
    }
    await L(["Hiii ! À bientôt !", "Mémé et moi, on retourne brouter. À plus !", "Hiii ! Bon jardinage !"][Math.floor(Math.random() * 3)]);
  }

  // Lóló ne vient qu'une fois son île découverte (c'est la surprise du 24 février).
  const disponible = () => !!(H.terrain && H.terrain.ileSecreteOuverte() && H.jeu.vu.ileSecrete);

  H.lolo = { parler, disponible };
})();
