import { expect, test } from "@playwright/test";

test.describe("gameplay exit guard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }

      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        });
      }
    });
  });

  test("back button is blocked while gameplay is active and unresolved", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#how-to-play-modal")).toBeVisible();
    await page.locator("#start-game-btn").click();
    await page.waitForTimeout(1500);

    const beforeUrl = page.url();
    await page.click("#back-button");
    await page.waitForTimeout(400);

    await expect(page).toHaveURL(beforeUrl);
  });

  test("back button is restored after problemCompleted fires", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("#how-to-play-modal")).toBeVisible();
    await page.locator("#start-game-btn").click();
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PROBLEM_COMPLETED));
    });

    await page.click("#back-button");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/src\/pages\/game\.html/);
  });
});