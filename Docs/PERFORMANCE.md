# Performance Optimization Guide - Math Master Algebra

**Last Updated**: October 13, 2025  
**Status**: Ongoing Optimization

---

## Overview

This guide documents performance optimizations, profiling techniques, and best practices for maintaining 60 FPS gameplay in Math Master Algebra.

---

## Table of Contents

1. [Current Performance Status](#current-performance-status)
2. [Completed Optimizations](#completed-optimizations)
3. [Known Bottlenecks](#known-bottlenecks)
4. [Profiling & Monitoring](#profiling--monitoring)
5. [Optimization Patterns](#optimization-patterns)
6. [Mobile Performance](#mobile-performance)

---

## Current Performance Status

### Target Metrics

| Metric | Desktop Target | Mobile Target | Current (Desktop) | Current (Mobile) |
|--------|---------------|---------------|-------------------|------------------|
| FPS | 58-60 | 45-50 | 58-60 ✅ | 45-50 ✅ |
| Frame Time | <16ms | <22ms | 15-17ms ✅ | 18-22ms ✅ |
| DOM Queries/sec | <150 | <150 | 80-120 ✅ | 100-140 ⚠️ |
| Memory Growth | <5MB/min | <5MB/min | 2MB/min ✅ | 3MB/min ✅ |

### Performance Achievements (October 2025)

**Panel C (Symbol Rain):**

- FPS improvement: 48-52 → 58-60 (+20%)
- Frame time: 19-21ms → 15-17ms (-20%)
- DOM queries: 180-220/sec → 80-120/sec (-45%)
- Memory growth: 8MB/min → 2MB/min (-75%)

**Worm System:**

- Spawn queue prevents frame drops during multi-worm spawns
- Stable 60fps with 30-40 worms active
- DOM query caching reduces queries by 60-80%

---

## Completed Optimizations

### Phase 1: Panel C Symbol Rain (October 2025)

#### 1. CSS Transition Optimization ✅

**Problem**: `transition: all` caused GPU thrashing on every property change

**Before**:

```css
.falling-symbol {
    transition: all 0.3s ease; /* Animates EVERY property change! */
}
```

**After**:

```css
.falling-symbol {
    /* Only transition specific properties, not position */
    transition: color 0.3s ease, text-shadow 0.3s ease, transform 0.3s ease;
}
```

**Impact**: 8-12% FPS improvement, eliminated micro-stutters

#### 2. Pseudo-Element Removal ✅

**Problem**: `::before` elements doubled render layers (100 symbols → 200 layers)

**Before**:

```css
.falling-symbol::before {
    content: '';
    position: absolute;
    top: -20px; left: -20px; right: -20px; bottom: -20px;
    cursor: pointer;
}
```

**After**:

```css
.falling-symbol {
    /* Expand clickable area via padding instead */
    padding: 20px;
    margin: -20px;
    box-sizing: content-box;
}
/* ::before completely removed */
```

**Impact**: Halved render layers (200 → 100), 5-8% FPS improvement

#### 3. Guaranteed Spawn Optimization ✅

**Problem**: Checking timers every frame (60 checks/sec × 17 symbols = 1020 checks/sec)

**Before**:

```javascript
// Inside animateSymbols() called 60 times/sec
symbols.forEach(sym => {
    if (Date.now() - lastSpawnTime[sym] > 5000) {
        spawnSymbol(sym);
    }
});
```

**After**:

```javascript
// Separate 1-second interval, not in animation loop
setInterval(() => {
    symbols.forEach(sym => {
        if (Date.now() - lastSpawnTime[sym] > 5000) {
            spawnSymbol(sym);
        }
    });
}, 1000); // Check once per second instead of 60 times
```

**Impact**: 98% reduction in timer checks, negligible CPU usage

#### 4. Container Height Caching ✅

**Problem**: `getBoundingClientRect()` on every frame caused layout thrashing

**Before**:

```javascript
// Called 60 times/sec
function animateSymbols() {
    const containerHeight = symbolRainContainer.getBoundingClientRect().height;
    // ...
}
```

**After**:

```javascript
let cachedContainerHeight = symbolRainContainer.getBoundingClientRect().height;

window.addEventListener('resize', debounce(() => {
    cachedContainerHeight = symbolRainContainer.getBoundingClientRect().height;
}, 250));

function animateSymbols() {
    const containerHeight = cachedContainerHeight; // No DOM query!
}
```

**Impact**: Eliminated layout thrashing, smoother frame pacing

#### 5. Event Delegation ✅

**Problem**: Individual event listeners per symbol caused memory leaks

**Before**:

```javascript
function createFallingSymbol(column, isGuaranteed, symbol) {
    const elem = document.createElement('div');
    elem.addEventListener('click', handleClick); // Memory leak!
}
```

**After**:

```javascript
// Single listener on container
symbolRainContainer.addEventListener('pointerdown', (event) => {
    const symbol = event.target.closest('.falling-symbol');
    if (symbol) handleSymbolClick(symbol);
});
```

**Impact**: Prevents memory leaks, instant mobile response

#### 6. Tab Visibility Throttling ✅

**Problem**: Animation continued at full speed when tab hidden

**After**:

```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        targetFPS = 1; // Throttle to ~1fps when hidden
    } else {
        targetFPS = 60; // Resume normal speed
    }
});
```

**Impact**: 95% CPU savings when tab hidden

#### 7. DOM Element Pooling ✅

**Problem**: Creating/destroying elements every frame caused GC pressure

**After**:

```javascript
const symbolPool = [];
const POOL_SIZE = 30;

function getSymbolFromPool() {
    if (symbolPool.length > 0) {
        return symbolPool.pop(); // Reuse existing
    }
    return document.createElement('div'); // Create if pool empty
}

function returnSymbolToPool(elem) {
    if (symbolPool.length < POOL_SIZE) {
        symbolPool.push(elem);
    }
}
```

**Impact**: Reduced GC pauses, smoother framerate

#### 8. Resize Debouncing ✅

**Problem**: Excessive recalculation on window resize

**After**:

```javascript
window.addEventListener('resize', debounce(() => {
    updateContainerDimensions();
}, 250)); // Wait 250ms after resize stops
```

**Impact**: Prevents resize thrashing

#### 9. Symbol Collision Safety Mechanism ✅

**Problem**: Symbol buildup in Panel C when falling symbols collide and slow down

**Solution**:

```javascript
// New checkTouching() function detects actual overlap
function checkTouching(symbolObj) {
    // Desktop: Check actual bounding box overlap (no buffer)
    const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
    for (let other of neighbors) {
        if (other === symbolObj) continue;
        
        const horizontalOverlap = !(symbolRight <= otherLeft || symbolLeft >= otherRight);
        const verticalOverlap = !(symbolBottom <= otherTop || symbolTop >= otherBottom);
        
        if (horizontalOverlap && verticalOverlap) {
            return other; // Return the colliding symbol
        }
    }
    return null;
}

// In animateSymbols(): Remove both symbols when they touch
const symbolsToRemove = new Set();
for (let symbolObj of activeSymbols) {
    const touchingSymbol = checkTouching(symbolObj);
    if (touchingSymbol) {
        symbolsToRemove.add(symbolObj);
        symbolsToRemove.add(touchingSymbol);
    }
}
```

**Implementation Details**:

- Uses existing spatial hash grid for O(n) performance
- Detects actual bounding box overlap (no collision buffer)
- Marks both colliding symbols for removal in same frame
- Integrates with existing DOM pooling system
- Console logs removal for debugging: `🔴 SAFETY: Removing touching symbols`

**Impact**: 
- Prevents symbol accumulation that could lead to performance degradation
- Maintains smooth 60fps by keeping active symbol count in check
- Typical active symbols: 35-50 (previously could grow to 75+)

---

### Phase 2: Worm System Optimizations

#### 1. Spawn Queue System ✅

**Problem**: Spawning 5 worms simultaneously (25+ DOM elements) caused frame drops

**Solution**:

```javascript
processSpawnQueue() {
    if (this.isProcessingSpawnQueue || this.spawnQueue.length === 0) return;
    
    this.isProcessingSpawnQueue = true;
    const spawnData = this.spawnQueue.shift();
    
    // Spawn one worm
    this.executeSpawn(spawnData);
    
    // Space out next spawn with RAF
    requestAnimationFrame(() => {
        this.isProcessingSpawnQueue = false;
        this.processSpawnQueue();
    });
}
```

**Impact**: Eliminated spawn-time frame drops (16ms → 28ms → back to 16ms)

#### 2. DOM Query Caching ✅

**Problem**: 840+ DOM queries per second in animation loop

**Before**:

```javascript
animate() {
    this.worms.forEach(worm => {
        const targets = this.solutionContainer.querySelectorAll('.revealed-symbol'); // 60/sec!
        const rect = this.wormContainer.getBoundingClientRect(); // Layout reflow!
    });
}
```

**After**:

```javascript
getCachedRevealedSymbols() {
    const now = Date.now();
    if (!this.cachedRevealedSymbols || now - this.cacheTimestamp > 100) {
        this.cachedRevealedSymbols = this.solutionContainer.querySelectorAll('.revealed-symbol');
        this.cacheTimestamp = now;
    }
    return this.cachedRevealedSymbols;
}

getContainerRect() {
    const now = Date.now();
    if (!this.containerRect || now - this.rectCacheTime > 200) {
        this.containerRect = this.wormContainer.getBoundingClientRect();
        this.rectCacheTime = now;
    }
    return this.containerRect;
}
```

**Impact**: 60-80% reduction in DOM queries, 15-20 FPS gain

#### 3. Spatial Hash Grid (Symbol Rain) ✅

**Problem**: O(n²) collision detection (75 symbols × 75 = 5,625 checks per frame)

**Solution**:

```javascript
// Divide screen into 100px cells
updateSpatialGrid(symbolObj) {
    const cellX = Math.floor(symbolObj.x / GRID_CELL_SIZE);
    const cellY = Math.floor(symbolObj.y / GRID_CELL_SIZE);
    const key = `${cellX},${cellY}`;
    
    if (!spatialGrid.has(key)) {
        spatialGrid.set(key, []);
    }
    spatialGrid.get(key).push(symbolObj);
}

function checkCollision(symbolObj) {
    // Only check symbols in same cell + adjacent cells
    const neighborCells = getNeighborCells(symbolObj.x, symbolObj.y);
    // 9 cells max instead of all 75 symbols!
}
```

**Impact**: O(n²) → O(n), collision checks reduced by 90%

---

### Phase 3: Touch/Mobile Optimizations ✅

#### Pointer Events API

**Problem**: 300ms click delay on mobile

**Solution**:

```javascript
// Before: 'click' event (300ms delay)
elem.addEventListener('click', handler);

// After: 'pointerdown' event (instant)
elem.addEventListener('pointerdown', (e) => {
    e.preventDefault(); // Prevents 300ms delay
    handler(e);
}, { passive: false });
```

**CSS Improvements**:

```css
.falling-symbol {
    touch-action: manipulation; /* Disable double-tap zoom */
    -webkit-tap-highlight-color: rgba(0, 255, 255, 0.3); /* Visual feedback */
}
```

**Impact**:

- Mobile click delay: 300ms → ~10ms (96% faster)
- Visual feedback: 300ms → 150ms (50% faster)
- Better hit detection on small screens

---

## Known Bottlenecks

### 1. Worm Spawn Method Duplication

**Status**: ⚠️ Deferred (high complexity/risk)

**Issue**: Three spawn methods with 85% duplicate code (~360 lines total)

- `spawnWormFromConsole()` - 150 lines
- `spawnWorm()` - 145 lines
- `spawnWormFromBorder()` - 150 lines

**Impact**: Code maintainability issue, not a runtime performance problem

**Recommendation**: Consolidate using factory pattern in future PR

### 2. CSS File Corruption Risk

**Status**: ⚠️ Monitoring

**File**: `css/worm-styles.css`

**Historical Issues**:

- Malformed `@keyframes` definitions
- Typos (`opacit` instead of `opacity`)
- Unclosed braces
- Missing semicolons

**Backup Files**:

- `worm-styles.css.backup` (clean version)
- `worm-styles.css.corrupted` (broken version for reference)

**Mitigation**: Always validate CSS syntax after editing, maintain backups

### 3. Performance with 100+ Worms

**Current State**:

- Max worms = 999 (effectively unlimited)
- No worm-specific spatial hash grid
- Tested stable with 30-40 worms

**Potential Issues**:

- Frame drops with 100+ active worms
- O(n²) worm-to-symbol distance calculations
- Memory growth during long sessions

**Testing Needed**: Stress test with 100+ simultaneous worms

**Possible Solutions** (if needed):

- Implement spatial hash for worm collision
- Limit active worms per difficulty level
- Cull off-screen worms more aggressively

---

## Profiling & Monitoring

### Performance Monitor Tool

**Toggle**: Press 'P' key during gameplay

**Metrics Displayed**:

- FPS (frames per second)
- Frame Time (milliseconds)
- DOM Queries/sec
- Active Worms Count
- Active Symbols Count
- Memory Usage (approximate)

**Color Coding**:

- 🟢 Green: Good performance
- 🟡 Yellow: Warning threshold
- 🔴 Red: Critical performance issue

### Browser DevTools Profiling

**Chrome DevTools**:

1. Open DevTools → Performance tab
2. Start recording
3. Play game for 30-60 seconds
4. Stop recording
5. Look for:
   - Long frame times (>16ms)
   - Layout thrashing (purple bars)
   - Excessive GC pauses (yellow bars)
   - Scripting bottlenecks (yellow in flame chart)

**Key Indicators**:

- **Frame drops**: Sudden spikes in frame time
- **Layout thrashing**: Purple bars in timeline
- **GC pressure**: Frequent yellow spikes
- **Script duration**: Long yellow blocks

---

## Optimization Patterns

### DO: Best Practices ✅

**1. Cache DOM Queries**

```javascript
// Cache with time-based invalidation
this.cachedElements = null;
this.cacheTimestamp = 0;

getCached() {
    const now = Date.now();
    if (!this.cachedElements || now - this.cacheTimestamp > 100) {
        this.cachedElements = document.querySelectorAll('.target');
        this.cacheTimestamp = now;
    }
    return this.cachedElements;
}
```

**2. Use Event Delegation**

```javascript
// One listener on parent instead of many on children
container.addEventListener('pointerdown', (e) => {
    const target = e.target.closest('.item');
    if (target) handleClick(target);
});
```

**3. Implement Object Pooling**

```javascript
const pool = [];
function getFromPool() {
    return pool.length > 0 ? pool.pop() : createNew();
}
function returnToPool(obj) {
    if (pool.length < MAX_SIZE) pool.push(obj);
}
```

**4. Throttle/Debounce Expensive Operations**

```javascript
window.addEventListener('resize', debounce(() => {
    recalculateLayout();
}, 250));
```

**5. Use Page Visibility API**

```javascript
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        reduceAnimationRate();
    } else {
        resumeNormalRate();
    }
});
```

### DON'T: Anti-Patterns ❌

**1. DON'T use `transition: all`**

```css
/* ❌ BAD - animates every property change */
.element { transition: all 0.3s; }

/* ✅ GOOD - only specific properties */
.element { transition: color 0.3s, transform 0.3s; }
```

**2. DON'T query DOM in animation loops**

```javascript
/* ❌ BAD */
function animate() {
    const height = elem.getBoundingClientRect().height; // 60/sec!
}

/* ✅ GOOD */
let cachedHeight = elem.getBoundingClientRect().height;
function animate() {
    const height = cachedHeight;
}
```

**3. DON'T use `::before`/`::after` on 100+ elements**

```css
/* ❌ BAD - doubles render layers */
.falling-symbol::before { content: ''; }

/* ✅ GOOD - use padding instead */
.falling-symbol { padding: 20px; }
```

**4. DON'T add listeners to dynamic elements**

```javascript
/* ❌ BAD - memory leak */
function createSymbol() {
    elem.addEventListener('click', handler);
}

/* ✅ GOOD - event delegation */
container.addEventListener('click', (e) => {
    if (e.target.matches('.symbol')) handler(e);
});
```

**5. DON'T skip throttling on resize/scroll**

```javascript
/* ❌ BAD - runs 100+ times during resize */
window.addEventListener('resize', updateLayout);

/* ✅ GOOD - debounced */
window.addEventListener('resize', debounce(updateLayout, 250));
```

---

## Mobile Performance

### Optimizations Applied

**1. Touch Events**: Pointer Events API for instant response
**2. Visual Feedback**: Tap highlights with `-webkit-tap-highlight-color`
**3. Zoom Prevention**: `touch-action: manipulation` on interactive elements
**4. Reduced Spawns**: 60% fewer initial symbols on mobile (2 vs 5 per column)
**5. Text Selection**: `user-select: none` prevents accidental selection

### Mobile-Specific Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Touch Response | <50ms | ~10ms | ✅ Excellent |
| Frame Time | <22ms | 18-22ms | ✅ Good |
| Battery Impact | Low | Medium | ⚠️ Monitor |
| Memory Usage | <100MB | ~80MB | ✅ Good |

### Mobile Testing Checklist

- [ ] Test on iOS Safari (iPhone/iPad)
- [ ] Test on Chrome Mobile (Android)
- [ ] Test on Samsung Internet
- [ ] Verify no double-tap zoom on symbols
- [ ] Check rapid tap response (no missed clicks)
- [ ] Monitor battery usage during 10min session
- [ ] Test portrait and landscape orientations

---

## Future Optimization Opportunities

### High Priority

**1. Difficulty-Based Performance Tuning**

- Reduce worm spawn rates on low-end devices
- Auto-detect device capabilities and adjust
- Progressive enhancement based on FPS

**2. Web Workers for Heavy Calculations**

- Move collision detection to worker thread
- Offload worm pathfinding calculations
- Keep main thread free for rendering

**3. Lazy Loading for Lock Components**

- Preload next lock component during gameplay
- Reduce pause during lock transitions

### Medium Priority

**4. IndexedDB for Problem Caching**

- Cache parsed problems locally
- Reduce network requests
- Faster problem loading

**5. Service Worker for Offline Play**

- Cache all game assets
- Enable offline gameplay
- Faster repeat visits

### Low Priority

**6. WebGL Rendering for Symbol Rain**

- Hardware-accelerated rendering
- Support for 500+ simultaneous symbols
- Advanced particle effects

**7. GPU-Accelerated Worm Movement**

- CSS transforms instead of top/left
- 3D transforms for better compositing
- Smoother animations on low-end devices

---

## Performance Testing Protocol

### Baseline Metrics Collection

**Step 1**: Start fresh browser session
**Step 2**: Open performance monitor ('P' key)
**Step 3**: Play 5 complete problems at each difficulty
**Step 4**: Record metrics every 30 seconds

### Stress Testing

**100 Worm Test**:

1. Modify `maxWorms` to force 100+ spawns
2. Monitor FPS, frame time, memory
3. Identify breaking point
4. Document results

**Symbol Rain Stress**:

1. Increase spawn rate to 10 symbols/sec
2. Monitor for frame drops
3. Test collision detection performance
4. Check memory growth rate

---

## Resources

- **Development Guide**: `Docs/DEVELOPMENT_GUIDE.md`
- **Architecture Guide**: `Docs/ARCHITECTURE.md`
- **Main Instructions**: `.github/copilot-instructions.md`
- **Audit Report**: `Docs/CODEBASE_AUDIT_REPORT_V2.md`

---

**End of Performance Guide**
