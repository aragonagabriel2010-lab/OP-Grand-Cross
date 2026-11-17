/**
 * Fortezza — 4 modalità × 10 livelli.
 * Ogni settimana (lunedì 00:00 locale) i percorsi ripartono dal livello 1.
 * Livelli più alti → più probabilità / quantità del loot cercato.
 * Tutte le modalità danno Beri; la Cassaforte Beri ne dà di più (sempre garantiti).
 */

import { weekKey } from "@/lib/weeklyMeta";
import { normalizeMaterials, mergeMaterials } from "@/lib/materials";
import { normalizeItems } from "@/lib/inventory";

export const FORTRESS_LEVELS = 10;

export const FORTRESS_ZONES = [
  {
    id: "beri",
    title: "Cassaforte Beri",
    subtitle: "Farm monete",
    hint: "Beri assicurati. Più sali di livello, più ne ottieni.",
    seekLabel: "Beri",
    accent: "#f5a623",
    enemyChapter: 1,
  },
  {
    id: "awaken",
    title: "Caverna del Risveglio",
    subtitle: "Cristalli · Creste · Schegge",
    hint: "Materiali di risveglio. Livelli alti = più chance e quantità.",
    seekLabel: "Materiali risveglio",
    accent: "#38bdf8",
    enemyChapter: 5,
  },
  {
    id: "craft",
    title: "Forgia dell'Equip",
    subtitle: "Materiali gear",
    hint: "Legno e pezzi forge. Chance e quantità salgono col livello.",
    seekLabel: "Materiali forge",
    accent: "#c084fc",
    enemyChapter: 8,
  },
  {
    id: "special",
    title: "Camera Segreta",
    subtitle: "Fragole · drop rari",
    hint: "Fragole e schegge rare. Il livello 10 è il più generoso.",
    seekLabel: "Fragole / rari",
    accent: "#f472b6",
    enemyChapter: 12,
  },
];

export function getFortressZone(zoneId) {
  return FORTRESS_ZONES.find((z) => z.id === zoneId) || null;
}

function storageKey(uid) {
  return `opgv_fortress_${uid || "guest"}`;
}

function emptyZones() {
  return Object.fromEntries(FORTRESS_ZONES.map((z) => [z.id, { cleared: 0 }]));
}

function emptyProgress(week = weekKey()) {
  return { week, zones: emptyZones() };
}

export function loadFortressProgress(uid) {
  const wk = weekKey();
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (!raw) return emptyProgress(wk);
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.week !== wk) return emptyProgress(wk);
    const zones = emptyZones();
    for (const z of FORTRESS_ZONES) {
      const cleared = Math.max(0, Math.min(FORTRESS_LEVELS, Number(parsed.zones?.[z.id]?.cleared) || 0));
      zones[z.id] = { cleared };
    }
    return { week: wk, zones };
  } catch {
    return emptyProgress(wk);
  }
}

export function saveFortressProgress(uid, progress) {
  localStorage.setItem(storageKey(uid), JSON.stringify(progress));
}

/** Livello giocabile: 1 sempre; N richiede cleared >= N-1. */
export function canPlayFortressLevel(progress, zoneId, level) {
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  const cleared = progress?.zones?.[zoneId]?.cleared ?? 0;
  return lv <= cleared + 1;
}

export function markFortressClear(uid, zoneId, level) {
  const progress = loadFortressProgress(uid);
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  const prev = progress.zones[zoneId]?.cleared ?? 0;
  if (lv > prev) {
    progress.zones[zoneId] = { cleared: lv };
    saveFortressProgress(uid, progress);
  }
  return progress;
}

/** Moltiplicatore HP/ATK nemici per livello fortezza. */
export function fortressEnemyMult(level) {
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  return 0.95 + lv * 0.12;
}

export function fortressStaminaCost(level) {
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  return 4 + Math.floor((lv - 1) / 3);
}

/**
 * Preview ricompense attese (per UI livelli).
 * Chance 0–1 del loot principale; berry sempre garantiti.
 */
export function fortressRewardPreview(zoneId, level) {
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  const berryBase = 60 + lv * 20;

  if (zoneId === "beri") {
    return {
      berry: 180 + lv * 90,
      chance: 1,
      chanceLabel: "Beri assicurati",
      amountHint: `~${180 + lv * 90} Beri`,
    };
  }
  if (zoneId === "awaken") {
    const chance = Math.min(0.98, 0.42 + lv * 0.055);
    const amt = 1 + Math.floor(lv / 3);
    return {
      berry: berryBase,
      chance,
      chanceLabel: `${Math.round(chance * 100)}% materiali`,
      amountHint: `fino a ×${amt + 1}`,
    };
  }
  if (zoneId === "craft") {
    const chance = Math.min(0.98, 0.45 + lv * 0.052);
    const amt = 1 + Math.floor(lv / 2);
    return {
      berry: berryBase,
      chance,
      chanceLabel: `${Math.round(chance * 100)}% legno forge`,
      amountHint: `fino a ×${amt}`,
    };
  }
  // special
  const chance = Math.min(0.95, 0.35 + lv * 0.06);
  const amt = 1 + Math.floor(lv / 4);
  return {
    berry: berryBase,
    chance,
    chanceLabel: `${Math.round(chance * 100)}% fragole`,
    amountHint: `fino a ×${amt + (lv >= 8 ? 2 : 1)}`,
  };
}

/**
 * Roll ricompense a vittoria.
 * @returns {{ berry, strawberry, materials, items, lines }}
 */
export function rollFortressRewards(zoneId, level) {
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  const berryBase = 60 + lv * 20;
  const materials = { sea_crystal: 0, pirate_crest: 0, dawn_shard: 0 };
  const items = { scrap_wood: 0 };
  let strawberry = 0;
  let berry = berryBase;
  const lines = [];

  if (zoneId === "beri") {
    berry = 180 + lv * 90;
    lines.push(`+${berry} Beri`);
    return { berry, strawberry, materials, items, lines };
  }

  lines.push(`+${berry} Beri`);

  if (zoneId === "awaken") {
    const crystalChance = Math.min(0.99, 0.5 + lv * 0.05);
    const crestChance = Math.min(0.95, 0.22 + lv * 0.07);
    const shardChance = Math.min(0.9, 0.06 + lv * 0.075);
    const crystalAmt = 1 + Math.floor(lv / 3) + (Math.random() < 0.35 ? 1 : 0);
    const crestAmt = 1 + Math.floor(lv / 5);
    const shardAmt = lv >= 8 ? 1 + (lv >= 10 ? 1 : 0) : 1;

    if (Math.random() < crystalChance) {
      materials.sea_crystal = crystalAmt;
      lines.push(`+${crystalAmt} Cristallo Marino`);
    }
    if (Math.random() < crestChance) {
      materials.pirate_crest = crestAmt;
      lines.push(`+${crestAmt} Cresta Pirata`);
    }
    if (Math.random() < shardChance) {
      materials.dawn_shard = shardAmt;
      lines.push(`+${shardAmt} Scheggia dell'Alba`);
    }
    if (!materials.sea_crystal && !materials.pirate_crest && !materials.dawn_shard) {
      materials.sea_crystal = 1;
      lines.push("+1 Cristallo Marino");
    }
    return { berry, strawberry, materials, items, lines };
  }

  if (zoneId === "craft") {
    const chance = Math.min(0.98, 0.45 + lv * 0.052);
    const amt = 1 + Math.floor(lv / 2) + (lv >= 10 ? 2 : lv >= 7 ? 1 : 0);
    if (Math.random() < chance) {
      items.scrap_wood = amt;
      lines.push(`+${amt} Legno di scarto`);
    } else if (lv >= 5 && Math.random() < 0.4) {
      items.scrap_wood = Math.max(1, Math.floor(amt / 2));
      lines.push(`+${items.scrap_wood} Legno di scarto`);
    }
    return { berry, strawberry, materials, items, lines };
  }

  // special
  const strawChance = Math.min(0.95, 0.35 + lv * 0.06);
  const strawAmt = 1 + Math.floor(lv / 4) + (lv >= 10 ? 2 : lv >= 7 ? 1 : 0);
  const shardChance = Math.min(0.7, 0.05 + lv * 0.055);

  if (Math.random() < strawChance) {
    strawberry = strawAmt;
    lines.push(`+${strawberry} Fragole`);
  }
  if (Math.random() < shardChance) {
    materials.dawn_shard = lv >= 9 ? 2 : 1;
    lines.push(`+${materials.dawn_shard} Scheggia dell'Alba`);
  }
  if (!strawberry && !materials.dawn_shard) {
    strawberry = 1;
    lines.push("+1 Fragola");
  }
  return { berry, strawberry, materials, items, lines };
}

/** Applica rewards a un patch PlayerState. */
export function applyFortressRewardPatch(playerState, rewards) {
  const materials = mergeMaterials(playerState.materials, rewards.materials);
  const prevItems = normalizeItems(playerState.items);
  const items = { ...prevItems };
  for (const [id, n] of Object.entries(rewards.items || {})) {
    if (n > 0) items[id] = (items[id] || 0) + n;
  }
  return {
    berry: (playerState.berry || 0) + (rewards.berry || 0),
    strawberry: (playerState.strawberry || 0) + (rewards.strawberry || 0),
    materials: normalizeMaterials(materials),
    items,
  };
}

/** Capitolo sintetico per battaglia fortezza. */
export function buildFortressChapter(zone, level, baseChapter) {
  const lv = Math.max(1, Math.min(FORTRESS_LEVELS, Number(level) || 1));
  const preview = fortressRewardPreview(zone.id, lv);
  return {
    id: `fortress-${zone.id}-${lv}`,
    chapter_number: baseChapter?.chapter_number || 1,
    arc_id: "fortress",
    arc: "Fortezza",
    title: `${zone.title}`,
    subtitle: `Livello ${lv} / ${FORTRESS_LEVELS}`,
    dialogue_before: `${zone.hint} — Livello ${lv}.`,
    dialogue_after: `Livello ${lv} completato! ${preview.chanceLabel}.`,
    enemy_ids: baseChapter?.enemy_ids || ["enemy-alvida-crew", "enemy-alvida"],
    reward_berry: preview.berry,
    reward_strawberry: zone.id === "special" ? 1 + Math.floor(lv / 4) : 0,
    is_boss: lv >= 8,
    is_fortress: true,
    fortress_zone: zone.id,
    fortress_level: lv,
  };
}
