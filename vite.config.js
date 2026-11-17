import path from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// GitHub Pages: https://<user>.github.io/OP-Grand-Cross/
const repoBase = "/OP-Grand-Cross/";

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  // In produzione (build/Pages) usa il path del repo; in dev resta /
  base: mode === "production" ? repoBase : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
}));
