// Village (provisoire en attendant la carte en pixels).
(function () {
  const H = window.H;
  H.vues.village = {
    afficher(c) {
      const s = H.ciel.etat();
      c.appendChild(H.el("h1", null, "Bonjour ƟvƟ"));
      c.appendChild(H.el("p", null, H.jeu.lieu.nom + " · " + s.saison + " · " + s.moment));
      c.appendChild(H.el("div.pastilles", null,
        H.el("a.bouton", { href: "#herbotheque" }, "Herbothèque"),
        H.el("a.bouton", { href: "#cartes" }, "Flashcartes"),
        H.el("a.bouton", { href: "#terrain" }, "Terrain")
      ));
    },
  };
  ["cartes", "terrain", "tisanes"].forEach((v) => {
    if (!H.vues[v]) H.vues[v] = { afficher: (c) => c.appendChild(H.el("p", null, "Bientôt.")) };
  });
})();
