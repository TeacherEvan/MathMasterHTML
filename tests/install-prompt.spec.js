// tests/install-prompt.spec.js
import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  gotoGameRuntime,
  resetOnboardingState,
  seedOnboardingState,
} from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

function thresholdState() {
  return {
    version: 1,
    sessionCount: 2,
    evanConsumed: { beginner: false, warrior: false, master: false },
    installPromptDismissedAt: null,
    updatedAt: 0,
  };
}

function boxesOverlap(boxA, boxB) {
  if (!boxA || !boxB) return false;
  return !(
    boxA.x + boxA.width <= boxB.x ||
    boxB.x + boxB.width <= boxA.x ||
    boxA.y + boxA.height <= boxB.y ||
    boxB.y + boxB.height <= boxA.y
  );
}

async function simulateBeforeInstallPrompt(page) {
  await page.evaluate(() => {
    window.__beforeInstallPrevented = false;
    window.__promptCalls = 0;
    const event = new Event("beforeinstallprompt");
    event.preventDefault = () => {
      window.__beforeInstallPrevented = true;
    };
    event.prompt = () => {
      window.__promptCalls++;
      return Promise.resolve();
    };
    event.userChoice = Promise.resolve({ outcome: "dismissed" });
    window.dispatchEvent(event);
  });
}

async function ensurePowerUpDisplay(page) {
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
  });
  await expect(page.locator("#power-up-display")).toBeVisible();
}

test.describe("Deferred Install Prompt — Build 8", () => {
  test("no install toast before sessionCount >= 3", async ({ page }) => {
    await resetOnboardingState(page, "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await simulateBeforeInstallPrompt(page);
    await page.waitForTimeout(300);

    expect(await page.evaluate(() => window.__beforeInstallPrevented)).toBe(true);
    await expect(page.locator(".toast")).toHaveCount(0);
  });

  test("install toast appears after threshold once briefing is dismissed", async ({
    page,
  }) => {
    await seedOnboardingState(page, thresholdState(), "?level=beginner&preload=off");

    await simulateBeforeInstallPrompt(page);
    await expect(page.locator(".toast")).toHaveCount(0);

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await expect(page.locator(".toast")).toContainText(
      "Install Math Master for offline play",
    );
  });

  test("install toast appears only after gameplayReady becomes true", async ({
    page,
  }) => {
    await seedOnboardingState(page, thresholdState(), "?level=beginner");

    await simulateBeforeInstallPrompt(page);
    await expect(page.locator(".toast")).toHaveCount(0);

    const blockedState = await page.evaluate(() =>
      window.GameRuntimeCoordinator?.getState?.(),
    );
    expect(blockedState).toEqual(
      expect.objectContaining({
        gameplayReady: false,
      }),
    );

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());
    await expect(page.locator(".toast")).toContainText(
      "Install Math Master for offline play",
    );
  });

  test("dismissal marks prompt dismissed and prevents repeat prompts on reload", async ({
    page,
  }) => {
    await seedOnboardingState(page, thresholdState(), "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await simulateBeforeInstallPrompt(page);
    await expect(page.locator(".toast")).toBeVisible();

    await page.locator(".toast").evaluate((element) => element.click());
    await page.waitForFunction(
      () => window.GameOnboardingStorage.getState().installPromptDismissedAt !== null,
      { timeout: 5000 },
    );
    expect(await page.evaluate(() => window.__promptCalls)).toBe(1);

    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await simulateBeforeInstallPrompt(page);
    await page.waitForTimeout(300);

    await expect(page.locator(".toast")).toHaveCount(0);
  });

  test("install toast does not overlap #power-up-display on compact landscape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await seedOnboardingState(page, thresholdState(), "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await ensurePowerUpDisplay(page);
    await simulateBeforeInstallPrompt(page);
    await expect(page.locator(".toast")).toBeVisible();

    const toastBox = await page.locator(".toast").boundingBox();
    const powerUpBox = await page.locator("#power-up-display").boundingBox();
    expect(boxesOverlap(toastBox, powerUpBox)).toBe(false);
  });

  test("INSTALL_PROMPT_DISMISSED event fires after dismiss action", async ({
    page,
  }) => {
    await seedOnboardingState(page, thresholdState(), "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await page.evaluate(() => {
      window.__installDismissed = false;
      document.addEventListener(
        window.GameEvents.INSTALL_PROMPT_DISMISSED,
        () => {
          window.__installDismissed = true;
        },
        { once: true },
      );
    });
    await simulateBeforeInstallPrompt(page);
    await expect(page.locator(".toast")).toBeVisible();

    await page.locator(".toast").evaluate((element) => element.click());
    await page.waitForFunction(() => window.__installDismissed === true, {
      timeout: 5000,
    });

    expect(await page.evaluate(() => window.__installDismissed)).toBe(true);
  });

  test("rapid repeated taps only trigger the install prompt once", async ({
    page,
  }) => {
    await seedOnboardingState(page, thresholdState(), "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await simulateBeforeInstallPrompt(page);
    await expect(page.locator(".toast")).toBeVisible();

    await page.locator(".toast").evaluate((element) => {
      for (let tap = 0; tap < 5; tap += 1) {
        element.dispatchEvent(new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true,
          pointerType: "touch",
          isPrimary: true,
        }));
        element.click();
      }
    });

    await page.waitForFunction(
      () => window.GameOnboardingStorage.getState().installPromptDismissedAt !== null,
      { timeout: 5000 },
    );

    expect(await page.evaluate(() => window.__promptCalls)).toBe(1);
    await expect(page.locator(".toast")).toHaveCount(0);
  });

  test("InstallPromptManager exposes tryShow", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    const hasTryShow = await page.evaluate(
      () => typeof window.InstallPromptManager?.tryShow === "function",
    );
    expect(hasTryShow).toBe(true);
  });
});
