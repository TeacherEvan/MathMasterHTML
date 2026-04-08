// @ts-check

import { readFileSync } from "node:fs";

export const PERF_BASELINES = JSON.parse(
  readFileSync(new URL("../perf-baselines.json", import.meta.url), "utf8"),
);

export const SCENARIO_VALIDATORS = {
  idle: () => true,
  normalPlay: ({ after }) => after.sampleCount > 0,
  wormBurst: ({ after }) => after.activeWorms >= 1,
  denseRain: ({ after }) => after.rainSymbols >= 1,
  lockTransition: ({ after }) => after.sampleCount > 0,
};

export const SCENARIOS_WITH_INPUT_LATENCY = new Set([
  "normalPlay",
  "lockTransition",
]);

export const PROJECT_POLICIES = {
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