import { expect, test } from "@playwright/test";

async function snapshot(page) {
  return page.evaluate(() => window.__mouseStrikeQa.snapshot());
}

test("hangar and combat remain usable", async ({ page }, testInfo) => {
  await page.goto("/?qa=1");
  await expect(page.locator("#fighter-preview")).toBeVisible();
  await expect(page.locator("#start-button")).toBeVisible();
  const viewportWidth = await page.locator("body").evaluate((body) => body.clientWidth);
  await expect(page.locator("body")).toHaveJSProperty("scrollWidth", viewportWidth);

  await page.locator("#start-button").click();
  await expect.poll(async () => (await snapshot(page)).running).toBe(true);
  await expect.poll(async () => (await snapshot(page)).visual3d).toBe(true);

  if (testInfo.project.name === "mobile") {
    await page.locator("#transform-button").click();
  } else {
    const battlefield = await page.locator("#game-canvas").boundingBox();
    await page.mouse.click(battlefield.x + battlefield.width / 2, battlefield.y + battlefield.height * 0.72, { button: "left" });
  }
  await expect.poll(async () => (await snapshot(page)).transformProgress, { timeout: 3000 }).toBeGreaterThan(0.96);

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
  await page.locator('[data-module="power"]').click();
  await expect.poll(async () => (await snapshot(page)).modules).toContain("power");

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
