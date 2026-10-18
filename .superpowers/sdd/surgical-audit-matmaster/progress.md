# SDD ledger — plan: docs/plans/SurgicalAudit Matmaster.txt

Plan source: Surgical Audit Report (commit 88040f4), remediation roadmap = Step 5, 9 prompts across 3 phases.
Repo verified: all P0/P1/P2 claims in the audit match the working tree (see verification notes below).

## Verification (completed 2026-10-18)
- Line-1-transformer.html + Line-5-transformer.html (capitalized) exist in src/assets/components/lock-components/; line-2..6 are lowercase.
- 7 Line-1-transformer*.css + 4 Line-5-transformer*.css capitalized CSS files exist.
- Gameplay3.jpg + Level select.jpg have PNG magic bytes (89 50 4E 47); byte-identical to .png counterparts.
- Worm: 49 standalone worm-*.js + 14 worm-system.*.js + 13 src/scripts/worm/**/*.js = 76 files across 3 layers.
- References to capitalized Line-1/Line-5 paths in game-init.js, lazy-component-loader.js, lock-manager.loader.js.
- No root life-stats.html redirect stub exists.
- .tmp/ exists with failed-summary.txt + probe scripts; patch_display.cjs, patch_rain.cjs, list-failures.cjs, list-failures.js at root.
- Dual ESLint configs (.eslintrc.json + eslint.config.js); cosmic-ui/ is an empty submodule.
- 18 CSS files contain @import rules (barrels).
- game.html, index.html, level-select.html are root redirect stubs; no life-stats.html stub.

## Tasks (from Step 5 roadmap)
Task 1: P0 — Normalize case-sensitive lock component paths (Prompt 1) — COMPLETE (commits 88040f4..85310dc, review clean)
Task 2: P0 — Service worker precache verification + atomic install guard (Prompt 2) — COMPLETE (commits 85310dc..4f13b3e, review clean)
Task 3: P0 — Reconcile 3-way worm subsystem duplication (Prompt 3) — COMPLETE (commits 4f13b3e..8c99e35, review clean)
Task 4: P1 — Fix disguised PNG .jpg assets + magic-byte header check (Prompt 4) — COMPLETE (commits 8c99e35..f4c176d, review clean)
Task 5: P1 — Eliminate 16 render-blocking CSS @import barrels (Prompt 5)
Task 3: P0 — Reconcile 3-way worm subsystem duplication (Prompt 3)
Task 4: P1 — Fix disguised PNG .jpg assets + magic-byte header check (Prompt 4)
Task 5: P1 — Eliminate 16 render-blocking CSS @import barrels (Prompt 5)
Task 6: P1 — Consolidate duplicate problem loader + legacy root lock files (Prompt 6)
Task 7: P1 — Deterministic async boot barrier in game-runtime-coordinator.js (Prompt 7)
Task 8: P1 — Close unit test gap (Prompt 8)
Task 9: P2 — Repository hygiene, root entrypoint parity, config dedup (Prompt 9)

## Ledger entries
Task <N>: complete (commits <base7>..<head7>, review clean)   — when done
Task <N>: fix round <R>/5 (<X> addressed, <Y> open — ...)   — during fix loop
Task <N>: parked — <finding> — Ruling: <why>   — at cap
Task <N>: Ruling: <finding> — <decision>   — preflight/breaker rulings
