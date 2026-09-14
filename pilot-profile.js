export const PROFILE_KEY = "mouse-strike-pilot-profile-v1";
const STAT_KEYS = ["matches", "wins", "rescues", "syncStrikes", "pickups"];
const dateKey = (date = new Date()) => date.toISOString().slice(0, 10);

const MISSION_POOL = Object.freeze([
  { id: "play", label: "完成 1 局好友联机", target: 1, stat: "matches" },
  { id: "win", label: "赢得 1 局 1v1", target: 1, stat: "wins" },
  { id: "rescue", label: "合作救援队友 1 次", target: 1, stat: "rescues" },
  { id: "link", label: "触发同步合击 1 次", target: 1, stat: "syncStrikes" },
  { id: "pickup", label: "争夺 3 个战术补给", target: 3, stat: "pickups" },
]);

export function createPilotProfile(nickname = "飞行员") {
  return { version: 1, nickname, favoriteFighter: "j20", matches: 0, wins: 0, rescues: 0, syncStrikes: 0, pickups: 0, medals: [], daily: { date: dateKey(), matches: 0, wins: 0, rescues: 0, syncStrikes: 0, pickups: 0 } };
}

export function normalizePilotProfile(value) {
  const base = createPilotProfile();
  if (!value || typeof value !== "object") return base;
  const profile = { ...base, ...value, version: 1 };
  STAT_KEYS.forEach((key) => { profile[key] = Math.max(0, Number(profile[key]) || 0); });
  if (!profile.daily || profile.daily.date !== dateKey()) profile.daily = createPilotProfile().daily;
  STAT_KEYS.forEach((key) => { profile.daily[key] = Math.max(0, Number(profile.daily[key]) || 0); });
  profile.nickname = String(profile.nickname || base.nickname).slice(0, 16);
  profile.medals = [...new Set(Array.isArray(profile.medals) ? profile.medals.map(String) : [])];
  return profile;
}

export function dailyMissions(date = new Date()) {
  const day = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return [0, 1, 2].map((offset) => MISSION_POOL[(day + offset * 2) % MISSION_POOL.length]);
}

export function applyMatchResult(profileValue, result = {}) {
  const profile = normalizePilotProfile(profileValue);
  profile.matches += 1;
  profile.daily.matches += 1;
  if (result.won) profile.wins += 1;
  if (result.won) profile.daily.wins += 1;
  ["rescues", "syncStrikes", "pickups"].forEach((key) => { const value = Math.max(0, Number(result[key]) || 0); profile[key] += value; profile.daily[key] += value; });
  const earned = [];
  if (result.rescues > 0) earned.push("救援王牌");
  if (result.syncStrikes > 0) earned.push("合击核心");
  if (result.pickups >= 3) earned.push("资源猎手");
  if (result.won) earned.push("制空先锋");
  profile.medals = [...new Set([...profile.medals, ...earned])];
  return { profile, earned };
}
