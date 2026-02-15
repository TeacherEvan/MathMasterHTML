# Worm Mechanics System - Fix Plan

**Date:** February 15, 2026  
**Based on:** Code Review of uncommitted changes  
**Status:** Planning

---

## Overview

This plan addresses 5 issues identified during the code review of the worm mechanics system modernization. The issues range from missing state registrations to deployment path problems.

---

## Issue Summary

| #   | Issue                        | Severity   | File               | Effort |
| --- | ---------------------------- | ---------- | ------------------ | ------ |
| 1   | Missing "devilReached" state | WARNING    | DevilState.js      | Low    |
| 2   | Missing "exiting" state      | WARNING    | CarryingState.js   | Low    |
| 3   | Hardcoded absolute paths     | WARNING    | index.js           | Low    |
| 4   | No error fallback in steal   | SUGGESTION | StealingState.js   | Low    |
| 5   | Entity mutation in update    | SUGGESTION | SpatialHashGrid.js | Low    |

---

## Detailed Fix Plans

### Issue 1: Missing "devilReached" State

**File:** [`src/scripts/worm/behavior/DevilState.js`](MathMasterHTML/src/scripts/worm/behavior/DevilState.js:102)

**Problem:** The `update()` method returns `"devilReached"` but this state is not registered in the state machine.

**Option A: Create DevilReachedState.js (Recommended)**

- Create a new state file that handles the worm reaching the devil
- The state should emit a collision event and trigger worm explosion
- Register the state in index.js

**Option B: Emit Event Instead**

- Change line 102 to emit an event and return null
- Let the parent system handle the collision

**Recommended Approach:** Option B - simpler and avoids creating unnecessary state files.

```javascript
// DevilState.js line 100-103
if (distance < 30) {
  this.emit(window.WormEvents?.COLLISION_DETECTED, {
    wormId: worm.id,
    target: "devil",
  });
  return null; // Stay in current state, let system handle
}
```

---

### Issue 2: Missing "exiting" State

**File:** [`src/scripts/worm/behavior/CarryingState.js`](MathMasterHTML/src/scripts/worm/behavior/CarryingState.js:69)

**Problem:** Returns `"exiting"` state when worm exits screen, but no such state exists.

**Option A: Create ExitingState.js**

- Create a cleanup state that removes the worm from the system
- Register in index.js

**Option B: Emit Removal Event (Recommended)**

- Emit `WORM_REMOVED` event and return null
- Let the parent system handle worm removal

**Recommended Approach:** Option B - consistent with Issue 1 fix.

```javascript
// CarryingState.js line 68-72
if (this._hasExitedScreen(worm)) {
  this.emit(window.WormEvents?.WORM_REMOVED, {
    wormId: worm.id,
    stolenSymbol: this._stolenSymbol,
  });
  return null;
}
```

---

### Issue 3: Hardcoded Absolute Paths

**File:** [`src/scripts/worm/index.js`](MathMasterHTML/src/scripts/worm/index.js:22-35)

**Problem:** Module paths start with `/src/scripts/worm/...` which breaks subdirectory deployment.

**Solution:** Use relative paths from the index.js location.

```javascript
// index.js - Updated module paths
const modules = [
  // Core
  "./core/WormEvents.js",
  "./core/EventBus.js",

  // Pools
  "./pools/WormSegmentPool.js",
  "./pools/ParticlePool.js",

  // Collision
  "./collision/SpatialHashGrid.js",

  // Behavior (base classes first)
  "./behavior/WormState.js",
  "./behavior/BehaviorStateMachine.js",
  "./behavior/RoamingState.js",
  "./behavior/RushingState.js",
  "./behavior/StealingState.js",
  "./behavior/CarryingState.js",
  "./behavior/DevilState.js",
];
```

**Note:** The script URLs will be resolved relative to the index.js file location, which works regardless of deployment path.

---

### Issue 4: No Error Fallback in StealingState

**File:** [`src/scripts/worm/behavior/StealingState.js`](MathMasterHTML/src/scripts/worm/behavior/StealingState.js:136)

**Problem:** If the steal callback fails, there's no recovery path since `canTransitionTo()` only allows "carrying".

**Solution:** Add try-catch with error logging and allow fallback transition.

```javascript
// StealingState.js - Updated _performSteal method
_performSteal(worm) {
  try {
    // Mark worm as having stolen
    worm.hasStolen = true;
    worm.stolenSymbol = worm.targetSymbol;

    // Execute callback if provided
    if (this._onStealCallback) {
      this._onStealCallback(worm, this._targetElement);
    }

    // Emit stolen event
    this.emit(window.WormEvents?.SYMBOL_STOLEN, {
      wormId: worm.id,
      symbol: worm.targetSymbol,
      element: this._targetElement,
    });
  } catch (error) {
    console.error("StealingState: Steal operation failed", error);
    worm.hasStolen = false;
    worm.stolenSymbol = null;
    // Allow transition back to roaming on failure
    this._failed = true;
  } finally {
    // Clear target references
    worm.targetSymbol = null;
    worm.targetElement = null;

    // Reset transform if applied
    if (worm.element) {
      worm.element.style.transform = "";
    }
  }
}

// Updated update method to handle failure
update(worm, deltaTime) {
  const elapsed = Date.now() - this._stealStartTime;

  if (elapsed >= this._stealDuration) {
    this._performSteal(worm);

    // Check for failure
    if (this._failed) {
      return "roaming"; // Fallback on error
    }
    return "carrying";
  }

  this._updateStealAnimation(worm, elapsed / this._stealDuration);
  return null;
}

// Updated canTransitionTo
canTransitionTo(stateName) {
  return stateName === "carrying" || (this._failed && stateName === "roaming");
}
```

---

### Issue 5: Entity Mutation in SpatialHashGrid.update()

**File:** [`src/scripts/worm/collision/SpatialHashGrid.js`](MathMasterHTML/src/scripts/worm/collision/SpatialHashGrid.js:155-156)

**Problem:** The `update()` method mutates `entity.x` and `entity.y`, which is unexpected behavior.

**Solution:** Remove the entity mutation - callers should update their own entities.

```javascript
// SpatialHashGrid.js - Updated update method
update(entity, newX, newY) {
  const oldKey = this._hash(entity.x, entity.y);
  const newKey = this._hash(newX, newY);

  if (oldKey !== newKey) {
    // Remove from old cell
    const oldCell = this._grid.get(oldKey);
    if (oldCell) {
      oldCell.delete(entity);
      if (oldCell.size === 0) {
        this._grid.delete(oldKey);
      }
    }

    // Add to new cell
    if (!this._grid.has(newKey)) {
      this._grid.set(newKey, new Set());
    }
    this._grid.get(newKey).add(entity);
  }

  // REMOVED: entity.x = newX;
  // REMOVED: entity.y = newY;
  // Callers are responsible for updating their own position
}
```

**Alternative:** Rename method to `moveEntity()` if mutation is intentional.

---

## Implementation Order

1. **Issue 3** (paths) - Fix first as it affects module loading
2. **Issue 1** (devilReached) - Fix state handling
3. **Issue 2** (exiting) - Fix state handling
4. **Issue 4** (steal fallback) - Add error handling
5. **Issue 5** (entity mutation) - Fix API behavior

---

## Testing Checklist

After implementing fixes:

- [ ] All modules load correctly from subdirectory deployment
- [ ] Devil collision triggers correct event without state error
- [ ] Worm exit triggers correct event without state error
- [ ] Failed steal operation falls back to roaming state
- [ ] SpatialHashGrid.update() no longer mutates entities

---

## Files to Modify

| File                                            | Changes                               |
| ----------------------------------------------- | ------------------------------------- |
| `src/scripts/worm/index.js`                     | Change to relative paths              |
| `src/scripts/worm/behavior/DevilState.js`       | Emit event instead of returning state |
| `src/scripts/worm/behavior/CarryingState.js`    | Emit event instead of returning state |
| `src/scripts/worm/behavior/StealingState.js`    | Add error handling and fallback       |
| `src/scripts/worm/collision/SpatialHashGrid.js` | Remove entity mutation                |

---

## Next Steps

Switch to Code mode to implement these fixes.
