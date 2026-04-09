import { expect, test } from "@playwright/test";

import { BASE_URL } from "./utils/game-helpers.js";

async function waitForBoundaryManager(page) {
  await expect
    .poll(async () => {
      return await page.evaluate(() => Boolean(window.UIBoundaryManager));
    })
    .toBe(true);
}

test.describe("UI Boundary Manager lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/game.html?level=beginner`, {
      waitUntil: "load",
      timeout: 30000,
    });

    await waitForBoundaryManager(page);
  });

  test("destroyed managers ignore display resolution events", async ({ page }) => {
    const resizeCalls = await page.evaluate(async () => {
      const eventName =
        window.GameEvents?.DISPLAY_RESOLUTION_CHANGED ||
        "displayResolutionChanged";
      let calls = 0;

      class InstrumentedBoundaryManager extends window.UIBoundaryManager {
        _onResize() {
          calls += 1;
        }
      }

      const manager = new InstrumentedBoundaryManager({
        autoReposition: false,
        enablePeriodic: false,
      });

      manager.destroy();
      document.dispatchEvent(new CustomEvent(eventName));
      await Promise.resolve();

      return calls;
    });

    expect(resizeCalls).toBe(0);
  });

  test("destroyed managers ignore orientation changes", async ({ page }) => {
    const resizeCalls = await page.evaluate(async () => {
      let calls = 0;

      class InstrumentedBoundaryManager extends window.UIBoundaryManager {
        _onResize() {
          calls += 1;
        }
      }

      const manager = new InstrumentedBoundaryManager({
        autoReposition: false,
        enablePeriodic: false,
      });

      manager.destroy();
      window.dispatchEvent(new Event("orientationchange"));
      await new Promise((resolve) => window.setTimeout(resolve, 150));

      return calls;
    });

    expect(resizeCalls).toBe(0);
  });
});
