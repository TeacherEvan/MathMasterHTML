# Architecture Guide - Math Master Algebra

**Last Updated**: October 12, 2025  
**Component Focus**: Worm System & Game Balance

---

## Overview

This guide documents the architecture of Math Master Algebra's adversarial worm system, including design philosophy, technical implementation, and known game balance considerations.

---

## Table of Contents

1. [Worm System Architecture](#worm-system-architecture)
2. [Lifecycle & State Machine](#lifecycle--state-machine)
3. [Game Balance Considerations](#game-balance-considerations)
4. [Event-Driven Communication](#event-driven-communication)
5. [Technical Implementation](#technical-implementation)
6. [Known Issues & Improvements](#known-issues--improvements)

---

## Worm System Architecture

### Design Philosophy

Worms serve as **adaptive adversaries** that create time pressure and strategic depth:

- **Risk/Reward**: Players choose when to clone worms vs eliminate them
- **Resource Management**: Limited console slots force strategic decisions
- **Timing Pressure**: Race to click symbols before worms steal them
- **Pattern Recognition**: Learn which symbols are most valuable to protect

### Core Components

**1. Spawn System** - Row-based spawning from console slots and borders
**2. Movement System** - Realistic crawling with boundary physics
**3. AI System** - Roaming → Targeting → Stealing state machine
**4. Stealing Mechanism** - Symbol theft with visual feedback
**5. Power-Up Integration** - Chain Lightning, Spider, Devil mechanics
**6. Visual Effects** - LSD flash, explosion, slime splats

---

## Lifecycle & State Machine

### Complete Worm Lifecycle

```
1. SPAWN
   ↓ Row completed → worm emerges from console slot or border
   ↓ Console button LOCKS (if from console)

2. ROAM (duration varies)
   ↓ Crawl around Panel B with bouncing physics
   ↓ Rotate to face movement direction
   ↓ Wait for `symbolRevealed` event

3. RUSH (when revealed symbol detected)
   ↓ Increase speed to 4.0 (2x base)
   ↓ Navigate toward target symbol
   ↓ Reach symbol within 30px

4. STEAL
   ↓ Hide symbol (mark data-stolen=true)
   ↓ Activate LSD rainbow flash
   ↓ Speed boost to 2.4 (20% increase)
   ↓ Carry symbol badge above worm

5A. ESCAPE (successful theft)
    ↓ Return to console hole
    ↓ Symbol stays hidden
    ↓ Console unlocks
    ↓ User must re-click in Panel C to recover

5B. EXPLOSION (user clicks matching symbol)
    ↓ Worm explodes with animation
    ↓ Symbol returns to Panel B revealed
    ↓ Console unlocks
    ↓ Worm removed from play

6. CLONING (user clicks worm - Green worms only)
   ↓ Create duplicate with same target
   ↓ Both worms continue mission
   ↓ Max 999 worms (effectively unlimited)
```

### State Transitions

```javascript
const wormStates = {
    SPAWNING: 'spawning',     // Emerging from console/border
    ROAMING: 'roaming',       // Random movement
    TARGETING: 'targeting',   // Rushing to symbol
    STEALING: 'stealing',     // Symbol acquisition
    CARRYING: 'carrying',     // Returning with symbol
    ESCAPING: 'escaping',     // Entering console hole
    EXPLODING: 'exploding',   // Death animation
    CLONING: 'cloning'        // Creating duplicate
};
```

---

## Game Balance Considerations

### Critical Balance Issue

**Problem Identified**: Worms may be **ineffective** as adversaries if:

- Players complete problems without losing symbols
- Worms arrive too late (after player already solved row)
- No difficulty scaling between Beginner/Warrior/Master
- Power-ups become unnecessary (worms not threatening)

### Current Timing Analysis

**Current Worm Timeline:**

```
Row 1 complete (0s)
    ↓
Worms spawn (0s)
    ↓
Worms roam randomly (0-10s) ← POTENTIAL PROBLEM
    ↓
Worms target symbol (10s)
    ↓
Worms steal symbol (12s)
```

**Player Timeline:**

```
Row 1 complete (0s)
    ↓
Player solves Row 2 (3-5s)
    ↓
Row 2 complete (5s)
```

**Issue**: Worms may arrive at 12s, but row already completed at 5s.

### Current Configuration

**File**: `js/worm.js`

```javascript
// Spawn configuration
this.wormsPerRow = 5;              // Same at all difficulty levels
this.additionalWormsPerRow = 0;    // No escalation per row
this.maxWorms = 999;               // Effectively unlimited

// Timing constants (milliseconds)
this.ROAMING_DURATION_CONSOLE = 8000;   // 8 seconds
this.ROAMING_DURATION_BORDER = 10000;   // 10 seconds

// Speed configuration
this.SPEED_CONSOLE_WORM = 1.2;
this.SPEED_BORDER_WORM = 1.5;
```

**Note**: These values may need tuning based on actual gameplay testing.

### Potential Improvements (Not Yet Implemented)

**1. Reduce Roaming Time:**

```javascript
// Potential quick fix
this.ROAMING_DURATION_CONSOLE = 3000;   // 3s instead of 8s
this.ROAMING_DURATION_BORDER = 5000;    // 5s instead of 10s
```

**2. Add Difficulty Scaling:**

```javascript
// Potential difficulty-based settings
const difficultySettings = {
    beginner: { 
        wormsPerRow: 3, 
        speed: 1.0, 
        roamTime: 8000 
    },
    warrior: { 
        wormsPerRow: 5, 
        speed: 1.5, 
        roamTime: 6000 
    },
    master: { 
        wormsPerRow: 8, 
        speed: 2.0, 
        roamTime: 4000 
    }
};
```

**3. Earlier Spawn Timing:**

```javascript
// Pre-spawn some worms on first symbol reveal
document.addEventListener('symbolRevealed', (e) => {
    if (!this.hasPreSpawnedThisRow) {
        this.hasPreSpawnedThisRow = true;
        this.queueWormSpawn('border', { count: 2 }); // 2 fast worms
    }
});
```

### Success Metrics (Target Ranges)

| Metric | Beginner | Warrior | Master |
|--------|----------|---------|---------|
| Symbols Stolen/Problem | 1-2 (20-30%) | 2-4 (40-50%) | 4-6 (60-70%) |
| Power-Ups Used/Problem | 0-1 | 1-2 | 2-3 |
| Time-to-Steal | 8-12s | 6-10s | 4-8s |
| Worms per Problem | 15-20 | 25-35 | 40-60 |

**Note**: These are theoretical targets. Actual gameplay may require different values.

---

## Event-Driven Communication

### Key Events

**Worm System Events:**

```javascript
// Spawn trigger
'problemLineCompleted' → { detail: { lineNumber: 1 } }

// Target detection
'symbolRevealed' → { detail: { symbol: 'X', element: HTMLElement } }

// Destruction
'symbolClicked' → { detail: { symbol: 'X' } }
'wormSymbolCorrect' → { detail: { symbol: 'X' } }

// Boss mechanics
'purpleWormTriggered' → { detail: { wrongAnswers: 4 } }
```

### Event Handlers

**Spawn System** (`js/worm.js` lines ~230-250):

```javascript
document.addEventListener('problemLineCompleted', (event) => {
    const lineNumber = event.detail?.lineNumber || 1;
    
    // Spawn row-based worms
    for (let i = 0; i < this.wormsPerRow; i++) {
        this.queueWormSpawn('border', { 
            index: i, 
            total: this.wormsPerRow, 
            lineNumber 
        });
    }
});
```

**Target Detection** (`js/worm.js` lines ~280-300):

```javascript
document.addEventListener('symbolRevealed', (event) => {
    const symbol = event.detail?.symbol;
    
    // Roaming worms rush to revealed symbols
    this.worms.forEach(worm => {
        if (worm.active && !worm.hasStolen && worm.state === 'roaming') {
            worm.targetSymbol = symbol;
            worm.isRushingToTarget = true;
            worm.currentSpeed = worm.baseSpeed * 2; // 2x speed boost
        }
    });
});
```

---

## Technical Implementation

### Data Structure

```javascript
const wormData = {
    id: string,                    // Unique identifier
    element: HTMLElement,          // DOM reference
    stolenSymbol: string | null,   // Symbol currently stolen
    targetElement: HTMLElement,    // DOM reference to stolen symbol
    targetSymbol: string | null,   // Symbol worm is targeting
    x: number,                     // Position X
    y: number,                     // Position Y
    velocityX: number,             // Movement velocity X
    velocityY: number,             // Movement velocity Y
    active: boolean,               // Is worm active
    hasStolen: boolean,            // Has worm stolen symbol
    isRushingToTarget: boolean,    // Is worm rushing to symbol
    roamingEndTime: number,        // Timestamp when roaming ends
    isFlickering: boolean,         // LSD effect active
    baseSpeed: 2.0,                // Base movement speed
    currentSpeed: 2.0,             // Current speed (with boosts)
    consoleSlotIndex: number,      // Console slot that spawned worm
    consoleSlotElement: HTMLElement, // Console slot reference
    fromConsole: boolean,          // True if spawned from console
    crawlPhase: number,            // Animation phase (0 to 2π)
    direction: number,             // Movement direction in radians
    state: string                  // Current lifecycle state
};
```

### Movement System

**Crawling Animation** (`css/worm-styles.css`):

```css
@keyframes worm-crawl {
    0% { transform: translateY(0) scaleX(1); }
    25% { transform: translateY(-2px) scaleX(1.15); }
    50% { transform: translateY(0) scaleX(0.9); }
    75% { transform: translateY(2px) scaleX(1.1); }
    100% { transform: translateY(0) scaleX(1); }
}
```

**Position Updates** (`js/worm.js` - `animate()` method):

- Uses `requestAnimationFrame` for 60fps smooth animation
- Direct style manipulation (NOT CSS transitions)
- Boundary clamping with 20px margins
- Reflection physics on collision

### Spawn Queue System

**Prevents Frame Drops** during multi-worm spawns:

```javascript
queueWormSpawn(type, data = {}) {
    this.spawnQueue.push({ type, data, timestamp: Date.now() });
    this.processSpawnQueue();
}

processSpawnQueue() {
    if (this.isProcessingSpawnQueue || this.spawnQueue.length === 0) return;
    
    this.isProcessingSpawnQueue = true;
    const spawnData = this.spawnQueue.shift();
    
    // Process spawn
    this.executeSpawn(spawnData);
    
    // Space out spawns with requestAnimationFrame
    requestAnimationFrame(() => {
        this.isProcessingSpawnQueue = false;
        this.processSpawnQueue(); // Process next in queue
    });
}
```

### Purple Worm Mechanics (Boss Enemy)

**Spawn Trigger**: 4+ wrong answers
**Special Behaviors**:

1. **Symbol Stealing Priority**:
   - First: Steal red (hidden) symbols only
   - Fallback: If no red symbols, can steal blue (revealed) symbols
   - Makes purple worms more dangerous near problem completion

2. **Click Punishment**:
   - Clicking purple worm → Spawns GREEN clone (not purple)
   - Green clone can be killed normally
   - Purple worm remains active
   - **Intended behavior**: Punishes brute-force clicking

3. **Correct Kill Method**:
   - Purple worms ONLY killed by clicking matching symbol in Panel C rain
   - Example: Purple worm carrying "X" → Click "X" in falling symbols
   - Forces engagement with Panel C system

---

## Known Issues & Improvements

### 1. Code Duplication (Deferred)

**Issue**: Three spawn methods with ~85% duplicate code (~360 lines):

- `spawnWormFromConsole()` - 150 lines
- `spawnWorm()` - 145 lines
- `spawnWormFromBorder()` - 150 lines

**Status**: Deferred to future PR (high complexity/risk)
**Recommendation**: Consolidate using factory pattern with comprehensive testing

### 2. Game Balance (Needs Testing)

**Issue**: Worms may not be threatening enough in current configuration
**Status**: Requires real gameplay testing and metrics collection
**Priority**: High - affects core gameplay loop

**Testing Needed**:

- Measure actual symbol theft rates across difficulty levels
- Track time-to-steal in real gameplay
- Collect player feedback on worm effectiveness

### 3. Performance with 100+ Worms

**Current State**:

- Max worms = 999 (effectively unlimited)
- No spatial hash grid for collision detection
- O(n²) collision checks in some cases

**Potential Issues**:

- Frame drops with 100+ active worms
- Memory growth during long play sessions

**Mitigation**:

- Performance monitor available (press 'P' key)
- Spawn queue system prevents spawn-time frame drops
- Early testing shows stable 60fps with 30-40 worms

### 4. Cloning Curse System (REMOVED)

**Status**: ✅ Completely removed October 2025
**Impact**: 81 lines removed from `js/worm.js`
**Details**: See `Docs/DEVELOPMENT_GUIDE.md` for cleanup summary

---

## Visual Effects System

### LSD Rainbow Flash

**Trigger**: Worm steals symbol
**Effect**:

- Hue rotation through full 360° spectrum
- Drop-shadow color matches hue
- 0.3s animation speed for intense flashing
- 20% speed boost while active

**CSS** (`css/worm-styles.css`):

```css
@keyframes lsd-flicker {
    0% { filter: hue-rotate(0deg); }
    14% { filter: hue-rotate(60deg); }
    28% { filter: hue-rotate(120deg); }
    42% { filter: hue-rotate(180deg); }
    57% { filter: hue-rotate(240deg); }
    71% { filter: hue-rotate(300deg); }
    100% { filter: hue-rotate(360deg); }
}
```

### Carried Symbol Badge

**Position**: 30px above worm
**Style**: Red gradient background with glow
**Animation**: Pulsating glow effect
**Rotation**: Syncs with worm body rotation

### Explosion Effect

**Trigger**: Worm killed (click or rain symbol)
**Animation**: `.worm-clicked` class (600ms duration)
**Cleanup**: 300ms delay before DOM removal
**Splat**: Green slime splat remains for 10 seconds

---

## Console Integration

### Console Slot Locking

**Mechanism**:

```javascript
// Lock slot when worm spawns
this.lockedConsoleSlots.add(slotIndex);
consoleSlot.classList.add('locked');

// Unlock when worm completes (escape or death)
this.lockedConsoleSlots.delete(slotIndex);
consoleSlot.classList.remove('locked');
```

**Visual Feedback**:

- Empty slots glow green when available for spawn
- `.worm-spawning` class for slide-open animation
- `.locked` class disables clicking during worm activity

---

## Power-Up Integration

**Chain Lightning** ⚡: Kills 5 worms initially, +2 per subsequent pickup
**Spider** 🕷️: Converts worms to spiders (chain reaction)
**Devil** 👹: Worms rush to devil, die after 5s proximity

See `Docs/DEVELOPMENT_GUIDE.md` for full power-up details.

---

## Testing Checklist

### Spawn System

- [ ] Console spawning works for Row 1
- [ ] Border spawning works for Rows 2+
- [ ] Spawn queue prevents frame drops
- [ ] Console slots lock/unlock correctly

### AI System

- [ ] Worms roam for configured duration
- [ ] Worms detect and rush to revealed symbols
- [ ] Worms successfully steal symbols
- [ ] Stolen symbols gray out correctly

### Death Mechanics

- [ ] Click matching rain symbol → worm explodes
- [ ] Symbol returns to Panel B on explosion
- [ ] Slime splat appears at death location
- [ ] Console unlocks after worm death

### Purple Worm (Boss)

- [ ] Spawns after 4 wrong answers
- [ ] Steals red symbols first
- [ ] Falls back to blue symbols if no red available
- [ ] Click worm → green clone spawns
- [ ] Only dies from rain symbol click

---

## Resources

- **Development Guide**: `Docs/DEVELOPMENT_GUIDE.md`
- **Performance Guide**: `Docs/PERFORMANCE.md`
- **Main Instructions**: `.github/copilot-instructions.md`
- **Audit Report**: `Docs/CODEBASE_AUDIT_REPORT_V2.md`

---

**End of Architecture Guide**
