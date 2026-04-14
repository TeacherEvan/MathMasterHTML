import { expect, test } from "@playwright/test";
import {
  dismissBriefingAndWaitForInteractiveGameplay,
  gotoGameRuntime,
  resetOnboardingState,
  seedOnboardingState,
  setCorruptOnboardingState,
  waitForGameplayReady,
} from "./utils/onboarding-runtime.js";

test.describe("Onboarding gates — Build 1", () => {
  test("?evan=off sets evanMode to off and shouldAutoRunEvan returns false", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&evan=off&preload=off");
    const mode = await page.evaluate(() => window.GameOnboarding?.evanMode);
    expect(mode).toBe("off");
    const should = await page.evaluate(() =>
      window.GameOnboardingStorage?.shouldAutoRunEvan("beginner", "off"),
    );
    expect(should).toBe(false);
  });

  test("?evan=force makes shouldAutoRunEvan return true even when consumed", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&evan=force&preload=off");
    await page.evaluate(() => {
      window.GameOnboardingStorage.markEvanConsumed("beginner");
    });
    const should = await page.evaluate(() =>
      window.GameOnboardingStorage.shouldAutoRunEvan("beginner", "force"),
    );
    expect(should).toBe(true);
  });

  test("?evan=auto with fresh state — shouldAutoRunEvan returns true", async ({
    page,
  }) => {
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");
    const should = await page.evaluate(() =>
      window.GameOnboardingStorage.shouldAutoRunEvan("beginner", "auto"),
    );
    expect(should).toBe(true);
  });

  test("?evan=auto after marking consumed — shouldAutoRunEvan returns false", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=warrior&evan=auto&preload=off");
    await page.evaluate(() => {
      window.GameOnboardingStorage.markEvanConsumed("warrior");
    });
    const should = await page.evaluate(() =>
      window.GameOnboardingStorage.shouldAutoRunEvan("warrior", "auto"),
    );
    expect(should).toBe(false);
  });

  test("?preload=off sets preloadMode to off", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    const mode = await page.evaluate(() => window.GameOnboarding?.preloadMode);
    expect(mode).toBe("off");
  });

  test("auto Evan waits for shared gameplay readiness instead of briefing alone", async ({
    page,
  }, testInfo) => {
    await resetOnboardingState(page, "?level=beginner&evan=auto&preload=off");

    await page.evaluate(() => {
      window.__evanStartCount = 0;
      document.addEventListener(window.GameEvents.EVAN_HELP_STARTED, () => {
        window.__evanStartCount += 1;
      });
    });

    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.__evanStartCount)).toBe(0);

    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await waitForGameplayReady(page);

    const autoRunSuppressedOnMobile = ["iphone-13", "pixel-7"].includes(
      testInfo.project.name,
    );

    if (autoRunSuppressedOnMobile) {
      expect(await page.evaluate(() => window.__evanStartCount)).toBe(0);
      await expect(page.locator("#evan-solve-button")).toBeVisible();
      return;
    }

    await page.waitForFunction(() => window.__evanStartCount === 1, {
      timeout: 5000,
    });
    expect(await page.evaluate(() => window.__evanStartCount)).toBe(1);
  });

  test("session counter increments on each page load", async ({ page }) => {
    await page.addInitScript((storageKey) => {
      if (!sessionStorage.getItem("onboarding-session-counter-reset")) {
        localStorage.removeItem(storageKey);
        sessionStorage.setItem("onboarding-session-counter-reset", "1");
      }
    }, "mathmaster_onboarding_v1");

    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await waitForGameplayReady(page);

    const count1 = await page.evaluate(
      () => window.GameOnboardingStorage.getState().sessionCount,
    );
    expect(count1).toBeGreaterThanOrEqual(1);

    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await dismissBriefingAndWaitForInteractiveGameplay(page);
    await waitForGameplayReady(page);

    const count2 = await page.evaluate(
      () => window.GameOnboardingStorage.getState().sessionCount,
    );
    expect(count2).toBe(count1 + 1);
  });

  test("shouldShowInstallPrompt returns false when sessionCount < 3", async ({
    page,
  }) => {
    await resetOnboardingState(page, "?level=beginner&preload=off");
    const should = await page.evaluate(() =>
      window.GameOnboardingStorage.shouldShowInstallPrompt(),
    );
    expect(should).toBe(false);
  });

  test("shouldShowInstallPrompt returns true when sessionCount >= 3 and not dismissed", async ({
    page,
  }) => {
    await seedOnboardingState(
      page,
      {
        version: 1,
        sessionCount: 2,
        evanConsumed: { beginner: false, warrior: false, master: false },
        installPromptDismissedAt: null,
        updatedAt: 0,
      },
      "?level=beginner&preload=off",
    );
    // Session count is now 3 after initSession increments
    const should = await page.evaluate(() =>
      window.GameOnboardingStorage.shouldShowInstallPrompt(),
    );
    expect(should).toBe(true);
  });

  test("corrupt localStorage does not throw; state defaults correctly", async ({
    page,
  }) => {
    await setCorruptOnboardingState(
      page,
      "CORRUPT{{{DATA",
      "?level=beginner&preload=off",
    );
    const state = await page.evaluate(() =>
      window.GameOnboardingStorage.getState(),
    );
    expect(state.version).toBe(1);
    expect(state.sessionCount).toBe(1);
    expect(state.evanConsumed.beginner).toBe(false);
  });
});
