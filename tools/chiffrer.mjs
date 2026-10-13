// Chiffre prive/donnees.json -> data/base.enc (même format que js/05-chiffre.js).
// Usage : node tools/chiffrer.mjs motdepasse
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { webcrypto as crypto } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ici = dirname(fileURLToPath(import.meta.url));
const mdp = process.argv[2];
if (!mdp) {
  console.error("mot de passe manquant");
  process.exit(1);
}
const ITER = 250000;
const b64 = (u8) => Buffer.from(u8).toString("base64");

const json = JSON.stringify(JSON.parse(readFileSync(join(ici, "../prive/donnees.json"), "utf8")));
// Le sel ne doit jamais changer : la clé (donc les sauvegardes synchronisées) en dépend.
const sortie = join(ici, "../data/base.enc");
const sel = existsSync(sortie)
  ? new Uint8Array(Buffer.from(JSON.parse(readFileSync(sortie, "utf8")).sel, "base64"))
  : crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const brut = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveKey"]);
const cle = await crypto.subtle.deriveKey(
  { name: "PBKDF2", salt: sel, iterations: ITER, hash: "SHA-256" },
  brut,
  { name: "AES-GCM", length: 256 },
  false,
  ["encrypt"]
);
const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, cle, gzipSync(json)));
mkdirSync(join(ici, "../data"), { recursive: true });
writeFileSync(
  sortie,
  JSON.stringify({ v: 1, sel: b64(sel), iter: ITER, iv: b64(iv), data: b64(chiffre) })
);
console.log("data/base.enc", Math.round(chiffre.length / 1024), "Ko");
