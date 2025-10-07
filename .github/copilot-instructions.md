# Math Master Algebra - AI Coding Agent Instructions

## Project Overview
Educational math game with a Matrix-themed UI where players solve algebra problems by clicking falling symbols. Features progressive lock animations, adversarial worm mechanics, and a quick-access symbol console.

**Tech Stack**: Pure HTML5, CSS3, vanilla JavaScript (ES6+). Zero build process, zero dependencies.

## ⚠️ CRITICAL: CSS Override Warning

**Panel A & B font sizes CANNOT be changed via CSS alone!**

JavaScript applies inline styles that override any CSS rules (including `!important`). To change mobile font sizes for `#problem-container` or `#solution-container`, you **MUST** edit `js/display-manager.js`.

1.  **Edit `js/display-manager.js`**, NOT `css/game.css`.
2.  Modify the multiplier values in the `applyFontSizes()` method.
3.  **Current Mobile Values** (lines ~95-105):
    *   Problem Container: `calc(${config.fontSize} * 0.32)` (32% of base)
    *   Solution Container: `calc(${config.fontSize} * 0.36)` (36% of base)

See `Docs/CSS_Override_Investigation.md` for full investigation. Any CSS changes to these elements will be silently ignored.

## Architecture: Three-Panel System

*   **Panel A (Left)**: Problem Display (`#problem-container`) & Lock Animation (`#lock-display`).
*   **Panel B (Middle)**: Step-by-step solution (`#solution-container`), worm battleground (`#worm-container`), and 3x3 symbol console (`#symbol-console`).
*   **Panel C (Right)**: Falling symbols (`#symbol-rain-container`) managed by `js/3rdDISPLAY.js`.

**HTML Structure** (`game.html`):
```html
<div class="game-container">
  <div class="panel panel-left">...</div>    <!-- Panel A -->
  <div class="panel panel-middle">...</div>   <!-- Panel B -->  
  <div class="panel panel-right">...</div>    <!-- Panel C -->
</div>
```

**Key DOM IDs**:
- `#problem-container`, `#solution-container`, `#lock-display`
- `#worm-container`, `#symbol-console`, `#symbol-rain-container`


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

**Console Slot States:**
- Empty: Available for worm spawn
- Filled: Contains a symbol, user can click
- Locked: Worm is spawning/active from this slot (`.locked` class)
- Worm Spawning: Special slide-open animation (`.worm-spawning` class)

## Development Workflow

*   **No Build Process**: This is a pure HTML, CSS, and JavaScript project.
*   **Local Testing**: Use a simple local server to avoid CORS issues with `fetch()`.
    ```powershell
    # From the project root
    python -m http.server 8000
    ```
*   **Access the game**: Open `http://localhost:8000/game.html?level=beginner` in your browser.
*   **Debugging**: The console is filled with emoji-prefixed logs (e.g., 🎮, 🔒, 🐛) that are extremely helpful for tracing game state.

## Performance Optimizations

**Critical Startup Performance Pattern:**
*   Symbol rain (`3rdDISPLAY.js`) starts immediately without waiting for `DOMContentLoaded` to ensure smooth animation from page load.
*   Heavy operations (problem loading, lock initialization) are deferred using `requestIdleCallback` or `setTimeout(cb, 1)` to prevent blocking the animation loop.
*   **Never add synchronous blocking operations during initialization** - use deferred execution for non-critical UI setup.

## Common Pitfalls & Key Conventions

1.  **CSS Overrides**: (Reiterated for emphasis) Do not try to style mobile font sizes or lock scaling with CSS. Edit the JavaScript files directly.
2.  **X/x Symbol Matching**: The game logic must treat 'X' and 'x' as the same symbol. Normalization is performed in `isSymbolInCurrentLine()` and `revealSpecificSymbol()` in `game.js`.
3.  **Worm Movement**: Worm positioning is handled entirely by JavaScript in `js/worm.js`. Do not use CSS transitions or animations for worm movement, as it will cause issues.
4.  **Event-Driven Logic**: When adding features, use `document.dispatchEvent` and `document.addEventListener` to communicate between modules. Do not add direct function calls between `game.js`, `lock-manager.js`, `worm.js`, etc.
5.  **File Integrity**: The `css/worm-styles.css` file may contain syntax errors (duplicate keyframes, malformed rules). If worm styling breaks, check this file first for corruption.
