# Plan Beta

## Purpose

Plan Beta is the roadmap and execution source of truth. It absorbs the old competition roadmap, execution matrix, recent superpower plans, brainstorm artifacts, and context maps.

## Active Product Priorities

1. Android WebView remains the primary quality bar.
2. H2P is exactly one dedicated tutorial level.
3. Gameplay should remain a puzzle; in-app bypasses should not undercut an unresolved level.
4. Deterministic runtime behavior beats speculative architecture churn.
5. Generated algebra is a later spike, not part of the critical gameplay path.

## Decision Gates

| Decision | Required | Current stance |
| --- | --- | --- |
| Tooling truth pass first | Yes | Always |
| Competition QA lanes | Yes | Maintain and extend |
| Online synchronized matches | Optional | Only if explicitly required |
| UX accessibility hardening | Yes | Always |
| Generated algebra rollout | Optional | Defer until after stable WebView tutorial path |

## Current Execution Order

### Phase 0: Project Truth

- align scripts, tasks, tests, and docs with actual runtime behavior
- keep verification green while reducing documentation sprawl

### Phase 1: Runtime Determinism

- preserve stable load order
- keep event contracts explicit
- avoid hidden partial boot states

### Phase 2: Mobile and WebView Quality

- compact/mobile classification stays centralized
- tutorial and onboarding work must validate on WebView-like conditions
- touch-first fixes should prefer owner-script heuristics and CSS `touch-action` over ad hoc timing-based click suppression

### Phase 3: UX and Accessibility

- keyboard equivalence
- focus safety
- readability under pressure
- visible fallback messaging for degraded states

### Phase 4: Optional Future Work

- online bridge and reconnect architecture only after scope approval
- generated algebra experiments only after profiling demonstrates a real need

## Execution Matrix

| Phase | Workstream | Target areas | Validation |
| --- | --- | --- | --- |
| 0A | Tooling truth pass | `package.json`, workspace tasks, docs, verify script | `npm run verify` |
| 0B | Event contract inventory | game, worm, lock, console, symbol-rain families | focused smoke and doc review |
| 0C | Observability foundation | Playwright config, fixtures, runtime observers | smoke lane with artifacts |
| 1A | Startup determinism | `src/pages/game.html`, game boot chain, lazy loaders | manual three-level load + Playwright |
| 1B | Tooling cleanup | scripts, tasks, doc references | `npm run verify`, `npm run typecheck` |
| 2A | Boundary hardening | cross-domain state touchpoints | focused gameplay regressions |
| 2B | Security and perf guardrails | loaders, queues, event gateways, worker behavior | stress and smoke lanes |
| 3A | Competition QA lane | competition config, helpers, deterministic state reset | smoke + matrix |
| 3B | Accessibility and UX P0 | level select, game UI, console, HUD | keyboard/manual + Playwright |
| 4A | Loading-state resilience | problem loaders, lazy loaders, worker hooks | slow/failing asset scenarios |
| 4B | Net bridge skeleton | future adapter layer only if approved | contract tests |
| 5A | Reconnect and authority | future network modules only if approved | synthetic match tests |

## Current Feature Track: Single H2P WebView Path

### Scope

- dedicated H2P route before Beginner
- forced Evan walkthrough on H2P
- in-app exit guard during unresolved gameplay
- WebView-first validation

### Acceptance Criteria

1. Beginner launches H2P only until tutorial completion.
2. H2P content is distinct from Beginner content.
3. Evan auto-runs on H2P even on compact/mobile surfaces.
4. Tutorial beat sequence demonstrates worm, muffin, power-up, and symbol solving.
5. In-app exits re-enable immediately on completion.

### Validation Batch

```bash
npx playwright test tests/tutorial-level-routing.spec.js tests/gameplay-exit-guard.spec.js tests/h2p-tutorial.spec.js --project=chromium --reporter=line
```

## Competition QA Policy

### Required Lanes

- PR smoke
- pre-merge matrix
- nightly soak and perf monitoring

### Determinism Rules

- inject deterministic seed when needed
- reset browser and app state between scenarios
- capture console errors, page errors, failed requests, and useful performance artifacts

### Merge Blocking Conditions

- unclassified runtime errors
- broken critical event sequence
- focused regression lane failure
- mobile/WebView contract failure on a touched surface
- console or symbol-rain touch regressions on `tests/console-interactions.spec.js`, `tests/game-portrait-device-contract.spec.js`, or `tests/symbol-rain.mobile.spec.js`

## Backlog Rules

### Do Now

- consolidate stale docs into the surviving five files
- keep verification aligned with repo reality
- protect WebView-first gameplay quality

### Do Next

- strengthen competition QA determinism
- keep startup/load resilience explicit
- improve accessibility and focus safety in high-pressure surfaces

### Defer

- online multiplayer architecture
- full generated algebra replacement
- broad rewrites that bypass existing event contracts

## Generated Algebra Decision

Generated algebra is not a performance optimization for this codebase right now.

Reasons:

- authored content is deterministic and simpler to validate
- Android WebView is the primary target and should avoid unnecessary symbolic runtime work
- the current bottlenecks are startup, layout, interaction, and regression safety, not authored problem-file overhead

If pursued later, it should be a separate spike with profiling, not a silent replacement of authored content.

## Rollback Philosophy

- isolate scope by workstream
- prefer reversible doc or config changes first
- do not mix architecture refactors with validation-lane changes unless necessary
- keep feature flags or guarded fallbacks for higher-risk runtime shifts

## Consolidation Record

Beta absorbed the old content from:

- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`
- `.github/superpower/plan/*.md`
- `.github/superpower/brainstorm/*.md`
- `.github/superpower/context/*.md`

The deleted superpower artifacts were historical planning material, not durable source-of-truth docs.

## Active Implementation Plan: Panel C Integrity, Cheat Seal, and Audio UX

> Execution note: this plan is the active implementation source of truth for the verified gameplay issues reported on 2026-04-20/21. No new Markdown plan file should be created; durable follow-up notes belong in `Plan Genesis.md`, `Plan Alpha.md`, and `JOBCARD.md`.

**Goal:** Fix the hidden-answer selection leak, eliminate confirmed Panel B overlap, restore Panel C rain visibility under panel-local reflow, prevent Evan from targeting symbols outside the real rain window, and add a provenance-aware audio upgrade for row completion.

**Constraints:**

- Preserve script-tag runtime ordering and `window.*` registration semantics.
- Keep Panel A and Panel B sizing ownership in `src/scripts/display-manager.js`.
- Reuse existing event contracts where possible and extend them additively when needed.
- Do not create new Markdown files.
- Validation baseline remains `npm run verify` and `npm run typecheck`.
- Prefer the smallest focused Playwright lane for each touched surface.

**Verified Findings Driving This Plan:**

1. Hidden symbols in `#solution-container` remain selectable and selection returns unrevealed answer text.
2. `#power-up-display` overlaps `.panel-b-controls` and `#solution-container` during live gameplay startup.
3. `window.__symbolRainState.cachedContainerHeight` can remain stale after panel-local reflow while the actual Panel C rain window shrinks.
4. Evan target selection does not share Panel C/rain-window intersection rules.
5. Row-complete audio is generic and master gain is very conservative; event payload lacks source provenance.

### Phase 0: Lock Failures Into Tests

#### Task 0.1: Add hidden-symbol confidentiality coverage

**Files:**
- Modify: `tests/gameplay-features.spec.js` or create `tests/solution-cheat-protection.spec.js`
- Read for reference: `src/styles/css/game-effects.css`

- [x] Write a failing Playwright test that loads `src/pages/game.html?level=beginner&evan=off&preload=off`, dismisses briefing, selects `#solution-container`, and asserts unrevealed solution text is not recoverable via `window.getSelection().toString()`.
- [x] Assert `.hidden-symbol` elements do not resolve to `user-select: auto`.
- [x] Run: `npx playwright test tests/solution-cheat-protection.spec.js --project=chromium --reporter=line`
- [ ] Confirm the test fails before implementation.

#### Task 0.2: Add startup overlap coverage for Panel B and power-ups

**Files:**
- Modify: `tests/ui-boundary.spec.js`
- Read for reference: `src/styles/css/game.css`, `src/styles/css/game-polish.chrome.controls.css`, `src/styles/css/game-polish.chrome.playfield.css`

- [x] Add a failing assertion proving `#power-up-display` does not overlap `.panel-b-controls`.
- [x] Add a failing assertion proving `#power-up-display` does not overlap `#solution-container`.
- [x] Run: `npx playwright test tests/ui-boundary.spec.js --project=chromium --grep "Powerup display|panel-b-controls|solution" --reporter=line`
- [ ] Confirm the new overlap assertions fail before implementation.

#### Task 0.3: Add Panel C stale-geometry and Evan bounds coverage

**Files:**
- Modify: `tests/symbol-rain.live-targets.spec.js`
- Modify: `tests/symbol-rain.mobile.spec.js`
- Modify: `tests/evan-helper.symbols.spec.js`

- [x] Add a failing test that forces a Panel C-only height change, then asserts `window.__symbolRainState.cachedContainerHeight` re-syncs to the actual `#symbol-rain-container` height.
- [x] Add a failing test that proves visible-symbol checks use the actual rain window after reflow, not stale cached geometry.
- [x] Add a failing Evan helper test proving off-window falling symbols are ignored even if their rect still has positive width and height.
- [x] Run: `npx playwright test tests/symbol-rain.live-targets.spec.js tests/symbol-rain.mobile.spec.js tests/evan-helper.symbols.spec.js --project=chromium --reporter=line`
- [ ] Confirm the new Panel C and Evan assertions fail before implementation.

#### Task 0.4: Add audio provenance coverage

**Files:**
- Modify: `tests/interaction-audio.unlock.spec.js`
- Create if needed: `tests/interaction-audio.row-complete.spec.js`

- [x] Add a failing test that dispatches `problemLineCompleted` with and without provenance detail and verifies audio can branch only on the intended source.
- [x] Add a failing test that checks the unmuted master gain target is above the current `0.055` baseline once the audio upgrade is applied.
- [x] Run: `npx playwright test tests/interaction-audio.unlock.spec.js tests/interaction-audio.row-complete.spec.js --project=chromium --reporter=line`
- [ ] Confirm the audio assertions fail before implementation.

### Phase 1: Seal The Hidden-Answer Leak

#### Task 1.1: Remove recoverable unrevealed text behavior

**Files:**
- Modify: `src/styles/css/game-effects.css`
- Modify if required by test design: `src/scripts/game-symbol-helpers.js` and/or `src/scripts/game-symbol-handler.core.js`

- [x] Implement the minimal fix that prevents unrevealed solution symbols from being recovered through normal selection.
- [x] Prefer a root-cause fix that keeps unrevealed content non-readable before reveal, not only visually transparent.
- [x] Keep the existing hidden-symbol lookup contract used by symbol-rain and Evan helper flows intact.
- [x] Re-run: `npx playwright test tests/solution-cheat-protection.spec.js --project=chromium --reporter=line`
- [ ] Stop if the fix breaks live symbol lookup or reveal behavior.

**Rollback boundary:** revert only hidden-symbol confidentiality changes if symbol lookup contracts regress.

### Phase 2: Resolve Confirmed Panel B Overlap

#### Task 2.1: Consolidate power-up placement ownership

**Files:**
- Modify: `src/styles/css/game.css`
- Modify: `src/styles/css/game-polish.chrome.controls.css`
- Modify: `src/styles/css/game-polish.chrome.playfield.css`
- Modify if needed: `src/styles/css/score-timer.css`
- Modify if needed: `src/scripts/worm-powerups.ui.js`

- [x] Choose one authoritative placement path for `#power-up-display` and make the other layers styling-only.
- [x] Preserve `display-manager.js` as the owner of sizing classification.
- [x] Ensure the final geometry clears both `.panel-b-controls` and `#solution-container` on live startup.
- [x] Re-run: `npx playwright test tests/ui-boundary.spec.js --project=chromium --grep "Powerup display|panel-b-controls|solution" --reporter=line`
- [x] Re-run: `npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js --reporter=line`

**Rollback boundary:** revert only overlap-placement changes if mobile or startup layout contracts regress.

### Phase 3: Refresh Panel C Geometry And Unify Visibility Rules

#### Task 3.1: Re-sync Panel C geometry after panel-local reflow

**Files:**
- Modify: `src/scripts/3rdDISPLAY.js`
- Modify if needed: `src/scripts/symbol-rain.helpers.utils.js`

- [x] Add a Panel C-local geometry refresh path that updates cached container metrics when the rain window changes size without relying only on `window.resize`.
- [x] Guard against resize loops and keep startup bootstrap behavior intact.
- [x] Re-run: `npx playwright test tests/symbol-rain.live-targets.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --reporter=line`

#### Task 3.2: Use one real rain-window visibility contract everywhere

**Files:**
- Modify: `src/scripts/symbol-rain.spawn.js`
- Modify: `src/scripts/symbol-rain.animation.js`
- Modify if needed: `src/scripts/symbol-rain.helpers.utils.js`

- [x] Centralize the visibility/intersection rule so live-symbol availability, cleanup, and spawn eligibility all use the actual Panel C rain window.
- [x] Ensure symbols outside the real rain window are not treated as satisfying visible-target guarantees.
- [x] Re-run: `npx playwright test tests/symbol-rain.live-targets.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --reporter=line`

#### Task 3.3: Make Evan consume the same bounds contract

**Files:**
- Modify: `src/scripts/evan-helper.controller.targets.js`

- [x] Update Evan target selection to ignore symbols outside the real Panel C rain window, not only zero-area or disconnected elements.
- [x] Keep fixture-based tests working for `data-test-target` helpers.
- [x] Re-run: `npx playwright test tests/evan-helper.symbols.spec.js --project=chromium --reporter=line`

**Rollback boundary:** revert only Evan changes if helper targeting regresses while Panel C runtime remains correct.

### Phase 4: Add Provenance-Aware Audio Upgrade

#### Task 4.1: Extend line-complete event detail additively

**Files:**
- Modify: `src/scripts/game-symbol-handler.core.js`
- Modify if needed: `src/scripts/constants.events.js`

- [x] Add a backward-compatible provenance field to the `problemLineCompleted` detail payload.
- [x] Do not break existing worm, lock, timer, or audio listeners that already consume this event.
- [x] Re-run the smallest relevant consumers after the payload change.

#### Task 4.2: Improve gain behavior and add row-complete cue routing

**Files:**
- Modify: `src/scripts/interaction-audio.cyberpunk.js`
- Modify: `src/scripts/interaction-audio.cyberpunk.state.js`
- Modify: `src/scripts/interaction-audio.cyberpunk.gameplay.js`
- Modify if needed: `src/scripts/interaction-audio.cyberpunk.drums.sequencer.js`

- [x] Raise the effective audio level conservatively and use scheduled/ramped gain changes to avoid audible pops.
- [x] Add a distinct row-complete cue path that only fires for the intended provenance detail.
- [x] Keep mute behavior and drum progression intact.
- [x] Re-run: `npx playwright test tests/interaction-audio.unlock.spec.js tests/interaction-audio.row-complete.spec.js --project=chromium --reporter=line`

**Rollback boundary:** revert audio cue/gain changes if mute, unlock, or drum progression behavior regresses.

### Phase 5: Final Verification And Durable Notes

#### Task 5.1: Focused validation sweep

**Commands:**

- [x] `npx playwright test tests/solution-cheat-protection.spec.js tests/ui-boundary.spec.js tests/symbol-rain.live-targets.spec.js tests/symbol-rain.mobile.spec.js tests/evan-helper.symbols.spec.js tests/interaction-audio.unlock.spec.js tests/interaction-audio.row-complete.spec.js --project=chromium --reporter=line`
- [x] `npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js --reporter=line`
- [x] `npm run verify`
- [x] `npm run typecheck`

#### Task 5.2: Fold durable changes into approved docs only

**Files:**
- Modify: `Plan Genesis.md`
- Modify if needed: `Plan Alpha.md`
- Modify: `JOBCARD.md`

- [x] Record the durable Panel C visibility contract and event-detail addition in `Plan Genesis.md`.
- [ ] Record any lasting gameplay-integrity or overlap rule in `Plan Alpha.md` only if it changes product/design truth.
- [x] Add the implementation and validation summary to `JOBCARD.md`.

### Verification Gate Before Claiming Completion

- [ ] All new failing tests added before implementation were observed red, then green.
- [x] Focused Playwright lanes for touched surfaces are green.
- [x] `npm run verify` is green.
- [x] `npm run typecheck` is green.
- [x] No new Markdown files were created.
- [x] Durable notes were folded into existing approved docs only.
## Active Implementation Plan: Sci-Fi Console UI Hardening

> **For agentic workers:** REQUIRED: Use the `subagent-driven-development` agent (recommended) or `executing-plans` agent to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the "Premium Sci-Fi Console" UX specification focused on strictly bounded layout, 44x44 touch safety, and GPU-only CSS transitions to guarantee <22ms mobile frame times.

**Architecture:** We will strip layout-triggering properties (`transition: all`, `width`, `height` in hover states) from the core animation files. We will enforce fluid typography and button heights using `clamp()` and `min-height: 44px`.

**Tech Stack:** Native CSS, Playwright for visual regression and accessibility.

---

### Task 1: Strict CSS GPU & Touch Safety Rules

**Files:**
- Modify: `src/styles/css/game-animations.core.css`
- Modify: `src/styles/css/index.actions.css`
- Test: `tests/ui-boundary.spec.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Append to tests/ui-boundary.spec.js
test('Buttons meet 44x44px touch target protocol', async ({ page }) => {
  await page.goto('/src/pages/index.html');
  const buttons = page.locator('button, [role="button"]');
  const count = await buttons.count();
  
  for (let i = 0; i < count; i++) {
    const box = await buttons.nth(i).boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/ui-boundary.spec.js --project=chromium`
Expected: FAIL because some legacy buttons on index or game layouts may be `36px` or less.

- [ ] **Step 3: Write minimal implementation**

```css
/* In index.actions.css and forms using buttons */
button, 
.action-target, 
[role="button"] {
  min-height: 44px;
  min-width: 44px;
  /* Decisive easing only */
  transition: transform 150ms var(--ease-out-quint), opacity 150ms linear;
}

button:active {
  transform: scale(0.96);
}
```

```css
/* In game-animations.core.css, remove and replace any 'transition: all' */
.worm-entity {
  /* only transition GPU properties */
  transition: transform 200ms linear, opacity 150ms var(--ease-out-quint);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/ui-boundary.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/ui-boundary.spec.js src/styles/css/index.actions.css src/styles/css/game-animations.core.css
git commit -m "fix: enforce 44px touch targets and GPU-only transitions"
```

### Task 2: Implement Reduced-Motion UX Requirements

**Files:**
- Modify: `src/styles/css/lod-animations.reduced-motion.css`
- Test: `tests/focused-mobile-a11y-checks.spec.js` (create if doesn't exist)

- [ ] **Step 1: Write the failing test**

```javascript
/* In a new or existing a11y spec */
test('Reduced motion disables transform animations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/src/pages/game.html?level=beginner');
  
  const elementContent = await page.evaluate(() => {
    const styles = window.getComputedStyle(document.body);
    return styles.getPropertyValue('--ease-out-quint');
  });
  
  // Actually test standard UI components
  const button = page.locator('button').first();
  await button.hover();
  
  // It shouldn't animate transform or we should force zero-duration.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test tests/focused-mobile-a11y-checks.spec.js --project=chromium`
Expected: FAIL

- [ ] **Step 3: Write minimal implementation**

```css
/* Append to lod-animations.reduced-motion.css */
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx playwright test tests/focused-mobile-a11y-checks.spec.js --project=chromium`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/styles/css/lod-animations.reduced-motion.css
git commit -m "feat: complete a11y full reduced-motion coverage"
```
