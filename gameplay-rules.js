import { getFighterProfile } from "./fighter-profiles.js";

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
export function nextTransformProgress(progress, target, dt, duration = 1.45, restoreDuration = 0.9) {
  const current = clamp01(progress);
  const desired = target >= 0.5 ? 1 : 0;
  const transitionTime = desired === 1 ? duration : restoreDuration;
  const delta = Math.max(0, Number(dt) || 0) / Math.max(0.2, transitionTime);
  return desired === 1
    ? Math.min(1, current + delta)
    : Math.max(0, current - delta);
}

export function updateTransformEnergy(energy, progress, target, dt, options = {}) {
  const value = Math.max(0, Math.min(100, Number(energy) || 0));
  const seconds = Math.max(0, Number(dt) || 0);
  const drain = Math.max(1, options.drain || 8.5) * Math.max(0.4, options.drainMultiplier || 1);
  const regen = Math.max(0.5, options.regen || 2.4) * Math.max(0.5, options.gainMultiplier || 1);
  if (target >= 0.5 || progress > 0.82) return Math.max(0, value - seconds * drain);
  return Math.min(100, value + seconds * regen);
}

export function canEnterAssault(energy, threshold = 28) {
  return Number(energy) >= threshold;
}

export function tacticalSpec(fighterId) {
  return getFighterProfile(fighterId).tactical;
}

export function formationPattern(index, width) {
  const safeWidth = Math.max(320, Number(width) || 320);
  const center = safeWidth / 2;
  const patterns = [
    {
      name: "VANGUARD WEDGE",
      units: [-2, -1, 0, 1, 2].map((slot) => ({
        type: slot === 0 ? "gunner" : "scout",
        x: center + slot * 54,
        y: -60 - Math.abs(slot) * 34,
        drift: slot * 8,
      })),
    },
    {
      name: "PINCER ATTACK",
      units: [0, 1, 2, 3, 4, 5].map((slot) => ({
        type: slot === 2 || slot === 3 ? "spinner" : "scout",
        x: slot < 3 ? 42 + slot * 38 : safeWidth - 42 - (5 - slot) * 38,
        y: -50 - (slot % 3) * 45,
        drift: slot < 3 ? 48 : -48,
      })),
    },
    {
      name: "ARMORED COLUMN",
      units: [0, 1, 2, 3, 4].map((slot) => ({
        type: slot === 2 ? "elite" : slot % 2 ? "gunner" : "scout",
        x: center + (slot - 2) * 58,
        y: -54 - (slot % 2) * 42,
        drift: (slot - 2) * 5,
      })),
    },
  ];
  return patterns[Math.abs(Math.trunc(index || 0)) % patterns.length];
}
