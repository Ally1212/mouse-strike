export const CUSTOM_FIGHTER_ID = "ai-custom";

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function hashText(text) {
  let hash = 2166136261;
  for (const character of text) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function cleanText(value, fallback, limit) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, limit) : fallback;
}

const BLUEPRINTS = [
  {
    id: "laser",
    keys: ["激光", "光束", "镭射", "laser", "狙击"],
    role: "精确歼击 / 光束压制",
    profile: "lancer",
    accent: "#49d9ff",
    secondary: "#ecfbff",
    ambient: "#245d89",
    tactical: { name: "棱镜天罚", projectile: "laser", count: 7, cooldown: 5.4 },
    modes: [
      { name: "棱镜切割光", pattern: "laser", count: 1, damage: 7.1, rate: 0.8, warmup: 0.2, duration: 0.68, heat: 31, coolRate: 34, overheatCooldown: 1.1, width: 5.4, cycle: 1.1, laserStyle: "precision" },
      { name: "聚焦脉冲", pattern: "pulse", count: 4, spread: 0.07, speed: 980, damage: 1.22, rate: 0.72 },
      { name: "天穹轨束", pattern: "rail", count: 2, spread: 0.035, speed: 1320, damage: 2.05, rate: 1.04 },
    ],
    passiveName: "折光瞄准",
    passive: "光束与轨束穿透强化，命中精英目标时获得额外伤害。",
    passiveConfig: { power: 0.24, pierce: 1, damageMultiplier: 1.08 },
    wingman: { name: "折光僚机队", count: 2, duration: 10.8, cooldown: 18, formation: "lance", projectile: "laser", rate: 0.22, speed: 1300, damage: 1.45 },
  },
  {
    id: "siege",
    keys: ["重", "炮", "装甲", "坦克", "爆炸", "heavy"],
    role: "重装突击 / 范围轰击",
    profile: "siege",
    accent: "#ff9d48",
    secondary: "#ffe4aa",
    ambient: "#864826",
    tactical: { name: "陨星轰击", projectile: "heavy", count: 5, cooldown: 6.2 },
    modes: [
      { name: "陨铁重炮", pattern: "heavy", count: 2, spread: 0.09, speed: 620, damage: 3.15, rate: 1.08 },
      { name: "破甲轨炮", pattern: "rail", count: 2, spread: 0.04, speed: 1120, damage: 2.15, rate: 1.04 },
      { name: "熔核脉冲", pattern: "laser", count: 1, damage: 6.4, rate: 0.92, warmup: 0.24, duration: 0.62, heat: 35, coolRate: 28, overheatCooldown: 1.3, width: 5.8, cycle: 1.24, laserStyle: "pierce" },
    ],
    passiveName: "熔核装甲",
    passive: "强化机体耐久与爆炸范围，强袭状态获得更高护盾窗口。",
    passiveConfig: { power: 0.24, guard: 0.22, heavyRange: 1.22 },
    wingman: { name: "熔核炮艇队", count: 2, duration: 12.6, cooldown: 21, formation: "bulwark", projectile: "heavy", rate: 0.46, speed: 610, damage: 2.05 },
  },
  {
    id: "swarm",
    keys: ["无人", "蜂群", "导弹", "追踪", "swarm", "drone"],
    role: "蜂群制空 / 自动追猎",
    profile: "commander",
    accent: "#8d78ff",
    secondary: "#ded8ff",
    ambient: "#4b397b",
    tactical: { name: "蜂群围猎", projectile: "drone", count: 13, cooldown: 5.1 },
    modes: [
      { name: "蜂群追踪弹", pattern: "seeker", count: 3, spread: 0.09, speed: 820, damage: 1.35, rate: 0.82 },
      { name: "协同无人翼", pattern: "drone", count: 4, spread: 0.11, speed: 790, damage: 1.22, rate: 0.78 },
      { name: "指挥脉冲", pattern: "laser", count: 2, spread: 0.04, damage: 5.4, rate: 0.86, warmup: 0.18, duration: 0.5, heat: 25, coolRate: 37, overheatCooldown: 0.9, width: 4.4, cycle: 0.96, laserStyle: "twin" },
    ],
    passiveName: "自律火控",
    passive: "增加无人机与战术弹幕数量，追踪武器优先锁定精英目标。",
    passiveConfig: { power: 0.22, drones: 1, tacticalProjectiles: 2 },
    wingman: { name: "自律蜂群队", count: 3, duration: 12.4, cooldown: 19, formation: "crown", projectile: "seeker", rate: 0.26, speed: 820, damage: 1.26 },
  },
  {
    id: "skirmisher",
    keys: ["速度", "机动", "闪电", "风", "wave", "灵活"],
    role: "高速游击 / 共振弹幕",
    profile: "skirmisher",
    accent: "#51e0ac",
    secondary: "#d6fff0",
    ambient: "#246d57",
    tactical: { name: "风暴回响", projectile: "wave", count: 9, cooldown: 4.8 },
    modes: [
      { name: "疾风波刃", pattern: "wave", count: 4, spread: 0.1, speed: 810, damage: 1.28, rate: 0.74 },
      { name: "闪击脉冲", pattern: "pulse", count: 5, spread: 0.1, speed: 1010, damage: 1.05, rate: 0.68 },
      { name: "回声激光", pattern: "laser", count: 2, spread: 0.065, damage: 5.1, rate: 0.76, warmup: 0.16, duration: 0.48, heat: 24, coolRate: 40, overheatCooldown: 0.84, width: 4.1, cycle: 0.9, laserStyle: "twin" },
    ],
    passiveName: "矢量超频",
    passive: "提高射速并强化波形弹道范围，擦弹时更快进入超频。",
    passiveConfig: { power: 0.25, fireRate: 1.1, waveRange: 1.18 },
    wingman: { name: "风切僚机队", count: 3, duration: 9.6, cooldown: 16, formation: "arrow", projectile: "wave", rate: 0.24, speed: 820, damage: 1.16 },
  },
];

function chooseBlueprint(brief, hash, archetype = "") {
  const requested = String(archetype).toLowerCase();
  const matchingArchetype = BLUEPRINTS.find((blueprint) => blueprint.id === requested);
  if (matchingArchetype) return matchingArchetype;
  const lower = brief.toLowerCase();
  return BLUEPRINTS.find((blueprint) => blueprint.keys.some((key) => lower.includes(key))) || BLUEPRINTS[hash % BLUEPRINTS.length];
}

function aiText(value, fallback, limit) {
  return cleanText(value, fallback, limit);
}

export function generateCustomFighter({ name, brief, design = {} } = {}) {
  const designation = cleanText(name, "AI 原型机", 24);
  const concept = cleanText(brief, "高机动多用途战机", 140);
  const hash = hashText(`${designation}|${concept}`);
  const blueprint = chooseBlueprint(concept, hash, design.archetype);
  const mobility = 76 + (hash % 19);
  const firepower = 78 + ((hash >>> 5) % 18);
  const armor = 70 + ((hash >>> 10) % 21);
  const transform = 80 + ((hash >>> 15) % 16);
  const tactical = 82 + ((hash >>> 20) % 15);
  const shapeScale = 0.9 + ((hash >>> 25) % 12) / 100;
  const toolModes = blueprint.modes.map((mode, index) => ({
    ...mode,
    id: `ai-${blueprint.profile}-${index + 1}`,
    name: aiText(design.modeNames?.[index], mode.name, 24),
    damage: Number((mode.damage * (0.96 + ((hash >>> (index * 3)) % 9) / 100)).toFixed(2)),
  }));

  return {
    id: CUSTOM_FIGHTER_ID,
    index: "AI",
    country: "AI 工坊",
    name: designation,
    shortName: designation,
    displayName: designation,
    callsign: aiText(design.callsign, "生成作战单元", 20),
    role: aiText(design.role, blueprint.role, 32),
    passiveName: aiText(design.passiveName, blueprint.passiveName, 20),
    passive: aiText(design.passive, blueprint.passive, 86),
    passiveConfig: blueprint.passiveConfig,
    strength: `AI 根据“${concept}”生成的战术模块，已完成战斗平衡校验。`,
    tradeoff: "技能参数受战斗平衡限制；重新生成会替换当前原型机。",
    special: aiText(design.special, `${blueprint.tactical.name}：清除近身敌弹，并以生成的专属弹道压制目标区域。`, 110),
    transformation: {
      name: "AI ASSAULT FRAME",
      label: aiText(design.transformName, `${designation} 强袭形态`, 28),
      summary: aiText(design.transformSummary, `AI 将机体重组为${blueprint.role}配置，持续 10 秒并获得额外弹量与射速。`, 110),
    },
    accent: blueprint.accent,
    secondary: blueprint.secondary,
    ambient: blueprint.ambient,
    reference: { src: "fighters/faxx.webp", alt: `${designation} 的程序化战机预览`, credit: "AI 作战设计器生成", url: "" },
    stats: { mobility, firepower, armor, transform, tactical },
    agility: Math.round(mobility / 20),
    firepower: Math.round(firepower / 20),
    armor: Math.round(armor / 20),
    fireRate: Number((0.78 + mobility / 1000).toFixed(2)),
    damage: Number((1.02 + firepower / 1000).toFixed(2)),
    followBase: 0.00035,
    health: 128 + Math.round(armor * 0.58),
    pickupRadius: 118 + Math.round(mobility * 0.3),
    transformDuration: 1.05,
    restoreDuration: 0.72,
    tactical: { ...blueprint.tactical, name: aiText(design.tacticalName, blueprint.tactical.name, 24) },
    toolModes,
    wingman: { ...blueprint.wingman, name: aiText(design.wingmanName, blueprint.wingman.name, 24) },
    shape: { canard: 8, twinTail: true, nose: Math.round(33 * shapeScale), body: Math.round(29 * shapeScale), wing: Math.round(34 * shapeScale), wingY: 0, rearWingY: 17, tail: Math.round(15 * shapeScale), tailless: false },
    rig: { profile: blueprint.profile, assaultForm: `ai-${blueprint.profile}`, engineCount: 2, wingSweep: 0.5, wingTaper: 0.62, tailCant: 0.4, bodyTaper: 0.4, body: [18, 62, 9], wing: [43, 20, 4], engines: 9, shoulders: [18, 12, 8], arms: 25, cameraScale: 0.94, phases: { armor: [0.04, 0.22], chest: [0.15, 0.42], wings: [0.16, 0.6], legs: [0.34, 0.7], arms: [0.46, 0.84], lock: [0.74, 1] } },
  };
}

export function isCustomFighter(profile) {
  return Boolean(profile && profile.id === CUSTOM_FIGHTER_ID && Array.isArray(profile.toolModes) && profile.toolModes.length >= 3);
}
