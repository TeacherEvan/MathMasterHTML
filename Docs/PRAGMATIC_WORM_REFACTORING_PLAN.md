# Pragmatic Worm.js Refactoring Plan

**Date**: October 2025  
**Current State**: worm.js = 2,218 lines  
**Target State**: ~1,400 lines (-37% reduction)  
**Strategy**: Incremental, test-driven refactoring with minimal risk

---

## Executive Summary

The `worm.js` file has grown to over 2,200 lines through feature additions and contains:
- **250 lines of dead code** (cloning curse system - never executes)
- **450 lines of duplicate spawn logic** (3 nearly identical methods)
- **50+ magic numbers** (hard-coded values without context)
- **Complex interdependencies** that require careful extraction

**Core Philosophy**: Surgical changes only. No rewrites. No breaking changes. Verify at each step.

---

## Current File Structure Analysis

### Method Distribution (40+ methods)

| Category | Methods | Lines | Status |
|----------|---------|-------|--------|
| **Initialization** | 3 | ~200 | ✅ Good |
| **Spawn System** | 5 | ~600 | 🔴 Needs consolidation |
| **Movement & AI** | 8 | ~400 | ✅ Good |
| **Power-ups** | 10 | ~500 | ✅ Good |
| **Game Over** | 4 | ~200 | ✅ Good |
| **Dead Code** | 5 | ~250 | 🔴 Remove entirely |
| **Utilities** | 8 | ~150 | ✅ Good |

### Critical Observations

1. **Spawn methods are 85% identical** - perfect candidate for factory pattern
2. **Dead code blocks are isolated** - can remove with zero risk
3. **Power-up system is well-organized** - no changes needed
4. **Animation loop is clean** - no changes needed

---

## Phase 1: Dead Code Removal (1 hour)

**Impact**: 🔴 Critical - Immediate 250 line reduction  
**Risk**: ✅ Zero - Code never executes  
**Testing**: Run game, verify no behavioral changes

### 1.1 Remove Cloning Curse Variables

**Location**: Constructor (lines 23-26, 65-67)

**Current Code to Remove**:
```javascript
// CLONING CURSE MECHANIC
this.cloningCurseActive = false; // Never set to true
this.wormsKilledByRain = 0;
this.stolenBlueSymbols = [];
```

**Action**: Delete these 4 lines completely.

---

### 1.2 Remove Cloning Curse Methods

**Methods to Remove** (5 total):

1. `checkCurseReset()` - Lines 264-280 (~17 lines)
2. `createCurseResetEffect()` - Lines 283-302 (~20 lines)
3. `checkAndActivateCloningCurse()` - Lines 850-870 (~21 lines)
4. `activateCloningCurse()` - Lines 873-895 (~23 lines)
5. `createCurseActivationEffect()` - Lines 898-920 (~23 lines)

**Total Removal**: ~104 lines

---

### 1.3 Remove Cloning Curse Conditional Branches

**Locations to Clean**:

```javascript
// In explodeWorm() - around line 1200
if (this.cloningCurseActive && isRainKill) {
    this.wormsKilledByRain++;
    console.log(`☠️ Worm killed by rain (${this.wormsKilledByRain})`);
    this.checkCurseReset();
}
// DELETE THIS ENTIRE BLOCK

// In handlePurpleWormClick() - around line 1050
if (!this.cloningCurseActive && worm.stolenSymbol) {
    // ... 30 lines of curse activation logic
}
// REMOVE THE CONDITION, KEEP THE CONTENT

// In stealSymbol() - around line 800
if (this.cloningCurseActive && worm.isPurple) {
    // Track stolen blue symbols
    if (targetElement.classList.contains('revealed')) {
        this.stolenBlueSymbols.push(...)
    }
}
// DELETE THIS ENTIRE BLOCK
```

**Total Additional Removal**: ~50 lines

---

### 1.4 Remove Curse-Related CSS Classes

**File**: `css/worm-styles.css`

```css
/* Remove these animations */
@keyframes curse-activation {
    /* ~20 lines */
}

@keyframes curse-reset {
    /* ~20 lines */
}

.curse-reset-flash {
    /* ~15 lines */
}
```

**Total CSS Removal**: ~55 lines (not counted in JS total)

---

### 1.5 Verification Checklist

After Phase 1 completion:

- [ ] Game loads without console errors
- [ ] Worms spawn from console slots (test 3+ rows)
- [ ] Worms spawn from borders (complete 1 row)
- [ ] Purple worms spawn on 4+ wrong answers
- [ ] Purple worms can be killed by rain symbols
- [ ] Purple worms spawn green clone on direct click
- [ ] All power-ups drop and activate correctly
- [ ] No references to `cloningCurseActive` in console logs

**Expected Result**: Identical gameplay, 250 fewer lines

---

## Phase 2: Spawn Method Consolidation (3 hours)

**Impact**: 🔴 Critical - 300 line reduction  
**Risk**: ⚠️ Medium - Requires careful testing  
**Strategy**: Extract commonality, preserve differences

### 2.1 Current Duplicate Pattern

All 3 spawn methods follow this structure:

```javascript
// PATTERN (appears 3x):
function spawn_TYPE_Worm(params) {
    // 1. Initialize (10 lines) - IDENTICAL
    this.initialize();
    
    // 2. Check max worms (5 lines) - IDENTICAL
    if (this.worms.length >= this.maxWorms) return;
    
    // 3. Calculate position (15 lines) - DIFFERENT
    let startX, startY;
    // ... type-specific logic
    
    // 4. Create worm element (8 lines) - IDENTICAL
    const wormElement = this.createWormElement({...});
    
    // 5. Assign power-up (10 lines) - IDENTICAL
    const hasPowerUp = Math.random() < 0.10;
    const powerUpType = hasPowerUp ? [...][...] : null;
    
    // 6. Build worm data object (40 lines) - IDENTICAL
    const wormData = {
        id, element, stolenSymbol, targetElement,
        // ... 20+ properties
    };
    
    // 7. Add to array (2 lines) - IDENTICAL
    this.worms.push(wormData);
    
    // 8. Add click listener (5 lines) - IDENTICAL
    wormElement.addEventListener('click', ...);
    
    // 9. Start animation (3 lines) - IDENTICAL
    if (this.worms.length === 1) this.animate();
}
```

**Observation**: Steps 1, 2, 4, 5, 6, 7, 8, 9 are 100% identical across all 3 methods.

---

### 2.2 Extraction Strategy

Create helper methods for each duplicated step:

```javascript
// NEW: Power-up assignment helper
assignPowerUp() {
    const hasPowerUp = Math.random() < 0.10;
    const powerUpType = hasPowerUp 
        ? ['chainLightning', 'spider', 'devil'][Math.floor(Math.random() * 3)]
        : null;
    
    return { hasPowerUp, powerUpType };
}

// NEW: Worm data builder
buildWormData(config) {
    const {
        wormId, wormElement, startX, startY,
        speed, roamDuration, spawnType,
        hasPowerUp, powerUpType, slotIndex = null
    } = config;
    
    return {
        id: wormId,
        element: wormElement,
        stolenSymbol: null,
        targetElement: null,
        targetSymbol: null,
        x: startX,
        y: startY,
        velocityX: (Math.random() - 0.5) * speed,
        velocityY: (Math.random() - 0.5) * 1.0,
        active: true,
        hasStolen: false,
        isRushingToTarget: false,
        roamingEndTime: Date.now() + roamDuration,
        isFlickering: false,
        baseSpeed: speed,
        currentSpeed: speed,
        spawnType: spawnType,
        spawnTime: Date.now(),
        isPurple: false,
        consoleSlotIndex: slotIndex,
        hasPowerUp: hasPowerUp,
        powerUpType: powerUpType
    };
}

// NEW: Register worm (add to array, attach listeners, start animation)
registerWorm(wormData) {
    this.worms.push(wormData);
    
    wormData.element.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleWormClick(wormData);
    });
    
    if (this.worms.length === 1) {
        this.animate();
    }
    
    console.log(`✅ Worm ${wormData.id} registered. Total: ${this.worms.length}`);
}
```

**Lines Added**: ~60 lines  
**Lines Removed from 3 methods**: ~240 lines  
**Net Reduction**: ~180 lines

---

### 2.3 Refactored Spawn Methods

After extraction, each spawn method becomes concise:

```javascript
// AFTER: spawnWormFromConsole() - 25 lines (was 150)
spawnWormFromConsole() {
    this.initialize();
    if (this.worms.length >= this.maxWorms) return;
    
    // Type-specific: Find console slot
    const slotData = this.findEmptyConsoleSlot();
    if (!slotData) return;
    const { slotElement, slotIndex } = slotData;
    
    // Type-specific: Position at slot
    const rect = slotElement.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    
    // Common: Create worm
    const wormId = generateUniqueId('console-worm');
    const wormElement = this.createWormElement({
        id: wormId, classNames: [], segmentCount: 5, x: startX, y: startY
    });
    this.crossPanelContainer.appendChild(wormElement);
    
    // Common: Power-up + data + register
    const { hasPowerUp, powerUpType } = this.assignPowerUp();
    const wormData = this.buildWormData({
        wormId, wormElement, startX, startY,
        speed: this.SPEED_CONSOLE_WORM,
        roamDuration: this.ROAMING_DURATION_CONSOLE,
        spawnType: 'console',
        hasPowerUp, powerUpType,
        slotIndex
    });
    this.registerWorm(wormData);
    
    // Type-specific: Lock slot
    this.lockedConsoleSlots.add(slotIndex);
}

// AFTER: spawnWorm() - 20 lines (was 145)
spawnWorm() {
    this.initialize();
    if (this.worms.length >= this.maxWorms) return;
    
    // Type-specific: Random center position
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const startX = viewportWidth * 0.4 + Math.random() * viewportWidth * 0.2;
    const startY = viewportHeight * 0.3 + Math.random() * viewportHeight * 0.4;
    
    // Common: Create + register
    const wormId = generateUniqueId('fallback-worm');
    const wormElement = this.createWormElement({
        id: wormId, classNames: [], segmentCount: 5, x: startX, y: startY
    });
    this.crossPanelContainer.appendChild(wormElement);
    
    const { hasPowerUp, powerUpType } = this.assignPowerUp();
    const wormData = this.buildWormData({
        wormId, wormElement, startX, startY,
        speed: this.SPEED_FALLBACK_WORM,
        roamDuration: this.ROAMING_DURATION_BORDER,
        spawnType: 'fallback',
        hasPowerUp, powerUpType
    });
    this.registerWorm(wormData);
}

// AFTER: spawnWormFromBorder() - 35 lines (was 150)
spawnWormFromBorder(data = {}) {
    this.initialize();
    if (this.worms.length >= this.maxWorms) return;
    
    const { index = 0, total = 1 } = data;
    
    // Type-specific: Border position calculation
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const position = index / total;
    let startX, startY;
    
    if (position < 0.5) {
        // Bottom border
        const relativePos = position * 2;
        startX = viewportWidth * 0.1 + relativePos * viewportWidth * 0.8;
        startY = viewportHeight - this.BORDER_MARGIN;
    } else {
        // Side borders
        const relativePos = (position - 0.5) * 2;
        if (Math.random() < 0.5) {
            startX = this.BORDER_MARGIN;
            startY = viewportHeight * 0.3 + relativePos * viewportHeight * 0.4;
        } else {
            startX = viewportWidth - this.BORDER_MARGIN;
            startY = viewportHeight * 0.3 + relativePos * viewportHeight * 0.4;
        }
    }
    
    // Common: Create + register
    const wormId = generateUniqueId('border-worm');
    const wormElement = this.createWormElement({
        id: wormId, classNames: [], segmentCount: 5, x: startX, y: startY
    });
    this.crossPanelContainer.appendChild(wormElement);
    
    const { hasPowerUp, powerUpType } = this.assignPowerUp();
    const wormData = this.buildWormData({
        wormId, wormElement, startX, startY,
        speed: this.SPEED_BORDER_WORM,
        roamDuration: this.ROAMING_DURATION_BORDER,
        spawnType: 'border',
        hasPowerUp, powerUpType
    });
    this.registerWorm(wormData);
}
```

**Total Lines After**: ~80 lines (down from ~445)  
**With Helper Methods**: ~140 lines total  
**Net Reduction**: ~305 lines

---

### 2.4 Testing Strategy for Phase 2

**Critical Test Cases**:

1. **Console Worms**:
   - [ ] Spawn from empty slots only
   - [ ] Slot glows green during spawn animation
   - [ ] Slot becomes locked during worm lifetime
   - [ ] Slot unlocks when worm dies
   - [ ] Roaming duration: 3 seconds (beginner)

2. **Border Worms**:
   - [ ] Spawn distributed across bottom/sides (not clustered)
   - [ ] Multiple worms spawn in staggered positions
   - [ ] Roaming duration: 5 seconds (beginner)
   - [ ] Speed faster than console worms

3. **Fallback Worms**:
   - [ ] Spawn in center area when no console slots
   - [ ] Correct speed and roaming time

4. **Power-ups**:
   - [ ] 10% drop rate maintained
   - [ ] Even distribution between 3 types
   - [ ] Power-ups displayed correctly on worm death

5. **Edge Cases**:
   - [ ] Max worms (999) prevents new spawns
   - [ ] Animation starts only once (first worm)
   - [ ] Click handlers attached correctly
   - [ ] Purple worm spawning still works

---

### 2.5 Rollback Plan

If Phase 2 causes issues:

```bash
# Git rollback command
git reset --hard HEAD~1

# Or revert specific file
git checkout HEAD~1 -- js/worm.js
```

Keep backup copy:
```bash
cp js/worm.js js/worm.js.before-phase2
```

---

## Phase 3: Magic Number Extraction (2 hours)

**Impact**: 🟢 Medium - Maintainability improvement  
**Risk**: ✅ Low - No behavioral changes  
**Lines Change**: +50 (constants), -0 (refactor only)

### 3.1 Constants to Extract

Add to constructor after difficulty settings:

```javascript
constructor() {
    // ... existing code ...
    
    // ===== EXTRACTED CONSTANTS =====
    
    // Power-Up System
    this.POWER_UP_DROP_RATE = 0.10;              // 10% chance per worm
    this.POWER_UP_TYPES = ['chainLightning', 'spider', 'devil'];
    this.CHAIN_LIGHTNING_BASE_KILLS = 5;         // First use
    this.CHAIN_LIGHTNING_BONUS_PER_USE = 2;      // Incremental bonus
    
    // Distance Thresholds (pixels)
    this.AOE_EXPLOSION_RADIUS = 18;              // One worm body height
    this.SPIDER_CONVERSION_DISTANCE = 30;        // Spider → worm conversion
    this.DEVIL_PROXIMITY_KILL_DISTANCE = 50;     // Devil kill radius
    
    // Timing (milliseconds)
    this.CHAIN_EXPLOSION_DELAY = 150;            // Visual stagger
    this.EXPLOSION_ANIMATION_DURATION = 600;     // Must match CSS @keyframes
    this.CLEANUP_DELAY = 2000;                   // Allow animations to complete
    this.SKULL_DISPLAY_DURATION = 10000;         // 10 seconds
    this.SPIDER_HEART_DURATION = 60000;          // 1 minute
    this.DEVIL_KILL_TIMER = 5000;                // 5 seconds proximity
    this.SLIME_FADE_DURATION = 3000;             // 3 seconds
    this.CRACK_CLEANUP_DELAY = 2000;             // 2 seconds
    
    // Visual Effects
    this.EXPLOSION_PARTICLE_COUNT = 12;          // Particle burst
    this.EXPLOSION_FLASH_DURATION = 300;         // Flash fade time
    this.POWER_UP_FLOAT_DISTANCE = 30;           // Upward float pixels
    
    // Game Over Thresholds
    this.GAME_OVER_STOLEN_THRESHOLD = 5;         // Symbols before game over
    this.WRONG_ANSWER_PURPLE_THRESHOLD = 4;      // Trigger purple worm
}
```

---

### 3.2 Replacement Examples

**Before**:
```javascript
const hasPowerUp = Math.random() < 0.10;
const powerUpType = hasPowerUp 
    ? ['chainLightning', 'spider', 'devil'][Math.floor(Math.random() * 3)]
    : null;
```

**After**:
```javascript
const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
const powerUpType = hasPowerUp 
    ? this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)]
    : null;
```

**Before**:
```javascript
setTimeout(() => {
    nearbyWorms.forEach(nearbyWorm => {
        this.explodeWorm(nearbyWorm, false, true);
    });
}, 150); // Chain explosion delay
```

**After**:
```javascript
setTimeout(() => {
    nearbyWorms.forEach(nearbyWorm => {
        this.explodeWorm(nearbyWorm, false, true);
    });
}, this.CHAIN_EXPLOSION_DELAY);
```

---

### 3.3 Search & Replace List

Systematic replacements (30+ instances):

| Hard-coded Value | Constant Name | Instances |
|------------------|---------------|-----------|
| `0.10` | `this.POWER_UP_DROP_RATE` | 3 |
| `150` (ms) | `this.CHAIN_EXPLOSION_DELAY` | 2 |
| `600` (ms) | `this.EXPLOSION_ANIMATION_DURATION` | 4 |
| `2000` (ms) | `this.CLEANUP_DELAY` | 3 |
| `10000` (ms) | `this.SKULL_DISPLAY_DURATION` | 1 |
| `60000` (ms) | `this.SPIDER_HEART_DURATION` | 1 |
| `5000` (ms) | `this.DEVIL_KILL_TIMER` | 1 |
| `18` (px) | `this.AOE_EXPLOSION_RADIUS` | 2 |
| `30` (px) | `this.SPIDER_CONVERSION_DISTANCE` | 3 |
| `50` (px) | `this.DEVIL_PROXIMITY_KILL_DISTANCE` | 2 |
| `5` (count) | `this.GAME_OVER_STOLEN_THRESHOLD` | 2 |
| `4` (count) | `this.WRONG_ANSWER_PURPLE_THRESHOLD` | 2 |

---

### 3.4 Verification

After Phase 3:

- [ ] All animations have same timing
- [ ] Power-up drop rate unchanged (10%)
- [ ] Chain lightning kills correct number
- [ ] All distance-based mechanics work
- [ ] Game over triggers at same threshold
- [ ] No console errors or warnings

**Expected Result**: Same behavior, better code readability

---

## Phase 4: Documentation & Comments (1 hour)

**Impact**: 🟢 Low - Understanding improvement  
**Risk**: ✅ None - Comments only

### 4.1 Add JSDoc Headers

For complex methods:

```javascript
/**
 * Steals a symbol from the solution panel
 * @param {Object} worm - Worm data object
 * @returns {boolean} - True if steal successful, false otherwise
 * 
 * BEHAVIOR:
 * - Purple worms: Steal red (hidden) symbols first, fallback to blue (revealed)
 * - Normal worms: Steal only red (hidden) symbols
 * - Stolen symbol turns gray with strikethrough
 * - Triggers game over check after stealing
 */
stealSymbol(worm) {
    // ... implementation
}

/**
 * Handles purple worm click behavior
 * @param {Object} worm - Purple worm data object
 * 
 * SPECIAL BEHAVIOR:
 * - Clicking purple worm spawns GREEN clone (not purple)
 * - Green clone can be killed normally
 * - Purple worm remains active
 * - Intended punishment for wrong strategy
 */
handlePurpleWormClick(worm) {
    // ... implementation
}
```

---

### 4.2 Update README Documentation

Add to `.github/copilot-instructions.md`:

```markdown
## Worm System Architecture (Updated Oct 2025)

### Spawn Methods (Consolidated)
- `spawnWormFromConsole()` - Console slot spawn (25 lines)
- `spawnWorm()` - Fallback center spawn (20 lines)  
- `spawnWormFromBorder()` - Border spawn (35 lines)

### Helper Methods (New)
- `assignPowerUp()` - Power-up assignment logic
- `buildWormData(config)` - Worm object factory
- `registerWorm(wormData)` - Add to array + attach listeners

### Constants
All magic numbers extracted to named constants in constructor.
See lines 87-120 for complete list.

### Removed Features (Oct 2025)
- ❌ Cloning curse system (deprecated, 250 lines removed)
- ❌ Blue symbol tracking for curse (never used)
- ❌ Curse activation/reset effects (dead code)
```

---

## Phase 5: Optional Performance (2 hours)

**Impact**: 🟢 Low - Only needed if performance issues  
**Risk**: ⚠️ Medium - Requires profiling  
**When to Execute**: Only if FPS drops below 30 with 100+ worms

### 5.1 Spatial Hash Grid (If Needed)

Current collision detection is O(n²) for worm interactions.

**Add to constructor**:
```javascript
this.GRID_CELL_SIZE = 50; // pixels
this.spatialGrid = new Map();
```

**Add method**:
```javascript
updateSpatialGrid() {
    this.spatialGrid.clear();
    
    this.worms.forEach(worm => {
        const cellX = Math.floor(worm.x / this.GRID_CELL_SIZE);
        const cellY = Math.floor(worm.y / this.GRID_CELL_SIZE);
        const key = `${cellX},${cellY}`;
        
        if (!this.spatialGrid.has(key)) {
            this.spatialGrid.set(key, []);
        }
        this.spatialGrid.get(key).push(worm);
    });
}

getNearbyWorms(x, y, radius) {
    const cellX = Math.floor(x / this.GRID_CELL_SIZE);
    const cellY = Math.floor(y / this.GRID_CELL_SIZE);
    const cellRadius = Math.ceil(radius / this.GRID_CELL_SIZE);
    
    const nearby = [];
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        for (let dy = -cellRadius; dy <= cellRadius; dy++) {
            const key = `${cellX + dx},${cellY + dy}`;
            const cellWorms = this.spatialGrid.get(key);
            if (cellWorms) nearby.push(...cellWorms);
        }
    }
    
    return nearby;
}
```

**Only implement if profiling shows worm collision checks are bottleneck.**

---

## Implementation Timeline

### Week 1: Core Cleanup
- **Day 1**: Phase 1 - Dead code removal (1 hour)
- **Day 1**: Test Phase 1 thoroughly (30 min)
- **Day 2**: Phase 2 - Spawn consolidation (3 hours)
- **Day 3**: Test Phase 2 extensively (2 hours)

### Week 2: Quality Improvements
- **Day 4**: Phase 3 - Extract magic numbers (2 hours)
- **Day 4**: Test Phase 3 (30 min)
- **Day 5**: Phase 4 - Documentation (1 hour)

### Week 3: Optional
- **Day 6**: Phase 5 - Performance (only if needed)

**Total Active Development**: 7-9 hours  
**Total Testing**: 3-4 hours  
**Total Timeline**: 10-13 hours

---

## Success Metrics

After all phases complete:

### Code Metrics
- ✅ Lines reduced: 2,218 → ~1,400 (-37%)
- ✅ Method count: Same (~40 methods)
- ✅ Cyclomatic complexity: Reduced (fewer branches)
- ✅ Code duplication: 0%

### Functionality Metrics
- ✅ All existing features work identically
- ✅ No new bugs introduced
- ✅ Same performance (or better)
- ✅ Power-ups drop at same rate
- ✅ Purple worm behavior unchanged

### Maintainability Metrics
- ✅ Magic numbers: 0 (all extracted)
- ✅ Dead code: 0 lines
- ✅ Documentation: Complete JSDoc coverage
- ✅ Spawn logic: Single source of truth

---

## Risk Mitigation

### Before Starting
1. Create backup branch: `git checkout -b worm-refactor-backup`
2. Tag current state: `git tag pre-refactor-oct2025`
3. Document current behavior with screenshots
4. Run full test suite and record results

### During Refactoring
1. Commit after each phase completion
2. Test immediately after each change
3. Keep detailed changelog of modifications
4. Run game at all difficulty levels (beginner/warrior/master)

### Emergency Rollback
If critical bug found:
```bash
# Rollback entire branch
git reset --hard pre-refactor-oct2025

# Or revert specific file
git checkout pre-refactor-oct2025 -- js/worm.js

# Or cherry-pick specific phase
git revert <commit-hash>
```

---

## Testing Checklist

After each phase, verify:

### Core Gameplay
- [ ] Game loads without errors
- [ ] Problems load from all difficulty levels
- [ ] Symbols appear correctly in Panel C
- [ ] Click detection works (Panel C and console)

### Worm System
- [ ] Console worms spawn from empty slots
- [ ] Border worms spawn on row completion
- [ ] Fallback worms spawn when no slots available
- [ ] Purple worms spawn on 4+ wrong answers
- [ ] Worms roam correctly for configured duration
- [ ] Worms target red symbols when revealed
- [ ] Worms steal symbols and turn them gray

### Power-ups
- [ ] Power-ups drop on worm death (10% rate)
- [ ] All 3 types appear equally (⚡🕷️👹)
- [ ] Power-up icons show in help tooltip
- [ ] Chain Lightning kills 5 worms + AOE
- [ ] Spider spawns and converts nearby worms
- [ ] Devil spawns and attracts worms

### Purple Worm Special Behavior
- [ ] Spawns on 4+ wrong answers
- [ ] Steals red symbols first, blue if no red available
- [ ] Direct click spawns GREEN clone (not purple)
- [ ] Purple worm dies only from rain symbol match
- [ ] Green clone dies from rain OR direct click

### Edge Cases
- [ ] Max worms (999) limit enforced
- [ ] Game over triggers at 5 stolen symbols
- [ ] Console slots lock/unlock correctly
- [ ] Animation loop starts/stops appropriately
- [ ] No memory leaks (run for 5+ minutes)

---

## Code Review Checklist

Before merging refactored code:

### Code Quality
- [ ] No console.error or console.warn calls
- [ ] All magic numbers extracted to constants
- [ ] No dead code or commented-out blocks
- [ ] Consistent naming conventions
- [ ] JSDoc comments for public methods

### Architecture
- [ ] Event-driven communication maintained
- [ ] No direct cross-module function calls
- [ ] Separation of concerns preserved
- [ ] No new global variables introduced

### Performance
- [ ] No new DOM queries in animation loops
- [ ] Caching patterns maintained
- [ ] No memory leaks (profile with DevTools)
- [ ] FPS stable at 60fps (with <50 worms)

### Testing
- [ ] All test cases pass
- [ ] Manual testing completed at 3 difficulty levels
- [ ] Edge cases verified
- [ ] No regression bugs found

---

## Maintenance Guide

### Adding New Spawn Type

1. Create position calculation logic
2. Call existing helpers:
```javascript
spawnNewType() {
    this.initialize();
    if (this.worms.length >= this.maxWorms) return;
    
    // Calculate startX, startY (custom logic)
    
    // Use common pattern
    const wormId = generateUniqueId('newtype-worm');
    const wormElement = this.createWormElement({...});
    const { hasPowerUp, powerUpType } = this.assignPowerUp();
    const wormData = this.buildWormData({...});
    this.registerWorm(wormData);
}
```

### Adjusting Game Balance

All values in one place (constructor constants):
```javascript
// Easier spawn
this.POWER_UP_DROP_RATE = 0.15; // Was 0.10

// More chain lightning kills
this.CHAIN_LIGHTNING_BASE_KILLS = 7; // Was 5

// Longer roam times
this.ROAMING_DURATION_CONSOLE = 5000; // Was 3000
```

### Adding New Power-up

1. Add to array: `this.POWER_UP_TYPES = [..., 'newPowerUp']`
2. Add activation method: `activateNewPowerUp()`
3. Add case in `usePowerUp()` switch
4. Add visual in `updatePowerUpDisplay()`

---

## Conclusion

This pragmatic plan focuses on **high-impact, low-risk changes** executed incrementally:

1. **Phase 1** (1 hour): Remove 250 lines of dead code - zero risk
2. **Phase 2** (3 hours): Consolidate 300 lines of duplicates - medium risk, high value
3. **Phase 3** (2 hours): Extract magic numbers - low risk, high maintainability
4. **Phase 4** (1 hour): Add documentation - zero risk, high value
5. **Phase 5** (2 hours): Performance optimization - only if needed

**Total Reduction**: 550+ lines (-25%)  
**Total Time**: 7-9 hours active work  
**Risk Level**: Low (with proper testing)  
**Value**: High (maintainability + performance)

**Next Steps**: Begin with Phase 1 (dead code removal) as it has zero risk and immediate impact.

---

**End of Pragmatic Refactoring Plan**
