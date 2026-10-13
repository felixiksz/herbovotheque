// Bulles de dialogue : le texte s'écrit lettre par lettre, avec un petit babillage
// (des « bip » dont la hauteur suit les voyelles, comme dans Animal Crossing).
(function () {
  const H = window.H;

  const VOIX = {
    ovo: { nom: "ƟvƟ", hauteur: 540, onde: "square" },
    luigi: { nom: "Luigi", hauteur: 330, onde: "square" },
    lolo: { nom: "Lóló", hauteur: 200, onde: "triangle" },
    meme: { nom: "Mémé", hauteur: 760, onde: "triangle" },
  };
  // décalage (en demi-tons) selon la voyelle prononcée
  const VOYELLES = { a: 0, e: 4, i: 9, o: -3, u: 7, y: 9 };

  let audio = null;
  function contexte() {
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio = new AC();
    }
    if (audio.state === "suspended") audio.resume();
    return audio;
  }

  function bip(voix, lettre) {
    if (!H.local || !H.local.son) return;
    const ctx = contexte();
    if (!ctx) return;
    const v = H.sansAccents(lettre);
    const demi = VOYELLES[v] != null ? VOYELLES[v] : (v.charCodeAt(0) % 5) - 2;
    const f = voix.hauteur * Math.pow(2, (demi + (Math.random() - 0.5) * 1.5) / 12);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = voix.onde;
    o.frequency.value = f;
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.035 * H.volume("voix")), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    o.connect(g).connect(ctx.destination);
    o.start(t);
    o.stop(t + 0.07);
  }

  // Petit bruitage générique (récolte, plantation…)
  H.bruit = function (type) {
    if (!H.local || !H.local.son) return;
    const ctx = contexte();
    if (!ctx) return;
    const notes = { recolte: [660, 880, 1100], plante: [440, 550], eau: [900, 700, 500], erreur: [220, 180], ouvre: [520, 780] }[type] || [600];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle";
      o.frequency.value = f;
      const t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.05 * H.volume("bruitages")), t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 0.14);
    });
  };

  // Le cri pour appeler Luigi : le miaou enregistré par ƟvƟ dans les réglages,
  // sinon le miaou d'origine (sons/miaou.mp3).
  H.jouerCri = function () {
    if (!H.local || !H.local.son) return;
    const enregistre = (H.jeu && H.jeu.cri) || (H.base && H.base.cri);
    if (enregistre) {
      const a = new Audio(enregistre);
      a.volume = Math.min(1, 0.45 * H.volume("bruitages"));
      a.play().catch(() => {});
    } else if (H.sons) H.sons.jouer("miaou", 0.4);
  };

  let boite = null;

  function fermer() {
    if (boite) boite.remove();
    boite = null;
  }

  // repliques : [{qui: "luigi", texte: "…", choix?: [{valeur, libelle}]}, …]
  // Renvoie une promesse résolue à la fin, avec la valeur choisie s'il y avait un choix.
  function dire(repliques) {
    fermer();
    return new Promise((fin) => {
      let i = 0;
      boite = H.el("div.dialogue", { role: "dialog", "aria-live": "polite" });
      const portrait = H.el("img.dialogue-portrait", { alt: "" });
      const nom = H.el("p.dialogue-nom");
      const texte = H.el("p.dialogue-texte");
      const suite = H.el("span.dialogue-suite", { "aria-hidden": "true" }, "▼");
      const choix = H.el("div.dialogue-choix", { hidden: true });
      boite.append(portrait, H.el("div.dialogue-corps", null, nom, texte, choix, suite));
      document.body.appendChild(boite);

      let minuteur = null;
      let complet = false;
      let courant = "";

      function afficher() {
        const r = repliques[i];
        const voix = VOIX[r.qui] || VOIX.ovo;
        portrait.src = H.pixel.portrait(r.qui === "meme" ? "lolo" : r.qui, 5);
        portrait.className = "dialogue-portrait portrait-" + r.qui;
        nom.textContent = r.nom || voix.nom;
        texte.textContent = "";
        suite.hidden = true;
        choix.hidden = true;
        choix.innerHTML = "";
        complet = false;
        courant = r.texte;
        let n = 0;
        clearInterval(minuteur);
        minuteur = setInterval(() => {
          n++;
          texte.textContent = courant.slice(0, n);
          const lettre = courant[n - 1] || "";
          if (/[a-zàâäéèêëîïôöùûüÿœ]/i.test(lettre) && n % 2 === 0) bip(voix, lettre);
          if (n >= courant.length) terminer();
        }, /[.!?…]$/.test(courant.slice(0, n)) ? 120 : 32);
      }
      function terminer() {
        clearInterval(minuteur);
        texte.textContent = courant;
        complet = true;
        const options = repliques[i].choix;
        if (options && options.length) {
          choix.hidden = false;
          options.forEach((o) =>
            choix.appendChild(H.el("button.bouton.petit", {
              type: "button",
              onclick(e) {
                e.stopPropagation();
                finir(o.valeur);
              },
            }, o.libelle))
          );
          const premier = choix.querySelector("button");
          if (premier) premier.focus({ preventScroll: true });
        } else suite.hidden = false;
      }
      function finir(valeur) {
        document.removeEventListener("keydown", clavier);
        fermer();
        fin(valeur);
      }
      function avancer() {
        if (!complet) return terminer();
        if (repliques[i] && repliques[i].choix && repliques[i].choix.length) return; // il faut choisir
        i++;
        if (i >= repliques.length) finir();
        else afficher();
      }
      const clavier = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          return finir(null);
        }
        if ((e.key === "Enter" || e.key === " ") && !(e.target && e.target.closest && e.target.closest(".dialogue-choix"))) {
          e.preventDefault();
          avancer();
        }
      };
      boite.addEventListener("click", avancer);
      document.addEventListener("keydown", clavier);
      afficher();
    });
  }

  H.dialogue = { dire, fermer, VOIX };
})();
