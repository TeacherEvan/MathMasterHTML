// @ts-check
import { expect, test } from "@playwright/test";
import { enablePerfMetrics } from "./utils/perf-metrics.js";

test.describe("Performance benchmarks", () => {
  /**
   * @param {string} projectName
   */
  function getPerfBudget(projectName) {
    return {
      minSampleCount: projectName === "chromium" ? 300 : 120,
      enforceHardGate: projectName === "chromium",
      minFps: 50,
      maxFrameBudgetViolationPercent: 80,
      maxDomQueriesPerSec: projectName === "chromium" ? 150 : 250,
    };
  }

  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(
      testInfo.project.use?.isMobile,
      "Performance smoke benchmark is calibrated for desktop browsers only",
    );

    await page.addInitScript(() => {
      window.__PERF_SMOKE_MODE = true;
    });

    await page.goto("/src/pages/game.html?level=beginner");

    await page.waitForFunction(
      () => !!window.qualityManager && !!window.QUALITY_TIERS,
    );
    await page.evaluate(() => {
      window.qualityManager?.setTier(window.QUALITY_TIERS.ULTRA_LOW);
    });

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForTimeout(600);

    // Enable extended instrumentation for richer metrics
    await enablePerfMetrics(page, { warmupMs: 1000 });
  });

  test("captures a desktop perf smoke snapshot", async ({ page }) => {
    test.setTimeout(120000);
    const budget = getPerfBudget(test.info().project.name);

    await page.waitForTimeout(9000);

    await page.waitForFunction(
      (requiredSampleCount) =>
        !!window.performanceMonitor &&
        typeof window.performanceMonitor.getSnapshot === "function" &&
        window.performanceMonitor.getSnapshot().sampleCount >=
          requiredSampleCount,
      budget.minSampleCount,
      { timeout: 20000 },
    );

    const snapshot = await page.evaluate(() => {
      if (
        !window.performanceMonitor ||
        !window.performanceMonitor.getSnapshot
      ) {
        throw new Error(
          "PerformanceMonitor not available or getSnapshot not found",
        );
      }

      const perfSnapshot = window.performanceMonitor.getSnapshot();
      const perf =
        /** @type {Performance & { memory?: { usedJSHeapSize?: number } }} */ (
          window.performance
        );
      const heapUsed = perf.memory?.usedJSHeapSize ?? null;

      return {
        ...perfSnapshot,
        heapUsed,
      };
    });

    // Attach structured snapshot for reporting as JSON instead of a large annotation string
    await test.info().attach("perf-snapshot", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(snapshot, null, 2)),
    });

    expect(Number.isFinite(snapshot.fps)).toBeTruthy();
    expect(snapshot.sampleCount).toBeGreaterThan(0);
    if (budget.enforceHardGate) {
      expect(snapshot.fps).toBeGreaterThan(budget.minFps);
      expect(snapshot.frameBudgetViolationPercent).toBeLessThan(
        budget.maxFrameBudgetViolationPercent,
      );
    }
    expect(snapshot.domQueriesPerSec).toBeLessThan(budget.maxDomQueriesPerSec);

    // Task 0.1: frame budget violation and DOM node count metrics
    expect(snapshot).toHaveProperty("frameBudgetViolationPercent");
    expect(snapshot.frameBudgetViolationPercent).toBeGreaterThanOrEqual(0);
    expect(snapshot).toHaveProperty("domNodeCount");
    expect(snapshot.domNodeCount).toBeGreaterThan(0);
    expect(snapshot).toHaveProperty("resourceManagerStats");
    expect(snapshot).toHaveProperty("wormCacheStats");
    expect(snapshot.wormCacheStats).not.toBeNull();
    expect(typeof snapshot.wormCacheStats.overallHitRate).toBe("number");

    if (snapshot.heapUsed !== null) {
      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapUsed).toBeLessThan(600 * 1024 * 1024);
    }
  });
});
