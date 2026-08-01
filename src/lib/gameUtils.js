// Game utility functions for One Piece: Grand Voyage

export const RARITY_ORDER = ["C", "R", "SR", "SSR"];

export const RARITY_COLORS = {
  C: "#9CA3AF",
  R: "#3B82F6",
  SR: "#A855F7",
  SSR: "#F59E0B",
};

export const RARITY_GLOW = {
  C: "rgba(156,163,175,0.4)",
  R: "rgba(59,130,246,0.5)",
  SR: "rgba(168,85,247,0.6)",
  SSR: "rgba(245,158,11,0.7)",
};

export const RARITY_STARS = { C: 1, R: 2, SR: 3, SSR: 4 };

export const ATTRIBUTE_INFO = {
  Forza: { icon: "💪", color: "#E11D48", label: "Forza" },
  Velocità: { icon: "⚡", color: "#0EA5E9", label: "Agilità" },
  Tecnica: { icon: "🧠", color: "#8B5CF6", label: "Tecnica" },
};

export const TYPE_TRIANGLE = {
  Forza: "Velocità",
  Velocità: "Tecnica",
  Tecnica: "Forza",
};

export function advantageMultiplier(attacker, defender) {
  if (!attacker || !defender) return 1;
  if (TYPE_TRIANGLE[attacker] === defender) return 1.5;
  if (TYPE_TRIANGLE[defender] === attacker) return 0.75;
  return 1;
}

export function matchupLabel(attacker, defender) {
  if (!attacker || !defender) return "neutro";
  if (TYPE_TRIANGLE[attacker] === defender) return "superefficace";
  if (TYPE_TRIANGLE[defender] === attacker) return "non molto efficace";
  return "neutro";
}

export function effectiveHp(char, owned) {
  const lvl = owned?.level || 1;
  const asc = owned?.ascension || 0;
  return Math.round(char.hp * (1 + (lvl - 1) * 0.08 + asc * 0.15));
}

export function effectiveAttack(char, owned) {
  const lvl = owned?.level || 1;
  const asc = owned?.ascension || 0;
  return Math.round(char.attack * (1 + (lvl - 1) * 0.08 + asc * 0.15));
}

/** Rank stelle stile 7DS:GC — Bronzo / Argento / Oro */
export const STAR_RANKS = {
  1: {
    label: "Bronzo",
    frame: "#8B5A2B",
    frameLight: "#CD7F32",
    glow: "rgba(205,127,50,0.55)",
    mult: 1,
  },
  2: {
    label: "Argento",
    frame: "#94A3B8",
    frameLight: "#E2E8F0",
    glow: "rgba(226,232,240,0.55)",
    mult: 1.5,
  },
  3: {
    label: "Oro",
    frame: "#D97706",
    frameLight: "#FBBF24",
    glow: "rgba(251,191,36,0.7)",
    mult: 2.15,
  },
};

export function starDamageMultiplier(stars = 1) {
  return STAR_RANKS[stars]?.mult ?? 1;
}

export function healMultiplier(stars = 1) {
  return 1 + (Math.min(3, stars) - 1) * 0.35;
}

export function tileDamage(char, owned, move, stars = 1) {
  const atk = effectiveAttack(char, owned);
  const base = Math.max(1, Math.round(move.power + atk * 0.5));
  return Math.max(1, Math.round(base * starDamageMultiplier(stars)));
}

export function enemyDamage(enemy, move) {
  return Math.max(1, Math.round(move.power + enemy.attack * 0.5));
}

let _tileSeq = 0;
export function createBattleTile(charIndex, moveIndex, stars = 1) {
  _tileSeq += 1;
  return {
    id: `tile_${_tileSeq}_${charIndex}_${moveIndex}`,
    charIndex,
    moveIndex,
    stars: Math.min(3, Math.max(1, stars || 1)),
  };
}

export function tilesMatchForMerge(a, b) {
  if (!a || !b || a.id === b.id) return false;
  return (
    a.charIndex === b.charIndex &&
    a.moveIndex === b.moveIndex &&
    a.stars === b.stars &&
    a.stars < 3
  );
}

export function mergeTiles(a, b) {
  if (!tilesMatchForMerge(a, b)) return null;
  return createBattleTile(a.charIndex, a.moveIndex, a.stars + 1);
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function drawTiles(pool, n = 3) {
  if (pool.length === 0) return [];
  const picks =
    pool.length >= n
      ? shuffle(pool.map((_, i) => i))
          .slice(0, n)
          .map((i) => pool[i])
      : Array.from({ length: n }, () => pool[Math.floor(Math.random() * pool.length)]);
  return picks.map((p) => {
    const stars = Math.random() < 0.08 ? 2 : 1;
    return createBattleTile(p.charIndex, p.moveIndex, stars);
  });
}

export function comboMultiplier(selectedCount, tiles) {
  let mult = 1 + Math.max(0, selectedCount - 1) * 0.12;
  const charCounts = {};
  const list = (tiles || []).filter(Boolean);
  list.forEach((t) => {
    charCounts[t.charIndex] = (charCounts[t.charIndex] || 0) + 1;
  });
  Object.values(charCounts).forEach((c) => {
    if (c > 1) mult += (c - 1) * 0.08;
  });
  const starAvg = list.length ? list.reduce((s, t) => s + (t.stars || 1), 0) / list.length : 1;
  mult += (starAvg - 1) * 0.06;
  return mult;
}

export function expNeeded(level) {
  return level * 120;
}

export function upgradeCost(level) {
  return 50 + level * 30;
}

export function ascensionCost(currentAscension) {
  return 20 + currentAscension * 20;
}

export const GACHA_RATES = [
  { rarity: "SSR", chance: 0.03 },
  { rarity: "SR", chance: 0.12 },
  { rarity: "R", chance: 0.3 },
  { rarity: "C", chance: 0.55 },
];

export function rollRarity() {
  const r = Math.random();
  let acc = 0;
  for (const tier of GACHA_RATES) {
    acc += tier.chance;
    if (r <= acc) return tier.rarity;
  }
  return "C";
}
