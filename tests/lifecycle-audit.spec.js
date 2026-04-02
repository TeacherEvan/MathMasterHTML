// @ts-check
import { expect, test } from "@playwright/test";
import { injectLifecycleTracker } from "./utils/lifecycle-tracker.js";
import { preparePerfGame } from "./utils/perf-scenarios.js";

test.describe("Lifecycle audit", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.use?.isMobile, "Desktop only");
    await injectLifecycleTracker(page);
  });

  test("zero orphaned resources after game destroy", async ({
    page,
  }, testInfo) => {
    await preparePerfGame(page);
    await page.waitForTimeout(5000);

    await page.evaluate(() => {
      window.wormSystem?.destroy?.();
      window.ScoreTimerManager?.destroy?.();
      window.dynamicQualityAdjuster?.destroy?.();
      window.performanceMonitor?.destroy?.();

      if (
        window.SymbolRainAnimation?.stopAnimation &&
        window.__symbolRainState
      ) {
        window.SymbolRainAnimation.stopAnimation(window.__symbolRainState);
      }
    });

    await page.waitForTimeout(1000);

    const report = await page.evaluate(() =>
      window.__lifecycleTracker?.getReport(),
    );

    await testInfo.attach("lifecycle-audit", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(report, null, 2)),
    });

    expect(report).toBeTruthy();
    expect(report.activeIntervals).toBeLessThanOrEqual(2);
  });
});
