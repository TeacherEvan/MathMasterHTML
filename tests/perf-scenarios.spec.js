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
}
test.describe("Performance scenarios", () => {
  test("idle scenario captures a stable baseline", async ({
    page,
  }, testInfo) => {
    await runScenario(page, testInfo, {
      scenarioName: "idle",
      action: () => idleScenario(page),
    });
  });

  test("normal play scenario captures symbol reveal load", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "normalPlay",
      action: () => normalPlayScenario(page),
    });

    expect(snapshot.after.domQueriesPerSec).toBeLessThan(150);
  });

  test("worm burst scenario captures purple worm pressure", async ({
    page,
  }, testInfo) => {
    const snapshot = await runScenario(page, testInfo, {
      scenarioName: "wormBurst",
      action: () => wormBurstScenario(page),
    });

    expect(snapshot.after.wormCacheStats).toBeTruthy();
    expect(typeof snapshot.after.wormCacheStats.overallHitRate).toBe("number");
  });

  test("dense rain scenario captures master-level activity", async ({
    page,
  }, testInfo) => {
    await runScenario(page, testInfo, {
      scenarioName: "denseRain",
      level: "master",
      action: () => denseRainScenario(page),
    });
  });

  test("lock transition scenario captures completion feedback", async ({
    page,
  }, testInfo) => {
    await runScenario(page, testInfo, {
      scenarioName: "lockTransition",
      action: () => lockTransitionScenario(page),
    });
  });

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
          await idleScenario(page, { durationMs: 3000 });
        }
      },
    });
  });

  test("symbol rain pool never exceeds ceiling", async ({ page }, testInfo) => {
    await preparePerfGame(page, { level: "master" });
    await page.waitForTimeout(10000);

    const counts = await page.evaluate(() => {
      const container = document.getElementById("symbol-rain-container");
      const childCount = container ? container.children.length : 0;
      const activeCount =
        typeof window.getActiveSymbolCount === "function"
          ? window.getActiveSymbolCount()
          : childCount;
      const configuredCeiling =
        window.SymbolRainConfig?.maxActiveSymbols ?? 200;

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
