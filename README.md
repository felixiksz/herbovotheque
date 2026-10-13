# L’herbothèque d’ƟvƟ

Mes notes sur le jeu que je prépare pour ƟvƟ.

Une herbothèque (des bocaux sur des étagères, une fiche page d’herbier par plante), un terrain d’îles-jardins façon Animal Crossing, et des flashcartes à répétition espacée qui rapportent de quoi faire pousser les jardins.

## Organisation

- `index.html` : la page unique. Les fichiers `css/` et `js/` sont numérotés dans l’ordre de chargement, avec un `?v=` à changer à chaque modification (`python tools/version.py` le fait partout, y compris dans `sw.js`).
- `data/base.enc` : les fiches plantes, **chiffrées** (mot de passe demandé au premier lancement). Les fiches d’origine ne doivent jamais être publiées en clair.
- `prive/` : les fiches en clair et les messages personnels, jamais envoyés sur GitHub (dans `.gitignore`).
- `fonts/` : Beth Ellen (titres, étiquettes), Kumar One (terrain), Caudex (texte), sous licence OFL. J’ai ajouté le caractère Ɵ (un O avec un point au milieu, comme des yeux) dans Beth Ellen et Kumar One (`tools/polices.py`).
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
- Bruitages dans `sons/` : miaou (appeler Luigi), attention (Luigi qui appelle au loin), pas (sur le chemin pavé), roll (la pluie), galop (Lóló). ƟvƟ peut enregistrer son propre miaou dans les Réglages.
- Messages personnels : `prive/messages.json` avec `{"message": "…", "messageIle": "…"}` (le premier s’affiche au tout premier lancement et dans la boîte aux lettres du village, le second sur l’île secrète).

## Données d’ƟvƟ

- Tout ce qu’iel modifie (fiches, rubriques, étagères, préparations, tisanes) va dans « l’herbier » ; la progression (cartes, ressources, îles) dans « le jeu ». Les deux restent dans le navigateur (IndexedDB).
- Synchronisation Mac / iPhone : un jeton GitHub à accès fin (Contents en lecture et écriture, sur ce dépôt seulement), collé une fois par appareil dans les Réglages. Les sauvegardes partent chiffrées sur la branche `sauvegardes`, pour ne pas reconstruire le site à chaque partie. En cas de conflit, la version la plus récente de chaque élément gagne.
- Réglages : téléchargement ou rechargement d’une sauvegarde de secours.

## Le jeu

- Ciel, saisons et météo du lieu choisi (Marseille par défaut, modifiable en voyage) ; la météo vient d’Open-Meteo, sans clé.
- Flashcartes : raté / difficile / bien / facile ; une carte vue au moins 3 fois sous le seuil de réussite (80 % par défaut) devient « fragile » et revient plus souvent. Chaque catégorie rapporte la ressource choisie dans « Ce que rapportent les cartes ». Après 40 cartes, pause de deux heures (une crêpe au chocolat fondu permet de repartir tout de suite).
- Terrain : îles de jeu (pousse en temps réel, ressources) ou croquis de projet (à l’échelle, sans ressources, export de la liste des plantes et de l’image). Rien ne meurt : une plante mal placée pousse lentement et dit pourquoi.
- Lóló (une fois son île découverte) : on l’appelle pour des astuces du jeu et les plantes en fleurs, à récolter et à semer du moment ; au village, on la touche pour lui parler.
- La pluie (roll) boucle sans couture : le jeu retire les silences du début et de la fin et fond le raccord.
- Luigi : on l’appelle (avec le miaou) et on lui pose des questions sur les plantes de l’île ; de temps en temps il appelle au loin, et ƟvƟ choisit de lui parler ou de lui faire un câlin et des bisous.
- Réglages : volume de la musique, des bruitages, de la pluie et du babillage (gardé sur chaque appareil).
- Stock : chaque préparation d’une fiche peut être pleine, à moitié, presque vide ou vide ; le bocal se vide à l’écran, un filtre de l’herbothèque montre ceux à remplir, et Lóló dit quand c’est la saison d’aller en cueillir.
- Lóló au galop : on entend d’abord le bruit, puis elle entre et s’arrête quand le son s’arrête.
- Chaque plante peut avoir son propre dessin sur la carte (fiche ou panneau de la plante sur l’île).
- Musique ambiante générée (voix en boucles de longueurs différentes, à la Music for Airports) : le mode suit la météo réelle (soleil lydien, pluie mineure, orage agité) et se feutre la nuit.
- L’île de Lóló et Mémé apparaît le 24 février.

## Pas sur Google

Balises `noindex` dans `index.html`. Le dépôt est public mais les fiches sont chiffrées.
