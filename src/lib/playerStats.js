/**
 * Statistiche giocatore — derivate da save locale + contatori battaglia
 */
const STATS_KEY = "opgv_stats_v1";

export function loadBattleStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) {
      return { battlesPlayed: 0, wins: 0, losses: 0, gachaPulls: 0 };
    }
    return JSON.parse(raw);
  } catch {
    return { battlesPlayed: 0, wins: 0, losses: 0, gachaPulls: 0 };
  }
}

export function recordBattleResult(won) {
  const s = loadBattleStats();
  s.battlesPlayed = (s.battlesPlayed || 0) + 1;
  if (won) s.wins = (s.wins || 0) + 1;
  else s.losses = (s.losses || 0) + 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
  void import("@/lib/localDb").then((m) => m.syncCloudSave?.()).catch(() => {});
  return s;
}

export function recordGachaPull(count = 1) {
  const s = loadBattleStats();
  s.gachaPulls = (s.gachaPulls || 0) + count;
  localStorage.setItem(STATS_KEY, JSON.stringify(s));
  void import("@/lib/localDb").then((m) => m.syncCloudSave?.()).catch(() => {});
  return s;
}

export function computePlayerStats({ owned = [], charMap = {}, playerState = {} } = {}) {
  const battle = loadBattleStats();
  const uniqueChars = new Set(owned.map((o) => o.character_id).filter(Boolean));
  let teamPower = 0;
  const team = (playerState.team || []).filter(Boolean);
  team.forEach((id) => {
    const o = owned.find((x) => x.id === id);
    if (!o) return;
    const c = charMap[o.character_id];
    if (!c) return;
    const lvl = o.level || 1;
    const asc = o.ascension || 0;
    teamPower += Math.round((c.hp + c.attack * 2) * (1 + (lvl - 1) * 0.08 + asc * 0.15));
  });

  return {
    battlesPlayed: battle.battlesPlayed || 0,
    wins: battle.wins || 0,
    losses: battle.losses || 0,
    winRate:
      battle.battlesPlayed > 0
        ? Math.round(((battle.wins || 0) / battle.battlesPlayed) * 100)
        : 0,
    charactersOwned: owned.length,
    uniqueCharacters: uniqueChars.size,
    teamPower,
    storyProgress: playerState.story_progress || 1,
    accountLevel: playerState.account_level || 1,
    berry: playerState.berry || 0,
    strawberry: playerState.strawberry || 0,
    gachaPulls: battle.gachaPulls || 0,
  };
}
