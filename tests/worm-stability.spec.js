import { expect, test } from "@playwright/test";

test.describe("Worm movement stability guards", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });

    await page.waitForFunction(
      () => window.wormSystem && window.wormSystem.isInitialized === true,
    );
  });

  test("cursor evasion defers while click-escape burst is active", async ({
    page,
  }) => {
    const handledByEvasion = await page.evaluate(() => {
      const worm = {
        hasStolen: false,
        x: 200,
        y: 200,
        baseSpeed: 2,
        escapeUntil: Date.now() + 5000,
        escapeVector: { x: 1, y: 0 },
      };

      window.wormSystem.cursorState = { x: 210, y: 210, isActive: true };

      return window.wormSystem._updateWormEvadingCursor(worm, 1280, 720);
    });

    expect(handledByEvasion).toBe(false);
  });

  test("removeWorm clears animation loop when last worm is removed", async ({
    page,
  }) => {
    const result = await page.evaluate(() => {
      const worm = {
        id: "test-worm",
        fromConsole: false,
        element: document.createElement("div"),
      };

      document.body.appendChild(worm.element);
      window.wormSystem.worms = [worm];
      window.wormSystem.animationFrameId = requestAnimationFrame(() => {});

      window.wormSystem.removeWorm(worm);

      return {
        worms: window.wormSystem.worms.length,
        animationFrameId: window.wormSystem.animationFrameId,
      };
    });

    expect(result.worms).toBe(0);
    expect(result.animationFrameId).toBeNull();
  });
});
