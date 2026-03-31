# Performance Guide

This document collects the current performance rules, tooling, and validation paths for MathMasterHTML.

## Targets

| Metric | Desktop target | Mobile target |
| --- | --- | --- |
| FPS | 55-60 | 45-50 |
| Frame time | < 16-18ms | < 20-22ms |
| DOM queries/sec | < 150 | < 150 |
| Memory growth | Keep bounded during long play | Keep bounded during long play |

## Active performance tooling

| Tool | Location | Purpose |
| --- | --- | --- |
| `PerformanceMonitor` | `src/scripts/performance-monitor.js` | Overlay metrics, rolling frame stats, `getSnapshot()` |
| Performance bootstrap | `src/scripts/performance-monitor.bootstrap.js` | Wires the monitor to `window.performanceMonitor` and the `P` toggle |
| `DynamicQualityAdjuster` | `src/scripts/dynamic-quality-adjuster.js` | Adapts quality based on recent runtime performance |
| `QualityTierManager` | `src/scripts/quality-tier-manager*.js` | Applies quality tiers and emits `qualityTierChanged` |
| Symbol rain helpers | `src/scripts/symbol-rain.helpers.*.js` | Pooling, collision, and spawn efficiency |
| Worm caches | `src/scripts/worm-system.cache.js` and `worm.js` cache fields | Avoid repeated DOM queries during active play |

## Manual validation

1. Start the app with `npm start`.
2. Open `http://localhost:8000/game.html?level=beginner`.
3. Press `P` to toggle the performance overlay.
4. Check FPS, frame time, DOM queries/sec, worm count, and symbol count while playing.
5. Use `window.performanceMonitor.getSnapshot()` in DevTools when you need structured metrics.

## Automated validation

Recommended focused commands:

```bash
npm run typecheck
npx playwright test tests/performance-bench.spec.js --project=chromium
npx playwright test tests/perf-scenarios.spec.js --project=chromium --project=pixel-7
npx playwright test tests/performance/worm-movement-bench.spec.js
```

Competition lanes also exercise performance-sensitive flows:

```bash
npm run test:competition:smoke
npm run test:competition:matrix
```

## Rules that matter in this repo

### 1. Avoid broad CSS transitions

Do not use `transition: all`. Limit transitions to the properties that need animation.

### 2. Keep DOM reads out of animation hot loops

- cache container geometry
- use time-based invalidation for expensive queries
- prefer stored coordinates over layout reads

### 3. Prefer delegation and pooling

- symbol rain interactions are delegated instead of per-symbol listeners
- object pooling is preferred for frequently created DOM nodes
- cleanup must remove transient nodes promptly

### 4. Use `pointerdown` for touch-first responsiveness

Touch-critical surfaces such as worms, console interactions, and symbol rain should respond immediately without the extra delay that often comes with `click`.

### 5. Respect reduced motion

Performance work and celebration effects must stay compatible with `prefers-reduced-motion`. If an effect becomes optional, gate it rather than forcing it.

## Quality tier and adaptive graphics notes

Graphics and animation optimization guidance is now folded into this document.

Current direction:

- expose quality through CSS variables and body data attributes
- let adaptive systems degrade gracefully instead of dropping entire features abruptly
- keep expensive particles and effects proportional to the detected tier
- validate changes on both desktop and mobile Playwright projects

## High-value implementation patterns

- spatial hash collision checks for symbol rain
- throttled or cached layout data
- visibility-based throttling for background tabs
- `requestIdleCallback` or tiny deferred tasks for non-critical startup work
- bounded buffers for frame-time and input-latency metrics

## What to check before merging perf changes

- no new per-frame `querySelector` or layout reads
- no unnecessary node churn in active loops
- no regressions in `tests/performance-bench.spec.js` or `tests/perf-scenarios.spec.js`
- no UI regressions when reduced motion is enabled
- docs updated if the metrics surface or tooling contract changes
