# MathMasterHTML Codebase Architecture Guide

## Executive Summary

**MathMasterHTML** is a Matrix-themed educational math game built with **pure browser-native HTML/CSS/JavaScript** (no framework or bundler at runtime). The architecture is **event-driven and modular**, with inter-module communication happening exclusively through DOM events and shared global registries on the `window` object.

**Runtime Model:** Script-tag based with carefully ordered dependencies. Utilities/constants load first, followed by UI managers, then game-specific modules. All modules export/register themselves on `window.*` globals.

---

## 1. High-Level Directory Organization

### Root Level

```
MathMasterHTML/
├── src/                      # Source code (HTML, CSS, JS)
├── tests/                    # Playwright end-to-end tests
├── Docs/                     # Architecture & planning docs
├── lock/                     # Legacy lock components (being refactored)
├── game.html                 # Root redirect (HTTP redirect to src/pages/game.html)
├── index.html                # Root index redirect
├── level-select.html         # Root level-select redirect
├── package.json              # npm scripts, Playwright config
├── eslint.config.js          # Linting rules
└── playwright.config.js      # Test configuration
```

### `/src` Structure

```
src/
├── pages/                    # HTML entry points
│   ├── game.html            # Main game shell (loads all scripts, defines 3 panels)
│   ├── index.html           # Home/landing page
│   └── level-select.html    # Level selection UI
├── scripts/                 # JavaScript modules (~150+ files)
├── styles/css/              # CSS stylesheets (~60+ files)
├── assets/
│   ├── components/          # Lock animation HTML fragments
│   ├── images/              # Icons, sprites
│   └── problems/            # Markdown game problem files (Beginner_Lvl/, Warrior_Lvl/, Master_Lvl/)
├── tools/                   # Build/verification tools
└── types/                   # TypeScript definitions (for typecheck only)
```

---

## 2. Three-Panel User Interface System

The game UI is divided into **three vertical panels** displayed in a flexbox row:

```
┌─────────────────┬─────────────────┬─────────────────┐
│    PANEL A      │    PANEL B      │    PANEL C      │
├─────────────────┼─────────────────┼─────────────────┤
│ • Problem text  │ • Solution steps│ • Falling       │
│ • Lock anim     │ • Worms crawling│   symbols       │
│ • Lock display  │ • Console (3×3  │ (Matrix rain)   │
│                 │   grid)         │ • Tap to click  │
│                 │ • Score/timer   │                 │
│                 │   HUD overlay   │                 │
└─────────────────┴─────────────────┴─────────────────┘
```

### Panel A: Problem Display & Lock Progression

- **HTML element:** `#panel-a` / `#problem-container`
- **Responsibilities:**
  - Display current algebra equation to solve
  - Show progressive lock animation (6 levels)
  - Lock HTML fragments loaded dynamically from `src/assets/components/`
- **Primary modules:**
  - `game-problem-manager.js` — Load problems, manage step progression
  - `lock-manager.*.js` (4 files) — Manage lock state, load components, animate progression
  - `lock-responsive.js` — Handle responsive scaling of lock visuals

### Panel B: Game World & Interactions

- **HTML element:** `#panel-b`
- **Responsibilities:**
  - Display solution steps (the algebra work shown step-by-step)
  - Render worms crawling and stealing symbols
  - Provide 3×3 symbol console for quick-access slots (keyboard shortcuts 1-9)
  - Display score and countdown timer overlays
  - Show reward popups (achievements, combo feedback)
- **Primary modules:**
  - `worm.js` + `worm-system.*.js` (12+ files) — Worm lifecycle, behavior, movement, power-ups
  - `console-manager.*.js` (5 files) — Console UI, storage, event handling
  - `score-timer-manager.js` + `score-timer.*.js` (4 files) — Countdown, decay, bonus logic
  - `worm-powerups*.js` (11+ files) — Power-up spawning, effects, UI

### Panel C: Symbol Rain & Interaction Surface

- **HTML element:** `#panel-c` / `#symbol-rain-container`
- **Responsibilities:**
  - Render falling math symbols (0-9, X, +, −, =, ÷, ×)
  - Detect symbol clicks/taps with spatial hash collision detection
  - Move symbols down screen at frame-rate constrained speed
  - Pool/recycle symbol DOM elements for performance
- **Primary modules:**
  - `3rdDISPLAY.js` — Main display coordinator
  - `symbol-rain.*.js` (8 files) — Animation loop, spawn logic, collision detection, interactions

---

## 3. Key JavaScript Modules by Function

### A. Core Game Loop & Problem Management

| Module                          | Lines | Responsibility                                                        |
| ------------------------------- | ----- | --------------------------------------------------------------------- |
| `game-init.js`                  | ~120  | Parse URL params (level), init containers, set up game globals        |
| `game-problem-manager.js`       | ~200  | Load problem .md files, parse equations, manage solution steps, cache |
| `game-symbol-handler.core.js`   | ~180  | Validate symbol clicks, check line completion, trigger events         |
| `game-symbol-handler.events.js` | ~80   | Bind symbol click listeners (Panel C falls → Panel B worm/console)    |
| `game-symbol-handler.js`        | ~70   | Router module for symbol handler (load pattern)                       |
| `game-symbol-helpers.js`        | ~120  | Case-insensitive matching, symbol normalization helpers               |
| `symbol-validator.js`           | ~260  | Normalize symbols (X/x, ÷//, etc.), match against current line        |

### B. UI Display & Layout Management

| Module                              | Lines       | Responsibility                                                 |
| ----------------------------------- | ----------- | -------------------------------------------------------------- |
| `display-manager.js`                | ~270        | Detect viewport changes, apply responsive font sizing inline   |
| `display-manager.mobile.js`         | Modern      | Mobile-specific layout adjustments                             |
| `lock-responsive.js`                | ~260        | Scale lock visuals to fit Panel A responsively                 |
| `ui-boundary-manager*.js` (5 files) | ~1200 total | Collision zones (worm boundaries, lock region, console region) |
| `score-timer.boundary.js`           | ~120        | Lock position of timer HUD after first render                  |
| `ux-toast.js`                       | ~80         | Toast notification system                                      |
| `ux-ripple.js`                      | ~100        | Material Design ripple effect on button clicks                 |

### C. Constants & Utilities

| Module                       | Lines | Responsibility                                                    |
| ---------------------------- | ----- | ----------------------------------------------------------------- |
| `constants.part.gameplay.js` | ~100  | Game settings (lives, combos, multipliers)                        |
| `constants.part.system.js`   | ~80   | System settings (cache durations, URLs)                           |
| `constants.part.ui.js`       | ~60   | UI settings (font sizes, colors, animations)                      |
| `constants.js`               | ~40   | Aggregator; merges all constant parts into frozen `GameConstants` |
| `constants.events.js`        | ~20   | Centralized event type definitions (frozen object)                |
| `utils-core.js`              | ~80   | Small utilities (deferExecution, debounce, defer-to-idle)         |
| `utils-dom.js`               | ~120  | DOM helpers (querySelector caching, createElement wrappers)       |
| `utils-logging.js`           | ~40   | Emoji-prefixed console logging                                    |

### D. Worm System (Enemy AI & Behavior)

| Module Category  | Files                                                     | LOC  | Responsibility                                              |
| ---------------- | --------------------------------------------------------- | ---- | ----------------------------------------------------------- |
| **Core**         | `worm.js`                                                 | 339  | WormSystem class, init, spawn queue, difficulty settings    |
| **Behavior**     | `worm-system.behavior.js`, `worm-behavior*.js` (5 files)  | ~800 | Steal, target, evasion, pathfinding state machine           |
| **Movement**     | `worm-movement*.js` (4 files)                             | ~600 | Crawl animation, bounce, avoid obstacles                    |
| **Effects**      | `worm-system.effects.js`, `worm-system.rewards.muffin.js` | ~200 | Visual effects, dissolves, explosion, muffin rewards        |
| **Game Over**    | `worm-system.gameover.js`                                 | ~120 | Detect row reset, show "Worm Ate It" UI, tick wrong counter |
| **Spawn**        | `worm-spawn-manager*.js` (5 files)                        | ~450 | Queue worms, spawn from console/border, throttle spawning   |
| **Cache**        | `worm-system.cache.js`                                    | ~80  | High-speed lookup of revealed symbols and boundaries        |
| **Interactions** | `worm-system.interactions.js`                             | ~100 | Handle worm clicks, death animations                        |

### E. Power-Up System

| Module                                       | Lines | Responsibility                                             |
| -------------------------------------------- | ----- | ---------------------------------------------------------- |
| `worm-powerups.core.js`                      | ~150  | 10% drop probability, spawn on worm death                  |
| `worm-powerups.selection.js`                 | ~80   | Randomly choose: Chain Lightning ⚡ / Spider 🕷️ / Devil 👹 |
| `worm-powerups.ui.js`                        | ~190  | Create floating power-up UI, animations, tooltips          |
| `worm-powerups.ui.draggable.js`              | ~90   | Allow drag-and-drop of power-ups to use them               |
| `worm-powerups.effects*.js` (4 files)        | ~550  | Chain targeting, spider web, devil curse effects           |
| `worm-system.powerups.js`                    | ~120  | Dispatch power-up events, trigger activation               |
| `worm-system.powerups.effects*.js` (3 files) | ~350  | Apply power-up effects during worm targeting               |

### F. Achievement & Combo Systems

| Module                              | Lines | Responsibility                                       |
| ----------------------------------- | ----- | ---------------------------------------------------- |
| `utils-achievements.definitions.js` | ~70   | Achievement data (speedrun, perfectionist, etc.)     |
| `utils-achievements.js`             | ~180  | Tracking logic, localStorage persistence             |
| `utils-achievements.ui.js`          | ~100  | Show unlock popups, animation                        |
| `utils-combo.js`                    | ~200  | Track hit streaks, decay over time, score multiplier |
| `utils-combo.ui.js`                 | ~70   | Display combo counter on screen                      |

### G. Symbol Rain (Panel C)

| Module                              | Lines | Responsibility                                               |
| ----------------------------------- | ----- | ------------------------------------------------------------ |
| `symbol-rain.config.js`             | ~100  | Fall speed, spawn frequency, grid size tuning                |
| `symbol-rain.animation.js`          | ~180  | Animation loop, rAF, position updates                        |
| `symbol-rain.spawn.js`              | ~120  | Guaranteed spawn rules, rate limiting                        |
| `symbol-rain.interactions.js`       | ~140  | Click/tap listeners, dispatch `symbolClicked` events         |
| `symbol-rain.helpers*.js` (7 files) | ~900  | Spatial grid collision, pooling, face reveals, spawn helpers |
| `3rdDISPLAY.js`                     | ~180  | Coordinator; init all symbol-rain modules                    |

### H. Console Manager (3×3 Grid in Panel B)

| Module                       | Lines | Responsibility                                      |
| ---------------------------- | ----- | --------------------------------------------------- |
| `console-manager.core.js`    | ~150  | Class definition, slot state, selection modal       |
| `console-manager.storage.js` | ~100  | localStorage persistence of console layout          |
| `console-manager.ui.js`      | ~120  | Render console buttons, show symbol selection modal |
| `console-manager.events.js`  | ~90   | Bind keyboard (1-9), mouse clicks, dispatch events  |
| `console-manager.js`         | ~10   | Instantiate and export `window.consoleManager`      |

### I. Lock Manager (Panel A)

| Module                       | Lines | Responsibility                                   |
| ---------------------------- | ----- | ------------------------------------------------ |
| `lock-manager.js`            | ~270  | Core class, state, animation orchestration       |
| `lock-manager.loader.js`     | ~100  | Fetch lock HTML fragments on-demand              |
| `lock-manager.animations.js` | ~120  | CSS animations, progression transitions          |
| `lock-manager.events.js`     | ~80   | Listen for `problemLineCompleted` → advance lock |
| `lock-manager.templates.js`  | ~60   | Fallback UI if components fail to load           |

### J. Score & Timer HUD (Overlay on Panel B)

| Module                    | Lines | Responsibility                            |
| ------------------------- | ----- | ----------------------------------------- |
| `score-timer-manager.js`  | ~150  | Init, start countdown, update stats       |
| `score-timer.runtime.js`  | ~180  | Countdown loop, decay logic, step locking |
| `score-timer.boundary.js` | ~120  | Lock timer position after first render    |
| `score-timer.utils.js`    | ~60   | Format time, calculate bonus multipliers  |
| `player-storage.js`       | ~160  | localStorage for profile/progression      |

### K. Performance & Quality Management

| Module                               | Lines | Responsibility                                   |
| ------------------------------------ | ----- | ------------------------------------------------ |
| `quality-tier-manager*.js` (4 files) | ~500  | Detect GPU tier, choose animation quality level  |
| `performance-monitor.js`             | ~240  | FPS overlay (toggle with 'P'), DOM query counter |
| `performance-monitor.bootstrap.js`   | ~50   | Auto-enable on low-end devices                   |
| `dynamic-quality-adjuster.js`        | ~250  | Watch FPS, auto-downgrade quality if <50 FPS     |

### L. Infrastructure & Lazy Loading

| Module                          | Lines | Responsibility                                     |
| ------------------------------- | ----- | -------------------------------------------------- |
| `lazy-component-loader.js`      | ~190  | Fetch + cache lock/console HTML fragments          |
| `lazy-lock-manager.js`          | ~75   | Lazy init lock manager on first problem completion |
| `lazy-component-loader.init.js` | ~40   | Bootstrap lazy loading system                      |
| `service-worker-register.js`    | ~50   | Register PWA service worker                        |

### M. Page-Specific Modules

| Module                                      | Lines | Responsibility                                         |
| ------------------------------------------- | ----- | ------------------------------------------------------ |
| `game-page.js`                              | ~100  | Game page setup, modal logic, back button              |
| `index-page.js` + variants (5 files)        | ~400  | Home page Matrix animation, scoreboard, ripple effects |
| `level-select-page.js` + variants (4 files) | ~400  | Level cards, progress tracking, animations             |

### N. Audio System

| Module                                             | Lines | Responsibility                                     |
| -------------------------------------------------- | ----- | -------------------------------------------------- |
| `interaction-audio.cyberpunk.js`                   | ~250  | Main audio manager, Web Audio API setup            |
| `interaction-audio.cyberpunk.gameplay.js`          | ~150  | Sound effects for game events (correct/wrong/worm) |
| `interaction-audio.cyberpunk.drums.*.js` (5 files) | ~350  | Synth drums, sequencer, playback                   |
| `interaction-audio.cyberpunk.*.js` (other 5 files) | ~450  | Bootstrap, state, UI, encounters, controls         |

---

## 4. Architectural Patterns & Communication

### 4.1 Event-Driven Architecture (MANDATORY)

**All inter-module communication uses DOM events. Never call functions directly between modules.**

#### Core Event Flow

```
User clicks symbol in Panel C
  ↓
symbolRain.interactions.js dispatches CustomEvent('symbolClicked', detail: {symbol: 'X'})
  ↓
game-symbol-handler.events.js listens for 'symbolClicked'
  ↓
game-symbol-handler.core.js validates: is 'X' in current line?
  ↓
  ✅ Correct → dispatch CustomEvent('symbolRevealed')
              → highlight symbol in Panel B
              → check if line solved
              → if yes, dispatch CustomEvent('first-line-solved')
              → dispatch CustomEvent('problemLineCompleted')
              → lock-manager.js listens and advances lock
              → worm-system.spawn.js listens and spawns worms
              → score-timer.runtime.js locks timer advance for 2 sec
  ❌ Wrong   → update combo (miss)
              → tick consecutiveWrongAnswers
              → if 3+ consecutive → dispatch CustomEvent('purpleWormTriggered')
```

#### Event Types (Defined in `constants.events.js`)

```javascript
GameEvents = Object.freeze({
  COMBO_UPDATED: "comboUpdated",
  CONSOLE_SYMBOL_ADDED: "consoleSymbolAdded",
  DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
  FIRST_LINE_SOLVED: "first-line-solved",
  PROBLEM_COMPLETED: "problemCompleted",
  PROBLEM_LINE_COMPLETED: "problemLineCompleted",
  PURPLE_WORM_TRIGGERED: "purpleWormTriggered",
  ROW_RESET_BY_WORM: "rowResetByWorm",
  STEP_COMPLETED: "stepCompleted",
  SYMBOL_CLICKED: "symbolClicked",
  SYMBOL_REVEALED: "symbolRevealed",
  WORM_CURSOR_TAP: "wormCursorTap",
  WORM_CURSOR_UPDATE: "wormCursorUpdate",
  WORM_SYMBOL_CORRECT: "wormSymbolCorrect",
  WORM_SYMBOL_SAVED: "wormSymbolSaved",
});
```

### 4.2 Global Registry Pattern

Modules export themselves to the `window` object:

```javascript
// Example: Console Manager
window.consoleManager = new ConsoleManager();
window.ConsoleManager = ConsoleManager; // Also export class for introspection

// Other modules access
if (window.consoleManager) {
  window.consoleManager.setSymbol(slot, symbol);
}
```

Common windows exports:

- `window.GameConstants` — Aggregated configuration
- `window.GameEvents` — Event type names
- `window.GameInit` — DOM containers, level, initialization state
- `window.GameProblemManager` — Active problem, current step
- `window.WormSystem` — Live worms array, spawn queue
- `window.consoleManager` — Console UI state
- `window.LockManager` — Lock animation state, current level
- `window.ScoreTimerManager` — Score/timer state
- `window.ComboSystem` — Combo tracking
- `window.AchievementSystem` — Achievement tracking
- `window.__symbolRainState` — Symbol rain animation state
- `window.SymbolValidator` — Symbol matching utilities

### 4.3 Module Split Convention

Large files are split by concern using dot-notation:

- **Data/config** → `module.config.js`, `module.definitions.js`
- **Core logic** → `module.core.js`
- **Event handling** → `module.events.js`
- **UI rendering** → `module.ui.js`
- **Special behaviors** → `module.behavior.js`, `module.powerups.js`
- **Animations** → `module.animations.js`
- **Helper functions** → `module.helpers.js`

Example: `worm-system.*.js` files:

- `worm.js` — Class definition, constructor
- `worm-system.cache.js` — Caching layer
- `worm-system.spawn.js` — Spawn logic
- `worm-system.movement.js` — Movement coordination
- `worm-system.behavior.js` — AI state machine
- `worm-system.effects.js` — Visual effects
- `worm-system.gameover.js` — Game-over detection

### 4.4 No Direct Function Calls Between Modules

**❌ WRONG:**

```javascript
// game.js
wormSystem.handleSymbolClick(symbol); // ❌ Direct call
```

**✅ CORRECT:**

```javascript
// game.js
document.dispatchEvent(
  new CustomEvent("symbolClicked", {
    detail: { symbol: "X" },
  }),
);

// worm-system.interactions.js
document.addEventListener("symbolClicked", (e) => {
  wormSystem.handleSymbolClick(e.detail.symbol); // ✓ Event-driven
});
```

---

## 5. Entry Points & Initialization Flow

### 5.1 Root Redirects

```
User navigates to http://localhost:8000/

↓ (root game.html redirects)

http://localhost:8000/src/pages/game.html?level=beginner
```

URL parameters:

- `?level=beginner|warrior|master` — Difficulty
- `?lockComponent=Line-1-transformer.html` (optional) — Test specific lock

### 5.2 game.html Script Load Order

Scripts load in **strict dependency order** (see lines 274–530 in game.html):

1. **Performance/Quality** (before other scripts)
   - `perf-smoke-mode.js` — Optional debug mode
   - `quality-tier-manager.*.js` (4 files) — Detect GPU, set quality tier

2. **Utilities & Constants** (first to establish globals)
   - `utils-core.js`, `utils-dom.js`, `utils-logging.js`
   - `constants.part.*.js` (3 files) → `constants.js` → `constants.events.js`
   - `utils-achievements.*.js`, `utils-combo.*.js`

3. **Audio System**
   - `interaction-audio.cyberpunk*.js` (11 files)

4. **Managers & UI Systems**
   - `problem-manager.js`, `symbol-manager.js`
   - `ux-toast.js`, `ux-ripple.js`, `ux-loading.js`, `ux-enhancements.js`
   - `ui-boundary-manager*.js` (5 files)
   - `lazy-component-loader*.js` (3 files)

5. **Display & Layout**
   - `display-manager.js`, `display-manager.mobile.js`
   - `performance-monitor*.js`
   - `dynamic-quality-adjuster.js`

6. **Symbol Rain (Panel C)**
   - `symbol-rain.*.js` (8 files)
   - `3rdDISPLAY.js`

7. **Game Core**
   - `problem-loader.js`, `symbol-validator.js`
   - Game modules dynamically loaded by `game.js`

8. **Worm System**
   - `worm-factory.js`, `worm-movement.js`
   - `worm-spawn-manager*.js` (5 files)
   - `worm-cursor-tracker.js`, `worm-aggression.js`, etc.
   - `worm-powerups*.js` (11 files)
   - `worm.js` → `worm-system.*.js` (12 files)

9. **Gameplay Infrastructure**
   - `lock-responsive.js`, `lock-manager*.js` (5 files)
   - `console-manager*.js` (5 files)
   - `score-timer*.js` (4 files)
   - `player-storage*.js` (2 files)

10. **Main Game Logic**
    - `game.js` (dynamically loads game-\*.js modules)
    - `game-page.js` (deferred)

11. **Service Worker**
    - `service-worker-register.js`

### 5.3 Dynamic Game Module Loading

`game.js` is a dynamic loader that loads game modules in order:

```javascript
// game.js
const gameModules = [
  "/src/scripts/game-init.js",
  "/src/scripts/game-problem-manager.js",
  "/src/scripts/game-symbol-handler.stolen.js",
  "/src/scripts/game-symbol-handler.core.js",
  "/src/scripts/game-symbol-handler.events.js",
  "/src/scripts/game-symbol-handler.js",
  "/src/scripts/game-state-manager.js",
];

// Each module loads asynchronously, then next starts
```

### 5.4 Initialization Flow at Runtime

```
game.html loads (DOMContentLoaded)
  ↓
quality-tier-manager detects GPU capability
  ↓
Constants aggregated from parts
  ↓
Display manager sets up responsive observer
  ↓
All managers instantiated (worm, lock, console, score)
  ↓
Game modules load dynamically
  ↓
game-init.js runs:
  - Parse URL (?level=..., ?lockComponent=...)
  - Set body class (.level-beginner, .level-warrior, etc.)
  - Export DOM containers to window.GameInit
  - Init player storage, score/timer HUD
  ↓
game-problem-manager.js runs:
  - Register on window
  - Wait for first problem load event
  ↓
game.js finishes loading modules
  ↓
Window.GameProblemManager ready for fetch
  ↓
User presses "Start Game" → modal closes → countdown begins
  ↓
Symbol rain animates in Panel C
  ↓
Ready for input
```

---

## 6. Data Flow: From Problem Load to Line Solved

```
1. PROBLEM LOAD
   User clicks "Start Game" or Level Card
   → LazyComponentLoader fetches Problems/Beginner_Lvl/problem-1.md
   → Regex parser extracts equation + steps
   → game-problem-manager.renderProblem() displays in Panel A
   → game-problem-manager.renderSolution() shows steps in Panel B
   → currentSolutionStepIndex = 0 (ready for first line)

2. SYMBOL SPAWN (Panel C)
   symbol-rain.spawn.js runs every 50-200ms
   → Creates new floating symbol element
   → Adds to DOM (#symbol-rain-container)
   → symbol-rain.animation.js moves down via transform translate-y
   → Spatial grid updates position hash

3. USER CLICKS SYMBOL
   Click on symbol in Panel C
   → symbol-rain.interactions.js detects click
   → symbol-rain.helpers.spatial.js finds symbol by grid cell
   → Dispatch CustomEvent('symbolClicked', {symbol: 'X'})
   → Symbol removed from DOM (returned to object pool)

4. SYMBOL VALIDATION
   game-symbol-handler.events.js listens for 'symbolClicked'
   → Call game-symbol-handler.core.js validateSymbol()
   → Get currentLine from GameProblemManager.currentSolutionStepIndex
   → Check if 'X' === expected symbol (case-insensitive via normalization)

5. LINE NOT SOLVED YET
   Symbol was correct, but line incomplete
   → Dispatch CustomEvent('symbolRevealed', {symbol: 'X'})
   → lock-manager.js listens (does nothing; only line completion advances)
   → game-symbol-handler.core.js highlights symbol in Panel B
   → Combo system hits (+multiplier)
   → Sound plays (if enabled)
   → solution step advances: currentSolutionStepIndex++

6. LINE SOLVED ✓
   Last symbol of current step clicked correctly
   → Dispatch CustomEvent('problemLineCompleted')
   → lock-manager.js listens:
      - Call loadLockComponent()
      - Advance currentLockLevel++
      - Play unlock animation CSS
   → worm-system.spawn.js listens:
      - Queue new worm to spawn from console/border
      - After 5-10 sec roam, trigger steal behavior
   → score-timer.runtime.js listens:
      - Freeze countdown for 2 seconds (step lock)
      - Prevent score decay momentarily
   → game-problem-manager.renderSolution() updates:
      - Mark previous step completed (visual highlight)
      - Highlight next step
   → consecutiveWrongAnswers = 0 (reset worm aggression)

7. ALL LINES SOLVED = PROBLEM COMPLETE
   currentSolutionStepIndex reaches final step
   → Dispatch CustomEvent('problemCompleted')
   → Load next problem (or show completion screen)
   → Reset worm count
   → Reset combo
   → Add bonus score based on time + combo
```

---

## 7. CSS Architecture

### File Organization

```
src/styles/css/
├── Core Layout
│   ├── game.css              — Main 3-panel flexbox layout
│   ├── console.core.css      — 3×3 symbol console grid
│   ├── lock-responsive.css   — Lock scaling responsive
│   └── score-timer.css       — Score/timer HUD positioning
│
├── Responsive
│   ├── game-responsive.*.css (3 files) — Mobile, landscape, touch adjustments
│   ├── console.responsive.css — Console grid scaling
│   └── level-select.responsive.css
│
├── Animations & Effects
│   ├── game-animations.*.css (7 files) — Symbol reveals, line completion, combos
│   ├── game-effects.css      — Reduced-motion handling
│   ├── worm-effects.*.css (3 files) — Worm death, carry effects, power-ups
│   ├── index.effects.css     — Home page effects
│   ├── lod-animations.*.css (4 files) — Quality tier animation levels
│   └── modern-ux-enhancements.*.css (3 files) — Toasts, ripples, modals
│
├── Components
│   ├── console.*.css (4 files) — Console states, modals, worm interactions
│   ├── worm-base.*.css (3 files) — Base worm styling, states, variants
│   ├── game-modals.css       — How-to-play, symbol selection modals
│   ├── game-polish.chrome*.css (4 files) — Premium styling, tokens, playfield
│   └── modern-ux-enhancements.*.css
│
├── Pages
│   ├── index*.css (5 files) — Home page (hero, matrix, scoreboard effects)
│   └── level-select*.css (5 files) — Level card UI, progress, details
│
└── Performance
    ├── perf-smoke-mode.css   — Debug visual overlay
    └── lod-animations.tiers.css — Quality tier CSS variables
```

### Design System (from task.md)

**Tokens:** OKLCH color system for semantic colors (surfaces, text, accents)

```css
--surface-primary: oklch(12% 0.02 260); /* Deep blue-black */
--text-primary: oklch(96% 0.01 260); /* Near white */
--accent-success: oklch(72% 0.27 142); /* Vibrant green */
--accent-warning: oklch(68% 0.25 30); /* Orange */
```

**Typography:**

- Display: `Orbitron` 400/700/900 (futuristic headings)
- Body: `Exo 2` 400/500/700 (readable, clean)
- Mono: `IBM Plex Mono`, `Alegreya Sans` (level-select, detail text)

**Motion:**

- Easing: `cubic-bezier(0.6, 0.05, 0.2, 0.8)` (ease-out-quart)
- No bounce or elastic — smooth, professional
- All motion CSS, rarely JS

---

## 8. Key Gameplay Constants

Located in `constants.part.gameplay.js`:

```javascript
const GamePlay = {
  TIMER_DURATION_SECONDS: 60,              // 1-minute countdown
  COMBO_DECAY_MS: 1000,                    // Combo decays every second
  POWER_UP_DROP_RATE: 0.1,                 // 10% of worm deaths drop
  WORM_DIFFICULTY: { beginner: 1x, warrior: 1.5x, master: 2x },
  PURPLE_WORM_THRESHOLD: 3,                // Purple worum after 3 wrong
  WORM_SPAWN_DELAY_MS: 1000–5000,         // Varies by level
  SCORE_STEP_LOCK_MS: 2000,                // Freeze score after line solved
};
```

---

## 9. Performance Optimization Patterns

### Caching Strategy

```javascript
// Modules cache DOM queries with time-based invalidation
const CACHE_DURATION_TARGETS = 100; // ms

function getCachedStepSymbols(stepIndex) {
  const now = Date.now();
  if (now - lastCacheTime > CACHE_DURATION_TARGETS || stepChanged) {
    cachedSymbols = solutionContainer.querySelectorAll(...);
    lastCacheTime = now;
  }
  return cachedSymbols;
}
```

### Spatial Hashing (Symbol Collision)

```javascript
// symbol-rain.helpers.spatial.js: Divide Panel C into grid cells
// Only check collisions within nearby cells, not all symbols
const GRID_CELL_SIZE = 100; // pixels
const grid = {}; // { "10,20": [symbol1, symbol2] }

function updateGrid(symbol) {
  const cell = `${Math.floor(x / 100)},${Math.floor(y / 100)}`;
  grid[cell] ??= [];
  grid[cell].push(symbol);
}
```

### Object Pooling

```javascript
// Round-robin reuse of DOM elements
const symbolPool = [];
for (let i = 0; i < 50; i++) {
  const el = document.createElement("div");
  symbolPool.push(el);
}

// Reuse instead of create
const el = symbolPool[nextIndex++ % poolSize];
el.textContent = "X";
el.style.transform = `translate(${x}px, ${y}px)`;
container.appendChild(el);
```

### Event Delegation (Console Clicks)

```javascript
// Listen once on container, not per button
document
  .getElementById("symbol-console")
  .addEventListener("pointerdown", (e) => {
    const slot = e.target?.dataset?.slot;
    if (slot !== undefined) {
      // Handle slot click
    }
  });
```

### Reduced Motion Handling

All entrance animations checked against `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  .problem-text,
  .solution-step {
    animation: none;
    opacity: 1;
    transform: none;
  }
}
```

---

## 10. Browser Automation Handling

For Playwright tests, the runtime detects automation and adjusts:

```javascript
this.isAutomation = navigator.webdriver === true;
if (this.isAutomation) {
  this.maxWorms = Math.min(this.maxWorms, 8); // Cap to avoid flakiness
  document.body.classList.add("automation"); // Hide portrait lock
  window.screen?.orientation?.lock("landscape"); // Force landscape
}
```

**Test Entry Points:**

- `http://localhost:8000/src/pages/game.html?level=beginner` — Direct game
- Playwright uses `playwright.config.js` and `playwright.competition.config.js`
- Tests in `tests/` directory (19 spec files, 288 tests)

---

## 11. Common Debugging Tips

### Performance Monitoring

Press **'P'** in game to toggle performance monitor overlay:

- **FPS** — Target 55–60
- **DOM queries/sec** — Should be <150 (cache hits)
- **Worms on screen** — Limit to 8 in automation

### Logging Prefixes

Grep for emoji prefixes in console:

- 🎮 `game.js` modules
- 🔒 `lock-manager.js`
- 🐛 `worm.js`
- 🎯 `3rdDISPLAY.js`
- 📊 `performance-monitor.js`

### Disable Audio

Add to URL: `?disable-audio=1` to skip audio system init

### Lock Component Testing

`?lockComponent=Line-3-transformer.html` loads specific lock level for testing

---

## 12. Refactoring Status

Large files split by dotted naming (e.g., `worm-system.gameover.js` extracted from monolith):

| File                                   | Status  | Action                                            |
| -------------------------------------- | ------- | ------------------------------------------------- |
| `worm-system.*.js` (12 files)          | ✅ DONE | Behavior, GameOver, Movement, Effects modularized |
| `worm-powerups.*.js` (11 files)        | ✅ DONE | Effects, UI, Draggable, Selection separated       |
| `utils-achievements.*.js` (3 files)    | ✅ DONE | Definitions, Logic, UI split                      |
| `utils-combo.*.js` (2 files)           | ✅ DONE | Logic, UI separated                               |
| `lazy-component-loader.*.js` (3 files) | ✅ DONE | Lock manager extracted to own file                |
| `lock-manager.*.js` (5 files)          | ✅ DONE | Loader, animations, events, templates modularized |

See [REFACTORING_PLAN.csv](REFACTORING_PLAN.csv) for full breakdown.

---

## Summary

**MathMasterHTML** is a **highly modularized, event-driven game engine** built with vanilla JS and CSS. The architecture prioritizes:

1. ✅ **Event-driven communication** — No direct function calls between modules
2. ✅ **Three-panel UI** — Cleanly separated concerns (problem, game world, symbols)
3. ✅ **Performance** — Caching, spatial hashing, object pooling, quality tier management
4. ✅ **Testability** — Playwright comprehensive test suite (288 tests)
5. ✅ **Maintainability** — Module split by concern, centralized constants, emoji logging
6. ✅ **Accessibility** — WCAG AA minimum, reduced-motion support, keyboard shortcuts

The codebase is production-ready for competition phases with active monitoring, responsive layout, PWA support, and robust error handling.
