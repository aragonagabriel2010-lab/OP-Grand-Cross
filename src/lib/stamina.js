/**
 * Energia (stamina) — consumo battaglia + recupero nel tempo.
 */
export const STAMINA_MAX_DEFAULT = 30;
export const STAMINA_BATTLE_COST = 5;
export const STAMINA_BOSS_COST = 8;
/** 1 energia ogni 5 minuti */
export const STAMINA_REGEN_MS = 5 * 60 * 1000;

export function battleStaminaCost(chapter, { hard = false } = {}) {
  const base = chapter?.is_boss ? STAMINA_BOSS_COST : STAMINA_BATTLE_COST;
  return base + (hard ? 3 : 0);
}

/**
 * Calcola energia attuale in base al tempo trascorso da stamina_updated_at.
 * Non muta lo stato salvato.
 */
export function computeStamina(state = {}, now = Date.now()) {
  const stamina_max = state.stamina_max ?? STAMINA_MAX_DEFAULT;
  let stamina = state.stamina ?? stamina_max;
  let stamina_updated_at = state.stamina_updated_at ?? now;

  if (stamina >= stamina_max) {
    return {
      stamina: stamina_max,
      stamina_max,
      stamina_updated_at: now,
      nextInMs: null,
      changed: stamina !== state.stamina || state.stamina_updated_at == null,
    };
  }

  const elapsed = Math.max(0, now - stamina_updated_at);
  const gained = Math.floor(elapsed / STAMINA_REGEN_MS);

  if (gained > 0) {
    stamina = Math.min(stamina_max, stamina + gained);
    stamina_updated_at += gained * STAMINA_REGEN_MS;
  }

  if (stamina >= stamina_max) {
    return {
      stamina: stamina_max,
      stamina_max,
      stamina_updated_at: now,
      nextInMs: null,
      changed: true,
    };
  }

  const nextInMs = STAMINA_REGEN_MS - (now - stamina_updated_at);
  const changed =
    stamina !== (state.stamina ?? stamina_max) ||
    stamina_updated_at !== state.stamina_updated_at;

  return { stamina, stamina_max, stamina_updated_at, nextInMs, changed };
}

export function canAffordBattle(state, cost = STAMINA_BATTLE_COST, now = Date.now()) {
  return computeStamina(state, now).stamina >= cost;
}

/**
 * Sottrae il costo battaglia dopo aver applicato il regen.
 * Se l'energia era piena, avvia il timer di recupero da adesso.
 */
export function spendStamina(state, cost = STAMINA_BATTLE_COST, now = Date.now()) {
  const cur = computeStamina(state, now);
  if (cur.stamina < cost) {
    return { ok: false, ...cur, cost };
  }
  const wasFull = cur.stamina >= cur.stamina_max;
  const stamina = cur.stamina - cost;
  const stamina_updated_at = wasFull ? now : cur.stamina_updated_at;
  return {
    ok: true,
    stamina,
    stamina_max: cur.stamina_max,
    stamina_updated_at,
    cost,
    nextInMs:
      stamina >= cur.stamina_max
        ? null
        : STAMINA_REGEN_MS - (now - stamina_updated_at),
  };
}

/** Restituisce energia (es. Annulla intro battaglia). */
export function refundStamina(state, amount, now = Date.now()) {
  const cur = computeStamina(state, now);
  const add = Math.max(0, amount || 0);
  const stamina = Math.min(cur.stamina_max, cur.stamina + add);
  return {
    ok: true,
    stamina,
    stamina_max: cur.stamina_max,
    stamina_updated_at: stamina >= cur.stamina_max ? now : cur.stamina_updated_at,
    amount: add,
    nextInMs:
      stamina >= cur.stamina_max
        ? null
        : STAMINA_REGEN_MS - (now - (stamina >= cur.stamina_max ? now : cur.stamina_updated_at)),
  };
}

export function formatRegenCountdown(ms) {
  if (ms == null || ms <= 0) return null;
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
