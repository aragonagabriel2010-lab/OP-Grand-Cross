/**
 * Giorno di gioco = mezzanotte locale (non rolling 24h dall'ultimo accesso).
 */

export function localDayKey(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ms fino alla prossima mezzanotte locale */
export function msUntilNextMidnight(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 0, 0);
  return Math.max(0, next.getTime() - d.getTime());
}

/**
 * Chiama `onDayChange(newKey)` a ogni mezzanotte locale (e subito se il giorno è già cambiato).
 * Restituisce cleanup.
 */
export function onLocalMidnight(onDayChange, getNow = () => new Date()) {
  let timer = null;
  let lastKey = localDayKey(getNow());

  const schedule = () => {
    const wait = msUntilNextMidnight(getNow()) + 50;
    timer = window.setTimeout(() => {
      const key = localDayKey(getNow());
      if (key !== lastKey) {
        lastKey = key;
        onDayChange(key);
      }
      schedule();
    }, wait);
  };

  const onVis = () => {
    if (document.visibilityState !== "visible") return;
    const key = localDayKey(getNow());
    if (key !== lastKey) {
      lastKey = key;
      onDayChange(key);
    }
  };

  schedule();
  document.addEventListener("visibilitychange", onVis);
  return () => {
    if (timer) window.clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVis);
  };
}
