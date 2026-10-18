# Task 1 Report — P0: Normalize Case-Sensitive Lock Component Paths

**Status:** DONE  
**Commit:** `85310dc` (on `main`, based on `88040f4575834af3c2667bf4a0cb450237036d3c`)

## Summary

Renamed the two capitalized lock-component HTML files and all 11 capitalized CSS files to lowercase via `git mv -f` (history preserved), then normalized every internal path reference to lowercase and added a filename-case verification check.

## 1. Renames (`git mv -f`)

`src/assets/components/lock-components/`:
- `Line-1-transformer.html` → `line-1-transformer.html`
- `Line-5-transformer.html` → `line-5-transformer.html`

`src/styles/css/lock-components/` (7 Line-1):
- `Line-1-transformer.controls.css`, `.core.css`, `.css`, `.keyframes.css`, `.levels.css`, `.mechanics.details.css`, `.mechanics.motion.css` → `line-1-transformer*` equivalents

`src/styles/css/lock-components/` (4 Line-5):
- `Line-5-transformer.animations.css`, `.core.css`, `.css`, `.structure.css` → `line-5-transformer*` equivalents

The lowercase `line-2..6-transformer` files were left untouched.

## 2. Internal `@import` updates (CSS hub files)

- `line-1-transformer.css`: 6 `@import url(...)` rules updated to `line-1-transformer.{core,levels,mechanics.motion,mechanics.details,keyframes,controls}.css`
- `line-5-transformer.css`: 3 `@import url(...)` rules updated to `line-5-transformer.{core,structure,animations}.css`
- All 9 referenced child sheets exist under their new lowercase names (verified).

## 3. Path references updated in JS/HTML

- `line-1-transformer.html` / `line-5-transformer.html`: `<link rel="stylesheet" href>` updated to lowercase CSS path (1 each)
- `src/scripts/lock-manager.loader.js`: `ALLOWED_LOCK_COMPONENTS` set entries (lines 11, 15) + `normalizeComponentName` returns (lines 161, 162)
- `src/scripts/game-init.js`: `allowedLockComponents` entries (lines 29, 33) + `defaultLockComponent` (line 39)
- `src/scripts/lazy-component-loader.js`: `filenameMap` entries (lines 123, 127) + `getAllLockComponentPaths` entries (lines 163, 167)

Verified with zero remaining matches: `src/scripts/lock-manager.templates.js`, `tests/lock-components.spec.js`, `service-worker.js` (STATIC_ASSETS lists no lock files; `LAZY_CACHE_PATTERNS` regex at line 129 is case-agnostic), `src/pages/game.html` (does not exist; game.html imports only redirect-entrypoint.js). No capitalized `Line-[15]-transformer` references remain anywhere under `src/`.

## 4. New verify check

`src/tools/scripts/verify/checks/critical-files.js`:
- Added `checkLockComponentFilenamesLowercase(rootDir)` — recursively asserts every file in `src/assets/components/lock-components/` and `src/styles/css/lock-components/` has a strictly lowercase filename (no `[A-Z]`).
- Wired into `verify/verify.checks.js` and `verify.js` results so it runs under `npm run verify`.

## Verification performed

- `git status`: only the 15 renames + 6 modified files changed; `.superpowers/` and `docs/plans/SurgicalAudit Matmaster.txt` remain pre-existing untracked (not part of this task, left untouched).
- `node --check`: passes for `lock-manager.loader.js`, `game-init.js`, `lazy-component-loader.js`, `verify.js`, `critical-files.js`, `verify.checks.js`.
- `npm run verify`: new check reports `✅ lock Component Filenames Lowercase`; ESLint, tooling tests, package.json, manifest screenshots, critical files all pass. The only failing check is the pre-existing `documentation` check, which flags `.superpowers/sdd/surgical-audit-matmaster/{progress.md,task-1-brief.md}` as unexpected markdown — pre-existing and out of scope for this task (not caused by this change).
- Playwright E2E tests were NOT run (require a browser), per constraints.

## Concerns

None blocking. The pre-existing `documentation` verify failure (`.superpowers/sdd/` markdown files) is unrelated to this change and was failing before Task 1 began; no action taken to avoid modifying files outside Prompt 1 scope.