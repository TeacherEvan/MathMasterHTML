import { expect, test } from "@playwright/test";
import { seedOnboardingState } from "./utils/onboarding-runtime.js";

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

async function gotoConsumedFlow(page) {
  await seedOnboardingState(
    page,
    consumedState(),
    "?level=beginner&evan=auto&preload=off",
  );
  await page.waitForSelector("#start-game-btn", {
    state: "visible",
    timeout: 10000,
  });
  await page.click("#start-game-btn");
  await page.waitForFunction(
    () => {
      const slot = document.getElementById("evan-controls-slot");
      return slot && !slot.hidden;
    },
    { timeout: 8000 },
  );
}

test.describe("Evan Flow Controller — solve button", () => {
  test("after consumed, solve button is visible", async ({ page }) => {
    await gotoConsumedFlow(page);
    await expect(page.locator("#evan-controls-slot")).toBeVisible();
  });

  test("solve button dispatches EVAN_HELP_STARTED with mode manual", async ({
    page,
  }) => {
    await gotoConsumedFlow(page);
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

    await page.click("#evan-solve-button");
    await page.waitForFunction(() => window.__evanStartMode !== null, {
      timeout: 5000,
    });

    expect(await page.evaluate(() => window.__evanStartMode)).toBe("manual");
  });
});
