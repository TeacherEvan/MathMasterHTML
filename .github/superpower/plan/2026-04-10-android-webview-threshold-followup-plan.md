# Plan: Android WebView Threshold Follow-up
**Date:** 2026-04-10
**Source Review:** Android WebView Panel C review follow-up
**Status:** Approved for execution

## Goal
Narrow the Android WebView compact fallback so it still fixes phone WebViews with lying pointer media queries without overmatching larger Android WebView surfaces.

## Architecture
Keep the fix inside `src/scripts/display-manager.js`, preserve Panel C's dependency on the shared compact contract, and add a negative regression test for a tablet-style Android WebView surface.

## Validation Rules
- Write the failing characterization test first.
- Apply the smallest threshold fix in `display-manager.js`.
- Re-run the focused Playwright lane.
- Finish with `npm run verify` and `npm run typecheck`.

## Tasks

### Task 0 [S] Baseline current merged behavior
Files: none.

Run:
```bash
npx playwright test tests/game-portrait-device-contract.spec.js --project=chromium --grep "Android WebView-like|tablet" --reporter=line
```

Expected:
- Existing Android WebView phone contract is green.

### Task 1 [M] Add a failing Android tablet-style WebView contract
Files:
- `tests/game-portrait-device-contract.spec.js`

Add a Chromium-only test for an Android WebView-like touch runtime with a tablet-style viewport such as `800 x 900` and a lying coarse-pointer media query. The expected behavior is `viewport-standard` and resolution `720p`, not compact/mobile.

Expected result after only writing the test:
- The new tablet-style WebView contract fails against the current fallback.

### Task 2 [XS] Run the new contract red
Files:
- `tests/game-portrait-device-contract.spec.js`

Run:
```bash
npx playwright test tests/game-portrait-device-contract.spec.js --project=chromium --grep "tablet-style Android WebView" --reporter=line
```

Expected:
- Failing test proving the fallback overmatches.

### Task 3 [M] Tighten the fallback threshold in display-manager
Files:
- `src/scripts/display-manager.js`

Implementation rule:
- Keep the Android phone WebView fix intact.
- Narrow the fallback to the existing compact-height logic rather than the broader landscape-width height cap.

Execution note:
- Runtime inspection showed the original Android phone WebView contract renders at `980 x 735`, so a pure compact-height cap would regress the phone fix. Tighten the phone-like Android WebView hint to exclude tablet-class Android UAs, then cover the remaining gap with an explicit landscape tablet-style regression.

Expected:
- Android phone-like WebView still classifies as compact.
- Tablet-style Android WebView remains standard.

### Task 4 [S] Run focused contracts green
Files:
- `tests/game-portrait-device-contract.spec.js`
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --grep "Android WebView-like|tablet-style Android WebView|WebView-like runtime" --reporter=line
```

Expected:
- Phone WebView and tablet-style WebView contracts pass.
- Panel C WebView contract still passes.

### Task 5 [S] Finish validation
Files:
- `src/scripts/display-manager.js`
- `tests/game-portrait-device-contract.spec.js`

Run:
```bash
npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --project=chromium --reporter=line
npm run verify
npm run typecheck
```

Expected:
- The broader mobile lane remains green.
- Verify and typecheck pass.