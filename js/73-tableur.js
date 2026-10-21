// Le tableur : les formules d'une feuille de calcul (comme dans Excel, en français : =SOMME(A1:A5),
// =MOYENNE, =MIN, =MAX, =NB, =ARRONDI, =SI, les quatre opérations, les références comme B2), et les
// vrais fichiers Excel (.xlsx), écrits et lus sans rien télécharger d'ailleurs : un .xlsx est une
// archive zip de quelques fichiers XML.
(function () {
  const H = window.H = window.H || {};

  // --- les références : « A » ↔ 0, « B2 » ↔ { c: 1, l: 1 } ------------------------------------
  const lettres = (c) => { let s = ""; c++; while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); } return s; };
  const colonne = (s) => { let c = 0; for (const ch of s.toUpperCase()) c = c * 26 + (ch.charCodeAt(0) - 64); return c - 1; };
  const nomCase = (c, l) => lettres(c) + (l + 1);

  // une saisie qui est un nombre : « 12 », « 3,5 », « 1 200 », « 12 € », « 15 % »
  function nombre(t) {
    if (typeof t === "number") return t;
    const s = String(t == null ? "" : t).trim().replace(/[\s  ]/g, "").replace(/€$/, "");
    const pct = /%$/.test(s), v = pct ? s.slice(0, -1) : s;
    if (!/^[-+]?(\d+([.,]\d*)?|[.,]\d+)$/.test(v)) return null;
    const n = parseFloat(v.replace(",", "."));
    return pct ? n / 100 : n;
  }

  // --- les formules -----------------------------------------------------------------------------
  const FONCTIONS = {
    SOMME: (a) => a.filter((x) => typeof x === "number").reduce((s, x) => s + x, 0),
    MOYENNE: (a) => { const n = a.filter((x) => typeof x === "number"); return n.length ? n.reduce((s, x) => s + x, 0) / n.length : 0; },
    MIN: (a) => { const n = a.filter((x) => typeof x === "number"); return n.length ? Math.min(...n) : 0; },
    MAX: (a) => { const n = a.filter((x) => typeof x === "number"); return n.length ? Math.max(...n) : 0; },
    NB: (a) => a.filter((x) => typeof x === "number").length,
    NBVAL: (a) => a.filter((x) => x !== "" && x != null).length,
    ARRONDI: (a) => { const k = Math.pow(10, a[1] || 0); return Math.round((a[0] || 0) * k) / k; },
    ABS: (a) => Math.abs(a[0] || 0),
    SI: (a) => (a[0] ? a[1] : a[2] == null ? "" : a[2]),
  };
  // (les mêmes en anglais, pour les fichiers Excel)
  const ANGLAIS = { SOMME: "SUM", MOYENNE: "AVERAGE", MIN: "MIN", MAX: "MAX", NB: "COUNT", NBVAL: "COUNTA", ARRONDI: "ROUND", ABS: "ABS", SI: "IF" };
  const FRANCAIS = Object.fromEntries(Object.entries(ANGLAIS).map(([f, e]) => [e, f]));
  Object.assign(FONCTIONS, { SUM: FONCTIONS.SOMME, AVERAGE: FONCTIONS.MOYENNE, COUNT: FONCTIONS.NB, COUNTA: FONCTIONS.NBVAL, ROUND: FONCTIONS.ARRONDI, IF: FONCTIONS.SI });

  function decouper(f) {
    const jetons = [], re = /\s*(?:(\d+(?:[.,]\d+)?)|("(?:[^"]|"")*")|([A-Za-z]+\d+(?::[A-Za-z]+\d+)?)|([A-Za-zÀ-ÿ]+)(?=\s*\()|(<=|>=|<>|[-+*/^()=<>;&%]))/y;
    let m, i = 0;
    while (i < f.length) {
      re.lastIndex = i;
      m = re.exec(f);
      if (!m) { if (/\s/.test(f[i])) { i++; continue; } throw new Error("?"); }
      i = re.lastIndex;
      if (m[1]) jetons.push({ n: parseFloat(m[1].replace(",", ".")) });
      else if (m[2]) jetons.push({ s: m[2].slice(1, -1).replace(/""/g, '"') });
      else if (m[3]) jetons.push({ ref: m[3].toUpperCase() });
      else if (m[4]) jetons.push({ f: m[4].toUpperCase() });
      else jetons.push({ o: m[5] });
    }
    return jetons;
  }

  // La valeur de chaque case d'une grille (lignes de textes saisis) : un nombre, un texte, ou une
  // erreur (« #ERREUR », « #BOUCLE » quand une case dépend d'elle-même).
  function calculer(grille) {
    const memo = new Map(), enCours = new Set();
    const brut = (c, l) => ((grille[l] || [])[c] == null ? "" : String(grille[l][c]));
    function valeur(c, l) {
      const k = c + "," + l;
      if (memo.has(k)) return memo.get(k);
      const t = brut(c, l);
      let v;
      if (t.startsWith("=")) {
        if (enCours.has(k)) return "#BOUCLE";
        enCours.add(k);
        try { v = formule(t.slice(1)); } catch (e) { v = e.message === "#BOUCLE" ? "#BOUCLE" : "#ERREUR"; }
        enCours.delete(k);
        if (typeof v === "number" && !isFinite(v)) v = "#DIV/0";
      } else {
        const n = nombre(t);
        v = n == null ? t : n;
      }
      memo.set(k, v);
      return v;
    }
    function plage(ref) {
      const [a, b] = ref.split(":"), p = (r) => { const m = /^([A-Z]+)(\d+)$/.exec(r); return [colonne(m[1]), parseInt(m[2], 10) - 1]; };
      const [c0, l0] = p(a), [c1, l1] = p(b || a), out = [];
      for (let l = Math.min(l0, l1); l <= Math.max(l0, l1); l++) for (let c = Math.min(c0, c1); c <= Math.max(c0, c1); c++) out.push(valeur(c, l));
      return { plage: out };
    }
    function formule(f) {
      const j = decouper(f);
      let i = 0;
      const voir = () => j[i], prendre = () => j[i++], op = (o) => j[i] && j[i].o === o;
      const num = (v) => {
        if (v && v.plage) v = v.plage[0];
        if (typeof v === "string" && /^#/.test(v)) throw new Error(v === "#BOUCLE" ? "#BOUCLE" : "#ERREUR");
        if (typeof v === "number") return v;
        if (v === "" || v == null) return 0;
        const n = nombre(v);
        if (n == null) throw new Error("#ERREUR");
        return n;
      };
      const val = (v) => (v && v.plage ? v.plage[0] : v);
      function comparaison() {
        let a = addition();
        while (voir() && ["=", "<>", "<", ">", "<=", ">="].includes(voir().o)) {
          const o = prendre().o, b = addition(), x = val(a), y = val(b);
          const [p, q] = typeof x === "number" || typeof y === "number" ? [num(x), num(y)] : [String(x).toLowerCase(), String(y).toLowerCase()];
          a = { "=": p === q, "<>": p !== q, "<": p < q, ">": p > q, "<=": p <= q, ">=": p >= q }[o] ? 1 : 0;
        }
        return a;
      }
      function addition() {
        let a = multiplication();
        while (op("+") || op("-") || op("&")) {
          const o = prendre().o, b = multiplication();
          a = o === "&" ? String(val(a)) + String(val(b)) : o === "+" ? num(a) + num(b) : num(a) - num(b);
        }
        return a;
      }
      function multiplication() {
        let a = puissance();
        while (op("*") || op("/")) { const o = prendre().o, b = puissance(); a = o === "*" ? num(a) * num(b) : num(a) / num(b); }
        return a;
      }
      function puissance() {
        let a = unaire();
        if (op("^")) { prendre(); a = Math.pow(num(a), num(unaire())); }
        return a;
      }
      function unaire() {
        if (op("-")) { prendre(); return -num(unaire()); }
        if (op("+")) { prendre(); return num(unaire()); }
        let v = primaire();
        if (op("%")) { prendre(); v = num(v) / 100; }
        return v;
      }
      function primaire() {
        const t = prendre();
        if (!t) throw new Error("#ERREUR");
        if (t.n != null) return t.n;
        if (t.s != null) return t.s;
        if (t.ref) return t.ref.includes(":") ? plage(t.ref) : val(plage(t.ref));
        if (t.f) {
          const fn = FONCTIONS[t.f];
          if (!fn || !op("(")) throw new Error("#ERREUR");
          prendre();
          const args = [];
          if (!op(")")) {
            do { if (op(";")) prendre(); args.push(comparaison()); } while (op(";"));
          }
          if (!op(")")) throw new Error("#ERREUR");
          prendre();
          // (dans SOMME, MOYENNE… les plages s'étalent ; dans SI et ARRONDI, ce sont des valeurs)
          const etale = ["SI", "IF", "ARRONDI", "ROUND", "ABS"].includes(t.f) ? args.map((a) => (t.f === "SI" || t.f === "IF" ? val(a) : num(a))) : args.flatMap((a) => (a && a.plage ? a.plage : [val(a)]));
          return fn(etale);
        }
        if (t.o === "(") { const v = comparaison(); if (!op(")")) throw new Error("#ERREUR"); prendre(); return v; }
        throw new Error("#ERREUR");
      }
      const v = comparaison();
      if (i < j.length) throw new Error("#ERREUR");
      return val(v);
    }
    const lignes = grille.length, cols = Math.max(0, ...grille.map((r) => r.length));
    return Array.from({ length: lignes }, (_, l) => Array.from({ length: cols }, (_, c) => valeur(c, l)));
  }
  // une valeur calculée, telle qu'on l'affiche
  const afficher = (v) => (typeof v === "number" ? v.toLocaleString("fr-FR", { maximumFractionDigits: 4 }) : v == null ? "" : String(v));

  // une formule en français (« =SOMME(A1;A2) », 3,5) ↔ en anglais pour Excel (« SUM(A1,A2) », 3.5)
  const versExcel = (f) => f.replace(/^=/, "").replace(/(\d),(\d)/g, "$1.$2").replace(/;/g, ",").replace(/\b([A-ZÀ-Ÿ]+)\s*\(/gi, (m, n) => (ANGLAIS[n.toUpperCase()] || n.toUpperCase()) + "(");
  const depuisExcel = (f) => "=" + f.replace(/,/g, ";").replace(/\b([A-Z.]+)\s*\(/gi, (m, n) => (FRANCAIS[n.toUpperCase()] || n.toUpperCase()) + "(");

  // --- le zip (sans compression à l'écriture ; à la lecture, aussi les fichiers compressés) ------
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  function zipper(fichiers) {
    const enc = new TextEncoder(), parts = [], central = [];
    let pos = 0;
    for (const [nom, texte] of fichiers) {
      const n = enc.encode(nom), d = enc.encode(texte), c = crc32(d);
      const tete = new DataView(new ArrayBuffer(30));
      tete.setUint32(0, 0x04034b50, true); tete.setUint16(4, 20, true); tete.setUint16(8, 0, true);
      tete.setUint32(14, c, true); tete.setUint32(18, d.length, true); tete.setUint32(22, d.length, true); tete.setUint16(26, n.length, true);
      parts.push(new Uint8Array(tete.buffer), n, d);
      const cd = new DataView(new ArrayBuffer(46));
      cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true);
      cd.setUint32(16, c, true); cd.setUint32(20, d.length, true); cd.setUint32(24, d.length, true); cd.setUint16(28, n.length, true); cd.setUint32(42, pos, true);
      central.push(new Uint8Array(cd.buffer), n);
      pos += 30 + n.length + d.length;
    }
    const tailleCd = central.reduce((s, p) => s + p.length, 0), fin = new DataView(new ArrayBuffer(22));
    fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
    fin.setUint32(12, tailleCd, true); fin.setUint32(16, pos, true);
    return new Blob(parts.concat(central, [new Uint8Array(fin.buffer)]));
  }
  async function dezipper(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder(), out = {};
    let e = u8.length - 22;
    while (e >= 0 && dv.getUint32(e, true) !== 0x06054b50) e--;
    if (e < 0) throw new Error("Ce n’est pas un fichier Excel");
    let p = dv.getUint32(e + 16, true);
    const n = dv.getUint16(e + 10, true);
    for (let k = 0; k < n; k++) {
      const methode = dv.getUint16(p + 10, true), taille = dv.getUint32(p + 20, true), ln = dv.getUint16(p + 28, true), lx = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true), loc = dv.getUint32(p + 42, true);
      const nom = dec.decode(u8.subarray(p + 46, p + 46 + ln));
      const debut = loc + 30 + dv.getUint16(loc + 26, true) + dv.getUint16(loc + 28, true), brut = u8.subarray(debut, debut + taille);
      out[nom] = methode === 0 ? brut : methode === 8 ? new Uint8Array(await new Response(new Blob([brut]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer()) : null;
      p += 46 + ln + lx + lc;
    }
    return out;
  }

  // --- écrire un .xlsx : des feuilles { nom, lignes: [[valeur ou « =formule »]], titres } ----------
  const xml = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
  function ecrireXlsx(feuilles) {
    const vus = new Set();
    feuilles = feuilles.map((f, i) => {
      let nom = String(f.nom || "Feuille " + (i + 1)).replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || "Feuille " + (i + 1);
      while (vus.has(nom.toLowerCase())) nom = nom.slice(0, 28) + " " + (i + 1);
      vus.add(nom.toLowerCase());
      return Object.assign({}, f, { nom });
    });
    const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
    const fichiers = [
      ["[Content_Types].xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + feuilles.map((f, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join("") + "</Types>"],
      ["_rels/.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ["xl/workbook.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook ' + NS + ' xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + feuilles.map((f, i) => '<sheet name="' + xml(f.nom) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join("") + "</sheets></workbook>"],
      ["xl/_rels/workbook.xml.rels", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + feuilles.map((f, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join("") + '<Relationship Id="rId' + (feuilles.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ["xl/styles.xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet ' + NS + '><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF6EE55"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs></styleSheet>'],
    ];
    feuilles.forEach((f, i) => {
      const valeurs = calculer(f.lignes || []);
      const largeurs = [];
      const rangs = (f.lignes || []).map((rang, l) => '<row r="' + (l + 1) + '">' + rang.map((t, c) => {
        const ref = nomCase(c, l), s = f.titres && l === 0 ? ' s="1"' : "", brut = t == null ? "" : String(t), v = valeurs[l][c];
        largeurs[c] = Math.max(largeurs[c] || 8, Math.min(60, afficher(v).length + 2));
        if (brut === "") return s ? '<c r="' + ref + '"' + s + "/>" : "";
        if (brut.startsWith("=")) return '<c r="' + ref + '"' + s + (typeof v === "number" ? "" : ' t="str"') + "><f>" + xml(versExcel(brut)) + "</f><v>" + xml(typeof v === "number" ? v : afficher(v)) + "</v></c>";
        if (typeof v === "number") return '<c r="' + ref + '"' + s + "><v>" + v + "</v></c>";
        return '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + xml(brut) + "</t></is></c>";
      }).join("") + "</row>").join("");
      const cols = largeurs.length ? "<cols>" + largeurs.map((w, c) => '<col min="' + (c + 1) + '" max="' + (c + 1) + '" width="' + w + '" customWidth="1"/>').join("") + "</cols>" : "";
      fichiers.push(["xl/worksheets/sheet" + (i + 1) + ".xml", '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet ' + NS + ">" + cols + "<sheetData>" + rangs + "</sheetData></worksheet>"]);
    });
    return zipper(fichiers);
  }

  // --- lire un .xlsx : la première feuille (ou toutes), en lignes de textes saisis ---------------
  async function lireXlsx(buf) {
    const z = await dezipper(buf), dec = new TextDecoder(), lire = (n) => (z[n] ? new DOMParser().parseFromString(dec.decode(z[n]), "application/xml") : null);
    const partages = [];
    const ss = lire("xl/sharedStrings.xml");
    if (ss) for (const si of ss.getElementsByTagName("si")) partages.push([...si.getElementsByTagName("t")].map((t) => t.textContent).join(""));
    const wb = lire("xl/workbook.xml"), rels = lire("xl/_rels/workbook.xml.rels"), cibles = {};
    if (rels) for (const r of rels.getElementsByTagName("Relationship")) cibles[r.getAttribute("Id")] = r.getAttribute("Target").replace(/^\/?(xl\/)?/, "xl/");
    const feuilles = [];
    for (const s of wb ? wb.getElementsByTagName("sheet") : []) {
      const id = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const doc = lire(cibles[id] || "");
      if (!doc) continue;
      const lignes = [];
      for (const c of doc.getElementsByTagName("c")) {
        const m = /^([A-Z]+)(\d+)$/.exec(c.getAttribute("r") || "");
        if (!m) continue;
        const col = colonne(m[1]), l = parseInt(m[2], 10) - 1, t = c.getAttribute("t"), f = c.getElementsByTagName("f")[0], v = c.getElementsByTagName("v")[0];
        let texte = "";
        if (f && f.textContent) texte = depuisExcel(f.textContent);
        else if (t === "s") texte = partages[parseInt(v && v.textContent, 10)] || "";
        else if (t === "inlineStr") texte = [...c.getElementsByTagName("t")].map((x) => x.textContent).join("");
        else if (t === "b") texte = v && v.textContent === "1" ? "VRAI" : "FAUX";
        else texte = v ? (t === "str" ? v.textContent : String(v.textContent).replace(".", ",")) : "";
        while (lignes.length <= l) lignes.push([]);
        lignes[l][col] = texte;
      }
      const larg = Math.max(1, ...lignes.map((r) => r.length));
      feuilles.push({ nom: s.getAttribute("name"), lignes: lignes.map((r) => Array.from({ length: larg }, (_, i) => (r[i] == null ? "" : r[i]))) });
    }
    return feuilles;
  }
  // un .csv (points-virgules ou virgules, guillemets compris)
  function lireCsv(texte) {
    texte = texte.replace(/^﻿/, "");
    const sep = (texte.split("\n")[0].match(/;/g) || []).length >= (texte.split("\n")[0].match(/,/g) || []).length ? ";" : ",";
    const lignes = [[]];
    let cell = "", entre = false;
    for (let i = 0; i < texte.length; i++) {
      const ch = texte[i];
      if (entre) { if (ch === '"' && texte[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') entre = false; else cell += ch; }
      else if (ch === '"') entre = true;
      else if (ch === sep) { lignes[lignes.length - 1].push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && texte[i + 1] === "\n") i++; lignes[lignes.length - 1].push(cell); cell = ""; lignes.push([]); }
      else cell += ch;
    }
    lignes[lignes.length - 1].push(cell);
    while (lignes.length > 1 && lignes[lignes.length - 1].every((c) => c === "")) lignes.pop();
    const larg = Math.max(1, ...lignes.map((r) => r.length));
    return lignes.map((r) => Array.from({ length: larg }, (_, i) => r[i] || ""));
  }

  const TYPE_XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  H.tableur = { calculer, afficher, nombre, lettres, colonne, nomCase, ecrireXlsx, lireXlsx, lireCsv, versExcel, depuisExcel, TYPE_XLSX, FONCTIONS: Object.keys(ANGLAIS) };
})();
