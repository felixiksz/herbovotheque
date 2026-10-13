// Chiffrement AES-GCM, clé tirée du mot de passe (PBKDF2).
// Les fiches de base et les sauvegardes partagent le même sel, donc la même clé.
(function () {
  const H = window.H;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const deB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const enB64 = function (u8) {
    let s = "";
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  };

  async function flux(donnees, transfo) {
    const sortie = new Blob([donnees]).stream().pipeThrough(transfo);
    return new Uint8Array(await new Response(sortie).arrayBuffer());
  }
  const compresser = (u8) => flux(u8, new CompressionStream("gzip"));
  const decompresser = (u8) => flux(u8, new DecompressionStream("gzip"));

  H.chiffre = {
    async cle(motDePasse, selB64, iter) {
      const brut = await crypto.subtle.importKey("raw", enc.encode(motDePasse), "PBKDF2", false, ["deriveKey"]);
      return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: deB64(selB64), iterations: iter, hash: "SHA-256" },
        brut,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
      );
    },

    // Renvoie l'objet JSON, ou lève une erreur si la clé est mauvaise.
    async ouvrir(paquet, cle) {
      const clair = await crypto.subtle.decrypt({ name: "AES-GCM", iv: deB64(paquet.iv) }, cle, deB64(paquet.data));
      return JSON.parse(dec.decode(await decompresser(new Uint8Array(clair))));
    },

    async fermer(objet, cle, sel, iter) {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const gz = await compresser(enc.encode(JSON.stringify(objet)));
      const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, gz));
      return { v: 1, sel, iter, iv: enB64(iv), data: enB64(chiffre) };
    },

    enB64,
    deB64,
  };
})();
