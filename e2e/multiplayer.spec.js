import { expect, test } from "@playwright/test";

test("two guests can enter a cooperative room and launch together", async ({ browser }) => {
  const host = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const guest = await browser.newPage({ viewport: { width: 1280, height: 800 } });
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
