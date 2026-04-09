// tests/evan-helper.flow.spec.js
import { expect, test } from "@playwright/test";
import {
  resetOnboardingState,
  seedOnboardingState,
} from "./utils/onboarding-runtime.js";

test.setTimeout(45000);

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
  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      return !modal || window.getComputedStyle(modal).display === "none";
    },
    { timeout: 10000 },
  );
}

test.describe("Evan Flow Controller — Build 4", () => {
  test("?evan=force — EVAN_HELP_STARTED dispatched after briefing", async ({
    page,
  }) => {
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
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

  test("forced Evan skip dispatches EVAN_HELP_STOPPED with reason skip", async ({
    page,
  }) => {
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
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

  test("forced Evan run blocks user input except skip", async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
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
      window.__evanConsoleSlotClicks = 0;
      document.getElementById("help-button")?.addEventListener("click", () => {
        window.__evanHelpClicks++;
      });
      if (window.consoleManager) {
        window.consoleManager.slots[0] = "x";
      }
      document
        .querySelector('[data-slot="0"]')
        ?.addEventListener("click", () => {
          window.__evanConsoleSlotClicks++;
        });
      document.addEventListener("keydown", () => {
        /* test probe only */
      });
    });

    const helpBox = await page.locator("#help-button").boundingBox();
    expect(helpBox).toBeTruthy();
    await page.mouse.click(helpBox.x + helpBox.width / 2, helpBox.y + helpBox.height / 2);
    await page.keyboard.press("1");
    await page.waitForTimeout(200);

    const blockedState = await page.evaluate(() => ({
      helpClicks: window.__evanHelpClicks,
      consoleSlotClicks: window.__evanConsoleSlotClicks,
      activeElementId: document.activeElement?.id || null,
    }));

    expect(blockedState.helpClicks).toBe(0);
    expect(blockedState.consoleSlotClicks).toBe(0);
    expect(blockedState.activeElementId).toBe("evan-skip-button");

    await page.click("#evan-skip-button");
    await page.waitForFunction(
      () => !document.body.classList.contains("evan-input-locked"),
      { timeout: 5000 },
    );
  });

  test("mobile default boot keeps gameplay unlocked and exposes manual Evan solve", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This startup UX contract is enforced on the mobile projects.",
    );

    await ensureLandscapeViewport(page);
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");
    await dismissBriefing(page);

    const panelC = page.locator("#panel-c");
    const solveButton = page.locator("#evan-solve-button");

    await page.waitForFunction(
      () => window.GameRuntimeCoordinator?.canAcceptGameplayInput?.() === true,
      { timeout: 8000 },
    );

    await expect(solveButton).toBeVisible();
    await expect(panelC).toHaveAttribute("aria-disabled", "false");
  });

  test("forced Evan explains the temporary demo lock and clears it after skip on mobile", async ({
    page,
  }, testInfo) => {
    test.skip(
      !["pixel-7", "iphone-13"].includes(testInfo.project.name),
      "This startup UX contract is enforced on the mobile projects.",
    );

    await ensureLandscapeViewport(page);
    await resetOnboardingState(page, "?level=beginner&evan=force&preload=off");
    await dismissBriefing(page);

    const status = page.locator("#evan-assist-status");
    const panelC = page.locator("#panel-c");

    await page.waitForFunction(
      () => {
        const btn = document.getElementById("evan-skip-button");
        return btn && !btn.hidden && document.body.classList.contains("evan-input-locked");
      },
      { timeout: 8000 },
    );

    await expect(status).toBeVisible();
    await expect(status).toContainText("Skip to take over");
    await expect(panelC).toHaveAttribute("aria-disabled", "true");

    await page.click("#evan-skip-button");

    await page.waitForFunction(
      () => !document.body.classList.contains("evan-input-locked"),
      { timeout: 5000 },
    );

    await expect(status).toBeHidden();
    await expect(panelC).toHaveAttribute("aria-disabled", "false");
  });

  test("after skip, consumed state persists", async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.use?.isMobile === true,
      "Mobile default boot no longer auto-runs Evan.",
    );

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

  test("manual solve locks input except stop and stop restores control", async ({
    page,
  }) => {
    await ensureLandscapeViewport(page);
    await seedOnboardingState(
      page,
      consumedState(),
      "?level=beginner&evan=auto&preload=off",
    );
    await dismissBriefing(page);

    await page.waitForSelector("#evan-solve-button", {
      state: "visible",
      timeout: 8000,
    });

    await page.evaluate(() => {
      window.__manualHelpClicks = 0;
      document.getElementById("help-button")?.addEventListener("click", () => {
        window.__manualHelpClicks += 1;
      });
    });

    await page.click("#evan-solve-button");

    await page.waitForFunction(
      () => {
        const stopButton = document.getElementById("evan-stop-button");
        return stopButton && !stopButton.hidden && document.body.classList.contains("evan-input-locked");
      },
      { timeout: 8000 },
    );

    const helpBox = await page.locator("#help-button").boundingBox();
    expect(helpBox).toBeTruthy();
    await page.mouse.click(helpBox.x + helpBox.width / 2, helpBox.y + helpBox.height / 2);
    await page.waitForTimeout(200);

    const blockedState = await page.evaluate(() => ({
      helpClicks: window.__manualHelpClicks,
      activeElementId: document.activeElement?.id || null,
    }));

    expect(blockedState.helpClicks).toBe(0);
    expect(blockedState.activeElementId).toBe("evan-stop-button");

    await page.click("#evan-stop-button");

    await page.waitForFunction(
      () => !document.body.classList.contains("evan-input-locked"),
      { timeout: 5000 },
    );
  });
});
