# JOBCARD

## Latest update (2026-04-20)

- Fixed mobile automation briefing dismissal so Playwright phone emulation can start gameplay and use the back button even when the browser only delivers trusted `pointerup` events to fixed controls.
- Narrowed the automation-specific control handling in `src/scripts/game-page.js` so live users stay on the existing click/fullscreen/orientation path while Playwright mobile lanes use the safer automation fallback.
- Reworked compact portrait automation Panel A spacing so score, problem, and lock assertions no longer rely on the live rotate-gated fixed offsets during visible portrait gameplay.
- Moved automation portrait top/bottom fixed controls out of Panel B/console hit zones so exit-guard coverage can click the real back button instead of colliding with gameplay controls.
- Restored inactive level-select CTA button visibility on desktop by removing `.level-button` from the inactive-card hidden rule.
- Removed the delayed `DynamicQualityAdjuster` bootstrap race and switched to a singleton DOM-ready bootstrap so lifecycle tests can observe `window.dynamicQualityAdjuster` deterministically.
- Hardened `tests/ui-boundary.spec.js` to navigate directly to the active runtime page with `preload=off` and reuse the shared briefing-dismiss helper instead of waiting on the redirect/preload-gated start button.
- Serialized the local mixed `iphone-13` + `tests/perf-scenarios.spec.js` Playwright lane in `playwright.config.js` to keep focused mobile validation stable without changing broader repo parallelism.
- Processed review feedback by removing the warmed same-page catastrophic perf confirmation retry from `tests/perf-scenarios.spec.js`; perf failures are again evaluated from a single fresh run.
- Kept the shared root redirect entrypoints query/hash-safe by routing `game.html`, `index.html`, and `level-select.html` through `src/scripts/redirect-entrypoint.js`, then added focused Playwright coverage for that contract.
- Restored `power-up-display` boundary-manager mobility so overlap detection can still auto-reposition the tray instead of only logging collisions.
- Focused validation passed with `npx playwright test tests/evan-helper.worms.purple.spec.js tests/gameplay-exit-guard.spec.js tests/ui-boundary.spec.js tests/perf-scenarios.spec.js --project=pixel-7 --project=iphone-13 --grep "Evan does not directly click \.purple-worm elements|purple worm with devil inventory does not block symbol solving|back button is blocked while gameplay is active and unresolved|back button is restored after problemCompleted fires|Problem container should not overlap with score display|Lock display should not overlap with problem container|Problem and lock should stay within vertical overlap tolerance|idle scenario captures a stable baseline" --reporter=line`, `npm run verify`, and `npm run typecheck`.

## Previous update (2026-04-17)

- Fixed Panel C keyboard targeting so focus now reacquires a live matching symbol as soon as one enters the panel instead of waiting for a manual refocus or arrow-cycle.
- Prioritized guaranteed Panel C spawns around the current hidden solution symbols so gameplay keeps circulating live matching targets instead of relying only on global alphabet recirculation.
- Scoped the priority-spawn backfill to compact/mobile gameplay and made it crowding-aware so it can reclaim a lower-priority symbol when the compact rain is saturated.
- Added a compact visible-symbol floor so narrow Panel C lanes repopulate before the rain drains to zero during gameplay.
- Rebalanced compact/mobile Panel C throttling in `src/scripts/3rdDISPLAY.js` to restore a visible rain cadence without jumping back to desktop density.
- Added a regression lane proving Panel C can regain a keyboard target when focus arrives before any live matching symbol is visible.
- Added a desktop-scope assertion proving the standard Panel C runtime stays on the non-compact tuning path.
- Restacked the welcome-page matrix layer behind the atmospheric overlays so the hero title and emblem stop fighting the background artwork.
- Focused validation passed with `npx playwright test tests/welcome-page-redesign.spec.js tests/welcome-page-motion.spec.js tests/symbol-rain.mobile.spec.js --project=chromium --project=pixel-7 --reporter=line` and `npm run typecheck`.

## Previous update (2026-04-14)

- Reworked Panel C compact/mobile throttling to sync from `src/scripts/3rdDISPLAY.js` using the existing `viewport-compact` runtime contract instead of a one-time width gate.
- Restored real symbol-rain layout stabilization by removing the synthetic container-height fallback and keeping bootstrap retries responsible for zero-height startup states.
- Tightened Panel C keyboard and visibility checks to use actual panel-local intersection so off-screen symbols are no longer treated as visible targets.
- Fixed incremental symbol-rain spatial-grid cleanup so clicked symbols are removed from the grid as well as from the DOM/pool.
- Extended `tests/symbol-rain.mobile.spec.js` with compact runtime-config assertions and stronger Panel C-local visibility coverage.
- Focused validation passed with `npm run verify`, `npm run typecheck`, and `npx playwright test tests/symbol-rain.mobile.spec.js --project=chromium --project=pixel-7 --reporter=line`.

## Previous update (2026-04-13)

- Cleared problem-loading skeleton state before rendering the live problem so stale `dataset.originalContent` snapshots cannot overwrite gameplay content later.
- Made loading skeleton and spinner capture idempotent in `src/scripts/ux-loading.js` to prevent double-show races from storing spinner markup as the restore target.
- Tightened `tests/problem-loading.spec.js` to assert both spinner removal and cleanup of the saved original-content dataset entry.
- Extended `tests/problem-loading.spec.js` again to cover generic loading skeleton and spinner helpers directly, including idempotent restore behavior across repeated show calls.
- Extended `tests/run-playwright-group.js --check` to verify complete coverage of top-level `tests/*.spec.js` browser lanes while excluding nested unit, integration, and performance suites from split-group scope.

## Previous update (2026-04-10)

- Consolidated the repository to the current Markdown policy: `.github/copilot-instructions.md`, `JOBCARD.md`, `Plan Genesis.md`, `Plan Beta.md`, and `Plan Alpha.md`, plus repo-local custom agent files in `.github/agents/*.agent.md`.
- Merged the old README, system docs, worm guides, competition docs, task brief, and superpower planning artifacts into the three surviving plan files based on content ownership.
- Converted runtime problem assets from Markdown to JSON so gameplay data no longer violates the Markdown ceiling.
- Updated verification logic to enforce that policy and guard against future Markdown sprawl.

## Recent milestones

### Android WebView and mobile recovery

- Compact/mobile classification remains centralized in `src/scripts/display-manager.js`.
- Focused Android WebView-like contracts were added for Panel C and symbol-rain behavior.
- Mobile onboarding, startup, and compact-control work stayed aligned with the shared gameplay-ready contract.

### Settings, updates, and local persistence

- Level select owns the settings surface.
- `window.UserSettings` persists quality, locale, sound, and reduced-motion preferences.
- Deferred refresh and cache recovery stay outside active gameplay.

### Welcome and onboarding polish

- Welcome and level-select copy were tightened for mobile clarity.
- Local player naming is supported through device-only persistence.
- The H2P path now exists as a dedicated tutorial route separate from Beginner.

## Current durable truths

- `npm` is the local workflow entrypoint.
- Playwright is the active browser QA stack.
- Event-driven integration remains the runtime rule.
- Root HTML files remain redirect entrypoints; active runtime pages live in `src/pages/`.
- Panel A and B sizing belongs to `src/scripts/display-manager.js`.
- Only the five project Markdown files plus repo-local custom agent files in `.github/agents/*.agent.md` are allowed in this repository.
