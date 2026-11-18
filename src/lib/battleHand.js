/**
 * Sistema mano battaglia stile 7DS:GC
 * — max hand 5/7/9, deal 2-fasi, auto-merge adiacente
 * — cure/buff: max 3 ogni 6 turni (poi altri 3 dal 7° al 12°, ecc.)
 */

import {
  createBattleTile,
  mergeTiles,
  tilesMatchForMerge,
  shuffle,
  effectiveAttack,
  starDamageMultiplier,
  healMultiplier,
} from "@/lib/gameUtils";

/** Scaling stelle — un solo posto per bilanciare potenza/effetti */
export const STAR_POWER = {
  1: { damageMult: 1.0, healMult: 1.0, effectPotency: 1, label: "Bronzo" },
  2: { damageMult: 1.5, healMult: 1.35, effectPotency: 1.5, label: "Argento" },
  3: { damageMult: 2.15, healMult: 1.7, effectPotency: 2, label: "Oro" },
};

/** Finestra quota support: turni 1–6, 7–12, 13–18… */
export const SUPPORT_WINDOW_TURNS = 6;
/** Max carte heal/buff pescabili per finestra */
export const SUPPORT_PER_WINDOW = 3;

export function isSupportMove(move) {
  const t = move?.type;
  return t === "heal" || t === "buff";
}

export function supportWindowIndex(turn = 1) {
  return Math.floor(Math.max(0, (Number(turn) || 1) - 1) / SUPPORT_WINDOW_TURNS);
}

/** teamSize = PG vivi in squadra (1–3) */
export function maxHandSize(teamSize) {
  const n = Math.max(1, Math.min(3, teamSize || 1));
  if (n >= 3) return 9;
  if (n === 2) return 7;
  return 5;
}

/** Carte pescate a fine turno: 2 per personaggio vivo */
export function drawCountForTeam(aliveCharIndexes) {
  const n = (aliveCharIndexes || []).filter((i) => i != null).length;
  return Math.max(2, n * 2);
}

/** Pool: solo abilità normali [0,1,2] per ogni PG vivo */
export function buildSkillPool(aliveCharIndexes) {
  return aliveCharIndexes.flatMap((ci) =>
    [0, 1, 2].map((moveIndex) => ({ charIndex: ci, moveIndex }))
  );
}

/**
 * @param {(charIndex: number, moveIndex: number) => object|null} resolveMove
 */
export function splitPools(aliveCharIndexes, resolveMove) {
  const pool = buildSkillPool(aliveCharIndexes);
  const attack = [];
  const support = [];
  for (const p of pool) {
    const move = resolveMove?.(p.charIndex, p.moveIndex);
    if (isSupportMove(move)) support.push(p);
    else attack.push(p);
  }
  return { pool, attack, support };
}

function pickPoolEntry(alive, resolveMove, supportDrawn) {
  const { attack, support, pool } = splitPools(alive, resolveMove);
  const atCap = supportDrawn >= SUPPORT_PER_WINDOW;
  let use = atCap ? attack : pool;
  if (!use.length) use = attack.length ? attack : support.length ? support : pool;
  if (!use.length) return null;
  const pick = use[Math.floor(Math.random() * use.length)];
  const move = resolveMove?.(pick.charIndex, pick.moveIndex);
  return { pick, isSupport: isSupportMove(move) };
}

/** Preferisci un'abilità d'attacco del PG; fallback a qualsiasi. */
function pickAttackForChar(ci, resolveMove) {
  const opts = [0, 1, 2].filter((mi) => !isSupportMove(resolveMove?.(ci, mi)));
  if (opts.length) {
    const moveIndex = opts[Math.floor(Math.random() * opts.length)];
    return { charIndex: ci, moveIndex, isSupport: false };
  }
  const moveIndex = Math.floor(Math.random() * 3);
  return {
    charIndex: ci,
    moveIndex,
    isSupport: isSupportMove(resolveMove?.(ci, moveIndex)),
  };
}

export function cardsMatch(a, b) {
  return tilesMatchForMerge(a, b);
}

export function resolveCardStats(character, owned, card) {
  const move = character?.moves?.[card.moveIndex];
  if (!move) return null;
  const rank = STAR_POWER[card.stars] || STAR_POWER[1];
  const atk = effectiveAttack(character, owned);
  const base = move.power + atk * 0.5;
  const mult = move.type === "attack" ? rank.damageMult : rank.healMult;
  return {
    move,
    stars: card.stars,
    rankLabel: rank.label,
    power: Math.max(1, Math.round(base * mult)),
    effects: (move.effects || []).map((e) => ({
      ...e,
      potency: (e.potency || 1) * rank.effectPotency,
    })),
  };
}

/**
 * Apertura partita con quota support (cura/buff).
 * @param {number[]} aliveCharIndexes
 * @param {{ resolveMove?: Function, supportDrawn?: number }} opts
 */
export function dealOpeningHand(aliveCharIndexes, opts = {}) {
  const alive = aliveCharIndexes.filter((i) => i != null);
  const max = maxHandSize(alive.length);
  const resolveMove = opts.resolveMove || (() => null);
  let supportDrawn = Math.max(0, Number(opts.supportDrawn) || 0);
  const hand = [];
  const preferFullKit = Math.random() < 0.78;

  const pushPick = (charIndex, moveIndex) => {
    if (hand.length >= max) return;
    let mi = moveIndex;
    let support = isSupportMove(resolveMove(charIndex, mi));
    if (support && supportDrawn >= SUPPORT_PER_WINDOW) {
      const alt = pickAttackForChar(charIndex, resolveMove);
      mi = alt.moveIndex;
      support = alt.isSupport;
    }
    if (support && supportDrawn >= SUPPORT_PER_WINDOW) return;
    hand.push(createBattleTile(charIndex, mi, 1));
    if (support) supportDrawn += 1;
  };

  if (preferFullKit) {
    for (const ci of alive) {
      for (const moveIndex of shuffle([0, 1, 2])) {
        pushPick(ci, moveIndex);
      }
    }
  } else {
    for (const ci of alive) {
      const personal = shuffle([0, 1, 2]);
      pushPick(ci, personal[0]);
      pushPick(ci, personal[1]);
    }
  }

  while (hand.length < max) {
    const entry = pickPoolEntry(alive, resolveMove, supportDrawn);
    if (!entry) break;
    hand.push(createBattleTile(entry.pick.charIndex, entry.pick.moveIndex, 1));
    if (entry.isSupport) supportDrawn += 1;
  }

  const merged = resolveAdjacentMerges(shuffle([...hand]));
  return { ...merged, supportDrawn };
}

/**
 * Pescata a fine turno — default: 2 carte × personaggio vivo.
 * Rispetta la quota heal/buff della finestra turni corrente.
 */
export function refillHand(hand, aliveCharIndexes, drawCountOrOpts, maybeOpts) {
  const opts =
    typeof drawCountOrOpts === "object" && drawCountOrOpts != null
      ? drawCountOrOpts
      : { drawCount: drawCountOrOpts, ...(maybeOpts || {}) };

  const alive = aliveCharIndexes.filter((i) => i != null);
  const max = maxHandSize(alive.length);
  const room = Math.max(0, max - hand.length);
  const want = opts.drawCount == null ? drawCountForTeam(alive) : opts.drawCount;
  const n = Math.min(want, room);
  const resolveMove = opts.resolveMove || (() => null);
  let supportDrawn = Math.max(0, Number(opts.supportDrawn) || 0);

  if (n <= 0) {
    const merged = resolveAdjacentMerges(hand);
    return { ...merged, supportDrawn };
  }

  const drawn = [];
  for (let i = 0; i < n; i++) {
    const entry = pickPoolEntry(alive, resolveMove, supportDrawn);
    if (!entry) break;
    drawn.push(createBattleTile(entry.pick.charIndex, entry.pick.moveIndex, 1));
    if (entry.isSupport) supportDrawn += 1;
  }

  const merged = resolveAdjacentMerges([...hand, ...drawn]);
  return { ...merged, supportDrawn };
}

/**
 * Scansiona da sinistra: se due carte adiacenti matchano → fondi.
 * @returns {{ hand: Card[], merges: MergeEvent[] }}
 */
export function resolveAdjacentMerges(hand) {
  let next = [...hand];
  const merges = [];
  let changed = true;

  while (changed) {
    changed = false;
    for (let i = 0; i < next.length - 1; i++) {
      if (!cardsMatch(next[i], next[i + 1])) continue;
      const merged = mergeTiles(next[i], next[i + 1]);
      if (!merged) continue;
      merges.push({
        fromIndex: i,
        leftId: next[i].id,
        rightId: next[i + 1].id,
        intoStars: merged.stars,
        card: merged,
      });
      next = [...next.slice(0, i), merged, ...next.slice(i + 2)];
      changed = true;
      break;
    }
  }
  return { hand: next, merges };
}

/** Rimuove carte usate per id, poi refill + merge */
export function afterCardsPlayed(hand, usedIds, aliveCharIndexes, drawCountOrOpts) {
  const idSet = new Set(usedIds);
  const remaining = hand.filter((c) => !idSet.has(c.id));
  return refillHand(remaining, aliveCharIndexes, drawCountOrOpts);
}

/** Rimuove tutte le carte di un PG KO, poi compact + merge */
export function removeCharacterCards(hand, charIndex) {
  return resolveAdjacentMerges(hand.filter((c) => c.charIndex !== charIndex));
}

export function starLabel(stars) {
  return STAR_POWER[stars]?.label || "Bronzo";
}

// Re-export utili per UI
export { starDamageMultiplier, healMultiplier, createBattleTile, mergeTiles };
