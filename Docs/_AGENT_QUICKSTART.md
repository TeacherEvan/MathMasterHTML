# 🤖 Agent Quickstart Guide
>
> **Read this first!** Fast-track onboarding for AI coding agents

## ⚡ 30-Second Overview

**MathMaster** = Educational algebra game where:

1. Player sees falling symbols (Panel A/rain)
2. Clicks symbols to reveal solution (Panel B)
3. Worms try to steal symbols (enemy AI)
4. Power-ups help kill worms

**Tech Stack**: Vanilla HTML/CSS/JS, no framework, ES2022

---

## 🎯 Common Tasks & Where to Look

| Task | Primary File(s) | Key Function/Class |
|------|-----------------|-------------------|
| Fix worm behavior | `js/worm.js` | `WormSystem` class |
| Modify worm animation | `css/worm-base.css` | `.worm-container` |
| Change game constants | `js/constants.js` | `GameConstants` |
| Debug with console | `js/console-manager.js` | Browser console |
| Add power-up | `js/worm-powerups.js` | `WormPowerUpSystem` |
| Fix symbol display | `js/display-manager.js` | `DisplayManager` |

---

## 🚨 Critical Gotchas

### 1. Purple Worms Are Special

```javascript
// Purple worms CLONE when clicked (punishment)
// Kill them by clicking MATCHING symbol in rain
// They spawn with isPurple=true, canStealBlue=true
```

### 2. Panel B Check for Stealing

```javascript
// Worms can ONLY steal symbols when inside Panel B
// The stealSymbol() function has a boundary check
// If worm is outside, it continues roaming
```

### 3. Animation Uses requestAnimationFrame

```javascript
// Main loop: worm.js → animate()
// Called ~60fps, updates all worm positions
// Don't add heavy operations here
```

### 4. Global State on Window

```javascript
// Access worm system: window.wormSystem
// Access constants: window.GameConstants
// Test commands in browser console
```

---

## 🔧 Essential Console Commands

```javascript
// Spawn test worm
window.wormSystem.spawnWormFromConsole();

// Spawn purple worm
document.dispatchEvent(new CustomEvent('purpleWormTriggered'));

// Give power-ups
window.wormSystem.powerUps.chainLightning = 5;
window.wormSystem.updatePowerUpDisplay();

// Check worm state
window.wormSystem.worms.forEach(w => console.log(w.id, w.isPurple, w.hasStolen));

// Kill all worms
window.wormSystem.worms.forEach(w => window.wormSystem.removeWorm(w));
```

---

## 📁 File Map (Most Important)

```
js/
├── worm.js           ← MAIN: 2200 lines, WormSystem class
├── worm-factory.js   ← Creates worm data/elements
├── worm-movement.js  ← Movement calculations
├── worm-powerups.js  ← Power-up logic
├── worm-spawn-manager.js ← Spawn queue/coordination
├── constants.js      ← ALL magic numbers here
├── game.js           ← Game flow, problem loading
└── utils.js          ← normalizeSymbol(), calculateDistance()

css/
├── worm-base.css     ← Worm appearance, segments
├── worm-effects.css  ← Explosions, flickers, particles
└── game.css          ← Layout, panels
```

---

## 🔄 State Machine: Worm Lifecycle

```
[SPAWN] → [ROAMING] → [RUSHING_TO_TARGET] → [STEALING] → [CARRYING] → [RETURNING/EXIT]
                ↑                                              ↓
                └──────────── (if target lost) ←───────────────┘
```

**Key Properties:**

- `worm.hasStolen` - Has a symbol
- `worm.isRushingToTarget` - Moving to specific symbol
- `worm.roamingEndTime` - When roaming ends
- `worm.isPurple` - Purple worm special behavior

---

## 🐛 Recent Bug Fixes (Check These First)

### Nov 26, 2025

1. **Purple worm not stealing** - Fixed `_updateWormRushingToTarget()` to find nearest symbol when `targetSymbol` is null
2. **Carried symbol animation** - Added `.carried-symbol` CSS with float and pull-in animations

---

## ✅ Verification Commands

```bash
npm run verify      # Full health check
npm run lint        # ESLint only
npm run lint:fix    # Auto-fix lint issues
npm start           # Start dev server at :8000
```

---

## 📚 Need More Detail?

| Topic | Go To |
|-------|-------|
| Full architecture | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Worm system deep dive | [WORM_DEVELOPER_GUIDE.md](./WORM_DEVELOPER_GUIDE.md) |
| Testing scenarios | [WORM_TESTING_GUIDE.md](./WORM_TESTING_GUIDE.md) |
| Performance tuning | [PERFORMANCE.md](./PERFORMANCE.md) |
| All docs index | [_INDEX.md](./_INDEX.md) |

---

*This file optimized for AI agent consumption*
*Last updated: 2025-11-26*
