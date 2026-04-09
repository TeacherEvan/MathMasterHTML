import { expect, test } from "@playwright/test";
import {
  gotoGameRuntime,
  waitForRuntimeCoordinator,
} from "./utils/onboarding-runtime.js";

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
  await waitForRuntimeCoordinator(page);
}

test.describe("Runtime boot orchestration", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    if (testInfo.project.name === "pixel-7") {
      await page.setViewportSize({ width: 915, height: 412 });
    }
  });

  test("coordinator stays blocked until preload and briefing are both complete", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    const initialState = await page.evaluate(() =>
      window.GameRuntimeCoordinator?.getState?.(),
    );

    expect(initialState).toEqual(
      expect.objectContaining({
        preloadComplete: false,
        briefingDismissed: false,
        gameplayReady: false,
        inputLocked: false,
      }),
    );

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    const afterPreloadOnly = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(afterPreloadOnly.gameplayReady).toBe(false);

    await expect(page.locator("#start-game-btn")).toBeVisible();
    await page.click("#start-game-btn");
    await page.waitForFunction(
      () => window.GameRuntimeCoordinator.getState().gameplayReady === true,
    );

    const finalState = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(finalState).toEqual(
      expect.objectContaining({
        preloadComplete: true,
        briefingDismissed: true,
        gameplayReady: true,
      }),
    );
  });

  test("gameplayReadyChanged fires exactly once for the startup handoff", async ({
    page,
  }) => {
    await gotoBlockingPreloadRuntime(page, "?level=beginner");

    await page.evaluate(() => {
      window.__readyEvents = [];
      window.__eventOrder = [];
      document.addEventListener(window.GameEvents.STARTUP_PRELOAD_COMPLETE, () => {
        window.__eventOrder.push(window.GameEvents.STARTUP_PRELOAD_COMPLETE);
      });
      document.addEventListener(window.GameEvents.BRIEFING_DISMISSED, () => {
        window.__eventOrder.push(window.GameEvents.BRIEFING_DISMISSED);
      });
      document.addEventListener(window.GameEvents.GAMEPLAY_READY_CHANGED, (event) => {
        window.__eventOrder.push(window.GameEvents.GAMEPLAY_READY_CHANGED);
        window.__readyEvents.push(event.detail);
      });
    });

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason: "test" },
        }),
      );
    });

    await expect(page.locator("#start-game-btn")).toBeVisible();
    await page.click("#start-game-btn");
    await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

    const readyEvents = await page.evaluate(() => window.__readyEvents);
    const eventOrder = await page.evaluate(() => window.__eventOrder);
    expect(readyEvents).toHaveLength(1);
    expect(readyEvents[0]).toEqual(
      expect.objectContaining({
        gameplayReady: true,
        preloadComplete: true,
        briefingDismissed: true,
      }),
    );
    expect(eventOrder).toEqual([
      "startupPreloadComplete",
      "briefingDismissed",
      "gameplayReadyChanged",
    ]);
  });

  test("auto Evan input lock is separate from gameplay readiness", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner&evan=force&preload=off");
    await waitForRuntimeCoordinator(page);

    await expect(page.locator("#start-game-btn")).toBeVisible();
    await page.click("#start-game-btn");
    await page.waitForFunction(() => window.GameRuntimeCoordinator.isGameplayReady());

    await page.evaluate(() => {
      document.dispatchEvent(
        new CustomEvent(window.GameEvents.EVAN_HELP_STARTED, {
          detail: { mode: "auto", level: "beginner" },
        }),
      );
    });

    await page.waitForFunction(
      () => window.GameRuntimeCoordinator.getState().inputLocked === true,
    );

    const lockedState = await page.evaluate(() =>
      window.GameRuntimeCoordinator.getState(),
    );
    expect(lockedState).toEqual(
      expect.objectContaining({
        gameplayReady: true,
        inputLocked: true,
        inputLocks: expect.objectContaining({
          "evan-auto": true,
        }),
      }),
    );
  });
});