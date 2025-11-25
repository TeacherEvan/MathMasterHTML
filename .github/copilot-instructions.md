# Math Master Algebra - AI Agent Instructions

Educational math game with Matrix-themed UI where players solve algebra equations by clicking falling symbols. **Pure HTML/CSS/JS - no build tools, no npm, no dependencies.**

## Quick Start

```powershell
# Install dependencies (optional - for linting)
npm install

# Start local server (REQUIRED - file:// causes CORS errors)
npm start  # or: python -m http.server 8000

# Open: http://localhost:8000/game.html?level=beginner
# Press 'P' to toggle performance monitor

# Verify code quality before committing
npm run verify
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

**Panel A & B font sizes CANNOT be changed via CSS** - `js/display-manager.js` applies inline styles that override everything (including `!important`). Edit lines 95-110 in JS, not CSS.

### 3. File Corruption Risk

`css/worm-styles.css` has corruption history. Always backup before editing. Check for malformed `@keyframes`, unclosed braces.

## Architecture: Three-Panel System

```
Panel A: Problem display + Lock animation     → js/game.js, js/lock-manager.js
Panel B: Solution steps + Worms + Console     → js/worm.js, js/console-manager.js  
Panel C: Falling symbols (Matrix rain)        → js/3rdDISPLAY.js
```

**Key Modules:**

| Module | Purpose |
|--------|---------|
| `game.js` | Core loop, problem validation, symbol revelation |
| `worm.js` | Enemy AI: roam → target → steal → destruction (2172 lines, main complexity) |
| `3rdDISPLAY.js` | Symbol rain with spatial hash collision detection |
| `lock-manager.js` | Progressive lock via HTML injection from `lock-components/` |
| `display-manager.js` | Responsive font sizing (**applies inline styles!**) |
| `constants.js` | Centralized game constants (use instead of magic numbers) |

## Data Flow: Problem Loading

Problems in `Assets/{Level}_Lvl/*.md` are parsed with regex:

```markdown
1. `2x + 5 = 15`
   - 2x + 5 - 5 = 15 - 5
   - 2x = 10
   - x = 5
```

## Worm System (`js/worm.js`)

**Lifecycle:** Spawn → Roaming (5-10s) → Targeting → Stealing → Destruction

**Difficulty Scaling** (in `difficultySettings` object):

- Beginner: 3 worms/row, 1.0x speed
- Warrior: 5 worms/row, 1.5x speed  
- Master: 8 worms/row, 2.0x speed

**Purple Worms** (boss enemies): Spawn after 4+ wrong answers. Can ONLY be killed via Panel C rain symbol - clicking directly spawns green clone as punishment.

**Power-ups** (10% drop rate): Chain Lightning (⚡), Spider (🕷️), Devil (👹)

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

- [ ] All 3 levels: `?level=beginner|warrior|master`
- [ ] Press 'P' - FPS should be 55-60, DOM queries < 150/sec
- [ ] Worm spawning on line completion
- [ ] Purple worm after 4+ wrong answers
- [ ] Lock animation progresses through 6 levels
- [ ] No console errors

## Key Documentation

- `Docs/ARCHITECTURE.md` - Worm system design and state machine
- `Docs/DEVELOPMENT_GUIDE.md` - Coding standards, recent changes
- `Docs/PERFORMANCE.md` - Optimization patterns and results
