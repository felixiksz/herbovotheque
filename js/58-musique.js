// Musique douce, composée à la volée (en attendant le choix du style définitif).
// Accords tenus + petites notes pincées sur une gamme pentatonique ; plus feutré la nuit.
// Elle démarre au premier clic (les navigateurs interdisent le son avant) et se coupe dans les réglages.
(function () {
  const H = window.H;
  let ctx = null, maitre = null, minuteur = null, actif = false;

  const JOUR = { accords: [[60, 64, 67, 71], [57, 60, 64, 67], [62, 65, 69, 72], [55, 59, 62, 65]], gamme: [72, 74, 76, 79, 81, 84] };
  const NUIT = { accords: [[57, 60, 64, 67], [53, 57, 60, 64], [55, 58, 62, 65], [52, 55, 59, 62]], gamme: [69, 72, 74, 76, 79] };
  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  function note(freq, debut, duree, volume, type) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = type || "triangle";
    o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, debut);
    g.gain.exponentialRampToValueAtTime(volume, debut + Math.min(0.4, duree / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, debut + duree);
    o.connect(f).connect(g).connect(maitre);
    o.start(debut);
    o.stop(debut + duree + 0.05);
  }

  let mesure = 0;
  function programmer() {
    if (!actif) return;
    const nuit = document.documentElement.dataset.theme === "nuit";
    const m = nuit ? NUIT : JOUR;
    const t = ctx.currentTime + 0.1;
    const duree = nuit ? 4.8 : 4;
    const accord = m.accords[mesure % m.accords.length];
    accord.forEach((n, i) => note(hz(n - 12), t + i * 0.03, duree * 1.1, 0.025, "sine"));
    const pas = nuit ? 6 : 8;
    for (let i = 0; i < pas; i++) {
      if (Math.random() < (nuit ? 0.35 : 0.5)) {
        const n = m.gamme[Math.floor(Math.random() * m.gamme.length)];
        note(hz(n), t + (i * duree) / pas + Math.random() * 0.05, 1.2, 0.02, "triangle");
      }
    }
    mesure++;
    minuteur = setTimeout(programmer, duree * 1000 - 120);
  }

  H.musique = {
    jouer() {
      if (actif || !H.local || !H.local.musique) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = ctx || new AC();
      if (ctx.state === "suspended") ctx.resume();
      maitre = maitre || ctx.createGain();
      maitre.gain.value = 0.6;
      maitre.connect(ctx.destination);
      actif = true;
      programmer();
    },
    arreter() {
      actif = false;
      clearTimeout(minuteur);
      if (maitre) {
        maitre.disconnect();
        maitre = null;
      }
    },
  };

  // démarre au premier geste, et s'arrête quand l'appli passe en arrière-plan
  const premierGeste = () => {
    if (H.local && H.local.musique && H.jeu) H.musique.jouer();
  };
  document.addEventListener("pointerdown", premierGeste);
  document.addEventListener("keydown", premierGeste);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.musique.arreter();
  });
})();
