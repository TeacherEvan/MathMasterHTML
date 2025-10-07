# Math Master Algebra - AI Coding Agent Instructions

## Project Overview
Educational math game with a Matrix-themed UI where players solve algebra problems by clicking falling symbols. Features progressive lock animations, adversarial worm mechanics, and a quick-access symbol console.

**Tech Stack**: Pure HTML5, CSS3, vanilla JavaScript (ES6+). Zero build process, zero dependencies.

## ⚠️ CRITICAL: CSS Override Warning

**Panel A & B font sizes CANNOT be changed via CSS alone!**

JavaScript applies inline styles that override any CSS rules (including `!important`). To change mobile font sizes for `#problem-container` or `#solution-container`, you **MUST** edit `js/display-manager.js`.

1.  **Edit `js/display-manager.js`**, NOT `css/game.css`.
2.  Modify the multiplier values in the `applyFontSizes()` method (around lines 95-110).
3.  **Current Mobile Font Multipliers**:
    *   Problem Container: `calc(${config.fontSize} * 0.40)` (40% of base)
    *   Solution Container: `calc(${config.fontSize} * 0.45)` (45% of base)
    *   Falling Symbols: `calc(${config.fontSize} * 1.8)` (180% of base - injected via `<style>` tag with `!important`)

See `Docs/CSS_Override_Investigation.md` for full investigation. Any CSS changes to these elements will be silently ignored.

## Architecture: Three-Panel System & Module Organization

### Panel Layout (`game.html`)
*   **Panel A (Left)**: Problem Display (`#problem-container`) & Lock Animation (`#lock-display`).
*   **Panel B (Middle)**: Step-by-step solution (`#solution-container`), worm battleground (`#worm-container`), and 3x3 symbol console (`#symbol-console`).
*   **Panel C (Right)**: Falling symbols (`#symbol-rain-container`) managed by `js/3rdDISPLAY.js`.

**HTML Structure**:
```html
<div class="game-container">
  <div class="display">...</div>           <!-- Panel A -->
  <div class="wall"></div>
  <div class="display">...</div>           <!-- Panel B -->  
  <div class="wall"></div>
  <div class="display">...</div>           <!-- Panel C -->
</div>
```

### JavaScript Module Responsibilities
- `game.js` - Core game loop, problem loading/validation, symbol revelation logic
- `3rdDISPLAY.js` - Symbol rain animation (Panel C), spatial hash grid collision detection
- `lock-manager.js` - Progressive lock animation via HTML component injection
- `worm.js` - Enemy AI system with roaming/targeting/stealing behaviors
- `console-manager.js` - 3x3 quick-access symbol grid with keyboard shortcuts (1-9)
- `display-manager.js` - Responsive font sizing (applies inline styles that override CSS!)
- `lock-responsive.js` - Lock scaling for mobile viewports
- `performance-monitor.js` - FPS/DOM query tracking overlay (toggle with 'P' key)


## Critical Event-Driven Communication

The game is **100% event-driven**. Components do not call each other directly. They communicate using custom DOM events dispatched on `document`.

**Core Event Flow:**
1.  User clicks symbol → `symbolClicked` event (from Panel C rain OR Panel B console)
2.  `game.js` validates symbol via event listener
3.  First correct answer → `first-line-solved` event dispatched
4.  `LockManager.startLockAnimation()` listens for `first-line-solved`
5.  Line complete → `problemLineCompleted` event dispatched
6.  `LockManager.progressLockLevel()` and `WormSystem.spawnWormFromConsole()` listen for `problemLineCompleted`

**Event Catalog:**
```javascript
// Dispatched by 3rdDISPLAY.js and console-manager.js
new CustomEvent('symbolClicked', { detail: { symbol: 'X' } })

// Dispatched by game.js when symbol revealed in solution
new CustomEvent('symbolRevealed', { detail: { symbol: 'X' } })

// Dispatched by game.js when first correct answer
new CustomEvent('first-line-solved')

// Dispatched by game.js when solution line complete
new CustomEvent('problemLineCompleted', { detail: { lineNumber: 1 } })

// Dispatched by game.js when entire problem solved
new CustomEvent('problemCompleted')

// Dispatched by lock-manager.js when lock level changes
new CustomEvent('lockLevelActivated', { detail: { level: 2 } })

// Dispatched by game.js - worm-related events
new CustomEvent('wormSymbolCorrect', { detail: { symbol: 'X' } })
new CustomEvent('wormSymbolSaved', { detail: { symbol: 'X' } })

// Dispatched when symbol added to console
new CustomEvent('consoleSymbolAdded', { detail: { symbol: 'X', position: 0 } })

// Dispatched by display-manager.js on viewport changes
new CustomEvent('displayResolutionChanged', { detail: { isMobile: true } })

// Dispatched by lock-responsive.js
new CustomEvent('lockScaleChanged', { detail: { scale: 0.8 } })
```

**Adding New Features:** Use `document.dispatchEvent()` and `document.addEventListener()` for inter-module communication. Never add direct function calls between `game.js`, `lock-manager.js`, `worm.js`, etc.

## Data Flow: Problem Loading

*   Problems are stored in Markdown files in `Assets/{Level}_Lvl/`:
    - `Assets/Beginner_Lvl/beginner_problems.md` (Addition/Subtraction)
    - `Assets/Warrior_Lvl/warrior_problems.md` (Multiplication)
    - `Assets/Master_Lvl/master_problems.md` (Division)
*   `js/game.js` fetches and parses these files using `parseProblemsFromMarkdown()` function
*   **Regex Parser**: `/(\d+)\.\s+\`([^\`]+)\`\s*\n((?:\s*-[^\n]+\n?)+)/g`
    - Group 1: Problem number
    - Group 2: Problem equation (inside backticks)
    - Group 3: Solution steps (lines starting with `-`)

**Example Markdown Format:**
```markdown
1. `2x + 5 = 15`
   - 2x + 5 - 5 = 15 - 5
   - 2x = 10
   - x = 5

2. `3x - 7 = 14`
   - 3x - 7 + 7 = 14 + 7
   - 3x = 21
   - x = 7
```

**Parsed Structure:**
```javascript
{
  problem: "2x + 5 = 15",
  steps: ["2x + 5 - 5 = 15 - 5", "2x = 10", "x = 5"]
}
```

## Lock Animation System (`js/lock-manager.js`)

*   **Pattern**: The lock animation is NOT CSS-based. It works by progressively loading HTML components from the `lock-components/` directory.
*   **HTML Component Loading**: `loadLockComponent()` fetches external HTML files and injects them into `#lock-display`
*   **Progression**: `progressLockLevel()` loads the next `line-{N}-transformer.html` file when `problemLineCompleted` event fires
*   **6 Lock Levels**: Each level corresponds to a solution line completion
    - Level 1: `Line-1-transformer.html` (triggered by `first-line-solved` event)
    - Level 2: `line-2-transformer.html` (after line 1 complete)
    - Level 3: `line-3-transformer.html` (after line 2 complete - has special reload logic!)
    - Level 4: `line-4-transformer.html` (after line 3 complete)
    - Level 5: `Line-5-transformer.html` (after line 4 complete)
    - Level 6: `line-6-transformer.html` (after line 5 complete)

**File Naming Inconsistency**: Note the capitalization differences (`Line-1` vs `line-2`). The `normalizeComponentName()` function in `lock-manager.js` handles this.

**Special Case - Line 3**: In non-master mode, when the second line is completed, `line-3-transformer.html` is force-reloaded with a 300ms delay before activation. This is hardcoded in the `problemLineCompleted` event handler.

## Worm System (`js/worm.js`)

**Worm Lifecycle:**
1.  **Spawn**: `spawnWormFromConsole()` triggered by `problemLineCompleted` event
2.  **Roaming**: Worm crawls randomly across Panel B for 3-8 seconds
3.  **Targeting**: When `symbolRevealed` event fires, roaming worms rush to steal that symbol
4.  **Stealing**: Worm reaches symbol, turns it gray/strikethrough, carries it away
5.  **Destruction**: User clicks matching symbol in Panel C rain OR clicks worm directly → explosion animation

**Key Mechanics:**
- Maximum 7 worms active at once (`maxWorms`)
- Worms spawn from empty console slots (locks slot until worm dies)
- Console slot spawning: Slide-open animation with green glow
- Worms have 5 body segments (head + 4 segments) defined in CSS
- Position updated via `requestAnimationFrame` loop, NOT CSS transitions
- Worm states tracked: `active`, `hasStolen`, `isRushingToTarget`
- **Dual Kill Mechanic**: Worms can be destroyed two ways:
  1. Click the worm directly
  2. Click the matching symbol in Panel C rain (if worm has stolen that symbol)

**CSS Classes:**
- `.worm-container`: Main worm wrapper (z-index: 10000)
- `.worm-segment`: Individual body parts (9px × 9px, half of original quarter-coin size)
- `.worm-segment:first-child`: Head (12px × 12px with eyes)
- `.flickering`: LSD rainbow color flicker animation
- `.worm-clicked`: Explosion animation on death
- `.slime-splat`: Green splat mark left after explosion

**Critical Patterns:**
- Symbol matching is case-insensitive ('X' === 'x')
- Worm click creates particles, flash effect, and slime splat
- `lockedConsoleSlots` Set tracks which console slots are occupied
- Movement uses `transform: translateX/Y` for performance

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

*   **No Build Process**: This is a pure HTML, CSS, and JavaScript project. No npm, webpack, or bundlers.
*   **Local Testing**: **REQUIRED** - Use a local server to avoid CORS issues with `fetch()` for problem loading.
    ```powershell
    # From the project root
    python -m http.server 8000
    ```
*   **Access the game**: Open `http://localhost:8000/game.html?level=beginner` in your browser.
*   **Level Testing**: Test all three difficulty levels using URL parameters:
    - Beginner: `game.html?level=beginner` (Addition/Subtraction)
    - Warrior: `game.html?level=warrior` (Multiplication)
    - Master: `game.html?level=master` (Division)
*   **Debugging**: The console is filled with emoji-prefixed logs (e.g., 🎮, 🔒, 🐛) that are extremely helpful for tracing game state.
*   **Performance Testing**: Press 'P' key during gameplay to toggle performance overlay.

## Deployment

*   **Production Platforms**: GitHub Pages, Netlify, Vercel, Cloudflare Pages (all FREE)
*   **Deployment Guide**: See `DEPLOYMENT_GUIDE.md` for platform-specific instructions
*   **Current Live Site**: `https://teachereven.github.io/MathMasterHTML/`
*   **Auto-Deploy**: GitHub Actions can auto-deploy on push to `main` branch (if configured)

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

## Common Pitfalls & Key Conventions

1.  **CSS Overrides**: (Reiterated for emphasis) Do not try to style mobile font sizes or lock scaling with CSS. Edit the JavaScript files directly.
2.  **X/x Symbol Matching**: The game logic must treat 'X' and 'x' as the same symbol. Normalization is performed in `isSymbolInCurrentLine()` and `revealSpecificSymbol()` in `game.js`.
3.  **Worm Movement**: Worm positioning is handled entirely by JavaScript in `js/worm.js`. Do not use CSS transitions or animations for worm movement, as it will cause issues.
4.  **Event-Driven Logic**: When adding features, use `document.dispatchEvent` and `document.addEventListener` to communicate between modules. Do not add direct function calls between `game.js`, `lock-manager.js`, `worm.js`, etc.
5.  **File Integrity**: The `css/worm-styles.css` file may contain syntax errors (duplicate keyframes, malformed rules). If worm styling breaks, check this file first for corruption.
6.  **Local Server Required**: Opening `game.html` directly as `file://` will fail due to CORS. Always use a local HTTP server.
7.  **URL Parameters**: Game state depends on URL params - always test with `?level=beginner|warrior|master` parameter.
8.  **Touch Events**: Always use `pointerdown` instead of `click` for interactive elements to reduce mobile input latency (~200ms improvement). This pattern is used in `console-manager.js` and `3rdDISPLAY.js`.

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

*   **`CSS_Override_Investigation.md`**: Deep dive into why CSS font size changes are ignored - explains inline style priority and specificity hierarchy. Read this FIRST before attempting any Panel A/B styling changes.
*   **`Panel_C_Performance_Audit.md`**: Full performance analysis with 12+ optimization opportunities and code examples
*   **`Panel_C_Performance_Summary.md`**: Executive summary of Panel C optimizations - quick reference for performance improvements
*   **`Touch_Click_Optimization_Report.md`**: Detailed analysis of pointer events vs click events for mobile responsiveness
*   **`Performance_Audit_Report.md`**: Historical performance issues and fixes (covers worm system and CSS corruption)
*   **`Worm_System_Complete_Overhaul.md`**: Architecture documentation for the adversarial worm mechanics
*   **`Mobile_Layout_Implementation.md`**: Responsive design patterns and mobile-specific handling
*   **`Phase_1_Implementation_Summary.md`** & **`Phase_2_Implementation_Summary.md`**: Historical implementation notes

**When debugging:** Always check relevant docs before making changes - they contain context about WHY certain patterns exist.
