# Desktop drag-reveal bug design

## Goal

Prevent desktop players from revealing answer text by clicking and dragging across the gameplay surface, while preserving the intended click-to-reveal flow and all existing button / console / worm interactions.

## Diagnosis

The bug is not in the symbol click logic itself. The likely leak is native browser text selection inside the gameplay panels:

- `src/scripts/game-problem-manager.js` renders problem and solution content as plain text spans inside `#problem-container` and `#solution-container`.
- `src/styles/css/game.css` only disables selection on `.falling-symbol`, not on the problem/solution surfaces.
- `src/scripts/symbol-rain.interactions.js` uses `pointerdown` for symbol clicks, so the rain click path is already explicit and should remain untouched.

That means drag-to-select on desktop can highlight hidden solution text and make the answer visible.

## Proposed fix

Use a layered defense, scoped to gameplay panels only:

1. **CSS selection lock**
   - Update `src/styles/css/game.css` so the gameplay surfaces are non-selectable:
     - `#panel-a`
     - `#panel-b`
     - `#panel-c`
     - `#problem-container`
     - `#solution-container`
     - `#symbol-rain-container`
   - Use `user-select: none` plus vendor-prefixed equivalents for cross-browser desktop coverage.
   - Keep the controls themselves functional; the lock should stop selection, not clicks.

2. **Small JS guard**
   - Add a lightweight selection shield that cancels `selectstart` and `dragstart` within the gameplay panels on desktop.
   - Keep `pointerdown` / `click` behavior intact so symbol reveals, console actions, and worm interactions still work normally.
   - Preferred placement: a small new `src/scripts/game-selection-guard.js` loaded from `src/scripts/game.js`.
   - Acceptable fallback: place the guard directly in `src/scripts/game-init.js` if minimizing file churn is more important than a clean split.

3. **Regression test**
   - Extend `tests/gameplay-features.spec.js` with a desktop drag regression.
   - The test should:
     - start the game and wait for hidden symbols to exist
     - drag the mouse across `#panel-a`, `#panel-b`, and `#panel-c`
     - assert `window.getSelection().toString()` is empty and `rangeCount === 0`
     - assert `window.scrollY` and `#solution-container.scrollTop` do not change
     - assert `.hidden-symbol` / `.revealed-symbol` counts do not change from the drag alone
     - then perform one explicit click on a falling symbol and verify exactly one reveal still happens

## File targets

- `src/styles/css/game.css` — add the gameplay selection lock styles.
- `src/scripts/game.js` — only if the guard is split into a new module and needs to be loaded.
- `src/scripts/game-init.js` — fallback location for the selection guard if we keep it in one file.
- `src/scripts/game-selection-guard.js` — preferred small module for the selection shield.
- `tests/gameplay-features.spec.js` — add the drag-to-reveal regression.

## Validation

- Run the new Playwright regression on desktop browsers.
- Confirm that normal clicks still reveal symbols.
- Confirm no mobile behavior changes.
- Confirm no regression in the console, power-up, or worm interactions.

## Non-goals

- Do not change the symbol-reveal game rules.
- Do not modify the worm or console click behavior.
- Do not broaden the fix to the full site unless the bug reproduces outside gameplay panels.
