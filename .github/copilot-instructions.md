# Math Master Algebra - AI Agent Instructions

Educational math game with Matrix-themed UI. Players solve algebra by clicking falling symbols. Pure HTML/CSS/JS - **no build tools, no dependencies**.

**Critical**: This project uses event-driven architecture and inline style overrides. Read the warnings below before editing.

## ⚠️ Critical Rules - Read First

### 1. CSS Override Warning
**Panel A & B font sizes CANNOT be changed via CSS** - JS applies inline styles that override everything (including `!important`).

To change mobile fonts:
- Edit `js/display-manager.js` lines 95-110 (NOT `css/game.css`)
- Current multipliers: Problem 40%, Solution 45%, Falling Symbols 180%
- See `Docs/CSS_Override_Investigation.md` for full explanation

### 2. Event-Driven Architecture
**All inter-module communication uses DOM events** - never call functions directly between modules.

```javascript
// ✅ Correct - dispatch event
document.dispatchEvent(new CustomEvent('symbolClicked', { detail: { symbol: 'X' } }));

// ❌ Wrong - direct function call
game.handleSymbolClick('X');
```

Key events: `symbolClicked`, `symbolRevealed`, `first-line-solved`, `problemLineCompleted`, `lockLevelActivated`

### 3. No Build Process Required
- Open `game.html` directly in browser via local server: `python -m http.server 8000`
- Access via `http://localhost:8000/game.html?level=beginner`
- **Never use `file://` protocol** - causes CORS issues with problem loading

## Architecture: Three-Panel System

### Panel Layout (`game.html`)
```html
<div class="game-container">
  <div class="display">...</div>  <!-- Panel A: Problem + Lock -->
  <div class="wall"></div>
  <div class="display">...</div>  <!-- Panel B: Solution + Worms + Console -->
  <div class="wall"></div>
  <div class="display">...</div>  <!-- Panel C: Falling Symbols -->
</div>
```

- **Panel A**: Problem display + progressive lock animation
- **Panel B**: Step-by-step solution + worm battleground + 3×3 symbol console  
- **Panel C**: Falling symbols (Matrix rain effect)

### Module Responsibilities
| Module | Purpose | Key Methods |
|--------|---------|-------------|
| `game.js` | Core loop, problem validation, symbol revelation | `setupProblem()`, `revealSpecificSymbol()` |
| `3rdDISPLAY.js` | Symbol rain animation (Panel C), spatial hash collision | `createFallingSymbol()`, `updateSpatialGrid()` |
| `lock-manager.js` | Progressive lock via HTML component injection | `progressLockLevel()`, `loadLockComponent()` |
| `worm.js` | Enemy AI: roam → target → steal → destruction | `spawnWormFromBorder()`, `explodeWorm()` |
| `console-manager.js` | 3×3 quick-access grid (keyboard 1-9) | `addSymbolToConsole()`, `handleSlotClick()` |
| `display-manager.js` | **Responsive font sizing (applies inline styles!)** | `applyFontSizes()` |
| `performance-monitor.js` | FPS/DOM query tracking (toggle with 'P') | `updateMetrics()` |


## Event-Driven Communication

Components communicate **exclusively via DOM events**. Never add direct function calls between modules.

**Core Event Flow:**
1. User clicks symbol → `symbolClicked` event
2. `game.js` validates → `symbolRevealed` event
3. First correct answer → `first-line-solved` event → lock animation starts
4. Line complete → `problemLineCompleted` event → worm spawns + lock progresses
5. Problem complete → `problemCompleted` event → reset state

**Event Catalog:**
```javascript
// User interactions
new CustomEvent('symbolClicked', { detail: { symbol: 'X' } })
new CustomEvent('symbolRevealed', { detail: { symbol: 'X' } })

// Game progression
new Event('first-line-solved')
new CustomEvent('problemLineCompleted', { detail: { lineNumber: 1 } })
new CustomEvent('problemCompleted')

// Lock system
new CustomEvent('lockLevelActivated', { detail: { level: 2 } })

// Worm system
new CustomEvent('wormSymbolCorrect', { detail: { symbol: 'X' } })
new CustomEvent('purpleWormTriggered', { detail: { wrongAnswers: 4 } })
```

## Data Flow: Problem Loading

Problems are stored in Markdown files (`Assets/{Level}_Lvl/*.md`) and parsed on load:

**Regex Parser:** `/(\d+)\.\s+\`([^\`]+)\`\s*\n((?:\s*-[^\n]+\n?)+)/g`
- Group 1: Problem number
- Group 2: Problem equation (inside backticks)
- Group 3: Solution steps (lines starting with `-`)

**Example Format:**
```markdown
1. `2x + 5 = 15`
   - 2x + 5 - 5 = 15 - 5
   - 2x = 10
   - x = 5
```

**Parsed Structure:**
```javascript
{
  problem: "2x + 5 = 15",
  steps: ["2x + 5 - 5 = 15 - 5", "2x = 10", "x = 5"]
}
```

## Lock Animation System (`js/lock-manager.js`)

**Pattern:** Lock animation loads HTML components progressively from `lock-components/` directory.

**6 Lock Levels:** Each level loads an HTML file when solution line completes:
- Level 1: `Line-1-transformer.html` (triggered by `first-line-solved`)
- Level 2-6: `line-{N}-transformer.html` (triggered by `problemLineCompleted`)

**Note:** File naming is inconsistent (`Line-1` vs `line-2`). `normalizeComponentName()` handles this.

**Special Case - Line 3:** Force-reloaded with 300ms delay before activation (hardcoded in event handler).

## Worm System (`js/worm.js`)

**Worm Lifecycle:**
1. **Spawn**: Row-based spawning system triggered by `problemLineCompleted` event
2. **Roaming**: Worm crawls randomly across Panel B for 5-10 seconds
3. **Targeting**: When `symbolRevealed` event fires, roaming worms rush to steal that symbol
4. **Stealing**: Worm reaches symbol, turns it gray/strikethrough, carries it away
5. **Destruction**: User clicks matching symbol in Panel C rain OR clicks worm directly → explosion

**Row-Based Spawning System:**
- **First Row**: Spawns 5 worms (`wormsPerRow = 5`)
- **Subsequent Rows**: Same 5 worms per row (no escalation, `additionalWormsPerRow = 0`)
- **Spawn Location**: Worms spawn from viewport borders in staggered positions
- **Max Worms**: 999 (effectively unlimited, `maxWorms = 999`)
- **Spawn Queue**: Uses batching system to prevent frame drops during mass spawning

**Purple Worm Mechanics (Advanced Enemy):**

Purple worms are boss-level enemies with special behaviors that require strategic gameplay.

- **Spawn Trigger**: 4+ wrong answers triggers purple worm spawn (`purpleWormTriggered` event)

- **Symbol Stealing Priority**:
  - **First**: Steal red (hidden) symbols only
  - **Fallback**: If NO red symbols available, can steal blue (revealed) symbols
  - This makes purple worms more dangerous as problems near completion

- **Click Punishment Mechanic**:
  - Clicking purple worm directly → Spawns GREEN clone worm (not purple)
  - Green clone can be killed normally (click or rain symbol)
  - Purple worm itself remains active
  - **Intended behavior**: Punishes players for using wrong strategy

- **Correct Kill Method**:
  - Purple worms can ONLY be killed by clicking the matching symbol in Panel C rain
  - Example: Purple worm carrying "X" → Click "X" in falling symbols → Purple worm explodes
  - Forces players to engage with Panel C symbol rain system

- **Difficulty Escalation**:
  - Purple worms are intentionally harder to deal with
  - Creates strategic depth (learn correct kill method vs brute force clicking)
  - Skill progression mechanic (beginners struggle, experienced players know the strategy)

**Power-Up System:**
- **Chain Lightning** (⚡): Kills 5 worms initially, +2 per subsequent use (click power-up icon, then click worm to target)
- **Spider** (🕷️): Spawns spider that converts worms to spiders (chain reaction), click spider → ❤️ → 💀
- **Devil** (👹): Click to place devil, worms rush to it and die after 5s proximity
- **Collection**: Power-ups have 10% drop chance from any killed worm
- **Display**: Shows in help button tooltip with current counts
- **Activation**: Click power-up icon in tooltip (NO keyboard shortcuts)

**Cloning Curse (REMOVED - October 2025):**
- **Status**: Curse mechanic completely removed from codebase
- **Code Cleanup**: All `cloningCurseActive` flags, tracking arrays, and related methods eliminated
- **Kill Methods**: All worms (green and purple) explode on direct click OR rain symbol click
- **Purple Worms Exception**: Purple worms use different mechanic (see above)

**Key Mechanics:**
- **No Worm Limit**: Effectively unlimited worms (`maxWorms = 999`)
- **Spawn Sources**: Border spawning system (not console slots)
- **Console Slots**: Still used for worm spawn animation but not spawn limitation
- **Position**: Updated via `requestAnimationFrame` loop, NOT CSS transitions
- **Symbol Matching**: Case-insensitive ('X' === 'x')

**CSS Classes:**
- `.worm-container`: Main wrapper (z-index: 10000)
- `.worm-segment`: Body parts (9px × 9px)
- `.worm-segment:first-child`: Head (12px × 12px with eyes)
- `.flickering`: LSD rainbow animation
- `.worm-clicked`: Explosion animation
- `.slime-splat`: Green splat mark after explosion

## Symbol Console System (`js/console-manager.js`)

**3x3 Grid Quick Access:**
- 9 slots for storing frequently used symbols
- Keyboard shortcuts: Keys 1-9 to click respective slots
- Visual feedback: Glow effect on hover, click animations
- Integration: Dispatches `symbolClicked` events just like Panel C rain
- Worm spawn points: Empty slots glow green when worm emerges
- **Touch Optimization**: Uses `pointerdown` for instant response (reduces ~200ms mobile latency)

**Console Slot States:**
- Empty: Available for worm spawn
- Filled: Contains a symbol, user can click
- Locked: Worm is spawning/active from this slot (`.locked` class)
- Worm Spawning: Special slide-open animation (`.worm-spawning` class)
- Clicked: Purple pulsate animation on click (`.clicked` class, 600ms duration)

## Symbol Rain System (`js/3rdDISPLAY.js`)

**Guaranteed Spawn System:**
- Every symbol is guaranteed to appear at least once every 5 seconds (`GUARANTEED_SPAWN_INTERVAL`)
- Prevents players from getting stuck waiting for rare symbols
- Tracks last spawn time per symbol in `lastSpawnTime` object
- Forced spawns override random column selection

**Symbol Array:**
```javascript
['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', 'x', '+', '-', '=', '÷', '×']
```

**Rendering:**
- Desktop: Vertical falling symbols (top to bottom)
- Mobile: Symbols may fall differently based on viewport (check `isMobileMode`)
- Column-based spawning with random horizontal offset (±30px)
- Symbol fall speed: 0.6 (base), increases to max 6 over time
- Global counter `window.symbolRainActiveCount` tracks active symbols for performance monitor

## Development Workflow

*   **No Build Process**: Pure HTML/CSS/JS - no npm, webpack, or bundlers
*   **Local Testing**: **REQUIRED** - Use local server to avoid CORS issues
    ```powershell
    python -m http.server 8000
    ```
*   **Access**: `http://localhost:8000/game.html?level=beginner`
*   **Level Testing**: Test with URL parameters: `?level=beginner|warrior|master`
*   **Debugging**: Console uses emoji-prefixed logs (🎮, 🔒, 🐛, 🐍) for easy filtering
*   **Performance**: Press 'P' key to toggle performance overlay

## Deployment

*   **Platforms**: GitHub Pages, Netlify, Vercel, Cloudflare Pages (all free)
*   **Live Site**: `https://teachereven.github.io/MathMasterHTML/`
*   **Guide**: See `DEPLOYMENT_GUIDE.md` for platform-specific instructions

## Performance Optimizations

**Critical Startup Performance Pattern:**
*   Symbol rain (`3rdDISPLAY.js`) starts immediately without waiting for `DOMContentLoaded` to ensure smooth animation from page load.
*   Heavy operations (problem loading, lock initialization) are deferred using `requestIdleCallback` or `setTimeout(cb, 1)` to prevent blocking the animation loop.
*   **Never add synchronous blocking operations during initialization** - use deferred execution for non-critical UI setup.

**Spatial Hash Grid Collision Detection:**
*   `3rdDISPLAY.js` uses a spatial hash grid for O(n) collision detection instead of O(n²).
*   Grid cell size: 100px (`GRID_CELL_SIZE`)
*   Functions: `getCellKey()`, `updateSpatialGrid()`, `getNeighborCells()`
*   This optimization is critical for performance with many falling symbols

**DOM Query Caching:**
*   `worm.js` caches frequently queried DOM elements with time-based invalidation
*   `getCachedRevealedSymbols()`: Refreshes every 100ms (`CACHE_DURATION_TARGETS`)
*   `getCachedContainerRect()`: Refreshes every 200ms (`CACHE_DURATION_RECT`)
*   Call `invalidateSymbolCache()` when symbols change to force cache refresh

**Performance Monitor:**
*   Toggle overlay with 'P' key during development
*   Tracks FPS, DOM queries/sec, active worms, symbol count, frame time
*   Color-coded metrics: Green (good), Yellow (warning), Red (critical)
*   Wraps `querySelectorAll` and `querySelector` to count DOM queries automatically

**Optimization Patterns (Panel C - October 2025):**
*   ✅ **CSS Transitions**: Only transition specific properties (color, text-shadow, transform), NOT `all` to prevent GPU thrashing
*   ✅ **Guaranteed Spawn**: Moved to 1-second interval instead of checking every frame (98% reduction in checks)
*   ✅ **Container Height Caching**: Query once, update only on resize to eliminate layout thrashing
*   ✅ **Event Delegation**: Single click listener on container instead of per-symbol listeners (prevents memory leaks)
*   ✅ **Tab Visibility Throttling**: Reduces animation to ~1fps when tab hidden (95% CPU savings)
*   ✅ **DOM Element Pooling**: Reuses 30 pooled elements to reduce GC pressure
*   ✅ **Pseudo-element Removal**: Removed `::before` elements to halve render layers (200+ → 100)
*   ✅ **Resize Debouncing**: 250ms delay prevents excessive recalculation on window resize
*   ✅ **Touch/Pointer Optimization**: Uses `pointerdown` for instant mobile response (reduces input latency)

**Performance Results (Desktop):**
*   FPS improvement: 48-52 → 58-60 (+20%)
*   Frame time: 19-21ms → 15-17ms (-20%)
*   DOM queries: 180-220/sec → 80-120/sec (-45%)
*   Memory growth: 8MB/min → 2MB/min (-75%)
*   FPS improvement: 48-52 → 58-60 (+20%)
*   Frame time: 19-21ms → 15-17ms (-20%)
*   DOM queries: 180-220/sec → 80-120/sec (-45%)
*   Memory growth: 8MB/min → 2MB/min (-75%)

## Common Pitfalls & Key Conventions

1.  **CSS Overrides**: Do not try to style mobile font sizes or lock scaling with CSS. Edit the JavaScript files directly.
2.  **X/x Symbol Matching**: The game logic must treat 'X' and 'x' as the same symbol. Normalization is performed in `isSymbolInCurrentLine()` and `revealSpecificSymbol()` in `game.js`.
3.  **Worm Movement**: Worm positioning is handled entirely by JavaScript in `js/worm.js`. Do not use CSS transitions or animations for worm movement.
4.  **Event-Driven Logic**: When adding features, use `document.dispatchEvent` and `document.addEventListener` to communicate between modules.
5.  **File Integrity**: The `css/worm-styles.css` file may contain syntax errors. If worm styling breaks, check this file first for corruption.
6.  **Local Server Required**: Opening `game.html` directly as `file://` will fail due to CORS. Always use a local HTTP server.
7.  **URL Parameters**: Game state depends on URL params - always test with `?level=beginner|warrior|master` parameter.
8.  **Touch Events**: Always use `pointerdown` instead of `click` for interactive elements to reduce mobile input latency (~200ms improvement).

## Performance Anti-Patterns (Avoid These!)

**❌ DO NOT:**
- Use `transition: all` on animated elements (causes GPU thrashing)
- Query DOM properties (`offsetHeight`, `getBoundingClientRect`) in animation loops
- Add event listeners to dynamically created elements (use event delegation)
- Use `::before` or `::after` pseudo-elements on elements with 100+ instances
- Check timers/intervals in `requestAnimationFrame` loops (use separate intervals)
- Forget to throttle/pause animations when tab is hidden
- Skip debouncing on resize/scroll handlers
- Create new DOM elements without pooling/recycling

**✅ DO:**
- Cache DOM measurements and update only on resize
- Use event delegation for dynamic content
- Implement object pooling for frequently created/destroyed elements
- Move expensive checks out of animation loops into intervals
- Use Page Visibility API to throttle when tab hidden
- Debounce resize handlers (250ms recommended)
- Profile with Performance Monitor ('P' key) during development

## Known Issues & Debugging

**CSS File Corruption:**
*   `css/worm-styles.css` has had parsing errors in the past (see `Docs/Performance_Audit_Report.md`)
*   Backup files: `worm-styles.css.backup`, `worm-styles.css.corrupted`
*   Watch for: Malformed `@keyframes`, unclosed braces, typos like `opacit` instead of `opacity`

**Console Logging Convention:**
*   All modules use emoji prefixes for easy filtering in browser console:
    - 🎮 = `game.js` (core game logic)
    - 🔒 = `lock-manager.js` (lock animation)
    - 🐛 = `worm.js` (worm system)
    - 📊 = `performance-monitor.js`
    - 🎯 = `3rdDISPLAY.js` (symbol rain)
    - 🎮 = `console-manager.js`
*   Example: `console.log('🐛 Worm System received problemLineCompleted event:', event.detail);`

**URL Parameters:**
*   Game accepts query parameters: `?level=beginner|warrior|master`
*   Example: `game.html?level=master` loads Master difficulty
*   Lock component override: `?lockComponent=level-1-transformer.html` (debugging only)

**Common Animation Issues:**
*   If symbols don't fall smoothly, check if heavy operations are blocking `requestAnimationFrame` loop
*   If worms don't move, verify `WormSystem.animationFrameId` is not null
*   If lock doesn't animate, check browser console for HTML component load failures from `lock-components/`

## Documentation Structure

The `Docs/` directory contains critical project knowledge:

*   **`DEVELOPMENT_GUIDE.md`**: Development best practices, recent code cleanup (October 2025), magic numbers guide, power-up status, testing guidelines, and common pitfalls. Read this for workflow and coding standards.
*   **`ARCHITECTURE.md`**: Worm system architecture, lifecycle state machine, game balance considerations, event-driven communication, and technical implementation details. Read this to understand the adversarial gameplay mechanics.
*   **`PERFORMANCE.md`**: Performance optimization guide with completed optimizations (Panel C, worm system, mobile), known bottlenecks, profiling techniques, and optimization patterns. Read this before making performance-critical changes.
*   **`CSS_Override_Investigation.md`**: Deep dive into why CSS font size changes are ignored - explains inline style priority and specificity hierarchy. Read this FIRST before attempting any Panel A/B styling changes.
*   **`CODEBASE_AUDIT_REPORT_V2.md`**: Comprehensive audit report with code quality findings, dead code analysis, and optimization opportunities. Reference for understanding technical debt.

**When debugging:** Always check relevant docs before making changes - they contain context about WHY certain patterns exist.

## Git Workflow & Version Control

*   **Repository**: `https://github.com/TeacherEvan/MathMasterHTML`
*   **Main Branch**: `main` (default branch)
*   **Deployment**: Auto-deploys to GitHub Pages on push to `main`
*   **Commit Convention**: Use emoji prefixes matching console logs (🎮, 🔒, 🐛, 📊, 🎯) for easy tracking
*   **Testing Before Push**: Always test locally with `python -m http.server 8000` before pushing to main
*   **Critical Files**: Never commit changes to `css/worm-styles.css` without backup - file has history of corruption
