# Worm System Testing Guide

**Last Updated:** October 16, 2025  
**Test Coverage:** Manual testing for worm.js and worm-powerups.js

---

## Table of Contents

1. [Testing Overview](#testing-overview)
2. [Pre-Test Setup](#pre-test-setup)
3. [Test Scenarios](#test-scenarios)
4. [Performance Testing](#performance-testing)
5. [Edge Case Testing](#edge-case-testing)
6. [Regression Testing](#regression-testing)
7. [Test Checklist](#test-checklist)

---

## Testing Overview

### Testing Philosophy

This project uses **manual integration testing** rather than automated unit tests because:

1. Heavily DOM-dependent (hard to mock)
2. Visual/animation-based (needs human observation)
3. Event-driven architecture (integration tests more valuable)
4. No build process (no test framework setup)

### Test Types

| Type | Method | Frequency |
|------|--------|-----------|
| Smoke Tests | Manual | Before each deploy |
| Regression Tests | Manual | After refactoring |
| Performance Tests | Manual + Monitor | Weekly |
| Edge Cases | Manual | Ad-hoc |

---

## Pre-Test Setup

### 1. Start Local Server

```bash
cd /home/runner/work/MathMasterHTML/MathMasterHTML
python -m http.server 8000
```

### 2. Open Game in Browser

Navigate to: `http://localhost:8000/game.html?level=beginner`

### 3. Open Browser DevTools

- **Chrome/Edge:** F12 or Ctrl+Shift+I
- **Firefox:** F12 or Ctrl+Shift+K
- **Safari:** Cmd+Option+I

### 4. Filter Console Logs

Filter by emoji to see specific logs:
```
🐛 - Worm system
🟣 - Purple worms
💥 - Explosions
✨ - Power-ups
```

### 5. Enable Performance Monitor

Press **'P' key** to toggle performance overlay.

---

## Test Scenarios

### Scenario 1: Basic Worm Spawning

**Objective:** Verify worms spawn correctly on row completion

**Steps:**
1. Load game at beginner level
2. Solve first line of equation (e.g., for `2x + 5 = 15`, click all symbols in first step)
3. Observe worm spawning

**Expected Results:**
- ✅ 3 worms spawn from screen borders (beginner = 3 worms/row)
- ✅ Worms appear at staggered positions (bottom, left, right edges)
- ✅ Console shows: `📊 Row 1 completed. Spawning 3 worms!`
- ✅ Worms start crawling/roaming immediately

**Pass Criteria:**
- All 3 worms visible
- No console errors
- Worms moving smoothly

**Failure Debug:**
```javascript
// Check in console:
window.wormSystem.worms.length  // Should be 3
window.wormSystem.animationFrameId  // Should be a number (animation running)
```

---

### Scenario 2: Console Worm Spawning

**Objective:** Verify worms spawn from console slots

**Steps:**
1. Ensure console has at least one empty slot
2. Open console and run:
   ```javascript
   window.wormSystem.queueWormSpawn('console');
   ```
3. Observe worm emergence

**Expected Results:**
- ✅ Worm emerges from empty console slot with slide-open animation
- ✅ Console slot shows green glow during spawn
- ✅ Console slot locked with `.locked` class
- ✅ Console shows: `🕳️ Worm spawning from console slot X`

**Pass Criteria:**
- Worm emerges smoothly
- Slot remains locked until worm removed
- No duplicate worms from same slot

---

### Scenario 3: Symbol Stealing

**Objective:** Verify worms steal symbols correctly

**Steps:**
1. Spawn a worm (console or border)
2. Wait 3-5 seconds (roaming period)
3. Observe worm behavior

**Expected Results:**
- ✅ Worm roams for specified duration
- ✅ After roaming, worm approaches nearest hidden (red) symbol
- ✅ When within 30px, worm steals symbol
- ✅ Symbol turns gray and hidden
- ✅ Worm gets LSD flicker effect (rainbow colors)
- ✅ Symbol text follows worm
- ✅ Worm speed increases 20%

**Pass Criteria:**
- Symbol stolen successfully
- Visual feedback clear
- Symbol remains hidden

**Failure Debug:**
```javascript
// Check worm state:
const worm = window.wormSystem.worms[0];
console.log({
    hasStolen: worm.hasStolen,
    stolenSymbol: worm.stolenSymbol,
    isFlickering: worm.isFlickering
});
```

---

### Scenario 4: Worm Explosion (Direct Click)

**Objective:** Verify worm explodes when clicked

**Steps:**
1. Spawn a worm
2. Click directly on the worm

**Expected Results:**
- ✅ Worm explosion animation plays
- ✅ 12 particles fly outward
- ✅ Screen flash effect
- ✅ Crack appears on Panel C
- ✅ Green slime splat appears at death location
- ✅ If worm had stolen symbol, symbol returns to Panel B
- ✅ Worm removed after 500ms

**Pass Criteria:**
- Explosion visually dramatic
- Symbol returned if stolen
- No errors in console

---

### Scenario 5: Worm Explosion (Rain Symbol Click)

**Objective:** Verify worm explodes when matching rain symbol clicked

**Steps:**
1. Spawn a worm
2. Wait for worm to steal a symbol (e.g., "X")
3. Click matching symbol "X" in Panel C falling symbols

**Expected Results:**
- ✅ Worm carrying "X" explodes immediately
- ✅ Same explosion effects as direct click
- ✅ Symbol "X" returns to Panel B
- ✅ Console shows: `💥 BOOM! User clicked rain symbol "X" - EXPLODING worm with stolen symbol!`

**Pass Criteria:**
- Correct worm explodes (symbol match)
- Other worms unaffected
- Symbol returned

---

### Scenario 6: Purple Worm Mechanics

**Objective:** Verify purple worm special behavior

**Steps:**
1. Trigger purple worm:
   ```javascript
   document.dispatchEvent(new CustomEvent('purpleWormTriggered', {
       detail: { wrongAnswers: 4 }
   }));
   ```
2. Observe purple worm behavior
3. Click purple worm
4. Click matching symbol in rain

**Expected Results:**
- ✅ Purple worm spawns from help button
- ✅ Worm has purple tint/color
- ✅ Worm immediately rushes to symbols (no roaming period)
- ✅ Purple worm can steal blue symbols if no red available
- ✅ Clicking purple worm creates GREEN clone (punishment)
- ✅ Purple worm remains alive after click
- ✅ Clicking matching rain symbol kills purple worm

**Pass Criteria:**
- Purple worm behavior distinct
- Clone mechanism works
- Only rain symbol kills it

**Failure Debug:**
```javascript
const purpleWorm = window.wormSystem.worms.find(w => w.isPurple);
console.log({
    isPurple: purpleWorm?.isPurple,
    canStealBlue: purpleWorm?.canStealBlue,
    stolenSymbol: purpleWorm?.stolenSymbol
});
```

---

### Scenario 7: Power-Up Drop

**Objective:** Verify power-ups drop from exploded worms

**Steps:**
1. Spawn 10+ worms:
   ```javascript
   for(let i = 0; i < 10; i++) {
       window.wormSystem.queueWormSpawn('border', {index: i, total: 10});
   }
   ```
2. Click each worm to explode
3. Count power-up drops

**Expected Results:**
- ✅ ~10% of worms drop power-ups (about 1 out of 10)
- ✅ Power-up appears at worm death location
- ✅ Power-up is one of: ⚡ (lightning), 🕷️ (spider), 👹 (devil)
- ✅ Power-up auto-removes after 10 seconds if not collected
- ✅ Console shows: `✨ Power-up "chainLightning" dropped at (X, Y)`

**Pass Criteria:**
- Drop rate approximately 10%
- Power-up types randomized
- Auto-removal works

---

### Scenario 8: Chain Lightning Power-Up

**Objective:** Verify chain lightning kills multiple worms

**Steps:**
1. Spawn 10 worms
2. Give chain lightning power-up:
   ```javascript
   window.wormSystem.powerUpSystem.inventory.chainLightning = 1;
   window.wormSystem.powerUpSystem.updateDisplay();
   ```
3. Click chain lightning icon in power-up display
4. Click a worm

**Expected Results:**
- ✅ Cursor changes to crosshair
- ✅ Clicking worm triggers chain lightning
- ✅ Lightning bolt visual effects appear
- ✅ 5 nearest worms explode in sequence
- ✅ Explosion delay: 100ms between each
- ✅ After use, kill count resets to 5

**Pass Criteria:**
- Exactly 5 worms killed
- Visual effects dramatic
- Cursor resets after use

---

### Scenario 9: Spider Power-Up

**Objective:** Verify spider converts worms

**Steps:**
1. Spawn 5 worms
2. Give spider power-up:
   ```javascript
   window.wormSystem.powerUpSystem.inventory.spider = 1;
   window.wormSystem.powerUpSystem.updateDisplay();
   ```
3. Click spider icon
4. Observe spider behavior

**Expected Results:**
- ✅ Spider emoji (🕷️) appears at random location
- ✅ Spider chases nearest worm
- ✅ When spider touches worm (< 30px):
  - Worm converts to new spider
  - Original spider removed
  - Chain reaction continues
- ✅ Click spider → turns to ❤️
- ✅ After 60s → ❤️ turns to 💀
- ✅ After 10s → 💀 removed

**Pass Criteria:**
- Chain reaction works
- Spider lifecycle correct
- Worms removed when converted

---

### Scenario 10: Devil Power-Up

**Objective:** Verify devil attracts and kills worms

**Steps:**
1. Spawn 5 worms
2. Give devil power-up:
   ```javascript
   window.wormSystem.powerUpSystem.inventory.devil = 1;
   window.wormSystem.powerUpSystem.updateDisplay();
   ```
3. Click devil icon
4. Click on screen to place devil
5. Observe worm behavior

**Expected Results:**
- ✅ Cursor changes to crosshair
- ✅ Clicking places devil emoji (👹) at location
- ✅ Devil pulsates with red glow
- ✅ All worms rush toward devil
- ✅ Worms within 50px tracked for proximity time
- ✅ After 5 seconds proximity, worm dies with skull (💀) visual
- ✅ Devil removed when all worms dead

**Pass Criteria:**
- Worms rush to devil
- 5-second timer accurate
- Visual feedback clear

---

### Scenario 11: Game Over Condition

**Objective:** Verify game over triggers when all symbols stolen

**Steps:**
1. Load a simple problem
2. Spawn many worms:
   ```javascript
   for(let i = 0; i < 20; i++) {
       window.wormSystem.queueWormSpawn('border', {index: i, total: 20});
   }
   ```
3. Wait for worms to steal all symbols

**Expected Results:**
- ✅ When last symbol stolen, game over modal appears
- ✅ Modal shows: "💀 GAME OVER! 💀"
- ✅ Message: "All symbols have been stolen by worms!"
- ✅ Penalty message: "Penalty: Lost 1 console symbol"
- ✅ One random console symbol removed
- ✅ Worm animation paused
- ✅ "Try Again" and "Back to Levels" buttons visible

**Pass Criteria:**
- Game over triggers correctly
- Console symbol removed
- Buttons functional

---

### Scenario 12: Console Worm Return

**Objective:** Verify console worms return to slot with stolen symbol

**Steps:**
1. Ensure empty console slot exists
2. Spawn console worm:
   ```javascript
   window.wormSystem.queueWormSpawn('console');
   ```
3. Wait for worm to steal symbol
4. Observe worm behavior

**Expected Results:**
- ✅ After stealing, worm navigates back to console slot
- ✅ Worm with LSD flicker moves toward slot
- ✅ When within 20px, worm disappears into slot
- ✅ Stolen symbol remains hidden (user must re-click in rain)
- ✅ Console slot unlocked after worm escapes
- ✅ Console shows: `🐛 Worm X escaped to console with symbol "Y"!`

**Pass Criteria:**
- Worm returns successfully
- Slot unlocks
- Symbol stays hidden

---

## Performance Testing

### Test 1: FPS with Many Worms

**Steps:**
1. Press 'P' to show performance monitor
2. Spawn 20 worms:
   ```javascript
   for(let i = 0; i < 20; i++) {
       window.wormSystem.queueWormSpawn('border', {index: i, total: 20});
   }
   ```
3. Monitor FPS for 30 seconds

**Expected Results:**
- ✅ FPS remains 55-60 (green)
- ✅ Frame time < 20ms
- ✅ DOM queries < 150/sec

**Pass Criteria:**
- No FPS drops below 50
- Smooth animation
- No stuttering

---

### Test 2: Memory Leak Check

**Steps:**
1. Open Chrome DevTools → Performance → Memory
2. Start recording
3. Spawn and kill 100 worms:
   ```javascript
   async function test() {
       for(let i = 0; i < 100; i++) {
           window.wormSystem.queueWormSpawn('border', {index: i, total: 1});
           await new Promise(r => setTimeout(r, 100));
           if (window.wormSystem.worms.length > 0) {
               window.wormSystem.killAllWorms();
               await new Promise(r => setTimeout(r, 500));
           }
       }
   }
   test();
   ```
4. Stop recording
5. Check heap size

**Expected Results:**
- ✅ Heap size returns to baseline after test
- ✅ No sawtooth pattern (continuous growth)
- ✅ DOM node count stable

**Pass Criteria:**
- Memory growth < 10MB total
- Returns to baseline within 10s

---

### Test 3: Spawn Queue Performance

**Steps:**
1. Press 'P' for performance monitor
2. Queue 50 spawns at once:
   ```javascript
   for(let i = 0; i < 50; i++) {
       window.wormSystem.queueWormSpawn('border', {index: i, total: 50});
   }
   ```
3. Monitor spawn rate

**Expected Results:**
- ✅ Worms spawn progressively (not all at once)
- ✅ FPS remains stable during spawning
- ✅ ~50ms delay between spawns
- ✅ No frame drops

**Pass Criteria:**
- Smooth spawning
- No lag spike
- All worms spawn eventually

---

## Edge Case Testing

### Edge Case 1: Empty Console Slots

**Scenario:** All console slots locked/occupied

**Steps:**
1. Lock all console slots manually:
   ```javascript
   document.querySelectorAll('.console-slot').forEach((slot, i) => {
       window.wormSystem.lockedConsoleSlots.add(i);
       slot.classList.add('locked');
   });
   ```
2. Try to spawn console worm:
   ```javascript
   window.wormSystem.queueWormSpawn('console');
   ```

**Expected:**
- ✅ Fallback to normal spawn
- ✅ Console shows: `⚠️ All console slots occupied or locked, spawning worm normally`
- ✅ Worm spawns at bottom of screen

---

### Edge Case 2: Purple Worm No Symbols Available

**Scenario:** Purple worm spawns but no symbols to steal

**Steps:**
1. Mark all symbols as stolen:
   ```javascript
   document.querySelectorAll('.symbol').forEach(el => {
       el.dataset.stolen = 'true';
       el.style.visibility = 'hidden';
   });
   ```
2. Spawn purple worm
3. Observe behavior

**Expected:**
- ✅ Purple worm roams
- ✅ Doesn't crash
- ✅ Continues roaming indefinitely

---

### Edge Case 3: Worm Explosion Chain Reaction

**Scenario:** Worm explosion triggers nearby worms to explode

**Steps:**
1. Spawn 5 worms close together:
   ```javascript
   for(let i = 0; i < 5; i++) {
       window.wormSystem.worms.push({
           ...window.wormSystem._createWormData({
               id: `test-${i}`,
               element: document.createElement('div'),
               x: 500 + i * 15,  // Close together (15px apart)
               y: 300,
               baseSpeed: 1,
               roamDuration: 5000
           }),
           active: true
       });
   }
   ```
2. Explode first worm

**Expected:**
- ✅ First worm explodes
- ✅ Nearby worms (within 18px) explode in chain
- ✅ 150ms delay between chain explosions
- ✅ Console shows: `💥 CHAIN REACTION! X worms caught in blast radius!`

---

### Edge Case 4: Max Worms Limit

**Scenario:** Try to spawn beyond max worms (999)

**Steps:**
1. Set low max for testing:
   ```javascript
   window.wormSystem.maxWorms = 5;
   ```
2. Try to spawn 10 worms
3. Check count

**Expected:**
- ✅ Only 5 worms spawn
- ✅ Console shows: `⚠️ Max worms (5) reached. No more spawning.`
- ✅ No errors

---

## Regression Testing

After any code change, run this quick regression test:

### Quick Smoke Test (5 minutes)

1. **Basic Spawn** ✓
   - [ ] Border worm spawns on row completion
   - [ ] Console worm spawns from slot
   - [ ] Purple worm spawns on wrong answers

2. **Movement** ✓
   - [ ] Worms roam smoothly
   - [ ] Worms rush to revealed symbols
   - [ ] Worms return to console

3. **Stealing** ✓
   - [ ] Worms steal red symbols
   - [ ] Purple worms can steal blue
   - [ ] Stolen symbols hidden

4. **Explosions** ✓
   - [ ] Direct click explodes worm
   - [ ] Rain symbol match explodes worm
   - [ ] Symbol returns on explosion

5. **Power-ups** ✓
   - [ ] Power-ups drop (~10%)
   - [ ] Chain lightning works
   - [ ] Spider converts worms
   - [ ] Devil attracts worms

6. **Performance** ✓
   - [ ] FPS > 55 with 20 worms
   - [ ] No console errors
   - [ ] No memory leaks visible

---

## Test Checklist

### Pre-Deployment Checklist

**Environment:**
- [ ] Tested on Chrome/Edge
- [ ] Tested on Firefox
- [ ] Tested on Safari (if available)
- [ ] Tested on mobile (responsive)

**Difficulty Levels:**
- [ ] Tested beginner (3 worms, 1.0x speed)
- [ ] Tested warrior (5 worms, 1.5x speed)
- [ ] Tested master (8 worms, 2.0x speed)

**Core Functionality:**
- [ ] All spawn types work
- [ ] Movement smooth and correct
- [ ] Symbol stealing functional
- [ ] Explosions dramatic and correct
- [ ] Power-ups drop and work
- [ ] Game over triggers correctly

**Performance:**
- [ ] FPS stable at 55-60
- [ ] No memory leaks detected
- [ ] DOM queries optimized
- [ ] No console errors

**Edge Cases:**
- [ ] Empty console slots handled
- [ ] Max worms enforced
- [ ] Chain reactions work
- [ ] No symbols available handled

---

## Test Execution Log Template

Copy this template for each test session:

```markdown
## Test Session: [Date]

**Tester:** [Name]  
**Branch:** [Branch name]  
**Commit:** [Commit hash]  
**Browser:** [Chrome/Firefox/Safari + Version]

### Environment
- [ ] Local server running
- [ ] Performance monitor enabled
- [ ] Console filtered for worm logs

### Test Results

#### Scenario 1: Basic Worm Spawning
- Status: ✅ Pass / ❌ Fail
- Notes: [Any observations]

#### Scenario 2: Console Worm Spawning
- Status: ✅ Pass / ❌ Fail
- Notes: [Any observations]

[... continue for all scenarios ...]

### Issues Found
1. [Issue description]
   - Severity: High/Medium/Low
   - Steps to reproduce: [...]

### Performance Metrics
- FPS: [value]
- DOM Queries/sec: [value]
- Active Worms: [value]
- Frame Time: [value]ms

### Conclusion
- [ ] All tests passed
- [ ] Issues logged
- [ ] Ready for deployment
```

---

## Automated Test Helpers

While we don't have formal automated tests, these helper functions can speed up manual testing:

```javascript
// Quick test helpers - paste in console

// 1. Spawn test worms
function spawnTestWorms(count = 5, type = 'border') {
    for(let i = 0; i < count; i++) {
        window.wormSystem.queueWormSpawn(type, {index: i, total: count});
    }
    console.log(`✅ Spawned ${count} ${type} worms`);
}

// 2. Give all power-ups
function giveAllPowerUps() {
    const sys = window.wormSystem.powerUpSystem;
    sys.inventory.chainLightning = 5;
    sys.inventory.spider = 5;
    sys.inventory.devil = 5;
    sys.updateDisplay();
    console.log('✅ Gave all power-ups (5 each)');
}

// 3. Check worm states
function checkWormStates() {
    window.wormSystem.worms.forEach(w => {
        console.log(`Worm ${w.id}:`, {
            active: w.active,
            hasStolen: w.hasStolen,
            isRushing: w.isRushingToTarget,
            isPurple: w.isPurple,
            stolenSymbol: w.stolenSymbol
        });
    });
}

// 4. Performance snapshot
function perfSnapshot() {
    console.log('📊 Performance Snapshot:', {
        fps: 'Check overlay (press P)',
        activeWorms: window.wormSystem.worms.length,
        domQueries: 'Check overlay',
        animationRunning: !!window.wormSystem.animationFrameId
    });
}

// 5. Clear all worms
function clearAll() {
    window.wormSystem.killAllWorms();
    setTimeout(() => {
        window.wormSystem.worms = [];
        console.log('✅ All worms cleared');
    }, 1000);
}
```

---

**Guide Status:** ✅ Complete  
**Next Review:** After major feature additions
