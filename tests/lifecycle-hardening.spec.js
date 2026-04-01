// @ts-check
import { expect, test } from "@playwright/test";
import { injectLifecycleTracker } from "./utils/lifecycle-tracker.js";
import { preparePerfGame } from "./utils/perf-scenarios.js";

test.describe("Lifecycle hardening", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.use?.isMobile, "Desktop only");
    await injectLifecycleTracker(page);
  });

  test("DynamicQualityAdjuster can be destroyed", async ({ page }) => {
    await preparePerfGame(page);

    const result = await page.evaluate(() => {
      const adjuster = window.dynamicQualityAdjuster;
      return {
        hasDestroy: adjuster && typeof adjuster.destroy === "function",
      };
    });

    expect(result.hasDestroy).toBe(true);
  });

  test("PerformanceMonitor can be destroyed", async ({ page }) => {
    await preparePerfGame(page);

    const result = await page.evaluate(() => {
      const monitor = window.performanceMonitor;
      return {
        hasDestroy: monitor && typeof monitor.destroy === "function",
      };
    });

    expect(result.hasDestroy).toBe(true);
  });

  test("game-init logs BOOT_FAIL if required globals are missing", async ({
    page,
  }) => {
    await page.route("**/worm.js", (route) => route.abort());

    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && msg.text().includes("BOOT_FAIL")) {
        errors.push(msg.text());
      }
    });

    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(5000);

    expect(errors.length).toBeGreaterThan(0);
  });

  test("no orphaned intervals after killAllWorms", async ({
    page,
  }, testInfo) => {
    await preparePerfGame(page);
    await page.waitForTimeout(3000);

    const beforeReport = await page.evaluate(() =>
      window.__lifecycleTracker?.getReport(),
    );

    await page.evaluate(() => {
      window.wormSystem.killAllWorms();
    });
    await page.waitForTimeout(3000);

    const afterReport = await page.evaluate(() =>
      window.__lifecycleTracker?.getReport(),
    );

    await testInfo.attach("post-kill-lifecycle", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify({ beforeReport, afterReport }, null, 2)),
    });

    expect(afterReport.activeIntervals).toBeLessThanOrEqual(
      beforeReport.activeIntervals,
    );
  });

  test("worm spawn queue does not exceed configured cap", async ({ page }) => {
    await preparePerfGame(page);

    await page.evaluate(() => {
      for (let i = 0; i < 50; i++) {
        window.wormSystem.queueWormSpawn("panelB", { targetSymbol: "x" });
      }
    });

    const queueSize = await page.evaluate(() => {
      return (
        window.wormSystem.spawnManager?._queue?.length ??
        window.wormSystem.spawnManager?.spawnQueue?.length ??
        0
      );
    });

    expect(queueSize).toBeLessThanOrEqual(20);
  });

  test("worm data element is nulled after removal", async ({ page }) => {
    await preparePerfGame(page);
    await page.evaluate(() => {
      window.wormSystem.queueWormSpawn("panelB", { targetSymbol: "x" });
    });
    await page.waitForTimeout(300);

    const result = await page.evaluate(() => {
      const worm = window.wormSystem.worms[0];
      if (!worm) return { noWorm: true };

      const id = worm.id;
      window.wormSystem.removeWorm(worm);

      return {
        id,
        elementIsNull: worm.element === null,
        consoleSlotElementIsNull: worm.consoleSlotElement === null,
      };
    });

    expect(result.noWorm).not.toBe(true);
    expect(result.elementIsNull).toBe(true);
    expect(result.consoleSlotElementIsNull).toBe(true);
  });

  test("console area DOM count stays flat across symbol stores", async ({
    page,
  }, testInfo) => {
    await preparePerfGame(page);

    const counts = await page.evaluate(() => {
      const consoleRoot =
        document.querySelector(".console-grid") ||
        document.getElementById("symbol-console");
      const manager = window.consoleManager;
      const beforeCount = consoleRoot
        ? consoleRoot.querySelectorAll("*").length
        : 0;

      if (manager) {
        const symbols = manager.availableSymbols || ["X"];
        for (let i = 0; i < 20; i++) {
          manager.fillSlot(i % 9, symbols[i % symbols.length]);
        }
      }

      const afterCount = consoleRoot
        ? consoleRoot.querySelectorAll("*").length
        : 0;

      return {
        hasConsole: Boolean(consoleRoot && manager),
        beforeCount,
        afterCount,
      };
    });

    await testInfo.attach("console-dom-audit", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(counts, null, 2)),
    });

    expect(counts.hasConsole).toBe(true);
    expect(counts.afterCount).toBeLessThan(counts.beforeCount * 1.5 + 10);
  });
});
