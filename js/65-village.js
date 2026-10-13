// Le village : la maison-herbothèque, la cabane à flashcartes, le ponton vers les îles,
// la boîte aux lettres. On clique sur un lieu, ƟvƟ y marche, puis on entre.
(function () {
  const H = window.H;

  // positions en fractions de la scène (paysage / portrait)
  const LIEUX = {
    herbotheque: { nom: "Herbothèque", hash: "herbotheque", paysage: [0.27, 0.5], portrait: [0.3, 0.36] },
    cartes: { nom: "Cabane à flashcartes", hash: "cartes", paysage: [0.58, 0.42], portrait: [0.74, 0.5] },
    terrain: { nom: "Ponton vers les îles", hash: "terrain", paysage: [0.86, 0.68], portrait: [0.62, 0.84] },
    lettres: { nom: "Boîte aux lettres", hash: null, paysage: [0.1, 0.78], portrait: [0.14, 0.66] },
  };

  let scene = null;

  function disposition() {
    return scene && scene.w / scene.h < 1 ? "portrait" : "paysage";
  }

  function position(lieu) {
    const [fx, fy] = LIEUX[lieu][disposition()];
    return [fx * scene.w, fy * scene.h];
  }

  function peindreFond() {
    const { w, h } = scene;
    const S = scene.dpr;
    const c = H.aqua.toile(Math.round(w * S), Math.round(h * S));
    const ctx = c.getContext("2d");
    ctx.scale(S, S);
    const r = H.alea("village");
    const saison = document.documentElement.dataset.saison || "printemps";
    const herbe = { printemps: "#a6cf80", "été": "#c3cc74", automne: "#c2ab62", hiver: "#9aae92" }[saison];
    const portrait = disposition() === "portrait";
    // ciel
    const s = H.ciel.etat();
    const t = H.ciel.teinteCiel(s.soleil.alt);
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.3);
    g.addColorStop(0, t.haut);
    g.addColorStop(1, t.bas);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h * 0.3);
    // collines au loin
    for (let i = 0; i < 4; i++) H.aqua.tache(ctx, r, w * (0.15 + i * 0.25), h * 0.3, w * 0.22, h * 0.09, "#8aa86a", { alpha: 0.06, couches: 10 });
    // prairie
    ctx.fillStyle = herbe;
    ctx.fillRect(0, h * 0.27, w, h);
    for (let i = 0; i < 30; i++) H.aqua.tache(ctx, r, r() * w, h * 0.3 + r() * h * 0.7, 30 + r() * 60, 14 + r() * 30, i % 2 ? "#8fb066" : "#d2dd98", { alpha: 0.018, couches: 6 });
    // mer et ponton
    const mer = portrait ? [[0, h * 0.86], [w, h * 0.8], [w, h], [0, h]] : [[w * 0.74, h], [w * 0.78, h * 0.62], [w * 0.88, h * 0.55], [w, h * 0.52], [w, h]];
    H.aqua.lavis(ctx, r, mer, "#79b5d3", { alpha: 0.12, couches: 14, bord: 0.08 });
    for (let i = 0; i < 8; i++) {
      const x = portrait ? r() * w : w * (0.8 + r() * 0.2), y = portrait ? h * (0.88 + r() * 0.1) : h * (0.62 + r() * 0.35);
      H.aqua.trait(ctx, r, [[x, y], [x + 18, y + 1]], { couleur: "#ffffff", epaisseur: 1.4, alpha: 0.6 });
    }
    // chemin de terre qui relie les lieux
    const pts = ["lettres", "herbotheque", "cartes", "terrain"].map((l) => position(l));
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
      for (let k = 0; k <= 12; k++) {
        const u = k / 12;
        H.aqua.tache(ctx, r, x0 + (x1 - x0) * u, y0 + 28 + (y1 - y0) * u, 22, 10, "#d8c39a", { alpha: 0.06, couches: 4 });
      }
    }
    // fleurs dans la prairie
    const fleurs = ["#f2c94c", "#f08a9b", "#ffffff", "#b48ad8", "#ff7b00"];
    for (let i = 0; i < 70; i++) {
      const x = r() * w, y = h * 0.32 + r() * h * 0.66;
      H.aqua.tache(ctx, r, x, y, 2.2, 2, fleurs[i % fleurs.length], { alpha: 0.35, couches: 3 });
    }
    dessinerMaison(ctx, r, ...position("herbotheque"));
    dessinerCabane(ctx, r, ...position("cartes"));
    dessinerPonton(ctx, r, ...position("terrain"), portrait);
    dessinerBoite(ctx, r, ...position("lettres"));
    scene.fond = c;
  }

  function dessinerMaison(ctx, r, x, y) {
    const W = 150, Hh = 92;
    const corps = [[x - W / 2, y - Hh], [x + W / 2, y - Hh], [x + W / 2, y], [x - W / 2, y]];
    H.aqua.lavis(ctx, r, corps, "#efe0c4", { alpha: 0.25, couches: 10, bord: 0.04 });
    H.aqua.trait(ctx, r, corps.concat([corps[0]]), { epaisseur: 1.6 });
    const toit = [[x - W / 2 - 14, y - Hh], [x, y - Hh - 62], [x + W / 2 + 14, y - Hh]];
    H.aqua.lavis(ctx, r, toit, "#c4623a", { alpha: 0.22, couches: 12, bord: 0.04 });
    H.aqua.trait(ctx, r, toit.concat([toit[0]]), { epaisseur: 1.6 });
    // porte
    const porte = H.aqua.rectArrondi(x - 16, y - 50, 32, 50, 8);
    H.aqua.lavis(ctx, r, porte, "#3f7a5a", { alpha: 0.3, couches: 8 });
    H.aqua.trait(ctx, r, porte.concat([porte[0]]), { epaisseur: 1.4 });
    // vitrine avec des bocaux
    for (const dx of [-52, 30]) {
      const f = [[x + dx, y - 70], [x + dx + 24, y - 70], [x + dx + 24, y - 40], [x + dx, y - 40]];
      H.aqua.lavis(ctx, r, f, "#cfe8ef", { alpha: 0.3, couches: 6 });
      H.aqua.trait(ctx, r, f.concat([f[0]]), { epaisseur: 1.2 });
      for (let i = 0; i < 3; i++) H.aqua.tache(ctx, r, x + dx + 5 + i * 7, y - 46, 2.6, 4, ["#8a9a4a", "#b5651d", "#9b6a8a"][i], { alpha: 0.4, couches: 4 });
    }
    // jardinières
    for (let i = 0; i < 6; i++) H.aqua.tache(ctx, r, x - W / 2 + 8 + i * 9, y - 4, 5, 4, "#5f8a46", { alpha: 0.2, couches: 5 });
  }

  function dessinerCabane(ctx, r, x, y) {
    const W = 96, Hh = 62;
    const corps = [[x - W / 2, y - Hh], [x + W / 2, y - Hh], [x + W / 2, y], [x - W / 2, y]];
    H.aqua.lavis(ctx, r, corps, "#b58a5a", { alpha: 0.25, couches: 10, bord: 0.04 });
    for (let i = 1; i < 5; i++) H.aqua.trait(ctx, r, [[x - W / 2, y - Hh + i * 12], [x + W / 2, y - Hh + i * 12]], { couleur: "#6b4423", epaisseur: 0.8, alpha: 0.4 });
    H.aqua.trait(ctx, r, corps.concat([corps[0]]), { epaisseur: 1.5 });
    const toit = [[x - W / 2 - 10, y - Hh], [x, y - Hh - 40], [x + W / 2 + 10, y - Hh]];
    H.aqua.lavis(ctx, r, toit, "#6b7a8a", { alpha: 0.25, couches: 10, bord: 0.04 });
    H.aqua.trait(ctx, r, toit.concat([toit[0]]), { epaisseur: 1.5 });
    // petites cartes accrochées à une ficelle
    H.aqua.trait(ctx, r, [[x - 34, y - Hh + 8], [x + 34, y - Hh + 8]], { couleur: "#2b2622", epaisseur: 0.8 });
    for (let i = 0; i < 4; i++) {
      const cx = x - 28 + i * 18;
      const carte = [[cx, y - Hh + 9], [cx + 12, y - Hh + 9], [cx + 12, y - Hh + 25], [cx, y - Hh + 25]];
      H.aqua.lavis(ctx, r, carte, i % 2 ? "#fbf6ea" : "#ff7b00", { alpha: 0.45, couches: 4 });
      H.aqua.trait(ctx, r, carte.concat([carte[0]]), { epaisseur: 0.8 });
    }
    const porte = H.aqua.rectArrondi(x - 12, y - 34, 24, 34, 5);
    H.aqua.lavis(ctx, r, porte, "#7a4a24", { alpha: 0.3, couches: 6 });
    H.aqua.trait(ctx, r, porte.concat([porte[0]]), { epaisseur: 1.2 });
  }

  function dessinerPonton(ctx, r, x, y, portrait) {
    const long = 120;
    for (let i = 0; i < 9; i++) {
      const k = i / 8;
      const px = portrait ? x - 26 : x - 20 + k * long * 0.7, py = portrait ? y - 6 + k * long * 0.6 : y - 10 + k * long * 0.25;
      const planche = [[px - 24, py - 4], [px + 24, py - 4], [px + 24, py + 4], [px - 24, py + 4]];
      H.aqua.lavis(ctx, r, planche, "#b07a45", { alpha: 0.35, couches: 4, bord: 0.03 });
      H.aqua.trait(ctx, r, planche.concat([planche[0]]), { epaisseur: 0.9, alpha: 0.6 });
    }
    // petite barque
    const bx = portrait ? x + 30 : x + 80, by = portrait ? y + 60 : y + 46;
    const barque = [[bx - 26, by - 6], [bx + 26, by - 6], [bx + 18, by + 8], [bx - 18, by + 8]];
    H.aqua.lavis(ctx, r, barque, "#e9e2cf", { alpha: 0.4, couches: 6 });
    H.aqua.trait(ctx, r, barque.concat([barque[0]]), { epaisseur: 1.3 });
    H.aqua.trait(ctx, r, [[bx - 20, by - 1], [bx + 20, by - 1]], { couleur: "#ff2e9a", epaisseur: 2, alpha: 0.8 });
  }

  function dessinerBoite(ctx, r, x, y) {
    H.aqua.trait(ctx, r, [[x, y], [x, y - 34]], { couleur: "#6b4423", epaisseur: 3 });
    const boite = H.aqua.rectArrondi(x - 15, y - 52, 30, 20, 8);
    H.aqua.lavis(ctx, r, boite, "#3a5fd0", { alpha: 0.35, couches: 6 });
    H.aqua.trait(ctx, r, boite.concat([boite[0]]), { epaisseur: 1.3 });
    H.aqua.trait(ctx, r, [[x + 15, y - 50], [x + 15, y - 64], [x + 24, y - 60], [x + 15, y - 56]], { couleur: "#ff2e9a", epaisseur: 1.8 });
  }

  function dessiner() {
    if (!scene) return;
    const { ctx, w, h, dpr } = scene;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(scene.fond, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // étiquettes des lieux (kraft, Beth Ellen)
    ctx.textAlign = "center";
    for (const [id, l] of Object.entries(LIEUX)) {
      let [x, y] = position(id);
      const survol = scene.survol === id;
      ctx.font = (disposition() === "portrait" ? 17 : 19) + "px 'Beth Ellen', cursive";
      const tw = ctx.measureText(l.nom).width + 18;
      const ey = y + 26;
      x = Math.max(tw / 2 + 4, Math.min(w - tw / 2 - 4, x));
      ctx.fillStyle = survol ? "#ff7b00" : "#c9a878";
      ctx.fillRect(x - tw / 2, ey - 15, tw, 26);
      ctx.strokeStyle = "rgba(60,40,20,0.5)";
      ctx.strokeRect(x - tw / 2 + 0.5, ey - 14.5, tw - 1, 25);
      ctx.fillStyle = "#3a2614";
      ctx.fillText(l.nom, x, ey + 4);
    }
    // Lóló et Mémé viennent se promener au village une fois leur île découverte
    if (H.terrain && H.terrain.ileSecreteOuverte() && H.jeu.vu.ileSecrete) {
      const [px, py] = position("terrain");
      const portrait = disposition() === "portrait";
      H.pixel.dessiner(ctx, "lolo", portrait ? w - 60 : px - 90, portrait ? py - 60 : py - 10, 2, Math.floor(performance.now() / 700) % 2);
    }
    const o = scene.ovo;
    const marche = o.cible ? Math.floor(performance.now() / 160) % 2 : 0;
    H.pixel.dessiner(ctx, "ovo", o.x, o.y - (marche ? 2 : 0), 3, marche);
    // nuit
    const alt = H.ciel.etat().soleil.alt;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (alt < 0) {
      ctx.fillStyle = "rgba(20,24,60," + Math.min(0.5, (-alt / 12) * 0.5 + 0.05) + ")";
      ctx.fillRect(0, 0, scene.toile.width, scene.toile.height);
      // fenêtres allumées
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const [hx, hy] = position("herbotheque");
      ctx.fillStyle = "rgba(255,210,110,0.55)";
      ctx.fillRect(hx - 52, hy - 70, 24, 30);
      ctx.fillRect(hx + 30, hy - 70, 24, 30);
    } else if (alt < 8) {
      ctx.fillStyle = "rgba(255,150,80," + 0.12 * (1 - alt / 8) + ")";
      ctx.fillRect(0, 0, scene.toile.width, scene.toile.height);
    }
  }

  function dimensionner() {
    const largeur = scene.boite.clientWidth || 800;
    const portrait = largeur < 640;
    scene.w = largeur;
    scene.h = portrait ? Math.round(largeur * 1.45) : Math.round(largeur * 0.56);
    scene.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    scene.toile.width = Math.round(scene.w * scene.dpr);
    scene.toile.height = Math.round(scene.h * scene.dpr);
    scene.toile.style.height = scene.h + "px";
    peindreFond();
    if (!scene.ovo.place) {
      const [x, y] = position(scene.depart || "herbotheque");
      scene.ovo.x = x + (disposition() === "portrait" ? 70 : 100);
      scene.ovo.y = y + 14;
      scene.ovo.place = true;
    }
  }

  function aller(id) {
    const [x, y] = position(id);
    scene.ovo.cible = { x: x + (disposition() === "portrait" ? 70 : 95), y: y + 14, id };
    if (document.visibilityState === "hidden") arriver(id);
  }

  function arriver(id) {
    scene.ovo.cible = null;
    H.d.majLocal((l) => (l.dernierLieu = id));
    if (id === "lettres") return ouvrirLettres();
    H.bruit("ouvre");
    H.aller(LIEUX[id].hash);
  }

  function boucle() {
    let derniere = performance.now();
    const pas = (t) => {
      if (!scene) return;
      const dt = Math.min(0.1, (t - derniere) / 1000);
      derniere = t;
      const o = scene.ovo;
      if (o.cible) {
        const dx = o.cible.x - o.x, dy = o.cible.y - o.y, d = Math.hypot(dx, dy), v = 260 * dt;
        if (d <= v) {
          o.x = o.cible.x;
          o.y = o.cible.y;
          const id = o.cible.id;
          dessiner();
          return arriver(id);
        }
        o.x += (dx / d) * v;
        o.y += (dy / d) * v;
      }
      dessiner();
      scene.anim = requestAnimationFrame(pas);
    };
    scene.anim = requestAnimationFrame(pas);
  }

  function lieuSous(e) {
    const rect = scene.toile.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    let meilleur = null, dmin = 95;
    for (const id of Object.keys(LIEUX)) {
      const [lx, ly] = position(id);
      const d = Math.hypot(lx - x, ly - 30 - y);
      if (d < dmin) {
        dmin = d;
        meilleur = id;
      }
    }
    return meilleur;
  }

  function ouvrirLettres() {
    if (H.base.message) H.afficherMessageAccueil();
    else H.dialogue.dire([{ qui: "ovo", texte: "La boîte aux lettres est vide… pour l’instant !" }]);
  }

  // --- les nouvelles du jour, sous la carte -------------------------------------------
  function nouvelles() {
    const s = H.ciel.etat();
    const mois = s.date.getMonth() + 1;
    const h = s.date.getHours();
    const salut = h < 5 ? "Bonne nuit" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";
    const plantes = H.d.plantes();
    const enFleurs = plantes.filter((p) => ((p.valeurs || {}).moisFloraison || []).includes(mois));
    const aRecolter = plantes.filter((p) => ((p.valeurs || {}).moisRecolte || []).includes(mois));
    const aSemer = plantes.filter((p) => ((p.valeurs || {}).moisSemis || []).includes(mois));
    const echantillon = (liste) => liste.slice().sort(() => Math.random() - 0.5).slice(0, 6).map((p) => H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, p.nom));
    const virgules = (els) => els.flatMap((e, i) => (i ? [", ", e] : [e]));
    const m = s.meteo;
    return H.el("section.nouvelles", null,
      H.el("h2", null, salut + " ƟvƟ"),
      H.el("p.discret", null, [
        s.date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }),
        H.jeu.lieu.nom,
        m ? m.temperature + " °C, " + m.libelle : null,
        s.saison,
        H.ciel.nomPhase(s.lune.phase),
      ].filter(Boolean).join(" · ")),
      enFleurs.length ? H.el("p", null, H.el("strong", null, "En fleurs ce mois-ci : "), ...virgules(echantillon(enFleurs)), enFleurs.length > 6 ? " et " + (enFleurs.length - 6) + " autres." : ".") : null,
      aRecolter.length ? H.el("p", null, H.el("strong", null, "À récolter : "), ...virgules(echantillon(aRecolter)), aRecolter.length > 6 ? "…" : ".") : null,
      aSemer.length ? H.el("p", null, H.el("strong", null, "À semer : "), ...virgules(echantillon(aSemer)), aSemer.length > 6 ? "…" : ".") : null
    );
  }

  H.vues.village = {
    afficher(c) {
      const boite = H.el("div.village");
      const toile = H.el("canvas.toile-village", { "aria-label": "Le village" });
      boite.appendChild(toile);
      c.appendChild(boite);
      const liens = H.el("nav.liens-village", { "aria-label": "Lieux du village" },
        Object.entries(LIEUX).map(([id, l]) => H.el("button.bouton.petit", { type: "button", onclick: () => aller(id) }, l.nom))
      );
      c.appendChild(liens);
      c.appendChild(nouvelles());
      scene = { boite, toile, ctx: toile.getContext("2d"), ovo: { x: 0, y: 0, cible: null }, depart: H.local.dernierLieu || "herbotheque" };
      dimensionner();
      dessiner();
      boucle();
      toile.addEventListener("click", (e) => {
        const id = lieuSous(e);
        if (id) aller(id);
      });
      toile.addEventListener("mousemove", (e) => {
        const id = lieuSous(e);
        if (id !== scene.survol) {
          scene.survol = id;
          toile.style.cursor = id ? "pointer" : "default";
        }
      });
      scene.redim = H.anti(() => {
        if (!scene) return;
        scene.ovo.place = false;
        dimensionner();
      }, 200);
      window.addEventListener("resize", scene.redim);
    },
    quitter() {
      if (scene) {
        cancelAnimationFrame(scene.anim);
        window.removeEventListener("resize", scene.redim);
      }
      scene = null;
    },
  };

  H.sur("ciel", () => scene && peindreFond());
})();
