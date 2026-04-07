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
    await page.waitForTimeout(500);
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

  test("auto Evan run blocks user input except skip", async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");
    await dismissBriefing(page);
    await page.waitForFunction(
      () => {
        const btn = document.getElementById("evan-skip-button");
        return btn && !btn.hidden && document.body.classList.contains("evan-input-locked");
      },
      { timeout: 8000 },
    );

    await page.evaluate(() => {
      window.__evanHelpClicks = 0;
      window.__evanSymbolClicks = 0;
      document.getElementById("help-button")?.addEventListener("click", () => {
        window.__evanHelpClicks++;
      });
      if (window.consoleManager) {
        window.consoleManager.slots[0] = "x";
      }
      document.addEventListener("keydown", () => {
        /* test probe only */
      });
      document.addEventListener(window.GameEvents.SYMBOL_CLICKED, () => {
        window.__evanSymbolClicks++;
      });
    });

    const helpBox = await page.locator("#help-button").boundingBox();
    expect(helpBox).toBeTruthy();
    await page.mouse.click(helpBox.x + helpBox.width / 2, helpBox.y + helpBox.height / 2);
    await page.keyboard.press("1");
    await page.waitForTimeout(200);

    const blockedState = await page.evaluate(() => ({
      helpClicks: window.__evanHelpClicks,
      symbolClicks: window.__evanSymbolClicks,
      activeElementId: document.activeElement?.id || null,
    }));

    expect(blockedState.helpClicks).toBe(0);
    expect(blockedState.symbolClicks).toBe(0);
    expect(blockedState.activeElementId).toBe("evan-skip-button");

    await page.click("#evan-skip-button");
    await page.waitForFunction(
      () => !document.body.classList.contains("evan-input-locked"),
      { timeout: 5000 },
    );
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
    expect(
      await page.evaluate(
        () => window.GameOnboardingStorage.getState().evanConsumed.beginner,
      ),
    ).toBe(true);
  });
});
