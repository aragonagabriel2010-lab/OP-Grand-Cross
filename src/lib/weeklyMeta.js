/**
 * Meta settimanale — obiettivo unico (es. 5 Hard clears).
 * Reset: lunedì 00:00 locale.
 */

import { localDayKey } from "@/lib/dayClock";

export const WEEKLY_META = {
  id: "hard_assault_v1",
  title: "Assalto Hard",
  blurb: "Completa 5 missioni in Hard questa settimana.",
  target: 5,
  rewardLabel: "+30 Fragole · +1 Scheggia",
  reward: { strawberry: 30, materials: { dawn_shard: 1 } },
};

/** Chiave settimana ISO-ish: year-Wweek (lunedì come inizio) */
export function weekKey(now = new Date()) {
  const d = new Date(now);
  const day = (d.getDay() + 6) % 7; // lun=0
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return localDayKey(d);
}

function storageKey(uid) {
  return `opgv_weekly_${uid || "guest"}`;
}

function empty(week = weekKey()) {
  return {
    week,
    metaId: WEEKLY_META.id,
    progress: 0,
    claimed: false,
  };
}

export function loadWeeklyMeta(uid) {
  try {
    const raw = localStorage.getItem(storageKey(uid));
    const w = weekKey();
    if (!raw) {
      const fresh = empty(w);
      saveWeeklyMeta(uid, fresh);
      return fresh;
    }
    const data = JSON.parse(raw);
    if (data.week !== w || data.metaId !== WEEKLY_META.id) {
      const fresh = empty(w);
      saveWeeklyMeta(uid, fresh);
      return fresh;
    }
    return { ...empty(w), ...data, week: w };
  } catch {
    return empty();
  }
}

export function saveWeeklyMeta(uid, data) {
  try {
    localStorage.setItem(storageKey(uid), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function bumpWeeklyHardClear(uid) {
  const data = loadWeeklyMeta(uid);
  if (data.claimed) return data;
  data.progress = Math.min(WEEKLY_META.target, (data.progress || 0) + 1);
  saveWeeklyMeta(uid, data);
  return data;
}

export function claimWeeklyMeta(uid) {
  const data = loadWeeklyMeta(uid);
  if (data.claimed || (data.progress || 0) < WEEKLY_META.target) {
    return { ok: false, data, reward: null };
  }
  data.claimed = true;
  saveWeeklyMeta(uid, data);
  return { ok: true, data, reward: WEEKLY_META.reward };
}

export function weeklyMetaStatus(uid) {
  const data = loadWeeklyMeta(uid);
  return {
    ...WEEKLY_META,
    progress: data.progress || 0,
    claimed: !!data.claimed,
    done: (data.progress || 0) >= WEEKLY_META.target,
    week: data.week,
  };
}
