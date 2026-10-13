// La serre : on sème dans de petits pots ; à l'abri, les plantules lèvent en quelques heures
// réelles (deux fois plus vite au bon mois de semis). Les bébés plantes se repiquent ensuite
// sur une île : moins chères, et déjà « jeunes ». Les frileuses (en pot ou en serre)
// peuvent rester dans la serre, où elles se plaisent.
(function () {
  const H = window.H;
  const NB_POTS = 12;
  const HEURE = 3600e3;
  const COUT_SEMIS = { graines: 1, energie: 1 };

  function serre() {
    H.jeu.serre = H.jeu.serre || { pots: [], bebes: {}, frileuses: [] };
    const s = H.jeu.serre;
    while (s.pots.length < NB_POTS) s.pots.push(null);
    s.bebes = s.bebes || {};
    s.frileuses = s.frileuses || [];
    return s;
  }
  function sauver() {
    H.jeu.serreModifieLe = H.maintenant();
    H.d.changer("jeu");
  }

  const bonMois = (p, date) => ((p.valeurs || {}).moisSemis || []).includes((date || new Date()).getMonth() + 1);
  const dureeLevee = (p, date) => (bonMois(p, date) ? 4 : 8) * HEURE;
  function avancement(pot) {
    const p = H.d.plante(pot.p);
    if (!p) return 0;
    return Math.min(1, (H.maintenant() - pot.le) / dureeLevee(p, new Date(pot.le)));
  }
  const frileuse = (p) => (p.valeurs || {}).climatMed === "En pot ou en serre";

  // --- petit pot de terre cuite, dessiné à l'aquarelle selon l'avancement ---------------
  const cache = new Map();
  function dessinPot(p, etape) {
    const cle = (p ? p.id : "vide") + "|" + etape;
    if (cache.has(cle)) return cache.get(cle);
    const c = H.aqua.toile(140, 160), ctx = c.getContext("2d"), r = H.alea(cle);
    ctx.scale(2, 2);
    const pot = [[14, 44], [56, 44], [50, 76], [20, 76]];
    if (p && etape > 0) {
      const feuille = ["#5f8a46", "#7a9a4a", "#6b8f5a"][H.hash(p.id) % 3];
      const haut = [0, 10, 20, 30][etape];
      H.aqua.trait(ctx, r, [[35, 44], [35, 44 - haut]], { couleur: "#4f7a3a", epaisseur: 1.3 });
      const n = etape === 1 ? 2 : etape === 2 ? 4 : 6;
      for (let i = 0; i < n; i++) {
        const y = 44 - haut * (0.4 + (i / n) * 0.6), cote = i % 2 ? 1 : -1;
        H.aqua.tache(ctx, r, 35 + cote * (5 + etape * 2), y, 5 + etape * 1.5, 2.6 + etape * 0.6, feuille, { alpha: 0.3, couches: 6 });
      }
      if (etape === 3) H.aqua.tache(ctx, r, 35, 44 - haut - 2, 3, 3, ["#f2c94c", "#f08a9b", "#b48ad8", "#ffffff"][H.hash(p.id) % 4], { alpha: 0.6, couches: 4 });
    }
    H.aqua.lavis(ctx, r, [[16, 44], [54, 44], [53, 49], [17, 49]], "#6b4423", { alpha: 0.35, couches: 5 });
    H.aqua.lavis(ctx, r, pot, "#c96a3a", { alpha: 0.3, couches: 10, bord: 0.03 });
    H.aqua.trait(ctx, r, pot.concat([pot[0]]), { epaisseur: 1.3 });
    const bord = [[11, 40], [59, 40], [59, 47], [11, 47]];
    H.aqua.lavis(ctx, r, bord, "#d9824f", { alpha: 0.35, couches: 6 });
    H.aqua.trait(ctx, r, bord.concat([bord[0]]), { epaisseur: 1.2 });
    const url = c.toDataURL("image/png");
    cache.set(cle, url);
    return url;
  }

  let conteneur = null;
  function dessiner() {
    if (!conteneur) return;
    const s = serre();
    conteneur.innerHTML = "";
    conteneur.appendChild(H.el("div.herbo-tete", null,
      H.el("h1", null, "Serre"),
      H.el("p.discret", null, "Sème dans un pot : à l’abri, ça lève en quelques heures, et deux fois plus vite au bon mois de semis. Les bébés plantes se repiquent ensuite sur tes îles, moins cher et déjà jeunes.")
    ));

    // les pots de semis
    const grille = H.el("div.grille-pots");
    s.pots.forEach((pot, i) => {
      if (!pot) {
        grille.appendChild(H.el("button.pot.pot-vide", { type: "button", onclick: () => semer(i) },
          H.el("img", { src: dessinPot(null, 0), alt: "" }), H.el("span.nom-pot", null, "Semer ici")));
        return;
      }
      const p = H.d.plante(pot.p);
      if (!p) {
        s.pots[i] = null;
        return;
      }
      const a = avancement(pot);
      const etape = a >= 1 ? 3 : a >= 0.66 ? 2 : a >= 0.25 ? 1 : 0;
      const prete = a >= 1;
      const reste = Math.max(0, dureeLevee(p, new Date(pot.le)) - (H.maintenant() - pot.le));
      grille.appendChild(H.el("div.pot" + (prete ? ".pret" : ""), null,
        H.el("img", { src: dessinPot(p, etape), alt: "" }),
        H.el("span.nom-pot", null, p.nom),
        H.el("span.etat-pot", null, prete ? "prête à repiquer" : etape === 0 ? "graine semée" : etape === 1 ? "plantule" : "bébé plante"),
        !prete ? H.el("span.reste", null, "encore " + H.cartes.duree(reste) + (bonMois(p, new Date(pot.le)) ? " · bon mois !" : "")) : null,
        prete ? H.el("div.pastilles", null,
          H.el("button.bouton.petit.actif", { type: "button", onclick: () => mettreEnCaisse(i) }, "Mettre en caisse"),
          frileuse(p) ? H.el("button.bouton.petit", { type: "button", onclick: () => garder(i) }, "Garder dans la serre") : null
        ) : H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { if (confirm("Vider ce pot ?")) { s.pots[i] = null; sauver(); dessiner(); } } }, "Vider")
      ));
    });
    conteneur.appendChild(H.el("h2", null, "Les semis"));
    conteneur.appendChild(grille);

    // la caisse des bébés plantes à repiquer
    const caisse = Object.entries(s.bebes).filter(([, n]) => n > 0);
    conteneur.appendChild(H.el("h2", null, "La caisse à repiquer"));
    conteneur.appendChild(caisse.length
      ? H.el("div.pastilles", null, caisse.map(([id, n]) => {
          const p = H.d.plante(id);
          return p ? H.el("span.pastille-valeur", null, p.nom + " × " + n) : null;
        }), H.el("a.bouton.petit", { href: "#terrain" }, "Aller repiquer sur une île"))
      : H.el("p.discret", null, "Vide pour l’instant. Les bébés plantes prêtes y attendent d’être repiquées avec l’outil « Planter » du terrain."));

    // les frileuses
    conteneur.appendChild(H.el("h2", null, "Les frileuses"));
    conteneur.appendChild(s.frileuses.length
      ? H.el("div.grille-pots", null, s.frileuses.map((f) => {
          const p = H.d.plante(f.p);
          if (!p) return null;
          const age = (H.maintenant() - f.le) / (24 * HEURE);
          return H.el("a.pot.frileuse", { href: "#fiche/" + encodeURIComponent(p.id) },
            H.el("img", { src: dessinPot(p, 3), alt: "" }),
            H.el("span.nom-pot", null, p.nom),
            H.el("span.etat-pot", null, age < 1 ? "arrivée aujourd’hui" : "depuis " + Math.floor(age) + " j"));
        }))
      : H.el("p.discret", null, "Le curcuma, le gingembre, le cannelier… peinent dehors à Marseille. Ici, ils se plaisent : quand une frileuse est prête, tu peux la garder dans la serre."));
  }

  function semer(i) {
    const mois = new Date().getMonth() + 1;
    H.choisirPlantes([], (ids) => {
      const id = ids[0];
      if (!id) return;
      if (!H.ressources.depenser(COUT_SEMIS)) {
        H.dialogue.dire([{ qui: "ovo", texte: "Il me manque " + (H.ressources.quantite("graines") < 1 ? "des graines" : "de l’énergie") + " pour semer. Quelques flashcartes et on s’y remet !" }]);
        return;
      }
      serre().pots[i] = { p: id, le: H.maintenant() };
      sauver();
      H.bruit("plante");
      const p = H.d.plante(id);
      if (bonMois(p)) H.toast("C’est le bon mois pour semer " + p.nom + " : ça lèvera deux fois plus vite");
      dessiner();
    }, "Que semer ? (" + H.quantiteTexte("graines", 1) + ", " + H.quantiteTexte("energie", 1) + ")", {
      un: true,
      detail: (p) => (((p.valeurs || {}).moisSemis || []).includes(mois) ? H.el("span.bon-mois", null, "bon mois") : null),
    });
  }

  function mettreEnCaisse(i) {
    const s = serre();
    const pot = s.pots[i];
    s.bebes[pot.p] = (s.bebes[pot.p] || 0) + 1;
    s.pots[i] = null;
    sauver();
    H.bruit("recolte");
    dessiner();
  }

  function garder(i) {
    const s = serre();
    const pot = s.pots[i];
    s.frileuses.push({ p: pot.p, le: H.maintenant() });
    s.pots[i] = null;
    sauver();
    dessiner();
  }

  // pour le terrain : prendre un bébé plante dans la caisse
  H.serre = {
    bebes: () => Object.entries(serre().bebes).filter(([, n]) => n > 0),
    prendre(id) {
      const s = serre();
      if (!s.bebes[id]) return false;
      s.bebes[id]--;
      sauver();
      return true;
    },
    coutRepiquage: { terre: 1, energie: 2 },
  };

  H.vues.serre = {
    afficher(c) {
      conteneur = c;
      dessiner();
    },
    quitter() {
      conteneur = null;
    },
  };
  setInterval(() => conteneur && document.documentElement.dataset.vue === "serre" && dessiner(), 60e3);
})();
