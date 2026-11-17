/**
 * Loop giornaliero Home — 3 azioni chiare a mezzanotte locale.
 */

import { localDayKey } from "@/lib/dayClock";

function key(uid) {
  return `opgv_loop_${uid || "guest"}`;
}

function empty(day = localDayKey()) {
  return { day, story: false, fortress: false, kitchen: false };
}

export function loadDailyLoop(uid) {
  try {
    const raw = localStorage.getItem(key(uid));
    const today = localDayKey();
    if (!raw) {
      const fresh = empty(today);
      saveDailyLoop(uid, fresh);
      return fresh;
    }
    const data = JSON.parse(raw);
    if (data.day !== today) {
      const fresh = empty(today);
      saveDailyLoop(uid, fresh);
      return fresh;
    }
    return { ...empty(today), ...data, day: today };
  } catch {
    return empty();
  }
}

export function saveDailyLoop(uid, data) {
  try {
    localStorage.setItem(key(uid), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function markDailyLoop(uid, field) {
  if (!["story", "fortress", "kitchen"].includes(field)) return loadDailyLoop(uid);
  const data = loadDailyLoop(uid);
  if (data[field]) return data;
  const next = { ...data, [field]: true };
  saveDailyLoop(uid, next);
  return next;
}

export function dailyLoopProgress(data) {
  const done = [data?.story, data?.fortress, data?.kitchen].filter(Boolean).length;
  return { done, total: 3, complete: done >= 3 };
}
