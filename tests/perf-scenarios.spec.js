// @ts-check
import { expect, test } from "@playwright/test";
import { profileScenario } from "./utils/perf-metrics.js";
import {
  denseRainScenario,
  idleScenario,
  lockTransitionScenario,
  normalPlayScenario,
  preparePerfGame,
  wormBurstScenario,
} from "./utils/perf-scenarios.js";

/**
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').TestInfo} testInfo
 * @param {{ scenarioName: string, level?: string, action: () => Promise<unknown> }} options
 */
async function runScenario(page, testInfo, { scenarioName, level, action }) {
  await preparePerfGame(page, { level });

  const { before, after } = await profileScenario(page, action, {
    scenarioName,
  });

  const snapshot = { before, after };
  const serialized = JSON.stringify(snapshot, null, 2);

  console.log(`📊 [perf:${scenarioName}]\n${serialized}`);
  await testInfo.attach(`${scenarioName}-perf-snapshot`, {
    contentType: "application/json",
    body: Buffer.from(serialized),
  });

  expect(before.scenario).toBe(scenarioName);
  expect(after.scenario).toBe(scenarioName);
  expect(Number.isFinite(after.fps)).toBe(true);
  expect(after.sampleCount).toBeGreaterThan(0);

  return snapshot;
}
test.describe("Performance scenarios", () => {
  test("idle scenario captures a stable baseline", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "idle",
      action: () => idleScenario(page),
    });

    expect(Number.isFinite(snapshot.after.fps)).toBe(true);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(200);
  });

  test("normal play scenario captures symbol reveal load", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "normalPlay",
      action: () => normalPlayScenario(page),
    });

    expect(Number.isFinite(snapshot.after.fps)).toBe(true);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(200);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(150);
  });

  test("worm burst scenario captures purple worm pressure", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "wormBurst",
      action: () => wormBurstScenario(page),
    });

    expect(Number.isFinite(snapshot.after.fps)).toBe(true);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(200);
    expect(snapshot.after.wormCacheStats).toBeTruthy();
    expect(typeof snapshot.after.wormCacheStats.overallHitRate).toBe("number");
  });

  test("dense rain scenario captures master-level activity", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "denseRain",
      level: "master",
      action: () => denseRainScenario(page),
    });

    expect(Number.isFinite(snapshot.after.fps)).toBe(true);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(200);
  });

  test("lock transition scenario captures completion feedback", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "lockTransition",
      action: () => lockTransitionScenario(page),
    });

    expect(Number.isFinite(snapshot.after.fps)).toBe(true);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(200);
  });

  test("long session scenario captures 30s stability", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90000);
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "longSession",
      level: "beginner",
      action: async () => {
        for (let i = 0; i < 6; i++) {
          await normalPlayScenario(page, { reveals: 2 });
          await page.waitForTimeout(2000);
          await idleScenario(page, { durationMs: 3000 });
        }
      },
    });

    expect(Number.isFinite(snapshot.after.fps)).toBe(true);
    expect(snapshot.after.domQueriesPerSec).toBeLessThan(200);
  });

  test("symbol rain pool never exceeds ceiling", async ({ page }, testInfo) => {
    await preparePerfGame(page, { level: "master" });
    await page.waitForTimeout(10000);

    const counts = await page.evaluate(() => {
      const typedWindow = /** @type {Window & {
        getActiveSymbolCount?: () => number,
        SymbolRainConfig?: { maxActiveSymbols?: number },
      }} */ (window);
      const container = document.getElementById("symbol-rain-container");
      const childCount = container ? container.children.length : 0;
      const activeCount =
        typeof typedWindow.getActiveSymbolCount === "function"
          ? typedWindow.getActiveSymbolCount()
          : childCount;
      const configuredCeiling =
        typedWindow.SymbolRainConfig?.maxActiveSymbols ?? 200;

      return {
        activeCount,
        childCount,
        configuredCeiling,
      };
    });

    await testInfo.attach("rain-pool-count", {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(counts, null, 2)),
    });

    expect(counts.activeCount).toBeLessThanOrEqual(counts.configuredCeiling);
    expect(counts.childCount).toBeLessThanOrEqual(counts.configuredCeiling);
  });
});
