/**
 * GitHub Pages: le route SPA (/characters, /gacha, …) non esistono come file.
 * Copiando index.html → 404.html, un refresh serve l’app e React Router
 * ripristina il path (basename /OP-Grand-Cross/).
 */
import { copyFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const index = resolve(root, "dist/index.html");
const notFound = resolve(root, "dist/404.html");

if (!existsSync(index)) {
  console.error("[spa-github-pages] dist/index.html mancante — build fallita?");
  process.exit(1);
}

copyFileSync(index, notFound);
console.log("[spa-github-pages] dist/404.html ← index.html");
