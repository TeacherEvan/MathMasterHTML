// @ts-check

/**
 * tests/utils/perf-metrics.js - Playwright helpers for performance metrics collection
 *
 * Uses the PerformanceMonitor.getSnapshot() API added to
 * src/scripts/performance-monitor.js.
 */

/**
 * @typedef {object} PerfSnapshot
 * @property {number} fps
 * @property {number} frameTimeAvg
 * @property {number} frameTimeP95
 * @property {number} frameTimeMax
 * @property {number} jankPercent
 * @property {number} frameBudgetViolationPercent
 * @property {number} domNodeCount
 * @property {number} domQueriesPerSec
 * @property {number} activeWorms
 * @property {number} rainSymbols
 * @property {number|null} inputLatencyAvg
 * @property {number|null} inputLatencyP95
 * @property {{ activeTimeouts: number, activeIntervals: number, totalActive: number } | null} resourceManagerStats
 * @property {{ totalHits: number, totalMisses: number, totalRequests: number, overallHitRate: number, caches: object }} wormCacheStats
 * @property {number} sampleCount
 * @property {number} timestamp
 * @property {string} [scenario]
 */

/**
 * Enable extended perf instrumentation and wait for warmup frames.
 * Call this AFTER page.goto() and BEFORE the game starts.
 *
 * @param {import('@playwright/test').Page} page
 * @param {{ warmupMs?: number }} [opts]
 */
export async function enablePerfMetrics(page, opts = {}) {
  const warmupMs = opts.warmupMs ?? 1500;

  await page.evaluate(() => {
    window.__PERF_INSTRUMENTATION = true;
  });

  // Let the histogram buffer collect a baseline worth of frames
  if (warmupMs > 0) {
    await page.waitForTimeout(warmupMs);
  }
}

/**
 * Collect a snapshot from the running game's PerformanceMonitor.
 *
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<PerfSnapshot>}
 */
export async function collectPerfSnapshot(page) {
  return page.evaluate(() => {
    if (!window.performanceMonitor || !window.performanceMonitor.getSnapshot) {
      throw new Error(
        "PerformanceMonitor not available or getSnapshot not found",
      );
    }
    return window.performanceMonitor.getSnapshot();
  });
}

/**
 * Run a timed scenario and return before/after snapshots.
 *
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<unknown>} scenario - async function that drives the scenario
 * @param {{ durationMs?: number, scenarioName?: string }} [opts]
 * @returns {Promise<{ before: PerfSnapshot, after: PerfSnapshot }>}
 */
export async function profileScenario(page, scenario, opts = {}) {
  const before = await collectPerfSnapshot(page);

  await scenario();

  if (opts.durationMs) {
    await page.waitForTimeout(opts.durationMs);
  }

  const after = await collectPerfSnapshot(page);

  if (opts.scenarioName) {
    before.scenario = opts.scenarioName;
    after.scenario = opts.scenarioName;
  }

  return { before, after };
}
