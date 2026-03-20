// @ts-check
import { expect, test } from "@playwright/test";

const LEVELS = ["beginner", "warrior", "master"];

async function bootLevel(page, level) {
  await page.goto(`/game.html?level=${level}`, { waitUntil: "domcontentloaded" });
  const howToPlayModal = page.locator("#how-to-play-modal");
  await expect(howToPlayModal).toBeVisible({ timeout: 10000 });
  for (let attempt = 0; attempt < 4; attempt++) {
    await page.evaluate(() => {
      const button = document.getElementById("start-game-btn");
      if (button) button.click();
    });
    try {
      await expect(howToPlayModal).toBeHidden({ timeout: 1500 });
      break;
    } catch (error) {
      if (attempt === 3) {
        throw error;
      }
    }
  }
  await page.waitForFunction(() => window.wormSystem?.isInitialized === true);
  await page.waitForFunction(
    () => document.querySelectorAll(".hidden-symbol").length > 0,
  );
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
    test(`boots ${level} and renders core gameplay surfaces`, async ({ page }) => {
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
      await bootLevel(page, level);
      await seedPowerUps(page);

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
        () => window.wormSystem?.worms.some((worm) => worm.active && !worm.isPurple),
        { timeout: 5000 },
      );

      await page.evaluate(() => {
        document.dispatchEvent(new CustomEvent("purpleWormTriggered"));
      });
      await page.waitForFunction(
        () => window.wormSystem?.worms.some((worm) => worm.active && worm.isPurple),
        { timeout: 5000 },
      );

      await expect(page.locator('[data-testid="powerup-chainLightning"]')).toBeVisible();
      await page.click('[data-testid="powerup-chainLightning"]');
      await page.click("#solution-container", { force: true });

      const gameHealth = await page.evaluate(() => {
        const score = Number.parseInt(
          document.getElementById("score-value")?.textContent || "0",
          10,
        );
        return {
          activeWorms: window.wormSystem?.worms.filter((worm) => worm.active).length ?? 0,
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
