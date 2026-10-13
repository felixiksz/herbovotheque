// Musique ambiante, à la manière de Brian Eno (Music for Airports) : quelques voix
// répètent chacune une note à des périodes différentes, qui ne retombent jamais en phase,
// dans une grande réverbération. Le mode suit la vraie météo du lieu :
// soleil → lydien (très majeur), nuages → dorien, pluie → éolien (mineur),
// orage → phrygien, agité, avec un grondement ; la nuit, tout est plus lent et plus feutré.
// Elle démarre au premier geste (les navigateurs l'exigent) et se coupe dans les réglages.
// D'autres styles, au choix dans les réglages : steeldrum, kora, synthwave, vaporwave
// (même gamme selon la météo, mais en rythme, avec leurs instruments).
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

  // --- les styles en rythme : steeldrum, kora, synthwave, vaporwave -------------------------
  let bruit = null;
  function sourceBruit() {
    if (!bruit) {
      bruit = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = bruit.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = bruit;
    return src;
  }
  function enveloppe(g, t, att, vol, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + att);
    g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec);
  }
  function oscillateur(type, f, t, fin, vers, detune) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = f;
    if (detune) o.detune.value = detune;
    o.connect(vers);
    o.start(t);
    o.stop(fin);
    return o;
  }
  const INSTRUMENTS = {
    // le steeldrum : fondamentale, octave et douzième, frappe nette, léger glissé vers le bas
    acier(f, t, vol) {
      const g = ctx.createGain();
      enveloppe(g, t, 0.006, vol, 1.3);
      g.connect(entree);
      for (const [k, v] of [[1, 1], [2, 0.5], [3, 0.22], [4.2, 0.06]]) {
        const gg = ctx.createGain();
        gg.gain.value = v;
        gg.connect(g);
        const o = oscillateur("sine", f * k * 1.012, t, t + 1.5, gg);
        o.frequency.exponentialRampToValueAtTime(f * k, t + 0.06);
      }
    },
    // la kora : une corde pincée, brillante au départ puis plus ronde
    kora(f, t, vol) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(4200, t);
      lp.frequency.exponentialRampToValueAtTime(900, t + 0.6);
      enveloppe(g, t, 0.004, vol, 1.1);
      lp.connect(g).connect(entree);
      oscillateur("triangle", f, t, t + 1.3, lp);
      const g2 = ctx.createGain();
      g2.gain.value = 0.35;
      g2.connect(lp);
      oscillateur("sawtooth", f * 2, t, t + 0.4, g2, 3);
    },
    // une nappe de synthé : deux dents de scie désaccordées par note
    nappe(fs, t, duree, vol) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1500;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.5);
      g.gain.setValueAtTime(vol, t + duree - 0.4);
      g.gain.exponentialRampToValueAtTime(0.0001, t + duree + 0.6);
      lp.connect(g).connect(entree);
      for (const f of fs) for (const d of [-7, 7]) oscillateur("sawtooth", f, t, t + duree + 0.7, lp, d);
    },
    // une basse courte qui claque, filtre qui se referme
    basse(f, t, duree, vol, type) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(type === "sine" ? 600 : 1100, t);
      lp.frequency.exponentialRampToValueAtTime(180, t + duree);
      enveloppe(g, t, 0.01, vol, duree);
      lp.connect(g).connect(entree);
      oscillateur(type || "sawtooth", f, t, t + duree + 0.1, lp);
    },
    // un arpège pointu, en carré filtré
    arpege(f, t, vol) {
      const g = ctx.createGain(), lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 2400;
      enveloppe(g, t, 0.005, vol, 0.25);
      lp.connect(g).connect(entree);
      oscillateur("square", f, t, t + 0.3, lp);
    },
    // un piano électrique cotonneux, qui ondule (la cassette un peu fatiguée du vaporwave)
    epiano(f, t, duree, vol) {
      const g = ctx.createGain();
      enveloppe(g, t, 0.01, vol, duree);
      g.connect(entree);
      const o = oscillateur("sine", f, t, t + duree + 0.1, g);
      const mod = ctx.createOscillator(), prof = ctx.createGain();
      mod.frequency.value = f;
      prof.gain.setValueAtTime(f * 1.2, t);
      prof.gain.exponentialRampToValueAtTime(f * 0.05, t + 0.8);
      mod.connect(prof).connect(o.frequency);
      const ondule = ctx.createOscillator(), op = ctx.createGain();
      ondule.frequency.value = 0.35;
      op.gain.value = 14;
      ondule.connect(op).connect(o.detune);
      for (const n of [mod, ondule]) {
        n.start(t);
        n.stop(t + duree + 0.1);
      }
    },
    grosseCaisse(t, vol) {
      const g = ctx.createGain();
      enveloppe(g, t, 0.003, vol, 0.35);
      g.connect(sortie);
      const o = oscillateur("sine", 120, t, t + 0.4, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    },
    caisseClaire(t, vol) {
      const g = ctx.createGain(), bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 1900;
      enveloppe(g, t, 0.002, vol, 0.2);
      const src = sourceBruit();
      src.connect(bp).connect(g).connect(entree);
      src.start(t);
      src.stop(t + 0.3);
    },
    charley(t, vol) {
      const g = ctx.createGain(), hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 7000;
      enveloppe(g, t, 0.001, vol, 0.045);
      const src = sourceBruit();
      src.connect(hp).connect(g).connect(sortie);
      src.start(t);
      src.stop(t + 0.08);
    },
  };
  // la hauteur d'un degré de la gamme du moment (octave 0 : autour du do du milieu)
  function degre(d, octave) {
    const g = mode.gamme, n = g.length, o = Math.floor(d / n);
    return hz(mode.fond + 12 + (nuit ? -2 : 0) + 12 * (o + (octave || 0)) + g[((d % n) + n) % n]);
  }
  const accord = (d, n) => [0, 2, 4, 6].slice(0, n || 3).map((k) => d + k);
  const hasard = () => Math.random();

  const STYLES = {
    eno: { nom: "ambiante, à la Brian Eno" },
    steeldrum: {
      nom: "steeldrum",
      bpm: 108, division: 2, clarte: 1.7,
      pas(n, t, d, e) {
        const mesure = Math.floor(n / 8) % 4, s = n % 8, racine = [0, 3, 4, 0][mesure];
        const I = INSTRUMENTS;
        if (s === 0 || s === 3 || s === 4) I.basse(degre(racine, -2), t, d * 1.6, 0.16, "sine");
        // la mélodie danse autour des notes de l'accord, avec des contretemps
        if ([1, 0, 1, 1, 0, 1, 1, 0][s] && hasard() < 0.85) {
          const cibles = accord(racine);
          e.m = e.m == null ? racine + 4 : e.m;
          e.m += Math.round((hasard() - 0.5) * 3);
          if (hasard() < 0.5) e.m = cibles[Math.floor(hasard() * 3)] + 7;
          e.m = Math.max(4, Math.min(16, e.m));
          I.acier(degre(e.m, 0), t, 0.13);
          if (s === 0) I.acier(degre(e.m, 0), t + d * 0.5, 0.07);
        }
        if (s === 0) accord(racine).forEach((k, i) => I.acier(degre(k, 0), t + i * 0.03, 0.05));
        I.charley(t, s % 2 ? 0.035 : 0.018);
      },
    },
    kora: {
      nom: "kora",
      bpm: 84, division: 3, clarte: 1.4,
      pas(n, t, d) {
        const mesure = Math.floor(n / 12) % 4, s = n % 12, racine = [0, 3, 0, 4][mesure];
        const I = INSTRUMENTS;
        // le kumbengo : une petite boucle qui tourne, toujours la même, comme une ronde
        const boucle = [0, 4, 7, 2, 4, 9, 7, 4, 0, 4, 2, 7];
        I.kora(degre(racine + boucle[s], 0), t, 0.1);
        if (s === 0 || s === 6) I.kora(degre(racine, -1), t, 0.13);
        // de temps en temps, une cascade de notes qui descend (le birimintingo)
        if (mesure === 3 && s >= 6) I.kora(degre(racine + 14 - (s - 6), 0), t + d * 0.5, 0.08);
      },
    },
    synthwave: {
      nom: "synthwave",
      bpm: 94, division: 4, clarte: 1.3,
      pas(n, t, d) {
        const mesure = Math.floor(n / 16) % 4, s = n % 16, racine = [0, 5, 2, 6][mesure];
        const I = INSTRUMENTS;
        if (s === 0) I.nappe(accord(racine, 4).map((k) => degre(k, 0)), t, d * 16, 0.035);
        if (s % 2 === 0) I.basse(degre(racine, -2) * (s % 4 === 2 ? 2 : 1), t, d * 1.6, 0.12, "sawtooth");
        if (s % 2 === 1) I.arpege(degre(accord(racine, 4)[(s >> 1) % 4], 1), t, 0.035);
        if (s === 0 || s === 8) I.grosseCaisse(t, 0.35);
        if (s === 4 || s === 12) I.caisseClaire(t, 0.18);
        if (s % 2 === 0) I.charley(t, 0.02);
      },
    },
    vaporwave: {
      nom: "vaporwave",
      bpm: 66, division: 2, clarte: 0.75,
      pas(n, t, d) {
        const mesure = Math.floor(n / 8) % 4, s = n % 8, racine = [3, 2, 1, 0][mesure];
        const I = INSTRUMENTS;
        if (s === 0) accord(racine, 4).forEach((k, i) => I.epiano(degre(k, 0), t + i * 0.02, d * 8, 0.045));
        if (s === 4 && hasard() < 0.6) accord(racine, 4).forEach((k) => I.epiano(degre(k, 0), t, d * 4, 0.025));
        if ([2, 5, 6].includes(s) && hasard() < 0.4) I.epiano(degre(racine + 7 + Math.floor(hasard() * 5), 0), t, d * 3, 0.04);
        if (s === 0 || s === 3) I.basse(degre(racine, -2), t, d * 2.5, 0.14, "sine");
        if (s === 0) I.grosseCaisse(t, 0.25);
        if (s === 4) I.caisseClaire(t, 0.1);
      },
    },
  };
  const styleChoisi = () => (STYLES[H.local && H.local.styleMusique] ? H.local.styleMusique : "eno");
  let sequence = null;
  function programmerStyle() {
    if (!actif || !sequence) return;
    const S = sequence.S;
    const bpm = S.bpm * (nuit ? 0.85 : 1) * (mode.orage ? 1.08 : 1);
    const d = 60 / bpm / S.division;
    while (sequence.t < ctx.currentTime + 0.6) {
      S.pas(sequence.n, sequence.t, d, sequence);
      sequence.n++;
      sequence.t += d;
    }
    minuteur = setTimeout(programmerStyle, 150);
  }

  // la météo ou la nuit changent : on glisse doucement vers la nouvelle couleur
  function majAmbiance() {
    if (!actif) return;
    const avant = mode, avantNuit = nuit;
    choisirMode();
    if (avant === mode && avantNuit === nuit) return;
    filtre.frequency.setTargetAtTime(mode.clarte * (nuit ? 0.6 : 1) * (STYLES[styleChoisi()].clarte || 1), ctx.currentTime, 4);
    if (styleChoisi() === "eno") lancerBourdon();
  }

  // Sur iPhone, le bouton silencieux coupe le son « Web Audio » : on demande une session de
  // lecture (comme une appli de musique), et un petit son muet en boucle garde le son ouvert.
  let silence = null;
  function sessionLecture() {
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch (e) {
      /* pas grave */
    }
    if (!silence) {
      const sr = 8000, n = sr / 2, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
      const ecrire = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
      ecrire(0, "RIFF"); v.setUint32(4, 36 + n, true); ecrire(8, "WAVE"); ecrire(12, "fmt ");
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true);
      v.setUint32(28, sr, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); ecrire(36, "data"); v.setUint32(40, n, true);
      for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
      silence = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
      silence.loop = true;
      silence.setAttribute("playsinline", "");
    }
    silence.play().catch(() => {});
  }

  H.musique = {
    jouer() {
      if (actif || !H.local || !H.local.musique) return;
      if (!window.AudioContext && !window.webkitAudioContext) return;
      choisirMode();
      sessionLecture();
      if (!ctx || !sortie) construire();
      if (ctx.state === "suspended") ctx.resume();
      const style = styleChoisi();
      filtre.frequency.value = mode.clarte * (nuit ? 0.6 : 1) * (STYLES[style].clarte || 1);
      sortie.gain.cancelScheduledValues(ctx.currentTime);
      sortie.gain.setTargetAtTime(Math.max(0.0001, 0.8 * H.volume("musique")), ctx.currentTime, 2.5);
      actif = true;
      if (style !== "eno") {
        sequence = { S: STYLES[style], n: 0, t: ctx.currentTime + 0.3 };
        programmerStyle();
        return;
      }
      // la première note arrive tout de suite, les autres s'installent peu à peu
      const t = ctx.currentTime + 0.2;
      prochaines = VOIX.map((v, i) => t + (i ? i * 2.3 + Math.random() * 3 : 0));
      lancerBourdon();
      programmer();
    },
    STYLES: Object.fromEntries(Object.entries(STYLES).map(([id, st]) => [id, st.nom])),
    // changer de style : on coupe, et on relance dans le nouveau style
    changerStyle() {
      if (!actif) return;
      H.musique.arreter();
      setTimeout(() => H.musique.jouer(), 900);
    },
    arreter() {
      if (!actif) return;
      actif = false;
      sequence = null;
      clearTimeout(minuteur);
      if (silence) silence.pause();
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
      return STYLES[styleChoisi()].nom + ", " + mode.nom + (nuit ? ", feutrée pour la nuit" : "");
    },
  };

  H.sur("meteo", majAmbiance);
  H.sur("ciel", majAmbiance);

  // démarre au premier geste, s'arrête quand l'appli passe en arrière-plan
  // chaque geste réveille le son s'il est resté bloqué (Safari refuse parfois le premier essai)
  const premierGeste = () => {
    if (!H.local || !H.local.musique || !H.jeu) return;
    if (actif) {
      if (ctx && ctx.state !== "running") ctx.resume();
      if (silence && silence.paused) silence.play().catch(() => {});
    } else H.musique.jouer();
  };
  // sur iPhone, seuls un vrai toucher (touchend) ou un clic ouvrent le son
  for (const ev of ["pointerdown", "touchend", "click", "keydown"]) document.addEventListener(ev, premierGeste);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.musique.arreter();
  });
})();
