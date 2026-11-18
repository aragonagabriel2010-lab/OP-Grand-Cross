/**
 * PvP — rank, ricompense Libero/Ranked, premio settimanale.
 */

import { weekKey } from "@/lib/weeklyMeta";

export const PVP_KINDS = {
  CASUAL: "casual",
  RANKED: "ranked",
  FRIENDLY: "friendly",
};

/** Scale rating → titolo (One Piece / marina). */
export const PVP_RANKS = [
  {
    id: "rookie",
    name: "Recluta",
    minRating: 0,
    matchStrawberry: 4,
    weeklyStrawberry: 15,
    weeklyBerry: 200,
    color: "#94a3b8",
  },
  {
    id: "seaman",
    name: "Marinaio",
    minRating: 900,
    matchStrawberry: 6,
    weeklyStrawberry: 25,
    weeklyBerry: 350,
    color: "#38bdf8",
  },
  {
    id: "petty",
    name: "Sottufficiale",
    minRating: 1100,
    matchStrawberry: 8,
    weeklyStrawberry: 40,
    weeklyBerry: 500,
    color: "#34d399",
  },
  {
    id: "lieutenant",
    name: "Tenente",
    minRating: 1300,
    matchStrawberry: 11,
    weeklyStrawberry: 55,
    weeklyBerry: 700,
    color: "#a78bfa",
  },
  {
    id: "commander",
    name: "Comandante",
    minRating: 1500,
    matchStrawberry: 14,
    weeklyStrawberry: 75,
    weeklyBerry: 950,
    color: "#f472b6",
  },
  {
    id: "captain",
    name: "Capitano",
    minRating: 1700,
    matchStrawberry: 18,
    weeklyStrawberry: 100,
    weeklyBerry: 1200,
    color: "#f5a623",
  },
  {
    id: "admiral",
    name: "Ammiraglio",
    minRating: 1950,
    matchStrawberry: 24,
    weeklyStrawberry: 140,
    weeklyBerry: 1600,
    color: "#ef4444",
  },
  {
    id: "yonko",
    name: "Imperatore",
    minRating: 2200,
    matchStrawberry: 32,
    weeklyStrawberry: 200,
    weeklyBerry: 2200,
    color: "#fbbf24",
  },
];

export const CASUAL_WIN_BERRY = 120;
export const CASUAL_LOSS_BERRY = 35;
export const RANKED_START_RATING = 1000;
export const RANKED_K = 28;

function storageKey(uid) {
  return `opgv_pvp_${uid || "guest"}`;
}

function emptyState(week = weekKey()) {
  return {
    rating: RANKED_START_RATING,
    peakRating: RANKED_START_RATING,
    wins: 0,
    losses: 0,
    casualWins: 0,
    casualLosses: 0,
    week,
    weekPeakRating: RANKED_START_RATING,
    weekRatedGames: 0,
    weeklyClaimed: false,
  };
}

export function loadPvpState(uid) {
  const wk = weekKey();
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) {
      const fresh = emptyState(wk);
      savePvpState(uid, fresh);
      return fresh;
    }
    const data = { ...emptyState(wk), ...JSON.parse(raw) };
    if (data.week !== wk) {
      return {
        ...data,
        week: wk,
        weekPeakRating: data.rating || RANKED_START_RATING,
        weekRatedGames: 0,
        weeklyClaimed: false,
      };
    }
    return data;
  } catch {
    return emptyState(wk);
  }
}

export function savePvpState(uid, state) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function rankFromRating(rating) {
  const r = Number(rating) || 0;
  let current = PVP_RANKS[0];
  for (const tier of PVP_RANKS) {
    if (r >= tier.minRating) current = tier;
  }
  return current;
}

export function nextRank(rating) {
  const current = rankFromRating(rating);
  const idx = PVP_RANKS.findIndex((t) => t.id === current.id);
  return idx >= 0 && idx < PVP_RANKS.length - 1 ? PVP_RANKS[idx + 1] : null;
}

export function expectedScore(ratingA, ratingB) {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function applyRatedResult(uid, { won, opponentRating }) {
  const state = loadPvpState(uid);
  const opp = Number(opponentRating) || state.rating;
  const exp = expectedScore(state.rating, opp);
  const score = won ? 1 : 0;
  const delta = Math.round(RANKED_K * (score - exp));
  state.rating = Math.max(0, (state.rating || RANKED_START_RATING) + delta);
  state.peakRating = Math.max(state.peakRating || 0, state.rating);
  state.weekPeakRating = Math.max(state.weekPeakRating || 0, state.rating);
  state.weekRatedGames = (state.weekRatedGames || 0) + 1;
  if (won) state.wins = (state.wins || 0) + 1;
  else state.losses = (state.losses || 0) + 1;
  savePvpState(uid, state);
  return { state, delta, rank: rankFromRating(state.rating) };
}

export function applyCasualResult(uid, won) {
  const state = loadPvpState(uid);
  if (won) state.casualWins = (state.casualWins || 0) + 1;
  else state.casualLosses = (state.casualLosses || 0) + 1;
  savePvpState(uid, state);
  return state;
}

/** Ricompense a fine partita. Friendly = nessuna valuta. */
export function matchRewards(kind, { won, rating }) {
  if (kind === PVP_KINDS.FRIENDLY) {
    return { berry: 0, strawberry: 0, label: "Sfida amichevole · nessuna ricompensa" };
  }
  if (kind === PVP_KINDS.CASUAL) {
    const berry = won ? CASUAL_WIN_BERRY : CASUAL_LOSS_BERRY;
    return {
      berry,
      strawberry: 0,
      label: won ? `Libero · +${berry} Beri` : `Libero · +${berry} Beri (sconfitta)`,
    };
  }
  // Ranked: Fragole in base al rank (più alto = più fragole). Sconfitta: metà arrotondato giù, minimo 1 se hai giocato.
  const tier = rankFromRating(rating);
  const full = tier.matchStrawberry;
  const strawberry = won ? full : Math.max(1, Math.floor(full / 2));
  return {
    berry: 0,
    strawberry,
    label: won
      ? `Ranked · ${tier.name} · +${strawberry} Fragole`
      : `Ranked · ${tier.name} · +${strawberry} Fragole (sconfitta)`,
  };
}

export function weeklyPrizeForState(state) {
  const peak = state?.weekPeakRating ?? state?.rating ?? RANKED_START_RATING;
  const tier = rankFromRating(peak);
  return {
    tier,
    strawberry: tier.weeklyStrawberry,
    berry: tier.weeklyBerry,
    games: state?.weekRatedGames || 0,
    claimed: !!state?.weeklyClaimed,
    canClaim: !state?.weeklyClaimed && (state?.weekRatedGames || 0) >= 1,
  };
}

export function claimWeeklyPvpPrize(uid) {
  const state = loadPvpState(uid);
  const prize = weeklyPrizeForState(state);
  if (!prize.canClaim) return { ok: false, prize, state };
  state.weeklyClaimed = true;
  savePvpState(uid, state);
  return {
    ok: true,
    prize,
    state,
    reward: { strawberry: prize.strawberry, berry: prize.berry },
  };
}

/** Classifica locale + seed bot (finché non ci sono tanti profili online). */
export function buildLeaderboard(uid, myName = "Tu", extraProfiles = []) {
  const me = loadPvpState(uid);
  const bots = [
    { id: "bot_shanks", name: "Shanks Ghost", rating: 2180 },
    { id: "bot_mihawk", name: "Mihawk Echo", rating: 2050 },
    { id: "bot_smoker", name: "Smoker AI", rating: 1680 },
    { id: "bot_tashigi", name: "Tashigi AI", rating: 1420 },
    { id: "bot_helmeppo", name: "Helmeppo AI", rating: 1180 },
    { id: "bot_alvida", name: "Alvida Bot", rating: 980 },
    { id: "bot_morgan", name: "Morgan Bot", rating: 860 },
  ];
  const rows = [
    {
      id: uid || "me",
      name: myName,
      rating: me.rating,
      rank: rankFromRating(me.rating),
      isYou: true,
    },
    ...bots.map((b) => ({
      id: b.id,
      name: b.name,
      rating: b.rating,
      rank: rankFromRating(b.rating),
      isYou: false,
    })),
    ...extraProfiles.map((p) => ({
      id: p.uid || p.id,
      name: p.displayName || p.name || "Pirata",
      rating: p.rating ?? RANKED_START_RATING,
      rank: rankFromRating(p.rating ?? RANKED_START_RATING),
      isYou: false,
    })),
  ];
  rows.sort((a, b) => b.rating - a.rating);
  return rows.map((r, i) => ({ ...r, place: i + 1 }));
}
