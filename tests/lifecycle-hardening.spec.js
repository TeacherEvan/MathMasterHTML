// @ts-check
import { expect, test } from "@playwright/test";
import { injectLifecycleTracker } from "./utils/lifecycle-tracker.js";
import { preparePerfGame } from "./utils/perf-scenarios.js";
import { gotoGameRuntime } from "./utils/onboarding-runtime.js";

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

  test("DynamicQualityAdjuster does not reduce quality before gameplay is ready", async ({
    page,
  }) => {
    await gotoGameRuntime(page, "?level=beginner");

    const result = await page.evaluate(() => {
      const adjuster = window.dynamicQualityAdjuster;
      const qualityManager = window.qualityManager;

      if (!adjuster || !qualityManager) {
        return { hasAdjuster: false };
      }

      const beforeTier = qualityManager.getTier();

      adjuster.startedAt = performance.now() - 10_000;
      adjuster.lastGameplayReadyAt = null;
      adjuster.adjustmentCooldown = false;
      adjuster.fpsHistory = new Array(adjuster.config.MIN_SAMPLES).fill(12);

      adjuster.checkAndAdjust();

      return {
        hasAdjuster: true,
        gameplayReady: window.GameRuntimeCoordinator?.isGameplayReady?.() ?? null,
        beforeTier,
        afterTier: qualityManager.getTier(),
      };
    });

    expect(result.hasAdjuster).toBe(true);
    expect(result.gameplayReady).toBe(false);
    expect(result.afterTier).toBe(result.beforeTier);
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
    await page.waitForFunction(
      () => (window.wormSystem?.worms?.length ?? 0) > 0,
      undefined,
      { timeout: 5000 },
    );

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

  test("worm positioning uses translate-based placement, not top/left", async ({
    page,
  }) => {
    await preparePerfGame(page);

    await page.evaluate(() => {
      window.wormSystem.queueWormSpawn("panelB", { targetSymbol: "x" });
    });

    await page.waitForFunction(
      () => document.querySelector(".worm-container") !== null,
      undefined,
      { timeout: 5000 },
    );

    const result = await page.evaluate(() => {
      const wormEl = document.querySelector(".worm-container");
      if (!wormEl) {
        return { found: false };
      }

      return {
        found: true,
        inlineLeft: wormEl.style.left,
        inlineTop: wormEl.style.top,
        inlineTranslate: wormEl.style.translate,
        inlineRotate: wormEl.style.rotate,
        inlineTransform: wormEl.style.transform,
        computedTransform: getComputedStyle(wormEl).transform,
      };
    });

    expect(result.found).toBe(true);
    expect(result.inlineLeft).toBe("");
    expect(result.inlineTop).toBe("");
    expect(
      result.inlineTranslate !== "" ||
        result.inlineTransform.includes("translate"),
    ).toBe(true);
    expect(
      result.inlineRotate !== "" || result.inlineTransform.includes("rotate"),
    ).toBe(true);
    expect(result.computedTransform).not.toBe("none");
  });

  test("falling symbols use translate-based placement, not top", async ({
    page,
  }) => {
    await preparePerfGame(page);
    await page.waitForTimeout(2000);

    const result = await page.evaluate(() => {
      const symbol = document.querySelector(".falling-symbol");
      if (!symbol) {
        return { found: false };
      }

      return {
        found: true,
        inlineTop: symbol.style.top,
        inlineTranslate: symbol.style.translate,
        inlineTransform: symbol.style.transform,
        computedTranslate: getComputedStyle(symbol).translate,
      };
    });

    expect(result.found).toBe(true);
    expect(result.inlineTop).toBe("");
    expect(
      result.inlineTranslate !== "" ||
        result.inlineTransform.includes("translate"),
    ).toBe(true);
    expect(result.computedTranslate).not.toBe("none");
  });

  test("worm effects and power-ups use translate-based placement", async ({
    page,
  }, testInfo) => {
    await preparePerfGame(page);

    await page.evaluate(() => {
      window.wormSystem.queueWormSpawn("panelB", { targetSymbol: "x" });
    });
    await page.waitForFunction(
      () => window.wormSystem.worms.length > 0,
      undefined,
      {
        timeout: 5000,
      },
    );

    await page.evaluate(() => {
      const worm = window.wormSystem.worms[0];
      if (worm) {
        window.wormSystem.explodeWorm(worm, false, false);
      }
      window.wormSystem.spawnSpider?.(80, 120);
      window.wormSystem.spawnDevil?.(140, 180);
    });
    await page.waitForTimeout(250);

    const sample = await page.evaluate(() => {
      const serialize = (element) => {
        if (!element) return null;
        return {
          left: element.style.left,
          top: element.style.top,
          translate: element.style.translate,
          transform: element.style.transform,
          computedTranslate: getComputedStyle(element).translate,
        };
      };

      const devil = Array.from(document.querySelectorAll("div")).find(
        (el) => el.textContent === "👹" && !el.classList.contains("power-up"),
      );

      return {
        particle: serialize(document.querySelector(".explosion-particle")),
        splat: serialize(document.querySelector(".slime-splat")),
        crack: serialize(document.querySelector(".worm-crack")),
        spider: serialize(document.querySelector(".spider-entity")),
        devil: serialize(devil || null),
      };
    });

    await testInfo.attach("translate-effects-audit", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(sample, null, 2)),
    });

    const explosionKeys = ["particle", "splat", "crack"].filter((key) =>
      Boolean(sample[key]),
    );
    expect(explosionKeys.length).toBeGreaterThan(0);

    for (const key of [...explosionKeys, "spider", "devil"]) {
      expect(sample[key]).toBeTruthy();
      expect(sample[key].left).toBe("");
      expect(sample[key].top).toBe("");
      expect(
        sample[key].translate !== "" ||
          sample[key].transform.includes("translate"),
      ).toBe(true);
      expect(sample[key].computedTranslate).not.toBe("none");
    }
  });

  test("display and lock managers share a resize observer hub", async ({
    page,
  }) => {
    await preparePerfGame(page);

    const result = await page.evaluate(() => ({
      hasSharedObserver: Boolean(window.SharedResizeObserver),
      sourceCount: window.SharedResizeObserver?.getSources?.().length ?? 0,
      hasDisplayManager: Boolean(window.displayManager),
    }));

    expect(result.hasSharedObserver).toBe(true);
    expect(result.hasDisplayManager).toBe(true);
    expect(result.sourceCount).toBeGreaterThanOrEqual(1);
  });

  test("no transition: all in loaded stylesheets", async ({ page }) => {
    await page.goto("/src/pages/game.html?level=beginner", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(3000);

    const violations = await page.evaluate(() => {
      const results = [];
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          for (const rule of Array.from(sheet.cssRules || [])) {
            if (
              rule.style &&
              rule.style.transition &&
              rule.style.transition.includes("all")
            ) {
              results.push({
                selector: rule.selectorText || "<inline>",
                transition: rule.style.transition,
              });
            }
          }
        } catch (_error) {
          // Ignore cross-origin stylesheets
        }
      }
      return results;
    });

    expect(violations).toHaveLength(0);
  });
});
