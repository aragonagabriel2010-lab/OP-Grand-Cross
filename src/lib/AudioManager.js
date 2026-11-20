import { effectiveVolume, loadAudioSettings } from "@/lib/audioSettings";

/** Temino avventura — 8 beat @ ~96 BPM (procedurale, niente asset). */
const BGM_BPM = 96;
const BGM_BEAT = 60 / BGM_BPM;
const BGM_LOOP_BEATS = 8;
/** [beat, durataBeat, Hz] */
const BGM_MELODY = [
  [0, 1, 392.0],
  [1, 1, 440.0],
  [2, 1.5, 523.25],
  [3.5, 0.5, 493.88],
  [4, 1, 440.0],
  [5, 1, 349.23],
  [6, 2, 329.63],
];
const BGM_BASS = [
  [0, 2, 130.81],
  [2, 2, 146.83],
  [4, 2, 164.81],
  [6, 2, 123.47],
];

/**
 * AudioManager — SFX UI + BGM loop secondo le Impostazioni
 * (mute / master / sfx / bgm). Nessun flusso di "sblocco" manuale.
 */
class AudioManagerClass {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmBus = null;
    this._lastHoverAt = 0;
    this._lastHoverEl = null;
    this._hoverMutedUntil = 0;
    this._lastPointerMoveAt = 0;
    this._booted = false;
    this._bgmWanted = true;
    this._bgmPlaying = false;
    this._bgmStarting = false;
    this._bgmGen = 0;
    this._bgmNextLoopAt = 0;
    this._bgmTimer = null;

    if (typeof window !== "undefined") {
      window.addEventListener("opgv:audio", () => {
        this.applySettingsVolume();
        if (this._bgmWanted && document.visibilityState === "visible") {
          this.startBgm();
        }
      });
      queueMicrotask(() => this.boot());
      window.addEventListener("pageshow", () => {
        this.boot();
        if (this._bgmWanted && document.visibilityState === "visible") {
          this.startBgm();
        }
      });
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
          // Ferma timer + note già in coda (evita stack al rientro)
          this._hardStopBgm();
          return;
        }
        this.boot();
        if (this._bgmWanted) this.startBgm();
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
      this.bgmBus = this.ctx.createGain();
      this.bgmBus.connect(this.ctx.destination);
      this.applySettingsVolume();
    }
    return this.ctx;
  }

  applySettingsVolume() {
    if (this.master) {
      this.master.gain.value = effectiveVolume("sfx");
    }
    if (!this.bgmBus) return;
    const vol = effectiveVolume("bgm");
    const t = this.ctx?.currentTime || 0;
    this.bgmBus.gain.setTargetAtTime(vol * 0.22, t, 0.05);
    if (vol < 0.001) {
      this._hardStopBgm();
      return;
    }
    if (
      this._bgmWanted &&
      !this._bgmPlaying &&
      !this._bgmStarting &&
      document.visibilityState === "visible" &&
      this.ctx?.state === "running"
    ) {
      this.startBgm();
    }
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

  /** Fusione carte — pitch sale con le stelle */
  playMerge(stars = 2) {
    if (!this._sfxEnabled()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }
    const vol = 0.42;
    const t0 = ctx.currentTime;
    const base = stars >= 3 ? 420 : stars >= 2 ? 330 : 260;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(base, t0);
    osc.frequency.exponentialRampToValueAtTime(base * 2.2, t0 + 0.16);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.3);

    const chime = ctx.createOscillator();
    const cg = ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(base * 3, t0 + 0.05);
    cg.gain.setValueAtTime(0.0001, t0 + 0.05);
    cg.gain.exponentialRampToValueAtTime(vol * 0.5, t0 + 0.07);
    cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    chime.connect(cg);
    cg.connect(this.master);
    chime.start(t0 + 0.05);
    chime.stop(t0 + 0.24);
  }

  playHit(crit = false) {
    if (!this._sfxEnabled()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }
    const vol = crit ? 0.5 : 0.32;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(crit ? 140 : 90, t0);
    osc.frequency.exponentialRampToValueAtTime(40, t0 + 0.1);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.14);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.15);
  }

  playUlt() {
    if (!this._sfxEnabled()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }
    const vol = 0.55;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(80, t0);
    osc.frequency.exponentialRampToValueAtTime(520, t0 + 0.35);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.58);

    const spark = ctx.createOscillator();
    const sg = ctx.createGain();
    spark.type = "sine";
    spark.frequency.setValueAtTime(880, t0 + 0.2);
    spark.frequency.exponentialRampToValueAtTime(1760, t0 + 0.45);
    sg.gain.setValueAtTime(0.0001, t0 + 0.2);
    sg.gain.exponentialRampToValueAtTime(vol * 0.6, t0 + 0.22);
    sg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5);
    spark.connect(sg);
    sg.connect(this.master);
    spark.start(t0 + 0.2);
    spark.stop(t0 + 0.52);
  }

  playHeal() {
    if (!this._sfxEnabled()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }
    const vol = 0.3;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, t0);
    osc.frequency.exponentialRampToValueAtTime(780, t0 + 0.18);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.22);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.24);
  }

  /** Level up personaggio */
  playLevelUp() {
    if (!this._sfxEnabled()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }
    const vol = 0.45;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.exponentialRampToValueAtTime(660, t0 + 0.22);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.4);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.42);

    const chime = ctx.createOscillator();
    const cg = ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(990, t0 + 0.12);
    chime.frequency.exponentialRampToValueAtTime(1320, t0 + 0.32);
    cg.gain.setValueAtTime(0.0001, t0 + 0.12);
    cg.gain.exponentialRampToValueAtTime(vol * 0.55, t0 + 0.14);
    cg.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
    chime.connect(cg);
    cg.connect(this.master);
    chime.start(t0 + 0.12);
    chime.stop(t0 + 0.4);
  }

  /** Risveglio / ascensione */
  playAwaken() {
    if (!this._sfxEnabled()) return;
    const ctx = this._ensureRunning();
    if (!ctx || !this.master) {
      this.boot();
      return;
    }
    const vol = 0.5;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(110, t0);
    osc.frequency.exponentialRampToValueAtTime(440, t0 + 0.4);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.65);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.68);

    [660, 880, 1100].forEach((freq, i) => {
      const spark = ctx.createOscillator();
      const sg = ctx.createGain();
      const start = t0 + 0.15 + i * 0.08;
      spark.type = "sine";
      spark.frequency.setValueAtTime(freq, start);
      sg.gain.setValueAtTime(0.0001, start);
      sg.gain.exponentialRampToValueAtTime(vol * 0.4, start + 0.02);
      sg.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      spark.connect(sg);
      sg.connect(this.master);
      spark.start(start);
      spark.stop(start + 0.22);
    });
  }

  /** Potenziamento ultimata */
  playUltUpgrade() {
    this.playUlt();
  }

  /** Avvia (o riprende) la musichetta hub — richiede gesture utente per AudioContext. */
  startBgm() {
    this._bgmWanted = true;
    if (document.visibilityState === "hidden") return;
    if (this._bgmPlaying || this._bgmStarting) return;

    const ctx = this._ensureCtx();
    if (!ctx || !this.bgmBus) return;
    if (effectiveVolume("bgm") < 0.001) {
      this._hardStopBgm();
      return;
    }

    this._bgmStarting = true;
    const begin = () => {
      this._bgmStarting = false;
      if (!this._bgmWanted || document.visibilityState === "hidden") return;
      if (this._bgmPlaying) return;
      if (!this.ctx || this.ctx.state !== "running" || !this.bgmBus) return;
      if (effectiveVolume("bgm") < 0.001) return;

      this.bgmBus.gain.setTargetAtTime(
        effectiveVolume("bgm") * 0.22,
        this.ctx.currentTime,
        0.05
      );
      this._bgmPlaying = true;
      this._bgmGen += 1;
      const gen = this._bgmGen;
      this._bgmNextLoopAt = this.ctx.currentTime + 0.05;
      this._scheduleBgmLoops(gen);
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(begin).catch(() => {
        this._bgmStarting = false;
      });
      return;
    }
    begin();
  }

  stopBgm() {
    this._bgmWanted = false;
    this._hardStopBgm();
  }

  /** Ferma scheduler e silenzia note già schedulate (ricrea il bus BGM). */
  _hardStopBgm() {
    this._bgmPlaying = false;
    this._bgmStarting = false;
    this._bgmGen += 1;
    if (this._bgmTimer != null) {
      clearTimeout(this._bgmTimer);
      this._bgmTimer = null;
    }
    if (!this.ctx) return;
    if (this.bgmBus) {
      try {
        this.bgmBus.disconnect();
      } catch {
        /* ignore */
      }
    }
    this.bgmBus = this.ctx.createGain();
    this.bgmBus.gain.value = effectiveVolume("bgm") * 0.22;
    this.bgmBus.connect(this.ctx.destination);
  }

  _scheduleBgmLoops(gen) {
    if (gen !== this._bgmGen) return;
    if (!this._bgmPlaying || !this.ctx || !this.bgmBus) return;
    if (effectiveVolume("bgm") < 0.001 || document.visibilityState === "hidden") {
      this._hardStopBgm();
      return;
    }

    const ctx = this.ctx;
    const loopDur = BGM_LOOP_BEATS * BGM_BEAT;
    let guard = 0;
    while (this._bgmNextLoopAt < ctx.currentTime + loopDur * 1.25 && guard < 4) {
      if (gen !== this._bgmGen) return;
      this._queueBgmLoop(this._bgmNextLoopAt);
      this._bgmNextLoopAt += loopDur;
      guard += 1;
    }

    if (this._bgmTimer != null) {
      clearTimeout(this._bgmTimer);
      this._bgmTimer = null;
    }
    const waitMs = Math.max(80, (this._bgmNextLoopAt - ctx.currentTime - loopDur * 0.4) * 1000);
    this._bgmTimer = setTimeout(() => {
      this._bgmTimer = null;
      if (gen !== this._bgmGen) return;
      this._scheduleBgmLoops(gen);
    }, waitMs);
  }

  _queueBgmLoop(t0) {
    const ctx = this.ctx;
    const bus = this.bgmBus;
    if (!ctx || !bus) return;

    for (const [beat, durBeats, freq] of BGM_BASS) {
      const start = t0 + beat * BGM_BEAT;
      const dur = durBeats * BGM_BEAT;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.55, start + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur * 0.92);
      osc.connect(g);
      g.connect(bus);
      osc.start(start);
      osc.stop(start + dur);
    }

    for (const [beat, durBeats, freq] of BGM_MELODY) {
      const start = t0 + beat * BGM_BEAT;
      const dur = durBeats * BGM_BEAT;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.7, start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.08, dur * 0.85));
      osc.connect(g);
      g.connect(bus);
      osc.start(start);
      osc.stop(start + dur);

      // Armonica leggera
      const harm = ctx.createOscillator();
      const hg = ctx.createGain();
      harm.type = "sine";
      harm.frequency.setValueAtTime(freq * 2, start);
      hg.gain.setValueAtTime(0.0001, start);
      hg.gain.exponentialRampToValueAtTime(0.18, start + 0.03);
      hg.gain.exponentialRampToValueAtTime(0.0001, start + Math.max(0.06, dur * 0.7));
      harm.connect(hg);
      hg.connect(bus);
      harm.start(start);
      harm.stop(start + dur);
    }

    // Pulse ritmico soft sui beat pari
    for (let b = 0; b < BGM_LOOP_BEATS; b += 2) {
      const start = t0 + b * BGM_BEAT;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(b % 4 === 0 ? 180 : 220, start);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.12, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);
      osc.connect(g);
      g.connect(bus);
      osc.start(start);
      osc.stop(start + 0.1);
    }
  }

  getSettings() {
    return loadAudioSettings();
  }
}

export const AudioManager = new AudioManagerClass();
