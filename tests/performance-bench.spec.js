// @ts-check
import { expect, test } from "@playwright/test";
import { enablePerfMetrics } from "./utils/perf-metrics.js";

test.describe("Performance benchmarks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner");

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForTimeout(600);

    // Enable extended instrumentation for richer metrics
    await enablePerfMetrics(page, { warmupMs: 1000 });
  });

  test("maintains acceptable FPS and memory usage", async ({
    page,
  }, testInfo) => {
    const isMobile = Boolean(testInfo.project.use?.isMobile);
    const minFps = isMobile ? 10 : 12;
    const minSamples = isMobile ? 15 : 20;

    await page.keyboard.press("P");
    await page.waitForFunction(
      (requiredSamples) =>
        !!window.performanceMonitor &&
        typeof window.performanceMonitor.getSnapshot === "function" &&
        window.performanceMonitor.getSnapshot().sampleCount >= requiredSamples,
      minSamples,
      { timeout: 7000 },
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
    expect(snapshot.fps).toBeGreaterThanOrEqual(minFps);
    expect(snapshot.sampleCount).toBeGreaterThan(0);
    expect(snapshot.frameTimeP95).toBeLessThan(50);
    expect(snapshot.jankPercent).toBeLessThan(15);
    expect(snapshot.domQueriesPerSec).toBeLessThan(500);

    if (snapshot.heapUsed !== null) {
      expect(snapshot.heapUsed).toBeGreaterThan(0);
      expect(snapshot.heapUsed).toBeLessThan(600 * 1024 * 1024);
    }
  });
});
