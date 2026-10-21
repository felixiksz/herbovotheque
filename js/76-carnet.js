// Le carnet : des pages libres (notes de chantier, visites, idées…), rangées en sous-pages, écrites
// par blocs (titres, listes, cases à cocher, citations, encadrés, parties dépliables, séparateurs,
// images, tableaux, deux colonnes). On y relie tout avec [[un nom]] (une page, une plante, un jardin,
// un client) et des #étiquettes, retrouvées partout dans le jeu ; chaque page sait où elle est citée.
// Des modèles de page, des favoris et des pages récentes, une recherche dans tout le jeu, la corbeille
// et l'historique des versions. Gardé dans la partie (H.jeu.pages, H.jeu.favoris), synchronisé ;
// les versions restent sur l'appareil.
(function () {
  const H = window.H;
  const MINUTE = 6e4;

  // --- les données --------------------------------------------------------------------------
  const toutes = () => Object.values(H.jeu.pages || {}).filter((p) => p && !p.supprime && !p.modele);
  const page = (id) => { const p = (H.jeu.pages || {})[id]; return p && !p.vide ? p : null; };
  const uid = (x) => H.uid(x || "b");
  const bloc = (type, texte, plus) => Object.assign({ id: uid(), type, texte: texte || "" }, plus);
  function garder(p, sansVersion) {
    p.modifieLe = H.maintenant();
    H.jeu.pages = Object.assign({}, H.jeu.pages, { [p.id]: p });
    H.d.changer("jeu");
    if (!sansVersion) noterVersion(p);
  }
  // l'historique : une copie de la page toutes les deux minutes au plus, trente au plus, sur l'appareil
  const dernieresVersions = {};
  async function noterVersion(p) {
    const t = H.maintenant();
    if (t - (dernieresVersions[p.id] || 0) < 2 * MINUTE) return;
    dernieresVersions[p.id] = t;
    const liste = (await H.kv.lire("versions:" + p.id).catch(() => null)) || [];
    liste.unshift({ le: t, titre: p.titre, blocs: JSON.parse(JSON.stringify(p.blocs || [])) });
    await H.kv.ecrire("versions:" + p.id, liste.slice(0, 30)).catch(() => {});
  }
  function nouvellePage(titre, parent, blocs) {
    const t = H.maintenant();
    const p = { id: uid("page"), titre: titre || "", parent: parent || null, blocs: blocs || [bloc("p", "")], etiquettes: [], creeLe: t, modifieLe: t };
    garder(p, true);
    return p;
  }
  const enfants = (id) => toutes().filter((p) => (p.parent || null) === (id || null)).sort((a, b) => (a.ordre || a.creeLe) - (b.ordre || b.creeLe));
  const chemin = (p) => { const c = []; let q = p; while (q && q.parent && c.length < 20) { q = page(q.parent); if (q && !q.supprime) c.unshift(q); else break; } return c; };
  const texteDe = (p) => [p.titre].concat((p.blocs || []).flatMap((b) => [b.texte, b.contenu, b.gauche, b.droite, b.legende].concat((b.lignes || []).flat(), (b.cellules || []).flat())),
    (p.relations || []).map((r) => "[[" + r + "]]"), (p.commentaires || []).filter((c) => !c.supprime).map((c) => c.texte)).filter(Boolean).join("\n");

  // --- les noms reliés : [[un nom]] ----------------------------------------------------------
  const norme = (t) => H.sansAccents(String(t || "").trim());
  function cible(nom) {
    const n = norme(nom);
    if (!n) return null;
    const pg = toutes().find((p) => norme(p.titre) === n);
    if (pg) return { type: "page", nom: pg.titre, hash: "carnet/" + pg.id };
    const pl = H.d.plantes().find((p) => norme(p.nom) === n || norme(p.latin).split(",")[0] === n);
    if (pl) return { type: "plante", nom: pl.nom, hash: "fiche/" + encodeURIComponent(pl.id) };
    const ile = H.ilesVisibles().find((i) => norme(i.nom) === n);
    if (ile) return { type: "jardin", nom: ile.nom, hash: "terrain/" + encodeURIComponent(ile.id) };
    const cl = Object.values(H.jeu.clients || {}).find((c) => c && !c.supprime && norme(c.nom) === n);
    if (cl) return { type: "client", nom: cl.nom, hash: "devis" };
    return null;
  }
  // tout ce qu'on peut relier, pour la liste qui s'ouvre après [[
  function nomsReliables() {
    return [].concat(
      toutes().filter((p) => p.titre).map((p) => ({ nom: p.titre, type: "page" })),
      H.d.plantes().map((p) => ({ nom: p.nom, type: "plante" })),
      H.ilesVisibles().map((i) => ({ nom: i.nom, type: "jardin" })),
      Object.values(H.jeu.clients || {}).filter((c) => c && !c.supprime).map((c) => ({ nom: c.nom, type: "client" })));
  }
  // les textes de tout le jeu où l'on peut citer quelque chose : [{ titre, hash, texte }]
  function sourcesDuJeu() {
    const s = toutes().map((p) => ({ titre: p.titre || "Sans titre", hash: "carnet/" + p.id, texte: texteDe(p), type: "Page" }));
    for (const t of Object.values(H.jeu.taches || {})) if (t && !t.supprime) s.push({ titre: t.titre, hash: "taches", texte: [t.titre, t.notes].join("\n"), type: "Tâche" });
    for (const d of Object.values(H.jeu.documents || {})) if (d && !d.supprime) s.push({ titre: (d.type === "devis" ? "Devis " : "Facture ") + d.numero, hash: "devis", texte: [d.objet, d.notes].concat((d.lignes || []).map((l) => l.designation)).join("\n"), type: d.type === "devis" ? "Devis" : "Facture" });
    for (const p of H.d.plantes()) { const t = Object.values(p.valeurs || {}).filter((v) => typeof v === "string").join("\n"); if (/\[\[|#/.test(t)) s.push({ titre: p.nom, hash: "fiche/" + encodeURIComponent(p.id), texte: t, type: "Fiche" }); }
    return s;
  }
  // où un nom est cité ([[nom]]) ; et, pour une plante, les jardins où elle pousse
  function citations(nom) {
    const n = norme(nom), re = /\[\[([^\]]+)\]\]/g, out = [];
    for (const src of sourcesDuJeu()) {
      let m, trouve = false;
      while ((m = re.exec(src.texte))) if (norme(m[1]) === n) trouve = true;
      if (trouve && norme(src.titre) !== n) out.push(src);
    }
    return out;
  }
  // les #étiquettes : dans les textes du jeu et sur les pages
  const RE_ETIQ = /(^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu;
  function etiquettesDe(texte) { const out = []; let m; RE_ETIQ.lastIndex = 0; while ((m = RE_ETIQ.exec(texte || ""))) out.push(m[2].toLowerCase()); return out; }
  function indexEtiquettes() {
    const idx = {};
    const ajouter = (e, src) => { (idx[e] = idx[e] || []); if (!idx[e].some((x) => x.hash === src.hash && x.titre === src.titre)) idx[e].push(src); };
    for (const src of sourcesDuJeu()) for (const e of etiquettesDe(src.texte)) ajouter(e, src);
    for (const p of toutes()) for (const e of p.etiquettes || []) ajouter(e.toLowerCase(), { titre: p.titre || "Sans titre", hash: "carnet/" + p.id, type: "Page" });
    return idx;
  }

  // --- le texte affiché : **gras**, *italique*, ~~barré~~, `code`, [[liens]], #étiquettes, adresses
  function rendre(texte) {
    let h = H.echap(texte || "");
    h = h.replace(/\[\[([^\]]+)\]\]/g, (m, nom) => {
      const c = cible(nom.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
      return c ? '<a class="lien-carnet lien-' + c.type + '" href="#' + c.hash + '">' + nom + "</a>" : '<a class="lien-carnet lien-absent" data-creer="' + nom + '" href="#carnet">' + nom + "</a>";
    });
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*]+?)\*/g, "$1<em>$2</em>").replace(/~~(.+?)~~/g, "<s>$1</s>").replace(/`(.+?)`/g, "<code>$1</code>");
    h = h.replace(/(^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_-]*)/gu, (m, a, e) => a + '<a class="etiquette-carnet" href="#carnet/etiquette/' + encodeURIComponent(e.toLowerCase()) + '">#' + e + "</a>");
    h = h.replace(/(^|\s)(https?:\/\/[^\s<]+)/g, '$1<a href="$2" target="_blank" rel="noopener">$2</a>');
    return h.replace(/\n/g, "<br>");
  }

  // --- les blocs ------------------------------------------------------------------------------
  const TYPES = [
    ["p", "Texte", ""], ["h1", "Grand titre", "# "], ["h2", "Titre", "## "], ["h3", "Petit titre", "### "],
    ["puce", "Liste à puces", "- "], ["num", "Liste numérotée", "1. "], ["todo", "Case à cocher", "[] "],
    ["citation", "Citation", "> "], ["encadre", "Encadré", "!> "], ["toggle", "Partie dépliable", ">> "],
    ["separateur", "Séparateur", "---"], ["image", "Image", ""], ["tableau", "Tableau", ""], ["feuille", "Feuille de calcul", ""], ["colonnes", "Deux colonnes", ""],
    ["vue", "Vue des pages", ""],
  ];
  // les propriétés d'une page : une date, un statut, et des relations (« Liée à »)
  const STATUTS = ["", "À faire", "En cours", "Fait"];
  const DISPOSITIONS = [["liste", "Liste"], ["tableau", "Tableau"], ["galerie", "Galerie"], ["calendrier", "Calendrier"]];
  const dateCourte = (d) => (d ? new Date(d + "T12:00").toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "");
  // les pages que montre une vue : les sous-pages de la page, celles d'une étiquette, ou toutes
  function pagesDeVue(b, p) {
    const src = b.source || "sous-pages";
    let liste = src === "toutes" ? toutes() : src.startsWith("etiquette:") ? toutes().filter((q) => (q.etiquettes || []).includes(src.slice(10))) : enfants(p.id);
    return liste.filter((q) => q.id !== p.id).sort((a, c) => (a.date || "").localeCompare(c.date || "") || (c.modifieLe || 0) - (a.modifieLe || 0));
  }
  // l'aperçu d'une page dans une galerie : sa première image, ou ses premiers mots
  const apercuPage = (q) => { const im = (q.blocs || []).find((x) => x.type === "image" && x.src); if (im) return H.el("img", { src: im.src, alt: "" }); const t = (q.blocs || []).map((x) => x.texte || "").join(" ").trim(); return H.el("p.discret", null, t.slice(0, 110) + (t.length > 110 ? "…" : "")); };
  function vuePages(b, p, changer) {
    const zone = H.el("div.vue-pages");
    const dessinerVue = () => {
      const liste = pagesDeVue(b, p), dispo = b.disposition || "liste", lien = (q) => H.el("a", { href: "#carnet/" + q.id }, q.titre || "Sans titre");
      const etiqs = Object.keys(indexEtiquettes());
      const choixSource = H.el("select", { onchange: (e) => { b.source = e.target.value; changer(); dessinerVue(); } },
        H.el("option", { value: "sous-pages", selected: (b.source || "sous-pages") === "sous-pages" }, "Les sous-pages de cette page"),
        H.el("option", { value: "toutes", selected: b.source === "toutes" }, "Toutes les pages"),
        ...etiqs.map((e) => H.el("option", { value: "etiquette:" + e, selected: b.source === "etiquette:" + e }, "Les pages #" + e)));
      const choixDispo = H.el("div.pastilles", null, ...DISPOSITIONS.map(([id, nom]) => H.el("button.bouton.petit" + (dispo === id ? ".actif" : ""), { type: "button", onclick: () => { b.disposition = id; changer(); dessinerVue(); } }, nom)));
      let corps;
      if (!liste.length) corps = H.el("p.discret", null, "Pas encore de page ici.");
      else if (dispo === "tableau") corps = H.el("table.tableau-carnet.tableau-vue", null,
        H.el("tr", null, ["Page", "Statut", "Date", "Étiquettes", "Modifiée"].map((t) => H.el("th", null, t))),
        ...liste.map((q) => H.el("tr", null, H.el("td", null, lien(q)), H.el("td", null, q.statut || ""), H.el("td", null, dateCourte(q.date)),
          H.el("td", null, (q.etiquettes || []).map((e) => "#" + e).join(" ")), H.el("td", null, new Date(q.modifieLe || q.creeLe).toLocaleDateString("fr-FR")))));
      else if (dispo === "galerie") corps = H.el("div.galerie-vue", null, ...liste.map((q) => H.el("a.carte-vue", { href: "#carnet/" + q.id }, apercuPage(q), H.el("b", null, q.titre || "Sans titre"), q.statut ? H.el("span.discret", null, q.statut) : null)));
      else if (dispo === "calendrier") {
        // un mois : les pages à leur date (ou, sans date, au jour de leur création)
        const base = b.mois ? new Date(b.mois + "-01T12:00") : new Date(), an = base.getFullYear(), mo = base.getMonth();
        const premier = (new Date(an, mo, 1).getDay() + 6) % 7, jours = new Date(an, mo + 1, 0).getDate();
        const parJour = {};
        for (const q of liste) { const d = q.date || new Date(q.creeLe || q.modifieLe).toISOString().slice(0, 10); const [y, m, j] = d.split("-").map(Number); if (y === an && m === mo + 1) (parJour[j] = parJour[j] || []).push(q); }
        const decaler = (n) => { const d = new Date(an, mo + n, 1); b.mois = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"); changer(); dessinerVue(); };
        const cases = [];
        for (let k = 0; k < premier; k++) cases.push(H.el("div.jour-vue.vide"));
        for (let j = 1; j <= jours; j++) cases.push(H.el("div.jour-vue", null, H.el("span.num-jour", null, String(j)), ...(parJour[j] || []).map(lien)));
        corps = H.el("div.calendrier-vue", null,
          H.el("div.tete-calendrier", null, H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => decaler(-1) }, "‹"),
            H.el("b", null, base.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })), H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => decaler(1) }, "›")),
          H.el("div.grille-calendrier", null, ...["lun", "mar", "mer", "jeu", "ven", "sam", "dim"].map((d) => H.el("div.nom-jour", null, d)), ...cases));
      } else corps = H.el("ul.liste-vue", null, ...liste.map((q) => H.el("li", null, lien(q), q.statut ? H.el("span.discret", null, " · " + q.statut) : null, q.date ? H.el("span.discret", null, " · " + dateCourte(q.date)) : null)));
      zone.replaceChildren(H.el("div.reglages-vue", null, choixSource, choixDispo), corps);
    };
    dessinerVue();
    return zone;
  }
  const TEXTUELS = new Set(["p", "h1", "h2", "h3", "puce", "num", "todo", "citation", "encadre", "toggle"]);
  const COULEURS_ENCADRE = ["#fff3c4", "#dcefd6", "#d8e6fb", "#f7dde6", "#efe3d3"];

  let conteneur = null, actuelle = null, aEnregistrer = null, minuteur = null, menuOuvert = null;
  function planifier(p) { aEnregistrer = p; clearTimeout(minuteur); minuteur = setTimeout(() => { if (aEnregistrer) garder(aEnregistrer); aEnregistrer = null; }, 600); }
  function fermerMenu() { if (menuOuvert) menuOuvert.remove(); menuOuvert = null; }
  document.addEventListener("pointerdown", (e) => { if (menuOuvert && !menuOuvert.contains(e.target)) fermerMenu(); });

  // le curseur dans un bloc de texte simple
  function curseur(el) {
    const s = getSelection();
    if (!s.rangeCount || !el.contains(s.anchorNode)) return el.textContent.length;
    const r = s.getRangeAt(0).cloneRange(); r.selectNodeContents(el); r.setEnd(s.anchorNode, s.anchorOffset);
    return r.toString().length;
  }
  function placer(el, pos) {
    el.focus();
    const t = el.firstChild;
    const r = document.createRange();
    if (!t) { r.setStart(el, 0); } else { const n = Math.max(0, Math.min(pos == null ? t.textContent.length : pos, t.textContent.length)); r.setStart(t, n); }
    r.collapse(true);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  }
  // un morceau de texte modifiable : brut quand on l'écrit, mis en forme quand on le lit
  function editable(cls, valeur, opts) {
    const el = H.el("div." + cls, { contenteditable: "true", spellcheck: "true", "data-vide": opts.vide || "" });
    el.setAttribute("contenteditable", "plaintext-only");
    if (el.contentEditable !== "plaintext-only") el.setAttribute("contenteditable", "true");
    const montrer = () => { el.innerHTML = rendre(valeur()); el.classList.toggle("vide", !valeur()); };
    montrer();
    el.addEventListener("focus", () => {
      const avait = getSelection().rangeCount && el.contains(getSelection().anchorNode) ? curseur(el) : null;
      el.textContent = valeur(); el.classList.remove("vide");
      // (un texte vide n'a pas de curseur tant qu'on ne l'y pose pas : sinon on ne peut rien y écrire)
      placer(el, avait);
      if (opts.focus) opts.focus();
    });
    // (un bloc retiré pendant qu'on l'écrit perd le focus : il ne doit pas remettre son ancien texte)
    el.addEventListener("blur", () => { if (el.dataset.retire) return; opts.changer(el.innerText.replace(/ /g, " ").replace(/\n$/, "")); montrer(); setTimeout(() => { if (!document.activeElement || !document.activeElement.closest(".menu-carnet")) fermerMenu(); }, 150); });
    el.addEventListener("input", () => { opts.changer(el.innerText.replace(/ /g, " ").replace(/\n$/, ""), true); if (opts.saisie) opts.saisie(el); });
    el.addEventListener("mousedown", (e) => { if (document.activeElement !== el && e.target.closest("a")) { e.preventDefault(); const a = e.target.closest("a"); if (a.dataset.creer) { const p = nouvellePage(a.dataset.creer, actuelle && actuelle.id); H.aller("carnet/" + p.id); } else if (a.target === "_blank") window.open(a.href, "_blank", "noopener"); else location.hash = a.getAttribute("href"); } });
    if (opts.touche) el.addEventListener("keydown", (e) => opts.touche(e, el));
    el.montrer = montrer;
    return el;
  }

  // la petite liste qui s'ouvre sous le curseur (commandes « / », liens « [[ »)
  function menuSous(el, items, choisir) {
    fermerMenu();
    if (!items.length) return;
    const r = el.getBoundingClientRect();
    let actif = 0;
    const m = H.el("div.menu-carnet", { role: "listbox" });
    const dessiner = () => m.replaceChildren(...items.slice(0, 9).map((it, i) => H.el("button.item-menu-carnet" + (i === actif ? ".actif" : ""), { type: "button", onmousedown: (e) => { e.preventDefault(); choisir(it); fermerMenu(); } }, H.el("span", null, it.libelle), it.aide ? H.el("span.discret", null, it.aide) : null)));
    dessiner();
    Object.assign(m.style, { left: Math.round(r.left + window.scrollX) + "px", top: Math.round(r.bottom + window.scrollY + 4) + "px" });
    document.body.appendChild(m);
    menuOuvert = m;
    m.clavier = (e) => {
      if (e.key === "ArrowDown") { actif = Math.min(Math.min(items.length, 9) - 1, actif + 1); dessiner(); return true; }
      if (e.key === "ArrowUp") { actif = Math.max(0, actif - 1); dessiner(); return true; }
      if (e.key === "Enter" || e.key === "Tab") { choisir(items[actif]); fermerMenu(); return true; }
      if (e.key === "Escape") { fermerMenu(); return true; }
      return false;
    };
  }

  // --- la feuille de calcul : des cases comme dans Excel, avec des formules (=SOMME(B2:B5)…), le
  // tri et le filtre par colonne, et l'import ou l'export d'un vrai fichier Excel ----------------
  function feuilleDeCalcul(b, changer, p) {
    const T = H.tableur;
    b.cellules = b.cellules || [["", "", ""], ["", "", ""], ["", "", ""]];
    let colChoisie = 0, enEdition = null;
    const table = H.el("table.feuille-carnet"), infos = H.el("div.infos-feuille");
    const larg = () => Math.max(1, ...b.cellules.map((r) => r.length));
    const egaliser = () => { const n = larg(); b.cellules.forEach((r) => { while (r.length < n) r.push(""); }); };
    function dessiner() {
      egaliser();
      const valeurs = T.calculer(b.cellules), n = larg(), f = b.filtre;
      const garde = (l) => !f || l === 0 && b.entete || String(T.afficher(valeurs[l][f.c])).toLowerCase().includes(f.texte.toLowerCase());
      table.replaceChildren(
        H.el("tr.lettres-feuille", null, H.el("th.coin-feuille"), Array.from({ length: n }, (_, c) => H.el("th" + (c === colChoisie ? ".choisie" : ""), { title: "Choisir la colonne " + T.lettres(c) + " (pour trier ou filtrer)", onclick: () => { colChoisie = c; dessiner(); } }, T.lettres(c)))),
        ...b.cellules.map((rang, l) => garde(l) ? H.el("tr" + (l === 0 && b.entete ? ".entete-feuille" : ""), null, H.el("th.numero-feuille", null, String(l + 1)),
          rang.map((brut, c) => {
            const v = valeurs[l][c], estNombre = typeof v === "number", erreur = typeof v === "string" && /^#/.test(v);
            const inp = H.el("input.case-feuille" + (estNombre ? ".nombre" : "") + (erreur ? ".erreur" : "") + (String(brut).startsWith("=") ? ".formule" : ""), {
              value: enEdition === l + "," + c ? brut : T.afficher(v), "aria-label": T.nomCase(c, l), title: String(brut).startsWith("=") ? T.nomCase(c, l) + " : " + brut : T.nomCase(c, l),
              onfocus: (e) => { enEdition = l + "," + c; colChoisie = c; e.target.value = b.cellules[l][c]; table.querySelectorAll(".lettres-feuille th").forEach((th, k) => th.classList.toggle("choisie", k === c + 1)); infos.textContent = T.nomCase(c, l) + (String(b.cellules[l][c]).startsWith("=") ? " : " + b.cellules[l][c] : ""); },
              oninput: (e) => { b.cellules[l][c] = e.target.value; changer(); },
              onblur: () => { enEdition = null; setTimeout(() => { if (!table.contains(document.activeElement)) dessiner(); else rafraichir(); }, 0); },
              onkeydown: (e) => {
                const aller = (dl, dc) => { const cible = table.querySelector('[aria-label="' + T.nomCase(c + dc, l + dl) + '"]'); if (cible) { e.preventDefault(); cible.focus(); cible.select(); } };
                if (e.key === "Enter" || e.key === "ArrowDown") aller(1, 0);
                else if (e.key === "ArrowUp") aller(-1, 0);
                else if (e.key === "Escape") e.target.blur();
              },
            });
            return H.el("td", null, inp);
          })) : null).filter(Boolean));
    }
    // (pendant qu'on tape, les autres cases se recalculent sans perdre la case en cours)
    function rafraichir() {
      const valeurs = T.calculer(b.cellules);
      table.querySelectorAll("input.case-feuille").forEach((inp) => {
        const m = /^([A-Z]+)(\d+)$/.exec(inp.getAttribute("aria-label")), c = T.colonne(m[1]), l = parseInt(m[2], 10) - 1;
        if (enEdition === l + "," + c) return;
        const v = valeurs[l][c];
        inp.value = T.afficher(v);
        inp.classList.toggle("nombre", typeof v === "number");
        inp.classList.toggle("erreur", typeof v === "string" && /^#/.test(v));
      });
    }
    table.addEventListener("input", () => setTimeout(rafraichir, 0));
    const bouton = (texte, titre, faire) => H.el("button.bouton-crayon", { type: "button", title: titre, onclick: () => { faire(); changer(); dessiner(); outils(); } }, texte);
    const trier = (sens) => {
      const tete = b.entete ? b.cellules.slice(0, 1) : [], corps = b.entete ? b.cellules.slice(1) : b.cellules.slice();
      const valeurs = T.calculer(b.cellules), dec = b.entete ? 1 : 0, cle = new Map(corps.map((r, i) => [r, valeurs[i + dec][colChoisie]]));
      corps.sort((x, y) => { const a = cle.get(x), c = cle.get(y); if (a === "" && c !== "") return 1; if (c === "" && a !== "") return -1; return (typeof a === "number" && typeof c === "number" ? a - c : String(a).localeCompare(String(c), "fr", { numeric: true })) * sens; });
      b.cellules = tete.concat(corps);
    };
    const filtrer = async () => {
      if (b.filtre) { b.filtre = null; changer(); dessiner(); outils(); return; }
      const champ = H.el("input", { type: "text", placeholder: "ce que la case doit contenir" });
      const corps = H.el("form.formulaire", { onsubmit: (e) => { e.preventDefault(); if (champ.value.trim()) { b.filtre = { c: colChoisie, texte: champ.value.trim() }; changer(); dessiner(); outils(); } fermer(); } },
        H.el("h2", null, "Filtrer la colonne " + T.lettres(colChoisie)),
        H.el("label", null, "Ne garder que les lignes dont la case contient ", champ),
        H.el("div.boutons-bas", null, H.el("button.bouton", { type: "submit" }, "Filtrer")));
      const fermer = H.fenetre(corps, { classe: "petite" });
      setTimeout(() => champ.focus(), 0);
    };
    const importer = () => {
      const inp = H.el("input", { type: "file", accept: ".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      inp.onchange = async () => {
        const f = inp.files[0];
        if (!f) return;
        try {
          const lignes = /\.csv$/i.test(f.name) ? T.lireCsv(await f.text()) : ((await T.lireXlsx(await f.arrayBuffer()))[0] || {}).lignes;
          if (!lignes || !lignes.length) return H.toast("Ce fichier est vide");
          if (b.cellules.some((r) => r.some((x) => x !== "")) && !(await H.confirmer("Remplacer le contenu de cette feuille par « " + f.name + " » ?"))) return;
          b.cellules = lignes.map((r) => r.map((x) => String(x == null ? "" : x)));
          b.filtre = null;
          changer(); dessiner(); outils();
          H.toast("« " + f.name + " » importé");
        } catch (e) { console.warn(e); H.toast("Ce fichier ne s’ouvre pas"); }
      };
      inp.click();
    };
    const exporter = () => H.telecharger(H.slug((p && p.titre) || "feuille") + ".xlsx", T.ecrireXlsx([{ nom: (p && p.titre) || "Feuille", lignes: b.cellules, titres: !!b.entete }]), T.TYPE_XLSX);
    const aide = () => H.fenetre(H.el("div.aide-feuille", null, H.el("h2", null, "Les formules"),
      H.el("p", null, "Une formule commence par « = ». Elle peut utiliser les autres cases par leur nom (la lettre de la colonne, puis le numéro de la ligne : B2), et une plage de cases avec deux points (B2:B10)."),
      H.el("ul", null,
        H.el("li", null, "=B2+B3, =B2*C2, =B2/4, =B2^2 : les opérations"),
        H.el("li", null, "=SOMME(B2:B10) : le total ; =MOYENNE(B2:B10), =MIN(…), =MAX(…)"),
        H.el("li", null, "=NB(B2:B10) : combien de nombres ; =NBVAL(…) : combien de cases remplies"),
        H.el("li", null, "=ARRONDI(B2/3;2) : arrondi à 2 chiffres après la virgule"),
        H.el("li", null, "=SI(B2>10;\"beaucoup\";\"peu\") : selon une condition"),
        H.el("li", null, "=A2&\" \"&B2 : coller deux textes")),
      H.el("p.discret", null, "Les arguments se séparent par un point-virgule, comme dans Excel en français. Dans un fichier Excel exporté, les formules sont gardées.")), { classe: "petite" });
    const barre = H.el("div.pastilles.outils-feuille");
    function outils() {
      barre.replaceChildren(
        bouton("+ ligne", "Ajouter une ligne", () => b.cellules.push(Array.from({ length: larg() }, () => ""))),
        bouton("+ colonne", "Ajouter une colonne", () => b.cellules.forEach((r) => r.push(""))),
        b.cellules.length > 1 ? bouton("− ligne", "Retirer la dernière ligne", () => b.cellules.pop()) : null,
        larg() > 1 ? bouton("− colonne", "Retirer la dernière colonne", () => b.cellules.forEach((r) => r.pop())) : null,
        bouton("Trier ↑", "Trier selon la colonne choisie, du plus petit au plus grand", () => trier(1)),
        bouton("Trier ↓", "Trier selon la colonne choisie, du plus grand au plus petit", () => trier(-1)),
        H.el("button.bouton-crayon" + (b.filtre ? ".actif" : ""), { type: "button", title: "Ne garder que certaines lignes", onclick: filtrer }, b.filtre ? "Filtre : " + T.lettres(b.filtre.c) + " contient « " + b.filtre.texte + " » ×" : "Filtrer"),
        H.el("label.option.petite-option", null, H.el("input", { type: "checkbox", checked: !!b.entete, onchange: (e) => { b.entete = e.target.checked; changer(); dessiner(); } }), " 1ʳᵉ ligne = titres"),
        H.el("button.bouton-crayon", { type: "button", title: "Remplir depuis un fichier Excel (.xlsx) ou un tableau (.csv)", onclick: importer }, "Importer"),
        H.el("button.bouton-crayon", { type: "button", title: "Enregistrer en fichier Excel (.xlsx), formules comprises", onclick: exporter }, "Exporter .xlsx"),
        H.el("button.bouton-crayon", { type: "button", title: "Comment écrire une formule", onclick: aide }, "Formules ?"));
    }
    outils();
    dessiner();
    return H.el("div.zone-feuille", null, H.el("div.defile-feuille", null, table), infos, barre);
  }

  // --- la page ----------------------------------------------------------------------------------
  function dessinerPage(p) {
    actuelle = p;
    const zoneBlocs = H.el("div.blocs-carnet");
    const focusBloc = (i, pos) => setTimeout(() => { const els = zoneBlocs.querySelectorAll(":scope > .bloc-carnet"); const b = els[i]; if (!b) return; const e = b.querySelector("[contenteditable]"); if (e) placer(e, pos); }, 0);
    const redessiner = (focus) => { zoneBlocs.querySelectorAll("[contenteditable]").forEach((e) => (e.dataset.retire = "1")); zoneBlocs.replaceChildren(...p.blocs.map((b, i) => ligneBloc(b, i))); if (focus) focusBloc(focus[0], focus[1]); };
    function changer() { planifier(p); }
    function inserer(i, b, focus) { p.blocs.splice(i, 0, b); changer(); redessiner(focus === false ? null : [i, 0]); }
    function transformer(b, type) {
      b.type = type;
      if (type === "separateur") { b.texte = ""; }
      if (type === "tableau" && !b.lignes) b.lignes = b.cellules ? b.cellules.map((r) => r.slice()) : [["", ""], ["", ""]];
      if (type === "feuille" && !b.cellules) { b.cellules = b.lignes ? b.lignes.map((r) => r.slice()) : [["", "", ""], ["", "", ""], ["", "", ""], ["", "", ""]]; b.entete = true; }
      if (type === "colonnes") { b.gauche = b.gauche || b.texte || ""; b.droite = b.droite || ""; }
      if (type === "encadre" && !b.couleur) b.couleur = COULEURS_ENCADRE[0];
      if (type === "image") { choisirImage(b); }
      changer();
    }
    function choisirImage(b) {
      const inp = H.el("input", { type: "file", accept: "image/*" });
      inp.onchange = async () => {
        const f = inp.files[0]; if (!f) return;
        const img = await createImageBitmap(f).catch(() => null); if (!img) return H.toast("Cette image ne s’ouvre pas");
        const k = Math.min(1, 1100 / Math.max(img.width, img.height)), c = H.el("canvas", { width: Math.round(img.width * k), height: Math.round(img.height * k) });
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        b.src = c.toDataURL("image/jpeg", 0.8); b.type = "image"; changer(); redessiner();
      };
      inp.click();
    }
    function menuBloc(b, i, bouton) {
      const items = [
        ...TYPES.filter(([t]) => t !== b.type).map(([t, n]) => ({ libelle: "En " + n.toLowerCase(), faire: () => { transformer(b, t); redessiner([i]); } })),
        { libelle: "Monter", faire: () => { if (i > 0) { [p.blocs[i - 1], p.blocs[i]] = [p.blocs[i], p.blocs[i - 1]]; changer(); redessiner(); } } },
        { libelle: "Descendre", faire: () => { if (i < p.blocs.length - 1) { [p.blocs[i + 1], p.blocs[i]] = [p.blocs[i], p.blocs[i + 1]]; changer(); redessiner(); } } },
        { libelle: "Dupliquer", faire: () => inserer(i + 1, Object.assign(JSON.parse(JSON.stringify(b)), { id: uid() })) },
        { libelle: "Supprimer le bloc", faire: () => { p.blocs.splice(i, 1); if (!p.blocs.length) p.blocs.push(bloc("p")); changer(); redessiner(); } },
      ];
      fermerMenu();
      const r = bouton.getBoundingClientRect(), m = H.el("div.menu-carnet");
      m.append(...items.map((it) => H.el("button.item-menu-carnet", { type: "button", onclick: () => { fermerMenu(); it.faire(); } }, it.libelle)));
      Object.assign(m.style, { left: Math.round(r.left + window.scrollX) + "px", top: Math.round(r.bottom + window.scrollY + 2) + "px" });
      document.body.appendChild(m); menuOuvert = m;
    }
    // le numéro d'une liste numérotée : les blocs « num » qui se suivent
    const numero = (i) => { let n = 1; for (let k = i - 1; k >= 0 && p.blocs[k].type === "num"; k--) n++; return n; };

    function toucheTexte(b, i) {
      return (e, el) => {
        if (menuOuvert && menuOuvert.clavier && menuOuvert.clavier(e)) { e.preventDefault(); return; }
        const pos = curseur(el), texte = el.innerText.replace(/\n$/, "");
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          if (!texte && ["puce", "num", "todo", "citation", "encadre", "toggle"].includes(b.type)) { b.type = "p"; changer(); redessiner([i]); return; }
          b.texte = texte.slice(0, pos);
          const suite = ["puce", "num", "todo"].includes(b.type) ? b.type : "p";
          inserer(i + 1, bloc(suite, texte.slice(pos)), [i + 1, 0]);
          return;
        }
        if (e.key === "Backspace" && pos === 0 && !getSelection().toString()) {
          if (b.type !== "p") { e.preventDefault(); b.texte = texte; b.type = "p"; changer(); redessiner([i, 0]); return; }
          const prec = p.blocs[i - 1];
          if (prec && TEXTUELS.has(prec.type)) { e.preventDefault(); const lg = (prec.texte || "").length; prec.texte = (prec.texte || "") + texte; p.blocs.splice(i, 1); changer(); redessiner([i - 1, lg]); return; }
          if (prec && !texte) { e.preventDefault(); p.blocs.splice(i, 1); changer(); redessiner([Math.max(0, i - 1)]); return; }
        }
        if (e.key === "ArrowUp" && pos === 0 && i > 0) { e.preventDefault(); focusBloc(i - 1); }
        if (e.key === "ArrowDown" && pos === texte.length && i < p.blocs.length - 1) { e.preventDefault(); focusBloc(i + 1, 0); }
      };
    }
    // ce qu'on tape : raccourcis de début de ligne, « / » pour les commandes, « [[ » pour relier
    function saisieTexte(b, i) {
      return (el) => {
        const t = el.innerText.replace(/\n$/, "");
        if (b.type === "p") {
          for (const [type, , rac] of TYPES) if (rac && (t === rac.trim() && type === "separateur" || (rac !== "---" && t.startsWith(rac)))) {
            if (type === "separateur") { b.texte = ""; transformer(b, "separateur"); inserer(i + 1, bloc("p")); return; }
            b.texte = t.slice(rac.length); transformer(b, type); redessiner([i, b.texte.length]); return;
          }
        }
        if (t.startsWith("/") && !/\s/.test(t)) {
          const q = norme(t.slice(1));
          menuSous(el, TYPES.filter(([, n]) => norme(n).includes(q)).map(([type, n]) => ({ libelle: n, type })), (it) => {
            b.texte = ""; transformer(b, it.type); if (it.type === "separateur") { inserer(i + 1, bloc("p")); return; } redessiner([i, 0]);
          });
          return;
        }
        const pos = curseur(el), avant = t.slice(0, pos), m = /\[\[([^\]\n]*)$/.exec(avant);
        if (m) {
          const q = norme(m[1]);
          const items = nomsReliables().filter((x) => norme(x.nom).includes(q)).sort((a, b) => norme(a.nom).indexOf(q) - norme(b.nom).indexOf(q)).slice(0, 9)
            .map((x) => ({ libelle: x.nom, aide: { page: "page", plante: "plante", jardin: "jardin", client: "client" }[x.type], nom: x.nom }));
          if (m[1] && !items.some((x) => norme(x.nom) === q)) items.push({ libelle: "Nouvelle page « " + m[1] + " »", nom: m[1], aide: "créer" });
          menuSous(el, items, (it) => {
            const apres = t.slice(pos).replace(/^\]\]/, "");
            b.texte = avant.slice(0, m.index) + "[[" + it.nom + "]]" + apres;
            el.textContent = b.texte; changer();
            placer(el, m.index + it.nom.length + 4);
          });
          return;
        }
        if (menuOuvert) fermerMenu();
      };
    }

    function ligneBloc(b, i) {
      const poignee = H.el("button.poignee-carnet", { type: "button", title: "Transformer, déplacer, supprimer", "aria-label": "Options du bloc", onclick: (e) => menuBloc(b, i, e.currentTarget) }, "⋮⋮");
      const plus = H.el("button.plus-carnet", { type: "button", title: "Ajouter un bloc dessous", "aria-label": "Ajouter un bloc", onclick: () => inserer(i + 1, bloc("p")) }, "+");
      const ligne = H.el("div.bloc-carnet.bloc-" + b.type, null, H.el("div.outils-bloc", null, plus, poignee));
      const txt = (cle, vide, multi) => editable("texte-bloc", () => b[cle] || "", {
        vide, changer: (v, enCours) => { b[cle] = v; if (!enCours || true) changer(); },
        touche: multi ? (e, el) => { if (menuOuvert && menuOuvert.clavier && menuOuvert.clavier(e)) e.preventDefault(); } : toucheTexte(b, i),
        saisie: multi ? null : saisieTexte(b, i),
      });
      switch (b.type) {
        case "separateur": ligne.appendChild(H.el("hr.separateur-carnet")); break;
        case "todo": ligne.append(H.el("input.case-carnet", { type: "checkbox", checked: !!b.coche, onchange: (e) => { b.coche = e.target.checked; ligne.classList.toggle("coche", b.coche); changer(); } }), txt("texte", "À faire")); if (b.coche) ligne.classList.add("coche"); break;
        case "puce": ligne.append(H.el("span.puce-carnet", null, "•"), txt("texte", "Liste")); break;
        case "num": ligne.append(H.el("span.puce-carnet", null, numero(i) + "."), txt("texte", "Liste")); break;
        case "encadre": ligne.style.setProperty("--fond-encadre", b.couleur || COULEURS_ENCADRE[0]);
          ligne.append(H.el("button.pastille-encadre", { type: "button", title: "Changer la couleur", onclick: () => { const k = COULEURS_ENCADRE.indexOf(b.couleur); b.couleur = COULEURS_ENCADRE[(k + 1) % COULEURS_ENCADRE.length]; ligne.style.setProperty("--fond-encadre", b.couleur); changer(); } }), txt("texte", "Encadré")); break;
        case "toggle": {
          const corps = editable("texte-bloc.contenu-toggle", () => b.contenu || "", { vide: "Ce qui est replié", changer: (v) => { b.contenu = v; changer(); } });
          corps.hidden = !b.ouvert;
          ligne.append(H.el("button.fleche-toggle" + (b.ouvert ? ".ouvert" : ""), { type: "button", "aria-label": "Déplier", onclick: (e) => { b.ouvert = !b.ouvert; corps.hidden = !b.ouvert; e.currentTarget.classList.toggle("ouvert", b.ouvert); changer(); } }, "▸"),
            H.el("div.toggle-carnet", null, txt("texte", "Partie dépliable"), corps));
          break;
        }
        case "image":
          ligne.append(b.src ? H.el("figure.image-carnet", null, H.el("img", { src: b.src, alt: b.legende || "" }), editable("legende-carnet", () => b.legende || "", { vide: "Légende", changer: (v) => { b.legende = v; changer(); } }))
            : H.el("button.bouton.petit", { type: "button", onclick: () => choisirImage(b) }, "Choisir une image"));
          break;
        case "tableau": {
          const t = H.el("table.tableau-carnet");
          const dessinerT = () => {
            t.replaceChildren(...b.lignes.map((rang, r) => H.el("tr", null, rang.map((v, c) => H.el(r === 0 ? "th" : "td", null,
              editable("cellule-carnet", () => b.lignes[r][c] || "", { vide: r === 0 ? "Titre" : "", changer: (x) => { b.lignes[r][c] = x; changer(); } }))))));
          };
          dessinerT();
          ligne.append(H.el("div.zone-tableau", null, t, H.el("div.pastilles", null,
            H.el("button.bouton-crayon", { type: "button", title: "Ajouter une ligne", onclick: () => { b.lignes.push(b.lignes[0].map(() => "")); changer(); dessinerT(); } }, "+ ligne"),
            H.el("button.bouton-crayon", { type: "button", title: "Ajouter une colonne", onclick: () => { b.lignes.forEach((r) => r.push("")); changer(); dessinerT(); } }, "+ colonne"),
            b.lignes.length > 1 ? H.el("button.bouton-crayon", { type: "button", title: "Retirer la dernière ligne", onclick: () => { b.lignes.pop(); changer(); dessinerT(); } }, "− ligne") : null,
            b.lignes[0].length > 1 ? H.el("button.bouton-crayon", { type: "button", title: "Retirer la dernière colonne", onclick: () => { b.lignes.forEach((r) => r.pop()); changer(); dessinerT(); } }, "− colonne") : null)));
          break;
        }
        case "feuille": ligne.appendChild(feuilleDeCalcul(b, changer, p)); break;
        case "vue": ligne.appendChild(vuePages(b, p, changer)); break;
        case "colonnes":
          ligne.append(H.el("div.colonnes-carnet", null,
            editable("texte-bloc", () => b.gauche || "", { vide: "Colonne de gauche", changer: (v) => { b.gauche = v; changer(); } }),
            editable("texte-bloc", () => b.droite || "", { vide: "Colonne de droite", changer: (v) => { b.droite = v; changer(); } })));
          break;
        default: ligne.append(txt("texte", i === 0 && b.type === "p" && p.blocs.length === 1 ? "Écris ici, ou tape « / » pour choisir un bloc" : b.type.startsWith("h") ? "Titre" : ""));
      }
      return ligne;
    }

    // le titre, les étiquettes de la page, puis les blocs, puis « cité dans » et les sous-pages
    const titre = editable("titre-carnet", () => p.titre || "", {
      vide: "Sans titre", changer: (v) => { p.titre = v.replace(/\n/g, " "); changer(); const lien = document.querySelector(".ligne-arbre.actif a"); if (lien) lien.textContent = p.titre || "Sans titre"; },
      touche: (e) => { if (e.key === "Enter") { e.preventDefault(); focusBloc(0, 0); } },
    });
    const etiquettes = H.el("div.etiquettes-page");
    const dessinerEtiq = () => etiquettes.replaceChildren(...(p.etiquettes || []).map((e) => H.el("span.etiquette-page", null, H.el("a", { href: "#carnet/etiquette/" + encodeURIComponent(e) }, "#" + e),
      H.el("button", { type: "button", "aria-label": "Retirer", onclick: () => { p.etiquettes = p.etiquettes.filter((x) => x !== e); garder(p); dessinerEtiq(); } }, "×"))),
      H.el("input.ajout-etiquette", { placeholder: "+ étiquette", list: "liste-etiquettes", onkeydown: (ev) => { if (ev.key === "Enter" && ev.target.value.trim()) { const e = ev.target.value.trim().replace(/^#/, "").toLowerCase().replace(/\s+/g, "-"); p.etiquettes = [...new Set((p.etiquettes || []).concat(e))]; garder(p); dessinerEtiq(); } } }),
      H.el("datalist#liste-etiquettes", null, Object.keys(indexEtiquettes()).map((e) => H.el("option", { value: e }))));
    dessinerEtiq();
    // les propriétés : la date, le statut, les relations vers d'autres pages, plantes, jardins, clients
    const proprietes = H.el("div.proprietes-page");
    const dessinerProps = () => {
      const relations = H.el("span.relations-page", null, ...(p.relations || []).map((r) => H.el("span.etiquette-page", null, H.el("a", { href: cible(r) ? "#" + cible(r).hash : "#carnet" }, r),
        H.el("button", { type: "button", "aria-label": "Retirer la relation", onclick: () => { p.relations = p.relations.filter((x) => x !== r); garder(p); dessinerProps(); } }, "×"))),
        H.el("input.ajout-etiquette", { placeholder: "+ relier", list: "liste-reliables", onkeydown: (ev) => { if (ev.key === "Enter" && ev.target.value.trim()) { p.relations = Array.from(new Set((p.relations || []).concat(ev.target.value.trim()))); garder(p); dessinerProps(); } } }),
        H.el("datalist#liste-reliables", null, nomsReliables().slice(0, 400).map((x) => H.el("option", { value: x.nom }))));
      proprietes.replaceChildren(
        H.el("label.propriete", null, H.el("b", null, "Date"), H.el("input", { type: "date", value: p.date || "", onchange: (e) => { p.date = e.target.value || undefined; garder(p); } })),
        H.el("label.propriete", null, H.el("b", null, "Statut"), H.el("select", { onchange: (e) => { p.statut = e.target.value || undefined; garder(p); } }, STATUTS.map((s) => H.el("option", { value: s, selected: (p.statut || "") === s }, s || "—")))),
        H.el("div.propriete", null, H.el("b", null, "Liée à"), relations));
    };
    dessinerProps();
    // les commentaires, au bas de la page
    const qui = H.monde === "mesi" ? "Mesi" : "ƟvƟ";
    const commentaires = H.el("section.commentaires-carnet");
    const dessinerComm = () => {
      const champ = H.el("textarea", { rows: 2, placeholder: "Un commentaire…" });
      const liste = (p.commentaires || []).filter((c) => !c.supprime);
      commentaires.replaceChildren(H.el("h3", null, "Commentaires" + (liste.length ? " (" + liste.length + ")" : "")),
        ...liste.map((c) => H.el("div.commentaire", null, H.el("b", null, c.qui), H.el("span.discret", null, " · " + new Date(c.le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })),
          H.el("button.bouton-crayon", { type: "button", title: "Retirer le commentaire", onclick: () => { c.supprime = true; garder(p); dessinerComm(); } }, "×"), H.el("p", { html: rendre(c.texte) }))),
        H.el("div.ajout-commentaire", null, champ, H.el("button.bouton.petit", { type: "button", onclick: () => { const t = champ.value.trim(); if (!t) return; p.commentaires = (p.commentaires || []).concat({ id: uid("com"), qui, texte: t, le: H.maintenant() }); garder(p); dessinerComm(); } }, "Commenter")));
    };
    dessinerComm();
    // les pièces jointes (un PDF, un plan, une photo…) : gardées dans la page, 1,5 Mo au plus chacune
    const pieces = H.el("section.pieces-carnet");
    const dessinerPieces = () => {
      const liste = (p.pieces || []).filter((x) => !x.supprime);
      const taille = (n) => n > 1e6 ? (n / 1e6).toFixed(1).replace(".", ",") + " Mo" : Math.max(1, Math.round(n / 1e3)) + " ko";
      pieces.replaceChildren(H.el("h3", null, "Pièces jointes" + (liste.length ? " (" + liste.length + ")" : "")),
        ...liste.map((x) => H.el("div.piece", null, H.el("a", { href: x.data, download: x.nom }, x.nom), H.el("span.discret", null, " · " + taille(x.taille)),
          H.el("button.bouton-crayon", { type: "button", title: "Retirer", onclick: async () => { if (!(await H.confirmer("Retirer « " + x.nom + " » de la page ?"))) return; x.supprime = true; delete x.data; garder(p); dessinerPieces(); } }, "×"))),
        H.el("button.bouton.petit", { type: "button", onclick: () => {
          const inp = H.el("input", { type: "file" });
          inp.onchange = () => {
            const f = inp.files[0]; if (!f) return;
            if (f.size > 1.5e6) return H.toast("Ce fichier est trop lourd (1,5 Mo au plus) : il ralentirait la synchronisation.");
            const lec = new FileReader();
            lec.onload = () => { p.pieces = (p.pieces || []).concat({ id: uid("pj"), nom: f.name, type: f.type, taille: f.size, data: lec.result, le: H.maintenant() }); garder(p); dessinerPieces(); };
            lec.readAsDataURL(f);
          };
          inp.click();
        } }, "Joindre un fichier"));
    };
    dessinerPieces();
    const fav = estFavori("carnet/" + p.id);
    const outils = H.el("div.outils-page",
      null,
      H.el("button.bouton-trait", { type: "button", onclick: (e) => { basculerFavori("carnet/" + p.id, p.titre || "Sans titre"); e.currentTarget.querySelector("span:last-child").textContent = estFavori("carnet/" + p.id) ? "Favori" : "Mettre en favori"; } }, H.el("span.icone-trait", { html: estFavori("carnet/" + p.id) ? "★" : "☆" }), H.el("span", null, fav ? "Favori" : "Mettre en favori")),
      H.el("button.bouton-trait", { type: "button", onclick: () => { const s = nouvellePage("", p.id); H.aller("carnet/" + s.id); } }, "+ Sous-page"),
      H.el("button.bouton-trait", { type: "button", onclick: () => historique(p) }, "Historique"),
      H.el("button.bouton-trait", { type: "button", onclick: () => deplacer(p) }, "Déplacer"),
      H.el("button.bouton-trait", { type: "button", onclick: () => enModele(p) }, "En faire un modèle"),
      H.el("button.bouton-trait", { type: "button", onclick: () => exporterPage(p) }, "Exporter"),
      H.el("button.bouton-trait", { type: "button", onclick: async () => { if (!(await H.confirmer("Mettre « " + (p.titre || "Sans titre") + " » et ses sous-pages à la corbeille ?"))) return; jeter(p); H.aller("carnet"); } }, "Corbeille"));
    redessiner();
    const sous = enfants(p.id), cite = p.titre ? citations(p.titre) : [];
    return H.el("article.page-carnet", null,
      H.el("nav.fil-ariane", null, H.el("a", { href: "#carnet" }, "Carnet"), ...chemin(p).flatMap((q) => [" / ", H.el("a", { href: "#carnet/" + q.id }, q.titre || "Sans titre")])),
      titre, etiquettes, proprietes, outils, zoneBlocs,
      H.el("button.ajout-bloc", { type: "button", onclick: () => inserer(p.blocs.length, bloc("p")) }, "+ Ajouter un bloc"),
      sous.length ? H.el("section.sous-pages", null, H.el("h3", null, "Sous-pages"), H.el("ul", null, sous.map((s) => H.el("li", null, H.el("a", { href: "#carnet/" + s.id }, s.titre || "Sans titre"))))) : null,
      cite.length ? sectionCitees(cite) : null,
      pieces, commentaires);
  }
  function sectionCitees(liste) {
    return H.el("section.citations-carnet", null, H.el("h3", null, "Cité dans"),
      H.el("ul", null, liste.map((c) => H.el("li", null, H.el("span.type-source", null, c.type), " ", H.el("a", { href: "#" + c.hash }, c.titre)))));
  }

  // --- corbeille, déplacement, modèles, historique, export -------------------------------------
  function jeter(p) {
    const t = H.maintenant();
    const tout = [p].concat((function sousTout(id) { return enfants(id).flatMap((s) => [s].concat(sousTout(s.id))); })(p.id));
    for (const q of tout) { q.supprime = true; q.supprimeLe = t; garder(q, true); }
  }
  function deplacer(p) {
    const interdits = new Set([p.id]); (function marquer(id) { for (const s of enfants(id)) { interdits.add(s.id); marquer(s.id); } })(p.id);
    const choix = H.el("select", null, H.el("option", { value: "" }, "Au premier niveau du carnet"), toutes().filter((q) => !interdits.has(q.id)).map((q) => H.el("option", { value: q.id, selected: q.id === p.parent }, (chemin(q).map((c) => c.titre).concat(q.titre || "Sans titre")).join(" / "))));
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire", { onsubmit: (e) => { e.preventDefault(); p.parent = choix.value || null; garder(p, true); fermer(); dessiner(["", p.id]); } },
      H.el("h2", null, "Déplacer la page"), H.el("label", null, "Dans ", choix), H.el("div.boutons-bas", null, H.el("button.bouton", { type: "submit" }, "Déplacer"))));
  }
  // les modèles de page : trois pour commencer, et ceux qu'ƟvƟ enregistre
  const MODELES = [
    { id: "visite", titre: "Visite de jardin — {client}", blocs: [["p", "Le {date}, chez [[{client}]]"], ["h2", "Le lieu"], ["puce", "Exposition : "], ["puce", "Sol : "], ["puce", "Eau, arrosage : "], ["puce", "Ce qui pousse déjà : "], ["h2", "Les envies"], ["p", ""], ["h2", "Mes idées de plantes"], ["puce", ""], ["h2", "À faire ensuite"], ["todo", "Envoyer le devis"], ["todo", "Faire le plan"]] },
    { id: "chantier", titre: "Chantier — {jardin}", blocs: [["p", "Jardin : [[{jardin}]] · client : [[{client}]] · commencé le {date}"], ["h2", "Les étapes"], ["todo", "Préparation du sol"], ["todo", "Livraison des plantes"], ["todo", "Plantation"], ["todo", "Paillage et arrosage"], ["h2", "Fournitures"], ["tableau", ""], ["h2", "Notes du chantier"], ["p", ""]] },
    { id: "compte-rendu", titre: "Compte rendu — {client} — {date}", blocs: [["p", "Rendez-vous avec [[{client}]] le {date}"], ["h2", "Ce qu’on s’est dit"], ["puce", ""], ["h2", "Décisions"], ["puce", ""], ["encadre", "Prochain rendez-vous : "], ["h2", "À faire"], ["todo", ""]] },
  ];
  const modelesPerso = () => Object.values(H.jeu.pages || {}).filter((p) => p && p.modele && !p.supprime);
  function enModele(p) {
    const t = H.maintenant();
    const m = { id: uid("modele"), titre: p.titre || "Modèle", blocs: JSON.parse(JSON.stringify(p.blocs)).map((b) => Object.assign(b, { id: uid() })), modele: true, creeLe: t, modifieLe: t };
    H.jeu.pages = Object.assign({}, H.jeu.pages, { [m.id]: m }); H.d.changer("jeu");
    H.toast("Modèle enregistré : « " + m.titre + " ». Tu peux mettre {date}, {client} ou {jardin} dans le texte.");
  }
  function depuisModele(m, parent) {
    const clients = Object.values(H.jeu.clients || {}).filter((c) => c && !c.supprime), iles = H.ilesVisibles();
    const brut = JSON.stringify(m.blocs) + m.titre, aClient = /\{client\}/.test(brut), aJardin = /\{jardin\}/.test(brut);
    const fin = (client, jardin) => {
      const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
      const r = (t) => String(t || "").replace(/\{date\}/g, date).replace(/\{client\}/g, client || "client").replace(/\{jardin\}/g, jardin || "jardin");
      const blocs = (m.blocs || []).map((b) => Array.isArray(b) ? bloc(b[0], r(b[1]), b[0] === "tableau" ? { lignes: [["Fourniture", "Quantité", "Prix"], ["", "", ""]] } : b[0] === "encadre" ? { couleur: COULEURS_ENCADRE[0] } : null)
        : Object.assign(JSON.parse(r(JSON.stringify(b))), { id: uid() }));
      const p = nouvellePage(r(m.titre), parent, blocs);
      H.aller("carnet/" + p.id);
    };
    if (!aClient && !aJardin) return fin();
    const cl = H.el("input", { list: "liste-clients-modele", placeholder: "Nom du client" }), ja = H.el("select", null, H.el("option", { value: "" }, "—"), iles.map((i) => H.el("option", { value: i.nom }, i.nom)));
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire", { onsubmit: (e) => { e.preventDefault(); fermer(); fin(cl.value.trim(), ja.value); } },
      H.el("h2", null, m.titre.replace(/\s*—.*$/, "") || "Nouvelle page"),
      aClient ? H.el("label", null, "Client ", cl, H.el("datalist#liste-clients-modele", null, clients.map((c) => H.el("option", { value: c.nom })))) : null,
      aJardin ? H.el("label", null, "Jardin ", ja) : null,
      H.el("div.boutons-bas", null, H.el("button.bouton", { type: "submit" }, "Créer la page"))));
  }
  async function historique(p) {
    if (aEnregistrer) { garder(aEnregistrer); aEnregistrer = null; }
    const liste = (await H.kv.lire("versions:" + p.id).catch(() => null)) || [];
    let fermer;
    const apercu = H.el("div.apercu-version.discret", null, "Choisis une version pour la voir.");
    fermer = H.fenetre(H.el("div.historique-carnet", null, H.el("h2", null, "Historique de « " + (p.titre || "Sans titre") + " »"),
      liste.length ? H.el("div.grille-historique", null,
        H.el("ul", null, liste.map((v) => H.el("li", null, H.el("button.bouton-trait", { type: "button", onclick: () => {
          apercu.replaceChildren(H.el("h3", null, v.titre || "Sans titre"), ...v.blocs.map((b) => H.el("p", { html: rendre([b.texte, b.contenu, b.gauche, b.droite].filter(Boolean).join(" · ") || (b.type === "separateur" ? "———" : "") ) })),
            H.el("button.bouton", { type: "button", onclick: () => { noterVersion(Object.assign({}, p)); p.titre = v.titre; p.blocs = JSON.parse(JSON.stringify(v.blocs)); garder(p, true); fermer(); dessiner(["", p.id]); H.toast("Version du " + new Date(v.le).toLocaleString("fr-FR") + " remise"); } }, "Revenir à cette version"));
        } }, new Date(v.le).toLocaleString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))))), apercu)
        : H.el("p.discret", null, "Pas encore de version gardée : elles se gardent toutes les deux minutes pendant que tu écris, sur cet appareil.")), { classe: "large" });
  }
  function exporterPage(p) {
    const sections = [{ titre: "", paragraphes: [] }];
    for (const b of p.blocs) {
      if (/^h[123]$/.test(b.type)) { sections.push({ titre: b.texte, paragraphes: [] }); continue; }
      const s = sections[sections.length - 1], t = (b.texte || "").replace(/\[\[([^\]]+)\]\]/g, "$1");
      if (b.type === "tableau") { s.colonnes = b.lignes[0]; s.lignes = b.lignes.slice(1); continue; }
      if (b.type === "feuille") { const v = H.tableur.calculer(b.cellules || []).map((r) => r.map(H.tableur.afficher)); s.colonnes = b.entete ? v[0] : v[0].map((x, c) => H.tableur.lettres(c)); s.lignes = b.entete ? v.slice(1) : v; s.feuille = b.cellules; continue; }
      const prefixe = { puce: "• ", num: "– ", todo: b.coche ? "☑ " : "☐ ", citation: "« ", encadre: "▌ " }[b.type] || "";
      if (b.type === "colonnes") s.paragraphes.push(b.gauche || "", b.droite || "");
      else if (b.type === "toggle") s.paragraphes.push(t, b.contenu || "");
      else if (t) s.paragraphes.push(prefixe + t + (b.type === "citation" ? " »" : ""));
    }
    H.exporter({ titre: p.titre || "Sans titre", sousTitre: (p.etiquettes || []).map((e) => "#" + e).join(" "), nomFichier: H.slug(p.titre || "page"), sections: sections.filter((s) => s.titre || s.paragraphes.length || s.lignes) });
  }

  // --- favoris et pages récentes ---------------------------------------------------------------
  const estFavori = (hash) => !!((H.jeu.favoris || {})[hash] && !(H.jeu.favoris || {})[hash].supprime);
  function basculerFavori(hash, titre) {
    const f = Object.assign({}, H.jeu.favoris), t = H.maintenant();
    f[hash] = estFavori(hash) ? { id: hash, supprime: true, modifieLe: t } : { id: hash, titre, modifieLe: t };
    H.jeu.favoris = f; H.d.changer("jeu");
  }
  const favoris = () => Object.values(H.jeu.favoris || {}).filter((f) => f && !f.supprime && f.titre);
  // le nom d'un endroit du jeu, d'après son adresse
  function libelle(hash) {
    const [v, a, b] = hash.split("/").map(decodeURIComponent);
    if (v === "carnet" && a && a !== "etiquette" && a !== "corbeille") { const p = page(a); return p && !p.supprime ? "Carnet · " + (p.titre || "Sans titre") : null; }
    if (v === "carnet" && a === "etiquette") return "Étiquette #" + b;
    if (v === "fiche") { const p = H.d.plante(a); return p ? "Fiche · " + p.nom : null; }
    if (v === "terrain" && a) { const i = H.ilesVisibles().find((x) => x.id === a); return i ? "Jardin · " + i.nom : null; }
    return { carnet: "Carnet", taches: "To-do liste", devis: "Devis et factures", herbotheque: "Herbothèque", cartes: "Flashcartes", terrain: "Terrain", labo: "Labo", serre: "Serre", lettres: "Lettres", tisanes: "Tisanes" }[v] || null;
  }
  let enregistrerRecents = null;
  window.addEventListener("hashchange", () => {
    if (!H.local || !H.jeu) return;
    const hash = location.hash.replace(/^#/, ""), nom = libelle(hash);
    if (!nom) return;
    H.local.recents = [{ hash, nom, le: Date.now() }].concat((H.local.recents || []).filter((r) => r.hash !== hash)).slice(0, 12);
    clearTimeout(enregistrerRecents); enregistrerRecents = setTimeout(() => H.d.majLocal(() => {}), 400);
  });

  // --- la recherche dans tout le jeu (Ctrl+K ou ⌘K) ---------------------------------------------
  function sourcesRecherche() {
    const s = [];
    for (const p of toutes()) s.push({ titre: p.titre || "Sans titre", type: "Page", hash: "carnet/" + p.id, texte: texteDe(p) });
    for (const p of H.d.plantes()) s.push({ titre: p.nom, type: "Fiche", hash: "fiche/" + encodeURIComponent(p.id), texte: [p.latin, (p.valeurs || {}).nomsCommuns].concat(Object.values(p.valeurs || {}).filter((v) => typeof v === "string")).join(" ") });
    for (const t of Object.values(H.jeu.taches || {})) if (t && !t.supprime) s.push({ titre: t.titre, type: "Tâche", hash: "taches", texte: t.notes || "" });
    for (const d of Object.values(H.jeu.documents || {})) if (d && !d.supprime) s.push({ titre: (d.type === "devis" ? "Devis " : "Facture ") + d.numero + (d.objet ? " · " + d.objet : ""), type: d.type === "devis" ? "Devis" : "Facture", hash: "devis", texte: (d.lignes || []).map((l) => l.designation).join(" ") });
    for (const c of Object.values(H.jeu.clients || {})) if (c && !c.supprime) s.push({ titre: c.nom, type: "Client", hash: "devis", texte: [c.adresse, c.email, c.notes].join(" ") });
    for (const i of H.ilesVisibles()) s.push({ titre: i.nom, type: "Jardin", hash: "terrain/" + encodeURIComponent(i.id), texte: "" });
    for (const l of Object.values(H.jeu.lettres || {})) if (l && !l.supprime) s.push({ titre: l.titre || (l.texte || "").slice(0, 40), type: "Lettre", hash: "lettres", texte: l.texte || "" });
    for (const t of Object.values((H.herbier && H.herbier.tisanes) || {})) if (t && !t.supprime) s.push({ titre: t.nom, type: H.monde === "mesi" ? "Formule" : "Tisane", hash: "tisanes", texte: [t.usage, t.notes].join(" ") });
    return s;
  }
  function chercherPartout() {
    if (document.querySelector(".palette-recherche")) return;
    const champ = H.el("input.champ-palette", { type: "search", placeholder: "Chercher dans tout le jeu : pages, fiches, tâches, devis, clients, jardins…", "aria-label": "Chercher partout" });
    const liste = H.el("ul.resultats-palette");
    let res = [], actif = 0, fermer;
    const sources = sourcesRecherche();
    const montrer = () => {
      const q = norme(champ.value);
      if (!q) {
        res = favoris().map((f) => ({ titre: f.titre, type: "Favori", hash: f.id })).concat((H.local.recents || []).map((r) => ({ titre: r.nom, type: "Récent", hash: r.hash }))).slice(0, 14);
      } else {
        res = sources.map((s) => { const t = norme(s.titre), x = norme(s.texte); const sc = t === q ? 0 : t.startsWith(q) ? 1 : t.includes(q) ? 2 : x.includes(q) ? 3 : 9; return { s, sc, i: x.indexOf(q) }; })
          .filter((r) => r.sc < 9).sort((a, b) => a.sc - b.sc).slice(0, 30)
          .map(({ s, sc, i }) => ({ titre: s.titre, type: s.type, hash: s.hash, extrait: sc === 3 ? "…" + s.texte.slice(Math.max(0, i - 30), i + q.length + 50).replace(/\s+/g, " ") + "…" : "" }));
      }
      actif = Math.min(actif, Math.max(0, res.length - 1));
      liste.replaceChildren(...(res.length ? res.map((r, k) => H.el("li", null, H.el("a.resultat-palette" + (k === actif ? ".actif" : ""), { href: "#" + r.hash, onclick: () => fermer() },
        H.el("span.type-source", null, r.type), H.el("span.titre-resultat", null, r.titre), r.extrait ? H.el("span.extrait-resultat", null, r.extrait) : null))) : [H.el("li.discret", null, champ.value ? "Rien trouvé." : "Tes favoris et tes pages récentes s’afficheront ici.")]));
    };
    champ.addEventListener("input", () => { actif = 0; montrer(); });
    champ.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); actif = Math.min(res.length - 1, actif + 1); montrer(); }
      if (e.key === "ArrowUp") { e.preventDefault(); actif = Math.max(0, actif - 1); montrer(); }
      if (e.key === "Enter" && res[actif]) { e.preventDefault(); fermer(); location.hash = res[actif].hash; }
    });
    fermer = H.fenetre(H.el("div.palette-recherche", null, champ, liste), { classe: "large", titre: "Chercher partout" });
    montrer();
    setTimeout(() => champ.focus(), 30);
  }
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && H.jeu) { e.preventDefault(); chercherPartout(); } });

  // --- la colonne de gauche et les vues du carnet ------------------------------------------------
  function arbre(parent, profondeur) {
    return enfants(parent).map((p) => {
      const sous = enfants(p.id), ouvert = (H.local.arbreOuvert || {})[p.id] !== false;
      return H.el("li", null,
        H.el("div.ligne-arbre" + (actuelle && actuelle.id === p.id ? ".actif" : ""), null,
          sous.length ? H.el("button.fleche-arbre" + (ouvert ? ".ouvert" : ""), { type: "button", "aria-label": "Déplier", onclick: () => { H.local.arbreOuvert = Object.assign({}, H.local.arbreOuvert, { [p.id]: !ouvert }); H.d.majLocal(() => {}); dessiner(derniers); } }, "▸") : H.el("span.fleche-arbre"),
          H.el("a", { href: "#carnet/" + p.id }, p.titre || "Sans titre"),
          H.el("button.plus-arbre", { type: "button", title: "Ajouter une sous-page", onclick: () => { const s = nouvellePage("", p.id); H.aller("carnet/" + s.id); } }, "+")),
        sous.length && ouvert && profondeur < 6 ? H.el("ul", null, arbre(p.id, profondeur + 1)) : null);
    });
  }
  function colonne() {
    const etiq = Object.entries(indexEtiquettes()).sort((a, b) => b[1].length - a[1].length).slice(0, 24);
    return H.el("aside.colonne-carnet", null,
      H.el("button.bouton-trait.chercher-carnet", { type: "button", onclick: chercherPartout }, H.el("span.icone-trait", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>' }), H.el("span", null, "Chercher partout"), H.el("kbd", null, "Ctrl K")),
      H.el("div.pastilles", null,
        H.el("button.bouton.petit", { type: "button", onclick: () => { const p = nouvellePage(""); H.aller("carnet/" + p.id); } }, "+ Nouvelle page"),
        H.el("button.bouton.petit", { type: "button", onclick: choisirModele }, "Depuis un modèle")),
      favoris().length ? H.el("section", null, H.el("h4", null, "Favoris"), H.el("ul.liste-carnet", null, favoris().map((f) => H.el("li", null, H.el("a", { href: "#" + f.id }, f.titre))))) : null,
      (H.local.recents || []).length ? H.el("section", null, H.el("h4", null, "Récents"), H.el("ul.liste-carnet", null, (H.local.recents || []).slice(0, 6).map((r) => H.el("li", null, H.el("a", { href: "#" + r.hash }, r.nom))))) : null,
      H.el("section", null, H.el("h4", null, "Pages"), toutes().length ? H.el("ul.arbre-carnet", null, arbre(null, 0)) : H.el("p.discret", null, "Pas encore de page.")),
      etiq.length ? H.el("section", null, H.el("h4", null, "Étiquettes"), H.el("div.nuage-etiquettes", null, etiq.map(([e, l]) => H.el("a.etiquette-carnet", { href: "#carnet/etiquette/" + encodeURIComponent(e) }, "#" + e, H.el("small", null, " " + l.length))))) : null,
      H.el("section", null, H.el("a.lien-corbeille", { href: "#carnet/corbeille" }, "Corbeille")));
  }
  function choisirModele() {
    let fermer;
    const tous = MODELES.concat(modelesPerso());
    fermer = H.fenetre(H.el("div.modeles-carnet", null, H.el("h2", null, "Une page depuis un modèle"),
      H.el("ul.liste-docs", null, tous.map((m) => H.el("li.doc-devis", { onclick: () => { fermer(); depuisModele(m, actuelle && actuelle.id); } },
        H.el("strong", null, m.titre.replace(/\s*—.*$/, "")), H.el("span.discret", null, m.modele ? "à moi" : "modèle du jeu"),
        m.modele ? H.el("button.bouton-crayon", { type: "button", title: "Supprimer ce modèle", onclick: (e) => { e.stopPropagation(); m.supprime = true; m.modifieLe = H.maintenant(); H.d.changer("jeu"); fermer(); choisirModele(); } }, "×") : null))),
      H.el("p.discret", null, "Pour faire ton propre modèle : écris une page, puis « En faire un modèle ». Mets {date}, {client} ou {jardin} là où ils doivent être remplis.")));
  }
  function vueEtiquette(e) {
    const liste = indexEtiquettes()[e] || [];
    return H.el("article.page-carnet", null, H.el("nav.fil-ariane", null, H.el("a", { href: "#carnet" }, "Carnet"), " / Étiquettes"),
      H.el("h1.titre-carnet", null, "#" + e),
      liste.length ? H.el("ul.liste-sources", null, liste.map((c) => H.el("li", null, H.el("span.type-source", null, c.type), " ", H.el("a", { href: "#" + c.hash }, c.titre)))) : H.el("p.discret", null, "Rien ne porte cette étiquette."));
  }
  function vueCorbeille() {
    const jetees = Object.values(H.jeu.pages || {}).filter((p) => p && p.supprime && !p.vide && !p.modele).sort((a, b) => (b.supprimeLe || 0) - (a.supprimeLe || 0));
    return H.el("article.page-carnet", null, H.el("nav.fil-ariane", null, H.el("a", { href: "#carnet" }, "Carnet"), " / Corbeille"),
      H.el("h1.titre-carnet", null, "Corbeille"),
      jetees.length ? H.el("ul.liste-docs", null, jetees.map((p) => H.el("li.doc-devis", null, H.el("strong", null, p.titre || "Sans titre"), H.el("span.discret", null, p.supprimeLe ? "jetée le " + new Date(p.supprimeLe).toLocaleDateString("fr-FR") : ""),
        H.el("button.bouton.petit", { type: "button", onclick: () => { p.supprime = false; if (p.parent && (!page(p.parent) || page(p.parent).supprime)) p.parent = null; garder(p, true); dessiner(["corbeille"]); } }, "Remettre"),
        H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: async () => { if (!(await H.confirmer("Supprimer pour de bon « " + (p.titre || "Sans titre") + " » ?"))) return; H.jeu.pages = Object.assign({}, H.jeu.pages, { [p.id]: { id: p.id, supprime: true, vide: true, modifieLe: H.maintenant() } }); H.d.changer("jeu"); dessiner(["corbeille"]); } }, "Supprimer pour de bon"))))
        : H.el("p.discret", null, "La corbeille est vide."));
  }
  function accueil() {
    const recents = toutes().sort((a, b) => b.modifieLe - a.modifieLe).slice(0, 8);
    return H.el("article.page-carnet", null, H.el("h1.titre-carnet", null, "Carnet"),
      H.el("p.discret", null, "Des pages libres pour tes notes de chantier, tes visites, tes idées. Tape « / » pour choisir un bloc, « [[ » pour relier une page, une plante, un jardin ou un client, et #étiquette pour classer. Ctrl K (ou ⌘K) cherche dans tout le jeu."),
      recents.length ? H.el("section", null, H.el("h3", null, "Modifiées dernièrement"), H.el("ul.liste-sources", null, recents.map((p) => H.el("li", null, H.el("a", { href: "#carnet/" + p.id }, p.titre || "Sans titre"), H.el("span.discret", null, " · " + new Date(p.modifieLe).toLocaleDateString("fr-FR")))))) : null);
  }

  let derniers = [];
  function dessiner(params) {
    if (!conteneur) return;
    derniers = params || [];
    fermerMenu();
    const [a, b] = derniers;
    let corps;
    if (a === "etiquette" && b) { actuelle = null; corps = vueEtiquette(b); }
    else if (a === "corbeille") { actuelle = null; corps = vueCorbeille(); }
    else if (a && page(a) && !page(a).supprime) corps = dessinerPage(page(a));
    else { actuelle = null; corps = accueil(); }
    conteneur.replaceChildren(H.el("div.carnet", null, colonne(), H.el("div.contenu-carnet", null, corps)));
  }

  // --- la note rapide : de partout, en un geste (l'icône carnet dans le coin de l'écran, ou Ctrl J),
  // pour noter avant d'oublier, même les mains pleines de terre (le micro du clavier marche aussi).
  // Chaque note va en haut de la page « Notes rapides », sous sa date ; on la range plus tard.
  const ID_NOTES = "page-notes-rapides";
  function noteRapide() {
    if (!H.jeu || H.$(".note-rapide")) return;
    const champ = H.el("textarea", { rows: 5, placeholder: "Ce qu’il ne faut pas oublier…" });
    let fermer;
    const garderNote = (e) => {
      if (e) e.preventDefault();
      const t = champ.value.trim();
      if (!t) return fermer();
      const avant = page(ID_NOTES), maintenant = H.maintenant();
      const quand = new Date().toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
      const p = Object.assign({ id: ID_NOTES, parent: null, etiquettes: [], creeLe: maintenant }, avant, { titre: (avant && avant.titre) || "Notes rapides", supprime: false,
        blocs: [bloc("h3", quand)].concat(t.split(/\n+/).map((l) => bloc("p", l)), avant && avant.supprime ? [] : (avant && avant.blocs) || []) });
      garder(p);
      fermer();
      H.toast("Noté dans le carnet, page « Notes rapides ».");
    };
    champ.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) garderNote(e); });
    const corps = H.el("form.note-rapide", { onsubmit: garderNote },
      H.el("h2", null, "Note rapide"),
      champ,
      H.el("div.boutons-bas", null,
        H.el("a.bouton.discret-bouton", { href: "#carnet/" + ID_NOTES, onclick: () => fermer() }, "Voir les notes"),
        H.el("button.bouton", { type: "submit" }, "Garder")));
    fermer = H.fenetre(corps, { classe: "petite" });
    setTimeout(() => champ.focus(), 0);
  }
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === "j" && H.jeu) { e.preventDefault(); noteRapide(); } });

  H.carnet = { citations, sectionCitees, chercherPartout, estFavori, basculerFavori, indexEtiquettes, rendre, noteRapide };
  H.vues.carnet = {
    afficher(c, params) { conteneur = c; dessiner(params); },
    mettreAJour(params) { if (aEnregistrer) { garder(aEnregistrer); aEnregistrer = null; } dessiner(params); },
    quitter() { if (aEnregistrer) { garder(aEnregistrer); aEnregistrer = null; } fermerMenu(); conteneur = null; actuelle = null; },
  };
})();
