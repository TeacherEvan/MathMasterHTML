# JOBCARD (2026-03-09)

## Completed today

- Reviewed and strengthened the Phase 1 competition roadmap in `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md`.
- Added a concrete execution plan in `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md`.
- Documented repo reality issues that must be resolved before deeper implementation:
  - duplicate `devDependencies` keys in `package.json` were identified and corrected
  - workspace task drift (`mvn` tasks do not match this Node/Playwright repo)
  - documentation drift between legacy `js/...` paths and current `src/scripts/...` structure
- Updated `.github/copilot-instructions.md` to reflect the real toolchain and current repository conventions.

## Current planning status

- Phase 1 roadmap exists and is now paired with a file-by-file execution matrix.
- Netcode remains behind a decision gate: do not build synchronized multiplayer unless the competition brief explicitly requires it.
- Highest-priority implementation order is now:
  1. tooling truth pass
  2. deterministic QA lane setup
  3. startup/event contract hardening
  4. loading-state resilience
  5. UX/accessibility P0 work

## Verified context

- This repo uses `npm` scripts for local run/test/verify workflows.
- Playwright is the active browser QA stack.
- Full `npm test` is still known to have pre-existing Playwright/ESM issues from earlier work; roadmap now treats QA cleanup as an explicit prerequisite.

## Recommended next implementation tasks

- Fix tooling truth first:
  - normalize `package.json`
  - replace stale Maven workspace tasks with Node/Playwright equivalents
  - align docs with `src/scripts/...` paths
- Add the competition Playwright profile and deterministic fixtures.
- Inventory event contracts before changing gameplay internals.

## Notes carried forward

- Keep event-driven architecture intact: no direct module-to-module calls.
- Do not change Panel A/B font sizing in CSS; use the display manager path.
- Be careful with worm visual stylesheet edits due to historical corruption risk.
