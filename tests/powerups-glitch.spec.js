import { expect, test } from "@playwright/test";

test.describe("HUD Power-Up Glitch Animation", () => {
  test("should apply glitch transform styles on powerUpActivated event", async ({
    page,
  }) => {
    await page.goto("/src/pages/game.html?level=beginner");

    // Wait for UI to initialize
    await page.waitForFunction(() => !!window.wormSystem?.powerUpSystem);

    // Add a spider powerup to inventory
    await page.evaluate(() => {
      window.wormSystem.powerUpSystem.inventory.spider = 1;
      window.wormSystem.powerUpSystem.updateDisplay();
    });

    const targetEl = page.locator('.power-up-item[data-type="spider"]');
    await expect(targetEl).toBeVisible();

    // Trigger the activation event
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("powerUpActivated", {
          detail: { type: "spider" },
        }),
      );
    });

    // The glitch inline styles should be injected within a very short timeframe
    // We expect transform to be added as inline style.
    await expect(targetEl).toHaveAttribute("style", /transform:/, {
      timeout: 150,
    });
  });

  test("should clean up styles after animation ends", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner");
    await page.waitForFunction(() => !!window.wormSystem?.powerUpSystem);

    // Add chain lightning
    await page.evaluate(() => {
      window.wormSystem.powerUpSystem.inventory.chainLightning = 1;
      window.wormSystem.powerUpSystem.updateDisplay();
    });

    const targetEl = page.locator('.power-up-item[data-type="chainLightning"]');

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("powerUpActivated", {
          detail: { type: "chainLightning" },
        }),
      );
    });

    // Animation takes 250ms, wait 400ms to ensure cleanup has completed
    await page.waitForTimeout(400);

    // Transform style override should be cleared
    const styleAttr = await targetEl.getAttribute("style");
    if (styleAttr) {
      expect(styleAttr).not.toContain("transform:");
    }
  });
});
