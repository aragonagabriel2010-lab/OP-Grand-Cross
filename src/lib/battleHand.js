/**
 * Sistema mano battaglia stile 7DS:GC
 * — max hand 5/7/9, deal 2-fasi, auto-merge adiacente
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

/** teamSize = PG vivi in squadra (1–3) */
export function maxHandSize(teamSize) {
  const n = Math.max(1, Math.min(3, teamSize || 1));
  if (n >= 3) return 9;
  if (n === 2) return 7;
  return 5;
}

/** Pool: solo abilità normali [0,1,2] per ogni PG vivo */
export function buildSkillPool(aliveCharIndexes) {
  return aliveCharIndexes.flatMap((ci) =>
    [0, 1, 2].map((moveIndex) => ({ charIndex: ci, moveIndex }))
  );
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
 * Fase 1: 2 carte garantite per PG
 * Fase 2: riempi fino a maxHandSize dal pool globale
 * Poi auto-merge adiacenze
 */
export function dealOpeningHand(aliveCharIndexes) {
  const alive = aliveCharIndexes.filter((i) => i != null);
  const max = maxHandSize(alive.length);
  const hand = [];

  for (const ci of alive) {
    const personal = shuffle([0, 1, 2]);
    hand.push(createBattleTile(ci, personal[0], 1));
    hand.push(createBattleTile(ci, personal[1], 1));
  }

  const pool = buildSkillPool(alive);
  while (hand.length < max && pool.length > 0) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    hand.push(createBattleTile(pick.charIndex, pick.moveIndex, 1));
  }

  return resolveAdjacentMerges(hand);
}

/**
 * Pescata a fine turno — solo riempimento, senza rifare fase 1
 */
export function refillHand(hand, aliveCharIndexes, drawCount = 2) {
  const alive = aliveCharIndexes.filter((i) => i != null);
  const max = maxHandSize(alive.length);
  const room = Math.max(0, max - hand.length);
  const n = Math.min(drawCount, room);
  if (n <= 0) return resolveAdjacentMerges(hand);

  const pool = buildSkillPool(alive);
  if (pool.length === 0) return resolveAdjacentMerges(hand);

  const drawn = [];
  for (let i = 0; i < n; i++) {
    const pick = pool[Math.floor(Math.random() * pool.length)];
    drawn.push(createBattleTile(pick.charIndex, pick.moveIndex, 1));
  }
  return resolveAdjacentMerges([...hand, ...drawn]);
}

/**
 * Scansiona da sinistra: se due carte adiacenti matchano → fondi.
 * Ripete per catene (1★+1★→2★, poi eventualmente 2★+2★→3★).
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
export function afterCardsPlayed(hand, usedIds, aliveCharIndexes, drawCount = 2) {
  const idSet = new Set(usedIds);
  const remaining = hand.filter((c) => !idSet.has(c.id));
  return refillHand(remaining, aliveCharIndexes, drawCount);
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
