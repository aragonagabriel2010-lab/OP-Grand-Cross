/**
 * Uniche personaggio:
 * - active: si attiva con azione / condizione in campo
 * - passive: sempre attiva se il personaggio è in squadra attiva (non sub)
 * - bench: attiva anche dalla panchina (4° slot), senza entrare in campo
 */

export const UNIQUE_TYPES = {
  active: {
    id: "active",
    label: "Attiva",
    blurb: "Si attiva in battaglia con una condizione o azione.",
    color: "#f87171",
  },
  passive: {
    id: "passive",
    label: "Passiva",
    blurb: "Sempre attiva finché il personaggio è in campo.",
    color: "#38bdf8",
  },
  bench: {
    id: "bench",
    label: "Panchina",
    blurb: "Si attiva anche dal 4° slot (sub), senza entrare in gioco.",
    color: "#a78bfa",
  },
};

export const UNIQUE_TYPE_LIST = ["passive", "active", "bench"];

export function uniqueTypeInfo(type) {
  return UNIQUE_TYPES[type] || UNIQUE_TYPES.passive;
}

export function normalizeUnique(raw, character) {
  if (!raw || typeof raw !== "object") {
    return {
      id: `${character?.id || "char"}-unique`,
      name: "Spirito del Mare",
      type: "passive",
      description: "Potenzia leggermente le prestazioni in battaglia.",
      effects: [],
    };
  }
  const type = UNIQUE_TYPE_LIST.includes(raw.type) ? raw.type : "passive";
  return {
    id: raw.id || `${character?.id || "char"}-unique`,
    name: raw.name || "Unica",
    type,
    description: raw.description || "",
    effects: Array.isArray(raw.effects) ? raw.effects : [],
  };
}

/** Uniche che contano per un alleato in campo (indice 0–2). */
export function isUniqueActiveInField(unique, { isBenchSlot }) {
  const u = normalizeUnique(unique);
  if (u.type === "bench") return true;
  if (isBenchSlot) return false;
  return true;
}

/**
 * Aggrega moltiplicatori da uniche attive sul team.
 * effects: { kind: 'atk_pct'|'def_pct'|'hp_pct'|'all_pct'|'crit_pct', value: 0.05, clan?: string, noDevilFruit?: bool }
 */
export function collectUniqueModifiers(members, bench, charMap) {
  const mods = { atk: 1, def: 1, hp: 1, crit: 0 };
  const sources = [];

  const consider = (ownedLike, character, isBenchSlot) => {
    if (!character) return;
    const unique = normalizeUnique(character.unique, character);
    if (!isUniqueActiveInField(unique, { isBenchSlot })) return;
    sources.push({ name: character.char_name, unique, isBenchSlot });
    for (const fx of unique.effects || []) {
      const v = Number(fx.value) || 0;
      if (fx.kind === "atk_pct") mods.atk += v;
      else if (fx.kind === "def_pct") mods.def += v;
      else if (fx.kind === "hp_pct") mods.hp += v;
      else if (fx.kind === "all_pct") {
        mods.atk += v;
        mods.def += v;
        mods.hp += v;
      } else if (fx.kind === "crit_pct") mods.crit += v;
    }
  };

  (members || []).forEach((m) => consider(m.owned, m.character, false));
  if (bench) consider(bench.owned, bench.character, true);

  return { mods, sources };
}

export function formatUniqueTypeLabel(type) {
  return uniqueTypeInfo(type).label;
}
