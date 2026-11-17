/**
 * Materiali di risveglio — inventariato su PlayerState.materials
 */

/**
 * Materiali di risveglio (gli “esagoni” in UI).
 * Blu  = Cristallo Marino — materiale base per Awaken
 * Arancio = Cresta Pirata — materiale medio / boss
 * Viola = Scheggia dell'Alba — materiale raro per risvegli alti
 */
export const MATERIAL_DEFS = {
  sea_crystal: {
    id: "sea_crystal",
    name: "Cristallo Marino",
    short: "Cristallo",
    hint: "Base per il Risveglio",
    color: "#38bdf8",
  },
  pirate_crest: {
    id: "pirate_crest",
    name: "Cresta Pirata",
    short: "Cresta",
    hint: "Da boss e Hard",
    color: "#f5a623",
  },
  dawn_shard: {
    id: "dawn_shard",
    name: "Scheggia dell'Alba",
    short: "Scheggia",
    hint: "Raro · risvegli alti",
    color: "#c084fc",
  },
};

/** Costo risveglio: fragole + materiali (scala con ascensione). */
export function awakeningCost(currentAscension = 0) {
  const a = Math.max(0, Math.min(2, currentAscension));
  return {
    strawberry: 20 + a * 20,
    materials: {
      sea_crystal: 2 + a * 2,
      pirate_crest: 1 + a,
      dawn_shard: a >= 2 ? 2 : a >= 1 ? 1 : 0,
    },
  };
}

export function normalizeMaterials(raw) {
  return {
    sea_crystal: Math.max(0, Number(raw?.sea_crystal) || 0),
    pirate_crest: Math.max(0, Number(raw?.pirate_crest) || 0),
    dawn_shard: Math.max(0, Number(raw?.dawn_shard) || 0),
  };
}

export function canAffordAwakening(playerState, currentAscension) {
  const cost = awakeningCost(currentAscension);
  const mats = normalizeMaterials(playerState?.materials);
  if ((playerState?.strawberry || 0) < cost.strawberry) return false;
  return Object.entries(cost.materials).every(([id, need]) => (mats[id] || 0) >= need);
}

export function spendAwakeningMaterials(materials, currentAscension) {
  const cost = awakeningCost(currentAscension);
  const mats = normalizeMaterials(materials);
  const next = { ...mats };
  for (const [id, need] of Object.entries(cost.materials)) {
    next[id] = Math.max(0, (next[id] || 0) - need);
  }
  return { materials: next, strawberryCost: cost.strawberry, cost };
}

/** Drop a fine missione (normal / hard). */
export function rollMissionMaterials({ isBoss = false, hard = false } = {}) {
  const drop = { sea_crystal: 0, pirate_crest: 0, dawn_shard: 0 };
  const mult = hard ? 2 : 1;
  drop.sea_crystal = (1 + Math.floor(Math.random() * 2)) * mult;
  if (isBoss || Math.random() < 0.55) {
    drop.pirate_crest = (1 + (isBoss ? 1 : 0)) * mult;
  }
  if (isBoss || hard || Math.random() < 0.25) {
    drop.dawn_shard = (hard || isBoss ? 1 : Math.random() < 0.5 ? 1 : 0) * mult;
  }
  return drop;
}

export function mergeMaterials(a, b) {
  const left = normalizeMaterials(a);
  const right = normalizeMaterials(b);
  return {
    sea_crystal: left.sea_crystal + right.sea_crystal,
    pirate_crest: left.pirate_crest + right.pirate_crest,
    dawn_shard: left.dawn_shard + right.dawn_shard,
  };
}
