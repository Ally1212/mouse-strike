import { expect, test } from "@playwright/test";
import { FIGHTERS } from "../fighter-profiles.js";

test.setTimeout(240_000);

async function snapshot(page) {
  return page.evaluate(() => window.__mouseStrikeQa.snapshot());
}

test("hangar and combat remain usable", async ({ page }, testInfo) => {
  await page.goto("/?qa=1");
  const mapTrigger = page.locator("#map-select-trigger");
  await expect(mapTrigger).toBeVisible();
  await expect(page.locator("#map-select option")).toHaveCount(5);
  for (const mapId of ["usa", "pacific", "arctic", "sky-corridor", "meteor-rift"]) {
    await mapTrigger.click();
    await page.locator(`[data-map-option="${mapId}"]`).click();
    await expect(page.locator("#map-select")).toHaveValue(mapId);
    await expect(mapTrigger).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(`[data-map-option="${mapId}"]`)).toHaveAttribute("aria-selected", "true");
    await expect(page.locator("#map-feature")).not.toBeEmpty();
  }
  await mapTrigger.click();
  await page.locator('[data-map-option="usa"]').click();
  await expect(page.locator("#map-select-value")).toHaveText("美国领空");
  await expect(page.locator("#fighter-preview")).toBeVisible();
  await expect(page.locator("#start-button")).toBeVisible();
  await expect(page.locator("#start-button-label")).toHaveText("驾驶出击");
  await expect(page.locator('.fighter-option.is-selected')).toHaveCSS("border-bottom-color", "rgb(183, 47, 36)");
  await expect(page.locator('.fighter-option.is-selected')).toHaveCSS("box-shadow", "none");
  expect(await page.locator('.fighter-option.is-selected').evaluate((element) => getComputedStyle(element, "::after").display)).toBe("none");
  await expect(page.locator(".fighter-option img")).toHaveCount(0);
  await expect(page.locator(".fighter-option small")).toHaveCount(0);
  await expect(page.locator(".fighter-option__index")).toHaveCount(0);
  await expect(page.locator("#fighter-reference-image")).toBeHidden();
  await expect(page.locator("#fighter-reference-image")).toHaveCSS("object-fit", "contain");
  await expect(page.locator('[data-preview="flight"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-preview="transform"]')).toHaveAttribute("aria-pressed", "false");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.wingmanSummon)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.laserBeam)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.structureImpact)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.barrierImpact)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.meteorImpact)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.airdropWarning)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.fullScreenLaser)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.nuclearLaunch)).toBe("function");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.nuclearBlast)).toBe("function");
  await expect.poll(async () => page.evaluate(() => window.gameAudio?.music?.src || "")).toContain("/audio/on-the-offensive.ogg");
  const viewportWidth = await page.locator("body").evaluate((body) => body.clientWidth);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewportWidth);
  const stageBox = await page.locator(".hangar-stage").boundingBox();
  expect(stageBox.x).toBeGreaterThanOrEqual(0);
  expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(viewportWidth);
  if (testInfo.project.name === "desktop") {
    await page.mouse.move(stageBox.x + stageBox.width * 0.52, stageBox.y + stageBox.height * 0.52);
    await page.mouse.down();
    await page.mouse.move(stageBox.x + stageBox.width * 0.7, stageBox.y + stageBox.height * 0.42, { steps: 6 });
    await page.mouse.up();
    await expect.poll(async () => (await snapshot(page)).hangarInteraction?.interacted).toBe(true);
  }

  await page.locator("#rules-button").click();
  await expect(page.locator("#rules-dialog")).toBeVisible();
  await expect(page.locator("#rules-dialog .rule-list li")).toHaveCount(5);
  await expect(page.locator("#rules-dialog .mission-brief__note")).toHaveCount(0);
  await expect(page.locator("#rules-dialog .rule-key")).toHaveText(["鼠标", "左键", "右键", "Space", "E"]);
  await expect(page.locator("#rules-dialog .pickup-guide span")).toHaveCount(7);
  await page.locator("#rules-close").click();
  await expect(page.locator("#rules-dialog")).toBeHidden();

  await page.locator('[data-fighter="hypersonic"]').click();
  await expect(page.locator("#selected-name")).toHaveText("超音速 X-10");
  await expect(page.locator("#unlock-dialog")).toBeHidden();
  await expect(page.locator(".fighter-option").last()).toHaveAttribute("data-fighter", "hypersonic");

  const fighterExpectations = [
    ["hypersonic", "超音速 X-10", "heroMantle", "faxx"],
    ["f22", "F-22 猛禽", "leftTalon"],
    ["j35", "歼-35 鹘鹰", "leftFeather"],
    ["faxx", "F/A-XX 白隼", "twinRail"],
    ["typhoon", "欧洲战斗机 台风", "lanceGuard"],
    ["rafale", "达索 阵风", "phaseHalo"],
    ["gripen", "JAS 39 鹰狮", "leftRail"],
    ["su57", "苏霍伊 Su-57", "leftAnchor"],
    ["j20", "歼-20 威龙", "commandCrown"],
  ];
  const rigSignatures = new Set();
  for (const [fighterId, name, signaturePart, imageId = fighterId] of fighterExpectations) {
    await page.locator(`[data-fighter="${fighterId}"]`).click();
    await expect(page.locator("#selected-name")).toHaveText(name);
    await expect(page.locator("#selected-transform-name")).toHaveText(FIGHTERS[fighterId].transformation.label);
    await expect(page.locator("#selected-transform-duration")).toContainText("3 核心启动 / 10 秒");
    await expect(page.locator("#selected-passive-name")).toHaveText(FIGHTERS[fighterId].passiveName);
    await expect(page.locator("#agility-value")).toHaveText(String(FIGHTERS[fighterId].stats.mobility));
    await expect(page.locator("#fighter-reference-image")).toHaveAttribute("src", `/fighters/${imageId}.webp`);
    await expect(page.locator("#fighter-reference-image")).toHaveAttribute("alt", FIGHTERS[fighterId].reference.alt);
    await expect(page.locator("#reference-credit")).toHaveText(FIGHTERS[fighterId].reference.credit);
    if (FIGHTERS[fighterId].reference.url) {
      await expect(page.locator("#reference-credit")).toHaveAttribute("href", FIGHTERS[fighterId].reference.url);
    } else {
      await expect(page.locator("#reference-credit")).not.toHaveAttribute("href", /.+/);
    }
    const rigSignature = (await snapshot(page)).rigSignature;
    expect(rigSignature).toContain(signaturePart);
    rigSignatures.add(rigSignature);
  }
  expect(rigSignatures.size).toBe(9);

  for (const mode of ["flight", "transform", "assault", "tactical"]) {
    await page.locator(`[data-preview="${mode}"]`).click({ force: true });
    await expect(page.locator(`[data-preview="${mode}"]`)).toHaveAttribute("aria-pressed", "true");
  }

  await page.locator('[data-preview="transform"]').click({ force: true });
  await expect.poll(async () => (await snapshot(page)).hangarPreview?.transform, { timeout: 5000 }).toBeGreaterThan(0.99);
  await page.waitForTimeout(1600);
  expect((await snapshot(page)).hangarPreview?.transform).toBeGreaterThan(0.99);

  await page.locator('[data-fighter="f22"]').click();

  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).visual3d).toBe(true);
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await expect(page.locator("#health-value")).toHaveText(`${FIGHTERS.f22.health} / ${FIGHTERS.f22.health}`);
  await expect.poll(async () => (await snapshot(page)).laserHeat).toBeGreaterThan(0);
  const opening = await snapshot(page);
  expect(opening.overdrive).toBe(0);
  expect(opening.bullets).toBeLessThanOrEqual(18);
  expect(opening.enemyBullets).toBeLessThanOrEqual(12);

  const battlefield = await page.locator("#game-canvas").boundingBox();
  const pressureEnemies = ["scout", "gunner", "spinner", "sniper", "bomber", "mineLayer", "splitter", "fighter", "helicopter", "elite"];
  await page.evaluate((types) => {
    window.__mouseStrikeQa.setElapsed(40);
    window.__mouseStrikeQa.clearHazards();
    types.forEach((type, index) => {
      window.__mouseStrikeQa.spawnEnemyType(type, {
        x: window.innerWidth * (0.12 + index * 0.1),
        y: 86 + (index % 2) * 18,
        hp: 999,
        fireNow: true,
      });
    });
  }, pressureEnemies);
  await expect.poll(async () => {
    const enemies = (await snapshot(page)).enemies;
    return pressureEnemies.every((type) => enemies.includes(type));
  }).toBe(true);
  await expect.poll(async () => {
    const kinds = (await snapshot(page)).enemyBulletKinds;
    return ["bolt", "crescent", "needle", "shell", "mine", "split"].every((kind) => kinds[kind] > 0);
  }, { timeout: 3000 }).toBe(true);
  await page.evaluate(() => window.__mouseStrikeQa.clearHazards());

  await page.evaluate(() => {
    window.__mouseStrikeQa.setMap("sky-corridor");
    window.__mouseStrikeQa.setPointerPosition(24, window.innerHeight * 0.62);
  });
  await expect.poll(async () => (await snapshot(page)).structures.length).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).playerX).toBeLessThan(90);
  const healthBeforeStructure = (await snapshot(page)).health;
  await page.evaluate(() => window.__mouseStrikeQa.placeStructureAtPlayer());
  await expect.poll(async () => (await snapshot(page)).health).toBeLessThan(healthBeforeStructure);

  await page.evaluate(() => window.__mouseStrikeQa.setMap("usa"));
  const healthBeforeHazard = (await snapshot(page)).health;
  await page.evaluate(() => window.__mouseStrikeQa.spawnHazardAtPlayer());
  await expect.poll(async () => (await snapshot(page)).hazards).toContain("radar");
  await expect.poll(async () => (await snapshot(page)).health).toBeLessThan(healthBeforeHazard);
  await page.evaluate(() => window.__mouseStrikeQa.clearHazards());

  const beforePickups = await snapshot(page);
  await page.evaluate(() => window.__mouseStrikeQa.collectPickup("core"));
  await expect.poll(async () => (await snapshot(page)).transformCores).toBe(beforePickups.transformCores + 1);
  await page.evaluate(() => window.__mouseStrikeQa.collectPickup("evolution"));
  await expect.poll(async () => (await snapshot(page)).weaponEnergy).toBe(beforePickups.weaponEnergy + 1);
  await page.evaluate(() => window.__mouseStrikeQa.collectPickup("trajectory"));
  await expect.poll(async () => (await snapshot(page)).trajectoryLevel).toBe(beforePickups.trajectoryLevel + 1);
  await page.evaluate(() => {
    window.__mouseStrikeQa.setHealth(60);
    window.__mouseStrikeQa.collectPickup("shield");
  });
  const shieldPickup = await snapshot(page);
  expect(shieldPickup.health).toBeGreaterThan(60);
  expect(shieldPickup.shieldCharges).toBe(1);

  await page.evaluate(() => window.__mouseStrikeQa.collectPickup("barrier"));
  await expect.poll(async () => (await snapshot(page)).barrierTimer).toBeGreaterThan(7.5);
  const barrierHealth = (await snapshot(page)).health;
  await page.evaluate(() => window.__mouseStrikeQa.spawnHazardAtPlayer());
  await expect.poll(async () => (await snapshot(page)).barrierHits).toBeGreaterThan(0);
  expect((await snapshot(page)).health).toBe(barrierHealth);
  await page.evaluate(() => window.__mouseStrikeQa.clearHazards());

  await page.evaluate(() => window.__mouseStrikeQa.collectPickup("ally"));
  await expect.poll(async () => (await snapshot(page)).allies).toHaveLength(2);
  const allyHealth = (await snapshot(page)).allies[0].hp;
  await page.evaluate(() => window.__mouseStrikeQa.hitFirstAlly(12));
  await expect.poll(async () => (await snapshot(page)).allies[0].hp).toBeLessThan(allyHealth);

  await page.evaluate((cores) => {
    window.__mouseStrikeQa.setTransformCores(cores);
    window.__mouseStrikeQa.toggleTransform();
  }, 2);
  await expect.poll(async () => (await snapshot(page)).transformTarget).toBe(0);
  await page.evaluate(() => window.__mouseStrikeQa.setTransformCores(3));
  await expect(page.locator("#transform-ready")).toBeVisible();
  await expect(page.locator("#transform-ready strong")).toHaveText("按鼠标右键变身");

  if (testInfo.project.name === "mobile") await page.locator("#skill-button").click();
  else await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "left" });
  await expect.poll(async () => (await snapshot(page)).toolModeIndex).toBe(1);

  await page.keyboard.press("e");
  await expect.poll(async () => (await snapshot(page)).tacticalCooldown).toBeGreaterThan(0);

  if (testInfo.project.name === "mobile") await page.locator("#transform-button").click();
  else await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "right" });
  await expect.poll(async () => (await snapshot(page)).transformProgress, { timeout: 8000 }).toBeGreaterThan(0.96);
  const transformed = await snapshot(page);
  expect(transformed.transformCores).toBe(0);
  expect(transformed.assaultFireRateMultiplier).toBeLessThanOrEqual(0.62);
  expect(transformed.assaultProjectileBonus).toBeGreaterThanOrEqual(2);
  await expect(page.locator("#transform-ready")).toBeHidden();
  await page.evaluate(() => window.__mouseStrikeQa.setTransformElapsed(9.98));
  await expect.poll(async () => (await snapshot(page)).transformTarget).toBe(0);

  if (testInfo.project.name === "mobile") await page.locator("#wingman-button").click();
  else await page.keyboard.press("Space");
  await expect.poll(async () => (await snapshot(page)).wingmanTimer).toBeGreaterThan(0);
  await expect.poll(async () => (await snapshot(page)).wingmanCount).toBe(2);

  await page.evaluate(() => {
    window.__mouseStrikeQa.setTransformCores(2);
    window.__mouseStrikeQa.setOverdrive(0);
    window.__mouseStrikeQa.spawnBoss();
    window.__mouseStrikeQa.destroyBoss();
  });
  await expect(page.locator("#module-choice")).toHaveCount(0);
  const bossReward = await snapshot(page);
  expect(bossReward.transformCores).toBe(3);
  expect(bossReward.wingmanCooldown).toBe(0);
  expect(bossReward.overdrive).toBeGreaterThan(5.5);

  await page.screenshot({ path: `/tmp/mouse-strike-${testInfo.project.name}.png`, fullPage: true });
  await page.keyboard.press("q");
  await expect(page.locator("#menu-screen")).toBeVisible();
});

test("map structures, meteors, airdrops and full-screen laser are playable", async ({ page }) => {
  await page.goto("/?qa=1&renderer=canvas");
  await page.locator('[data-fighter="f22"]').click();
  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);

  for (const mapId of ["usa", "pacific", "arctic", "sky-corridor", "meteor-rift"]) {
    await page.evaluate((id) => window.__mouseStrikeQa.setMap(id), mapId);
    const structures = (await snapshot(page)).structures;
    expect(structures.length).toBeGreaterThanOrEqual(8);
    expect(new Set(structures.map((structure) => structure.kind)).size).toBeGreaterThanOrEqual(3);
  }

  await page.evaluate(() => {
    window.__mouseStrikeQa.setMap("meteor-rift");
    window.__mouseStrikeQa.clearStructures();
    window.__mouseStrikeQa.spawnMeteor(true);
  });
  await expect.poll(async () => (await snapshot(page)).meteorWarnings).toBe(1);
  await expect.poll(async () => (await snapshot(page)).meteors.length, { timeout: 2500 }).toBe(1);
  await page.evaluate(() => window.__mouseStrikeQa.damageFirstMeteor(100));
  await expect.poll(async () => (await snapshot(page)).pickupTypes).toContain("meteor-core");
  const impactsBefore = (await snapshot(page)).meteorImpacts;
  await page.evaluate(() => window.__mouseStrikeQa.launchMeteorNow(false));
  await expect.poll(async () => (await snapshot(page)).meteors.length).toBe(1);
  await page.evaluate(() => window.__mouseStrikeQa.impactFirstMeteor());
  await expect.poll(async () => (await snapshot(page)).meteorImpacts).toBe(impactsBefore + 1);

  await page.evaluate(() => {
    window.__mouseStrikeQa.clearHazards();
    window.__mouseStrikeQa.spawnAirdrop();
  });
  await expect.poll(async () => (await snapshot(page)).activeAirdropId).not.toBeNull();
  await expect.poll(async () => (await snapshot(page)).enemies).toContain("carrier");
  await page.evaluate(() => window.__mouseStrikeQa.destroyAirdrop());
  await expect.poll(async () => (await snapshot(page)).supplyCrates.length).toBe(1);
  await page.evaluate(() => window.__mouseStrikeQa.openFirstSupplyChoice());
  await expect(page.locator("#airdrop-choice")).toBeVisible();
  await expect(page.locator("#airdrop-defense-title")).toHaveText("修复 35% 耐久");
  await expect(page.locator("#airdrop-firepower-detail")).toContainText("20 秒");
  await page.locator("#airdrop-escort").click();
  await expect(page.locator("#airdrop-progress")).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).supplyCrates[0]?.status).toBe("escorting");
  await page.evaluate(() => window.__mouseStrikeQa.completeAirdropEscort());
  await expect(page.locator("#airdrop-choice")).toBeVisible();
  await expect(page.locator("#airdrop-choice-title")).toHaveText("选择高级补给");
  await expect(page.locator("#airdrop-escort")).toBeHidden();
  const trajectoryBeforeAirdrop = (await snapshot(page)).trajectoryLevel;
  await page.locator("#airdrop-firepower").click();
  await expect.poll(async () => (await snapshot(page)).supplyCrates.length).toBe(0);
  const tacticalSupplyState = await snapshot(page);
  expect(tacticalSupplyState.firepowerTimer).toBeGreaterThan(19);
  expect(tacticalSupplyState.trajectoryLevel).toBe(Math.min(4, trajectoryBeforeAirdrop + 1));
  expect(tacticalSupplyState.allies.length).toBeGreaterThanOrEqual(2);
  expect(tacticalSupplyState.airdropEscortsCompleted).toBe(1);
  await page.evaluate(() => {
    window.__mouseStrikeQa.spawnAirdrop();
    window.__mouseStrikeQa.destroyAirdrop();
    window.__mouseStrikeQa.setHealth(20);
    window.__mouseStrikeQa.openFirstSupplyChoice();
  });
  await page.locator("#airdrop-defense").click();
  const defenseSupplyState = await snapshot(page);
  expect(defenseSupplyState.health).toBeGreaterThan(20);
  expect(defenseSupplyState.shieldCharges).toBeGreaterThanOrEqual(1);

  await page.evaluate(() => {
    window.__mouseStrikeQa.spawnAirdrop();
    window.__mouseStrikeQa.destroyAirdrop();
    window.__mouseStrikeQa.openFirstSupplyChoice();
    window.__mouseStrikeQa.startAirdropEscort();
    window.__mouseStrikeQa.damageAirdrop(100);
  });
  await expect(page.locator("#airdrop-progress")).toBeHidden();
  expect((await snapshot(page)).airdropEscortsFailed).toBe(1);
  await page.evaluate(() => {
    window.__mouseStrikeQa.grantSupply("firepower");
    window.__mouseStrikeQa.grantSupply("transform");
    window.__mouseStrikeQa.setHealth(20);
    window.__mouseStrikeQa.grantSupply("defense");
    window.__mouseStrikeQa.grantSupply("wingman");
    window.__mouseStrikeQa.grantSupply("skyfire");
  });
  const supplyState = await snapshot(page);
  expect(supplyState.firepowerTimer).toBeGreaterThan(5);
  expect(supplyState.transformCores).toBe(3);
  expect(supplyState.health).toBeGreaterThan(20);
  expect(supplyState.barrierTimer).toBeGreaterThan(7);
  expect(supplyState.allies.length).toBeGreaterThanOrEqual(2);
  expect(supplyState.screenLaser).not.toBeNull();

  const player = await snapshot(page);
  await page.evaluate(({ x, y }) => {
    window.__mouseStrikeQa.clearHazards();
    window.__mouseStrikeQa.clearStructures();
    window.__mouseStrikeQa.clearScreenLaser();
    window.__mouseStrikeQa.spawnEnemyType("elite", { x, y: y - 220, hp: 999 });
  }, { x: player.playerX, y: player.playerY });
  await expect.poll(async () => (await snapshot(page)).laserBurns.length, { timeout: 5000 }).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__mouseStrikeQa.setTransformCores(3);
    window.__mouseStrikeQa.toggleTransform();
  });
  await expect.poll(async () => (await snapshot(page)).transformProgress, { timeout: 8000 }).toBeGreaterThan(0.96);
  await page.evaluate(() => {
    window.__mouseStrikeQa.setTacticalCooldown(0);
    window.__mouseStrikeQa.fireTactical();
  });
  await expect.poll(async () => (await snapshot(page)).screenLaser).not.toBeNull();
  await expect.poll(async () => (await snapshot(page)).screenEffect).toBe("screen-laser");
});

test("five mini missions explain their rules, wait for confirmation and grant visible rewards", async ({ page }, testInfo) => {
  await page.goto("/?qa=1&renderer=canvas");
  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);

  const missions = [
    ["coaster", "云端过山车", "累计留在轨道内 8.5 秒"],
    ["rings", "连续穿环", "穿过 5 个能量环"],
    ["carrier", "航母停靠", "稳定停靠 2 秒"],
    ["mothership", "母舰破袭", "摧毁 3 个武器舱"],
    ["chain", "连锁爆破", "制造至少 5 连爆"],
  ];

  for (const [missionId, title, objective] of missions) {
    await page.evaluate((id) => window.__mouseStrikeQa.showMiniMission(id), missionId);
    await expect(page.locator("#mission-briefing")).toBeVisible();
    await expect(page.locator("#mission-event-title")).toHaveText(title);
    await expect(page.locator("#mission-event-rule")).not.toBeEmpty();
    await expect(page.locator("#mission-event-objective")).toContainText(objective);
    await expect(page.locator("#mission-event-reward")).not.toBeEmpty();
    await expect.poll(async () => (await snapshot(page)).missionPendingId).toBe(missionId);

    await page.locator("#mission-enter").click();
    await expect(page.locator("#mission-briefing")).toBeHidden();
    await expect(page.locator("#mission-progress")).toBeVisible();
    await expect.poll(async () => (await snapshot(page)).miniMission?.id).toBe(missionId);
    await page.evaluate(() => window.__mouseStrikeQa.completeMiniMission());
    await expect.poll(async () => (await snapshot(page)).miniMission).toBeNull();
    await expect.poll(async () => (await snapshot(page)).completedMiniMissions).toContain(missionId);
  }

  const result = await snapshot(page);
  expect(result.miniMissionResults).toHaveLength(5);
  expect(result.miniMissionResults.every((item) => item.success)).toBe(true);
  expect(result.transformCores).toBe(3);
  expect(result.barrierTimer).toBeGreaterThan(0);
  expect(result.overdrive).toBeGreaterThan(0);

  await page.evaluate(() => window.__mouseStrikeQa.showMiniMission("rings"));
  await expect(page.locator("#mission-briefing")).toBeVisible();
  await page.locator("#mission-skip").click();
  await expect(page.locator("#mission-briefing")).toBeHidden();
  await expect.poll(async () => (await snapshot(page)).skippedMiniMissions).toContain("rings");

  await page.screenshot({ path: `/tmp/mouse-strike-mini-missions-${testInfo.project.name}.png`, fullPage: true });
});

test("mini mission schedule announces the first challenge before it starts", async ({ page }) => {
  await page.goto("/?qa=1&renderer=canvas&missions=auto");
  await page.locator("#start-button").click();
  await page.evaluate(() => window.__mouseStrikeQa.setElapsed(12));
  await expect(page.locator("#mission-briefing")).toBeVisible();
  await expect(page.locator("#mission-event-title")).toHaveText("云端过山车");
  const pausedAt = await page.evaluate(() => window.__mouseStrikeQa.snapshot().miniMissionResults.length);
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => window.__mouseStrikeQa.snapshot().miniMissionResults.length)).toBe(pausedAt);
  await page.locator("#mission-skip").click();
  await expect(page.locator("#mission-briefing")).toBeHidden();
});

test("X-10 requests its concept code for every launch", async ({ page }) => {
  await page.goto("/?qa=1");

  await page.locator('[data-fighter="hypersonic"]').click();
  await expect(page.locator("#selected-name")).toHaveText("超音速 X-10");
  await expect(page.locator("#unlock-dialog")).toBeHidden();

  await page.locator("#start-button").click();
  await expect(page.locator("#unlock-dialog")).toBeVisible();
  await expect(page.locator("#unlock-password")).toHaveAttribute("maxlength", "4");
  await expect(page.locator("#unlock-password")).toHaveAttribute("pattern", "[0-9]{4}");
  await expect.poll(async () => (await snapshot(page)).running).toBe(false);

  await page.locator("#unlock-password").fill("1111");
  await page.locator("#unlock-form").getByRole("button", { name: "验证暗号并驾驶" }).click();
  await expect(page.locator("#unlock-error")).toBeVisible();
  await expect.poll(async () => (await snapshot(page)).running).toBe(false);

  await page.locator("#unlock-password").fill("0000");
  await page.locator("#unlock-form").getByRole("button", { name: "验证暗号并驾驶" }).click();
  await expect(page.locator("#unlock-dialog")).toBeHidden();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).fighterId).toBe("hypersonic");
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();

  await page.keyboard.press("q");
  await expect.poll(async () => (await snapshot(page)).running).toBe(false);
  await page.locator("#start-button").click();
  await expect(page.locator("#unlock-dialog")).toBeVisible();
  await expect(page.locator("#unlock-password")).toHaveValue("");
});

test("X-10 hero laser executes ordinary enemies and nuclear strike clears the battlefield", async ({ page }) => {
  await page.goto("/?qa=1&renderer=canvas");
  await page.locator('[data-fighter="hypersonic"]').click();
  await expect(page.locator("#selected-strength")).toContainText("秒杀激光");
  await expect(page.locator("#selected-tactical-name")).toHaveText("天穹核裁决");
  await page.locator("#start-button").click();
  await page.locator("#unlock-password").fill("0000");
  await page.locator("#unlock-form").getByRole("button", { name: "验证暗号并驾驶" }).click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);

  const player = await snapshot(page);
  await page.evaluate(({ x, y }) => {
    window.__mouseStrikeQa.clearHazards();
    window.__mouseStrikeQa.clearStructures();
    window.__mouseStrikeQa.spawnEnemyType("elite", { x, y: y - 220, hp: 999 });
  }, { x: player.playerX, y: player.playerY });
  await expect.poll(async () => (await snapshot(page)).enemies.includes("elite"), { timeout: 5000 }).toBe(false);

  await page.evaluate(() => {
    window.__mouseStrikeQa.cycleToolMode();
    window.__mouseStrikeQa.clearHazards();
    window.__mouseStrikeQa.spawnEnemyType("bomber", { x: 110, y: 180, hp: 999 });
    window.__mouseStrikeQa.spawnEnemyType("helicopter", { x: 260, y: 210, hp: 999 });
    window.__mouseStrikeQa.setTacticalCooldown(0);
    window.__mouseStrikeQa.fireTactical();
  });
  await expect.poll(async () => (await snapshot(page)).nuclearStrike).not.toBeNull();
  await expect.poll(async () => (await snapshot(page)).nuclearDetonations, { timeout: 4000 }).toBe(1);
  await expect.poll(async () => {
    const enemies = (await snapshot(page)).enemies;
    return enemies.includes("bomber") || enemies.includes("helicopter");
  }).toBe(false);
});

test("canvas fallback preserves the game loop", async ({ page }) => {
  await page.goto("/?qa=1&renderer=canvas");
  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).visual3d).toBe(false);
  await expect.poll(async () => {
    const current = await snapshot(page);
    return current.bullets + current.laserBeams;
  }).toBeGreaterThan(0);
});
