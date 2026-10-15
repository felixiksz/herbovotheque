// Les photos libres des plantes, depuis Wikimedia Commons : la plante, et la partie utilisée en
// herboristerie. Les correspondances avec Wikidata (numéro, nom accepté, photo principale)
// viennent de Wikidata (CC0). Les photos restent chez Wikimedia : on les affiche avec leur
// auteur·rice et leur licence, comme elles le demandent. Le choix d'une photo est gardé dans la fiche.
(function () {
  const H = window.H;
  // id de la plante : [numéro Wikidata, nom botanique accepté, photo principale sur Commons]
  const WIKIDATA = {
    "achillea-millefolium": ["Q25408", "Achillea millefolium", "Achillea millefolium vallee-de-grace-amiens 80 22062007 1.jpg"],
    "leonurus-cardiaca": ["Q161130", "Leonurus cardiaca", "Leonurus cardiaca 001.jpg"],
    "agrimonia-eupatoria": ["Q156865", "Agrimonia eupatoria", "(MHNT) Agrimonia eupatoria inflorescence.jpg"],
    "allium-sativum": ["Q23400", "Allium sativum", "Garlic bulbs and cloves.jpg"],
    "allium-ursinum": ["Q130882", "Allium ursinum", "Illustration Allium ursinum1.jpg"],
    "vaccinium-vitis-idaea": ["Q93235", "Vaccinium vitis-idaea", "Vaccinium vitis-idaea 20060824 003.jpg"],
    "alchemilla-vulgaris": ["Q160189", "Alchemilla vulgaris", "Illustration Alchemilla vulgaris0 clean.jpg"],
    "physalis-alkekengi": ["Q135652746", "Physalis alkekengi", ""],
    "aloe-vera": ["Q80079", "Aloe vera", "Starr 011104-0040 Aloe vera.jpg"],
    "prunus-amygdalus": ["Q39918", "Prunus dulcis", "Almonds - in shell, shell cracked open, shelled, blanched.jpg"],
    "anethum-graveolens": ["Q26686", "Anethum graveolens", "Anethum graveolens 02.jpg"],
    "angelica-archangelica": ["Q207745", "Angelica archangelica", "Koehler1887-GardenAngelica.jpg"],
    "pimpinella-anisum": ["Q28692", "Pimpinella anisum", "Koehler1887-PimpinellaAnisum.jpg"],
    "artemisia-vulgaris": ["Q26663", "Artemisia vulgaris", "Artemisia vulgaris - Köhler–s Medizinal-Pflanzen-016.jpg"],
    "arnica-montana": ["Q207848", "Arnica montana", "00 2245 Echte Arnika (Arnica montana).jpg"],
    "cynara-scolymus": ["Q134609", "Cynara scolymus", "Carxofera.JPG"],
    "galium-odoratum": ["Q161090", "Galium odoratum", "Waldmeister.jpg"],
    "crataegus-monogyna": ["Q161511", "Crataegus monogyna", "Crataegus monogyna - Common hawthorn.jpg"],
    "alnus-glutinosa": ["Q156904", "Alnus glutinosa", "Alnus glutinosa 011.jpg"],
    "avena-sativa": ["Q12104", "Avena sativa", "Illustration Avena sativa0.jpg"],
    "ballota-nigra": ["Q157878", "Ballota nigra", "Ballota nigra subsp. nigra sl13.jpg"],
    "arctium-lappa": ["Q26932", "Arctium lappa", "ArctiumLappa1.jpg"],
    "ocimum-basilicum": ["Q38859", "Ocimum basilicum", "Basil-Basilico-Ocimum basilicum-albahaca.jpg"],
    "stachys-officinalis": ["Q157297", "Stachys officinalis", ""],
    "centaurea-cyanus": ["Q156921", "Centaurea cyanus", "CentaureaCyanus-bloem-kl.jpg"],
    "verbascum-thapsus": ["Q160095", "Verbascum thapsus", "00 2262 Kleinblütige Königskerze (Verbascum thapsus).gif"],
    "betula-pubescens": ["Q157624", "Betula pubescens", "Abedulpubescente.jpg"],
    "borago-officinalis": ["Q147075", "Borago officinalis", "00 2100 Borretsch (Borago officinalis).jpg"],
    "capsella-bursa-pastoris": ["Q27264", "Capsella bursa-pastoris", "Capsella bursa-pastoris.JPG"],
    "erica-cinerea": ["Q1543735", "Erica cinerea", "Bell Heather - geograph.org.uk - 493968.jpg"],
    "arctostaphylos-uva-ursi": ["Q208032", "Arctostaphylos uva-ursi", "Arctostaphylos uva-ursi 25924.JPG"],
    "matricaria-recutita": ["Q3978815", "Matricaria recutita", "Chamomile@original size.jpg"],
    "chamaemelum-nobile": ["Q5723577", "Chamaemelum nobile", "Chamaemelum nobile1.jpg"],
    "cinnamomum-zeylanicum": ["Q12892282", "Cinnamomum zeylanicum", ""],
    "tropaeolum-majus": ["Q156288", "Tropaeolum majus", "Tropaeolum majus 2005 G1.jpg"],
    "daucus-carota": ["Q30056", "Daucus carota", "Daucus carota.jpg"],
    "ribes-nigrum": ["Q146604", "Ribes nigrum", "Schwarzejohannisbeere.jpg"],
    "cedrus-libani": ["Q61105", "Cedrus libani", "Cèdre du Liban Barouk 2005.jpg"],
    "silybum-marianum": ["Q193798", "Silybum marianum", "Silybum marianum - Adana 05.jpg"],
    "castanea-sativa": ["Q22699", "Castanea sativa", "Romagne 86 Châtaignes 2008.jpg"],
    "cichorium-intybus": ["Q2544599", "Cichorium intybus", "Illustration Cichorium intybus0 clean.jpg"],
    "agropyron-repens": ["Q276262", "Elymus repens", "Kweek Elytrigia repens.jpg"],
    "symphytum-officinale": ["Q157561", "Symphytum officinale", "Symphytum officinale 01.jpg"],
    "papaver-rhoeas": ["Q130201", "Papaver rhoeas", "Papaver rhoeas LC0050.jpg"],
    "cornus-sanguinea": ["Q161416", "Cornus sanguinea", "Cornus-sanguinea.JPG"],
    "crithmum-maritimum": ["Q1136311", "Crithmum maritimum", "Crithmum maritimum.jpg"],
    "curcuma-longa": ["Q42562", "Curcuma longa", "Curcuma longa roots.jpg"],
    "cupressus-sempervirens": ["Q147513", "Cupressus sempervirens", "Cyprès.jpg"],
    "desmodium-adscendens": ["Q3024504", "Desmodium adscendens", ""],
    "echinacea-purpurea": ["Q272661", "Echinacea purpurea", ".00 1682 Purpur-Sonnenhut (Echinacea purpurea).jpg"],
    "rosa-canina": ["Q146066", "Rosa canina", "Divlja ruza cvijet 270508.jpg"],
    "eleutherococcus-senticosus": ["Q894245", "Eleutherococcus senticosus", "Eleutherococcus senticosus.jpg"],
    "epilobium-parviflorum": ["Q159094", "Epilobium parviflorum", "Dettaglio - Onagrarieae Epilobium parviflorum Schreb. Erbario Frizzi Perugia n. 2422.jpg"],
    "artemisia-dracunculus": ["Q155814", "Artemisia dracunculus", "Artemisia dracunculus1.jpg"],
    "eucalyptus-globulus": ["Q159528", "Eucalyptus globulus", "Eucalyptus globulus globulus buds.jpg"],
    "foeniculum-vulgare": ["Q43511", "Foeniculum vulgare", "Fennel (Foeniculum vulgare) - Parc Natural de s'Albufera, Spain 2022-04-18 (02).jpg"],
    "trigonella-foenugraecum": ["Q133205", "Trigonella foenum-graecum", "Junger Bockshornklee.jpg"],
    "ficus-carica": ["Q36146", "Ficus carica", "Illustration Ficus carica0.jpg"],
    "ruscus-aculeatus": ["Q161425", "Ruscus aculeatus", "Illustration Ruscus aculeatus0.jpg"],
    "rubus-idaeus": ["Q12252383", "Rubus idaeus", "Raspberry - whole (Rubus idaeus).jpg"],
    "fraxinus-excelsior": ["Q156907", "Fraxinus excelsior", "Fraxinus excelsior 001.jpg"],
    "fucus-serratus": ["Q1506400", "Fucus serratus", "Fucus serratus2.jpg"],
    "fumaria-officinalis": ["Q157618", "Fumaria officinalis", "(MHNT) Fumaria officinalis - Habit.jpg"],
    "alpinia-galanga": ["Q402971", "Alpinia galanga", "Alpinia officinarum - Köhler–s Medizinal-Pflanzen-156.jpg"],
    "vitex-agnus": ["Q259318", "Vitex agnus-castus", "Vitex agnus-castus (15390963576).jpg"],
    "juniperus-communis": ["Q26325", "Juniperus communis", "Juniperus communis fruits - Keila.jpg"],
    "gentiana-lutea": ["Q158572", "Gentiana lutea", "Gentiana lutea 230705.jpg"],
    "zingiber-officinale": ["Q35625", "Zingiber officinale", "Koeh-146-no text.jpg"],
    "ginkgo-biloba": ["Q43284", "Ginkgo biloba", "GINKGOBAUM-2.jpg"],
    "panax-ginseng": ["Q182881", "Panax ginseng", "Ginsengpflanze.jpg"],
    "syzygium-aromaticum": ["Q26736", "Syzygium aromaticum", "Cengkih.jpg"],
    "inula-helenium": ["Q697416", "Inula helenium", "Inula helenium Prague 2011 1.jpg"],
    "tanacetum-parthenium": ["Q818481", "Tanacetum parthenium", "Feverfew.jpg"],
    "paullinia-cupana": ["Q209089", "Paullinia cupana", "Guarana - Paullinia cupana.jpg"],
    "althaea-officinalis": ["Q158496", "Althaea officinalis", "Althea officinalis flor.jpg"],
    "harpagophytum-procumbens": ["Q386675", "Harpagophytum procumbens", "Harpagophytum 5.jpg"],
    "humulus-lupulus": ["Q104212", "Humulus lupulus", "Hop mannelijke plant Humulus lupulus male plant.jpg"],
    "hyssopus-officinalis": ["Q137931", "Hyssopus officinalis", "Hyssopus officinalis RF.jpg"],
    "hibiscus-sabdariffa": ["Q319390", "Hibiscus sabdariffa", "Bissap au Togo.jpg"],
    "lamium-album": ["Q157626", "Lamium album", "Lamium album Sturm39.jpg"],
    "laurus-nobilis": ["Q26006", "Laurus nobilis", "Laurier.jpg"],
    "lavandula-angustifolia": ["Q42081", "Lavandula angustifolia", "Lavandula angustifolia - Köhler–s Medizinal-Pflanzen-087.jpg"],
    "pistacia-lentiscus": ["Q159812", "Pistacia lentiscus", "Dettaglio - Anacardiaceae Pistacia lentiscus Lin. Erbario Frizzi Perugia n. 3752.jpg"],
    "glechoma-hederacea": ["Q162544", "Glechoma hederacea", "20140330Glechoma hederacea1.jpg"],
    "linum-usitatissimum": ["Q45108", "Linum usitatissimum", "Linum usitatissimum 001.JPG"],
    "lotus-corniculatus": ["Q29907", "Lotus corniculatus", "(MHNT) Lotus corniculatus - Plant habit.jpg"],
    "origanum-majorana": ["Q22694", "Origanum majorana", "Origanum majorana.jpg"],
    "aesculus-hippocastanum": ["Q26899", "Aesculus hippocastanum", "ND 678.N.59 Hofers Kastanien in Wettringen.jpg"],
    "malva-sylvestris": ["Q156835", "Malva sylvestris", "Dettaglio - Malvaceae Malva sylvestris Lin. Erbario Frizzi Perugia n. 299.jpg"],
    "melilotus-officinalis": ["Q161160", "Melilotus officinalis", "20140613Melilotus officinalis.jpg"],
    "melissa-officinalis": ["Q148396", "Melissa officinalis", "Melissa officinalis Bee Balm,Lemon Balm ბარამბო.JPG"],
    "mentha-piperita": ["Q102165594", "Mentha piperita", ""],
    "hypericum-perforatum": ["Q158289", "Hypericum perforatum", "(MHNT) Hypericum perforatum flower and buttons.jpg"],
    "morus-nigra": ["Q161040", "Morus nigra", "Illustration Morus nigra0.jpg"],
    "myrtus-communis": ["Q6122027", "Myrtus communis", "Illustration Myrtus communis0.jpg"],
    "vaccinium-myrtillus": ["Q5413585", "Vaccinium myrtillus", "203 Vaccinum myrtillus L.jpg"],
    "corylus-avellana": ["Q124969", "Corylus avellana", "Corylus avellana shrub.jpg"],
    "juglans-regia": ["Q46871", "Juglans regia", "Juglans regia Echte Walnussfrucht 1.jpg"],
    "allium-cepa": ["Q23485", "Allium cepa", "Allium cepa, Amol.jpg"],
    "olea-europea": ["Q37083", "Olea europaea", "El Perelló - Old olive tree.jpg"],
    "citrus-aurantium": ["Q147096", "Citrus × aurantium", "Turunç - Citrus aurantium 02.JPG"],
    "origanum-vulgare": ["Q134283", "Origanum vulgare", "Origanum vulgare inflorescence - Keila.jpg"],
    "urtica-dioica": ["Q155909", "Urtica dioica", "Brennnessel 1.JPG"],
    "parietaria-officinalis": ["Q158578", "Parietaria officinalis", "Parietaria officinalis 3.jpg"],
    "passiflora-incarnata": ["Q128939", "Passiflora incarnata", "Gc2 passiflora incarnata.jpg"],
    "eschscholzia-californica": ["Q158795", "Eschscholzia californica", "California poppy.jpg"],
    "viola-tricolor": ["Q190326", "Viola tricolor", "20180612Viola tricolor2.jpg"],
    "centaurium-erythraea": ["Q156870", "Centaurium erythraea", "Centaurium erythraea (flowers).jpg"],
    "vinca-minor": ["Q161777", "Vinca minor", "20130421Vinca minor1.jpg"],
    "hieracium-pilosella": ["Q931460", "Hieracium pilosella", "Hieracium pilosella 290807a.jpg"],
    "pinus-sylvestris": ["Q133128", "Pinus sylvestris", "Pinus sylvestris Glenmuick.jpg"],
    "taraxacum-officinale": ["Q131219", "Taraxacum officinale", "Maskros 2.jpg"],
    "plantago-lanceolata": ["Q157408", "Plantago lanceolata", "Ribwort 600.jpg"],
    "equisetum-arvense": ["Q107592", "Equisetum arvense", "Equisetum arvense 126536963.jpg"],
    "primula-veris": ["Q157552", "Primula veris", "Common Cowslip.jpg"],
    "raphanus-nigra": ["Q7224565", "Raphanus sativus", "Radish 3371103037 4ab07db0bf o.jpg"],
    "glycyrrhiza-glabra": ["Q257106", "Glycyrrhiza glabra", "Illustration Glycyrrhiza glabra0.jpg"],
    "filipendula-ulmaria": ["Q147176", "Filipendula ulmaria", ".00 7237 Echte Mädesüß (Filipendula ulmaria).jpg"],
    "polygonum-aviculare": ["Q242573", "Polygonum aviculare", "Polygonum aviculare 4.JPG"],
    "rosmarinus-officinalis": ["Q122679", "Rosmarinus officinalis", "Rosmarinus officinalis - Köhler–s Medizinal-Pflanzen-258.jpg"],
    "rubus-fruticosus": ["Q13541716", "Rubus fruticosus", "Blackberry (Rubus fruticosus).jpg"],
    "crocus-sativus": ["Q15041677", "Crocus sativus", "Saffran crocus sativus moist.jpg"],
    "abies-pectinata": ["Q19833763", "Abies pectinata", ""],
    "satureja-montana": ["Q160186", "Satureja montana", "Satureja montana2.jpg"],
    "salvia-officinalis": ["Q1111359", "Salvia officinalis", "Salvia officinalis L. 3355742911.jpg"],
    "salvia-sclarea": ["Q157872", "Salvia sclarea", "Salvia sclarea3.jpg"],
    "salix-alba": ["Q156918", "Salix alba", "2015-05-08 Büdingen Naturdenkmal 440.221 Silber-Weide - 0919.jpg"],
    "scrofularia-nodosa": ["Q159115", "Scrophularia nodosa", "Scrophularia nodosa8.jpg"],
    "thymus-serpyllum": ["Q147251", "Thymus serpyllum", "Thymus serpyllum1.jpg"],
    "solidago-virgaurea": ["Q599435", "Solidago virgaurea", "S. virgaurea2015-10-10.jpg"],
    "calendula-officinalis": ["Q145930", "Calendula officinalis", "Calendula officinalis - Köhler–s Medizinal-Pflanzen-024.jpg"],
    "sambucus-nigra": ["Q22701", "Sambucus nigra", "Sambucus nigra 004.jpg"],
    "camellia-sinensis": ["Q101815", "Camellia sinensis", "Csinensis.jpg"],
    "thymus-vulgaris": ["Q148668", "Thymus vulgaris", "Thymian (Thymus vulgaris), Nationalpark Hohe Tauern.jpg"],
    "tilia-cordata": ["Q158746", "Tilia cordata", "Tilia cordata, Lipa2009.jpg"],
    "trifolium-pratense": ["Q156635", "Trifolium pratense", "Trifolium pratense - Keila2.jpg"],
    "tussilago-farfara": ["Q26302", "Tussilago farfara", "Coltsfoot.jpg"],
    "valeriana-officinalis": ["Q157819", "Valeriana officinalis", "Valeriana officinalis - Niitvälja.jpg"],
    "lippia-citriodora": ["Q206532", "Aloysia citrodora", "Aloysia citriodora 002.jpg"],
    "vitis-vinifera": ["Q30046", "Vitis vinifera", "Vitis vinifera - Köhler–s Medizinal-Pflanzen-145.jpg"],
    "viola-odorata": ["Q108684", "Viola odorata", "20130407Viola odorata1.jpg"]
  };
  const API = "https://commons.wikimedia.org/w/api.php?format=json&origin=*&action=query";
  const urlFichier = (f, largeur) => "https://commons.wikimedia.org/wiki/Special:FilePath/" + encodeURIComponent(f) + "?width=" + (largeur || 480);
  const sansBalises = (t) => String(t || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

  // La partie utilisée, d'après la fiche (« Parties utilisées et période de récolte ») : on la
  // cherche d'abord sous son nom de pharmacopée, celui des droguiers et des herboristeries (le
  // genre au génitif puis la partie : « Angelicae radix », « Gentianae radix », « Hyperici herba »),
  // qui montre la partie elle-même, séchée ; puis le nom de la plante avec la partie dans le titre
  // de la photo ; puis seulement avec les mots de la partie. Quand la fiche cite plusieurs parties
  // (l'angélique : la racine et les fruits), on les montre toutes, la racine d'abord.
  const PARTIES = [
    [/racine/i, ["radix"], ["root", "roots", "Wurzel", "racine"]],
    [/rhizome/i, ["rhizoma"], ["rhizome", "rhizomes", "Rhizom"]],
    [/écorce|ecorce/i, ["cortex"], ["bark", "Rinde", "écorce"]],
    [/graine|semence/i, ["semen"], ["seeds", "seed", "Samen", "graines"]],
    [/fruit|baie/i, ["fructus"], ["fruits", "fruit", "berries", "Früchte"]],
    [/bourgeon|jeunes pousses/i, ["gemmae"], ["buds", "Knospen", "bourgeons"]],
    [/fleur|sommité|capitule|pétale/i, ["flos", "flores"], ["flowers", "flower", "Blüten", "fleurs"]],
    [/feuille/i, ["folium", "folia"], ["leaves", "leaf", "Blätter", "feuilles"]],
    [/partie aérienne|plante entière|herbe/i, ["herba"], ["herb", "Kraut"]],
  ];
  // le genre au génitif latin : Angelica → Angelicae, Hypericum → Hyperici, Salix → Salicis…
  function genitif(genre) {
    if (/a$/.test(genre)) return genre + "e";
    if (/(us|um)$/.test(genre)) return genre.slice(0, -2) + "i";
    if (/ix$/.test(genre)) return genre.slice(0, -1) + "cis";
    if (/ex$/.test(genre)) return genre.slice(0, -2) + "icis";
    if (/er$/.test(genre)) return genre + "is";
    if (/o$/.test(genre)) return genre + "nis";
    return genre;
  }
  function recherchesPartie(p, nom) {
    const texte = String((p.valeurs || {}).partiesRecolte || "");
    const parties = PARTIES.filter(([m]) => m.test(texte));
    const [g, espece] = nom.split(" "), genre = genitif(g), q = [];
    // (parfois la pharmacopée nomme la plante par son espèce : « Millefolii herba », « Absinthii herba »)
    const autre = espece && !/^(officinal|vulgar|commun|sativ|major|minor|alb|nigr|lute|dioic)/.test(espece) ? genitif(espece[0].toUpperCase() + espece.slice(1)) : null;
    for (const [, latin] of parties) for (const l of latin) { q.push('"' + genre + " " + l + '"'); if (autre) q.push('"' + autre + " " + l + '"'); }
    for (const [, latin, mots] of parties) for (const m of latin.concat(mots.slice(0, 2))) q.push('"' + nom + '" intitle:' + m);
    for (const [, latin, mots] of parties) q.push('"' + nom + '" (' + latin.concat(mots).join(" OR ") + ")");
    if (!parties.length) q.push('"' + nom + '" (dried OR drug OR herba OR droge)');
    return q;
  }

  async function chercher(recherche) {
    const url = API + "&generator=search&gsrnamespace=6&gsrlimit=16&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&gsrsearch=" + encodeURIComponent(recherche + " filetype:bitmap");
    const j = await (await fetch(url)).json();
    return Object.values((j.query || {}).pages || {})
      .sort((a, b) => (a.index || 0) - (b.index || 0))
      .map((pg) => ({ fichier: pg.title.replace(/^File:/, ""), info: (pg.imageinfo || [])[0] }))
      .filter((x) => x.info);
  }
  async function infos(fichier) {
    const url = API + "&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=480&titles=" + encodeURIComponent("File:" + fichier);
    const j = await (await fetch(url)).json();
    const pg = Object.values((j.query || {}).pages || {})[0];
    return pg && pg.imageinfo ? { fichier, info: pg.imageinfo[0] } : null;
  }

  const nomBotanique = (p) => (WIKIDATA[p.id] || [])[1] || (String(p.latin || "").match(/[A-Z][a-z]+ [a-z][a-z-]+/) || [""])[0];
  const choisie = (p, quoi) => ((p.photosLibres || {})[quoi]) || (quoi === "plante" ? (WIKIDATA[p.id] || [])[2] : null) || null;

  // une petite image pour les aperçus (la bulle des jardins) : la photo d'ƟvƟ, sinon la photo libre
  function vignette(p, largeur) {
    if (p.photo && p.photo.src) return p.photo.src;
    const f = choisie(p, "plante");
    return f ? urlFichier(f, largeur || 160) : null;
  }

  // un cadre : l'image, le crédit, « Autre photo » et « Garder celle-ci »
  // illus : l'image en haut de la fiche, qui montre la photo de la partie utilisée
  function cadre(p, quoi, titre, recherche, recharger, illus) {
    const img = H.el("img", { alt: titre + " : " + p.nom, loading: "lazy" });
    const credit = H.el("p.credit-photo");
    const etat = H.el("p.discret.etat-photo");
    const garder = H.el("button.bouton.petit", { type: "button", hidden: true }, "Garder celle-ci");
    const autre = H.el("button.bouton.petit", { type: "button" }, "Autre photo");
    let liste = null, i = -1, courante = null;
    function montrer(x) {
      courante = x;
      if (!x) {
        img.hidden = true;
        credit.textContent = "";
        etat.textContent = "Pas encore de photo libre trouvée.";
        return;
      }
      img.hidden = false;
      img.src = x.info.thumburl || urlFichier(x.fichier);
      if (illus) {
        illus.src = img.src;
        illus.alt = "La partie utilisée : " + p.nom;
        illus.classList.add("photo-partie");
      }
      const m = x.info.extmetadata || {};
      // quand Wikimedia ne connaît pas vraiment l'auteur·rice (texte anglais automatique), on
      // n'affiche que le lien vers la page de la photo, où tout est détaillé
      const auteur = sansBalises((m.Artist || {}).value);
      const licence = sansBalises((m.LicenseShortName || {}).value);
      const lien = H.el("a", { href: x.info.descriptionurl, target: "_blank", rel: "noopener" }, "Wikimedia Commons");
      credit.innerHTML = "";
      if (!auteur || /machine-readable|unknown|assumed|anonymous|inconnu/i.test(auteur)) credit.append(lien);
      else credit.append(auteur + (licence ? " · " + licence : "") + " · ", lien);
      etat.textContent = "";
      garder.hidden = x.fichier === choisie(p, quoi);
    }
    // (les recherches se font au fur et à mesure : la première photo arrive vite, les suivantes
    // quand on demande une autre photo)
    let aFaire = null;
    autre.onclick = async () => {
      try {
        if (!liste) { liste = []; aFaire = [].concat(recherche); }
        while (i + 1 >= liste.length && aFaire.length) {
          etat.textContent = "Je cherche…";
          for (const x of await chercher(aFaire.shift())) if (!liste.some((y) => y.fichier === x.fichier)) liste.push(x);
        }
        if (!liste.length) return montrer(null);
        i = (i + 1) % liste.length;
        montrer(liste[i]);
      } catch (e) {
        etat.textContent = "Photos indisponibles hors connexion.";
      }
    };
    garder.onclick = () => {
      if (!courante) return;
      H.d.majPlante(p.id, (x) => (x.photosLibres = Object.assign({}, x.photosLibres, { [quoi]: courante.fichier })));
      H.toast("Photo gardée pour " + H.leNom(p));
      garder.hidden = true;
    };
    // au départ : la photo gardée (ou la photo principale de Wikidata), sinon la première trouvée
    (async () => {
      try {
        const f = choisie(p, quoi);
        if (f) montrer(await infos(f));
        else await autre.onclick();
      } catch (e) {
        etat.textContent = "Photos indisponibles hors connexion.";
      }
    })();
    return H.el("figure.cadre-photo", null, H.el("figcaption", null, titre), img, credit, etat, H.el("div.pastilles", null, autre, garder));
  }

  function section(p, recharger, illus) {
    const nom = nomBotanique(p);
    if (!nom) return null;
    return H.el("div.fiche-preps.photos-libres", null,
      H.el("h3", null, "Photos libres"),
      H.el("div.cadres-photos", null,
        cadre(p, "plante", "La plante", '"' + nom + '"', recharger),
        cadre(p, "partie", "La partie utilisée", recherchesPartie(p, nom), recharger, illus)
      ),
      H.el("p.discret", null, "Photos de Wikimedia Commons, sous licences libres. « Garder celle-ci » la retient pour la fiche.")
    );
  }

  H.photos = { WIKIDATA, vignette, section, urlFichier };
})();
