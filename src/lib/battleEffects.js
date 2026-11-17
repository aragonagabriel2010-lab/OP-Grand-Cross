/**
 * Architettura effetti di battaglia (buff / debuff / stati alterati).
 * Bilanciamento e wiring completo → fase successiva; qui solo il contratto.
 */

export const EFFECT_TYPES = {
  BUFF_ATK: "buff_atk",
  BUFF_DEF: "buff_def",
  DEBUFF_ATK: "debuff_atk",
  DEBUFF_DEF: "debuff_def",
  HEAL_OVER_TIME: "regen",
  BLEED: "bleed",
  BURN: "burn",
  STUN: "stun",
  FREEZE: "freeze",
  POISON: "poison",
};

export const EFFECT_META = {
  [EFFECT_TYPES.BUFF_ATK]: { label: "Atk↑", kind: "buff", color: "#f5a623" },
  [EFFECT_TYPES.BUFF_DEF]: { label: "Def↑", kind: "buff", color: "#38bdf8" },
  [EFFECT_TYPES.DEBUFF_ATK]: { label: "Atk↓", kind: "debuff", color: "#94a3b8" },
  [EFFECT_TYPES.DEBUFF_DEF]: { label: "Def↓", kind: "debuff", color: "#64748b" },
  [EFFECT_TYPES.HEAL_OVER_TIME]: { label: "Regen", kind: "buff", color: "#4ade80" },
  [EFFECT_TYPES.BLEED]: { label: "Sanguinamento", kind: "dot", color: "#ef4444" },
  [EFFECT_TYPES.BURN]: { label: "Bruciatura", kind: "dot", color: "#f97316" },
  [EFFECT_TYPES.STUN]: { label: "Stordimento", kind: "cc", color: "#eab308" },
  [EFFECT_TYPES.FREEZE]: { label: "Congelamento", kind: "cc", color: "#67e8f9" },
  [EFFECT_TYPES.POISON]: { label: "Veleno", kind: "dot", color: "#a3e635" },
};

let _eid = 0;

/** Crea un effetto applicabile a un combatant */
export function createEffect({
  type,
  potency = 1,
  duration = 1,
  source = null,
  chance = 1,
}) {
  return {
    id: `fx_${++_eid}_${type}`,
    type,
    potency,
    duration,
    turnsLeft: duration,
    source,
    chance,
  };
}

export function emptyStatusBoard() {
  return { effects: [] };
}

/** Aggiunge/refresh effetto (stacking semplice: refresh duration se stesso type) */
export function addEffect(board, effect) {
  if (Math.random() > (effect.chance ?? 1)) return board;
  const effects = [...(board?.effects || [])];
  const idx = effects.findIndex((e) => e.type === effect.type && e.source === effect.source);
  if (idx >= 0) {
    effects[idx] = {
      ...effects[idx],
      potency: Math.max(effects[idx].potency, effect.potency),
      turnsLeft: Math.max(effects[idx].turnsLeft, effect.duration),
      duration: Math.max(effects[idx].duration, effect.duration),
    };
  } else {
    effects.push({ ...effect });
  }
  return { ...board, effects };
}

export function hasCrowdControl(board) {
  return (board?.effects || []).some(
    (e) => e.turnsLeft > 0 && EFFECT_META[e.type]?.kind === "cc"
  );
}

export function attackModifierFromEffects(board) {
  let mult = 1;
  for (const e of board?.effects || []) {
    if (e.turnsLeft <= 0) continue;
    if (e.type === EFFECT_TYPES.BUFF_ATK) mult += 0.15 * e.potency;
    if (e.type === EFFECT_TYPES.DEBUFF_ATK) mult -= 0.12 * e.potency;
  }
  return Math.max(0.4, mult);
}

/** Moltiplicatore DEF da buff/debuff (1 = neutro). */
export function defenseModifierFromEffects(board) {
  let mult = 1;
  for (const e of board?.effects || []) {
    if (e.turnsLeft <= 0) continue;
    if (e.type === EFFECT_TYPES.BUFF_DEF) mult += 0.18 * e.potency;
    if (e.type === EFFECT_TYPES.DEBUFF_DEF) mult -= 0.14 * e.potency;
  }
  return Math.max(0.35, mult);
}

/** Tick fine-turno: DoT damage list + decrement duration. Ritorna { board, dots:[{type,dmg}] } */
export function tickEffects(board) {
  const dots = [];
  const next = [];
  for (const e of board?.effects || []) {
    if (e.turnsLeft <= 0) continue;
    if (EFFECT_META[e.type]?.kind === "dot") {
      dots.push({ type: e.type, dmg: Math.max(1, Math.round(8 * e.potency)) });
    }
    if (e.type === EFFECT_TYPES.HEAL_OVER_TIME) {
      dots.push({ type: e.type, dmg: -Math.max(1, Math.round(10 * e.potency)) });
    }
    const turnsLeft = e.turnsLeft - 1;
    if (turnsLeft > 0) next.push({ ...e, turnsLeft });
  }
  return { board: { effects: next }, dots };
}

/**
 * Hook futuro: da move.type / move.effects[] genera effetti da applicare.
 * Per ora supporta move.effects se presente, altrimenti no-op.
 */
export function effectsFromMove(move, sourceId) {
  if (!move?.effects?.length) return [];
  return move.effects.map((spec) =>
    createEffect({
      type: spec.type,
      potency: spec.potency ?? 1,
      duration: spec.duration ?? 1,
      chance: spec.chance ?? 1,
      source: sourceId,
    })
  );
}
