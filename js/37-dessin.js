// Dessiner soi-même le modèle d'une plante, en pixel art, sous trois angles côte à côte : de côté,
// de dessus et de face. Une grille de cases, la palette du jeu, un crayon, un gros crayon, le pot de
// peinture, la pipette et la gomme. La vue de dessus sert pour la vue d'oiseau des îles, la vue de
// face (ou, à défaut, de côté) pour la vue en relief. Les dessins sont gardés dans la fiche.
(function () {
  const H = window.H;
  const CASES = 32;        // la grille : 32 × 32 cases
  const ZOOM = 10;         // une case à l'écran, dans la toile d'édition
  const SORTIE = 160;      // image enregistrée : 5 pixels par case, sans flou
  // la palette du jeu (les couleurs des pochettes), rangée par familles
  const COULEURS = [
    "#1e3d25", "#2f6b35", "#3f8a42", "#4aa63e", "#6cbd5c", "#9cc77a", "#c6cf55",
    "#4b3427", "#7a4520", "#9a6a3c", "#b9834f", "#c96a3a", "#e9e3cd", "#f3f0dc",
    "#f6ee55", "#ffd23a", "#ff8f2e", "#ff5b4f", "#d23a2a", "#c93f6e", "#e04bb0",
    "#ffb3a8", "#d07ab8", "#8a58cc", "#5b3c8f", "#3d5ee8", "#7f97f2", "#a8d8ec",
    "#8a98cc", "#c2cdec", "#23214a",
  ];
  const rvb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const PALETTE = COULEURS.map(rvb);
  function proche(r, g, b) {
    let m = 0, d = Infinity;
    PALETTE.forEach(([pr, pg, pb], k) => { const e = (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11; if (e < d) { d = e; m = k; } });
    return COULEURS[m];
  }

  // Le modèle en volume : chaque vue dessinée découpe un bloc de 32 × 32 × 32 petits cubes (on
  // garde un cube seulement s'il est plein dans toutes les vues dessinées ; une vue de côté
  // absente reprend la vue de face). Chaque face d'un cube prend la couleur de la vue qui la
  // regarde : le dessus celle de la vue de dessus, la face avant celle de la vue de face, le flanc
  // celle de la vue de côté, un peu plus sombre. Le tout est dessiné en isométrie, comme les îles.
  // grilles : { face, cote, dessus } (toiles de 32 × 32, ou absentes)
  function lireGrille(c) {
    if (!c) return null;
    const d = c.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, CASES, CASES).data;
    let vide = true;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 10) { vide = false; break; }
    return vide ? null : d;
  }
  H.modele3d = function (grilles) {
    const face = lireGrille(grilles.face), cote = lireGrille(grilles.cote) || face, dessus = lireGrille(grilles.dessus);
    const devant = face || cote;
    if (!devant) return null;
    const N = CASES, plein = (d, c, l) => d[(l * N + c) * 4 + 3] > 10, couleur = (d, c, l, k) => {
      const i = (l * N + c) * 4;
      return "rgb(" + Math.round(d[i] * k) + "," + Math.round(d[i + 1] * k) + "," + Math.round(d[i + 2] * k) + ")";
    };
    // x : de gauche à droite (vue de face) ; y : du fond vers l'avant (vue de côté) ; h : la hauteur
    const vox = new Uint8Array(N * N * N), at = (x, y, h) => (h * N + y) * N + x;
    for (let h = 0; h < N; h++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const l = N - 1 - h;
      if (!plein(devant, x, l) || !plein(cote, y, l)) continue;
      if (dessus && !plein(dessus, x, y)) continue;
      vox[at(x, y, h)] = 1;
    }
    const v = (x, y, h) => x >= 0 && y >= 0 && h >= 0 && x < N && y < N && h < N && vox[at(x, y, h)];
    // en isométrie, deux pixels par demi-cube
    const S = 2, L = N * 2 * S + 4, Hh = N * S + N * 2 * S + 4, c = document.createElement("canvas");
    c.width = L; c.height = Hh;
    const g = c.getContext("2d");
    const ox = N * S + 2, oy = N * 2 * S + 2;
    const P = (x, y, h) => [ox + (x - y) * S, oy + (x + y) * (S / 2) - h * S];
    let minX = L, minY = Hh, maxX = 0, maxY = 0;
    for (let s = 0; s <= 2 * (N - 1); s++) for (let h = 0; h < N; h++) for (let x = Math.max(0, s - N + 1); x <= Math.min(N - 1, s); x++) {
      const y = s - x;
      if (!v(x, y, h)) continue;
      const [px, py] = P(x, y, h), l = N - 1 - h;
      // le dessus, s'il n'y a rien au-dessus
      if (!v(x, y, h + 1)) { g.fillStyle = couleur(dessus || devant, x, dessus ? y : l, 1.12); g.fillRect(px - S, py - S, S * 2, S); }
      // la face avant (vers le bas à gauche) et le flanc (vers le bas à droite)
      if (!v(x, y + 1, h)) { g.fillStyle = couleur(devant, x, l, 1); g.fillRect(px - S, py, S, S); }
      if (!v(x + 1, y, h)) { g.fillStyle = couleur(cote, y, l, 0.78); g.fillRect(px, py, S, S); }
      minX = Math.min(minX, px - S); maxX = Math.max(maxX, px + S); minY = Math.min(minY, py - S); maxY = Math.max(maxY, py + S);
    }
    if (maxX <= minX) return null;
    // on recadre au plus près, le pied en bas
    const out = document.createElement("canvas");
    out.width = maxX - minX; out.height = maxY - minY;
    out.getContext("2d").drawImage(c, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    return out;
  };

  H.dessinerPlante = function (id, apres) {
    const p = H.d.plante(id);
    if (!p) return;
    // les trois vues, chacune avec sa grille (une case = un pixel de sa petite toile) et son historique
    const VUES = [["cote", "De côté", "dessinCote"], ["dessus", "De dessus", "dessinCarte"], ["face", "De face", "dessinFace"]];
    const vues = {};
    for (const [id] of VUES) {
      const c = document.createElement("canvas");
      c.width = c.height = CASES;
      vues[id] = { grille: c, g: c.getContext("2d", { willReadFrequently: true }), historique: [] };
    }
    let vueActive = "dessus", grille = vues.dessus.grille, g = vues.dessus.g, historique = vues.dessus.historique;
    // ce qu'on voit : la grille agrandie, avec de fins traits entre les cases
    const toile = document.createElement("canvas");
    toile.width = toile.height = CASES * ZOOM;
    toile.className = "toile-dessin pixel";
    const ctx = toile.getContext("2d");
    let couleur = COULEURS[3], outil = "crayon", cadre = null;

    // les trois vues en vignettes, côte à côte : on touche une vignette pour la dessiner en grand
    const vignettes = H.el("div.vues-modele");
    function dessinerVignettes() {
      vignettes.innerHTML = "";
      for (const [id, nom] of VUES) {
        const mini = document.createElement("canvas");
        mini.width = mini.height = CASES * 3;
        const m = mini.getContext("2d");
        m.imageSmoothingEnabled = false;
        m.drawImage(vues[id].grille, 0, 0, mini.width, mini.height);
        vignettes.appendChild(H.el("button.vue-modele" + (id === vueActive ? ".actif" : ""), { type: "button", "aria-pressed": String(id === vueActive), onclick: () => choisirVue(id) }, mini, H.el("span", null, nom)));
      }
      // le modèle en volume, tel qu'il se dressera dans le relief des îles
      const m = H.modele3d({ face: vues.face.grille, cote: vues.cote.grille, dessus: vues.dessus.grille });
      const apercu = document.createElement("canvas");
      apercu.width = apercu.height = 96;
      if (m) { const a = apercu.getContext("2d"), k = Math.min(96 / m.width, 96 / m.height); a.imageSmoothingEnabled = false; a.drawImage(m, Math.round((96 - m.width * k) / 2), Math.round(96 - m.height * k), Math.round(m.width * k), Math.round(m.height * k)); }
      vignettes.appendChild(H.el("div.vue-modele.vue-3d", { title: "Le modèle en volume, d’après les trois vues" }, apercu, H.el("span", null, m ? "En 3D" : "En 3D (dessine la vue de face)")));
    }
    function choisirVue(id) {
      vueActive = id;
      ({ grille, g, historique } = vues[id]);
      // le rond de sa place au sol pour la vue de dessus ; un cadre droit, avec le sol, de côté et de face
      if (cadre) cadre.classList.toggle("debout", id !== "dessus");
      afficher();
    }
    function afficher() {
      ctx.clearRect(0, 0, toile.width, toile.height);
      ctx.imageSmoothingEnabled = false;
      // la silhouette des autres vues, très pâle, pour garder les mêmes proportions
      ctx.globalAlpha = 0.12;
      for (const [id] of VUES) if (id !== vueActive && (vueActive !== "dessus") === (id !== "dessus")) ctx.drawImage(vues[id].grille, 0, 0, toile.width, toile.height);
      ctx.globalAlpha = 1;
      ctx.drawImage(grille, 0, 0, toile.width, toile.height);
      ctx.fillStyle = "rgba(35,33,74,0.14)";
      for (let k = 1; k < CASES; k++) { ctx.fillRect(k * ZOOM, 0, 1, toile.height); ctx.fillRect(0, k * ZOOM, toile.width, 1); }
      // le sol, sous les vues de côté et de face
      if (vueActive !== "dessus") { ctx.fillStyle = "rgba(122,69,32,0.5)"; ctx.fillRect(0, toile.height - 2, toile.width, 2); }
      dessinerVignettes();
    }
    function memoriser() {
      historique.push(g.getImageData(0, 0, CASES, CASES));
      if (historique.length > 40) historique.shift();
    }
    // le dessin de départ (le sien, ou le dessin automatique) ramené à la grille et à la palette
    function charger(src, id) {
      const { g } = vues[id];
      return new Promise((ok) => {
        const img = new Image();
        img.onload = () => {
          g.clearRect(0, 0, CASES, CASES);
          g.imageSmoothingEnabled = true;
          g.drawImage(img, 0, 0, CASES, CASES);
          const d = g.getImageData(0, 0, CASES, CASES);
          for (let i = 0; i < d.data.length; i += 4) {
            if (d.data[i + 3] < 110) { d.data[i + 3] = 0; continue; }
            // les couleurs de l'aquarelle sont douces : on les avive avant de choisir dans la palette
            const m = (d.data[i] + d.data[i + 1] + d.data[i + 2]) / 3, av = (c) => Math.max(0, Math.min(255, m + (c - m) * 1.8));
            const [r, v, b] = rvb(proche(av(d.data[i]), av(d.data[i + 1]), av(d.data[i + 2])));
            d.data[i] = r; d.data[i + 1] = v; d.data[i + 2] = b; d.data[i + 3] = 255;
          }
          g.putImageData(d, 0, 0);
          afficher();
          ok();
        };
        img.onerror = ok;
        img.src = src;
      });
    }

    // --- poser des pixels ---
    const caseSous = (e) => {
      const r = toile.getBoundingClientRect();
      return [Math.floor(((e.clientX - r.left) / r.width) * CASES), Math.floor(((e.clientY - r.top) / r.height) * CASES)];
    };
    function poser(x, y) {
      const n = outil === "gros" ? 2 : 1;
      if (outil === "gomme") g.clearRect(x, y, 1, 1);
      else { g.fillStyle = couleur; g.fillRect(x, y, n, n); }
    }
    function ligne(a, b) {
      // toutes les cases entre deux positions du doigt, pour ne pas laisser de trous
      const n = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]), 1);
      for (let k = 0; k <= n; k++) poser(Math.round(a[0] + ((b[0] - a[0]) * k) / n), Math.round(a[1] + ((b[1] - a[1]) * k) / n));
    }
    function remplir(x, y) {
      const d = g.getImageData(0, 0, CASES, CASES), at = (x, y) => (y * CASES + x) * 4;
      const cible = Array.from(d.data.slice(at(x, y), at(x, y) + 4)).join(",");
      const [r, v, b] = rvb(couleur);
      if (cible === [r, v, b, 255].join(",")) return;
      const pile = [[x, y]];
      while (pile.length) {
        const [cx, cy] = pile.pop();
        if (cx < 0 || cy < 0 || cx >= CASES || cy >= CASES) continue;
        const i = at(cx, cy);
        if (Array.from(d.data.slice(i, i + 4)).join(",") !== cible) continue;
        d.data[i] = r; d.data[i + 1] = v; d.data[i + 2] = b; d.data[i + 3] = 255;
        pile.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }
      g.putImageData(d, 0, 0);
    }
    function pipette(x, y) {
      const d = g.getImageData(x, y, 1, 1).data;
      if (d[3] < 10) return;
      couleur = proche(d[0], d[1], d[2]);
      outil = "crayon";
      dessinerCouleurs();
      dessinerOutils();
    }
    let trace = null;
    toile.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      const [x, y] = caseSous(e);
      if (outil === "pipette") { pipette(x, y); return; }
      memoriser();
      if (outil === "pot") { remplir(x, y); afficher(); return; }
      toile.setPointerCapture(e.pointerId);
      trace = [x, y];
      poser(x, y);
      afficher();
    });
    toile.addEventListener("pointermove", (e) => {
      if (!trace) return;
      const q = caseSous(e);
      if (q[0] === trace[0] && q[1] === trace[1]) return;
      ligne(trace, q);
      trace = q;
      afficher();
    });
    const finir = () => (trace = null);
    toile.addEventListener("pointerup", finir);
    toile.addEventListener("pointercancel", finir);

    // --- la palette et les outils ---
    const pastillesCouleurs = H.el("div.dessin-couleurs.pixel");
    const dessinerCouleurs = () => {
      pastillesCouleurs.innerHTML = "";
      COULEURS.forEach((c) =>
        pastillesCouleurs.appendChild(H.el("button.pastille-couleur" + (c === couleur && outil !== "gomme" ? ".actif" : ""), {
          type: "button",
          style: "--c:" + c,
          "aria-label": "Couleur " + c,
          onclick() {
            couleur = c;
            if (outil === "gomme" || outil === "pipette") outil = "crayon";
            dessinerCouleurs();
            dessinerOutils();
          },
        }))
      );
    };
    const OUTILS = [["crayon", "Crayon"], ["gros", "Gros crayon"], ["pot", "Pot de peinture"], ["pipette", "Pipette"], ["gomme", "Gomme"]];
    const outils = H.el("div.pastilles.dessin-outils");
    const dessinerOutils = () => {
      outils.innerHTML = "";
      for (const [id, nom] of OUTILS) outils.appendChild(H.el("button.bouton.petit" + (outil === id ? ".actif" : ""), { type: "button", onclick: () => { outil = id; dessinerOutils(); dessinerCouleurs(); } }, nom));
      outils.append(
        H.el("button.bouton.petit", { type: "button", onclick: () => { const d = historique.pop(); if (d) { g.putImageData(d, 0, 0); afficher(); } } }, "Annuler"),
        H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { memoriser(); g.clearRect(0, 0, CASES, CASES); afficher(); } }, "Tout effacer")
      );
    };
    dessinerCouleurs();
    dessinerOutils();
    afficher();

    const depart = p.dessinCarte || (H.terrain && H.terrain.dessinAuto ? H.terrain.dessinAuto(p) : null);
    if (depart) charger(depart, "dessus");
    if (p.dessinCote) charger(p.dessinCote, "cote");
    if (p.dessinFace) charger(p.dessinFace, "face");

    let fermer;
    const corps = H.el("div.editeur-dessin", null,
      H.el("h2", null, "Le modèle " + H.duNom(p)),
      H.el("p.discret", null, "Dessine la plante case par case sous trois angles. La vue de dessus sert pour la vue d’oiseau de tes îles ; la vue de face (ou de côté) pour la vue en relief, debout, à sa vraie hauteur."),
      vignettes,
      (cadre = H.el("div.cadre-dessin", null, toile)),
      pastillesCouleurs,
      outils,
      H.el("div.boutons-bas", null,
        p.dessinCarte || p.dessinCote || p.dessinFace ? H.el("button.bouton.discret-bouton", {
          type: "button",
          onclick() {
            H.d.majPlante(p.id, (x) => { delete x.dessinCarte; delete x.dessinCote; delete x.dessinFace; });
            fermer();
            apres && apres();
          },
        }, "Revenir au dessin automatique") : null,
        H.el("button.bouton", {
          type: "button",
          onclick() {
            // chaque case devient un carré net de 5 pixels ; une vue laissée vide n'est pas gardée
            const urls = {};
            for (const [id, , champ] of VUES) {
              const d = vues[id].g.getImageData(0, 0, CASES, CASES).data;
              let vide = true;
              for (let i = 3; i < d.length; i += 4) if (d[i] > 10) { vide = false; break; }
              if (vide) { urls[champ] = null; continue; }
              const sortie = document.createElement("canvas");
              sortie.width = sortie.height = SORTIE;
              const s = sortie.getContext("2d");
              s.imageSmoothingEnabled = false;
              s.drawImage(vues[id].grille, 0, 0, SORTIE, SORTIE);
              urls[champ] = sortie.toDataURL("image/png");
            }
            H.d.majPlante(p.id, (x) => { for (const [champ, url] of Object.entries(urls)) { if (url) x[champ] = url; else delete x[champ]; } });
            H.toast("Modèle enregistré");
            fermer();
            apres && apres();
          },
        }, "Enregistrer le modèle")
      )
    );
    fermer = H.fenetre(corps);
  };
})();
