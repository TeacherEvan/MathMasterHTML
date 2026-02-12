# JOBCARD (2026-02-12)

- Enforced 200-line policy tooling: `line-limit-check.js` + integrated into `npm run verify` (baseline: no new violations).
- Refactored verifier into modules under `src/tools/scripts/verify/`.
- Refreshed audit artifacts: `Docs/LINE_LIMIT_200_AUDIT.policy.{summary,all,violations}.*`.
- Updated game mechanics: score cap `1000 → 10000`, timer `60s → 600s`, synchronized linear countdowns (score hits 0 when time hits 0).
- Updated HUD defaults + constants: `src/pages/game.html`, `src/scripts/constants.part.system.js`, `src/scripts/score-timer-manager.js`.
- Window B fix: added `.panel-b-controls`, reserved top safe-zone, removed absolute CLARIFY positioning (prevents HELP overlapping powerups display).

Notes: `npm run verify` passes; focused `tests/timer.spec.js` passes.
Notes: full `npm test` still fails due to pre-existing Playwright/ESM import-export issues (e.g., `describe` / `WormEvasion`).
Recs: move `power-up-display` inline CSS (in `worm-system.powerups.js`) into stylesheet; consider docking/clamping to avoid user-drag overlaps.
Recs: fix Playwright suite module export errors so full CI runs clean.
