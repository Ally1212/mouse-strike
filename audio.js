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
  const BATTLE_MUSIC_URL = `${import.meta.env.BASE_URL}audio/on-the-offensive.ogg`;

  const PRESETS = {
    select: [0.22, 0, 520, 0.004, 0.025, 0.055, 1, 1, 180, 0, 110, 0.025, 0, 0, 0, 0.03, 0, 0.75, 0.018],
    back: [0.18, 0, 320, 0.004, 0.025, 0.08, 1, 1, -120, 0, -80, 0.025, 0, 0, 0, 0.04, 0, 0.7, 0.02],
    launch: [0.34, 0, 105, 0.015, 0.16, 0.34, 2, 1, 390, -2, 0, 0, 0.035, 0.04, 4, 0.035, 0.035, 0.85, 0.08],
    firePulse: [0.075, 0, 280, 0, 0.012, 0.038, 2, 1, -70, 0, 0, 0, 0, 0.05, 0, 0.08, 0, 0.55, 0.01],
    fireRail: [0.085, 0, 610, 0, 0.012, 0.05, 2, 1, -155, 0, 0, 0, 0, 0.025, 0, 0.12, 0, 0.6, 0.012],
    fireWave: [0.085, 0, 360, 0, 0.02, 0.065, 1, 1, 15, 0, 0, 0, 0.028, 0, 16, 0.04, 0, 0.62, 0.018, 0.18],
    fireHeavy: [0.13, 0, 105, 0.002, 0.035, 0.095, 4, 1.7, -38, 0, 0, 0, 0, 0.7, 0, 0.12, 0, 0.72, 0.025],
    fireSeeker: [0.08, 0, 430, 0.002, 0.018, 0.08, 1, 1, 95, -1, 170, 0.035, 0, 0.03, 8, 0.06, 0.025, 0.65, 0.02],
    fireLaser: [0.08, 0, 920, 0, 0.035, 0.09, 0, 1, -42, 0, 230, 0.028, 0.02, 0.01, 22, 0.025, 0.02, 0.58, 0.012],
    laserCharge: [0.16, 0, 310, 0.008, 0.1, 0.18, 0, 1, 560, 0, 240, 0.07, 0.04, 0.01, 12, 0.035, 0.03, 0.7, 0.04],
    laserSustain: [0.13, 0, 760, 0.002, 0.16, 0.12, 0, 1, -22, 0, 110, 0.05, 0.035, 0.025, 28, 0.04, 0.025, 0.62, 0.035, 0.24],
    laserOverheat: [0.22, 0, 128, 0.004, 0.08, 0.28, 4, 1.8, -70, 0, -80, 0.08, 0.05, 0.68, 4, 0.08, 0.05, 0.72, 0.055],
    fireOverdrive: [0.065, 0, 520, 0, 0.014, 0.042, 5, 0.35, -90, 0, 0, 0, 0.025, 0.04, 0, 0.1, 0, 0.58, 0.012],
    enemyFire: [0.065, 0, 180, 0, 0.02, 0.075, 2, 1, -35, 0, 0, 0, 0, 0.12, 0, 0.1, 0, 0.55, 0.015],
    kill: [0.13, 0, 92, 0, 0.035, 0.13, 4, 1.8, -24, 0, 0, 0, 0, 0.78, 0, 0.08, 0, 0.45, 0.025],
    eliteKill: [0.2, 0, 74, 0.005, 0.07, 0.24, 4, 2, -18, 0, 0, 0, 0, 0.9, 0, 0.12, 0.03, 0.5, 0.05],
    bossKill: [0.32, 0, 52, 0.01, 0.22, 0.72, 4, 2, -8, 0, -18, 0.16, 0.08, 1, 0, 0.14, 0.08, 0.55, 0.12, 0.12],
    pickup: [0.2, 0, 660, 0.004, 0.045, 0.12, 1, 1, 170, 0, 210, 0.035, 0, 0, 0, 0.04, 0.025, 0.75, 0.025],
    repair: [0.2, 0, 430, 0.008, 0.11, 0.22, 0, 1, 90, 0, 160, 0.07, 0.06, 0, 5, 0.035, 0.04, 0.8, 0.06],
    barrier: [0.27, 0, 240, 0.008, 0.14, 0.32, 0, 1, 320, 0, 90, 0.08, 0.1, 0.02, 7, 0.06, 0.08, 0.82, 0.07],
    ally: [0.22, 0, 510, 0.004, 0.08, 0.2, 1, 1, 150, 0, 260, 0.045, 0.04, 0.01, 4, 0.035, 0.04, 0.8, 0.04],
    barrierHit: [0.16, 0, 190, 0.002, 0.06, 0.16, 0, 1, 240, 0, 80, 0.035, 0.025, 0.04, 13, 0.025, 0.03, 0.72, 0.035],
    allyFire: [0.07, 0, 690, 0, 0.015, 0.055, 2, 1, -115, 0, 0, 0, 0, 0.02, 0, 0.08, 0, 0.5, 0.012],
    allyLost: [0.24, 0, 120, 0.004, 0.08, 0.3, 4, 1.8, -45, 0, -20, 0.08, 0.05, 0.72, 3, 0.08, 0.04, 0.68, 0.06],
    enemyJet: [0.1, 0, 470, 0, 0.018, 0.075, 2, 1, -185, 0, 0, 0, 0, 0.04, 0, 0.1, 0, 0.52, 0.014],
    helicopter: [0.16, 0, 82, 0.003, 0.08, 0.16, 4, 1.6, 12, 0, 0, 0, 0.055, 0.5, 18, 0.08, 0.03, 0.58, 0.025, 0.42],
    rocket: [0.15, 0, 138, 0.002, 0.05, 0.18, 4, 1.7, 115, -1, 0, 0, 0, 0.7, 0, 0.12, 0.03, 0.62, 0.035],
    mazeAlert: [0.24, 0, 178, 0.004, 0.11, 0.24, 5, 0.45, 165, 0, 240, 0.06, 0.09, 0.02, 8, 0.055, 0.05, 0.76, 0.05],
    mazeWall: [0.1, 0, 110, 0, 0.025, 0.09, 4, 1.8, -55, 0, 0, 0, 0, 0.55, 0, 0.1, 0, 0.5, 0.018],
    structureImpact: [0.16, 0, 92, 0.002, 0.055, 0.18, 4, 1.8, -28, 0, 0, 0, 0, 0.75, 0, 0.1, 0.02, 0.62, 0.03],
    structureBreak: [0.26, 0, 74, 0.004, 0.1, 0.36, 4, 2, 90, -1, 0, 0, 0.04, 0.9, 5, 0.1, 0.05, 0.76, 0.07],
    airdropWarning: [0.22, 0, 246, 0.006, 0.09, 0.19, 1, 1, 180, 0, 110, 0.05, 0.05, 0.02, 6, 0.04, 0.03, 0.72, 0.04],
    airdropDown: [0.3, 0, 82, 0.006, 0.14, 0.42, 4, 1.9, 115, -1, 0, 0, 0.04, 0.88, 4, 0.09, 0.06, 0.78, 0.08],
    supplyOpen: [0.24, 0, 470, 0.004, 0.09, 0.24, 1, 1, 290, 0, 180, 0.05, 0.04, 0.01, 8, 0.04, 0.04, 0.82, 0.05],
    meteorWarning: [0.24, 0, 132, 0.008, 0.12, 0.25, 5, 0.5, -28, 0, -54, 0.07, 0.12, 0.04, 2, 0.08, 0.05, 0.75, 0.055],
    meteorImpact: [0.34, 0, 48, 0.004, 0.18, 0.58, 4, 2.2, -10, 0, -22, 0.12, 0.08, 1, 0, 0.16, 0.08, 0.7, 0.11],
    meteorBreak: [0.25, 0, 98, 0.003, 0.09, 0.3, 4, 1.9, 220, -1, 0, 0, 0.04, 0.86, 5, 0.08, 0.05, 0.74, 0.06],
    gateOpen: [0.16, 0, 360, 0.004, 0.08, 0.17, 0, 1, 260, 0, 170, 0.05, 0.05, 0.02, 10, 0.04, 0.03, 0.66, 0.035],
    fullScreenLaser: [0.32, 0, 680, 0.01, 0.2, 0.42, 0, 1, -30, 0, 310, 0.08, 0.07, 0.04, 24, 0.06, 0.05, 0.82, 0.08, 0.28],
    nuclearLaunch: [0.32, 0, 96, 0.015, 0.24, 0.48, 2, 1, 520, -3, 240, 0.08, 0.06, 0.08, 5, 0.04, 0.06, 0.84, 0.1],
    nuclearBlast: [0.6, 0, 42, 0.004, 0.38, 1.15, 4, 2.4, -9, 0, -12, 0.2, 0.12, 1, 0, 0.18, 0.12, 0.72, 0.18, 0.16],
    mapEvent: [0.2, 0, 300, 0.004, 0.1, 0.22, 1, 1, 140, 0, 240, 0.06, 0.06, 0.02, 10, 0.04, 0.04, 0.72, 0.05],
    upgrade: [0.22, 0, 330, 0.004, 0.065, 0.15, 1, 1, 145, 0, 165, 0.04, 0.055, 0, 0, 0.035, 0.035, 0.78, 0.035],
    toolSwitch: [0.14, 0, 480, 0.002, 0.035, 0.09, 1, 1, 110, 0, 180, 0.035, 0.04, 0.02, 9, 0.035, 0.02, 0.7, 0.018],
    denied: [0.18, 0, 150, 0.004, 0.045, 0.16, 2, 1, -120, -1, -70, 0.04, 0.07, 0.08, 2, 0.08, 0.025, 0.64, 0.03],
    transform: [0.28, 0, 92, 0.012, 0.2, 0.42, 2, 1, 360, -1, 0, 0, 0.045, 0.07, 7, 0.05, 0.06, 0.82, 0.11],
    overdrive: [0.26, 0, 210, 0.004, 0.15, 0.3, 5, 0.35, 210, 0, 140, 0.05, 0.04, 0.04, 0, 0.07, 0.04, 0.78, 0.08],
    rush: [0.26, 0, 260, 0.004, 0.09, 0.22, 1, 1, 190, 0, 260, 0.05, 0.04, 0, 5, 0.04, 0.04, 0.8, 0.05],
    playerHit: [0.24, 0, 78, 0, 0.05, 0.22, 4, 2, -30, 0, 0, 0, 0, 0.9, 0, 0.18, 0, 0.52, 0.035],
    warning: [0.25, 0, 118, 0.008, 0.12, 0.22, 5, 0.45, 0, 0, -32, 0.07, 0.14, 0.02, 2, 0.08, 0.04, 0.72, 0.05, 0.24],
    bossPhase: [0.29, 0, 70, 0.008, 0.19, 0.42, 4, 1.8, 210, -1, 0, 0, 0.035, 0.74, 5, 0.08, 0.05, 0.7, 0.09],
    gameOver: [0.22, 0, 260, 0.01, 0.13, 0.35, 1, 1, -150, -1, -90, 0.11, 0.08, 0.02, 0, 0.06, 0.08, 0.74, 0.08],
    graze: [0.12, 0, 760, 0, 0.018, 0.08, 1, 1, 180, 0, 0, 0, 0, 0.015, 12, 0.04, 0.02, 0.6, 0.018],
    mark: [0.09, 0, 540, 0, 0.016, 0.065, 2, 1, 120, 0, 170, 0.025, 0, 0.02, 0, 0.05, 0, 0.62, 0.014],
    resonance: [0.18, 0, 265, 0.004, 0.08, 0.2, 1, 1, 110, 0, 220, 0.055, 0.04, 0.08, 9, 0.045, 0.03, 0.72, 0.04],
    revenge: [0.16, 0, 82, 0.002, 0.07, 0.18, 4, 1.8, 65, 0, 0, 0, 0, 0.62, 0, 0.1, 0.02, 0.64, 0.035],
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
      this.music = new Audio(BATTLE_MUSIC_URL);
      this.music.loop = true;
      this.music.preload = "auto";
      this.music.crossOrigin = "anonymous";
      this.music.addEventListener("error", () => {
        console.warn("Battle music failed to load; procedural effects remain available.");
      }, { once: true });
      this.applyMusicGain();
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
      this.applyMusicGain();
    }

    applyMusicGain() {
      if (!this.music) return;
      this.music.volume = this.muted ? 0 : Math.min(0.34, this.volume * 0.42);
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
      if (this.music) {
        this.music.pause();
        this.music.currentTime = 0;
      }
    }

    panFromX(x, width) {
      if (!Number.isFinite(x) || !width) return 0;
      return Math.max(-0.85, Math.min(0.85, x / width * 2 - 1));
    }

    fighterSelect(fighterId) {
      const order = ["j20", "hypersonic", "j35", "faxx", "f22", "typhoon", "rafale", "gripen", "su57"];
      const index = Math.max(0, order.indexOf(fighterId));
      this.play("select", { pitch: 0.9 + index * 0.055, throttle: 40, volume: 0.72, priority: true });
    }

    previewMode(mode, fighterId) {
      const order = ["j20", "hypersonic", "j35", "faxx", "f22", "typhoon", "rafale", "gripen", "su57"];
      const fighterPitch = 0.92 + Math.max(0, order.indexOf(fighterId)) * 0.035;
      const modePitch = { flight: 0.92, transform: 1, assault: 1.08, tactical: 1.18 }[mode] || 1;
      this.play(mode === "transform" ? "transform" : mode === "tactical" ? "overdrive" : "select", {
        pitch: fighterPitch * modePitch,
        throttle: 70,
        volume: mode === "tactical" ? 0.74 : 0.58,
        priority: true,
      });
    }

    launch(fighterId) {
      const heavy = fighterId === "su57" ? 0.84 : fighterId === "gripen" ? 1.12 : fighterId === "j35" ? 1.08 : fighterId === "faxx" ? 0.96 : 1;
      this.play("launch", { pitch: heavy, volume: 0.92, priority: true });
      if (this.music) {
        this.music.playbackRate = fighterId === "hypersonic" ? 1.08 : 1;
        this.applyMusicGain();
        this.music.play().catch(() => {
          // Browser autoplay policy can still reject playback after a delayed promise.
        });
      }
    }

    fire(fighterId, overdrive, x, width) {
      const map = {
        j20: "fireSeeker",
        j35: "fireSeeker",
        faxx: "fireRail",
        f22: "fireSeeker",
        typhoon: "fireRail",
        rafale: "fireWave",
        gripen: "fireRail",
        su57: "fireHeavy",
        hypersonic: "fireLaser",
      };
      this.play(overdrive ? "fireOverdrive" : map[fighterId] || "firePulse", {
        pan: this.panFromX(x, width),
        throttle: overdrive ? 68 : 82,
        volume: overdrive ? 0.58 : 0.66,
        variance: 0.045,
      });
    }

    laserCharge(fighterId, warmup = 0.25) {
      const pitch = fighterId === "su57" ? 0.76 : fighterId === "gripen" ? 1.24 : fighterId === "hypersonic" ? 1.34 : 1;
      this.play("laserCharge", {
        pitch: pitch * Math.max(0.86, Math.min(1.2, 0.34 / Math.max(0.12, warmup))),
        throttle: 120,
        volume: 0.54,
      });
    }

    laserBeam(fighterId, style = "pierce") {
      const pitch = style === "armor" ? 0.72 : style === "precision" ? 1.28 : style === "reflect" ? 1.12 : fighterId === "hypersonic" ? 1.32 : 1;
      this.play("laserSustain", { pitch, throttle: 90, volume: style === "armor" ? 0.72 : 0.6, priority: true });
    }

    laserOverheat() {
      this.play("laserOverheat", { throttle: 320, volume: 0.76, priority: true });
    }

    nuclearLaunch() {
      this.play("nuclearLaunch", { volume: 0.92, priority: true });
      this.sequence([
        { name: "warning", delay: 120, pitch: 0.74, volume: 0.66 },
        { name: "laserCharge", delay: 260, pitch: 0.62, volume: 0.7 },
      ]);
    }

    nuclearBlast() {
      this.play("nuclearBlast", { volume: 1, priority: true });
      this.sequence([
        { name: "meteorImpact", delay: 70, pitch: 0.62, volume: 0.9 },
        { name: "bossKill", delay: 180, pitch: 0.72, volume: 0.84 },
        { name: "fullScreenLaser", delay: 330, pitch: 0.58, volume: 0.72 },
      ]);
    }

    toolSwitch(pattern, fighterId) {
      const fighterPitch = {
        j20: 0.94,
        j35: 1.12,
        faxx: 1.02,
        f22: 1.16,
        typhoon: 1.04,
        rafale: 1.1,
        gripen: 1.24,
        su57: 0.82,
        hypersonic: 1.36,
      }[fighterId] || 1;
      const patternPitch = {
        pulse: 0.96,
        rail: 1.14,
        wave: 1.05,
        heavy: 0.78,
        seeker: 1.2,
        drone: 1.28,
        laser: 1.42,
      }[pattern] || 1;
      this.play("toolSwitch", { pitch: fighterPitch * patternPitch, throttle: 50, volume: 0.78, priority: true });
      this.sequence([
        { name: pattern === "laser" ? "fireLaser" : pattern === "heavy" ? "fireHeavy" : pattern === "wave" ? "fireWave" : pattern === "seeker" ? "fireSeeker" : "fireRail", delay: 82, pitch: patternPitch, volume: 0.5 },
      ]);
    }

    transformDenied() {
      this.play("denied", { volume: 0.74, priority: true });
      this.sequence([{ name: "warning", delay: 115, pitch: 1.18, volume: 0.46 }]);
    }

    brief(open = true) {
      this.play(open ? "select" : "back", {
        pitch: open ? 1.04 : 0.92,
        volume: open ? 0.5 : 0.44,
        throttle: 80,
        priority: true,
      });
    }

    enemySpawn(type, x, width) {
      if (type !== "helicopter") return;
      this.play("helicopter", {
        pan: this.panFromX(x, width),
        throttle: 480,
        volume: 0.34,
      });
    }

    enemyFire(type, x, width, boss = false) {
      const preset = boss ? "warning" : type === "fighter" ? "enemyJet" : type === "helicopter" ? "rocket" : "enemyFire";
      this.play(preset, {
        pan: this.panFromX(x, width),
        throttle: boss ? 170 : 130,
        volume: boss ? 0.42 : type === "helicopter" ? 0.38 : 0.28,
      });
    }

    enemyKilled(type, x, width) {
      const name = type === "boss" ? "bossKill" : type === "elite" ? "eliteKill" : "kill";
      this.play(name, {
        pan: this.panFromX(x, width),
        throttle: type === "boss" ? 0 : 34,
        pitch: type === "spinner" ? 1.18 : type === "fighter" ? 1.22 : type === "helicopter" ? 0.78 : type === "gunner" ? 0.9 : 1,
        volume: type === "boss" ? 1 : type === "elite" ? 0.86 : 0.6,
        priority: type === "boss",
      });
    }

    pickup(type) {
      const preset = type === "shield"
        ? "repair"
        : type === "barrier"
          ? "barrier"
          : type === "ally"
            ? "ally"
            : type === "evolution"
              ? "upgrade"
              : type === "trajectory" ? "toolSwitch" : type === "meteor-core" ? "meteorBreak" : "pickup";
      const pitch = type === "trajectory" ? 1.22 : type === "evolution" ? 1.08 : type === "ally" ? 1.16 : 1;
      this.play(preset, { pitch, volume: 0.82, priority: true });
      if (type === "ally") {
        this.sequence([
          { name: "ally", delay: 90, pitch: 1.32, volume: 0.66 },
          { name: "ally", delay: 180, pitch: 1.52, volume: 0.58 },
        ]);
      }
    }

    weaponUpgrade() {
      this.sequence([
        { name: "upgrade", delay: 0, pitch: 0.9, volume: 0.72 },
        { name: "upgrade", delay: 85, pitch: 1.12, volume: 0.78 },
        { name: "upgrade", delay: 170, pitch: 1.34, volume: 0.84 },
      ]);
    }

    barrierImpact(x, width) {
      this.play("barrierHit", {
        pan: this.panFromX(x, width),
        throttle: 55,
        volume: 0.54,
      });
    }

    allyFire(x, width) {
      this.play("allyFire", {
        pan: this.panFromX(x, width),
        throttle: 85,
        volume: 0.24,
      });
    }

    allyLost(x, width) {
      this.play("allyLost", {
        pan: this.panFromX(x, width),
        volume: 0.72,
        priority: true,
      });
    }

    maze(open = true) {
      this.sequence(open
        ? [
            { name: "mazeAlert", delay: 0, pitch: 0.9, volume: 0.7 },
            { name: "mazeAlert", delay: 150, pitch: 1.08, volume: 0.76 },
            { name: "mazeAlert", delay: 300, pitch: 1.28, volume: 0.84 },
          ]
        : [
            { name: "mazeAlert", delay: 0, pitch: 1.18, volume: 0.62 },
            { name: "select", delay: 120, pitch: 1.5, volume: 0.55 },
          ]);
    }

    mazeWall() {
      this.play("mazeWall", { throttle: 180, volume: 0.46 });
    }

    structureImpact() {
      this.play("structureImpact", { throttle: 180, volume: 0.5 });
    }

    structureBreak() {
      this.sequence([
        { name: "structureBreak", delay: 0, pitch: 0.88, volume: 0.76 },
        { name: "upgrade", delay: 95, pitch: 1.24, volume: 0.52 },
      ]);
    }

    airdropWarning() {
      this.sequence([
        { name: "airdropWarning", delay: 0, pitch: 0.92, volume: 0.66 },
        { name: "airdropWarning", delay: 180, pitch: 1.16, volume: 0.74 },
      ]);
    }

    airdropDestroyed() {
      this.play("airdropDown", { volume: 0.9, priority: true });
      this.sequence([{ name: "supplyOpen", delay: 170, pitch: 1.08, volume: 0.64 }]);
    }

    airdropLanded() {
      this.sequence([
        { name: "supplyOpen", delay: 0, pitch: 0.86, volume: 0.62 },
        { name: "upgrade", delay: 120, pitch: 1.08, volume: 0.52 },
      ]);
    }

    airdropDecision(upgraded = false) {
      this.play("supplyOpen", { pitch: upgraded ? 1.3 : 1.02, volume: 0.76, priority: true });
    }

    airdropEscortStart() {
      this.sequence([
        { name: "airdropWarning", delay: 0, pitch: 0.78, volume: 0.72 },
        { name: "launch", delay: 150, pitch: 1.08, volume: 0.68 },
      ]);
    }

    airdropEscortComplete() {
      this.sequence([
        { name: "upgrade", delay: 0, pitch: 1.18, volume: 0.86 },
        { name: "supplyOpen", delay: 120, pitch: 1.42, volume: 0.82 },
      ]);
    }

    airdropLost() {
      this.sequence([
        { name: "structureBreak", delay: 0, pitch: 0.72, volume: 0.82 },
        { name: "airdropWarning", delay: 150, pitch: 0.64, volume: 0.54 },
      ]);
    }

    supplyCollected(reward) {
      const pitch = { firepower: 1.22, transform: 0.94, defense: 0.82, wingman: 1.12, skyfire: 1.34 }[reward] || 1;
      this.play("supplyOpen", { pitch, volume: 0.88, priority: true });
      this.sequence([{ name: reward === "skyfire" ? "fullScreenLaser" : "upgrade", delay: 120, pitch, volume: 0.68 }]);
    }

    meteorWarning(large = false) {
      this.play("meteorWarning", { pitch: large ? 0.72 : 1.04, throttle: 160, volume: large ? 0.82 : 0.62, priority: large });
    }

    meteorImpact(large = false) {
      this.play("meteorImpact", { pitch: large ? 0.7 : 1.04, volume: large ? 0.96 : 0.74, priority: true });
    }

    meteorBreak(large = false) {
      this.play("meteorBreak", { pitch: large ? 0.84 : 1.18, volume: large ? 0.88 : 0.62, priority: large });
    }

    gateOpen() {
      this.play("gateOpen", { throttle: 320, volume: 0.42 });
    }

    fullScreenLaser(hypersonic = false) {
      this.play("fullScreenLaser", { pitch: hypersonic ? 1.28 : 0.96, volume: 0.96, priority: true });
      this.sequence([
        { name: "laserCharge", delay: 80, pitch: hypersonic ? 1.42 : 1.12, volume: 0.64 },
        { name: "laserSustain", delay: 310, pitch: hypersonic ? 1.34 : 1, volume: 0.82 },
      ]);
    }

    mapEvent(type) {
      const pitch = { lightning: 1.28, aurora: 1.12, phase: 0.94, meteor: 0.72, debris: 1.04 }[type] || 1;
      this.play("mapEvent", { pitch, volume: 0.7, priority: true });
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
        j20: 0.96,
        j35: 1.12,
        faxx: 1.02,
        f22: 1.18,
        typhoon: 1.05,
        rafale: 1.12,
        gripen: 1.28,
        su57: 0.74,
        hypersonic: 1.28,
      };
      this.play(assault ? "bossPhase" : "overdrive", {
        pitch: (pitchMap[fighterId] || 1) * (assault ? 0.92 : 1),
        volume: assault ? 0.96 : 0.84,
        priority: true,
      });
      this.sequence([
        { name: fighterId === "hypersonic" ? "fireLaser" : fighterId === "su57" ? "fireHeavy" : fighterId === "rafale" ? "fireWave" : "fireRail", delay: 80, pitch: pitchMap[fighterId] || 1, volume: 0.82 },
        { name: "upgrade", delay: 190, pitch: assault ? 1.28 : 1.12, volume: 0.7 },
      ]);
    }

    wingmanSummon(fighterId) {
      const pitch = fighterId === "hypersonic" ? 1.3 : fighterId === "su57" ? 0.82 : fighterId === "gripen" ? 1.22 : fighterId === "j35" ? 1.14 : 1;
      this.play("launch", { pitch, volume: 0.78, priority: true });
      this.sequence([
        { name: "select", delay: 90, pitch: pitch * 1.18, volume: 0.62 },
        { name: fighterId === "hypersonic" ? "fireLaser" : "fireRail", delay: 180, pitch: pitch * 1.08, volume: 0.54 },
      ]);
    }

    supplyDrop() {
      this.weaponUpgrade();
      this.sequence([
        { name: "repair", delay: 80, pitch: 1.14, volume: 0.68 },
        { name: "overdrive", delay: 210, pitch: 1.08, volume: 0.78 },
      ]);
    }

    missionAlert() {
      this.sequence([
        { name: "warning", delay: 0, pitch: 1.08, volume: 0.76 },
        { name: "select", delay: 180, pitch: 1.34, volume: 0.7 },
      ]);
    }

    missionStart(type) {
      const pitch = { coaster: 1.28, rings: 1.42, carrier: 0.88, mothership: 0.72, chain: 1.08 }[type] || 1;
      this.play(type === "mothership" ? "bossPhase" : "launch", { pitch, volume: 0.88, priority: true });
    }

    coasterCue(segment = 0) {
      const pitch = [1.06, 0.78, 1.18, 1.32, 1.48][Math.max(0, Math.min(4, segment))];
      this.play(segment === 1 ? "mazeAlert" : "launch", { pitch, volume: 0.72, priority: true });
    }

    coasterBoost(count = 1) {
      this.play("rush", { pitch: 1 + Math.min(6, count) * 0.08, throttle: 180, volume: 0.7 });
    }

    missionResult(success) {
      if (!success) {
        this.play("denied", { pitch: 0.82, volume: 0.72, priority: true });
        return;
      }
      this.sequence([
        { name: "upgrade", delay: 0, pitch: 1.18, volume: 0.86 },
        { name: "overdrive", delay: 150, pitch: 1.26, volume: 0.82 },
      ]);
    }

    ringPass(count = 1) {
      this.play("pickup", { pitch: 0.96 + Math.min(5, count) * 0.12, throttle: 45, volume: 0.72 });
    }

    carrierDock() {
      this.sequence([
        { name: "repair", delay: 0, pitch: 0.94, volume: 0.82 },
        { name: "launch", delay: 240, pitch: 1.22, volume: 0.88 },
      ]);
    }

    chainBlast(count = 1) {
      this.play("bossKill", { pitch: Math.max(0.72, 1.1 - count * 0.035), volume: Math.min(1, 0.68 + count * 0.035), priority: true });
    }

    passive(type) {
      const preset = { graze: "graze", mark: "mark", resonance: "resonance", revenge: "revenge" }[type];
      if (!preset) return;
      this.play(preset, {
        throttle: type === "mark" ? 120 : type === "graze" ? 90 : 40,
        volume: type === "revenge" ? 0.72 : 0.54,
      });
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
