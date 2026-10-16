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
      H.el("h2", null, "Jour, nuit et sons"),
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
        H.el("label", null, H.el("input", { type: "checkbox", checked: H.local.musique, onchange: async (e) => { await H.d.majLocal((l) => (l.musique = e.target.checked)); e.target.checked ? H.musique.jouer() : H.musique.arreter(); } }), " Musique ambiante")
      ),
      H.el("label", null, "Style de la musique ",
        H.el("select", {
          onchange: async (e) => {
            await H.d.majLocal((l) => (l.styleMusique = e.target.value));
            H.musique.changerStyle();
          },
        }, Object.entries(H.musique.STYLES).map(([id, nom]) => H.el("option", { value: id, selected: (H.local.styleMusique || "eno") === id }, nom)))),
      H.el("p.discret", null, "La musique suit la météo du lieu : en ce moment, " + H.musique.description() + "."),
      H.el("div.volumes", null,
        H.VOLUMES.map(([cat, nom]) => {
          const sortie = H.el("span.valeur-volume", null, Math.round(H.volume(cat) * 100) + " %");
          return H.el("label.ligne-volume", null,
            H.el("span", null, nom),
            H.el("input", {
              type: "range", min: 0, max: 100, step: 1, value: Math.round(H.volume(cat) * 100),
              "aria-label": "Volume : " + nom,
              oninput(e) {
                const v = parseInt(e.target.value, 10) / 100;
                sortie.textContent = Math.round(v * 100) + " %";
                H.local.volumes = Object.assign({}, H.local.volumes, { [cat]: v });
                if (cat === "musique") H.musique.majVolume();
                if (cat === "pluie" && H.sons.apercuPluie) H.sons.apercuPluie();
                if (cat === "bruitages" && H.sons.majVolumes) H.sons.majVolumes();
              },
              onchange(e) {
                H.d.majLocal((l) => (l.volumes = Object.assign({}, l.volumes, { [cat]: parseInt(e.target.value, 10) / 100 })));
                if (cat === "bruitages") H.jouerCri();
                if (cat === "voix" && H.bruit) H.dialogue.dire([{ qui: "ovo", texte: "Coucou ! Comme ça, c’est mieux ?" }]);
              },
            }),
            sortie
          );
        })
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
            : (H.local.nomAcces ? "Reliée (" + H.local.nomAcces + (H.local.role === "testeur" ? ", partie d’essai" : "") + "). " : "Reliée. ") +
              (quand ? "Dernière synchronisation : " + quand : "");
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
          const t = await H.synchro
            .relier(j, () => confirm("C’est le tout premier jeton relié au jeu : il devient celui de Mesi, qui pourra ensuite ajouter les autres. C’est bien l’appareil de Mesi ?"))
            .catch(() => ({ ok: false, message: "Pas de connexion" }));
          msg.textContent = t.message;
          if (!t.ok) return;
          champ.value = "";
          H.router();
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

  // --- le miaou pour appeler Mesi ---------------------------------------------------
  // Enregistré au micro, converti en WAV (lisible partout, y compris sur iPhone).
  function enWav(buffer) {
    const canal = buffer.getChannelData(0);
    // on retire le silence au début et à la fin
    let debut = 0, fin = canal.length - 1;
    while (debut < fin && Math.abs(canal[debut]) < 0.02) debut++;
    while (fin > debut && Math.abs(canal[fin]) < 0.02) fin--;
    const marge = Math.round(buffer.sampleRate * 0.05);
    debut = Math.max(0, debut - marge);
    fin = Math.min(canal.length - 1, fin + marge);
    const n = fin - debut + 1;
    const vue = new DataView(new ArrayBuffer(44 + n * 2));
    const ecrire = (o, t) => [...t].forEach((c, i) => vue.setUint8(o + i, c.charCodeAt(0)));
    ecrire(0, "RIFF");
    vue.setUint32(4, 36 + n * 2, true);
    ecrire(8, "WAVE");
    ecrire(12, "fmt ");
    vue.setUint32(16, 16, true);
    vue.setUint16(20, 1, true);
    vue.setUint16(22, 1, true);
    vue.setUint32(24, buffer.sampleRate, true);
    vue.setUint32(28, buffer.sampleRate * 2, true);
    vue.setUint16(32, 2, true);
    vue.setUint16(34, 16, true);
    ecrire(36, "data");
    vue.setUint32(40, n * 2, true);
    let max = 0;
    for (let i = debut; i <= fin; i++) max = Math.max(max, Math.abs(canal[i]));
    const gain = max > 0 ? Math.min(4, 0.9 / max) : 1;
    for (let i = 0; i < n; i++) {
      const v = Math.max(-1, Math.min(1, canal[debut + i] * gain));
      vue.setInt16(44 + i * 2, v < 0 ? v * 0x8000 : v * 0x7fff, true);
    }
    return new Blob([vue], { type: "audio/wav" });
  }

  async function versWav(blob) {
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    const brut = await ctx.decodeAudioData(await blob.arrayBuffer());
    // mono, 22 050 Hz : léger et suffisant pour un miaou
    const hors = new OfflineAudioContext(1, Math.ceil(brut.duration * 22050), 22050);
    const src = hors.createBufferSource();
    src.buffer = brut;
    src.connect(hors.destination);
    src.start();
    const rendu = await hors.startRendering();
    ctx.close();
    return enWav(rendu);
  }

  const enDataURL = (blob) => new Promise((ok) => {
    const f = new FileReader();
    f.onload = () => ok(f.result);
    f.readAsDataURL(blob);
  });

  function blocMiaou() {
    const etat = H.el("p.discret");
    const majEtat = () => {
      etat.textContent = H.jeu.cri ? "Cri actuel : ton enregistrement." : "Cri actuel : le miaou d’origine.";
    };
    majEtat();
    const msg = H.el("p.discret", { role: "status" });
    const apercu = H.el("div.pastilles", { hidden: true });
    let enregistreur = null, nouveau = null;

    const boutonEnreg = H.el("button.bouton.petit", {
      type: "button",
      async onclick() {
        if (enregistreur) return enregistreur.stop();
        if (!navigator.mediaDevices || !window.MediaRecorder) {
          msg.textContent = "Ce navigateur ne sait pas enregistrer le son.";
          return;
        }
        let flux;
        try {
          flux = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          msg.textContent = "Le micro n’est pas autorisé.";
          return;
        }
        const morceaux = [];
        enregistreur = new MediaRecorder(flux);
        enregistreur.ondataavailable = (e) => e.data.size && morceaux.push(e.data);
        enregistreur.onstop = async () => {
          flux.getTracks().forEach((t) => t.stop());
          enregistreur = null;
          boutonEnreg.textContent = "Enregistrer un miaou";
          boutonEnreg.classList.remove("actif");
          msg.textContent = "Préparation…";
          try {
            nouveau = await enDataURL(await versWav(new Blob(morceaux, { type: morceaux[0] ? morceaux[0].type : "audio/webm" })));
            msg.textContent = "Écoute ton miaou, puis garde-le s’il te plaît.";
            apercu.hidden = false;
          } catch (e) {
            msg.textContent = "Impossible de lire l’enregistrement.";
          }
        };
        enregistreur.start();
        boutonEnreg.textContent = "Arrêter";
        boutonEnreg.classList.add("actif");
        msg.textContent = "Miaule ! (l’enregistrement s’arrête tout seul après 4 secondes)";
        setTimeout(() => enregistreur && enregistreur.state === "recording" && enregistreur.stop(), 4000);
      },
    }, "Enregistrer un miaou");

    apercu.append(
      H.el("button.bouton.petit", { type: "button", onclick: () => nouveau && H.sons.jouerUrl(nouveau, 0.6) }, "Écouter"),
      H.el("button.bouton.petit.actif", {
        type: "button",
        onclick() {
          H.jeu.cri = nouveau;
          H.d.changer("jeu");
          apercu.hidden = true;
          msg.textContent = "C’est ce miaou qui appellera Mesi.";
          majEtat();
        },
      }, "Garder ce miaou")
    );

    return H.el("section.reglage", null,
      H.el("h2", null, "Le miaou pour appeler Mesi"),
      etat,
      H.el("div.pastilles", null,
        H.el("button.bouton.petit", { type: "button", onclick: () => H.jouerCri() }, "Écouter le cri actuel"),
        boutonEnreg,
        H.jeu.cri ? H.el("button.bouton.petit", { type: "button", onclick: () => H.telecharger("miaou.wav", H.chiffre.deB64(H.jeu.cri.split(",")[1]), "audio/wav") }, "Télécharger ce miaou") : null,
        H.jeu.cri ? H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { delete H.jeu.cri; H.d.changer("jeu"); H.router(); } }, "Revenir au cri d’origine") : null
      ),
      apercu,
      msg
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

  // l'appareil de Mesi (selon son jeton) : les textes du jeu et la gestion des accès
  function blocAcces() {
    if (H.local.role !== "mesi") return null;
    const liste = H.el("ul.liste-acces", null, H.el("li.discret", null, "Chargement…"));
    const msg = H.el("p.discret");
    const NOMS_ROLES = { ovo: "la partie d’ƟvƟ", mesi: "appareil de Mesi", testeur: "partie d’essai à part" };
    async function charger() {
      try {
        const acces = await H.synchro.listeAcces();
        liste.innerHTML = "";
        for (const u of acces) {
          liste.appendChild(H.el("li", null,
            H.el("strong", null, u.nom), " · " + (NOMS_ROLES[u.role] || u.role) + (u.empreinte === H.local.empreinte ? " (cet appareil)" : ""),
            u.empreinte !== H.local.empreinte ? H.el("button.bouton.petit.discret-bouton", {
              type: "button",
              async onclick() {
                if (!confirm("Retirer l’accès de « " + u.nom + " » ? Son jeton ne pourra plus synchroniser.")) return;
                const r = await H.synchro.retirerAcces(u.empreinte).catch((e) => ({ ok: false, message: e.message }));
                msg.textContent = r.ok ? "Accès retiré." : r.message;
                charger();
              },
            }, "Retirer") : null));
        }
      } catch (e) {
        liste.innerHTML = "";
        liste.appendChild(H.el("li.discret", null, "Impossible de lire la liste des accès (" + e.message + ")."));
      }
    }
    charger();
    const jeton = H.el("input", { type: "password", placeholder: "github_pat_…", autocomplete: "off", "aria-label": "Nouveau jeton" });
    const nom = H.el("input", { type: "text", placeholder: "Nom (ƟvƟ, Vénus…)", "aria-label": "Nom" });
    const sonRole = H.el("select", { "aria-label": "Rôle" },
      H.el("option", { value: "ovo" }, "la partie d’ƟvƟ"),
      H.el("option", { value: "testeur" }, "partie d’essai à part (invisible pour ƟvƟ)"),
      H.el("option", { value: "mesi" }, "appareil de Mesi"));
    // le monde à ouvrir sur cet appareil : on enregistre et on synchronise la partie en cours, puis on recharge
    const choixMonde = (id, nom) => H.el("button.bouton.petit" + ((H.monde || "ovo") === id ? ".actif" : ""), {
      type: "button",
      "aria-pressed": String((H.monde || "ovo") === id),
      async onclick(e) {
        if ((H.monde || "ovo") === id) return;
        e.target.textContent = "Un instant…";
        await H.d.enregistrerMaintenant();
        if (H.local.jeton) await H.synchro.lancer().catch(() => {});
        await H.d.majLocal((l) => (l.monde = id));
        location.reload();
      },
    }, nom);
    return H.el("section.reglage", null,
      H.el("h2", null, "Mesi"),
      H.el("h3", null, "Quel monde ?"),
      H.el("p.discret", null, "Jusqu’à Noël, tu peux tester le monde d’ƟvƟ, ou jouer dans ton monde à toi : la pharmacopée chinoise, tes propres îles, et des formules au lieu des tisanes. Les deux mondes restent séparés, chacun avec sa sauvegarde."),
      H.el("p.pastilles", null, choixMonde("ovo", "Le monde d’ƟvƟ"), choixMonde("mesi", "Mon monde")),
      H.el("p.discret", null, "Cet appareil est relié avec le jeton de Mesi : ta partie (herbier, îles, ferme…) se retrouve sur tous tes appareils, à part de celle d’ƟvƟ. Avec ƟvƟ, seules les lettres et les textes du jeu s’échangent."),
      H.el("p", null, H.el("a.bouton.petit", { href: "#textes" }, "Relire et corriger les textes du jeu"), " ", H.el("a.bouton.petit", { href: "#lettres" }, "Boîte aux lettres")),
      H.el("label.case", null,
        H.el("input", {
          type: "checkbox",
          checked: !!H.local.apercuIleSecrete,
          onchange: async (e) => {
            const oui = e.target.checked;
            await H.d.majLocal((l) => {
              if (oui) l.apercuIleSecrete = true;
              else delete l.apercuIleSecrete;
            });
          },
        }),
        " Voir dès maintenant l’île de Lóló et Mémé sur cet appareil (la surprise du 24 février)."),
      H.el("h3", null, "Les accès"),
      H.el("p.discret", null, "Chaque personne reçoit son propre jeton à accès fin (sur github.com : Settings, Developer settings, Fine-grained tokens, limité au dépôt herbovotheque, « Contents » en lecture et écriture). Ajoute-le ici avec son rôle avant de le donner. Seule son empreinte est gardée, chiffrée."),
      liste,
      H.el("form.form-acces", {
        async onsubmit(e) {
          e.preventDefault();
          if (!jeton.value.trim() || !nom.value.trim()) return (msg.textContent = "Il faut le jeton et un nom.");
          msg.textContent = "Ajout…";
          const r = await H.synchro.ajouterAcces(jeton.value.trim(), nom.value.trim(), sonRole.value).catch((err) => ({ ok: false, message: err.message }));
          msg.textContent = r.ok ? "Accès ajouté. Tu peux donner ce jeton." : r.message;
          if (r.ok) {
            jeton.value = "";
            nom.value = "";
            charger();
          }
        },
      }, nom, sonRole, jeton, H.el("button.bouton.petit", { type: "submit" }, "Ajouter")),
      msg
    );
  }

  H.vues.reglages = {
    afficher(c) {
      c.appendChild(H.el("h1", null, "Réglages"));
      // comme les préférences d'un vieux Mac : la liste des sections à gauche
      const blocs = [blocLieu(), blocTheme(), blocMiaou(), blocSynchro(), blocSauvegarde(), blocAcces()].filter(Boolean);
      c.appendChild(H.bureau.onglets(blocs.map((b) => ({ nom: b.querySelector("h2").textContent, el: b })), { cle: "reglages", lateral: true }));
      c.appendChild(H.el("p.discret.version", null, "Herbothèque v" + H.VERSION));
    },
  };
  H.VERSION = "1.0";
})();
