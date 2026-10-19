// Les devis et les factures d'ƟvƟ, paysagiste : tout se règle (son entreprise, ses mentions, sa
// numérotation, ses taux de TVA, son catalogue de prix, ses clients), et chaque document part en
// PDF dans un modèle qu'iel choisit et personnalise (couleur, police, logo, colonnes, textes).
// Un devis se remplit d'un clic avec les plantes d'un jardin, et devient une facture.
// Gardé dans la partie (H.jeu.entreprise, .clients, .catalogue, .documents), synchronisé.
(function () {
  const H = window.H;
  const JOUR = 864e5;

  // --- les réglages de l'entreprise, avec des valeurs de départ raisonnables -------------------
  const DEFAUT = {
    nom: "", representant: "", statut: "Entrepreneur individuel (micro-entreprise)", adresse: "", telephone: "", email: "", site: "",
    siret: "", ape: "", rcs: "", tvaIntra: "", assurance: "",
    iban: "", bic: "", banque: "",
    franchiseTVA: true, mentionTVA: "TVA non applicable, art. 293 B du CGI", tvaDefaut: 20, taux: "0, 5.5, 10, 20",
    validite: 30, delaiPaiement: 30, acompte: 30,
    conditions: "Paiement par virement à réception de facture.",
    penalites: "En cas de retard de paiement, pénalités au taux de trois fois le taux d’intérêt légal, et indemnité forfaitaire pour frais de recouvrement de 40 €.",
    accord: "Bon pour accord — date et signature, précédées de la mention « Lu et approuvé » :",
    pied: "",
    formatDevis: "D-{AAAA}-{N3}", formatFacture: "F-{AAAA}-{N3}", compteurs: {},
    modele: "classique", couleur: "#2f6b35", police: "serif", logo: null, logoPlace: "gauche",
    colonnes: { unite: true, tva: true, remise: false, detail: true },
    titreDevis: "Devis", titreFacture: "Facture",
  };
  const MODELES = [["classique", "Classique", "sobre, un filet de couleur, les totaux encadrés"], ["herbier", "Herbier", "comme une planche d’herbier : un cadre fin, le titre manuscrit, une étiquette pour le client"], ["moderne", "Moderne", "un grand bandeau de couleur en haut, les lignes alternées"]];
  const POLICES = [["serif", "Caudex (avec empattements)", "Caudex, Georgia, serif"], ["sans", "Sans empattements", "'Helvetica Neue', Arial, sans-serif"], ["manuscrite", "Titres manuscrits (Beth Ellen)", "Caudex, Georgia, serif"], ["machine", "Machine à écrire", "'Courier New', monospace"]];
  const STATUTS = { devis: ["Brouillon", "Envoyé", "Accepté", "Refusé"], facture: ["Brouillon", "Envoyée", "Payée", "En retard"] };

  const ent = () => Object.assign({}, DEFAUT, H.jeu.entreprise || {}, { colonnes: Object.assign({}, DEFAUT.colonnes, (H.jeu.entreprise || {}).colonnes) });
  function majEnt(fn) {
    const e = ent();
    fn(e);
    H.jeu.entreprise = e;
    H.jeu.entrepriseModifieLe = H.maintenant();
    H.d.changer("jeu");
  }
  const coll = (cle) => Object.values(H.jeu[cle] || {}).filter((x) => x && !x.supprime);
  function garder(cle, x) {
    x.modifieLe = H.maintenant();
    H.jeu[cle] = Object.assign({}, H.jeu[cle], { [x.id]: x });
    H.d.changer("jeu");
  }
  const euros = (n) => (Math.round((n || 0) * 100) / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  const nombre = (v) => { const n = parseFloat(String(v == null ? "" : v).replace(",", ".").replace(/\s/g, "")); return isNaN(n) ? 0 : n; };
  const dateFr = (t) => (t ? new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "");
  const versInput = (t) => (t ? new Date(t - new Date(t).getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : "");
  const depuisInput = (v) => (v ? +new Date(v + "T12:00") : null);
  const echapper = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const tauxListe = () => ent().taux.split(/[;,]\s*(?=\d)|\s+/).map(nombre).filter((n, i, l) => l.indexOf(n) === i);

  // la numérotation : {AAAA} l'année, {MM} le mois, {N} le numéro, {N3} sur trois chiffres
  function numero(type) {
    const e = ent(), annee = new Date().getFullYear(), cle = type + annee;
    const n = (e.compteurs[cle] || 0) + 1;
    majEnt((x) => (x.compteurs = Object.assign({}, x.compteurs, { [cle]: n })));
    return (type === "devis" ? e.formatDevis : e.formatFacture)
      .replace("{AAAA}", annee).replace("{AA}", String(annee).slice(2)).replace("{MM}", String(new Date().getMonth() + 1).padStart(2, "0"))
      .replace(/\{N(\d)?\}/, (m, k) => String(n).padStart(+(k || 1), "0"));
  }

  // les totaux : par taux de TVA, la remise globale, l'acompte
  function totaux(doc) {
    const e = ent(), parTaux = {};
    let ht = 0;
    for (const l of doc.lignes || []) {
      if (l.type === "titre") continue;
      const montant = nombre(l.quantite) * nombre(l.prix) * (1 - nombre(l.remise) / 100);
      ht += montant;
      const t = e.franchiseTVA ? 0 : nombre(l.tva);
      parTaux[t] = (parTaux[t] || 0) + montant;
    }
    const k = 1 - nombre(doc.remise) / 100, remise = ht * (1 - k);
    let tva = 0;
    const lignesTva = Object.entries(parTaux).filter(([t]) => +t > 0).map(([t, base]) => { const v = base * k * (+t / 100); tva += v; return [+t, base * k, v]; });
    const ttc = ht - remise + tva, acompte = ttc * nombre(doc.acompte) / 100;
    return { ht, remise, htNet: ht - remise, lignesTva, tva, ttc, acompte, reste: ttc - acompte - nombre(doc.dejaPaye) };
  }

  // --- le PDF : une page HTML dans le modèle choisi, imprimée (« Enregistrer en PDF ») ---------
  function pageImprimable(doc) {
    const e = ent(), c = coll("clients").find((x) => x.id === doc.client) || {}, T = totaux(doc), col = e.colonnes;
    const facture = doc.type === "facture", modele = doc.modele || e.modele, couleur = e.couleur || "#2f6b35";
    const police = (POLICES.find((p) => p[0] === e.police) || POLICES[0])[2];
    const titreF = e.police === "manuscrite" || modele === "herbier" ? "'Beth Ellen', cursive" : police;
    const base = location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    const tva = !e.franchiseTVA && col.tva;
    const tetes = ["Désignation"].concat(col.unite ? ["Qté", "Unité"] : ["Qté"], ["Prix unit. HT"], col.remise ? ["Remise"] : [], tva ? ["TVA"] : [], ["Total HT"]);
    const lignes = (doc.lignes || []).map((l, i) => {
      if (l.type === "titre") return '<tr class="titre"><td colspan="' + tetes.length + '">' + echapper(l.designation) + "</td></tr>";
      const montant = nombre(l.quantite) * nombre(l.prix) * (1 - nombre(l.remise) / 100);
      return "<tr" + (i % 2 ? ' class="alt"' : "") + "><td>" + echapper(l.designation) + (col.detail && l.detail ? '<div class="detail">' + echapper(l.detail) + "</div>" : "") + "</td>" +
        '<td class="n">' + nombre(l.quantite).toLocaleString("fr-FR") + "</td>" + (col.unite ? "<td>" + echapper(l.unite || "") + "</td>" : "") +
        '<td class="n">' + euros(l.prix) + "</td>" + (col.remise ? '<td class="n">' + (nombre(l.remise) ? nombre(l.remise) + " %" : "") + "</td>" : "") +
        (tva ? '<td class="n">' + nombre(l.tva).toLocaleString("fr-FR") + " %</td>" : "") + '<td class="n">' + euros(montant) + "</td></tr>";
    }).join("");
    const ligneTot = (n, v, fort) => "<tr" + (fort ? ' class="fort"' : "") + "><td>" + n + '</td><td class="n">' + v + "</td></tr>";
    const tot = [ligneTot("Total HT", euros(T.ht))]
      .concat(T.remise ? [ligneTot("Remise " + nombre(doc.remise) + " %", "− " + euros(T.remise)), ligneTot("Total HT après remise", euros(T.htNet))] : [])
      .concat(e.franchiseTVA ? [] : T.lignesTva.map(([t, b, v]) => ligneTot("TVA " + t.toLocaleString("fr-FR") + " % (sur " + euros(b) + ")", euros(v))))
      .concat([ligneTot(e.franchiseTVA ? "Total à payer" : "Total TTC", euros(T.ttc), true)])
      .concat(nombre(doc.acompte) ? [ligneTot((facture ? "Acompte versé" : "Acompte à la commande") + " (" + nombre(doc.acompte) + " %)", euros(T.acompte)), ligneTot(facture ? "Reste à payer" : "Solde à la fin des travaux", euros(T.reste), true)] : []).join("");
    const emetteur = [e.nom ? "<strong>" + echapper(e.nom) + "</strong>" : "", e.representant, e.statut, e.adresse, e.telephone, e.email, e.site].filter(Boolean).map((x) => (x.startsWith("<") ? x : echapper(x).replace(/\n/g, "<br>"))).join("<br>");
    const legal = [e.siret ? "SIRET " + e.siret : "", e.ape ? "APE " + e.ape : "", e.rcs, e.tvaIntra && !e.franchiseTVA ? "TVA intracommunautaire " + e.tvaIntra : ""].filter(Boolean).map(echapper).join(" · ");
    const echeance = facture ? (doc.echeance ? "Échéance : " + dateFr(doc.echeance) : "") : (doc.echeance ? "Valable jusqu’au " + dateFr(doc.echeance) : "");
    const css = `
      @font-face { font-family: "Caudex"; src: url("${base}fonts/caudex-regular.woff2") format("woff2"); }
      @font-face { font-family: "Caudex"; font-weight: 700; src: url("${base}fonts/caudex-bold.woff2") format("woff2"); }
      @font-face { font-family: "Beth Ellen"; src: url("${base}fonts/beth-ellen.woff2") format("woff2"); }
      @page { size: A4; margin: 16mm 14mm 18mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #23214a; font: 10.5pt/1.45 ${police}; }
      .haut { display: flex; justify-content: space-between; gap: 20px; align-items: flex-start; ${e.logoPlace === "droite" ? "flex-direction: row-reverse;" : ""} }
      .logo { max-height: 70px; max-width: 200px; }
      .emetteur { font-size: 9.5pt; }
      h1 { font: 400 26pt/1.1 ${titreF}; color: ${couleur}; margin: 18px 0 2px; }
      .num { font-size: 10pt; margin-bottom: 14px; }
      .bloc-client { margin-left: auto; width: 46%; padding: 10px 14px; border: 1px solid ${couleur}; border-radius: 3px; }
      .objet { margin: 14px 0 10px; }
      table { width: 100%; border-collapse: collapse; }
      .lignes th { text-align: left; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .04em; color: ${couleur}; border-bottom: 1.5px solid ${couleur}; padding: 6px 6px; }
      .lignes td { padding: 6px; border-bottom: 1px solid #23214a22; vertical-align: top; }
      .lignes .titre td { font-weight: 700; color: ${couleur}; padding-top: 12px; border-bottom: 0; }
      .n { text-align: right; white-space: nowrap; }
      .detail { font-size: 8.5pt; opacity: .75; }
      .totaux { width: 46%; margin: 14px 0 0 auto; }
      .totaux td { padding: 4px 8px; }
      .totaux .fort td { font-weight: 700; border-top: 1.5px solid ${couleur}; font-size: 11.5pt; }
      .mentions { margin-top: 22px; font-size: 8.5pt; }
      .accord { margin-top: 18px; padding: 10px 12px 46px; border: 1px dashed #23214a66; width: 56%; font-size: 9pt; }
      .pied { position: fixed; bottom: -10mm; left: 0; right: 0; text-align: center; font-size: 7.5pt; opacity: .75; }
      ${modele === "herbier" ? `body { padding: 6mm; } .cadre { border: 1px solid ${couleur}; padding: 8mm; min-height: 250mm; position: relative; }
        .bloc-client { background: #f3ead8; border: 1px solid #8a6a3c; border-radius: 0; box-shadow: 2px 2px 0 #8a6a3c55; }
        .lignes th { border-bottom: 1px solid ${couleur}; } .totaux .fort td { border-top: 1px solid ${couleur}; }` : ""}
      ${modele === "moderne" ? `.bandeau { background: ${couleur}; color: #fff; margin: -16mm -14mm 14px; padding: 14mm 14mm 10mm; }
        .bandeau h1 { color: #fff; margin-top: 0; } .bandeau .emetteur, .bandeau .num { color: #fff; }
        .lignes th { background: ${couleur}; color: #fff; border: 0; } .lignes tr.alt td { background: ${couleur}11; }
        .bloc-client { border: 0; background: ${couleur}11; }` : ""}
    `;
    const logo = e.logo ? '<img class="logo" src="' + e.logo + '" alt="">' : "";
    const entete = '<div class="haut">' + (logo ? "<div>" + logo + "</div>" : "") + '<div class="emetteur">' + emetteur + "</div></div>";
    const titre = "<h1>" + echapper(facture ? e.titreFacture : e.titreDevis) + '</h1><div class="num">N° ' + echapper(doc.numero) + " · " + dateFr(doc.date) + (echeance ? " · " + echeance : "") + "</div>";
    const corps = (modele === "moderne" ? '<div class="bandeau">' + entete + titre + "</div>" : entete + titre) +
      '<div class="bloc-client"><strong>' + echapper(c.nom || "") + "</strong><br>" + echapper(c.adresse || "").replace(/\n/g, "<br>") + (c.email ? "<br>" + echapper(c.email) : "") + (c.telephone ? "<br>" + echapper(c.telephone) : "") + "</div>" +
      (doc.objet ? '<div class="objet"><strong>Objet :</strong> ' + echapper(doc.objet) + "</div>" : "") +
      '<table class="lignes"><thead><tr>' + tetes.map((t, i) => "<th" + (i && t !== "Unité" ? ' class="n"' : "") + ">" + t + "</th>").join("") + "</tr></thead><tbody>" + lignes + "</tbody></table>" +
      '<table class="totaux">' + tot + "</table>" +
      '<div class="mentions">' + [e.franchiseTVA ? e.mentionTVA : "", doc.notes, facture ? e.conditions : "", facture && e.delaiPaiement ? "Paiement à " + e.delaiPaiement + " jours." : "", facture ? e.penalites : "", e.assurance, e.iban ? "IBAN " + e.iban + (e.bic ? " · BIC " + e.bic : "") + (e.banque ? " · " + e.banque : "") : ""].filter(Boolean).map((x) => "<p>" + echapper(x).replace(/\n/g, "<br>") + "</p>").join("") + "</div>" +
      (!facture && e.accord ? '<div class="accord">' + echapper(e.accord) + "</div>" : "") +
      '<div class="pied">' + [legal, echapper(e.pied)].filter(Boolean).join("<br>") + "</div>";
    return "<!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><title>" + echapper((facture ? e.titreFacture : e.titreDevis) + " " + doc.numero) + "</title><style>" + css + "</style></head><body>" + (modele === "herbier" ? '<div class="cadre">' + corps + "</div>" : corps) + "</body></html>";
  }
  function imprimer(doc) {
    const f = H.el("iframe", { style: { position: "fixed", width: "0", height: "0", border: "0", right: "0", bottom: "0" }, "aria-hidden": "true" });
    document.body.appendChild(f);
    f.contentDocument.open();
    f.contentDocument.write(pageImprimable(doc));
    f.contentDocument.close();
    // (les polices et le logo d'abord, puis la fenêtre d'impression : « Enregistrer en PDF »)
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60e3); }, 700);
  }
  function apercu(doc) {
    const f = H.el("iframe.apercu-devis", { title: "Aperçu" });
    const fermer = H.fenetre(H.el("div.fenetre-apercu", null, f, H.el("div.boutons-bas", null, H.el("button.bouton", { type: "button", onclick: () => imprimer(doc) }, "Enregistrer en PDF ou imprimer"))), { classe: "large" });
    setTimeout(() => { f.contentDocument.open(); f.contentDocument.write(pageImprimable(doc)); f.contentDocument.close(); }, 0);
    return fermer;
  }

  // --- l'éditeur d'un document -------------------------------------------------------------
  let conteneur = null, ouvert = null, onglet = null;
  function nouveau(type, depuis) {
    const e = ent(), t = H.maintenant();
    const doc = Object.assign({ id: H.uid(type), type, numero: numero(type), date: t, client: null, objet: "", lignes: [], remise: 0, acompte: type === "devis" ? e.acompte : 0, notes: "", statut: STATUTS[type][0], creeLe: t },
      depuis ? { client: depuis.client, objet: depuis.objet, lignes: JSON.parse(JSON.stringify(depuis.lignes || [])), remise: depuis.remise, acompte: depuis.acompte, notes: depuis.notes, devis: depuis.id, jardin: depuis.jardin } : {});
    doc.echeance = t + (type === "devis" ? e.validite : e.delaiPaiement) * JOUR;
    garder("documents", doc);
    ouvert = doc.id;
    dessiner();
  }
  function editeur(doc) {
    const e = ent(), sauver = () => garder("documents", doc);
    const tauxOptions = tauxListe();
    const champ = (nom, el) => H.el("label.champ-devis", null, H.el("span", null, nom), el);
    const input = (cle, attrs, conv) => H.el("input", Object.assign({ value: doc[cle] == null ? "" : doc[cle], onchange: (ev) => { doc[cle] = conv ? conv(ev.target.value) : ev.target.value; sauver(); majTotaux(); } }, attrs));
    const clients = coll("clients");
    const choixClient = H.el("select", { onchange: (ev) => { if (ev.target.value === "+") return nouveauClient((c) => { doc.client = c.id; sauver(); dessiner(); }); doc.client = ev.target.value || null; sauver(); } },
      H.el("option", { value: "" }, "— Choisir —"), clients.map((c) => H.el("option", { value: c.id, selected: doc.client === c.id }, c.nom)), H.el("option", { value: "+" }, "+ Nouveau client…"));
    const totauxZone = H.el("div.totaux-devis");
    function majTotaux() {
      const T = totaux(doc);
      totauxZone.replaceChildren(H.el("table", null,
        [["Total HT", euros(T.ht)]].concat(T.remise ? [["Remise", "− " + euros(T.remise)]] : [], e.franchiseTVA ? [] : T.lignesTva.map(([t, b, v]) => ["TVA " + t + " %", euros(v)]), [[e.franchiseTVA ? "Total" : "Total TTC", euros(T.ttc)]], nombre(doc.acompte) ? [["Acompte " + nombre(doc.acompte) + " %", euros(T.acompte)], ["Reste", euros(T.reste)]] : [])
          .map(([n, v], i, l) => H.el("tr" + (i === l.length - 1 || n.startsWith("Total T") ? ".fort" : ""), null, H.el("td", null, n), H.el("td.n", null, v)))));
    }
    const lignesZone = H.el("div.lignes-devis");
    function dessinerLignes() {
      lignesZone.replaceChildren(...(doc.lignes || []).map((l, i) => {
        const maj = (cle, conv) => (ev) => { l[cle] = conv ? conv(ev.target.value) : ev.target.value; sauver(); majTotaux(); };
        const bouger = (d) => { const j = i + d; if (j < 0 || j >= doc.lignes.length) return; [doc.lignes[i], doc.lignes[j]] = [doc.lignes[j], doc.lignes[i]]; sauver(); dessinerLignes(); };
        const outils = H.el("span.outils-ligne", null,
          H.el("button.bouton.petit.discret-bouton", { type: "button", title: "Monter", onclick: () => bouger(-1) }, "↑"),
          H.el("button.bouton.petit.discret-bouton", { type: "button", title: "Descendre", onclick: () => bouger(1) }, "↓"),
          H.el("button.bouton.petit.discret-bouton", { type: "button", title: "Retirer", onclick: () => { doc.lignes.splice(i, 1); sauver(); dessinerLignes(); majTotaux(); } }, "×"));
        if (l.type === "titre") return H.el("div.ligne-devis.titre-devis", null, H.el("input", { value: l.designation || "", placeholder: "Titre de partie (Plantes, Main d’œuvre…)", onchange: maj("designation") }), outils);
        return H.el("div.ligne-devis", null,
          H.el("div.designation", null,
            H.el("input", { value: l.designation || "", placeholder: "Désignation", onchange: maj("designation") }),
            e.colonnes.detail ? H.el("input.detail", { value: l.detail || "", placeholder: "Détail (taille du pot, variété…)", onchange: maj("detail") }) : null),
          H.el("input.n", { value: l.quantite == null ? 1 : l.quantite, inputmode: "decimal", "aria-label": "Quantité", onchange: maj("quantite", nombre) }),
          H.el("input.u", { value: l.unite || "", placeholder: "u.", "aria-label": "Unité", onchange: maj("unite") }),
          H.el("input.n", { value: l.prix == null ? "" : l.prix, inputmode: "decimal", placeholder: "Prix HT", "aria-label": "Prix unitaire HT", onchange: maj("prix", nombre) }),
          e.colonnes.remise ? H.el("input.n", { value: l.remise || "", inputmode: "decimal", placeholder: "Rem. %", onchange: maj("remise", nombre) }) : null,
          !e.franchiseTVA ? H.el("select", { onchange: maj("tva", nombre) }, tauxOptions.map((t) => H.el("option", { value: t, selected: nombre(l.tva) === t }, t + " %"))) : null,
          outils);
      }));
    }
    const ajouter = (l) => { doc.lignes = (doc.lignes || []).concat(l); sauver(); dessinerLignes(); majTotaux(); };
    const ligneVide = () => ({ designation: "", quantite: 1, unite: "u.", prix: 0, tva: ent().tvaDefaut });
    // depuis le catalogue
    const catalogue = coll("catalogue");
    const choixCatalogue = H.el("select", { onchange: (ev) => { const a = catalogue.find((x) => x.id === ev.target.value); if (a) ajouter({ designation: a.designation, detail: a.detail || "", quantite: 1, unite: a.unite, prix: a.prix, tva: a.tva == null ? ent().tvaDefaut : a.tva }); ev.target.value = ""; } },
      H.el("option", { value: "" }, "+ Depuis mes prix…"), catalogue.map((a) => H.el("option", { value: a.id }, a.designation + " — " + euros(a.prix))));
    // depuis un jardin : une ligne par plante, avec le prix noté dans le catalogue
    const iles = Object.values(H.jeu.iles || {}).filter((i) => i && !i.supprime);
    const choixJardin = H.el("select", { onchange: (ev) => { const ile = (H.jeu.iles || {})[ev.target.value]; ev.target.value = ""; if (ile) remplirDepuis(ile); } },
      H.el("option", { value: "" }, "+ Les plantes d’un jardin…"), iles.map((i) => H.el("option", { value: i.id }, i.nom)));
    function remplirDepuis(ile) {
      const compte = {};
      for (const pl of Object.values(ile.plantes || {})) compte[pl.p] = (compte[pl.p] || 0) + 1;
      const lignes = [{ type: "titre", designation: "Plantes — " + ile.nom }];
      for (const [id, n] of Object.entries(compte).sort((a, b) => b[1] - a[1])) {
        const p = H.d.plante(id), a = catalogue.find((x) => x.plante === id);
        lignes.push({ designation: p ? p.nom + (p.latin ? " (" + p.latin.split(",")[0] + ")" : "") : id, detail: a ? a.detail || "" : "", quantite: n, unite: a ? a.unite : "u.", prix: a ? a.prix : 0, tva: a && a.tva != null ? a.tva : ent().tvaDefaut });
      }
      doc.jardin = ile.id;
      if (!doc.objet) doc.objet = "Plantation du jardin « " + ile.nom + " »";
      ajouter(lignes);
      dessiner();
    }
    dessinerLignes();
    majTotaux();
    const statut = H.el("select", { onchange: (ev) => { doc.statut = ev.target.value; sauver(); } }, STATUTS[doc.type].map((s) => H.el("option", { selected: doc.statut === s }, s)));
    const modele = H.el("select", { onchange: (ev) => { doc.modele = ev.target.value || null; sauver(); } }, H.el("option", { value: "" }, "Le modèle habituel"), MODELES.map(([id, n]) => H.el("option", { value: id, selected: doc.modele === id }, n)));
    const notes = H.el("textarea", { rows: 3, placeholder: "Conditions particulières, délais, remarques…", onchange: (ev) => { doc.notes = ev.target.value; sauver(); } });
    notes.value = doc.notes || "";
    return H.el("div.editeur-devis", null,
      H.el("p", null, H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { ouvert = null; dessiner(); } }, "‹ Tous les documents")),
      H.el("h2", null, (doc.type === "devis" ? e.titreDevis : e.titreFacture) + " " + doc.numero),
      H.el("div.grille-devis", null,
        champ("Numéro", input("numero")), champ("Date", input("date", { type: "date", value: versInput(doc.date) }, depuisInput)),
        champ(doc.type === "devis" ? "Valable jusqu’au" : "Échéance", input("echeance", { type: "date", value: versInput(doc.echeance) }, depuisInput)),
        champ("Client", choixClient), champ("Statut", statut), champ("Modèle", modele)),
      champ("Objet", input("objet", { placeholder: "Création d’un jardin sec, entretien annuel…" })),
      H.el("div.tete-lignes.discret", null, H.el("span", null, "Désignation"), H.el("span", null, "Qté"), H.el("span", null, "Unité"), H.el("span", null, "Prix HT"), e.colonnes.remise ? H.el("span", null, "Remise") : null, !e.franchiseTVA ? H.el("span", null, "TVA") : null),
      lignesZone,
      H.el("div.pastilles", null,
        H.el("button.bouton.petit", { type: "button", onclick: () => ajouter(ligneVide()) }, "+ Ligne"),
        H.el("button.bouton.petit", { type: "button", onclick: () => ajouter({ type: "titre", designation: "" }) }, "+ Titre de partie"),
        choixCatalogue, choixJardin),
      H.el("div.grille-devis", null,
        champ("Remise globale (%)", input("remise", { inputmode: "decimal" }, nombre)),
        champ(doc.type === "devis" ? "Acompte demandé (%)" : "Acompte déjà versé (%)", input("acompte", { inputmode: "decimal" }, nombre))),
      totauxZone,
      champ("Notes sur le document", notes),
      H.el("div.boutons-bas", null,
        H.el("button.bouton.discret-bouton", { type: "button", onclick: () => { if (confirm("Supprimer ce document ?")) { doc.supprime = true; sauver(); ouvert = null; dessiner(); } } }, "Supprimer"),
        H.el("button.bouton.petit", { type: "button", onclick: () => nouveau(doc.type, doc) }, "Dupliquer"),
        doc.type === "devis" ? H.el("button.bouton.petit", { type: "button", onclick: () => { doc.statut = "Accepté"; sauver(); nouveau("facture", doc); } }, "En faire une facture") : null,
        H.el("button.bouton.petit", { type: "button", onclick: () => apercu(doc) }, "Aperçu"),
        H.el("button.bouton", { type: "button", onclick: () => imprimer(doc) }, "PDF"))
    );
  }

  function nouveauClient(apres, c) {
    c = c ? Object.assign({}, c) : { id: H.uid("client"), creeLe: H.maintenant() };
    const champs = { nom: "Nom (ou raison sociale)", contact: "Personne à contacter", adresse: "Adresse", email: "E-mail", telephone: "Téléphone", notes: "Notes" };
    const inputs = {};
    let fermer;
    fermer = H.fenetre(H.el("form.formulaire", {
      onsubmit(ev) {
        ev.preventDefault();
        for (const k of Object.keys(champs)) c[k] = inputs[k].value.trim();
        if (!c.nom) return;
        garder("clients", c);
        fermer();
        apres && apres(c);
      },
    }, H.el("h2", null, "Client"), Object.entries(champs).map(([k, n]) => {
      inputs[k] = H.el(k === "adresse" || k === "notes" ? "textarea" : "input", { rows: 3 });
      inputs[k].value = c[k] || "";
      return H.el("label", null, n, inputs[k]);
    }), H.el("div.boutons-bas", null, H.el("button.bouton", { type: "submit" }, "Enregistrer"))));
  }

  // --- les onglets -------------------------------------------------------------------------
  function ongletDocuments() {
    const docs = coll("documents").sort((a, b) => (b.date || 0) - (a.date || 0));
    const nomClient = (id) => (coll("clients").find((c) => c.id === id) || {}).nom || "";
    const rangee = (d) => H.el("li.doc-devis", { onclick: () => { ouvert = d.id; dessiner(); } },
      H.el("span.type-doc." + d.type, null, d.type === "devis" ? "Devis" : "Facture"),
      H.el("strong", null, d.numero), H.el("span", null, nomClient(d.client) || H.el("em.discret", null, "sans client")),
      H.el("span.discret", null, d.objet || ""), H.el("span.n", null, euros(totaux(d).ttc)), H.el("span.statut-doc", null, d.statut || ""));
    return H.el("div", null,
      H.el("div.pastilles", null,
        H.el("button.bouton", { type: "button", onclick: () => nouveau("devis") }, "Nouveau devis"),
        H.el("button.bouton", { type: "button", onclick: () => nouveau("facture") }, "Nouvelle facture")),
      !ent().nom ? H.el("p.discret", null, "Commence par « Mon entreprise » : ton nom, ton adresse, ton SIRET… ils apparaîtront sur chaque document.") : null,
      docs.length ? H.el("ul.liste-docs", null, docs.map(rangee)) : H.el("p.discret", null, "Pas encore de devis ni de facture."));
  }
  function ongletClients() {
    const zone = H.el("div");
    const liste = () => zone.replaceChildren(
      H.el("button.bouton", { type: "button", onclick: () => nouveauClient(() => liste()) }, "Nouveau client"),
      H.el("ul.liste-docs", null, coll("clients").sort((a, b) => a.nom.localeCompare(b.nom)).map((c) => H.el("li.doc-devis", { onclick: () => nouveauClient(() => liste(), c) },
        H.el("strong", null, c.nom), H.el("span.discret", null, (c.adresse || "").split("\n").join(", ")), H.el("span.discret", null, c.email || ""),
        H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: (ev) => { ev.stopPropagation(); if (confirm("Supprimer " + c.nom + " ?")) { c.supprime = true; garder("clients", c); liste(); } } }, "×")))));
    liste();
    return zone;
  }
  function ongletCatalogue() {
    const zone = H.el("div");
    const e = ent();
    const liste = () => zone.replaceChildren(
      H.el("p.discret", null, "Tes prix habituels : plantes (avec la taille du pot), fournitures, main-d’œuvre à l’heure, déplacements… Une ligne reliée à une plante sert à remplir un devis depuis un jardin."),
      H.el("div.pastilles", null,
        H.el("button.bouton", { type: "button", onclick: () => article() }, "Nouveau prix"),
        H.el("button.bouton.petit", { type: "button", onclick: () => H.choisirPlantes([], (ids) => { for (const id of ids) { const p = H.d.plante(id); if (p && !coll("catalogue").some((a) => a.plante === id)) garder("catalogue", { id: H.uid("prix"), designation: p.nom, plante: id, unite: "u.", prix: 0, tva: e.tvaDefaut, categorie: "Plantes" }); } liste(); }, "Ajouter des plantes à mes prix") }, "+ Des plantes")),
      H.el("ul.liste-docs", null, coll("catalogue").sort((a, b) => (a.categorie || "").localeCompare(b.categorie || "") || a.designation.localeCompare(b.designation)).map((a) => H.el("li.doc-devis", { onclick: () => article(a) },
        H.el("span.discret", null, a.categorie || ""), H.el("strong", null, a.designation), H.el("span.discret", null, a.detail || ""), H.el("span.n", null, euros(a.prix) + " / " + (a.unite || "u.")),
        H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: (ev) => { ev.stopPropagation(); a.supprime = true; garder("catalogue", a); liste(); } }, "×")))));
    function article(a) {
      a = a ? Object.assign({}, a) : { id: H.uid("prix"), unite: "u.", tva: e.tvaDefaut, categorie: "" };
      const f = { designation: H.el("input", { value: a.designation || "", required: true }), detail: H.el("input", { value: a.detail || "", placeholder: "Pot de 2 L, godet…" }), categorie: H.el("input", { value: a.categorie || "", placeholder: "Plantes, Fournitures, Main d’œuvre…" }),
        unite: H.el("input", { value: a.unite || "" }), prix: H.el("input", { value: a.prix == null ? "" : a.prix, inputmode: "decimal" }), tva: H.el("select", null, tauxListe().map((t) => H.el("option", { value: t, selected: nombre(a.tva) === t }, t + " %"))) };
      let fermer;
      fermer = H.fenetre(H.el("form.formulaire", {
        onsubmit(ev) { ev.preventDefault(); Object.assign(a, { designation: f.designation.value.trim(), detail: f.detail.value.trim(), categorie: f.categorie.value.trim(), unite: f.unite.value.trim(), prix: nombre(f.prix.value), tva: nombre(f.tva.value) }); if (!a.designation) return; garder("catalogue", a); fermer(); liste(); },
      }, H.el("h2", null, "Un prix"), H.el("label", null, "Désignation", f.designation), H.el("label", null, "Détail", f.detail), H.el("label", null, "Catégorie", f.categorie),
        H.el("div.ligne-option", null, H.el("label", null, "Unité ", f.unite), H.el("label", null, "Prix HT ", f.prix), ent().franchiseTVA ? null : H.el("label", null, "TVA ", f.tva)),
        H.el("div.boutons-bas", null, H.el("button.bouton", { type: "submit" }, "Enregistrer"))));
    }
    liste();
    return zone;
  }
  // mon entreprise : chaque champ s'enregistre dès qu'on le quitte
  function ongletEntreprise() {
    const e = ent();
    const texte = (cle, nom, opts) => {
      const el = H.el(opts && opts.long ? "textarea" : "input", Object.assign({ rows: 3, onchange: (ev) => majEnt((x) => (x[cle] = opts && opts.nombre ? nombre(ev.target.value) : ev.target.value)) }, opts && opts.attrs));
      el.value = e[cle] == null ? "" : e[cle];
      return H.el("label.champ-devis", null, H.el("span", null, nom), el, opts && opts.aide ? H.el("small.discret", null, opts.aide) : null);
    };
    const coche = (cle, nom, apres) => H.el("label.case", null, H.el("input", { type: "checkbox", checked: !!e[cle], onchange: (ev) => { majEnt((x) => (x[cle] = ev.target.checked)); if (apres) apres(); } }), " " + nom);
    return H.el("div.reglages-devis", null,
      H.el("h3", null, "Qui je suis"),
      texte("nom", "Nom commercial"), texte("representant", "Nom et prénom"), texte("statut", "Statut juridique"), texte("adresse", "Adresse", { long: true }),
      texte("telephone", "Téléphone"), texte("email", "E-mail"), texte("site", "Site"),
      H.el("h3", null, "Mentions légales"),
      texte("siret", "SIRET"), texte("ape", "Code APE"), texte("rcs", "RCS ou RM (si inscrit·e)"), texte("assurance", "Assurance professionnelle", { long: true, aide: "Nom de l’assureur et zone couverte, si tu en as une (obligatoire pour certains travaux)." }),
      H.el("h3", null, "TVA"),
      coche("franchiseTVA", "Je ne facture pas la TVA (franchise en base)", () => dessiner()),
      texte("mentionTVA", "Mention à la place de la TVA"), texte("tvaIntra", "N° de TVA intracommunautaire"), texte("tvaDefaut", "Taux par défaut (%)", { nombre: true }), texte("taux", "Taux proposés (%)", { aide: "Séparés par des virgules : 0, 5.5, 10, 20" }),
      H.el("h3", null, "Paiement"),
      texte("conditions", "Conditions de paiement", { long: true }), texte("delaiPaiement", "Délai de paiement (jours)", { nombre: true }), texte("penalites", "Pénalités de retard", { long: true }),
      texte("iban", "IBAN"), texte("bic", "BIC"), texte("banque", "Banque"),
      H.el("h3", null, "Devis"),
      texte("validite", "Durée de validité (jours)", { nombre: true }), texte("acompte", "Acompte proposé (%)", { nombre: true }), texte("accord", "Texte de l’accord du client", { long: true }),
      H.el("h3", null, "Numérotation"),
      texte("formatDevis", "Numéros des devis", { aide: "{AAAA} l’année, {AA} sur deux chiffres, {MM} le mois, {N3} le numéro sur trois chiffres" }), texte("formatFacture", "Numéros des factures"),
      texte("titreDevis", "Titre des devis"), texte("titreFacture", "Titre des factures"),
      H.el("h3", null, "Pied de page"),
      texte("pied", "Texte libre en bas de chaque page", { long: true })
    );
  }
  // les modèles : l'allure des PDF, avec un aperçu sur un document d'exemple
  function ongletModeles() {
    const e = ent();
    const apercuF = H.el("iframe.apercu-devis.petit", { title: "Aperçu du modèle" });
    const exemple = { type: "devis", numero: "D-2026-001", date: Date.now(), echeance: Date.now() + 30 * JOUR, objet: "Création d’un jardin sec méditerranéen", remise: 0, acompte: e.acompte,
      lignes: [{ type: "titre", designation: "Plantes" }, { designation: "Lavande vraie (Lavandula angustifolia)", detail: "Pot de 1 L", quantite: 12, unite: "u.", prix: 6.5, tva: 10 }, { designation: "Romarin (Salvia rosmarinus)", detail: "Pot de 2 L", quantite: 6, unite: "u.", prix: 9, tva: 10 },
        { type: "titre", designation: "Main d’œuvre" }, { designation: "Préparation du sol et plantation", quantite: 7, unite: "h", prix: 45, tva: 20 }], client: null };
    const rafraichir = () => { apercuF.contentDocument.open(); apercuF.contentDocument.write(pageImprimable(exemple)); apercuF.contentDocument.close(); };
    const choix = (cle, liste, apres) => H.el("div.pastilles", null, liste.map(([id, n, aide]) => H.el("button.bouton.petit" + (ent()[cle] === id ? ".actif" : ""), { type: "button", title: aide || "", onclick: (ev) => { majEnt((x) => (x[cle] = id)); ev.target.parentNode.querySelectorAll("button").forEach((b) => b.classList.toggle("actif", b === ev.target)); rafraichir(); if (apres) apres(); } }, n)));
    const colonne = (cle, nom) => H.el("label.case", null, H.el("input", { type: "checkbox", checked: !!e.colonnes[cle], onchange: (ev) => { majEnt((x) => (x.colonnes = Object.assign({}, x.colonnes, { [cle]: ev.target.checked }))); rafraichir(); } }), " " + nom);
    const logoBtn = H.el("button.bouton.petit", {
      type: "button",
      onclick: () => {
        const inp = H.el("input", { type: "file", accept: "image/*" });
        inp.onchange = async () => {
          const f = inp.files[0]; if (!f) return;
          const img = await createImageBitmap(f).catch(() => null); if (!img) return H.toast("Cette image ne s’ouvre pas");
          const k = Math.min(1, 600 / Math.max(img.width, img.height)), c = H.el("canvas", { width: Math.round(img.width * k), height: Math.round(img.height * k) });
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          majEnt((x) => (x.logo = c.toDataURL("image/png")));
          rafraichir();
        };
        inp.click();
      },
    }, e.logo ? "Changer le logo" : "Ajouter un logo");
    setTimeout(rafraichir, 0);
    return H.el("div.modeles-devis", null,
      H.el("h3", null, "Le modèle"), choix("modele", MODELES),
      H.el("h3", null, "La couleur"), H.el("input", { type: "color", value: e.couleur, onchange: (ev) => { majEnt((x) => (x.couleur = ev.target.value)); rafraichir(); } }),
      H.el("h3", null, "La police"), choix("police", POLICES),
      H.el("h3", null, "Le logo"), H.el("div.pastilles", null, logoBtn, e.logo ? H.el("button.bouton.petit.discret-bouton", { type: "button", onclick: () => { majEnt((x) => (x.logo = null)); rafraichir(); } }, "Retirer") : null),
      choix("logoPlace", [["gauche", "Logo à gauche"], ["droite", "Logo à droite"]]),
      H.el("h3", null, "Les colonnes"), H.el("div.pastilles", null, colonne("unite", "Unité"), colonne("detail", "Détail sous la désignation"), colonne("remise", "Remise par ligne"), colonne("tva", "TVA par ligne")),
      H.el("h3", null, "Aperçu"), apercuF);
  }

  function dessiner() {
    if (!conteneur) return;
    const doc = ouvert && (H.jeu.documents || {})[ouvert];
    if (doc && !doc.supprime) return conteneur.replaceChildren(editeur(doc));
    conteneur.replaceChildren(H.bureau.onglets([
      { nom: "Devis et factures", el: ongletDocuments() },
      { nom: "Clients", el: ongletClients() },
      { nom: "Mes prix", el: ongletCatalogue() },
      { nom: "Mon entreprise", el: ongletEntreprise() },
      { nom: "Modèles de PDF", el: ongletModeles() },
    ], { cle: "devis" }));
  }

  H.devis = { pageImprimable, totaux };
  H.vues.devis = {
    afficher(c) {
      conteneur = c;
      dessiner();
    },
    quitter() {
      conteneur = null;
    },
  };
})();
