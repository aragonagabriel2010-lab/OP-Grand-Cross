/**
 * Inventario a sezioni + cucina (ingredienti / ricette / buff cibo).
 *
 * Buff duration:
 * - battle  → tutta la prossima partita, poi via
 * - turns   → dura N turni giocatore in battaglia, poi scade
 */

export const INVENTORY_SECTIONS = [
  { id: "materials", label: "Materiali", hint: "Risveglio e crafting" },
  { id: "items", label: "Oggetti", hint: "Gear e pezzi speciali" },
  { id: "usables", label: "Utilizzabili", hint: "Cibo e consumabili" },
  { id: "ingredients", label: "Ingredienti", hint: "Per la Cucina" },
];

/** Ingredienti grezzi */
export const INGREDIENT_DEFS = {
  bone_meat: {
    id: "bone_meat",
    name: "Carne con l'osso",
    short: "Carne",
    hint: "Ingrediente base · Cucina",
    color: "#e11d48",
  },
  salt: {
    id: "salt",
    name: "Sale",
    short: "Sale",
    hint: "Condimento · Cucina",
    color: "#e2e8f0",
  },
};

/** Oggetti generici (placeholder) */
export const ITEM_DEFS = {
  scrap_wood: {
    id: "scrap_wood",
    name: "Legno di scarto",
    short: "Legno",
    hint: "Prossimamente · forge / nave",
    color: "#a16207",
  },
};

/**
 * Utilizzabili.
 * battleBuff.duration: "battle" | "turns"
 * battleBuff.turns: solo se duration === "turns"
 */
export const USABLE_DEFS = {
  bone_meat_meal: {
    id: "bone_meat_meal",
    name: "Carne con l'osso",
    short: "Pietanza",
    hint: "Prossima partita · +15% ATK",
    color: "#f97316",
    fromRecipe: "bone_meat_grill",
    battleBuff: {
      atkMult: 1.15,
      label: "+15% ATK",
      duration: "battle",
      durationLabel: "1 battaglia",
    },
  },
  salted_snack: {
    id: "salted_snack",
    name: "Spuntino salato",
    short: "Snack",
    hint: "Temporaneo · +10% ATK per 3 turni",
    color: "#fbbf24",
    fromRecipe: "salt_snack",
    battleBuff: {
      atkMult: 1.1,
      label: "+10% ATK",
      duration: "turns",
      turns: 3,
      durationLabel: "3 turni",
    },
  },
};

export const RECIPES = [
  {
    id: "bone_meat_grill",
    name: "Carne con l'osso",
    blurb: "Grigliata: +15% ATK per tutta la prossima battaglia.",
    ingredients: { bone_meat: 1, salt: 1 },
    result: { type: "usables", id: "bone_meat_meal", qty: 1 },
  },
  {
    id: "salt_snack",
    name: "Spuntino salato",
    blurb: "Snack leggero: +10% ATK per 3 turni in battaglia.",
    ingredients: { salt: 2 },
    result: { type: "usables", id: "salted_snack", qty: 1 },
  },
];

/** Buff cibo attivo su PlayerState.foodBuff */
export function normalizeFoodBuff(raw) {
  if (!raw?.id) return null;
  const def = USABLE_DEFS[raw.id]?.battleBuff;
  const duration = raw.duration || def?.duration || "battle";
  return {
    id: raw.id,
    label: raw.label || def?.label || "Buff",
    atkMult: Number(raw.atkMult) > 0 ? Number(raw.atkMult) : 1,
    duration,
    turnsLeft: duration === "turns" ? Math.max(0, Number(raw.turnsLeft ?? raw.turns ?? def?.turns ?? 0)) : null,
    durationLabel: raw.durationLabel || def?.durationLabel || (duration === "turns" ? "turni" : "1 battaglia"),
  };
}

export function eatUsable(playerState, usableId) {
  const def = USABLE_DEFS[usableId];
  const usables = normalizeUsables(playerState?.usables);
  if (!def?.battleBuff) return { ok: false, reason: "Non utilizzabile in battaglia" };
  if ((usables[usableId] || 0) < 1) return { ok: false, reason: "Nessuna pietanza" };
  if (normalizeFoodBuff(playerState?.foodBuff)) {
    return { ok: false, reason: "Hai già un buff attivo" };
  }
  const bb = def.battleBuff;
  const nextUsables = { ...usables, [usableId]: usables[usableId] - 1 };
  const foodBuff = {
    id: usableId,
    label: bb.label,
    atkMult: bb.atkMult,
    duration: bb.duration || "battle",
    durationLabel: bb.durationLabel,
  };
  if (foodBuff.duration === "turns") {
    foodBuff.turnsLeft = bb.turns || 3;
    foodBuff.turns = bb.turns || 3;
  }
  return {
    ok: true,
    patch: { usables: nextUsables, foodBuff },
    label: `${bb.label} · ${bb.durationLabel || ""}`.trim(),
  };
}

/**
 * All'inizio battaglia: attiva il buff (non lo cancella se è "turns";
 * per "battle" resta attivo fino a fine partita).
 */
export function activateFoodBuffForBattle(playerState) {
  const buff = normalizeFoodBuff(playerState?.foodBuff);
  if (!buff) return { ok: false, buff: null, patch: null };
  return { ok: true, buff, patch: null };
}

/** Fine battaglia: se duration battle → rimuovi. Se turns e turnsLeft>0 → resta per next? No, turns are in-battle only. */
export function clearFoodBuffAfterBattle(playerState) {
  const buff = normalizeFoodBuff(playerState?.foodBuff);
  if (!buff) return { ok: false, patch: null };
  // turn-based buffs also end when battle ends
  return { ok: true, patch: { foodBuff: null } };
}

/** Fine turno giocatore: scala turnsLeft; se 0 rimuove. */
export function tickFoodBuffTurn(playerState) {
  const buff = normalizeFoodBuff(playerState?.foodBuff);
  if (!buff || buff.duration !== "turns") {
    return { ok: false, buff, expired: false, patch: null };
  }
  const next = Math.max(0, (buff.turnsLeft || 0) - 1);
  if (next <= 0) {
    return {
      ok: true,
      buff: null,
      expired: true,
      patch: { foodBuff: null },
    };
  }
  return {
    ok: true,
    buff: { ...buff, turnsLeft: next },
    expired: false,
    patch: {
      foodBuff: {
        id: buff.id,
        label: buff.label,
        atkMult: buff.atkMult,
        duration: "turns",
        turnsLeft: next,
        turns: buff.turnsLeft,
        durationLabel: buff.durationLabel,
      },
    },
  };
}

/** @deprecated use activateFoodBuffForBattle + clearFoodBuffAfterBattle */
export function consumeFoodBuff(playerState) {
  const act = activateFoodBuffForBattle(playerState);
  if (!act.ok) return { ok: false, patch: null, buff: null };
  // Compat: vecchio flusso cancellava subito — ora non cancelliamo a start
  return { ok: true, buff: act.buff, patch: null };
}

export function normalizeIngredients(raw) {
  const out = {};
  for (const id of Object.keys(INGREDIENT_DEFS)) {
    out[id] = Math.max(0, Number(raw?.[id]) || 0);
  }
  return out;
}

export function normalizeItems(raw) {
  const out = {};
  for (const id of Object.keys(ITEM_DEFS)) {
    out[id] = Math.max(0, Number(raw?.[id]) || 0);
  }
  return out;
}

export function normalizeUsables(raw) {
  const out = {};
  for (const id of Object.keys(USABLE_DEFS)) {
    out[id] = Math.max(0, Number(raw?.[id]) || 0);
  }
  return out;
}

export function canCook(recipe, ingredients) {
  const bag = normalizeIngredients(ingredients);
  return Object.entries(recipe.ingredients).every(([id, need]) => (bag[id] || 0) >= need);
}

export function cookRecipe(recipe, playerState) {
  const ingredients = normalizeIngredients(playerState?.ingredients);
  const usables = normalizeUsables(playerState?.usables);
  if (!canCook(recipe, ingredients)) {
    return { ok: false, reason: "Ingredienti insufficienti" };
  }
  const nextIngredients = { ...ingredients };
  for (const [id, need] of Object.entries(recipe.ingredients)) {
    nextIngredients[id] = Math.max(0, (nextIngredients[id] || 0) - need);
  }
  const nextUsables = { ...usables };
  if (recipe.result.type === "usables") {
    nextUsables[recipe.result.id] = (nextUsables[recipe.result.id] || 0) + recipe.result.qty;
  }
  return {
    ok: true,
    patch: { ingredients: nextIngredients, usables: nextUsables },
    resultName: USABLE_DEFS[recipe.result.id]?.name || recipe.name,
  };
}

export function defaultIngredients() {
  return { bone_meat: 2, salt: 4 };
}

export function defaultItems() {
  return { scrap_wood: 0 };
}

export function defaultUsables() {
  return { bone_meat_meal: 0, salted_snack: 0 };
}
