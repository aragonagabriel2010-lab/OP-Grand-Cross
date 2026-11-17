/**
 * Rank account — XP da battaglie, sblocchi contenuti.
 */

export const RANK_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1400, 1900, 2500, 3200, 4000, 5000, 6200, 7600, 9200, 11000,
];

export function rankFromXp(xp = 0) {
  const v = Math.max(0, Number(xp) || 0);
  let level = 1;
  for (let i = 1; i < RANK_THRESHOLDS.length; i++) {
    if (v >= RANK_THRESHOLDS[i]) level = i + 1;
    else break;
  }
  return level;
}

export function xpProgress(xp = 0) {
  const level = rankFromXp(xp);
  const cur = RANK_THRESHOLDS[level - 1] || 0;
  const next = RANK_THRESHOLDS[level] ?? cur + 1500;
  const into = Math.max(0, xp - cur);
  const span = Math.max(1, next - cur);
  return { level, xp, cur, next, into, span, pct: Math.min(100, (into / span) * 100), atMax: level >= RANK_THRESHOLDS.length };
}

/** Sblocchi per rank */
export const RANK_UNLOCKS = {
  hardMode: 3,
  eventAccess: 2,
  gachaTenDiscount: 5,
  materialBoost: 4,
};

export function hasUnlock(accountLevel, key) {
  const need = RANK_UNLOCKS[key] || 1;
  return (accountLevel || 1) >= need;
}

export function battleRankXp({ isBoss = false, hard = false, win = true } = {}) {
  if (!win) return 8;
  let xp = isBoss ? 45 : 25;
  if (hard) xp = Math.round(xp * 1.6);
  return xp;
}

export function applyRankXp(playerState, gained) {
  const prevXp = Number(playerState.account_xp) || 0;
  const prevLevel = playerState.account_level || rankFromXp(prevXp);
  const nextXp = prevXp + Math.max(0, gained);
  const nextLevel = rankFromXp(nextXp);
  return {
    account_xp: nextXp,
    account_level: nextLevel,
    leveledUp: nextLevel > prevLevel,
    gained,
    prevLevel,
    nextLevel,
  };
}
