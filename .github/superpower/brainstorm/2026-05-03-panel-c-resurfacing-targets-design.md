# Design: Panel C Resurfacing Targets
**Date:** 2026-05-03
**Status:** Draft — pending implementation review
**Scope Tier:** V1
**Author:** Brainstorm session with user

## Problem Statement
Panel C should stop behaving like falling symbol rain and instead behave like a resurfacing target field. Symbols should appear inside Panel C, stay available briefly, fade away, then reappear at different positions after randomized hidden delays. The change must preserve the existing gameplay contract that visible Panel C symbols are the only symbols available for click, keyboard, Evan helper, and worm interaction.

## Success Metrics
- [ ] Panel C never shows overlapping active symbol instances. **Non-overlap is defined as: bounding boxes of any two visible instances must not intersect with less than 4px clearance on all sides.** This threshold is the spacing constant stored in `symbol-rain.config.js`.
- [ ] Each symbol in the full gameplay alphabet always has exactly 5 instances in the DOM (any phase). A collected instance is immediately replaced so the count-of-5 invariant is never broken.
- [ ] All instances reach `visible` state within 500ms of Panel C mounting.
- [ ] All instances transition to `hidden` together within the first 3s (2s visible + 1s fade).
- [ ] After the first synchronized vanish, each instance resurfaces independently after a random 2-7s hidden delay.
- [ ] Clicking or keyboard-targeting a `hidden` or `fading` instance produces no match event (verified by Playwright assertion).
- [ ] Panel C animation does not drop below 50fps on Moto G4 emulation during peak resurface cycles (verified by `tests/perf-scenarios.spec.js`).
- [ ] No symbol, lock display, UI element, console element, or gameplay target visually overlaps another such element anywhere in the layout at any time (globally enforced, 4px clearance minimum).
- [ ] No symbol, lock display, UI element, console element, or gameplay target renders outside its owning panel bounds (verified by bounding-rect containment assertions).
- [ ] Worms, spiders, and Evan's helper may cross panel borders freely; all other elements may not.
- [ ] Updated Playwright coverage passes for Panel C behavior, visibility, and gameplay interaction.

## Constraints
| Category | Constraint | Source |
|----------|-----------|--------|
| Runtime | Keep ownership in `src/scripts/symbol-rain*.js`, `src/scripts/3rdDISPLAY.js`, and `window.SymbolRainTargets` contracts | Plan Genesis |
| Layout | Placement may occur anywhere inside Panel C. Active instances must not overlap (bounding boxes with < 4px clearance). If no non-overlapping slot is found, defer resurfacing until a slot opens — do NOT place overlapping. | User direction |
| Global visual non-overlap | Symbols, lock display, UI chrome, console elements, and gameplay targets must **never** visually overlap any other such element anywhere in the game layout. The 4px clearance rule applies globally, not only within Panel C. | User direction |
| Panel border crossing | Rendered content must stay within its owning panel. **Only worms, spiders, and Evan's helper** are permitted to cross panel borders. All other elements (symbols, lock display, UI chrome, console elements, targets) are hard-clipped to their panel's bounds. | User direction |
| Timing | Visible for 2s, fade for 1s, then hidden for 2-7s on every cycle after the initial synchronized fade | User direction |
| Interaction | Hidden symbols are unavailable; no synthetic fallback visibility is required | User direction |
| Platform | Mobile gameplay remains authoritative; preserve compact/mobile contracts | Repo design context |
| Documentation | Update durable docs only where repo policy allows runtime/product rules to live | Repo policy |
| Agent progress reporting | Agents must surface completed work to the user **as each discrete step finishes**, not in a single batch at the end. Each commit, file edit, test result, or decision must be reported in the same turn it occurs. The user must never wait until all work is done to see what was done. | User direction |

## Agent Progress Protocol
Agents executing this plan must report progress **at the same rate work is completed**, not as a summary after all tasks finish. The user must stay in the loop throughout.

| Rule | Detail |
|------|--------|
| Report on each step completion | After each file edit, test run, decision, or commit, post a brief update in the same turn before moving to the next step. |
| Surface blockers immediately | If a step cannot proceed (failing test, missing file, ambiguous spec), report it at once — do not silently skip or defer. |
| No silent batch delivery | Do not accumulate multiple completed steps and report them together. Each step gets its own update. |
| Include outcome, not just intent | Say what changed and what the result was (e.g., "Modified `symbol-rain.lifecycle.js` — all lifecycle phase transitions verified"), not just "working on lifecycle module." |
| Use the todo list | Mark each task in-progress before starting it and completed immediately after finishing it so the visible task list reflects live state. |

## Design

### Global Layout Invariants
These rules apply to the entire game layout, not only Panel C. This implementation must not introduce violations and must not regress existing compliance.

| Element class | Stays inside own panel | May cross panel borders | Non-overlap rule |
|---|---|---|---|
| Symbols (Panel C) | Yes | No | 4px minimum clearance from all other visible elements |
| Lock display | Yes | No | Must not overlap any symbol, console, or UI element |
| UI chrome (headers, buttons, overlays) | Yes | No | Must not overlap gameplay elements |
| Console elements / targets | Yes | No | Must not overlap symbols, lock display, or other consoles |
| Worms | No — may cross freely | **Yes** | Not required to clear gameplay elements |
| Spiders | No — may cross freely | **Yes** | Not required to clear gameplay elements |
| Evan's helper hand | No — may cross freely | **Yes** | Not required to clear gameplay elements |

**Enforcement mechanism:** All non-crossing elements must have `overflow: hidden` or an equivalent clip applied to their owning panel container so the browser hard-clips them at the panel boundary. Worms, spiders, and Evan's helper must be rendered in a layer above the panel clip (e.g., positioned relative to the game root, not the panel container) so their cross-border movement is unaffected.

### Architecture Overview
Replace falling-motion spawning with an anchored resurfacing scheduler. Each symbol instance becomes a timed entity with lifecycle phases: `visible`, `fading`, `hidden`, and `respawning`. The scheduler owns timing and placement. `window.SymbolRainTargets` remains the visibility authority for consumers.

### Components
All entries below are **modifications to existing files** unless marked **new**.

- **Modify** `src/scripts/symbol-rain.config.js`: replace rain-oriented cadence knobs with resurfacing lifecycle defaults (`VISIBLE_MS`, `FADE_MS`, `HIDDEN_MIN_MS`, `HIDDEN_MAX_MS`, `INSTANCES_PER_SYMBOL`, `MIN_CLEARANCE_PX`).
- **Modify** `src/scripts/symbol-rain.helpers.spawn.js` + **modify** `src/scripts/symbol-rain.helpers.pool.js`: replace motion-based spawn logic with fixed-pool creation. Remove `getNextRequiredSymbol` priority routing — the resurfacing model uses uniform random scheduling; the `getNextRequiredSymbol` signal is explicitly dropped (see Data Flow note).
- **Modify** `src/scripts/symbol-rain.lifecycle.js`: replace downward-tick loop with a per-instance resurfacing scheduler using `setTimeout` (see Timer policy below). Add `visibilitychange` handler to pause/resume timers.
- **Modify** `src/scripts/symbol-rain.animation.js`: replace translate-Y transitions with opacity-only fade-in / fade-out transitions.
- **Modify** `src/scripts/symbol-rain.targets.js`: frozen public API — `getVisibleMatchingCandidates`, `rankKeyboardCandidates`, and `normalizeSymbol` signatures must not change. Internal query updates to read `data-symbol-state="visible"` instead of motion-era position checks.
- **Modify** `src/scripts/3rdDISPLAY.js`: keep Panel C layout/bootstrap ownership; trigger a bounds refresh via `ResizeObserver` callback when Panel C dimensions change.

**Timer policy:** Use `setTimeout` for per-instance hidden delays. On `visibilitychange` to hidden, record the elapsed time for each timer and cancel it. On `visibilitychange` to visible, reschedule each timer with the remaining delay rather than the original delay, preventing a burst of synchronized resurfacing on tab restore.

**DOM pool size:** The active gameplay alphabet is ≤ 26 symbols × 5 instances = 130 DOM elements maximum. Reuse the existing `symbol-rain.helpers.pool.js` recycle path so elements are never recreated mid-game. A DOM cap of 150 elements is enforced by the pool; surplus requests defer until a slot is recycled.

### Data Flow
1. `3rdDISPLAY.js` waits for Panel C's first non-zero `getBoundingClientRect` result (polled via `ResizeObserver`) before signalling bootstrap. This is the **layout-ready gate**; placement does not begin until this fires.
2. Bootstrap creates exactly 5 instances per symbol. Instances are registered in `symbol-rain.helpers.pool.js`.
3. All instances are positioned inside Panel C with non-overlap sampling (4px minimum clearance) and set to `data-symbol-state="visible"` simultaneously. All fade-in animations run at the same time.
4. After 2s visible time, all instances begin a 1s fade together (`data-symbol-state="fading"`). Symbols in `fading` state are **removed from `getVisibleMatchingCandidates` immediately** when the fade begins — they are not interactive.
5. Each instance independently transitions to `data-symbol-state="hidden"` and schedules its own resurfacing `setTimeout` for a random 2-7s delay.
6. On resurfacing: find a non-overlapping slot. If none exists within the attempt budget (10 tries at preferred spacing, then 5 tries at reduced spacing), **defer resurfacing** by rescheduling after 500ms rather than placing into an overlapping slot.
7. Instance transitions to `visible`, runs for 2s, then fades for 1s, then reschedules — repeating independently.
8. `window.SymbolRainTargets.getVisibleMatchingCandidates` returns only elements with `data-symbol-state="visible"` that intersect the live Panel C container bounds.

> **`getNextRequiredSymbol` deprecation note:** The resurfacing model uses a fixed uniform pool. The `getNextRequiredSymbol` priority signal is explicitly removed from the spawn path. If a required symbol is temporarily hidden, the player must wait — this is the approved behavior per the Interaction constraint.

### Error Handling
- **Placement failure:** If a non-overlapping position cannot be found after 10 attempts at preferred spacing and 5 at reduced spacing, defer resurfacing by rescheduling after 500ms. Do NOT place into an overlapping slot. (Aligns with Layout constraint — overlap is not permitted as a fallback.)
- **Stale or zero-sized bounds:** Defer resurfacing until the `ResizeObserver` fires a non-zero bounds update. Do not use synthetic fallback geometry.
- **Panel C shrink / resize mid-cycle:** On every `ResizeObserver` callback, revalidate all `visible` instances. Any instance whose bounding box no longer intersects the updated Panel C bounds immediately transitions to `fading`, then `hidden`, and reschedules normally.
- **Instance collected mid-phase:** Cancel all pending `setTimeout` handles for that instance. Spawn a replacement instance through `symbol-rain.helpers.pool.js` to maintain the count-of-5 invariant, then start it in the `hidden` phase with a fresh random delay.
- **Level transition / game teardown:** On level-end or page navigation, call a `teardown()` export on `symbol-rain.lifecycle.js` that cancels all active `setTimeout` handles and clears the DOM pool. Orphaned timers must not fire against a dismounted Panel C.
- **Tab backgrounding burst:** Handled by the `visibilitychange` timer pause/resume policy described in Components above.

## Alternatives Considered
| Approach | Pros | Cons | Why Rejected |
|----------|------|------|-------------|
| Keep falling rain and only slow it down | Minimal refactor | Does not satisfy the requested gameplay change | Wrong interaction model |
| Use only active problem targets instead of full alphabet | Lower density | Does not match the approved full-alphabet pool | Rejected by user choice |
| Force a visible required match at all times | Prevents waits | Violates approved hidden-match behavior | Rejected by user choice |

## Risk Analysis
| Risk | Probability | Impact | Mitigation | Owner | Residual Risk |
|------|-------------|--------|-----------|-------|---------------|
| Non-overlap placement fails in compact layouts | Medium | High | Bounded retry; defer (never overlap) on placement failure; targeted mobile tests in `symbol-rain.mobile.spec.js` | `symbol-rain.lifecycle.js` | Medium |
| Keyboard/Evan/worm targeting drifts from visible state | Medium | High | `window.SymbolRainTargets` is the only visibility authority; all consumers read `[data-symbol-state="visible"]` | `symbol-rain.targets.js` | Low |
| Existing symbol-rain tests assume motion semantics | High | **High** | Rewrite `symbol-rain.live-targets.spec.js` motion tests before merging; block PR if any motion assertions remain | Verification / CI | Low |
| Timer burst on tab restore produces synchronized resurface | Medium | High | `visibilitychange` listener pauses timers and resumes with remaining delay; tested by Playwright tab-backgrounding assertion | `symbol-rain.lifecycle.js` | Low |
| DOM/GPU budget exceeded by concurrent opacity transitions | Medium | Medium | 130-element DOM cap enforced by pool; 50fps floor measured in `perf-scenarios.spec.js` on Moto G4 | `symbol-rain.helpers.pool.js` | Low |
| Race condition: lifecycle timer fires after game teardown | Medium | High | `teardown()` export cancels all handles; verified by spy-based Playwright assertion | `symbol-rain.lifecycle.js` | Low |
| Perf baseline drift triggers false CI failures | High | Medium | Update `tests/perf-baselines.json` as part of the implementation PR before CI runs | CI / implementation PR | Low |
| `getNextRequiredSymbol` silently broken by removal | Medium | Medium | Explicitly document removal; grep for all callers and remove or no-op each one before merge | `symbol-rain.helpers.spawn.js` | Low |
| Symbol or UI element visually overlaps across panels | Medium | High | Enforce `overflow: hidden` on all panel containers; add cross-element non-overlap Playwright assertions | Layout / `display-manager.js` | Low |
| Worm/spider/Evan layer accidentally clipped by panel container | Medium | High | Verify these elements are parented at game-root level, not panel level; add border-crossing Playwright assertion | Layout / `display-manager.js` | Low |

## Complexity Budget
| Element | Cost Level | Justification |
|---------|-----------|---------------|
| Replace motion scheduler with resurfacing scheduler | Medium | Core gameplay change |
| Reuse existing target visibility contract | Low | Reduces blast radius |
| Update Playwright coverage and runtime/docs | Low | Required validation and upkeep |
**Total complexity:** Within budget for V1

## Rollback Plan
- **Commit discipline:** Each module (`symbol-rain.config.js`, `symbol-rain.lifecycle.js`, `symbol-rain.animation.js`, `symbol-rain.helpers.spawn.js`, `symbol-rain.helpers.pool.js`, `symbol-rain.targets.js`) must be changed in its own atomic commit so partial rollback is possible. Do not combine module changes in a single commit.
- **Before launch:** Revert the resurfacing scheduler changes per-module and restore the existing falling symbol-rain cadence.
- **After launch:** Revert the feature branch PR as a single unit if gameplay feel or interaction timing regresses broadly; revert individual module commits for narrower regressions.
- **Data recovery:** None required; runtime-only behavior change.

## What This Design Does NOT Do
- Does NOT change Panel A or Panel B gameplay rules.
- Does NOT introduce guaranteed visible matches when a required symbol is hidden.
- Does NOT move symbols outside Panel C.
- Does NOT grant any element other than worms, spiders, and Evan's helper permission to cross panel borders.
- Does NOT add new documentation files beyond the brainstorm handoff artifact and approved durable doc updates.

## Open Questions
- [ ] ~~Final spacing constants may need tuning separately for compact portrait and ultra-narrow landscape surfaces.~~ **Promoted to V1 acceptance criterion** (see Success Metrics and Testing Strategy). Mobile is authoritative; spacing tuning is not post-launch polish.
- [x] Perf lane baselines will need updating after motion-heavy behavior is removed — covered in the Testing Strategy perf baseline update step.

## Testing Strategy

### Files to modify
- `tests/symbol-rain.live-targets.spec.js`: rewrite motion-assertion tests to assert lifecycle phase states and visible-only interaction. Remove any assertion that validates downward travel. Add bounding-rect containment assertion: every visible instance must be fully inside Panel C bounds.
- `tests/symbol-rain.mobile.spec.js`: update non-overlap and placement assertions for the resurfacing model; validate compact portrait and ultra-narrow landscape placement.
- `tests/evan-helper.symbols.spec.js` + `tests/evan-helper.flow.spec.js`: confirm Evan auto-collection still routes through `getVisibleMatchingCandidates` and that targeting a `hidden` symbol produces no match.
- `tests/gameplay-features.spec.js`: verify click and keyboard targeting produce no match for `hidden` or `fading` instances.
- `tests/perf-scenarios.spec.js`: confirm the Moto G4 emulation frame-rate floor (50fps) during peak resurface cycles.

### Required new assertions
- **Global non-overlap:** After the startup visible window, collect all visible symbols, lock display, console elements, and UI targets. Call `getBoundingClientRect` on each pair across element classes and assert zero bounding-box intersections with < 4px clearance. This is a cross-element check, not only within Panel C.
- **Panel containment (non-crossing elements):** For every visible symbol, lock display, console element, and UI element, assert that its bounding box is fully inside its owning panel's bounding box (no side protrudes by ≥ 1px). Fail if `overflow: hidden` clip is absent from the panel container.
- **Border crossing (permitted elements):** Assert that worm, spider, and Evan's helper elements are parented to the game root layer (not a panel container), so their `getBoundingClientRect` may extend beyond any single panel without triggering a containment failure.
- **Non-overlap (Panel C instances only):** After the startup visible window, collect all elements with `[data-symbol-state="visible"]`, call `getBoundingClientRect` on each pair, and assert zero bounding-box intersections with < 4px clearance.
- **Synchronized startup fade:** At 3100ms from Panel C mount, assert that 0 instances have `data-symbol-state="visible"`. Then at 3200ms–10000ms, assert that instances resurface at different times (not all at once).
- **Deferred placement:** In a layout where Panel C is overcrowded, assert that an instance defers rather than overlapping.
- **Tab-backgrounding recovery:** Simulate `visibilitychange` to hidden for 5s, then restore. Assert that instances do not all resurface simultaneously (no burst), and that each resurfaces within its remaining delay window.
- **Teardown:** After calling `teardown()`, assert that no `setTimeout` callbacks fire against the dismounted Panel C (via spy on `data-symbol-state` mutations).

### Perf baseline update step
1. Run `npm run test:competition:soak:symbol-rain` after implementation.
2. Capture new baselines.
3. Update `tests/perf-baselines.json` and commit as part of the implementation PR before CI runs.

### Execution order
1. Focused lifecycle unit tests (phase transitions, non-overlap, startup fade).
2. `tests/symbol-rain.live-targets.spec.js` and `tests/symbol-rain.mobile.spec.js`.
3. `tests/evan-helper.symbols.spec.js`, `tests/evan-helper.flow.spec.js`, `tests/gameplay-features.spec.js`.
4. `tests/perf-scenarios.spec.js` (Moto G4 emulation).
5. `npm run test:competition:soak:symbol-rain` (60-second soak lane).
6. `npm run verify` and `npm run typecheck`.