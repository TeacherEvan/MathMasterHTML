# JOBCARD

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
