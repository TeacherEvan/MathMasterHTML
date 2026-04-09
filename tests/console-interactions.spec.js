import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  resetOnboardingState,
} from "./utils/onboarding-runtime.js";

async function prepareConsoleSlot(page) {
  await resetOnboardingState(page, "?level=beginner&evan=off&preload=off");
  await dismissBriefingAndWaitForInteractiveGameplay(page);
  await page.evaluate(() => {
    window.__consoleSymbolClicks = 0;
    if (window.consoleManager) {
      window.consoleManager.slots[0] = "x";
      window.consoleManager.updateDisplay?.();
    }
    document.addEventListener(window.GameEvents.SYMBOL_CLICKED, () => {
      window.__consoleSymbolClicks += 1;
    });
  });
}

test.describe("Console interactions", () => {
  test("pointerdown plus follow-up click only dispatches once", async ({
    page,
  }) => {
    await prepareConsoleSlot(page);

    const slot = page.locator('[data-slot="0"]');
    await slot.dispatchEvent("pointerdown", {
      bubbles: true,
      cancelable: true,
      pointerType: "mouse",
      isPrimary: true,
      button: 0,
      buttons: 1,
    });
    await slot.dispatchEvent("click", {
      bubbles: true,
      cancelable: true,
      detail: 1,
      button: 0,
    });

    await expect
      .poll(() => page.evaluate(() => window.__consoleSymbolClicks))
      .toBe(1);
  });

  test("programmatic click fallback still activates a filled slot once", async ({
    page,
  }) => {
    await prepareConsoleSlot(page);

    await page.evaluate(() => {
      document.querySelector('[data-slot="0"]')?.click();
    });

    await expect
      .poll(() => page.evaluate(() => window.__consoleSymbolClicks))
      .toBe(1);
  });
});
