// Réglages : lieu (ciel et météo), thème, son, synchronisation entre appareils.
(function () {
  const H = window.H;

  function blocLieu() {
    const actuel = H.el("p", null, "Le ciel, les saisons et la météo suivent : ", H.el("strong", null, H.jeu.lieu.nom));
    const champ = H.el("input", { type: "search", placeholder: "Une ville, un village…", "aria-label": "Chercher un lieu" });
    const resultats = H.el("div.resultats-lieu");
    const msg = H.el("p.discret");
    async function chercher(e) {
      e.preventDefault();
      const q = champ.value.trim();
      if (!q) {
        msg.textContent = "Écris le nom d’un lieu.";
        return;
      }
      msg.textContent = "Recherche…";
      try {
        const liste = await H.ciel.chercherLieu(q);
        msg.textContent = liste.length ? "" : "Aucun lieu trouvé.";
        resultats.innerHTML = "";
        liste.forEach((l) =>
          resultats.appendChild(
            H.el("button.bouton.petit", {
              type: "button",
              async onclick() {
                await H.ciel.changerLieu(l);
                H.toast("Le ciel est maintenant celui de " + l.nom);
                H.router();
              },
            }, l.nom + (l.detail ? " (" + l.detail + ")" : ""))
          )
        );
      } catch (err) {
        msg.textContent = "Recherche impossible hors connexion.";
      }
    }
    const ici = H.el("button.bouton.petit", {
      type: "button",
      onclick() {
        if (!navigator.geolocation) return H.toast("Position indisponible sur cet appareil");
        msg.textContent = "Localisation…";
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            await H.ciel.changerLieu({ nom: "Ma position", lat: pos.coords.latitude, lon: pos.coords.longitude });
            H.router();
          },
          () => (msg.textContent = "Position refusée ou indisponible.")
        );
      },
    }, "Utiliser ma position");
    const marseille = H.el("button.bouton.petit", {
      type: "button",
      async onclick() {
        await H.ciel.changerLieu({ nom: "Marseille", lat: 43.2965, lon: 5.3698 });
        H.router();
      },
    }, "Revenir à Marseille");
    return H.el("section.reglage", null,
      H.el("h2", null, "Lieu"),
      actuel,
      H.el("form.ligne-lieu", { onsubmit: chercher }, champ, H.el("button.bouton.petit", { type: "submit" }, "Chercher")),
      resultats,
      H.el("div.pastilles", null, ici, marseille),
      msg
    );
  }

  function blocTheme() {
    const choix = [["auto", "Selon le soleil"], ["jour", "Toujours le jour"], ["nuit", "Toujours la nuit"]];
    return H.el("section.reglage", null,
      H.el("h2", null, "Jour et nuit"),
      H.el("div.pastilles", null,
        choix.map(([v, t]) =>
          H.el("button.bouton.petit" + (H.local.theme === v ? ".actif" : ""), {
            type: "button",
            async onclick() {
              await H.d.majLocal((l) => (l.theme = v));
              H.ciel.appliquer();
              H.router();
            },
          }, t)
        )
      ),
      H.el("div.pastilles", { style: { marginTop: "10px" } },
        H.el("label", null, H.el("input", { type: "checkbox", checked: H.local.son, onchange: (e) => H.d.majLocal((l) => (l.son = e.target.checked)) }), " Bruitages et babillage"),
        H.el("label", null, H.el("input", { type: "checkbox", checked: H.local.musique, onchange: async (e) => { await H.d.majLocal((l) => (l.musique = e.target.checked)); e.target.checked ? H.musique.jouer() : H.musique.arreter(); } }), " Musique")
      )
    );
  }

  function blocSynchro() {
    const etat = H.el("p.discret");
    const majEtat = () => {
      const d = H.local.derniereSynchro;
      const quand = d && d.jeu ? new Date(d.jeu).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : null;
      etat.textContent = !H.local.jeton
        ? "Pas encore reliée : les données restent sur cet appareil."
        : H.synchro.etat === "en cours"
          ? "Synchronisation en cours…"
          : H.synchro.etat === "erreur"
            ? "Problème de synchronisation : " + H.synchro.detail
            : quand
              ? "Reliée. Dernière synchronisation : " + quand
              : "Reliée.";
    };
    majEtat();
    H.sur("synchro", majEtat);
    const champ = H.el("input", { type: "password", placeholder: "github_pat_…", autocomplete: "off", "aria-label": "Jeton GitHub" });
    const msg = H.el("p.discret");
    return H.el("section.reglage", null,
      H.el("h2", null, "Mac et iPhone"),
      H.el("p", null, "Pour retrouver le même herbier sur tous tes appareils, colle ici le jeton d’accès qu’on t’a donné (une seule fois par appareil). Tout est chiffré avant de partir."),
      etat,
      H.el("form.ligne-lieu", {
        async onsubmit(e) {
          e.preventDefault();
          const j = champ.value.trim();
          if (!j) {
            msg.textContent = "Colle d’abord le jeton.";
            return;
          }
          msg.textContent = "Vérification…";
          const t = await H.synchro.testerJeton(j).catch(() => ({ ok: false, message: "Pas de connexion" }));
          if (!t.ok) {
            msg.textContent = t.message;
            return;
          }
          await H.d.majLocal((l) => (l.jeton = j));
          champ.value = "";
          msg.textContent = "Jeton enregistré.";
          await H.synchro.lancer();
          majEtat();
        },
      }, champ, H.el("button.bouton.petit", { type: "submit" }, "Relier")),
      msg,
      H.local.jeton
        ? H.el("div.pastilles", null,
            H.el("button.bouton.petit", { type: "button", onclick: async () => { await H.synchro.lancer(); majEtat(); } }, "Synchroniser maintenant"),
            H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: async () => { await H.d.majLocal((l) => delete l.jeton); H.router(); } }, "Oublier le jeton sur cet appareil")
          )
        : null
    );
  }

  function blocSauvegarde() {
    return H.el("section.reglage", null,
      H.el("h2", null, "Sauvegarde"),
      H.el("p", null, "Un fichier de secours avec tout ton herbier et ta progression (chiffré)."),
      H.el("div.pastilles", null,
        H.el("button.bouton.petit", {
          type: "button",
          async onclick() {
            const paquet = await H.chiffre.fermer({ herbier: H.herbier, jeu: H.jeu }, H.cle, H.meta.sel, H.meta.iter);
            const d = new Date().toISOString().slice(0, 10);
            H.telecharger("herbotheque-" + d + ".sauvegarde", JSON.stringify(paquet), "application/json");
          },
        }, "Télécharger une sauvegarde"),
        H.el("button.bouton.petit", {
          type: "button",
          onclick() {
            const input = H.el("input", { type: "file", accept: ".sauvegarde,application/json" });
            input.addEventListener("change", async () => {
              try {
                const paquet = JSON.parse(await input.files[0].text());
                const d = await H.chiffre.ouvrir(paquet, H.cle);
                if (!confirm("Remplacer l’herbier et la progression de cet appareil par cette sauvegarde ?")) return;
                H.herbier = d.herbier;
                H.jeu = d.jeu;
                H.herbier.modifieLe = H.jeu.modifieLe = H.maintenant();
                H.d.changer("herbier");
                H.d.changer("jeu");
                H.toast("Sauvegarde rechargée");
                H.aller("herbotheque");
              } catch (e) {
                H.toast("Ce fichier ne s’ouvre pas avec ce mot de passe");
              }
            });
            input.click();
          },
        }, "Recharger une sauvegarde")
      )
    );
  }

  H.vues.reglages = {
    afficher(c) {
      c.appendChild(H.el("h1", null, "Réglages"));
      c.append(blocLieu(), blocTheme(), blocSynchro(), blocSauvegarde());
      c.appendChild(H.el("p.discret.version", null, "Herbothèque v" + H.VERSION));
    },
  };
  H.VERSION = "1.0";
})();
