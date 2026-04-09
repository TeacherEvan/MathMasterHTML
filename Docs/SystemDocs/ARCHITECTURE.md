# Architecture Guide

This document describes the current runtime architecture of MathMasterHTML.

## Runtime model

- Browser-native runtime with script tags and global `window.*` modules.
- No framework or bundler in the gameplay runtime.
- Root `index.html`, `game.html`, and `level-select.html` redirect into `src/pages/`.
- Inter-module integration happens through DOM events and shared runtime registries.

## Repository layout

- Root runtime redirects: `index.html`, `game.html`, and `level-select.html` forward into `src/pages/`.
- Source tree: `src/pages/` owns active entrypoints, `src/scripts/` owns runtime JavaScript, `src/styles/css/` owns split stylesheet modules, and `src/assets/` holds runtime content such as problems, images, and injected fragments.
- Support surfaces: `tests/` holds Playwright coverage, `Docs/` holds durable developer documentation, `lock/` holds legacy lock assets, `src/tools/` holds verification/build scripts, and `src/types/` holds typecheck-only definitions.

## Three-panel layout

| Panel | Responsibility | Main code |
| --- | --- | --- |
| Panel A | Problem display and progressive lock animation | `src/scripts/game*.js`, `src/scripts/lock-manager*.js` |
| Panel B | Solution steps, worms, score/timer overlays, console interactions, reward popups | `src/scripts/worm*.js`, `src/scripts/score-timer*.js`, `src/scripts/console-manager*.js` |
| Panel C | Falling symbol rain and symbol interaction surface | `src/scripts/3rdDISPLAY.js`, `src/scripts/symbol-rain*.js` |

## Key module groups

| Area | Primary files | Notes |
| --- | --- | --- |
| Game flow | `game.js`, `game-init.js`, `game-page.js`, `game-problem-manager.js`, `game-symbol-handler.core.js` | Owns problem lifecycle and line progression |
| Symbol rain | `3rdDISPLAY.js`, `symbol-rain.*.js` | Owns falling symbols, pooling, collision, and interaction delegation |
| Worm system | `worm.js`, `worm-system.*.js`, `worm-powerups*.js`, `worm-system.rewards.muffin.js` | Owns spawn logic, movement, effects, power-ups, and rewards |
| Lock progression | `lock-manager*.js`, `lock/` | Loads lock fragments and advances the lock sequence |
| Score/timer HUD | `score-timer-manager.js`, `score-timer.runtime.js`, `score-timer.boundary.js`, `score-timer.utils.js` | Owns countdown, score decay, step locking, and bonus application |
| Local progression | `player-storage.js`, `player-storage.helpers.js` | Persists score/profile state in localStorage |
| Performance/quality | `performance-monitor*.js`, `dynamic-quality-adjuster.js`, `quality-tier-manager*.js` | Owns metrics, adaptive quality, and perf tooling |

## Expanded subsystem inventory

### Gameplay and UI systems

| Area | Notable families | Responsibility |
| --- | --- | --- |
| Problem and symbol loop | `game-init.js`, `game-problem-manager.js`, `game-symbol-handler.*.js`, `symbol-validator.js` | Problem loading, step progression, symbol validation, and revealed-line updates |
| Display and layout | `display-manager*.js`, `lock-responsive.js`, `ui-boundary-manager*.js`, `score-timer.boundary.js` | Viewport detection, inline sizing ownership, collision zones, and HUD anchoring |
| Shared constants and utilities | `constants.part.*.js`, `constants.js`, `constants.events.js`, `utils-*.js` | Runtime config, shared event names, DOM helpers, logging, and small utilities |
| Console interactions | `console-manager.core.js`, `console-manager.storage.js`, `console-manager.ui.js`, `console-manager.events.js` | Slot state, persistence, selection UI, and keyboard/pointer handling |
| Lock progression | `lock-manager.js`, `lock-manager.loader.js`, `lock-manager.animations.js`, `lock-manager.events.js`, `lock-manager.templates.js` | Lock fragment loading, animation sequencing, and progression reactions |
| Page-specific layers | `game-page.js`, `index-page*.js`, `level-select-page*.js` | Page boot logic, page-only interactions, and screen-specific polish |

### Enemies, rewards, and effects

| Area | Notable families | Responsibility |
| --- | --- | --- |
| Worm runtime | `worm.js`, `worm-system.behavior.js`, `worm-system.interactions.js`, `worm-system.cache.js`, `worm-spawn-manager*.js`, `worm-movement*.js` | Spawn pacing, movement, target selection, interactions, and cache-assisted lookup |
| Power-ups | `worm-powerups.core.js`, `worm-powerups.selection.js`, `worm-powerups.ui*.js`, `worm-powerups.effects*.js`, `worm-system.powerups*.js` | Drops, inventory state, placement UI, and effect execution |
| Rewards and progression feedback | `worm-system.rewards.muffin.js`, `utils-achievements*.js`, `utils-combo*.js` | Reward surfaces, achievements, combo tracking, and feedback UI |
| Audio | `interaction-audio.cyberpunk*.js`, `interaction-audio.cyberpunk.drums.*.js` | Core audio, gameplay sound effects, drum sequencing, and control/state surfaces |

### Panel C and infrastructure

| Area | Notable families | Responsibility |
| --- | --- | --- |
| Symbol rain | `3rdDISPLAY.js`, `symbol-rain.config.js`, `symbol-rain.animation.js`, `symbol-rain.spawn.js`, `symbol-rain.interactions.js`, `symbol-rain.helpers*.js` | Falling symbols, pooling, collision, spawn pacing, and interaction dispatch |
| Runtime infrastructure | `lazy-component-loader*.js`, `lazy-lock-manager.js`, `service-worker-register.js` | Deferred fragment loading, lazy lock bootstrapping, and service-worker registration |

## Core event flow

```text
symbolClicked
  -> symbolRevealed
  -> first-line-solved
  -> problemLineCompleted
  -> lockLevelActivated / worm spawn / score step lock
```

Additional high-value events:

- `problemCompleted`
- `purpleWormTriggered`
- `wormExploded`
- `powerUpActivated`
- `consoleSymbolAdded`
- `qualityTierChanged`

## Integration rules

### Event boundaries are mandatory

- Cross-module integration should happen through DOM events, not direct module-to-module calls.
- A gameplay surface may call its own local helpers directly, but communication across subsystems should stay event-driven.
- Shared event names belong in `src/scripts/constants.events.js`.

Pattern:

```text
Producer surface dispatches a CustomEvent
  -> consumer module listens for the named event
  -> consumer updates its own local state
```

### Global runtime registry

Runtime subsystems expose stable surfaces on `window.*` so page boot and tests can discover them without import/bundler semantics.

Common exports include:

- `window.GameConstants`
- `window.GameEvents`
- `window.GameInit`
- `window.GameProblemManager`
- `window.consoleManager`
- `window.LockManager`
- `window.ScoreTimerManager`
- `window.performanceMonitor`
- `window.SymbolValidator`

### Split-file convention

Large runtime areas split by concern using dot notation rather than growing monolith files.

- Data/config: `module.config.js`, `module.definitions.js`
- Core logic: `module.core.js`
- Event binding: `module.events.js`
- UI rendering: `module.ui.js`
- Behavior/effects: `module.behavior.js`, `module.effects.js`, `module.powerups.js`
- Helpers: `module.helpers.js`

Example worm split:

- `worm.js` for the main class and difficulty defaults
- `worm-system.cache.js` for cache logic
- `worm-system.behavior.js` for AI state transitions
- `worm-system.interactions.js` for click/tap handling
- `worm-system.gameover.js` for row-reset and game-over handling

## Boot sequence

`src/pages/game.html` loads runtime surfaces in a strict order so globals and event contracts exist before dependent systems initialize.

1. Performance and quality bootstrap
2. Utilities and constants
3. Audio system
4. Managers and shared UI systems
5. Display and layout ownership
6. Symbol rain
7. Game core dependencies
8. Worm runtime
9. Gameplay infrastructure such as lock, console, score, and storage
10. Main game logic and page glue
11. Service worker registration

`game.js` then dynamically loads the core gameplay chain in order:

- `game-init.js`
- `game-problem-manager.js`
- `game-symbol-handler.stolen.js`
- `game-symbol-handler.core.js`
- `game-symbol-handler.events.js`
- `game-symbol-handler.js`
- `game-state-manager.js`

## Problem loading

Problem sets live in Markdown data files under:

- `src/assets/problems/Assets/Beginner_Lvl/`
- `src/assets/problems/Assets/Warrior_Lvl/`
- `src/assets/problems/Assets/Master_Lvl/`

The loaders parse those files at runtime and convert each problem into a step list rendered into Panel B.

## Worm system: current behavior

### Spawn and scaling

- `game-symbol-handler.core.js` dispatches `problemLineCompleted` when the active line is fully revealed.
- `worm-system.events.js` increments `rowsCompleted` and computes `spawnCount` as:
  - row 1: `wormsPerRow + 0`
  - row 2: `wormsPerRow + 1`
  - row 3: `wormsPerRow + 2`
- Current base `wormsPerRow` in `worm.js` is `1` for every difficulty, so a normal three-step problem creates 1, then 2, then 3 green worms as the player progresses.

### Difficulty settings

`worm.js` currently sets:

| Difficulty | Base worms/row | Speed multiplier | Console roam | Border roam |
| --- | --- | --- | --- | --- |
| Beginner | 1 | 1.0x | 8000ms | 5000ms |
| Warrior | 1 | 1.5x | 6000ms | 4000ms |
| Master | 1 | 2.0x | 4000ms | 3000ms |

### Interaction rules

- Green worms die immediately on `pointerdown`.
- Purple worms do **not** die on direct click; they trigger a clone penalty instead.
- Matching rain-symbol clicks explode any worm carrying that symbol, including purple worms.
- `game-symbol-handler.core.js` triggers purple worms after **3 consecutive wrong answers**.
- Automation mode (`navigator.webdriver === true`) caps `maxWorms` at `8` for browser stability.

### Reward layer

`worm-system.rewards.muffin.js` listens to `wormExploded` and adds a reward surface on top of the worm system:

- every worm explosion spawns a muffin reward button
- each muffin click grants bonus points
- the muffin resolves after one click with a shoutout, a pop/vibrate hit animation, and mini-fireworks
- purple rain-kills additionally grant a large score bonus and extra power-ups

## Score, timer, and persistence

- `ScoreTimerManager` tracks the active step countdown, live step score, banked problem score, and queued bonus points.
- `problemLineCompleted` locks the current step score and advances the timer state.
- `problemCompleted` persists the final score for the current problem.
- `PlayerStorage` stores player data in versioned localStorage under `mathmaster_player_profile_v1`.

## Performance and quality architecture

- `PerformanceMonitor` exposes `window.performanceMonitor` and a structured `getSnapshot()` API.
- `DynamicQualityAdjuster` responds to runtime performance.
- `QualityTierManager` applies quality tiers through CSS variables and emits `qualityTierChanged`.
- The symbol rain uses spatial hashing, object pooling, event delegation, and throttling to stay inside frame budgets.

## Practical architecture rules

- Preserve event contracts when moving logic between files.
- Keep split modules focused by concern.
- Preserve script load order and `window.*` registration semantics when editing `src/pages/game.html` or boot modules.
- Avoid CSS-only fixes for surfaces owned by JavaScript sizing logic.
- Treat data-file Markdown under `src/assets/problems/` as runtime content, not documentation.
