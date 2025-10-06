# Math Master Algebra - AI Coding Agent Instructions

## Project Overview
Educational math game with Matrix-themed UI where players solve algebra problems by clicking falling symbols. Features progressive lock animations, adversarial worm mechanics, and a quick-access symbol console.

## Architecture: Three-Panel System

### Panel A (Left): Problem Display & Lock Animation
- **Problem Display**: Shows current math problem (pulled from `Assets/{Level}_Lvl/*.md`)
- **Lock Component**: Dynamic visual feedback system in `#lock-display`
- Lock transforms through 6 levels as player progresses through solution steps
- Components load from `lock-components/line-{1-6}-transformer.html`

### Panel B (Middle): Step-by-Step Solution + Worm Battleground + Console
- Displays multi-step solution with initially hidden symbols
- Players reveal symbols by clicking matching symbols in Panel C or console
- **Worm Container**: Worms spawn from console, crawl across panel, steal revealed symbols
- **Symbol Console** (bottom): 3×3 grid of quick-access symbols with keyboard shortcuts (1-9)
- Each revealed symbol triggers events for lock progression and worm spawning

### Panel C (Right): Symbol Rain (Matrix Display)
- Falling symbols (`0-9`, `X`, `x`, `+`, `-`, `=`, `÷`, `×`) managed by `js/3rdDISPLAY.js`
- Click correct symbols to reveal solution steps
- Speed increases progressively during gameplay
- **Guaranteed Spawn System**: Every symbol appears at least once every 5 seconds

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
- `symbolClicked` - Symbol clicked in rain display OR console (detail: `{symbol: string}`)
- `symbolRevealed` - Symbol revealed in solution (detail: `{symbol: string}`) - triggers worm rush behavior
- `first-line-solved` - First correct answer, triggers lock animation start
- `problemLineCompleted` - Solution step completed, spawns worm + advances lock
- `stepCompleted` - Individual step finished (detail: `{stepIndex: number}`)
- `problemCompleted` - Entire problem solved, shows console symbol selection modal
- `displayResolutionChanged` - Screen resolution changed (detail: resolution object)

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

**Complete Overhaul (Oct 2025)**: Worms now spawn from console, crawl realistically, and create strategic gameplay.

### Core Mechanics (max 7 worms)
- **Spawn**: Emerge from empty console slots when `problemLineCompleted` fires
- **Console Locking**: Spawning slot becomes unusable until worm destroyed/escapes
- **Roaming Phase**: 10 seconds OR until red symbol appears
- **Rush Mode**: Detect `symbolRevealed` event → rush to target at 2x speed
- **Symbol Theft**: Steal revealed RED symbols (not hidden), mark with `data-stolen` attribute
- **Visual Carry**: Stolen symbol appears as badge above worm (`.carried-symbol` div)

### Player Interactions
1. **Click Worm**: Creates exact clone with same mission (not destruction!)
2. **Click Matching Rain Symbol**: If user clicks symbol in Panel C that worm carries → worm EXPLODES
   - Stolen symbol returns to original position as revealed
   - `data-stolen` attribute removed
   - Explosion animation (`.worm-clicked` class) + 300ms removal delay

### Visual Effects
- **Crawling Animation**: Inchworm `scaleX/scaleY` squash-stretch (0.8s duration)
- **LSD Rainbow Flash**: When carrying symbol, `hue-rotate` animation (0.3s) + 20% speed boost
- **Direction Rotation**: JavaScript applies rotation based on movement vector
- **Staggered Segments**: 0.15s delay per segment for wave effect

### Movement Constraints
- **Panel B Boundary Only**: 20px margin from edges, reflection physics on collision
- **Speed Configs**: Base 2.0 → Rush 4.0 → Carrying 2.4
- **JavaScript-Only Positioning**: NO CSS `transition`/`animation` on position (prevents floating)

## Level System & URL Parameters

Game launched via: `game.html?level={beginner|warrior|master}&lockComponent=level-1-transformer.html`

**Body Class Pattern**: `document.body.className = 'level-${level}'` for level-specific styling.

**Level Differences**:
- Beginner: Addition/Subtraction
- Warrior: +Multiplication
- Master: +Division (uses `master-level` class for special lock behavior)

## Symbol Console System (js/console-manager.js)

**3×3 Grid** at bottom of Panel B for quick symbol access:
- **Keyboard Shortcuts**: Keys 1-9 map to console slots
- **Symbol Selection**: After `problemCompleted` event, modal shows 16 available symbols
- **Two-Step Process**: Select symbol → select slot (1-9) → symbol placed in console
- **Console Click**: Dispatches same `symbolClicked` event as rain display
- **Visual Feedback**: Purple pulsate animation (`.clicked` class, 600ms)
- **Worm Integration**: Console slots lock when worm spawns from them (`lockedConsoleSlots` Set)

## Responsive Display System (js/display-manager.js)

**Auto-Detection**: Adjusts layout/fonts based on viewport width:
```javascript
Resolutions: '4k' (≥2560px) → '1440p' (≥1920px) → '1080p' (≥1280px) → '720p' (≥768px) → 'mobile' (<768px)
```

**Dynamic Scaling**:
- CSS Variables: `--display-scale`, `--display-font-size`, `--viewport-width/height`
- Body Class: `res-{resolution}` applied for resolution-specific styling
- **Event Dispatch**: `displayResolutionChanged` event with resolution details

## CRITICAL: JavaScript Inline Style Override System

### ⚠️ THE OVERRIDE HIERARCHY PROBLEM ⚠️

**Why CSS Changes to Panel A & B Don't Work**: The game uses **THREE separate JavaScript systems** that apply inline styles, which override CSS rules due to CSS specificity:

1. **display-manager.js** (Primary Font Controller)
2. **lock-responsive.js** (Lock Scaling Controller)  
3. **Dynamic Style Injection** (Symbol rain sizing)

### Inline Style Override Behavior

**CSS Specificity Rule**: Inline styles (`element.style.property = value`) ALWAYS win over CSS rules, even `!important` rules in some cases.

**Result**: Any changes you make to CSS files for mobile Panel A/B will be **immediately overridden** when:
- Page loads (initial `detectAndApply()`)
- Window resizes (debounced resize listeners)
- Orientation changes (mobile rotation)
- Display resolution changes (custom events)

### Display Manager Overrides (js/display-manager.js)

**Panel B - Solution Container**:
```javascript
// Lines 95-102: OVERRIDES CSS font-size
if (isMobile) {
    solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.6)`; // 60% multiplier
} else {
    solutionContainer.style.fontSize = config.fontSize;
}
```

**Panel A - Problem Container**:
```javascript
// Lines 106-113: OVERRIDES CSS font-size
if (isMobile) {
    problemContainer.style.fontSize = `calc(${config.fontSize} * 0.55)`; // 55% multiplier
} else {
    problemContainer.style.fontSize = config.fontSize;
}
```

**Symbol Rain (Panel C)**:
```javascript
// Lines 135-153: INJECTS dynamic <style> tag with !important
const symbolMultiplier = isMobile ? 1.8 : 1.2;
style.textContent = `
    .falling-symbol {
        font-size: calc(${config.fontSize} * ${symbolMultiplier}) !important;
    }
`;
```

### Lock Responsive Manager Overrides (js/lock-responsive.js)

**Panel A - Lock Display Container**:
```javascript
// Lines 133-143: OVERRIDES CSS transform, max-width, max-height
lockDisplay.style.setProperty('--lock-scale', scale);
lockDisplay.style.maxWidth = `${scaledWidth}px`;
lockDisplay.style.maxHeight = `${scaledHeight}px`;
lockDisplay.style.marginTop = ''; // Removes CSS margin
```

**Lock Containers**:
```javascript
// Lines 146-151: OVERRIDES CSS transform for ALL .lock-container elements
container.style.transform = `scale(${containerScale})`;
container.style.transformOrigin = 'center center';
container.style.marginTop = ''; // Removes CSS margin
```

**Lock Bodies**:
```javascript
// Lines 154-158: OVERRIDES CSS transform for ALL .lock-body elements
body.style.transform = `scale(${bodyScale})`;
body.style.transformOrigin = 'center center';
```

### How to Make Changes That Actually Work

#### ❌ WRONG APPROACH (Will be overridden):
```css
/* game.css - THIS WILL NOT WORK */
.res-mobile #panel-a {
    font-size: 12px; /* Overridden by display-manager.js */
}

.res-mobile #problem-container {
    font-size: 10px; /* Overridden by display-manager.js line 108 */
    top: 80px; /* THIS WORKS - not overridden */
}

.res-mobile #solution-container {
    font-size: 14px; /* Overridden by display-manager.js line 97 */
    margin-bottom: 70px; /* THIS WORKS - not overridden */
}

#lock-display {
    transform: scale(1.5); /* Overridden by lock-responsive.js line 134 */
    max-width: 400px; /* Overridden by lock-responsive.js line 141 */
}
```

#### ✅ CORRECT APPROACH:

**For Font Sizes (Panel A & B)**:
1. Edit `js/display-manager.js`
2. Modify the multiplier values in `applyFontSizes()` method:

```javascript
// Lines 95-113 in display-manager.js
if (isMobile) {
    solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.6)`; // Change multiplier here
    problemContainer.style.fontSize = `calc(${config.fontSize} * 0.55)`; // Change multiplier here
}
```

**For Lock Scaling (Panel A)**:
1. Edit `js/lock-responsive.js`
2. Modify scale calculations in `calculateOptimalScale()` or `resolutionBreakpoints`:

```javascript
// Lines 13-18 in lock-responsive.js
this.resolutionBreakpoints = {
    'mobile': { width: 768, height: 1024, scale: 0.5 } // Change scale here
};
```

**For CSS Properties NOT Overridden**:
These CSS properties are safe to change because JavaScript doesn't touch them:
- `position`, `top`, `left`, `right`, `bottom`
- `margin` (except where explicitly cleared by JS)
- `padding`
- `color`, `background`, `border`
- `animation`, `transition`
- `display`, `flex-direction`, `justify-content`, `align-items`
- `z-index`, `opacity`, `visibility`
- `letter-spacing`, `line-height`, `white-space`

### Testing Your Changes

**After modifying JavaScript files**:
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Open DevTools Console (`F12`)
3. Check for emoji-prefixed logs:
   - `🖥️` = Display Manager activity
   - `🔧` = Lock Responsive Manager activity
4. Inspect element and verify inline styles are what you expect

**After modifying CSS files**:
1. Check if the property you changed appears in the element's `element.style` (inline)
2. If YES → Your CSS change will be overridden → Modify JavaScript instead
3. If NO → Your CSS change will work → Continue editing CSS

### Known Override Conflicts

| Panel | Element | CSS Property | Overridden By | Solution |
|-------|---------|--------------|---------------|----------|
| A | `#problem-container` | `font-size` | display-manager.js L108 | Edit multiplier in JS |
| A | `#lock-display` | `transform`, `max-width/height` | lock-responsive.js L134-141 | Edit scale in JS |
| A | `.lock-container` | `transform`, `transform-origin` | lock-responsive.js L148-149 | Edit scale in JS |
| A | `.lock-body` | `transform` | lock-responsive.js L156 | Edit bodyScale in JS |
| B | `#solution-container` | `font-size` | display-manager.js L97 | Edit multiplier in JS |
| B | `.worm-container` | None (safe) | - | Edit CSS freely |
| B | `#symbol-console` | None (safe) | - | Edit CSS freely |
| C | `.falling-symbol` | `font-size` | display-manager.js L145 (!important) | Edit symbolMultiplier in JS |

### Resolution Detection Flow

```
Page Load / Resize / Orientation Change
    ↓
DisplayManager.detectAndApply()
    ↓
Applies inline styles to #problem-container, #solution-container
Injects <style> tag with .falling-symbol rules
    ↓
LockResponsiveManager.detectAndScale()
    ↓
Applies inline styles to #lock-display, .lock-container, .lock-body
    ↓
CSS rules are evaluated LAST (but overridden by inline styles)
```

### Debug Checklist: "My Changes Don't Work"

1. ✅ **Check if property is in inline styles**: Inspect element → Look for `element.style.propertyName`
2. ✅ **Search JavaScript for `.style.propertyName =`**: grep for the property in `js/*.js`
3. ✅ **Check for dynamic `<style>` injection**: Look for `createElement('style')` in JS
4. ✅ **Verify `res-mobile` class exists**: Console: `document.body.classList.contains('res-mobile')`
5. ✅ **Check console logs**: Look for `🖥️` and `🔧` emoji logs showing what values are applied
6. ✅ **Hard refresh**: `Ctrl+Shift+R` to ensure no cached JS/CSS

**CRITICAL: Font Size Override Behavior**:
- `display-manager.js` applies **inline styles** that override CSS rules
- Mobile font sizes are calculated as: `calc(baseFontSize * multiplier)`
- Problem container: 55% of base font (0.55 multiplier) on mobile
- Solution container: 60% of base font (0.6 multiplier) on mobile
- **Always modify `display-manager.js` for mobile font changes, NOT just CSS**
- CSS changes alone will be overridden by JavaScript inline styles

**Lock Sizing System**:
- Lock components are scaled via `css/lock-responsive.css`
- Base scale: 1.8x for desktop, 0.8x for mobile landscape
- **NEVER set scale above 2.0** - causes overflow in Panel A
- Responsive breakpoints: 1920px → 1440px → 1200px → 800px → mobile
- Mobile class `.res-mobile` applies additional scale reduction

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
6. **Mobile Font Changes Not Working**: Check `display-manager.js` - it applies inline styles that override CSS
7. **Lock Overflow in Panel A**: Check `lock-responsive.css` - scale should be ≤2.0 for desktop, ≤0.8 for mobile
8. **CSS Changes Ignored**: Inline styles from JavaScript take precedence - check display-manager.js and lock-responsive.js

## Development Workflow

**No build process** - pure HTML/CSS/JS. Open `index.html` in browser to start.

**Local Testing (Recommended)**:
```powershell
cd "c:\Users\User\OneDrive\Documents\VS 1 games\HTML\MathMaster-Algebra - Copy"
python -m http.server 8000
# Open: http://localhost:8000/game.html?level=beginner
```

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
- 🖥️ Display manager
- ✅/❌ Success/failure

## Key Files Reference

- `js/game.js` (515 lines) - Core game logic, problem loading, symbol validation
- `js/lock-manager.js` (634 lines) - Lock animation orchestration
- `js/3rdDISPLAY.js` - Symbol rain display
- `js/worm.js` - Worm spawning and theft mechanics
- `js/console-manager.js` - Symbol console system with keyboard shortcuts
- `js/display-manager.js` - Responsive design auto-detection
- `middle-screen/solver.js` - First-line-solved event dispatcher (minimal)

## When Adding New Features

1. **New Level**: Add markdown file to `Assets/{Level}_Lvl/`, add level to `loadProblems()` switch
2. **New Lock Visual**: Create `lock-components/line-{N}-transformer.html` with `.lock-body.level-{N}-active` styles
3. **New Symbol**: Add to `symbols` array in `3rdDISPLAY.js`, ensure matching logic handles it
4. **New Event**: Document in this file and dispatch from appropriate module
