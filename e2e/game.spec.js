import { expect, test } from "@playwright/test";
import { FIGHTERS } from "../fighter-profiles.js";

test.setTimeout(120_000);

async function snapshot(page) {
  return page.evaluate(() => window.__mouseStrikeQa.snapshot());
}

test("hangar and combat remain usable", async ({ page }, testInfo) => {
  await page.goto("/?qa=1");
  await expect(page.locator("#fighter-preview")).toBeVisible();
  await expect(page.locator("#start-button")).toBeVisible();
  await expect(page.locator(".fighter-option img")).toHaveCount(0);
  await expect(page.locator(".fighter-option small")).toHaveCount(0);
  await expect(page.locator(".fighter-option__index")).toHaveCount(0);
  await expect(page.locator("#fighter-reference-image")).toBeHidden();
  await expect(page.locator("#fighter-reference-image")).toHaveCSS("object-fit", "contain");
  await expect.poll(async () => page.evaluate(() => typeof window.gameAudio?.toolSwitch)).toBe("function");
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
  await expect(page.locator("#rules-dialog .rule-list li")).toHaveCount(4);
  await expect(page.locator("#rules-dialog .rule-key")).toHaveText(["鼠标", "左键", "右键", "Space"]);
  await page.locator("#rules-close").click();
  await expect(page.locator("#rules-dialog")).toBeHidden();

  const fighterExpectations = [
    ["f22", "F-22 猛禽", "幽灵标记", "96", "leftTalon"],
    ["j35", "歼-35 鹘鹰", "双线锁定", "94", "leftFeather"],
    ["faxx", "F/A-XX 白隼", "协同僚机", "88", "twinRail"],
    ["typhoon", "欧洲战斗机 台风", "风暴贯穿", "84", "lanceGuard"],
    ["rafale", "达索 阵风", "双相共振", "76", "phaseHalo"],
    ["gripen", "JAS 39 鹰狮", "危险接近", "100", "leftRail"],
    ["su57", "苏霍伊 Su-57", "反应蓄能", "58", "leftAnchor"],
    ["j20", "歼-20 威龙", "协同火控", "74", "commandCrown"],
  ];
  const rigSignatures = new Set();
  for (const [fighterId, name, passive, mobility, signaturePart] of fighterExpectations) {
    await page.locator(`[data-fighter="${fighterId}"]`).click();
    await expect(page.locator("#selected-name")).toHaveText(name);
    await expect(page.locator("#selected-transform-name")).toHaveText(FIGHTERS[fighterId].transformation.label);
    await expect(page.locator("#selected-transform-duration")).toContainText(`${FIGHTERS[fighterId].assaultDuration.toFixed(1)} 秒`);
    await expect(page.locator("#selected-passive-name")).toHaveText(passive);
    await expect(page.locator("#agility-value")).toHaveText(mobility);
    await expect(page.locator("#fighter-reference-image")).toHaveAttribute("src", `/fighters/${fighterId}.webp`);
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
  expect(rigSignatures.size).toBe(8);

  for (const mode of ["flight", "transform", "assault", "tactical"]) {
    await page.locator(`[data-preview="${mode}"]`).click();
    await expect(page.locator(`[data-preview="${mode}"]`)).toHaveAttribute("aria-pressed", "true");
  }

  await page.locator('[data-fighter="f22"]').click();

  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).visual3d).toBe(true);

  const battlefield = await page.locator("#game-canvas").boundingBox();
  await page.evaluate((energy) => {
    window.__mouseStrikeQa.setTransformEnergy(energy);
    window.__mouseStrikeQa.toggleTransform();
  }, FIGHTERS.f22.transformThreshold - 1);
  await expect.poll(async () => (await snapshot(page)).transformTarget).toBe(0);
  await page.evaluate(() => window.__mouseStrikeQa.setTransformEnergy(100));

  if (testInfo.project.name === "mobile") await page.locator("#tool-button").click();
  else await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "left" });
  await expect.poll(async () => (await snapshot(page)).toolModeIndex).toBe(1);

  if (testInfo.project.name === "mobile") await page.locator("#transform-button").click();
  else await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "right" });
  await expect.poll(async () => (await snapshot(page)).transformProgress, { timeout: 8000 }).toBeGreaterThan(0.96);

  if (testInfo.project.name === "mobile") await page.locator("#tactical-button").click();
  else await page.keyboard.press("Space");
  await expect.poll(async () => (await snapshot(page)).tacticalCooldown).toBeGreaterThan(0);

  await page.evaluate(() => {
    window.__mouseStrikeQa.spawnBoss();
    window.__mouseStrikeQa.destroyBoss();
  });
  await expect(page.locator("#module-choice")).toBeVisible();
  await expect(page.locator('[data-module-slot="0"] strong')).toHaveText("多重锁定");
  await page.locator('[data-module-slot="0"]').click();
  await expect.poll(async () => (await snapshot(page)).modules).toContain("multi_lock");
  await expect.poll(async () => (await snapshot(page)).tacticalProjectileBonus).toBe(4);

  await page.screenshot({ path: `/tmp/mouse-strike-${testInfo.project.name}.png`, fullPage: true });
  await page.keyboard.press("q");
  await expect(page.locator("#menu-screen")).toBeVisible();
});

test("canvas fallback preserves the game loop", async ({ page }) => {
  await page.goto("/?qa=1&renderer=canvas");
  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).visual3d).toBe(false);
  await expect.poll(async () => (await snapshot(page)).bullets).toBeGreaterThan(0);
});
