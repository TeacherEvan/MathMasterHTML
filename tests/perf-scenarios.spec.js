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
});
