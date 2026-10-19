// Petits outils partagés par tous les modules.
window.H = window.H || {};

(function () {
  const H = window.H;
  H.vues = H.vues || {};

  H.$ =(sel, racine) => (racine || document).querySelector(sel);
  H.$$ = (sel, racine) => Array.from((racine || document).querySelectorAll(sel));

  // el("div.classe", {attributs}, enfants…)
  // Dans le monde de Mesi, c'est elle qu'on joue : toute l'interface échange ƟvƟ et Mesi. H.fixe
  // garde un nom tel quel, quand il désigne vraiment la personne (les lettres, les cadeaux, les
  // fiches d'ƟvƟ, les réglages) : un caractère invisible le protège de l'échange.
  const LIEN = "\u2060";
  H.fixe = (t) => String(t).replace(/ƟvƟ|Mesi/g, (m) => m[0] + LIEN + m.slice(1));
  // Les accords suivent : ƟvƟ est non-binaire (écriture inclusive, « fier·e »), Mesi se genre au
  // féminin. Dans le monde de Mesi, les formes inclusives qui parlaient d'ƟvƟ (qu'on jouait)
  // parlent maintenant de Mesi : elles passent au féminin (« allé·e » → « allée », « iel » →
  // « elle »). auteur : qui disait la réplique dans le monde d'ƟvƟ ; quand ƟvƟ s'adressait à Mesi
  // (« tu es le·la meilleur·e »), c'est désormais Mesi qui s'adresse à ƟvƟ : l'inclusif reste.
  const SPECIAUX = { "le·la": "la", "Le·la": "La", "lui·elle": "elle", "Lui·elle": "Elle", "il·elle": "elle", "Il·elle": "Elle", "celui·celle": "celle" };
  function feminin(a, b) {
    if (SPECIAUX[a + "·" + b]) return SPECIAUX[a + "·" + b];
    if (/eur$/.test(a) && /^rices?$/.test(b)) return a.slice(0, -3) + b;
    if (/eur$/.test(a) && /^euses?$/.test(b)) return a.slice(0, -3) + b;
    if (/eur$/.test(a) && /^ses?$/.test(b)) return a.slice(0, -1) + b;
    if (/x$/.test(a) && /^ses?$/.test(b)) return a.slice(0, -1) + b;
    if (/f$/.test(a) && /^ves?$/.test(b)) return a.slice(0, -1) + b;
    if (/ier$/.test(a) && /^es?$/.test(b)) return a.slice(0, -2) + "èr" + b;
    return a + b;
  }
  function accorder(t, auteur) {
    t = t.replace(/du·de la/g, "de la").replace(/\b(I|i)el\b/g, (m, i) => (i === "I" ? "Elle" : "elle"));
    t = t.replace(/([A-Za-zÀ-ÿ’']+)·([a-zà-ÿ]+)(?:·([a-zà-ÿ]+))?/g, (m, a, b, c, i) => {
      if (auteur === "ovo" && /\b(tu|t’|toi|te)\b[^.!?]{0,30}$/i.test(t.slice(Math.max(0, i - 40), i))) return m;
      return feminin(a, b) + (c || "");
    });
    // ce que Mesi disait d'elle-même (« je suis fière ») : c'est ƟvƟ qui le dit, en inclusif
    if (auteur === "luigi") t = t.replace(/\b(je suis|je me sens|j’étais|je serai) (fière|contente|heureuse|ravie|désolée|sûre|fatiguée|amoureuse|émue|prête)\b/gi, (m, v, adj) => v + " " + ({ fière: "fier·e", contente: "content·e", heureuse: "heureux·se", ravie: "ravi·e", désolée: "désolé·e", sûre: "sûr·e", fatiguée: "fatigué·e", amoureuse: "amoureux·se", émue: "ému·e", prête: "prêt·e" })[adj.toLowerCase()]);
    return t;
  }
  H.accorder = (t, auteur) => (H.monde === "mesi" && typeof t === "string" ? accorder(t, auteur) : t);
  const echange = (t) => (H.monde === "mesi" && typeof t === "string" ? accorder(t.replace(/ƟvƟ|Mesi/g, (m) => (m === "Mesi" ? "ƟvƟ" : "Mesi"))) : t);
  H.echangeNoms = echange;
  const ATTRS_TEXTE = new Set(["title", "aria-label", "placeholder", "alt"]);
  H.el = function (tag, attrs, ...enfants) {
    const [tete, ...classes] = tag.split(".");
    const [nom, id] = tete.split("#");
    const n = document.createElement(nom || "div");
    if (id) n.id = id;
    if (classes.length) n.className = classes.join(" ");
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "html") n.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
        else n.setAttribute(k, v === true ? "" : ATTRS_TEXTE.has(k) ? echange(v) : v);
      }
    }
    for (const e of enfants.flat()) {
      if (e == null || e === false) continue;
      n.appendChild(typeof e === "string" || typeof e === "number" ? document.createTextNode(echange(String(e))) : e);
    }
    return n;
  };

  H.echap = (t) =>
    String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  H.sansAccents = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  H.slug = (t) => H.sansAccents(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

  // --- noms de plantes dans une phrase : « le romarin », « de la sauge », « l’ortie » ----
  // Le genre se devine d'après le premier mot ; une fiche peut le préciser (p.genre : m, f, mp, fp).
  const MASCULINS_EN_E = "alkékenge lentisque lierre myrte trèfle tussilage solidage gingembre frêne saule chêne eleuthérocoque éleuthérocoque cèdre cyprès chèvrefeuille aulne epilobe épilobe".split(" ");
  const FEMININS = "arnica".split(" ");
  const SINGULIERS_EN_S = "aloès anis cyprès millepertuis radis fucus eucalyptus houx buis lis bois".split(" ");
  const H_MUETS = "harpagophyton harpagophytum hysope hibiscus huile herbe".split(" ");
  H.genre = function (p) {
    const nom = String((p && p.nom) || "").trim();
    const mot = nom.toLowerCase().split(/[\s(,’']/)[0];
    let g = p && p.genre;
    if (!g) {
      const pluriel = /[sx]$/.test(mot) && !SINGULIERS_EN_S.includes(mot);
      const base = pluriel ? mot.replace(/[sx]$/, "") : mot;
      const fem = FEMININS.includes(base) || (/e$/.test(base) && !MASCULINS_EN_E.includes(base));
      g = (fem ? "f" : "m") + (pluriel ? "p" : "");
    }
    const elision = /^[aeiouyàâäéèêëîïôöùûü]/.test(mot) || H_MUETS.includes(mot);
    return { f: g[0] === "f", pl: g.length > 1, elision };
  };
  // le nom en minuscule dans une phrase (sauf « Marie », « Californie »…)
  H.nomPhrase = (p) => {
    const n = String((p && p.nom) || "");
    return n.charAt(0).toLowerCase() + n.slice(1);
  };
  const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  // « le romarin », « la sauge », « l’ortie », « les bouleaux » (maj : « Le romarin »)
  H.leNom = (p, maj) => {
    const g = H.genre(p);
    const t = (g.pl ? "les " : g.elision ? "l’" : g.f ? "la " : "le ") + H.nomPhrase(p);
    return maj ? majuscule(t) : t;
  };
  // « du romarin », « de la sauge », « de l’ortie », « des bouleaux »
  H.duNom = (p) => {
    const g = H.genre(p);
    return (g.pl ? "des " : g.elision ? "de l’" : g.f ? "de la " : "du ") + H.nomPhrase(p);
  };
  // « au romarin », « à la sauge », « à l’ortie », « aux bouleaux »
  H.auNom = (p) => {
    const g = H.genre(p);
    return (g.pl ? "aux " : g.elision ? "à l’" : g.f ? "à la " : "au ") + H.nomPhrase(p);
  };
  // accord : H.accord(p, "il", "elle", "ils", "elles")
  H.accord = (p, m, f, mp, fp) => {
    const g = H.genre(p);
    return g.pl ? (g.f ? fp : mp) : g.f ? f : m;
  };
  // « le romarin, la sauge et l’ortie »
  H.listeNoms = (plantes, article) => {
    const noms = plantes.map((p) => (article === false ? H.nomPhrase(p) : H.leNom(p)));
    return noms.length < 2 ? noms.join("") : noms.slice(0, -1).join(", ") + " et " + noms[noms.length - 1];
  };

  // Lignes d'une rubrique de fiche, sans mise en forme. Quand la fiche renvoie au
  // « chapitre HE » ou « Aromathérapie », on va lire la partie concernée de la même fiche.
  const RENVOIS = [
    { motif: /\s*voir (?:le )?chapitre (?:HE|huiles? essentielles?|aromath[ée]rapie)\.?/i, champ: "aromatherapie" },
    { motif: /\s*voir (?:le )?chapitre gemmoth[ée]rapie\.?/i, champ: "gemmotherapie" },
    { motif: /\s*voir (?:le )?chapitre (?:[ée]lixirs?|fleurs de bach)\.?/i, champ: "elixirs" },
  ];
  const nettoyer = (l) => l.replace(/^[•\-–\s]+/, "").replace(/^#+\s*/, "").replace(/\*\*/g, "").trim();
  H.lignesFiche = function (p, champ) {
    const v = (p && p.valeurs) || {};
    const lignes = String(v[champ] || "").split("\n").map(nettoyer).filter(Boolean);
    const sortie = [];
    for (const l of lignes) {
      const renvoi = RENVOIS.find((r) => r.motif.test(l));
      if (!renvoi || renvoi.champ === champ) {
        sortie.push(l);
        continue;
      }
      const reste = l.replace(renvoi.motif, "").trim();
      let cible = String(v[renvoi.champ] || "").split("\n").map(nettoyer).filter(Boolean);
      // pour les précautions, seulement ce qui parle de précautions dans l'autre partie
      if (champ === "precautions") {
        const prudence = cible.filter((x) => /pr[ée]caution|contre-indication|\bCI\b|toxi|[ée]viter|proscrire|d[ée]conseill|irritant|allerg|grossesse/i.test(x));
        if (prudence.length) cible = prudence;
      }
      if (reste) sortie.push(cible.length ? reste.replace(/\.$/, "") + " :" : reste);
      sortie.push(...cible);
    }
    return sortie;
  };

  H.uid = (prefixe) => (prefixe || "x") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  H.maintenant = () => Date.now();

  // Texte des fiches : paragraphes, puces « • », sous-titres « ## » / « ### », **gras**.
  H.texteRiche = function (texte) {
    if (!texte) return "";
    const lignes = String(texte).split("\n");
    let html = "";
    let liste = false;
    const inline = (s) =>
      H.echap(s)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
    for (let l of lignes) {
      l = l.trim();
      if (!l) continue;
      const puce = /^(•|-|–|→)\s*/.exec(l);
      if (puce) {
        if (!liste) {
          html += "<ul>";
          liste = true;
        }
        html += "<li>" + inline(l.slice(puce[0].length)) + "</li>";
        continue;
      }
      if (liste) {
        html += "</ul>";
        liste = false;
      }
      if (l.startsWith("###")) html += "<h5>" + inline(l.replace(/^#+\s*/, "")) + "</h5>";
      else if (l.startsWith("##")) html += "<h4>" + inline(l.replace(/^#+\s*/, "")) + "</h4>";
      else html += "<p>" + inline(l) + "</p>";
    }
    if (liste) html += "</ul>";
    return html;
  };

  // Générateur pseudo-aléatoire reproductible (même graine = même dessin).
  H.alea = function (graine) {
    let a = typeof graine === "string" ? H.hash(graine) : graine >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  H.hash = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  // Dessin en pixels : motif = lignes de caractères, palette = {caractère: couleur}.
  const cachePixel = new Map();
  H.dessinPixel = function (motif, palette, echelle) {
    echelle = echelle || 1;
    const cle = motif.join("/") + JSON.stringify(palette) + echelle;
    if (cachePixel.has(cle)) return cachePixel.get(cle);
    const h = motif.length, w = Math.max(...motif.map((l) => l.length));
    const c = document.createElement("canvas");
    c.width = w * echelle;
    c.height = h * echelle;
    const ctx = c.getContext("2d");
    motif.forEach((ligne, y) => {
      for (let x = 0; x < ligne.length; x++) {
        const col = palette[ligne[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * echelle, y * echelle, echelle, echelle);
      }
    });
    const url = c.toDataURL("image/png");
    cachePixel.set(cle, url);
    return url;
  };

  // Volumes réglables (0 à 1) : musique, bruitages, pluie, babillage des bulles.
  H.VOLUMES = [["musique", "Musique", 0.7], ["bruitages", "Bruitages (pas, galop, criquets, cigales…)", 0.8], ["pluie", "Pluie", 0.7], ["voix", "Babillage des bulles", 0.8]];
  H.volume = function (cat) {
    const v = H.local && H.local.volumes && H.local.volumes[cat];
    if (v != null) return v;
    const d = H.VOLUMES.find((x) => x[0] === cat);
    return d ? d[2] : 1;
  };

  // Les pistes de bruitage, qu'on peut couper une par une (pour un jeu plus léger ou plus calme).
  H.PISTES = [["oiseaux", "Oiseaux du jardin"], ["nuit", "Criquets, hiboux et chouettes la nuit"], ["cigales", "Cigales"], ["goelands", "Goélands"],
    ["grenouilles", "Grenouilles du bassin"], ["poules", "Poules"], ["meme", "Ronron de Mémé"], ["feu", "Feu dans le poêle"], ["pas", "Pas et galop"],
    ["sangliers", "Sangliers"], ["pluie", "Pluie"]];
  H.piste = (id) => !(H.local && H.local.pistesCoupees && H.local.pistesCoupees.includes(id));
  // Les animations : « fluides », « ralenties » ou « presque immobiles » (moins d'images par
  // seconde, pour un appareil qui peine). Renvoie l'écart minimal entre deux images.
  H.cadence = (ms) => Math.max(ms, { ralenties: 100, immobiles: 400 }[(H.local && H.local.animations) || ""] || 0);

  // Petit bus d'évènements entre modules.
  const ecouteurs = {};
  H.sur = (nom, fn) => (ecouteurs[nom] = ecouteurs[nom] || []).push(fn);
  H.emettre = (nom, detail) => (ecouteurs[nom] || []).forEach((fn) => fn(detail));

  H.MOIS = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  H.MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  H.heure = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  H.anti = function (fn, ms) {
    let t;
    return function (...a) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, a), ms);
    };
  };

  H.telecharger = function (nom, contenu, type) {
    const url = URL.createObjectURL(new Blob([contenu], { type: type || "text/plain;charset=utf-8" }));
    const a = H.el("a", { href: url, download: nom });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Message discret en bas de l'écran.
  H.toast = function (texte, ms) {
    let t = H.$("#toast");
    if (!t) {
      t = H.el("div#toast", { role: "status" });
      document.body.appendChild(t);
    }
    t.textContent = echange(texte);
    t.classList.add("visible");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("visible"), ms || 2600);
  };
})();

// Le journal de la journée d'ƟvƟ : ce qu'iel fait sur la ferme et dans les jardins, avec l'heure,
// pour le raconter à Mesi le soir. Une même chose refaite dans la journée s'ajoute à la première
// (« j'ai planté menthe, thym et sauge sur … »). On repart à zéro chaque jour.
(function () {
  const H = window.H;
  const aujourdhui = () => new Date().toDateString();
  function noter(cle, avant, detail, apres) {
    if (!H.d || !H.d.majLocal) return;
    H.d.majLocal((l) => {
      if (!l.journal || l.journal.jour !== aujourdhui()) l.journal = { jour: aujourdhui(), items: [] };
      let it = l.journal.items.find((x) => x.cle === cle);
      if (!it) { it = { cle, h: Date.now(), avant, apres: apres || "", details: [], n: 0 }; l.journal.items.push(it); }
      it.n++;
      if (detail && !it.details.includes(detail)) it.details.push(detail);
      if (l.journal.items.length > 40) l.journal.items.shift();
    });
  }
  const liste = (a) => (a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " et " + a[a.length - 1]);
  function heure(ms) {
    const d = new Date(ms), h = d.getHours(), m = d.getMinutes();
    return h + " h" + (m ? " " + String(m).padStart(2, "0") : "");
  }
  function moment(ms) {
    const h = new Date(ms).getHours();
    return h < 12 ? "ce matin" : h < 14 ? "à midi" : h < 18 ? "cet après-midi" : "ce soir";
  }
  // le récit, dans l'ordre : quelques répliques d'ƟvƟ
  function recit() {
    const j = (H.local || {}).journal;
    const items = j && j.jour === aujourdhui() ? j.items.slice().sort((a, b) => a.h - b.h) : [];
    if (!items.length) return [];
    const phrases = items.map((it, k) => {
      const quoi = it.avant + (it.details.length ? liste(it.details) : "") + it.apres;
      const quand = k === 0 ? moment(it.h).replace(/^c/, "C").replace(/^à/, "À") + ", à " + heure(it.h) + ", " : k === items.length - 1 ? "Et pour finir, à " + heure(it.h) + ", " : ["Ensuite, à ", "Puis, à ", "Vers ", "À "][k % 4] + heure(it.h) + ", ";
      return quand + quoi + ".";
    });
    const lignes = [];
    for (let k = 0; k < phrases.length; k += 2) lignes.push(phrases.slice(k, k + 2).join(" "));
    return lignes;
  }
  H.journal = { noter, recit };
})();

// Le champagne de l'anniversaire d'ƟvƟ (le 24 février) : Mesi en propose une coupe à la maison.
// Trois minutes plus tard, et pendant vingt minutes, ƟvƟ voit tout de travers : sur la ferme,
// des copies d'ƟvƟ traînent derrière iel, des boucles de couleur tournent dans le ciel et des
// bulles montent. H.champagne.force() renvoie la force de l'effet (0 à 1).
(function () {
  const H = window.H;
  const MONTEE = 3 * 60e3, DUREE = 20 * 60e3;
  H.champagne = {
    anniversaire: () => { const d = new Date(); return d.getMonth() === 1 && d.getDate() === 24; },
    boire() { if (H.d && H.d.majLocal) H.d.majLocal((l) => (l.champagne = Date.now())); },
    force() {
      const bu = (H.local || {}).champagne;
      if (!bu) return 0;
      const t = Date.now() - bu;
      if (t < MONTEE * 0.3 || t > MONTEE + DUREE) return 0;
      if (t < MONTEE) return (t - MONTEE * 0.3) / (MONTEE * 0.7);
      return Math.min(1, (MONTEE + DUREE - t) / (3 * 60e3));
    },
  };
})();

// Les arbres, arbustes et lianes à feuilles caduques, et la couleur de leur feuillage d'automne.
// H.feuillage(id) dit où en est leur feuillage aujourd'hui, au rythme du Midi : null pour les
// plantes qui gardent leurs feuilles ; sinon { densite (0 nu → 1 plein), automne (part des
// feuilles colorées), jeune (feuilles tendres du printemps), couleur, cle (pour les dessins) }.
// À Marseille, tout reste vert jusqu'à la fin octobre : les feuilles prennent leurs couleurs en
// novembre, quand il fait vraiment plus froid, et tombent de la fin novembre à la mi-décembre ;
// les branches restent nues jusqu'à la fin février ; tout repousse en mars et avril.
(function () {
  const H = window.H;
  const CADUCS = {
    "prunus-amygdalus": "#ff8f2e", "crataegus-monogyna": "#d23a2a", "alnus-glutinosa": "#c99a3a", "betula-pubescens": "#ffd23a",
    "ribes-nigrum": "#e9b44c", "castanea-sativa": "#e8714a", "cornus-sanguinea": "#d23a2a", "rosa-canina": "#ff5b4f",
    "eleutherococcus-senticosus": "#e9b44c", "ficus-carica": "#f6ee55", "rubus-idaeus": "#e8714a", "fraxinus-excelsior": "#c6cf55",
    "vitex-agnus": "#c99a3a", "ginkgo-biloba": "#f6ee55", "humulus-lupulus": "#e9b44c", "aesculus-hippocastanum": "#e8714a",
    "morus-nigra": "#ffd23a", "vaccinium-myrtillus": "#d23a2a", "corylus-avellana": "#ffd23a", "juglans-regia": "#e9b44c",
    "passiflora-incarnata": "#e9b44c", "salix-alba": "#f6ee55", "sambucus-nigra": "#c99a3a", "tilia-cordata": "#ffd23a",
    "lippia-citriodora": "#e9b44c", "vitis-vinifera": "#d23a2a", "rubus-fruticosus": "#c93f6e",
  };
  H.feuillage = function (id, date) {
    const couleur = CADUCS[id];
    if (!couleur) return null;
    const d = date || new Date();
    const j = (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 864e5;
    // (1er mars ≈ jour 59, 1er mai ≈ 120, 1er novembre ≈ 304, 22 novembre ≈ 325, 18 décembre ≈ 351)
    let densite = 1, automne = 0, jeune = 0;
    if (j < 59 || j >= 351) densite = 0;
    else if (j < 120) { densite = Math.min(1, (j - 59) / 50); jeune = Math.min(1, 1 - (j - 100) / 20); }
    else if (j >= 304) { automne = Math.min(1, (j - 304) / 20); densite = j < 325 ? 1 : Math.max(0, 1 - (j - 325) / 26); }
    const q = (v) => Math.round(v * 10) / 10;
    const f = { couleur, densite: q(densite), automne: q(automne), jeune: q(Math.max(0, jeune)) };
    f.cle = f.densite + "," + f.automne + "," + f.jeune;
    return f;
  };
})();
