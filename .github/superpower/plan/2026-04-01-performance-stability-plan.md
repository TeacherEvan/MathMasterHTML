# Performance & Stability — Implementation Plan

**Goal:** Achieve structural correctness enforced by automated measurement — every lifecycle, resource bound, and hot path validated by merge-blocking perf gates.

**Architecture:** Pure HTML/CSS/JS runtime, script-tag globals, Playwright test infrastructure, event-driven inter-module communication.

**Tech Stack:** JavaScript (browser runtime), Playwright (test automation), `npm` scripts (CI/tooling)

**Source design:** `.github/superpower/brainstorm/2026-04-01-performance-stability-plan-design.md`
**Supersedes:** `.github/superpower/plan/2026-03-31-performance-stability-plan.md`

---

## Existing Infrastructure

| Asset                    | Location                                  | What it provides                                                         |
| ------------------------ | ----------------------------------------- | ------------------------------------------------------------------------ |
| `PerformanceMonitor`     | `src/scripts/performance-monitor.js`      | FPS, frame time, DOM queries/sec, worm/symbol counts, `getSnapshot()`    |
| `DynamicQualityAdjuster` | `src/scripts/dynamic-quality-adjuster.js` | Auto-adjusts quality tier based on FPS history                           |
| `ResourceManager`        | `src/scripts/utils-resource-manager.js`   | Tracked `setTimeout`/`setInterval`/`clearAll()` — **underutilized (F6)** |
| Perf bench spec          | `tests/performance-bench.spec.js`         | Basic FPS check + memory < 600 MB                                        |
| Perf scenarios           | `tests/perf-scenarios.spec.js`            | idle, normalPlay, wormBurst, denseRain, lockTransition scenarios         |
| Perf metrics helpers     | `tests/utils/perf-metrics.js`             | `enablePerfMetrics()`, `collectPerfSnapshot()`, `profileScenario()`      |
| Perf scenario helpers    | `tests/utils/perf-scenarios.js`           | `preparePerfGame()`, scenario action functions                           |
| Competition config       | `playwright.competition.config.js`        | 5 projects: chromium, firefox, webkit, iphone-13, pixel-7                |
| Competition lanes        | `package.json` scripts                    | smoke, matrix, soak, stress, full                                        |

---

## Phase 0: Measurement Infrastructure

> **Goal:** Build the automated observability layer all subsequent phases depend on.

### Task 0.1 — Extend perf snapshot with frame budget violations and DOM node count

**Step 1: Write the failing test**

- File: `tests/performance-bench.spec.js`
- Add inside the existing `describe` block, after the current test:

```javascript
test("snapshot includes frame budget violations and DOM node count", async ({
  page,
}) => {
  await page.waitForFunction(
    () =>
      !!window.performanceMonitor &&
      typeof window.performanceMonitor.getSnapshot === "function",
    undefined,
    { timeout: 10000 },
  );
  await page.waitForTimeout(2500);

  const snapshot = await page.evaluate(() => {
    return window.performanceMonitor.getSnapshot();
  });

  expect(snapshot).toHaveProperty("frameBudgetViolationPercent");
  expect(snapshot).toHaveProperty("domNodeCount");
  expect(typeof snapshot.frameBudgetViolationPercent).toBe("number");
  expect(typeof snapshot.domNodeCount).toBe("number");
});
```

**Step 2: Run test and verify failure**

- Command: `npx playwright test tests/performance-bench.spec.js --project=chromium`
- Expected output:

```
FAIL tests/performance-bench.spec.js
  ✕ snapshot includes frame budget violations and DOM node count
```

**Step 3: Implement — extend getSnapshot() in performance-monitor.js**

- File: `src/scripts/performance-monitor.js`
- In the `getSnapshot()` method, compute and add these fields to the returned object:

```javascript
const violations = this._histogramBuffer.filter((d) => d > 16.67).length;
const frameBudgetViolationPercent =
  this._histogramBuffer.length > 0
    ? (violations / this._histogramBuffer.length) * 100
    : 0;
```

- Add to the returned object:

```javascript
frameBudgetViolationPercent,
domNodeCount: document.querySelectorAll('*').length,
```

**Step 4: Run test and verify success**

- Command: `npx playwright test tests/performance-bench.spec.js --project=chromium`
- Expected: Both tests pass

**Step 5: Validate no regressions**

- Command: `npm run verify && npm run typecheck`
- Expected: Clean pass

---

### Task 0.2 — Create lifecycle-tracker test utility

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (new)

```javascript
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
});
```

**Step 2: Run test and verify failure**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js --project=chromium`
- Expected: Fails — `injectLifecycleTracker` module not found

**Step 3: Implement lifecycle-tracker.js**

- File: `tests/utils/lifecycle-tracker.js` (new)

```javascript
// @ts-check
/**
 * Lifecycle tracker — injects monkeypatches for rAF, setTimeout, setInterval
 * to track active loops and detect orphaned timers.
 * Mirrors the pattern from ResourceManager (utils-resource-manager.js).
 *
 * @param {import('@playwright/test').Page} page
 */
export async function injectLifecycleTracker(page) {
  await page.addInitScript(() => {
    const tracker = {
      _rafIds: new Set(),
      _timerIds: new Set(),
      _intervalIds: new Set(),
      _rafLoopCount: 0,

      getReport() {
        return {
          activeRAFLoops: this._rafLoopCount,
          activeTimers: this._timerIds.size,
          activeIntervals: this._intervalIds.size,
          pendingRAFs: this._rafIds.size,
          totalOrphaned:
            this._timerIds.size + this._intervalIds.size + this._rafIds.size,
        };
      },
    };

    const origRAF = window.requestAnimationFrame.bind(window);
    const origCAF = window.cancelAnimationFrame.bind(window);
    const origSetTimeout = window.setTimeout.bind(window);
    const origClearTimeout = window.clearTimeout.bind(window);
    const origSetInterval = window.setInterval.bind(window);
    const origClearInterval = window.clearInterval.bind(window);

    window.requestAnimationFrame = function (cb) {
      const id = origRAF((...args) => {
        tracker._rafIds.delete(id);
        cb(...args);
      });
      tracker._rafIds.add(id);
      tracker._rafLoopCount++;
      return id;
    };

    window.cancelAnimationFrame = function (id) {
      tracker._rafIds.delete(id);
      origCAF(id);
    };

    window.setTimeout = function (cb, delay, ...args) {
      const id = origSetTimeout(
        (...a) => {
          tracker._timerIds.delete(id);
          if (typeof cb === "function") cb(...a);
        },
        delay,
        ...args,
      );
      tracker._timerIds.add(id);
      return id;
    };

    window.clearTimeout = function (id) {
      tracker._timerIds.delete(id);
      origClearTimeout(id);
    };

    window.setInterval = function (cb, delay, ...args) {
      const id = origSetInterval(cb, delay, ...args);
      tracker._intervalIds.add(id);
      return id;
    };

    window.clearInterval = function (id) {
      tracker._intervalIds.delete(id);
      origClearInterval(id);
    };

    window.__lifecycleTracker = tracker;
  });
}
```

**Step 4: Run test and verify success**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js --project=chromium`
- Expected: Passes — report shows activeRAFLoops > 0

**Step 5: Validate**

- Command: `npm run verify && npm run typecheck`
- Expected: Clean pass

---

### Task 0.3 — Add DOM node growth baseline test

**Step 1: Write the test**

- File: `tests/lifecycle-tracker.spec.js` (append inside the describe block)

```javascript
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
```

**Step 2: Run and verify**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "DOM node count" --project=chromium`
- Expected: Passes (baseline data, no gate)

---

### Task 0.4 — Add init-to-interactive timing test

**Step 1: Write the test**

- File: `tests/lifecycle-tracker.spec.js` (append inside the describe block)

```javascript
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
```

**Step 2: Run and verify**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "init-to-interactive" --project=chromium`
- Expected: Passes

---

### Task 0.5 — Add longSession perf scenario

**Step 1: Write the test**

- File: `tests/perf-scenarios.spec.js` (append inside the existing describe block)

```javascript
test("long session scenario captures 30s stability", async ({
  page,
}, testInfo) => {
  test.setTimeout(90000);
  await runScenario(page, testInfo, {
    scenarioName: "longSession",
    level: "beginner",
    action: async () => {
      for (let i = 0; i < 6; i++) {
        await normalPlayScenario(page, { reveals: 2 });
        await page.waitForTimeout(2000);
        await wormBurstScenario(page, { wrongAnswers: 1 });
        await page.waitForTimeout(3000);
      }
    },
  });
});
```

**Step 2: Run and verify**

- Command: `npx playwright test tests/perf-scenarios.spec.js -g "long session" --project=chromium`
- Expected: Passes, produces structed before/after JSON report

---

## Phase 1: Init & Lifecycle Determinism

> **Goal:** Fix confirmed leaks, add stop/destroy paths, make every animation loop lifecycle-managed.

### Task 1.1 — Fix worm event listener leak (F1 — highest priority)

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append inside the describe block)

```javascript
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
```

**Step 2: Run test and verify failure**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "zero document listeners" --project=chromium`
- Expected: Fails — `eventListenersInitialized` is still `true` after `destroy()`

**Step 3: Store handler references in worm-system.events.js**

- File: `src/scripts/worm-system.events.js`
- Refactor `setupEventListeners()` — change each inline closure to a named handler stored in `this._eventHandlers`:

```javascript
proto.setupEventListeners = function () {
  if (this.eventListenersInitialized) {
    console.log("⚠️ Event listeners already initialized, skipping...");
    return;
  }

  console.log("🎧 Setting up WormSystem event listeners...");

  this._eventHandlers = {};

  this._eventHandlers[GameEvents.PROBLEM_LINE_COMPLETED] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    console.log("🐛 Worm System received problemLineCompleted event:", detail);
    this.rowsCompleted++;
    this.initialize();
    const spawnCount = this.wormsPerRow + Math.max(0, this.rowsCompleted - 1);
    console.log(
      `📊 Row ${this.rowsCompleted} completed. Spawning ${spawnCount} green worm(s) in Panel B.`,
    );
    for (let i = 0; i < spawnCount; i++) {
      const revealedSymbols = this.getCachedRevealedSymbols();
      let targetSymbol = null;
      if (revealedSymbols && revealedSymbols.length > 0) {
        const idx = Math.floor(Math.random() * revealedSymbols.length);
        targetSymbol = revealedSymbols[idx].textContent;
      }
      this.queueWormSpawn("panelB", { targetSymbol });
    }
  };

  this._eventHandlers[GameEvents.PROBLEM_COMPLETED] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    console.log(
      "🎉 Problem completed! Resetting row counter and cleaning up.",
      detail,
    );
    this.rowsCompleted = 0;
    console.log("🎯 Problem completed - killing all worms!");
    this.killAllWorms();
    setTimeout(() => {
      this.cleanupCracks();
    }, this.PROBLEM_COMPLETION_CLEANUP_DELAY);
  };

  this._eventHandlers[GameEvents.PURPLE_WORM_TRIGGERED] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    console.log(
      "🟣 Purple Worm System received purpleWormTriggered event:",
      detail,
    );
    this.queueWormSpawn("purple");
  };

  this._eventHandlers[GameEvents.SYMBOL_CLICKED] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    this.checkWormTargetClickForExplosion(detail.symbol);
  };

  this._eventHandlers[GameEvents.SYMBOL_REVEALED] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    console.log("🎯 Symbol revealed event:", detail);
    this.notifyWormsOfRedSymbol(detail.symbol);
  };

  this._eventHandlers[GameEvents.WORM_CURSOR_UPDATE] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    this.cursorState = detail;
    if (!this.isAutomation || !detail?.isActive) {
      return;
    }
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    for (const worm of this.worms) {
      if (!worm?.active) continue;
      this._updateWormEvadingCursor(worm, viewportWidth, viewportHeight);
      if (worm.active && worm.element && worm.element.parentNode) {
        this._applyWormPosition(worm);
      }
    }
  };

  this._eventHandlers[GameEvents.WORM_CURSOR_TAP] = (event) => {
    const detail = /** @type {CustomEvent} */ (event).detail;
    this.cursorState = detail;
  };

  for (const [eventName, handler] of Object.entries(this._eventHandlers)) {
    document.addEventListener(eventName, handler);
  }

  if (this.cursorTracker) {
    this.cursorTracker.start();
  }

  this.eventListenersInitialized = true;
  console.log("✅ WormSystem event listeners initialized");
};

proto.removeEventListeners = function () {
  if (!this._eventHandlers) return;

  for (const [eventName, handler] of Object.entries(this._eventHandlers)) {
    document.removeEventListener(eventName, handler);
  }

  if (this.cursorTracker) {
    this.cursorTracker.stop();
  }

  this._eventHandlers = null;
  this.eventListenersInitialized = false;
  console.log("🧹 WormSystem event listeners removed");
};
```

**Step 4: Wire destroy() to call removeEventListeners()**

- File: `src/scripts/worm.js`
- Change `destroy()` to:

```javascript
destroy() {
  this.isDestroyed = true;
  if (this.animationFrameId) {
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = null;
  }
  if (typeof this.removeEventListeners === "function") {
    this.removeEventListeners();
  }
}
```

**Step 5: Wire reset() to call removeEventListeners()**

- File: `src/scripts/worm-system.cleanup.js`
- At the end of the `reset()` method, before the closing `};`, add:

```javascript
if (typeof this.removeEventListeners === "function") {
  this.removeEventListeners();
}
```

**Step 6: Run test and verify success**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "zero document listeners" --project=chromium`
- Expected: Passes

**Step 7: Validate**

- Command: `npm run verify && npm run typecheck`
- Expected: Clean pass

---

### Task 1.2 — Add stopAnimation to symbol rain (F2)

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("symbol rain animation can be stopped cleanly", async ({ page }) => {
  await preparePerfGame(page);

  const result = await page.evaluate(() => {
    return {
      hasStop: typeof window.SymbolRainAnimation?.stopAnimation === "function",
    };
  });

  expect(result.hasStop).toBe(true);
});
```

**Step 2: Run and verify failure**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "stopped cleanly" --project=chromium`
- Expected: Fails — `stopAnimation` does not exist

**Step 3: Implement stopAnimation**

- File: `src/scripts/symbol-rain.animation.js`
- Add `stopAnimation` function after `startAnimation`:

```javascript
function stopAnimation(state) {
  state.isAnimationRunning = false;

  for (let i = 0; i < state.activeFallingSymbols.length; i++) {
    const symbolObj = state.activeFallingSymbols[i];
    SymbolRainHelpers.cleanupSymbolObject({
      symbolObj,
      activeFaceReveals: state.activeFaceReveals,
      symbolPool: state.symbolPool,
    });
  }
  state.activeFallingSymbols.length = 0;
}
```

- Add `stopAnimation` to the `window.SymbolRainAnimation` export object alongside the existing methods.

**Step 4: Run and verify success**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "stopped cleanly" --project=chromium`
- Expected: Passes

**Step 5: Validate**

- Command: `npm run verify && npm run typecheck`

---

### Task 1.3 — Add visibility throttling to worm animation (F4)

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("worm animation pauses when tab is hidden", async ({ page }, testInfo) => {
  await preparePerfGame(page);

  const before = await page.evaluate(
    () => window.__lifecycleTracker?._rafLoopCount ?? 0,
  );

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: true,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await page.waitForTimeout(1000);
  const during = await page.evaluate(
    () => window.__lifecycleTracker?._rafLoopCount ?? 0,
  );

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      value: false,
      writable: true,
      configurable: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await page.waitForTimeout(1000);
  const after = await page.evaluate(
    () => window.__lifecycleTracker?._rafLoopCount ?? 0,
  );

  const hiddenGrowth = during - before;
  const visibleGrowth = after - during;

  await testInfo.attach("visibility-throttle", {
    contentType: "application/json",
    body: Buffer.from(
      JSON.stringify(
        { before, during, after, hiddenGrowth, visibleGrowth },
        null,
        2,
      ),
    ),
  });

  expect(visibleGrowth).toBeGreaterThan(hiddenGrowth * 2);
});
```

**Step 2: Run and verify failure**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "tab is hidden" --project=chromium`
- Expected: Fails — worm rAF continues at full rate when hidden

**Step 3: Implement visibility handler**

- File: `src/scripts/worm-system.movement.js`
- Add after `const proto = window.WormSystem.prototype;`:

```javascript
proto._setupVisibilityThrottle = function () {
  if (this._visibilityHandler) return;
  this._visibilityHandler = () => {
    if (document.hidden) {
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
        console.log("🐛 Worm animation paused (tab hidden)");
      }
    } else {
      if (
        !this.animationFrameId &&
        !this.isDestroyed &&
        this.worms.length > 0
      ) {
        this.animate();
        console.log("🐛 Worm animation resumed (tab visible)");
      }
    }
  };
  document.addEventListener("visibilitychange", this._visibilityHandler);
};
```

- At the beginning of the existing `proto.animate` function, add a guard to setup the throttle once:

```javascript
if (!this._visibilityHandler) {
  this._setupVisibilityThrottle();
}
```

**Step 4: Run and verify success**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "tab is hidden" --project=chromium`
- Expected: Passes

**Step 5: Validate**

- Command: `npm run verify && npm run typecheck`

---

### Task 1.4 — Add destroy() to DynamicQualityAdjuster

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("DynamicQualityAdjuster can be destroyed", async ({ page }) => {
  await preparePerfGame(page);

  const result = await page.evaluate(() => {
    const adjuster = window.dynamicQualityAdjuster;
    return { hasDestroy: adjuster && typeof adjuster.destroy === "function" };
  });

  expect(result.hasDestroy).toBe(true);
});
```

**Step 2: Run and verify failure**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "QualityAdjuster.*destroyed" --project=chromium`
- Expected: Fails — no `destroy()` method

**Step 3: Implement**

- File: `src/scripts/dynamic-quality-adjuster.js`
- Add `destroy()` method to the class:

```javascript
destroy() {
  this.isActive = false;
  this.fpsHistory = [];
  console.log("📈 Dynamic Quality Adjuster destroyed");
}
```

**Step 4: Run and verify success**

**Step 5: Validate**

- Command: `npm run verify && npm run typecheck`

---

### Task 1.5 — Add destroy() to PerformanceMonitor

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("PerformanceMonitor can be destroyed", async ({ page }) => {
  await preparePerfGame(page);

  const result = await page.evaluate(() => {
    const monitor = window.performanceMonitor;
    return { hasDestroy: monitor && typeof monitor.destroy === "function" };
  });

  expect(result.hasDestroy).toBe(true);
});
```

**Step 2: Run and verify failure**

**Step 3: Implement**

- File: `src/scripts/performance-monitor.js`
- Add a `destroy()` method that sets a `_destroyed` flag. In the rAF measurement loop, check `if (self._destroyed) return;` to stop the loop.

```javascript
destroy() {
  this._destroyed = true;
  console.log("📊 PerformanceMonitor destroyed");
}
```

**Step 4: Run and verify success**

**Step 5: Validate**

- Command: `npm run verify && npm run typecheck`

---

### Task 1.6 — Boot-sequence fail-fast guard

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("game-init logs BOOT_FAIL if required globals are missing", async ({
  page,
}) => {
  // Block worm.js from loading
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
```

**Step 2: Run and verify failure — game silently partial-boots**

**Step 3: Implement fail-fast guard**

- File: `src/scripts/game-init.js`
- At the end of the IIFE, after `window.GameInit = { ... };`, add:

```javascript
// Fail-fast: verify critical globals exist after a short delay (scripts load async)
setTimeout(() => {
  const requiredGlobals = ["WormSystem", "GameProblemManager"];
  const missing = requiredGlobals.filter((name) => !window[name]);
  if (missing.length > 0) {
    console.error(
      `🎮 BOOT_FAIL: Missing required globals: ${missing.join(", ")}`,
    );
  }
}, 2000);
```

**Step 4: Run and verify success**

**Step 5: Validate**

- Command: `npm run verify && npm run typecheck`

---

### Task 1.7 — Wire power-up rAF cleanup to worm destruction

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("no orphaned intervals after killAllWorms", async ({ page }, testInfo) => {
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

  // Intervals should not grow after killing all worms
  expect(afterReport.activeIntervals).toBeLessThanOrEqual(
    beforeReport.activeIntervals,
  );
});
```

**Step 2: Run — may pass or fail depending on power-up state**

**Step 3: If needed, add cleanup hooks**

- File: `src/scripts/worm-powerups.effects.spider.js` — in the spider rAF loop, add a check `if (!wormData.active) return;` to exit the loop when the target worm dies.
- File: `src/scripts/worm-powerups.effects.devil.js` — same pattern for the proximity-check rAF loop.

**Step 4-5: TDD completion + validate**

- Command: `npm run verify && npm run typecheck`

---

## Phase 2: Memory & Resource Bounding

> **Goal:** Cap every growable resource so long sessions can't degrade.

### Task 2.1 — Bound symbol rain pool ceiling

**Step 1: Write the failing test**

- File: `tests/perf-scenarios.spec.js` (append inside describe)

```javascript
test("symbol rain pool never exceeds ceiling", async ({ page }, testInfo) => {
  await preparePerfGame(page, { level: "master" });
  await page.waitForTimeout(10000);

  const count = await page.evaluate(() => {
    const container = document.getElementById("symbol-rain-container");
    return container ? container.children.length : 0;
  });

  await testInfo.attach("rain-pool-count", {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({ count }, null, 2)),
  });

  expect(count).toBeLessThan(250);
});
```

**Step 2: Run and check**

- Command: `npx playwright test tests/perf-scenarios.spec.js -g "pool.*ceiling" --project=chromium`
- Expected: May pass or fail — establishes baseline

**Step 3: If needed, implement pool ceiling**

- File: `src/scripts/symbol-rain.helpers.*.js` (whichever file contains the `createSymbol` or spawn logic)
- Add a guard: skip creation when `state.activeFallingSymbols.length >= 200`.
- Add `MAX_RAIN_POOL_SIZE: 200` to the relevant config or constants.

**Step 4-5: TDD completion + validate**

---

### Task 2.2 — Bound worm spawn queue depth

**Step 1: Write the test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("worm spawn queue does not exceed configured cap", async ({ page }) => {
  await preparePerfGame(page);

  await page.evaluate(() => {
    for (let i = 0; i < 50; i++) {
      window.wormSystem.queueWormSpawn("panelB", { targetSymbol: "x" });
    }
  });

  const queueSize = await page.evaluate(() => {
    return window.wormSystem.spawnManager?._queue?.length ?? 0;
  });

  expect(queueSize).toBeLessThanOrEqual(20);
});
```

**Step 2: Run — likely fails (no cap exists)**

**Step 3: Implement cap**

- File: `src/scripts/worm-spawn-manager.queue.js`
- In the `enqueue` method, add: if `this._queue.length >= 20`, `shift()` the oldest entry before pushing.

**Step 4-5: TDD completion + validate**

---

### Task 2.3 — Null DOM references on worm destruction

**Step 1: Write the test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("worm data element is nulled after removal", async ({ page }) => {
  await preparePerfGame(page);
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const worm = window.wormSystem.worms[0];
    if (!worm) return { noWorm: true };
    const id = worm.id;
    window.wormSystem.removeWorm(worm);
    return { id, elementIsNull: worm.element === null };
  });

  if (!result.noWorm) {
    expect(result.elementIsNull).toBe(true);
  }
});
```

**Step 2: Run and verify failure**

**Step 3: Implement**

- File: `src/scripts/worm-system.cleanup.js`
- In `removeWorm()`, after removing the element from DOM, add:

```javascript
wormData.element = null;
wormData.consoleSlotElement = null;
```

**Step 4-5: TDD completion + validate**

---

### Task 2.4 — Console slot element reuse audit

**Step 1: Write baseline test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("console area DOM count stays flat across symbol stores", async ({
  page,
}, testInfo) => {
  await preparePerfGame(page);

  const beforeCount = await page.evaluate(() => {
    const consoleGrid = document.querySelector(".console-grid");
    return consoleGrid ? consoleGrid.querySelectorAll("*").length : 0;
  });

  // Simulate 20 symbol stores via correct clicks
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const step = window.GameProblemManager?.currentSolutionStepIndex ?? 0;
      const sym = document.querySelector(
        `[data-step-index="${step}"].hidden-symbol`,
      );
      if (sym?.textContent) {
        document.dispatchEvent(
          new CustomEvent("symbolClicked", {
            detail: { symbol: sym.textContent },
          }),
        );
      }
    });
    await page.waitForTimeout(300);
  }

  const afterCount = await page.evaluate(() => {
    const consoleGrid = document.querySelector(".console-grid");
    return consoleGrid ? consoleGrid.querySelectorAll("*").length : 0;
  });

  await testInfo.attach("console-dom-audit", {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify({ beforeCount, afterCount }, null, 2)),
  });

  // Growth should be minimal (< 50%)
  expect(afterCount).toBeLessThan(beforeCount * 1.5 + 10);
});
```

**Step 2: Run — baseline. Fix if growth detected.**

---

### Task 2.5 — Add event listener estimate to perf snapshot

**Step 1: Write the failing test**

- File: `tests/performance-bench.spec.js` (extend the existing snapshot test)
- Add assertion:

```javascript
expect(snapshot).toHaveProperty("resourceManagerStats");
```

**Step 2: Run and verify failure**

**Step 3: Implement**

- File: `src/scripts/performance-monitor.js`
- In `getSnapshot()`, add:

```javascript
resourceManagerStats: window.ResourceManager?.getStats() ?? null,
```

**Step 4-5: TDD completion + validate**

---

## Phase 3: Runtime Performance Hardening

> **Goal:** Fix observed jank, eliminate layout thrashing, remove `transition: all`.

### Task 3.1 — Replace style.left/top with CSS transforms for worms (F3)

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("worm positioning uses CSS transforms, not top/left", async ({ page }) => {
  await preparePerfGame(page);
  await page.waitForTimeout(3000);

  const result = await page.evaluate(() => {
    const wormEl = document.querySelector(".worm");
    if (!wormEl) return { found: false };
    return {
      found: true,
      hasTransform: wormEl.style.transform.includes("translate"),
      hasInlineLeft: wormEl.style.left !== "",
      hasInlineTop: wormEl.style.top !== "",
    };
  });

  if (result.found) {
    expect(result.hasTransform).toBe(true);
    expect(result.hasInlineLeft).toBe(false);
    expect(result.hasInlineTop).toBe(false);
  }
});
```

**Step 2: Run and verify failure**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "CSS transforms" --project=chromium`
- Expected: Fails — worms use `style.left`/`style.top`

**Step 3: Implement**

- File: `src/scripts/worm-renderer.js`
- Change `applyWormPosition(worm)`:

```javascript
applyWormPosition(worm) {
  worm.element.style.transform = `translate(${worm.x}px, ${worm.y}px) rotate(${worm.direction + Math.PI}rad)`;
}
```

- Remove separate `updateWormRotation()` calls if they exist — rotation is now part of the combined transform.
- In the CSS for `.worm`, ensure `position: absolute; left: 0; top: 0; will-change: transform;`.

**Step 4: Run and verify success**

**Step 5: Run gameplay smoke test to ensure worms still render correctly**

- Command: `npm run test:competition:smoke`

**Step 6: Validate**

- Command: `npm run verify && npm run typecheck`

---

### Task 3.2 — Replace style.top with translateY for symbol rain (F3)

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("falling symbols use CSS transforms, not top", async ({ page }) => {
  await preparePerfGame(page);
  await page.waitForTimeout(2000);

  const result = await page.evaluate(() => {
    const sym = document.querySelector(".falling-symbol");
    if (!sym) return { found: false };
    return {
      found: true,
      hasTransform: sym.style.transform.includes("translate"),
      hasInlineTop: sym.style.top !== "",
    };
  });

  if (result.found) {
    expect(result.hasTransform).toBe(true);
    expect(result.hasInlineTop).toBe(false);
  }
});
```

**Step 2: Run and verify failure**

**Step 3: Implement**

- File: `src/scripts/symbol-rain.animation.js`
- Replace both occurrences of `symbolObj.element.style.top = \`${symbolObj.y}px\`;` with:

```javascript
symbolObj.element.style.transform = `translateY(${symbolObj.y}px)`;
```

- In the initial symbol setup, set `left` position as a static CSS property (it doesn't change per frame).
- Add `will-change: transform;` to `.falling-symbol` CSS class.

**Step 4-5: TDD completion + smoke test + validate**

---

### Task 3.3 — Audit worm cache hit rates

**Step 1: Write the test**

- File: `tests/perf-scenarios.spec.js` (extend existing normal play scenario assertions)
- Add after `runScenario`:

```javascript
// Assert DOM query rate stays under budget
expect(after.domQueriesPerSec).toBeLessThan(150);
```

**Step 2: Run — may already pass**

**Step 3: If needed, audit `worm-system.cache.js`** — ensure `getCachedRevealedSymbols()`, `getCachedSolutionContainer()` etc. use time-gated caching in hot loops.

**Step 4-5: TDD completion + validate**

---

### Task 3.4 — Deduplicate resolution detection

**Step 1: Write the test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("only one resize observer is active for display/lock", async ({
  page,
}) => {
  await preparePerfGame(page);

  const resizeListenerCount = await page.evaluate(() => {
    // Check if the shared observer pattern exists
    return {
      hasSharedObserver:
        typeof window.SharedResizeObserver !== "undefined" ||
        typeof window.DisplayResizeObserver !== "undefined",
    };
  });

  // Baseline — captures current state for future enforcement
  expect(typeof resizeListenerCount.hasSharedObserver).toBe("boolean");
});
```

**Step 2-5: Implement shared ResizeObserver** if duplication is confirmed between `display-manager.js` and `lock-responsive.js`.

---

### Task 3.5 — CSS transforms for effects and power-ups (F3)

**Step 1: Write the test**

```javascript
test("particle effects use CSS transforms", async ({ page }) => {
  await preparePerfGame(page);

  // Trigger worm explosion to create particles
  await page.evaluate(() => {
    const worm = window.wormSystem.worms[0];
    if (worm) window.wormSystem.explodeWorm(worm);
  });
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const particle = document.querySelector(".worm-particle");
    if (!particle) return { found: false };
    return {
      found: true,
      usesTransform: particle.style.transform.includes("translate"),
    };
  });

  if (result.found) {
    expect(result.usesTransform).toBe(true);
  }
});
```

**Step 2-5: Implement** — change `style.left`/`style.top` to `style.transform` in `worm-system.effects.js` and `worm-renderer.js` for particles, cracks, and splats.

---

### Task 3.6 — Replace all transition: all in CSS (F5)

**Step 1: Write the failing test**

- File: `tests/lifecycle-tracker.spec.js` (append)

```javascript
test("no transition: all in shipped stylesheets", async ({ page }) => {
  await page.goto("/src/pages/game.html?level=beginner");
  await page.waitForTimeout(3000);

  const violations = await page.evaluate(() => {
    const sheets = [...document.styleSheets];
    const results = [];
    for (const sheet of sheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (
            rule.style &&
            rule.style.transition &&
            rule.style.transition.includes("all")
          ) {
            results.push({
              selector: rule.selectorText,
              transition: rule.style.transition,
            });
          }
        }
      } catch (_e) {
        /* cross-origin */
      }
    }
    return results;
  });

  expect(violations).toHaveLength(0);
});
```

**Step 2: Run and verify failure**

- Expected: 15+ matches

**Step 3: Fix each file**
Replace `transition: all` with property-specific transitions in all 15 confirmed locations:

| File                                 | Line | Current                                  | Replace with (example)                                                           |
| ------------------------------------ | ---- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| `line-6-transformer.core.css`        | 46   | `transition: all 2s cubic-bezier(...)`   | `transition: transform 2s cubic-bezier(...), box-shadow 2s cubic-bezier(...)`    |
| `line-6-transformer.entities.css`    | 9    | `transition: all 2s ease-in-out`         | `transition: transform 2s ease-in-out, opacity 2s ease-in-out`                   |
| `line-6-transformer.entities.css`    | 30   | `transition: all 3s ease-in-out`         | `transition: transform 3s ease-in-out, opacity 3s ease-in-out`                   |
| `line-6-transformer.entities.css`    | 103  | `transition: all 4s cubic-bezier(...)`   | `transition: transform 4s cubic-bezier(...), opacity 4s cubic-bezier(...)`       |
| `line-6-transformer.entities.css`    | 124  | `transition: all 4s ease-in-out`         | `transition: transform 4s ease-in-out, opacity 4s ease-in-out`                   |
| `line-6-transformer.entities.css`    | 142  | `transition: all 4s ease-in-out`         | `transition: transform 4s ease-in-out, opacity 4s ease-in-out`                   |
| `line-6-transformer.entities.css`    | 162  | `transition: all 4s ease-in-out`         | `transition: transform 4s ease-in-out, opacity 4s ease-in-out`                   |
| `line-3-transformer.mechanics.css`   | 9    | `transition: all 2s cubic-bezier(...)`   | `transition: transform 2s cubic-bezier(...), opacity 2s cubic-bezier(...)`       |
| `line-3-transformer.mechanics.css`   | 48   | `transition: all 2s ease`                | `transition: transform 2s ease, opacity 2s ease`                                 |
| `line-3-transformer.mechanics.css`   | 85   | `transition: all 2s ease`                | `transition: transform 2s ease, opacity 2s ease`                                 |
| `line-3-transformer.mechanics.css`   | 149  | `transition: all 2s ease`                | `transition: transform 2s ease, opacity 2s ease`                                 |
| `line-3-transformer.mechanics.css`   | 177  | `transition: all 2s ease`                | `transition: transform 2s ease, opacity 2s ease`                                 |
| `line-3-transformer.decorations.css` | 9    | `transition: all 0.5s ease`              | `transition: transform 0.5s ease, opacity 0.5s ease`                             |
| `line-2-transformer.core.css`        | 41   | `transition: all 1.2s cubic-bezier(...)` | `transition: transform 1.2s cubic-bezier(...), opacity 1.2s cubic-bezier(...)`   |
| `modern-ux-enhancements.core.css`    | 88   | `transition: all 0.3s cubic-bezier(...)` | `transition: transform 0.3s cubic-bezier(...), opacity 0.3s cubic-bezier(...)`   |
| `index.core.css`                     | 57   | `transition: all 0.3s ease`              | `transition: transform 0.3s ease, opacity 0.3s ease, background-color 0.3s ease` |

Note: Exact replacement properties depend on what each selector actually animates. Inspect each selector's animated properties and list only those.

**Step 4: Run and verify success**

- Command: `npx playwright test tests/lifecycle-tracker.spec.js -g "transition.*all" --project=chromium`
- Expected: Passes

**Step 5: Run lock animation smoke test**

- Command: `npm run test:competition:smoke`
- Expected: Lock animations still work correctly

**Step 6: Validate**

- Command: `npm run verify && npm run typecheck`

---

## Phase 4: CI Performance Gates

> **Goal:** Wire measurements into merge-blocking checks.

### Task 4.1 — Add perf lane to competition config

**Step 1: Edit playwright.competition.config.js**

- Add to `projects` array:

```javascript
{
  name: "qa-perf-smoke",
  testMatch: ["performance-bench.spec.js", "lifecycle-tracker.spec.js"],
  use: { ...devices["Desktop Chrome"] },
},
```

**Step 2: Run and verify**

- Command: `npx playwright test --config=playwright.competition.config.js --project=qa-perf-smoke`
- Expected: All perf tests pass

---

### Task 4.2 — Add hard assertions to performance-bench.spec.js

**Step 1: Edit tests/performance-bench.spec.js**

- Replace the soft assertions with gates:

```javascript
expect(snapshot.fps).toBeGreaterThan(50);
expect(snapshot.frameBudgetViolationPercent).toBeLessThan(5);
expect(snapshot.domQueriesPerSec).toBeLessThan(150);
```

**Step 2: Run and verify**

- Command: `npx playwright test tests/performance-bench.spec.js --project=chromium`
- Expected: Passes with the new thresholds

---

### Task 4.3 — Add per-scenario assertions to perf-scenarios.spec.js

**Step 1: Edit each test in tests/perf-scenarios.spec.js**

- After `runScenario`, add assertions:

```javascript
expect(Number.isFinite(after.fps)).toBe(true);
expect(after.domQueriesPerSec).toBeLessThan(200);
```

**Step 2: Run and verify**

- Command: `npx playwright test tests/perf-scenarios.spec.js --project=chromium`

---

### Task 4.4 — Create lifecycle-audit.spec.js

**Step 1: Create the test file**

- File: `tests/lifecycle-audit.spec.js` (new)

```javascript
// @ts-check
import { expect, test } from "@playwright/test";
import { injectLifecycleTracker } from "./utils/lifecycle-tracker.js";
import { preparePerfGame } from "./utils/perf-scenarios.js";

test.describe("Lifecycle audit", () => {
  test("zero orphaned resources after game destroy", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.use?.isMobile, "Desktop only");

    await injectLifecycleTracker(page);
    await preparePerfGame(page);
    await page.waitForTimeout(5000);

    // Destroy everything
    await page.evaluate(() => {
      window.wormSystem?.destroy();
      window.dynamicQualityAdjuster?.destroy?.();
      window.performanceMonitor?.destroy?.();
      window.SymbolRainAnimation?.stopAnimation?.(window.__symbolRainState);
    });

    await page.waitForTimeout(1000);

    const report = await page.evaluate(() =>
      window.__lifecycleTracker?.getReport(),
    );

    await testInfo.attach("lifecycle-audit", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(report, null, 2)),
    });

    // After full destroy, orphaned resources should be minimal
    expect(report.activeIntervals).toBeLessThanOrEqual(2);
  });
});
```

**Step 2: Run and verify**

- Command: `npx playwright test tests/lifecycle-audit.spec.js --project=chromium`

---

### Task 4.5 — Add npm run test:perf:gate script

**Step 1: Edit package.json**

- Add to `scripts`:

```json
"test:perf:gate": "npx playwright test tests/performance-bench.spec.js tests/lifecycle-tracker.spec.js tests/lifecycle-audit.spec.js --project=chromium"
```

**Step 2: Run and verify**

- Command: `npm run test:perf:gate`
- Expected: All perf and lifecycle tests pass

**Step 3: Validate**

- Command: `npm run verify`

---

## Verification Checklist

- [ ] Every task has TDD structure (test → fail → implement → pass)
- [ ] Every task has exact file paths
- [ ] Every code block is complete
- [ ] Every command is exact
- [ ] Expected outputs described for commands
- [ ] Plan header includes Goal, Architecture, Tech Stack

## Handoff

This plan is ready for **superpower-execute**. Execute phases sequentially (0 → 1 → 2 → 3 → 4). Within each phase, execute tasks in order. Run `npm run verify && npm run typecheck` after each task.
