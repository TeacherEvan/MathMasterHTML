# Math Master Algebra - AI Coding Agent Instructions

## Project Overview
Educational math game with a Matrix-themed UI where players solve algebra problems by clicking falling symbols. Features progressive lock animations, adversarial worm mechanics, and a quick-access symbol console.

## ⚠️ CRITICAL: CSS Override Warning

**Panel A & B font sizes CANNOT be changed via CSS alone!**

JavaScript applies inline styles that override any rules in `css/game.css`. To change mobile font sizes, you **MUST** edit `js/display-manager.js`.

1.  **Edit `js/display-manager.js`**, NOT `css/game.css`.
2.  Modify the multiplier values in the `applyFontSizes()` method.
3.  **Current Mobile Values**:
    *   Problem Container (`#problem-container`): `calc(${config.fontSize} * 0.32)` (32% of base font size)
    *   Solution Container (`#solution-container`): `calc(${config.fontSize} * 0.36)` (36% of base font size)

See `Docs/CSS_Override_Investigation.md` for a full investigation. Modifying CSS for these elements will have no effect.

## Architecture: Three-Panel System

*   **Panel A (Left)**: Problem Display (`#problem-container`) & Lock Animation (`#lock-display`).
*   **Panel B (Middle)**: Step-by-step solution (`#solution-container`), worm battleground, and a 3x3 symbol console.
*   **Panel C (Right)**: Falling symbols managed by `js/3rdDISPLAY.js`.

## Critical Event-Driven Communication

The game is **100% event-driven**. Components do not call each other directly. They communicate using custom DOM events.

**Core Event Flow:**
1.  `symbolClicked` (from Panel C rain or Panel B console)
2.  `game.js` validates the symbol.
3.  `first-line-solved` is dispatched on the first correct answer.
4.  `LockManager.startLockAnimation()` listens for `first-line-solved`.
5.  `problemLineCompleted` is dispatched when a solution line is fully revealed.
6.  `LockManager.progressLockLevel()` and `WormSystem.spawnWorm()` listen for `problemLineCompleted`.

**Key Events to Listen For:**
*   `symbolClicked`: A symbol was clicked. (detail: `{ symbol: string }`)
*   `symbolRevealed`: A hidden symbol was revealed in the solution. (detail: `{ symbol: string }`)
*   `problemLineCompleted`: A full line of the solution is complete.
*   `problemCompleted`: The entire problem is solved.

## Data Flow: Problem Loading

*   Problems are stored in Markdown files in `Assets/{Level}_Lvl/`.
*   `js/game.js` fetches and parses these files using the `parseProblemsFromMarkdown()` function with a regex.
*   The regex `/(\d+)\.\s+\`([^\`]+)\`\s*\n((?:\s*-[^\n]+\n?)+)/g` structures the problem and its steps into a JavaScript object.

## Lock Animation System (`js/lock-manager.js`)

*   **Pattern**: The lock animation is NOT CSS-based. It works by progressively loading HTML components from the `lock-components/` directory.
*   **Progression**: `progressLockLevel()` loads the next `line-{N}-transformer.html` file and injects its content into the `#lock-display` container.
*   **File Naming Inconsistency**: Note the capitalization differences in the filenames (e.g., `Line-1-transformer.html` vs. `line-2-transformer.html`). The `normalizeComponentName()` function in `lock-manager.js` handles this.

## Development Workflow

*   **No Build Process**: This is a pure HTML, CSS, and JavaScript project.
*   **Local Testing**: Use a simple local server to avoid CORS issues with `fetch()`.
    ```powershell
    # From the project root
    python -m http.server 8000
    ```
*   **Access the game**: Open `http://localhost:8000/game.html?level=beginner` in your browser.
*   **Debugging**: The console is filled with emoji-prefixed logs (e.g., 🎮, 🔒, 🐛) that are extremely helpful for tracing game state.

## Common Pitfalls & Key Conventions

1.  **CSS Overrides**: (Reiterated for emphasis) Do not try to style mobile font sizes or lock scaling with CSS. Edit the JavaScript files directly.
2.  **X/x Symbol Matching**: The game logic must treat 'X' and 'x' as the same symbol. Normalization is performed in `isSymbolInCurrentLine()` and `revealSpecificSymbol()` in `game.js`.
3.  **Worm Movement**: Worm positioning is handled entirely by JavaScript in `js/worm.js`. Do not use CSS transitions or animations for worm movement, as it will cause issues.
4.  **Event-Driven Logic**: When adding features, use `document.dispatchEvent` and `document.addEventListener` to communicate between modules. Do not add direct function calls between `game.js`, `lock-manager.js`, `worm.js`, etc.
