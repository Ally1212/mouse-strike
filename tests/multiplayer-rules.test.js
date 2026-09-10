import { describe, expect, test } from "vitest";
import {
  DUEL_DEFAULTS,
  createRoomCode,
  duelHealth,
  isDuelFighterAllowed,
  normalizeMatchConfig,
  normalizeNickname,
  validInput,
} from "../multiplayer-rules.js";

describe("multiplayer room and duel rules", () => {
  test("creates readable five-character room codes", () => {
    expect(createRoomCode(() => 0)).toBe("AAAAA");
    expect(createRoomCode(() => 0.99999)).toHaveLength(5);
  });

  test("normalizes guest identity and untrusted controller input", () => {
    expect(normalizeNickname("  飞行员   一号 ")).toBe("飞行员 一号");
    expect(validInput({ x: 3, y: -1, action: "tactical" })).toEqual({ x: 1, y: 0, action: "tactical" });
    expect(validInput({ action: "anything" }).action).toBe("");
  });

  test("keeps workshop rules inside the approved fair ranges", () => {
    const config = normalizeMatchConfig({
      mapId: "unknown", roundsToWin: 9, roundSeconds: 45, healthPercent: 999,
      loadout: "unlimited", pickups: "everything", skillCooldown: 1, victory: "all",
    });
    expect(config).toEqual(DUEL_DEFAULTS);
    expect(duelHealth({ healthPercent: 125 })).toBe(188);
  });

  test("blocks the hero and generated fighter from fair 1v1", () => {
    expect(isDuelFighterAllowed("f22")).toBe(true);
    expect(isDuelFighterAllowed("hypersonic")).toBe(false);
    expect(isDuelFighterAllowed("ai-custom")).toBe(false);
  });
});
