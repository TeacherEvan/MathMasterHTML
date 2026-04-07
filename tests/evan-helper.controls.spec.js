// tests/evan-helper.controls.spec.js
import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

function boxesOverlap(boxA, boxB) {
  if (!boxA || !boxB) return false;
  return !(
    boxA.x + boxA.width <= boxB.x ||
    boxB.x + boxB.width <= boxA.x ||
    boxA.y + boxA.height <= boxB.y ||
    boxB.y + boxB.height <= boxA.y
  );
}

async function ensurePowerUpDisplay(page) {
  await page.click("#start-game-btn");
  await page.waitForFunction(
    () => !!window.wormSystem?.powerUpSystem?.updateDisplay,
    { timeout: 15000 },
  );
  await page.evaluate(() => {
    const sys = window.wormSystem.powerUpSystem;
    if (sys?.inventory) {
      sys.inventory.chainLightning = 1;
      sys.updateDisplay?.();
    }
    window.EvanPresenter?.showSolve?.();
  });
  await expect(page.locator("#power-up-display")).toBeVisible();
  await expect(page.locator("#evan-controls-slot")).toBeVisible();
}

test.describe("Evan Helper Controls — Build 3", () => {
  test.beforeEach(async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner&evan=off&preload=off");
  });

  test("#evan-controls-slot exists inside .panel-b-controls", async ({
    page,
  }) => {
    await expect(page.locator(".panel-b-controls #evan-controls-slot")).toBeAttached();
  });

  test("#evan-solve-button is initially hidden", async ({ page }) => {
    await expect(page.locator("#evan-controls-slot")).toHaveAttribute(
      "hidden",
      "",
    );
    await expect(page.locator("#evan-solve-button")).toBeAttached();
  });

  test("#evan-solve-button becomes visible when showSolve is called", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.EvanPresenter?.showSolve?.();
    });

    await expect(page.locator("#evan-controls-slot")).toBeVisible();
    await expect(page.locator("#evan-solve-button")).toBeVisible();
  });

  test("#evan-controls-slot does not overlap #power-up-display on compact landscape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => {
      window.dispatchEvent(new Event("resize"));
    });

    await ensurePowerUpDisplay(page);

    const slotBox = await page.locator("#evan-controls-slot").boundingBox();
    const powerUpBox = await page.locator("#power-up-display").boundingBox();
    expect(boxesOverlap(slotBox, powerUpBox)).toBe(false);
  });

  test("#evan-skip-button ID does not collide with #skip-button", async ({
    page,
  }) => {
    const skipButtons = await page.evaluate(() => {
      const evanSkip = document.getElementById("evan-skip-button");
      const otherSkip = document.getElementById("skip-button");
      return {
        evanSkipExists: !!evanSkip,
        otherSkipExists: !!otherSkip,
        areSameElement: evanSkip && otherSkip ? evanSkip === otherSkip : false,
      };
    });

    expect(skipButtons.evanSkipExists).toBe(true);
    expect(skipButtons.areSameElement).toBe(false);
  });
});
