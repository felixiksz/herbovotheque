// Démarrage : verrou, déchiffrement des fiches, navigation entre les vues.
(function () {
  const H = window.H;
  H.vues = H.vues || {};
  let vueActive = null;

  // Le monde qu'on ouvre : celui d'ƟvƟ, ou, sur l'appareil de Mesi et si elle l'a choisi dans
  // ses réglages, le sien (la pharmacopée chinoise, ses propres îles, ses formules).
  async function choisirMonde() {
    const l = (await H.kv.lire("local")) || {};
    H.monde = l.role === "mesi" && l.monde === "mesi" ? "mesi" : "ovo";
    document.documentElement.dataset.monde = H.monde;
    if (H.monde === "mesi") {
      document.title = "L’herbothèque de Mesi";
      document.querySelectorAll(".titre-jeu").forEach((t) => (t.textContent = "L’herbothèque de Mesi"));
    }
  }
  async function lireBase() {
    await choisirMonde();
    const r = await fetch("data/base.enc", { cache: "no-cache" });
    if (!r.ok) throw new Error("Fiches introuvables (" + r.status + ")");
    return r.json();
  }

  async function ouvrirAvecCle(paquet, cle) {
    let base = await H.chiffre.ouvrir(paquet, cle);
    H.cle = cle;
    H.meta = { sel: paquet.sel, iter: paquet.iter };
    // dans le monde de Mesi : les fiches d'ƟvƟ, et la pharmacopée chinoise en plus
    if (H.monde === "mesi") base = await H.pharmacopee.avec(base);
    await H.d.charger(base);
  }

  async function deverrouiller(mdp) {
    const paquet = await lireBase();
    const cle = await H.chiffre.cle(mdp, paquet.sel, paquet.iter);
    try {
      await ouvrirAvecCle(paquet, cle);
    } catch (e) {
      if (e instanceof DOMException || e.name === "OperationError") throw new Error("Ce n’est pas le bon mot de passe.");
      throw e;
    }
    await H.kv.ecrire("cle", cle);
    await H.kv.ecrire("sel", paquet.sel);
  }

  async function essaiAutomatique() {
    const cle = await H.kv.lire("cle");
    const sel = await H.kv.lire("sel");
    if (!cle) return false;
    try {
      const paquet = await lireBase();
      // si les fiches ont été rechiffrées avec un autre sel, il faut redemander le mot de passe
      if (paquet.sel !== sel) return false;
      await ouvrirAvecCle(paquet, cle);
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }

  function demarrer() {
    H.$("#verrou").hidden = true;
    H.$("#entete").hidden = false;
    peindrePapier();
    H.ciel.appliquer();
    H.ciel.chargerMeteo().then(() => H.ciel.appliquer());
    if (H.ressources) H.ressources.afficherBarre();
    if (H.local.jeton) H.synchro.lancer();
    window.addEventListener("hashchange", router);
    H.sur("ciel", peindrePapier);
    if (H.base.message && !H.jeu.vu.messageAccueil) {
      H.afficherMessageAccueil(() => router());
    } else {
      router();
    }
  }

  let papierActuel = null;
  function peindrePapier() {
    const nuit = document.documentElement.dataset.theme === "nuit";
    if (papierActuel === nuit) return;
    papierActuel = nuit;
    document.documentElement.style.setProperty("--papier-image", "url(" + H.aqua.papier(nuit) + ")");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = nuit ? "#1c1b3a" : "#f2f0e8";
  }

  function router() {
    const [nom, ...params] = (location.hash.replace(/^#/, "") || "village").split("/").map(decodeURIComponent);
    let vue = H.vues[nom] ? nom : "village";
    // de 22 h à 6 h : seulement dormir et se balader (la ferme et la maison restent ouvertes pour ça)
    if (H.ciel.nuitCalme() && H.vues.dodo && !["village", "maison", "balade", "dodo", "reglages", "surprises"].includes(vue)) vue = "dodo";
    H.$$("#menu a").forEach((a) => {
      if (a.dataset.vue === vue || (vue === "fiche" && a.dataset.vue === "herbotheque")) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    if (vueActive && vueActive.nom !== vue && H.vues[vueActive.nom].quitter) H.vues[vueActive.nom].quitter();
    const conteneur = H.$("#vue");
    if (!vueActive || vueActive.nom !== vue || !H.vues[vue].mettreAJour) {
      conteneur.innerHTML = "";
      conteneur.className = "vue-" + vue;
      // les outils s'ouvrent dans une fenêtre de l'ordinateur de la ferme
      const bureau = H.bureau ? H.bureau.mode(vue, params) : null;
      if (H.bureau) H.bureau.preparer(bureau);
      H.vues[vue].afficher(bureau === "fenetre" ? H.bureau.cadre(vue, conteneur) : bureau === "ordi" ? H.bureau.cadreOrdi(vue, conteneur) : conteneur, params);
    } else {
      H.vues[vue].mettreAJour(params);
    }
    vueActive = { nom: vue, params };
    document.documentElement.dataset.vue = vue;
    H.emettre("vue", vue);
  }
  H.router = router;
  H.aller = (hash) => {
    if (location.hash === "#" + hash) router();
    else location.hash = hash;
  };

  // Message de bienvenue écrit pour ƟvƟ (gardé dans les fiches chiffrées).
  H.afficherMessageAccueil = function (ensuite) {
    const voile = H.el("div.voile.message-accueil");
    const panneau = H.el(
      "div.panneau.lettre",
      null,
      H.el("div.lettre-texte", { html: H.texteRiche(H.base.message) }),
      H.el(
        "button.bouton",
        {
          type: "button",
          onclick() {
            H.jeu.vu.messageAccueil = H.maintenant();
            H.d.changer("jeu");
            voile.remove();
            ensuite && ensuite();
          },
        },
        "Entrer dans l’herbothèque"
      )
    );
    voile.appendChild(panneau);
    document.body.appendChild(voile);
  };

  // Fenêtre par-dessus la page ; renvoie une fonction pour la fermer.
  // Une fenêtre par-dessus, comme celles du bureau : une barre de titre (la case × pour fermer, le
  // titre au milieu, repris du premier titre du contenu), puis le contenu, tout en police pixel.
  // (les anciens menus de scène prennent le même habit ; « menu-large » devient « large »)
  H.fenetre = function (contenu, opts) {
    opts = opts || {};
    const classes = (opts.classe || "").split(".").filter(Boolean).map((c) => (c === "menu-large" ? "large" : c)).filter((c) => c !== "menu-scene");
    const voile = H.el("div.voile");
    const panneau = H.el("div.panneau.fenetre-pixel" + classes.map((c) => "." + c).join(""), { role: "dialog", "aria-modal": "true" });
    const fermer = () => {
      voile.remove();
      document.removeEventListener("keydown", echap);
      opts.surFermer && opts.surFermer();
    };
    const echap = (e) => e.key === "Escape" && fermer();
    const h2 = contenu.querySelector("h2"), titre = h2 ? h2.textContent : opts.titre || "";
    if (h2) h2.remove();
    if (titre) panneau.setAttribute("aria-label", titre);
    panneau.appendChild(H.el("div.titre-fenetre-pixel", null,
      H.el("button.fermer-fenetre-pixel", { type: "button", onclick: fermer, "aria-label": "Fermer", title: "Fermer (Échap)" }, "×"),
      H.el("span.titre-texte", null, titre)));
    panneau.appendChild(H.el("div.corps-fenetre", null, contenu));
    voile.appendChild(panneau);
    voile.addEventListener("click", (e) => e.target === voile && fermer());
    document.addEventListener("keydown", echap);
    document.body.appendChild(voile);
    return fermer;
  };

  H.$("#form-verrou").addEventListener("submit", async (e) => {
    e.preventDefault();
    const msg = H.$("#verrou-message");
    const mdp = H.$("#mdp").value.trim();
    if (!mdp) {
      msg.textContent = "Écris le mot de passe.";
      return;
    }
    msg.textContent = "Ouverture…";
    try {
      await deverrouiller(mdp);
      msg.textContent = "";
      demarrer();
    } catch (err) {
      msg.textContent = err.message;
    }
  });

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch((e) => console.warn(e));
    // (un clic sur une notification de rappel : aller à la bonne page)
    navigator.serviceWorker.addEventListener("message", (e) => { if (e.data && e.data.aller) location.hash = e.data.aller; });
  }

  // Tant qu'on ne sait pas s'il faut demander le mot de passe, on ne montre rien (un fond uni) :
  // avant, l'écran du mot de passe passait une seconde avant le jeu, à chaque rechargement.
  essaiAutomatique().then((ok) => {
    document.documentElement.classList.remove("chargement");
    if (ok) demarrer();
    else {
      H.$("#verrou").hidden = false;
      if (H.accueil) H.accueil.preparer();
      H.$("#mdp").focus();
    }
  });
})();
