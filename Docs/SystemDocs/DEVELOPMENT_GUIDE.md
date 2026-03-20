# Development Guide - Math Master Algebra

**Last Updated**: October 12, 2025  
**Status**: Active Development

---

## Overview

This guide covers development best practices, recent changes, and coding standards for Math Master Algebra. Read this before making significant changes to the codebase.

> **Path note (2026):** current runtime source lives under `src/scripts/`, `src/styles/`, and `src/pages/`. Older historical notes in this document may still reference legacy `js/` or `css/` paths; map those to the corresponding `src/...` locations when working in the current repo.

---

## Table of Contents

1. [Recent Changes (October 2025)](#recent-changes-october-2025)
2. [Code Quality Standards](#code-quality-standards)
3. [Magic Numbers - Best Practices](#magic-numbers-best-practices)
4. [Power-Up System Status](#power-up-system-status)
5. [Testing Guidelines](#testing-guidelines)
6. [Common Pitfalls](#common-pitfalls)

---

## Recent Changes (October 2025)

### ✅ Completed Code Cleanup

**Phase 1: Dead Code Removal** - COMPLETE

Successfully removed deprecated cloning curse system:

- **81 lines removed** from `src/scripts/worm.js` (2282 → 2201 lines, -3.5%)
- Eliminated `cloningCurseActive` flag and all related tracking
- Removed `checkCurseReset()` and `createCurseResetEffect()` methods
- Cleaned up all conditional branches (6 locations)
- Removed CSS animation `@keyframes curse-reset-flash`

**Files Deleted:**

- legacy `js/problem-manager.js` (empty file)
- `Docs/Cloning_Curse_Implementation.md` (deprecated feature)
- `Docs/Snake_Weapon_Implementation.md` (non-existent feature)

**Phase 3: Documentation Updates** - COMPLETE

Updated all documentation to reflect current codebase state:

- `.github/copilot-instructions.md` - Power-up details and cloning curse removal
- `Docs/BRANCH_SYNC_SUMMARY.md` - Added cleanup results
- All references to deprecated features removed

**Phase 4: Code Quality Improvements** - COMPLETE

Extracted magic numbers to named constants in `src/scripts/worm.js`:

```javascript
// Power-up system
this.POWER_UP_DROP_RATE = 0.1;
this.POWER_UP_TYPES = ["chainLightning", "spider", "devil"];

// Animation timing (milliseconds)
this.EXPLOSION_CLEANUP_DELAY = 600;
this.WORM_REMOVAL_DELAY = 500;
this.PROBLEM_COMPLETION_CLEANUP_DELAY = 2000;
this.SLIME_SPLAT_DURATION = 10000;
this.SPIDER_HEART_DURATION = 60000;
this.SKULL_DISPLAY_DURATION = 10000;
this.CLONE_WORM_ROAM_DURATION = 10000;

// Distance thresholds (pixels)
this.DEVIL_PROXIMITY_DISTANCE = 50;
this.DEVIL_KILL_TIME = 5000;
```

**Impact:** Improved maintainability, easier game balance tuning

---

## Code Quality Standards

### Event-Driven Architecture

**CRITICAL RULE**: All inter-module communication uses DOM events. Never call functions directly between modules.

**✅ Correct Pattern:**

```javascript
// Dispatch event
document.dispatchEvent(
  new CustomEvent("symbolClicked", {
    detail: { symbol: "X" },
  }),
);

// Listen for event
document.addEventListener("symbolClicked", (event) => {
  console.log("Symbol clicked:", event.detail.symbol);
});
```

**❌ Wrong Pattern:**

```javascript
// Direct function call between modules
game.handleSymbolClick("X"); // NEVER DO THIS!
```

**Key Events:**

- `symbolClicked` - User clicks symbol
- `symbolRevealed` - Symbol validated and revealed
- `first-line-solved` - First correct answer triggers lock
- `problemLineCompleted` - Worm spawn trigger
- `lockLevelActivated` - Lock animation progression
- `wormSymbolCorrect` - Worm defeated
- `purpleWormTriggered` - Boss worm spawned

---

## Magic Numbers Best Practices

### What Are Magic Numbers?

Hard-coded numerical values without explanatory variable names. They make code harder to understand and maintain.

**❌ Bad Example:**

```javascript
const hasPowerUp = Math.random() < 0.1; // What is 0.10?
setTimeout(() => cleanup(), 600); // Why 600?
if (dist < 50) {
  killWorm();
} // 50 what? pixels? units?
```

**✅ Good Example:**

```javascript
const POWER_UP_DROP_RATE = 0.1; // 10% chance per worm
const EXPLOSION_ANIMATION_DURATION = 600; // ms - Must match CSS animation
const DEVIL_PROXIMITY_DISTANCE = 50; // px - Kill radius around devil

const hasPowerUp = Math.random() < POWER_UP_DROP_RATE;
setTimeout(() => cleanup(), EXPLOSION_ANIMATION_DURATION);
if (dist < DEVIL_PROXIMITY_DISTANCE) {
  killWorm();
}
```

### Benefits of Named Constants

1. **Self-Documenting**: Name explains purpose
2. **Single Source of Truth**: Change once, updates everywhere
3. **Easy Game Balance**: Adjust difficulty without hunting through code
4. **Type Safety**: Comments clarify units (ms, px, percentage)

### Example: Balancing Game Difficulty

**With Magic Numbers** (Hard):

```javascript
// Must search entire file for these values:
Math.random() < 0.1; // Find all instances
chainKills += 2; // Which += 2 is the right one?
if (dist < 50) {
  killWorm();
} // Which < 50 is for devil radius?
```

**With Named Constants** (Easy):

```javascript
// Just change values at top of file:
this.POWER_UP_DROP_RATE = 0.15; // Changed from 0.10
this.CHAIN_LIGHTNING_BONUS_PER_PICKUP = 3; // Changed from 2
this.DEVIL_PROXIMITY_DISTANCE = 60; // Changed from 50
```

### Recommended Constants Section

Place at top of class constructor:

```javascript
class WormSystem {
  constructor() {
    // ===== GAME BALANCE CONSTANTS =====

    // Power-Up System
    this.POWER_UP_DROP_RATE = 0.1; // 10% chance per worm
    this.CHAIN_LIGHTNING_BASE_KILLS = 5; // Initial worms killed
    this.CHAIN_LIGHTNING_BONUS_PER_PICKUP = 2; // +2 kills per pickup

    // Distance Thresholds (pixels)
    this.AOE_EXPLOSION_RADIUS = 18; // One worm height
    this.SPIDER_CONVERSION_DISTANCE = 30; // Spider touch radius
    this.DEVIL_PROXIMITY_DISTANCE = 50; // Devil kill radius

    // Timing Constants (milliseconds)
    this.CHAIN_EXPLOSION_DELAY = 150; // Visual delay
    this.EXPLOSION_ANIMATION_DURATION = 600; // Must match CSS
    this.CLEANUP_DELAY = 2000; // Allow animations
    this.SKULL_DISPLAY_DURATION = 10000; // 10 seconds
    this.SPIDER_HEART_DURATION = 60000; // 1 minute
    this.DEVIL_KILL_TIME = 5000; // 5 seconds

    // Existing code continues...
  }
}
```

---

## Power-Up System Status

### ✅ All Power-Ups Fully Implemented

### 1. Chain Lightning ⚡

- Drop rate: 10%
- Activation: Click icon in help tooltip
- Behavior: Click worm → kills 5 worms initially, +2 per subsequent pickup
- Location: `src/scripts/worm-powerups*.js` and related worm helpers

### 2. Spider 🕷️

- Drop rate: 10%
- Activation: Click icon (auto-spawns)
- Behavior: Hunts worms, converts them to spiders (chain reaction)
- Lifecycle: Spider → ❤️ (on click) → 💀 (after 1 min) → disappears (10s)
- Location: `src/scripts/worm-powerups*.js` and related worm helpers

### 3. Devil 👹

- Drop rate: 10%
- Activation: Click icon → click map to place
- Behavior: Worms rush to devil, die after 5s proximity
- Location: `src/scripts/worm-powerups*.js` and related worm helpers

**UI/UX Details:**

- NO keyboard shortcuts (user requirement)
- Help tooltip shows current counts: `⚡ 2 🕷️ 1 👹 0`
- Cursor changes to crosshair for targeting
- Visual feedback on activation

---

## Testing Guidelines

### Local Testing Setup

**REQUIRED**: Always use local HTTP server (never `file://` protocol)

```powershell
# Install tooling once
npm install

# Start server
npm start

# Access game
http://localhost:8000/game.html?level=beginner
```

**Competition QA lanes:**

- `npm run test:competition:smoke` - seed-tagged smoke coverage for the competition profile
- `npm run test:competition:matrix` - seed-tagged cross-browser/device competition matrix

### URL Parameters

- `?level=beginner` - Beginner difficulty
- `?level=warrior` - Warrior difficulty
- `?level=master` - Master difficulty
- `?lockComponent=level-1-transformer.html` - Debug lock (testing only)

### Manual Testing Checklist

**Power-Ups:**

- [ ] Chain Lightning: Kill worms until ⚡ drops → click icon → click worm → verify 5+ kills
- [ ] Spider: Collect 🕷️ → click icon → verify spider spawns and hunts worms
- [ ] Devil: Collect 👹 → click icon → place devil → verify worms rush to it

**Worm System:**

- [ ] Console spawning: Complete row → verify worms spawn from console slots
- [ ] Border spawning: Verify border spawns for rows 2+
- [ ] Purple worms: Make 4+ mistakes → verify purple worm spawns
- [ ] Symbol stealing: Verify worms steal and gray out symbols

**Performance:**

- [ ] Open performance monitor with 'P' key
- [ ] Verify FPS stays 55+ with normal gameplay
- [ ] Check for frame drops during multi-worm spawns
- [ ] Monitor DOM queries/sec (target <150)

### Performance Metrics Targets

| Metric          | Desktop Target | Mobile Target |
| --------------- | -------------- | ------------- |
| FPS             | 58-60          | 45-50         |
| Frame Time      | <16ms          | <22ms         |
| DOM Queries/sec | <150           | <150          |
| Memory Growth   | <5MB/min       | <5MB/min      |

---

## Common Pitfalls

### 1. CSS Font Size Overrides

**Problem**: Panel A & B font sizes CANNOT be changed via CSS - JS applies inline styles that override everything.

**Solution**: Edit `src/scripts/display-manager.js` (NOT the CSS files)

See `Docs/CSS_Override_Investigation.md` for full explanation.

### 2. X/x Symbol Matching

**Problem**: Game must treat 'X' and 'x' as identical.

**Solution**: Already handled in `game.js` - `isSymbolInCurrentLine()` and `revealSpecificSymbol()` normalize case.

### 3. Worm Movement Performance

**Problem**: Worm positioning handled by JavaScript, NOT CSS transitions.

**Solution**: Do not add CSS animations to worm movement. All positioning happens in `requestAnimationFrame` loop.

### 4. File Integrity

**Problem**: `src/styles/worm-styles.css` has had syntax errors in the past.

**Solution**: Backup files exist around the worm style surface; always validate CSS syntax after editing.

### 5. CORS Issues

**Problem**: Opening `game.html` as `file://` causes problem loading failures.

**Solution**: Always use local HTTP server (`python -m http.server 8000`).

### 6. Touch Events

**Problem**: Standard `click` events have ~200ms delay on mobile.

**Solution**: Use `pointerdown` for all interactive elements (already implemented in `src/scripts/console-manager.js`).

---

## Deferred Work

### Phase 2: Spawn Method Consolidation

**Status**: ⚠️ DEFERRED (high complexity/risk)

Three spawn methods have 85% code duplication (~360 lines):

- `spawnWormFromConsole()` - 150 lines
- `spawnWorm()` - 145 lines
- `spawnWormFromBorder()` - 150 lines

**Reason for Deferral**:

- High risk of breaking spawn mechanics
- Requires comprehensive test suite
- Better suited for separate PR with extensive testing

**Recommendation**:

- Create unit tests for spawn logic first
- Use factory pattern for consolidation
- Extract helper methods incrementally
- Manual testing across all difficulty levels

---

## Git Workflow

**Repository**: `https://github.com/TeacherEvan/MathMasterHTML`  
**Main Branch**: `main` (auto-deploys to GitHub Pages)

**Commit Convention**:
Use emoji prefixes matching console logs for easy tracking:

- 🎮 = Core game logic changes
- 🔒 = Lock animation changes
- 🐛 = Worm system changes
- 📊 = Performance changes
- 🎯 = Symbol rain (Panel C) changes

**Before Pushing**:

1. Test locally with `python -m http.server 8000`
2. Verify all difficulty levels work
3. Check performance monitor (press 'P')
4. Validate no console errors

---

## Summary Statistics

### Current Codebase Metrics

| Metric                  | Value                                 |
| ----------------------- | ------------------------------------- |
| Total JS Lines          | 4,499                                 |
| Largest File            | `worm.js` (2,201 lines, 42% of total) |
| Dead Code Removed       | 250+ lines (October 2025)             |
| Magic Numbers Converted | 11 constants                          |
| Code Duplication        | ~360 lines (spawn methods - deferred) |

### Code Quality Achievements

- ✅ All cloning curse dead code removed
- ✅ Magic numbers extracted to constants
- ✅ Documentation updated and accurate
- ✅ Event-driven architecture maintained
- ✅ Zero syntax errors
- ✅ Performance optimized (60 FPS target achieved)

---

## Resources

- **Performance Guide**: `Docs/SystemDocs/PERFORMANCE.md`
- **Architecture Guide**: `Docs/SystemDocs/ARCHITECTURE.md`
- **CSS Override Details**: `Docs/CSS_Override_Investigation.md`
- **Audit Report**: `Docs/CODEBASE_AUDIT_REPORT_V2.md`
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md`

---

End of Development Guide
