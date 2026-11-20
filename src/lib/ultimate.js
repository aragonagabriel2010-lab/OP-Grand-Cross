/**
 * Sistema Ultimate + duplicati (stile 7DS:GC).
 *
 * ultimateLevel: 1..6 (5 potenziamenti dal base)
 * ultimateTokens: gettoni da doppioni
 */
import { db } from "@/lib/localDb";
import { effectiveAttack, tileDamage } from "@/lib/gameUtils";

export const ULTIMATE_MIN_LEVEL = 1;
export const ULTIMATE_MAX_LEVEL = 6;
/** Potenziamenti possibili da Lv1 → Lv6 */
export const ULTIMATE_MAX_UPGRADES = ULTIMATE_MAX_LEVEL - ULTIMATE_MIN_LEVEL;

/** +12% potenza Ulti per ogni livello oltre il 1 */
export const ULTIMATE_POWER_STEP = 0.12;
/** +10% intensità effetti (heal/buff/debuff) per livello */
export const ULTIMATE_EFFECT_STEP = 0.1;

export function normalizeUltimateFields(owned = {}) {
  const ultimateLevel = Math.min(
    ULTIMATE_MAX_LEVEL,
    Math.max(ULTIMATE_MIN_LEVEL, Number(owned.ultimateLevel ?? ULTIMATE_MIN_LEVEL) || ULTIMATE_MIN_LEVEL)
  );
  const ultimateTokens = Math.max(0, Number(owned.ultimateTokens ?? 0) || 0);
  return { ...owned, ultimateLevel, ultimateTokens };
}

export function ultimateLevelMultiplier(level = ULTIMATE_MIN_LEVEL) {
  const lv = Math.min(ULTIMATE_MAX_LEVEL, Math.max(ULTIMATE_MIN_LEVEL, level || 1));
  return 1 + (lv - 1) * ULTIMATE_POWER_STEP;
}

export function ultimateEffectMultiplier(level = ULTIMATE_MIN_LEVEL) {
  const lv = Math.min(ULTIMATE_MAX_LEVEL, Math.max(ULTIMATE_MIN_LEVEL, level || 1));
  return 1 + (lv - 1) * ULTIMATE_EFFECT_STEP;
}

export function getUltimateMove(character) {
  return character?.moves?.[3] || null;
}

export function scaledUltimatePower(character, owned) {
  const move = getUltimateMove(character);
  if (!move) return 0;
  const lv = owned?.ultimateLevel ?? ULTIMATE_MIN_LEVEL;
  return Math.max(1, Math.round(move.power * ultimateLevelMultiplier(lv)));
}

/** Danno Ulti stimato (stesso modello della battaglia, stelle oro). */
export function estimateUltimateDamage(character, owned, { stars = 3, ultBurst = 1.5 } = {}) {
  const move = getUltimateMove(character);
  if (!move) return 0;
  const lv = owned?.ultimateLevel ?? ULTIMATE_MIN_LEVEL;
  const base = tileDamage(character, owned, move, stars);
  return Math.max(1, Math.round(base * ultBurst * ultimateLevelMultiplier(lv)));
}

export function ultimatePreview(character, owned) {
  const move = getUltimateMove(character);
  const level = owned?.ultimateLevel ?? ULTIMATE_MIN_LEVEL;
  const tokens = owned?.ultimateTokens ?? 0;
  const atMax = level >= ULTIMATE_MAX_LEVEL;
  const nextLevel = Math.min(ULTIMATE_MAX_LEVEL, level + 1);
  const currentDmg = estimateUltimateDamage(character, { ...owned, ultimateLevel: level });
  const nextDmg = estimateUltimateDamage(character, { ...owned, ultimateLevel: nextLevel });
  const currentPower = scaledUltimatePower(character, { ...owned, ultimateLevel: level });
  const nextPower = scaledUltimatePower(character, { ...owned, ultimateLevel: nextLevel });

  return {
    move,
    level,
    tokens,
    atMax,
    canUpgrade: !atMax && tokens >= 1,
    upgradesDone: level - ULTIMATE_MIN_LEVEL,
    upgradesMax: ULTIMATE_MAX_UPGRADES,
    current: {
      level,
      power: currentPower,
      damage: currentDmg,
      mult: ultimateLevelMultiplier(level),
      effectMult: ultimateEffectMultiplier(level),
    },
    next: atMax
      ? null
      : {
          level: nextLevel,
          power: nextPower,
          damage: nextDmg,
          mult: ultimateLevelMultiplier(nextLevel),
          effectMult: ultimateEffectMultiplier(nextLevel),
        },
  };
}

/**
 * Aggiunge un personaggio alla collezione.
 * Se già posseduto → +1 ultimateTokens (niente nuova copia).
 */
export async function addCharacter(characterId) {
  if (!characterId) throw new Error("characterId richiesto");
  const all = await db.entities.OwnedCharacter.list();
  const existing = all.find((o) => o.character_id === characterId);

  if (existing) {
    const cur = normalizeUltimateFields(existing);
    const updated = await db.entities.OwnedCharacter.update(existing.id, {
      ultimateLevel: cur.ultimateLevel,
      ultimateTokens: cur.ultimateTokens + 1,
    });
    if (!updated?.id) throw new Error("Aggiornamento doppione fallito");
    return {
      owned: normalizeUltimateFields(updated),
      isDuplicate: true,
      tokensGained: 1,
      characterId,
    };
  }

  const created = await db.entities.OwnedCharacter.create({
    character_id: characterId,
    level: 1,
    exp: 0,
    ascension: 0,
    ultimateLevel: ULTIMATE_MIN_LEVEL,
    ultimateTokens: 0,
  });
  if (!created?.id || created.character_id !== characterId) {
    throw new Error("Creazione personaggio fallita");
  }
  return {
    owned: normalizeUltimateFields(created),
    isDuplicate: false,
    tokensGained: 0,
    characterId,
  };
}

function ownedRank(o) {
  const n = normalizeUltimateFields(o);
  return (
    (n.level || 1) * 1000 +
    (n.ascension || 0) * 100 +
    (n.ultimateLevel || 1) * 10 +
    (n.ultimateTokens || 0)
  );
}

/**
 * Unisce doppioni già presenti (save pre-sistema):
 * tiene la copia più forte e converte le altre in Gettoni Ulti.
 * Aggiorna anche il team se puntava a id eliminati.
 */
export async function consolidateDuplicateOwned(ownedList = [], playerState = null) {
  const byChar = new Map();
  for (const o of ownedList) {
    if (!o?.character_id) continue;
    const list = byChar.get(o.character_id) || [];
    list.push(o);
    byChar.set(o.character_id, list);
  }

  let changed = false;
  const idRemap = new Map(); // deletedId -> keeperId
  const nextOwned = [];

  for (const [, copies] of byChar) {
    if (copies.length === 1) {
      nextOwned.push(normalizeUltimateFields(copies[0]));
      continue;
    }

    changed = true;
    const sorted = [...copies].sort((a, b) => ownedRank(b) - ownedRank(a));
    const keeper = normalizeUltimateFields(sorted[0]);
    const extras = sorted.slice(1);
    const tokensFromDupes = extras.length;
    const mergedTokens = (keeper.ultimateTokens || 0) + tokensFromDupes;

    // Somma eventuali token già presenti sulle copie eliminate
    const tokensOnExtras = extras.reduce(
      (s, o) => s + (normalizeUltimateFields(o).ultimateTokens || 0),
      0
    );

    const updated = await db.entities.OwnedCharacter.update(keeper.id, {
      ultimateLevel: keeper.ultimateLevel,
      ultimateTokens: mergedTokens + tokensOnExtras,
    });

    for (const extra of extras) {
      idRemap.set(extra.id, keeper.id);
      await db.entities.OwnedCharacter.delete(extra.id);
    }

    nextOwned.push(normalizeUltimateFields(updated));
  }

  let nextPlayerState = playerState;
  if (changed && playerState?.id && playerState.team) {
    const team = (playerState.team || []).map((id) => {
      if (!id) return id;
      return idRemap.get(id) || id;
    });
    // Evita lo stesso personaggio più volte in squadra
    const seen = new Set();
    const fixed = team.map((id) => {
      if (!id) return null;
      if (seen.has(id)) return null;
      seen.add(id);
      return id;
    });
    while (fixed.length < 3) fixed.push(null);
    nextPlayerState = await db.entities.PlayerState.update(playerState.id, {
      team: [fixed[0] || null, fixed[1] || null, fixed[2] || null],
    });
  }

  return {
    owned: nextOwned,
    playerState: nextPlayerState,
    changed,
    mergedCount: idRemap.size,
  };
}

/**
 * Consuma 1 gettone e alza ultimateLevel di 1 (max 6).
 */
export async function upgradeUltimate(ownedId) {
  const row = await db.entities.OwnedCharacter.get(ownedId);
  if (!row) throw new Error("Personaggio non trovato");
  const cur = normalizeUltimateFields(row);
  if (cur.ultimateLevel >= ULTIMATE_MAX_LEVEL) {
    throw new Error("Ultimate già al livello massimo");
  }
  if (cur.ultimateTokens < 1) {
    throw new Error("Gettoni Ulti insufficienti");
  }
  const updated = await db.entities.OwnedCharacter.update(ownedId, {
    ultimateLevel: cur.ultimateLevel + 1,
    ultimateTokens: cur.ultimateTokens - 1,
  });
  return normalizeUltimateFields(updated);
}

/** Danno Ulti in battaglia (carta oro / bottone ULT). */
export function battleUltimateDamage(character, owned, move, stars, typeMult = 1, ultBurst = 1.5) {
  const lv = owned?.ultimateLevel ?? ULTIMATE_MIN_LEVEL;
  const base = tileDamage(character, owned, move, stars);
  return Math.max(1, Math.round(base * typeMult * ultBurst * ultimateLevelMultiplier(lv)));
}

export function battleUltimateHeal(character, owned, movePower, stars = 3) {
  const lv = owned?.ultimateLevel ?? ULTIMATE_MIN_LEVEL;
  const atk = effectiveAttack(character, owned);
  const base = Math.round((movePower + atk * 0.3) * (1 + (stars - 1) * 0.2));
  return Math.max(1, Math.round(base * ultimateEffectMultiplier(lv)));
}
