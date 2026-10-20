// Les histoires du soir : les drames absurdes de Lóló (pleins de rebondissements),
// les douceurs de Mesi pour ƟvƟ, les pensées d'une balade en solo.
(function () {
  const H = window.H;
  const L = (texte) => ({ qui: "lolo", texte });
  const M = (texte) => ({ qui: "meme", texte });
  const G = (texte) => ({ qui: "luigi", texte });

  const LOLO = [
    { titre: "La trahison de la carotte", lignes: [
      L("Ce soir, je vais te raconter le plus grand drame de ma vie. Accroche-toi à ta salopette."),
      L("Pendant trois jours, j’ai attendu une carotte. Trois jours ! Je l’imaginais orange, croquante, parfaite."),
      L("Et puis elle est arrivée. Je l’ai croquée… et ce n’était PAS une carotte. C’était un panais."),
      L("Un panais déguisé en carotte, ƟvƟ. Avec un petit chapeau vert collé à la colle à bois. La trahison absolue."),
      M("Rrrrrrrr… rrrrrrrr…"),
      L("Mais attends : le panais avait un frère jumeau. Et ce frère jumeau… était une vraie carotte, cachée dans le compost depuis des années."),
      L("Ils ne s’étaient jamais revus. Je les ai réunis. Tout le potager a pleuré. Même les choux. Surtout les choux."),
      L("Depuis, ils vivent ensemble dans un bocal, sur la troisième étagère de l’herbothèque. Va vérifier, si tu ne me crois pas."),
    ] },
    { titre: "Le mystère du sabot perdu", lignes: [
      L("Un matin, je me réveille, et horreur : il me manque un sabot. UN SABOT, ƟvƟ."),
      L("J’ai mené l’enquête. Premier suspect : un goéland, beaucoup trop content de lui. Deuxième suspect : un escargot très lent, donc très louche."),
      L("Troisième suspect : une marguerite qui évitait mon regard. On ne fait pas plus coupable."),
      M("(Mémé remue une oreille, comme si elle savait quelque chose.)"),
      L("Et la coupable était… Mémé ! Elle se servait de mon sabot comme oreiller."),
      L("Sauf que… ce n’était même pas mon sabot. C’était un croissant. Je n’avais jamais perdu de sabot."),
      L("J’ai compté mes sabots : quatre. J’ai compté les croissants : zéro. Mémé l’avait mangé pendant que je comptais."),
      M("Rrrrrrrr… (Mémé a des miettes sur les moustaches.)"),
    ] },
    { titre: "La grande évasion du radis noir", lignes: [
      L("Cette nuit-là, à minuit pile, le radis noir s’est échappé du potager."),
      L("Il avait creusé un tunnel avec une petite cuillère pendant des semaines. Personne n’avait rien vu. Pas même la taupe, qui pourtant voit tout dans le noir."),
      L("Le jardin a lancé la tortue la plus rapide de Provence à sa poursuite. Elle va à peu près à un mètre par heure."),
      L("La poursuite a duré six mois. Six mois de suspense insoutenable."),
      M("(Mémé ouvre un œil, le referme. Le suspense ne l’intéresse pas.)"),
      L("On a fini par retrouver le radis noir au casino de Nice, chez les fachos, en smoking, en train de gagner au loto."),
      L("Il a tout reversé aux abeilles."),
    ] },
    { titre: "Le duel des tisanes", lignes: [
      L("Le tilleul et la camomille se disputaient un titre très prestigieux : la meilleure tisane du soir."),
      L("Ils se sont donné rendez-vous pour un duel, au lever de la lune, sur le ponton."),
      L("L’arbitre était un hibou. Très sérieux. Très solennel. Il a dit « Que le duel commence »… et il s’est endormi."),
      L("Les deux tisanes ont attendu qu’il se réveille. Jusqu’au matin. Elles avaient eu le temps de refroidir."),
      L("Alors elles ont fait la paix et se sont versées dans la même tasse. C’était délicieux."),
      M("Rrrrrrrr… rrrrrrrr… rrrrrrrr…"),
      L("Fin. Je pleure à chaque fois. Toi aussi, tu pleures ? Tu devrais pleurer."),
    ] },
    { titre: "Le secret des yeux fermés de Mémé", lignes: [
      L("Tu t’es déjà demandé pourquoi Mémé a toujours les yeux fermés ?"),
      L("Je vais te révéler un secret que personne ne connaît. Personne. Même pas Mémé."),
      L("Mémé voit tout… en rêve. Les étoiles, la mer, les poissons, l’avenir. Elle n’a pas besoin d’ouvrir les yeux."),
      L("Avant de me connaître, elle a été reine des chats d’Égypte. Elle avait une pyramide à son nom et trois mille coussins."),
      M("(Mémé ronronne plus fort. C’est sûrement vrai.)"),
      L("Elle a tout quitté pour moi. Pour dormir sur mon cou. Tu te rends compte du sacrifice ?"),
      L("Je crois que je vais m’évanouir d’émotion. Rattrape-moi. Hiii !"),
    ] },
  ];

  const LUIGI = [
    { titre: "La graine qui avait peur du noir", lignes: [
      G("Il était une fois une petite graine de tournesol qui avait peur du noir."),
      G("Sous la terre, tout était sombre, et elle se sentait toute seule."),
      G("La terre lui a murmuré : « C’est dans le noir que l’on grandit. Prends ton temps, je te tiens au chaud. »"),
      G("Alors la graine a respiré, doucement. Elle a fait une racine, puis une autre."),
      G("Au printemps, elle est sortie de terre et elle a cherché le soleil des yeux."),
      G("Elle l’a trouvé tout de suite : ce soleil-là portait des lunettes rondes et une salopette. C’était ƟvƟ."),
    ] },
    { titre: "Le jardin de nuit", lignes: [
      G("La nuit, quand tout le monde dort, les plantes du jardin se parlent tout bas."),
      G("La lavande raconte sa journée aux abeilles endormies. Le thym fait semblant de ne pas écouter."),
      G("La mélisse passe dans les rangées et dit à chacune : « Respire, tout va bien. »"),
      G("Le tilleul, lui, prépare déjà la tisane de demain, avec beaucoup de sérieux."),
      G("Et avant de fermer leurs fleurs, elles disent toutes ensemble : « Bonne nuit, ƟvƟ. Merci de prendre soin de nous. »"),
    ] },
    { titre: "La lune et la tisane", lignes: [
      G("Un soir, la lune est descendue jusqu’au mazet. Elle avait un peu froid, là-haut."),
      G("On lui a fait une place près de la fenêtre et on lui a servi une tisane de tilleul."),
      G("Elle soufflait sur sa tasse et ça faisait de petits nuages argentés."),
      G("Elle nous a raconté les mers qu’elle éclaire, les chats qui la regardent, les gens qui n’arrivent pas à dormir."),
      G("Avant de remonter, elle a dit : « Ce soir, je brillerai juste un peu plus fort au-dessus de chez vous. »"),
      G("Regarde par la fenêtre : je crois qu’elle a tenu parole."),
    ] },
    { titre: "La goutte de rosée", lignes: [
      G("Il y avait une goutte de rosée qui voulait voir le lever du soleil."),
      G("Elle a glissé d’une feuille de sauge à une feuille de romarin, puis à un pétale de souci."),
      G("Chaque fois, elle se disait : « Encore un peu, et je verrai le soleil. »"),
      G("Au matin, elle s’est posée sur les lunettes d’ƟvƟ, qui arrosait le jardin."),
      G("Et à travers elles, elle a vu le plus beau lever de soleil de sa vie."),
    ] },
    { titre: "Le petit mistral", lignes: [
      G("Il était une fois un tout petit mistral qui n’arrivait pas à souffler fort."),
      G("Les grands mistrals se moquaient de lui : « Tu ne fais même pas tourner une girouette ! »"),
      G("Alors il est parti se promener dans les oliviers. Doucement."),
      G("Il a bercé les branches, il a rafraîchi les abeilles, il a fait danser les fleurs du jardin d’ƟvƟ."),
      G("Ce soir-là, tout le monde a dit que c’était le plus joli vent de la saison."),
      G("Parfois, on n’a pas besoin d’être fort. On a juste besoin d’être doux."),
    ] },
  ];

  // Balade en solo : de petites pensées sur ce qu'on voit et entend
  function pensees() {
    const s = H.ciel.etat();
    // (la nuit dès le coucher du soleil ; juste avant, le soir doré)
    const nuit = s.soleil.alt < 0, soir = !nuit && s.soleil.alt < 8;
    const lune = H.ciel.nomPhase(s.lune.phase);
    const base = soir
      ? [
          "Le soleil descend derrière les collines. Les calanques deviennent roses.",
          "La mer prend des reflets dorés, puis mauves.",
          "Les cigales se taisent. Un premier grillon commence, timidement.",
          "ƟvƟ s’assoit sur une pierre tiède pour regarder le soleil se coucher.",
          "Le vent du soir apporte une odeur de pin et de sel.",
        ]
      : nuit
      ? [
          "Le chemin longe la mer. On entend les vagues respirer contre les rochers.",
          "Au-dessus des calanques, le ciel est plein d’étoiles. Ce soir, c’est la " + lune + ".",
          "Un grillon chante quelque part dans le thym. Puis un autre lui répond.",
          "L’air sent le pin et la lavande. Toute la ferme dort, sauf la petite bougie de la cabane de lecture.",
          "ƟvƟ s’assoit un moment sur une pierre encore tiède du soleil de la journée.",
          "Une étoile filante traverse le ciel. Vite, un vœu !",
          "Le vent du soir fait bouger doucement les oliviers. Respirer, lentement.",
        ]
      : [
          "Le chemin longe la mer, entre les pins et les rochers blancs.",
          "Les calanques brillent au soleil. L’eau est d’un bleu presque vert.",
          "Une abeille s’affaire dans le romarin en fleurs. Elle ne s’arrête jamais.",
          "Le vent apporte une odeur de thym et de sel.",
          "ƟvƟ s’assoit un moment à l’ombre d’un pin pour regarder la mer.",
        ];
    return base.sort(() => Math.random() - 0.5).slice(0, 4).map((texte) => ({ qui: "ovo", nom: "Balade", texte }));
  }

  const auHasard = (liste) => liste[Math.floor(Math.random() * liste.length)];

  // les textes corrigés dans « Les textes du jeu » remplacent ceux d'origine
  const T = (cle, defaut) => (H.textes ? H.textes.valeur(cle, defaut) : defaut);
  H.histoires = {
    get LOLO() {
      return T("histoiresLolo", LOLO);
    },
    get LUIGI() {
      return T("histoiresMesi", LUIGI);
    },
    DEFAUTS: { histoiresLolo: LOLO, histoiresMesi: LUIGI },
    pensees,
    auHasard,
  };
})();
