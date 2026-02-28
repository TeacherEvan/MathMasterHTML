# File Index and Metadata

This document provides a comprehensive index of all files and directories in the MathMasterHTML project, including metadata such as purpose, dependencies, and size information.

## Directory Structure

```
MathMasterHTML/
├── src/
│   ├── pages/                 # HTML pages
│   ├── scripts/               # JavaScript modules
│   ├── styles/                # CSS stylesheets
│   │   └── css/               # Split CSS modules
│   ├── assets/                # Static assets
│   │   ├── problems/          # Math problem data
│   │   ├── images/            # Image assets
│   │   └── components/        # HTML components
│   ├── tools/                 # Utility scripts
│   └── types/                 # TypeScript definitions
├── tests/                     # Test files
│   ├── integration/           # Integration tests (Jest-style, not run by Playwright)
│   ├── unit/                  # Unit tests (Jest-style, not run by Playwright)
│   ├── mocks/                 # Shared test mocks
│   └── utils/                 # Test utilities
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # Worm system and module design
│   ├── DEVELOPMENT_GUIDE.md   # Coding standards and recent changes
│   └── WORM_DEVELOPER_GUIDE.md # Worm system deep-dive
└── (root config files)
```

## File Index

### Pages (src/pages/)
| File | Purpose | Dependencies | Size |
|------|---------|--------------|------|
| game.html | Main game interface (three-panel Matrix UI) | All JS/CSS modules | ~15KB |
| index.html | Welcome / landing screen with Matrix rain | index.*.css, modern-ux-enhancements.css | ~5KB |
| level-select.html | Difficulty level selection (Beginner / Warrior / Master) | level-select.*.css | ~3KB |

### Core Game Scripts (src/scripts/)
| File | Purpose | Key Exports |
|------|---------|-------------|
| game.js | Game bootstrap – initialises all subsystems | `window.GameInit` |
| game-effects.js | Line-completion visual effects (flash, shake, cyan transform) | `window.GameEffects` |
| game-problem-manager.js | Loads / tracks current algebra problem and step index | `window.GameProblemManager` |
| game-symbol-handler.core.js | Handles correct/incorrect symbol clicks; dispatches `symbolRevealed` | `window.GameSymbolHandlerCore` |
| game-symbol-handler.stolen.js | Restores stolen symbols when player re-clicks the right rain symbol | `window.GameSymbolHandlerStolen` |
| game-symbol-helpers.js | `isSymbolInCurrentLine`, `revealSpecificSymbol` utilities | `window.GameSymbolHelpers` |
| utils-logging.js | Global `Logger` with debug/warn/log levels | `window.Logger` |
| utils.js | `normalizeSymbol` and other shared utilities | global functions |
| constants.js | Centralised game constants – use instead of magic numbers | `window.GameConstants` |

### Symbol Rain (Window C) (src/scripts/)
| File | Purpose | Key Exports |
|------|---------|-------------|
| symbol-rain.config.js | Fall speeds, spawn rates, `guaranteedSpawnInterval` (5000ms) | `window.SymbolRainConfig`, `window.SymbolRainSymbols` |
| symbol-rain.helpers.js | Registry entry-point for all SymbolRainHelpers | `window.SymbolRainHelpers` |
| symbol-rain.helpers.face-reveal.js | Glow/brightness face-reveal (no size scaling) | `SymbolRainHelpers.applyFaceRevealStyles` |
| symbol-rain.helpers.pool.js | Object pool for DOM recycling; cleanup helpers | `SymbolRainHelpers.createSymbolPool` |
| symbol-rain.helpers.spawn.js | `createFallingSymbol`, `populateInitialSymbols` | `SymbolRainHelpers.createFallingSymbol` |
| symbol-rain.helpers.collision.js | Spatial hash collision detection | `SymbolRainHelpers.checkCollision` |
| symbol-rain.animation.js | RAF animation loop; speed controller | `window.SymbolRainAnimation` |
| symbol-rain.spawn.js | `handleRandomSpawns`, `startGuaranteedSpawnController` (every 5s) | `window.SymbolRainSpawn` |
| symbol-rain.init.js | Initialises the rain, wires up event listeners | — |

### Console Manager (src/scripts/)
| File | Purpose | Key Exports |
|------|---------|-------------|
| console-manager.js | ConsoleManager class constructor + init | `window.ConsoleManager` |
| console-manager.events.js | Button click handlers; drag-to-reposition modal; keyboard shortcuts 1–9 | prototype methods |
| console-manager.ui.js | `fillSlot` (with refreshing animation), `updateConsoleDisplay`, `showSymbolSelectionModal` | prototype methods |

### Worm System (src/scripts/)
| File | Purpose | Key Notes |
|------|---------|-----------|
| worm.js | `WormSystem` constructor; all constants (speeds, timers, counts); `initialize()` | `wormsPerRow: 1` for all difficulties |
| worm-system.cache.js | Cached symbol/rect queries (100–200ms TTL) | `getCachedRevealedSymbols`, `getCachedAllSymbols` |
| worm-system.events.js | Event listeners: `problemLineCompleted` → spawn 1 green worm in Panel B; `symbolRevealed`, `problemCompleted` | dispatches `rowResetByWorm` |
| worm-system.spawn.js | `_spawnWormWithConfig`, `spawnGreenWormInPanelB`, `spawnWormFromConsole`, `spawnPurpleWorm` | **`spawnGreenWormInPanelB`** spawns at random position inside Panel B |
| worm-system.behavior.js | `stealSymbol` (active code path); row-reset logic; `_getAvailableSymbolsForWorm` | blue steal → resets whole row to red |
| worm-system.movement.js | `animate()` RAF loop; delegates to behavior chain | pre-bound as `_boundAnimate` |
| worm-system.gameover.js | Checks if all solution symbols are stolen → game over | — |
| worm-system.interactions.js | Click/pointerdown handlers; purple worm clone vs. explode logic | uses `pointerdown` not `click` |
| worm-system.effects.js | Explosion particles, slime splats, crack effects | — |
| worm-system.cleanup.js | `removeWorm`, `killAllWorms`, crack cleanup; cancels RAF on last worm | — |
| worm-system.powerups.js | Power-up drop and collection logic | — |
| worm-movement-navigation.js | `_updateWormRushingToTarget`; pathfinding integration | skips waypoint index 0 after recalc |
| worm-movement-core.js | Low-level velocity / distance math | — |
| worm-movement-behaviors.js | Roaming, evasion, escape-burst, console-return behaviors | — |
| worm-behavior.rush.js | FSM rush module – targets `revealed-symbol` (blue) only | non-purple worms only chase blue |
| worm-behavior.steal.js | FSM steal module – steals blue symbol; resets full row on steal | dispatches `rowResetByWorm` |
| worm-behavior.targeting.js | FSM target-assignment module | — |
| worm-behavior-fsm.js | Finite-state machine coordinator for worm behavior modules | — |

### Console CSS (src/styles/css/)
| File | Purpose |
|------|---------|
| console.core.css | 3×3 grid layout; slot styles; `@keyframes purplePulsate`; **`@keyframes slotRefresh`** (cyan flash on fill) |
| console.modal.css | **Floating 340px panel** (bottom-right) instead of full-screen overlay; drag handle; close button |
| console.worm.css | Worm-spawning slot animations |
| console.responsive.css | Mobile adjustments |

### Tests (tests/)
| File | Purpose |
|------|---------|
| gameplay-features.spec.js | **NEW** – E2E tests for all v2 gameplay features (stable symbols, 1× Panel B worm, blue targeting, row reset, floating modal, slot refresh) |
| worm-behavior.spec.js | E2E: aggression, targeting rules, purple worm clone behaviour |
| worm-stability.spec.js | E2E: cursor evasion guard, RAF cleanup on last worm |
| worm-cursor-evasion.spec.js | E2E: cursor-escape burst system |
| managers.spec.js | E2E: ProblemManager and SymbolManager integration |
| lock-components.spec.js | E2E: Progressive lock animation |
| powerups.spec.js | E2E: Power-up drop, selection, and effects |
| timer.spec.js | E2E: Game timer |
| ui-boundary.spec.js | E2E: UI boundary conditions |
| performance-bench.spec.js | Performance: FPS benchmarks |
| integration/ | Integration tests for worm movement and navigation (Jest-style) |
| unit/ | Unit tests for WormMovement, evasion, near-miss UI (Jest-style) |

### Docs (docs/)
| File | Purpose |
|------|---------|
| ARCHITECTURE.md | Full worm system state machine, event flow, module map |
| DEVELOPMENT_GUIDE.md | Coding standards, recent changes log, module conventions |
| WORM_DEVELOPER_GUIDE.md | Deep-dive on worm behaviors, purple/green mechanics, FSM |
| PERFORMANCE.md | Optimisation patterns, spatial hash, RAF best practices |
| REFACTORING_PLAN.csv | Catalog of large files, split status, recommendations |

### Root Files
| File | Purpose |
|------|---------|
| package.json | NPM scripts: `start`, `lint`, `lint:fix`, `verify`, `test` |
| playwright.config.js | Playwright E2E test configuration (Chromium, Firefox, WebKit, mobile) |
| eslint.config.js | ESLint rules for src/scripts, lock/, src/tools/ |
| manifest.json | PWA manifest |
| service-worker.js | Service worker (offline fallback) |
| FILE_INDEX.md | **This file** – full project file index |

## Event Flow (key cross-module events)

```
symbolClicked        → game.js checks answer → symbolRevealed / handleIncorrectAnswer
symbolRevealed       → WormSystem.notifyWormsOfRedSymbol (worms rush)
first-line-solved    → lock-manager.js starts lock progression
problemLineCompleted → WormSystem: spawn 1 green worm in Panel B targeting blue symbols
                     → GameEffects: cyan row transform
rowResetByWorm       → (downstream) row reverts from blue to red; player must re-solve
purpleWormTriggered  → WormSystem: spawnPurpleWorm (after 3+ wrong answers)
problemCompleted     → WormSystem: killAllWorms; score update
consoleSymbolAdded   → Game: console slot filled
powerUpActivated     → WormPowerUpEffectsRegistry: chain lightning / spider / devil
```

## Dependencies Overview

- **Global Dependencies**: None (vanilla JS, no framework)
- **Build / Dev Dependencies**: ESLint, Playwright
- **Runtime Dependencies**: None (pure browser JS)
- **Asset Dependencies**: Google Fonts (Orbitron)

## Notes

- All inter-module communication uses DOM events — never call functions across modules directly.
- CSS for Panel A/B font sizes is controlled by inline styles in `display-manager.js` (lines 95-110) — editing the CSS alone has no effect.
- `worm-behavior.*` files are the FSM path (future); `worm-system.behavior.js` is the active code path.
- File sizes are approximate; structure follows vanilla JS / no-build-tool best practices.
