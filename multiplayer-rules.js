export const ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_PLAYERS = 2;
export const SERVER_TICK_RATE = 30;
export const SNAPSHOT_RATE = 15;

export const DUEL_DEFAULTS = Object.freeze({
  mapId: "usa",
  roundsToWin: 3,
  roundSeconds: 90,
  healthPercent: 100,
  loadout: "standard",
  pickups: "basic",
  transform: true,
  skillCooldown: 10,
  victory: "elimination",
});

export const DUEL_OPTIONS = Object.freeze({
  maps: ["usa", "pacific", "arctic", "sky-corridor", "meteor-rift"],
  roundsToWin: [1, 3, 5],
  roundSeconds: [60, 90, 120],
  healthPercent: [75, 100, 125],
  loadouts: ["standard", "laser", "rail", "swarm", "heavy"],
  pickups: ["off", "basic", "chaos"],
  skillCooldown: [6, 10, 14],
  victories: ["elimination", "score"],
});

const cleanText = (value, fallback, length) => {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, length);
};

const oneOf = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;

export function normalizeNickname(value) {
  return cleanText(value, "飞行员", 16);
}

export function createRoomCode(random = Math.random) {
  let code = "";
  for (let index = 0; index < 5; index += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

export function normalizeMatchConfig(value = {}) {
  return {
    mapId: oneOf(value.mapId, DUEL_OPTIONS.maps, DUEL_DEFAULTS.mapId),
    roundsToWin: oneOf(Number(value.roundsToWin), DUEL_OPTIONS.roundsToWin, DUEL_DEFAULTS.roundsToWin),
    roundSeconds: oneOf(Number(value.roundSeconds), DUEL_OPTIONS.roundSeconds, DUEL_DEFAULTS.roundSeconds),
    healthPercent: oneOf(Number(value.healthPercent), DUEL_OPTIONS.healthPercent, DUEL_DEFAULTS.healthPercent),
    loadout: oneOf(value.loadout, DUEL_OPTIONS.loadouts, DUEL_DEFAULTS.loadout),
    pickups: oneOf(value.pickups, DUEL_OPTIONS.pickups, DUEL_DEFAULTS.pickups),
    transform: typeof value.transform === "boolean" ? value.transform : DUEL_DEFAULTS.transform,
    skillCooldown: oneOf(Number(value.skillCooldown), DUEL_OPTIONS.skillCooldown, DUEL_DEFAULTS.skillCooldown),
    victory: oneOf(value.victory, DUEL_OPTIONS.victories, DUEL_DEFAULTS.victory),
  };
}

export function duelHealth(config) {
  return Math.round(150 * normalizeMatchConfig(config).healthPercent / 100);
}

export function isDuelFighterAllowed(fighterId) {
  return fighterId !== "hypersonic" && fighterId !== "ai-custom";
}

export function validInput(value = {}) {
  const x = Number(value.x);
  const y = Number(value.y);
  return {
    x: Number.isFinite(x) ? Math.max(0, Math.min(1, x)) : 0.5,
    y: Number.isFinite(y) ? Math.max(0, Math.min(1, y)) : 0.75,
    action: ["tool", "transform", "wingman", "tactical", "revive"].includes(value.action) ? value.action : "",
  };
}
