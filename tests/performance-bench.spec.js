// @ts-check
import { expect, test } from "@playwright/test";
import {
  collectPerfSnapshot,
  enablePerfMetrics,
} from "./utils/perf-metrics.js";

test.describe("Performance benchmarks", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/game.html?level=beginner");

    const startButton = page.locator("#start-game-btn");
    await expect(startButton).toBeVisible({ timeout: 10000 });
    await startButton.click({ force: true });
    await page.waitForTimeout(600);

    // Enable extended instrumentation for richer metrics
    await enablePerfMetrics(page, { warmupMs: 1000 });
  });

  test("maintains acceptable FPS and memory usage", async ({ page }) => {
    await page.keyboard.press("P");
    await page.waitForTimeout(1200);

    const snapshot = await collectPerfSnapshot(page);

    // Log structured snapshot for reporting
    test.info().annotations.push({
      type: "perf-snapshot",
      description: JSON.stringify(snapshot, null, 2),
    });

    expect(Number.isFinite(snapshot.fps)).toBeTruthy();
    expect(snapshot.fps).toBeGreaterThanOrEqual(30);
    expect(snapshot.sampleCount).toBeGreaterThan(0);

    const memory = await page.evaluate(() => {
      const perf = window.performance;
      if (!perf || !perf.memory) return null;
      return perf.memory.usedJSHeapSize;
    });

    if (memory !== null) {
      expect(memory).toBeGreaterThan(0);
      expect(memory).toBeLessThan(600 * 1024 * 1024);
    }
  });
});
