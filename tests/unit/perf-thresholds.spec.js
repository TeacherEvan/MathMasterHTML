/**
 * tests/unit/perf-thresholds.spec.js - Unit tests for the perf threshold policy.
 *
 * The perf lane compares wall-clock frame rate against the stored
 * baselines, so its verdict has to be trustworthy: a real regression must
 * still fail, and a measurement taken from a starved host must not be
 * reported as one.
 */

import { expect, test } from "@playwright/test";

import {
  evaluatePerfThresholds,
  normalizePerfProjectName,
  shouldFailPerfThresholds,
} from "../utils/perf-thresholds.js";

const { describe } = test;

const SCENARIO = "denseRain";

/**
 * @param {object} overrides
 */
function snapshotFor(overrides) {
  const sampleCount = overrides.sampleCount ?? 170;
  return {
    before: {
      scenario: SCENARIO,
      fps: 24.5,
      frameTimeAvg: 40.8,
      frameTimeP95: 105.5,
      frameTimeMax: 210.1,
      jankPercent: 22.1,
      frameBudgetViolationPercent: 61.2,
      domNodeCount: 430,
      domQueriesPerSec: 61,
      activeWorms: 0,
      rainSymbols: 180,
      inputLatencyAvg: null,
      inputLatencyP95: null,
      sampleCount,
    },
    after: {
      scenario: SCENARIO,
      fps: 24.5,
      frameTimeAvg: 40.8,
      frameTimeP95: 105.5,
      frameTimeMax: 210.1,
      jankPercent: 22.1,
      frameBudgetViolationPercent: 61.2,
      domNodeCount: 430,
      domQueriesPerSec: 61,
      activeWorms: 0,
      rainSymbols: 180,
      inputLatencyAvg: null,
      inputLatencyP95: null,
      sampleCount,
      ...overrides,
    },
  };
}

function evaluate(overrides, projectName = "chromium") {
  return evaluatePerfThresholds({
    scenarioName: SCENARIO,
    projectName,
    snapshot: snapshotFor(overrides),
  });
}

describe("perf threshold policy", () => {
  test("competition project names map onto the policy profiles", () => {
    // The competition lane names its projects "qa-perf-chromium" and so
    // on. Without normalisation the budget lookup missed every key.
    expect(normalizePerfProjectName("qa-perf-chromium")).toBe("chromium");
    expect(normalizePerfProjectName("qa-perf-pixel-7")).toBe("pixel-7");
    expect(normalizePerfProjectName("qa-perf-iphone-13")).toBe("iphone-13");
    expect(normalizePerfProjectName("chromium")).toBe("chromium");
  });

  test("a healthy scenario passes", () => {
    const report = evaluate({});
    expect(report.status).toBe("pass");
    expect(shouldFailPerfThresholds(report)).toBe(false);
  });

  test("a real regression still fails the lane", () => {
    const report = evaluate({
      fps: 10,
      frameTimeP95: 300,
      jankPercent: 55,
      sampleCount: 170,
    });
    expect(report.status).toBe("catastrophic");
    expect(shouldFailPerfThresholds(report)).toBe(true);
  });

  test("a regression measured below the sample floor is not actionable", () => {
    const report = evaluate({
      fps: 10,
      frameTimeP95: 300,
      jankPercent: 55,
      sampleCount: 118,
    });
    expect(report.status).toBe("insufficient-samples");
    expect(shouldFailPerfThresholds(report)).toBe(false);
    // The detail is still reported so the run is not silently green.
    expect(report.summary).toContain("low-samples");
    expect(report.metrics.some((metric) => metric.status === "catastrophic")).toBe(
      true,
    );
  });

  test("the fps metric is skipped on a profile that cannot resolve it", () => {
    // The iPhone 13 profile renders the game at roughly one frame per
    // second, so the fps metric has no resolution there.
    const report = evaluate(
      { fps: 0.8, frameTimeP95: 1400, jankPercent: 60, sampleCount: 5 },
      "iphone-13",
    );
    const fps = report.metrics.find((metric) => metric.name === "fps");
    expect(fps?.status).toBe("skipped");
    expect(fps?.reason).toContain("insufficient samples");
  });
});
