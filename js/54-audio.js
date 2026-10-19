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
    if (ctx.state === "suspended" && !endormi) ctx.resume();
    return ctx;
  }
  // Quand on change de fenêtre, Android ralentit la page mais laisse la sortie audio ouverte :
  // le son, mal nourri, grésille dans les enceintes. On l'éteint en douceur puis on met la sortie
  // en veille, et on la réveille au retour.
  let endormi = false, veille = null;
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    const t = ctx.currentTime;
    entree.gain.cancelScheduledValues(t);
    clearTimeout(veille);
    if (document.visibilityState === "hidden") {
      endormi = true;
      entree.gain.setTargetAtTime(0, t, 0.04);
      veille = setTimeout(() => endormi && ctx.suspend().catch(() => {}), 250);
    } else {
      endormi = false;
      ctx.resume().catch(() => {});
      entree.gain.setTargetAtTime(1, ctx.currentTime, 0.08);
    }
  });
  // Le navigateur garde le son coupé tant qu'on n'a pas touché la page (une règle des navigateurs
  // contre les pages qui font du bruit toutes seules) : on le débloque dès le premier geste, où
  // que ce soit (un toucher, un clic, une touche), et pas seulement sur un bouton qui joue un son.
  const debloquer = () => {
    const c = contexte();
    if (c && c.state === "running") for (const ev of ["pointerdown", "pointerup", "touchend", "keydown"]) document.removeEventListener(ev, debloquer, true);
  };
  for (const ev of ["pointerdown", "pointerup", "touchend", "keydown"]) document.addEventListener(ev, debloquer, true);
  H.audio = {
    contexte,
    sortie: () => (contexte(), entree),
  };
})();
