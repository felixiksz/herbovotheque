// Dessiner soi-même l'aspect d'une plante sur la carte du terrain, en pixel art : une grille de
// cases, la palette du jeu, un crayon, un gros crayon, le pot de peinture, la pipette et la gomme.
// Le dessin est gardé dans la fiche (herbier) et remplace le dessin automatique.
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
    "#9a9a9a", "#c9c9c4", "#23214a",
  ];
  const rvb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const PALETTE = COULEURS.map(rvb);
  function proche(r, g, b) {
    let m = 0, d = Infinity;
    PALETTE.forEach(([pr, pg, pb], k) => { const e = (r - pr) ** 2 * 0.3 + (g - pg) ** 2 * 0.59 + (b - pb) ** 2 * 0.11; if (e < d) { d = e; m = k; } });
    return COULEURS[m];
  }

  H.dessinerPlante = function (id, apres) {
    const p = H.d.plante(id);
    if (!p) return;
    // la grille elle-même : une case = un pixel de cette petite toile
    const grille = document.createElement("canvas");
    grille.width = grille.height = CASES;
    const g = grille.getContext("2d", { willReadFrequently: true });
    // ce qu'on voit : la grille agrandie, avec de fins traits entre les cases
    const toile = document.createElement("canvas");
    toile.width = toile.height = CASES * ZOOM;
    toile.className = "toile-dessin pixel";
    const ctx = toile.getContext("2d");
    let couleur = COULEURS[3], outil = "crayon";
    const historique = [];

    function afficher() {
      ctx.clearRect(0, 0, toile.width, toile.height);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(grille, 0, 0, toile.width, toile.height);
      ctx.fillStyle = "rgba(35,33,74,0.14)";
      for (let k = 1; k < CASES; k++) { ctx.fillRect(k * ZOOM, 0, 1, toile.height); ctx.fillRect(0, k * ZOOM, toile.width, 1); }
    }
    function memoriser() {
      historique.push(g.getImageData(0, 0, CASES, CASES));
      if (historique.length > 40) historique.shift();
    }
    // le dessin de départ (le sien, ou le dessin automatique) ramené à la grille et à la palette
    function charger(src) {
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
    if (depart) charger(depart);

    let fermer;
    const corps = H.el("div.editeur-dessin", null,
      H.el("h2", null, H.leNom(p, true) + " sur la carte"),
      H.el("p.discret", null, "Dessine la plante vue de dessus, case par case, telle qu’elle apparaîtra sur tes îles. Le cercle montre sa place."),
      H.el("div.cadre-dessin", null, toile),
      pastillesCouleurs,
      outils,
      H.el("div.boutons-bas", null,
        p.dessinCarte ? H.el("button.bouton.discret-bouton", {
          type: "button",
          onclick() {
            H.d.majPlante(p.id, (x) => delete x.dessinCarte);
            fermer();
            apres && apres();
          },
        }, "Revenir au dessin automatique") : null,
        H.el("button.bouton", {
          type: "button",
          onclick() {
            // chaque case devient un carré net de 5 pixels
            const sortie = document.createElement("canvas");
            sortie.width = sortie.height = SORTIE;
            const s = sortie.getContext("2d");
            s.imageSmoothingEnabled = false;
            s.drawImage(grille, 0, 0, SORTIE, SORTIE);
            const url = sortie.toDataURL("image/png");
            H.d.majPlante(p.id, (x) => (x.dessinCarte = url));
            H.toast("Dessin enregistré");
            fermer();
            apres && apres();
          },
        }, "Enregistrer le dessin")
      )
    );
    fermer = H.fenetre(corps);
  };
})();
