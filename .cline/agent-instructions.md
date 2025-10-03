# MathMaster-Algebra AI Agent Instructions

## Project Overview

Educational algebra game featuring a unique three-panel interface with progressive lock animations, symbol-matching gameplay, and adversarial worm mechanics. Built with vanilla JavaScript, HTML5, and CSS3.

## Architecture: The Big Picture

### Three-Stage Flow

1. **Welcome Screen** (`index.html`) → Matrix animation entry point
2. **Level Select** (`level-select.html`) → Difficulty: Beginner/Warrior/Master
3. **Game Screen** (`game.html`) → Three-panel gameplay interface

### Three-Panel Game Layout

- **Panel A (Left)**: Problem display + Lock animation
- **Panel B (Middle)**: Solution area + Worm container + Help button
- **Panel C (Right)**: Symbol rain (Matrix-style falling symbols)

### Core Components

```
js/game.js          - Main game logic, problem parsing, symbol revelation
js/lock-manager.js  - Unified lock animation system (LockManager class)
js/worm.js          - Enemy mechanic system (WormSystem class)
js/3rdDISPLAY.js    - Symbol rain display and click detection
```

## Critical Event-Driven System

The game uses **custom DOM events** for cross-component communication:

### Key Events

```javascript
// Triggers lock animation to start (dispatched after first correct symbol)
document.dispatchEvent(new Event('first-line-solved'));

// Triggers worm spawn + lock progression (dispatched when solution line complete)
document.dispatchEvent(new CustomEvent('problemLineCompleted', { 
    detail: { lineNumber: n, lineText: "..." }
}));

// User clicked symbol in symbol rain
document.dispatchEvent(new CustomEvent('symbolClicked', {
    detail: { symbol: "X" }
}));

// User clicked worm carrying symbol
document.dispatchEvent(new CustomEvent('wormSymbolCorrect', {
    detail: { symbol: "5" }
}));
```

**CRITICAL**: Lock progression is **cumulative across ALL problems**, not per-problem. Every 2 completed lines = new lock level (up to level 6).

## Symbol Revelation Mechanics

### Pattern: Symbol-by-Symbol (NOT Character-by-Character)

```javascript
// Problem solution steps stored as array
currentProblem.steps = [
    "5 + 3 - X = 6",    // Line 1
    "8 - X = 6",         // Line 2  
    "X = 8 - 6",         // Line 3
    "X = 2"              // Line 4
];

// Symbols revealed one at a time within current line
// When line complete → dispatch problemLineCompleted
```

### X/x Case Normalization

**IMPORTANT**: The game treats 'X' and 'x' as identical. Always normalize:

```javascript
const normalizedSymbol = symbol.toLowerCase() === 'x' ? 'X' : symbol;
```

## Lock Animation System

### LockManager Architecture

```javascript
class LockManager {
    lockIsLive: false              // Lock animation started?
    lockAnimationActive: false     // Lock actively animating?
    currentLockLevel: 1            // Current level (1-6)
    completedLinesCount: 0         // CUMULATIVE across all problems
}
```

### Progressive Lock Levels

- **Beginner/Warrior**: Caps at Level 3 (lines 1-3 only)
- **Master**: All 6 levels accessible
- **Progression Formula**: `Math.floor(completedLinesCount / 2) + 1`
- **Component Loading**: `lock-components/Line-{n}-transformer.html`

### Component Naming Inconsistency

```javascript
// ACTUAL component filenames (note inconsistent capitalization):
const componentMap = {
    1: 'Line-1-transformer.html',    // Capital L
    2: 'line-2-transformer.html',    // lowercase l
    3: 'line-3-transformer.html',
    4: 'line-4-transformer.html',
    5: 'Line-5-transformer.html',    // Capital L
    6: 'line-6-transformer.html'
};
```

## Worm System Mechanics

### Specifications

- Max 4 worms simultaneously
- 8 body segments with earthy color variations
- Spawn on `problemLineCompleted` event
- 10-second symbol theft cycle
- Player intervention: Click worm to save/destroy

### Behavior Pattern

```javascript
// 1-second movement intervals (edge bouncing)
// 10-second theft attempts (200px proximity detection)
// 1-second smooth theft animation
// Symbol carrying indicator displayed above worm
// Click worm = destroy + return symbol (if carrying)
```

## Problem Format & Parsing

### Markdown Structure

```markdown
## Pattern 1: a + b - X = c

1. `5 + 3 - X = 6`
   - 5 + 3 - X = 6
   - 8 - X = 6
   - X = 8 - 6
   - X = 2
```

### File Locations

- `Assets/Beginner_Lvl/beginner_problems.md` - Addition/Subtraction (50 problems)
- `Assets/Warrior_Lvl/warrior_problems.md` - Add/Sub/Mult (50 problems)
- `Assets/Master_Lvl/master_problems.md` - All operations (50 problems)

### Parsing Logic

```javascript
// Regex: /(\d+)\.\s+`([^`]+)`\s*\n((?:\s*-[^\n]+\n?)+)/g
// Extracts: problem number, problem text, solution steps
// Each step is a separate line for symbol-by-symbol revelation
```

## Development Workflows

### Testing Lock Animations

```javascript
// Use LockManager debug methods
lockManager.forceLockLevel(3);  // Jump to specific level
lockManager.getDebugInfo();     // Current state inspection
```

### Testing Worm Spawns

```javascript
// Manually trigger event
document.dispatchEvent(new CustomEvent('problemLineCompleted'));
```

### Common Issues

1. **Lock not appearing**: Check `first-line-solved` event dispatch in `handleCorrectAnswer()`
2. **Lock stuck at level 1**: Verify `completedLinesCount++` in `checkLineCompletion()`
3. **Worms not spawning**: Check event listener in `WormSystem.initialize()`
4. **Symbol matching fails**: Check X/x normalization in `isSymbolInCurrentLine()`

## Project-Specific Conventions

### CSS Organization

- `css/game.css` - Three-panel layout
- `css/lock-responsive.css` - Lock scaling for side panel
- `css/worm-styles.css` - Worm animations and visuals
- Inline styles in HTML files for component-specific animations

### JavaScript Module Pattern

- No ES6 modules - uses global `window` object
- Singleton pattern: `window.lockManager`, `window.lockResponsiveManager`
- Class-based for major systems (LockManager, WormSystem)

### Visual Themes

- **Beginner**: Green (#00ff00) - nature/growth
- **Warrior**: Gold (#ffd700) - challenge/achievement  
- **Master**: Red (#ff4444) - mastery/danger
- Matrix background: Falling green symbols (#00ff00)

## Integration Points

### Cross-Component Communication Flow

```
User clicks symbol → 3rdDISPLAY.js dispatches 'symbolClicked'
                  → game.js checks if correct
                  → game.js reveals symbol in solution
                  → game.js checks line completion
                  → game.js dispatches 'problemLineCompleted'
                  → worm.js spawns new worm
                  → lock-manager.js progresses lock level
```

### External Dependencies

- Google Fonts: Orbitron (monospace sci-fi theme)
- No build tools or package managers
- Pure vanilla JavaScript (ES6+ features used)

## Common Pitfalls

1. **Lock components fail to load**: Check file path capitalization in `normalizeComponentName()`
2. **Duplicate event listeners**: LockManager prevents concurrent loading with `isLoadingComponent` flag
3. **Symbol revelation stops**: Ensure `currentStepIndex` increments in `checkLineCompletion()`
4. **Worm max count exceeded**: WormSystem checks `this.worms.length >= this.maxWorms`
5. **Master level lock cap**: Non-master levels cap at level 3 in `triggerLevelAnimation()`

## Testing Checklist

- [ ] Welcome → Level Select → Game navigation works
- [ ] Symbol clicking reveals correct symbols
- [ ] Help button reveals next symbol
- [ ] Line completion spawns worms
- [ ] Lock animation progresses every 2 lines
- [ ] Worm click destroys worm and returns symbol
- [ ] Problem transitions to next after completion
- [ ] Level-specific themes apply correctly
- [ ] X/x treated as identical in matching

## Key Files Reference

- `game.js:setupProblem()` - Problem initialization
- `game.js:isSymbolInCurrentLine()` - Symbol matching logic (with X/x normalization)
- `lock-manager.js:progressLockLevel()` - Cumulative progression logic
- `worm.js:attemptSymbolTheft()` - Proximity-based theft mechanics
- `3rdDISPLAY.js` - Symbol rain rendering and click detection

---

*Generated for MathMaster-Algebra project - Educational game by Teacher Evan*
