import { describe, expect, test } from "vitest";
import { applyMatchResult, createPilotProfile, dailyMissions, normalizePilotProfile } from "../pilot-profile.js";

describe("local pilot profile", () => {
  test("normalizes damaged local data", () => {
    expect(normalizePilotProfile({ nickname: "abcdefghijklmnopq", wins: -3, medals: ["A", "A"] })).toMatchObject({ nickname: "abcdefghijklmnop", wins: 0, medals: ["A"] });
  });

  test("rotates three deterministic missions each day", () => {
    const date = new Date("2026-09-14T00:00:00Z");
    expect(dailyMissions(date)).toHaveLength(3);
    expect(dailyMissions(date)).toEqual(dailyMissions(date));
  });

  test("records a match and awards display-only medals", () => {
    const { profile, earned } = applyMatchResult(createPilotProfile("王牌"), { won: true, rescues: 1, syncStrikes: 1, pickups: 3 });
    expect(profile).toMatchObject({ matches: 1, wins: 1, rescues: 1, syncStrikes: 1, pickups: 3 });
    expect(profile.daily).toMatchObject({ matches: 1, wins: 1, rescues: 1, syncStrikes: 1, pickups: 3 });
    expect(earned).toEqual(["救援王牌", "合击核心", "资源猎手", "制空先锋"]);
  });
});
