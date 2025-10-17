# Worm System Developer Guide

**Last Updated:** October 16, 2025  
**For:** `js/worm.js` and `js/worm-powerups.js`

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Core Concepts](#core-concepts)
4. [Common Tasks](#common-tasks)
5. [Debugging Guide](#debugging-guide)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)
8. [API Reference](#api-reference)

---

## Quick Start

### Running the Game Locally

```bash
# Start local server (REQUIRED - file:// protocol won't work)
python -m http.server 8000

# Open in browser
http://localhost:8000/game.html?level=beginner
```

### Testing Worm System

```javascript
// Open browser console and run:

// 1. Check worm system is initialized
console.log(window.wormSystem);

// 2. Manually spawn a test worm
window.wormSystem.queueWormSpawn('border', { index: 0, total: 1 });

// 3. Check active worms
console.log(`Active worms: ${window.wormSystem.worms.length}`);

// 4. Kill all worms
window.wormSystem.killAllWorms();
```

### Console Logging

All worm system logs use emoji prefixes for filtering:

```
🐛 - General worm system
🟣 - Purple worm specific
🕳️ - Console slot spawning
📊 - Row completion stats
🎉 - Problem completion
🎯 - Symbol targeting
💥 - Explosions
✨ - Power-ups
🎁 - Power-up collection
```

**Filter console by emoji:** Just type the emoji in console filter (e.g., `🐛`)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────┐
│         WormSystem Class            │
│  (Main worm lifecycle manager)      │
│                                     │
│  - Spawning                         │
│  - Movement & Animation             │
│  - Symbol Stealing                  │
│  - Explosions                       │
│  - Game Over Logic                  │
└─────────────────────────────────────┘
                  │
                  │ delegates power-ups to
                  ▼
┌─────────────────────────────────────┐
│    WormPowerUpSystem Class          │
│  (Power-up management)              │
│                                     │
│  - Drop Logic                       │
│  - Collection                       │
│  - Activation                       │
│  - UI Display                       │
└─────────────────────────────────────┘
```

### Event-Driven Communication

The worm system uses **DOM events** for all inter-module communication:

```javascript
// Events the worm system LISTENS TO:
'problemLineCompleted'   // → Spawn border worms
'problemCompleted'       // → Kill all worms
'purpleWormTriggered'    // → Spawn purple worm
'symbolClicked'          // → Check for worm explosion
'symbolRevealed'         // → Notify worms to rush

// Events the worm system DISPATCHES:
// (none - worm system only listens)
```

### File Structure

```
js/
├── worm.js              # Main worm system (2,319 lines)
│   ├── WormSystem class
│   ├── Spawning logic
│   ├── Movement & animation
│   ├── Symbol interaction
│   └── Visual effects
│
├── worm-powerups.js     # Power-up system (718 lines)
│   ├── WormPowerUpSystem class
│   ├── Chain Lightning
│   ├── Spider
│   └── Devil
│
└── utils.js             # Shared utilities
    ├── normalizeSymbol()
    ├── calculateDistance()
    ├── createDOMElement()
    └── generateUniqueId()
```

---

## Core Concepts

### 1. Worm Lifecycle

Every worm goes through these states:

```
┌──────────┐
│  SPAWN   │  ← Created via queueWormSpawn()
└────┬─────┘
     │
     ▼
┌──────────┐
│  ROAM    │  ← Crawls randomly for 3-5 seconds
└────┬─────┘
     │
     ├─────► (Symbol revealed event)
     │              │
     ▼              ▼
┌──────────┐   ┌──────────┐
│  RUSH    │   │  STEAL   │  ← Takes symbol from Panel B
└────┬─────┘   └────┬─────┘
     │              │
     └──────┬───────┘
            ▼
       ┌──────────┐
       │  CARRY   │  ← Carries symbol with LSD flicker
       └────┬─────┘
            │
            ├─────► (Console worm)
            │              │
            │              ▼
            │        ┌──────────┐
            │        │  RETURN  │  → Escapes to console
            │        └──────────┘
            │
            ├─────► (Border/Purple worm)
            │              │
            │              ▼
            │        ┌──────────┐
            │        │  ROAM    │  → Continues roaming
            │        └──────────┘
            │
            ▼
       ┌──────────┐
       │ EXPLODE  │  ← Clicked or rain symbol match
       └──────────┘
```

### 2. Worm Types

#### Console Worm (Green)
- **Spawns from:** Empty console slot
- **Speed:** 2.0 × difficulty
- **Behavior:** Roams 3s → Steals → Returns to console
- **Special:** Locks console slot until removed

#### Border Worm (Green)
- **Spawns from:** Viewport edges (bottom, left, right)
- **Speed:** 2.5 × difficulty
- **Behavior:** Roams 5s → Steals → Continues roaming
- **Special:** Spawned on row completion

#### Purple Worm (Purple)
- **Spawns from:** Help button (on 4+ wrong answers)
- **Speed:** 1.0 (fixed, not scaled by difficulty)
- **Behavior:** Immediately rushes to symbols
- **Special:** Can steal blue symbols if no red available
- **Kill method:** ONLY by clicking matching symbol in Panel C rain
- **Click punishment:** Creates GREEN clone worm

### 3. Symbol Stealing Mechanics

**Red Symbols (Hidden):**
- Not yet clicked by user
- Primary target for all worms
- Turns gray when stolen

**Blue Symbols (Revealed):**
- User has clicked in Panel C
- Only purple worms can steal these (if no red available)
- Turns gray when stolen

**Stealing Process:**
```javascript
1. Worm reaches symbol (< 30px distance)
2. Symbol marked as stolen (dataset.stolen = 'true')
3. Symbol hidden (visibility = 'hidden')
4. Worm gets LSD flicker effect
5. Worm speed increases 20%
6. Symbol follows worm visually
```

### 4. Difficulty Scaling

Game scales worm behavior based on URL parameter `?level=beginner|warrior|master`:

| Setting | Beginner | Warrior | Master |
|---------|----------|---------|--------|
| Worms/Row | 3 | 5 | 8 |
| Speed Multiplier | 1.0x | 1.5x | 2.0x |
| Console Roam | 8s | 6s | 4s |
| Border Roam | 5s | 4s | 3s |

**Purple worm speed is ALWAYS 1.0 (not scaled)**

### 5. Power-Up System

**Drop Rate:** 10% per worm kill

**Power-up Types:**

1. **⚡ Chain Lightning**
   - First use: Kills 5 nearest worms
   - Each collection: +2 kill count
   - Click worm to target
   - Resets to 5 after use

2. **🕷️ Spider**
   - Spawns conversion spider
   - Chases nearest worm
   - Converts worm → new spider (chain reaction)
   - Click spider → ❤️ (1 min) → 💀 (10s) → Remove

3. **👹 Devil**
   - Click to place devil
   - Worms rush to devil location
   - Kill after 5s proximity
   - Devil pulsates with red glow

---

## Common Tasks

### Task 1: Add a New Worm Type

```javascript
// 1. Add spawn method in WormSystem
spawnMyCustomWorm() {
    this.initialize();
    
    // Your spawn logic
    const wormId = generateUniqueId('custom-worm');
    const wormElement = this.createWormElement({
        id: wormId,
        classNames: ['custom-worm'],
        x: startX,
        y: startY
    });
    
    this.crossPanelContainer.appendChild(wormElement);
    
    // Create worm data
    const wormData = this._createWormData({
        id: wormId,
        element: wormElement,
        x: startX,
        y: startY,
        baseSpeed: 3.0,
        roamDuration: 6000,
        // ... custom properties
    });
    
    this.worms.push(wormData);
    
    // Add click handler
    wormElement.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleCustomWormClick(wormData);
    });
    
    // Start animation if needed
    if (this.worms.length === 1) {
        this.animate();
    }
}

// 2. Add CSS styling
// In css/worm-styles.css:
.custom-worm {
    /* Your styles */
}

// 3. Queue spawn when needed
this.queueWormSpawn('custom');
```

### Task 2: Modify Worm Speed

```javascript
// Option 1: Change base speed constants (affects all worms)
// In constructor:
this.SPEED_CONSOLE_WORM = 3.0 * this.difficultySpeedMultiplier;  // Was 2.0

// Option 2: Change difficulty multiplier
// In constructor difficulty settings:
const difficultySettings = {
    beginner: {
        wormsPerRow: 3,
        speed: 1.5,  // Was 1.0
        // ...
    }
};

// Option 3: Change individual worm speed after spawn
worm.currentSpeed = worm.baseSpeed * 2.0;  // Double speed
worm.currentSpeed = worm.baseSpeed * 0.5;  // Half speed
```

### Task 3: Change Steal Distance

```javascript
// In constructor:
this.DISTANCE_STEAL_SYMBOL = 50;  // Was 30

// Result: Worms now steal from 50px away instead of 30px
```

### Task 4: Add a New Power-Up

```javascript
// 1. Add to worm-powerups.js
class WormPowerUpSystem {
    constructor() {
        // Add to types
        this.TYPES = ['chainLightning', 'spider', 'devil', 'freeze'];
        this.EMOJIS = { 
            // ...
            freeze: '❄️' 
        };
        
        // Add to inventory
        this.inventory.freeze = 0;
    }
    
    // Add activation method
    activateFreeze() {
        console.log('❄️ FREEZE activated!');
        
        // Freeze all worms for 5 seconds
        this.wormSystem.worms.forEach(worm => {
            if (worm.active) {
                const originalSpeed = worm.currentSpeed;
                worm.currentSpeed = 0;  // Freeze
                worm.element.style.filter = 'brightness(0.5) saturate(0)';
                
                setTimeout(() => {
                    worm.currentSpeed = originalSpeed;  // Unfreeze
                    worm.element.style.filter = '';
                }, 5000);
            }
        });
    }
}

// 2. Update display to show freeze count
// (already handled by updateDisplay() method)
```

### Task 5: Debug Worm Behavior

```javascript
// Add debug visualization in animate() method:
animate() {
    // ... existing code ...
    
    this.worms.forEach(worm => {
        // DEBUG: Show worm state as text above worm
        const debugLabel = document.createElement('div');
        debugLabel.style.cssText = `
            position: fixed;
            left: ${worm.x}px;
            top: ${worm.y - 20}px;
            color: yellow;
            font-size: 10px;
            pointer-events: none;
        `;
        debugLabel.textContent = worm.hasStolen ? 'CARRYING' : 
                                 worm.isRushingToTarget ? 'RUSHING' : 
                                 'ROAMING';
        document.body.appendChild(debugLabel);
        
        setTimeout(() => debugLabel.remove(), 100);
        
        // ... rest of animate ...
    });
}
```

### Task 6: Change Game Over Condition

```javascript
// Modify checkGameOverCondition() in worm.js:

checkGameOverCondition() {
    const allSymbols = this.solutionContainer.querySelectorAll('.symbol:not(.space-symbol):not(.completed-row-symbol)');
    
    const availableSymbols = Array.from(allSymbols).filter(el => !el.dataset.stolen);
    
    // MODIFIED: Only game over if 80% symbols stolen (was 100%)
    const stolenPercent = (allSymbols.length - availableSymbols.length) / allSymbols.length;
    
    if (stolenPercent >= 0.8 && allSymbols.length > 0) {
        console.log('💀 GAME OVER! 80% symbols stolen!');
        this.triggerGameOver();
    }
}
```

---

## Debugging Guide

### Debug Mode

Enable verbose logging by adding this to browser console:

```javascript
// Save original console.log
const originalLog = console.log;

// Override to add timestamps
console.log = function(...args) {
    const timestamp = new Date().toISOString().slice(11, 23);
    originalLog.apply(console, [`[${timestamp}]`, ...args]);
};

// Now all worm logs have timestamps:
// [10:30:45.123] 🐛 Worm spawned...
```

### Performance Monitor

Press **'P' key** during gameplay to toggle performance overlay:

```
FPS: 60
DOM Queries/sec: 120
Active Worms: 8
Falling Symbols: 35
Frame Time: 16ms
```

**Color coding:**
- 🟢 Green: Good performance
- 🟡 Yellow: Warning
- 🔴 Red: Critical

### Common Debug Scenarios

#### Scenario 1: Worms Not Spawning

```javascript
// Check in console:

// 1. Is worm system initialized?
console.log(window.wormSystem.isInitialized);  // Should be true

// 2. Is animation running?
console.log(window.wormSystem.animationFrameId);  // Should be a number

// 3. Check spawn queue
console.log(window.wormSystem.spawnQueue);  // Should be empty or have entries

// 4. Check max worm limit
console.log(`${window.wormSystem.worms.length} / ${window.wormSystem.maxWorms}`);

// 5. Manually trigger spawn
window.wormSystem.queueWormSpawn('border', { index: 0, total: 1 });
```

#### Scenario 2: Worms Not Moving

```javascript
// Check in console:

// 1. Is animation loop running?
console.log(window.wormSystem.animationFrameId);  // Should be a number, not null

// 2. Check worm state
const worm = window.wormSystem.worms[0];
console.log({
    active: worm.active,  // Should be true
    x: worm.x,
    y: worm.y,
    velocityX: worm.velocityX,
    velocityY: worm.velocityY,
    currentSpeed: worm.currentSpeed
});

// 3. Manually restart animation
window.wormSystem.animate();
```

#### Scenario 3: Power-Ups Not Dropping

```javascript
// Check in console:

// 1. Is power-up system initialized?
console.log(window.wormSystem.powerUpSystem);  // Should exist

// 2. Check drop rate
console.log(window.wormSystem.powerUpSystem.DROP_RATE);  // Should be 0.10

// 3. Manually test drop
window.wormSystem.powerUpSystem.drop(500, 300, 'chainLightning');

// 4. Check worm has power-up flag
const worm = window.wormSystem.worms[0];
console.log({
    hasPowerUp: worm.hasPowerUp,
    powerUpType: worm.powerUpType
});
```

#### Scenario 4: Memory Leak Detection

```javascript
// Monitor worm array size:
setInterval(() => {
    console.log(`Worms: ${window.wormSystem.worms.length}`);
}, 5000);

// Check for orphaned DOM elements:
const wormElements = document.querySelectorAll('.worm-container');
const wormDataCount = window.wormSystem.worms.length;
console.log(`DOM worms: ${wormElements.length}, Data worms: ${wormDataCount}`);

// If DOM count > Data count → Memory leak!
```

### Breakpoint Locations

Set breakpoints in these methods for common issues:

| Issue | Method | Line |
|-------|--------|------|
| Spawn failures | `processSpawnQueue()` | ~258 |
| Movement problems | `animate()` | ~1342 |
| Symbol stealing | `stealSymbol()` | ~846 |
| Explosion issues | `explodeWorm()` | ~1537 |
| Power-up drops | `dropPowerUp()` in worm-powerups.js | ~78 |

---

## Best Practices

### 1. Always Use Event System

❌ **DON'T** directly call methods between modules:
```javascript
game.wormSystem.spawnPurpleWorm();  // BAD
```

✅ **DO** dispatch events:
```javascript
document.dispatchEvent(new CustomEvent('purpleWormTriggered', {
    detail: { wrongAnswers: 4 }
}));
```

### 2. Use Factory Methods

❌ **DON'T** manually create worms:
```javascript
const worm = document.createElement('div');
worm.className = 'worm-container';
// ... manual setup
```

✅ **DO** use factory methods:
```javascript
const wormElement = this.createWormElement({
    id: wormId,
    classNames: ['custom-worm'],
    x: startX,
    y: startY
});

const wormData = this._createWormData({
    id: wormId,
    element: wormElement,
    // ... config
});
```

### 3. Use Constants

❌ **DON'T** use magic numbers:
```javascript
if (distance < 30) {  // What is 30?
    this.stealSymbol(worm);
}
```

✅ **DO** use named constants:
```javascript
if (distance < this.DISTANCE_STEAL_SYMBOL) {
    this.stealSymbol(worm);
}
```

### 4. Cache DOM Queries

❌ **DON'T** query DOM repeatedly:
```javascript
animate() {
    this.worms.forEach(worm => {
        const symbols = document.querySelectorAll('.revealed-symbol');  // SLOW!
        // ...
    });
}
```

✅ **DO** use caching:
```javascript
animate() {
    this.worms.forEach(worm => {
        const symbols = this.getCachedRevealedSymbols();  // Fast!
        // ...
    });
}
```

### 5. Add Error Handling

❌ **DON'T** assume data exists:
```javascript
stealSymbol(worm) {
    const symbol = this.findSymbol();
    symbol.style.visibility = 'hidden';  // Crash if null!
}
```

✅ **DO** validate data:
```javascript
stealSymbol(worm) {
    if (!worm || !worm.active) {
        console.error('🐛 Invalid worm state');
        return;
    }
    
    const symbol = this.findSymbol();
    if (!symbol) {
        console.warn('🐛 No symbol found to steal');
        return;
    }
    
    symbol.style.visibility = 'hidden';
}
```

---

## Troubleshooting

### Problem: Worms Spawn But Don't Move

**Symptoms:** Worms appear but stay frozen

**Causes:**
1. Animation loop not started
2. Worm velocity is zero
3. CSS transition blocking movement

**Solution:**
```javascript
// Check and fix:
if (!this.animationFrameId) {
    this.animate();  // Restart animation
}

// Check worm velocity
worm.velocityX = Math.random() - 0.5;
worm.velocityY = Math.random() - 0.5;
```

### Problem: Console Slots Stay Locked

**Symptoms:** No worms spawn from console after first spawn

**Causes:**
1. Worm removed without unlocking slot
2. Slot element reference lost

**Solution:**
```javascript
// Manual unlock in console:
window.wormSystem.lockedConsoleSlots.clear();

// Remove locked class from all slots
document.querySelectorAll('.console-slot.locked').forEach(slot => {
    slot.classList.remove('locked', 'worm-spawning');
});
```

### Problem: Game Over Triggers Too Early

**Symptoms:** Game over before all symbols stolen

**Causes:**
1. Counting completed row symbols
2. Counting space symbols

**Solution:**
```javascript
// Check what's being counted:
const all = document.querySelectorAll('.symbol');
const spaces = document.querySelectorAll('.space-symbol');
const completed = document.querySelectorAll('.completed-row-symbol');
const stolen = document.querySelectorAll('[data-stolen="true"]');

console.log(`All: ${all.length}, Spaces: ${spaces.length}, Completed: ${completed.length}, Stolen: ${stolen.length}`);
```

### Problem: Purple Worm Won't Die

**Symptoms:** Clicking purple worm or rain symbol doesn't kill it

**Causes:**
1. Purple worm click creates clone instead of killing
2. Rain symbol doesn't match stolen symbol

**Solution:**
```javascript
// Purple worms are INTENTIONALLY hard to kill:
// 1. Click purple worm → Creates green clone (punishment)
// 2. To kill: Click matching symbol in Panel C rain

// Debug: Check stolen symbol
const purpleWorm = window.wormSystem.worms.find(w => w.isPurple);
console.log(`Purple worm carrying: "${purpleWorm?.stolenSymbol}"`);

// Then click that symbol in Panel C
```

### Problem: Power-Ups Not Appearing

**Symptoms:** Kill worms but no power-ups drop

**Causes:**
1. Power-up system not initialized
2. 10% drop rate (bad luck)
3. Chain reaction explosions don't drop (intentional)

**Solution:**
```javascript
// Force a power-up drop for testing:
window.wormSystem.powerUpSystem.drop(500, 300, 'chainLightning');

// Check if worm had power-up:
const worm = window.wormSystem.worms[0];
console.log(`Worm power-up: ${worm.hasPowerUp} (${worm.powerUpType})`);
```

---

## API Reference

### WormSystem Class

#### Constructor
```javascript
new WormSystem()
```
Initializes worm system with difficulty scaling from URL `?level=beginner|warrior|master`.

#### Public Methods

##### `initialize()`
```javascript
wormSystem.initialize()
```
Sets up DOM containers and event listeners. Called automatically on `DOMContentLoaded`.

##### `queueWormSpawn(type, data)`
```javascript
wormSystem.queueWormSpawn('border', { index: 0, total: 5 })
```
Queue a worm spawn to prevent frame drops.

**Parameters:**
- `type` (string): 'console', 'border', 'purple', or custom
- `data` (object): Spawn-specific data (optional)

##### `killAllWorms()`
```javascript
wormSystem.killAllWorms()
```
Immediately explode all active worms. Called on problem completion.

##### `reset()`
```javascript
wormSystem.reset()
```
Reset worm system to initial state. Removes all worms and clears state.

#### Private Methods (Internal Use)

##### `_updateWormRushingToTarget(worm)`
Handle worm rushing to revealed symbol.

##### `_updateWormRoaming(worm, viewportWidth, viewportHeight)`
Handle worm crawling/roaming behavior.

##### `_updateWormCarryingSymbol(worm)`
Handle worm carrying stolen symbol.

##### `_calculateVelocityToTarget(worm, targetX, targetY, speedMultiplier)`
Calculate velocity vector toward target position.

##### `_constrainToBounds(worm, bounds)`
Apply viewport boundary constraints.

##### `_applyWormPosition(worm)`
Update DOM element position.

### WormPowerUpSystem Class

#### Constructor
```javascript
new WormPowerUpSystem(wormSystem)
```
Initialize power-up system with reference to worm system.

**Parameters:**
- `wormSystem` (WormSystem): Parent worm system instance

#### Public Methods

##### `shouldDrop()`
```javascript
const shouldDrop = powerUpSystem.shouldDrop()
```
Roll for power-up drop (10% chance).

**Returns:** `boolean`

##### `drop(x, y, type)`
```javascript
powerUpSystem.drop(500, 300, 'chainLightning')
```
Drop a power-up at coordinates.

**Parameters:**
- `x` (number): X coordinate
- `y` (number): Y coordinate  
- `type` (string): 'chainLightning', 'spider', 'devil' (optional, random if omitted)

##### `collect(type, element)`
```javascript
powerUpSystem.collect('chainLightning', powerUpElement)
```
Collect a power-up.

**Parameters:**
- `type` (string): Power-up type
- `element` (HTMLElement): Power-up DOM element

##### `use(type)`
```javascript
powerUpSystem.use('chainLightning')
```
Activate a collected power-up.

**Parameters:**
- `type` (string): Power-up type

### Utility Functions

#### `normalizeSymbol(symbol)`
```javascript
const normalized = normalizeSymbol('x')  // Returns 'X'
```
Normalize symbol for comparison (x/X treated as same).

#### `calculateDistance(x1, y1, x2, y2)`
```javascript
const dist = calculateDistance(100, 100, 200, 200)  // Returns 141.42...
```
Calculate Euclidean distance between two points.

#### `generateUniqueId(prefix)`
```javascript
const id = generateUniqueId('worm')  // Returns 'worm-1697461234567-0.123456'
```
Generate unique ID with prefix.

---

## Appendix: Event Contracts

### Events Listened By WormSystem

#### `problemLineCompleted`
```javascript
document.dispatchEvent(new CustomEvent('problemLineCompleted', {
    detail: { lineNumber: 1 }
}));
```
**Triggered by:** `game.js` when equation line solved  
**Action:** Spawn border worms (count = wormsPerRow)

#### `problemCompleted`
```javascript
document.dispatchEvent(new CustomEvent('problemCompleted'));
```
**Triggered by:** `game.js` when entire problem solved  
**Action:** Kill all worms, clean up cracks

#### `purpleWormTriggered`
```javascript
document.dispatchEvent(new CustomEvent('purpleWormTriggered', {
    detail: { wrongAnswers: 4 }
}));
```
**Triggered by:** `game.js` when 4+ wrong answers  
**Action:** Spawn purple worm from help button

#### `symbolClicked`
```javascript
document.dispatchEvent(new CustomEvent('symbolClicked', {
    detail: { symbol: 'X' }
}));
```
**Triggered by:** `3rdDISPLAY.js` when rain symbol clicked  
**Action:** Check if matches stolen symbol → explode worm

#### `symbolRevealed`
```javascript
document.dispatchEvent(new CustomEvent('symbolRevealed', {
    detail: { symbol: 'X' }
}));
```
**Triggered by:** `game.js` when symbol revealed  
**Action:** Notify roaming worms to rush to symbol

---

**Guide Status:** ✅ Complete  
**Next Review:** When major features added
