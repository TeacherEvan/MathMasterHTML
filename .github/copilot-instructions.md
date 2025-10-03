# Math Master Algebra - AI Coding Agent Instructions

## Project Overview
Educational math game with Matrix-themed UI where players solve algebra problems by clicking falling symbols. Features progressive lock animations that respond to problem-solving progress.

## Architecture: Three-Panel System

### Panel A (Left): Problem Display & Lock Animation
- **Problem Display**: Shows current math problem (pulled from `Assets/{Level}_Lvl/*.md`)
- **Lock Component**: Dynamic visual feedback system in `#lock-display`
- Lock transforms through 6 levels as player progresses through solution steps
- Components load from `lock-components/line-{1-6}-transformer.html`

### Panel B (Middle): Step-by-Step Solution
- Displays multi-step solution with initially hidden symbols
- Players reveal symbols by clicking matching symbols in Panel C
- Each revealed symbol triggers events for lock progression and worm spawning

### Panel C (Right): Symbol Rain (Matrix Display)
- Falling symbols (`0-9`, `X`, `x`, `+`, `-`, `=`, `÷`, `×`) managed by `js/3rdDISPLAY.js`
- Click correct symbols to reveal solution steps
- Speed increases progressively during gameplay

## Critical Event-Driven Communication Pattern

**The game is event-driven with NO direct function calls between components**. Events flow:

```
symbolClicked (from 3rdDISPLAY.js)
  ↓
game.js validates & reveals symbol
  ↓
first-line-solved (first correct answer)
  ↓
LockManager.startLockAnimation()
  ↓
problemLineCompleted (step complete)
  ↓
LockManager.progressLockLevel() + WormSystem.spawnWorm()
```

### Key Events (listen with `document.addEventListener`)
- `symbolClicked` - Symbol clicked in rain display (detail: `{symbol: string}`)
- `first-line-solved` - First correct answer, triggers lock animation start
- `problemLineCompleted` - Solution step completed, spawns worm + advances lock
- `stepCompleted` - Individual step finished (detail: `{stepIndex: number}`)
- `wormSymbolCorrect` - Worm carrying symbol was clicked (detail: `{symbol: string}`)

## Data Flow: Problem Loading & Parsing

Problems stored in markdown format at `Assets/{Beginner|Warrior|Master}_Lvl/*.md`:

```markdown
1. `5 + 3 - X = 6`
   - 5 + 3 - X = 6
   - 8 - X = 6
   - X = 8 - 6
   - X = 2
```

Parsed by `parseProblemsFromMarkdown()` using regex `/(\d+)\.\s+`([^`]+)`\s*\n((?:\s*-[^\n]+\n?)+)/g` into:
```javascript
{
  problem: "5 + 3 - X = 6",
  steps: ["5 + 3 - X = 6", "8 - X = 6", "X = 8 - 6", "X = 2"],
  currentStep: 0,
  currentSymbol: 0
}
```

## Lock Animation System (js/lock-manager.js)

**Critical Pattern**: LockManager uses progressive HTML component loading, NOT CSS transitions.

1. **Initial State**: `showBasicLock()` displays placeholder SVG
2. **Activation**: `first-line-solved` event → `startLockAnimation()` → loads `line-1-transformer.html`
3. **Progression**: Each `problemLineCompleted` → `progressLockLevel()` → loads next `line-{N}-transformer.html`
4. **Level Activation**: `activateLockLevel(N)` adds CSS class `level-{N}-active` to `.lock-body`

**Component Loading**: Fetch HTML → parse with DOMParser → extract `<style>` & `<body>` → inject into `#lock-display`

**Anti-Pattern Warning**: Do NOT load lock components concurrently. Use `isLoadingComponent` flag to prevent race conditions.

**Component Naming Inconsistency**: Lock components have inconsistent capitalization in filenames:
```javascript
// ACTUAL filenames (note Line-1 vs line-2):
1: 'Line-1-transformer.html',    // Capital L
2: 'line-2-transformer.html',    // lowercase l
3: 'line-3-transformer.html',
4: 'line-4-transformer.html',
5: 'Line-5-transformer.html',    // Capital L
6: 'line-6-transformer.html'
```
Use `normalizeComponentName()` in LockManager to handle this.

**Cumulative Progression**: Lock levels progress based on TOTAL completed lines across ALL problems, not per-problem:
- Formula: `Math.floor(completedLinesCount / 2) + 1`
- Every 2 completed lines = advance one lock level
- Beginner/Warrior cap at level 3; Master unlocks all 6 levels

## Symbol Matching: Case-Insensitive X/x Handling

**Critical Bug Fix (see Docs/BugFix_Jobcard_Critical.md)**: `X` and `x` must be treated identically.

```javascript
// ALWAYS normalize X/x before comparison
const normalizedClicked = clickedSymbol.toLowerCase() === 'x' ? 'X' : clickedSymbol;
const normalizedExpected = expectedSymbols.map(s => s.toLowerCase() === 'x' ? 'X' : s);
```

This pattern is used in:
- `isSymbolInCurrentLine()` - validation
- `revealSpecificSymbol()` - revealing hidden symbols

## Worm System (js/worm.js)

Spawns after each completed solution line (max 4 worms):
- **Behavior**: Ground-based crawling (kept in bottom 30% of panel)
- **Theft**: Randomly steals hidden symbols from solution display
- **Recovery**: Click worm to return stolen symbol and destroy worm
- **Movement**: JavaScript-only positioning (NO CSS animations to avoid floating effect)

## Level System & URL Parameters

Game launched via: `game.html?level={beginner|warrior|master}&lockComponent=level-1-transformer.html`

**Body Class Pattern**: `document.body.className = 'level-${level}'` for level-specific styling.

**Level Differences**:
- Beginner: Addition/Subtraction
- Warrior: +Multiplication
- Master: +Division (uses `master-level` class for special lock behavior)

## Styling Conventions

- **Font**: `'Orbitron', monospace` for all text
- **Primary Color**: `#00ff00` (Matrix green) for active/glowing elements
- **Problem Text**: Red pulsating animation (`#ff6666` → `#ff9999`)
- **Revealed Symbols**: Red glow (`color: #ff0000, text-shadow: 0 0 8px rgba(255,0,0,0.6)`)
- **Animations**: Use `cubic-bezier(0.68, -0.55, 0.265, 1.55)` for lock transforms

## Common Pitfalls & Debugging

1. **Lock Not Progressing**: Check `completedLinesCount` in LockManager - event listeners may not be firing
2. **Symbols Not Revealing**: Verify X/x normalization in `revealSpecificSymbol()`
3. **Worms Floating**: Ensure no CSS `transition` or `animation` on `.worm-container`
4. **Component Not Loading**: Check `lock-components/` path and filename case-sensitivity
5. **Multiple Clicks Required**: Symbol detection likely missing case normalization

## Development Workflow

**No build process** - pure HTML/CSS/JS. Open `index.html` in browser to start.

**File Opening Order for Testing**:
1. `index.html` (welcome screen)
2. `level-select.html` (choose difficulty)
3. `game.html?level=beginner` (gameplay)

**Console Logging**: Extensive emoji-prefixed logging throughout codebase:
- 🎮 Game state
- 🔒 Lock manager
- 🐛 Worm system
- 📚 Problem loading
- 🎯 Symbol matching
- ✅/❌ Success/failure

## Key Files Reference

- `js/game.js` (515 lines) - Core game logic, problem loading, symbol validation
- `js/lock-manager.js` (634 lines) - Lock animation orchestration
- `js/3rdDISPLAY.js` - Symbol rain display
- `js/worm.js` - Worm spawning and theft mechanics
- `middle-screen/solver.js` - First-line-solved event dispatcher (minimal)

## When Adding New Features

1. **New Level**: Add markdown file to `Assets/{Level}_Lvl/`, add level to `loadProblems()` switch
2. **New Lock Visual**: Create `lock-components/line-{N}-transformer.html` with `.lock-body.level-{N}-active` styles
3. **New Symbol**: Add to `symbols` array in `3rdDISPLAY.js`, ensure matching logic handles it
4. **New Event**: Document in this file and dispatch from appropriate module
