// Les exports : toute liste du jeu (plantes de l'herbothèque ou d'une île, recettes, tâches,
// clients, prix, lignes d'un devis…) part au choix en texte (.txt), en tableau (.csv) ou en PDF,
// dans un style de PDF qu'ƟvƟ choisit (et que le jeu retient).
// Un document à exporter : { titre, sousTitre, nomFichier, sections: [{ titre, colonnes, lignes, paragraphes }] }
(function () {
  const H = window.H = window.H || {};

  const STYLES = [
    ["pixel", "Fenêtre (noir et blanc)", "pour les clients : la barre du haut et le cadre des fenêtres du jeu, en noir et blanc, dans une typographie sobre"],
    ["classique", "Classique", "sobre, un filet de couleur sous le titre, le tableau aéré"],
    ["herbier", "Herbier", "un cadre fin, le titre manuscrit, une étiquette kraft dans le coin, comme une planche d’herbier"],
    ["carnet", "Carnet de terrain", "du papier ligné avec sa marge rouge, comme un carnet de jardinier"],
    ["moderne", "Moderne", "un bandeau de couleur pleine, les lignes alternées"],
  ];
  const echapper = (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const propre = (v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v)).replace(/\*\*/g, "");
  const aujourdhui = () => new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  // --- en texte : le titre souligné, puis chaque section ; un tableau devient des fiches ----------
  function texte(doc) {
    const out = [doc.titre, "=".repeat(Math.min(60, String(doc.titre).length))];
    if (doc.sousTitre) out.push(doc.sousTitre);
    out.push("");
    for (const s of doc.sections || []) {
      if (s.titre) out.push(s.titre.toUpperCase(), "");
      for (const p of s.paragraphes || []) out.push(propre(p));
      if (s.paragraphes && s.paragraphes.length) out.push("");
      const cols = s.colonnes || [];
      for (const l of s.lignes || []) {
        if (cols.length <= 2) out.push("- " + l.map(propre).filter(Boolean).join(" : "));
        else {
          out.push("- " + propre(l[0]));
          l.slice(1).forEach((v, i) => { if (propre(v)) out.push("    " + cols[i + 1] + " : " + propre(v)); });
        }
      }
      if (s.lignes && s.lignes.length) out.push("");
    }
    return out.join("\n");
  }
  // --- en tableau : séparé par des points-virgules, lisible par Excel, Numbers et LibreOffice ---
  function csv(doc) {
    const cell = (v) => { v = propre(v); return /[";\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
    const tableaux = (doc.sections || []).filter((s) => s.lignes && s.lignes.length);
    const plusieurs = tableaux.length > 1, out = [];
    tableaux.forEach((s, k) => {
      if (k === 0 || !plusieurs || (s.colonnes || []).join() !== (tableaux[k - 1].colonnes || []).join()) {
        if (k) out.push("");
        out.push((plusieurs ? ["Partie"] : []).concat(s.colonnes || []).map(cell).join(";"));
      }
      for (const l of s.lignes) out.push((plusieurs ? [s.titre || ""] : []).concat(l).map(cell).join(";"));
    });
    if (!out.length) for (const s of doc.sections || []) for (const p of s.paragraphes || []) out.push(cell(p));
    return "﻿" + out.join("\n");
  }

  // --- en PDF : une page HTML dans le style choisi, imprimée (« Enregistrer en PDF ») ------------
  function pagePdf(doc, style, opts) {
    opts = opts || {};
    const base = opts.base || location.href.replace(/[#?].*$/, "").replace(/[^/]*$/, "");
    const large = Math.max(0, ...(doc.sections || []).map((s) => (s.colonnes || []).length)) > 7;
    const couleur = opts.couleur || ({ classique: "#2f6b35", herbier: "#4b3427", carnet: "#3d5ee8", pixel: "#000000", moderne: "#c93f6e" })[style] || "#2f6b35";
    const corps = (doc.sections || []).map((s) =>
      "<section>" + (s.titre ? "<h2>" + echapper(s.titre) + "</h2>" : "") +
      (s.paragraphes || []).map((p) => "<p>" + echapper(propre(p)).replace(/\n/g, "<br>") + "</p>").join("") +
      (s.lignes && s.lignes.length ? "<table><thead><tr>" + (s.colonnes || []).map((c) => "<th>" + echapper(c) + "</th>").join("") + "</tr></thead><tbody>" +
        s.lignes.map((l, i) => "<tr" + (i % 2 ? ' class="alt"' : "") + ">" + l.map((v, j) => "<td" + (j === 0 ? ' class="premier"' : "") + ">" + echapper(propre(v)) + "</td>").join("") + "</tr>").join("") + "</tbody></table>" : "") +
      "</section>").join("");
    const polices = `
      @font-face { font-family: "Caudex"; src: url("${base}fonts/caudex-regular.woff2") format("woff2"); }
      @font-face { font-family: "Caudex"; font-weight: 700; src: url("${base}fonts/caudex-bold.woff2") format("woff2"); }
      @font-face { font-family: "Caudex"; font-style: italic; src: url("${base}fonts/caudex-italic.woff2") format("woff2"); }
      @font-face { font-family: "Beth Ellen"; src: url("${base}fonts/beth-ellen.woff2") format("woff2"); }
      @font-face { font-family: "VT323"; src: url("${base}fonts/vt323.woff2") format("woff2"); }
      @font-face { font-family: "VT323"; src: url("${base}fonts/vt323-ext.woff2") format("woff2"); unicode-range: U+0100-024F, U+1E00-1E9F; }`;
    const communs = `
      @page { size: A4; margin: 20mm 18mm 20mm; }
      * { box-sizing: border-box; }
      body { margin: 0; color: #23214a; font: 10pt/1.45 Caudex, Georgia, serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      h1 { margin: 0 0 2px; } .sous { margin: 0 0 14px; opacity: .75; }
      h2 { font-size: 12pt; margin: 16px 0 6px; color: ${couleur}; }
      table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
      tr { page-break-inside: avoid; }
      th { text-align: left; font-size: 8.5pt; padding: 5px 6px; }
      td { padding: 5px 6px; vertical-align: top; }
      td.premier { font-weight: 700; }
      .pied { margin-top: 18px; font-size: 8pt; opacity: .6; }` +
      // (un tableau très large : la page se couche, et le texte se resserre)
      (large ? `@page { size: A4 landscape; } table { font-size: 8.5pt; } td, th { padding: 4px 5px; }` : "");
    const STYLE_CSS = {
      classique: `h1 { font-size: 22pt; color: ${couleur}; border-bottom: 1.5px solid ${couleur}; padding-bottom: 4px; }
        th { text-transform: uppercase; letter-spacing: .04em; color: ${couleur}; border-bottom: 1.5px solid ${couleur}; }
        td { border-bottom: 1px solid #23214a1f; }`,
      herbier: `body { background: #fbf6e9; } .page { border: 1px solid ${couleur}; padding: 10mm 9mm; min-height: 240mm; position: relative; }
        h1 { font: 400 30pt/1.1 "Beth Ellen", cursive; color: #23214a; }
        .etiquette { position: absolute; right: 8mm; bottom: 8mm; width: 62mm; padding: 8px 10px; background: #e3cfa6; border: 1px solid #8a6a3c; font-size: 8.5pt; box-shadow: 2px 2px 0 #8a6a3c66; }
        .etiquette strong { font: 400 13pt "Beth Ellen", cursive; display: block; }
        h2 { font: italic 700 12pt Caudex, serif; color: ${couleur}; border-bottom: 1px solid ${couleur}55; }
        th { font-style: italic; color: ${couleur}; border-bottom: 1px solid ${couleur}; } td { border-bottom: 1px dotted #8a6a3c88; }
        section { margin-bottom: 8px; } .contenu { padding-bottom: 30mm; }`,
      carnet: `body { background: repeating-linear-gradient(#fffdf6 0 21px, #b9cfe8 21px 22px); padding-left: 16mm; position: relative; }
        body::before { content: ""; position: fixed; left: 11mm; top: 0; bottom: 0; width: 1.5px; background: #e05a5a; }
        h1 { font: italic 700 22pt Caudex, serif; color: ${couleur}; } h2 { font-style: italic; }
        th { color: ${couleur}; font-style: italic; border-bottom: 1px solid ${couleur}; } td { line-height: 1.5; }
        tr.alt td { background: #fffdf699; }`,
      // (prêt pour une imprimante noir et blanc : que du noir sur blanc, des filets, pas d'aplats)
      pixel: `body { color: #000; font: 9.5pt/1.45 'Helvetica Neue', Helvetica, Arial, sans-serif; }
        .barre { border: 1.5px solid #000; padding: 5px 10px; margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 9pt; letter-spacing: .02em; }
        .barre span:first-child { font-weight: 700; }
        .fenetre { border: 1.5px solid #000; box-shadow: 3px 3px 0 #000; }
        .titre-fenetre { border-bottom: 1.5px solid #000; padding: 4px 10px; text-align: center; font-size: 8.5pt; text-transform: uppercase; letter-spacing: .08em; }
        .contenu { padding: 10px 14px 14px; }
        h1 { font: 700 20pt/1.15 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; } .sous { color: #000; opacity: .8; }
        h2 { font: 700 10.5pt 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #000; text-transform: uppercase; letter-spacing: .05em; border-bottom: 1px solid #000; padding-bottom: 2px; }
        th { font-weight: 700; color: #000; border-top: 1.5px solid #000; border-bottom: 1.5px solid #000; text-transform: uppercase; letter-spacing: .04em; font-size: 7.5pt; }
        td { border-bottom: .5px solid #000; } td.premier { font-weight: 600; }
        .pied { opacity: 1; }`,
      moderne: `.bandeau { background: ${couleur}; color: #fff; margin: 0 0 12px; padding: 8mm 9mm 7mm; }
        .bandeau h1 { font: 700 24pt/1.1 'Helvetica Neue', Arial, sans-serif; color: #fff; } .bandeau .sous { color: #fff; opacity: .9; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; } h2 { font-family: 'Helvetica Neue', Arial, sans-serif; text-transform: uppercase; letter-spacing: .05em; font-size: 10.5pt; }
        th { background: ${couleur}; color: #fff; } tr.alt td { background: ${couleur}12; }`,
    };
    const titre = "<h1>" + echapper(doc.titre) + "</h1>" + (doc.sousTitre ? '<p class="sous">' + echapper(doc.sousTitre) + "</p>" : "");
    const signature = opts.signature || "Herbier d’ƟvƟ";
    let html;
    if (style === "herbier") html = '<div class="page"><div class="contenu">' + titre + corps + '</div><div class="etiquette"><strong>' + echapper(signature) + "</strong>" + echapper(doc.titre) + "<br>" + aujourdhui() + "</div></div>";
    else if (style === "pixel") html = '<div class="barre"><span>' + echapper(signature) + "</span><span>" + aujourdhui() + '</span></div><div class="fenetre"><div class="titre-fenetre">' + echapper(doc.titre) + '</div><div class="contenu">' + titre + corps + "</div></div>";
    else if (style === "moderne") html = '<div class="bandeau">' + titre + "</div>" + corps + '<p class="pied">' + echapper(signature) + " · " + aujourdhui() + "</p>";
    else html = titre + corps + '<p class="pied">' + echapper(signature) + " · " + aujourdhui() + "</p>";
    return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + echapper(doc.titre) + "</title><style>" + polices + communs + (STYLE_CSS[style] || STYLE_CSS.classique) + "</style></head><body>" + html + "</body></html>";
  }

  function imprimerHtml(html) {
    const f = document.createElement("iframe");
    Object.assign(f.style, { position: "fixed", width: "0", height: "0", border: "0", right: "0", bottom: "0" });
    document.body.appendChild(f);
    f.contentDocument.open(); f.contentDocument.write(html); f.contentDocument.close();
    // (les polices d'abord, puis la fenêtre d'impression : « Enregistrer en PDF »)
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 60e3); }, 700);
  }

  // --- la petite fenêtre du choix : texte, tableau, ou PDF dans un style --------------------------
  // opts.pdf : une autre façon de faire le PDF (les devis ont leurs propres modèles)
  function exporter(doc, opts) {
    opts = opts || {};
    const nom = (doc.nomFichier || (H.slug ? H.slug(doc.titre) : "export"));
    let style = (H.local && H.local.stylePdf) || "pixel";
    const apercu = H.el("iframe.apercu-export", { title: "Aperçu du PDF" });
    const montrer = () => { apercu.contentDocument.open(); apercu.contentDocument.write(pagePdf(doc, style)); apercu.contentDocument.close(); };
    const styles = H.el("div.pastilles", null, STYLES.map(([id, n, aide]) => H.el("button.bouton.petit" + (id === style ? ".actif" : ""), {
      type: "button", title: aide,
      onclick(ev) { style = id; if (H.d && H.d.majLocal) H.d.majLocal((l) => (l.stylePdf = id)); styles.querySelectorAll("button").forEach((b) => b.classList.toggle("actif", b === ev.currentTarget)); montrer(); },
    }, n)));
    let fermer;
    const corps = H.el("div.fenetre-export", null,
      H.el("h2", null, "Exporter « " + doc.titre + " »"),
      H.el("div.pastilles", null,
        H.el("button.bouton", { type: "button", onclick: () => { H.telecharger(nom + ".txt", texte(doc), "text/plain;charset=utf-8"); fermer(); } }, "En texte (.txt)"),
        H.el("button.bouton", { type: "button", onclick: () => { H.telecharger(nom + ".csv", csv(doc), "text/csv;charset=utf-8"); fermer(); } }, "En tableau (.csv)"),
        opts.pdf ? H.el("button.bouton", { type: "button", onclick: () => { fermer(); opts.pdf(); } }, "En PDF") : null),
      opts.pdf ? null : H.el("div", null,
        H.el("h3", null, "En PDF"),
        H.el("p.discret", null, "Choisis un style, puis « Enregistrer en PDF » dans la fenêtre d’impression."),
        styles, apercu,
        H.el("div.boutons-bas", null, H.el("button.bouton", { type: "button", onclick: () => imprimerHtml(pagePdf(doc, style)) }, "Enregistrer en PDF ou imprimer"))));
    fermer = H.fenetre(corps, { classe: "large" });
    if (!opts.pdf) setTimeout(montrer, 0);
    return fermer;
  }

  H.export = { STYLES, texte, csv, pagePdf, imprimerHtml };
  H.exporter = exporter;
})();
