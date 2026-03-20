# JOBCARD (2026-03-09)

## Completed today

- Verified the worm reward path by running the targeted muffin specs and the full competition lane on current main; no code changes were required for the muffin regression search.
- Reviewed and strengthened the Phase 1 competition roadmap in `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`.
- Added a concrete execution plan in `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`.
- Completed the first implementation slice of the tooling truth pass:
  - fixed `npm run typecheck` path drift in `tsconfig.typecheck.json`
  - added committed Node/Playwright workspace tasks to `workspace.code-workspace`
  - scaffolded competition Playwright commands in `package.json`
  - added a dedicated `playwright.competition.config.js` with smoke and matrix projects
  - added seed-aware logging in `tests/global-setup.js`
  - updated high-traffic docs to reflect `src/pages`, `src/scripts`, and `src/styles`
  - validated the refined competition smoke lane (`qa-smoke-chromium` + `qa-smoke-pixel-7`) with 24/24 passing tests
  - exercised the full competition matrix lane and captured current blockers: missing Playwright system deps for iPhone/WebKit plus pre-existing cross-browser gameplay/layout failures outside this tooling slice
- Documented repo reality issues that must be resolved before deeper implementation:
  - duplicate `devDependencies` keys in `package.json` were identified and corrected
  - workspace task drift (`mvn` tasks do not match this Node/Playwright repo)
  - documentation drift between legacy `js/...` paths and current `src/scripts/...` structure
- Updated `.github/copilot-instructions.md` to reflect the real toolchain and current repository conventions.
- Follow-up stabilization pass completed:
  - fixed Linux line-limit baseline matching by normalizing leading path separators in the scan pipeline
  - excluded generated `test-results.competition.json` from line-limit enforcement and refreshed the accepted baseline artifacts
  - cleared stale queued worm spawns during `killAllWorms()` / `reset()` to stabilize row-scaling gameplay tests
  - made the power-up display and HUD spacing more resilient on narrow/mobile viewports
  - stabilized `tests/ui-boundary.spec.js` and `tests/gameplay-features.spec.js` for Pixel/mobile and headless resize behavior
  - revalidated `npm run verify`, `npm run test:competition:smoke`, targeted Pixel UI/gameplay coverage, and targeted Chromium UI/gameplay coverage

## Current planning status

- Phase 1 roadmap exists and is now paired with a file-by-file execution matrix.
- Netcode remains behind a decision gate: do not build synchronized multiplayer unless the competition brief explicitly requires it.
- Highest-priority implementation order is now:
  1. tooling truth pass
  2. competition QA lane setup
  3. startup/event contract hardening
  4. loading-state resilience
  5. UX/accessibility P0 work

## Verified context

- This repo uses `npm` scripts for local run/test/verify workflows.
- Playwright is the active browser QA stack.
- The competition QA lane now has dedicated smoke and matrix commands in `package.json`.
- `npm run verify` now passes after fixing Linux baseline path normalization and refreshing the accepted line-limit audit artifacts.
- Full `npm test` is still known to have pre-existing Playwright/ESM issues from earlier work; roadmap now treats QA cleanup as an explicit prerequisite.
- Browser-system dependency installation for WebKit/iPhone profiles still requires a privileged `sudo npx playwright install-deps` step on this Linux machine.

## Recommended next implementation tasks

- Expand validation across the remaining competition smoke project(s) and the full matrix lane.
- Inventory canonical event contracts before changing gameplay internals.
- Harden startup ordering and loading resilience once the event contract inventory is complete.

## Notes carried forward

- Keep event-driven architecture intact: no direct module-to-module calls.
- Do not change Panel A/B font sizing in CSS; use the display manager path.
- Be careful with worm visual stylesheet edits due to historical corruption risk.
