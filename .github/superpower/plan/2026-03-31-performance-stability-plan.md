# Performance & Stability — Implementation Plan

**Source design:** [brainstorm/2026-03-31-performance-stability-design.md](../brainstorm/2026-03-31-performance-stability-design.md)  
**Date:** 2026-03-31  
**Status:** Ready for execution

---

## Existing Infrastructure (what we already have)

| Asset                    | Location                                        | What it provides                                                        |
| ------------------------ | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `PerformanceMonitor`     | `src/scripts/performance-monitor.js`            | FPS, frame time, DOM queries/sec, worm/symbol counts (overlay, press P) |
| `DynamicQualityAdjuster` | `src/scripts/dynamic-quality-adjuster.js`       | Auto-adjusts quality tier based on FPS history                          |
| Perf bench spec          | `tests/performance-bench.spec.js`               | Basic FPS ≥ 30 + memory < 600 MB check                                  |
| Micro-benchmarks         | `tests/performance/worm-movement-bench.spec.js` | Per-function timing for worm movement/evasion                           |
| Perf docs                | `Docs/SystemDocs/PERFORMANCE.md`                | Historical targets and optimization patterns                            |
| Competition config       | `playwright.competition.config.js`              | 5 projects: chromium, firefox, webkit, iphone-13, pixel-7               |
| Competition lanes        | `package.json` scripts                          | smoke, matrix, soak, stress, full                                       |

### Gaps to fill

1. **No structured metrics export** — `PerformanceMonitor` displays in overlay but doesn't expose data for Playwright to collect programmatically.
2. **No scenario-tagged profiling** — metrics aren't bucketed by gameplay state (idle, active play, worm burst, lock transition).
3. **No jank % or P95 frame-time tracking** — only averages.
4. **No input-latency proxy** — interaction → visual feedback timing not measured.
5. **No threshold guardrails in CI** — `performance-bench.spec.js` only checks FPS ≥ 30 (too low).
6. **No cross-platform baseline comparison** — same spec doesn't run on mobile projects.

---

## Milestone 1 — Baseline Scaffolding

> **Goal:** Make perf metrics programmatically accessible and capture a structured baseline.

### Task 1.1 — Add metrics snapshot API to PerformanceMonitor

**File:** `src/scripts/performance-monitor.js`  
**Change:** Add a `getSnapshot()` method that returns a structured object. Expose it on `window.performanceMonitor`.

```js
// Returns:
{
  fps: number,
  frameTimeAvg: number,
  frameTimeP95: number,
  frameTimeMax: number,
  jankPercent: number,       // % of frames > 50ms
  domQueriesPerSec: number,
  activeWorms: number,
  rainSymbols: number,
  sampleCount: number,
  timestamp: number
}
```

**Verification:** `npm run verify && npm run typecheck`

### Task 1.2 — Add frame-time histogram to PerformanceMonitor

**File:** `src/scripts/performance-monitor.js`  
**Change:** Keep a rolling buffer of the last 300 frame deltas (5s at 60fps). Compute P95 and jank % from the buffer when `getSnapshot()` is called. No UI change.

**Verification:** Manual: open `game.html?level=beginner`, press P, run `window.performanceMonitor.getSnapshot()` in devtools → confirm P95 and jankPercent are populated.

### Task 1.3 — Add input-latency proxy instrumentation

**File:** `src/scripts/performance-monitor.js`  
**Change:** On `symbolClicked` events, record `event.timeStamp`. On the next `symbolRevealed` event, compute the delta and store in a rolling buffer. Expose via `getSnapshot().inputLatencyAvg` and `inputLatencyP95`.

**Verification:** Play a few symbols, call `getSnapshot()` → confirm inputLatency fields are populated.

### Task 1.4 — Add instrumentation toggle

**File:** `src/scripts/performance-monitor.js`  
**Change:** Add `window.__PERF_INSTRUMENTATION = true` check (default `false`). When `false`, `getSnapshot()` still works (lightweight), but the extended histogram and input-latency tracking are disabled. Playwright specs will set the flag before navigating.

**Verification:** `npm run verify`

### Task 1.5 — Create Playwright perf-metrics helper

**File (new):** `tests/utils/perf-metrics.js`  
**Change:** Export helper functions for Playwright specs:

```js
/**
 * Enable extended perf instrumentation + wait for warmup.
 * @param {import('@playwright/test').Page} page
 * @param {{ warmupMs?: number }} [opts]
 */
export async function enablePerfMetrics(page, opts = {}) { ... }

/**
 * Collect a snapshot from the running game.
 * @param {import('@playwright/test').Page} page
 * @returns {Promise<PerfSnapshot>}
 */
export async function collectPerfSnapshot(page) { ... }

/**
 * Run a timed scenario and return before/after snapshots.
 * @param {import('@playwright/test').Page} page
 * @param {() => Promise<void>} scenario
 * @param {{ durationMs?: number }} [opts]
 * @returns {Promise<{ before: PerfSnapshot, after: PerfSnapshot }>}
 */
export async function profileScenario(page, scenario, opts = {}) { ... }
```

**Verification:** Import compiles without errors. Used by Milestone 2 specs.

### Task 1.6 — Expand performance-bench.spec.js with snapshot collection

**File:** `tests/performance-bench.spec.js`  
**Change:** Use `enablePerfMetrics` + `collectPerfSnapshot` to capture structured data. Log the snapshot to test output (no assertions yet beyond existing FPS ≥ 30). Run on all 5 competition projects.

**Verification:** `npx playwright test tests/performance-bench.spec.js --project=chromium`

---

## Milestone 2 — Scenario Standardization

> **Goal:** Define fixed, repeatable gameplay scenarios that produce comparable metric snapshots across runs and platforms.

### Task 2.1 — Define scenario catalog

**File (new):** `tests/utils/perf-scenarios.js`  
**Change:** Export scenario functions, each sets up a deterministic game state and runs for a fixed duration:

| Scenario         | Description                                           | Duration |
| ---------------- | ----------------------------------------------------- | -------- |
| `idle`           | Game loaded, no interaction                           | 3s       |
| `normalPlay`     | Click 5 correct symbols in sequence                   | ~8s      |
| `wormBurst`      | Trigger 4 wrong answers → purple worm + green burst   | ~6s      |
| `denseRain`      | Master level, symbols actively falling with no clicks | 5s       |
| `lockTransition` | Solve a full problem line → lock animation triggers   | ~5s      |

Each scenario returns its snapshot(s) after completion.

**Verification:** Each scenario can be run standalone in a Playwright test and produces a valid snapshot.

### Task 2.2 — Create scenario-based perf spec

**File (new):** `tests/perf-scenarios.spec.js`  
**Change:** For each scenario from 2.1, run it in a `test()` block. Log snapshots to test output. No enforced thresholds yet — data collection only.

**Verification:** `npx playwright test tests/perf-scenarios.spec.js --project=chromium --project=pixel-7`

### Task 2.3 — Add scenario tags to snapshots

**File:** `tests/utils/perf-metrics.js`  
**Change:** `profileScenario` accepts a `scenarioName` tag that is included in the returned snapshot. This enables post-hoc comparison of the same scenario across platforms.

**Verification:** Snapshot objects include `scenario` field.

### Task 2.4 — Capture initial baselines

**Action (manual / CI run):** Run `perf-scenarios.spec.js` on all 5 competition projects 3 times each. Record median values per scenario per platform.

**Output (new):** `tests/perf-baselines.json` — checked-in reference baselines used by guardrail assertions in Milestone 3.

**Format:**

```json
{
  "version": 1,
  "capturedAt": "2026-04-XX",
  "baselines": {
    "chromium": {
      "idle": { "fps": 60, "frameTimeP95": 17, "jankPercent": 0, ... },
      "normalPlay": { ... },
      ...
    },
    "pixel-7": { ... },
    ...
  }
}
```

---

## Milestone 3 — CI Warning Gates

> **Goal:** Add non-blocking threshold checks that surface regressions in test output.

### Task 3.1 — Create threshold assertion helper

**File (new):** `tests/utils/perf-thresholds.js`  
**Change:** Export functions to compare a snapshot against baselines:

```js
/**
 * Compare snapshot to baseline. Returns { pass, warnings, failures }.
 * In warning mode, failures are downgraded to warnings.
 */
export function checkThresholds(snapshot, baseline, { mode = 'warn' } = {}) { ... }
```

**Thresholds (from design doc):**

| Metric            | Desktop pass | Mobile pass | Fail    |
| ----------------- | ------------ | ----------- | ------- |
| FPS median        | ≥ 55         | ≥ 50        | < 40    |
| Frame time P95    | ≤ 22ms       | ≤ 28ms      | > 40ms  |
| Jank %            | ≤ 1%         | ≤ 2%        | > 5%    |
| Input latency avg | ≤ 120ms      | ≤ 170ms     | > 250ms |

### Task 3.2 — Integrate threshold checks into perf-scenarios.spec.js

**File:** `tests/perf-scenarios.spec.js`  
**Change:** After each scenario, call `checkThresholds()` in warn mode. Use `test.info().annotations` to attach warnings so they appear in the HTML report without failing the test.

**Verification:** `npx playwright test tests/perf-scenarios.spec.js --project=chromium` — test passes but annotations appear in report.

### Task 3.3 — Add perf delta reporting to test output

**File:** `tests/perf-scenarios.spec.js`  
**Change:** After all scenarios, log a summary table comparing current vs baseline values and % deltas. Use `console.log` / `test.info().attachments` so it shows in JSON/HTML reports.

**Verification:** Run `npm run test:report` → HTML report shows perf summary table.

### Task 3.4 — Add perf spec to competition smoke lane

**File:** `playwright.competition.config.js`  
**Change:** Add `perf-scenarios.spec.js` to the `smokeFiles` array so it runs in `test:competition:smoke`.

**Verification:** `npm run test:competition:smoke` → perf scenarios execute on chromium + pixel-7.

---

## Milestone 4 — CI Enforcement

> **Goal:** Promote stable warning checks to blocking failures. Only execute after Milestone 3 runs cleanly for ≥ 3 consecutive CI runs.

### Task 4.1 — Switch threshold mode to enforce

**File:** `tests/perf-scenarios.spec.js`  
**Change:** Change default `checkThresholds` mode from `'warn'` to `'enforce'`. Failures now cause test failure.

**Verification:** `npm run test:competition:smoke` — all pass.

### Task 4.2 — Add stability gate (3-run variance check)

**File (new):** `tests/perf-stability.spec.js`  
**Change:** Run the `normalPlay` and `wormBurst` scenarios 3× each. Assert that key metrics have ≤ 10% coefficient of variation. This enforces the "run 3x, low variance" gate from the design doc.

**Verification:** `npx playwright test tests/perf-stability.spec.js --project=chromium`

### Task 4.3 — Document re-baseline process

**File:** `Docs/SystemDocs/PERFORMANCE.md`  
**Change:** Add a "Re-baselining" section with step-by-step instructions:

1. Run `perf-scenarios.spec.js` on all projects 3×
2. Update `tests/perf-baselines.json`
3. Commit with message referencing the feature/change that requires re-baseline

**Verification:** Doc review.

---

## Milestone 5 — Optimization Backlog Kickoff

> **Goal:** Rank bottlenecks by measured impact and create targeted optimization tasks.

### Task 5.1 — Add diagnostic breakdown to snapshots

**File:** `src/scripts/performance-monitor.js`  
**Change:** Extend `getSnapshot()` with a `diagnostics` field that includes:

- Top 3 longest frames with timestamps
- Event throughput (events/sec by type)
- DOM query hotspot estimate (if wrapDOMQueries can track caller info)

### Task 5.2 — Analyze baseline data and rank bottlenecks

**Action (manual):** Review collected baselines. Identify which scenarios on which platforms are closest to threshold limits. Create a ranked list.

**Output (new):** `Docs/SystemDocs/PERF_BOTTLENECK_RANKING.md` — prioritized optimization targets with expected impact estimates.

### Task 5.3 — Open optimization tasks

**Action (manual):** For each top-ranked bottleneck, create a focused task/issue with:

- Scenario and platform affected
- Current metric vs target
- Proposed optimization approach
- Expected gain estimate

---

## Execution Sequence

```
PR 1 ─── Milestone 1 (Tasks 1.1–1.6)
           │
PR 2 ─── Milestone 2 (Tasks 2.1–2.4)
           │
PR 3 ─── Milestone 3 (Tasks 3.1–3.4)
           │
      ┌── Run smoke 3+ times, confirm stability ──┐
      │                                            │
PR 4 ─── Milestone 4 (Tasks 4.1–4.3)              │
           │                                       │
PR 5 ─── Milestone 5 (Tasks 5.1–5.3)  ────────────┘
```

Each PR must pass: `npm run verify && npm run typecheck && npm run test:competition:smoke`

---

## File Change Summary

### New files

| File                                         | Milestone | Purpose                                   |
| -------------------------------------------- | --------- | ----------------------------------------- |
| `tests/utils/perf-metrics.js`                | 1         | Playwright helpers for metrics collection |
| `tests/utils/perf-scenarios.js`              | 2         | Deterministic scenario catalog            |
| `tests/perf-scenarios.spec.js`               | 2         | Scenario-based perf spec                  |
| `tests/perf-baselines.json`                  | 2         | Reference baseline data                   |
| `tests/utils/perf-thresholds.js`             | 3         | Threshold comparison logic                |
| `tests/perf-stability.spec.js`               | 4         | Variance/stability gate spec              |
| `Docs/SystemDocs/PERF_BOTTLENECK_RANKING.md` | 5         | Ranked optimization targets               |

### Modified files

| File                                 | Milestone | Change                                                                         |
| ------------------------------------ | --------- | ------------------------------------------------------------------------------ |
| `src/scripts/performance-monitor.js` | 1, 5      | `getSnapshot()`, histogram buffer, input-latency tracking, toggle, diagnostics |
| `tests/performance-bench.spec.js`    | 1         | Use new helpers, add snapshot logging                                          |
| `playwright.competition.config.js`   | 3         | Add perf spec to smoke lane                                                    |
| `Docs/SystemDocs/PERFORMANCE.md`     | 4         | Re-baseline process documentation                                              |

### Untouched

- All gameplay modules (`game*.js`, `worm*.js`, `3rdDISPLAY.js`, `lock-manager.js`)
- All existing test specs (no behavior changes)
- All CSS/HTML files

---

## Verification Commands

```bash
# After every task
npm run verify && npm run typecheck

# Milestone 1 quick check
npx playwright test tests/performance-bench.spec.js --project=chromium

# Milestone 2 check
npx playwright test tests/perf-scenarios.spec.js --project=chromium --project=pixel-7

# Milestone 3 check
npm run test:competition:smoke

# Milestone 4 check
npx playwright test tests/perf-stability.spec.js --project=chromium

# Full competition validation
npm run test:competition:matrix
```

---

## Risk Mitigation

| Risk                                      | Mitigation                                           |
| ----------------------------------------- | ---------------------------------------------------- |
| Instrumentation adds runtime overhead     | Toggle flag; extended tracking disabled by default   |
| Flaky thresholds on different hardware    | Warning-only first; baselines captured per-platform  |
| Metric variance too high for stable gates | Stability spec (4.2) catches this before enforcement |
| Breaks existing tests                     | No gameplay code changes; perf specs are additive    |
| Baselines become stale                    | Documented re-baseline process (4.3)                 |
