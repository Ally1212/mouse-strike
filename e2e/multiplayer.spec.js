import { expect, test } from "@playwright/test";

test("two guests can enter a cooperative room and launch together", async ({ browser }) => {
  const host = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const guest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  host.on("pageerror", (error) => pageErrors.push(error.message));
  guest.on("pageerror", (error) => pageErrors.push(error.message));
  await Promise.all([host.goto("/?renderer=canvas"), guest.goto("/?renderer=canvas")]);

  await host.locator("#multiplayer-button").click();
  await host.locator("#multiplayer-nickname").fill("房主");
  await host.locator("#multiplayer-create").click();
  await expect(host.locator("#multiplayer-lobby")).toBeVisible();
  const roomCode = await host.locator("#multiplayer-room-value").textContent();

  await guest.locator("#multiplayer-button").click();
  await guest.locator("#multiplayer-nickname").fill("队友");
  await guest.locator("#multiplayer-room-code").fill(roomCode || "");
  await guest.locator("#multiplayer-join").click();
  await expect(guest.locator("#multiplayer-lobby")).toBeVisible();

  await host.locator("#multiplayer-ready").click();
  await guest.locator("#multiplayer-ready").click();
  await expect(host.locator("#game-screen")).toBeVisible();
  await expect(host.locator("#multiplayer-hud")).toBeVisible();
  await expect(host.locator("#multiplayer-friend-hud")).toContainText("队友");
  await expect.poll(() => pageErrors).toEqual([]);
  await host.close();
  await guest.close();
});

test("duel workshop rejects the hero fighter and exposes configured rounds", async ({ page }) => {
  await page.goto("/?renderer=canvas");
  await page.locator("#multiplayer-button").click();
  await page.locator('[data-multiplayer-mode="duel"]').click();
  await expect(page.locator("#duel-workshop")).toBeVisible();
  await expect(page.locator('#multiplayer-fighter option[value="hypersonic"]')).toHaveCount(0);
  await page.locator("#duel-rounds").selectOption("5");
  await expect(page.locator("#duel-rounds")).toHaveValue("5");
});

test("invite link pre-fills a room code and share action is available", async ({ page }) => {
  await page.goto("/?renderer=canvas&room=ab2cd");
  await page.locator("#multiplayer-button").click();
  await expect(page.locator("#multiplayer-room-code")).toHaveValue("AB2CD");
  await page.locator("#multiplayer-nickname").fill("邀请测试");
  await page.locator("#multiplayer-create").click();
  await expect(page.locator("#multiplayer-share")).toBeVisible();
  await expect(page.locator("#multiplayer-room-name")).not.toBeEmpty();
});

test("first-time multiplayer guide can be dismissed and remembered", async ({ page }) => {
  await page.goto("/?renderer=canvas");
  await page.evaluate(() => localStorage.removeItem("mouse-strike-online-onboarded"));
  await page.reload();
  await page.locator("#multiplayer-button").click();
  await expect(page.locator("#multiplayer-onboarding")).toBeVisible();
  await page.locator("#multiplayer-onboarding-close").click();
  await expect(page.locator("#multiplayer-onboarding")).toBeHidden();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("mouse-strike-online-onboarded"))).toBe("1");
});

test("a finished duel keeps the room for a rematch", async ({ browser }, testInfo) => {
  test.skip(testInfo.project.name === "mobile", "desktop flow covers the shared room lifecycle");
  test.setTimeout(40_000);
  const host = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const guest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await Promise.all([host.goto("/?renderer=canvas"), guest.goto("/?renderer=canvas")]);
  await host.locator("#multiplayer-button").click();
  await host.locator('[data-multiplayer-mode="duel"]').click();
  await host.locator("#duel-rounds").selectOption("1");
  await host.locator("#duel-health").selectOption("75");
  await host.locator("#multiplayer-nickname").fill("房主");
  await host.locator("#multiplayer-create").click();
  await expect(host.locator("#multiplayer-lobby")).toBeVisible();
  const roomCode = await host.locator("#multiplayer-room-value").textContent();
  await guest.locator("#multiplayer-button").click();
  await guest.locator('[data-multiplayer-mode="duel"]').click();
  await guest.locator("#multiplayer-nickname").fill("对手");
  await guest.locator("#multiplayer-room-code").fill(roomCode || "");
  await guest.locator("#multiplayer-join").click();
  await expect(guest.locator("#multiplayer-lobby")).toBeVisible();
  await expect(host.locator("#multiplayer-ready")).toBeEnabled();
  await host.locator("#multiplayer-ready").click();
  await guest.locator("#multiplayer-ready").click();
  await expect(host.locator("#game-screen")).toBeVisible();
  await Promise.all([host.mouse.move(280, 620), guest.mouse.move(1000, 620)]);
  await expect(host.locator("#game-over")).toBeVisible({ timeout: 25_000 });
  await expect(host.locator("#restart-button")).toHaveText("原规则再来一局");
  await host.locator("#restart-button").click();
  await expect(host.locator("#multiplayer-lobby")).toBeVisible();
  await expect(host.locator("#pilot-card")).toContainText("联机 1 局");
  await host.close(); await guest.close();
});
