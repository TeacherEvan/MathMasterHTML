import { expect, test } from "@playwright/test";

test.describe("gameplay exit guard", () => {
  test("back button is blocked while gameplay is active and unresolved", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await page.click("#start-game-btn");
    await page.waitForFunction(() => {
      const state = window.GameRuntimeCoordinator?.getState?.();
      return state?.briefingDismissed === true;
    });

    const beforeUrl = page.url();
    await page.click("#back-button");
    await page.waitForTimeout(400);

    await expect(page).toHaveURL(beforeUrl);
  });

  test("back button is restored after problemCompleted fires", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner&evan=off&preload=off", {
      waitUntil: "domcontentloaded",
    });

    await page.click("#start-game-btn");
    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PROBLEM_COMPLETED));
    });

    await page.click("#back-button");
    await page.waitForTimeout(400);
    await expect(page).not.toHaveURL(/src\/pages\/game\.html/);
  });
});