/**
 * Pity gacha — localStorage per uid.
 * Soft pity SR a 10, hard pity SSR a 90.
 */

const KEY = (uid) => `opgv_pity_${uid || "guest"}`;

export function loadPity(uid) {
  try {
    const raw = localStorage.getItem(KEY(uid));
    if (!raw) return { sinceSr: 0, sinceSsr: 0 };
    const d = JSON.parse(raw);
    return {
      sinceSr: Math.max(0, Number(d.sinceSr) || 0),
      sinceSsr: Math.max(0, Number(d.sinceSsr) || 0),
    };
  } catch {
    return { sinceSr: 0, sinceSsr: 0 };
  }
}

export function savePity(uid, pity) {
  try {
    localStorage.setItem(KEY(uid), JSON.stringify(pity));
  } catch {
    /* ignore */
  }
}

/**
 * Tira rarità con pity. Mutates pity counters.
 */
export function rollRarityWithPity(pity, baseRollFn) {
  const state = { ...pity };
  state.sinceSr += 1;
  state.sinceSsr += 1;

  let rarity;
  if (state.sinceSsr >= 90) {
    rarity = "SSR";
  } else if (state.sinceSr >= 10) {
    rarity = Math.random() < 0.15 ? "SSR" : "SR";
  } else {
    rarity = baseRollFn();
  }

  if (rarity === "SSR") {
    state.sinceSsr = 0;
    state.sinceSr = 0;
  } else if (rarity === "SR") {
    state.sinceSr = 0;
  }

  return { rarity, pity: state };
}
