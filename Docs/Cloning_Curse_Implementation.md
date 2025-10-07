# Cloning Curse Implementation - October 7, 2025

## Overview

Implemented an advanced "Cloning Curse" mechanic for the worm system that creates a risk/reward dynamic where clicking worms directly activates a persistent curse state.

## Core Mechanic

### Curse Activation

- **Trigger**: First direct click on ANY worm
- **Effect**: Activates global `cloningCurseActive` state in `WormSystem`
- **Visual Feedback**: Purple flash animation (`worm-flash-purple`)
- **Behavior**: Worm creates a clone instead of being destroyed

### Curse Persistence

- **Duration**: Remains active until ALL visible worms are eliminated
- **Kill Method**: Worms must be killed via rain symbols, NOT direct clicks
- **Subsequent Clicks**: While curse is active, ALL worm clicks create clones
- **No RNG**: Replaces the previous 80/20 kill/clone mechanic with deterministic behavior

### Curse Reset

- **Condition**: All active worms eliminated via rain symbol clicks
- **Visual Feedback**: Cyan flash animation (`curse-reset-flash`)
- **State Reset**: `cloningCurseActive = false`, `wormsKilledByRain = 0`, `stolenBlueSymbols = []`
- **Effect**: Next worm click will activate curse again (cycle repeats)

## Enhanced Clone Abilities

### Blue Symbol Stealing

- **Normal Worms**: Can only steal RED (hidden) symbols
- **Cursed Clones**: Can steal BLUE (revealed) symbols
- **Detection**: Checks `worm.classList.contains('revealed-symbol')` before stealing
- **Tracking**: Stolen blue symbols stored in `stolenBlueSymbols[]` array
- **Marking**: Stolen blue symbols marked with `data-was-revealed="true"` attribute

### Visual Indicators

- **Cyan Carry Color**: Stolen blue symbols displayed in cyan on worm (`#00ffff`)
- **Purple Flash**: Worm flashes purple when curse clones it
- **Cyan Explosion**: Rain kills during curse show cyan flash instead of normal

## Priority Replacement System

### Symbol Restoration Logic (game.js)

```javascript
// PRIORITY 1: Check for stolen symbols (includes blue!)
// Restore them FIRST before normal gameplay
if (stolenSymbol.dataset.wasRevealed === 'true') {
    // This was a blue symbol - restore it immediately
    // Don't block game progression
}

// PRIORITY 2: Normal gameplay
if (isSymbolInCurrentLine(clicked)) {
    handleCorrectAnswer(clicked);
}
```

### Game Progression Safety

- **Non-Blocking**: Stolen blue symbols don't prevent line completion
- **Immediate Restoration**: Clicking matching rain symbol restores blue symbols first
- **Visual Feedback**: Cyan background flash for blue symbol restoration (vs normal cyan for red)
- **Line Completion**: `checkLineCompletion()` called after restoration to ensure smooth progression

## Implementation Details

### State Variables (worm.js)

```javascript
this.cloningCurseActive = false;      // Global curse state
this.wormsKilledByRain = 0;           // Counter for rain kills
this.stolenBlueSymbols = [];          // Track stolen blues for priority
worm.wasBlueSymbol = false;           // Per-worm flag
```

### Key Methods Modified

#### `handleWormClick(worm)` - Lines ~595-625

- Removed 80/20 RNG mechanic
- First click activates curse and clones
- Subsequent clicks check curse state and clone if active
- No direct worm kills via clicking anymore

#### `stealSymbol(worm)` - Lines ~400-490

- Enhanced to check curse state
- Allows stealing revealed symbols when `cloningCurseActive === true`
- Marks stolen symbols with `data-was-revealed` attribute
- Tracks blue symbols in `stolenBlueSymbols[]` array
- Visual: Cyan color for stolen blue symbols

#### `explodeWorm(worm, isRainKill)` - Lines ~815-855

- Added `isRainKill` parameter to track kill method
- Removes from `stolenBlueSymbols` tracking on explosion
- Different flash colors: cyan for curse rain kills, normal otherwise
- Cleans up `data-was-revealed` attribute

#### `checkWormTargetClickForExplosion(clickedSymbol)` - Lines ~68-95

- Tracks rain kills: increments `wormsKilledByRain` counter
- Passes `isRainKill=true` to `explodeWorm()`
- Calls `checkCurseReset()` after each rain kill

#### `checkCurseReset()` - Lines ~115-145 (NEW METHOD)

- Checks if all worms are eliminated
- Resets curse state when no active worms remain
- Visual: Calls `createCurseResetEffect()` for cyan flash
- Clears stolen blue symbols tracking

### CSS Animations Added

#### `@keyframes worm-flash-purple` - Lines ~208-225

```css
/* Purple flash for curse activation/cloning */
50% {
    filter: drop-shadow(0 0 40px rgba(255, 0, 255, 1)) 
            drop-shadow(0 0 60px rgba(138, 43, 226, 0.9));
    transform: scale(1.4);
}
```

#### `@keyframes curse-reset-flash` - Lines ~227-240

```css
/* Cyan flash for curse reset */
0% { opacity: 0; }
10% { opacity: 0.6; }
50% { opacity: 0.3; }
100% { opacity: 0; }
```

## Testing Checklist

### Core Mechanics

- [x] First worm click activates curse with purple flash
- [x] Subsequent worm clicks create clones (not kills)
- [x] Clones can steal blue (revealed) symbols
- [x] Stolen blue symbols marked with `data-was-revealed="true"`
- [x] Killing all worms via rain resets curse with cyan flash

### Symbol Restoration

- [x] Clicking rain symbol restores stolen blues FIRST
- [x] Blue restoration shows cyan background flash
- [x] Game doesn't block on stolen blue symbols
- [x] Line completion works after blue symbol restoration

### Visual Feedback

- [x] Purple flash on curse activation
- [x] Purple flash on subsequent worm clicks (cloning)
- [x] Cyan flash on curse reset
- [x] Cyan flash on rain kills during curse
- [x] Stolen blue symbols shown in cyan on worm

### Game Integration

- [x] Event-driven architecture maintained (no direct calls)
- [x] Symbol revelation still works normally
- [x] Line completion progression not blocked
- [x] Console slot locking still functions
- [x] Performance monitor shows no degradation

## Backward Compatibility

### Removed Features

- ❌ **80/20 RNG Mechanic**: Replaced with deterministic curse system
- ❌ **Direct Worm Kills**: Worms can only be killed via rain symbols now

### Preserved Features

- ✅ **Event-Driven Architecture**: All communication via custom events
- ✅ **Symbol Stealing**: Core mechanic unchanged (expanded to blues)
- ✅ **Console Spawning**: Worms still spawn from console slots
- ✅ **Worm Movement**: Animation loop unchanged
- ✅ **Performance Optimizations**: DOM caching, spatial grid all intact

## Console Logging

### New Log Prefixes

```javascript
🔮 - Curse activation/state changes
📋 - Blue symbol tracking
💎 - Blue symbol restoration
🔓 - Curse reset
```

### Example Log Flow

```
🔮 CURSE ACTIVATED! First worm worm-123 clicked directly - cloning and activating curse!
⚠️ CLONING CURSE NOW ACTIVE! Only killing worms via rain symbols will reset it!
🐛 Worm worm-clone-456 stealing BLUE symbol: "5"
📋 Tracking stolen BLUE symbol "5" for priority replacement
🔄 Restoring stolen BLUE symbol "5" in Panel B!
💎 BLUE symbol restored - game can continue progressing!
💥 BOOM! User clicked rain symbol "X" - EXPLODING worm with stolen symbol!
📊 Worms killed by rain: 1
🔓 CURSE RESET! All worms eliminated via rain symbols!
```

## Performance Impact

### Memory

- **New State**: 3 new instance variables (~24 bytes)
- **Tracking Array**: `stolenBlueSymbols[]` - max ~7 entries (negligible)
- **DOM Attributes**: `data-was-revealed` on some symbols (negligible)

### CPU

- **Curse Check**: O(1) boolean check on every worm click
- **Blue Symbol Filter**: O(n) where n = revealed symbols (already cached)
- **Reset Check**: O(1) check after each rain kill
- **No Performance Degradation**: All optimizations preserved

## Known Edge Cases

### Edge Case 1: Curse Reset During Line Completion

- **Scenario**: Last worm killed via rain while line is completing
- **Handling**: `checkLineCompletion()` called after symbol restoration
- **Result**: ✅ Works correctly - curse resets, line completes

### Edge Case 2: Multiple Blue Symbols Stolen

- **Scenario**: Multiple clones steal different blue symbols
- **Handling**: Priority restoration handles first matching symbol only
- **Result**: ✅ User must click multiple rain symbols to restore all

### Edge Case 3: Max Worms During Curse

- **Scenario**: 7 worms active, user clicks one (curse active)
- **Handling**: Clone attempt fails, flash effect shows max reached
- **Result**: ✅ No crash, visual feedback provided

### Edge Case 4: Stolen Blue Symbol from Previous Line

- **Scenario**: Blue symbol stolen, line completes, symbol still missing
- **Handling**: Symbol marked with `data-was-revealed`, doesn't block progression
- **Result**: ✅ Game continues, symbol can be restored later

## Future Enhancements (Optional)

### Curse Intensity Levels

- **Idea**: Increase clone speed/abilities with each curse activation
- **Implementation**: Track `curseLevel` and apply multipliers

### Curse Visual Indicator

- **Idea**: Persistent UI element showing curse is active
- **Implementation**: Small purple icon in Panel B corner

### Curse Achievements

- **Idea**: Track longest curse streak, most clones active simultaneously
- **Implementation**: Add `curseStats` object to WormSystem

### Sound Effects

- **Idea**: Different sounds for curse activation vs reset
- **Implementation**: Add audio triggers in `handleWormClick()` and `checkCurseReset()`

## Conclusion

The Cloning Curse mechanic adds significant depth to the worm system while maintaining all existing performance optimizations and event-driven architecture. The implementation is fully backward compatible (except for the intentional removal of the 80/20 RNG), thoroughly tested, and well-documented.

**Files Modified:**

- `js/worm.js` - Core curse logic (~150 lines modified)
- `js/game.js` - Priority replacement (~30 lines modified)
- `css/worm-styles.css` - New animations (~50 lines added)
- `.github/copilot-instructions.md` - Documentation update

**Total Lines Changed:** ~230 lines across 4 files
**Testing Time:** Full gameplay loop verified ✅
**Performance Impact:** None (optimizations preserved) ✅
