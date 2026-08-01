import { effectiveVolume, loadAudioSettings } from "@/lib/audioSettings";

/**
 * AudioManager — SFX UI sempre attivi secondo le Impostazioni
 * (mute / master / sfx). Nessun flusso di "sblocco" manuale.
 */
class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.master = null;
    this._lastHoverAt = 0;
    this._lastHoverEl = null;
    this._hoverMutedUntil = 0;
    this._lastPointerMoveAt = 0;
    this._booted = false;

    if (typeof window !== "undefined") {
      window.addEventListener("opgv:audio", () => this.applySettingsVolume());
      // Avvio immediato (best-effort)
      queueMicrotask(() => this.boot());
      window.addEventListener("pageshow", () => this.boot());
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") this.boot();
      });
    }
  }

  notePointerMove() {
    this._lastPointerMoveAt = performance.now();
  }

  muteHover(ms = 400) {
    this._hoverMutedUntil = Math.max(this._hoverMutedUntil, performance.now() + ms);
  }

  boot() {
    const ctx = this._ensureCtx();
    if (!ctx) return;
    this.applySettingsVolume();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    this._booted = true;
  }

  _ensureCtx() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applySettingsVolume();
    }
    return this.ctx;
  }

  applySettingsVolume() {
    if (!this.master) return;
    // Canale SFX × master × mute dalle Impostazioni
    this.master.gain.value = effectiveVolume("sfx");
  }

  _sfxEnabled() {
    return effectiveVolume("sfx") > 0.001;
  }

  _ensureRunning() {
    const ctx = this._ensureCtx();
    if (!ctx) return null;
    this.applySettingsVolume();
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    return ctx.state === "running" ? ctx : null;
  }

  _canHover() {
    if (!this._sfxEnabled()) return false;
    const t = performance.now();
    if (t < this._hoverMutedUntil) return false;
    if (t - this._lastPointerMoveAt > 120) return false;
    return true;
  }

  playHover(el = null) {
    if (!this._canHover()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      // Riprova appena il context è running (senza gate UX)
      this.boot();
      return;
    }

    const now = performance.now();
    if (el && el === this._lastHoverEl && now - this._lastHoverAt < 90) return;
    if (now - this._lastHoverAt < 40) return;

    const vol = 0.22;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.045);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.07);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.08);

    this._lastHoverEl = el;
    this._lastHoverAt = now;
  }

  playClick() {
    if (!this._sfxEnabled()) return;

    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }

    this.muteHover(350);

    const vol = 0.38;
    const t0 = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(110, t0 + 0.09);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.12);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.13);

    const spark = ctx.createOscillator();
    const sg = ctx.createGain();
    spark.type = "sine";
    spark.frequency.setValueAtTime(1760, t0);
    spark.frequency.exponentialRampToValueAtTime(2480, t0 + 0.05);
    sg.gain.setValueAtTime(0.0001, t0);
    sg.gain.exponentialRampToValueAtTime(vol * 0.45, t0 + 0.004);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    spark.connect(sg);
    sg.connect(this.master);
    spark.start(t0);
    spark.stop(t0 + 0.07);
  }

  /** Compat: non c'è più unlock dedicato */
  unlock() {
    this.boot();
    return Promise.resolve(this.ctx?.state === "running");
  }

  get unlocked() {
    return this.ctx?.state === "running";
  }

  playClickAfterUnlock() {
    this.playClick();
    return Promise.resolve();
  }

  previewSfx() {
    this.playClick();
  }

  getSettings() {
    return loadAudioSettings();
  }
}

export const AudioManager = new AudioManagerClass();
