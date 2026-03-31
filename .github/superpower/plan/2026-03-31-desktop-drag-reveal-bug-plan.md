# Math Master HTML — Desktop Drag-Reveal Guard Plan

**Source design:** `.github/superpower/brainstorm/2026-03-31-desktop-drag-reveal-bug-design.md`  
**Date:** 2026-03-31  
**Status:** Ready for execution  
**Scope:** Gameplay panels only (`#panel-a`, `#panel-b`, `#panel-c`)  
**Target plan file:** `.github/superpower/plan/2026-03-31-desktop-drag-reveal-bug-plan.md`

---

## Goal

Prevent desktop drag-selection from exposing hidden answer text in the gameplay area, while preserving the intended click-to-reveal flow and all existing console, worm, and modal interactions.

## Root cause

The leak is browser-native selection behavior, not the symbol click path:

- `src/scripts/game-problem-manager.js` renders problem and solution text as plain DOM content inside selectable containers.
- `src/styles/css/game.css` only disables selection on `.falling-symbol`, so the text surfaces in `#problem-container` and `#solution-container` remain selectable.
- `src/scripts/symbol-rain.interactions.js` already uses explicit `pointerdown` for falling symbols, so that path should stay untouched.

In short: the text is still selectable in the gameplay panels, and dragging across those panels can surface hidden answers.

## Existing surfaces that matter

| Surface                   | Location                                  | Why it matters                                                                  |
| ------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------- |
| Gameplay panels           | `src/pages/game.html`                     | Defines the exact DOM regions the fix must stay scoped to                       |
| Base panel styling        | `src/styles/css/game.css`                 | Current selection lock only covers falling symbols, not the panel text surfaces |
| Game module loader        | `src/scripts/game.js`                     | Best place to load the new guard without adding another HTML script tag         |
| Symbol click path         | `src/scripts/symbol-rain.interactions.js` | Already uses `pointerdown`; do not alter it                                     |
| Gameplay regression suite | `tests/gameplay-features.spec.js`         | Existing E2E home for the new desktop drag regression                           |

## Non-goals

- Do not change symbol reveal rules or class semantics.
- Do not modify worm, console, power-up, or modal event flows.
- Do not broaden the lock beyond gameplay panels.
- Do not touch `src/scripts/symbol-rain.interactions.js` unless a hidden regression proves the guard needs a rollback.

---

## Milestone 1 — Capture the bug as a regression first

### Task 1.1 — Add a desktop-only drag-selection regression

**File:** `tests/gameplay-features.spec.js`

**What to change:**

- Add a new desktop-only `describe`/`test` block for the drag-reveal bug.
- Reuse the existing `startGame(page)` helper so the test follows the same startup path as the other gameplay checks.
- Before dragging, clear any pre-existing browser selection and capture a baseline:
  - `window.getSelection().toString()`
  - `window.getSelection().rangeCount`
  - `window.scrollY`
  - `#solution-container.scrollTop`
  - `.hidden-symbol` count
  - `.revealed-symbol` count
- Use `page.mouse` plus `locator.boundingBox()` to drag through the content areas of:
  - `#problem-container`
  - `#solution-container`
  - `#symbol-rain-container`
- Assert that the drag alone does **not** change any of those baseline values.
- Then perform one normal click on `#help-button` and assert the revealed-symbol count increases by exactly 1.
- Mark the test desktop-only so it skips the mobile projects (`iphone-13`, `pixel-7`) while still running on the shared spec file.

**Validation:**

```bash
npx playwright test tests/gameplay-features.spec.js --project=chromium --grep "Desktop Drag-Reveal Guard"
```

**Expected result:**

- The test should fail on the current codebase, proving the bug is reproducible and the regression is real.
- The failure should point at selection or reveal state changing during the drag.

---

## Milestone 2 — Lock selection in CSS

### Task 2.1 — Add panel-scoped selection lock rules

**File:** `src/styles/css/game.css`

**What to change:**

- Add `user-select: none` with the standard vendor-prefixed equivalents to:
  - `#panel-a`
  - `#panel-b`
  - `#panel-c`
  - `#problem-container`
  - `#solution-container`
  - `#symbol-rain-container`
- Keep the rule scoped to gameplay panels only.
- Leave `.falling-symbol` alone except for its existing rule.
- Place the new rules near the existing panel layout section so later polish styles do not accidentally re-enable selection.

**Validation:**

```bash
npx playwright test tests/gameplay-features.spec.js --project=chromium --grep "Desktop Drag-Reveal Guard"
```

**Expected result:**

- Dragging across the gameplay panels should no longer create visible text selection in Chromium.
- `window.getSelection()` should remain empty after the drag.
- `window.scrollY` and `#solution-container.scrollTop` should not change.
- The normal `#help-button` click should still reveal exactly one symbol.

---

## Milestone 3 — Add the JS guard as defense in depth

### Task 3.1 — Create the selection guard module

**File:** `src/scripts/game-selection-guard.js`

**What to change:**

- Add a tiny, self-initializing, idempotent guard module.
- Register capture-phase listeners for:
  - `selectstart`
  - `dragstart`
- Scope the listeners to the gameplay panels only.
- If the event originates inside `#panel-a`, `#panel-b`, or `#panel-c`, call `preventDefault()` and stop there.
- Do **not** block `pointerdown`, `click`, or any other gameplay interaction.
- Do **not** attach the guard outside the gameplay panels.

**Validation:**

```bash
npm run verify && npm run typecheck
```

**Expected result:**

- Repo lint/verification should stay clean.
- The new JS file should not introduce any syntax or lint issues.
- Note: this repo’s typecheck scope does not cover every `src/scripts` file, so the Playwright regression remains the real proof of behavior.

---

### Task 3.2 — Load the guard from the game loader

**File:** `src/scripts/game.js`

**What to change:**

- Insert `/src/scripts/game-selection-guard.js` into the `gameModules` array immediately after `/src/scripts/game-init.js`.
- Keep the loading centralized in `game.js`; do not add a new script tag to `src/pages/game.html`.
- If the loader order ever becomes awkward, the fallback is to move the same tiny guard into `src/scripts/game-init.js`, but only as a rollback path.

**Validation:**

```bash
npm run verify && npm run typecheck
```

**Expected result:**

- The loader still initializes cleanly.
- No module-loading errors should appear in the browser console.
- The guard should be in place before gameplay interactions begin.

---

### Task 3.3 — Prove the layered defense on desktop browsers

**File(s):** `tests/gameplay-features.spec.js` plus the runtime files changed above

**What to change:**

- No new source changes if Tasks 3.1 and 3.2 already landed.
- Re-run the new regression across the desktop Playwright projects:
  - `chromium`
  - `firefox`
  - `webkit`

**Validation:**

```bash
npx playwright test tests/gameplay-features.spec.js --project=chromium --project=firefox --project=webkit --grep "Desktop Drag-Reveal Guard"
```

**Expected result:**

- PASS on all three desktop browsers.
- Dragging across the panels should produce:
  - no text selection
  - no scroll movement
  - no reveal from the drag itself
- A normal `#help-button` click should still reveal exactly one symbol.

---

## Risks, dependencies, and rollback notes

### Dependencies

- `src/pages/game.html` already defines the exact gameplay panel IDs used by the fix.
- `src/scripts/game.js` already owns the runtime module ordering, so it is the right place to load the guard.
- `playwright.config.js` already defines the desktop projects (`chromium`, `firefox`, `webkit`) and the mobile projects (`iphone-13`, `pixel-7`).
- The new regression should stay desktop-only so the shared spec file continues to pass in the mobile matrix.

### Risks

- Over-broad CSS selectors could accidentally disable selection in UI outside gameplay panels.
- A guard that listens too broadly could interfere with button clicks or drag-based UI in the console/modal surfaces.
- A Playwright drag path that starts in the wrong spot could miss the text-selection leak and produce a false sense of safety.

### Rollback notes

- If the JS guard causes any interaction regressions, remove `src/scripts/game-selection-guard.js` and its `game.js` loader entry first.
- If the bug is fixed cleanly by CSS alone, keep the CSS lock and retain the JS guard only if it remains harmless.
- If the module split becomes fragile, move the same tiny guard into `src/scripts/game-init.js` rather than expanding the scope into other gameplay modules.
- Do not “solve” the bug by disabling pointer events or changing the actual reveal logic.

---

## Final acceptance checklist

- Dragging across `#panel-a`, `#panel-b`, and `#panel-c` does not create selection text or visible highlight.
- `window.getSelection().toString()` stays empty and `rangeCount === 0` after the drag.
- `window.scrollY` and `#solution-container.scrollTop` remain unchanged after the drag.
- The drag itself does not change `.hidden-symbol` or `.revealed-symbol` counts.
- A normal `#help-button` click still reveals exactly one symbol.
- The desktop regression passes on `chromium`, `firefox`, and `webkit`.
- The full `tests/gameplay-features.spec.js` suite still passes, with the drag test skipped on mobile projects.
- `npm run verify` and `npm run typecheck` remain clean.
