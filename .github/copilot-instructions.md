# Math Master Algebra - AI Agent Instructions

Educational math game with Matrix-themed UI where players solve algebra equations by clicking falling symbols. **Pure HTML/CSS/JS at runtime with no framework or bundler in the game itself.**

## Repo Reality Check

- The game runtime is browser-native and script-tag driven.
- `npm` **is used in this repository** for local serving, linting, verification, type-checking, and Playwright test workflows.
- Playwright is the active browser automation stack.
- If workspace tasks mention Maven or other non-Node commands for this repo, treat them as stale until corrected.

## Quick Start

```powershell
# Install tooling dependencies
npm install

# Start local server (REQUIRED - file:// causes CORS errors)
npm start  # or: python -m http.server 8000

# Open: http://localhost:8000/game.html?level=beginner
# Press 'P' to toggle performance monitor

# Verify code quality before committing
npm run verify

# Browser tests
npm test
```

## ⚠️ Critical Rules

### 1. Event-Driven Architecture (MANDATORY)

All inter-module communication uses DOM events. **Never call functions directly between modules.**

```javascript
// ✅ Correct
document.dispatchEvent(new CustomEvent('symbolClicked', { detail: { symbol: 'X' } }));

// ❌ Wrong - NEVER do this
game.handleSymbolClick('X');
```

**Core Event Flow:** `symbolClicked` → `symbolRevealed` → `first-line-solved` → `problemLineCompleted` → `lockLevelActivated`

### 2. CSS Override Warning

**Panel A & B font sizes CANNOT be changed via CSS** - `src/scripts/display-manager.js` applies inline styles that override everything (including `!important`). Edit the JS sizing logic, not CSS.

### 3. File Corruption Risk

`src/styles/worm-styles.css` / legacy worm style surfaces have corruption history. Always backup before editing. Check for malformed `@keyframes`, unclosed braces.

## Architecture: Three-Panel System

```
Panel A: Problem display + Lock animation     → `src/scripts/game*.js`, `src/scripts/lock-manager*.js`
Panel B: Solution steps + Worms + Console     → `src/scripts/worm.js`, `src/scripts/worm-system.*.js`, `src/scripts/console-manager*.js`
Panel C: Falling symbols (Matrix rain)        → `src/scripts/3rdDISPLAY.js`, symbol-rain helpers
```

**Key Modules:**

| Module | Purpose |
|--------|---------|
| `game.js` + `game-*.js` | Core loop, problem validation, symbol revelation |
| `worm.js` | Worm core class (constructor + initialization only) |
| `worm-system.*.js` | Worm AI modules: events, spawn, behavior, gameover, movement, interactions, effects, cleanup |
| `worm-powerups.*.js` | Two-click power-up system: core, selection, UI, UI.draggable, effects |
| `3rdDISPLAY.js` | Symbol rain with spatial hash collision detection |
| `lock-manager.js` | Progressive lock via HTML injection from `lock-components/` |
| `display-manager.js` | Responsive font sizing (**applies inline styles!**) |
| `constants.js` | Centralized game constants (use instead of magic numbers) |
| `utils-achievements.*.js` | Achievement system: definitions (data), logic, UI (popup rendering) |
| `utils-combo.*.js` | Combo system: tracking logic + UI display (separated) |
| `lazy-component-loader.*.js` | Lazy loading: core loader, lock manager integration, initialization |

## Data Flow: Problem Loading

Problems in `Assets/{Level}_Lvl/*.md` are parsed with regex and fed into the game loaders.

```markdown
1. `2x + 5 = 15`
   - 2x + 5 - 5 = 15 - 5
   - 2x = 10
   - x = 5
```

## Worm System (`src/scripts/worm.js`)

**Split Files:** Worm logic is now partitioned into `worm-system.*.js` helpers (behavior, gameover, spawn, movement, effects, etc.). Keep changes within the correct helper file and preserve the event-driven flow. Game-over detection/UI is in `worm-system.gameover.js`.

Do not collapse helper responsibilities back into large monolith files unless there is a very strong reason.

**Lifecycle:** Spawn → Roaming (5-10s) → Targeting → Stealing → Destruction

**Difficulty Scaling** (in `difficultySettings` object):

- Beginner: 3 worms/row, 1.0x speed
- Warrior: 5 worms/row, 1.5x speed  
- Master: 8 worms/row, 2.0x speed

**Purple Worms** (boss enemies): Spawn after 4+ wrong answers. Can ONLY be killed via Panel C rain symbol - clicking directly spawns green clone as punishment.

**Power-ups** (10% drop rate): Chain Lightning (⚡), Spider (🕷️), Devil (👹)
**Power-up Events:** Use `powerUpActivated` for placement activation and register handlers in `window.WormPowerUpEffectsRegistry` to keep effects decoupled.

## Symbol Matching & Console

**Case-Insensitive Matching:** `'X' === 'x'` - symbol matching is case-insensitive. Normalization in `isSymbolInCurrentLine()` and `revealSpecificSymbol()` in `game.js`.

**3×3 Console Grid:** Quick-access symbol storage with keyboard shortcuts:
- Keys **1-9** map to console slots (left-to-right, top-to-bottom)
- Uses `pointerdown` for instant touch response
- Dispatches `symbolClicked` events like Panel C rain

## Performance Patterns

**DO:**

- Use `constants.js` for magic numbers
- Cache DOM queries with time-based invalidation (`CACHE_DURATION_TARGETS = 100ms`)
- Use spatial hash grid for collision detection (`GRID_CELL_SIZE = 100px`)
- Use `pointerdown` instead of `click` for touch (~200ms improvement)
- Defer heavy init with `requestIdleCallback` or `setTimeout(cb, 1)`

**ALSO DO:**

- Prefer fixing repo/tooling truth before deep refactors.
- Keep Playwright and documentation aligned with actual runtime entrypoints.
- Treat event payloads as contracts when changing cross-module behavior.

**DON'T:**

- Use `transition: all` (GPU thrashing)
- Query DOM in animation loops (use cached values)
- Add per-element event listeners (use delegation)
- Block `requestAnimationFrame` with sync operations

## Debugging

**Console Emoji Prefixes:**

- 🎮 `game.js` | 🔒 `lock-manager.js` | 🐛 `worm.js` | 🎯 `3rdDISPLAY.js` | 📊 `performance-monitor.js`

**Common Issues:**

- CORS errors → Start local HTTP server
- Symbols not falling → Check `requestAnimationFrame` not blocked
- Worms frozen → Verify `WormSystem.animationFrameId` is not null
- Lock not animating → Check `lock-components/` HTML load in console

## Testing Checklist

- [ ] `npm run verify` passes
- [ ] All 3 levels: `?level=beginner|warrior|master`
- [ ] Press 'P' - FPS should be 55-60, DOM queries < 150/sec
- [ ] Worm spawning on line completion
- [ ] Purple worm after 4+ wrong answers
- [ ] Lock animation progresses through 6 levels
- [ ] No console errors

## Competition Planning Docs

- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md` - approved planning roadmap
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md` - file-targeted implementation matrix

## Module Split Convention

Large files are split by concern using dot-notation: `<module>.<concern>.js`

- **Data/definitions** → `utils-achievements.definitions.js`
- **UI/rendering** → `utils-achievements.ui.js`, `utils-combo.ui.js`
- **Drag/interaction** → `worm-powerups.ui.draggable.js`
- **Game-over logic** → `worm-system.gameover.js`
- **Initialization** → `lazy-component-loader.init.js`

When splitting, keep `window.*` exports intact and load new files in `game.html` before any module that depends on them.

## Key Documentation

- `Docs/ARCHITECTURE.md` - Worm system design and state machine
- `Docs/DEVELOPMENT_GUIDE.md` - Coding standards, recent changes
- `Docs/PERFORMANCE.md` - Optimization patterns and results
- `Docs/COMPETITION_PHASE1_ARCHITECTURAL_ROADMAP.md` - competition productionization roadmap
- `Docs/COMPETITION_PHASE1_EXECUTION_MATRIX.md` - execution order, validation, rollback plan
- `REFACTORING_PLAN.csv` - Full catalog of large files with split status and recommendations
