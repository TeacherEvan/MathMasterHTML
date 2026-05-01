# Plan Genesis

## Purpose

Plan Genesis is the durable engineering source of truth for MathMasterHTML. It absorbs the old entrypoint guide, architecture guide, development guide, performance guide, worm developer guide, worm testing guide, and agent-customization ownership notes.
It complements the root README with the deeper engineering overview under the markdown policy.
Under the markdown policy, this file is also the repository system guide that would otherwise live in a separate `ARCHITECTURE.md`.

## Repo Reality

- Runtime: browser-native HTML, CSS, and JavaScript.
- Integration style: script tags, globals on `window.*`, and DOM events for subsystem boundaries.
- Active entrypoints live in `src/pages/`; root HTML files remain redirect entrypoints.
- Tooling uses `npm`, Playwright, ESLint, and the repo verify script.
- Problem content is runtime data in JSON under `src/assets/problems/Assets/`.

## Quick Start

```bash
npm install
npm start
```

Useful URLs:

- `http://localhost:8000/`
- `http://localhost:8000/src/pages/index.html`
- `http://localhost:8000/src/pages/level-select.html`
- `http://localhost:8000/src/pages/game.html?level=beginner`

Use an HTTP server. Runtime assets are fetched dynamically, so `file://` is not supported.

## Core Commands

| Command | Purpose |
| --- | --- |
| `npm start` | Serve the app locally on port 8000 |
| `npm run verify` | Project health and policy checks |
| `npm run typecheck` | TypeScript checks for the configured script subset |
| `npm test` | Full Playwright run |
| `npm run test:competition:smoke` | Fast competition smoke lane |
| `npm run test:competition:matrix` | Full competition browser/device matrix |
| `npm run test:competition:full` | Critical + stress competition lane |
| `npm run test:perf:gate` | Performance smoke gate |

## Repository Map

| Path | Purpose |
| --- | --- |
| `src/pages/` | Active HTML entrypoints |
| `src/scripts/` | Runtime JavaScript modules |
| `src/styles/` | CSS modules and polish layers |
| `src/assets/` | Problem data, images, and HTML fragments |
| `tests/` | Playwright coverage |
| `lock/` | Lock assets and styles |
| `src/tools/` | Verification and maintenance scripts |
| `src/types/` | Typecheck-only definitions |

## System Guide

- Behavior logic lives in `src/scripts/` and is split by domain: gameplay in `game-*.js`, worm mechanics in `worm-*.js` and `worm-system.*.js`, symbol-rain flow in `symbol-rain*.js`, audio in `interaction-audio.cyberpunk.*.js`, and onboarding or persistence in their matching controller or storage files.
- UI and layout ownership also lives in `src/scripts/`, but in the display and page orchestration families: `display-manager*.js`, `ui-boundary-manager*.js`, `console-manager*.js`, `score-timer*.js`, and `*-page*.js` own viewport rules, rendering glue, and page-level wiring.
- UI structure lives in `src/pages/` and `src/styles/`; runtime assets and problem data live in `src/assets/`; tests that lock behavior live in `tests/`; verification and maintenance scripts live in `src/tools/`.
- Root HTML files stay redirect-only entrypoints. Runtime edits should target the active pages in `src/pages/` and the owning script in `src/scripts/`.

## Script Naming Conventions

- `*-manager.js`: subsystem ownership and coordination such as `display-manager.js`, `lock-manager.js`, and `score-timer-manager.js`.
- `*-page.js` and `*-page.*.js`: page-level orchestration and event wiring such as `game-page.js` and `level-select-page.interactions.js`.
- `game-*.js`: gameplay flow, problem lifecycle, symbol handling, and session glue.
- `worm-*.js` and `worm-system.*.js`: worm behavior, movement, spawning, rewards, and power-ups split by concern.
- `symbol-rain*.js`: Panel C animation, spawning, helpers, and interactions.
- `interaction-audio.cyberpunk.*.js`: audio runtime split into bootstrap, state, playback, controls, and UI concerns.
- `constants*.js`, `utils-*.js`, and `*-helpers*.js`: shared constants, reusable helpers, and low-level utilities.

## Copilot Scoping Guidance

- Start from the owning script that directly computes the behavior, then pin the immediate caller or page glue that invokes it. Avoid broad repo-wide search once ownership is known.
- For an audio bug, pin the audio owner in `interaction-audio.cyberpunk.*.js` and the script that triggers it, such as a `game-*.js`, `*-page.js`, or interaction module.
- For UI bugs, pin the layout owner such as `display-manager*.js`, `ui-boundary-manager*.js`, or `console-manager*.js` plus the page or feature script that consumes that contract.
- If ownership is unclear, do one read-only exploration pass first, then narrow execution to the owner and its direct caller before editing.

### Zero-Search Execution

- Do not hand an agent a symptom-only request like `Fix the audio bug.` once the owner is known; pin the owner and caller together so execution stays local.
- Audio example: pin the specific `interaction-audio.cyberpunk.*.js` owner plus the nearest `game-*.js`, `*-page.js`, or interaction script that triggers playback.
- Layout example: pin `display-manager*.js`, `ui-boundary-manager*.js`, or `console-manager*.js` plus the page or feature script that invokes that layout contract.

## Runtime Model

- No framework or bundler in gameplay runtime.
- Modules register stable surfaces on `window.*`.
- Cross-subsystem communication should happen through DOM events, not direct singleton reach-through.
- Shared constants and event names belong in `src/scripts/constants*.js`.

Pattern:

```text
producer dispatches CustomEvent
  -> consumer listens by event name
  -> consumer updates its own local state
```

## Three-Panel Architecture

| Panel | Responsibility | Main code |
| --- | --- | --- |
| Panel A | Problem display and lock progression | `src/scripts/game*.js`, `src/scripts/lock-manager*.js` |
| Panel B | Solution steps, worms, rewards, console, HUD | `src/scripts/worm*.js`, `src/scripts/score-timer*.js`, `src/scripts/console-manager*.js` |
| Panel C | Falling symbol rain and symbol interaction | `src/scripts/3rdDISPLAY.js`, `src/scripts/symbol-rain*.js` |

## Key Module Families

| Area | Primary files | Notes |
| --- | --- | --- |
| Game flow | `game.js`, `game-init.js`, `game-page.js`, `game-problem-manager.js`, `game-symbol-handler*.js` | Problem lifecycle and line progression |
| Display/layout | `display-manager*.js`, `ui-boundary-manager*.js`, `score-timer.boundary.js` | Viewport sizing and compact/mobile ownership |
| Worm runtime | `worm.js`, `worm-system.*.js`, `worm-powerups*.js`, `worm-system.rewards.muffin.js` | Spawn, movement, rewards, power-ups |
| Lock progression | `lock-manager*.js`, `lock/` | Lock fragments, sequencing, progression |
| Persistence | `player-storage*.js`, `user-settings*.js` | Local profile and preferences |
| Updates/install | `service-worker.js`, `service-worker-register.js`, `install-prompt.js` | Offline shell and recovery flow |
| Performance | `performance-monitor*.js`, `dynamic-quality-adjuster.js`, `quality-tier-manager*.js` | Metrics and adaptive quality |

## Boot Sequence Rules

`src/pages/game.html` must preserve strict runtime ordering:

1. Settings, locale, and quality bootstrap
2. Utilities and constants
3. Audio system
4. Managers and shared UI systems
5. Display and layout ownership
6. Symbol rain
7. Game core dependencies
8. Worm runtime
9. Lock, console, score, storage, and onboarding helpers
10. Main game logic and page glue
11. Service worker and install/update hooks

Do not reorder scripts casually. If a runtime dependency changes, validate the full boot path.

## Problem Data Contract

- Problem sets live in JSON under:
  - `src/assets/problems/Assets/Beginner_Lvl/`
  - `src/assets/problems/Assets/Warrior_Lvl/`
  - `src/assets/problems/Assets/Master_Lvl/`
  - `src/assets/problems/Assets/Tutorial_Lvl/`
- Each problem entry should provide:
  - `problem`
  - `steps`
  - optional `number`
- Loaders normalize entries into runtime objects with `currentStep` and `currentSymbol` initialized to `0`.

## Current Worm Truth

### Panel C and Audio Contracts

- Symbol-rain visibility and Evan target selection both use the actual `#symbol-rain-container` intersection contract, not stale cached geometry or panel-local bounds alone.
- `problemLineCompleted` may include additive provenance detail, and listeners should keep existing behavior when the field is absent.

### Spawn Rules

- `problemLineCompleted` increments `rowsCompleted`.
- Green worm spawn count is:

```text
spawnCount = wormsPerRow + max(0, rowsCompleted - 1)
```

- With the current defaults, a three-step problem typically spawns 1, then 2, then 3 green worms over time.

### Difficulty Defaults

| Difficulty | Base worms/row | Speed | Console roam | Border roam |
| --- | --- | --- | --- | --- |
| Beginner | 1 | 1.0x | 8000ms | 5000ms |
| Warrior | 1 | 1.5x | 6000ms | 4000ms |
| Master | 1 | 2.0x | 4000ms | 3000ms |

### Interaction Rules

- Green worms die immediately on `pointerdown`.
- Purple worms do not die on direct click; they trigger clone penalty behavior instead.
- Matching symbol-rain clicks can kill a worm carrying that symbol.
- Three consecutive wrong answers trigger purple worm logic.
- WebDriver sessions cap worm counts for stability.

### Reward Rules

- `wormExploded` spawns a muffin reward.
- Each muffin click grants a score bonus and resolves once.
- Purple valid kills also grant a large bonus and extra power-ups.

### Worm Validation Lanes

```bash
npx playwright test tests/worm-behavior.spec.js --project=chromium
npx playwright test tests/worm-rewards.spec.js tests/worm-rewards-idempotency.spec.js --project=chromium
npx playwright test tests/worm-stability.spec.js tests/worm-cursor-evasion.spec.js --project=chromium
```

## Performance Rules

### Targets

| Metric | Desktop target | Mobile target |
| --- | --- | --- |
| FPS | 55-60 | 45-50 |
| Frame time | < 16-18ms | < 20-22ms |
| DOM queries/sec | < 150 | < 150 |
| Memory growth | bounded | bounded |

### Non-Negotiables

- Avoid `transition: all`.
- Keep DOM reads out of animation hot loops.
- Prefer delegation and pooling for hot surfaces.
- Use `pointerdown` on touch-critical interactions.
- Respect `prefers-reduced-motion`.

### High-Value Patterns

- spatial hash collision checks for symbol rain
- cached geometry and throttled layout reads
- visibility-based throttling for background tabs
- `requestIdleCallback` or deferred work for non-critical startup

### Panel C Symbol-Rain Guardrails

- Compact/mobile symbol-rain tuning belongs in `src/scripts/3rdDISPLAY.js` and should follow the existing `viewport-compact` contract instead of one-time `window.innerWidth` checks.
- Let Panel C bootstrap wait for real layout stabilization; do not replace zero-height container measurements with synthetic fallback heights.
- Panel C must refresh cached rain metrics when `#panel-c` or `#symbol-rain-container` changes size without a `window.resize`; `window.__symbolRainState.cachedContainerHeight` cannot rely on global resize alone.
- Keyboard-target eligibility in Panel C must use actual panel/container intersection, not global viewport checks alone.
- Visibility, keyboard targeting, spawn circulation, and Evan helper targeting must route through `window.SymbolRainTargets` so live Panel C lookups share the actual `#symbol-rain-container` intersection contract rather than mixing panel bounds with cached Y-only heuristics.
- Symbol rain lifecycle belongs to `window.SymbolRainLifecycle`; the phase model is `created`, `waiting-gameplay`, `waiting-layout`, `starting`, `running`, `stopping`, `stopped`, and `failed`.
- `src/scripts/3rdDISPLAY.js` remains the composition root. It wires lifecycle dependencies, controller teardown, resize/layout observers, interactions, and the temporary `window.__symbolRainState` bridge.
- Tests and runtime integration should prefer `window.SymbolRainController` for snapshots, start/stop/destroy, layout refresh, visible forced spawns, matching-symbol removal, and keyboard target sync. Treat direct `window.__symbolRainState` mutation as compatibility-only legacy access.
- If symbol-rain uses incremental spatial-grid bookkeeping, every symbol removal path, including click collection, must remove the symbol from the grid.
- Compact/mobile spawn throttling can be reduced, but keep guaranteed target circulation fast enough that live matching symbols remain available during gameplay.

## Gameplay Integrity Contracts

- Unrevealed solution symbols must keep their answer value in `data-expected` and render blank text until reveal; visual transparency alone is not sufficient.
- Worm steal, hide, restore, and help-reveal flows must preserve that hidden-symbol contract so unrevealed answers do not become readable again later in the same run.
- `problemLineCompleted` may carry additive provenance detail such as `symbolClick`, `tutorial`, or `greenWormCompletion`; listeners must remain backward-compatible and ignore fields they do not need.

## Settings and Update Model

- Preferences live in `mathmaster_user_settings_v1`.
- Profile and progression live in `mathmaster_player_profile_v1`.
- `/service-worker.js` remains the stable worker URL.
- Update prompts should appear on safe non-gameplay surfaces rather than forcing mid-run reloads.
- Level select remains the primary user-facing settings surface.

## H2P and Exit-Guard Truth

- H2P is one dedicated tutorial level only.
- Beginner routes into H2P only until tutorial completion is recorded.
- Evan auto-runs on H2P even on compact/mobile surfaces.
- In-app exit controls can be blocked during unresolved gameplay.
- A web app cannot block the Android OS Home button.

## Development Rules

1. Preserve event-driven boundaries.
2. Keep split-by-concern files instead of growing monoliths.
3. Reuse centralized constants and shared event names.
4. Respect sizing ownership in JavaScript-managed surfaces.
5. Prefer focused Playwright lanes over vague manual claims.
6. Update one of the approved project Markdown files whenever durable behavior changes; repo-local custom agent files in `.github/agents/*.agent.md` remain allowed.

## Debugging Checklist

- Start from `npm start`.
- Reproduce on an HTTP server, never `file://`.
- Press `P` for the performance overlay.
- Use `window.performanceMonitor.getSnapshot()` for structured metrics.
- Check `src/pages/game.html` load order before assuming game logic is broken.

## Validation Before Merge

Minimum:

```bash
npm run verify
npm run typecheck
```

Then run the smallest focused Playwright lane for the changed surface.

## Consolidation Record

Genesis absorbed the old content from:

- `README.md`
- `Docs/SystemDocs/ARCHITECTURE.md`
- `Docs/SystemDocs/DEVELOPMENT_GUIDE.md`
- `Docs/SystemDocs/PERFORMANCE.md`
- `Docs/Worms/WORM_DEVELOPER_GUIDE.md`
- `Docs/Worms/WORM_TESTING_GUIDE.md`
- `Docs/SystemDocs/AGENT_CUSTOMIZATION_ARCHITECTURE.md`
