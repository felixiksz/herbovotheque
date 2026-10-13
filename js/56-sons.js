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

  // un goéland au loin : deux ou trois « kiaou » qui montent puis retombent
  function goeland() {
    if (!actif() || !contexte()) return;
    const t0 = ctx.currentTime + 0.05;
    const n = 2 + Math.floor(Math.random() * 3);
    const base = 1100 + Math.random() * 300;
    const filtre = ctx.createBiquadFilter();
    filtre.type = "bandpass";
    filtre.frequency.value = 1500;
    filtre.Q.value = 2.5;
    const loin = ctx.createBiquadFilter();
    loin.type = "lowpass";
    loin.frequency.value = 2600;
    const g = ctx.createGain();
    g.gain.value = 0.18 * H.volume("bruitages");
    filtre.connect(loin).connect(g).connect(ctx.destination);
    for (let i = 0; i < n; i++) {
      const t = t0 + i * (0.42 + Math.random() * 0.12);
      const o = ctx.createOscillator(), e = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(base * 0.9, t);
      o.frequency.exponentialRampToValueAtTime(base * 1.35, t + 0.08);
      o.frequency.exponentialRampToValueAtTime(base * 0.75, t + 0.32);
      const vib = ctx.createOscillator(), vg = ctx.createGain();
      vib.frequency.value = 28;
      vg.gain.value = 25;
      vib.connect(vg).connect(o.frequency);
      e.gain.setValueAtTime(0.0001, t);
      e.gain.exponentialRampToValueAtTime(i === 0 ? 0.5 : 0.35, t + 0.04);
      e.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
      o.connect(e).connect(filtre);
      o.start(t);
      vib.start(t);
      o.stop(t + 0.4);
      vib.stop(t + 0.4);
    }
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
