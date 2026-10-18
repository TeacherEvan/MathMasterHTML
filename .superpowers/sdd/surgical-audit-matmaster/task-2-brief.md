# Task 2 Brief — P0: Service Worker Precache Verification + Atomic Install Guard

**Source plan:** docs/plans/SurgicalAudit Matmaster.txt (Step 5, Prompt 2)
**BASE commit:** 85310dc (Task 1 head)

## Context / Where this fits
Phase 1, Task 2 of the surgical remediation plan. Addresses P0 finding #1: Service Worker precache atomic failure. The SW installs 196+ unbundled JS/CSS assets with static filenames. If any single URL in `cache.addAll()` mismatches case or points to a missing file, the entire SW installation rejects atomically, leaving users without offline support. Lines 1 and 5 lock components were already fixed (Task 1), but no static verification exists to catch future regressions.

## Requirements (verbatim from Prompt 2)
1. In `service-worker.js` and `src/tools/scripts/verify/checks/critical-files.js`, add a static verification test that parses the precache asset array in `service-worker.js` and verifies that every listed URL resolves to an existing file on disk with exact case-sensitive path matching.
2. In `service-worker.js`, replace raw monolithic `cache.addAll(PRECACHE_URLS)` with a resilient batch installer that logs and retries individual failed non-critical assets (like screenshots) without aborting activation of core gameplay scripts.

## Known current state (verified)
- `STATIC_ASSETS` array at `service-worker.js` lines 41-124 (~84 entries, some with `?v=${BUILD_VERSION}`)
- `getInstallAssets()` at lines 192-201 combines STATIC_ASSETS + ACTIVE_RUNTIME_PAGES + DYNAMIC_GAME_MODULES + discovered assets from active runtime pages
- Install event at lines 206-234 ALREADY uses `Promise.allSettled` with individual `cache.add()` calls (NOT `cache.addAll`) — so individual failures don't abort the whole install
- Current failure handling: logs `failed.length` assets but does NOT retry them
- `normalizeCacheAssetPath()` at lines 137-153 strips `?v=` query params and normalizes paths
- Task 1 added `checkLockComponentFilenamesLowercase` to critical-files.js (pattern to follow for new check)

## Report contract
Write full implementation report to `.superpowers/sdd/surgical-audit-matmaster/task-2-report.md`.
Return: status, commits, one-line test summary, concerns.

## Global constraints (binding)
- The static verification must check EVERY URL in STATIC_ASSETS against the filesystem with exact case-sensitive matching
- Missing/mismatched URLs must be reported as failures (not just warnings)
- The resilient batch installer must not abort SW activation if non-critical assets (screenshots, etc.) fail to cache
- Core gameplay scripts must still be cached reliably
- Do not remove existing `Promise.allSettled` pattern — enhance it with retry logic
- Tests must pass after changes (`npm run verify`, `node --check` on modified JS)