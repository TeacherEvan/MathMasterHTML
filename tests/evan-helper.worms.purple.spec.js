// tests/evan-helper.worms.purple.spec.js
import { expect, test } from "@playwright/test";
import { installRectTarget } from "./utils/evan-target-fixtures.js";
import { resetOnboardingState } from "./utils/onboarding-runtime.js";

test.setTimeout(60000);

test.describe("Evan Purple Worm Guardrails — Build 6", () => {
  test.beforeEach(async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
    await page.waitForSelector("#start-game-btn", {
      state: "visible",
      timeout: 10000,
    });
  });

  test("Evan does not directly click .purple-worm elements", async ({
    page,
  }) => {
    await installRectTarget(page, "purple-worm");
    await installRectTarget(page, "symbol", "x");
    await page.evaluate(() => {
      const purple = document.querySelector('[data-test-target="purple-worm"]');
      purple.classList.add("purple-worm");
      purple.closest?.(".worm-container")?.classList.add("purple-worm");
      window.__purpleTouches = 0;
      purple.addEventListener("pointerdown", () => {
        window.__purpleTouches++;
      });
      purple.addEventListener("click", () => {
        window.__purpleTouches++;
      });

      const symbol = document.querySelector('[data-test-target="symbol"]');
      window.EvanTargets.findGreenWormSegment = () => null;
      window.EvanTargets.findMuffinReward = () => null;
      window.EvanTargets.getNeededSymbol = () => "x";
      window.EvanTargets.findFallingSymbol = () => symbol;
    });

    await page.click("#start-game-btn");
    await page.waitForFunction(
      () => document.body.classList.contains("evan-help-active"),
      { timeout: 5000 },
    );
    await page.waitForTimeout(1000);

    expect(await page.evaluate(() => window.__purpleTouches)).toBe(0);
  });
});
