import { expect, test } from "@playwright/test";

test.setTimeout(60_000);

async function snapshot(page) {
  return page.evaluate(() => window.__mouseStrikeQa.snapshot());
}

test("hangar and combat remain usable", async ({ page }, testInfo) => {
  await page.goto("/?qa=1");
  await expect(page.locator("#fighter-preview")).toBeVisible();
  await expect(page.locator("#start-button")).toBeVisible();
  const viewportWidth = await page.locator("body").evaluate((body) => body.clientWidth);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewportWidth);

  const fighterExpectations = [
    ["f22", "F-22 Raptor", "幽灵标记", "96"],
    ["typhoon", "Eurofighter Typhoon", "风暴贯穿", "84"],
    ["rafale", "Dassault Rafale", "双相共振", "76"],
    ["gripen", "JAS 39 Gripen", "危险接近", "100"],
    ["su57", "Sukhoi Su-57", "反应蓄能", "58"],
    ["j20", "Chengdu J-20", "协同火控", "74"],
  ];
  for (const [fighterId, name, passive, mobility] of fighterExpectations) {
    await page.locator(`[data-fighter="${fighterId}"]`).click();
    await expect(page.locator("#selected-name")).toHaveText(name);
    await expect(page.locator("#selected-passive-name")).toHaveText(passive);
    await expect(page.locator("#agility-value")).toHaveText(mobility);
  }

  for (const mode of ["flight", "transform", "assault", "tactical"]) {
    await page.locator(`[data-preview="${mode}"]`).click();
    await expect(page.locator(`[data-preview="${mode}"]`)).toHaveAttribute("aria-pressed", "true");
  }

  await page.locator('[data-fighter="f22"]').click();

  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).visual3d).toBe(true);

  if (testInfo.project.name === "mobile") {
    await page.locator("#transform-button").click();
  } else {
    const battlefield = await page.locator("#game-canvas").boundingBox();
    await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "left" });
  }
  await expect.poll(async () => (await snapshot(page)).transformProgress, { timeout: 8000 }).toBeGreaterThan(0.96);

  if (testInfo.project.name === "mobile") {
    await page.locator("#tactical-button").click();
  } else {
    const battlefield = await page.locator("#game-canvas").boundingBox();
    await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "right" });
  }
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
