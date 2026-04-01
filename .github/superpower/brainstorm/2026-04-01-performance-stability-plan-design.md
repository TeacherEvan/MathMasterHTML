# Performance & Stability Plan — Unified Design

**Date:** 2026-04-01
**Branch:** feature/performance-stability-plan
**Approach:** Foundation-Up with Test Harness (Approach B)
**Success criteria:** Clean architecture enforced by automated measurement — every lifecycle, resource bound, and hot path is validated by merge-blocking perf gates.
**Supersedes:** `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`

---

## Code Audit Findings (grounding this plan)

These are confirmed issues discovered by inspecting the current codebase. Every work packet below traces back to at least one finding.

### F1: Event listener leak in WormSystem

`worm-system.events.js:29-117` — `setupEventListeners()` adds 7 `document.addEventListener` calls with anonymous closures (PROBLEM_LINE_COMPLETED, PROBLEM_COMPLETED, PURPLE_WORM_TRIGGERED, SYMBOL_CLICKED, SYMBOL_REVEALED, WORM_CURSOR_UPDATE, WORM_CURSOR_TAP). No references are stored. `destroy()` in `worm.js:276` only cancels the rAF ID. `reset()` in `worm-system.cleanup.js` clears worms/timers but ignores these listeners. **Confirmed leak on every game restart.**

### F2: Symbol rain animation has no stop/destroy path

`symbol-rain.animation.js:107-115` — `startAnimation()` sets `state.isAnimationRunning = true` and runs `requestAnimationFrame(loop)`. There is no exported `stopAnimation()` or cleanup function. The only way to stop the loop is toggling the flag from outside. DOM nodes are not cleaned up on stop.

### F3: Layout thrashing in main animation loops

`worm-renderer.js:228-229` — All worm positioning uses `style.left`/`style.top`, forcing layout recalculation per worm per frame. `symbol-rain.animation.js:87,91` — Same pattern for every falling symbol. These are the two highest-frequency animation loops in the game.

### F4: No visibility throttling for worm animation

Only `3rdDISPLAY.js:105` handles `visibilitychange`. The worm animation loop in `worm-system.movement.js` continues running full-speed in background tabs, wasting CPU.

### F5: 15+ `transition: all` in shipped CSS

Confirmed locations: `line-6-transformer.core.css:46`, `line-6-transformer.entities.css:9,30,103,124,142,162`, `line-3-transformer.mechanics.css:9,48,85,149,177`, `line-3-transformer.decorations.css:9`, `line-2-transformer.core.css:41`, `modern-ux-enhancements.core.css:88`, `index.core.css:57`. These trigger GPU compositing of all properties during lock animation transitions.

### F6: ResourceManager exists but is underutilized

`utils-resource-manager.js` already provides tracked `setTimeout`/`setInterval`/`clearAll()`. Only `score-timer.runtime.js` uses it. All other timer usage across 30+ call sites uses raw `setTimeout`/`setInterval` without tracking.

---

## Plan Structure

| Phase | Name                          | Goal                                                                                                                          |
| ----- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 0     | Measurement Infrastructure    | Build the automated test harness that measures init timing, memory bounds, animation health, and DOM lifecycle                |
| 1     | Init & Lifecycle Determinism  | Eliminate script load-order fragility, make startup fail-fast, give every animation loop / resource a deterministic lifecycle |
| 2     | Memory & Resource Bounding    | Cap every growable resource (DOM nodes, listeners, queues) so long sessions can't degrade                                     |
| 3     | Runtime Performance Hardening | Optimize hot paths under measurement — fix observed jank with regression safety                                               |
| 4     | CI Performance Gates          | Wire measurements into merge-blocking CI checks so regressions can't ship                                                     |

Each phase is independently shippable and validates the previous phase's foundation.

---

## Phase 0: Measurement Infrastructure

**Risk:** Low — adds test infrastructure without touching runtime code.

| ID  | Target                                 | Change                                                                                                                                                                                                                                                                                               | Validation                                                                                                           |
| --- | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 0.1 | `tests/utils/perf-metrics.js`          | Extend `enablePerfMetrics` to capture: init-to-interactive timing, animation frame budget violations (>16ms), DOM node count delta, active event listener count, `requestAnimationFrame` loop count                                                                                                  | Existing perf-bench test still passes with richer snapshot output                                                    |
| 0.2 | New `tests/utils/lifecycle-tracker.js` | Inject a page-level tracker that monkeypatches `requestAnimationFrame`, `setInterval`, `setTimeout` to record starts/stops and detect orphaned timers. **Build on top of the existing `ResourceManager` pattern** (`utils-resource-manager.js`) rather than reinventing tracking. _(Grounded by F6)_ | Harness self-test: tracker reports known-good counts for idle scenario; counts match ResourceManager's internal sets |
| 0.3 | New `tests/utils/memory-audit.js`      | Capture heap snapshots at scenario boundaries; detect DOM node count growth > threshold over N-second windows                                                                                                                                                                                        | Reports pass on current codebase (establishes baseline, not yet a gate)                                              |
| 0.4 | `tests/perf-scenarios.spec.js`         | Add `longSession` scenario (60s simulated play) using lifecycle tracker + memory audit                                                                                                                                                                                                               | Scenario runs, produces structured report; no hard assertion yet                                                     |
| 0.5 | New `tests/utils/init-timing.js`       | Instrument `DOMContentLoaded` → first symbol rain → game-ready timestamps                                                                                                                                                                                                                            | Reports timing breakdown in perf snapshot                                                                            |

**Rollback:** Delete new test utils; existing tests unaffected.

---

## Phase 1: Init & Lifecycle Determinism

**Risk:** Medium — touches runtime init flow. Each packet can be tested independently.

| ID   | Target                                                  | Change                                                                                                                                                                                                                                              | Validation                                                                                        |
| ---- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| 1.1  | `src/pages/game.html` + `src/scripts/game-init.js`      | Make script initialization order explicit with a boot-sequence manifest. Add fail-fast guard: if a required global is missing after init, log error and halt gracefully                                                                             | Phase 0 `init-timing.js` shows clean sequential init; all 3 levels boot                           |
| 1.2a | `symbol-rain.animation.js:107-115`                      | **Add `stopAnimation(state)` export** that sets `isAnimationRunning = false`, returns pooled DOM nodes, and clears `activeFallingSymbols`. Currently there is no stop path at all. _(Grounded by F2)_                                               | Lifecycle tracker confirms rain rAF loop stops; DOM node count drops to pool baseline             |
| 1.2b | `worm-system.movement.js:24-32`                         | Add `visibilitychange` listener: pause worm rAF loop when tab hidden, resume on visible. Currently worms run full-speed in background tabs. _(Grounded by F4)_                                                                                      | Tab-hide test: no rAF callbacks fire while hidden                                                 |
| 1.2c | `dynamic-quality-adjuster.js:52-78`                     | Register the FPS measurement rAF loop with an `AnimationLoopRegistry`. Add `stop()` method.                                                                                                                                                         | Lifecycle tracker shows loop stops on destroy                                                     |
| 1.3a | `worm-system.events.js:29-117`                          | **Store listener references** — refactor `setupEventListeners()` to use named handler references stored on the instance. Add `removeEventListeners()` that removes all 7 document listeners. _(Grounded by F1 — this is the highest-priority leak)_ | After `removeEventListeners()`, lifecycle tracker shows zero WormSystem document listeners        |
| 1.3b | `worm.js:276-280` + `worm-system.cleanup.js:71-95`      | Wire `destroy()` and `reset()` to call `removeEventListeners()`. Also call `ResourceManager.clearAll()` for any tracked timers. _(Grounded by F1, F6)_                                                                                              | After destroy/reset, lifecycle tracker shows zero active worm timers/listeners/document listeners |
| 1.4  | `performance-monitor.js`, `dynamic-quality-adjuster.js` | Add `destroy()` methods to avoid leaked rAF loops when game ends or resets                                                                                                                                                                          | Lifecycle tracker confirms zero orphaned monitoring loops post-game                               |
| 1.5  | `worm-powerups.effects.*.js`                            | Each power-up rAF loop registers with lifecycle registry and auto-cancels when effect ends or worm is destroyed                                                                                                                                     | No orphaned power-up animations after worm kill in automated test                                 |

**Rollback:** Restore prior boot sequence per packet; lifecycle registry can be feature-flagged.

---

## Phase 2: Memory & Resource Bounding

**Risk:** Medium — changes runtime resource management. Bounds configurable via `constants.js`.

| ID  | Target                                                 | Change                                                                                                                                             | Validation                                                           |
| --- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 2.1 | `3rdDISPLAY.js` + `symbol-rain.helpers.*.js`           | Hard pool ceiling on rain symbol DOM nodes (e.g., 200 max). Off-screen symbols recycled, not orphaned. Track pool high-water mark in perf snapshot | Memory audit: node count bounded over 60s longSession                |
| 2.2 | `worm-system.spawn.js` + `worm-spawn-manager.queue.js` | Bound spawn queue depth. Drop oldest pending spawn if queue exceeds cap. Log dropped spawns                                                        | Spawn burst test: queue never exceeds cap                            |
| 2.3 | `worm.js` (worm instances)                             | On destruction: null DOM references, remove event handlers, clear timer IDs                                                                        | After 20+ worm destructions, no dangling references in heap snapshot |
| 2.4 | `console-manager*.js`                                  | Reuse elements for console grid slot updates instead of creating new ones                                                                          | DOM node count for console area flat across 50+ stores               |
| 2.5 | All modules                                            | Dev-mode listener count dashboard in performance monitor. Identify modules adding listeners without removal                                        | Listener count stabilizes after init; doesn't grow during play       |

**Rollback:** Remove caps from `constants.js`; game reverts to unbounded behavior.

---

## Phase 3: Runtime Performance Hardening

**Risk:** Medium-High — touches core animation hot paths. Phase 0 measurement makes regressions visible.

| ID  | Target                                                                                                                                                                                                                                                                                                    | Change                                                                                                                                                                                                                                                                                                                    | Validation                                                                                                           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| 3.1 | `worm-system.movement.js` + `worm-renderer.js:228-229`                                                                                                                                                                                                                                                    | **Replace `style.left`/`style.top` with `transform: translate()`** for all worm positioning. This is the single highest-impact perf change — it eliminates forced layout recalc for every worm every frame. Also batch: compute all positions first, then apply all transforms in a single write pass. _(Grounded by F3)_ | Frame budget violations drop in worm burst scenario; Chrome DevTools trace shows zero forced reflows in animate loop |
| 3.2 | `3rdDISPLAY.js` + `symbol-rain.animation.js:87,91`                                                                                                                                                                                                                                                        | **Replace `style.top` with `transform: translateY()`** for all falling symbol positioning (same F3 pattern as worms). Ensure spatial hash grid is sole collision path — remove fallback linear scans. Validate grid cell size vs symbol density. _(Grounded by F3)_                                                       | Dense rain scenario <16ms frame times on desktop; zero forced reflows in rain animation                              |
| 3.3 | `worm-system.cache.js` + consumers                                                                                                                                                                                                                                                                        | Audit cache invalidation. Caches must serve hot-loop reads without per-frame DOM queries. Add cache-hit ratio to perf snapshot                                                                                                                                                                                            | DOM queries/sec < 150 during active play                                                                             |
| 3.4 | `display-manager.js` + `lock-responsive.js`                                                                                                                                                                                                                                                               | Deduplicate resolution detection. Share single ResizeObserver instead of duplicate window listeners                                                                                                                                                                                                                       | One fewer resize listener; reduced layout recalc                                                                     |
| 3.5 | `worm-powerups.effects.spider.js:89`, `worm-powerups.effects.devil.js:104`, `worm-system.effects.js:25-26,164-165,272-273`                                                                                                                                                                                | Use CSS transforms instead of `style.left`/`style.top` for particles, cracks, splats, and power-up movement. These are lower-frequency than F3 but still contribute layout thrashing during effect-heavy moments. _(Grounded by F3)_                                                                                      | No forced reflows during power-up active scenarios                                                                   |
| 3.6 | **15 confirmed files:** `line-6-transformer.core.css:46`, `line-6-transformer.entities.css:9,30,103,124,142,162`, `line-3-transformer.mechanics.css:9,48,85,149,177`, `line-3-transformer.decorations.css:9`, `line-2-transformer.core.css:41`, `modern-ux-enhancements.core.css:88`, `index.core.css:57` | Replace each `transition: all` with property-specific transitions (e.g., `transition: transform 2s ease, opacity 2s ease`). _(Grounded by F5)_                                                                                                                                                                            | `grep -r 'transition:\s*all' src/styles/` returns zero matches                                                       |

**Rollback:** Per-file revert; perf monitor shows regression delta.

---

## Phase 4: CI Performance Gates

**Risk:** Low — adds test assertions, not runtime changes.

| ID  | Target                              | Change                                                                                                                                                                               | Validation                             |
| --- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- |
| 4.1 | `playwright.competition.config.js`  | Unified perf-aware config with three lanes: **Smoke** (fast, Chromium, key metrics), **Matrix** (all browsers, full scenarios), **Soak** (60s long-session + memory/lifecycle audit) | All three lanes pass on current `main` |
| 4.2 | `tests/performance-bench.spec.js`   | Hard assertions: FPS > 50, frame budget violations < 5%, DOM queries/sec < 150, no orphaned rAF loops                                                                                | Test fails on metric regression        |
| 4.3 | `tests/perf-scenarios.spec.js`      | Per-scenario assertions: init-to-interactive < 2s, memory growth < 10% over scenario, listener count stable                                                                          | Scenarios become regression gates      |
| 4.4 | New `tests/lifecycle-audit.spec.js` | Start → play → end → verify zero orphaned timers, zero leaked listeners, animation loop registry empty                                                                               | Catches any lifecycle regression       |
| 4.5 | `package.json` scripts              | Add `npm run test:perf:gate` (smoke + lifecycle audit) as pre-merge check alongside `npm run verify`                                                                                 | One command confirms perf health       |

**Rollback:** Relax thresholds or switch to warning-only mode.

---

## Validation Rules

- Every work packet must pass `npm run verify` + `npm run typecheck` before merge
- Each phase captures a baseline perf snapshot before work begins
- Phase N should not start until Phase N-1 is merged and green

## Rollback Summary

| Phase | Rollback                                                     |
| ----- | ------------------------------------------------------------ |
| 0     | Delete new test utils; zero runtime impact                   |
| 1     | Revert init changes per packet; lifecycle registry removable |
| 2     | Remove caps from `constants.js`                              |
| 3     | Per-file revert; perf monitor shows delta                    |
| 4     | Relax thresholds or switch to warnings                       |

## Finding → Work Packet Traceability

| Finding                           | Work Packets  |
| --------------------------------- | ------------- |
| F1: Event listener leak           | 1.3a, 1.3b    |
| F2: No rain stop/destroy          | 1.2a          |
| F3: Layout thrashing (top/left)   | 3.1, 3.2, 3.5 |
| F4: No worm visibility throttling | 1.2b          |
| F5: `transition: all` in CSS      | 3.6           |
| F6: ResourceManager underutilized | 0.2, 1.3b     |

## Superseded Documents

- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md` — replaced by this plan
- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md` — retained as context/history; execution section superseded
