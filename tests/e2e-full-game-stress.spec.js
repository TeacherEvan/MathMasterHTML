// @ts-check
import { expect, test } from "@playwright/test";

const LEVELS = ["beginner", "warrior", "master"];

async function bootLevel(page, level) {
  await page.goto(`/game.html?level=${level}`, {
    waitUntil: "domcontentloaded",
  });
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

async function pressPowerUp(page, type) {
  await page
    .locator(`[data-testid="powerup-${type}"]`)
    .dispatchEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      button: 0,
      isPrimary: true,
      pointerType: "mouse",
    });
}

for (const level of LEVELS) {
  test.describe(`Bounded stress: ${level}`, () => {
    test(`handles rapid back-to-back interactions on ${level}`, async ({
      page,
    }) => {
      test.slow();
      await bootLevel(page, level);

      await page.evaluate(() => {
        const system = window.wormSystem?.powerUpSystem;
        if (system) {
          system.inventory.chainLightning = 3;
          system.inventory.spider = 2;
          system.inventory.devil = 2;
          system.updateDisplay();
        }
      });

      for (let burst = 0; burst < 2; burst++) {
        await page.click("#help-button");
      }

      await page.evaluate(() => {
        for (let i = 0; i < 2; i++) {
          document.dispatchEvent(
            new CustomEvent("problemLineCompleted", {
              detail: { line: i + 1 },
            }),
          );
        }
        document.dispatchEvent(new CustomEvent("purpleWormTriggered"));
      });

      await page.waitForFunction(
        () => window.wormSystem?.worms.some((worm) => worm.active),
        { timeout: 5000 },
      );

      await pressPowerUp(page, "chainLightning");
      await page.locator("#solution-container").click({ force: true });

      await page.evaluate(() => {
        const worms = window.wormSystem?.worms || [];
        const toTap = worms.filter((worm) => worm.active).slice(0, 4);
        for (const worm of toTap) {
          if (!worm.element) continue;
          const evt =
            typeof PointerEvent === "function"
              ? new PointerEvent("pointerdown", {
                  bubbles: true,
                  cancelable: true,
                })
              : new Event("pointerdown", { bubbles: true, cancelable: true });
          worm.element.dispatchEvent(evt);
        }
      });

      const invariants = await page.evaluate(() => {
        const score = Number.parseInt(
          document.getElementById("score-value")?.textContent || "0",
          10,
        );
        const worms = window.wormSystem?.worms || [];
        return {
          scoreFinite: Number.isFinite(score),
          scoreNonNegative: Number.isFinite(score) && score >= 0,
          initialized: window.wormSystem?.isInitialized === true,
          activeWorms: worms.filter((worm) => worm.active).length,
          hasPanels:
            !!document.getElementById("panel-a") &&
            !!document.getElementById("panel-b") &&
            !!document.getElementById("panel-c"),
        };
      });

      expect(invariants.initialized).toBe(true);
      expect(invariants.hasPanels).toBe(true);
      expect(invariants.scoreFinite).toBe(true);
      expect(invariants.scoreNonNegative).toBe(true);
      expect(invariants.activeWorms).toBeGreaterThanOrEqual(0);
    });
  });
}
