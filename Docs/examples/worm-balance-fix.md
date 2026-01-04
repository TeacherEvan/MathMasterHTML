# Worm Balance Fix - Example Implementation

**Created**: January 4, 2026  
**Purpose**: Demonstrate recommended fixes for worm timing and difficulty scaling

---

## Problem Analysis (via Sequential Thinking)

**Current Issue**: Worms arrive too late to be effective adversaries

- Row completion time: 3-5 seconds
- Worm arrival time: 12 seconds (8s roam + 2s targeting + 2s stealing)
- **Result**: Worms miss their opportunity to steal symbols

---

## Recommended Solution

### 1. Reduce Roaming Duration

```javascript
// In js/worm.js - Update timing constants

// BEFORE (ineffective):
this.ROAMING_DURATION_CONSOLE = 8000; // 8 seconds
this.ROAMING_DURATION_BORDER = 10000; // 10 seconds

// AFTER (balanced):
this.ROAMING_DURATION_CONSOLE = 3000; // 3 seconds
this.ROAMING_DURATION_BORDER = 5000; // 5 seconds
```

**Expected Impact**: Worms arrive at 5-7s, overlapping with player completion window

---

### 2. Add Difficulty Scaling

```javascript
// In js/worm.js - Add difficulty-based configuration

initializeDifficultySettings() {
    const difficultySettings = {
        beginner: {
            wormsPerRow: 3,
            baseSpeed: 1.0,
            roamTime: 5000,
            targetTheftRate: 0.25  // 25% symbols stolen
        },
        warrior: {
            wormsPerRow: 5,
            baseSpeed: 1.5,
            roamTime: 4000,
            targetTheftRate: 0.45  // 45% symbols stolen
        },
        master: {
            wormsPerRow: 8,
            baseSpeed: 2.0,
            roamTime: 3000,
            targetTheftRate: 0.65  // 65% symbols stolen
        }
    };

    // Apply settings based on current difficulty level
    const currentDifficulty = this.getCurrentDifficulty();
    const settings = difficultySettings[currentDifficulty];

    this.wormsPerRow = settings.wormsPerRow;
    this.baseWormSpeed = settings.baseSpeed;
    this.ROAMING_DURATION_BORDER = settings.roamTime;
}

getCurrentDifficulty() {
    // Extract from URL or game state
    // For example: level-select.html?difficulty=warrior
    const params = new URLSearchParams(window.location.search);
    return params.get('difficulty') || 'beginner';
}
```

---

## Expected Metrics After Fix

| Metric                 | Beginner     | Warrior       | Master        |
| ---------------------- | ------------ | ------------- | ------------- |
| Symbols Stolen/Problem | 1-2 (20-30%) | 2-4 (40-50%)  | 4-6 (60-70%)  |
| Worm Arrival Time      | 7-8s         | 6-7s          | 5-6s          |
| Worms per Problem      | 9 (3×3 rows) | 15 (5×3 rows) | 24 (8×3 rows) |
| Power-Ups Needed       | 0-1          | 1-2           | 2-3           |

---

## Testing Checklist

- [ ] Beginner: Worms steal 20-30% of symbols
- [ ] Warrior: Worms steal 40-50% of symbols
- [ ] Master: Worms steal 60-70% of symbols
- [ ] Worms arrive before row completion at all difficulty levels
- [ ] Power-ups feel necessary rather than optional
- [ ] No performance degradation with increased worm counts

---

## Implementation Steps

1. Update timing constants in `js/worm.js`
2. Add difficulty detection method
3. Add difficulty settings configuration
4. Apply settings in constructor
5. Test at each difficulty level
6. Collect metrics and adjust values

---

**Status**: Proposal - Awaiting implementation and testing
