import { describe, expect, test } from "vitest";
import {
  AIRDROP_ESCORT_DURATION,
  airdropRewardSpec,
  assaultFireSpec,
  canEnterCoreTransform,
  combatPhase,
  formationPattern,
  laserModeSpec,
  nextTransformProgress,
  playerFireSpec,
  projectileBudget,
  tacticalSpec,
  toolModeSpec,
  TRANSFORM_CORE_COST,
  TRANSFORM_DURATION,
  transformSecondsRemaining,
} from "../gameplay-rules.js";
import {
  FIGHTER_ORDER,
  FIGHTERS,
  getToolModes,
  getFighterProfile,
  setCustomFighter,
} from "../fighter-profiles.js";
import { CUSTOM_FIGHTER_ID, generateCustomFighter } from "../custom-fighter.js";
import {
  circleIntersectsStructure,
  createMapStructures,
  getBattleMap,
  MAP_ORDER,
  pointInsideHazard,
  pointInsideStructure,
  resolveCircleFromStructure,
} from "../battle-maps.js";
describe("transform rules", () => {
  test("requires and consumes three cores", () => {
    expect(TRANSFORM_CORE_COST).toBe(3);
    expect(canEnterCoreTransform(2)).toBe(false);
    expect(canEnterCoreTransform(3)).toBe(true);
  });

  test("enters more slowly than it returns", () => {
    expect(nextTransformProgress(0, 1, 0.55, 1.1, 0.72)).toBeCloseTo(0.5, 3);
    expect(nextTransformProgress(1, 0, 0.72, 1.1, 0.72)).toBe(0);
  });

  test("all core transformations last ten seconds", () => {
    expect(TRANSFORM_DURATION).toBe(10);
    expect(transformSecondsRemaining(100)).toBe(10);
    expect(transformSecondsRemaining(50)).toBe(5);
  });

  test("core transformation increases fire rate and projectile volume", () => {
    expect(assaultFireSpec(0.72, "f22")).toMatchObject({ active: false, rateMultiplier: 1, projectileBonus: 0 });
    expect(assaultFireSpec(0.73, "f22")).toMatchObject({ active: true, rateMultiplier: 0.62, projectileBonus: 2, laserBeamBonus: 1 });
    expect(assaultFireSpec(1, "hypersonic")).toMatchObject({ active: true, rateMultiplier: 0.5, projectileBonus: 3, laserBeamBonus: 2 });
  });

  test("level three starts with dense fire and combo adds a controlled barrage", () => {
    expect(playerFireSpec(0, 3, 1, false, "f22")).toMatchObject({
      projectileBonus: 2,
      phaseLimit: 6,
      rateMultiplier: 1,
      signatureEnabled: false,
      signatureCadence: 3,
    });
    expect(playerFireSpec(3, 3, 8, false, "f22")).toMatchObject({
      projectileBonus: 3,
      rateMultiplier: 0.84,
      signatureEnabled: true,
    });
    expect(playerFireSpec(40, 5, 16, true, "hypersonic")).toMatchObject({
      projectileBonus: 10,
      phaseLimit: 14,
      rateMultiplier: 0.72,
      signatureCadence: 2,
    });
  });
});

describe("tactical airdrop rules", () => {
  test("offers a clear survival or firepower tradeoff", () => {
    expect(airdropRewardSpec("defense")).toMatchObject({ healthRatio: 0.35, shieldCharges: 1, trajectoryLevels: 0 });
    expect(airdropRewardSpec("firepower")).toMatchObject({ healthRatio: 0, firepowerDuration: 20, trajectoryLevels: 1, wingmen: false });
  });

  test("six seconds of escort upgrades either reward", () => {
    expect(AIRDROP_ESCORT_DURATION).toBe(6);
    expect(airdropRewardSpec("defense", true)).toMatchObject({ healthRatio: 0.55, shieldCharges: 2 });
    expect(airdropRewardSpec("firepower", true)).toMatchObject({ firepowerDuration: 20, trajectoryLevels: 1, wingmen: true });
  });
});
describe("combat configuration", () => {
  test("AI custom fighter generates balanced combat skills from player intent", () => {
    const fighter = generateCustomFighter({
      name: "苍穹游隼",
      brief: "高速蜂群导弹战机，擅长追踪精英目标",
    });
    setCustomFighter(fighter);

    expect(fighter).toMatchObject({ id: CUSTOM_FIGHTER_ID, displayName: "苍穹游隼" });
    expect(fighter.toolModes).toEqual([fighter.primary]);
    expect(fighter.primary).toMatchObject({ pattern: "seeker" });
    expect(fighter.tactical).toMatchObject({ projectile: "drone", count: 13, cooldown: 8 });
    expect(["light", "heavy", "wing"]).toContain(fighter.archetype);
    expect(fighter.health).toBeGreaterThanOrEqual(128);
    expect(fighter.health).toBeLessThanOrEqual(184);
    expect(getFighterProfile(CUSTOM_FIGHTER_ID)).toBe(fighter);
    expect(toolModeSpec(CUSTOM_FIGHTER_ID, 4)).toBe(fighter.primary);
    expect(tacticalSpec(CUSTOM_FIGHTER_ID)).toEqual(fighter.tactical);
  });

  test("all fighter tactical skills resolve", () => {
    expect(tacticalSpec("su57").projectile).toBe("heavy");
    expect(tacticalSpec("j20").count).toBeGreaterThan(10);
    expect(tacticalSpec("hypersonic")).toMatchObject({ name: "天穹核裁决", projectile: "nuclear" });
    expect(tacticalSpec("unknown").name).toBe("幽灵猎杀");
  });

  test("nine fighters have distinct roles, rigs, assault forms and stat lines", () => {
    const fighters = FIGHTER_ORDER.map((id) => FIGHTERS[id]);
    expect(fighters).toHaveLength(9);
    expect(new Set(fighters.map((fighter) => fighter.role)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => fighter.rig.profile)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => fighter.rig.assaultForm)).size).toBe(fighters.length);
    expect(new Set(fighters.map((fighter) => JSON.stringify(fighter.stats))).size).toBe(fighters.length);
    expect(fighters.every((fighter) => Number.isFinite(fighter.health) && fighter.health > 0)).toBe(true);
    expect(new Set(fighters.map((fighter) => fighter.health)).size).toBe(fighters.length);
  });

  test("every fighter exposes one automatic primary weapon", () => {
    FIGHTER_ORDER.forEach((fighterId) => {
      const tools = getToolModes(fighterId);
      expect(tools).toHaveLength(1);
      expect(tools[0]).toBe(FIGHTERS[fighterId].primary);
      expect(toolModeSpec(fighterId, 99)).toBe(tools[0]);
    });
    expect(getToolModes("hypersonic")[0]).toMatchObject({ id: "hyper-lance", laserStyle: "hero" });
    expect(getToolModes("hypersonic")[0].damage).toBeGreaterThan(10);
  });

  test("fighters share four chassis, three ratings and an eight-second ultimate", () => {
    const fighters = FIGHTER_ORDER.map((fighterId) => FIGHTERS[fighterId]);
    expect(new Set(fighters.map((fighter) => fighter.archetype))).toEqual(new Set(["light", "heavy", "wing", "hero"]));
    fighters.forEach((fighter) => {
      expect(fighter.rig.chassis).toBe(fighter.archetype);
      expect(fighter.tactical.cooldown).toBe(8);
      expect(Object.keys(fighter.ratings)).toEqual(["mobility", "firepower", "defense"]);
      expect(Object.values(fighter.ratings).every((value) => ["高", "中", "低"].includes(value))).toBe(true);
    });
  });

  test("opening combat grows from readable to full pressure", () => {
    expect(combatPhase(0)).toBe("identify");
    expect(combatPhase(8)).toBe("learn");
    expect(combatPhase(20)).toBe("expand");
    expect(combatPhase(40)).toBe("full");
    expect(projectileBudget(0)).toMatchObject({ player: 36, enemy: 12, allied: 96 });
    expect(projectileBudget(40)).toMatchObject({ player: 64, enemy: 28, allied: 96 });
    expect(projectileBudget(40, { transformed: true, boss: true })).toMatchObject({ player: 84, enemy: 42 });
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

  test("formations introduce pressure enemies with distinct bullet roles", () => {
    const enemyTypes = new Set();
    for (let index = 0; index < 4; index += 1) {
      formationPattern(index, 960).units.forEach((unit) => enemyTypes.add(unit.type));
    }
    expect(enemyTypes).toEqual(new Set([
      "scout",
      "gunner",
      "fighter",
      "helicopter",
      "sniper",
      "spinner",
      "bomber",
      "mineLayer",
      "elite",
      "splitter",
    ]));
  });

  test("all maps provide varied entity structures without full-width forced lanes", () => {
    expect(MAP_ORDER).toEqual(["usa", "pacific", "arctic", "sky-corridor", "meteor-rift"]);
    MAP_ORDER.forEach((mapId) => {
      const map = getBattleMap(mapId);
      const structures = createMapStructures(mapId, 375, 812);
      expect(map.feature.length).toBeGreaterThan(0);
      expect(structures.length).toBeGreaterThanOrEqual(8);
      expect(new Set(structures.map((structure) => structure.kind)).size).toBeGreaterThanOrEqual(3);
      expect(structures.every((structure) => structure.width < 375 * 0.75)).toBe(true);
    });
  });

  test("solid walls push circles out while hazards and open gates do not block", () => {
    const structures = createMapStructures("usa", 375, 812);
    const wall = structures.find((structure) => structure.solid && structure.kind !== "gate");
    const circle = { x: wall.x + wall.width / 2, y: wall.y + wall.height / 2, radius: 12 };
    expect(pointInsideStructure(circle.x, circle.y, wall)).toBe(true);
    const resolved = resolveCircleFromStructure(circle, wall);
    expect(resolved.collided).toBe(true);
    expect(circleIntersectsStructure({ ...circle, x: resolved.x, y: resolved.y }, wall)).toBe(false);

    const hazard = structures.find((structure) => structure.solid === false && structure.damage > 0);
    expect(pointInsideHazard(hazard.x + 2, hazard.y + 2, hazard)).toBe(true);
    expect(pointInsideStructure(hazard.x + 2, hazard.y + 2, hazard)).toBe(false);

    const gate = structures.find((structure) => structure.kind === "gate");
    gate.open = true;
    expect(pointInsideStructure(gate.x + 2, gate.y + 2, gate)).toBe(false);
  });
});
