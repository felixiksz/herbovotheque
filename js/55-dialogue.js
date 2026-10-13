// Bulles de dialogue : le texte s'écrit lettre par lettre, avec un petit babillage
// « bourdonnement feutré » : une syllabe étouffée, comme quelqu'un qui fredonne bouche fermée.
// La hauteur suit la voyelle prononcée (comme dans Animal Crossing) et chaque personnage a sa voix.
(function () {
  const H = window.H;

  const VOIX = {
    ovo: { nom: "ƟvƟ", hauteur: 330 },
    luigi: { nom: "Mesi", hauteur: 220 },
    lolo: { nom: "Lóló", hauteur: 150 },
    meme: { nom: "Mémé", hauteur: 360 },
    flamant: { nom: "Bouée flamant rose", hauteur: 470 },
  };
  // décalage (en demi-tons) selon la voyelle prononcée
  const VOYELLES = { a: 0, e: 4, i: 7, o: -3, u: 5, y: 7 };

  const contexte = () => H.audio.contexte();

  function bip(voix, lettre) {
    if (!H.local || !H.local.son) return;
    const ctx = contexte();
    if (!ctx) return;
    const v = H.sansAccents(lettre);
    const demi = VOYELLES[v] != null ? VOYELLES[v] : (v.charCodeAt(0) % 5) - 2;
    const f = voix.hauteur * Math.pow(2, (demi + (Math.random() - 0.5)) / 12);
    const t = ctx.currentTime;
    // onde triangle passée dans un filtre passe-bas : le son est rond et étouffé
    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = f * 2.2;
    filtre.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.1 * H.volume("voix")), t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    o.connect(g).connect(filtre).connect(H.audio.sortie());
    o.start(t);
    o.stop(t + 0.15);
  }

  // Le ronron de Mémé : les mêmes petits sons feutrés, mais rapides et réguliers
  // (comme « rr-rr-rr »), presque sans changer de hauteur, et qui enflent puis retombent
  // comme une respiration.
  function ronron(voix, n) {
    if (!H.local || !H.local.son) return;
    const ctx = contexte();
    if (!ctx) return;
    const f = voix.hauteur * Math.pow(2, (Math.random() - 0.5) * 0.4 / 12);
    const souffle = 0.55 + 0.45 * Math.sin(n / 5);
    const t = ctx.currentTime;
    const filtre = ctx.createBiquadFilter();
    filtre.type = "lowpass";
    filtre.frequency.value = f * 1.8;
    filtre.Q.value = 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.09 * souffle * H.volume("voix")), t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = f;
    o.connect(g).connect(filtre).connect(H.audio.sortie());
    o.start(t);
    o.stop(t + 0.1);
  }

  // Petit bruitage générique (récolte, plantation…)
  H.bruit = function (type) {
    if (!H.local || !H.local.son) return;
    const ctx = contexte();
    if (!ctx) return;
    if (type === "bisou") {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime;
      o.type = "sine";
      o.frequency.setValueAtTime(420 + Math.random() * 80, t);
      o.frequency.exponentialRampToValueAtTime(1500, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.08 * H.volume("bruitages")), t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      o.connect(g).connect(H.audio.sortie());
      o.start(t);
      o.stop(t + 0.1);
      return;
    }
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
      o.connect(g).connect(H.audio.sortie());
      o.start(t);
      o.stop(t + 0.14);
    });
  };

  // Le cri pour appeler Mesi : le miaou enregistré par ƟvƟ dans les réglages,
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
        // Mémé ne parle pas : elle ronronne, un petit son à chaque lettre, bien régulier
        const meme = r.qui === "meme";
        minuteur = setInterval(() => {
          n++;
          texte.textContent = courant.slice(0, n);
          const lettre = courant[n - 1] || "";
          if (meme) ronron(voix, n);
          else if (/[a-zàâäéèêëîïôöùûüÿœ]/i.test(lettre) && n % 2 === 0) bip(voix, lettre);
          if (n >= courant.length) terminer();
        }, meme ? 45 : 32);
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
