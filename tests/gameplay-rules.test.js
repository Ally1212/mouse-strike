import { describe, expect, test } from "vitest";
import {
  canEnterAssault,
  assaultDrainRate,
  assaultSecondsRemaining,
  formationPattern,
  nextTransformProgress,
  tacticalSpec,
  toolModeSpec,
  updateTransformEnergy,
} from "../gameplay-rules.js";
import {
  FIGHTER_ORDER,
  FIGHTERS,
  getModuleById,
  getModuleChoices,
  getToolModes,
} from "../fighter-profiles.js";

describe("transform rules", () => {
  test("requires a meaningful energy reserve", () => {
    expect(canEnterAssault(27.9)).toBe(false);
    expect(canEnterAssault(28)).toBe(true);
  });

  test("enters more slowly than it returns", () => {
    expect(nextTransformProgress(0, 1, 0.55, 1.1, 0.72)).toBeCloseTo(0.5, 3);
    expect(nextTransformProgress(1, 0, 0.72, 1.1, 0.72)).toBe(0);
  });

  test("drains in assault and regenerates in flight", () => {
    expect(updateTransformEnergy(70, 1, 1, 1, { drain: 7.4, drainMultiplier: 0.8 })).toBeCloseTo(64.08);
    expect(updateTransformEnergy(70, 0, 0, 1, { regen: 2.7, gainMultiplier: 1.5 })).toBeCloseTo(74.05);
  });

  test("each fighter uses its own assault threshold", () => {
    expect(canEnterAssault(23, FIGHTERS.f22.transformThreshold)).toBe(false);
    expect(canEnterAssault(24, FIGHTERS.f22.transformThreshold)).toBe(true);
    expect(canEnterAssault(31, FIGHTERS.su57.transformThreshold)).toBe(false);
  });

  test("assault duration controls energy drain and remaining time", () => {
    expect(assaultDrainRate(10)).toBe(10);
    expect(assaultSecondsRemaining(50, 10)).toBe(5);
    expect(assaultSecondsRemaining(50, 10, 0.5)).toBe(10);
  });
});
describe("combat configuration", () => {
  test("all fighter tactical skills resolve", () => {
    expect(tacticalSpec("su57").projectile).toBe("heavy");
    expect(tacticalSpec("j20").count).toBeGreaterThan(10);
    expect(tacticalSpec("unknown").name).toBe("幽灵猎杀");
  });

  test("eight fighters have distinct roles, rigs, assault forms, timings and stat lines", () => {
    const fighters = FIGHTER_ORDER.map((id) => FIGHTERS[id]);
    expect(fighters).toHaveLength(8);
    expect(new Set(fighters.map((fighter) => fighter.role)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => fighter.rig.profile)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => fighter.rig.assaultForm)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => fighter.transformDuration)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => fighter.assaultDuration)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => JSON.stringify(fighter.stats))).size).toBe(fighters.length);
  });

  test("every fighter owns three distinct switchable tool forms", () => {
    FIGHTER_ORDER.forEach((fighterId) => {
      const tools = getToolModes(fighterId);
      expect(tools).toHaveLength(3);
      expect(new Set(tools.map((tool) => tool.id)).size).toBe(3);
      expect(toolModeSpec(fighterId, 4)).toEqual(tools[1]);
    });
  });

  test("every fighter owns exactly three resolvable modules", () => {
    FIGHTER_ORDER.forEach((fighterId) => {
      const modules = getModuleChoices(fighterId);
      expect(modules).toHaveLength(3);
      expect(new Set(modules.map((module) => module.id)).size).toBe(3);
      modules.forEach((module) => expect(getModuleById(fighterId, module.id)).toEqual(module));
    });
  });

  test("formations stay inside the battlefield", () => {
    for (let index = 0; index < 6; index += 1) {
      const formation = formationPattern(index, 375);
      expect(formation.units.length).toBeGreaterThanOrEqual(5);
      formation.units.forEach((unit) => {
        expect(unit.x).toBeGreaterThan(0);
        expect(unit.x).toBeLessThan(375);
      });
    }
  });
});
