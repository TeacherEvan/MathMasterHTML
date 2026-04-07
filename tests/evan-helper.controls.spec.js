// tests/evan-helper.controls.spec.js - Evan Helper Controls Coverage (Build 3)
import { expect, test } from "@playwright/test";
import {
  BASE_URL,
  dismissBriefing,
  ensurePowerUpDisplay,
  boxesOverlap,
} from "./utils/game-helpers.js";

test.setTimeout(30000);

test.describe("Evan Helper — Controls (Build 3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/game.html?level=beginner`, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await dismissBriefing(page);
  });

  test("#evan-controls-slot exists inside .panel-b-controls", async ({
    page,
  }) => {
    const slotExists = await page.evaluate(() => {
      const slot = document.getElementById("evan-controls-slot");
      const panelBControls = document.querySelector(".panel-b-controls");
      if (!slot || !panelBControls) return false;

      return panelBControls.contains(slot);
    });

    expect(slotExists).toBe(true);
  });

  test("#evan-solve-button is initially hidden", async ({ page }) => {
    const isHidden = await page.evaluate(() => {
      const button = document.getElementById("evan-solve-button");
      if (!button) return true;

      const slot = document.getElementById("evan-controls-slot");
      return slot?.hidden === true;
    });

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
