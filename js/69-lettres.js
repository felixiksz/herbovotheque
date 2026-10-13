// La boîte aux lettres : ƟvƟ et Mesi s'écrivent des lettres (chiffrées avec le reste de la
// partie). Une lettre peut être programmée pour plus tard : elle n'arrive qu'à sa date.
// Quand une lettre attend d'être lue, le petit drapeau de la boîte se lève à la ferme.
(function () {
  const H = window.H;
  const NOMS = { ovo: "ƟvƟ", mesi: "Mesi" };
  const moi = () => (H.local.joueur === "mesi" ? "mesi" : "ovo");
  const autre = () => (moi() === "mesi" ? "ovo" : "mesi");

  const lettres = () => Object.values((H.jeu && H.jeu.lettres) || {}).filter((l) => l && !l.supprime);
  const arrivee = (l) => l.arrivee || l.le;
  const recues = () => lettres().filter((l) => l.pour === moi() && arrivee(l) <= H.maintenant()).sort((a, b) => arrivee(b) - arrivee(a));
  const envoyees = () => lettres().filter((l) => l.de === moi()).sort((a, b) => arrivee(b) - arrivee(a));
  const aLire = () => recues().filter((l) => !l.lu);

  function enregistrer(l) {
    l.modifieLe = H.maintenant();
    H.jeu.lettres = Object.assign({}, H.jeu.lettres, { [l.id]: l });
    H.d.changer("jeu");
    H.emettre("lettres");
  }

  const date = (t) => new Date(t).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // un petit timbre à l'aquarelle : un tournesol pour ƟvƟ, un brin de chiendent pour Mesi
  const timbres = {};
  function timbre(de) {
    if (timbres[de]) return timbres[de];
    const c = H.aqua.toile(120, 140), ctx = c.getContext("2d"), r = H.alea("timbre-" + de);
    ctx.scale(2, 2);
    ctx.fillStyle = "#fbf6ea";
    for (let x = 2; x < 60; x += 6) for (const y of [2, 68]) ctx.beginPath(), ctx.arc(x + 1, y, 2.2, 0, Math.PI * 2), ctx.fill();
    H.aqua.lavis(ctx, r, [[4, 4], [56, 4], [56, 66], [4, 66]], de === "mesi" ? "#9cc77a" : "#f2c94c", { alpha: 0.3, couches: 8 });
    if (de === "mesi") {
      for (let i = 0; i < 4; i++) H.aqua.trait(ctx, r, [[30, 60], [24 + i * 5, 14 + i * 4]], { couleur: "#4e8a2a", epaisseur: 1.6 });
    } else {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        H.aqua.tache(ctx, r, 30 + Math.cos(a) * 12, 32 + Math.sin(a) * 12, 6, 4, "#ffc21a", { alpha: 0.5, couches: 3 });
      }
      H.aqua.tache(ctx, r, 30, 32, 8, 8, "#6b3a12", { alpha: 0.6, couches: 5 });
    }
    H.aqua.trait(ctx, r, [[4, 4], [56, 4], [56, 66], [4, 66], [4, 4]], { epaisseur: 1, alpha: 0.6 });
    timbres[de] = c.toDataURL("image/png");
    return timbres[de];
  }

  function ouvrir(l) {
    if (l.pour === moi() && !l.lu) {
      l.lu = H.maintenant();
      enregistrer(l);
    }
    H.fenetre(H.el("div.lettre.lettre-ecrite", null,
      H.el("img.timbre", { src: timbre(l.de), alt: "" }),
      H.el("p.lettre-date", null, date(arrivee(l))),
      H.el("div.lettre-texte", { html: H.texteRiche(l.texte) }),
      H.el("p.lettre-signature", null, NOMS[l.de] || l.de)
    ));
    dessiner();
  }

  function ecrire() {
    const zone = H.el("textarea.texte-jeu", { rows: 12, placeholder: "Chèr·e " + NOMS[autre()] + ",", "aria-label": "Ta lettre" });
    const plusTard = H.el("input", { type: "checkbox" });
    const quand = H.el("input", { type: "date", min: new Date().toISOString().slice(0, 10), disabled: true });
    plusTard.addEventListener("change", () => (quand.disabled = !plusTard.checked));
    let fermer;
    const corps = H.el("div.ecrire-lettre", null,
      H.el("h2", null, "Une lettre pour " + NOMS[autre()]),
      zone,
      H.el("label", null, plusTard, " La faire arriver plus tard, le ", quand),
      H.el("div.boutons-bas", null,
        H.el("button.bouton", {
          type: "button",
          onclick() {
            const texte = zone.value.trim();
            if (!texte) return H.toast("La lettre est vide");
            let le = H.maintenant();
            if (plusTard.checked) {
              if (!quand.value) return H.toast("Choisis la date d’arrivée");
              const [a, m, j] = quand.value.split("-").map(Number);
              le = Math.max(le, new Date(a, m - 1, j, 7, 0).getTime());
            }
            enregistrer({ id: H.uid("lettre"), de: moi(), pour: autre(), texte, le: H.maintenant(), arrivee: le, lu: 0 });
            if (H.synchro && H.local.jeton) H.synchro.planifier();
            H.toast(le > H.maintenant() + 60e3 ? "La lettre arrivera le " + new Date(le).toLocaleDateString("fr-FR") : "Lettre envoyée");
            fermer();
            dessiner();
          },
        }, "Envoyer")
      ),
      !H.local.jeton ? H.el("p.discret", null, "Pour que la lettre parte vers l’autre appareil, il faut la synchronisation (Réglages, « Mac et iPhone »).") : null
    );
    fermer = H.fenetre(corps);
    zone.focus();
  }

  let conteneur = null;
  function dessiner() {
    if (!conteneur) return;
    conteneur.innerHTML = "";
    conteneur.appendChild(H.el("div.herbo-tete", null,
      H.el("h1", null, "Boîte aux lettres"),
      H.el("p.discret", null, moi() === "mesi" ? "Les lettres d’ƟvƟ arrivent ici. Les tiennes partent dans la boîte de la ferme d’ƟvƟ." : "Les lettres de Mesi arrivent ici. Tu peux lui répondre.")
    ));
    conteneur.appendChild(H.el("div.pastilles", null, H.el("button.bouton", { type: "button", onclick: ecrire }, "Écrire une lettre à " + NOMS[autre()])));

    const r = recues();
    conteneur.appendChild(H.el("h2", null, "Lettres reçues"));
    const liste = H.el("ul.liste-lettres");
    for (const l of r) {
      liste.appendChild(H.el("li", null, H.el("button.lettre-ligne" + (l.lu ? "" : ".non-lue"), { type: "button", onclick: () => ouvrir(l) },
        H.el("img", { src: timbre(l.de), alt: "" }),
        H.el("span", null, H.el("strong", null, (l.lu ? "" : "Nouvelle lettre · ") + "De " + NOMS[l.de]), H.el("br"), H.el("span.discret", null, date(arrivee(l))))
      )));
    }
    if (moi() === "ovo" && H.base.message) {
      liste.appendChild(H.el("li", null, H.el("button.lettre-ligne", { type: "button", onclick: () => H.afficherMessageAccueil() },
        H.el("img", { src: timbre("mesi"), alt: "" }),
        H.el("span", null, H.el("strong", null, "Le tout premier message"), H.el("br"), H.el("span.discret", null, "pour l’ouverture de l’herbothèque"))
      )));
    }
    conteneur.appendChild(liste.children.length ? liste : H.el("p.discret", null, "La boîte est vide pour l’instant."));

    const e = envoyees();
    if (e.length) {
      conteneur.appendChild(H.el("h2", null, "Lettres envoyées"));
      conteneur.appendChild(H.el("ul.liste-lettres", null, e.map((l) => {
        const attente = arrivee(l) > H.maintenant();
        return H.el("li", null, H.el("div.lettre-ligne.envoyee", null,
          H.el("img", { src: timbre(l.de), alt: "" }),
          H.el("span", null,
            H.el("button.lien-discret", { type: "button", onclick: () => ouvrir(l) }, "Pour " + NOMS[l.pour]),
            H.el("br"),
            H.el("span.discret", null, (attente ? "arrivera le " : "arrivée le ") + date(arrivee(l)) + (l.lu ? " · lue" : ""))),
          attente ? H.el("button.bouton.petit.discret-bouton", {
            type: "button",
            onclick() {
              if (!confirm("Annuler cette lettre programmée ?")) return;
              enregistrer(Object.assign({}, l, { supprime: true }));
              dessiner();
            },
          }, "Annuler") : null
        ));
      })));
    }
  }

  H.lettres = { aLire: () => aLire().length };

  H.vues.lettres = {
    afficher(c) {
      conteneur = c;
      dessiner();
    },
    quitter() {
      conteneur = null;
    },
  };

  // au démarrage et après une synchronisation : prévenir quand une lettre vient d'arriver
  let dejaAnnoncees = 0;
  function annoncer() {
    if (!H.jeu) return;
    const n = aLire().length;
    if (n > dejaAnnoncees && document.documentElement.dataset.vue !== "lettres") H.toast(n > 1 ? n + " lettres t’attendent dans la boîte aux lettres" : "Une lettre t’attend dans la boîte aux lettres", 4000);
    dejaAnnoncees = n;
    H.emettre("lettres");
  }
  H.sur("donnees", annoncer);
  setTimeout(annoncer, 3000);
  setInterval(annoncer, 10 * 60e3);
})();
