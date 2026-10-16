// La pharmacopée chinoise du monde de Mesi : toujours l'état actuel des fiches du jeu jeuxmtc
// (les fiches complètes, les ajouts du cours et les corrections publiées depuis le jeu), lues sur
// le site de jeuxmtc. Au démarrage, on prend la dernière version gardée sur l'appareil (ou, la
// toute première fois, la copie chiffrée livrée avec le jeu), puis on relit le site : si les
// fiches ont changé, elles se mettent à jour aussitôt. Dans le monde de Mesi, ces fiches
// s'ajoutent à celles d'ƟvƟ ; ƟvƟ, lui·elle, n'a jamais les fiches chinoises.
(function () {
  const H = window.H;
  const SITE = "/jeuxmtc.github.io/";
  const FICHIERS = { donnees: "22-20-pharma-data.js", fiches: "22-21-pharma-fiches-completes.js", ajouts: "fiches-ajouts.js", corrections: "fiches-corrections.js" };
  const CACHE = "mesi:pharmacopee";

  // le premier objet (ou tableau) JSON qui suit « repere » dans un fichier du jeu
  function json(texte, repere) {
    const i0 = texte.indexOf(repere);
    if (i0 < 0) throw new Error(repere + " introuvable");
    let i = i0 + repere.length;
    while (i < texte.length && texte[i] !== "{" && texte[i] !== "[") i++;
    let prof = 0, chaine = false, echap = false;
    for (let j = i; j < texte.length; j++) {
      const c = texte[j];
      if (chaine) {
        if (echap) echap = false;
        else if (c === "\\") echap = true;
        else if (c === '"') chaine = false;
        continue;
      }
      if (c === '"') chaine = true;
      else if (c === "{" || c === "[") prof++;
      else if (c === "}" || c === "]") { prof--; if (!prof) return JSON.parse(texte.slice(i, j + 1)); }
    }
    throw new Error(repere + " : fin introuvable");
  }
  async function lireSite() {
    const t = {};
    for (const [k, f] of Object.entries(FICHIERS)) {
      const r = await fetch(H.pharmacopee.site + f, { cache: "no-cache" });
      if (!r.ok) throw new Error(f + " " + r.status);
      t[k] = await r.text();
    }
    return {
      classes: json(t.donnees, "const PHARMA_CLASSES"),
      herbes: json(t.donnees, "const PHARMA_HERBS"),
      fiches: json(t.fiches, "MTC_PHARMA_FICHES"),
      ajouts: json(t.ajouts, "MTC_FICHE_ADDITIONS").pharma || {},
      corrections: json(t.corrections, "MTC_FICHE_CORRECTIONS").pharma || {},
      lueLe: Date.now(),
    };
  }
  const signature = (src) => JSON.stringify([src.herbes, src.fiches, src.ajouts, src.corrections]).length + ":" + JSON.stringify(src.corrections) + JSON.stringify(src.ajouts).length;

  // --- les fiches, au format de l'herbothèque -----------------------------------------------
  const SECTIONS = [
    { id: "pc-identite", nom: "Pharmacopée chinoise" },
    { id: "pc-proprietes", nom: "Nature, saveur et tropisme" },
    { id: "pc-actions", nom: "Actions et indications" },
    { id: "pc-associations", nom: "Associations et formules" },
    { id: "pc-precautions", nom: "Précautions (pharmacopée)" },
    { id: "pc-preparation", nom: "Préparations (pharmacopée)" },
    { id: "pc-synthese", nom: "Synthèse" },
    { id: "pc-recherches", nom: "Composants et recherches modernes" },
  ];
  function champs(classes) {
    return [
      { id: "origine", nom: "Origine", section: "pc-identite", type: "choix", options: ["Pharmacopée chinoise", "Herbier d’ƟvƟ"], cartes: false },
      { id: "hanzi", nom: "Caractères", section: "pc-identite", type: "court", cartes: true },
      { id: "nomFr", nom: "Nom français", section: "pc-identite", type: "court", cartes: true },
      { id: "synonymes", nom: "Synonymes", section: "pc-identite", type: "court", cartes: false },
      { id: "classe", nom: "Classe", section: "pc-identite", type: "choix", options: classes.map((c) => c.nom), cartes: true },
      { id: "essentielle", nom: "Substance essentielle", section: "pc-identite", type: "choix", options: ["Oui"], cartes: false },
      { id: "nature", nom: "Nature", section: "pc-proprietes", type: "court", cartes: true },
      { id: "saveur", nom: "Saveur", section: "pc-proprietes", type: "court", cartes: true },
      { id: "tropisme", nom: "Tropisme", section: "pc-proprietes", type: "court", cartes: true },
      { id: "posologie", nom: "Posologie", section: "pc-proprietes", type: "court", cartes: true },
      { id: "actions", nom: "Actions", section: "pc-actions", type: "texte", cartes: true },
      { id: "indications", nom: "Indications", section: "pc-actions", type: "texte", cartes: true },
      { id: "esprit", nom: "Esprit", section: "pc-actions", type: "texte", cartes: false },
      { id: "associations", nom: "Associations", section: "pc-associations", type: "texte", cartes: false },
      { id: "formules", nom: "Formules", section: "pc-associations", type: "texte", cartes: true },
      { id: "comparaisons", nom: "Comparaisons", section: "pc-associations", type: "texte", cartes: false },
      { id: "pcPrecautions", nom: "Précautions", section: "pc-precautions", type: "texte", cartes: true },
      { id: "contreIndications", nom: "Contre-indications et incompatibilités", section: "pc-precautions", type: "texte", cartes: true },
      { id: "preparationsMtc", nom: "Préparations", section: "pc-preparation", type: "texte", cartes: false },
      { id: "synthese", nom: "Synthèse", section: "pc-synthese", type: "texte", cartes: false },
      { id: "composants", nom: "Composants", section: "pc-recherches", type: "texte", cartes: false },
      { id: "recherches", nom: "Recherches modernes", section: "pc-recherches", type: "texte", cartes: false },
    ];
  }
  // (les listes à tirets du cours deviennent des puces)
  const texte = (v) => (Array.isArray(v) ? v.map((x) => "• " + x).join("\n") : v ? String(v).trim().split("\n").map((l) => l.replace(/^\s*-\s+/, "• ")).join("\n").trim() : "");
  // les rubriques des fiches complètes ; une correction (ou un ajout) faite dans le jeu l'emporte
  const DE_LA_FICHE = { indications: "indications", associations: "associations", formules: "formules", vs: "comparaisons", precautions: "pcPrecautions",
    contre_indications: "contreIndications", preparations: "preparationsMtc", syntheses: "synthese", ingredients: "composants", recherches_modernes: "recherches" };
  const DE_LA_CORRECTION = { indications: "indications", associations: "associations", formules: "formules", vs: "comparaisons", precaution: "pcPrecautions", precautions: "pcPrecautions",
    contre_indications: "contreIndications", preparation: "preparationsMtc", synthese: "synthese", ingredients: "composants", recherches_modernes: "recherches", synonymes: "synonymes" };
  function convertir(src) {
    const vus = new Set(), plantes = [];
    for (const h0 of src.herbes) {
      const h = Object.assign({}, h0, src.ajouts[h0.id], src.corrections[h0.id]);
      let id = H.slug(h.pinyinSansTons || h.pinyin || h.id);
      while (vus.has(id)) id += "-2";
      vus.add(id);
      const v = {
        origine: "Pharmacopée chinoise",
        hanzi: h.hanzi || (src.fiches.hanzi || {})[h.id] || "",
        nomFr: h.nom || "", classe: h.classe || "", nature: h.nature || "", saveur: h.saveur || "", tropisme: h.tropisme || "", posologie: h.posologie || "",
        actions: texte(h.actions), esprit: texte(h.esprit),
      };
      if (h.prioritaire) v.essentielle = "Oui";
      for (const [cle, champ] of Object.entries(DE_LA_FICHE)) { const t = texte((src.fiches[cle] || {})[h.id]); if (t) v[champ] = t; }
      for (const [cle, champ] of Object.entries(DE_LA_CORRECTION)) { if (h[cle] != null && h[cle] !== "") v[champ] = texte(h[cle]); }
      for (const k of Object.keys(v)) if (!v[k]) delete v[k];
      plantes.push({ id, code: h.id, nom: h.pinyin || h.id, latin: "", valeurs: v, preparations: ["plante-seche"], source: "Pharmacopée chinoise (cours), " + h.id, pc: true });
    }
    return { champs: champs(src.classes || []), plantes };
  }
  // les fiches d'ƟvƟ et les fiches chinoises ensemble
  function fusionner(base, pc) {
    const ids = new Set(base.champs.map((c) => c.id));
    return Object.assign({}, base, {
      sections: base.sections.concat(SECTIONS.filter((s) => !base.sections.some((x) => x.id === s.id))),
      champs: base.champs.concat(pc.champs.filter((c) => !ids.has(c.id))),
      plantes: base.plantes.map((p) => Object.assign({}, p, { valeurs: Object.assign({ origine: "Herbier d’ƟvƟ" }, p.valeurs) })).concat(pc.plantes),
    });
  }

  let baseOvo = null, sigActuelle = "";
  async function chargerSource() {
    let src = await H.kv.lire(CACHE).catch(() => null);
    if (!src) {
      // la toute première fois (ou sans rien sur l'appareil) : la copie chiffrée livrée avec le jeu
      const r = await fetch("data/mesi.enc", { cache: "no-cache" });
      src = await H.chiffre.ouvrir(await r.json(), H.cle);
    }
    return src;
  }
  // puis on relit le site de jeuxmtc ; si les fiches ont changé, elles remplacent les anciennes
  async function rafraichir() {
    try {
      const src = await lireSite();
      const sig = signature(src);
      if (sig === sigActuelle) return;
      await H.kv.ecrire(CACHE, src);
      sigActuelle = sig;
      H.base = fusionner(baseOvo, convertir(src));
      H.d.invalider();
      H.emettre("donnees", "herbier");
    } catch (e) {
      console.warn("pharmacopée : site de jeuxmtc injoignable", e.message);
    }
  }
  H.pharmacopee = {
    site: SITE,
    rafraichir,
    // base : les fiches d'ƟvƟ, déchiffrées ; rend les fiches du monde de Mesi
    async avec(base) {
      baseOvo = base;
      const src = await chargerSource();
      sigActuelle = signature(src);
      setTimeout(rafraichir, 1500);
      return fusionner(base, convertir(src));
    },
    // une fiche chinoise qui part chez ƟvƟ (dans une île offerte) : le nom et le jardin seulement
    pourOvo(p) {
      const jardin = new Set(H.d.champs().filter((c) => c.section === "jardin").map((c) => c.id));
      const valeurs = Object.fromEntries(Object.entries(p.valeurs || {}).filter(([k]) => jardin.has(k)));
      return { id: p.id, nom: p.nom, latin: "", pc: true, preparations: [], valeurs };
    },
  };
})();
