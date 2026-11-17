/**
 * IA nemici — sceglie cura / buff / attacco in base alla situazione.
 */

import { createEffect, EFFECT_TYPES } from "@/lib/battleEffects";

/**
 * @returns {{
 *   move: object,
 *   kind: 'attack'|'heal'|'buff',
 *   targetIndex: number,
 *   stunEffect: object|null
 * }}
 */
export function chooseEnemyAction(enemy, allyIndexes, memberHp, memberMaxHp) {
  const moves = enemy?.character?.moves || [];
  if (!moves.length || !allyIndexes?.length) {
    return null;
  }

  const hpRatio = enemy.maxHp > 0 ? enemy.hp / enemy.maxHp : 1;
  const heals = moves.filter((m) => m.type === "heal");
  const buffs = moves.filter((m) => m.type === "buff" || m.type === "defend" || m.type === "defense" || m.type === "guard");
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

  // Attacca l'alleato con meno % HP
  let targetIndex = allyIndexes[0];
  let worst = Infinity;
  for (const i of allyIndexes) {
    const max = memberMaxHp[i] || 1;
    const ratio = (memberHp[i] || 0) / max;
    if (ratio < worst) {
      worst = ratio;
      targetIndex = i;
    }
  }

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
