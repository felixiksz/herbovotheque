// Une seule sortie audio pour tout le jeu (musique, bruitages, voix des dialogues).
// Plusieurs lecteurs séparés se disputent le son du téléphone et le font saccader ; et
// sans rien pour retenir les crêtes, leurs sons s'additionnent jusqu'à saturer les
// haut-parleurs. Ici, tout passe par un limiteur avant de sortir.
(function () {
  const H = window.H;
  let ctx = null, entree = null;
  function contexte() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      // « playback » : une mémoire tampon plus large, le son ne hoquette plus quand l'écran travaille
      try {
        ctx = new AC({ latencyHint: "playback" });
      } catch (e) {
        ctx = new AC();
      }
      entree = ctx.createGain();
      // les basses trop profondes, qu'un téléphone ne sait pas jouer, ne font que le faire grésiller
      const coupeBas = ctx.createBiquadFilter();
      coupeBas.type = "highpass";
      coupeBas.frequency.value = 45;
      const limiteur = ctx.createDynamicsCompressor();
      limiteur.threshold.value = -12;
      limiteur.knee.value = 6;
      limiteur.ratio.value = 12;
      limiteur.attack.value = 0.003;
      limiteur.release.value = 0.25;
      const fin = ctx.createGain();
      fin.gain.value = 0.9;
      entree.connect(coupeBas).connect(limiteur).connect(fin).connect(ctx.destination);
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  H.audio = {
    contexte,
    sortie: () => (contexte(), entree),
  };
})();
