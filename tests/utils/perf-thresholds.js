// @ts-check

import {
  PERF_BASELINES,
  PROJECT_POLICIES,
  SCENARIOS_WITH_INPUT_LATENCY,
  SCENARIO_VALIDATORS,
} from "./perf-thresholds.config.js";

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

function evaluateMetric(
  metricName,
  baselineValue,
  actualValue,
  metricPolicy,
  sampleCount,
) {
  if (
    typeof metricPolicy.minSamples === "number" &&
    sampleCount < metricPolicy.minSamples
  ) {
    return {
      name: metricName,
      status: "skipped",
      reason: `insufficient samples for ${metricName}`,
      baseline: baselineValue ?? null,
      actual: actualValue ?? null,
    };
  }

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
      evaluateMetric(
        metricName,
        baselineScenario[metricName],
        after[metricName],
        metricPolicy,
        after.sampleCount ?? 0,
      ),
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

export function shouldFailPerfThresholds(report) {
  return ["catastrophic", "invalid-scenario"].includes(report?.status);
}
