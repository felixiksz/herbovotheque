// Musique ambiante, à la manière de Brian Eno (Music for Airports) : quelques voix
// répètent chacune une note à des périodes différentes, qui ne retombent jamais en phase,
// dans une grande réverbération. Le mode suit la vraie météo du lieu :
// soleil → lydien (très majeur), nuages → dorien, pluie → éolien (mineur),
// orage → phrygien, agité, avec un grondement ; la nuit, tout est plus lent et plus feutré.
// Elle démarre au premier geste (les navigateurs l'exigent) et se coupe dans les réglages.
(function () {
  const H = window.H;

  const MODES = {
    clair: { nom: "soleil, lydien", gamme: [0, 2, 4, 6, 7, 9, 11], fond: 50, clarte: 2600, tempo: 1, attaque: 2.2, duree: 7, densite: 1 },
    voile: { nom: "voilé, ionien", gamme: [0, 2, 4, 5, 7, 9, 11], fond: 50, clarte: 2200, tempo: 1.05, attaque: 2.4, duree: 7, densite: 1 },
    nuages: { nom: "nuageux, dorien", gamme: [0, 2, 3, 5, 7, 9, 10], fond: 48, clarte: 1700, tempo: 1.15, attaque: 2.8, duree: 8, densite: 0.9 },
    brume: { nom: "brume, dorien", gamme: [0, 2, 3, 5, 7, 9, 10], fond: 46, clarte: 1100, tempo: 1.5, attaque: 3.5, duree: 10, densite: 0.6 },
    pluie: { nom: "pluie, mineur", gamme: [0, 2, 3, 5, 7, 8, 10], fond: 45, clarte: 1300, tempo: 1.3, attaque: 3, duree: 9, densite: 0.85 },
    neige: { nom: "neige, pentatonique", gamme: [0, 3, 5, 7, 10], fond: 57, clarte: 3200, tempo: 1.6, attaque: 0.05, duree: 5, densite: 0.55, cloche: true },
    orage: { nom: "orage, phrygien agité", gamme: [0, 1, 3, 5, 7, 8, 10], fond: 43, clarte: 1500, tempo: 0.32, attaque: 0.08, duree: 1.6, densite: 1.3, orage: true },
  };
  // degrés et périodes (en secondes) des voix ; les périodes ne se divisent pas entre elles
  const VOIX = [[0, 17.8], [2, 20.1], [4, 23.6], [1, 26.3], [5, 29.9], [3, 31.4], [6, 34.0], [7, 39.7]];

  let ctx = null, sortie = null, entree = null, filtre = null, reverb = null;
  let actif = false, minuteur = null, mode = MODES.clair, nuit = false;
  let prochaines = [], bourdon = null, grondement = null;

  const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // réverbération : une réponse impulsionnelle de bruit qui s'éteint lentement
  function impulsion(secondes) {
    const n = Math.floor(ctx.sampleRate * secondes);
    const b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = b.getChannelData(c);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2.6);
    }
    return b;
  }

  function construire() {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = ctx || new AC();
    sortie = ctx.createGain();
    sortie.gain.value = 0.0001;
    sortie.connect(ctx.destination);
    filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = mode.clarte;
    reverb = ctx.createConvolver();
    reverb.buffer = impulsion(6.5);
    const sec = ctx.createGain();
    sec.gain.value = 0.35;
    const humide = ctx.createGain();
    humide.gain.value = 0.8;
    entree = ctx.createGain();
    entree.connect(filtre);
    filtre.connect(sec).connect(sortie);
    filtre.connect(reverb).connect(humide).connect(sortie);
  }

  function choisirMode() {
    const m = (H.ciel && H.ciel.meteo) || {};
    mode = MODES[m.type] || MODES.clair;
    nuit = document.documentElement.dataset.theme === "nuit";
  }

  function note(freq, t, volume) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine";
    o2.type = mode.cloche ? "sine" : "triangle";
    o.frequency.value = freq;
    o2.frequency.value = freq * (mode.cloche ? 2.76 : 2.003); // un harmonique discret (cloche pour la neige)
    o2.detune.value = (Math.random() - 0.5) * 8;
    const g2 = ctx.createGain();
    g2.gain.value = mode.cloche ? 0.35 : 0.12;
    const att = mode.attaque * (nuit ? 1.3 : 1);
    const duree = mode.duree * (nuit ? 1.25 : 1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(volume, t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + duree);
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(entree);
    o.start(t);
    o2.start(t);
    o.stop(t + att + duree + 0.1);
    o2.stop(t + att + duree + 0.1);
  }

  function hauteur(degre) {
    const g = mode.gamme;
    const octave = Math.floor(degre / g.length);
    return mode.fond + 12 + (nuit ? -5 : 0) + octave * 12 + g[degre % g.length];
  }

  function programmer() {
    if (!actif) return;
    const maintenant = ctx.currentTime;
    VOIX.forEach(([degre, periode], i) => {
      if (i >= Math.round(VOIX.length * Math.min(1, mode.densite))) return;
      const p = periode * mode.tempo * (nuit ? 1.35 : 1);
      while (prochaines[i] < maintenant + 1.5) {
        // l'orage bouscule les voix : petites notes rapides, parfois une octave plus haut
        const saut = mode.orage && Math.random() < 0.3 ? mode.gamme.length : 0;
        note(hz(hauteur(degre + saut)), prochaines[i], mode.orage ? 0.05 : 0.07);
        prochaines[i] += p * (mode.orage ? 0.6 + Math.random() * 0.8 : 1);
      }
    });
    // pendant l'orage, quelques notes graves supplémentaires, comme des éclairs
    if (mode.orage && Math.random() < 0.08) note(hz(mode.fond - 12 + mode.gamme[Math.floor(Math.random() * 3)]), maintenant + 0.2, 0.09);
    minuteur = setTimeout(programmer, 400);
  }

  function lancerBourdon() {
    arreterBourdon();
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(mode.orage ? 0.05 : 0.035, t + 6);
    const oscs = [0, 7, 12].map((dt, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = hz(mode.fond - 12 + dt + (nuit ? -5 : 0));
      o.detune.value = (i - 1) * 4;
      o.connect(g);
      o.start(t);
      return o;
    });
    // le timbre du bourdon respire lentement
    const lfo = ctx.createOscillator(), prof = ctx.createGain();
    lfo.frequency.value = mode.orage ? 0.9 : 0.05;
    prof.gain.value = mode.orage ? 0.02 : 0.012;
    lfo.connect(prof).connect(g.gain);
    lfo.start(t);
    g.connect(entree);
    bourdon = { g, oscs, lfo };
    if (mode.orage) lancerGrondement();
    else arreterGrondement();
  }
  function arreterBourdon() {
    if (!bourdon) return;
    const t = ctx.currentTime;
    bourdon.g.gain.cancelScheduledValues(t);
    bourdon.g.gain.setValueAtTime(Math.max(0.0001, bourdon.g.gain.value), t);
    bourdon.g.gain.exponentialRampToValueAtTime(0.0001, t + 4);
    bourdon.oscs.concat(bourdon.lfo).forEach((o) => o.stop(t + 4.2));
    bourdon = null;
  }

  // grondement d'orage : bruit brun très filtré, qui enfle par vagues
  function lancerGrondement() {
    if (grondement) return;
    const n = ctx.sampleRate * 4;
    const b = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = b.getChannelData(0);
    let dernier = 0;
    for (let i = 0; i < n; i++) {
      dernier = (dernier + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      d[i] = dernier * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 140;
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    const lfo = ctx.createOscillator(), prof = ctx.createGain();
    lfo.frequency.value = 0.07;
    prof.gain.value = 0.25;
    lfo.connect(prof).connect(g.gain);
    src.connect(f).connect(g).connect(sortie);
    g.gain.setTargetAtTime(0.3, ctx.currentTime, 3);
    src.start();
    lfo.start();
    grondement = { src, lfo, g };
  }
  function arreterGrondement() {
    if (!grondement) return;
    const t = ctx.currentTime;
    grondement.g.gain.setTargetAtTime(0.0001, t, 1.5);
    grondement.src.stop(t + 6);
    grondement.lfo.stop(t + 6);
    grondement = null;
  }

  // la météo ou la nuit changent : on glisse doucement vers la nouvelle couleur
  function majAmbiance() {
    if (!actif) return;
    const avant = mode, avantNuit = nuit;
    choisirMode();
    if (avant === mode && avantNuit === nuit) return;
    filtre.frequency.setTargetAtTime(mode.clarte * (nuit ? 0.6 : 1), ctx.currentTime, 4);
    lancerBourdon();
  }

  H.musique = {
    jouer() {
      if (actif || !H.local || !H.local.musique) return;
      if (!window.AudioContext && !window.webkitAudioContext) return;
      choisirMode();
      if (!ctx || !sortie) construire();
      if (ctx.state === "suspended") ctx.resume();
      filtre.frequency.value = mode.clarte * (nuit ? 0.6 : 1);
      sortie.gain.cancelScheduledValues(ctx.currentTime);
      sortie.gain.setTargetAtTime(Math.max(0.0001, 0.8 * H.volume("musique")), ctx.currentTime, 2.5);
      actif = true;
      const t = ctx.currentTime + 0.5;
      prochaines = VOIX.map((v, i) => t + i * 2.3 + Math.random() * 3);
      lancerBourdon();
      programmer();
    },
    arreter() {
      if (!actif) return;
      actif = false;
      clearTimeout(minuteur);
      const t = ctx.currentTime;
      sortie.gain.cancelScheduledValues(t);
      sortie.gain.setTargetAtTime(0.0001, t, 0.8);
      arreterBourdon();
      arreterGrondement();
    },
    // le curseur de volume a bougé
    majVolume() {
      if (actif && sortie) sortie.gain.setTargetAtTime(Math.max(0.0001, 0.8 * H.volume("musique")), ctx.currentTime, 0.3);
    },
    // pour les réglages : l'ambiance du moment
    description() {
      choisirMode();
      return mode.nom + (nuit ? ", feutrée pour la nuit" : "");
    },
  };

  H.sur("meteo", majAmbiance);
  H.sur("ciel", majAmbiance);

  // démarre au premier geste, s'arrête quand l'appli passe en arrière-plan
  const premierGeste = () => {
    if (H.local && H.local.musique && H.jeu) H.musique.jouer();
  };
  document.addEventListener("pointerdown", premierGeste);
  document.addEventListener("keydown", premierGeste);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.musique.arreter();
  });
})();
