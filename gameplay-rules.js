export const MODULES = {
  power: {
    id: "power",
    name: "超导火控",
    detail: "所有武器伤害 +22%，强袭形态额外增加贯穿火力。",
  },
  velocity: {
    id: "velocity",
    name: "矢量超频",
    detail: "射击间隔 -14%，击破获得更多变形能量。",
  },
  bulwark: {
    id: "bulwark",
    name: "反应装甲",
    detail: "护盾上限 +1，并立即恢复一格护盾。",
  },
};

export const TACTICALS = {
  f22: { name: "幽灵猎杀", cooldown: 5.2, projectile: "seeker", count: 12 },
  typhoon: { name: "风暴长矛", cooldown: 5.6, projectile: "rail", count: 9 },
  rafale: { name: "双相回旋", cooldown: 5.4, projectile: "wave", count: 12 },
  gripen: { name: "北境超频", cooldown: 4.7, projectile: "rail", count: 11 },
  su57: { name: "新星破城", cooldown: 6.2, projectile: "heavy", count: 7 },
  j20: { name: "威龙蜂群", cooldown: 5.8, projectile: "seeker", count: 14 },
};

export function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}
export function nextTransformProgress(progress, target, dt) {
  const current = clamp01(progress);
  const desired = target >= 0.5 ? 1 : 0;
  const duration = desired === 1 ? 1.45 : 0.9;
  const delta = Math.max(0, Number(dt) || 0) / duration;
  return desired === 1
    ? Math.min(1, current + delta)
    : Math.max(0, current - delta);
}

export function updateTransformEnergy(energy, progress, target, dt, gainMultiplier = 1) {
  const value = Math.max(0, Math.min(100, Number(energy) || 0));
  const seconds = Math.max(0, Number(dt) || 0);
  if (target >= 0.5 || progress > 0.82) return Math.max(0, value - seconds * 8.5);
  return Math.min(100, value + seconds * 2.4 * Math.max(0.5, gainMultiplier));
}

export function canEnterAssault(energy) {
  return Number(energy) >= 28;
}

export function tacticalSpec(fighterId) {
  return TACTICALS[fighterId] || TACTICALS.f22;
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
