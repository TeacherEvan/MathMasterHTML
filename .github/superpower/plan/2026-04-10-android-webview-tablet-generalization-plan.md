# Plan: Android WebView Tablet Generalization
**Date:** 2026-04-10
**Source Review:** Post-merge follow-up review on Android WebView tablet exclusion
**Status:** Approved for execution

## Goal
Replace the brittle closed tablet-model exclusion with a broader Android tablet-like heuristic that still preserves the verified phone WebView compact fallback.

## Architecture
Keep the change inside `src/scripts/display-manager.js`, preserve the existing phone WebView compact contract, and add a regression for an unlisted tablet-style Android WebView UA so coverage no longer depends only on known model tokens.

## Validation Rules
- Keep the original Android phone WebView contract green.
- Add a regression for an Android tablet-like WebView UA that does not match the current model list.
- Re-run focused WebView contracts, then broader mobile validation, then `npm run verify` and `npm run typecheck`.

## Tasks

### Task 1 [M] Generalize the tablet-like Android WebView hint
Files:
- `src/scripts/display-manager.js`

Implementation rule:
- Preserve known tablet model tokens as explicit hints.
- Add a broader tablet-like runtime heuristic derived from runtime dimensions and density so unlisted tablet WebViews are excluded from the phone-like compact fallback.
- Preserve the existing Android phone WebView compact contract.

### Task 2 [M] Add an unlisted tablet-style Android WebView regression
Files:
- `tests/game-portrait-device-contract.spec.js`

Add a Chromium-only regression using a tablet-sized Android WebView UA that contains neither `Tablet` nor a known model token from the current exclusion list. The expected behavior is `720p` with `viewport-standard`.

### Task 3 [S] Run focused contracts green
Files:
- `tests/game-portrait-device-contract.spec.js`
- `tests/symbol-rain.mobile.spec.js`

Run:
```bash
npx playwright test tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --grep "Android WebView-like|tablet-style Android WebView|unlisted tablet-style Android WebView|WebView-like runtime" --reporter=line
```

### Task 4 [S] Run broader verification
Files:
- `src/scripts/display-manager.js`
- `tests/game-portrait-device-contract.spec.js`

Run:
```bash
npx playwright test tests/game-mobile-layout.spec.js tests/game-mobile-layout.ultranarrow.spec.js tests/game-portrait-device-contract.spec.js tests/symbol-rain.mobile.spec.js --project=pixel-7 --project=iphone-13 --project=chromium --reporter=line
npm run verify
npm run typecheck
```