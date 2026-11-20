/**
 * Path pubblico con base Vite (es. /OP-Grand-Cross/ su GitHub Pages).
 * Accetta URL assoluti http(s) o path relativi/assoluti tipo /bounty/foo.jpg.
 */
export function assetUrl(path) {
  if (!path) return "";
  const raw = String(path);
  if (/^https?:\/\//i.test(raw) || raw.startsWith("data:")) return raw;
  return `${import.meta.env.BASE_URL}${raw.replace(/^\//, "")}`;
}
