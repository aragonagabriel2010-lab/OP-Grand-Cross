/**
 * Temi UI (schermo / layout).
 * Theme 1 «Voyage» = ufficiale attuale (teal / ambra / nero).
 */

export const THEME_STORAGE_KEY = "gv_ui_theme";

export const THEMES = [
  {
    id: "voyage",
    number: 1,
    label: "Voyage",
    badge: "Ufficiale",
    hint: "Teal, ambra e nero — identità Grand Voyage",
    preview: { bg: "#0b161b", panel: "#164446", accent: "#f5a623" },
  },
  {
    id: "lanterna",
    number: 2,
    label: "Lanterna",
    badge: "Morbido",
    hint: "Blu-sera soffuso, niente bianco accecante — contrasto calmo",
    preview: { bg: "#1e2a3a", panel: "#2a3d52", accent: "#6ec9c0" },
  },
  {
    id: "harbor",
    number: 3,
    label: "Harbor",
    badge: "Focus",
    hint: "Inchiostro e corallo — gerarchia chiara su tutta l’interfaccia",
    preview: { bg: "#12151c", panel: "#1e2433", accent: "#ff6b4a" },
  },
  {
    id: "mugiwara",
    number: 4,
    label: "Mugiwara",
    badge: "One Piece",
    hint: "Mare, pergamena, paglia e rosso Jolly Roger",
    preview: { bg: "#0a2f4a", panel: "#c4a574", accent: "#f0c419" },
  },
];

/** Vecchio id «clarity» → Lanterna */
const THEME_ALIASES = {
  clarity: "lanterna",
};

export function getTheme(id) {
  const resolved = THEME_ALIASES[id] || id;
  return THEMES.find((t) => t.id === resolved) || THEMES[0];
}

export function loadThemeId() {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    const resolved = THEME_ALIASES[raw] || raw;
    if (THEMES.some((t) => t.id === resolved)) return resolved;
  } catch {
    /* ignore */
  }
  return "voyage";
}

export function applyTheme(id) {
  const theme = getTheme(id);
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", theme.id);
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    /* ignore */
  }
  return theme;
}
