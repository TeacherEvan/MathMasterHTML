# UI Boundary Mobile Recovery Plan

> For agentic workers: use `subagent-driven-development` or `executing-plans` and keep this slice limited to the mobile/UI-boundary failures only.

**Goal:** Stabilize the compact mobile UI-boundary contract so Panel A vertical separation, compact HUD width, and Evan preview boundary checks pass without pulling in unrelated gameplay or layout work.

**Architecture:** Preserve the browser-native script-tag runtime, current DOM/event boundaries, and existing ownership split between shared layout CSS, compact-landscape overrides, Evan modal CSS, and display sizing scripts. Prefer the smallest focused change set that restores the measured mobile geometry.

**Tech Stack:** Browser-native HTML/CSS/JavaScript, Playwright, `npm run verify`, `npm run typecheck`.

---

## Scope

- In scope:
  - `src/styles/css/game.css`
  - `src/styles/css/score-timer.css`
  - `src/styles/css/game-responsive.mobile-landscape.css`
  - `src/styles/css/game-responsive.mobile-landscape.shallow.css`
  - `src/styles/css/game-modals.evan.css`
  - `tests/ui-boundary.spec.js`
- Escalate only if CSS cannot make the layout stable:
  - `src/scripts/display-manager.js`
  - `src/scripts/display-manager.mobile.js`
  - `src/scripts/lock-responsive.js`
- Out of scope:
  - Evan input-lock/runtime flow
  - worm or power-up gameplay behavior
  - desktop layout redesign
  - performance baseline work
  - unrelated Playwright cleanup

## Failure Slice

- `tests/ui-boundary.spec.js:87`
  - iPhone-13: `Lock display should not overlap with problem container`
  - observed: lock Y `86`, expected `>= 96`
- `tests/ui-boundary.spec.js:263`
  - iPhone-13: `Mobile layout should maintain separation`
  - observed: HUD width `832`, expected `<= 828`
- `tests/ui-boundary.spec.js:311`
  - iPhone-13: `Problem and lock should have vertical separation`
  - observed gap `-20`, expected `>= -10`
- `tests/ui-boundary.spec.js:388`
  - iPhone-13 / pixel-7 / webkit: `With body.evan-layout-preview, #evan-controls-slot does not overlap .panel-b-controls outer edge`
  - observed: containment false

## Likely Root-Cause Areas

- Compact-landscape lock and problem offsets are probably drifting because fixed CSS positions in `game-responsive.mobile-landscape.css` and `game-responsive.mobile-landscape.shallow.css` are not aligned with the actual problem box height after mobile display sizing.
- HUD width/safe-zone expectations likely drift between `score-timer.css`, `game.css`, and compact-landscape overrides. This could be a real layout bug, a stale assertion, or both.
- The Evan preview containment assertion is likely over-broad. The DOM structure places `#evan-controls-slot` in Panel A while `.panel-b-controls` belongs to Panel B, so full containment inside `.panel-b-controls` may not be the right contract.
- If CSS-only alignment still fails on iPhone/WebKit, the fallback is to move only the vertical offset decision into a measurement-aware runtime hook in `display-manager.mobile.js` or `lock-responsive.js`.

## Ordered Tasks

- [ ] **Task 1: Reproduce only the mobile/UI-boundary failures on iPhone-13**
  - Run the focused `ui-boundary` iPhone lane with one worker.
  - Capture the actual boxes for `#problem-container`, `#lock-display`, `#game-hud`, `.panel-b-controls`, and `#evan-controls-slot`.
  - Classify each failure as runtime geometry bug versus stale test contract.

- [ ] **Task 2: Recover compact Panel A vertical spacing**
  - Start in `game-responsive.mobile-landscape.css` and `game-responsive.mobile-landscape.shallow.css`.
  - Unify the problem and lock top spacing so both derive from the same compact safe zone instead of independent magic numbers.
  - Escalate to `display-manager.mobile.js` or `lock-responsive.js` only if CSS cannot keep iPhone/WebKit stable.

- [ ] **Task 3: Recover compact HUD width and safe-zone consistency**
  - Align the compact-landscape left/right inset contract between `score-timer.css` and `game.css`.
  - If the runtime is already correct, narrow the HUD width assertion in `tests/ui-boundary.spec.js` to the actual supported inset contract instead of a stale hard-coded width.

- [ ] **Task 4: Correct the Evan preview boundary contract**
  - Replace the impossible full-containment expectation in `tests/ui-boundary.spec.js` with a boundary check that matches the actual Panel A / Panel B structure.
  - Tighten `game-modals.evan.css` only if the preview mode still visibly collides with the panel controls after the assertion is corrected.

- [ ] **Task 5: Lock the focused validation lane**
  - Re-run the iPhone-only boundary lane.
  - Re-run the preview subset on iPhone-13, pixel-7, and webkit.
  - Re-run a Chromium `ui-boundary` sanity pass.

## Validation

- `npx playwright test tests/ui-boundary.spec.js --project=iphone-13 --workers=1 --reporter=line`
- `npx playwright test tests/ui-boundary.spec.js --project=iphone-13 --project=pixel-7 --project=webkit --grep "Lock display should not overlap with problem container|Mobile layout should maintain separation|Problem and lock should have vertical separation|With body.evan-layout-preview" --workers=1 --reporter=line`
- `npx playwright test tests/ui-boundary.spec.js --project=chromium --workers=1 --reporter=line`
- `npm run typecheck`
- `npm run verify`

## Exit Criteria

- The three iPhone-13 compact-layout failures in `tests/ui-boundary.spec.js` are green in repeat runs.
- The Evan preview boundary assertion matches the real DOM contract and passes on iPhone-13, pixel-7, and webkit.
- No new `ui-boundary` regressions appear on Chromium.
- `npm run typecheck` and `npm run verify` stay green.