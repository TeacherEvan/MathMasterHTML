// @ts-check
import { expect, test } from "@playwright/test";

test.describe("Worm behavior: aggression, targeting, and click rules", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForTimeout(600);

    await page.waitForFunction(
      () => window.wormSystem && window.wormSystem.isInitialized === true,
    );
  });

  test("worms immediately target revealed symbols", async ({ page }) => {
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => window.wormSystem && window.wormSystem.worms.length > 0,
    );

    const helpButton = page.locator("#help-button");
    await helpButton.click();
    await page.waitForTimeout(400);

    const wormState = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      return worm
        ? {
            isRushingToTarget: worm.isRushingToTarget,
            targetSymbol: worm.targetSymbol,
          }
        : null;
    });

    expect(wormState).toBeTruthy();
    expect(wormState?.isRushingToTarget).toBeTruthy();
    expect(wormState?.targetSymbol).toBeTruthy();
  });

  test("green worms require double click to kill", async ({ page }) => {
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(
      () => document.querySelectorAll(".worm-container").length > 0,
    );

    const wormElement = page.locator(".worm-container").first();
    await wormElement.click({ force: true });
    await page.waitForTimeout(200);

    const afterFirstClick = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      return worm
        ? { active: worm.active, escapeUntil: worm.escapeUntil }
        : null;
    });

    expect(afterFirstClick).toBeTruthy();
    expect(afterFirstClick?.active).toBeTruthy();
    expect(afterFirstClick?.escapeUntil).toBeGreaterThan(Date.now());

    await wormElement.click({ force: true });
    await page.waitForTimeout(400);

    const afterSecondClick = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => !w.isPurple);
      return worm ? worm.active : false;
    });

    expect(afterSecondClick).toBeFalsy();
  });
});
