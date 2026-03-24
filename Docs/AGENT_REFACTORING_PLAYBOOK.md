# Agent Refactoring Playbook: MathMasterHTML

This document serves as a step-by-step guide for AI agents (or human developers) to systematically refactor and improve the MathMasterHTML codebase. Follow these instructions sequentially to ensure safety and stability.

## 🛠️ Prerequisites

*   **Node.js Environment**: Ensure `npm` is installed.
*   **Verification Tool**: Run `npm run verify` before and after each major change.
*   **Repo State**: Ensure the git working directory is clean.

---

## Phase 1: Architecture Safety (Event Bus Refactoring)

**Goal:** Eliminate "magic strings" in event dispatching and listening to prevent typos and coupling issues.

### Step 1.1: Create `src/scripts/constants.events.js`

Create a new file to centralize all event names.

```javascript
// src/scripts/constants.events.js
(function() {
  window.GameEvents = {
    // Game Flow
    GAME_INIT: "gameInit",
    GAME_START: "gameStart",
    GAME_OVER: "gameOver",
    PROBLEM_COMPLETED: "problemCompleted",
    LEVEL_COMPLETED: "levelCompleted",
    
    // Worms
    WORM_SPAWN: "wormSpawn",
    WORM_DEATH: "wormDeath",
    ROW_RESET_BY_WORM: "rowResetByWorm",
    
    // Symbols
    SYMBOL_CLICKED: "symbolClicked",
    SYMBOL_REVEALED: "symbolRevealed",
    
    // System
    DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
    VISIBILITY_CHANGE: "visibilitychange"
  };
})();
```

### Step 1.2: Update `src/pages/game.html`

Add the new script reference in `src/pages/game.html` **before** other game scripts. The root-level `game.html` only redirects to the actual runtime page.

```html
<script src="src/scripts/constants.events.js"></script>
```

### Step 1.3: Refactor Dispatch Calls

**Instruction:** Search for `dispatchEvent` and replace string literals with constants.

*   **Search:** `grep -r "dispatchEvent" src/scripts`
*   **Example Replacement:**
    *   *Old:* `document.dispatchEvent(new CustomEvent("rowResetByWorm", ...))`
    *   *New:* `document.dispatchEvent(new CustomEvent(window.GameEvents.ROW_RESET_BY_WORM, ...))`

### Step 1.4: Refactor Listeners

**Instruction:** Search for `addEventListener` and replace string literals.

*   **Search:** `grep -r "addEventListener" src/scripts`
*   **Example Replacement:**
    *   *Old:* `document.addEventListener("rowResetByWorm", ...)`
    *   *New:* `document.addEventListener(window.GameEvents.ROW_RESET_BY_WORM, ...)`

### Validation
Run `npm run verify` to ensure no syntax errors. Manually play the game to verify event flows (e.g., worm stealing a row).

---

## Phase 2: Security Hardening (DOM Sanitization)

**Goal:** Prevent XSS vulnerabilities by sanitizing all `innerHTML` usage.

### Step 2.1: Create `src/scripts/utils-sanitizer.js`

```javascript
// src/scripts/utils-sanitizer.js
(function() {
  function escapeHTML(value) {
    const div = document.createElement("div");
    div.textContent = value == null ? "" : String(value);
    return div.innerHTML;
  }

  window.DomSanitizer = Object.freeze({
    escapeHTML,
  });
})();
```

### Step 2.2: Audit and Replace `innerHTML`

**Instruction:** Find all `innerHTML` assignments.

*   **Search:** `grep -r "innerHTML =" src/scripts`
*   **Action:**
    *   If the content is purely static (hardcoded string): **Safe to ignore** (or use `textContent`).
    *   If the content contains variables (`${var}`): **CRITICAL**. Wrap with sanitizer or refactor to `textContent`.

**Example (Unsafe):**
```javascript
banner.innerHTML = `LINE ${lineNumber} COMPLETE!`;
```

**Refactored (Safe):**
```javascript
banner.textContent = `LINE ${lineNumber} COMPLETE!`;
```
*OR (if HTML needed)*
```javascript
banner.innerHTML = `LINE ${window.DomSanitizer.escapeHTML(lineNumber)} COMPLETE!`;
```

---

## Phase 3: Performance Optimization (Render Loop)

**Goal:** Validate the `3rdDISPLAY.js` render loop and batch writes only if profiling shows churn.

### Step 3.1: Audit `animateSymbols` Loop

In `src/scripts/3rdDISPLAY.js`, audit `animateSymbols` before changing it. The current collision helpers already use the spatial grid and symbol coordinates rather than live DOM layout reads.

**Pattern to Fix:**
```javascript
// BAD (Thrashing)
for (let symbol of symbols) {
  let y = symbol.y; // Read state
  let collision = checkCollision(symbol); // MIGHT READ DOM (getBoundingClientRect)
  symbol.element.style.top = y + 'px'; // WRITE DOM
}
```

**Fix Strategy: Batching**

1.  **Read Phase:** Calculate all new positions and collision results *without* touching the DOM. Store them in a temporary structure.
2.  **Write Phase:** Apply all DOM updates in a second loop.

```javascript
// GOOD (Batched)
const updates = [];
// 1. Calculate
for (let symbol of symbols) {
  // ... math logic ...
  updates.push({ element: symbol.element, top: newY });
}
// 2. Apply
for (let update of updates) {
  update.element.style.top = `${update.top}px`;
}
```

### Step 3.2: Verify `checkCollision`

Ensure `checkCollision` (and `checkTouching`) keeps using the **Spatial Hash Grid** (`spatialGrid`) exclusively and does **not** regress to `getBoundingClientRect()` or `offsetWidth/Height`.

---

## Phase 4: Modernization (Constants & Modules)

**Goal:** Remove magic numbers and prepare for ES Modules.

### Step 4.1: Extract Magic Numbers

**Instruction:** Scan `src/scripts/worm-system.behavior.js` for hardcoded values.

*   **Search:** Look for `5000` (roaming time), `0.2` (speed boost).
*   **Action:** Move them to `src/scripts/constants.js` (or `src/scripts/worm-constants.js`).

**Example:**
```javascript
// src/scripts/constants.js
window.GameConstants = {
  // ...
  WORM: {
    ROAMING_DURATION_MS: 5000,
    FLICKER_SPEED_BOOST: 0.2
  }
};
```

### Step 4.2: Update Call Sites

Replace the numbers with `window.GameConstants.WORM.ROAMING_DURATION_MS`.

---

## Validation Checklist

After each phase, run:
1.  `npm run verify` (Must pass)
2.  `npm test` (If applicable, or manual smoke test)
3.  **Manual Play:**
    *   Load `game.html?level=beginner`
    *   Verify worms spawn and move.
    *   Verify symbol rain falls.
    *   Verify interactions (clicking symbols).

---
*Created by Copilot for MathMasterHTML Refactoring Initiative*
