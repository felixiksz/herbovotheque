// Bruitages enregistrés : miaou (appeler Luigi), attention (Luigi qui appelle au loin),
// pas (ƟvƟ sur le pavé), roll (la pluie), galop (Lóló qui arrive).
(function () {
  const H = window.H;
  const FICHIERS = { miaou: "sons/miaou.mp3", attention: "sons/attention.mp3", pas: "sons/pas.mp3", pluie: "sons/roll.mp3", galop: "sons/galop.mp3" };
  const boucles = {};

  const actif = () => H.local && H.local.son && document.visibilityState === "visible";

  H.sons = {
    // un son joué une fois
    jouer(nom, volume) {
      if (!actif()) return null;
      const a = new Audio(FICHIERS[nom]);
      a.volume = volume == null ? 0.8 : volume;
      a.play().catch(() => {});
      return a;
    },
    // un son en boucle (pas, pluie) qu'on allume ou éteint
    boucle(nom, allume, volume) {
      let a = boucles[nom];
      if (allume && actif()) {
        if (!a) {
          a = boucles[nom] = new Audio(FICHIERS[nom]);
          a.loop = true;
        }
        a.volume = volume == null ? 0.5 : volume;
        if (a.paused) a.play().catch(() => {});
      } else if (a && !a.paused) {
        a.pause();
      }
    },
    toutCouper() {
      Object.values(boucles).forEach((a) => a.pause());
    },
  };

  // La pluie : quand il pleut vraiment (d'après la météo du lieu choisi)
  function pluie() {
    const m = H.ciel && H.ciel.meteo;
    const pleut = !!m && (m.type === "pluie" || m.type === "orage");
    H.sons.boucle("pluie", pleut && !!H.jeu, m && m.type === "orage" ? 0.55 : 0.35);
  }
  H.sur("meteo", pluie);
  H.sur("ciel", pluie);
  document.addEventListener("pointerdown", pluie);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.sons.toutCouper();
    else pluie();
  });
})();
