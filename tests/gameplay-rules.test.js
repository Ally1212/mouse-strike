import { describe, expect, test } from "vitest";
import {
  canEnterAssault,
  formationPattern,
  nextTransformProgress,
  tacticalSpec,
  updateTransformEnergy,
} from "../gameplay-rules.js";

describe("transform rules", () => {
  test("requires a meaningful energy reserve", () => {
    expect(canEnterAssault(27.9)).toBe(false);
    expect(canEnterAssault(28)).toBe(true);
  });

  test("enters more slowly than it returns", () => {
    expect(nextTransformProgress(0, 1, 0.9)).toBeCloseTo(0.6207, 3);
    expect(nextTransformProgress(1, 0, 0.9)).toBe(0);
  });

  test("drains in assault and regenerates in flight", () => {
    expect(updateTransformEnergy(70, 1, 1, 1)).toBeCloseTo(61.5);
    expect(updateTransformEnergy(70, 0, 0, 1)).toBeCloseTo(72.4);
  });
});
describe("combat configuration", () => {
  test("all fighter tactical skills resolve", () => {
    expect(tacticalSpec("su57").projectile).toBe("heavy");
    expect(tacticalSpec("j20").count).toBeGreaterThan(10);
    expect(tacticalSpec("unknown").name).toBe("幽灵猎杀");
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
