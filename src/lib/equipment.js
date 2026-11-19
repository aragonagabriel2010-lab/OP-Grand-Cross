/**
 * Equipaggiamento personaggio: slot, statistica unica, 5 substat %, riforgia.
 */

export const EQUIP_SLOTS = [
  { id: "necklace", label: "Collana" },
  { id: "bracelet", label: "Bracciale" },
  { id: "ring1", label: "Anello 1" },
  { id: "belt", label: "Cintura" },
  { id: "ring2", label: "Anello 2" },
  { id: "essence", label: "Essenza", rare: true },
];

export const GEAR_LEVEL_MAX = 15;
export const SUBSTAT_MAX_PCT = 5;
export const SUBSTAT_COUNT = 5;
export const REFORGE_BERRY_COST = 30;

/** Cap statistica unica (valore flat) per rarità */
export const UNIQUE_CAPS = {
  C: { hp: 80, atk: 12, def: 10 },
  R: { hp: 160, atk: 24, def: 20 },
  SR: { hp: 320, atk: 48, def: 40 },
  SSR: { hp: 500, atk: 80, def: 65 },
};

export const UNIQUE_STAT_DEFS = {
  hp: { id: "hp", label: "Aumento salute", short: "HP", unit: "flat" },
  atk: { id: "atk", label: "Aumento attacco", short: "ATK", unit: "flat" },
  def: { id: "def", label: "Aumento difesa", short: "DEF", unit: "flat" },
};

/** Substat % (barra piena = 5%) */
export const SUBSTAT_DEFS = {
  hp_pct: { id: "hp_pct", label: "Aumento salute", short: "HP %", max: SUBSTAT_MAX_PCT },
  atk_pct: { id: "atk_pct", label: "Aumento attacco", short: "ATK %", max: SUBSTAT_MAX_PCT },
  def_pct: { id: "def_pct", label: "Aumento difesa", short: "DEF %", max: SUBSTAT_MAX_PCT },
  longevity: { id: "longevity", label: "Lunga vita", short: "LVITA", max: SUBSTAT_MAX_PCT },
  regen_round: {
    id: "regen_round",
    label: "Ripristino salute / round",
    short: "Regen",
    max: SUBSTAT_MAX_PCT,
  },
  lifesteal: { id: "lifesteal", label: "Rubavita", short: "Rubavita", max: SUBSTAT_MAX_PCT },
  crit_pct: { id: "crit_pct", label: "Prob. critico", short: "Crit", max: SUBSTAT_MAX_PCT },
};

export const SUBSTAT_IDS = Object.keys(SUBSTAT_DEFS);

export const GEAR_TEMPLATES = {
  necklace_life: {
    id: "necklace_life",
    slot: "necklace",
    name: "Collana della Vita",
    uniqueStatId: "hp",
    rarity: "SR",
  },
  bracelet_power: {
    id: "bracelet_power",
    slot: "bracelet",
    name: "Bracciale del Pugno",
    uniqueStatId: "atk",
    rarity: "R",
  },
  ring_guard: {
    id: "ring_guard",
    slot: "ring1",
    name: "Anello del Guardiano",
    uniqueStatId: "def",
    rarity: "R",
  },
  belt_iron: {
    id: "belt_iron",
    slot: "belt",
    name: "Cintura di Ferro",
    uniqueStatId: "def",
    rarity: "C",
  },
  ring_fang: {
    id: "ring_fang",
    slot: "ring2",
    name: "Anello della Zanna",
    uniqueStatId: "atk",
    rarity: "SR",
  },
};

function uid(prefix = "gear") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36).slice(-4)}`;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

function pickSubstatId(exclude = []) {
  const pool = SUBSTAT_IDS.filter((id) => !exclude.includes(id));
  const list = pool.length ? pool : SUBSTAT_IDS;
  return list[Math.floor(Math.random() * list.length)];
}

function rollSubstatValue() {
  return Math.round(randBetween(0.4, SUBSTAT_MAX_PCT) * 10) / 10;
}

export function rollSubstats(count = SUBSTAT_COUNT) {
  const used = [];
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const id = pickSubstatId(used);
    used.push(id);
    out.push({ id, value: rollSubstatValue() });
  }
  return out;
}

export function createGearFromTemplate(templateId, overrides = {}) {
  const tpl = GEAR_TEMPLATES[templateId];
  if (!tpl) return null;
  return normalizeGearItem({
    id: uid(),
    templateId: tpl.id,
    slot: tpl.slot,
    name: tpl.name,
    rarity: tpl.rarity,
    level: 1,
    ascension: 0,
    uniqueStatId: tpl.uniqueStatId,
    uniqueBar: Math.round(randBetween(18, 55)),
    substats: rollSubstats(),
    equippedTo: null,
    ...overrides,
  });
}

export function normalizeGearItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  const tpl = GEAR_TEMPLATES[raw.templateId];
  const rarity = raw.rarity || tpl?.rarity || "R";
  const uniqueStatId = raw.uniqueStatId || tpl?.uniqueStatId || "hp";
  let substats = Array.isArray(raw.substats) ? raw.substats.map(normalizeSubstat).filter(Boolean) : [];
  while (substats.length < SUBSTAT_COUNT) {
    const used = substats.map((s) => s.id);
    substats.push({ id: pickSubstatId(used), value: rollSubstatValue() });
  }
  substats = substats.slice(0, SUBSTAT_COUNT);
  return {
    id: raw.id || uid(),
    templateId: raw.templateId || tpl?.id || "necklace_life",
    slot: raw.slot || tpl?.slot || "necklace",
    name: raw.name || tpl?.name || "Equipaggiamento",
    rarity,
    level: clamp(Math.floor(Number(raw.level) || 1), 1, GEAR_LEVEL_MAX),
    ascension: clamp(Math.floor(Number(raw.ascension) || 0), 0, 3),
    uniqueStatId,
    uniqueBar: clamp(Math.round(Number(raw.uniqueBar) || 0), 0, 100),
    substats,
    equippedTo: raw.equippedTo || null,
  };
}

function normalizeSubstat(s) {
  if (!s?.id || !SUBSTAT_DEFS[s.id]) return null;
  return {
    id: s.id,
    value: clamp(Math.round((Number(s.value) || 0) * 10) / 10, 0.1, SUBSTAT_MAX_PCT),
  };
}

export function normalizeGearList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeGearItem).filter(Boolean);
}

/** Seed iniziale se inventario gear vuoto */
export function ensureStarterGear(gearList) {
  const list = normalizeGearList(gearList);
  if (list.length > 0) return { gear: list, seeded: false };
  const seeded = [
    createGearFromTemplate("necklace_life", { uniqueBar: 42, level: 3 }),
    createGearFromTemplate("bracelet_power", { uniqueBar: 35, level: 2 }),
    createGearFromTemplate("ring_guard", { uniqueBar: 28 }),
    createGearFromTemplate("belt_iron", { uniqueBar: 50 }),
  ].filter(Boolean);
  return { gear: seeded, seeded: true };
}

/**
 * Valore flat della statistica unica.
 * Dipende da rarità (cap), barra unica, livello e risveglio gear.
 */
export function computeUniqueValue(item) {
  const g = normalizeGearItem(item);
  if (!g) return 0;
  const cap = UNIQUE_CAPS[g.rarity]?.[g.uniqueStatId] || UNIQUE_CAPS.R[g.uniqueStatId] || 100;
  const barRatio = g.uniqueBar / 100;
  const levelBonus = 1 + (g.level - 1) * 0.035;
  const ascBonus = 1 + g.ascension * 0.12;
  return Math.max(1, Math.round(cap * barRatio * levelBonus * ascBonus));
}

export function uniqueStatLabel(item) {
  return UNIQUE_STAT_DEFS[item?.uniqueStatId]?.label || "Statistica unica";
}

export function uniqueCapFor(item) {
  const rarity = item?.rarity || "R";
  const stat = item?.uniqueStatId || "hp";
  return UNIQUE_CAPS[rarity]?.[stat] || UNIQUE_CAPS.R[stat] || 100;
}

export function reforgeSubstat(item, index) {
  const g = normalizeGearItem(item);
  if (!g || index < 0 || index >= g.substats.length) {
    return { ok: false, reason: "Substat non valida" };
  }
  const others = g.substats.map((s) => s.id).filter((_, i) => i !== index);
  const nextId = pickSubstatId(others);
  const nextValue = rollSubstatValue();
  const substats = g.substats.map((s, i) => (i === index ? { id: nextId, value: nextValue } : s));
  return { ok: true, item: { ...g, substats } };
}

export function equipGearToCharacter(gearList, gearId, ownedId) {
  const list = normalizeGearList(gearList);
  const piece = list.find((g) => g.id === gearId);
  if (!piece) return { ok: false, reason: "Pezzo non trovato", gear: list };
  if (piece.equippedTo && piece.equippedTo !== ownedId) {
    return { ok: false, reason: "Già equipaggiato su un altro personaggio", gear: list };
  }
  const next = list.map((g) => {
    if (g.id === gearId) return { ...g, equippedTo: ownedId };
    if (g.equippedTo === ownedId && g.slot === piece.slot) return { ...g, equippedTo: null };
    return g;
  });
  return { ok: true, gear: next, item: next.find((g) => g.id === gearId) };
}

export function unequipGear(gearList, gearId) {
  const list = normalizeGearList(gearList);
  const next = list.map((g) => (g.id === gearId ? { ...g, equippedTo: null } : g));
  return { ok: true, gear: next };
}

export function gearEquippedOn(gearList, ownedId) {
  return normalizeGearList(gearList).filter((g) => g.equippedTo === ownedId);
}

export function gearInSlot(gearList, ownedId, slotId) {
  return gearEquippedOn(gearList, ownedId).find((g) => g.slot === slotId) || null;
}

export function inventoryForSlot(gearList, slotId, ownedId) {
  return normalizeGearList(gearList).filter((g) => {
    if (g.slot !== slotId) return false;
    return !g.equippedTo || g.equippedTo === ownedId;
  });
}

/** Bonus aggregati per un owned character */
export function aggregateEquipmentBonuses(gearList, ownedId) {
  const equipped = gearEquippedOn(gearList, ownedId);
  const out = {
    hpFlat: 0,
    atkFlat: 0,
    defFlat: 0,
    hpPct: 0,
    atkPct: 0,
    defPct: 0,
    longevity: 0,
    regenRound: 0,
    lifesteal: 0,
    critPct: 0,
  };
  for (const g of equipped) {
    const uv = computeUniqueValue(g);
    if (g.uniqueStatId === "hp") out.hpFlat += uv;
    if (g.uniqueStatId === "atk") out.atkFlat += uv;
    if (g.uniqueStatId === "def") out.defFlat += uv;
    for (const s of g.substats) {
      if (s.id === "hp_pct") out.hpPct += s.value;
      else if (s.id === "atk_pct") out.atkPct += s.value;
      else if (s.id === "def_pct") out.defPct += s.value;
      else if (s.id === "longevity") out.longevity += s.value;
      else if (s.id === "regen_round") out.regenRound += s.value;
      else if (s.id === "lifesteal") out.lifesteal += s.value;
      else if (s.id === "crit_pct") out.critPct += s.value;
    }
  }
  // Longevità: riduce danno subito (usata come % mitigazione soft in UI; battaglia può applicarla dopo)
  return out;
}

export function applyEquipmentToStats(baseHp, baseAtk, baseDef, bonuses) {
  const b = bonuses || {};
  const longevityMit = 1; // flat display stats non cambiano; longevity è passiva
  void longevityMit;
  return {
    hp: Math.round((baseHp + (b.hpFlat || 0)) * (1 + (b.hpPct || 0) / 100)),
    atk: Math.round((baseAtk + (b.atkFlat || 0)) * (1 + (b.atkPct || 0) / 100)),
    def: Math.round((baseDef + (b.defFlat || 0)) * (1 + (b.defPct || 0) / 100)),
    lifesteal: Math.round((b.lifesteal || 0) * 10) / 10,
    regenRound: Math.round((b.regenRound || 0) * 10) / 10,
    longevity: Math.round((b.longevity || 0) * 10) / 10,
    critBonus: Math.round((b.critPct || 0) * 10) / 10,
  };
}

export function slotLabel(slotId) {
  return EQUIP_SLOTS.find((s) => s.id === slotId)?.label || slotId;
}
