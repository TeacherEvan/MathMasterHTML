# MathMasterHTML Implementation Plan

**Goal:** Fix the mobile gameplay display by unifying compact/mobile detection without overcomplicating the codebase, then elevate the `level-select` and `welcome` screens with cleaner alignment, stronger hierarchy, and a more premium visual centerpiece.

**Architecture:** Keep the existing browser-native HTML/CSS/JS structure intact. Reuse current page entrypoints, existing CSS hubs, and current Playwright coverage. Prefer one shared compact/mobile contract over adding new subsystems.

**Tech Stack:** Vanilla HTML/CSS/JavaScript, Playwright, existing `npm` verification scripts.

---

## Key findings from investigation

- The gameplay mobile bug is most likely caused by conflicting viewport heuristics across JS and CSS.
- `src/scripts/display-manager.js` detects resolution mostly from width-based buckets.
- `src/scripts/display-manager.mobile.js` applies compact typography using width, height, and coarse-pointer checks.
- `src/styles/css/game-responsive.layout.css` switches layout at `max-width: 800px` or `max-height: 500px`.
- `src/styles/css/game-responsive.rotation.css` uses `max-width: 768px`.
- `src/scripts/3rdDISPLAY.js` infers mobile mode from `window.innerWidth <= 768` or `body.res-mobile`.
- On landscape phones, these rules can disagree and create a hybrid state: compact/mobile CSS with desktop-ish JS scaling.
- The welcome page HTML uses classes such as `welcome-header`, `quote`, `logo-content`, `logo-symbol`, `logo-variables`, and `welcome-hint`, but the current imported welcome CSS only partially styles that structure.
- The level-select screen already has a solid operator-console base, so the work there should be a refinement pass rather than a full redesign.

---

## Task 1: Lock down the mobile gameplay bug with regression coverage

### Execution update (2026-04-05)

- `tests/game-mobile-layout.spec.js` already contains the intended landscape-phone regression coverage and currently passes in this branch.
- Treat the current spec as the verified baseline for Task 1 unless additional compact/mobile assertions are discovered to be missing during follow-on work.
- Because the regression is already green, use the runtime code review in Task 1 only to confirm the shared compact/mobile contract remains coherent; do not force a synthetic failing state.

### Step 1: Extend the failing mobile gameplay test

- **File:** `tests/game-mobile-layout.spec.js`
- **Code to add/update:** confirm the existing landscape-phone assertions cover, or extend them to also verify:
  - `document.body.className` includes the expected compact/mobile resolution class for a landscape mobile viewport
  - compact gameplay font sizing stays within intended readable ranges
  - the layout does not end up in a desktop-style resolution state while the compact CSS layout is active
- **Implementation notes:**
  - Reuse the existing Pixel 7 landscape setup already in this file.
  - Add a `bodyClasses` field to the page-evaluated layout payload.
  - Add one boolean or string field that captures the active resolution state, using either `window.displayManager?.getCurrentResolution?.()` or the body class if needed.

### Step 2: Run the targeted test and verify failure

- **Command:**

```bash
npm test -- tests/game-mobile-layout.spec.js
```

- **Expected output:**

```text
PASS tests/game-mobile-layout.spec.js
```

- **Execution note:** if this test fails in a future run, treat that as a regression and stop to debug before continuing.

### Step 3: Implement the minimal compact/mobile contract fix

- **Files:**
  - `src/scripts/display-manager.js`
  - `src/scripts/display-manager.mobile.js`
  - `src/scripts/3rdDISPLAY.js`
- **Code changes to make:**
  - In `src/scripts/display-manager.js`, introduce one shared compact/mobile predicate used by:
    - resolution detection
    - font-size adjustments
    - symbol rain adjustments
    - emitted `displayResolutionChanged` details
  - Ensure the predicate supports landscape phones and compact-height devices without misclassifying ordinary desktop widths.
  - In `src/scripts/display-manager.mobile.js`, stop re-deciding compact mode independently; instead consume the existing resolution/body-class contract emitted by the display manager.
  - In `src/scripts/3rdDISPLAY.js`, replace direct `window.innerWidth <= 768` checks with the shared emitted/body-class state.
- **Constraints:**
  - Do not introduce a new framework or subsystem.
  - Preserve the existing event-driven flow.
  - Keep the public behavior simple and local to the display-management path.

### Step 4: Re-run the targeted test and verify success

- **Command:**

```bash
npm test -- tests/game-mobile-layout.spec.js
```

- **Expected output:**

```text
PASS tests/game-mobile-layout.spec.js
```

- **Execution note:** if no runtime changes are required because the shared compact/mobile contract is already coherent, this step is satisfied by the baseline verification from Step 2.

---

## Task 2: Align gameplay responsive CSS to the same compact/mobile contract

### Step 1: Extend layout-safety assertions for compact gameplay

- **File:** `tests/game-mobile-layout.spec.js`
- **Code to add/update:**
  - add assertions that confirm compact/mobile gameplay state aligns with the rendered layout behavior
  - ensure the rotation overlay remains hidden in landscape mobile
  - confirm the console and panels remain fully inside the viewport after the compact layout activates

### Step 2: Run the gameplay layout test and verify remaining failure if CSS still diverges

- **Command:**

```bash
npm test -- tests/game-mobile-layout.spec.js
```

- **Expected output:**

```text
FAIL tests/game-mobile-layout.spec.js
```

- **Failure shape:** assertions fail if CSS breakpoints still create a layout state that disagrees with the shared compact/mobile JS mode.

### Step 3: Simplify CSS breakpoint drift

- **Files:**
  - `src/styles/css/game-responsive.layout.css`
  - `src/styles/css/game-responsive.mobile-landscape.css`
  - `src/styles/css/game-responsive.rotation.css`
- **Code changes to make:**
  - key compact gameplay layout primarily from the shared body state already applied by the display manager where practical
  - narrow the portrait rotation overlay behavior so it only appears for true portrait mobile cases
  - remove or reduce duplicated threshold logic that causes hybrid compact/desktop rendering
- **Constraints:**
  - Preserve the current three-panel adaptation intent.
  - Keep the CSS surgical; do not redesign gameplay layout.

### Step 4: Verify compact gameplay and boundary safety

- **Commands:**

```bash
npm test -- tests/game-mobile-layout.spec.js
npm test -- tests/ui-boundary.spec.js
```

- **Expected output:**

```text
PASS tests/game-mobile-layout.spec.js
PASS tests/ui-boundary.spec.js
```

---

## Task 3: Center and refine the welcome screen

### Step 1: Add a failing welcome-layout regression test

- **File:** `tests/welcome-page-redesign.spec.js`
- **Code to add/update:** add assertions for:
  - centered alignment of the hero stack
  - readable spacing between header, symbol, quote, buttons, hint, and credit
  - visible and visually emphasized center emblem
  - retained CTA and scoreboard behavior
- **Implementation notes:**
  - Use `boundingBox()` and computed-style checks where appropriate.
  - Reuse the existing welcome-page navigation and modal coverage.

### Step 2: Run the welcome test and verify failure

- **Command:**

```bash
npm test -- tests/welcome-page-redesign.spec.js
```

- **Expected output:**

```text
FAIL tests/welcome-page-redesign.spec.js
```

- **Failure shape:** layout/alignment assertions fail because several live welcome-page classes are under-styled today.

### Step 3: Implement welcome-page polish and emblem enhancement

- **Files:**
  - `src/styles/css/index.core.css`
  - `src/styles/css/index.hero.css`
  - `src/styles/css/index.responsive.css`
  - `src/scripts/index-page.effects.js`
- **Code changes to make:**
  - add real styling for existing welcome-page structure used in `src/pages/index.html`
  - center and align all font/content groups cleanly
  - improve hierarchy for `page-kicker`, title, subtitle, quote, hint, and credit
  - enhance the middle rotating symbol using layered rings, refined glow, clearer variable placement, and restrained motion
  - replace or soften the current random brightness/title effect with a more intentional premium pulse treatment
- **Constraints:**
  - Keep the current HTML structure largely intact.
  - Preserve reduced-motion compatibility.
  - Do not add unnecessary DOM complexity.

### Step 4: Re-run the welcome test and verify success

- **Command:**

```bash
npm test -- tests/welcome-page-redesign.spec.js
```

- **Expected output:**

```text
PASS tests/welcome-page-redesign.spec.js
```

---

## Task 4: Upgrade the level-select screen with a refinement pass

### Step 1: Add a failing structural/polish regression test

- **File:** `tests/level-select-scoreboard.spec.js` or `tests/level-select-polish.spec.js`
- **Code to add/update:** assert that:
  - the hero block remains visually strong and readable
  - all three route cards remain interactive and readable after polish
  - progress stats remain visible and intact
  - mobile/narrow layouts stack cleanly and preserve CTA usability
- **Implementation notes:**
  - Prefer extending an existing test if it keeps the suite focused.
  - Use a new spec only if the scoreboard responsibilities would become muddy.

### Step 2: Run the targeted level-select test and verify failure

- **Command:**

```bash
npm test -- tests/level-select-scoreboard.spec.js
```

- **Expected output:**

```text
FAIL tests/level-select-scoreboard.spec.js
```

- **Failure shape:** new presentation or small-screen assertions fail until the refinement is implemented.

### Step 3: Implement level-select refinement

- **Files:**
  - `src/styles/css/level-select.polish.css`
  - optionally `src/pages/level-select.html` if a minimal markup support change is needed
  - optionally `src/scripts/level-select-page.effects.js` for subtle motion refinement only
- **Code changes to make:**
  - strengthen visual hierarchy in the header
  - improve spacing rhythm and data grouping in the route cards
  - add a more premium accent-light treatment without abandoning the current operator-console aesthetic
  - improve small-screen stacking and CTA clarity
- **Constraints:**
  - This is a refinement pass, not a wholesale redesign.
  - Preserve existing scoreboard/progress behavior.
  - Maintain accessibility and reduced-motion support.

### Step 4: Re-run the level-select tests and verify success

- **Command:**

```bash
npm test -- tests/level-select-scoreboard.spec.js
```

- **Expected output:**

```text
PASS tests/level-select-scoreboard.spec.js
```

---

## Task 5: Final verification and safe rollout checks

### Step 1: Run the focused validation set

- **Commands:**

```bash
npm test -- tests/game-mobile-layout.spec.js
npm test -- tests/welcome-page-redesign.spec.js
npm test -- tests/level-select-scoreboard.spec.js
npm test -- tests/ui-boundary.spec.js
```

- **Expected output:**

```text
PASS tests/game-mobile-layout.spec.js
PASS tests/welcome-page-redesign.spec.js
PASS tests/level-select-scoreboard.spec.js
PASS tests/ui-boundary.spec.js
```

### Step 2: Run repository verification

- **Command:**

```bash
npm run verify
```

- **Expected output:**

```text
verification passes with no new lint or policy failures
```

### Step 3: Run the safest broader browser lane

- **Command:**

```bash
npm run test:competition:smoke
```

- **Expected output:**

```text
smoke lane passes on Chromium + Pixel 7 projects
```

---

## Recommended file targets

### Mobile gameplay fix

- `src/scripts/display-manager.js`
- `src/scripts/display-manager.mobile.js`
- `src/scripts/3rdDISPLAY.js`
- `src/styles/css/game-responsive.layout.css`
- `src/styles/css/game-responsive.mobile-landscape.css`
- `src/styles/css/game-responsive.rotation.css`
- `tests/game-mobile-layout.spec.js`
- `tests/ui-boundary.spec.js` (verification target; edit only if new assertions are needed)

### Welcome screen refinement

- `src/styles/css/index.core.css`
- `src/styles/css/index.hero.css`
- `src/styles/css/index.responsive.css`
- `src/scripts/index-page.effects.js`
- `tests/welcome-page-redesign.spec.js`

### Level-select refinement

- `src/styles/css/level-select.polish.css`
- `src/pages/level-select.html` (only if minimal support markup is needed)
- `src/scripts/level-select-page.effects.js` (only if subtle motion changes are needed)
- `tests/level-select-scoreboard.spec.js` or `tests/level-select-polish.spec.js`

---

## Success criteria

- Mobile gameplay no longer appears like the desktop layout squeezed onto a phone.
- Landscape phones use one coherent compact/mobile layout and sizing contract.
- Portrait mobile only shows the rotate overlay when appropriate.
- Welcome page typography is neatly centered and aligned.
- The center rotating symbol feels more visually premium and intentional.
- Level-select looks more polished, energetic, and less dull while preserving its current architecture.
- Focused Playwright coverage passes.
- `npm run verify` passes.
- `npm run test:competition:smoke` passes.

---

## Handoff notes for execution

- Start with the tests for the mobile bug first; the viewport heuristics are the highest-risk part.
- Keep public behavior simple and avoid new abstraction unless repeated logic truly requires extraction.
- Respect the repo’s existing event-driven architecture.
- Preserve reduced-motion behavior when adjusting welcome and level-select animations.
- Prefer the existing npm workflows over any stale workspace tasks.
