/**
 * Missioni giornaliere / secondarie + login mensile — localStorage (per uid).
 *
 * Reset a mezzanotte locale (day key YYYY-MM-DD), non rolling 24h.
 * Ogni giorno: 3 missioni casuali dal pool di 20 + 1 fissa (+10 Fragole).
 */

import { localDayKey } from "@/lib/dayClock";

function todayKey(now = new Date()) {
  return localDayKey(now);
}

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function storageKey(uid) {
  return `opgv_dailies_${uid || "guest"}`;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Missione fissa ogni giorno. */
export const DAILY_GUARANTEED = {
  id: "daily_fragole",
  title: "Razione giornaliera",
  rewardLabel: "+10 Fragole",
  reward: { strawberry: 10 },
  target: 1,
  route: null,
  action: null,
  claimOnly: true,
};

/**
 * Pool di 20 missioni. Ogni giorno ne vengono scelte 3 a caso.
 * `action` = tag usato da bumpDaily (es. clear_chapter, gacha_pull, level_up).
 */
export const DAILY_POOL = [
  {
    id: "d01",
    title: "Completa 1 capitolo",
    rewardLabel: "+50 Beri",
    reward: { berry: 50 },
    target: 1,
    route: "/fight/story",
    action: "clear_chapter",
  },
  {
    id: "d02",
    title: "Completa 2 capitoli",
    rewardLabel: "+100 Beri",
    reward: { berry: 100 },
    target: 2,
    route: "/fight/story",
    action: "clear_chapter",
  },
  {
    id: "d03",
    title: "Vinci una battaglia Hard",
    rewardLabel: "+8 Fragole",
    reward: { strawberry: 8 },
    target: 1,
    route: "/fight/story",
    action: "clear_hard",
  },
  {
    id: "d04",
    title: "Sconfiggi 1 boss",
    rewardLabel: "+80 Beri",
    reward: { berry: 80 },
    target: 1,
    route: "/fight/story",
    action: "clear_boss",
  },
  {
    id: "d05",
    title: "Esegui 1 estrazione",
    rewardLabel: "+5 Fragole",
    reward: { strawberry: 5 },
    target: 1,
    route: "/gacha",
    action: "gacha_pull",
  },
  {
    id: "d06",
    title: "Esegui 3 estrazioni",
    rewardLabel: "+12 Fragole",
    reward: { strawberry: 12 },
    target: 3,
    route: "/gacha",
    action: "gacha_pull",
  },
  {
    id: "d07",
    title: "Esegui un'estrazione ×10",
    rewardLabel: "+15 Fragole",
    reward: { strawberry: 15 },
    target: 1,
    route: "/gacha",
    action: "gacha_ten",
  },
  {
    id: "d08",
    title: "Potenzia un personaggio",
    rewardLabel: "+40 Beri",
    reward: { berry: 40 },
    target: 1,
    route: "/characters",
    action: "level_up",
  },
  {
    id: "d09",
    title: "Aumenta 3 livelli",
    rewardLabel: "+90 Beri",
    reward: { berry: 90 },
    target: 3,
    route: "/characters",
    action: "level_up",
  },
  {
    id: "d10",
    title: "Risveglia un personaggio",
    rewardLabel: "+6 Fragole",
    reward: { strawberry: 6 },
    target: 1,
    route: "/characters",
    action: "awaken",
  },
  {
    id: "d11",
    title: "Potenzia un'Ultimate",
    rewardLabel: "+70 Beri",
    reward: { berry: 70 },
    target: 1,
    route: "/characters",
    action: "ulti_up",
  },
  {
    id: "d12",
    title: "Apri l'Inventario",
    rewardLabel: "+25 Beri",
    reward: { berry: 25 },
    target: 1,
    route: "/inventory",
    action: "open_inventory",
  },
  {
    id: "d13",
    title: "Visita la pagina Personaggi",
    rewardLabel: "+25 Beri",
    reward: { berry: 25 },
    target: 1,
    route: "/characters",
    action: "open_characters",
  },
  {
    id: "d14",
    title: "Gioca 2 battaglie",
    rewardLabel: "+60 Beri",
    reward: { berry: 60 },
    target: 2,
    route: "/fight/story",
    action: "battle_win",
  },
  {
    id: "d15",
    title: "Ottieni materiali in missione",
    rewardLabel: "+5 Fragole",
    reward: { strawberry: 5 },
    target: 1,
    route: "/fight/story",
    action: "material_drop",
  },
  {
    id: "d16",
    title: "Salva 1 capitolo senza KO",
    rewardLabel: "+100 Beri",
    reward: { berry: 100 },
    target: 1,
    route: "/fight/story",
    action: "flawless_clear",
  },
  {
    id: "d17",
    title: "Usa un'Ultimate in battaglia",
    rewardLabel: "+45 Beri",
    reward: { berry: 45 },
    target: 1,
    route: "/fight/story",
    action: "use_ulti",
  },
  {
    id: "d18",
    title: "Fondi 2 carte abilità",
    rewardLabel: "+35 Beri",
    reward: { berry: 35 },
    target: 1,
    route: "/fight/story",
    action: "merge_cards",
  },
  {
    id: "d19",
    title: "Apri le Missioni",
    rewardLabel: "+20 Beri",
    reward: { berry: 20 },
    target: 1,
    route: "/",
    action: "open_missions",
  },
  {
    id: "d20",
    title: "Controlla il Gacha",
    rewardLabel: "+4 Fragole",
    reward: { strawberry: 4 },
    target: 1,
    route: "/gacha",
    action: "open_gacha",
  },
];

/** @deprecated usa DAILY_POOL + DAILY_GUARANTEED; tenuto per compatibilità import */
export const DAILY_DEFS = [...DAILY_POOL, DAILY_GUARANTEED];

/** Missioni secondarie (progressione account, non resettano ogni giorno). */
export const SECONDARY_DEFS = [
  {
    id: "story_5",
    title: "Raggiungi capitolo 5",
    rewardLabel: "+100 Beri",
    reward: { berry: 100 },
    target: 5,
    metric: "story_progress",
  },
  {
    id: "story_10",
    title: "Raggiungi capitolo 10",
    rewardLabel: "+10 Fragole",
    reward: { strawberry: 10 },
    target: 10,
    metric: "story_progress",
  },
  {
    id: "rank_3",
    title: "Raggiungi Rank 3",
    rewardLabel: "+80 Beri",
    reward: { berry: 80 },
    target: 3,
    metric: "account_level",
  },
  {
    id: "crew_3",
    title: "Possiedi 3 eroi",
    rewardLabel: "+5 Fragole",
    reward: { strawberry: 5 },
    target: 3,
    metric: "owned_heroes",
  },
];

/** Premi login mensili — misti (beri / fragole / materiali), non tutti uguali. */
export const LOGIN_DAY_REWARDS = [
  { label: "+30B", berry: 30 },
  { label: "+3F", strawberry: 3 },
  { label: "+40B", berry: 40 },
  { label: "+1Cr", materials: { sea_crystal: 1 } },
  { label: "+50B", berry: 50 },
  { label: "+5F", strawberry: 5 },
  { label: "+25B +2F", berry: 25, strawberry: 2 },
  { label: "+1Cr", materials: { pirate_crest: 1 } },
  { label: "+60B", berry: 60 },
  { label: "+4F", strawberry: 4 },
  { label: "+35B", berry: 35 },
  { label: "+2Cr", materials: { sea_crystal: 2 } },
  { label: "+70B", berry: 70 },
  { label: "+6F", strawberry: 6 },
  { label: "+45B +1F", berry: 45, strawberry: 1 },
  { label: "+1Sg", materials: { dawn_shard: 1 } },
  { label: "+80B", berry: 80 },
  { label: "+8F", strawberry: 8 },
  { label: "+55B", berry: 55 },
  { label: "+1Cr +2F", strawberry: 2, materials: { pirate_crest: 1 } },
  { label: "+90B", berry: 90 },
  { label: "+5F", strawberry: 5 },
  { label: "+3Cr", materials: { sea_crystal: 3 } },
  { label: "+100B", berry: 100 },
  { label: "+10F", strawberry: 10 },
  { label: "+2Sg", materials: { dawn_shard: 2 } },
  { label: "+120B", berry: 120 },
  { label: "+7F +1Cr", strawberry: 7, materials: { pirate_crest: 1 } },
  { label: "+150B", berry: 150 },
  { label: "+12F", strawberry: 12 },
  { label: "+200B +5F", berry: 200, strawberry: 5 },
];

export function loginRewardForDay(dayNum) {
  const idx = Math.max(0, Math.min(LOGIN_DAY_REWARDS.length - 1, (dayNum || 1) - 1));
  return LOGIN_DAY_REWARDS[idx];
}

const ALL_DAILY_BY_ID = Object.fromEntries(
  [...DAILY_POOL, DAILY_GUARANTEED].map((d) => [d.id, d])
);

export function getDailyDef(id) {
  return ALL_DAILY_BY_ID[id] || null;
}

/** 3 id casuali stabili per il giorno (seed = data). */
export function pickRandomDailyIds(day = todayKey()) {
  const rng = mulberry32(hashString(`opgv-daily-${day}`));
  const pool = [...DAILY_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, 3).map((d) => d.id);
}

export function buildActiveDailyIds(day = todayKey()) {
  return [...pickRandomDailyIds(day), DAILY_GUARANTEED.id];
}

function emptyProgressFor(ids) {
  const progress = {};
  for (const id of ids) {
    const def = getDailyDef(id);
    progress[id] = def?.claimOnly ? def.target : 0;
  }
  return progress;
}

function emptyDay() {
  const day = todayKey();
  const activeDailyIds = buildActiveDailyIds(day);
  return {
    day,
    activeDailyIds,
    progress: emptyProgressFor(activeDailyIds),
    claimed: {},
    secondaryClaimed: {},
    loginStreak: 1,
    lastLoginDay: day,
    loginClaimedToday: false,
    loginMonth: monthKey(),
    loginClaimedDays: {},
  };
}

function ensureActiveDailies(data, day) {
  let activeDailyIds = Array.isArray(data.activeDailyIds) ? data.activeDailyIds.filter(Boolean) : [];
  const hasGuaranteed = activeDailyIds.includes(DAILY_GUARANTEED.id);
  const randomIds = activeDailyIds.filter((id) => id !== DAILY_GUARANTEED.id && getDailyDef(id));

  if (randomIds.length !== 3 || !hasGuaranteed) {
    activeDailyIds = buildActiveDailyIds(day);
  }

  const progress = { ...(data.progress || {}) };
  for (const id of activeDailyIds) {
    const def = getDailyDef(id);
    if (progress[id] == null) {
      progress[id] = def?.claimOnly ? def.target : 0;
    }
    if (def?.claimOnly) {
      progress[id] = Math.max(progress[id] || 0, def.target);
    }
  }

  return { ...data, activeDailyIds, progress };
}

export function todaysDailyDefs(data) {
  const ids = data?.activeDailyIds?.length
    ? data.activeDailyIds
    : buildActiveDailyIds(data?.day || todayKey());
  return ids.map(getDailyDef).filter(Boolean);
}

export function loadDailies(uid) {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) {
      const fresh = emptyDay();
      saveDailies(uid, fresh);
      return fresh;
    }
    const data = JSON.parse(raw);
    const today = todayKey();
    const month = monthKey();

    let loginClaimedDays = data.loginClaimedDays || {};
    let loginMonth = data.loginMonth || month;
    if (loginMonth !== month) {
      loginMonth = month;
      loginClaimedDays = {};
    }

    if (data.day !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
      const streakContinues = data.lastLoginDay === yKey || data.day === yKey;
      const activeDailyIds = buildActiveDailyIds(today);
      const next = {
        day: today,
        activeDailyIds,
        progress: emptyProgressFor(activeDailyIds),
        claimed: {},
        secondaryClaimed: data.secondaryClaimed || {},
        loginStreak: streakContinues ? (data.loginStreak || 1) + 1 : 1,
        lastLoginDay: today,
        loginClaimedToday: false,
        loginMonth,
        loginClaimedDays,
      };
      saveDailies(uid, next);
      return next;
    }

    const merged = ensureActiveDailies(
      {
        ...emptyDay(),
        ...data,
        day: today,
        loginMonth,
        loginClaimedDays,
        secondaryClaimed: data.secondaryClaimed || {},
      },
      today
    );
    if (
      JSON.stringify(merged.activeDailyIds) !== JSON.stringify(data.activeDailyIds) ||
      !data.activeDailyIds
    ) {
      saveDailies(uid, merged);
    }
    return merged;
  } catch {
    return emptyDay();
  }
}

export function saveDailies(uid, data) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/**
 * Incrementa progresso per tutte le missioni attive con quel `action`.
 * Es. bumpDaily(uid, "gacha_pull", 1) oppure bumpDaily(uid, "gacha_ten").
 */
export function bumpDaily(uid, actionOrId, amount = 1) {
  const data = loadDailies(uid);
  const active = new Set(data.activeDailyIds || []);
  let changed = false;

  // Compat: se passano un id missione diretto
  const direct = getDailyDef(actionOrId);
  if (direct && active.has(direct.id) && !direct.claimOnly) {
    const cur = data.progress[direct.id] || 0;
    data.progress[direct.id] = Math.min(direct.target, cur + amount);
    changed = true;
  }

  for (const id of active) {
    const def = getDailyDef(id);
    if (!def || def.claimOnly) continue;
    if (def.action !== actionOrId) continue;
    const cur = data.progress[id] || 0;
    data.progress[id] = Math.min(def.target, cur + amount);
    changed = true;
  }

  if (changed) {
    saveDailies(uid, data);
  }
  return data;
}

export function claimDaily(uid, missionId) {
  const data = loadDailies(uid);
  const def = getDailyDef(missionId);
  if (!def) return { ok: false, data, reward: null };
  const active = data.activeDailyIds || [];
  if (!active.includes(missionId)) return { ok: false, data, reward: null };
  if (data.claimed[missionId]) return { ok: false, data, reward: null };
  const need = def.target || 1;
  if ((data.progress[missionId] || 0) < need) return { ok: false, data, reward: null };
  data.claimed[missionId] = true;
  saveDailies(uid, data);
  return { ok: true, data, reward: def.reward };
}

function secondaryProgress(def, ctx) {
  if (def.metric === "story_progress") return Math.min(def.target, ctx.storyProgress || 0);
  if (def.metric === "account_level") return Math.min(def.target, ctx.accountLevel || 1);
  if (def.metric === "owned_heroes") return Math.min(def.target, ctx.ownedHeroes || 0);
  return 0;
}

export function secondaryStatus(data, def, ctx) {
  const progress = secondaryProgress(def, ctx);
  const claimed = !!(data.secondaryClaimed || {})[def.id];
  return {
    progress,
    target: def.target,
    done: progress >= def.target,
    claimed,
  };
}

export function claimSecondary(uid, missionId, ctx) {
  const data = loadDailies(uid);
  const def = SECONDARY_DEFS.find((d) => d.id === missionId);
  if (!def) return { ok: false, data, reward: null };
  const st = secondaryStatus(data, def, ctx);
  if (st.claimed || !st.done) return { ok: false, data, reward: null };
  data.secondaryClaimed = { ...(data.secondaryClaimed || {}), [missionId]: true };
  saveDailies(uid, data);
  return { ok: true, data, reward: def.reward };
}

/** Bonus login legacy (streak) — ancora usato se chiamato. */
export function claimLoginBonus(uid) {
  const data = loadDailies(uid);
  if (data.loginClaimedToday) return { ok: false, data, berry: 0, streak: data.loginStreak };
  const streak = Math.min(7, data.loginStreak || 1);
  const berry = 20 * streak;
  data.loginClaimedToday = true;
  data.lastLoginDay = todayKey();
  const dayNum = new Date().getDate();
  data.loginClaimedDays = { ...(data.loginClaimedDays || {}), [String(dayNum)]: true };
  saveDailies(uid, data);
  return { ok: true, data, berry, streak };
}

/**
 * Login mensile: solo il giorno corrente è ritirabile.
 * I giorni saltati restano persi (non recuperabili).
 */
export function claimMonthlyLogin(uid) {
  const data = loadDailies(uid);
  const now = new Date();
  const dayNum = now.getDate();
  const key = String(dayNum);
  const claimed = { ...(data.loginClaimedDays || {}) };
  if (claimed[key] || data.loginClaimedToday) {
    return { ok: false, data, reward: null, day: dayNum };
  }
  const reward = { ...loginRewardForDay(dayNum) };
  claimed[key] = true;
  data.loginClaimedDays = claimed;
  data.loginClaimedToday = true;
  data.lastLoginDay = todayKey();
  data.loginMonth = monthKey(now);
  saveDailies(uid, data);
  return { ok: true, data, reward, day: dayNum };
}

export function monthlyLoginGrid(data, now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const claimed = data.loginClaimedDays || {};
  const cells = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const reward = loginRewardForDay(d);
    const isClaimed = !!claimed[String(d)];
    let state = "future";
    if (d < today) state = isClaimed ? "claimed" : "missed";
    else if (d === today) state = isClaimed || data.loginClaimedToday ? "claimed" : "today";
    cells.push({ day: d, reward, label: reward.label, state });
  }
  return { year, month, daysInMonth, today, cells };
}

export function missionStatus(data, missionId) {
  const def = getDailyDef(missionId);
  if (!def) return { progress: 0, target: 1, done: false, claimed: false };
  const progress = data.progress?.[missionId] || 0;
  const claimed = !!data.claimed?.[missionId];
  const target = def.target || 1;
  return {
    progress,
    target,
    done: progress >= target,
    claimed,
  };
}
