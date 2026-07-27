/*
 * Retro sound engine for Mouse Strike.
 * Sample synthesis is adapted from ZzFX v1.3.2.
 * MIT License, Copyright (c) 2019 Frank Force.
 * https://github.com/KilledByAPixel/ZzFX
 */
(() => {
  "use strict";

  const SAMPLE_RATE = 44100;
  const MAX_VOICES = 24;

  const PRESETS = {
    select: [0.22, 0, 520, 0.004, 0.025, 0.055, 1, 1, 180, 0, 110, 0.025, 0, 0, 0, 0.03, 0, 0.75, 0.018],
    back: [0.18, 0, 320, 0.004, 0.025, 0.08, 1, 1, -120, 0, -80, 0.025, 0, 0, 0, 0.04, 0, 0.7, 0.02],
    launch: [0.34, 0, 105, 0.015, 0.16, 0.34, 2, 1, 390, -2, 0, 0, 0.035, 0.04, 4, 0.035, 0.035, 0.85, 0.08],
    firePulse: [0.075, 0, 280, 0, 0.012, 0.038, 2, 1, -70, 0, 0, 0, 0, 0.05, 0, 0.08, 0, 0.55, 0.01],
    fireRail: [0.085, 0, 610, 0, 0.012, 0.05, 2, 1, -155, 0, 0, 0, 0, 0.025, 0, 0.12, 0, 0.6, 0.012],
    fireWave: [0.085, 0, 360, 0, 0.02, 0.065, 1, 1, 15, 0, 0, 0, 0.028, 0, 16, 0.04, 0, 0.62, 0.018, 0.18],
    fireHeavy: [0.13, 0, 105, 0.002, 0.035, 0.095, 4, 1.7, -38, 0, 0, 0, 0, 0.7, 0, 0.12, 0, 0.72, 0.025],
    fireSeeker: [0.08, 0, 430, 0.002, 0.018, 0.08, 1, 1, 95, -1, 170, 0.035, 0, 0.03, 8, 0.06, 0.025, 0.65, 0.02],
    fireOverdrive: [0.065, 0, 520, 0, 0.014, 0.042, 5, 0.35, -90, 0, 0, 0, 0.025, 0.04, 0, 0.1, 0, 0.58, 0.012],
    enemyFire: [0.065, 0, 180, 0, 0.02, 0.075, 2, 1, -35, 0, 0, 0, 0, 0.12, 0, 0.1, 0, 0.55, 0.015],
    kill: [0.13, 0, 92, 0, 0.035, 0.13, 4, 1.8, -24, 0, 0, 0, 0, 0.78, 0, 0.08, 0, 0.45, 0.025],
    eliteKill: [0.2, 0, 74, 0.005, 0.07, 0.24, 4, 2, -18, 0, 0, 0, 0, 0.9, 0, 0.12, 0.03, 0.5, 0.05],
    bossKill: [0.32, 0, 52, 0.01, 0.22, 0.72, 4, 2, -8, 0, -18, 0.16, 0.08, 1, 0, 0.14, 0.08, 0.55, 0.12, 0.12],
    pickup: [0.2, 0, 660, 0.004, 0.045, 0.12, 1, 1, 170, 0, 210, 0.035, 0, 0, 0, 0.04, 0.025, 0.75, 0.025],
    repair: [0.2, 0, 430, 0.008, 0.11, 0.22, 0, 1, 90, 0, 160, 0.07, 0.06, 0, 5, 0.035, 0.04, 0.8, 0.06],
    upgrade: [0.22, 0, 330, 0.004, 0.065, 0.15, 1, 1, 145, 0, 165, 0.04, 0.055, 0, 0, 0.035, 0.035, 0.78, 0.035],
    transform: [0.28, 0, 92, 0.012, 0.2, 0.42, 2, 1, 360, -1, 0, 0, 0.045, 0.07, 7, 0.05, 0.06, 0.82, 0.11],
    overdrive: [0.26, 0, 210, 0.004, 0.15, 0.3, 5, 0.35, 210, 0, 140, 0.05, 0.04, 0.04, 0, 0.07, 0.04, 0.78, 0.08],
    rush: [0.26, 0, 260, 0.004, 0.09, 0.22, 1, 1, 190, 0, 260, 0.05, 0.04, 0, 5, 0.04, 0.04, 0.8, 0.05],
    playerHit: [0.24, 0, 78, 0, 0.05, 0.22, 4, 2, -30, 0, 0, 0, 0, 0.9, 0, 0.18, 0, 0.52, 0.035],
    warning: [0.25, 0, 118, 0.008, 0.12, 0.22, 5, 0.45, 0, 0, -32, 0.07, 0.14, 0.02, 2, 0.08, 0.04, 0.72, 0.05, 0.24],
    bossPhase: [0.29, 0, 70, 0.008, 0.19, 0.42, 4, 1.8, 210, -1, 0, 0, 0.035, 0.74, 5, 0.08, 0.05, 0.7, 0.09],
    gameOver: [0.22, 0, 260, 0.01, 0.13, 0.35, 1, 1, -150, -1, -90, 0.11, 0.08, 0.02, 0, 0.06, 0.08, 0.74, 0.08],
  };

  class RetroAudioEngine {
    constructor() {
      const settings = this.loadSettings();
      this.context = null;
      this.master = null;
      this.compressor = null;
      this.buffers = new Map();
      this.lastPlayed = new Map();
      this.activeVoices = 0;
      this.sources = new Set();
      this.timers = new Set();
      this.muted = settings.muted;
      this.volume = settings.volume;
    }

    loadSettings() {
      try {
        const saved = JSON.parse(window.localStorage.getItem("mouse-strike-audio") || "{}");
        return {
          muted: Boolean(saved.muted),
          volume: Number.isFinite(saved.volume) ? Math.max(0, Math.min(1, saved.volume)) : 0.42,
        };
      } catch {
        return { muted: false, volume: 0.42 };
      }
    }

    saveSettings() {
      try {
        window.localStorage.setItem("mouse-strike-audio", JSON.stringify({
          muted: this.muted,
          volume: this.volume,
        }));
      } catch {
        // Audio remains usable when storage is unavailable.
      }
    }

    async unlock() {
      if (!this.context) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return false;
        this.context = new AudioContextClass();
        this.master = this.context.createGain();
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -18;
        this.compressor.knee.value = 18;
        this.compressor.ratio.value = 5;
        this.compressor.attack.value = 0.004;
        this.compressor.release.value = 0.16;
        this.master.connect(this.compressor).connect(this.context.destination);
        this.applyGain();
      }
      if (this.context.state === "suspended") await this.context.resume();
      return this.context.state === "running";
    }

    applyGain() {
      if (!this.master || !this.context) return;
      const target = this.muted ? 0 : this.volume * 0.72;
      this.master.gain.cancelScheduledValues(this.context.currentTime);
      this.master.gain.setTargetAtTime(target, this.context.currentTime, 0.012);
    }

    setVolume(value) {
      this.volume = Math.max(0, Math.min(1, Number(value) || 0));
      if (this.volume > 0 && this.muted) this.muted = false;
      this.applyGain();
      this.saveSettings();
    }

    setMuted(muted) {
      this.muted = Boolean(muted);
      this.applyGain();
      this.saveSettings();
    }

    toggleMuted() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    buildSamples(parameters) {
      let [
        volume = 1,
        randomness = 0,
        frequency = 220,
        attack = 0,
        sustain = 0,
        release = 0.1,
        shape = 0,
        shapeCurve = 1,
        slide = 0,
        deltaSlide = 0,
        pitchJump = 0,
        pitchJumpTime = 0,
        repeatTime = 0,
        noise = 0,
        modulation = 0,
        bitCrush = 0,
        delay = 0,
        sustainVolume = 1,
        decay = 0,
        tremolo = 0,
        filter = 0,
      ] = parameters;

      const pi2 = Math.PI * 2;
      const abs = Math.abs;
      const sign = (value) => (value < 0 ? -1 : 1);
      let startSlide = (slide *= 500 * pi2 / SAMPLE_RATE / SAMPLE_RATE);
      let startFrequency = (frequency *= (1 + randomness * 2 * Math.random() - randomness) * pi2 / SAMPLE_RATE);
      let modOffset = 0;
      let repeat = 0;
      let crush = 0;
      let jump = 1;
      let time = 0;
      let sample = 0;
      let x2 = 0;
      let x1 = 0;
      let y2 = 0;
      let y1 = 0;
      const quality = 2;
      const w = pi2 * abs(filter) * 2 / SAMPLE_RATE;
      const cos = Math.cos(w);
      const alpha = Math.sin(w) / 2 / quality;
      const a0 = 1 + alpha;
      const a1 = -2 * cos / a0;
      const a2 = (1 - alpha) / a0;
      const b0 = (1 + sign(filter) * cos) / 2 / a0;
      const b1 = -(sign(filter) + cos) / a0;
      const b2 = b0;

      attack = attack * SAMPLE_RATE || 9;
      decay *= SAMPLE_RATE;
      sustain *= SAMPLE_RATE;
      release *= SAMPLE_RATE;
      delay *= SAMPLE_RATE;
      deltaSlide *= 500 * pi2 / SAMPLE_RATE ** 3;
      modulation *= pi2 / SAMPLE_RATE;
      pitchJump *= pi2 / SAMPLE_RATE;
      pitchJumpTime *= SAMPLE_RATE;
      repeatTime = (repeatTime * SAMPLE_RATE) | 0;
      const length = (attack + decay + sustain + release + delay) | 0;
      const samples = new Float32Array(length);

      for (let index = 0; index < length; index += 1) {
        if (!(++crush % ((bitCrush * 100) | 0))) {
          sample = shape
            ? shape > 1
              ? shape > 2
                ? shape > 3
                  ? shape > 4
                    ? (time / pi2 % 1 < shapeCurve / 2 ? 1 : -1)
                    : Math.sin(time ** 3)
                  : Math.max(Math.min(Math.tan(time), 1), -1)
                : 1 - (2 * time / pi2 % 2 + 2) % 2
              : 1 - 4 * abs(Math.round(time / pi2) - time / pi2)
            : Math.sin(time);

          const envelope = index < attack
            ? index / attack
            : index < attack + decay
              ? 1 - ((index - attack) / decay) * (1 - sustainVolume)
              : index < attack + decay + sustain
                ? sustainVolume
                : index < length - delay
                  ? ((length - index - delay) / release) * sustainVolume
                  : 0;
          sample = (repeatTime ? 1 - tremolo + tremolo * Math.sin(pi2 * index / repeatTime) : 1)
            * (shape > 4 ? sample : sign(sample) * abs(sample) ** shapeCurve)
            * envelope;

          sample = delay
            ? sample / 2 + (delay > index ? 0 : (index < length - delay ? 1 : (length - index) / delay)
              * samples[(index - delay) | 0] / 2 / volume)
            : sample;

          if (filter) {
            sample = y1 = b2 * x2 + b1 * (x2 = x1) + b0 * (x1 = sample) - a2 * y2 - a1 * (y2 = y1);
          }
        }

        const currentFrequency = (frequency += slide += deltaSlide) * Math.cos(modulation * modOffset++);
        time += currentFrequency + currentFrequency * noise * Math.sin(index ** 5);

        if (jump && ++jump > pitchJumpTime) {
          frequency += pitchJump;
          startFrequency += pitchJump;
          jump = 0;
        }

        if (repeatTime && !(++repeat % repeatTime)) {
          frequency = startFrequency;
          slide = startSlide;
          jump ||= 1;
        }
        samples[index] = sample * volume;
      }
      return samples;
    }

    getBuffer(name) {
      if (this.buffers.has(name)) return this.buffers.get(name);
      const parameters = PRESETS[name];
      if (!parameters || !this.context) return null;
      const samples = this.buildSamples(parameters);
      const buffer = this.context.createBuffer(1, samples.length, SAMPLE_RATE);
      buffer.getChannelData(0).set(samples);
      this.buffers.set(name, buffer);
      return buffer;
    }

    play(name, options = {}) {
      if (this.muted || this.volume <= 0) return null;
      if (!this.context) {
        this.unlock().then((ready) => {
          if (ready) this.play(name, options);
        });
        return null;
      }
      if (this.context.state !== "running") return null;

      const now = performance.now();
      const throttle = options.throttle ?? 0;
      const last = this.lastPlayed.get(name) || 0;
      if (now - last < throttle) return null;
      if (this.activeVoices >= MAX_VOICES && !options.priority) return null;
      this.lastPlayed.set(name, now);

      const buffer = this.getBuffer(name);
      if (!buffer) return null;
      const source = this.context.createBufferSource();
      const gain = this.context.createGain();
      const pitchVariance = options.variance ?? 0.035;
      source.buffer = buffer;
      source.playbackRate.value = (options.pitch ?? 1) * (1 + (Math.random() * 2 - 1) * pitchVariance);
      gain.gain.value = options.volume ?? 1;
      source.connect(gain);

      if (this.context.createStereoPanner) {
        const panner = this.context.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, options.pan ?? 0));
        gain.connect(panner).connect(this.master);
      } else {
        gain.connect(this.master);
      }

      this.activeVoices += 1;
      this.sources.add(source);
      source.onended = () => {
        this.activeVoices = Math.max(0, this.activeVoices - 1);
        this.sources.delete(source);
      };
      source.start();
      return source;
    }

    sequence(steps) {
      steps.forEach((step) => {
        const timer = window.setTimeout(() => {
          this.timers.delete(timer);
          this.play(step.name, { ...step, priority: true });
        }, step.delay || 0);
        this.timers.add(timer);
      });
    }

    stopAll() {
      this.timers.forEach((timer) => window.clearTimeout(timer));
      this.timers.clear();
      this.sources.forEach((source) => {
        try {
          source.stop();
        } catch {
          // The source may already have finished.
        }
      });
      this.sources.clear();
      this.activeVoices = 0;
    }

    panFromX(x, width) {
      if (!Number.isFinite(x) || !width) return 0;
      return Math.max(-0.85, Math.min(0.85, x / width * 2 - 1));
    }

    fighterSelect(fighterId) {
      const order = ["f22", "typhoon", "rafale", "gripen", "su57", "j20"];
      const index = Math.max(0, order.indexOf(fighterId));
      this.play("select", { pitch: 0.9 + index * 0.055, throttle: 40, volume: 0.72, priority: true });
    }

    launch(fighterId) {
      const heavy = fighterId === "su57" ? 0.84 : fighterId === "gripen" ? 1.12 : 1;
      this.play("launch", { pitch: heavy, volume: 0.92, priority: true });
    }

    fire(fighterId, overdrive, x, width) {
      const map = {
        f22: "fireSeeker",
        typhoon: "fireRail",
        rafale: "fireWave",
        gripen: "fireRail",
        su57: "fireHeavy",
        j20: "fireSeeker",
      };
      this.play(overdrive ? "fireOverdrive" : map[fighterId] || "firePulse", {
        pan: this.panFromX(x, width),
        throttle: overdrive ? 68 : 82,
        volume: overdrive ? 0.58 : 0.66,
        variance: 0.045,
      });
    }

    enemyFire(x, width, boss = false) {
      this.play(boss ? "warning" : "enemyFire", {
        pan: this.panFromX(x, width),
        throttle: boss ? 170 : 130,
        volume: boss ? 0.42 : 0.28,
      });
    }

    enemyKilled(type, x, width) {
      const name = type === "boss" ? "bossKill" : type === "elite" ? "eliteKill" : "kill";
      this.play(name, {
        pan: this.panFromX(x, width),
        throttle: type === "boss" ? 0 : 34,
        pitch: type === "spinner" ? 1.18 : type === "gunner" ? 0.9 : 1,
        volume: type === "boss" ? 1 : type === "elite" ? 0.86 : 0.6,
        priority: type === "boss",
      });
    }

    pickup(type) {
      this.play(type === "repair" ? "repair" : "pickup", { volume: 0.82, priority: true });
    }

    weaponUpgrade() {
      this.sequence([
        { name: "upgrade", delay: 0, pitch: 0.9, volume: 0.72 },
        { name: "upgrade", delay: 85, pitch: 1.12, volume: 0.78 },
        { name: "upgrade", delay: 170, pitch: 1.34, volume: 0.84 },
      ]);
    }

    transform(apex = false) {
      this.play("transform", { pitch: apex ? 1.08 : 0.92, volume: apex ? 1 : 0.86, priority: true });
      this.sequence([
        { name: "upgrade", delay: 130, pitch: apex ? 1.35 : 1.1, volume: 0.72 },
        { name: "overdrive", delay: 260, pitch: apex ? 1.12 : 0.94, volume: 0.7 },
      ]);
    }

    tactical(fighterId, assault = false) {
      const pitchMap = {
        f22: 1.18,
        typhoon: 1.05,
        rafale: 1.12,
        gripen: 1.28,
        su57: 0.74,
        j20: 0.96,
      };
      this.play(assault ? "bossPhase" : "overdrive", {
        pitch: (pitchMap[fighterId] || 1) * (assault ? 0.92 : 1),
        volume: assault ? 0.96 : 0.84,
        priority: true,
      });
      this.sequence([
        { name: fighterId === "su57" ? "fireHeavy" : fighterId === "rafale" ? "fireWave" : "fireRail", delay: 80, pitch: pitchMap[fighterId] || 1, volume: 0.82 },
        { name: "upgrade", delay: 190, pitch: assault ? 1.28 : 1.12, volume: 0.7 },
      ]);
    }

    moduleEquipped() {
      this.weaponUpgrade();
      this.play("repair", { pitch: 1.18, volume: 0.66, priority: true });
    }

    bossPart() {
      this.play("bossPhase", { pitch: 1.24, volume: 0.9, priority: true });
    }

    armorAbsorb() {
      this.play("transform", { pitch: 0.72, volume: 0.78, priority: true });
    }

    overdrive() {
      this.play("overdrive", { volume: 0.9, priority: true });
    }

    rush() {
      this.sequence([
        { name: "rush", delay: 0, pitch: 0.9, volume: 0.85 },
        { name: "rush", delay: 90, pitch: 1.15, volume: 0.9 },
        { name: "rush", delay: 180, pitch: 1.4, volume: 0.95 },
      ]);
    }

    playerHit() {
      this.play("playerHit", { volume: 0.95, priority: true });
    }

    bossWarning() {
      this.sequence([
        { name: "warning", delay: 0, pitch: 0.82, volume: 0.9 },
        { name: "warning", delay: 260, pitch: 0.82, volume: 0.9 },
        { name: "warning", delay: 520, pitch: 0.72, volume: 1 },
      ]);
    }

    bossPhase(phase) {
      this.play("bossPhase", { pitch: phase === 3 ? 1.08 : 0.9, volume: 1, priority: true });
    }

    gameOver() {
      this.sequence([
        { name: "gameOver", delay: 0, pitch: 1.05, volume: 0.88 },
        { name: "gameOver", delay: 190, pitch: 0.82, volume: 0.82 },
        { name: "gameOver", delay: 380, pitch: 0.62, volume: 0.78 },
      ]);
    }

    back() {
      this.play("back", { volume: 0.7, priority: true });
    }
  }

  window.gameAudio = new RetroAudioEngine();
})();
