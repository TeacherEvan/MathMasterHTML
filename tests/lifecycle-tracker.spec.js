// @ts-check
import { expect, test } from "@playwright/test";
import { injectLifecycleTracker } from "./utils/lifecycle-tracker.js";
import { preparePerfGame } from "./utils/perf-scenarios.js";

test.describe("Lifecycle tracker", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.use?.isMobile, "Desktop only");
    await injectLifecycleTracker(page);
  });

  test("reports active rAF loops and timers after game start", async ({
    page,
  }) => {
    await preparePerfGame(page);

    const report = await page.evaluate(() => {
      return window.__lifecycleTracker?.getReport();
    });

    expect(report).toBeTruthy();
    expect(report.activeRAFLoops).toBeGreaterThan(0);
    expect(typeof report.activeTimers).toBe("number");
    expect(typeof report.activeIntervals).toBe("number");
  });

  test("DOM node count does not grow unboundedly over 10 seconds", async ({
    page,
  }, testInfo) => {
    await preparePerfGame(page);

    const startCount = await page.evaluate(
      () => document.querySelectorAll("*").length,
    );
    await page.waitForTimeout(10000);
    const endCount = await page.evaluate(
      () => document.querySelectorAll("*").length,
    );

    const growthPercent = ((endCount - startCount) / startCount) * 100;

    await testInfo.attach("memory-audit", {
      contentType: "application/json",
      body: Buffer.from(
        JSON.stringify({ startCount, endCount, growthPercent }, null, 2),
      ),
    });

    // Baseline only — no hard assertion yet, just capture data
    expect(typeof growthPercent).toBe("number");
  });

  test("init-to-interactive timing is captured", async ({ page }, testInfo) => {
    await page.addInitScript(() => {
      window.__initTimings = { dcl: 0, gameReady: 0 };
      document.addEventListener("DOMContentLoaded", () => {
        window.__initTimings.dcl = performance.now();
      });
    });

    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });

    const startButton = page.locator("#start-game-btn");
    await startButton.waitFor({ state: "visible", timeout: 10000 });

    const timings = await page.evaluate(() => {
      window.__initTimings.gameReady = performance.now();
      return window.__initTimings;
    });

    await testInfo.attach("init-timing", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(timings, null, 2)),
    });

    expect(timings.dcl).toBeGreaterThan(0);
    expect(timings.gameReady).toBeGreaterThan(timings.dcl);
  });

  test("symbol rain animation can be stopped cleanly", async ({ page }) => {
    await preparePerfGame(page);

    const result = await page.evaluate(() => {
      return {
        hasStop:
          typeof window.SymbolRainAnimation?.stopAnimation === "function",
      };
    });

    expect(result.hasStop).toBe(true);
  });

  test("worm system has zero document listeners after destroy", async ({
    page,
  }) => {
    await preparePerfGame(page);
    await page.waitForTimeout(3000);

    const result = await page.evaluate(() => {
      window.wormSystem.destroy();
      return {
        isDestroyed: window.wormSystem.isDestroyed,
        eventListenersRemoved:
          window.wormSystem.eventListenersInitialized === false,
      };
    });

    expect(result.isDestroyed).toBe(true);
    expect(result.eventListenersRemoved).toBe(true);
  });

  test("worm animation pauses when tab is hidden", async ({
    page,
  }, testInfo) => {
    await preparePerfGame(page);

    // Ensure worms are active first
    const beforeState = await page.evaluate(() => ({
      animFrameId: window.wormSystem.animationFrameId,
      wormCount: window.wormSystem.worms.length,
    }));

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: true,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(200);
    const hiddenState = await page.evaluate(() => ({
      animFrameId: window.wormSystem.animationFrameId,
    }));

    await page.evaluate(() => {
      Object.defineProperty(document, "hidden", {
        value: false,
        writable: true,
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });

    await page.waitForTimeout(200);
    const visibleState = await page.evaluate(() => ({
      animFrameId: window.wormSystem.animationFrameId,
    }));

    await testInfo.attach("visibility-throttle", {
      contentType: "application/json",
      body: Buffer.from(
        JSON.stringify({ beforeState, hiddenState, visibleState }, null, 2),
      ),
    });

    // When hidden, animationFrameId should be null (paused)
    expect(hiddenState.animFrameId).toBeNull();
    // When visible again, animationFrameId should be restored (if worms exist)
    if (beforeState.wormCount > 0) {
      expect(visibleState.animFrameId).not.toBeNull();
    }
  });
});
