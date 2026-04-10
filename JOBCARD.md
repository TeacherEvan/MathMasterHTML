# JOBCARD

## Latest update (2026-04-10)

- Completed the Android WebView Panel C recovery pass on `feature/android-webview-panel-c-recovery`, fixing compact/mobile misclassification when Android WebView-like touch runtimes report desktop-like pointer media queries.
- Added focused Chromium regression coverage in `tests/game-portrait-device-contract.spec.js` and `tests/symbol-rain.mobile.spec.js` to model a WebView-like Android UA, touch input, a wider embedded viewport, and a lying coarse-pointer media query.
- Kept the runtime fix scoped to `src/scripts/display-manager.js`, where compact viewport ownership already lives, so Panel C symbol rain continues consuming the shared display contract instead of adding its own platform heuristics.
- Documented the boundary in `Docs/SystemDocs/ARCHITECTURE.md` so future mobile/runtime work keeps Android WebView fallback logic inside the display manager.
- Revalidated the focused WebView contracts (`2 passed`), the broader mobile gameplay lane (`30 passed`, `9 skipped`), plus `npm run verify` and `npm run typecheck` after the milestone work.

## Previous update (2026-04-10)

- Completed the settings and deferred-update execution pass on `feature/settings-cache-implementation`, adding a production settings surface for display quality, language, sound mute, reduced motion, and cache recovery on level select.
- Added the versioned `window.UserSettings` runtime, early locale boot wiring, persisted quality/audio integration, and build-version/update signaling so stale deployments surface a deferred refresh flow instead of interrupting active gameplay.
- Hardened the Math Master service-worker lifecycle with build-scoped caches, app-only cleanup, and a safe `Refresh now` / `Clear cache` recovery path outside gameplay.
- Expanded automated coverage with new settings, localization, and service-worker update specs, and stabilized the optional competition smoke manager flow so mobile projects wait on the shared gameplay-ready contract.
- Revalidated `npm run verify`, `npm run typecheck`, the targeted settings/update Playwright lane, and `npm run test:competition:smoke` after the milestone work.

## Latest update (2026-04-09)

- Completed the mobile recovery execution pass on `feature/panel-c-mobile-rain-fix`, covering level-select CTA clarity, Panel C diagnosis, Evan startup messaging, and compact-mobile control anchoring.
- Tightened the focused Playwright coverage with new characterization contracts in `tests/level-select-polish.spec.js`, `tests/symbol-rain.mobile.spec.js`, `tests/evan-helper.flow.spec.js`, `tests/evan-helper.controls.spec.js`, `tests/ui-boundary.spec.js`, and `tests/drum-progressive.spec.js`.
- Confirmed the user-reported Panel C rain issue is not a simple absence bug in focused mobile runtime lanes; the stronger repro was startup/input-lock perception during Evan auto-help and compact-control CSS drift.
- Verified the progressive drum system is already wired in live gameplay: the new runtime audit advances drum complexity after real in-game line progress, so no drum runtime code changes were required.
- Revalidated the focused drum lane (`12 passed`), the focused mobile gameplay/Evan lane (`21 passed`), plus `npm run verify` and `npm run typecheck` after the milestone work.

## Latest update (2026-04-06)

- Completed the mobile gameplay / welcome / level-select review-response pass on `main` and kept the implementation aligned with the shared compact/mobile contract.
- Hardened the focused Playwright UI lane by expanding `tests/level-select-polish.spec.js`, adding `tests/level-select-interactions.spec.js`, and adding `tests/welcome-page-motion.spec.js`.
- Replaced synthetic welcome-page click dispatch in `tests/welcome-page-redesign.spec.js` with real browser click paths and stabilized the scoreboard/local-navigation assertions across slower/mobile projects.
- Revalidated the review-response suite (`65 passed`), `npm run verify`, and `npm run test:competition:smoke` after the changes.
- Refreshed `README.md` and `.github/copilot-instructions.md` so the living docs reflect the current focused validation lane and the `src/pages/` runtime-entrypoint reality.

## Previous update (2026-03-31)

- Completed a documentation spring clean on `main` using an isolated worktree so an existing staged feature-branch test change stayed untouched.
- Consolidated the repo down to a smaller living doc set centered on `README.md`, the `Docs/SystemDocs/*` core guides, the worm guides, the competition docs, and `JOBCARD.md`.
- Merged deployment notes into `README.md` and replaced report sprawl with `Docs/SystemDocs/REFACTORING_HISTORY.md`.
- Removed redundant audit reports, stale plans, duplicate summaries, and snapshot Markdown that no longer needed to live beside the code.
- Refreshed the surviving docs so they match the current runtime reality (`src/pages/`, `src/scripts/`, `pointerdown` interactions, Panel B worm spawning, muffin rewards, performance tooling, and local profile storage).

## Previous notable update (2026-03-22)

- Investigated the failed local Playwright HTML report and found the visible `webkit` failures were not reproducing as current app assertion failures once the app server was reliably available.
- Hardened Playwright startup by changing `package.json` `start` from `npx http-server -p 8000 -c-1 --cors` to `http-server -p 8000 -c-1 --cors`.
- Revalidated the affected lane with `npx playwright test tests/gameplay-features.spec.js --project=webkit` (22/22 passed).
- Re-ran `npm run verify` successfully after the startup-script change.
- Committed and pushed the startup fix on `main` as `f69fa01` (`Harden Playwright web server startup`).

## Earlier planning checkpoint (2026-03-09)

- Strengthened the Phase 1 competition roadmap in `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`.
- Added the execution matrix in `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`.
- Corrected tooling drift so repo tasks and docs match the actual Node/Playwright workflow.
- Revalidated competition smoke coverage and documented remaining cross-browser/platform blockers separately from gameplay work.

## Current durable truths

- This repo uses `npm` scripts for local run/test/verify workflows.
- Playwright is the active browser QA stack.
- Event-driven architecture remains the integration rule across runtime modules.
- Root HTML files remain redirect entrypoints; active runtime pages live under `src/pages/`.
- Panel A and B font sizing still belongs in `src/scripts/display-manager.js`, not CSS overrides.
