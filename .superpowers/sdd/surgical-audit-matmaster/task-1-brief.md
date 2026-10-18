# Task 1 Brief — P0: Normalize Case-Sensitive Lock Component Paths

**Source plan:** docs/plans/SurgicalAudit Matmaster.txt (Step 5, Prompt 1)
**BASE commit:** 88040f4575834af3c2667bf4a0cb450237036d3c

## Context / Where this fits
This is Phase 1, Task 1 of the surgical remediation plan. It addresses P0 finding #3 in the audit: case-sensitive lock component paths (Line-1-transformer.html / Line-5-transformer.html with uppercase L) will return HTTP 404 on Linux/Vercel because the deployment filesystem is case-sensitive while local macOS/Windows are case-insensitive. Lines 2, 3, 4, 6 use lowercase `line-*-transformer` and work correctly.

## Requirements (verbatim from Prompt 1)
1. Using `git mv -f`, rename `src/assets/components/lock-components/Line-1-transformer.html` → `line-1-transformer.html` and `Line-5-transformer.html` → `line-5-transformer.html`.
2. Rename all 7 `Line-1-transformer*.css` files and all 4 `Line-5-transformer*.css` files in `src/styles/css/lock-components/` to lowercase `line-1-transformer*.css` and `line-5-transformer*.css`.
3. Update all internal `@import` rules inside those renamed CSS files to reference the lowercase filenames.
4. Update all path references to capitalized `Line-1-transformer` / `Line-5-transformer` in:
   - `src/scripts/lock-manager.loader.js`
   - `src/scripts/lock-manager.templates.js`
   - `src/scripts/game-init.js` (verified to contain references at lines 29, 33, 39)
   - `src/scripts/lazy-component-loader.js` (verified to contain references at lines 117, 123, 127, 163, 167)
   - `service-worker.js` (check STATIC_ASSETS array)
   - `tests/lock-components.spec.js`
5. Add a check in `src/tools/scripts/verify/checks/critical-files.js` asserting that every file in `src/assets/components/lock-components/` and `src/styles/css/lock-components/` uses strictly lowercase filenames.

## Known current state (verified)
- Capitalized HTML files: `Line-1-transformer.html`, `Line-5-transformer.html`
- Capitalized CSS files: `Line-1-transformer.controls.css`, `Line-1-transformer.core.css`, `Line-1-transformer.css`, `Line-1-transformer.keyframes.css`, `Line-1-transformer.levels.css`, `Line-1-transformer.mechanics.details.css`, `Line-1-transformer.mechanics.motion.css` (7 files)
- Capitalized CSS files: `Line-5-transformer.animations.css`, `Line-5-transformer.core.css`, `Line-5-transformer.css`, `Line-5-transformer.structure.css` (4 files)
- References found in: game-init.js, lazy-component-loader.js, lock-manager.loader.js
- game.html only imports redirect-entrypoint.js (no direct lock component references)
- service-worker.js STATIC_ASSETS does not appear to list lock component HTML/CSS files directly

## Report contract
Write full implementation report to `.superpowers/sdd/surgical-audit-matmaster/task-1-report.md`.
Return: status, commits, one-line test summary, concerns.

## Global constraints (binding)
- All file renames must use `git mv -f` (preserve git history)
- All internal @import URLs in CSS must match the new lowercase filenames exactly
- All JS path strings referencing lock components must use lowercase filenames
- The lowercase `line-2..6-transformer` files must NOT be renamed (they are already correct)
- Do not change any other file casing or content beyond what Prompt 1 requires
- Tests must pass after changes