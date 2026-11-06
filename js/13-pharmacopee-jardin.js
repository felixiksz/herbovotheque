// Les plantes de la pharmacopée chinoise au jardin : pour chaque plante du cours (les minéraux,
// les produits animaux, les champignons et l'algue n'y sont pas), son nom latin, sa famille, ce
// qu'il lui faut pour pousser (exposition, sol, eau, froid, et comment elle s'en sort au jardin
// méditerranéen) et de quoi la dessiner comme elle est vraiment : le port de ses feuilles et de ses
// fleurs, la couleur de ses fleurs, la silhouette des arbres et des arbustes.
// Une ligne par plante :
//   code | latin | famille | cycle | hauteur | espacement | exposition | sol | arrosage | sécheresse |
//   rusticité | jardin méditerranéen | multiplication | semis | plantation | floraison | récolte |
//   couleur des fleurs | dessin | entretien
// (exposition : S plein soleil, M mi-ombre, O ombre ; arrosage : F faible, M modéré, R régulier,
// A abondant ; sécheresse : f faible, m moyenne, b bonne, e excellente ; jardin méditerranéen :
// I idéale, B bien, O avec un peu d'ombre et d'eau, D difficile, P en pot ou en serre ; les mois en
// plages, « 11-2 » va de novembre à février ; le dessin : « port=alternes,grappeHaut » pour les
// herbes, « forme=etale;feuille=pennees;repro=grappes » pour les arbres et les arbustes)
(function () {
  const H = window.H;
  const DONNEES = `
A1|Rubus chingii|Rosaceae|Ab|1,5–3 m|1 m|SM|li,hu,dr|M|m|−15 °C|O|Bo,Ma,Dr||11-3|3-4|5-6|#ffffff|forme=arque;feuille=palmees;repro=cinq|On cueille les fruits encore verts ; tailler les cannes qui ont fructifié.
A3|Nelumbo nucifera|Nelumbonaceae|V|1–2 m|1 m|S|hm,ar,ri|A|f|−10 °C (rhizome sous l’eau)|B|Di,Se||4-5|7-8|8-10|#f6a8c8|port=peltees,solitaireHaut|Dans la mare ou un grand bac, sous 20 à 60 cm d’eau ; le rhizome ne doit pas geler.
A4|Euryale ferox|Nymphaeaceae|A|30 cm (feuilles flottantes de 1 m)|2 m|S|hm,ri|A|f|Annuelle (gélive)|P|Se|3-4||7-8|9-10|#b04a9a|port=peltees,solitaire|Plante aquatique : de grandes feuilles épineuses qui flottent ; il lui faut un bassin chaud.
A5|Myristica fragrans|Myristicaceae|Ar|5–15 m|6 m|M|hu,hm,ri,dr|R|f|Gèle (min. +10 °C)|P|Se,Gr|||1-12|1-12|#f3ecc0|forme=cone;feuille=ovales;repro=jaunes|Arbre tropical : seulement en serre chaude et humide.
A7|Cornus officinalis|Cornaceae|Ar|4–10 m|4 m|SM|li,hu,fr,dr|M|m|−20 °C|B|Se,Gr,Bo||11-3|2-3|9-11|#f2c94c|forme=etale;feuille=ovales;repro=baiesRouges|Fleurs jaunes sur le bois nu en fin d’hiver, puis des fruits rouges à l’automne.
A8|Prunus mume|Rosaceae|Ar|4–8 m|5 m|S|li,ar,dr|M|b|−15 °C|B|Gr,Se||11-3|1-3|5-6|#f6cfe0|forme=etale;feuille=dentees;repro=cinq|Fleurit en plein hiver, très parfumé ; tailler après la floraison.
A9|Schisandra chinensis|Schisandraceae|L|5–8 m|1,5 m|M|hu,fr,ac,dr|R|f|−30 °C|O|Se,Bo,Ma||10-11,3|5-6|9-10|#f3e0d0||Sur un support, à mi-ombre et au frais ; prendre une variété autofertile ou un pied de chaque sexe.
AF1|Tribulus terrestris|Zygophyllaceae|A|10–20 cm (rampante)|40 cm|S|sa,ca,se,pa,dr|F|e|Annuelle (gélive)|I|Se|4-5||6-9|8-10|#f2d43a|port=composees,solitaire|Ses fruits épineux blessent les pieds nus : en pot ou en bordure.
AF3|Uncaria rhynchophylla|Rubiaceae|L|5–10 m|2 m|M|hu,fr,ac|R|f|−5 °C|D|Bo,Se||4|6-7|9-11|#f2e6a0||Liane grimpante à crochets ; à abriter du gel l’hiver.
AF7|Gastrodia elata|Orchidaceae|V|0,3–1,5 m|30 cm|O|hu,fr,ac|R|f|−20 °C|D|Bu||11-3|6-7|11-3|#c9a070|port=prele,epiHaut|Orchidée sans feuilles qui vit avec un champignon (l’armillaire) : il faut l’enfouir avec du bois inoculé.
AH1|Amomum kravanh|Zingiberaceae|V|2–3 m|1 m|M|hu,hm,ri|A|f|Gèle (min. +5 °C)|P|Di,Se||5|4-5|7-8|#f3e6c8||Tropicale : en serre ou en véranda, avec beaucoup d’eau.
AH2|Atractylodes lancea|Asteraceae|V|30–80 cm|30 cm|SM|sa,li,dr|M|b|−20 °C|B|Se,Di|3-4|3,10|8-10|10-11|#f3f0dc||On récolte le rhizome à partir de la deuxième année.
AH3|Alpinia katsumadai|Zingiberaceae|V|1,5–3 m|1 m|M|hu,hm,ri|A|f|Gèle (min. 0 °C)|P|Di||5|4-6|7-8|#f3f0dc||Tropicale : en serre ou en grand pot rentré l’hiver.
AH4|Pogostemon cablin|Lamiaceae|V|60 cm–1 m|50 cm|M|hu,fr,ri,dr|R|f|Gèle (min. +5 °C)|P|Bo||5||6-10|#e8c8e8||Le patchouli : en pot, rentré l’hiver ; se bouture très facilement.
AH5|Magnolia officinalis|Magnoliaceae|Ar|10–20 m|8 m|SM|hu,ac,fr,pr|R|f|−20 °C|O|Se,Ma||11,3|5-6|4-6|#f8f2e0|forme=ovale;feuille=ovales;repro=cinq|Très grandes feuilles et grosses fleurs blanches parfumées ; sol frais et sans calcaire.
AH6|Amomum villosum|Zingiberaceae|V|1,5–3 m|1 m|MO|hu,hm,ri|A|f|Gèle (min. +5 °C)|P|Di||5|5-6|8-9|#f3f0dc||Tropicale : serre chaude, ombre et humidité.
AS1|Artemisia argyi|Asteraceae|V|0,8–1,5 m|50 cm|S|li,sa,dr|M|b|−25 °C|I|Di,Se||3,10|7-9|5-6|#c8c890||Ses rhizomes courent vite : à contenir ; cueillir les feuilles avant la floraison.
AS2|Bletilla striata|Orchidaceae|V|30–60 cm|20 cm|M|hu,fr,dr|M|m|−15 °C|O|Di,Bu||3,10|4-6|9-10|#c84aa0|port=eventail,grappeHaut|Orchidée de jardin facile : feuilles plissées, fleurs magenta au printemps.
AS3|Imperata cylindrica|Poaceae|V|30–80 cm|30 cm|S|sa,se,dr|F|e|−20 °C|I|Di||3-4|5-6|3-4,9-10|#f3f0dc|port=graminee,panicule|Très envahissante par ses rhizomes : en pot, ou la forme stérile « Red Baron ».
AS4|Platycladus orientalis|Cupressaceae|Ar|6–15 m|4 m|S|ca,cl,se,dr|F|e|−25 °C|I|Se,Bo||10-11,3|3-4|6-10||forme=colonne|Très rustique et très résistant au sec ; aime le calcaire.
AS5|Sanguisorba officinalis|Rosaceae|V|0,5–1,5 m|50 cm|SM|hu,fr,hm,ri|R|f|−30 °C|O|Se,Di||3,10|7-9|10-11|#6a1f3d|port=rosetteTige,epiHaut|Aime les sols frais ; ses petits épis rouge sombre attirent les papillons.
AS6|Nelumbo nucifera|Nelumbonaceae|V|1–2 m|1 m|S|hm,ar,ri|A|f|−10 °C (rhizome sous l’eau)|B|Di,Se||4-5|7-8|9-11|#f6a8c8|port=peltees,solitaireHaut|Dans la mare ou un grand bac, sous 20 à 60 cm d’eau.
AS7|Zingiber officinale|Zingiberaceae|V|60 cm–1 m|30 cm|M|hu,ri,fr,dr|R|f|Gèle (min. +5 °C)|O|Di||4-5|8-9|10-11|#e8d460|port=distiques,aucune|Planter un morceau de rhizome bourgeonné au printemps, récolter avant les froids.
AS8|Typha angustifolia|Typhaceae|V|1,5–3 m|50 cm|S|hm,ar,ri|A|f|−30 °C|B|Di,Se||4-5|6-7|6-7|#c99a3a|port=lineaires,epiHaut|Au bord de la mare, les pieds dans 10 à 30 cm d’eau ; colonise vite.
AS9|Rubia cordifolia|Rubiaceae|V|1–3 m (grimpante)|50 cm|SM|li,hu,dr|M|m|−20 °C|B|Se,Di||3,10|7-8|10-11|#f2e6a0||Tiges accrochantes qui grimpent sur les voisines.
AS10|Panax notoginseng|Araliaceae|V|30–60 cm|25 cm|O|hu,ac,fr,dr|R|f|−5 °C|D|Se|11-12||7-8|9-10|#e8e070|port=verticillees,ombelleHaut|Sous une ombrière, en sol de sous-bois ; on récolte après 3 à 7 ans.
AS11|Agrimonia pilosa|Rosaceae|V|0,5–1,2 m|40 cm|SM|li,dr|M|b|−30 °C|B|Se,Di|3-4||6-9|6-8|#f2d43a|port=rosetteTige,epiHaut|Facile ; ses fruits crochus s’accrochent aux vêtements.
AS12|Cirsium arvense|Asteraceae|V|0,3–1,2 m|40 cm|S|li,ar|M|b|−30 °C|B|Se,Dr|||6-8|5-7|#c86ab8||Très envahissant par ses racines : en pot seulement.
CE1|Platycladus orientalis|Cupressaceae|Ar|6–15 m|4 m|S|ca,cl,se,dr|F|e|−25 °C|I|Se,Bo||10-11,3|3-4|9-11||forme=colonne|Très rustique et très résistant au sec ; aime le calcaire.
CE2|Albizia julibrissin|Fabaceae|Ar|6–10 m|6 m|S|sa,li,dr|F|b|−15 °C|I|Se||10-11,3|6-8|6-9|#f6a8c8|forme=etale;feuille=pennees;repro=etamines|L’arbre à soie : des pompons roses tout l’été ; se ressème.
CE3|Ziziphus jujuba var. spinosa|Rhamnaceae|Ab|1–4 m|2 m|S|ca,cl,se,dr|F|e|−20 °C|I|Se,Dr||10-11,3|6-7|9-10|#e8e070|forme=multitige;feuille=ovales;repro=baiesRouges|Épineux et très résistant au sec : parfait en garrigue.
CE4|Polygala tenuifolia|Polygalaceae|V|20–40 cm|20 cm|S|sa,ca,se,dr|F|b|−25 °C|B|Se|3-4||5-7|10-11|#8a6ad8||Petite vivace des sols secs et pauvres.
CF1|Senna obtusifolia|Fabaceae|A|0,5–2 m|50 cm|S|li,sa,dr|M|m|Annuelle (gélive)|B|Se|4-5||7-9|9-11|#f2c94c||Semer au chaud ; les gousses mûrissent en fin d’été.
CF2|Phragmites australis|Poaceae|V|1,5–4 m|1 m|S|hm,ar|A|f|−30 °C|B|Di||4|8-10|1-12|#8a5a6a|port=graminee,panicule|Au bord de l’eau ; extrêmement envahissant.
CF4|Trichosanthes kirilowii|Cucurbitaceae|L|3–8 m|1,5 m|SM|hu,fr,pr,dr|R|m|−15 °C|B|Se,Di||4-5|6-8|10-11|#ffffff||Fleurs blanches frangées la nuit ; un pied mâle et un pied femelle pour les fruits ; sur un treillis.
CF5|Prunella vulgaris|Lamiaceae|V|10–30 cm|25 cm|SM|li,fr|M|m|−30 °C|B|Se,Di|3-4||5-7|6-7|#8a6ad8||Couvre-sol facile ; on cueille les épis quand ils brunissent.
CF6|Anemarrhena asphodeloides|Asparagaceae|V|60 cm–1 m|30 cm|S|sa,se,dr|F|e|−25 °C|I|Se,Di||3,10|6-8|10-11,3-4|#e8c8e8|port=lineaires,epiHaut|Touffe de feuilles fines et longs épis de fleurs ; aime le sec.
CF7|Gardenia jasminoides|Rubiaceae|Ab|1–2 m|1 m|M|ac,hu,fr,dr|R|f|−5 °C|D|Bo||4-5,10|5-7|10-11|#f8f2e0|forme=boule;feuille=ovales;repro=cinq|Terre de bruyère et eau sans calcaire : en pot à Marseille.
CHU1|Phellodendron amurense|Rutaceae|Ar|10–15 m|8 m|S|li,pr,fr|M|m|−30 °C|B|Se||11,3|5-6|5-6|#c8d070|forme=etale;feuille=pennees;repro=baies|L’arbre au liège de l’Amour : écorce épaisse et liégeuse ; pieds mâles et femelles.
CHU2|Coptis chinensis|Ranunculaceae|V|20–50 cm|20 cm|O|hu,ac,fr,hm|R|f|−10 °C|D|Se,Di||10-11|2-3|10-11|#f3f0dc|port=rosette,solitaire|Sous-bois très ombragé, frais et humide toute l’année ; récolte après 5 ans.
CHU3|Scutellaria baicalensis|Lamiaceae|V|30–60 cm|30 cm|S|sa,ca,se,dr|F|e|−30 °C|I|Se|3-4||7-8|10-11,3|#5a5ad8||Pousse dans les sols pauvres et secs : parfaite en garrigue.
CHU4|Sophora flavescens|Fabaceae|Ab|1–2 m|1 m|S|sa,li,dr|F|b|−20 °C|I|Se||3,10|6-8|9-10|#f3e6a0|forme=dresse;feuille=pennees;repro=epis|Sous-arbrisseau aux longues grappes jaune pâle.
CHU5|Gentiana scabra|Gentianaceae|V|30–60 cm|25 cm|SM|hu,ac,fr|R|f|−30 °C|D|Se,Di||3,10|9-10|10-11|#3d5ee8||Fleurs bleu vif en automne ; sol frais et acide.
CS1|Paeonia lactiflora|Paeoniaceae|V|60 cm–1 m|80 cm|S|li,ar,pr,ri,dr|M|b|−35 °C|B|Di||10-11|5-6|9-10|#e8608a|port=composees,solitaireHaut|Ne pas enterrer les bourgeons à plus de 3 cm ; elle déteste être déplacée.
CS2|Paeonia × suffruticosa|Paeoniaceae|Ab|1–2 m|1,2 m|SM|li,cl,dr,pr|M|b|−20 °C|B|Gr,Di,Ma||10-11|4-5|9-10|#e8608a|forme=multitige;feuille=pennees;repro=cinq|La pivoine arbustive : d’énormes fleurs au printemps ; à l’abri des vents.
CS3|Rehmannia glutinosa|Orobanchaceae|V|15–30 cm|25 cm|S|sa,li,dr,ri|M|b|−15 °C|B|Di,Se||3-4|4-6|10-11|#c86a6a|port=rosette,grappeHaut|Rosette velue, fleurs en trompette ; on replante des morceaux de racine.
CS4|Scrophularia ningpoensis|Scrophulariaceae|V|1–1,5 m|40 cm|SM|hu,pr,fr,dr|R|m|−15 °C|B|Di,Se||3,11|7-8|10-11|#6a1f3d|port=opposees,panicule|Grandes tiges carrées ; petites fleurs brun pourpre qui plaisent aux guêpes.
CS5|Lithospermum erythrorhizon|Boraginaceae|V|40–90 cm|30 cm|S|sa,ca,dr|F|b|−25 °C|B|Se|3-4||6-8|10-11|#f3f0dc||Sa racine teint en violet ; sol léger et sec.
CSS1|Ligusticum chuanxiong|Apiaceae|V|40–70 cm|30 cm|M|hu,fr,ri,dr|R|f|−10 °C|O|Di||3,8-9|7-8|5-6|#f8f2e0||On la multiplie en replantant les nœuds des tiges.
CSS2|Salvia miltiorrhiza|Lamiaceae|V|40–80 cm|30 cm|S|sa,li,dr|M|b|−20 °C|I|Se,Di|3-4||4-8|10-11|#8a6ad8||Sauge aux racines rouges ; facile au soleil.
CSS3|Curcuma phaeocaulis|Zingiberaceae|V|1–1,5 m|50 cm|M|hu,ri,fr|R|f|Gèle (min. +5 °C)|P|Di||4-5|3-5|12-2|#e87ab8|port=distiques,epiHaut|Rhizomes à rentrer à l’abri du gel.
CSS4|Carthamus tinctorius|Asteraceae|A|60 cm–1 m|30 cm|S|sa,ca,se,dr,cl|F|e|Annuelle (gélive)|I|Se|3-4||6-8|6-8|#f08a2a||Le carthame : capitules orange, cueillis en pleine floraison.
CSS5|Spatholobus suberectus|Fabaceae|L|10 m et plus|3 m|SM|hu,fr|R|f|Gèle (min. +5 °C)|P|Se,Bo|||6-7|9-10|#f3f0dc||Grande liane tropicale : seulement en serre.
CSS6|Curcuma longa|Zingiberaceae|V|60 cm–1 m|40 cm|M|hu,ri,fr,dr|R|f|Gèle (min. +5 °C)|O|Di||4-5|8|11-12|#f3f0dc|port=distiques,epiHaut|Dehors l’été, à mi-ombre ; rentrer ou récolter les rhizomes avant le froid.
CSS7|Commiphora myrrha|Burseraceae|Ab|2–4 m|2 m|S|sa,ca,se,dr|F|e|Gèle (min. +5 °C)|P|Se,Bo|||4-5|6-9|#c8401a|forme=etale;feuille=petites|Arbuste épineux des déserts : en pot, au sec, à l’abri du gel.
CSS8|Achyranthes bidentata|Amaranthaceae|V|0,6–1,2 m|40 cm|SM|li,pr,fr,dr|M|m|−10 °C|B|Se|4-5||7-9|11-12|#c8d070|port=opposees,epi|Longue racine : sol profond et meuble.
CSS9|Boswellia sacra|Burseraceae|Ar|2–8 m|4 m|S|ca,cl,se,dr|F|e|Gèle (min. +5 °C)|P|Se,Bo|||4-5|4-6|#f3e6c8|forme=etale;feuille=pennees|L’arbre à encens : en pot, au sec, à l’abri du gel.
CSS10|Sparganium stoloniferum|Typhaceae|V|0,6–1,2 m|40 cm|S|hm,ar|A|f|−20 °C|B|Di||4-5|6-7|10-11|#f3f0dc|port=lineaires,capitule|Plante de berge : boules de fleurs blanches au-dessus de l’eau.
CSS11|Prunus persica|Rosaceae|Ar|3–8 m|5 m|S|li,dr,pr|M|m|−20 °C|I|Gr,Se||11-2|2-4|7-9|#f6a8c8|forme=etale;feuille=lanceolees;repro=cinq|Tailler en fin d’hiver ; sensible à la cloque.
CSS12|Corydalis yanhusuo|Papaveraceae|V|10–20 cm|15 cm|M|hu,fr,dr|M|m|−15 °C|O|Bu||9-10|3-4|5|#c86ab8|port=rosette,grappeHaut|Éphémère de printemps : elle disparaît dès mai.
CSS13|Leonurus japonicus|Lamiaceae|Bi|0,6–1,2 m|40 cm|S|li,dr|M|b|−15 °C|B|Se|3-4,9||6-9|5-7|#e87ab8||Se ressème toute seule.
CSS14|Curcuma wenyujin|Zingiberaceae|V|1–1,5 m|50 cm|M|hu,ri,fr|R|f|Gèle (min. +5 °C)|P|Di||4-5|4-6|12-2|#f3f0dc|port=distiques,epiHaut|Rhizomes à rentrer à l’abri du gel.
CT1|Pulsatilla chinensis|Ranunculaceae|V|15–35 cm|25 cm|S|sa,ca,cl,dr|F|b|−30 °C|B|Se|6-7||3-4|3-4,8-10|#8a5ac8|port=rosette,solitaire|Plumets argentés après la floraison ; craint l’eau stagnante.
CT2|Isatis tinctoria|Brassicaceae|Bi|0,6–1,2 m|40 cm|S|li,cl,dr|M|b|−20 °C|I|Se|3-4,9||4-5|10-11|#f2d43a||Le pastel des teinturiers : se ressème beaucoup.
CT3|Lonicera japonica|Caprifoliaceae|L|4–10 m|1,5 m|SM|li,dr|M|b|−20 °C|I|Bo,Ma,Se||10-11,3|5-9|5-6|#f8f2e0||Vigoureux : à tailler, sinon il envahit tout.
CT4|Forsythia suspensa|Oleaceae|Ab|2–3 m|2 m|SM|li,cl,dr|M|b|−25 °C|B|Bo,Ma||10-11,3|2-4|8-10|#f2c94c|forme=arque;feuille=ovales;repro=jaunes|Rameaux retombants couverts de jaune à la fin de l’hiver ; tailler après la floraison.
CT5|Taraxacum mongolicum|Asteraceae|V|10–25 cm|20 cm|SM|li,dr|M|b|−30 °C|I|Se|3-5,9||3-6|4-6|#f2d43a|port=rosette,solitaireHaut|Le pissenlit de Mongolie : se ressème partout.
CT6|Iris domestica|Iridaceae|V|50 cm–1 m|30 cm|S|sa,li,dr|F|b|−15 °C|I|Di,Se||3,10|7-8|10-11|#f08a2a||Fleurs orange tachetées, puis des graines noires comme des mûres.
CT7|Houttuynia cordata|Saururaceae|V|20–50 cm|30 cm|MO|hm,hu,fr|A|f|−20 °C|O|Di||3-4|5-7|6-9|#f8f2e0|port=alternes,epi|Très envahissante en sol humide : en pot, ou au bord de la mare.
CT8|Viola philippica|Violaceae|V|5–15 cm|15 cm|M|hu,fr|M|m|−20 °C|B|Se,Di|3||3-5|4-6|#8a5ac8||Petite violette qui se ressème dans les coins frais.
CV1|Lycium chinense|Solanaceae|Ab|1–3 m|1,5 m|S|sa,cl,se,dr|F|e|−25 °C|I|Bo,Se,Dr||10-11,3|5-9|3-4|#8a6ad8|forme=arque;feuille=lanceolees;repro=baiesRouges|Le lyciet : rameaux souples et retombants ; drageonne.
CV2|Artemisia annua|Asteraceae|A|1–2 m|60 cm|S|li,dr|M|m|Annuelle (gélive)|I|Se|3-4||8-10|7-8|#e8e070||Se ressème partout ; feuillage très parfumé.
EH1|Plantago asiatica|Plantaginaceae|V|20–50 cm|25 cm|SM|li,ar,fr|M|m|−25 °C|B|Se|3-4||5-8|7-9|#c8d070||Facile ; on récolte les épis quand les graines brunissent.
EH2|Vigna angularis|Fabaceae|A|30–90 cm|30 cm|S|li,dr,ri|R|m|Annuelle (gélive)|B|Se|5-6||7-8|9-10|#f2d43a||L’haricot azuki : semer quand la terre est chaude.
EH5|Akebia quinata|Lardizabalaceae|L|5–10 m|2 m|SM|hu,fr,dr|M|m|−20 °C|B|Bo,Ma,Se||10-11,3|3-4|8-9|#6a1f5a||Fleurs chocolat parfumées au printemps ; deux pieds pour avoir des fruits.
EH6|Tetrapanax papyrifer|Araliaceae|Ab|3–6 m|3 m|SM|hu,fr,ri|R|m|−10 °C|B|Dr,Se||4-5|10-12|9-11|#f3f0dc|forme=multitige;feuille=palmees;repro=ombelles|D’énormes feuilles palmées ; drageonne beaucoup.
EH7|Coix lacryma-jobi|Poaceae|A|1–2 m|40 cm|S|li,hm,ri|R|f|Annuelle (gélive)|B|Se|4-5||7-9|9-10|#c8d070|port=graminee,panicule|Les larmes de Job : des graines dures et brillantes.
EH8|Artemisia capillaris|Asteraceae|V|40 cm–1 m|40 cm|S|sa,ca,se,dr|F|e|−20 °C|I|Se,Di||3,10|8-10|3-4|#e8e070||On récolte les jeunes pousses au printemps.
EH9|Alisma plantago-aquatica|Alismataceae|V|50 cm–1 m|30 cm|S|hm,ar|A|f|−25 °C|B|Se,Di||4-6|6-8|11-12|#f8e0f0|port=rosette,panicule|Plante de berge, sous 5 à 20 cm d’eau.
FD2|Raphanus sativus|Brassicaceae|A|30 cm–1 m (en graines)|30 cm|S|li,fr,dr|R|m|−5 °C|I|Se|2-4,8-9||4-6|6-7|#f3e0f0||Le radis qu’on laisse monter en graines.
FD3|Hordeum vulgare|Poaceae|A|60 cm–1 m|15 cm|S|li,cl,dr|M|b|−15 °C|I|Se|10-11,3||4-5|6-7|#c8b070|port=graminee,epiHaut|L’orge : semée à l’automne, récoltée au début de l’été.
FD4|Crataegus pinnatifida|Rosaceae|Ar|4–6 m|4 m|S|li,cl,dr|M|b|−30 °C|I|Gr,Se||11-2|5-6|9-10|#f8f2e0|forme=boule;feuille=lobees;repro=baiesRouges|L’azerolier de Chine : gros fruits rouges à l’automne.
LD1|Cannabis sativa|Cannabaceae|A|1–3 m|50 cm|S|li,ri,dr|M|m|Annuelle (gélive)|B|Se|4-5||7-9|9-10|#c8d070|port=opposees,panicule|Culture réglementée : seulement les variétés de chanvre autorisées.
LD2|Prunus japonica|Rosaceae|Ab|1–1,5 m|1 m|S|li,dr|M|b|−30 °C|B|Se,Bo,Dr||11-3|4|7-8|#f6cfe0|forme=multitige;feuille=dentees;repro=cinq|Petit cerisier buissonnant, couvert de fleurs roses.
NY1|Lilium brownii|Liliaceae|V|1–1,5 m|30 cm|SM|li,hu,dr|M|m|−20 °C|B|Bu||10-11,3|6-8|9-10|#f8f2e0|port=alternes,solitaireHaut|Planter le bulbe profond (15 cm) dans un sol bien drainé.
NY2|Glehnia littoralis|Apiaceae|V|10–30 cm|25 cm|S|sa,dr|F|b|−20 °C|B|Se|10-11||5-7|7-9|#f8f2e0||Plante des dunes du bord de mer : sable pur.
NY4|Lycium barbarum|Solanaceae|Ab|1–3 m|1,5 m|S|sa,cl,se,dr|F|e|−25 °C|I|Bo,Se,Dr||10-11,3|5-9|8-10|#8a6ad8|forme=arque;feuille=lanceolees;repro=baiesRouges|Le goji : baies rouges de l’été à l’automne ; drageonne.
NY6|Polygonatum sibiricum|Asparagaceae|V|50 cm–1 m|30 cm|OM|hu,fr,ac|M|f|−30 °C|O|Di||10-11,3|5-6|9-10|#f3f0dc|port=alternes,grappe|Tiges arquées, clochettes blanches pendantes ; sous-bois frais.
NY7|Ophiopogon japonicus|Asparagaceae|V|15–30 cm|20 cm|MO|hu,fr,dr|M|b|−15 °C|I|Di||3-4,10|7-8|4-5|#c8b0e8|port=lineaires,epiHaut|Couvre-sol très résistant, même à l’ombre sèche.
NY8|Adenophora tetraphylla|Campanulaceae|V|40 cm–1 m|30 cm|SM|hu,dr|M|m|−25 °C|B|Se|3-4||8-10|9-11|#8a8ae8|port=verticillees,grappe|Clochettes bleues pendantes en fin d’été.
NY9|Ligustrum lucidum|Oleaceae|Ar|6–10 m|5 m|SM|li,cl,dr|M|b|−15 °C|I|Se,Bo||10-11,3|6-7|11-1|#f8f2e0|forme=ovale;feuille=ovales;repro=olives|Supporte la sécheresse et la taille ; fruits noirs l’hiver.
NY10|Polygonatum odoratum|Asparagaceae|V|30–60 cm|30 cm|OM|hu,fr|M|f|−30 °C|O|Di||10-11,3|4-5|9-10|#f3f0dc|port=alternes,grappe|Le sceau de Salomon odorant : sous-bois frais.
OO1|Blumea balsamifera|Asteraceae|Ab|1–3 m|1 m|S|li,dr|M|m|Gèle (min. +5 °C)|P|Se,Bo|||1-4|9-11|#f2d43a|forme=dresse;feuille=lanceolees;repro=epis|Arbuste tropical au parfum de camphre : en pot rentré l’hiver.
OO3|Acorus gramineus|Acoraceae|V|20–40 cm|20 cm|MO|hm,hu|A|f|−15 °C|O|Di||3-4|4-6|9-11|#c8d070|port=eventail,aucune|Au bord de la mare ou dans un pot toujours humide.
PE1|Croton tiglium|Euphorbiaceae|Ab|3–6 m|3 m|SM|hu,dr|R|m|Gèle (min. +5 °C)|P|Se,Bo|||4-6|8-10|#f3f0dc|forme=boule;feuille=ovales;repro=grappes|Toutes les parties sont très toxiques.
PE2|Euphorbia kansui|Euphorbiaceae|V|20–40 cm|30 cm|S|sa,se,dr|F|e|−20 °C|B|Se,Di||3,10|4-6|3-4,10-11|#c8d070|port=alternes,ombelleHaut|Son latex est toxique et irritant : des gants pour la manipuler.
PE3|Euphorbia pekinensis|Euphorbiaceae|V|30–80 cm|30 cm|S|sa,se,dr|F|e|−25 °C|B|Se,Di||3,10|5-6|9-10|#c8d070|port=alternes,ombelleHaut|Son latex est toxique et irritant : des gants pour la manipuler.
PE4|Daphne genkwa|Thymelaeaceae|Ab|50 cm–1 m|80 cm|SM|sa,li,dr|M|b|−20 °C|B|Se,Bo||10-11|3-4|3-4|#b8a0e8|forme=multitige;feuille=lanceolees;repro=corymbes|Fleurs lilas sur le bois nu au printemps ; très toxique.
PF1|Mentha canadensis|Lamiaceae|V|30–80 cm|30 cm|SM|hu,fr,hm|R|f|−25 °C|O|Di,Bo||3-4,10|7-9|6-9|#c8b0e8||Envahissante : en pot, arrosée régulièrement.
PF2|Bupleurum chinense|Apiaceae|V|40–80 cm|25 cm|S|sa,ca,dr|F|b|−25 °C|I|Se|3-4,10||7-9|3-4,10-11|#f2d43a|port=alternes,ombelle|Feuilles fines et entières, petites ombelles jaunes.
PF4|Pueraria montana var. lobata|Fabaceae|L|10–20 m|3 m|S|li,dr,pr|M|b|−20 °C|P|Se,Bo,Ma|||7-9|10-3|#a04ab8||Le kudzu : espèce invasive réglementée dans l’Union européenne, à ne pas planter en pleine terre.
PF5|Chrysanthemum morifolium|Asteraceae|V|50 cm–1 m|40 cm|S|li,ri,dr|M|m|−15 °C|I|Bo,Di||4-5|9-11|10-11|#f2d43a||Pincer les tiges au printemps pour qu’il se ramifie.
PF6|Arctium lappa|Asteraceae|Bi|1–2 m|80 cm|SM|pr,li,ri|M|m|−30 °C|B|Se|3-5||7-9|8-10|#c86ab8|port=rosetteTige,capitule|Grande rosette la première année, fleurs et fruits accrocheurs la deuxième.
PF7|Morus alba|Moraceae|Ar|5–15 m|6 m|S|li,cl,dr|M|b|−25 °C|I|Bo,Gr,Se||11-3|4-5|10-11|#c8d070|forme=boule;feuille=cordees;repro=mures|On cueille les feuilles après les premières gelées.
PF8|Actaea cimicifuga|Ranunculaceae|V|1–2 m|60 cm|MO|hu,fr,ri|R|f|−30 °C|O|Di,Se||10-11,3|7-9|9-10|#f8f2e0|port=composees,epiHaut|Longues chandelles blanches à mi-ombre ; sol frais.
PT1|Angelica dahurica|Apiaceae|V|1–2,5 m|60 cm|SM|li,pr,fr,ri|R|m|−25 °C|O|Se|9-10||7-8|7-9|#f8f2e0||Semer les graines fraîches à l’automne ; récolter la racine avant la floraison.
PT2|Xanthium strumarium|Asteraceae|A|30 cm–1 m|50 cm|S|li,ar|M|b|Annuelle (gélive)|B|Se|4-5||7-8|9-10|#c8d070||Fruits accrocheurs ; plante toxique, à garder à l’œil.
PT3|Saposhnikovia divaricata|Apiaceae|V|30–80 cm|30 cm|S|sa,ca,se,dr|F|e|−30 °C|I|Se|3-4,9-10||8-9|10-11,3|#f8f2e0||Aime les sols secs et pauvres.
PT4|Cinnamomum cassia|Lauraceae|Ar|10–15 m|6 m|M|hu,ac,fr,dr|R|f|−5 °C|P|Se,Bo||4-5|6-8|3-4|#f3f0dc|forme=ovale;feuille=lanceolees;repro=jaunes|Le cannelier de Chine : en grand pot, à l’abri du froid.
PT5|Schizonepeta tenuifolia|Lamiaceae|A|30 cm–1 m|25 cm|S|li,sa,dr|M|m|Annuelle (gélive)|I|Se|4-5||7-9|8-9|#c8b0e8||Semer au printemps ; on récolte en fleurs.
PT6|Ephedra sinica|Ephedraceae|Ab|20–40 cm|30 cm|S|sa,ca,se,dr|F|e|−30 °C|I|Di,Se||3,10|5-6|9-10|#c8d070|port=prele,aucune|Tiges vertes sans feuilles ; parfaite en rocaille sèche.
PT7|Notopterygium incisum|Apiaceae|V|60 cm–1,2 m|40 cm|M|hu,fr,ac|R|f|−30 °C|D|Se,Di|||7-8|9-10|#f8f2e0||Plante de haute montagne : difficile au chaud.
PT8|Zingiber officinale|Zingiberaceae|V|60 cm–1 m|30 cm|M|hu,ri,fr,dr|R|f|Gèle (min. +5 °C)|O|Di||4-5|8-9|10-11|#e8d460|port=distiques,aucune|Planter un morceau de rhizome bourgeonné au printemps, récolter avant les froids.
PT9|Asarum heterotropoides|Aristolochiaceae|V|10–20 cm|20 cm|O|hu,fr,ac|R|f|−30 °C|D|Di||9-10|4-5|5-7|#6a1f3d|port=peltees,solitaire|Feuilles en cœur au ras du sol, fleurs brunes cachées dessous.
PT10|Mosla chinensis|Lamiaceae|A|20–50 cm|20 cm|S|sa,ca,dr|F|b|Annuelle (gélive)|I|Se|4-5||7-9|8-9|#c8a0e8||Petite annuelle parfumée des sols secs.
PT11|Magnolia biondii|Magnoliaceae|Ar|6–12 m|6 m|SM|hu,fr,ac,pr|M|m|−25 °C|O|Se,Ma,Gr||10-11,3|2-4|1-3|#f8e0f0|forme=ovale;feuille=ovales;repro=cinq|On cueille les boutons velus en fin d’hiver ; craint le calcaire.
PT12|Perilla frutescens|Lamiaceae|A|50 cm–1,2 m|30 cm|SM|li,fr,ri|R|m|Annuelle (gélive)|I|Se|4-5||8-10|7-9|#e8c8e8||Le shiso : feuillage pourpre ; se ressème.
PT13|Perilla frutescens|Lamiaceae|A|50 cm–1,2 m|30 cm|SM|li,fr,ri|R|m|Annuelle (gélive)|I|Se|4-5||8-10|9-10|#e8c8e8||Le shiso : feuillage pourpre ; se ressème.
PUF1|Rheum palmatum|Polygonaceae|V|1,5–2,5 m|1,2 m|SM|hu,pr,ri,fr|R|f|−30 °C|D|Di,Se||10-11,3|6-7|9-10|#e86a6a|port=rosette,panicule|Énorme rosette de feuilles découpées ; souffre de la chaleur sèche.
PUF2|Senna alexandrina|Fabaceae|Ab|50 cm–1,5 m|60 cm|S|sa,ca,se,dr|F|e|Gèle (min. 0 °C)|P|Se|4-5||7-9|8-10|#f2d43a|forme=dresse;feuille=pennees;repro=grappes|Le séné : en pot, rentré l’hiver.
RQ1|Citrus reticulata|Rutaceae|Ar|2–5 m|4 m|S|li,dr,ri|R|m|−7 °C|B|Gr,Se||4-5|4-5|11-1|#f8f2e0||Le mandarinier : au soleil, à l’abri du mistral.
RQ2|Melia toosendan|Meliaceae|Ar|8–15 m|8 m|S|li,se,dr|F|e|−15 °C|I|Se||11-3|4-5|11-12|#c8b0e8|forme=etale;feuille=pennees;repro=grappes|Fleurs lilas parfumées ; fruits toxiques ; très résistant au sec.
RQ3|Citrus medica var. sarcodactylis|Rutaceae|Ab|2–4 m|3 m|S|li,dr,ri|R|m|−3 °C|P|Gr,Bo|||4-5|10-12|#f3e0f0|forme=boule;feuille=ovales;repro=oranges|La main de Bouddha : le plus frileux des agrumes, en pot rentré l’hiver.
RQ4|Saussurea costus|Asteraceae|V|1–2 m|60 cm|SM|hu,pr,fr|R|f|−20 °C|D|Se|||7-9|10-11|#6a3a8a||Plante de haute montagne himalayenne, protégée (CITES).
RQ5|Diospyros kaki|Ebenaceae|Ar|5–10 m|6 m|S|li,pr,dr|M|m|−15 °C|I|Gr,Se||11-3|5-6|10-11|#f3e6c8|forme=rond;feuille=ovales;repro=oranges|Le plaqueminier : fruits orange qui restent sur l’arbre nu en hiver.
RQ6|Cyperus rotundus|Cyperaceae|V|15–40 cm|20 cm|S|sa,li,fr|M|b|−15 °C|I|Di||4-5|6-9|9-11|#6a3a2a|port=graminee,ombelleHaut|L’une des pires mauvaises herbes du monde : en pot uniquement.
RQ7|Allium macrostemon|Amaryllidaceae|V|30–70 cm|15 cm|S|sa,li,dr|M|b|−25 °C|I|Bu||9-10|5-6|5-6|#e8c8e8||Petit ail sauvage : bulbilles dans les ombelles.
RQ8|Citrus × aurantium|Rutaceae|Ar|3–8 m|4 m|S|li,dr|M|m|−8 °C|I|Gr,Se||4-5|4-5|5-6|#f8f2e0||Le bigaradier : se plaît à Marseille ; on ramasse les petits fruits verts tombés.
TE1|Atractylodes macrocephala|Asteraceae|V|30–80 cm|30 cm|SM|sa,li,dr|M|m|−15 °C|B|Se|3-4||9-10|10-11|#c86ab8||Capitules pourpres en automne ; craint l’eau stagnante.
TE2|Ziziphus jujuba|Rhamnaceae|Ar|5–10 m|5 m|S|ca,cl,se,dr|F|e|−25 °C|I|Gr,Dr||11-3|6-7|9-10|#e8e070|forme=etale;feuille=ovales;repro=baiesRouges|Le jujubier : idéal au soleil de Provence ; drageonne.
TE3|Codonopsis pilosula|Campanulaceae|L|1–2 m|40 cm|M|hu,sa,dr|M|m|−25 °C|O|Se|3-4||7-9|9-10|#c8d0a0||Vivace volubile : grimpe sur des rames ; clochettes vert pâle.
TE5|Glycyrrhiza uralensis|Fabaceae|V|30 cm–1 m|50 cm|S|sa,pr,dr,cl|F|e|−30 °C|I|Se,Di||3,10|6-8|9-10|#a08ad8||Racines récoltées au bout de 3 ans ; traçante en sol léger.
TE6|Astragalus mongholicus|Fabaceae|V|50 cm–1,5 m|50 cm|S|sa,pr,dr|F|b|−30 °C|B|Se|3-4||6-8|10-11|#f2e6a0||Longue racine pivotante : sol profond et léger ; récolte après 2 à 4 ans.
TE8|Panax ginseng|Araliaceae|V|30–60 cm|25 cm|O|hu,ac,fr,dr|R|f|−35 °C|D|Se|10-11||6-7|9-10|#e8f0c8|port=verticillees,ombelleHaut|Sous une ombrière, en sol de sous-bois ; récolte après 5 à 6 ans.
TE9|Dioscorea polystachya|Dioscoreaceae|L|2–4 m|50 cm|S|sa,li,pr,dr|M|m|−20 °C|B|Bu||3-4|6-8|10-11|#f3f0dc||L’igname de Chine : racine très longue, il faut un sol profond et meuble ; se multiplie par ses bulbilles.
TE10|Pseudostellaria heterophylla|Caryophyllaceae|V|10–20 cm|15 cm|M|hu,fr,dr|M|m|−25 °C|O|Bu||10-11|4-5|6-7|#f8f2e0|port=opposees,solitaire|Petite plante de sous-bois ; on replante ses petits tubercules à l’automne.
TE11|Panax quinquefolius|Araliaceae|V|20–40 cm|25 cm|O|hu,ac,fr,dr|R|f|−35 °C|D|Se|10-11||6-7|9-10|#e8f0c8|port=verticillees,ombelleHaut|Sous une ombrière, en sol de sous-bois ; récolte après 4 ans.
TI1|Aconitum carmichaelii|Ranunculaceae|V|60 cm–1,5 m|40 cm|M|hu,fr,ri|R|f|−30 °C|O|Di||10-11|9-10|6-8|#5a5ad8|port=alternes,grappeHaut|Toute la plante est mortelle : des gants pour la toucher.
TI2|Zingiber officinale|Zingiberaceae|V|60 cm–1 m|30 cm|M|hu,ri,fr,dr|R|f|Gèle (min. +5 °C)|O|Di||4-5|8-9|10-11|#e8d460|port=distiques,aucune|Planter un morceau de rhizome bourgeonné au printemps, récolter avant les froids.
TI3|Alpinia officinarum|Zingiberaceae|V|40 cm–1,1 m|40 cm|M|hu,ri,fr|R|f|Gèle (min. +5 °C)|P|Di||5|4-9|9-11|#f8f2e0||Le galanga : en pot, rentré l’hiver.
TI4|Piper nigrum|Piperaceae|L|4–10 m|2 m|M|hu,ri,hm|A|f|Gèle (min. +10 °C)|P|Bo|||5-6|9-11|#c8d070||Tropicale : serre chaude et humide.
TI5|Zanthoxylum bungeanum|Rutaceae|Ab|2–5 m|3 m|S|ca,cl,dr|M|b|−20 °C|I|Se,Gr||11-3|4-5|8-9|#c8d070|forme=multitige;feuille=pennees;repro=baiesRouges|Le poivrier du Sichuan : épineux ; supporte le calcaire et le sec.
TI6|Cinnamomum cassia|Lauraceae|Ar|10–15 m|6 m|M|hu,ac,fr,dr|R|f|−5 °C|P|Se,Bo||4-5|6-8|8-10|#f3f0dc|forme=ovale;feuille=lanceolees;repro=jaunes|Le cannelier de Chine : en grand pot, à l’abri du froid.
TI7|Tetradium ruticarpum|Rutaceae|Ab|3–10 m|3 m|SM|li,hu,dr|M|m|−10 °C|B|Se,Bo||11-3|6-8|8-11|#f8f2e0|forme=etale;feuille=pennees;repro=grappes|Petit arbre aux feuilles composées très aromatiques.
TI8|Foeniculum vulgare|Apiaceae|V|1–2 m|50 cm|S|ca,cl,se,dr|F|e|−15 °C|I|Se|3-4,9||6-9|9-10|#f2d43a||Le fenouil : se ressème partout en garrigue.
TS1|Paeonia lactiflora|Paeoniaceae|V|60 cm–1 m|80 cm|S|li,ar,pr,ri,dr|M|b|−35 °C|B|Di||10-11|5-6|9-10|#f8f2e0|port=composees,solitaireHaut|Ne pas enterrer les bourgeons à plus de 3 cm ; elle déteste être déplacée.
TS2|Angelica sinensis|Apiaceae|V|40 cm–1 m|40 cm|M|hu,fr,pr,ri|R|f|−20 °C|D|Se|6-7||6-7|10-11|#f8f2e0||Plante de montagne : il lui faut un été frais et humide ; récolter la racine avant qu’elle fleurisse.
TS4|Reynoutria multiflora|Polygonaceae|L|3–6 m|1 m|SM|li,hu,dr|M|m|−15 °C|B|Bo,Se,Di||3-4,10|8-10|10-11|#f8f2e0||Liane volubile, nuages de petites fleurs blanches en fin d’été.
TS5|Dimocarpus longan|Sapindaceae|Ar|8–12 m|8 m|S|li,ri,dr|R|m|Gèle (min. −2 °C)|P|Gr,Ma|||3-4|7-8|#f2e6a0|forme=rond;feuille=pennees;repro=grappes|Arbre tropical : en serre ou en grand pot rentré l’hiver.
TS6|Rehmannia glutinosa|Orobanchaceae|V|15–30 cm|25 cm|S|sa,li,dr,ri|M|b|−15 °C|B|Di,Se||3-4|4-6|10-11|#c86a6a|port=rosette,grappeHaut|Rosette velue, fleurs en trompette ; on replante des morceaux de racine.
TTD1|Pinellia ternata|Araceae|V|15–30 cm|15 cm|M|hu,fr|M|m|−20 °C|B|Bu||3,10|5-7|7-9|#a8c070|port=rosette,solitaireHaut|Se multiplie par ses bulbilles : peut envahir.
TTD2|Fritillaria cirrhosa|Liliaceae|V|20–60 cm|15 cm|M|hu,dr,fr|M|m|−20 °C|D|Bu||9-10|5-7|7-9|#c8b05a|port=alternes,solitaire|Fritillaire de haute montagne : difficile au chaud.
TTD3|Trichosanthes kirilowii|Cucurbitaceae|L|3–8 m|1,5 m|SM|hu,fr,pr,dr|R|m|−15 °C|B|Se,Di||4-5|6-8|9-10|#ffffff||Fleurs blanches frangées la nuit ; un pied mâle et un pied femelle pour les fruits ; sur un treillis.
TTD4|Platycodon grandiflorus|Campanulaceae|V|40–80 cm|30 cm|SM|li,sa,dr|M|b|−30 °C|B|Se|3-4||7-9|9-10|#6a6ae8|port=alternes,solitaire|Les boutons gonflent comme des ballons puis s’ouvrent en étoiles bleues.
TTD5|Sinapis alba|Brassicaceae|A|50 cm–1 m|25 cm|S|li,cl,dr|M|m|−5 °C|I|Se|3-4,9||4-6|6-7|#f2d43a||La moutarde blanche : pousse vite, engrais vert aussi.
TTD6|Prunus armeniaca|Rosaceae|Ar|4–8 m|5 m|S|li,cl,dr|M|b|−25 °C|I|Gr,Se||11-2|2-3|6-7|#f8e0f0|forme=etale;feuille=dentees;repro=cinq|L’abricotier : fleurit tôt, à l’abri des gelées de printemps.
TTD8|Scaphium affine|Malvaceae|Ar|25–40 m|10 m|S|hu,ri|R|f|Gèle (min. +10 °C)|P|Se|||3-4|4-6|#f3e6c8|forme=ovale;feuille=ovales|Grand arbre des forêts tropicales : seulement en serre.
TTD9|Arisaema erubescens|Araceae|V|40–80 cm|30 cm|MO|hu,fr,dr|M|m|−20 °C|O|Bu||10-11,3|5-7|9-10|#6a8a4a|port=rosette,solitaireHaut|Toxique crue ; une spathe en capuchon, puis des baies rouge vif à l’automne.
TTD10|Arisaema erubescens|Araceae|V|40–80 cm|30 cm|MO|hu,fr,dr|M|m|−20 °C|O|Bu||10-11,3|5-7|9-10|#6a8a4a|port=rosette,solitaireHaut|Toxique crue ; une spathe en capuchon, puis des baies rouge vif à l’automne.
TTD11|Bambusa textilis|Poaceae|V|5–10 m|3 m|SM|li,fr,ri|R|m|−8 °C|B|Di||3-5||1-12|#c8d070|port=graminee,aucune|Bambou cespiteux (il ne trace pas) ; craint les grands froids.
TTD12|Inula japonica|Asteraceae|V|30–70 cm|30 cm|S|li,fr,hm|M|m|−30 °C|B|Se,Di||3,10|7-9|7-9|#f2d43a||Capitules jaunes tout l’été ; aime les sols frais.
TTD13|Fritillaria thunbergii|Liliaceae|V|50–80 cm|15 cm|M|hu,dr,ri|M|m|−15 °C|O|Bu||9-10|3-4|5-6|#e8e0b0|port=verticillees,solitaire|Clochettes crème au printemps ; le feuillage disparaît en été.
TTD14|Phyllostachys nigra var. henonis|Poaceae|V|6–12 m|3 m|SM|li,fr,ri|R|m|−20 °C|B|Di||3-5||1-12|#c8d070|port=graminee,aucune|Bambou traçant : une barrière anti-rhizomes est indispensable.
TTD15|Phyllostachys nigra var. henonis|Poaceae|V|6–12 m|3 m|SM|li,fr,ri|R|m|−20 °C|B|Di||3-5||1-12|#c8d070|port=graminee,aucune|Bambou traçant : une barrière anti-rhizomes est indispensable.
TY2|Eucommia ulmoides|Eucommiaceae|Ar|10–20 m|8 m|S|li,pr,dr|M|b|−30 °C|B|Se,Bo||11-3|3-4|4-6|#c8d070|forme=rond;feuille=dentees|Seul arbre de sa famille ; ses feuilles déchirées laissent des fils de latex.
TY3|Juglans regia|Juglandaceae|Ar|10–25 m|12 m|S|li,pr,dr,cl|M|m|−25 °C|B|Gr,Se||11-2|4-5|9-10|#c8d070||Le noyer : rien ne pousse bien sous lui.
TY5|Cistanche deserticola|Orobanchaceae|V|40 cm–1,5 m|50 cm|S|sa,se,dr|F|e|−30 °C|D|Se|||5-6|4-5|#f2d43a|port=prele,epiHaut|Parasite des racines du saxaoul : impossible sans son arbre hôte.
TY6|Cuscuta chinensis|Convolvulaceae|L|30 cm–1 m|30 cm|S|li|M|m|Annuelle (gélive)|D|Se|4-5||7-9|9-10|#f8f2e0||Parasite sans feuilles qui s’enroule sur les autres plantes : à éviter au jardin.
TY7|Dipsacus asper|Caprifoliaceae|V|1–2 m|60 cm|SM|li,pr,fr|M|m|−15 °C|B|Se|3-4,9||7-9|9-10|#f8f2e0|port=opposees,capitule|Grandes têtes épineuses ; les oiseaux aiment ses graines.
TY8|Alpinia oxyphylla|Zingiberaceae|V|1–3 m|1 m|M|hu,hm,ri|A|f|Gèle (min. +5 °C)|P|Di|||3-5|5-6|#f8f2e0||Tropicale : serre chaude.
TY9|Epimedium brevicornu|Berberidaceae|V|20–50 cm|30 cm|OM|hu,fr,dr|M|m|−25 °C|O|Di||3,9-10|4-5|6-9|#f8f2e0|port=rosette,grappe|Couvre-sol de sous-bois ; couper les vieilles feuilles en fin d’hiver.
V1|Cucumis melo|Cucurbitaceae|A|30 cm (rampant)|1 m|S|li,ri,dr|R|m|Annuelle (gélive)|I|Se|4-5||6-8|7-9|#f2d43a|port=alternes,solitaire|Le melon : semer au chaud, pincer les tiges.
VH1|Angelica biserrata|Apiaceae|V|1–2 m|60 cm|M|hu,fr,pr|R|f|−20 °C|O|Se|||8-9|10-11,3-4|#f8f2e0||Grande angélique de sous-bois frais.
VH2|Chaenomeles speciosa|Rosaceae|Ab|1,5–3 m|2 m|SM|li,ar,dr|M|b|−25 °C|I|Bo,Ma,Se||11-3|2-4|9-10|#e8403a|forme=multitige;feuille=ovales;repro=cinq|Le cognassier du Japon : fleurs rouges en fin d’hiver, fruits très parfumés.
VH3|Gentiana macrophylla|Gentianaceae|V|30–60 cm|30 cm|SM|hu,fr,dr|M|m|−30 °C|D|Se|||7-9|9-10|#3d5ee8||Gentiane de montagne : difficile au chaud.
VH4|Taxillus chinensis|Loranthaceae|Ab|50 cm–1 m|1 m|SM|hu|F|m|Gèle (min. 0 °C)|D|Se|||8-10|9-12|#c8603a|forme=boule;feuille=ovales;repro=baiesRouges|Hémiparasite qui pousse sur les branches des mûriers et d’autres arbres.
VH5|Morus alba|Moraceae|Ar|5–15 m|6 m|S|li,cl,dr|M|b|−25 °C|I|Bo,Gr,Se||11-3|4-5|5-6|#c8d070|forme=boule;feuille=cordees;repro=mures|On coupe les jeunes rameaux à la fin du printemps.
VH6|Eleutherococcus nodiflorus|Araliaceae|Ab|2–3 m|1,5 m|M|hu,fr,dr|M|m|−25 °C|B|Bo,Se,Dr||11-3|5-7|9-10|#c8d070||Arbuste épineux aux feuilles palmées.
`;
  const CYCLES = { A: "Annuelle", Bi: "Bisannuelle", V: "Vivace", Ab: "Arbuste", Ar: "Arbre", L: "Liane" };
  const EXPOS = { S: "Plein soleil", M: "Mi-ombre", O: "Ombre" };
  const SOLS = { sa: "Sableux", ca: "Caillouteux", li: "Limoneux", ar: "Argileux", hu: "Humifère", cl: "Calcaire", ne: "Neutre", ac: "Acide", se: "Sec", fr: "Frais", hm: "Humide", dr: "Bien drainé", pr: "Profond", ri: "Riche", pa: "Pauvre" };
  const ARROSAGES = { F: "Faible", M: "Modéré", R: "Régulier", A: "Abondant" };
  const SECHERESSES = { f: "Faible", m: "Moyenne", b: "Bonne", e: "Excellente" };
  const CLIMATS = { I: "Idéale", B: "Bien", O: "Avec un peu d’ombre et d’eau", D: "Difficile", P: "En pot ou en serre" };
  const MULTIS = { Se: "Semis", Bo: "Bouturage", Di: "Division", Ma: "Marcottage", Gr: "Greffe", Bu: "Bulbes ou caïeux", Re: "Rejets", Dr: "Drageons" };
  // « 11-2,5 » → [11, 12, 1, 2, 5]
  function mois(t) {
    const out = [];
    for (const p of (t || "").split(",").filter(Boolean)) {
      const [a, b] = p.split("-").map(Number);
      if (!b) { out.push(a); continue; }
      for (let m = a; ; m = (m % 12) + 1) { out.push(m); if (m === b) break; }
    }
    return out;
  }
  const plantes = {};
  for (const ligne of DONNEES.trim().split("\n")) {
    const [code, latin, famille, cycle, hauteur, espacement, expo, sol, arr, sec, rust, clim, multi, semis, plant, flor, recolte, fleur, dessin, entretien] = ligne.split("|");
    const valeurs = {
      famille, cycle: CYCLES[cycle], hauteur, espacement,
      exposition: expo.split("").map((k) => EXPOS[k]).filter(Boolean),
      sol: sol.split(",").map((k) => SOLS[k]).filter(Boolean),
      arrosage: ARROSAGES[arr], secheresse: SECHERESSES[sec], rusticite: rust, climatMed: CLIMATS[clim],
      multiplication: multi.split(",").map((k) => MULTIS[k]).filter(Boolean),
      moisSemis: mois(semis), moisPlantation: mois(plant), moisFloraison: mois(flor), moisRecolte: mois(recolte),
      entretien,
    };
    for (const k of Object.keys(valeurs)) if (valeurs[k] == null || valeurs[k] === "" || (Array.isArray(valeurs[k]) && !valeurs[k].length)) delete valeurs[k];
    const d = {};
    for (const p of (dessin || "").split(";").filter(Boolean)) {
      const [k, v] = p.split("=");
      d[k] = k === "port" ? v.split(",") : v;
    }
    if (fleur) d.fleur = fleur;
    plantes[code] = { latin, valeurs, dessin: d };
  }
  H.pcJardin = plantes;
})();
