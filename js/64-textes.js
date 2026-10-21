// Les textes du jeu, à relire et corriger directement dans le jeu : histoires de Lóló et de
// Mesi, astuces, répliques de Mémé. Chaque texte corrigé est gardé dans la partie
// (et synchronisé) ; « Revenir au texte d'origine » efface la correction.
(function () {
  const H = window.H;
  const NOMS = { lolo: "Lóló", meme: "Mémé", luigi: "Mesi", ovo: "ƟvƟ" };
  const PREFIXES = { "lóló": "lolo", lolo: "lolo", "mémé": "meme", meme: "meme", mesi: "luigi", "ƟvƟ": "ovo", ovo: "ovo" };

  // la liste des textes modifiables ; les valeurs d'origine viennent des modules du jeu
  const SECTIONS = [
    { cle: "histoiresMesi", nom: "Les douceurs de Mesi", type: "histoires", qui: "luigi", defaut: () => H.histoires.DEFAUTS.histoiresMesi },
    { cle: "histoiresLolo", nom: "Les drames de Lóló", type: "histoires", qui: "lolo", defaut: () => H.histoires.DEFAUTS.histoiresLolo },
    { cle: "astucesLolo", nom: "Les astuces de Lóló", type: "liste", qui: "lolo", defaut: () => H.lolo.DEFAUTS.astucesLolo, aide: "Une astuce par ligne." },
    { cle: "complimentsLolo", nom: "Les compliments d’ƟvƟ pour Lóló", type: "liste", qui: "ovo", defaut: () => H.lolo.DEFAUTS.complimentsLolo, aide: "Un compliment par ligne. Trois compliments en 24 heures, et Lóló fait pleuvoir sur les jardins." },
    { cle: "memeLolo", nom: "Ce que fait Mémé", type: "liste", qui: "meme", defaut: () => H.lolo.DEFAUTS.memeLolo, aide: "Une réplique par ligne." },
  ];

  const entree = (cle) => ((H.jeu && H.jeu.textes) || {})[cle];
  function valeur(cle, defaut) {
    const e = entree(cle);
    return e && !e.origine && e.valeur !== undefined ? e.valeur : defaut;
  }
  function fixer(cle, v) {
    H.jeu.textes = Object.assign({}, H.jeu.textes, { [cle]: { valeur: v, modifieLe: H.maintenant() } });
    H.d.changer("jeu");
  }
  function retablir(cle) {
    H.jeu.textes = Object.assign({}, H.jeu.textes, { [cle]: { origine: true, modifieLe: H.maintenant() } });
    H.d.changer("jeu");
  }
  const estModifie = (cle) => {
    const e = entree(cle);
    return !!(e && !e.origine);
  };

  // une histoire en texte : une réplique par ligne, « Mémé : … » quand ce n'est pas le·la conteur·se
  function versTexte(lignes, qui) {
    return lignes.map((l) => (l.qui === qui ? l.texte : (NOMS[l.qui] || l.qui) + " : " + l.texte)).join("\n");
  }
  function depuisTexte(texte, qui) {
    return texte.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = l.match(/^([^\s:]{2,6})\s*:\s*(.+)$/);
      const q = m && (PREFIXES[m[1]] || PREFIXES[m[1].toLowerCase()]);
      return q ? { qui: q, texte: m[2] } : { qui, texte: l };
    });
  }

  function editeurListe(s) {
    const zone = H.el("textarea.texte-jeu", { rows: 10, "aria-label": s.nom });
    zone.value = valeur(s.cle, s.defaut()).join("\n");
    zone.rows = Math.min(24, Math.max(6, zone.value.split("\n").length + 2));
    zone.addEventListener("change", () => {
      const liste = zone.value.split("\n").map((l) => l.trim()).filter(Boolean);
      if (!liste.length) return H.toast("Il faut garder au moins une ligne");
      fixer(s.cle, liste);
      H.toast("Enregistré");
      majEtat();
    });
    const essai = H.el("button.bouton.petit", {
      type: "button",
      onclick() {
        const liste = valeur(s.cle, s.defaut());
        H.dialogue.dire([{ qui: s.qui, texte: liste[Math.floor(Math.random() * liste.length)] }]);
      },
    }, "Écouter une ligne au hasard");
    return H.el("div", null, s.aide ? H.el("p.discret", null, s.aide) : null, zone, H.el("div.pastilles", null, essai));
  }

  function editeurHistoires(s) {
    const boite = H.el("div.histoires-jeu");
    const dessiner = () => {
      boite.innerHTML = "";
      const histoires = valeur(s.cle, s.defaut());
      const enregistrer = () => {
        const nouvelles = Array.from(boite.querySelectorAll(".histoire-jeu")).map((el) => ({
          titre: el.querySelector("input").value.trim() || "Sans titre",
          lignes: depuisTexte(el.querySelector("textarea").value, s.qui),
        })).filter((h) => h.lignes.length);
        fixer(s.cle, nouvelles);
        H.toast("Enregistré");
        majEtat();
      };
      histoires.forEach((h, i) => {
        const titre = H.el("input", { type: "text", value: h.titre, "aria-label": "Titre de l’histoire" });
        const zone = H.el("textarea.texte-jeu", { "aria-label": "Texte de « " + h.titre + " »" });
        zone.value = versTexte(h.lignes, s.qui);
        zone.rows = Math.min(30, h.lignes.length + 3);
        titre.addEventListener("change", enregistrer);
        zone.addEventListener("change", enregistrer);
        boite.appendChild(H.el("details.histoire-jeu", { open: false },
          H.el("summary", null, h.titre),
          H.el("label", null, "Titre ", titre),
          zone,
          H.el("div.pastilles", null,
            H.el("button.bouton.petit", {
              type: "button",
              onclick() {
                const intro = s.qui === "lolo" ? "Installe-toi bien. Ce soir : « " : "J’ai une petite histoire pour toi : « ";
                H.dialogue.dire([{ qui: s.qui, texte: intro + titre.value + " »." }].concat(depuisTexte(zone.value, s.qui)));
              },
            }, "Écouter"),
            H.el("button.bouton.petit.discret-bouton", {
              type: "button",
              async onclick() {
                if (!(await H.confirmer("Supprimer l’histoire « " + h.titre + " » ?"))) return;
                const reste = valeur(s.cle, s.defaut()).filter((_, j) => j !== i);
                if (!reste.length) return H.toast("Il faut garder au moins une histoire");
                fixer(s.cle, reste);
                dessiner();
                majEtat();
              },
            }, "Supprimer l’histoire")
          )
        ));
      });
      boite.appendChild(H.el("div.pastilles", null, H.el("button.bouton.petit", {
        type: "button",
        onclick() {
          fixer(s.cle, valeur(s.cle, s.defaut()).concat([{ titre: "Nouvelle histoire", lignes: [{ qui: s.qui, texte: "Il était une fois…" }] }]));
          dessiner();
          majEtat();
          const derniere = boite.querySelectorAll(".histoire-jeu");
          if (derniere.length) derniere[derniere.length - 1].open = true;
        },
      }, "Ajouter une histoire")));
    };
    dessiner();
    return H.el("div", null,
      H.el("p.discret", null, "Une réplique par ligne. Pour faire parler quelqu’un d’autre que " + NOMS[s.qui] + ", commence la ligne par son nom : « Mémé : … », « ƟvƟ : … », « Mesi : … », « Lóló : … »."),
      boite);
  }

  let etats = [];
  function majEtat() {
    for (const [s, el] of etats) el.textContent = estModifie(s.cle) ? "corrigé" : "";
  }

  H.vues.textes = {
    afficher(c) {
      etats = [];
      if (H.local.role !== "mesi") {
        c.appendChild(H.el("p.discret", null, "Cette page est réservée à l’appareil de Mesi."));
        return;
      }
      c.appendChild(H.el("div.herbo-tete", null,
        H.el("h1", null, "Les textes du jeu"),
        H.el("p.discret", null, "Relis et corrige les histoires et les répliques. Chaque correction est enregistrée dès que tu cliques ailleurs, et partagée par la synchronisation. Le bouton « Écouter » les fait lire comme dans le jeu.")
      ));
      const sommaire = H.el("nav.pastilles");
      c.appendChild(sommaire);
      for (const s of SECTIONS) {
        const etat = H.el("span.puce-a-verifier");
        etats.push([s, etat]);
        const id = "textes-" + s.cle;
        sommaire.appendChild(H.el("a.bouton.petit", { href: "#textes", onclick: (e) => { e.preventDefault(); document.getElementById(id).scrollIntoView({ behavior: "smooth" }); } }, s.nom));
        c.appendChild(H.el("section.reglage", { id },
          H.el("h2", null, s.nom, " ", etat),
          s.surprise ? H.el("p.discret", null, "Surprise du 24 février : ƟvƟ ne les verra qu’une fois le jardin de Lóló et Mémé découvert.") : null,
          s.type === "liste" ? editeurListe(s) : editeurHistoires(s),
          H.el("div.pastilles", null, H.el("button.bouton.petit.discret-bouton", {
            type: "button",
            async onclick() {
              if (!(await H.confirmer("Effacer les corrections de « " + s.nom + " » et revenir au texte d’origine ?"))) return;
              retablir(s.cle);
              H.router();
            },
          }, "Revenir au texte d’origine"))
        ));
      }
      // pour garder une copie, ou pour reporter les corrections dans le code du jeu
      c.appendChild(H.el("section.reglage", null,
        H.el("h2", null, "Copie des textes"),
        H.el("div.pastilles", null,
          H.el("button.bouton.petit", {
            type: "button",
            onclick() {
              const tout = Object.fromEntries(SECTIONS.map((s) => [s.cle, valeur(s.cle, s.defaut())]));
              H.telecharger("textes-du-jeu.json", JSON.stringify(tout, null, 2), "application/json");
            },
          }, "Télécharger tous les textes")
        )
      ));
      majEtat();
    },
  };

  H.textes = { valeur, fixer, retablir, estModifie, SECTIONS };
})();
