// tests/startup-preload.spec.js
import { expect, test } from "@playwright/test";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

test.setTimeout(30000);

async function waitForBriefingVisible(page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const modal = document.getElementById("how-to-play-modal");
      return modal && getComputedStyle(modal).display === "flex";
    },
    { timeout },
  );
}

async function waitForStartupPreload(page) {
  await page.waitForFunction(
    () => typeof window.StartupPreload?.isBlocking === "function",
    { timeout: 10000 },
  );
}

async function gotoBlockingPreloadRuntime(page, search = "?level=beginner") {
  await page.addInitScript(() => {
    if (
      navigator.serviceWorker &&
      typeof navigator.serviceWorker.register === "function"
    ) {
      navigator.serviceWorker.register = () => new Promise(() => {});
    }
  });

  await gotoGameRuntime(page, search);
  await waitForStartupPreload(page);
}

test.describe("Startup Preload — Build 2", () => {
  test("preload overlay is visible on initial page load", async ({ page }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await expect(page.locator("#startup-preload")).toBeVisible();
    expect(await page.evaluate(() => window.StartupPreload?.isBlocking())).toBe(
      true,
    );
  });

  test("overlay hides after PRELOAD_READY is dispatched", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner");
    await waitForStartupPreload(page);

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_READY));
    });

    await page.waitForFunction(
      () => window.StartupPreload?.isComplete() === true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
  });

  test("overlay hides after PRELOAD_FAILED is dispatched", async ({ page }) => {
    await gotoGameRuntime(page, "?level=beginner");
    await waitForStartupPreload(page);

    await page.evaluate(() => {
      document.dispatchEvent(new CustomEvent(window.GameEvents.PRELOAD_FAILED));
    });

    await page.waitForFunction(
      () => window.StartupPreload?.isComplete() === true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
  });

  test("briefing modal not visible while preload is blocking", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    const state = await page.evaluate(() => {
      const modal = document.getElementById("how-to-play-modal");
      return {
        blocking: window.StartupPreload?.isBlocking() === true,
        display: modal ? getComputedStyle(modal).display : null,
      };
    });

    expect(state.blocking).toBe(true);
    expect(state.display).toBe("none");
  });

  test("briefing modal visible after forced startup preload completion", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    await page.waitForFunction(
      () => window.StartupPreload?.isComplete() === true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
    await waitForBriefingVisible(page);
    await expect(page.locator("#how-to-play-modal")).toBeVisible();
  });

  test("?preload=off bypasses overlay and shows briefing immediately", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&preload=off");
    await waitForStartupPreload(page);

    expect(await page.evaluate(() => window.StartupPreload?.isBlocking())).toBe(
      false,
    );
    expect(await page.evaluate(() => window.StartupPreload?.isComplete())).toBe(
      true,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
    await waitForBriefingVisible(page, 3000);
  });

  test("safety timeout shows briefing if preload stalls longer than 8s", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await waitForBriefingVisible(page, 12000);
    await page.waitForFunction(
      () => window.StartupPreload?.isBlocking() === false,
    );
    await expect(page.locator("#startup-preload")).toBeHidden();
    await expect(page.locator("#start-game-btn")).toBeVisible();
  });
});
