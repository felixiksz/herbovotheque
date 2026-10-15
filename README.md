# L’herbothèque d’ƟvƟ

Mes notes sur le jeu que je prépare pour ƟvƟ.

Une herbothèque (des bocaux sur des étagères, une fiche page d’herbier par plante), un terrain d’îles-jardins façon Animal Crossing, et des flashcartes à répétition espacée qui rapportent de quoi faire pousser les jardins.

## Organisation

- `index.html` : la page unique. Les fichiers `css/` et `js/` sont numérotés dans l’ordre de chargement, avec un `?v=` à changer à chaque modification (`python tools/version.py` le fait partout, y compris dans `sw.js`).
- `data/base.enc` : les fiches plantes, **chiffrées** (mot de passe demandé au premier lancement). Les fiches d’origine ne doivent jamais être publiées en clair.
- `prive/` : les fiches en clair et les messages personnels, jamais envoyés sur GitHub (dans `.gitignore`).
- `fonts/` : Beth Ellen (titres, étiquettes), Kumar One (terrain), Caudex (texte), Suez One (boutons), VT323 (menus des scènes), sous licence OFL. J’ai ajouté le caractère Ɵ (un O avec un point au milieu, comme des yeux) dans Beth Ellen et Kumar One (`tools/polices.py`).
- `sw.js` : le jeu marche hors connexion.

## Refaire les fiches chiffrées

```
python tools/extraire-fiches.py "Fiches-plantes.pdf"
python tools/normaliser-fiches.py "Fiches-plantes.pdf"
python tools/assembler.py
node tools/chiffrer.mjs <mot de passe>
python tools/version.py
```

- `tools/culture/*.json` : les rubriques « Au jardin » pré-remplies d’après le biotope et des guides de jardinage. Dans le jeu elles restent marquées « à vérifier » jusqu’à ce qu’ƟvƟ clique sur « C’est juste » ou les modifie.
- Le sel du chiffrement ne change jamais (`chiffrer.mjs` le réutilise) : sinon les sauvegardes synchronisées deviendraient illisibles.
- Bruitages dans `sons/` : miaou (appeler Mesi), attention (Mesi qui appelle au loin), pas (sur le chemin pavé), roll (la pluie), galop (Lóló). ƟvƟ peut enregistrer son propre miaou dans les Réglages.
- Messages personnels : `prive/messages.json` avec `{"message": "…", "messageIle": "…"}` (le premier s’affiche au tout premier lancement et dans la boîte aux lettres de la ferme, le second sur l’île secrète).

## Données d’ƟvƟ

- Tout ce qu’iel modifie (fiches, rubriques, étagères, préparations, tisanes) va dans « l’herbier » ; la progression (cartes, ressources, îles) dans « le jeu ». Les deux restent dans le navigateur (IndexedDB).
- Synchronisation Mac / iPhone : un jeton GitHub à accès fin (Contents en lecture et écriture, sur ce dépôt seulement), collé une fois par appareil dans les Réglages. Les sauvegardes partent chiffrées sur la branche `sauvegardes`, pour ne pas reconstruire le site à chaque partie. En cas de conflit, la version la plus récente de chaque élément gagne.
- Réglages : téléchargement ou rechargement d’une sauvegarde de secours.

## Le jeu

- Ciel, saisons et météo du lieu choisi (Marseille par défaut, modifiable en voyage) ; la météo vient d’Open-Meteo, sans clé.
- Flashcartes : raté / difficile / bien / facile ; une carte vue au moins 3 fois sous le seuil de réussite (80 % par défaut) devient « fragile » et revient plus souvent. Chaque catégorie rapporte la ressource choisie dans « Ce que rapportent les cartes ». Après 40 cartes, pause de deux heures (une crêpe au chocolat fondu permet de repartir tout de suite).
- Terrain : îles de jeu (pousse en temps réel, ressources) ou croquis de projet (à l’échelle, sans ressources, export de la liste des plantes et de l’image). Rien ne meurt : une plante mal placée pousse lentement et dit pourquoi.
- Lóló (une fois son île découverte) : on l’appelle pour des astuces du jeu et les plantes en fleurs, à récolter et à semer du moment ; au village, on la touche pour lui parler. Trois compliments dans la journée, et elle fait tomber une pluie de joie (dix minutes, arrose toutes les îles).
- La pluie (roll) boucle sans couture : le jeu retire les silences du début et de la fin et fond le raccord.
- Mesi : on l’appelle (avec le miaou) et on lui pose des questions sur les plantes de l’île ; de temps en temps il appelle au loin, et ƟvƟ choisit de lui parler ou de lui faire un câlin et des bisous.
- Réglages : volume de la musique, des bruitages, de la pluie et du babillage (gardé sur chaque appareil).
- Stock : chaque préparation d’une fiche peut être pleine, à moitié, presque vide ou vide ; le bocal se vide à l’écran, un filtre de l’herbothèque montre ceux à remplir, et Lóló dit quand c’est la saison d’aller en cueillir.
- Lóló au galop : on entend d’abord le bruit, puis elle entre et s’arrête quand le son s’arrête.
- Chaque plante peut avoir son propre dessin sur la carte (fiche ou panneau de la plante sur l’île).
- Musique ambiante générée (voix en boucles de longueurs différentes, à la Music for Airports) : le mode suit la météo réelle (soleil lydien, pluie mineure, orage agité) et se feutre la nuit.
- La ferme : herbothèque (tiny house sur roues), cabane à flashcartes (roulotte), cabane de lecture (cabane en A), labo (cabanon de pierre), chez ƟvƟ et Mesi (mazet), serre, ponton, boîte aux lettres. Autour, la garrigue des calanques : grands pins parasols au-dessus des toits (ombre selon le vrai soleil, terre rouge dessous), pins d’Alep, chênes verts, romarin, thym, cistes, lentisques, cades. ƟvƟ suit le chemin de terre. Les noms des lieux n’apparaissent qu’au survol ; sur téléphone, un premier toucher montre le nom, un second y entre. Goélands qui passent en criant, cigales les jours chauds d’été, criquets la nuit (vrais enregistrements).
- Labo : les récoltes des îles et les cueillettes (au mois de récolte) deviennent des préparations en temps réel (séchage 8 h, distillation 4 h, élixir 6 h, macérat de bourgeons 24 h, teinture et macérat huileux 48 h) qui remplissent les bocaux de l’herbothèque. Les tisanes du placard s’y infusent (5 min, +12 d’énergie) ; trois tasses font baisser d’un cran le bocal de chaque plante sèche.
- Balade : vue de côté, pas alternés ; le chemin passe par la terre rouge et ses rochers, où l’on peut se baigner. Mémé voyage debout sur le dos de Lóló.
- Boîte aux lettres : ƟvƟ et Mesi s’écrivent ; une lettre peut être programmée pour une date ; le drapeau rose se lève quand une lettre attend.
- Accès : chaque personne a son propre jeton à accès fin. La liste des accès (`data/acces.enc` sur la branche `sauvegardes`, chiffrée) ne garde que l’empreinte de chaque jeton, avec un nom et un rôle : la partie d’ƟvƟ ; l’appareil de Mesi, qui n’échange que les lettres et les textes et gère les accès dans les Réglages ; ou une partie d’essai à part (`data/essais/…`), invisible pour ƟvƟ. Le tout premier jeton relié devient celui de Mesi. « Les textes du jeu » (`#textes`) n’est ouvert que sur l’appareil de Mesi.
- Chez ƟvƟ et Mesi : Mesi prépare une crêpe au chocolat fondu quand il en reste dans les ressources.
- Nuit calme (22 h – 6 h) : flashcartes, terrain et serre dorment ; balades (avec Mesi, Lóló et Mémé, ou seul·e) et histoires (drames de Lóló, douceurs et compliments de Mesi, dans `js/63-histoires.js`, corrigeables depuis « Les textes du jeu ») ; cabane de lecture à la bougie, avec la pluie sur le toit.
- Serre : semis en pots (une graine), levée en 8 h, 4 h au bon mois de semis ; les bébés plantes se repiquent sur les îles (une pelletée de terre, peu d’énergie, et elles démarrent jeunes) ; les frileuses peuvent rester dans la serre.
- L’île de Lóló et Mémé apparaît le 24 février : un chemin en forme de cœur, un bassin au milieu (papyrus, nénuphars, grenouilles, canards, libellules), des papillons, beaucoup de romarin et de thym. Sur cette île, on demande à Mesi comment on dit en hongrois : il·elle propose un tour ensemble, ƟvƟ marche jusqu’à une plante ou une bête et la montre du doigt (`js/61-hongrois.js`). On peut emmener des canards, grenouilles, papillons et libellules sur ses propres îles. Lóló et Mémé sont là dès le début ; seule leur île attend le 24 février. Pour tout voir avant sur un appareil (tests) : l’adresse `#surprises`, ou la case de la rubrique « Mesi » des Réglages.

## Pas sur Google

Balises `noindex` dans `index.html`. Le dépôt est public mais les fiches sont chiffrées.

## Crédits des sons

Goélands (Freesound) : « Seagull single call » de steaq (CC0), « 16_2_Gaviotas_peleando » de ChristianAnd (CC0), « Seagull_byMondfisch89 » de Yudena / Mondfisch89 (CC BY-NC 4.0). Le WAV est passé en mono 22 kHz, sans les silences.

Criquets et cigales : « cricket » de trouby (Freesound n° 362404), « epic cricket bird chirping in distance », « cigales (cicadas) in Ardèche ». Passés en mono 22 kHz, en boucles d’une vingtaine de secondes (`sons/criquets.wav`, `sons/criquets-loin.wav`, `sons/cigales.wav`). Licences à noter ici.

Grenouilles du bassin (xeno-canto) : grenouille rieuse, XC896405 de Fabrice Schmitt, Les Mées (CC BY-NC-SA 4.0) ; alyte accoucheur, XC893214 de Tanguy Loïs, Laroque-de-Fa (CC BY-SA 4.0). Joués en boucle, la fin fondue dans le début (`sons/grenouille-rieuse.mp3`, `sons/alyte.mp3`).

Pas des sangliers : « boar steps », passé en mono 22 kHz, les chocs trop forts adoucis (`sons/sanglier.wav`). Licence à noter ici.
