# Architecture Guide

This document describes the current runtime architecture of MathMasterHTML.

## Runtime model

- Browser-native runtime with script tags and global `window.*` modules.
- No framework or bundler in the gameplay runtime.
- Root `index.html`, `game.html`, and `level-select.html` redirect into `src/pages/`.
- Inter-module integration happens through DOM events and shared runtime registries.

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
- the muffin resolves after four clicks with a shoutout and mini-fireworks
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
- Avoid CSS-only fixes for surfaces owned by JavaScript sizing logic.
- Treat data-file Markdown under `src/assets/problems/` as runtime content, not documentation.
