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

  // Mesi prépare une crêpe au chocolat fondu (s'il en reste dans les ressources)
  async function crepeMesi(apres) {
    if (!H.ressources.mangerCrepe()) return;
    H.bruit("recolte");
    await H.dialogue.dire([
      { qui: "luigi", texte: H.histoires.auHasard(["Je t’ai fait une crêpe au chocolat fondu. Attention, c’est chaud !", "Une crêpe, le chocolat qui coule sur les côtés… comme tu aimes.", "Assieds-toi, la crêpe arrive ! J’ai mis double chocolat."]) },
      { qui: "ovo", texte: H.histoires.auHasard(["Mmmh… Tu es le·la meilleur·e.", "J’ai du chocolat jusqu’aux lunettes.", "Merci Mesi ! Je repars plein·e d’énergie."]) },
    ]);
    H.toast("+30 d’énergie, et la pause est finie");
    apres && apres();
  }

  // --- la maison ------------------------------------------------------------------------
  H.vues.maison = {
    afficher(c) {
      const nuit = H.ciel.nuitCalme();
      const soir = new Date().getHours() >= 18;
      c.appendChild(H.el("div.page-maison", null,
        H.el("h1", null, "Chez ƟvƟ et Mesi"),
        H.el("p.discret", null, nuit
          ? "Les lumières sont douces, la tisane est encore tiède. La ferme s’endort."
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
        H.ressources.quantite("crepe") > 0
          ? H.el("div", null,
              H.el("h2", null, "Le goûter"),
              H.el("div.pastilles", null, bouton("Manger une crêpe au chocolat fondu (" + H.ressources.quantite("crepe") + ")", () => crepeMesi(() => H.aller("maison")))))
          : null,
        nuit ? H.el("div", null, H.el("h2", null, "Bonne nuit"), H.el("div.pastilles", null, bouton("Aller dormir", () => H.aller("dodo/dormir")))) : null,
        H.el("p", null, H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme"))
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
    // la terre rouge : des rochers rouges sur le rivage, et une grande falaise rouge au loin
    const rochers = [0, 1, 2].map((i) => {
      const c = H.aqua.toile(170, 120), x = c.getContext("2d"), rr = H.alea("rocher-rouge" + i);
      const n = 9, pts = [];
      for (let j = 0; j <= n; j++) {
        const u = j / n;
        pts.push([10 + u * 150, 116 - (Math.pow(Math.sin(u * Math.PI), 0.7) * (46 + i * 22) + rr() * 16)]);
      }
      const contour = pts.concat([[160, 118], [10, 118]]);
      H.aqua.lavis(x, rr, contour, nuitTheme ? "#6e3a2c" : "#b9492a", { alpha: 0.42, couches: 12, bord: 0.04 });
      H.aqua.lavis(x, rr, contour.map(([a, b]) => [a + 14, b + 10]), nuitTheme ? "#4a261e" : "#8a3018", { alpha: 0.18, couches: 6, bord: 0.04 });
      for (let k = 0; k < 5; k++) {
        const y = 108 - k * 13 - rr() * 5;
        H.aqua.trait(x, rr, [[24 + rr() * 22, y], [80, y - 3 + rr() * 6], [140 - rr() * 22, y + 2]], { couleur: "#6e2412", epaisseur: 0.8, alpha: 0.45 });
      }
      H.aqua.trait(x, rr, pts, { epaisseur: 1.3 });
      return c;
    });
    const falaise = H.aqua.toile(560, Math.round(h * 0.42));
    {
      const fx = falaise.getContext("2d"), rf = H.alea("falaise-rouge"), fh = falaise.height;
      const pts = [[0, fh], [30, fh * 0.6], [120, fh * 0.42], [230, fh * 0.2], [330, fh * 0.06], [420, fh * 0.04], [470, fh * 0.3], [530, fh * 0.7], [560, fh]];
      H.aqua.lavis(fx, rf, pts, nuitTheme ? "#5e3a34" : "#c0583a", { alpha: 0.3, couches: 12, bord: 0.05 });
      H.aqua.lavis(fx, rf, [[200, fh * 0.24], [330, fh * 0.08], [420, fh * 0.06], [440, fh * 0.14], [300, fh * 0.2]], nuitTheme ? "#2e3b30" : "#6b8a4a", { alpha: 0.22, couches: 6 });
      for (let k = 0; k < 7; k++) H.aqua.trait(fx, rf, [[60 + k * 20, fh * (0.95 - k * 0.1)], [480 - k * 10, fh * (0.9 - k * 0.11)]], { couleur: "#8a3a22", epaisseur: 0.8, alpha: 0.35 });
      H.aqua.trait(fx, rf, pts.slice(1, -1), { epaisseur: 1.2, alpha: 0.7 });
    }
    return { ctx, dpr, w, h, loin, pin, etoiles, rochers, falaise, decalage: 0, compagnon, derniere: performance.now() };
  }

  // Le chemin passe par la terre rouge : rochers rouges et petite crique où l'on peut se baigner.
  const CYCLE = 4200, ROUGE = [650, 2900];
  function rouge(X) {
    const x = ((X % CYCLE) + CYCLE) % CYCLE;
    return Math.max(0, Math.min(1, (x - ROUGE[0]) / 320, (ROUGE[1] - x) / 320));
  }
  function melange(a, b, t) {
    const c = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    return "rgb(" + [0, 1, 2].map((i) => Math.round(c(a, i) + (c(b, i) - c(a, i)) * t)).join(",") + ")";
  }
  // des éléments du décor posés à des moments précis du chemin (dans chaque tour du cycle)
  function poses(liste, b, par, fn) {
    const { w, decalage } = b.s;
    const tour = Math.floor(decalage / CYCLE);
    for (let c = tour - 1; c <= tour + 1; c++) {
      for (const [D, ...reste] of liste) {
        const x = (D + c * CYCLE - decalage) * par + w * 0.5;
        if (x > -400 && x < w + 400) fn(x, ...reste);
      }
    }
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
    const ici = rouge(b.s.decalage);
    poses([[1750]], b, 0.3, (x) => ctx.drawImage(b.s.falaise, x - 280, h * 0.6 - b.s.falaise.height, 560, b.s.falaise.height));
    ctx.fillStyle = alt < -4 ? "#26406a" : melange("#79b5d3", "#3fb3c2", ici);
    ctx.fillRect(0, h * 0.58, w, h * 0.14);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (let i = 0; i < 12; i++) {
      const x = ((i * 97 - b.s.decalage * 0.3) % (w + 40) + w + 40) % (w + 40) - 20;
      ctx.fillRect(x, h * 0.6 + (i % 4) * 7, 14, 1.5);
    }
    const bandes = 30;
    for (let i = 0; i < bandes; i++) {
      const x0 = (i / bandes) * w, X = b.s.decalage + x0 + w / bandes / 2 - w * 0.42;
      ctx.fillStyle = alt < -4 ? melange("#6b5e4a", "#5e3a2a", rouge(X)) : melange("#d8c39a", "#c0663c", rouge(X));
      ctx.fillRect(Math.floor(x0), h * 0.72, Math.ceil(w / bandes) + 1, h * 0.28);
    }
    for (let i = 0; i < 26; i++) {
      const x = ((i * 71 - b.s.decalage) % (w + 30) + w + 30) % (w + 30) - 15;
      const rg = rouge(b.s.decalage + x - w * 0.42);
      ctx.fillStyle = alt < -4 ? "#5a4f3e" : rg > 0.5 ? (i % 3 ? "#9a4a2a" : "#e8dccb") : "#c4ad82";
      ctx.fillRect(x, h * 0.76 + (i % 6) * 8, 4 + (i % 3) * 2, 3);
    }
    // les rochers rouges sur le rivage
    poses([[820, 0, 1], [1120, 2, 0.8], [1460, 1, 1.15], [1900, 0, 0.9], [2280, 2, 1.1], [2700, 1, 0.85]], b, 0.9, (x, n, e) => {
      ctx.drawImage(b.s.rochers[n], x - 85 * e, h * 0.745 - 120 * e, 170 * e, 120 * e);
    });
    for (let i = 0; i < 4; i++) {
      const x = ((i * 260 + 80 - b.s.decalage * 0.8) % (w + 240) + w + 240) % (w + 240) - 120;
      ctx.drawImage(b.s.pin, x, h * 0.72 - 150, 120, 160);
    }
    // les promeneurs, de profil : de vrais pas alternés
    const sol = h * 0.9;
    const pas = (decale) => (b.pause ? 4 : (Math.floor(t / 170) + decale) % 4);
    if (b.s.compagnon === "lolo") H.pixel.dessiner(ctx, "loloBalade", w * 0.22, sol + 4, 2.4, b.pause ? 0 : Math.floor(t / 230) % 4);
    if (b.baignade) dessinerBaignade(ctx, b, t, w, h);
    else {
      if (b.s.compagnon === "luigi") H.pixel.dessiner(ctx, "luigiProfil", w * 0.33, sol + 2, 3, pas(2));
      H.pixel.dessiner(ctx, "ovoProfil", w * 0.42, sol, 3, pas(0));
    }
    // on peut aller se baigner quand le chemin longe la crique aux rochers rouges
    if (b.bain) b.bain.hidden = !(ici > 0.6 && !b.baignade && !H.$(".dialogue"));
    // lumière du moment
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const v of H.ciel.lumiere(alt)) {
      ctx.fillStyle = "rgba(" + v.couleur + "," + v.alpha + ")";
      ctx.fillRect(0, 0, b.toile.width, b.toile.height);
    }
    b.anim = requestAnimationFrame(dessinerBalade);
  }

  // la tête hors de l'eau, des ronds dans l'eau
  function dessinerBaignade(ctx, b, t, w, h) {
    const eau = h * 0.665;
    const nageurs = [["ovoProfil", w * 0.5, 0]];
    if (b.s.compagnon === "luigi") nageurs.push(["luigiProfil", w * 0.6, 1.7]);
    for (const [nom, x, ph] of nageurs) {
      const y = eau + 40 + Math.sin(t / 500 + ph) * 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, eau);
      ctx.clip();
      H.pixel.dessiner(ctx, nom, x, y, 3, 4);
      ctx.restore();
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 2; i++) {
        const r = 16 + ((t / 45 + ph * 30 + i * 9) % 18);
        ctx.globalAlpha = 1 - ((t / 45 + ph * 30 + i * 9) % 18) / 18;
        ctx.beginPath();
        ctx.ellipse(x, eau + 1, r, 3, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
  }

  async function baignade() {
    const b = balade;
    if (!b || b.baignade || H.$(".dialogue")) return;
    b.baignade = { debut: performance.now() };
    b.pause = true;
    b.bain.hidden = true;
    const s = H.ciel.etat();
    const mois = s.date.getMonth() + 1;
    const froid = [11, 12, 1, 2, 3, 4].includes(mois);
    const nuit = s.soleil.alt < -4;
    const lignes = [{ qui: "ovo", texte: nuit ? "Un bain de minuit dans la crique, sous la lune !" : "L’eau est turquoise au pied des rochers rouges. J’y vais !" }];
    if (b.s.compagnon === "luigi") {
      lignes.push({ qui: "luigi", texte: froid ? "Brrr, elle est fraîche ! Allez, à trois… un, deux… trois !" : "Elle est trop bonne ! On fait la planche ?" });
      lignes.push({ qui: "ovo", texte: froid ? "AAAH ! Elle est glacée… et c’est trop bien." : "On voit les petits poissons entre les rochers !" });
    } else if (b.s.compagnon === "lolo") {
      lignes.push({ qui: "lolo", texte: "Vas-y, je garde tes affaires sur la terre rouge." });
      lignes.push({ qui: "meme", texte: "Mrrrou. (Mémé refuse de mouiller une seule moustache.)" });
    } else {
      lignes.push({ qui: "ovo", nom: "Balade", texte: froid ? "Personne à l’horizon. Juste ƟvƟ, la mer froide et les rochers rouges." : "Personne à l’horizon. Juste ƟvƟ, la mer tiède et les rochers rouges." });
    }
    await H.dialogue.dire(lignes);
    if (balade === b) b.sortir.hidden = false;
  }

  async function sortirDeLeau() {
    const b = balade;
    if (!b) return;
    b.sortir.hidden = true;
    b.baignade = null;
    b.pause = false;
    const nuit = H.ciel.etat().soleil.alt < -4;
    await H.dialogue.dire([{ qui: "ovo", texte: nuit ? "Vite, la serviette ! On rentre tout doucement." : "Je sèche au soleil sur la terre rouge, ça sent le pin chaud." }]);
  }

  async function deroulerBalade(compagnon) {
    const intro = {
      luigi: [{ qui: "luigi", texte: "On va voir la mer ? Prends ma main, le chemin est un peu caillouteux." }],
      lolo: [
        { qui: "lolo", texte: "Hiii ! Une balade ! On marche côte à côte, au pas, tranquilles." },
        { qui: "meme", texte: "Mrrr… (Mémé se réveille, s’étire et se met debout sur le dos de Lóló : elle voyage sans même avoir à bouger.)" },
      ],
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
      const bain = H.el("button.bouton", { type: "button", hidden: true, onclick: () => baignade() }, "Aller se baigner");
      const sortir = H.el("button.bouton", { type: "button", hidden: true, onclick: () => sortirDeLeau() }, "Sortir de l’eau");
      const fin = H.el("div.pastilles.fin-balade", { hidden: true },
        bouton("Continuer la balade", () => { fin.hidden = true; deroulerBalade(compagnon); }),
        bouton("Rentrer à la maison", () => H.aller("maison"))
      );
      c.append(
        H.el("h1", null, compagnon === "solo" ? "Balade en solo" : compagnon === "lolo" ? "Balade avec Lóló et Mémé" : "Balade avec Mesi"),
        H.el("div.cadre-balade", null, toile),
        H.el("div.pastilles.actions-balade", null, bain, sortir),
        fin
      );
      balade = { toile, fin, bain, sortir, s: scene(toile, compagnon) };
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
      // la nuit, on ne révise pas : seulement des histoires
      H.ciel.nuitCalme() ? null : { titre: "Une fiche au hasard", sous: "l’herbier d’ƟvƟ", pages: () => {
        const p = h.auHasard(H.d.plantes());
        const v = p.valeurs || {};
        const lignes = H.lignesFiche(p, "description").concat(H.lignesFiche(p, "ethnobotanique"));
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
        H.el("p", null, H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme"))
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
          H.el("a.bouton.discret-bouton", { href: "#village" }, "Retour à la ferme")
        )
      ));
      if (dormir) H.musique.arreter();
    },
  };
})();
