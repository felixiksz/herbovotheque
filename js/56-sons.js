// Bruitages enregistrés : miaou (appeler Mesi), attention (Mesi qui appelle au loin),
// pas (ƟvƟ sur le pavé), roll (la pluie), galop (Lóló qui arrive).
(function () {
  const H = window.H;
  const FICHIERS = { miaou: "sons/miaou.mp3", attention: "sons/attention.mp3", pas: "sons/pas.mp3", pluie: "sons/roll.mp3", galop: "sons/galop.mp3" };
  const boucles = {};

  const actif = () => H.local && H.local.son && document.visibilityState === "visible";

  // --- boucles sans couture (Web Audio) ----------------------------------------------
  // Un MP3 a toujours un peu de silence au début et à la fin : on le retire au chargement,
  // et on fond la fin dans le début pour que la boucle soit continue.
  let ctx = null;
  const tampons = {};
  function contexte() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function sansSilence(buf) {
    const seuil = 0.01;
    const canaux = Array.from({ length: buf.numberOfChannels }, (_, c) => buf.getChannelData(c));
    const fort = (i) => canaux.some((d) => Math.abs(d[i]) > seuil);
    let debut = 0, fin = buf.length - 1;
    while (debut < fin && !fort(debut)) debut++;
    while (fin > debut && !fort(fin)) fin--;
    const n = fin - debut + 1;
    const fondu = Math.min(Math.floor(buf.sampleRate * 0.25), Math.floor(n / 4));
    const sortie = ctx.createBuffer(buf.numberOfChannels, n - fondu, buf.sampleRate);
    canaux.forEach((d, c) => {
      const o = sortie.getChannelData(c);
      for (let i = 0; i < n - fondu; i++) o[i] = d[debut + i];
      // les dernières notes se fondent dans le début : pas de saut au raccord
      for (let i = 0; i < fondu; i++) {
        const k = i / fondu;
        o[i] = d[debut + i] * k + d[debut + n - fondu + i] * (1 - k);
      }
    });
    return sortie;
  }

  async function tampon(nom) {
    if (!tampons[nom]) {
      tampons[nom] = fetch(FICHIERS[nom])
        .then((r) => r.arrayBuffer())
        .then((a) => new Promise((ok, ko) => ctx.decodeAudioData(a, ok, ko)))
        .then(sansSilence);
    }
    return tampons[nom];
  }

  async function boucleContinue(nom, allume, volume) {
    let b = boucles[nom];
    if (allume && actif()) {
      if (!contexte()) return;
      if (!b) b = boucles[nom] = {};
      if (!b.gain) b.gain = ctx.createGain();
      b.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.4);
      if (b.source || b.charge) return;
      b.charge = true;
      try {
        const buf = await tampon(nom);
        if (!boucles[nom].voulu) return;
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.loop = true;
        s.connect(b.gain).connect(ctx.destination);
        b.gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        b.gain.gain.setTargetAtTime(volume, ctx.currentTime, 0.8);
        s.start();
        b.source = s;
      } catch (e) {
        console.warn("son indisponible", nom, e);
      } finally {
        b.charge = false;
      }
    } else if (b && b.source) {
      const s = b.source;
      b.source = null;
      b.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.5);
      s.stop(ctx.currentTime + 2);
    }
  }

  const durees = {};
  const bornesSon = {};

  H.sons = {
    // pour essayer : H.sons.goeland()
    goeland: () => goeland(),
    // durée d'un son (en secondes), lue une fois dans le fichier
    duree(nom) {
      if (!durees[nom]) {
        durees[nom] = new Promise((ok) => {
          const a = new Audio();
          a.preload = "metadata";
          a.onloadedmetadata = () => ok(isFinite(a.duration) && a.duration > 0 ? a.duration : 3);
          a.onerror = () => ok(3);
          a.src = FICHIERS[nom];
          setTimeout(() => ok(3), 2500);
        });
      }
      return durees[nom];
    },
    // Lóló au galop : on entend d'abord le bruit, puis elle entre et s'arrête quand le bruit s'arrête.
    // Renvoie la course {x0, x1, t0, t1} (temps en millisecondes, horloge performance.now()).
    // moment où l'on entend vraiment le son (les fichiers ont du silence au début et à la fin)
    bornes(nom) {
      if (!bornesSon[nom]) {
        bornesSon[nom] = (async () => {
          try {
            if (!contexte()) throw new Error("pas d'audio");
            const a = await (await fetch(FICHIERS[nom])).arrayBuffer();
            const buf = await new Promise((ok, ko) => ctx.decodeAudioData(a, ok, ko));
            const d = buf.getChannelData(0);
            let max = 0;
            for (let i = 0; i < d.length; i += 64) max = Math.max(max, Math.abs(d[i]));
            const seuil = max * 0.06;
            let debut = 0, fin = d.length - 1;
            while (debut < fin && Math.abs(d[debut]) < seuil) debut++;
            while (fin > debut && Math.abs(d[fin]) < seuil) fin--;
            return { debut: debut / buf.sampleRate, fin: fin / buf.sampleRate };
          } catch (e) {
            const total = await H.sons.duree(nom);
            return { debut: 0, fin: total };
          }
        })();
      }
      return bornesSon[nom];
    },
    async galop(x0, x1, arrivee, volume) {
      const b = await H.sons.bornes("galop");
      const joue = H.sons.jouer("galop", volume == null ? 0.6 : volume);
      const t = performance.now();
      if (!joue) return { x0, x1, t0: t, t1: t + 1500 };
      // Lóló entre quand on a entendu un bon bout du galop, et s'arrête quand le bruit s'arrête
      const debut = b.debut * 1000, fin = b.fin * 1000;
      return { x0, x1, t0: t + (arrivee ? debut + (fin - debut) * 0.4 : debut), t1: t + fin };
    },
    // position d'une course à l'instant t : null tant que Lóló n'est pas encore entrée
    position(c, t) {
      if (!c) return null;
      if (t < c.t0) return null;
      const k = Math.min(1, (t - c.t0) / Math.max(1, c.t1 - c.t0));
      return { x: c.x0 + (c.x1 - c.x0) * k, enCourse: k < 1 };
    },
    // un son joué une fois
    jouer(nom, volume) {
      if (!actif()) return null;
      const a = new Audio(FICHIERS[nom]);
      a.volume = Math.min(1, (volume == null ? 0.6 : volume) * H.volume("bruitages"));
      a.play().catch(() => {});
      return a;
    },
    // un son en boucle (pas, pluie) qu'on allume ou éteint
    boucle(nom, allume, volume) {
      volume = (volume == null ? 0.5 : volume) * H.volume(nom === "pluie" ? "pluie" : "bruitages");
      if (nom === "pluie") {
        boucles.pluie = boucles.pluie || {};
        boucles.pluie.voulu = allume;
        return boucleContinue(nom, allume, volume);
      }
      let a = boucles[nom];
      if (allume && actif()) {
        if (!a) {
          a = boucles[nom] = new Audio(FICHIERS[nom]);
          a.loop = true;
        }
        a.volume = Math.min(1, volume);
        if (a.paused) a.play().catch(() => {});
      } else if (a && !a.paused) {
        a.pause();
      }
    },
    toutCouper() {
      for (const [nom, b] of Object.entries(boucles)) {
        if (nom === "pluie") {
          b.voulu = false;
          boucleContinue("pluie", false);
        } else if (b.pause) b.pause();
      }
    },
  };

  // --- ambiance du dehors : goélands au loin, cigales en été (sons de synthèse) ----------
  const DEHORS = ["village", "terrain", "serre", "balade"];
  const dehors = () => DEHORS.includes(document.documentElement.dataset.vue);

  // Le goéland leucophée de Marseille, au loin. Son grand cri a trois parties : parfois quelques
  // aboiements, puis un ou deux longs cris aigus, puis une série régulière de 8 à 14 notes plus
  // courtes (environ quatre par seconde) qui descendent peu à peu. La voix est grave pour un
  // goéland, nasale et rauque. Il pousse aussi un long « miaulement » plaintif, et des « ga-ga-ga »
  // d'alarme. Synthèse : source riche en harmoniques, résonances nasales, rugosité, souffle, écho.
  let bruitBlanc = null;
  function souffle() {
    if (!bruitBlanc) {
      bruitBlanc = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = bruitBlanc.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const src = ctx.createBufferSource();
    src.buffer = bruitBlanc;
    src.loop = true;
    return src;
  }
  // la chaîne commune : résonances du bec, lointain (aigus adoucis) et écho sur l'eau
  function voixGoeland(volume) {
    const entree = ctx.createGain();
    const sortie = ctx.createGain();
    sortie.gain.value = volume * H.volume("bruitages");
    for (const [f, q, g] of [[680, 1.4, 0.55], [1400, 2.6, 1], [2750, 3.5, 0.5]]) {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = f;
      bp.Q.value = q;
      const gg = ctx.createGain();
      gg.gain.value = g;
      entree.connect(bp).connect(gg).connect(sortie);
    }
    const loin = ctx.createBiquadFilter();
    loin.type = "lowpass";
    loin.frequency.value = 4200;
    sortie.connect(loin).connect(ctx.destination);
    // un écho discret, comme renvoyé par les rochers
    const delai = ctx.createDelay(1);
    delai.delayTime.value = 0.19 + Math.random() * 0.08;
    const retour = ctx.createGain();
    retour.gain.value = 0.16;
    const sourd = ctx.createBiquadFilter();
    sourd.type = "lowpass";
    sourd.frequency.value = 2200;
    loin.connect(delai).connect(sourd).connect(retour).connect(ctx.destination);
    return entree;
  }
  // une note : la hauteur monte vite puis retombe lentement, avec un grain rauque
  function noteGoeland(voix, t, d, f0, fPic, fFin, amp, rauque) {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.linearRampToValueAtTime(fPic, t + d * 0.18);
    o.frequency.exponentialRampToValueAtTime(fFin, t + d);
    // un léger tremblement de la voix
    const vib = ctx.createOscillator(), vg = ctx.createGain();
    vib.frequency.value = 7 + Math.random() * 5;
    vg.gain.value = fPic * 0.012;
    vib.connect(vg).connect(o.frequency);
    // la rugosité : une modulation rapide de l'amplitude
    const rugueux = ctx.createGain();
    rugueux.gain.value = 1 - rauque * 0.45;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 65 + Math.random() * 30;
    lg.gain.value = rauque * 0.45;
    lfo.connect(lg).connect(rugueux.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(amp, t + Math.min(0.035, d * 0.2));
    env.gain.setValueAtTime(amp * 0.85, t + d * 0.65);
    env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(rugueux).connect(env).connect(voix);
    // le souffle éraillé
    const b = souffle(), bp = ctx.createBiquadFilter(), be = ctx.createGain();
    bp.type = "bandpass";
    bp.frequency.value = 2300;
    bp.Q.value = 0.9;
    be.gain.setValueAtTime(0.0001, t);
    be.gain.exponentialRampToValueAtTime(amp * 0.22 * rauque + 0.0002, t + 0.03);
    be.gain.exponentialRampToValueAtTime(0.0001, t + d);
    b.connect(bp).connect(be).connect(voix);
    for (const n of [o, vib, lfo, b]) {
      n.start(t);
      n.stop(t + d + 0.05);
    }
  }
  const hasard = (a, b) => a + Math.random() * (b - a);
  // le grand cri : un ou deux longs cris aigus, puis la série qui descend
  function grandCri(voix, t, v) {
    if (Math.random() < 0.3) for (let i = 0; i < 2; i++, t += 0.16) noteGoeland(voix, t, 0.08, 520 * v, 600 * v, 470 * v, 0.3, 0.7);
    const cris = Math.random() < 0.55 ? 1 : 2;
    for (let i = 0; i < cris; i++) {
      const d = hasard(0.45, 0.62);
      noteGoeland(voix, t, d, 640 * v, hasard(1080, 1200) * v, 760 * v, 0.6, 0.35);
      t += d + hasard(0.08, 0.14);
    }
    const n = 8 + Math.floor(Math.random() * 7);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), d = 0.17 - u * 0.04;
      noteGoeland(voix, t, d, 720 * v * (1 - 0.14 * u), 960 * v * (1 - 0.2 * u), 620 * v * (1 - 0.12 * u), 0.5 * (1 - 0.5 * u), 0.45);
      t += 0.24 - u * 0.03;
    }
  }
  // le miaulement plaintif
  function miaulement(voix, t, v) {
    noteGoeland(voix, t, hasard(0.6, 0.8), 860 * v, 1020 * v, 540 * v, 0.5, 0.25);
    if (Math.random() < 0.5) noteGoeland(voix, t + hasard(0.9, 1.3), hasard(0.55, 0.7), 840 * v, 990 * v, 560 * v, 0.4, 0.25);
  }
  // l'alarme : des « ga-ga-ga » brefs et éraillés
  function alarme(voix, t, v) {
    const n = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < n; i++, t += hasard(0.15, 0.19)) noteGoeland(voix, t, 0.085, 500 * v, 620 * v, 460 * v, 0.45, 0.75);
  }
  function crier(t, v, volume) {
    const voix = voixGoeland(volume);
    const sorte = Math.random();
    if (sorte < 0.5) grandCri(voix, t, v);
    else if (sorte < 0.8) miaulement(voix, t, v);
    else alarme(voix, t, v);
  }
  function goeland() {
    if (!actif() || !contexte()) return;
    const t0 = ctx.currentTime + 0.05;
    crier(t0, hasard(0.88, 1.08), 0.2);
    // parfois, un autre goéland répond, un peu plus loin
    if (Math.random() < 0.35) crier(t0 + hasard(0.7, 1.8), hasard(0.85, 1.12), 0.12);
  }
  function programmerGoeland() {
    setTimeout(() => {
      const jour = H.ciel && H.jeu && H.ciel.etat().soleil.alt > 2;
      if (jour && dehors() && !H.ciel.nuitCalme()) {
        goeland();
        H.emettre("goeland");
      }
      programmerGoeland();
    }, (50 + Math.random() * 130) * 1000);
  }
  programmerGoeland();

  // les cigales : un grésillement aigu qui pulse vite et enfle par vagues, l'été, en journée
  let cigales = null;
  function majCigales() {
    const s = H.ciel && H.jeu ? H.ciel.etat() : null;
    const m = (H.ciel && H.ciel.meteo) || {};
    const chant = !!s && s.saison === "été" && s.soleil.alt > 12 && (m.temperature == null || m.temperature >= 22) &&
      m.type !== "pluie" && m.type !== "orage" && dehors() && actif();
    if (chant && !cigales && contexte()) {
      const n = ctx.sampleRate;
      const buf = ctx.createBuffer(1, n, n);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const bande = ctx.createBiquadFilter();
      bande.type = "bandpass";
      bande.frequency.value = 4600;
      bande.Q.value = 6;
      const pulse = ctx.createGain();
      pulse.gain.value = 0.5;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.type = "square";
      lfo.frequency.value = 48;
      lg.gain.value = 0.5;
      lfo.connect(lg).connect(pulse.gain);
      const vague = ctx.createGain();
      vague.gain.value = 0.6;
      const lent = ctx.createOscillator(), lentg = ctx.createGain();
      lent.frequency.value = 0.08;
      lentg.gain.value = 0.4;
      lent.connect(lentg).connect(vague.gain);
      const sortie = ctx.createGain();
      sortie.gain.value = 0.0001;
      sortie.gain.setTargetAtTime(0.05 * H.volume("bruitages"), ctx.currentTime, 2);
      src.connect(bande).connect(pulse).connect(vague).connect(sortie).connect(ctx.destination);
      [src, lfo, lent].forEach((x) => x.start());
      cigales = { sortie, noeuds: [src, lfo, lent] };
    } else if (!chant && cigales) {
      const c = cigales;
      cigales = null;
      c.sortie.gain.setTargetAtTime(0.0001, ctx.currentTime, 1);
      c.noeuds.forEach((x) => x.stop(ctx.currentTime + 4));
    } else if (chant && cigales) {
      cigales.sortie.gain.setTargetAtTime(0.05 * H.volume("bruitages"), ctx.currentTime, 0.5);
    }
  }
  H.sur("ciel", majCigales);
  H.sur("meteo", majCigales);
  window.addEventListener("hashchange", () => setTimeout(majCigales, 50));
  document.addEventListener("pointerdown", majCigales);

  // La pluie : quand il pleut vraiment (d'après la météo du lieu choisi)
  function pluie() {
    const m = H.ciel && H.ciel.meteo;
    const pleut = (!!m && (m.type === "pluie" || m.type === "orage")) || (H.pluieMagique && H.pluieMagique());
    H.sons.boucle("pluie", pleut && !!H.jeu, m && m.type === "orage" ? 0.5 : 0.32);
  }
  H.sons.majPluie = pluie;
  // dans les réglages : faire entendre la pluie quelques secondes, même s'il fait beau
  let finApercu = null;
  H.sons.apercuPluie = function () {
    boucles.pluie = boucles.pluie || {};
    boucles.pluie.voulu = true;
    boucleContinue("pluie", true, 0.35 * H.volume("pluie"));
    clearTimeout(finApercu);
    finApercu = setTimeout(pluie, 3500);
  };
  H.sur("meteo", pluie);
  H.sur("ciel", pluie);
  document.addEventListener("pointerdown", pluie);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") H.sons.toutCouper();
    else pluie();
    majCigales();
  });
})();
