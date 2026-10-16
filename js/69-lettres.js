// La boîte aux lettres : ƟvƟ et Mesi s'écrivent des lettres (chiffrées avec le reste de la
// partie). Une lettre peut être programmée pour plus tard : elle n'arrive qu'à sa date.
// Quand une lettre attend d'être lue, le petit drapeau de la boîte se lève à la ferme.
(function () {
  const H = window.H;
  const NOMS = { ovo: "ƟvƟ", mesi: "Mesi" };
  const moi = () => (H.local.role === "mesi" ? "mesi" : "ovo");
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

  let choisie = null;
  function ouvrir(l) {
    choisie = l.id;
    if (l.pour === moi() && !l.lu) {
      l.lu = H.maintenant();
      enregistrer(l);
    }
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
  // La boîte aux lettres comme une messagerie : la liste à gauche (reçues, puis envoyées), la
  // lettre choisie à droite, sur son papier, écrite à la main.
  function dessiner() {
    if (!conteneur) return;
    conteneur.innerHTML = "";
    conteneur.appendChild(H.el("h1", null, "Boîte aux lettres"));
    const r = recues(), e = envoyees();
    const premier = moi() === "ovo" && H.base.message ? { id: "accueil", de: "mesi", texte: H.base.message, accueil: true } : null;
    const toutes = r.concat(premier ? [premier] : [], e);
    if (!toutes.some((l) => l.id === choisie)) choisie = (r.find((l) => !l.lu) || r[0] || premier || e[0] || {}).id || null;
    const lue = toutes.find((l) => l.id === choisie);

    const ligne = (l, titre, sousTitre, extra) => H.el("li", null,
      H.el("button.ligne-mail" + (l.id === choisie ? ".actif" : "") + (l.pour === moi() && !l.lu && !l.accueil ? ".non-lue" : ""), { type: "button", onclick: () => ouvrir(l) },
        H.el("img", { src: timbre(l.de), alt: "" }),
        H.el("span", null, H.el("b", null, titre), H.el("span.discret", null, sousTitre))),
      extra || null);
    const liste = H.el("ul.liste-mail");
    liste.appendChild(H.el("li.rubrique-mail", null, "Reçues"));
    r.forEach((l) => liste.appendChild(ligne(l, (l.lu ? "" : "Nouvelle · ") + "De " + NOMS[l.de], date(arrivee(l)))));
    if (premier) liste.appendChild(ligne(premier, "Le tout premier message", "pour l’ouverture de l’herbothèque"));
    if (!r.length && !premier) liste.appendChild(H.el("li.vide-mail.discret", null, "Rien pour l’instant."));
    if (e.length) {
      liste.appendChild(H.el("li.rubrique-mail", null, "Envoyées"));
      e.forEach((l) => {
        const attente = arrivee(l) > H.maintenant();
        liste.appendChild(ligne(l, "Pour " + NOMS[l.pour], (attente ? "arrivera le " : "arrivée le ") + date(arrivee(l)) + (l.lu ? " · lue" : ""),
          attente ? H.el("button.lien-discret.annuler-mail", {
            type: "button",
            onclick() {
              if (!confirm("Annuler cette lettre programmée ?")) return;
              enregistrer(Object.assign({}, l, { supprime: true }));
              dessiner();
            },
          }, "Annuler") : null));
      });
    }

    const lecture = lue
      ? H.el("div.lettre-papier", null,
          H.el("img.timbre", { src: timbre(lue.de), alt: "" }),
          lue.accueil ? null : H.el("p.lettre-date", null, date(arrivee(lue))),
          H.el("div.lettre-texte", { html: H.texteRiche(lue.texte) }),
          lue.accueil ? null : H.el("p.lettre-signature", null, NOMS[lue.de] || lue.de))
      : H.el("p.discret.lettre-vide", null, "Choisis une lettre dans la liste.");

    conteneur.append(
      H.el("div.barre-mail", null,
        H.el("button.bouton", { type: "button", onclick: ecrire }, "Écrire une lettre à " + NOMS[autre()]),
        H.el("span.discret", null, moi() === "mesi" ? "Tes lettres partent dans la boîte de la ferme d’ƟvƟ." : "Les lettres de Mesi arrivent ici. Tu peux lui répondre.")),
      H.el("div.messagerie", null, liste, H.el("div.lecture-mail", null, lecture)),
      !H.local.jeton ? H.el("p.discret", null, "Pour que les lettres partent vers l’autre appareil, il faut la synchronisation (Réglages, « Mac et iPhone »).") : ""
    );
  }

  H.lettres = { aLire: () => aLire().length };

  // --- le message du matin ------------------------------------------------------------------
  // Le premier matin de la journée, Mesi écrit : « Jó reggelt! », puis « JQTBD? ». ƟvƟ répond
  // « JR BB! », puis O ou PT :(, et lui demande à son tour « JQTBD? ». Mesi répond O!!:) ou N :(
  // (sa vraie réponse, si elle l'a donnée ce matin sur son appareil ; sinon, la plus probable).
  // Sur l'appareil de Mesi, c'est elle qui écrit, et qui choisit sa réponse.
  const jour = () => { const d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };
  function noterMatin(qui, reponse) {
    const id = jour() + "|" + qui;
    H.jeu.matins = Object.assign({}, H.jeu.matins, { [id]: { id, qui, reponse, modifieLe: H.maintenant() } });
    H.d.changer("jeu");
  }
  const reponseDe = (qui) => ((H.jeu.matins || {})[jour() + "|" + qui] || {}).reponse;
  async function messageDuMatin() {
    const h = new Date().getHours();
    if (h < 5 || h >= 12 || H.local.messageMatin === jour() || H.$(".dialogue") || !H.jeu) return;
    H.d.majLocal((l) => (l.messageMatin = jour()));
    if (moi() === "mesi") {
      await H.dialogue.dire([{ brut: true, qui: "luigi", texte: "Jó reggelt!" }, { brut: true, qui: "luigi", texte: "JQTBD?" }]);
      const r = reponseDe("ovo");
      if (r) await H.dialogue.dire([{ brut: true, qui: "ovo", texte: "JR BB!" }, { brut: true, qui: "ovo", texte: r }, { brut: true, qui: "ovo", texte: "JQTBD?" }]);
      const m = await H.dialogue.dire([{ brut: true, qui: "luigi", texte: r ? "…" : "(Quand ƟvƟ te demandera « JQTBD? »…)", choix: [{ valeur: "O!!:)", libelle: "O!!:)" }, { valeur: "N :(", libelle: "N :(" }] }]);
      if (m) noterMatin("mesi", m);
      return;
    }
    const a = await H.dialogue.dire([{ brut: true, qui: "luigi", texte: "Jó reggelt!" }, { brut: true, qui: "luigi", texte: "JQTBD?", choix: [{ valeur: "jr", libelle: "JR BB!" }] }]);
    if (!a) return;
    const r = await H.dialogue.dire([{ brut: true, qui: "ovo", texte: "JR BB!", choix: [{ valeur: "O", libelle: "O" }, { valeur: "PT :(", libelle: "PT :(" }] }]);
    if (!r) return;
    noterMatin("ovo", r);
    const m = reponseDe("mesi") || (Math.random() < 0.8 ? "O!!:)" : "N :(");
    await H.dialogue.dire([{ brut: true, qui: "ovo", texte: r }, { brut: true, qui: "ovo", texte: "JQTBD?" }, { brut: true, qui: "luigi", texte: m }]);
  }
  H.sur("vue", (v) => { if (v === "village" || v === "maison") setTimeout(messageDuMatin, 1500); });

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
