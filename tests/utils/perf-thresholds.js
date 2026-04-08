// @ts-check

import { readFileSync } from "node:fs";

const PERF_BASELINES = JSON.parse(
  readFileSync(new URL("../perf-baselines.json", import.meta.url), "utf8"),
);

const SCENARIO_VALIDATORS = {
  idle: () => true,
  normalPlay: ({ after }) => after.sampleCount > 0,
  wormBurst: ({ after }) => after.activeWorms >= 1,
  denseRain: ({ after }) => after.rainSymbols >= 1,
  lockTransition: ({ after }) => after.sampleCount > 0,
};

const SCENARIOS_WITH_INPUT_LATENCY = new Set(["normalPlay", "lockTransition"]);

const PROJECT_POLICIES = {
  chromium: {
    tier: "strong",
    mode: "warning",
    sampleFloor: 15,
    sampleRatio: 0.75,
    metrics: {
      fps: {
        direction: "higher-is-better",
        warnRatio: 0.15,
        catastrophicRatio: 0.35,
        warnAbsolute: 3,
        catastrophicAbsolute: 6,
      },
      frameTimeP95: {
        direction: "lower-is-better",
        warnRatio: 0.2,
        catastrophicRatio: 0.5,
        warnAbsolute: 40,
        catastrophicAbsolute: 120,
      },
      jankPercent: {
        direction: "lower-is-better",
        warnAbsolute: 10,
        catastrophicAbsolute: 20,
      },
      inputLatencyAvg: {
        direction: "lower-is-better",
        warnRatio: 0.5,
        catastrophicRatio: 1.5,
        warnAbsolute: 80,
        catastrophicAbsolute: 200,
      },
    },
  },
  "pixel-7": {
    tier: "strong",
    mode: "warning",
    sampleFloor: 15,
    sampleRatio: 0.75,
    metrics: {
      fps: {
        direction: "higher-is-better",
        warnRatio: 0.15,
        catastrophicRatio: 0.35,
        warnAbsolute: 3,
        catastrophicAbsolute: 6,
      },
      frameTimeP95: {
        direction: "lower-is-better",
        warnRatio: 0.2,
        catastrophicRatio: 0.5,
        warnAbsolute: 40,
        catastrophicAbsolute: 120,
      },
      jankPercent: {
        direction: "lower-is-better",
        warnAbsolute: 10,
        catastrophicAbsolute: 20,
      },
      inputLatencyAvg: {
        direction: "lower-is-better",
        warnRatio: 0.5,
        catastrophicRatio: 1.5,
        warnAbsolute: 80,
        catastrophicAbsolute: 200,
      },
    },
  },
  firefox: {
    tier: "loose",
    mode: "warning",
    sampleFloor: 10,
    sampleRatio: 0.7,
    metrics: {
      fps: {
        direction: "higher-is-better",
        warnRatio: 0.2,
        catastrophicRatio: 0.4,
        warnAbsolute: 2,
        catastrophicAbsolute: 4,
      },
      frameTimeP95: {
        direction: "lower-is-better",
        warnRatio: 0.25,
        catastrophicRatio: 0.6,
        warnAbsolute: 60,
        catastrophicAbsolute: 150,
      },
      jankPercent: {
        direction: "lower-is-better",
        warnAbsolute: 12,
        catastrophicAbsolute: 24,
      },
      inputLatencyAvg: {
        direction: "lower-is-better",
        warnRatio: 0.75,
        catastrophicRatio: 1.5,
        warnAbsolute: 120,
        catastrophicAbsolute: 250,
      },
    },
  },
  webkit: {
    tier: "catastrophic-only",
    mode: "catastrophic-only",
    sampleFloor: 5,
    sampleRatio: 0.6,
    metrics: {
      fps: {
        direction: "higher-is-better",
        catastrophicRatio: 0.35,
        catastrophicAbsolute: 1,
      },
      frameTimeP95: {
        direction: "lower-is-better",
        catastrophicRatio: 0.5,
        catastrophicAbsolute: 250,
      },
      jankPercent: {
        direction: "lower-is-better",
        catastrophicAbsolute: 20,
      },
      inputLatencyAvg: {
        direction: "lower-is-better",
        catastrophicRatio: 1.5,
        catastrophicAbsolute: 200,
      },
    },
  },
  "iphone-13": {
    tier: "catastrophic-only",
    mode: "catastrophic-only",
    sampleFloor: 5,
    sampleRatio: 0.6,
    metrics: {
      fps: {
        direction: "higher-is-better",
        catastrophicRatio: 0.35,
        catastrophicAbsolute: 1,
      },
      frameTimeP95: {
        direction: "lower-is-better",
        catastrophicRatio: 0.5,
        catastrophicAbsolute: 250,
      },
      jankPercent: {
        direction: "lower-is-better",
        catastrophicAbsolute: 20,
      },
      inputLatencyAvg: {
        direction: "lower-is-better",
        catastrophicRatio: 1.5,
        catastrophicAbsolute: 200,
      },
    },
  },
};

function roundNumber(value, digits = 2) {
  return Number(value.toFixed(digits));
}

export function normalizePerfProjectName(projectName) {
  const lower = String(projectName).toLowerCase();
  if (lower.includes("pixel-7")) return "pixel-7";
  if (lower.includes("iphone-13")) return "iphone-13";
  if (lower.includes("chromium")) return "chromium";
  if (lower.includes("firefox")) return "firefox";
  if (lower.includes("webkit")) return "webkit";
  return projectName;
}

export function resolvePerfPolicy(projectName) {
  const normalized = normalizePerfProjectName(projectName);
  return {
    projectName: normalized,
    ...(PROJECT_POLICIES[normalized] ?? PROJECT_POLICIES.chromium),
  };
}

export function getPerfBaselines() {
  return PERF_BASELINES;
}

function formatDelta(metricName, metricResult) {
  const sign = metricResult.delta > 0 ? "+" : "";
  if (metricName === "fps") {
    return `${metricName} ${sign}${roundNumber(metricResult.delta)} (${sign}${roundNumber(metricResult.deltaRatio * 100)}%)`;
  }
  return `${metricName} ${sign}${roundNumber(metricResult.delta)} (${sign}${roundNumber(metricResult.deltaRatio * 100)}%)`;
}

function evaluateMetric(metricName, baselineValue, actualValue, metricPolicy) {
  if (
    typeof baselineValue !== "number" ||
    !Number.isFinite(baselineValue) ||
    typeof actualValue !== "number" ||
    !Number.isFinite(actualValue)
  ) {
    return {
      name: metricName,
      status: "skipped",
      reason: "metric unavailable",
      baseline: baselineValue ?? null,
      actual: actualValue ?? null,
    };
  }

  const higherIsBetter = metricPolicy.direction === "higher-is-better";
  const delta = actualValue - baselineValue;
  const deltaRatio =
    baselineValue === 0
      ? 0
      : higherIsBetter
        ? (baselineValue - actualValue) / baselineValue
        : (actualValue - baselineValue) / baselineValue;
  const absoluteRegression = higherIsBetter ? baselineValue - actualValue : actualValue - baselineValue;

  let status = "pass";
  const catastrophicByRatio =
    metricPolicy.catastrophicRatio !== undefined &&
    deltaRatio > metricPolicy.catastrophicRatio &&
    (metricPolicy.catastrophicAbsolute === undefined ||
      absoluteRegression > metricPolicy.catastrophicAbsolute);
  const catastrophicByAbsolute =
    metricPolicy.catastrophicAbsolute !== undefined &&
    metricPolicy.catastrophicRatio === undefined &&
    absoluteRegression > metricPolicy.catastrophicAbsolute;

  if (catastrophicByRatio || catastrophicByAbsolute) {
    status = "catastrophic";
  } else if (
    metricPolicy.warnRatio !== undefined &&
    deltaRatio > metricPolicy.warnRatio &&
    (metricPolicy.warnAbsolute === undefined ||
      absoluteRegression > metricPolicy.warnAbsolute)
  ) {
    status = "warn";
  } else if (
    metricPolicy.warnAbsolute !== undefined &&
    metricPolicy.warnRatio === undefined &&
    absoluteRegression > metricPolicy.warnAbsolute
  ) {
    status = "warn";
  }

  return {
    name: metricName,
    baseline: roundNumber(baselineValue),
    actual: roundNumber(actualValue),
    delta: roundNumber(delta),
    deltaRatio: roundNumber(deltaRatio),
    absoluteRegression: roundNumber(absoluteRegression),
    status,
  };
}

export function evaluatePerfThresholds({
  scenarioName,
  projectName,
  snapshot,
}) {
  const baselines = getPerfBaselines();
  const policy = resolvePerfPolicy(projectName);
  const normalizedProject = policy.projectName;
  const baselineScenario = baselines.baselines?.[normalizedProject]?.[scenarioName];
  const after = snapshot.after ?? {};
  const annotations = [];

  if (!baselineScenario) {
    const summary = `no baseline for ${scenarioName}/${normalizedProject}`;
    annotations.push({ type: "perf-data", description: summary });
    return {
      status: "missing-baseline",
      scenarioName,
      projectName: normalizedProject,
      tier: policy.tier,
      mode: policy.mode,
      scenarioValid: false,
      sampleStatus: "unknown",
      summary,
      metrics: [],
      annotations,
      attachment: {
        status: "missing-baseline",
        scenarioName,
        projectName: normalizedProject,
      },
    };
  }

  const validator = SCENARIO_VALIDATORS[scenarioName] ?? (() => true);
  const scenarioValid = validator(snapshot);
  const baselineSampleCount = baselineScenario.sampleCount ?? 0;
  const minRequiredSamples = Math.max(
    policy.sampleFloor,
    Math.ceil(baselineSampleCount * policy.sampleRatio),
  );
  const sampleStatus = after.sampleCount >= minRequiredSamples ? "ok" : "low";

  if (!scenarioValid) {
    const summary = `${scenarioName}/${normalizedProject} invalid scenario state`;
    annotations.push({ type: "perf-data", description: summary });
    return {
      status: "invalid-scenario",
      scenarioName,
      projectName: normalizedProject,
      tier: policy.tier,
      mode: policy.mode,
      scenarioValid,
      sampleStatus,
      summary,
      metrics: [],
      annotations,
      attachment: {
        status: "invalid-scenario",
        scenarioName,
        projectName: normalizedProject,
        baseline: baselineScenario,
        actual: after,
        minRequiredSamples,
      },
    };
  }

  const metrics = [];
  for (const [metricName, metricPolicy] of Object.entries(policy.metrics)) {
    if (
      metricName === "inputLatencyAvg" &&
      !SCENARIOS_WITH_INPUT_LATENCY.has(scenarioName)
    ) {
      continue;
    }
    metrics.push(
      evaluateMetric(metricName, baselineScenario[metricName], after[metricName], metricPolicy),
    );
  }

  const catastrophicMetrics = metrics.filter((metric) => metric.status === "catastrophic");
  const warningMetrics = metrics.filter((metric) => metric.status === "warn");

  let status = "pass";
  if (catastrophicMetrics.length > 0) {
    status = "catastrophic";
  } else if (warningMetrics.length > 0) {
    status = "warn";
  }

  if (sampleStatus === "low") {
    if (status === "pass") {
      status = "insufficient-samples";
    }
    annotations.push({
      type: "perf-data",
      description: `${scenarioName}/${normalizedProject} low samples ${after.sampleCount}/${minRequiredSamples}`,
    });
  }

  const highlightedMetrics =
    catastrophicMetrics.length > 0 ? catastrophicMetrics : warningMetrics;
  const summaryParts = highlightedMetrics.map((metric) => formatDelta(metric.name, metric));
  const sampleMarker =
    sampleStatus === "low"
      ? ` [low-samples ${after.sampleCount}/${minRequiredSamples}]`
      : "";
  const summary =
    summaryParts.length > 0
      ? `${scenarioName}/${normalizedProject} ${status}${sampleMarker}: ${summaryParts.join(", ")}`
      : `${scenarioName}/${normalizedProject} ${status}${sampleMarker}`;

  if (status === "warn") {
    annotations.push({ type: "perf-warning", description: summary });
  }
  if (status === "catastrophic") {
    annotations.push({ type: "perf-critical", description: summary });
  }

  return {
    status,
    scenarioName,
    projectName: normalizedProject,
    tier: policy.tier,
    mode: policy.mode,
    scenarioValid,
    sampleStatus,
    summary,
    metrics,
    annotations,
    attachment: {
      schemaVersion: 1,
      status,
      scenarioName,
      projectName: normalizedProject,
      tier: policy.tier,
      mode: policy.mode,
      baseline: baselineScenario,
      actual: after,
      sample: {
        actual: after.sampleCount,
        baseline: baselineSampleCount,
        minRequired: minRequiredSamples,
        status: sampleStatus,
      },
      metrics,
      summary,
    },
  };
}
