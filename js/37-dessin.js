// Dessiner soi-même l'aspect d'une plante sur la carte du terrain (souris, doigt ou stylet).
// Le dessin est gardé dans la fiche (herbier) et remplace le dessin automatique.
(function () {
  const H = window.H;
  const TAILLE = 256;      // toile de dessin
  const SORTIE = 160;      // image enregistrée (légère, pour la synchronisation)
  const COULEURS = ["#2b2622", "#4f7a3a", "#6f9a4f", "#9cc77a", "#c9e08a", "#7a5a32", "#b5651d", "#ffffff", "#f2c94c", "#ff7b00", "#f08a9b", "#b48ad8", "#7aa6e0", "#e03a3a"];
  const EPAISSEURS = [3, 7, 14, 24];

  H.dessinerPlante = function (id, apres) {
    const p = H.d.plante(id);
    if (!p) return;
    const toile = H.aqua.toile(TAILLE, TAILLE);
    toile.className = "toile-dessin";
    const ctx = toile.getContext("2d");
    ctx.lineCap = ctx.lineJoin = "round";
    let couleur = COULEURS[1], epaisseur = EPAISSEURS[1], aquarelle = true, gomme = false;
    const historique = [];

    function charger(src) {
      return new Promise((ok) => {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, TAILLE, TAILLE);
          ctx.drawImage(img, 0, 0, TAILLE, TAILLE);
          ok();
        };
        img.onerror = ok;
        img.src = src;
      });
    }
    function memoriser() {
      historique.push(ctx.getImageData(0, 0, TAILLE, TAILLE));
      if (historique.length > 30) historique.shift();
    }

    // --- tracé ---
    let trace = null;
    const point = (e) => {
      const r = toile.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * TAILLE, ((e.clientY - r.top) / r.height) * TAILLE];
    };
    toile.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      toile.setPointerCapture(e.pointerId);
      memoriser();
      trace = point(e);
      tamponner(trace, trace, e.pressure);
    });
    toile.addEventListener("pointermove", (e) => {
      if (!trace) return;
      const q = point(e);
      tamponner(trace, q, e.pressure);
      trace = q;
    });
    const finir = () => (trace = null);
    toile.addEventListener("pointerup", finir);
    toile.addEventListener("pointercancel", finir);

    function tamponner(a, b, pression) {
      const force = pression && pression > 0 && pression !== 0.5 ? 0.5 + pression : 1;
      ctx.save();
      ctx.globalCompositeOperation = gomme ? "destination-out" : "source-over";
      ctx.strokeStyle = couleur;
      ctx.lineWidth = epaisseur * force;
      // pinceau aquarelle : traits légers qui se superposent ; sinon trait plein
      ctx.globalAlpha = gomme ? 1 : aquarelle ? 0.28 : 1;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      ctx.restore();
    }

    // --- outils ---
    const pastillesCouleurs = H.el("div.dessin-couleurs");
    const dessinerCouleurs = () => {
      pastillesCouleurs.innerHTML = "";
      COULEURS.forEach((c) =>
        pastillesCouleurs.appendChild(H.el("button.pastille-couleur" + (c === couleur && !gomme ? ".actif" : ""), {
          type: "button",
          style: "--c:" + c,
          "aria-label": "Couleur " + c,
          onclick() {
            couleur = c;
            gomme = false;
            dessinerCouleurs();
            dessinerOutils();
          },
        }))
      );
    };
    const outils = H.el("div.pastilles.dessin-outils");
    const dessinerOutils = () => {
      outils.innerHTML = "";
      EPAISSEURS.forEach((t) =>
        outils.appendChild(H.el("button.bouton.petit" + (t === epaisseur ? ".actif" : ""), { type: "button", "aria-label": "Épaisseur " + t, onclick: () => { epaisseur = t; dessinerOutils(); } },
          H.el("span.point-epaisseur", { style: "--t:" + Math.max(3, t / 1.6) + "px" })))
      );
      outils.append(
        H.el("button.bouton.petit" + (aquarelle && !gomme ? ".actif" : ""), { type: "button", onclick: () => { aquarelle = true; gomme = false; dessinerOutils(); dessinerCouleurs(); } }, "Aquarelle"),
        H.el("button.bouton.petit" + (!aquarelle && !gomme ? ".actif" : ""), { type: "button", onclick: () => { aquarelle = false; gomme = false; dessinerOutils(); dessinerCouleurs(); } }, "Feutre"),
        H.el("button.bouton.petit" + (gomme ? ".actif" : ""), { type: "button", onclick: () => { gomme = true; dessinerOutils(); dessinerCouleurs(); } }, "Gomme"),
        H.el("button.bouton.petit", { type: "button", onclick: () => { const d = historique.pop(); if (d) ctx.putImageData(d, 0, 0); } }, "Annuler le dernier trait"),
        H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { memoriser(); ctx.clearRect(0, 0, TAILLE, TAILLE); } }, "Tout effacer")
      );
    };
    dessinerCouleurs();
    dessinerOutils();

    const depart = p.dessinCarte || (H.terrain && H.terrain.dessinAuto ? H.terrain.dessinAuto(p) : null);
    if (depart) charger(depart);

    let fermer;
    const corps = H.el("div.editeur-dessin", null,
      H.el("h2", null, p.nom + " sur la carte"),
      H.el("p.discret", null, "Dessine la plante vue de dessus, telle qu’elle apparaîtra sur tes îles. Le cercle montre sa place."),
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
            const sortie = H.aqua.toile(SORTIE, SORTIE);
            sortie.getContext("2d").drawImage(toile, 0, 0, SORTIE, SORTIE);
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
