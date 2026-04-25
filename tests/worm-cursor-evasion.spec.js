// @ts-check
import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
  stopEvanHelpIfActive,
  waitForEvanToStayInactive,
} from "./utils/onboarding-runtime.js";

test.describe("Worm cursor evasion", () => {
  test.beforeEach(async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await stopEvanHelpIfActive(page);

    await page.waitForFunction(
      () => window.wormSystem && window.wormSystem.isInitialized === true,
    );
    await waitForEvanToStayInactive(page);
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
      return worm ? { id: worm.id, x: worm.x, y: worm.y } : null;
    });

    expect(initial).toBeTruthy();

    const threatPoint = {
      x: initial.x + 10,
      y: initial.y + 10,
    };

    await page.evaluate((point) => {
      document.dispatchEvent(
        new CustomEvent("wormCursorUpdate", {
          detail: {
            x: point.x,
            y: point.y,
            isActive: true,
            pointerType: "mouse",
            lastUpdate: performance.now(),
            lastTap: performance.now(),
          },
        }),
      );
    }, threatPoint);

    await page.waitForFunction(
      ({ wormId, threatX, threatY, minimumDistance }) => {
        const worm = window.wormSystem.worms.find((w) => w.id === wormId);
        if (!worm || !worm.active) {
          return false;
        }

        return (
          Math.hypot(worm.x - threatX, worm.y - threatY) > minimumDistance
        );
      },
      {
        wormId: initial.id,
        threatX: threatPoint.x,
        threatY: threatPoint.y,
        minimumDistance: Math.hypot(
          initial.x - threatPoint.x,
          initial.y - threatPoint.y,
        ),
      },
      { timeout: 3000 },
    );

    const after = await page.evaluate((wormId) => {
      const worm = window.wormSystem.worms.find((w) => w.id === wormId);
      return worm && worm.active ? { x: worm.x, y: worm.y } : null;
    }, initial.id);

    expect(after).toBeTruthy();

    const initialDistance = Math.hypot(
      initial.x - threatPoint.x,
      initial.y - threatPoint.y,
    );
    const newDistance = Math.hypot(
      after.x - threatPoint.x,
      after.y - threatPoint.y,
    );

    expect(newDistance).toBeGreaterThan(initialDistance);
  });
});
