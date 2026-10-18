# Task 2 Report — P0: Service Worker Precache Verification + Atomic Install Guard

**Repo:** MathMasterHTML
**Base commit:** 85310dc (Task 1 head)
**Prompt:** docs/plans/SurgicalAudit Matmaster.txt, Step 5, Prompt 2
**Status:** DONE

## Summary of changes

### 1. `src/tools/scripts/verify/checks/critical-files.js`
- Added `checkServiceWorkerPrecacheAssets(rootDir)` (follows the `checkLockComponentFilenamesLowercase` pattern from Task 1).
- Statically parses the `STATIC_ASSETS` array in `service-worker.js` (regex over the array body; substitutes `${BUILD_VERSION}` = `20260501-symbol-rain-lifecycle-2`, strips `?v=` query strings, normalizes leading `/`).
- Verifies every one of the 82 array entries / 75 unique paths resolves to an existing file on disk via `existsSync` (case-sensitive on Linux), with case-mismatch vs. missing distinction in failure reporting.
- Missing/mismatched URLs are reported as failures (`allPassed = false`), not warnings — a single bad URL in a monolithic `cache.addAll()` atomically rejects SW installation.

### 2. `src/tools/scripts/verify/verify.checks.js`
- Re-exported `checkServiceWorkerPrecacheAssets` from `./checks/critical-files.js`.

### 3. `src/tools/scripts/verify.js`
- Imported `checkServiceWorkerPrecacheAssets`.
- Wired it into the results object as `serviceWorkerPrecacheAssets: checkServiceWorkerPrecacheAssets(ROOT)` so it runs under `npm run verify` and counts toward pass/fail.

### 4. `service-worker.js`
- Added install-retry tuning constants (`INSTALL_RETRY_DELAY_MS = 300`, `CRITICAL_INSTALL_RETRIES = 2`, `NON_CRITICAL_INSTALL_RETRIES = 1`).
- Added `CRITICAL_INSTALL_ASSETS` set: `ACTIVE_RUNTIME_PAGES` + `DYNAMIC_GAME_MODULES` + core gameplay scripts (`game.js`, `worm.js`, `constants.js`, `utils.js`).
- Added `sleep()`, `cacheAssetWithRetry(cache, assetPath, maxRetries)` (never throws; returns `{assetPath, success, attempts, error?}`), and `isCriticalInstallAsset()`.
- Install event now maps each asset through `cacheAssetWithRetry` (2 retries for critical, 1 for non-critical) inside the existing `Promise.allSettled` batch — pattern retained, not replaced.
- Results split into critical vs. non-critical failures: critical failures logged as `console.error`, non-critical (screenshots, secondary stylesheets) as `console.warn` with "(install continues)". Install never aborts activation; `caches.open`/unexpected errors still caught and logged.

## Verification results

- `node --check` on `service-worker.js`, `critical-files.js`, `verify.js`, `verify.checks.js`: all OK.
- `npm run verify`: **EXIT=0, ALL CHECKS PASSED (8/8)** — including the new "SERVICE WORKER PRECACHE ASSETS CHECK" (✅ All 82 STATIC_ASSETS entries resolve to existing files).
- Playwright E2E tests: NOT run (browser required, per task constraints).

## Commit

- Commit: pending — working tree contains Task 2 changes in 4 files plus pre-existing unrelated modifications (see Concerns).
- Intended commit files: `service-worker.js`, `src/tools/scripts/verify.js`, `src/tools/scripts/verify/checks/critical-files.js`, `src/tools/scripts/verify/verify.checks.js`.

## Concerns

- The working tree already contained uncommitted, unrelated modifications before Task 2 began (not made in this session): `Plan Alpha.md`, `Plan Beta.md`, `Plan Genesis.md` (doc cross-reference section added), `README.md` (doc index links), `src/tools/scripts/verify/verify.constants.js` (`docs/index.md` + `docs/project-plan.md` added to `REQUIRED_DOCS`), and `src/tools/scripts/verify/checks/documentation.js` (+1 line). These appear to be Task 1/session setup artifacts left uncommitted on top of 85310dc. I left them untouched and uncommitted; `npm run verify` passes 8/8 with them present.
- If a Task 2 commit is required, commit only the 4 Task 2 files listed above to avoid bundling unrelated changes; the pre-existing modifications will remain in the working tree.
- `checkServiceWorkerPrecacheAssets` hardcodes `BUILD_VERSION = "20260501-symbol-rain-lifecycle-2"` to resolve `?v=${BUILD_VERSION}` entries; it must be kept in sync with `service-worker.js` if the build version changes.
- Retry delay/counts are heuristic (300ms backoff, 2 retries critical / 1 non-critical); tune if flaky network install failures are observed in the wild.