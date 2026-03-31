# JOBCARD

## Latest update (2026-03-31)

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
- Panel A and B font sizing still belongs in `src/scripts/display-manager.js`, not CSS overrides.
