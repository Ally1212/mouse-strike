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
  projectileBudget,
  tacticalSpec,
  toolModeSpec,
  TRANSFORM_CORE_COST,
  TRANSFORM_DURATION,
  transformSecondsRemaining,
  wingmanSpec,
} from "../gameplay-rules.js";
import {
  FIGHTER_ORDER,
  FIGHTERS,
  getToolModes,
} from "../fighter-profiles.js";
import {
  circleIntersectsStructure,
  createMapStructures,
  getBattleMap,
  MAP_ORDER,
  pointInsideHazard,
  pointInsideStructure,
  resolveCircleFromStructure,
} from "../battle-maps.js";
import {
  coasterMotion,
  connectedChain,
  isInsideCarrierDeck,
  MINI_MISSION_ORDER,
  nextMiniMission,
  ringContainsPlayer,
} from "../mini-missions.js";

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
});

describe("mini mission rules", () => {
  test("introduces five missions in a readable sequence", () => {
    expect(MINI_MISSION_ORDER).toEqual(["coaster", "rings", "carrier", "mothership", "chain"]);
    expect(nextMiniMission(11, [])).toBeNull();
    expect(nextMiniMission(12, [])?.id).toBe("coaster");
    expect(nextMiniMission(70, ["coaster", "rings"])?.id).toBe("carrier");
    expect(nextMiniMission(200, MINI_MISSION_ORDER)).toBeNull();
    expect(nextMiniMission(200, [], true)).toBeNull();
  });

  test("carrier and ring goals use forgiving hit areas", () => {
    const carrier = { x: 200, y: 600, deckWidth: 180, deckHeight: 80 };
    expect(isInsideCarrierDeck({ x: 200, y: 600 }, carrier)).toBe(true);
    expect(isInsideCarrierDeck({ x: 40, y: 600 }, carrier)).toBe(false);
    expect(ringContainsPlayer({ x: 100, y: 100, radius: 16 }, { x: 100, y: 100, radius: 44 })).toBe(true);
    expect(ringContainsPlayer({ x: 150, y: 100, radius: 16 }, { x: 100, y: 100, radius: 44 })).toBe(false);
  });

  test("chain explosions only propagate through nearby active nodes", () => {
    const nodes = [
      { id: "a", x: 0, y: 0, destroyed: false },
      { id: "b", x: 90, y: 0, destroyed: false },
      { id: "c", x: 180, y: 0, destroyed: false },
      { id: "d", x: 420, y: 0, destroyed: false },
    ];
    expect(connectedChain(nodes, "a", 100)).toEqual(["a", "b", "c"]);
    nodes[1].destroyed = true;
    expect(connectedChain(nodes, "a", 100)).toEqual(["a"]);
  });

  test("coaster mission scripts distinct ride phases inside safe camera limits", () => {
    const samples = [0.05, 0.25, 0.5, 0.72, 0.95].map(coasterMotion);
    expect(samples.map((sample) => sample.segmentLabel)).toEqual([
      "弹射起步",
      "垂直急降",
      "高速 S 弯",
      "螺旋翻转",
      "终点冲刺",
    ]);
    samples.forEach((sample) => {
      expect(sample.center).toBeGreaterThanOrEqual(0.22);
      expect(sample.center).toBeLessThanOrEqual(0.78);
      expect(Math.abs(sample.roll)).toBeLessThanOrEqual(0.105);
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

  test("standard fighters keep three attack forms while X-10 owns ten", () => {
    FIGHTER_ORDER.forEach((fighterId) => {
      const tools = getToolModes(fighterId);
      const expectedCount = fighterId === "hypersonic" ? 10 : 3;
      expect(tools).toHaveLength(expectedCount);
      expect(new Set(tools.map((tool) => tool.id)).size).toBe(expectedCount);
      expect(toolModeSpec(fighterId, expectedCount + 1)).toEqual(tools[1]);
    });
    expect(getToolModes("hypersonic").filter((tool) => tool.pattern === "laser")).toHaveLength(4);
    expect(getToolModes("hypersonic")[0]).toMatchObject({ id: "hyper-lance", laserStyle: "hero" });
    expect(getToolModes("hypersonic")[0].damage).toBeGreaterThan(10);
  });

  test("every fighter has a mechanically configured laser form", () => {
    FIGHTER_ORDER.forEach((fighterId) => {
      const lasers = getToolModes(fighterId).filter((tool) => tool.pattern === "laser");
      expect(lasers.length).toBeGreaterThanOrEqual(1);
      lasers.forEach((laser) => {
        const spec = laserModeSpec(laser);
        expect(spec.warmup).toBeGreaterThan(0);
        expect(spec.duration).toBeGreaterThan(0);
        expect(spec.heat).toBeGreaterThan(0);
        expect(spec.overheatCooldown).toBeGreaterThan(0);
      });
    });
  });

  test("opening combat grows from readable to full pressure", () => {
    expect(combatPhase(0)).toBe("identify");
    expect(combatPhase(8)).toBe("learn");
    expect(combatPhase(20)).toBe("expand");
    expect(combatPhase(40)).toBe("full");
    expect(projectileBudget(0)).toMatchObject({ player: 18, enemy: 12, allied: 60 });
    expect(projectileBudget(40)).toMatchObject({ player: 32, enemy: 28, allied: 60 });
    expect(projectileBudget(40, { transformed: true, boss: true })).toMatchObject({ player: 48, enemy: 42 });
  });

  test("every fighter owns a distinct timed wingman squad", () => {
    const squads = FIGHTER_ORDER.map((fighterId) => wingmanSpec(fighterId));
    expect(squads.every((squad) => squad.count >= 2 && squad.count <= 3)).toBe(true);
    expect(new Set(squads.map((squad) => squad.name)).size).toBe(FIGHTER_ORDER.length);
    expect(new Set(squads.map((squad) => squad.duration)).size).toBe(FIGHTER_ORDER.length);
    expect(new Set(squads.map((squad) => squad.formation)).size).toBe(FIGHTER_ORDER.length);
    expect(wingmanSpec("unknown").name).toBe("猛禽猎杀队");
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
