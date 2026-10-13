// La maison d'ƟvƟ et Mesi (balades, histoires, compliments), la balade le long des calanques,
// la cabane de lecture à la bougie (on y entend la pluie) et l'écran du soir :
// de 22 h à 6 h, les flashcartes et le terrain dorment, pour ne pas trop stimuler le cerveau.
(function () {
  const H = window.H;
  const histoires = () => H.histoires;
  const loloLa = () => H.lolo && H.lolo.disponible();

  function bouton(texte, fn, classe) {
    return H.el("button.bouton" + (classe || ""), { type: "button", onclick: fn }, texte);
  }

  // --- une histoire racontée dans les bulles ------------------------------------------
  async function raconter(qui) {
    const h = histoires();
    const liste = qui === "lolo" ? h.LOLO : h.LUIGI;
    const vues = (H.local.histoiresLues || {})[qui] || [];
    let choix = liste.filter((x) => !vues.includes(x.titre));
    if (!choix.length) choix = liste;
    const histoire = h.auHasard(choix);
    H.d.majLocal((l) => {
      l.histoiresLues = Object.assign({}, l.histoiresLues);
      const deja = (l.histoiresLues[qui] || []).filter((t) => t !== histoire.titre);
      l.histoiresLues[qui] = deja.concat(histoire.titre).slice(-liste.length + 1);
    });
    const intro = qui === "lolo"
      ? { qui: "lolo", texte: "Installe-toi bien. Ce soir : « " + histoire.titre + " »." }
      : { qui: "luigi", texte: "J’ai une petite histoire pour toi : « " + histoire.titre + " »." };
    await H.dialogue.dire([intro].concat(histoire.lignes));
  }

  async function complimentMesi() {
    const vus = H.local.complimentsVus || [];
    let restants = histoires().COMPLIMENTS.filter((c) => !vus.includes(c));
    if (!restants.length) restants = histoires().COMPLIMENTS;
    const c = histoires().auHasard(restants);
    H.d.majLocal((l) => (l.complimentsVus = (l.complimentsVus || []).concat(c).slice(-12)));
    await H.dialogue.dire([{ qui: "luigi", texte: c }]);
  }

  // --- la maison ------------------------------------------------------------------------
  H.vues.maison = {
    afficher(c) {
      const nuit = H.ciel.nuitCalme();
      const soir = new Date().getHours() >= 18;
      c.appendChild(H.el("div.page-maison", null,
        H.el("h1", null, "Chez ƟvƟ et Mesi"),
        H.el("p.discret", null, nuit
          ? "Les lumières sont douces, la tisane est encore tiède. Le village s’endort."
          : soir
            ? "Mesi t’attend avec une tisane de tilleul. On se retrouve ici chaque soir."
            : "Le mazet est calme. Mesi arrose les géraniums de la fenêtre."),
        H.el("h2", null, "Faire une balade"),
        H.el("div.pastilles", null,
          bouton("Avec Mesi", () => H.aller("balade/luigi")),
          loloLa() ? bouton("Avec Lóló et Mémé", () => H.aller("balade/lolo")) : null,
          bouton("Seul·e", () => H.aller("balade/solo"))
        ),
        H.el("h2", null, "Écouter une histoire"),
        H.el("div.pastilles", null,
          bouton("Une douceur de Mesi", () => raconter("luigi")),
          loloLa() ? bouton("Un drame de Lóló", () => raconter("lolo")) : null,
          bouton("Un compliment de Mesi", complimentMesi)
        ),
        nuit ? H.el("div", null, H.el("h2", null, "Bonne nuit"), H.el("div.pastilles", null, bouton("Aller dormir", () => H.aller("dodo/dormir")))) : null,
        H.el("p", null, H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour au village"))
      ));
    },
  };

  // --- la balade --------------------------------------------------------------------------
  let balade = null;

  function scene(toile, compagnon) {
    const ctx = toile.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = toile.clientWidth || 600;
    const h = window.innerWidth < 640 ? 300 : 360;
    toile.width = Math.round(w * dpr);
    toile.height = Math.round(h * dpr);
    toile.style.height = h + "px";
    // décor pré-dessiné : les calanques au loin (deux largeurs pour défiler sans fin), un pin
    const nuitTheme = H.ciel.etat().soleil.alt < -4;
    const loin = H.aqua.toile(w * 2, h);
    H.aqua.calanques(loin.getContext("2d"), H.alea("balade"), w * 2, h * 0.52, h * 0.22, nuitTheme);
    const pin = H.aqua.toile(120, 160);
    const pc = pin.getContext("2d"), r = H.alea("pin");
    H.aqua.trait(pc, r, [[60, 160], [62, 70]], { couleur: "#5a3a22", epaisseur: 5 });
    H.aqua.tache(pc, r, 60, 58, 48, 26, nuitTheme ? "#2a3b34" : "#4f6b3a", { alpha: 0.18, couches: 12 });
    H.aqua.tache(pc, r, 40, 70, 26, 16, nuitTheme ? "#253530" : "#5f7a4a", { alpha: 0.16, couches: 8 });
    const etoiles = Array.from({ length: 60 }, (_, i) => [(i * 137.5) % w, (i * 53.3) % (h * 0.45), (i % 3) * 0.3 + 0.4]);
    return { ctx, dpr, w, h, loin, pin, etoiles, decalage: 0, compagnon, derniere: performance.now() };
  }

  function dessinerBalade() {
    const b = balade;
    if (!b) return;
    const { ctx, dpr, w, h } = b.s;
    const t = performance.now();
    const dt = Math.min(0.1, (t - b.s.derniere) / 1000);
    b.s.derniere = t;
    if (!b.pause) b.s.decalage += dt * 40;
    const etat = H.ciel.etat();
    const alt = etat.soleil.alt;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // ciel
    const teinte = H.ciel.teinteCiel(alt);
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    g.addColorStop(0, teinte.haut);
    g.addColorStop(1, teinte.bas);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    if (alt < -4) {
      for (const [x, y, a] of b.s.etoiles) {
        ctx.fillStyle = "rgba(255,252,235," + (a + Math.sin(t / 700 + x) * 0.15) + ")";
        ctx.fillRect(x, y, 1.6, 1.6);
      }
    }
    // la lune, avec sa vraie phase
    if (alt < 2) {
      const lx = w * 0.78, ly = h * 0.18, R = 16;
      ctx.fillStyle = "#f3efd8";
      ctx.beginPath();
      ctx.arc(lx, ly, R, 0, Math.PI * 2);
      ctx.fill();
      const ph = etat.lune.phase;
      const eclairee = etat.lune.fraction;
      if (eclairee < 0.97) {
        ctx.fillStyle = teinte.haut;
        ctx.beginPath();
        const decal = (ph < 0.5 ? -1 : 1) * R * 2 * eclairee;
        ctx.arc(lx + decal, ly, R, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // calanques au loin (défilent lentement), mer, chemin, pins (défilent vite)
    const xl = -((b.s.decalage * 0.15) % w);
    ctx.drawImage(b.s.loin, 0, 0, b.s.loin.width, b.s.loin.height, xl, 0, w * 2, h);
    ctx.drawImage(b.s.loin, 0, 0, b.s.loin.width, b.s.loin.height, xl + w * 2, 0, w * 2, h);
    ctx.fillStyle = alt < -4 ? "#26406a" : "#79b5d3";
    ctx.fillRect(0, h * 0.58, w, h * 0.14);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 12; i++) {
      const x = ((i * 97 - b.s.decalage * 0.3) % (w + 40) + w + 40) % (w + 40) - 20;
      ctx.fillRect(x, h * 0.6 + (i % 4) * 7, 14, 1.5);
    }
    ctx.fillStyle = alt < -4 ? "#6b5e4a" : "#d8c39a";
    ctx.fillRect(0, h * 0.72, w, h * 0.28);
    ctx.fillStyle = alt < -4 ? "#5a4f3e" : "#c4ad82";
    for (let i = 0; i < 18; i++) {
      const x = ((i * 71 - b.s.decalage) % (w + 30) + w + 30) % (w + 30) - 15;
      ctx.fillRect(x, h * 0.78 + (i % 5) * 9, 6, 3);
    }
    for (let i = 0; i < 4; i++) {
      const x = ((i * 260 + 80 - b.s.decalage * 0.8) % (w + 240) + w + 240) % (w + 240) - 120;
      ctx.drawImage(b.s.pin, x, h * 0.72 - 150, 120, 160);
    }
    // les promeneurs
    const pasImage = b.pause ? 0 : Math.floor(t / 200) % 2;
    const sol = h * 0.9;
    H.pixel.dessiner(ctx, "ovo", w * 0.42, sol - (pasImage ? 2 : 0), 3, pasImage);
    if (b.s.compagnon === "luigi") H.pixel.dessiner(ctx, "luigi", w * 0.3, sol - (pasImage ? 0 : 2), 3, 1 - pasImage);
    if (b.s.compagnon === "lolo") H.pixel.dessiner(ctx, "lolo", w * 0.22, sol + 4, 2.4, Math.floor(t / 400) % 2);
    // lumière du moment
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const v of H.ciel.lumiere(alt)) {
      ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha + ")";
      ctx.fillRect(0, 0, b.toile.width, b.toile.height);
    }
    b.anim = requestAnimationFrame(dessinerBalade);
  }

  async function deroulerBalade(compagnon) {
    const intro = {
      luigi: [{ qui: "luigi", texte: "On va voir la mer ? Prends ma main, le chemin est un peu caillouteux." }],
      lolo: [{ qui: "lolo", texte: "Hiii ! Une balade ! Monte, ou marche à côté, comme tu veux. Mémé dort déjà." }],
      solo: [{ qui: "ovo", nom: "Balade", texte: "ƟvƟ part seul·e sur le petit chemin, entre les pins et la mer." }],
    }[compagnon];
    await H.dialogue.dire(intro);
    if (!balade) return;
    if (compagnon === "luigi") {
      await raconter("luigi");
      if (balade) await complimentMesi();
    } else if (compagnon === "lolo") {
      await raconter("lolo");
    } else {
      await H.dialogue.dire(histoires().pensees());
    }
    if (balade && balade.fin) balade.fin.hidden = false;
  }

  H.vues.balade = {
    afficher(c, params) {
      let compagnon = ["luigi", "lolo", "solo"].includes(params[0]) ? params[0] : "luigi";
      if (compagnon === "lolo" && !loloLa()) compagnon = "solo";
      const toile = H.el("canvas.toile-balade", { "aria-label": "Balade le long des calanques" });
      const fin = H.el("div.pastilles.fin-balade", { hidden: true },
        bouton("Continuer la balade", () => { fin.hidden = true; deroulerBalade(compagnon); }),
        bouton("Rentrer à la maison", () => H.aller("maison"))
      );
      c.append(
        H.el("h1", null, compagnon === "solo" ? "Balade en solo" : compagnon === "lolo" ? "Balade avec Lóló et Mémé" : "Balade avec Mesi"),
        H.el("div.cadre-balade", null, toile),
        fin
      );
      balade = { toile, fin, s: scene(toile, compagnon) };
      dessinerBalade();
      setTimeout(() => balade && deroulerBalade(compagnon), 700);
    },
    quitter() {
      if (balade) cancelAnimationFrame(balade.anim);
      balade = null;
      H.dialogue.fermer();
    },
  };

  // --- la cabane de lecture ----------------------------------------------------------------
  let lecture = null;

  function livres() {
    const h = histoires();
    const liste = [
      { titre: "Les douceurs de Mesi", sous: "histoires pour s’endormir", pages: () => h.auHasard(h.LUIGI) },
      loloLa() ? { titre: "Les drames de Lóló", sous: "absurdes et bouleversants", pages: () => h.auHasard(h.LOLO) } : null,
      { titre: "Une fiche au hasard", sous: "l’herbier d’ƟvƟ", pages: () => {
        const p = h.auHasard(H.d.plantes());
        const v = p.valeurs || {};
        const lignes = [v.description, v.ethnobotanique].filter(Boolean).join("\n").split("\n").map((l) => l.replace(/\*\*/g, "").replace(/^[•\-–#\s]+/, "").trim()).filter(Boolean);
        return { titre: p.nom + (p.latin ? " · " + p.latin : ""), lignes: lignes.map((texte) => ({ texte })) };
      } },
      { titre: "Le ciel de cette nuit", sous: "la lune et les étoiles", pages: () => {
        const s = H.ciel.etat();
        const ph = H.ciel.nomPhase(s.lune.phase);
        return { titre: "Le ciel de cette nuit", lignes: [
          { texte: "Ce soir, au-dessus de " + H.jeu.lieu.nom + ", c’est la " + ph + ", éclairée à " + Math.round(s.lune.fraction * 100) + " %." },
          { texte: s.heures.lever ? "Le soleil s’est couché à " + H.heure(s.heures.coucher) + " et se lèvera demain vers " + H.heure(new Date(s.heures.lever.getTime() + 864e5)) + "." : "Le soleil fait des siennes ce soir." },
          { texte: "C’est l’" + (s.saison === "été" ? "été" : s.saison === "automne" ? "automne" : s.saison === "hiver" ? "hiver" : "printemps") + ". Dehors, " + (s.meteo ? s.meteo.libelle + ", " + s.meteo.temperature + " °C." : "la nuit est calme.") },
          { texte: "Ferme les yeux une minute et écoute la pluie sur le toit de la cabane." },
        ] };
      } },
    ];
    return liste.filter(Boolean);
  }

  function lire(livre, zone) {
    const contenu = livre.pages();
    let i = 0;
    const page = () => {
      zone.innerHTML = "";
      const ligne = contenu.lignes[i];
      zone.append(
        H.el("p.titre-livre", null, contenu.titre),
        H.el("p.page-livre", null, ligne.texte),
        H.el("div.pastilles.nav-livre", null,
          i > 0 ? bouton("Page précédente", () => { i--; page(); }, ".petit") : null,
          i < contenu.lignes.length - 1 ? bouton("Page suivante", () => { i++; page(); }, ".petit") : bouton("Refermer le livre", () => (zone.innerHTML = ""), ".petit"),
          H.el("span.numero-page", null, (i + 1) + " / " + contenu.lignes.length)
        )
      );
    };
    page();
  }

  H.vues.lecture = {
    afficher(c) {
      // la pluie tombe sur le toit de la cabane, même par beau temps
      H.sons.boucle("pluie", true, 0.32);
      const zone = H.el("div.livre-ouvert");
      c.appendChild(H.el("div.cabane-lecture", null,
        H.el("div.bougie", { "aria-hidden": "true" }, H.el("span.flamme"), H.el("span.cire"), H.el("span.bougeoir"), H.el("span.anse")),
        H.el("h1", null, "Cabane de lecture"),
        H.el("p.discret", null, "Une bougie, un plaid, la pluie sur le toit. Pour les soirs où le sommeil se fait attendre."),
        H.el("div.etagere-livres", null,
          livres().map((l) => H.el("button.livre", { type: "button", onclick: () => lire(l, zone) }, H.el("span.titre", null, l.titre), H.el("span.sous", null, l.sous)))
        ),
        zone,
        H.el("p", null, H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour au village"))
      ));
      lecture = true;
    },
    quitter() {
      lecture = null;
      if (H.sons.majPluie) H.sons.majPluie();
    },
  };

  // --- la nuit : les flashcartes et le terrain dorment -----------------------------------
  H.vues.dodo = {
    afficher(c, params) {
      const dormir = params[0] === "dormir";
      c.appendChild(H.el("div.page-dodo", null,
        H.el("h1", null, dormir ? "Bonne nuit, ƟvƟ" : "Chut… tout dort"),
        H.el("p", null, dormir
          ? "Mesi a soufflé la bougie. Mémé ronronne sur le cou de Lóló. Fais de beaux rêves pleins de fleurs."
          : "Il est tard : les flashcartes et le terrain se reposent jusqu’à 6 h du matin, pour que ton cerveau se repose aussi."),
        dormir ? null : H.el("div.pastilles", null,
          bouton("Faire une balade", () => H.aller("maison")),
          bouton("Aller lire dans la cabane", () => H.aller("lecture")),
          H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour au village")
        )
      ));
      if (dormir) H.musique.arreter();
    },
  };
})();
