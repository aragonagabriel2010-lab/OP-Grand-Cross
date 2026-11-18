/**
 * Matchmaking PvP / sfida — payload in sessionStorage + generazione rivali.
 */

import { effectiveHp } from "@/lib/gameUtils";
import { emptyStatusBoard } from "@/lib/battleEffects";
import { PVP_KINDS, loadPvpState, RANKED_START_RATING } from "@/lib/pvp";
import { fetchLeaderboardProfiles, fetchPublicProfile } from "@/lib/friends";

const MATCH_KEY = "opgv_pvp_match_v1";

const BOT_NAMES = [
  "Buggy Mirage",
  "Kuro Shade",
  "Don Krieg Echo",
  "Arlong Ghost",
  "Smoker Clone",
  "Tashigi Rival",
  "Coby Spar",
  "Helmeppo Duel",
  "Morgan Shade",
  "Alvida Phantom",
];

export function saveMatch(match) {
  try {
    sessionStorage.setItem(MATCH_KEY, JSON.stringify(match));
  } catch {
    /* ignore */
  }
}

export function loadMatch() {
  try {
    const raw = sessionStorage.getItem(MATCH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearMatch() {
  try {
    sessionStorage.removeItem(MATCH_KEY);
  } catch {
    /* ignore */
  }
}

function rarityWeight(r) {
  if (r === "SSR") return 4;
  if (r === "SR") return 3;
  if (r === "R") return 2;
  return 1;
}

function pickHeroes(heroes, count, seed = Math.random()) {
  const pool = [...(heroes || [])].filter((c) => c.role === "hero" || !c.role);
  if (!pool.length) return [];
  const scored = pool
    .map((c, i) => ({
      c,
      w: rarityWeight(c.rarity) + ((Math.sin(seed * 999 + i) + 1) * 0.5),
    }))
    .sort((a, b) => b.w - a.w);
  const out = [];
  const used = new Set();
  for (const row of scored) {
    if (out.length >= count) break;
    if (used.has(row.c.id)) continue;
    used.add(row.c.id);
    out.push(row.c);
  }
  while (out.length < count && pool.length) {
    const c = pool[Math.floor(Math.random() * pool.length)];
    if (!used.has(c.id)) {
      used.add(c.id);
      out.push(c);
    } else if (out.length < count) {
      out.push(c);
      break;
    }
  }
  return out.slice(0, count);
}

/** Roster difesa → fighters pronti per Battle. */
export function fightersFromDefense(defense, charMap, powerMult = 1) {
  const list = [];
  for (const slot of defense || []) {
    const c = charMap?.[slot.characterId] || charMap?.[slot.id];
    if (!c) continue;
    const ownedLike = {
      level: Math.max(1, Math.min(60, Number(slot.level) || 1)),
      ascension: Math.max(0, Math.min(3, Number(slot.ascension) || 0)),
      ultimateLevel: slot.ultimateLevel || 1,
    };
    const maxHp = Math.max(1, Math.round(effectiveHp(c, ownedLike) * powerMult));
    list.push({
      character: c,
      owned: ownedLike,
      hp: maxHp,
      maxHp,
      status: emptyStatusBoard(),
    });
  }
  return list;
}

export function buildBotOpponent({ heroes, charMap, myRating, kind }) {
  const rating = Math.max(
    700,
    Math.round((myRating || RANKED_START_RATING) + (Math.random() * 240 - 120))
  );
  const levelBase =
    kind === PVP_KINDS.RANKED
      ? Math.min(55, 12 + Math.floor((rating - 800) / 40))
      : Math.min(50, 10 + Math.floor(Math.random() * 25));
  const picked = pickHeroes(heroes, 3, Math.random());
  const defense = picked.map((c, i) => ({
    characterId: c.id,
    level: Math.min(60, levelBase + i * 2 + Math.floor(Math.random() * 4)),
    ascension: levelBase > 35 ? 2 : levelBase > 22 ? 1 : 0,
    ultimateLevel: 1,
    name: c.char_name,
    rarity: c.rarity,
    attribute: c.attribute,
  }));
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return {
    id: `bot_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    name,
    rating,
    isBot: true,
    defense,
    fighters: fightersFromDefense(defense, charMap, kind === PVP_KINDS.RANKED ? 1.05 : 1),
  };
}

export function buildChapterForMatch(match) {
  const kind = match?.kind || PVP_KINDS.CASUAL;
  const title =
    kind === PVP_KINDS.FRIENDLY
      ? "Sfida amichevole"
      : kind === PVP_KINDS.RANKED
        ? "Arena Ranked"
        : "Arena Libera";
  return {
    id: `pvp_${kind}_${match?.opponent?.id || "x"}`,
    chapter_number: 0,
    title,
    subtitle: match?.opponent?.name || "Avversario",
    dialogue_after:
      kind === PVP_KINDS.FRIENDLY
        ? "Buona partita, capitano."
        : kind === PVP_KINDS.RANKED
          ? "Punteggio classifica aggiornato."
          : "Beri assegnati.",
    reward_berry: 0,
    reward_strawberry: 0,
    is_boss: false,
    is_side: true,
    enemy_ids: (match?.opponent?.fighters || []).map((f) => f.character?.id).filter(Boolean),
  };
}

/**
 * Cerca avversario: profili online con difesa, altrimenti bot.
 */
export async function findOpponent({ uid, kind, heroes, charMap, friendProfile = null }) {
  const pvp = loadPvpState(uid);
  const myRating = pvp.rating || RANKED_START_RATING;

  if (kind === PVP_KINDS.FRIENDLY && friendProfile) {
    let profile = friendProfile;
    if (friendProfile.uid && (!friendProfile.defense || !friendProfile.defense.length)) {
      profile = (await fetchPublicProfile(friendProfile.uid)) || friendProfile;
    }
    let fighters = fightersFromDefense(profile.defense, charMap, 1);
    if (!fighters.length) {
      const bot = buildBotOpponent({ heroes, charMap, myRating, kind });
      fighters = bot.fighters;
    }
    return {
      kind,
      opponent: {
        id: profile.uid || profile.id || "friend",
        name: profile.displayName || profile.name || "Amico",
        rating: profile.rating || myRating,
        isBot: false,
        isFriend: true,
        defense: profile.defense || [],
        fighters,
      },
    };
  }

  const profiles = await fetchLeaderboardProfiles(20);
  const candidates = profiles.filter(
    (p) => p.uid !== uid && Array.isArray(p.defense) && p.defense.length > 0
  );
  if (candidates.length) {
    // Preferisci rating vicino in ranked
    candidates.sort((a, b) => {
      const da = Math.abs((a.rating || RANKED_START_RATING) - myRating);
      const db = Math.abs((b.rating || RANKED_START_RATING) - myRating);
      return da - db;
    });
    const pick =
      kind === PVP_KINDS.RANKED
        ? candidates[Math.floor(Math.random() * Math.min(5, candidates.length))]
        : candidates[Math.floor(Math.random() * candidates.length)];
    const fighters = fightersFromDefense(pick.defense, charMap, 1);
    if (fighters.length) {
      return {
        kind,
        opponent: {
          id: pick.uid,
          name: pick.displayName || "Pirata",
          rating: pick.rating || RANKED_START_RATING,
          isBot: false,
          defense: pick.defense,
          fighters,
        },
      };
    }
  }

  const bot = buildBotOpponent({ heroes, charMap, myRating, kind });
  return { kind, opponent: bot };
}

export function battlePathForKind(kind) {
  return `/battle/0?mode=pvp&kind=${encodeURIComponent(kind || PVP_KINDS.CASUAL)}`;
}
