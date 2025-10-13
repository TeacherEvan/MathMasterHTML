# Worm System Refactoring Plan

**Date**: October 13, 2025  
**File**: `js/worm.js` (2216 lines)  
**Status**: Ready for Review

## 🎯 Goals

1. **Improve maintainability** - Reduce code duplication and improve organization
2. **Enhance readability** - Extract complex logic into well-named methods
3. **Preserve performance** - Maintain existing optimizations (caching, RAF usage, event delegation)
4. **Keep event-driven architecture** - All inter-module communication stays via DOM events

## 📊 Current State Analysis

### File Statistics

- **Total Lines**: 2,216
- **Class Methods**: ~45
- **Longest Method**: `animate()` (~260 lines)
- **Magic Numbers**: ~15 hardcoded values
- **Code Duplication**: 3 spawn methods with similar structure

### Key Issues Identified

#### 1. **Long Methods** (Priority: HIGH)

- `animate()`: 260+ lines handling 5 different worm states
- `spawnWormFromBorder()`: 150+ lines with duplicate logic
- `explodeWorm()`: Chain reaction logic embedded with explosion effects

#### 2. **Code Duplication** (Priority: HIGH)

- Worm spawn methods repeat similar setup (position, element creation, event listeners)
- Movement calculations duplicated across different worm states
- Boundary checking logic repeated in multiple places

#### 3. **Magic Numbers** (Priority: MEDIUM)

- `distance < 30` (line 1085) - symbol steal distance threshold
- `distance < 20` (line 1169, 1212) - console arrival threshold
- `AOE_RADIUS = 18` (line 1508) - chain explosion radius
- `12` (line 1566) - particle count in explosions
- Percentages scattered (20%, 50%, 10%)

#### 4. **State Management** (Priority: MEDIUM)

- Worm objects have 15+ properties mixing state flags and cached data
- No clear state machine for worm lifecycle (roaming → targeting → stealing → escaping)

#### 5. **Method Organization** (Priority: LOW)

- Methods not logically grouped by responsibility
- Public/private methods not clearly distinguished
- Power-up methods scattered throughout file

## 🔧 Proposed Refactorings

### Phase 1: Extract Movement Logic (Estimated: 45 min)

#### 1.1 Extract Worm State Handlers from `animate()`

**Current**: 260-line method handling all worm behaviors  
**Proposed**: Extract into separate state handler methods

```javascript
// New methods to extract:
_updateWormRushingToDevil(worm, currentTime)
_updateWormRushingToTarget(worm, currentTime)
_updateWormRoaming(worm, currentTime)
_updateWormReturningToConsole(worm, currentTime)
_updateWormCarryingSymbol(worm, currentTime)

// Simplified animate() becomes:
animate() {
    if (this.worms.length === 0) {
        this.animationFrameId = null;
        return;
    }

    const currentTime = Date.now();
    const viewportBounds = {
        width: window.innerWidth,
        height: window.innerHeight,
        panelBRect: this.getCachedContainerRect()
    };

    this.worms.forEach(worm => {
        if (!worm.active) return;

        worm.crawlPhase = (worm.crawlPhase + 0.05) % (Math.PI * 2);

        // Delegate to state handlers
        if (worm.isRushingToDevil) {
            this._updateWormRushingToDevil(worm, currentTime, viewportBounds);
        } else if (!worm.hasStolen && !worm.isRushingToTarget && currentTime >= worm.roamingEndTime) {
            this.stealSymbol(worm);
        } else if (worm.isRushingToTarget && !worm.hasStolen) {
            this._updateWormRushingToTarget(worm, currentTime, viewportBounds);
        } else if (!worm.hasStolen) {
            this._updateWormRoaming(worm, currentTime, viewportBounds);
        } else if (worm.hasStolen && worm.fromConsole) {
            this._updateWormReturningToConsole(worm, currentTime, viewportBounds);
        } else if (worm.hasStolen) {
            this._updateWormCarryingSymbol(worm, currentTime, viewportBounds);
        }

        this._applyWormPosition(worm);
    });

    if (this.worms.some(w => w.active)) {
        this.animationFrameId = requestAnimationFrame(() => this.animate());
    } else {
        this.animationFrameId = null;
    }
}
```

**Benefits**:

- Each state handler is 30-50 lines (testable, readable)
- Easier to debug specific behaviors
- Clear separation of concerns

---

### Phase 2: Extract Movement Utilities (Estimated: 30 min)

#### 2.1 Create Movement Helper Methods

Extract repeated movement calculations:

```javascript
/**
 * Calculate velocity toward target position
 * @private
 */
_calculateVelocityToTarget(worm, targetX, targetY, speedMultiplier = 1) {
    const distance = calculateDistance(worm.x, worm.y, targetX, targetY);
    const dx = targetX - worm.x;
    const dy = targetY - worm.y;
    
    const speed = worm.baseSpeed * speedMultiplier;
    
    return {
        velocityX: (dx / distance) * speed,
        velocityY: (dy / distance) * speed,
        distance: distance,
        direction: Math.atan2(dy, dx)
    };
}

/**
 * Apply boundary constraints to worm position
 * @private
 */
_constrainToBounds(worm, bounds) {
    const { width, height, margin = 20 } = bounds;
    
    if (worm.x < margin) {
        worm.x = margin;
        worm.direction = Math.PI - worm.direction;
    }
    if (worm.x > width - margin) {
        worm.x = width - margin;
        worm.direction = Math.PI - worm.direction;
    }
    if (worm.y < margin) {
        worm.y = margin;
        worm.direction = -worm.direction;
    }
    if (worm.y > height - margin) {
        worm.y = height - margin;
        worm.direction = -worm.direction;
    }
}

/**
 * Update worm rotation to face movement direction
 * @private
 */
_updateWormRotation(worm) {
    // Add π (180°) to flip worm so head faces forward
    worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
}

/**
 * Apply crawling movement with inchworm effect
 * @private
 */
_applyCrawlMovement(worm) {
    worm.direction += (Math.random() - 0.5) * 0.1;
    const crawlOffset = Math.sin(worm.crawlPhase) * 0.5;
    
    worm.velocityX = Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
    worm.velocityY = Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);
    
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;
}
```

**Usage Example**:

```javascript
_updateWormRoaming(worm, currentTime, viewportBounds) {
    this._applyCrawlMovement(worm);
    this._constrainToBounds(worm, {
        width: viewportBounds.width,
        height: viewportBounds.height,
        margin: 20
    });
    this._updateWormRotation(worm);
}
```

**Benefits**:

- Eliminates 200+ lines of duplicate movement code
- Single source of truth for movement calculations
- Easier to tune movement behavior

---

### Phase 3: Consolidate Magic Numbers (Estimated: 20 min)

#### 3.1 Create Distance Threshold Constants

Add to constructor constants section:

```javascript
// DISTANCE THRESHOLDS
this.DISTANCE_STEAL_SYMBOL = 30; // px - how close to symbol to steal it
this.DISTANCE_CONSOLE_ARRIVAL = 20; // px - how close to console to escape
this.DISTANCE_DEVIL_PROXIMITY = 50; // px - already exists, keep for reference
this.DISTANCE_TARGET_RUSH = 30; // px - when rushing to target symbol

// EXPLOSION CONSTANTS
this.EXPLOSION_AOE_RADIUS = 18; // px - one worm height
this.EXPLOSION_PARTICLE_COUNT = 12; // number of particles per explosion
this.EXPLOSION_FLASH_DURATION = 200; // ms

// POSITION CONSTRAINTS
this.VIEWPORT_MARGIN = 20; // px - distance from edge
this.WORM_SPAWN_OFFSET_RANGE = 60; // px - max offset when cloning
```

#### 3.2 Update All Usage Sites

Replace hardcoded values with named constants:

```javascript
// BEFORE:
if (distance < 30) {
    this.stealSymbol(worm);
}

// AFTER:
if (distance < this.DISTANCE_STEAL_SYMBOL) {
    this.stealSymbol(worm);
}
```

**Benefits**:

- Self-documenting code
- Easy to tune game balance
- Matches existing constant pattern in constructor

---

### Phase 4: Simplify Spawn Methods (Estimated: 35 min)

#### 4.1 Create Unified Spawn Configuration

Extract common worm data creation:

```javascript
/**
 * Create default worm data object
 * @private
 */
_createWormData(config) {
    const {
        id,
        element,
        x,
        y,
        baseSpeed,
        roamDuration,
        isPurple = false,
        fromConsole = false,
        consoleSlotData = null
    } = config;
    
    const hasPowerUp = Math.random() < this.POWER_UP_DROP_RATE;
    const powerUpType = hasPowerUp 
        ? this.POWER_UP_TYPES[Math.floor(Math.random() * this.POWER_UP_TYPES.length)]
        : null;
    
    const wormData = {
        id,
        element,
        stolenSymbol: null,
        targetElement: null,
        targetSymbol: null,
        x,
        y,
        velocityX: (Math.random() - 0.5) * baseSpeed,
        velocityY: (Math.random() - 0.5) * baseSpeed,
        active: true,
        hasStolen: false,
        isRushingToTarget: false,
        roamingEndTime: Date.now() + roamDuration,
        isFlickering: false,
        baseSpeed,
        currentSpeed: baseSpeed,
        crawlPhase: Math.random() * Math.PI * 2,
        direction: Math.random() * Math.PI * 2,
        hasPowerUp,
        powerUpType,
        isPurple,
        fromConsole
    };
    
    if (fromConsole && consoleSlotData) {
        wormData.consoleSlotIndex = consoleSlotData.index;
        wormData.consoleSlotElement = consoleSlotData.element;
    }
    
    if (isPurple) {
        wormData.canStealBlue = true;
        wormData.prioritizeRed = true;
        wormData.shouldExitToConsole = true;
        wormData.exitingToConsole = false;
        wormData.targetConsoleSlot = null;
    }
    
    return wormData;
}

/**
 * Finalize worm spawn (add to array, attach listeners, start animation)
 * @private
 */
_finalizeWormSpawn(wormData) {
    this.worms.push(wormData);
    
    // Attach click handler
    const clickHandler = wormData.isPurple
        ? (e) => {
            e.stopPropagation();
            this.handlePurpleWormClick(wormData);
        }
        : (e) => {
            e.stopPropagation();
            this.handleWormClick(wormData);
        };
    
    wormData.element.addEventListener('click', clickHandler);
    
    if (wormData.hasPowerUp) {
        console.log(`✨ Worm ${wormData.id} has power-up: ${wormData.powerUpType}`);
    }
    
    console.log(`✅ Worm ${wormData.id} spawned. Total worms: ${this.worms.length}`);
    
    // Start animation loop if first worm
    if (this.worms.length === 1) {
        this.animate();
    }
}
```

#### 4.2 Simplify Spawn Methods

Now spawn methods become thin wrappers:

```javascript
spawnWormFromConsole() {
    this.initialize();
    
    if (this.worms.length >= this.maxWorms) {
        console.log(`⚠️ Max worms (${this.maxWorms}) reached.`);
        return;
    }
    
    const slotData = this.findEmptyConsoleSlot();
    if (!slotData) {
        this.spawnWorm(); // Fallback
        return;
    }
    
    // Lock console slot
    this.lockedConsoleSlots.add(slotData.index);
    slotData.element.classList.add('worm-spawning', 'locked');
    
    // Get spawn position
    const slotRect = slotData.element.getBoundingClientRect();
    const x = slotRect.left + (slotRect.width / 2);
    const y = slotRect.top + (slotRect.height / 2);
    
    // Create worm element
    const wormId = generateUniqueId('worm');
    const wormElement = this.createWormElement({
        id: wormId,
        classNames: ['console-worm'],
        segmentCount: this.WORM_SEGMENT_COUNT,
        x, y
    });
    
    this.crossPanelContainer.appendChild(wormElement);
    
    // Create worm data
    const wormData = this._createWormData({
        id: wormId,
        element: wormElement,
        x, y,
        baseSpeed: this.SPEED_CONSOLE_WORM,
        roamDuration: this.difficultyRoamTimeConsole,
        fromConsole: true,
        consoleSlotData: slotData
    });
    
    // Finalize spawn
    this._finalizeWormSpawn(wormData);
}
```

**Benefits**:

- Spawn methods reduced from ~100 lines to ~40 lines each
- Eliminates duplicate data structure creation
- Single source of truth for worm configuration
- Easier to add new worm types

---

### Phase 5: Organize Methods by Responsibility (Estimated: 25 min)

#### 5.1 Group Methods with JSDoc Section Comments

Reorganize file into logical sections:

```javascript
class WormSystem {
    constructor() { /* ... */ }
    
    // ========================================
    // INITIALIZATION & SETUP
    // ========================================
    
    initialize() { /* ... */ }
    setupEventListeners() { /* ... */ }
    
    // ========================================
    // SPAWN MANAGEMENT
    // ========================================
    
    queueWormSpawn(type, data) { /* ... */ }
    processSpawnQueue() { /* ... */ }
    spawnWormFromConsole() { /* ... */ }
    spawnWormFromBorder(data) { /* ... */ }
    spawnWorm() { /* ... */ }
    spawnPurpleWorm() { /* ... */ }
    _createWormData(config) { /* ... */ }
    _finalizeWormSpawn(wormData) { /* ... */ }
    createWormElement(config) { /* ... */ }
    findEmptyConsoleSlot() { /* ... */ }
    
    // ========================================
    // ANIMATION & MOVEMENT
    // ========================================
    
    animate() { /* ... */ }
    _updateWormRushingToDevil(worm, time, bounds) { /* ... */ }
    _updateWormRushingToTarget(worm, time, bounds) { /* ... */ }
    _updateWormRoaming(worm, time, bounds) { /* ... */ }
    _updateWormReturningToConsole(worm, time, bounds) { /* ... */ }
    _updateWormCarryingSymbol(worm, time, bounds) { /* ... */ }
    _calculateVelocityToTarget(worm, x, y, mult) { /* ... */ }
    _constrainToBounds(worm, bounds) { /* ... */ }
    _updateWormRotation(worm) { /* ... */ }
    _applyCrawlMovement(worm) { /* ... */ }
    _applyWormPosition(worm) { /* ... */ }
    
    // ========================================
    // WORM BEHAVIOR & INTERACTIONS
    // ========================================
    
    stealSymbol(worm) { /* ... */ }
    notifyWormsOfRedSymbol(symbol) { /* ... */ }
    checkWormTargetClickForExplosion(symbol) { /* ... */ }
    handleWormClick(worm) { /* ... */ }
    handlePurpleWormClick(worm) { /* ... */ }
    cloneWorm(worm) { /* ... */ }
    clonePurpleWorm(worm) { /* ... */ }
    explodeWorm(worm, isRain, isChain) { /* ... */ }
    removeWorm(worm) { /* ... */ }
    killAllWorms() { /* ... */ }
    
    // ========================================
    // VISUAL EFFECTS
    // ========================================
    
    createExplosionParticles(x, y) { /* ... */ }
    createExplosionFlash(color) { /* ... */ }
    createSlimeSplat(x, y) { /* ... */ }
    createCrack(x, y) { /* ... */ }
    cleanupCracks() { /* ... */ }
    
    // ========================================
    // POWER-UP SYSTEM
    // ========================================
    
    dropPowerUp(x, y, type) { /* ... */ }
    collectPowerUp(type, element) { /* ... */ }
    updatePowerUpDisplay() { /* ... */ }
    usePowerUp(type) { /* ... */ }
    activateChainLightning() { /* ... */ }
    activateSpider() { /* ... */ }
    spawnSpider(x, y) { /* ... */ }
    activateDevil() { /* ... */ }
    spawnDevil(x, y) { /* ... */ }
    
    // ========================================
    // GAME OVER SYSTEM
    // ========================================
    
    checkGameOverCondition() { /* ... */ }
    triggerGameOver() { /* ... */ }
    removeRandomConsoleSymbol() { /* ... */ }
    showGameOverModal() { /* ... */ }
    
    // ========================================
    // PERFORMANCE & CACHING
    // ========================================
    
    getCachedRevealedSymbols() { /* ... */ }
    getCachedContainerRect() { /* ... */ }
    invalidateSymbolCache() { /* ... */ }
    
    // ========================================
    // UTILITIES
    // ========================================
    
    reset() { /* ... */ }
}
```

**Benefits**:

- Easy to find methods by responsibility
- Clear code organization
- Helps identify misplaced methods
- Matches conventions in other large classes

---

### Phase 6: Remove Dead Code (Estimated: 15 min)

#### 6.1 Cloning Curse Cleanup

According to ARCHITECTURE.md, cloning curse was removed October 2025, but methods still exist:

**To Remove**:

- `cloneWorm()` method (lines 1305-1408)
- References to "cloning curse" in comments

**To Keep**:

- `clonePurpleWorm()` - Still used for purple worm mechanic
- Clone worm behavior is now only for purple worms (intentional punishment)

#### 6.2 Document Purple Worm Click Behavior

Update JSDoc comments to clarify:

```javascript
/**
 * Handle purple worm click - ALWAYS creates green clone
 * This is intentional punishment mechanic (see ARCHITECTURE.md)
 * 
 * Purple worms can only be killed by clicking matching symbol in Panel C rain.
 * Clicking purple worm directly creates a green clone that CAN be killed normally.
 * 
 * @param {Object} worm - Purple worm data
 */
handlePurpleWormClick(worm) {
    if (!worm.active) return;
    
    console.log(`🟣 Purple worm ${worm.id} clicked - CREATING GREEN CLONE (punishment mechanic)!`);
    
    // Visual feedback
    worm.element.style.animation = 'worm-flash-purple 0.5s ease-out';
    setTimeout(() => {
        worm.element.style.animation = '';
    }, 500);
    
    // Clone as GREEN worm (not purple)
    this._cloneAsGreenWorm(worm);
}
```

---

## 📋 Implementation Checklist

### Phase 1: Extract Movement Logic ✅

- [ ] Create `_updateWormRushingToDevil()`
- [ ] Create `_updateWormRushingToTarget()`
- [ ] Create `_updateWormRoaming()`
- [ ] Create `_updateWormReturningToConsole()`
- [ ] Create `_updateWormCarryingSymbol()`
- [ ] Refactor `animate()` to delegate to state handlers
- [ ] Test all worm movement behaviors

### Phase 2: Extract Movement Utilities ✅

- [ ] Create `_calculateVelocityToTarget()`
- [ ] Create `_constrainToBounds()`
- [ ] Create `_updateWormRotation()`
- [ ] Create `_applyCrawlMovement()`
- [ ] Create `_applyWormPosition()`
- [ ] Replace duplicate code with utility calls
- [ ] Test boundary behavior and rotation

### Phase 3: Consolidate Magic Numbers ✅

- [ ] Add distance threshold constants
- [ ] Add explosion constants
- [ ] Add position constraint constants
- [ ] Replace all hardcoded values
- [ ] Document each constant's purpose

### Phase 4: Simplify Spawn Methods ✅

- [ ] Create `_createWormData()`
- [ ] Create `_finalizeWormSpawn()`
- [ ] Refactor `spawnWormFromConsole()`
- [ ] Refactor `spawnWormFromBorder()`
- [ ] Refactor `spawnWorm()`
- [ ] Refactor `spawnPurpleWorm()`
- [ ] Test spawning from all sources

### Phase 5: Organize Methods ✅

- [ ] Add section comments
- [ ] Reorder methods by responsibility
- [ ] Verify no functionality changes

### Phase 6: Remove Dead Code ✅

- [ ] Remove `cloneWorm()` method
- [ ] Update purple worm click JSDoc
- [ ] Remove cloning curse references
- [ ] Verify purple worm mechanic still works

---

## 🧪 Testing Strategy

### Manual Testing Checklist

After each phase, verify:

1. **Spawning** ✅
   - [ ] Console worms spawn and lock slots
   - [ ] Border worms spawn on row completion
   - [ ] Purple worms spawn on wrong answers
   - [ ] Fallback spawn works when console full

2. **Movement** ✅
   - [ ] Worms roam smoothly across all panels
   - [ ] Worms rush to revealed red symbols
   - [ ] Worms return to console with stolen symbols
   - [ ] Boundary reflection works correctly

3. **Stealing** ✅
   - [ ] Worms steal symbols after roaming period
   - [ ] Purple worms prioritize red symbols
   - [ ] Purple worms can steal blue if no red available
   - [ ] Stolen symbols turn gray/hidden

4. **Explosions** ✅
   - [ ] Click worm → explodes + returns symbol
   - [ ] Click rain symbol → worm explodes
   - [ ] Chain reactions work within AOE radius
   - [ ] Cracks and slime appear correctly

5. **Power-ups** ✅
   - [ ] Power-ups drop at 10% rate
   - [ ] Click power-up → collects correctly
   - [ ] Chain lightning kills multiple worms
   - [ ] Spider/Devil mechanics work

6. **Purple Worms** ✅
   - [ ] Click purple worm → creates GREEN clone
   - [ ] Purple worm stays active after click
   - [ ] Purple worm only dies from rain symbol click

### Performance Verification

- [ ] FPS stays 55-60 with 20+ worms
- [ ] No memory leaks over 5 minutes
- [ ] DOM query count stays < 150/sec

---

## 🚫 What NOT to Change

### Preserve These Patterns

1. **Event-driven communication** - All inter-module events stay as-is
2. **Performance optimizations** - Keep caching, RAF usage, spawn queuing
3. **Factory method** - `createWormElement()` already works well
4. **Difficulty scaling** - Keep level-based speed/count multipliers
5. **DOM structure** - No changes to HTML/CSS class names

### Keep These As-Is

- Power-up drop rate (10%)
- Worm segment count (5)
- Animation timing constants
- Z-index values
- Cross-panel container setup

---

## 📈 Expected Outcomes

### Code Quality Improvements

- **Lines reduced**: 2,216 → ~1,850 (16% reduction)
- **Longest method**: 260 lines → ~60 lines (77% reduction)
- **Code duplication**: ~200 lines → ~50 lines (75% reduction)
- **Magic numbers**: 15 → 0 (100% elimination)

### Maintainability Gains

- Clear method organization by responsibility
- Self-documenting constants
- Testable state handlers (30-50 lines each)
- Easier to debug specific behaviors

### Performance Impact

- **No negative impact expected** - refactoring is structural only
- May see slight improvement from reduced code branching
- All existing optimizations preserved

---

## ⚠️ Risks & Mitigation

### Risk 1: Breaking Worm Behavior

**Mitigation**: Test each phase independently before moving to next

### Risk 2: Performance Regression

**Mitigation**: Profile before/after with performance monitor ('P' key)

### Risk 3: Event Listener Issues

**Mitigation**: No changes to event setup, only internal logic extraction

---

## 🎬 Next Steps

1. **Review this plan** with user/team
2. **Get approval** for scope and approach
3. **Execute Phase 1** (extract movement logic)
4. **Test Phase 1** thoroughly
5. **Repeat** for remaining phases
6. **Final QA** with full game playthrough

---

## 📚 References

- `Docs/ARCHITECTURE.md` - Worm system design
- `Docs/DEVELOPMENT_GUIDE.md` - Coding standards
- `Docs/PERFORMANCE.md` - Optimization patterns
- `.github/copilot-instructions.md` - Project conventions
