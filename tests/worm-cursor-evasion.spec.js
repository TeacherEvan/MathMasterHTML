// @ts-check
import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
  stopEvanHelpIfActive,
} from "./utils/onboarding-runtime.js";

test.describe("Worm cursor evasion", () => {
  test.beforeEach(async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await stopEvanHelpIfActive(page);

    await page.waitForFunction(
      () => window.wormSystem && window.wormSystem.isInitialized === true,
    );
  });

  test("worms move away from cursor threat", async ({ page }) => {
    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent("problemLineCompleted", { detail: { line: 1 } }),
      );
    });

    await page.waitForFunction(() => window.wormSystem.worms.length > 0);

    const initial = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      return worm ? { x: worm.x, y: worm.y } : null;
    });

    expect(initial).toBeTruthy();

    await page.evaluate((wormPos) => {
      document.dispatchEvent(
        new CustomEvent("wormCursorUpdate", {
          detail: {
            x: wormPos.x + 10,
            y: wormPos.y + 10,
            isActive: true,
            pointerType: "mouse",
            lastUpdate: performance.now(),
            lastTap: performance.now(),
          },
        }),
      );
    }, initial);

    await page.waitForTimeout(200);

    const after = await page.evaluate(() => {
      const worm = window.wormSystem.worms.find((w) => w.active && !w.isPurple);
      return worm ? { x: worm.x, y: worm.y } : null;
    });

    expect(after).toBeTruthy();

    const initialDistance = Math.hypot(
      initial.x - (initial.x + 10),
      initial.y - (initial.y + 10),
    );
    const newDistance = Math.hypot(
      after.x - (initial.x + 10),
      after.y - (initial.y + 10),
    );

    expect(newDistance).toBeGreaterThan(initialDistance);
  });
});
