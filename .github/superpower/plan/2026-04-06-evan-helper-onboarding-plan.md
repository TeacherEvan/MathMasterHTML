# MathMasterHTML Evan Helper Onboarding Plan and Status

## Goal

Add a mobile-first onboarding/help system that:

- keeps the power-up tray visible and non-overlapping on mobile and desktop
- introduces **Mr. Evan** as a first-run helper for each difficulty
- exposes **Skip** during active assistance and **Solve** after the intro is consumed
- adds a real preload shell tied to actual readiness work
- delays the install ask until repeat engagement
- keeps all gameplay integration event-driven and compatible with the existing three-panel runtime

## Architecture

Use an event-driven runtime layer added directly to the existing `src/pages/game.html` script stack.

The implementation is split into:

1. **Onboarding state and runtime bootstrap**
2. **Startup preload shell and readiness coordination**
3. **Evan layout shell and UI-boundary-safe controls**
4. **Onboarding flow controller**
5. **Evan behavior controller in three phases**
6. **Deferred install prompt**
7. **Full regression and verification gates**

No Evan logic should directly bypass gameplay modules with bespoke success paths. Evan must operate through the same interaction contracts already used by the player wherever possible.

## Tech Stack

- Browser-native HTML, CSS, and JavaScript
- Existing script-tag runtime in `src/pages/game.html`
- Playwright for browser validation
- Existing utilities confirmed present in game.html:
  - `window.UXModules.ProgressBarManager` — from `ux-loading.js` (loaded line ~311)
  - `window.UXModules.ToastNotificationManager` — from `ux-toast.js` (loaded line ~309)
  - `window.uiBoundaryManager`
  - `window.PlayerStorage`
  - `window.GameEvents`
  - `window.wormSystem.powerUpSystem`

## Runtime facts validated before planning

These facts govern implementation decisions and were verified against the live codebase:

- `src/pages/game.html` is the active runtime page; root `game.html` is a redirect.
- `src/pages/game.html` loads `player-storage.helpers.js`, `player-storage.js`, `game.js`, and `game-page.js` near the end of the page. `game-page.js` is loaded with `defer` — it executes after HTML parsing completes, after non-deferred scripts.
- `src/pages/game.html` does **not** directly load `src/scripts/game-init.js` as a `<script>` tag. However, `game.js` is a **dynamic module loader** that `await`-chains 7 sub-modules including `game-init.js` at runtime. This means `game-init.js` **does execute** during page load — just asynchronously after `game.js` begins. New onboarding scripts must not assume `game-init.js` globals are available synchronously; wait for a readiness signal or guard with optional chaining.
- **Dual wiring on `#start-game-btn`**: Both `game-page.js` (300ms delay) and `game-init.js` (500ms delay) independently attach click handlers to `#start-game-btn` that call `ScoreTimerManager.setGameStarted()`. The onboarding controller must coordinate with this dual-handler reality — either hook after both have fired or use the existing timer start as the signal rather than adding a third handler.
- `src/scripts/game-page.js` currently shows the How to Play modal on `DOMContentLoaded`, so preload must coordinate with or gate that behavior.
- **`window.GameEvents` is created with `Object.freeze({})`** in `constants.events.js`. New event names cannot be added at runtime — they must be declared inside the freeze call at definition time. All new event names must be added by editing `constants.events.js` directly.
- **`#skip-button` is already taken** — `src/pages/game.html` line 269 uses `id="skip-button"` for the Symbol Selection modal's Auto-fill button. Evan's skip control must use `id="evan-skip-button"` to avoid an ID collision.
- The power-up tray exists as `#power-up-display` driven by `window.wormSystem.powerUpSystem`.
- Existing power-up events: `powerUpInventoryChanged`, `powerUpSelectionChanged`, `powerUpActivated`, `powerUpsAwarded`.
- Power-up selection API: `window.wormSystem.powerUpSystem.selectPowerUp(type)`, `deselectPowerUp()`.
- Power-up placement mode: `selectPowerUp(type)` sets `isPlacementMode = true`, adds `power-up-placement-mode` class to `<body>`, installs a capture-phase `pointerdown` listener on `document`. `_executePlacement(type, x, y, event)` decrements inventory, dispatches `powerUpActivated`, and always calls `deselectPowerUp()` in its `finally` block.
- Purple worm threshold: **`PURPLE_WORM_THRESHOLD = 3`** consecutive wrong answers (not 4) — source: `game-symbol-handler.core.js` line 25.
- Muffin rewards require **4 clicks** (`MUFFIN_CLICKS_REQUIRED = 4` in `worm-system.rewards.muffin.js`). Muffins listen for **`pointerdown`** (not `click`), use `event.preventDefault()` + `event.stopPropagation()`, and track clicks via `data-clicks` attribute. The element is removed from the DOM after 4 successful clicks.
- `window.UXModules.ToastNotificationManager` is live in game.html. Note: `service-worker-register.js` accesses it via `window.UXEnhancements.toast` (a facade from `ux-enhancements.js`). Build 8 should use whichever API surface is available, preferring `UXEnhancements.toast` for consistency.
- All new `.js`, `.css`, and `.html` source files must stay **under 200 lines** per repo line-limit policy (`src/tools/scripts/line-limit.config.js`). Excluded: `.md` files and paths listed in the config. Split larger units by concern using dot-notation filenames.
- `Solve` must not be an always-floating overlay button. It lives in the structural `.panel-b-controls` region once Evan becomes optional.
- **Falling symbols use class `.falling-symbol`** — NOT `.symbol-rain-element`. The "already clicked" state is `.clicked` — NOT `.revealed`. The correct target selector is `.falling-symbol:not(.clicked)`.
- **Symbol identification is by `textContent` only** — falling symbols have no `data-*` attributes or IDs. The clicked symbol is read as `element.textContent` and matched against the current problem step's expected symbols.
- **Symbol rain uses `pointerdown`** (with `event.target.closest(".falling-symbol")` inside `#panel-c`), not `click`. Evan must dispatch `SYMBOL_CLICKED` CustomEvents on `document` (matching the existing contract) rather than simulating pointer events on the rain container.
- **Worm selectors**: Purple worms are `.worm-container.purple-worm` (modifier class on container). Green worm segments are `.worm-segment` (inner child divs). Muffin rewards are `button.worm-muffin-reward`.
- **z-index hierarchy**: How-to-Play modal = `1000000`, Game Over modal = `999999`. Evan's overlay shell must sit below both game modals but above normal gameplay elements.
- **`game.js` is a dynamic loader**: It loads 7 sub-modules via `await loadModule()` in sequence: `game-init.js`, `game-problem-manager.js`, `game-symbol-handler.stolen.js`, `game-symbol-handler.core.js`, `game-symbol-handler.events.js`, `game-symbol-handler.js`, `game-state-manager.js`. These modules become available asynchronously after `game.js` starts executing. Any code that needs `GameSymbolHandlerCore` or `GameProblemManager` must wait for them.

## Status snapshot (updated 2026-04-07)

The original draft below is still useful as the implementation blueprint, but the repo is no longer at "pre-build" status.

| Build | Status | Current repo state |
| ----- | ------ | ------------------ |
| Build 1 — Onboarding Core | **Done** | `game-onboarding.storage.js`, `game-onboarding.bootstrap.js`, `constants.events.js`, `game.html`, and `tests/onboarding-gates.spec.js` are present and wired. |
| Build 2 — Preload Shell | **Done** | `startup-preload.js`, preload markup, `service-worker-register.js` progress dispatch, `game-page.js` preload gating, `game-modals.preload.css`, and `tests/startup-preload.spec.js` are present. |
| Build 3 — Evan UI Shell | **Done** | Evan shell markup, presenter, styles, tokens, dedicated UI/controls specs, and Evan-specific `tests/ui-boundary.spec.js` assertions are now present. |
| Build 4 — Onboarding Flow | **Done** | `game-onboarding.controller.js` is wired and the flow coverage is split across `tests/evan-helper.flow.spec.js` and `tests/evan-helper.flow-solve.spec.js`. |
| Build 5 — Evan Symbols | **Done** | The symbol loop is implemented, but split across `evan-helper.controller.targets.js`, `evan-helper.controller.runtime.js`, and `evan-helper.controller.js` to satisfy the line-limit policy; `tests/evan-helper.symbols.spec.js` exists. |
| Build 6 — Evan Worms & Rewards | **Done** | Worm/reward behavior is implemented; coverage is split across `tests/evan-helper.worms.spec.js` and `tests/evan-helper.worms.purple.spec.js`. |
| Build 7 — Evan Power-Ups | **Done** | Power-up behavior is implemented; coverage is split across `tests/evan-helper.powerups.spec.js` and `tests/evan-helper.powerups.activation.spec.js`. |
| Build 8 — Install Prompt | **Done** | `install-prompt.js` and `tests/install-prompt.spec.js` are present and wired to onboarding state. |
| Build 9 — Verification | **Partial** | The focused verification suite listed later in this document now matches the shipped spec layout. This build remains partial because the section is still tracking verification guidance rather than a completed final closeout run recorded in this document. |

### Current deltas from the original draft

- The Evan controller did not stay in one file. It was correctly split into `evan-helper.controller.targets.js`, `evan-helper.controller.runtime.js`, and `evan-helper.controller.js` to stay within the 200-line policy.
- Preload and Evan styling landed in dedicated files: `game-modals.preload.css` and `game-modals.evan.css`, both linked from `src/pages/game.html`, instead of only expanding `game-modals.css`.
- The final event surface is broader than the original Build 1 list: in addition to the planned preload/Evan/install events, the runtime now also uses `STARTUP_PRELOAD_FORCE_COMPLETE`, `STARTUP_PRELOAD_COMPLETE`, and `BRIEFING_DISMISSED`.
- Build 4, 6, and 7 test coverage is split across additional spec files beyond the original draft. Use the current file list in Build 9, not the earlier one-file-per-build assumption.

### Remaining closeout work

1. Run and record the final Build 9 onboarding/Evan verification pass using the refreshed suite below.

## Build decomposition for separate project tracks

| Build   | Name                 | Main Purpose                                   | Safe to ship alone?    |
| ------- | -------------------- | ---------------------------------------------- | ---------------------- |
| Build 1 | Onboarding Core      | Storage, query overrides, deterministic gates  | Yes                    |
| Build 2 | Preload Shell        | Real startup readiness and modal coordination  | Yes                    |
| Build 3 | Evan UI Shell        | Visual shell, layout slots, UI boundary safety | Yes                    |
| Build 4 | Onboarding Flow      | First-run auto-demo, Skip, Solve visibility    | Yes                    |
| Build 5 | Evan Symbols         | Symbol-only solving behavior                   | Yes                    |
| Build 6 | Evan Worms & Rewards | Worm priority and reward collection            | Yes                    |
| Build 7 | Evan Power-Ups       | Two-step power-up behavior                     | Yes                    |
| Build 8 | Install Prompt       | Deferred install ask                           | Yes                    |
| Build 9 | Verification         | Focused, layout, typecheck, verify, smoke lane | No — verification only |

## Shared contracts to establish before implementation

### Storage key

Use a dedicated onboarding key separate from `PlayerStorage`:

- `mathmaster_onboarding_v1`

### Onboarding state shape

Use the following normalized state shape throughout the plan:

```json
{
  "version": 1,
  "sessionCount": 0,
  "evanConsumed": {
    "beginner": false,
    "warrior": false,
    "master": false
  },
  "installPromptDismissedAt": null,
  "updatedAt": 0
}
```

Any read of malformed or missing storage must return this default silently.

### Runtime bootstrap state

Expose a small bootstrap object on `window`:

- `window.GameOnboarding.level` — `"beginner" | "warrior" | "master"`
- `window.GameOnboarding.evanMode` — `"off" | "force" | "auto"`
- `window.GameOnboarding.preloadMode` — `"off" | "auto"`

### New event names to add to `constants.events.js`

Because `window.GameEvents` is frozen, all new names must be declared inside the existing `Object.freeze({})` call. Add these alongside the existing entries:

- `PRELOAD_PROGRESS` — `"preloadProgress"`
- `PRELOAD_READY` — `"preloadReady"`
- `PRELOAD_FAILED` — `"preloadFailed"`
- `EVAN_HELP_STARTED` — `"evanHelpStarted"`
- `EVAN_HELP_STOPPED` — `"evanHelpStopped"`
- `EVAN_ACTION_REQUESTED` — `"evanActionRequested"`
- `EVAN_ACTION_COMPLETED` — `"evanActionCompleted"`
- `INSTALL_PROMPT_AVAILABLE` — `"installPromptAvailable"`
- `INSTALL_PROMPT_DISMISSED` — `"installPromptDismissed"`

### Evan visual IDs

Reserve these IDs so all later tests and modules target the same elements:

- `#evan-assist-shell`
- `#evan-assist-border`
- `#evan-assist-label`
- `#evan-hand`
- `#evan-skip-button` ← **not** `#skip-button` (already taken)
- `#evan-solve-button`
- `#evan-controls-slot`

### Preload visual IDs

- `#startup-preload`
- `#startup-preload-message`
- `#startup-preload-progress`

### Evan interaction dispatch contracts

These are the exact event types and detail shapes Evan must use to interact with each gameplay element:

| Target | Event type | Dispatched on | Detail shape | Notes |
|--------|-----------|--------------|-------------|-------|
| Falling symbol | `CustomEvent(GameEvents.SYMBOL_CLICKED)` | `document` | `{ symbol: string }` | Symbol value is `element.textContent`; also add `.clicked` class to prevent re-targeting |
| Green worm segment | `CustomEvent(GameEvents.WORM_CURSOR_TAP)` | `document` | `{ x: number, y: number }` | Center of segment bounding rect |
| Muffin reward | `PointerEvent('pointerdown')` | muffin element | N/A (coordinates implicit) | Must set `{ bubbles: true, cancelable: true }`; repeat until DOM removal |
| Power-up placement | `PointerEvent('pointerdown')` | `document` | N/A | Must include `clientX`/`clientY`; only after `selectPowerUp(type)` enters placement mode |

### Existing game events Evan must listen for (read-only)

| Event | Source | Use by Evan |
|-------|--------|-------------|
| `PROBLEM_COMPLETED` | `game-symbol-handler.core.js` | Stop action loop — problem is done |
| `PROBLEM_LINE_COMPLETED` | `game-symbol-handler.core.js` | Re-evaluate targets — new line may have different expected symbols |
| `powerUpInventoryChanged` | `worm-powerups.core.js` | Track available power-ups for phase 3 |
| `powerUpActivated` | `worm-powerups.selection.js` | Confirm power-up placement succeeded |
| `powerUpSelectionChanged` | `worm-powerups.selection.js` | Confirm selection entered placement mode |

## Actual script loading order in `src/pages/game.html`

For reference, this is the exact tail of the current script block (verified from source):

```
[~309] ux-toast.js
[~311] ux-loading.js                 ← UXModules.ProgressBarManager available after this
[~313] ux-enhancements.js
[~402] player-storage.helpers.js
[~403] player-storage.js
[~404] score-timer.utils.js / score-timer.boundary.js / score-timer.runtime.js / score-timer-manager.js
[~411] game-problem-loader.js / game-symbol-helpers.js / game-effects.js
[~413] game.js
[~413] game-page.js  ← defer attribute — runs last among this block
[~416] service-worker-register.js
```

### Required insertion order for new scripts

Insert in `src/pages/game.html` in this order:

1. `player-storage.helpers.js` (already exists)
2. `player-storage.js` (already exists)
3. **`game-onboarding.storage.js`** ← new, after player-storage
4. **`game-onboarding.bootstrap.js`** ← new, immediately after storage
5. `score-timer.*` (already exists)
6. `game.js` (already exists)
7. **`startup-preload.js`** ← new, before game-page.js
8. **`evan-helper.presenter.js`** ← new, before game-page.js
9. **`game-onboarding.controller.js`** ← new, before game-page.js
10. **`evan-helper.controller.js`** ← new, before game-page.js
11. **`install-prompt.js`** ← new, before service-worker-register.js
12. `game-page.js` (already exists, keep `defer`)
13. `service-worker-register.js` (already exists)

**Why this order matters:**

- Storage/bootstrap must resolve before any controller reads `window.GameOnboarding`.
- Preload must exist before `game-page.js`'s deferred callback tries to show the briefing.
- Evan presenter/controller must exist before flow control dispatches Evan events.
- `game-page.js` has `defer` — it runs after all non-deferred scripts have executed, so non-deferred scripts added before it are guaranteed to initialize first.

---

## Build 1 — Onboarding Core

### Scope

Create deterministic onboarding state, session counting, and query overrides so future tests can force or disable Evan/preload behavior.

### Files to create

- `src/scripts/game-onboarding.storage.js` (≤200 lines)
- `src/scripts/game-onboarding.bootstrap.js` (≤200 lines)
- `tests/onboarding-gates.spec.js`

### Files to update

- `src/scripts/constants.events.js` — add all new event names inside the freeze call
- `src/pages/game.html` — insert two new script tags

### Required runtime behavior

#### `src/scripts/game-onboarding.storage.js`

Expose as `window.GameOnboardingStorage`. Responsibilities:

- `initSession()` — reads `mathmaster_onboarding_v1`, increments `sessionCount`, writes back. Call once per page load. Wraps localStorage in try/catch; falls back to in-memory default on any parse error.
- `getState()` — returns the current normalized state object (never throws).
- `shouldAutoRunEvan(level, override)`:
  - `override === "off"` → `false`
  - `override === "force"` → `true`
  - `override === "auto"` → `!state.evanConsumed[level]`
- `shouldShowInstallPrompt()` → `true` only when `sessionCount >= 3` AND `installPromptDismissedAt === null`.
- `markEvanConsumed(level, reason)` — sets `evanConsumed[level] = true`, writes `updatedAt`, persists.
- `markInstallPromptDismissed()` — sets `installPromptDismissedAt = Date.now()`, persists.

Valid `reason` values: `"skip"`, `"completed"`, `"manual-stop"`.

#### `src/scripts/game-onboarding.bootstrap.js`

Expose as `window.GameOnboarding`. Responsibilities:

- Parse `window.location.search` on script execution (not DOMContentLoaded).
- Normalize `?evan=off|force|auto` → `evanMode` (default: `"auto"`).
- Normalize `?preload=off|auto` → `preloadMode` (default: `"auto"`).
- Infer `level` from `?level=beginner|warrior|master` (default: `"beginner"`).
- Call `window.GameOnboardingStorage.initSession()` once.
- Export: `window.GameOnboarding = Object.freeze({ level, evanMode, preloadMode })`.

#### `src/scripts/constants.events.js`

Add all 9 new event name keys from the shared contracts section directly into the existing `Object.freeze({})` call. Do not create a second freeze or a separate events object.

#### `src/pages/game.html`

Insert both new script tags after `player-storage.js` and before `score-timer.utils.js`.

### Test plan

#### Test file: `tests/onboarding-gates.spec.js`

Test cases:

1. `?evan=off` — `GameOnboarding.evanMode` equals `"off"`; `shouldAutoRunEvan` returns `false` even when difficulty is unconsumed.
2. `?evan=force` — `shouldAutoRunEvan` returns `true` even when difficulty is already consumed.
3. `?evan=auto` with fresh state — `shouldAutoRunEvan` returns `true` for unconsumed difficulty.
4. `?evan=auto` after marking consumed — `shouldAutoRunEvan` returns `false`.
5. `?preload=off` — `GameOnboarding.preloadMode` equals `"off"`.
6. Session counter increments on each page load.
7. `shouldShowInstallPrompt()` returns `false` when `sessionCount < 3`.
8. `shouldShowInstallPrompt()` returns `true` when `sessionCount >= 3` and not dismissed.
9. Corrupt localStorage does not throw; state defaults correctly.

### Commands

```sh
npx playwright test tests/onboarding-gates.spec.js --reporter=line --workers=1
npm run typecheck
npm run verify
```

### Rollback

Delete `game-onboarding.storage.js` and `game-onboarding.bootstrap.js`, remove their script tags from `game.html`, and revert the additions to `constants.events.js`. No existing module is altered.

### Acceptance gate

- Onboarding state is deterministic under all query overrides.
- Bootstrap object exists and is frozen on runtime load.
- All 9 test cases pass.
- `npm run verify` and `npm run typecheck` pass.

---

## Build 2 — Preload Shell

### Scope

Introduce a real startup preload overlay tied to readiness, while preventing `game-page.js` from prematurely surfacing the How to Play modal.

### Files to create

- `src/scripts/startup-preload.js` (≤200 lines)
- `tests/startup-preload.spec.js`

### Files to update

- `src/pages/game.html` — add preload markup and new script tag
- `src/scripts/game-page.js` — gate briefing modal on preload completion
- `src/scripts/service-worker-register.js` — dispatch progress milestones
- `src/styles/css/game-modals.preload.css` — preload overlay styles

### Required runtime behavior

#### `src/pages/game.html` — preload markup

Insert before `#how-to-play-modal`:

```html
<div
  id="startup-preload"
  role="status"
  aria-live="polite"
  aria-label="Game loading"
>
  <p id="startup-preload-message">Initializing…</p>
  <div
    id="startup-preload-progress"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuenow="0"
  ></div>
</div>
```

Initial display: visible. `preload=off` query param must hide it immediately via JS after bootstrap runs.

#### `src/scripts/startup-preload.js`

Expose as `window.StartupPreload`. Responsibilities:

- On init, check `window.GameOnboarding.preloadMode`. If `"off"`, mark complete and return.
- Instantiate `new window.UXModules.ProgressBarManager('#startup-preload-progress')`.
- Listen for `window.GameEvents.PRELOAD_PROGRESS` — update message text and progress bar `aria-valuenow`.
- Listen for `window.GameEvents.PRELOAD_READY` — hide overlay, dispatch internal completion signal.
- Listen for `window.GameEvents.PRELOAD_FAILED` — hide overlay, dispatch internal completion signal (same path — never hard-block).
- Expose:
  - `window.StartupPreload.isBlocking()` → `boolean`
  - `window.StartupPreload.isComplete()` → `boolean`
- When complete, call `window.StartupPreload._onComplete()` which dispatches a `CustomEvent('startupPreloadComplete')` on `document`.

#### `src/scripts/service-worker-register.js`

Add progress milestone dispatches only. Do not add install UI here.

Dispatch `PRELOAD_PROGRESS` events with the following `{ detail: { progress, message } }` values:

| Stage                    | `progress` | `message`                       |
| ------------------------ | ---------- | ------------------------------- |
| Script booted            | 15         | `"Booting runtime…"`            |
| SW registration started  | 35         | `"Registering service worker…"` |
| SW registered or skipped | 60         | `"Assets cached."`              |
| Ready to play            | 100        | `"Ready."`                      |

If SW registration fails, dispatch `PRELOAD_PROGRESS` at 60 with `"Service worker skipped."`, then dispatch `PRELOAD_FAILED`.

#### `src/scripts/game-page.js`

Modify `setupHowToPlayModal` so:

1. If `window.StartupPreload?.isBlocking()` is `true`, defer showing the modal until `document` receives `startupPreloadComplete`.
2. If `StartupPreload` is absent or not blocking, show the modal immediately (current behavior preserved).
3. The start-button click path remains unchanged after the modal is visible.
4. A safety timeout of 8000ms must exist: if `startupPreloadComplete` has not fired, show the modal anyway. No session may be blocked indefinitely.

#### `src/styles/css/game-modals.preload.css`

Add styles for `#startup-preload`. Follow existing modal/overlay patterns. Use `transform` and `opacity` only for any transitions. Add a `@media (prefers-reduced-motion: reduce)` block that disables transition on the overlay.

### Test plan

#### Test file: `tests/startup-preload.spec.js`

Test cases:

1. Preload overlay `#startup-preload` is visible on initial page load.
2. Overlay hides after `PRELOAD_READY` is dispatched.
3. Overlay hides after `PRELOAD_FAILED` is dispatched (safe fallback).
4. Briefing modal `#how-to-play-modal` is not visible while preload is blocking.
5. Briefing modal becomes visible after `startupPreloadComplete` is received.
6. `?preload=off` — preload overlay is not visible; briefing path shows immediately.
7. Safety timeout: if preload takes >8s, briefing modal shows anyway.

### Commands

```sh
npx playwright test tests/startup-preload.spec.js --reporter=line --workers=1
npm run typecheck
npm run verify
```

### Rollback

Delete `startup-preload.js`, remove its script tag and preload markup from `game.html`, revert the game-page.js gating change, and revert service-worker-register.js milestone dispatches. The briefing modal returns to immediate display on DOMContentLoaded.

### Acceptance gate

- Preload and briefing modal never race each other.
- Preload failure never blocks the session.
- `?preload=off` bypasses entirely.
- All 7 test cases pass.

---

## Build 3 — Evan UI Shell and Layout Safety

### Scope

Introduce Evan's visible shell and reserve its layout slots without yet adding autonomous gameplay behavior.

### Status

**Done.** Runtime shell, presenter, markup, styles, token work, dedicated UI/controls specs, and Evan-specific `ui-boundary` follow-through are now in place.

### Files to create

- `src/scripts/evan-helper.presenter.js` (≤200 lines)
- `tests/evan-helper.ui.spec.js`
- `tests/evan-helper.controls.spec.js`

### Files to update

- `src/pages/game.html` — add Evan shell markup and Solve slot
- `src/styles/css/game-modals.evan.css` — Evan shell styles
- `src/styles/css/game-responsive.mobile-landscape.css` — compact landscape safety rules
- `src/styles/css/game-polish.chrome.playfield.css` — playfield coexistence rules
- `src/styles/css/game-polish.chrome.tokens.css` — Evan color tokens
- `tests/ui-boundary.spec.js` — add Evan-specific overlap assertions

### Required runtime behavior

#### `src/pages/game.html` — two structural regions

**Region 1: Evan overlay shell** (outside the three-panel grid, inside `<body>`):

```html
<div id="evan-assist-shell" aria-hidden="true" hidden>
  <div id="evan-assist-border"></div>
  <span id="evan-assist-label">Mr. Evan helping out</span>
  <div id="evan-hand" aria-hidden="true"></div>
  <button
    id="evan-skip-button"
    type="button"
    hidden
    aria-label="Skip Evan's help and take over"
  >
    Skip
  </button>
</div>
```

**Region 2: Solve slot inside `.panel-b-controls`:**

```html
<div id="evan-controls-slot" hidden>
  <button
    id="evan-solve-button"
    type="button"
    aria-label="Ask Evan to solve this problem"
  >
    Solve
  </button>
</div>
```

Initial visibility: both regions hidden by default.

#### `src/scripts/evan-helper.presenter.js`

Expose as `window.EvanPresenter`. Presenter responsibilities only — no gameplay or target-selection logic:

- `show()` / `hide()` — toggle `#evan-assist-shell` visibility and `body.evan-help-active`.
- `showSkip()` / `hideSkip()` — toggle `#evan-skip-button` hidden state.
- `showSolve()` / `hideSolve()` — toggle `#evan-controls-slot` hidden state.
- `moveHandTo(x, y)` — translate `#evan-hand` to screen coordinates using `transform: translate(x, y)`.
- `parkHand()` — move hand to an off-screen parked position (e.g., `transform: translate(-200px, -200px)`).
- Listen for `EVAN_HELP_STARTED` → call `show()`, `showSkip()`, `hideSkip` if in manual mode.
- Listen for `EVAN_HELP_STOPPED` → call `hide()`, `hideSkip()`, `parkHand()`.
- Respect `prefers-reduced-motion`: when reduced-motion is active, skip `moveHandTo` transitions and jump directly to destination.

#### Layout rules

- `#evan-skip-button` may be overlay-positioned only while Evan is actively helping.
- `#evan-solve-button` must remain inside `.panel-b-controls`; it is never floating.
- No new always-floating controls may compete with HUD, timer, or power-up tray.
- Compact landscape (`game-responsive.mobile-landscape.css`) must guarantee:
  - timer clear of `#power-up-display`
  - `#power-up-display` clear of `.panel-b-controls`
  - `#evan-controls-slot` clear of both
- `body.evan-layout-preview` class: enables test-time layout measurement without requiring full Evan flow.

#### z-index placement

The existing z-index hierarchy in game.html:

| Element | z-index |
|---------|---------|
| How-to-Play modal (`.how-to-play-overlay`) | `1000000` |
| Game Over modal (`.game-over-modal`) | `999999` |
| **Evan assist shell** (new) | **~`900000`** |
| Gameplay elements, worms, rain | Browser stacking order |

`#evan-assist-shell` must sit below both game modals so they can still overlay during game start and game over. The hand element (`#evan-hand`) should use the same stacking context as the shell — do not create a separate z-index for the hand.

`#evan-skip-button` inherits from the shell's z-index. `#evan-solve-button` is inside `.panel-b-controls` and does not need z-index elevation.

#### Token additions (`game-polish.chrome.tokens.css`)

```css
--evan-border-color: oklch(55% 0.25 25); /* pulsing red border */
--evan-label-color: oklch(85% 0.06 210); /* muted info text */
--evan-hand-size: 2.4rem;
```

### Test plan

#### `tests/evan-helper.ui.spec.js`

1. `#evan-assist-shell` renders without obscuring `#power-up-display`.
2. `body.evan-layout-preview` does not cause `#power-up-display` to have zero visible area.
3. Reduced-motion: Evan shell transitions are disabled; shell remains visible without animation.
4. `#evan-assist-label` text reads `"Mr. Evan helping out"`.

#### `tests/evan-helper.controls.spec.js`

1. `#evan-controls-slot` exists inside `.panel-b-controls`.
2. `#evan-solve-button` is initially hidden.
3. `#evan-solve-button` becomes visible when `showSolve()` is called on the presenter.
4. `#evan-controls-slot` does not overlap `#power-up-display` on compact landscape.
5. `#evan-skip-button` ID does not collide with existing `#skip-button`.

#### `tests/ui-boundary.spec.js` additions

1. With `body.evan-layout-preview`, `#evan-assist-shell` bounding rect does not overlap `#power-up-display`.
2. With `body.evan-layout-preview`, `#evan-assist-shell` bounding rect does not overlap `#timer-display`.
3. With `body.evan-layout-preview`, `#evan-controls-slot` bounding rect does not overlap `.panel-b-controls` outer edge.

### Commands

```sh
npx playwright test tests/evan-helper.ui.spec.js tests/evan-helper.controls.spec.js \
  tests/ui-boundary.spec.js --grep "evan|Evan|preview" --reporter=line --workers=1
npm run verify
```

### Rollback

Remove Evan shell markup and Solve slot from `game.html`, delete `evan-helper.presenter.js` and its script tag, revert CSS additions. No existing module is altered.

### Acceptance gate

- Evan shell markup exists and IDs are reserved.
- Solve is structurally inside Panel B controls.
- Skip uses `#evan-skip-button` — no ID collision with `#skip-button`.
- All targeted UI/layout tests pass.
- `npm run verify` passes.

---

## Build 4 — Onboarding Flow Controller

### Scope

Wire first-run auto-demo, intro consumption, Skip handling, and Solve visibility.

### Status

**Done.** Runtime behavior is present, but the test coverage is now split across `tests/evan-helper.flow.spec.js` and `tests/evan-helper.flow-solve.spec.js`.

### Files to create

- `src/scripts/game-onboarding.controller.js` (≤200 lines)
- `tests/evan-helper.flow.spec.js`

### Files to update

- `src/scripts/game-page.js` — invoke flow controller after briefing modal is dismissed
- `src/pages/game.html` — add controller script tag
- `src/scripts/evan-helper.presenter.js` — confirm `showSolve()` / `hideSolve()` API is present

### Required runtime behavior

#### `src/scripts/game-onboarding.controller.js`

Expose as `window.GameOnboardingController`. Responsibilities:

- Init on `document` `startupPreloadComplete` or `DOMContentLoaded` (whichever fires after preload resolves).
- Call `window.GameOnboardingStorage.shouldAutoRunEvan(level, evanMode)`.
- If `true`: wait for the briefing modal's start button click signal, then dispatch `EVAN_HELP_STARTED` with:
  ```js
  {
    detail: {
      mode: ("auto", level);
    }
  }
  ```
- If `false` and intro already consumed: call `window.EvanPresenter.showSolve()`.
- Listen for `EVAN_HELP_STOPPED` → call `markEvanConsumed(level, reason)` if not already consumed.
- Listen for click on `#evan-skip-button` → dispatch `EVAN_HELP_STOPPED` with `{ detail: { reason: "skip" } }`.
- Listen for click on `#evan-solve-button` → dispatch `EVAN_HELP_STARTED` with `{ detail: { mode: "manual", level } }`.
- On `EVAN_HELP_STARTED` with `mode: "manual"` → do not mark consumed (player opted in).

#### `src/scripts/game-page.js`

After the briefing modal's start button is clicked and the modal is dismissed:

1. Hide the modal (current behavior).
2. Start the timer via `window.ScoreTimerManager?.setGameStarted?.()` (current behavior — note: `game-init.js` also wires this same button with a 500ms delay, so timer start may fire from both handlers).
3. Notify `window.GameOnboardingController?.onBriefingDismissed?.()` (new step).
4. Request fullscreen (current behavior).

**Important timing note:** `game-init.js` (dynamically loaded by `game.js`) also attaches a click handler to `#start-game-btn` that calls `ScoreTimerManager.setGameStarted()` after 500ms. The onboarding controller's `onBriefingDismissed` call in `game-page.js` (300ms) will fire first. The Evan controller must not begin its action loop until game sub-modules like `GameSymbolHandlerCore` are confirmed available — use a guard like `if (!window.GameSymbolHandlerCore) { wait and retry }` before entering the symbol evaluation loop.

Do not reorder timer startup after Evan. The current game start rhythm stays intact.

### Test plan

#### `tests/evan-helper.flow.spec.js`

1. First visit to `?level=beginner` — `EVAN_HELP_STARTED` is dispatched after briefing dismissal.
2. `?evan=off` — `EVAN_HELP_STARTED` is never dispatched on first visit.
3. `?evan=force` — `EVAN_HELP_STARTED` is dispatched even when the intro has been consumed.
4. Clicking `#evan-skip-button` dispatches `EVAN_HELP_STOPPED` with `reason: "skip"`.
5. After skip, `markEvanConsumed` is called and subsequent loads do not auto-start.
6. After intro consumed, `#evan-solve-button` is visible without triggering Evan.
7. Clicking `#evan-solve-button` dispatches `EVAN_HELP_STARTED` with `mode: "manual"`.

### Commands

```sh
npx playwright test tests/evan-helper.flow.spec.js --reporter=line --workers=1
npm run verify
```

### Rollback

Delete `game-onboarding.controller.js` and its script tag; revert the `game-page.js` `onBriefingDismissed` call. Evan presenter remains but stays dormant.

### Acceptance gate

- First-run Evan auto-start works per-difficulty.
- Skip cleanly consumes the intro.
- Solve becomes the steady-state entry point afterward.
- All 7 flow test cases pass.

---

## Build 5 — Evan Symbols Behavior

### Scope

Implement Evan's first real gameplay capability: solving symbols only, without worm or power-up logic.

### Status

**Done.** The behavior shipped as a split controller (`targets` + `runtime` + main loop) rather than one file so the implementation stays under the line-limit policy.

### Files to create

- `src/scripts/evan-helper.controller.js` (≤200 lines)
- `tests/evan-helper.symbols.spec.js`

### Files to update

- `src/scripts/evan-helper.presenter.js` — expose `moveHandTo` / `parkHand` for controller use
- `src/pages/game.html` — add controller script tag

### Required runtime behavior

#### `src/scripts/evan-helper.controller.js`

Expose as `window.EvanController`. This is the behavior loop — phase 1 handles symbols only.

**How Evan determines the next expected symbol:**

The current problem step's expected symbols are displayed as hidden elements in `#solution-container`. Evan must:

1. Query the current step's hidden symbol slots — elements inside `#solution-container` that represent unrevealed characters.
2. Read their expected `textContent` to know which symbol character to look for in the rain.
3. Alternatively, use `window.GameSymbolHandlerCore?.getCurrentStepIndex?.()` to find the active step, then read the problem display to determine which symbols remain unrevealed.

**Important**: `GameSymbolHandlerCore` is loaded asynchronously by `game.js` via dynamic `<script>` creation — guard access with optional chaining or a readiness check before entering the action loop.

**Target resolution:**

1. Determine the next needed symbol character from the problem display.
2. Query `document.querySelectorAll('#panel-c .falling-symbol:not(.clicked)')` — find a falling symbol whose `textContent` matches the needed character.
3. If multiple matches exist, prefer the one closest to the bottom of the rain area (most urgently about to leave the viewport).
4. If no valid target found, park hand and re-evaluate on next tick (a matching symbol may spawn shortly).
5. If target's `getBoundingClientRect()` returns a zero-area rect (element not rendered), skip and re-evaluate on next tick.

**Action loop (phase 1):**

1. Acquire target element and its bounding rect.
2. Call `window.EvanPresenter.moveHandTo(rect.left + rect.width / 2, rect.top + rect.height / 2)`.
3. Wait `targetAcquisitionDelay` (120–180ms).
4. **Re-verify target**: check that the element is still in the DOM, still has non-zero bounding rect, and still has the expected `textContent`. If stale, re-evaluate instead of dispatching.
5. Dispatch `document.dispatchEvent(new CustomEvent(window.GameEvents.SYMBOL_CLICKED, { detail: { symbol: targetElement.textContent } }))` — this feeds into the existing `game-symbol-handler.events.js` handler which validates symbol correctness.
6. Add `.clicked` class to the target element to prevent Evan from re-targeting it (the rain system's `handleSymbolClick` normally does this, but since we're bypassing the pointerdown path, the controller must do it).
7. Dispatch `EVAN_ACTION_COMPLETED` with `{ detail: { action: "symbolClick", symbol: targetElement.textContent } }`.
8. Wait `postClickDelay` (140–220ms).
9. Re-evaluate for next target.

**Why dispatch `SYMBOL_CLICKED` on `document` instead of simulating `pointerdown`:**

The symbol rain's `pointerdown` handler (in `symbol-rain.interactions.js`) calls `event.target.closest(".falling-symbol")` and guards that the click is in `#panel-c`. It then adds `.clicked` class, dispatches `SYMBOL_CLICKED`, and removes the element after 500ms. Dispatching `SYMBOL_CLICKED` directly is cleaner because:
- It avoids Evan needing to fake pointer coordinates within `#panel-c`'s bounds.
- The existing handler in `game-symbol-handler.events.js` processes the symbol identically regardless of source.
- The controller must manually add `.clicked` to prevent double-targeting (see step 6 above).

**Stop conditions (must all be listened for):**

- `EVAN_HELP_STOPPED` — stop immediately, cancel pending timeouts.
- `window.GameEvents.PROBLEM_COMPLETED` — stop cleanly.
- No unrevealed symbols remain — park hand, stop.

**Robustness:**

- All timeouts must be cancellable (store IDs, clear on stop).
- If a target disappears between acquisition and click (re-check just before dispatch), re-evaluate instead of dispatching a stale click.
- The loop must not use `setInterval` — use chained `setTimeout` with stop-check at each step.

**Timing constants** (define in a local constants block, not magic numbers inline):

```js
const EVAN_TARGET_DELAY_MS = 150;
const EVAN_POST_CLICK_DELAY_MS = 180;
const EVAN_HAND_TRAVEL_MS = 200;
```

### Test plan

#### `tests/evan-helper.symbols.spec.js`

1. When Evan is active, `SYMBOL_CLICKED` events are dispatched with correct symbol values.
2. `#evan-hand` moves off its parked position during action.
3. After `PROBLEM_COMPLETED`, no further `SYMBOL_CLICKED` events are dispatched.
4. After `EVAN_HELP_STOPPED`, no further `SYMBOL_CLICKED` events are dispatched.
5. A zero-area bounding rect does not cause Evan to freeze — loop continues.

### Commands

```sh
npx playwright test tests/evan-helper.symbols.spec.js --reporter=line --workers=1
npm run verify
```

### Rollback

Delete `evan-helper.controller.js` and its script tag. Evan shell and flow remain intact but inert.

### Acceptance gate

- Evan can solve a symbol-only problem from start to finish.
- Stop conditions halt the loop cleanly.
- All 5 symbol behavior tests pass.

---

## Build 6 — Evan Worms and Rewards

### Scope

Add worm prioritization and reward collection on top of symbol solving.

### Status

**Done.** The runtime behavior exists and the purple-worm guardrail coverage lives in a dedicated follow-up spec: `tests/evan-helper.worms.purple.spec.js`.

### Files to update

- `src/scripts/evan-helper.controller.js` — extend with phase-2 target prioritization
- `tests/evan-helper.worms.spec.js` ← new test file

### Required runtime behavior

#### Priority order for phase 2

When Evan's action loop evaluates targets, check in this order:

1. Visible **purple worm** surfaces — `.purple-worm`
2. Visible **green worm segment** surfaces — `.worm-segment`
3. Visible **reward surfaces** — `.worm-muffin-reward`
4. Hidden symbols (phase-1 logic)

If a higher-priority target exists, interrupt current symbol pursuit and redirect.

#### Target selectors (confirmed from codebase)

- Purple worms: `.worm-container.purple-worm` (`.purple-worm` is a modifier class on `.worm-container`, not a standalone element)
- Green worm segments: `.worm-segment` (inner child divs of `.worm-body` inside `.worm-container`)
- Muffin rewards: `button.worm-muffin-reward` (a `<button>` element created by `worm-system.rewards.muffin.js`)

#### Reward click behavior — muffin interaction contract

Muffins listen for **`pointerdown`** (not `click`), with `{ passive: false }`. The handler calls `event.preventDefault()` + `event.stopPropagation()` and tracks clicks via a `data-clicks` attribute.

Because `MUFFIN_CLICKS_REQUIRED = 4`, Evan must:

1. Dispatch `new PointerEvent('pointerdown', { bubbles: true, cancelable: true })` on the muffin element (NOT a generic click).
2. Wait a short delay (80–120ms) between clicks to allow the `.muffin-hit` visual feedback class to clear (120ms internal timer).
3. Re-check: is the element still in the DOM, is it not `disabled`, and does it still have a non-zero bounding rect?
4. If yes — dispatch another `pointerdown` (up to 4 total).
5. If the element is removed from the DOM or becomes `disabled` before 4 clicks — re-evaluate from top of priority list.

Do not hard-code 4 clicks in the controller — instead poll for DOM removal / disabled state as the exit condition.

#### Green worm segment interaction contract

Green worm segments are killed by the worm cursor tap system. Evan must dispatch a `WORM_CURSOR_TAP` event to interact with worms:

```js
document.dispatchEvent(new CustomEvent(window.GameEvents.WORM_CURSOR_TAP, {
  detail: { x: segmentRect.left + segmentRect.width / 2, y: segmentRect.top + segmentRect.height / 2 }
}));
```

The worm system's event handler in `worm-system.events.js` listens for `WORM_CURSOR_TAP` with `{ detail: { x, y } }` coordinates and processes the tap against active worms.

#### Purple worm interaction rule

Purple worms can only be killed by a Panel C rain symbol click. Evan must **not** click purple worms directly — doing so spawns a green clone.

Evan's correct behavior for a purple worm:

1. Identify the next symbol needed.
2. Target that symbol from Panel C rain.
3. Dispatch `SYMBOL_CLICKED` as normal.

This means purple worms do not change Evan's click target — they change urgency context. Evan should proceed with symbol solving when a purple worm is present (same action, elevated priority framing for future power-up integration in Build 7).

Update the priority list accordingly:

1. Symbol needed to kill an active purple worm → resolve via symbol click (phase 1 path)
2. Green worm segments — dispatch `WORM_CURSOR_TAP` with segment center coordinates
3. Muffin rewards — dispatch repeated `PointerEvent('pointerdown')` with DOM-removal polling
4. Regular hidden symbols — phase-1 `SYMBOL_CLICKED` path

#### Recovery behavior

If a target disappears between acquisition and action:

- Cancel the pending click.
- Re-evaluate from top of priority list on next tick.
- Never freeze; always emit a `EVAN_ACTION_REQUESTED` before acting so tests can observe intent.

### Test plan

#### `tests/evan-helper.worms.spec.js`

1. Evan targets green worm segments before hidden symbols when worms are present.
2. Evan clicks muffin reward elements until they are removed from the DOM.
3. Evan re-evaluates cleanly if worm target disappears before click completes.
4. Evan resumes symbol solving after all worm/reward targets are cleared.
5. Evan does not directly click `.purple-worm` elements.

### Commands

```sh
npx playwright test tests/evan-helper.worms.spec.js --reporter=line --workers=1
npm run verify
```

### Rollback

Revert the prioritization block added to `evan-helper.controller.js`. Phase-1 symbol behavior remains.

### Acceptance gate

- Worms interrupt and redirect symbol solving correctly.
- Muffin rewards are actually collected via repeated clicks.
- Purple worms are not directly clicked.
- Disappearing targets do not freeze Evan.
- All 5 worm/reward tests pass.

---

## Build 7 — Evan Power-Ups

### Scope

Add inventory-aware power-up handling, including second-click placement.

### Status

**Done.** Build 7 behavior is implemented, and the "resume after activation" / "invalid target does not freeze" cases live in `tests/evan-helper.powerups.activation.spec.js` rather than the main power-up spec file.

### Files to update

- `src/scripts/evan-helper.controller.js` — extend with phase-3 power-up logic
- `tests/evan-helper.powerups.spec.js` ← new test file

### Required runtime behavior

#### Power-up state sources (confirmed from codebase)

- Inventory: `window.wormSystem.powerUpSystem.inventory` — shape `{ chainLightning: N, spider: N, devil: N }`
- Selected: `window.wormSystem.powerUpSystem.selectedPowerUp`
- Placement active: `window.wormSystem.powerUpSystem.isPlacementMode`
- Types list: `window.wormSystem.powerUpSystem.TYPES` — `["chainLightning", "spider", "devil"]`
- Selection API: `window.wormSystem.powerUpSystem.selectPowerUp(type)` — toggles selection, enters placement mode, adds `power-up-placement-mode` class to `<body>`, installs a capture-phase `pointerdown` listener on `document`
- Deselect API: `window.wormSystem.powerUpSystem.deselectPowerUp()` — clears selection, removes placement handler, resets cursor
- Internal placement: `window.wormSystem.powerUpSystem._executePlacement(type, x, y, event)` — decrements inventory, dispatches `powerUpActivated`, always calls `deselectPowerUp()` in `finally`
- Events: `powerUpInventoryChanged`, `powerUpSelectionChanged`, `powerUpActivated`, `powerUpsAwarded`

#### Visual/button surfaces (confirmed from codebase)

- `[data-testid="powerup-chainLightning"]`
- `[data-testid="powerup-spider"]`
- `[data-testid="powerup-devil"]`

#### Phase-3 priority order

1. Power-up opportunity: a valid target exists AND stock for a beneficial type is > 0
2. Green worm segments
3. Muffin rewards
4. Hidden symbols

Do not use inventory blindly. If no valid placement target exists, skip power-up and continue.

#### Two-step interaction sequence — placement mechanics

The power-up system's `selectPowerUp(type)` installs a **capture-phase `pointerdown`** listener on `document` via `_setupPlacementHandler(type)`. When that listener fires, it calls `_executePlacement(type, x, y, event)` which decrements inventory and dispatches `powerUpActivated`.

Evan's two-step sequence:

1. Check `inventory[type] > 0`.
2. Call `selectPowerUp(type)` — listen for `powerUpSelectionChanged` to confirm selection is active (`selectedPowerUp !== null`).
3. Identify valid placement target (e.g., worm segment center position). Get its bounding rect.
4. `moveHandTo(target center coordinates)`.
5. Dispatch a `PointerEvent('pointerdown', { bubbles: true, cancelable: true, clientX: x, clientY: y })` on `document` — this will be caught by the capture-phase placement handler.
6. Listen for `powerUpActivated` — confirms placement succeeded. The placement handler always calls `deselectPowerUp()` in its `finally` block, so selection is automatically cleared.
7. If `powerUpActivated` does not fire within 500ms, call `deselectPowerUp()` manually and continue without the power-up.

**Note:** Because the placement handler is on `document` at capture phase, dispatching the `PointerEvent` on `document` directly should work. The `clientX`/`clientY` coordinates must point at a valid placement zone (near a worm) for the effect to apply correctly.

#### Power-up type strategy

- `chainLightning` — use when ≥1 worm segment is visible.
- `spider` — use when multiple worms are active.
- `devil` — use when a purple worm is active.

Evan should not use a power-up if doing so requires a target that does not currently exist in the DOM with a non-zero bounding rect.

### Test plan

#### `tests/evan-helper.powerups.spec.js`

1. Evan calls `selectPowerUp(type)` when inventory > 0 and a valid target exists.
2. Evan does not call `selectPowerUp` when inventory is 0 for all types.
3. If `powerUpActivated` does not fire within timeout, Evan calls `deselectPowerUp()` and continues.
4. Evan resumes symbol solving after successful power-up activation.
5. Invalid placement target (zero-rect element) does not cause Evan to freeze.

### Commands

```sh
npx playwright test tests/evan-helper.powerups.spec.js --reporter=line --workers=1
npm run verify
```

### Rollback

Revert the phase-3 power-up block from `evan-helper.controller.js`. Phase 1/2 behavior remains.

### Acceptance gate

- Two-step power-up use works during Evan assistance.
- Invalid power-up opportunities are skipped cleanly.
- All 5 power-up behavior tests pass.

---

## Build 8 — Deferred Install Prompt

### Scope

Add an install ask only after repeat engagement and only when the browser prompt is actually available. Reuse `window.UXModules.ToastNotificationManager` instead of building a custom chip.

### Status

**Done.** The runtime currently prefers `window.UXEnhancements?.toast` and falls back to `window.UXModules.ToastNotificationManager`, matching the repo's existing service-worker/update-notification path.

### Files to create

- `src/scripts/install-prompt.js` (≤200 lines)
- `tests/install-prompt.spec.js`

### Files to update

- `src/pages/game.html` — add script tag before `service-worker-register.js`

### Required runtime behavior

#### `src/scripts/install-prompt.js`

Expose as `window.InstallPromptManager`. Responsibilities:

- Listen for `beforeinstallprompt` — capture `event.preventDefault()` and store deferred prompt object.
- Dispatch `INSTALL_PROMPT_AVAILABLE` on `document`.
- Gate display: only call `showInstallUI()` when:
  - `beforeinstallprompt` has fired.
  - `window.GameOnboardingStorage.shouldShowInstallPrompt()` is `true`.
  - Page is not mid-game (check that the briefing modal has already been dismissed).
- `showInstallUI()`:
  - Prefer `window.UXEnhancements?.toast` (the facade used by `service-worker-register.js`) for consistency. Fall back to `new window.UXModules.ToastNotificationManager()` if the facade is unavailable.
  - Toast API: call `.info(message, duration)` where `duration = 0` means no auto-dismiss (requires user action).
  - Toast message: `"Install Math Master for offline play →"` with an accept action.
  - On accept: call `deferredPrompt.prompt()`, await user choice.
  - On dismiss or accept (regardless of outcome): call `window.GameOnboardingStorage.markInstallPromptDismissed()` and dispatch `INSTALL_PROMPT_DISMISSED`.
  - Note: the existing toast system creates elements with `role="alert"` and `aria-live="polite"` — no additional a11y markup needed.
- Do not place any permanent DOM element in the HUD zone.

### Test plan

#### `tests/install-prompt.spec.js`

1. No install toast before `sessionCount >= 3`.
2. Install toast appears after threshold when `beforeinstallprompt` is simulated.
3. Dismissal calls `markInstallPromptDismissed()` — no repeat toast on same session reload.
4. Install toast does not overlap `#power-up-display` on compact landscape.
5. `INSTALL_PROMPT_DISMISSED` event fires after any dismiss action.

### Commands

```sh
npx playwright test tests/install-prompt.spec.js --reporter=line --workers=1
npm run verify
```

### Rollback

Delete `install-prompt.js` and its script tag. No other module is affected.

### Acceptance gate

- Prompting is engagement-gated (≥3 sessions).
- Toast uses existing `ToastNotificationManager` infrastructure.
- Install UI is layout-safe.
- All 5 install tests pass.

---

## Build 9 — Verification and Release Readiness

### Scope

Run all targeted gates and repo verification commands after all builds are complete.

### Status

**Partial.** The commands below now match the repo's current spec layout. This build stays partial because the section is acting as closeout guidance rather than proof of a completed final verification pass recorded in this document.

### Focused onboarding/Evan/install suite

```sh
npx playwright test \
  tests/onboarding-gates.spec.js \
  tests/startup-preload.spec.js \
  tests/evan-helper.flow.spec.js \
  tests/evan-helper.flow-solve.spec.js \
  tests/evan-helper.symbols.spec.js \
  tests/evan-helper.worms.spec.js \
  tests/evan-helper.worms.purple.spec.js \
  tests/evan-helper.powerups.spec.js \
  tests/evan-helper.powerups.activation.spec.js \
  tests/install-prompt.spec.js \
  --reporter=line --workers=1
```

Expected: all shipped onboarding/Evan/install specs pass. This suite is now the canonical closeout lane for the onboarding/Evan work tracked in this document.

### Layout and tray safety suite

```sh
npx playwright test \
  tests/ui-boundary.spec.js \
  tests/powerups.spec.js \
  tests/game-mobile-layout.spec.js \
  tests/game-mobile-layout.ultranarrow.spec.js \
  --reporter=line --workers=1
```

Expected: all layout and tray safety tests pass, including new Evan-specific overlap assertions.

Current repo note: `tests/ui-boundary.spec.js` does not yet include those Evan-specific overlap assertions, so treat them as remaining Build 3 work rather than already-landed coverage.

### Repository validation

```sh
npm run typecheck
npm run verify
```

Both must exit 0.

### Smoke lane

```sh
npm run test:competition:smoke
```

Expected: smoke projects pass.

### Line-limit audit

After all new files are created, run the line-limit audit to confirm no new file exceeds 200 lines:

```sh
node src/tools/scripts/line-limit/cli.js
```

If any file violates the limit, split it by concern using dot-notation (e.g., `evan-helper.controller.symbols.js`).

---

## Remaining closeout order recommendation

The original build order above is now mostly historical. For current follow-up work, use this order:

1. Finish or retire the missing Build 3 UI/layout assertions.
2. Run the refreshed focused onboarding/Evan/install suite from Build 9.
3. Run the layout/tray safety suite after Evan overlap assertions are in place.
4. Run `npm run typecheck` and `npm run verify`.
5. Run `npm run test:competition:smoke` as the final stability lane.

---

## Critical implementation gotchas

These issues were found by cross-referencing the plan against the live codebase and must not be overlooked:

| #   | Issue                                                                                                            | Impact                                                                                                                    | Resolution                                                                                                                                             |
| --- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | `window.GameEvents` is `Object.freeze({})`                                                                       | Adding event names at runtime silently fails                                                                              | Edit `constants.events.js` to include new names inside the freeze call                                                                                 |
| 2   | `#skip-button` already exists in game.html (Symbol Selection modal, line 269)                                    | Two elements with same ID → broken querySelector                                                                          | Use `#evan-skip-button` throughout                                                                                                                     |
| 3   | `game-page.js` is loaded with `defer`                                                                            | Non-deferred scripts run before it; timing assumptions must account for this                                              | New scripts without `defer` initialize before `game-page.js` — safe for the proposed order                                                             |
| 4   | Purple worm threshold is **3** consecutive wrong answers, not 4                                                  | Evan worm tests that trigger purple worms must use the correct threshold                                                  | Use `PURPLE_WORM_THRESHOLD = 3` from `game-symbol-handler.core.js`                                                                                     |
| 5   | Muffin requires **4 clicks** via **`pointerdown`**                                                               | A single click does not collect; using `click` instead of `pointerdown` won't register                                    | Evan must dispatch `PointerEvent('pointerdown')` on muffin elements and poll for DOM removal as exit condition                                         |
| 6   | `display-manager.js` applies inline font sizes                                                                   | Panel A & B font sizes cannot be overridden with CSS `!important`                                                         | Do not attempt CSS-only font overrides in Evan shell; use the existing inline-sizing path or leave panel fonts alone                                   |
| 7   | Line-limit policy: 200 lines max per file                                                                        | New files over 200 lines will fail `npm run verify`                                                                       | Split by concern using dot-notation before committing                                                                                                  |
| 8   | **Falling symbol class is `.falling-symbol`, NOT `.symbol-rain-element`**                                        | Wrong selector → Evan finds zero targets and never acts                                                                   | Use `.falling-symbol:not(.clicked)` everywhere symbol targets are queried                                                                              |
| 9   | **Symbols have no data attributes — only `textContent`**                                                         | Cannot query by symbol value via CSS selector                                                                             | Read `element.textContent` and compare against the current problem step's expected symbols                                                             |
| 10  | **`game.js` dynamically loads `game-init.js` and 6 other modules via `await`**                                   | Sub-modules (GameSymbolHandlerCore, GameProblemManager) are not available synchronously after game.js `<script>` tag runs | Guard with optional chaining or wait for a readiness signal before Evan targets symbols                                                                |
| 11  | **Dual `#start-game-btn` wiring** — both `game-page.js` (300ms) and `game-init.js` (500ms) attach click handlers | Timer start fires twice or at different times; onboarding hook may fire between them                                      | Hook after both have fired, or use timer-started state as the coordination signal                                                                      |
| 12  | **Symbol rain click path uses `pointerdown`** on `#panel-c` container                                            | Simulating `click` events on the container won't trigger the handler                                                      | Evan should dispatch `SYMBOL_CLICKED` CustomEvent on `document` directly (bypassing the rain container's pointerdown)                                  |
| 13  | **Power-up placement uses capture-phase `pointerdown`** on `document`                                            | Placement requires a real pointer coordinate, not just an API call                                                        | After `selectPowerUp(type)`, dispatch a `PointerEvent('pointerdown')` at the target coordinates, or call `_executePlacement(type, x, y)` if accessible |
| 14  | **z-index stack**: How-to-Play = 1,000,000; Game Over = 999,999                                                  | Evan shell at too-high z-index blocks modals; too low and it's hidden                                                     | Place Evan shell at z-index ~900,000 — above gameplay, below both modals                                                                               |

---

## Handoff note

This plan is intentionally detailed enough to be broken into separate implementation projects/builds later, but as of 2026-04-07 it is also a status document: Builds 1, 2, 4, 5, 6, 7, and 8 are materially implemented in the repo; the main remaining gaps are Build 3 coverage debt and Build 9 verification refresh.

The most important planning corrections and enhancements versus the earlier draft are:

- All new `window.GameEvents` additions must be declared inside the existing `Object.freeze({})` call — not patched at runtime.
- Evan's skip control must use `#evan-skip-button`, not `#skip-button` (already taken by Symbol Selection modal).
- The actual `game-page.js` is loaded with `defer` — insertion order of new scripts is safe as proposed because non-deferred scripts execute first.
- Purple worm threshold is `3` consecutive wrong answers (not 4).
- Muffin reward collection must use `PointerEvent('pointerdown')` (not `click`) and poll for DOM removal rather than hard-counting clicks.
- Toast API should prefer `window.UXEnhancements.toast` facade for consistency with `service-worker-register.js`.
- All new files must stay under 200 lines per repo line-limit policy.
- **Falling symbols are `.falling-symbol:not(.clicked)` — the earlier `.symbol-rain-element:not(.revealed)` selector does not exist in the codebase.**
- **Symbols are identified purely by `textContent`** — there are no `data-*` attributes on falling symbol elements.
- **`game.js` dynamically loads 7 sub-modules** including `game-init.js` — these are available asynchronously, not synchronously after `game.js` script tag. Evan must guard access to `GameSymbolHandlerCore` and `GameProblemManager`.
- **Both `game-page.js` and `game-init.js` wire `#start-game-btn`** — dual handler means timer start fires from both with different delays (300ms vs 500ms).
- **Power-up placement requires dispatching a `PointerEvent('pointerdown')` with `clientX`/`clientY` coordinates** — the placement handler is on `document` at capture phase.
- **Green worm interaction uses `WORM_CURSOR_TAP` event** with `{ detail: { x, y } }` coordinates.
- **z-index hierarchy** documented: Evan shell at ~900,000 sits between gameplay elements and game modals (1,000,000 / 999,999).
- A critical gotchas table was expanded from 7 to 14 entries to surface all codebase-validated issues before implementation begins.
