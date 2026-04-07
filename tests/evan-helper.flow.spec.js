// tests/evan-helper.flow.spec.js
import { expect, test } from "@playwright/test";
import {
  resetOnboardingState,
  seedOnboardingState,
} from "./utils/onboarding-runtime.js";

test.setTimeout(45000);

function consumedState() {
  return {
    version: 1,
    sessionCount: 5,
    evanConsumed: { beginner: true, warrior: false, master: false },
    installPromptDismissedAt: null,
    updatedAt: Date.now(),
  };
}

async function dismissBriefing(page) {
  await page.waitForSelector("#start-game-btn", {
    state: "visible",
    timeout: 10000,
  });
  await page.click("#start-game-btn");
}

test.describe("Evan Flow Controller — Build 4", () => {
  test("first visit — EVAN_HELP_STARTED dispatched after briefing", async ({
    page,
  }) => {
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");
    await page.evaluate(() => {
      window.__evanStarted = false;
      document.addEventListener(
        window.GameEvents.EVAN_HELP_STARTED,
        () => {
          window.__evanStarted = true;
        },
        { once: true },
      );
    });

    await dismissBriefing(page);
    await page.waitForFunction(() => window.__evanStarted === true, {
      timeout: 8000,
    });

    expect(await page.evaluate(() => window.__evanStarted)).toBe(true);
  });

  test("?evan=off — EVAN_HELP_STARTED never dispatched", async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
    await page.evaluate(() => {
      window.__evanStarted = false;
      document.addEventListener(
        window.GameEvents.EVAN_HELP_STARTED,
        () => {
          window.__evanStarted = true;
        },
        { once: true },
      );
    });

    await dismissBriefing(page);
    await page.waitForTimeout(2000);

    expect(await page.evaluate(() => window.__evanStarted)).toBe(false);
  });

  test("?evan=force — dispatched even when consumed", async ({ page }) => {
    await seedOnboardingState(
      page,
      consumedState(),
      "?level=beginner&evan=force&preload=off",
    );
    await page.evaluate(() => {
      window.__evanStarted = false;
      document.addEventListener(
        window.GameEvents.EVAN_HELP_STARTED,
        () => {
          window.__evanStarted = true;
        },
        { once: true },
      );
    });

    await dismissBriefing(page);
    await page.waitForFunction(() => window.__evanStarted === true, {
      timeout: 8000,
    });

    expect(await page.evaluate(() => window.__evanStarted)).toBe(true);
  });

  test("skip dispatches EVAN_HELP_STOPPED with reason skip", async ({
    page,
  }) => {
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");
    await page.evaluate(() => {
      window.__evanStopReason = null;
      document.addEventListener(
        window.GameEvents.EVAN_HELP_STOPPED,
        (e) => {
          window.__evanStopReason = e.detail?.reason;
        },
        { once: true },
      );
    });

    await dismissBriefing(page);
    await page.waitForFunction(
      () => {
        const btn = document.getElementById("evan-skip-button");
        return btn && !btn.hidden;
      },
      { timeout: 8000 },
    );
    await page.click("#evan-skip-button");
    await page.waitForFunction(() => window.__evanStopReason !== null, {
      timeout: 5000,
    });

    expect(await page.evaluate(() => window.__evanStopReason)).toBe("skip");
  });

  test("after skip, consumed state persists", async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");

    await dismissBriefing(page);
    await page.waitForFunction(
      () => {
        const btn = document.getElementById("evan-skip-button");
        return btn && !btn.hidden;
      },
      { timeout: 8000 },
    );
    await page.click("#evan-skip-button");
    await page.waitForTimeout(500);

    const consumed = await page.evaluate(
      () => window.GameOnboardingStorage.getState().evanConsumed.beginner,
    );
    expect(consumed).toBe(true);
  });

  test("after intro consumed, solve button is visible without auto-start", async ({
    page,
  }) => {
    await seedOnboardingState(
      page,
      consumedState(),
      "?level=beginner&evan=auto&preload=off",
    );
    await page.evaluate(() => {
      window.__evanStarted = false;
      document.addEventListener(
        window.GameEvents.EVAN_HELP_STARTED,
        () => {
          window.__evanStarted = true;
        },
        { once: true },
      );
    });

    await dismissBriefing(page);
    await page.waitForFunction(
      () => {
        const slot = document.getElementById("evan-controls-slot");
        return slot && !slot.hidden;
      },
      { timeout: 8000 },
    );

    expect(await page.evaluate(() => window.__evanStarted)).toBe(false);
    await expect(page.locator("#evan-controls-slot")).toBeVisible();
  });

  test("clicking solve dispatches EVAN_HELP_STARTED with mode manual", async ({
    page,
  }) => {
    await seedOnboardingState(
      page,
      consumedState(),
      "?level=beginner&evan=auto&preload=off",
    );
    await page.evaluate(() => {
      window.__evanStartMode = null;
      document.addEventListener(
        window.GameEvents.EVAN_HELP_STARTED,
        (e) => {
          window.__evanStartMode = e.detail?.mode;
        },
        { once: true },
      );
    });

    await dismissBriefing(page);
    await page.waitForFunction(
      () => {
        const slot = document.getElementById("evan-controls-slot");
        return slot && !slot.hidden;
      },
      { timeout: 8000 },
    );
    await page.click("#evan-solve-button");
    await page.waitForFunction(() => window.__evanStartMode !== null, {
      timeout: 5000,
    });

    expect(await page.evaluate(() => window.__evanStartMode)).toBe("manual");
  });
});
