/**
 * IA nemici — cura / buff / attacco con targeting misto (non pile-on fisso).
 */

import { createEffect, EFFECT_TYPES } from "@/lib/battleEffects";
import { damageTypeMultiplier } from "@/lib/gameUtils";

/**
 * Peso relativo per un bersaglio alleato.
 * Bias leggero verso HP bassi e vantaggio di tipo, più rumore e anti-focus.
 */
export function scoreAllyTarget({
  allyIndex,
  memberHp,
  memberMaxHp,
  attacker,
  defenderCharacter,
  focusHits = {},
}) {
  const max = memberMaxHp[allyIndex] || 1;
  const hp = Math.max(0, memberHp[allyIndex] || 0);
  const ratio = hp / max;
  const missing = 1 - ratio;

  // Preferenza moderata per i feriti, non assoluta
  let score = 1 + missing * 1.4;

  // Vantaggio di tipo: piccolo bonus
  if (attacker?.character && defenderCharacter) {
    const mult = damageTypeMultiplier(attacker.character.attribute, defenderCharacter);
    if (mult > 1) score *= 1.25;
    else if (mult < 1) score *= 0.8;
  }

  // Evita di martellare sempre lo stesso in questo turno
  const hits = focusHits[allyIndex] || 0;
  if (hits > 0) score *= Math.max(0.25, 0.55 ** hits);

  // Rumore: rende la scelta imprevedibile
  score *= 0.55 + Math.random() * 0.9;

  return score;
}

function pickWeightedTarget(allyIndexes, scoreFn) {
  if (!allyIndexes?.length) return -1;
  if (allyIndexes.length === 1) return allyIndexes[0];

  const weights = allyIndexes.map((i) => Math.max(0.05, scoreFn(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < allyIndexes.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return allyIndexes[i];
  }
  return allyIndexes[allyIndexes.length - 1];
}

/**
 * @param {object} [opts]
 * @param {Record<number, number>} [opts.focusHits] colpi già ricevuti dagli alleati in questo turno nemico
 * @param {Array<object|null>} [opts.teamCharacters] personaggi alleati per indice (vantaggio tipo)
 * @returns {{
 *   move: object,
 *   kind: 'attack'|'heal'|'buff',
 *   targetIndex: number,
 *   stunEffect: object|null
 * }|null}
 */
export function chooseEnemyAction(enemy, allyIndexes, memberHp, memberMaxHp, opts = {}) {
  const moves = enemy?.character?.moves || [];
  if (!moves.length || !allyIndexes?.length) {
    return null;
  }

  const { focusHits = {}, teamCharacters = [] } = opts;
  const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  const heals = moves.filter((m) => m.type === "heal");
  const buffs = moves.filter(
    (m) => m.type === "buff" || m.type === "defend" || m.type === "defense" || m.type === "guard"
  );
  const attacks = moves.filter((m) => m.type === "attack" || !m.type);

  // Cura se sotto il 40%
  if (hpRatio < 0.4 && heals.length && Math.random() < 0.75) {
    return {
      move: heals[Math.floor(Math.random() * heals.length)],
      kind: "heal",
      targetIndex: -1,
      stunEffect: null,
    };
  }

  // Buff/difesa occasionale
  if (buffs.length && Math.random() < 0.22) {
    return {
      move: buffs[Math.floor(Math.random() * buffs.length)],
      kind: "buff",
      targetIndex: -1,
      stunEffect: null,
    };
  }

  const targetIndex = pickWeightedTarget(allyIndexes, (i) =>
    scoreAllyTarget({
      allyIndex: i,
      memberHp,
      memberMaxHp,
      attacker: enemy,
      defenderCharacter: teamCharacters[i],
      focusHits,
    })
  );

  const move =
    attacks[Math.floor(Math.random() * attacks.length)] ||
    moves[Math.floor(Math.random() * moves.length)];

  // Stun su colpi forti
  const stunChance = (move?.power || 0) >= 36 ? 0.28 : 0.12;
  const stunEffect =
    Math.random() < stunChance
      ? createEffect({
          type: EFFECT_TYPES.STUN,
          potency: 1,
          duration: 1,
          source: enemy.character?.id || "enemy",
        })
      : null;

  return { move, kind: "attack", targetIndex, stunEffect };
}

export function enemyHealAmount(enemy, move) {
  const power = move?.power || 20;
  return Math.max(1, Math.round(power * 1.2 + (enemy.maxHp || 100) * 0.08));
}
