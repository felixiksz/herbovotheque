// Petits outils partagés par tous les modules.
window.H = window.H || {};

(function () {
  const H = window.H;
  H.vues = H.vues || {};

  H.$ =(sel, racine) => (racine || document).querySelector(sel);
  H.$$ = (sel, racine) => Array.from((racine || document).querySelectorAll(sel));

  // el("div.classe", {attributs}, enfants…)
  H.el = function (tag, attrs, ...enfants) {
    const [tete, ...classes] = tag.split(".");
    const [nom, id] = tete.split("#");
    const n = document.createElement(nom || "div");
    if (id) n.id = id;
    if (classes.length) n.className = classes.join(" ");
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v == null || v === false) continue;
        if (k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
        else if (k === "html") n.innerHTML = v;
        else if (k === "style" && typeof v === "object") Object.assign(n.style, v);
        else n.setAttribute(k, v === true ? "" : v);
      }
    }
    for (const e of enfants.flat()) {
      if (e == null || e === false) continue;
      n.appendChild(typeof e === "string" || typeof e === "number" ? document.createTextNode(String(e)) : e);
    }
    return n;
  };

  H.echap = (t) =>
    String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  H.sansAccents = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

  H.slug = (t) => H.sansAccents(t).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "x";

  H.uid = (prefixe) => (prefixe || "x") + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  H.maintenant = () => Date.now();

  // Texte des fiches : paragraphes, puces « • », sous-titres « ## » / « ### », **gras**.
  H.texteRiche = function (texte) {
    if (!texte) return "";
    const lignes = String(texte).split("\n");
    let html = "";
    let liste = false;
    const inline = (s) =>
      H.echap(s)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
    for (let l of lignes) {
      l = l.trim();
      if (!l) continue;
      const puce = /^(•|-|–|→)\s*/.exec(l);
      if (puce) {
        if (!liste) {
          html += "<ul>";
          liste = true;
        }
        html += "<li>" + inline(l.slice(puce[0].length)) + "</li>";
        continue;
      }
      if (liste) {
        html += "</ul>";
        liste = false;
      }
      if (l.startsWith("###")) html += "<h5>" + inline(l.replace(/^#+\s*/, "")) + "</h5>";
      else if (l.startsWith("##")) html += "<h4>" + inline(l.replace(/^#+\s*/, "")) + "</h4>";
      else html += "<p>" + inline(l) + "</p>";
    }
    if (liste) html += "</ul>";
    return html;
  };

  // Générateur pseudo-aléatoire reproductible (même graine = même dessin).
  H.alea = function (graine) {
    let a = typeof graine === "string" ? H.hash(graine) : graine >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  H.hash = function (s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  // Dessin en pixels : motif = lignes de caractères, palette = {caractère: couleur}.
  const cachePixel = new Map();
  H.dessinPixel = function (motif, palette, echelle) {
    echelle = echelle || 1;
    const cle = motif.join("/") + JSON.stringify(palette) + echelle;
    if (cachePixel.has(cle)) return cachePixel.get(cle);
    const h = motif.length, w = Math.max(...motif.map((l) => l.length));
    const c = document.createElement("canvas");
    c.width = w * echelle;
    c.height = h * echelle;
    const ctx = c.getContext("2d");
    motif.forEach((ligne, y) => {
      for (let x = 0; x < ligne.length; x++) {
        const col = palette[ligne[x]];
        if (!col) continue;
        ctx.fillStyle = col;
        ctx.fillRect(x * echelle, y * echelle, echelle, echelle);
      }
    });
    const url = c.toDataURL("image/png");
    cachePixel.set(cle, url);
    return url;
  };

  // Petit bus d'évènements entre modules.
  const ecouteurs = {};
  H.sur = (nom, fn) => (ecouteurs[nom] = ecouteurs[nom] || []).push(fn);
  H.emettre = (nom, detail) => (ecouteurs[nom] || []).forEach((fn) => fn(detail));

  H.MOIS = ["janv.", "févr.", "mars", "avril", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  H.MOIS_LONGS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  H.heure = (d) => d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  H.anti = function (fn, ms) {
    let t;
    return function (...a) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, a), ms);
    };
  };

  H.telecharger = function (nom, contenu, type) {
    const url = URL.createObjectURL(new Blob([contenu], { type: type || "text/plain;charset=utf-8" }));
    const a = H.el("a", { href: url, download: nom });
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  // Message discret en bas de l'écran.
  H.toast = function (texte, ms) {
    let t = H.$("#toast");
    if (!t) {
      t = H.el("div#toast", { role: "status" });
      document.body.appendChild(t);
    }
    t.textContent = texte;
    t.classList.add("visible");
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove("visible"), ms || 2600);
  };
})();
