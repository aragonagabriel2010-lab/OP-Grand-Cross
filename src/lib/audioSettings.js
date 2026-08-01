/**
 * Preferenze audio — persistenza localStorage
 */
const STORAGE_KEY = "opgv_audio_v1";

const DEFAULTS = {
  master: 80,
  bgm: 70,
  sfx: 85,
  muted: false,
};

export function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveAudioSettings(partial) {
  const next = { ...loadAudioSettings(), ...partial };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // Evento globale per eventuali listener audio futuri
  window.dispatchEvent(new CustomEvent("opgv:audio", { detail: next }));
  return next;
}

export function effectiveVolume(channel = "master") {
  const s = loadAudioSettings();
  if (s.muted) return 0;
  const master = (s.master ?? 100) / 100;
  const ch = (s[channel] ?? 100) / 100;
  return Math.max(0, Math.min(1, master * ch));
}
