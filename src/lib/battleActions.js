/**
 * Slot azione turno + coda mosse (play / move) stile 7DS:GC.
 * maxSlots = personaggi in vita.
 */

export function cloneHand(hand) {
  return (hand || []).map((c) => ({ ...c }));
}

export function makeActionId() {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Slot usati nel turno (= lunghezza coda). */
export function actionsUsed(queue) {
  return queue?.length || 0;
}

export function slotsRemaining(queue, maxSlots) {
  return Math.max(0, (maxSlots || 0) - actionsUsed(queue));
}

export function canSpendAction(queue, maxSlots) {
  return slotsRemaining(queue, maxSlots) > 0;
}

export function playCardIds(queue) {
  return (queue || []).filter((a) => a.type === "play").map((a) => a.cardId);
}

export function isCardQueued(queue, cardId) {
  return playCardIds(queue).includes(cardId);
}

/** Carte da eseguire, nell'ordine della coda (usa tile salvato: le play lasciano la mano). */
export function resolvePlayOrder(queue, hand) {
  const byId = new Map((hand || []).map((c) => [c.id, c]));
  const used = [];
  for (const a of queue || []) {
    if (a.type !== "play") continue;
    const card = a.tile ? { ...a.tile } : byId.get(a.cardId);
    if (card) used.push(card);
  }
  return used;
}

export function queuePlay(queue, cardId, tile) {
  if (isCardQueued(queue, cardId)) return queue;
  return [
    ...(queue || []),
    {
      id: makeActionId(),
      type: "play",
      cardId,
      tile: tile ? { ...tile } : null,
    },
  ];
}

export function queueMove(queue, fromIndex, toIndex) {
  return [
    ...(queue || []),
    {
      id: makeActionId(),
      type: "move",
      fromIndex,
      toIndex,
    },
  ];
}

/** Rimuove una play dalla coda (tap sulla carta già selezionata). */
export function unqueuePlay(queue, cardId) {
  return (queue || []).filter((a) => !(a.type === "play" && a.cardId === cardId));
}

/**
 * Dopo un merge, scarta play che puntano a carte non più in mano
 * (le carte fuse cambiano id).
 */
export function pruneStalePlays(queue, hand) {
  const ids = new Set((hand || []).map((c) => c.id));
  return (queue || []).filter((a) => a.type !== "play" || ids.has(a.cardId));
}

/** Riordina array (immutable). */
export function reorderList(list, fromIndex, toIndex) {
  if (fromIndex === toIndex) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}
