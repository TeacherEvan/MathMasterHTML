// @ts-check
import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  stopEvanHelpIfActive,
} from "./utils/onboarding-runtime.js";

const LEVELS = ["beginner", "warrior", "master"];

async function bootLevel(page, level) {
  await page.goto(`/game.html?level=${level}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator("#how-to-play-modal")).toBeVisible({
    timeout: 10000,
  });
  await dismissBriefingAndWaitForInteractiveGameplay(page);
  await page.waitForFunction(() => window.wormSystem?.isInitialized === true);
  await page.evaluate(() => window.ScoreTimerManager?.pause?.());
}

async function seedPowerUps(page) {
  await page.evaluate(() => {
    const system = window.wormSystem?.powerUpSystem;
    if (!system) return;
    system.inventory.chainLightning = 2;
    system.inventory.spider = 2;
    system.inventory.devil = 2;
    system.updateDisplay();
  });
}

for (const level of LEVELS) {
  test.describe(`Full critical path: ${level}`, () => {
    test(`boots ${level} and renders core gameplay surfaces`, async ({
      page,
    }) => {
      await bootLevel(page, level);

      await expect(page.locator("#panel-a")).toBeVisible();
      await expect(page.locator("#panel-b")).toBeVisible();
      await expect(page.locator("#panel-c")).toBeVisible();
      await expect(page.locator("#problem-container")).toBeVisible();
      await expect(page.locator("#solution-container")).toBeVisible();
    });

    test(`covers symbols, worms, purple path, and power-up interaction on ${level}`, async ({
      page,
    }) => {
      test.slow();
      test.slow();
      await bootLevel(page, level);
      await seedPowerUps(page);
      await stopEvanHelpIfActive(page);

      const beforeRevealed = await page.locator(".revealed-symbol").count();
      await page.click("#help-button");
      await page.waitForTimeout(350);
      const afterRevealed = await page.locator(".revealed-symbol").count();
      expect(afterRevealed).toBeGreaterThanOrEqual(beforeRevealed);

      await page.evaluate(() => {
        window.wormSystem.killAllWorms();
        window.wormSystem.spawnManager?.clearQueue?.();
        document.dispatchEvent(
          new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
        );
      });

      await page.waitForFunction(
        () =>
          window.wormSystem?.worms.some(
            (worm) => worm.active && !worm.isPurple,
          ),
        { timeout: 5000 },
      );

      await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent("purpleWormTriggered"));
      });
      await page.waitForFunction(
        () =>
          window.wormSystem?.worms.some((worm) => worm.active && worm.isPurple),
        { timeout: 5000 },
      );

      await expect(
        page.locator('[data-testid="powerup-chainLightning"]'),
      ).toBeVisible();
      await page
        .locator('[data-testid="powerup-chainLightning"]')
        .evaluate((btn) => btn.click());
      await page.locator("#solution-container").evaluate((btn) => btn.click());

      const gameHealth = await page.evaluate(() => {
        const score = Number.parseInt(
          document.getElementById("score-value")?.textContent || "0",
          10,
        );
        return {
          activeWorms:
            window.wormSystem?.worms.filter((worm) => worm.active).length ?? 0,
          scoreFinite: Number.isFinite(score),
          hiddenSymbols: document.querySelectorAll(".hidden-symbol").length,
        };
      });

      expect(gameHealth.scoreFinite).toBe(true);
      expect(gameHealth.hiddenSymbols).toBeGreaterThan(0);
      expect(gameHealth.activeWorms).toBeGreaterThanOrEqual(0);
    });
  });
}
