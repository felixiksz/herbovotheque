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

  // --- l'outil de recherche : par indication, par sphère d'action, et ce qui se sème ce mois-ci ---
  const outil = { q: "", sphere: null, ceMois: true };
  const listeSpheres = (p) => {
    const s = (p.valeurs || {}).spheres;
    return (Array.isArray(s) ? s : String(s || "").split(",")).map((x) => x.trim()).filter(Boolean);
  };
  const sansGras = (t) => String(t || "").replace(/\*\*/g, "").replace(/^[•\s]+/, "");
  // où chercher les indications : « Propriétés et indications », la MTC, les sphères d'action
  const CHAMPS_INDICATIONS = ["proprietes", "mtc", "spheres"];
  function extrait(p, q) {
    for (const champ of CHAMPS_INDICATIONS) {
      for (const l of String((p.valeurs || {})[champ] || "").split("\n")) {
        const propre = sansGras(l), i = H.sansAccents(propre).indexOf(q);
        if (i < 0) continue;
        const debut = Math.max(0, i - 50), fin = Math.min(propre.length, i + q.length + 70);
        return (debut ? "…" : "") + propre.slice(debut, fin).trim() + (fin < propre.length ? "…" : "");
      }
    }
    return null;
  }
  function resultats() {
    const q = H.sansAccents(outil.q.trim()), mois = new Date().getMonth() + 1;
    return H.d.plantes().filter((p) => {
      if (outil.ceMois && !((p.valeurs || {}).moisSemis || []).includes(mois)) return false;
      if (outil.sphere && !listeSpheres(p).includes(outil.sphere)) return false;
      if (!q) return true;
      if (H.sansAccents(p.nom + " " + p.latin).includes(q)) return true;
      return CHAMPS_INDICATIONS.some((c) => H.sansAccents(sansGras((p.valeurs || {})[c])).includes(q));
    });
  }
  function construireOutil() {
    const nomMois = new Date().toLocaleString("fr-FR", { month: "long" });
    const spheres = [...new Set(H.d.plantes().flatMap(listeSpheres))].sort((a, b) => a.localeCompare(b, "fr"));
    const liste = H.el("div.resultats-serre");
    const resume = H.el("p.discret.resume");
    const champ = H.el("input", {
      type: "search", value: outil.q, placeholder: "Chercher une indication : digestion, sommeil, toux…",
      "aria-label": "Chercher une plante par indication",
      oninput: H.anti((e) => { outil.q = e.target.value; majListe(); }, 180),
    });
    const ceMois = H.el("label.case", null,
      H.el("input", { type: "checkbox", checked: outil.ceMois, onchange: (e) => { outil.ceMois = e.target.checked; majListe(); } }),
      " seulement les plantes à semer en " + nomMois);
    const pastilles = H.el("div.spheres-serre", { role: "group", "aria-label": "Sphères d’action" });
    const majPastilles = () => {
      pastilles.innerHTML = "";
      pastilles.appendChild(H.el("span.discret", null, "Sphère d’action :"));
      for (const s of [null].concat(spheres)) {
        pastilles.appendChild(H.el("button.sphere" + (outil.sphere === s ? ".actif" : ""), {
          type: "button", "aria-pressed": String(outil.sphere === s),
          onclick: () => { outil.sphere = s; majPastilles(); majListe(); },
        }, s || "toutes"));
      }
    };
    function majListe() {
      const q = H.sansAccents(outil.q.trim()), mois = new Date().getMonth() + 1;
      const r = resultats();
      resume.textContent = r.length
        ? r.length + (r.length > 1 ? " plantes" : " plante") + (outil.ceMois ? " à semer en " + nomMois : "")
        : outil.ceMois ? "Rien à semer en " + nomMois + " avec cette recherche. Décoche le mois pour chercher dans toutes les plantes." : "Aucune plante ne correspond.";
      liste.innerHTML = "";
      const libre = serre().pots.indexOf(null);
      for (const p of r) {
        const ex = q && !H.sansAccents(p.nom + " " + p.latin).includes(q) ? extrait(p, q) : null;
        liste.appendChild(H.el("div.resultat-serre", null,
          H.el("div.nom-resultat", null,
            H.el("a", { href: "#fiche/" + encodeURIComponent(p.id) }, p.nom),
            p.latin ? H.el("em.discret", null, " " + p.latin) : null,
            ((p.valeurs || {}).moisSemis || []).includes(mois) ? H.el("span.bon-mois", null, "bon mois") : null),
          ex ? H.el("p.extrait", null, ex) : null,
          H.el("button.bouton.petit", {
            type: "button", disabled: libre < 0, title: libre < 0 ? "Tous les pots sont occupés" : null,
            onclick: () => semerDans(serre().pots.indexOf(null), p.id),
          }, libre < 0 ? "Pots tous occupés" : "Semer")
        ));
      }
    }
    majPastilles();
    majListe();
    outil.maj = majListe;
    return H.el("section.outil-serre", null,
      H.el("h2", null, "Outil de recherche"),
      H.el("div.recherche", null, champ, ceMois),
      pastilles, resume, liste);
  }

  let conteneur = null, zone = null;
  function dessiner() {
    if (!conteneur) return;
    if (!zone) {
      conteneur.innerHTML = "";
      conteneur.appendChild(H.el("div.herbo-tete", null,
        H.el("h1", null, "Serre"),
        H.el("p.discret", null, "Sème dans un pot : à l’abri, ça lève en quelques heures, et deux fois plus vite au bon mois de semis. Les bébés plantes se repiquent ensuite sur tes îles, moins cher et déjà jeunes.")
      ));
      zone = H.el("div");
      conteneur.appendChild(zone);
      conteneur.appendChild(construireOutil());
    } else if (outil.maj) outil.maj();
    const s = serre();
    const racine = conteneur;
    conteneur = zone;
    zone.innerHTML = "";

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
    conteneur = racine;
  }

  function semerDans(i, id) {
    if (!id || i < 0 || serre().pots[i]) return;
    if (!H.ressources.depenser(COUT_SEMIS)) {
      H.dialogue.dire([{ qui: "ovo", texte: "Il me manque " + (H.ressources.quantite("graines") < 1 ? "des graines" : "de l’énergie") + " pour semer. Quelques flashcartes et on s’y remet !" }]);
      return;
    }
    serre().pots[i] = { p: id, le: H.maintenant() };
    sauver();
    H.bruit("plante");
    const p = H.d.plante(id);
    H.toast(bonMois(p) ? "C’est le bon mois pour semer " + H.duNom(p) + " : ça lèvera deux fois plus vite" : p.nom + " est semé·e dans un pot");
    dessiner();
  }

  function semer(i) {
    const mois = new Date().getMonth() + 1;
    H.choisirPlantes([], (ids) => semerDans(i, ids[0]), "Que semer ? (" + H.quantiteTexte("graines", 1) + ", " + H.quantiteTexte("energie", 1) + ")", {
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
      zone = null;
      dessiner();
    },
    quitter() {
      conteneur = null;
      zone = null;
    },
  };
  setInterval(() => conteneur && document.documentElement.dataset.vue === "serre" && dessiner(), 60e3);
})();
