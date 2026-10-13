// Soleil, lune, saisons et météo du lieu choisi (Marseille par défaut).
// Positions calculées d'après les formules astronomiques classiques
// (celles de la bibliothèque SunCalc, réécrites ici).
(function () {
  const H = window.H;
  const PI = Math.PI, rad = PI / 180, jourMs = 864e5, J1970 = 2440588, J2000 = 2451545;
  const e = rad * 23.4397;
  const { sin, cos, tan, asin, acos, atan2 } = Math;

  const enJours = (date) => date.valueOf() / jourMs - 0.5 + J1970 - J2000;
  const depuisJulien = (j) => new Date((j + 0.5 - J1970) * jourMs);
  const ascDroite = (l, b) => atan2(sin(l) * cos(e) - tan(b) * sin(e), cos(l));
  const declinaison = (l, b) => asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l));
  const azimut = (Hh, phi, dec) => atan2(sin(Hh), cos(Hh) * sin(phi) - tan(dec) * cos(phi));
  const altitude = (Hh, phi, dec) => asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(Hh));
  const sideral = (d, lw) => rad * (280.16 + 360.9856235 * d) - lw;
  const anomalie = (d) => rad * (357.5291 + 0.98560028 * d);
  function longitudeEcl(M) {
    const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M));
    return M + C + rad * 102.9372 + PI;
  }
  function coordSoleil(d) {
    const L = longitudeEcl(anomalie(d));
    return { dec: declinaison(L, 0), ra: ascDroite(L, 0) };
  }
  function coordLune(d) {
    const L = rad * (218.316 + 13.176396 * d);
    const M = rad * (134.963 + 13.064993 * d);
    const F = rad * (93.272 + 13.22935 * d);
    const l = L + rad * 6.289 * sin(M);
    const b = rad * 5.128 * sin(F);
    return { ra: ascDroite(l, b), dec: declinaison(l, b), dist: 385001 - 20905 * cos(M) };
  }

  function positionSoleil(date, lat, lon) {
    const lw = rad * -lon, phi = rad * lat, d = enJours(date);
    const c = coordSoleil(d);
    const Hh = sideral(d, lw) - c.ra;
    return { alt: altitude(Hh, phi, c.dec) / rad, az: azimut(Hh, phi, c.dec) / rad };
  }
  function positionLune(date, lat, lon) {
    const lw = rad * -lon, phi = rad * lat, d = enJours(date);
    const c = coordLune(d);
    const Hh = sideral(d, lw) - c.ra;
    return { alt: altitude(Hh, phi, c.dec) / rad, az: azimut(Hh, phi, c.dec) / rad };
  }
  function eclairageLune(date) {
    const d = enJours(date), s = coordSoleil(d), m = coordLune(d), sdist = 149598000;
    const phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra));
    const inc = atan2(sdist * sin(phi), m.dist - sdist * cos(phi));
    const angle = atan2(
      cos(s.dec) * sin(s.ra - m.ra),
      sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra)
    );
    return { fraction: (1 + cos(inc)) / 2, phase: 0.5 + (0.5 * inc * (angle < 0 ? -1 : 1)) / PI };
  }
  function heuresSoleil(date, lat, lon) {
    const lw = rad * -lon, phi = rad * lat, d = enJours(date), J0 = 0.0009;
    const n = Math.round(d - J0 - lw / (2 * PI));
    const ds = J0 + lw / (2 * PI) + n;
    const M = anomalie(ds), L = longitudeEcl(M), dec = declinaison(L, 0);
    const midi = J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L);
    const w = acos((sin(-0.833 * rad) - sin(phi) * sin(dec)) / (cos(phi) * cos(dec)));
    if (isNaN(w)) return { lever: null, coucher: null, midi: depuisJulien(midi) };
    const a = J0 + (w + lw) / (2 * PI) + n;
    const coucher = J2000 + a + 0.0053 * sin(M) - 0.0069 * sin(2 * L);
    return { lever: depuisJulien(midi - (coucher - midi)), coucher: depuisJulien(coucher), midi: depuisJulien(midi) };
  }

  const NOMS_PHASES = [
    [0.03, "nouvelle lune"], [0.22, "premier croissant"], [0.28, "premier quartier"], [0.47, "lune gibbeuse croissante"],
    [0.53, "pleine lune"], [0.72, "lune gibbeuse décroissante"], [0.78, "dernier quartier"], [0.97, "dernier croissant"], [1.01, "nouvelle lune"],
  ];
  const nomPhase = (p) => NOMS_PHASES.find(([s]) => p < s)[1];

  function saison(date, lat) {
    const m = date.getMonth() + 1, j = date.getDate();
    const v = m * 100 + j;
    let s = v >= 1221 || v < 320 ? "hiver" : v < 621 ? "printemps" : v < 922 ? "été" : "automne";
    if (lat < 0) s = { hiver: "été", été: "hiver", printemps: "automne", automne: "printemps" }[s];
    return s;
  }

  // Codes météo WMO renvoyés par Open-Meteo.
  function libelleMeteo(code) {
    if (code === 0) return ["ciel dégagé", "clair"];
    if (code <= 2) return ["quelques nuages", "voile"];
    if (code === 3) return ["ciel couvert", "nuages"];
    if (code <= 48) return ["brouillard", "brume"];
    if (code <= 57) return ["bruine", "pluie"];
    if (code <= 67) return ["pluie", "pluie"];
    if (code <= 77) return ["neige", "neige"];
    if (code <= 82) return ["averses", "pluie"];
    if (code <= 86) return ["averses de neige", "neige"];
    return ["orage", "orage"];
  }

  // Couleurs du ciel (haut, horizon) selon la hauteur du soleil, en degrés.
  // Le matin : lavande, rose, pêche. Le soir : violet, corail, orange, or.
  const TEINTES_MATIN = [
    [-90, "#141a3a", "#2a2450"],
    [-12, "#1d2352", "#3d3570"],
    [-6, "#3b3f7e", "#c37aa6"],
    [-2, "#6a6fb3", "#f2a2b8"],
    [2, "#8aa4d6", "#ffc4a4"],
    [8, "#8cc0ec", "#fde3c4"],
    [15, "#8cc8f2", "#e6f4ff"],
    [90, "#7cc0f0", "#dff1ff"],
  ];
  const TEINTES_SOIR = [
    [-90, "#141a3a", "#2a2450"],
    [-12, "#1a1e46", "#3a2a5e"],
    [-6, "#2e2f6e", "#9a4f8a"],
    [-2, "#4f4f9a", "#f0706a"],
    [2, "#6f7fc4", "#ff9a4a"],
    [8, "#88b4e4", "#ffd08a"],
    [15, "#8cc8f2", "#e6f4ff"],
    [90, "#7cc0f0", "#dff1ff"],
  ];
  function melange(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const c = [16, 8, 0].map((s) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t));
    return "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  function teinteCiel(alt, matin) {
    if (matin == null) matin = estMatin();
    const T = matin ? TEINTES_MATIN : TEINTES_SOIR;
    for (let i = 1; i < T.length; i++) {
      if (alt <= T[i][0]) {
        const [a0, h0, b0] = T[i - 1], [a1, h1, b1] = T[i];
        const t = (alt - a0) / (a1 - a0);
        return { haut: melange(h0, h1, t), bas: melange(b0, b1, t) };
      }
    }
    return { haut: T[T.length - 1][1], bas: T[T.length - 1][2] };
  }
  // avant le midi solaire du lieu : c'est le matin (lever), après : le soir (coucher)
  function estMatin(date) {
    date = date || new Date();
    const lieu = (H.jeu && H.jeu.lieu) || { lat: 43.3, lon: 5.37 };
    return date < heuresSoleil(date, lieu.lat, lieu.lon).midi;
  }

  // La lumière qui colore tout le paysage : nuit bleue, aube rose pêche, couchant orange puis violet.
  // Renvoie des voiles [{couleur, alpha}] à peindre par-dessus la scène.
  function lumiere(alt, matin) {
    if (matin == null) matin = estMatin();
    const voiles = [];
    if (alt < 0) voiles.push({ couleur: "20,24,60", alpha: Math.min(0.45, (-alt / 12) * 0.45 + 0.03) });
    const k = Math.max(0, 1 - Math.abs(alt - 1) / 9); // force de la couleur, maximale vers l'horizon
    if (k > 0) {
      if (matin) voiles.push({ couleur: "255,165,185", alpha: 0.16 * k });
      else if (alt > -2) voiles.push({ couleur: "255,120,55", alpha: 0.2 * k });
      else voiles.push({ couleur: "175,80,165", alpha: 0.18 * k });
    }
    return voiles;
  }

  H.ciel = {
    positionSoleil,
    positionLune,
    eclairageLune,
    heuresSoleil,
    nomPhase,
    saison,
    teinteCiel,
    // le ciel couvert selon la météo (et la pluie de joie de Lóló) : null quand il fait beau
    couvert(nuit) {
      const m = H.ciel.meteo || {};
      const type = H.pluieMagique && H.pluieMagique() ? "pluie" : m.type;
      const S = {
        pluie: { couleur: "#9aa0ad", ventre: "#5f6574", n: 6, alpha: 0.32, voile: "105,112,128,0.38" },
        orage: { couleur: "#7c8191", ventre: "#3f4352", n: 7, alpha: 0.36, voile: "62,66,84,0.5" },
        neige: { couleur: "#eef0f3", ventre: "#b9bec8", n: 6, alpha: 0.3, voile: "200,204,214,0.35" },
        nuages: { couleur: "#f4f4f2", ventre: "#c3c7cf", n: 5, alpha: 0.28, voile: "165,170,182,0.25" },
        voile: { couleur: "#ffffff", n: 2, alpha: 0.22 },
        brume: { couleur: "#eceef0", n: 3, alpha: 0.18, voile: "222,224,228,0.4" },
      }[type];
      if (!S) return null;
      return nuit ? Object.assign({}, S, { couleur: "#5a5e7a", ventre: S.ventre ? "#2e3046" : null, voile: S.voile ? "28,30,48,0.35" : null }) : S;
    },
    lumiere,
    estMatin,
    // de 22 h à 6 h, on ne révise pas et on ne jardine pas : on se balade, on lit, on dort
    nuitCalme(date) {
      const h = (date || new Date()).getHours();
      return h >= 22 || h < 6;
    },
    meteo: null,

    etat(date) {
      date = date || new Date();
      const { lat, lon } = H.jeu.lieu;
      const soleil = positionSoleil(date, lat, lon);
      const lune = Object.assign(positionLune(date, lat, lon), eclairageLune(date));
      const moment = soleil.alt < -6 ? "nuit" : soleil.alt < 0 ? "crépuscule" : soleil.alt < 8 ? "heure dorée" : "jour";
      return { date, soleil, lune, moment, saison: saison(date, lat), heures: heuresSoleil(date, lat, lon), meteo: H.ciel.meteo };
    },

    async chargerMeteo(forcer) {
      const { lat, lon } = H.jeu.lieu;
      const cache = H.local.meteo;
      if (!forcer && cache && cache.lat === lat && cache.lon === lon && Date.now() - cache.le < 30 * 60e3) {
        H.ciel.meteo = cache;
        return cache;
      }
      try {
        const url =
          "https://api.open-meteo.com/v1/forecast?latitude=" + lat.toFixed(2) + "&longitude=" + lon.toFixed(2) +
          "&current=temperature_2m,weather_code,cloud_cover,precipitation,wind_speed_10m&timezone=auto";
        const r = await fetch(url);
        const d = (await r.json()).current;
        const [libelle, type] = libelleMeteo(d.weather_code);
        H.ciel.meteo = {
          lat, lon, le: Date.now(), temperature: Math.round(d.temperature_2m), code: d.weather_code,
          nuages: d.cloud_cover, pluie: d.precipitation, vent: Math.round(d.wind_speed_10m), libelle, type,
        };
        await H.d.majLocal((l) => (l.meteo = H.ciel.meteo));
        H.emettre("meteo", H.ciel.meteo);
      } catch (err) {
        console.warn("météo indisponible", err);
      }
      return H.ciel.meteo;
    },

    async chercherLieu(nom) {
      const r = await fetch(
        "https://geocoding-api.open-meteo.com/v1/search?count=6&language=fr&name=" + encodeURIComponent(nom)
      );
      const d = await r.json();
      return (d.results || []).map((x) => ({
        nom: x.name, detail: [x.admin1, x.country].filter(Boolean).join(", "), lat: x.latitude, lon: x.longitude,
      }));
    },

    async changerLieu(lieu) {
      H.jeu.lieu = { nom: lieu.nom, lat: Math.round(lieu.lat * 100) / 100, lon: Math.round(lieu.lon * 100) / 100 };
      H.jeu.lieuModifieLe = H.maintenant();
      H.d.changer("jeu");
      await H.ciel.chargerMeteo(true);
      H.ciel.appliquer();
    },

    // Met à jour les couleurs du ciel et le mode nuit sur toute la page.
    appliquer() {
      const s = H.ciel.etat();
      const t = teinteCiel(s.soleil.alt);
      const racine = document.documentElement;
      racine.style.setProperty("--ciel-haut", t.haut);
      racine.style.setProperty("--ciel-bas", t.bas);
      const nuit = H.local.theme === "nuit" || (H.local.theme === "auto" && s.soleil.alt < -4);
      racine.dataset.theme = nuit ? "nuit" : "jour";
      racine.dataset.saison = s.saison;
      racine.dataset.meteo = (s.meteo && s.meteo.type) || "clair";
      H.emettre("ciel", s);
      return s;
    },
  };

  setInterval(() => H.jeu && H.ciel.appliquer(), 60e3);
  setInterval(() => H.jeu && H.ciel.chargerMeteo(), 30 * 60e3);
})();
