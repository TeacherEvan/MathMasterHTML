// tests/evan-helper.controls.spec.js - Evan Helper Controls Coverage (Build 3)
import { expect, test } from "@playwright/test";
import {
  dismissBriefing,
  ensurePowerUpDisplay,
  boxesOverlap,
} from "./utils/game-helpers.js";
import { resetOnboardingState } from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

async function ensureLandscapeViewport(page) {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width >= viewport.height) {
    return;
  }

  await page.setViewportSize({
    width: viewport.height,
    height: viewport.width,
  });
}

test.describe("Evan Helper — Controls (Build 3)", () => {
  test.beforeEach(async ({ page }) => {
    await ensureLandscapeViewport(page);
    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await dismissBriefing(page);
  });

  test("#evan-solve-button lives in Panel A beneath the lock", async ({
    page,
  }) => {
    const slotExists = await page.evaluate(() => {
      const slot = document.getElementById("evan-controls-slot");
      const panelA = document.getElementById("panel-a");
      const lockDisplay = document.getElementById("lock-display");
      if (!slot || !panelA || !lockDisplay) return false;

      if (!panelA.contains(slot)) return false;

      const lockRect = lockDisplay.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();

      return slotRect.top >= lockRect.bottom - 4;
    });

    expect(slotExists).toBe(true);
  });

  test("#evan-solve-button default visibility matches the startup policy", async ({
    page,
  }, testInfo) => {
    const isHidden = await page.evaluate(() => {
      const button = document.getElementById("evan-solve-button");
      if (!button) return true;

      const slot = document.getElementById("evan-controls-slot");
      return slot?.hidden === true;
    });

    if (testInfo.project.use?.isMobile === true) {
      expect(isHidden).toBe(false);
      await expect(page.locator("#evan-solve-button")).toBeVisible();
      return;
    }

    expect(isHidden).toBe(true);
  });

  test("#evan-solve-button becomes visible when showSolve() is called on the presenter", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.EvanPresenter?.showSolve();
    });

    const isVisible = await page.evaluate(() => {
      const slot = document.getElementById("evan-controls-slot");
      return slot?.hidden === false;
    });

    expect(isVisible).toBe(true);

    await expect(page.locator("#evan-solve-button")).toBeVisible();
  });

  test("manual solve keeps the stop control clear of the back button", async ({
    page,
  }) => {
    await page.evaluate(() => {
      window.EvanPresenter?.showSolve();
    });

    await page.click("#evan-solve-button");

    await expect(page.locator("#evan-stop-button")).toBeVisible();
    await expect(page.locator("#back-button")).toBeVisible();

    const layoutState = await page.evaluate(() => {
      const stopButton = document.getElementById("evan-stop-button");
      const backButton = document.getElementById("back-button");
      const shell = document.getElementById("evan-assist-shell");
      if (!stopButton || !backButton || !shell) return null;

      const stopRect = stopButton.getBoundingClientRect();
      const backRect = backButton.getBoundingClientRect();
      const shellHidden = shell.hasAttribute("hidden");

      return {
        shellHidden,
        overlaps: !(
          stopRect.right <= backRect.left ||
          stopRect.left >= backRect.right ||
          stopRect.bottom <= backRect.top ||
          stopRect.top >= backRect.bottom
        ),
      };
    });

    expect(layoutState).not.toBeNull();
    expect(layoutState.shellHidden).toBe(false);
    expect(layoutState.overlaps).toBe(false);
  });

  test("manual solve keeps the back button anchored on compact mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.use?.isMobile !== true,
      "Anchor-stability check runs on mobile projects only",
    );

    const backBefore = await page.locator("#back-button").boundingBox();
    expect(backBefore).toBeTruthy();

    await page.evaluate(() => {
      window.EvanPresenter?.showSolve();
    });

    await page.click("#evan-solve-button");
    await expect(page.locator("#evan-stop-button")).toBeVisible();

    const backAfter = await page.locator("#back-button").boundingBox();
    expect(backAfter).toBeTruthy();

    expect(Math.abs(backAfter.x - backBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(backAfter.y - backBefore.y)).toBeLessThanOrEqual(1);
  });

  test("#evan-controls-slot does not overlap #power-up-display on compact landscape", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.use?.isMobile !== true,
      "Compact landscape overlap test runs on mobile projects only",
    );

    await ensurePowerUpDisplay(page);

    await page.evaluate(() => {
      window.EvanPresenter?.showSolve();
    });

    const controlsBox = await page
      .locator("#evan-controls-slot")
      .boundingBox();
    const powerUpBox = await page.locator("#power-up-display").boundingBox();

    expect(controlsBox).toBeTruthy();
    expect(powerUpBox).toBeTruthy();

    const overlap = boxesOverlap(controlsBox, powerUpBox, 0);
    expect(overlap).toBe(false);
  });

  test("#evan-skip-button ID does not collide with existing #skip-button", async ({
    page,
  }) => {
    const evanSkipExists = await page.evaluate(() => {
      return Boolean(document.getElementById("evan-skip-button"));
    });
    expect(evanSkipExists).toBe(true);

    const skipButtonExists = await page.evaluate(() => {
      return Boolean(document.getElementById("skip-button"));
    });

    if (skipButtonExists) {
      const areDifferent = await page.evaluate(() => {
        const evanSkip = document.getElementById("evan-skip-button");
        const skip = document.getElementById("skip-button");
        return evanSkip !== skip;
      });

      expect(areDifferent).toBe(true);
    }
  });
});
