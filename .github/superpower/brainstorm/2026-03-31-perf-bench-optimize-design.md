# Performance Bench Spec Optimization

**Date:** 2026-03-31
**Scope:** `tests/performance-bench.spec.js` (surgical edits only)

## Problem

The current perf bench test has ~2.8s of hard waits, makes an unnecessary extra browser round-trip for memory, and only asserts on FPS and heap size — missing frame-time and jank regressions.

## Changes

### 1. Smart wait after pressing P

- **Replace** `page.waitForTimeout(1200)` with `page.waitForFunction(() => window.performanceMonitor?.getSnapshot()?.sampleCount >= 30, { timeout: 5000 })`
- Faster when the game runs well; still safe under load with a 5s ceiling

### 2. Merge snapshot + memory into one evaluate

- Single `page.evaluate()` returns `{ ...snapshot, heapUsed }` where `heapUsed` comes from `performance.memory?.usedJSHeapSize ?? null`
- Eliminates one browser round-trip

### 3. Buffer-based attach

- Use `Buffer.from(json)` for the `perf-snapshot` attachment body

### 4. Additional regression thresholds

| Metric             | Threshold | Rationale                       |
| ------------------ | --------- | ------------------------------- |
| `frameTimeP95`     | `< 50ms`  | No sustained jank frames        |
| `jankPercent`      | `< 15%`   | Loose guard against jank spikes |
| `domQueriesPerSec` | `< 500`   | Catch DOM thrashing regressions |

### 5. Preserved behavior

- `beforeEach` unchanged (600ms post-start wait stays)
- FPS ≥ 30 and memory < 600MB assertions unchanged
- `enablePerfMetrics` warmup unchanged

## Files Modified

- `tests/performance-bench.spec.js`

## Validation

- `npm run verify`
- `npx playwright test tests/performance-bench.spec.js --project=chromium`
