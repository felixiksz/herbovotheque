// L'ordinateur de la ferme : les outils (flashcartes, réglages, lettres, labo, serre, îles,
// tisanes) s'ouvrent dans une fenêtre, sous une barre de menus jaune, à côté d'icônes en pixels,
// comme le bureau de l'herbothèque. Les scènes (ferme, maison, balade, îles) restent en plein écran.
(function () {
  const H = window.H;

  // le titre de chaque fenêtre ; les vues absentes de cette liste ne s'ouvrent pas en fenêtre
  const FENETRES = {
    cartes: "Flashcartes",
    get tisanes() { return H.monde === "mesi" ? "Mes formules" : "Placard à tisanes"; },
    labo: "Labo",
    serre: "Serre",
    lettres: "Boîte aux lettres",
    terrain: "Les îles",
    reglages: "Réglages",
    textes: "Les textes du jeu",
    surprises: "Surprises",
  };
  // l'herbothèque et ses fiches ont déjà leur propre bureau : seulement la barre jaune
  const ORDI = ["herbotheque", "fiche"];

  // les icônes du bureau, 12 × 12 pixels
  const PAL = {
    k: "#23214a", w: "#f3f0dc", y: "#f6ee55", c: "#ff5b4f", v: "#4aa63e", V: "#2f6b35", b: "#3d5ee8",
    B: "#a8d8ec", m: "#c93f6e", o: "#e9b44c", n: "#9a6a3c", g: "#b8b6cc",
  };
  const ICONES = [
    ["village", "Ferme", [
      ".....kk.....", "....kcck....", "...kcccck...", "..kcccccck..", ".kcccccccck.", "kkkkkkkkkkkk",
      ".kwwwwwwwwk.", ".kwbbwwkkwk.", ".kwbbwwknwk.", ".kwwwwwknwk.", "vkkkkkkkkkkv", "vvvvvvvvvvvv"]],
    ["herbotheque", "Herbothèque", [
      "...kkkkkk...", "...knnnnk...", "..kkkkkkkk..", "..kwwwwwwk..", ".kwwvwwvwwk.", ".kwvvwvvwwk.",
      ".kwwvvvwwwk.", ".kwwwvwwwwk.", ".kwoooooowk.", ".kwoooooowk.", "..kwwwwwwk..", "...kkkkkk..."]],
    ["cartes", "Flashcartes", [
      "...kkkkkkkk.", "...kyyyyyyk.", "kkkkkkkkkyk.", "kwwwwwwwkyk.", "kwkkkkkwkyk.", "kwwwwwwwkyk.",
      "kwkkkwwwkyk.", "kwwwwwwwkkk.", "kwwmmwwwk...", "kwwmmwwwk...", "kwwwwwwwk...", "kkkkkkkkk..."]],
    ["tisanes", "Tisanes", [
      "...g..g.....", "..g..g......", "...g..g.....", "............", "kkkkkkkkk...", "kwwwwwwwkkk.",
      "kwoooooowk.k", "kwoooooowk.k", "kwwwwwwwkkk.", ".kwwwwwk....", "kkkkkkkkkk..", ".kkkkkkkk..."]],
    ["labo", "Labo", [
      "....kkkk....", "....kwwk....", "....kwwk....", "....kwwk....", "...kwwwwk...", "...kwwwwk...",
      "..kwwwwwwk..", "..kmmmmmmk..", ".kmmwmmmmmk.", ".kmmmmmwmmk.", "kmmmmmmmmmmk", "kkkkkkkkkkkk"]],
    ["serre", "Serre", [
      "....kkkk....", "..kkBBBBkk..", ".kBBBBkBBBk.", ".kBBBBkBBBk.", "kBBBBBkBBBBk", "kBBBBBkBBBBk",
      "kBvBBBkBBvBk", "kvvvBBkBvvvk", "kkkkkkkkkkkk", "kggggggggggk", "kkkkkkkkkkkk", "............"]],
    ["lettres", "Lettres", [
      "............", "kkkkkkkkkkkk", "kwkwwwwwwkwk", "kwwkwwwwkwwk", "kwwwkwwkwwwk", "kwwwwccwwwwk",
      "kwwwkcckwwwk", "kwwkwwwwkwwk", "kwkwwwwwwkwk", "kkwwwwwwwwkk", "kkkkkkkkkkkk", "............"]],
    ["terrain", "Îles", [
      ".....Vv.vV..", "....vvVvvvv.", "...vV.n..Vv.", "......n.....", "......n.....", ".....n......",
      ".....n......", "...oooooo...", ".oooooooooo.", "bbbbbbbbbbbb", "bBbbbBbbbbBb", "bbbbbbbbbbbb"]],
    ["reglages", "Réglages", [
      "....kkkk....", ".kk.kyyk.kk.", ".kykkyykkyk.", "..kyyyyyyk..", "kkyykkkkyykk", "kyyykwwkyyyk",
      "kyyykwwkyyyk", "kkyykkkkyykk", "..kyyyyyyk..", ".kykkyykkyk.", ".kk.kyyk.kk.", "....kkkk...."]],
  ];

  const cacheIcones = {};
  function icone(motif) {
    const cle = motif.join("");
    if (!cacheIcones[cle]) {
      const c = document.createElement("canvas");
      c.width = c.height = 12;
      const x = c.getContext("2d");
      motif.forEach((l, j) => [...l].forEach((ch, i) => {
        if (PAL[ch]) { x.fillStyle = PAL[ch]; x.fillRect(i, j, 1, 1); }
      }));
      cacheIcones[cle] = c.toDataURL("image/png");
    }
    return H.el("img.icone-pixel", { src: cacheIcones[cle], alt: "", width: 36, height: 36 });
  }

  function icones(vue) {
    return H.el("nav.icones-bureau", { "aria-label": "Bureau" },
      ICONES.map(([v, nom, motif]) => H.el("a.icone-bureau" + (v === vue ? ".ouverte" : ""), { href: "#" + v }, icone(motif), H.el("span", null, v === "tisanes" && H.monde === "mesi" ? "Formules" : nom)))
    );
  }

  // Prépare la fenêtre dans le conteneur de la page et renvoie l'endroit où la vue se dessine.
  function cadre(vue, conteneur) {
    const contenu = H.el("div.contenu-vue");
    conteneur.append(
      icones(vue),
      H.el("section.fenetre-vue", null,
        H.el("div.titre-fenetre", null,
          H.el("a.fermer-fenetre", { href: "#village", "aria-label": "Fermer et revenir à la ferme", title: "Revenir à la ferme" }, "×"),
          H.el("span", null, FENETRES[vue])
        ),
        contenu
      )
    );
    return contenu;
  }

  // « fenetre » pour les outils, « ordi » pour l'herbothèque, rien pour les scènes
  function mode(vue, params) {
    if (vue === "terrain" && params[0]) return null;
    if (FENETRES[vue]) return "fenetre";
    if (ORDI.includes(vue)) return "ordi";
    return null;
  }

  // Des onglets, comme dans la maquette : une rangée en haut, ou une liste à gauche (lateral),
  // comme les préférences d'un vieux Mac. sections : [{ nom, el }] ; l'onglet ouvert est retenu.
  const ouverts = {};
  function onglets(sections, opts) {
    opts = opts || {};
    sections = sections.filter((s) => s && s.el);
    let actif = Math.min(ouverts[opts.cle] || 0, sections.length - 1);
    const boutons = sections.map((s, i) => H.el("button.onglet-vue", {
      type: "button",
      role: "tab",
      onclick() { actif = ouverts[opts.cle] = i; montrer(); },
    }, s.nom));
    const panneau = H.el("div.panneau-onglet", { role: "tabpanel" });
    function montrer() {
      boutons.forEach((b, i) => { b.classList.toggle("actif", i === actif); b.setAttribute("aria-selected", String(i === actif)); });
      panneau.replaceChildren(...[].concat(sections[actif].el));
      // une section seule dans son onglet : toujours ouverte, sans son titre (c'est celui de l'onglet)
      if (panneau.children.length === 1 && panneau.firstChild.tagName === "DETAILS") panneau.firstChild.open = true;
    }
    montrer();
    return H.el("div.onglets-vue" + (opts.lateral ? ".lateral" : ""), null, H.el("div.rangee-onglets", { role: "tablist" }, boutons), panneau);
  }

  // l'heure dans la barre de menus
  function heure() {
    let h = H.$("#heure-entete");
    if (!h) {
      h = H.el("span#heure-entete.heure-entete");
      H.$("#entete").appendChild(h);
    }
    h.textContent = new Date().toLocaleString("fr-FR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  }
  setInterval(() => document.documentElement.dataset.bureau && heure(), 20e3);

  H.bureau = {
    mode,
    cadre,
    onglets,
    preparer(m) {
      if (m) document.documentElement.dataset.bureau = m;
      else delete document.documentElement.dataset.bureau;
      if (m) heure();
    },
  };
})();
