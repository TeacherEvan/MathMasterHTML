// @ts-check
import { expect, test } from "@playwright/test";
import { profileScenario } from "./utils/perf-metrics.js";
import {
  evaluatePerfThresholds,
  resolvePerfPolicy,
  shouldFailPerfThresholds,
} from "./utils/perf-thresholds.js";
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
  const collectSnapshot = async (attemptLabel = "primary") => {
    await preparePerfGame(page, { level });

    const { before, after } = await profileScenario(page, action, {
      scenarioName,
    });

    const snapshot = { before, after };
    const serialized = JSON.stringify(snapshot, null, 2);
    const thresholdReport = evaluatePerfThresholds({
      scenarioName,
      projectName: testInfo.project.name,
      snapshot,
    });

    console.log(`📊 [perf:${scenarioName}]\n${serialized}`);
    console.log(`⚠️ [perf-thresholds] ${thresholdReport.summary}`);

    await testInfo.attach(`${scenarioName}-perf-snapshot-${attemptLabel}`, {
      contentType: "application/json",
      body: Buffer.from(serialized),
    });
    await testInfo.attach(`${scenarioName}-perf-thresholds-${attemptLabel}`, {
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(thresholdReport.attachment, null, 2)),
    });

    expect(before.scenario).toBe(scenarioName);
    expect(after.scenario).toBe(scenarioName);
    expect(Number.isFinite(after.fps)).toBe(true);
    expect(after.sampleCount).toBeGreaterThan(0);

    return { snapshot, thresholdReport };
  };

  const policy = resolvePerfPolicy(testInfo.project.name);
  let { snapshot, thresholdReport } = await collectSnapshot();

  if (
    shouldFailPerfThresholds(thresholdReport) &&
    policy.mode === "catastrophic-only"
  ) {
    console.log(
      `⚠️ [perf-retry] Retrying ${scenarioName}/${policy.projectName} after catastrophic-only failure to confirm the regression under a fresh run`,
    );

    const retryResult = await collectSnapshot("retry");
    if (!shouldFailPerfThresholds(retryResult.thresholdReport)) {
      testInfo.annotations.push({
        type: "perf-data",
        description: `${scenarioName}/${policy.projectName} recovered on confirmation run`,
      });
      return retryResult.snapshot;
    }

    snapshot = retryResult.snapshot;
    thresholdReport = retryResult.thresholdReport;
  }

  for (const annotation of thresholdReport.annotations) {
    testInfo.annotations.push(annotation);
  }

  if (shouldFailPerfThresholds(thresholdReport)) {
    throw new Error(`Performance regression detected: ${thresholdReport.summary}`);
  }

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
    await runScenario(page, testInfo, {
      scenarioName: "normalPlay",
      action: () => normalPlayScenario(page),
    });
  });

  test("worm burst scenario captures purple worm pressure", async ({
    page,
  }, testInfo) => {
    await runScenario(page, testInfo, {
      scenarioName: "wormBurst",
      action: () => wormBurstScenario(page),
    });
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
    await runScenario(page, testInfo, {
      scenarioName: "lockTransition",
      action: () => lockTransitionScenario(page),
    });
  });
});
