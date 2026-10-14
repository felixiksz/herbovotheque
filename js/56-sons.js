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
    ctx = H.audio.contexte();
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
        s.connect(b.gain).connect(H.audio.sortie());
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
  // Les sons enregistrés passent par la même sortie que la musique. Avant, ils passaient par des
  // lecteurs audio séparés, à 44,1 kHz quand la musique est à 48 kHz : sur iPhone, le téléphone
  // changeait alors de fréquence en plein son, et tout se mettait à grésiller.
  const tamponsSimples = {};
  function tamponSimple(url) {
    if (!tamponsSimples[url]) {
      tamponsSimples[url] = fetch(url)
        .then((r) => r.arrayBuffer())
        .then((a) => new Promise((ok, ko) => ctx.decodeAudioData(a, ok, ko)))
        .catch(() => null);
    }
    return tamponsSimples[url];
  }
  function jouerUrl(url, volume) {
    if (!contexte()) return null;
    const g = ctx.createGain();
    g.gain.value = Math.min(1, volume);
    g.connect(H.audio.sortie());
    const son = { g, source: null };
    tamponSimple(url).then((buf) => {
      if (!buf) return;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(g);
      src.start();
      son.source = src;
    });
    return son;
  }

  H.sons = {
    criquets: criquetsDeNuit,
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
      return jouerUrl(FICHIERS[nom], (volume == null ? 0.6 : volume) * H.volume("bruitages"));
    },
    // un son d'une adresse (le miaou enregistré dans les réglages, par exemple)
    jouerUrl: (url, volume) => jouerUrl(url, volume == null ? 0.6 : volume),
    // un son en boucle (pas, pluie) qu'on allume ou éteint, sans couture, par la même sortie
    boucle(nom, allume, volume) {
      volume = (volume == null ? 0.5 : volume) * H.volume(nom === "pluie" ? "pluie" : "bruitages");
      boucles[nom] = boucles[nom] || {};
      boucles[nom].voulu = allume;
      return boucleContinue(nom, allume, Math.min(1, volume));
    },
    toutCouper() {
      for (const [nom, b] of Object.entries(boucles)) {
        b.voulu = false;
        boucleContinue(nom, false);
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
    sortie.connect(loin).connect(H.audio.sortie());
    // un écho discret, comme renvoyé par les rochers
    const delai = ctx.createDelay(1);
    delai.delayTime.value = 0.19 + Math.random() * 0.08;
    const retour = ctx.createGain();
    retour.gain.value = 0.16;
    const sourd = ctx.createBiquadFilter();
    sourd.type = "lowpass";
    sourd.frequency.value = 2200;
    loin.connect(delai).connect(sourd).connect(retour).connect(H.audio.sortie());
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
  function goelandSynthese() {
    const t0 = ctx.currentTime + 0.05;
    crier(t0, hasard(0.88, 1.08), 0.2);
    // parfois, un autre goéland répond, un peu plus loin
    if (Math.random() < 0.35) crier(t0 + hasard(0.7, 1.8), hasard(0.85, 1.12), 0.12);
  }

  // Les vrais goélands, enregistrés (Freesound, crédits dans les notes). Chaque cri est joué
  // un peu plus haut ou plus bas, d'un côté ou de l'autre, adouci par la distance.
  // La synthèse ne sert que si aucun enregistrement ne se charge (un vieux Safari et l'ogg…).
  const ENREGISTRES = [
    { f: "sons/goelands/goeland-cri.ogg", poids: 3 },
    { f: "sons/goelands/goeland-rpg.ogg", poids: 2 },
    { f: "sons/goelands/goelands-echo.wav", poids: 2, extrait: 4.5 },
    { f: "sons/goelands/goelands-dispute.wav", poids: 1, volume: 0.7 },
  ];
  const tamponsGoelands = new Map();
  function tamponGoeland(e) {
    if (!tamponsGoelands.has(e.f)) {
      tamponsGoelands.set(e.f, fetch(e.f)
        .then((r) => {
          if (!r.ok) throw new Error("GitHub " + r.status);
          return r.arrayBuffer();
        })
        .then((a) => new Promise((ok, ko) => ctx.decodeAudioData(a, ok, ko)))
        .catch(() => null));
    }
    return tamponsGoelands.get(e.f);
  }
  function tirerGoeland() {
    let n = Math.random() * ENREGISTRES.reduce((a, e) => a + e.poids, 0);
    for (const e of ENREGISTRES) if ((n -= e.poids) < 0) return e;
    return ENREGISTRES[0];
  }
  async function goelandEnregistre(volume, delai) {
    let e = tirerGoeland();
    let buf = await tamponGoeland(e);
    if (!buf) {
      for (const autre of ENREGISTRES) {
        buf = await tamponGoeland(autre);
        if (buf) {
          e = autre;
          break;
        }
      }
    }
    if (!buf || !actif()) return !!buf;
    const t = ctx.currentTime + 0.05 + (delai || 0);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = hasard(0.93, 1.06);
    let debut = 0, duree = buf.duration;
    if (e.extrait && buf.duration > e.extrait + 0.5) {
      debut = Math.random() * (buf.duration - e.extrait);
      duree = e.extrait;
    }
    duree /= src.playbackRate.value;
    const vol = volume * (e.volume || 1) * H.volume("bruitages");
    const loin = ctx.createBiquadFilter();
    loin.type = "lowpass";
    loin.frequency.value = hasard(4500, 7000);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.04);
    g.gain.setValueAtTime(Math.max(0.0002, vol), t + Math.max(0.05, duree - 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + duree);
    src.connect(loin).connect(g);
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = hasard(-0.65, 0.65);
      g.connect(pan).connect(H.audio.sortie());
    } else g.connect(H.audio.sortie());
    src.start(t, debut, duree * src.playbackRate.value + 0.05);
    return true;
  }
  function goeland() {
    if (!actif() || !contexte()) return;
    goelandEnregistre(0.42).then((ok) => {
      if (!ok) return goelandSynthese();
      // parfois, un autre goéland répond, un peu plus loin
      if (Math.random() < 0.3) goelandEnregistre(0.24, hasard(0.8, 2));
    });
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
      src.connect(bande).connect(pulse).connect(vague).connect(sortie).connect(H.audio.sortie());
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

  // Les criquets, les nuits de balade : de petits trilles aigus, chacun à son rythme, un peu à
  // gauche ou à droite, plus ou moins loin.
  let criquets = null;
  function trille(t, f, pan, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.type = "sine";
    o.frequency.value = f;
    const n = 3 + Math.floor(Math.random() * 3);
    g.gain.setValueAtTime(0.0001, t);
    for (let i = 0; i < n; i++) {
      const d = t + i * 0.055;
      g.gain.setTargetAtTime(vol, d, 0.004);
      g.gain.setTargetAtTime(0.0001, d + 0.025, 0.006);
    }
    if (p) {
      p.pan.value = pan;
      o.connect(g).connect(p).connect(H.audio.sortie());
    } else o.connect(g).connect(H.audio.sortie());
    o.start(t);
    o.stop(t + n * 0.055 + 0.1);
  }
  function criquetsDeNuit(oui) {
    if (!oui) {
      if (criquets) criquets.forEach(clearTimeout);
      criquets = null;
      return;
    }
    if (criquets || !actif() || !contexte()) return;
    criquets = [];
    // trois criquets, chacun avec sa note, son côté et son rythme
    [[4300, -0.6, 0.9], [4700, 0.4, 1.3], [3900, 0.1, 1.7]].forEach(([f, pan, rythme], k) => {
      const chanter = () => {
        if (!criquets) return;
        if (actif()) trille(ctx.currentTime + 0.02, f * (0.98 + Math.random() * 0.04), pan, 0.018 * H.volume("bruitages"));
        criquets[k] = setTimeout(chanter, (rythme + Math.random() * 0.8) * 1000);
      };
      criquets[k] = setTimeout(chanter, k * 400);
    });
  }

  // Les poules : quelques « cot » courts et nasillards, et parfois un « codêêt » qui monte puis retombe.
  function cot(t, f, d, vol, pan) {
    const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f * 1.25, t);
    o.frequency.exponentialRampToValueAtTime(f, t + d * 0.35);
    o.frequency.exponentialRampToValueAtTime(f * 0.8, t + d);
    bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 2.5;
    lp.type = "lowpass"; lp.frequency.value = 3200;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.setTargetAtTime(0.0001, t + d * 0.6, d * 0.25);
    o.connect(bp).connect(lp).connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(H.audio.sortie()); } else g.connect(H.audio.sortie());
    o.start(t);
    o.stop(t + d + 0.2);
  }
  function codet(t, f, vol, pan) {
    const o = ctx.createOscillator(), bp = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    const p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f, t);
    o.frequency.linearRampToValueAtTime(f * 1.45, t + 0.12);
    o.frequency.linearRampToValueAtTime(f * 1.1, t + 0.4);
    lfo.frequency.value = 28; lg.gain.value = f * 0.03;
    lfo.connect(lg).connect(o.frequency);
    bp.type = "bandpass"; bp.frequency.value = 1500; bp.Q.value = 2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.setTargetAtTime(0.0001, t + 0.32, 0.06);
    o.connect(bp).connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(H.audio.sortie()); } else g.connect(H.audio.sortie());
    o.start(t); lfo.start(t);
    o.stop(t + 0.6); lfo.stop(t + 0.6);
  }
  // pan : de -1 (à gauche) à 1 (à droite) ; loin : de 0 à 1
  function poule(pan, loin) {
    if (!actif() || !contexte()) return;
    const v = 0.05 * H.volume("bruitages") * (1 - 0.6 * (loin || 0)), f = 520 + Math.random() * 160;
    let t = ctx.currentTime + 0.05;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let k = 0; k < n; k++) { cot(t, f * (0.95 + Math.random() * 0.1), 0.09, v, pan || 0); t += 0.16 + Math.random() * 0.14; }
    if (Math.random() < 0.4) codet(t + 0.05, f * 1.1, v * 0.9, pan || 0);
  }
  H.sons.poule = poule;

  // Les oiseaux de nuit : le hibou (un « ouh-hou » grave, en deux notes) et la chouette hulotte
  // (un long « hou… », un silence, puis « hou-hou-houuuu » qui chevrote), chacun de son côté.
  function noteHibou(t, f, d, vol, pan, vibrato) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(), p = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    o.type = "sine";
    o.frequency.setValueAtTime(f * 1.04, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    o.frequency.exponentialRampToValueAtTime(f * 0.93, t + d);
    if (vibrato) {
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 22;
      lg.gain.value = f * 0.025;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + d + 0.05);
    }
    lp.type = "lowpass";
    lp.frequency.value = f * 2.2;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.07);
    g.gain.setTargetAtTime(0.0001, t + d - 0.08, 0.06);
    o.connect(lp).connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(H.audio.sortie()); } else g.connect(H.audio.sortie());
    o.start(t);
    o.stop(t + d + 0.3);
  }
  function hibou() {
    const t = ctx.currentTime + 0.05, pan = Math.random() * 1.6 - 0.8, v = 0.05 * H.volume("bruitages") * (0.6 + Math.random() * 0.4);
    noteHibou(t, 330, 0.32, v, pan);
    noteHibou(t + 0.55, 300, 0.42, v * 0.9, pan);
  }
  function chouette() {
    const t = ctx.currentTime + 0.05, pan = Math.random() * 1.6 - 0.8, v = 0.045 * H.volume("bruitages") * (0.6 + Math.random() * 0.4);
    noteHibou(t, 520, 0.6, v, pan);
    noteHibou(t + 2.6, 540, 0.14, v * 0.8, pan);
    noteHibou(t + 2.95, 520, 1.0, v, pan, true);
  }
  let oiseauxDeNuit = null;
  function chanterLaNuit() {
    oiseauxDeNuit = setTimeout(() => {
      if (!oiseauxDeNuit) return;
      if (actif() && contexte()) (Math.random() < 0.5 ? hibou : chouette)();
      chanterLaNuit();
    }, (14 + Math.random() * 26) * 1000);
  }
  // dehors, la nuit : les criquets, et de temps en temps un hibou ou une chouette au loin
  function majNuit() {
    const s = H.ciel && H.jeu ? H.ciel.etat() : null;
    const nuitDehors = !!s && s.soleil.alt < -4 && dehors() && actif();
    criquetsDeNuit(nuitDehors);
    if (nuitDehors && !oiseauxDeNuit) {
      oiseauxDeNuit = true;
      if (contexte()) setTimeout(() => oiseauxDeNuit && actif() && (Math.random() < 0.5 ? hibou : chouette)(), 3000);
      chanterLaNuit();
    } else if (!nuitDehors && oiseauxDeNuit) {
      clearTimeout(oiseauxDeNuit);
      oiseauxDeNuit = null;
    }
  }
  H.sur("ciel", majNuit);
  window.addEventListener("hashchange", () => setTimeout(majNuit, 80));
  document.addEventListener("pointerdown", majNuit);
  document.addEventListener("visibilitychange", majNuit);

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
