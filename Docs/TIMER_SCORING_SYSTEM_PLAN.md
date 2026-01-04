# Timer, Scoring & Investigation System Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for adding a countdown timer, score counter, player data persistence, and investigative gameplay elements to Math Master.

---

## 1. Feature Specifications

### 1.1 Countdown Timer System

- **Duration**: 60 seconds per step
- **Position**: Top-right corner, prominently displayed
- **Color Phases** (smooth transitions using HSL interpolation):
  | Time Remaining | Color | Behavior |
  |----------------|-------|----------|
  | 60-50s | Blue (#00BFFF) | Gentle pulse (1.5s cycle) |
  | 50-30s | Green (#00FF00) | Medium pulse (1.2s cycle) |
  | 30-10s | Yellow (#FFD700) | Faster pulse (0.8s cycle) |
  | 10-0s | Red (#FF4444) | Intense pulse (0.4s cycle) + glow |

### 1.2 Score Counter System

- **Initial Score**: 1000 points per step
- **Position**: Top-left corner
- **Decrement Rate**: Linear, reaching 0 when timer hits 0 (~16.67 points/second)
- **Step Bonus**: +1000 points added upon completing each step
- **Failure Penalty**: Score locks at 0 if step not completed in time

### 1.3 Score Flow Logic

```
┌─────────────────────────────────────────────────────────────┐
│ START STEP                                                   │
│ Score = Previous Total + 1000                               │
│ Timer = 60 seconds                                          │
├─────────────────────────────────────────────────────────────┤
│ DURING STEP (every 60ms update)                             │
│ Score = Score - (1000/60/16.67) ≈ 1 point per 60ms         │
│ Timer decrements                                            │
├─────────────────────────────────────────────────────────────┤
│ STEP COMPLETED                                              │
│ Lock current score                                          │
│ Add 1000 bonus                                              │
│ Reset timer to 60s                                          │
│ Continue with new total                                     │
├─────────────────────────────────────────────────────────────┤
│ TIMER REACHES 0 (FAILURE)                                   │
│ Score locks at 0 for this step                             │
│ Level continues but with 0 added                            │
└─────────────────────────────────────────────────────────────┘
```

### 1.4 Level Score Accumulation

- Total score persisted at end of each level
- Scores combined across all completed levels
- Displayed in final summary

### 1.5 Player Data Persistence (localStorage)

```javascript
{
  "mathmaster_players": {
    "player_id_123": {
      "name": "Player Name",
      "createdAt": "2026-01-04T...",
      "lastPlayed": "2026-01-04T...",
      "totalScore": 15000,
      "highScore": 5200,
      "levelsCompleted": {
        "beginner": { completed: true, score: 5200, stars: 3 },
        "warrior": { completed: true, score: 4800, stars: 2 },
        "master": { completed: false, score: 0, stars: 0 }
      },
      "achievements": ["first_solve", "combo_master"],
      "statistics": {
        "totalProblemsolved": 45,
        "totalTimeSpent": 3600000,
        "averageScore": 980
      }
    }
  },
  "mathmaster_current_player": "player_id_123",
  "mathmaster_session": {
    "levelScore": 3500,
    "currentStreak": 5,
    "startTime": "2026-01-04T..."
  }
}
```

### 1.6 Investigative Gameplay Elements

- **Query Button**: Players can ask clarifying questions (first 2 free, then 50 points each)
- **Hint System**: Progressive hints for ambiguous problems
- **Guided Discovery**: Interactive prompts that encourage planning before solving
- **Research Actions**: Partial credit for using investigation tools wisely

---

## 2. Implementation Architecture

### 2.1 New Files to Create

#### `js/score-timer-manager.js`

Core module managing timer and score logic.

```javascript
// Score-Timer Manager - Core game timer and scoring system
const ScoreTimerManager = {
    // Configuration
    STEP_DURATION: 60,          // seconds
    INITIAL_SCORE: 1000,        // points per step
    STEP_BONUS: 1000,           // bonus for completing step
    UPDATE_INTERVAL: 60,        // ms between updates

    // Color phases (time threshold, color, pulse speed)
    COLOR_PHASES: [
        { threshold: 50, color: '#00BFFF', pulseSpeed: 1500 },  // Blue
        { threshold: 30, color: '#00FF00', pulseSpeed: 1200 },  // Green
        { threshold: 10, color: '#FFD700', pulseSpeed: 800 },   // Yellow
        { threshold: 0,  color: '#FF4444', pulseSpeed: 400 }    // Red
    ],

    // State
    _timeRemaining: 60,
    _currentScore: 1000,
    _totalScore: 0,
    _levelScore: 0,
    _isRunning: false,
    _updateTimer: null,
    _timerElement: null,
    _scoreElement: null,

    // Methods
    init(),
    start(),
    pause(),
    resume(),
    reset(),
    completeStep(),
    failStep(),
    getScore(),
    getLevelScore(),
    _update(),
    _updateDisplay(),
    _getColorPhase(),
    _interpolateColor()
};
```

#### `js/player-storage.js`

LocalStorage management for player data.

```javascript
// Player Storage - Persistent player data management
const PlayerStorage = {
    STORAGE_KEYS: {
        PLAYERS: 'mathmaster_players',
        CURRENT_PLAYER: 'mathmaster_current_player',
        SESSION: 'mathmaster_session'
    },

    // Player management
    createPlayer(name),
    getPlayer(playerId),
    getCurrentPlayer(),
    setCurrentPlayer(playerId),
    updatePlayerScore(playerId, score, level),

    // Session management
    startSession(level),
    updateSession(data),
    endSession(),

    // Data export/import
    exportData(),
    importData(json),
    clearAllData()
};
```

#### `js/investigation-system.js`

Investigative gameplay mechanics.

```javascript
// Investigation System - Query and hint mechanics
const InvestigationSystem = {
    // Configuration
    FREE_QUERIES: 2,
    QUERY_COST: 50,             // points
    MAX_HINTS_PER_PROBLEM: 3,

    // State
    _queriesUsed: 0,
    _hintsUsed: 0,
    _currentProblemHints: [],

    // Methods
    init(),
    showQueryPanel(),
    submitQuery(question),
    getHint(),
    showPlanningPrompt(),
    _generateHint(problemContext),
    _calculateQueryCost(),
    _displayClarification(response)
};
```

#### `css/score-timer.css`

Dedicated styles for timer and score HUD.

### 2.2 Files to Modify

#### `js/constants.js`

Add new constant groups:

```javascript
// ========================================
// TIMER SYSTEM CONSTANTS
// ========================================
TIMER: {
    STEP_DURATION: 60,           // seconds
    UPDATE_INTERVAL: 60,         // ms
    WARNING_THRESHOLD: 10,       // seconds - red zone
    CRITICAL_THRESHOLD: 5,       // seconds - intense effects

    // Color phases
    PHASE_BLUE_END: 50,
    PHASE_GREEN_END: 30,
    PHASE_YELLOW_END: 10,

    // Pulse speeds (ms)
    PULSE_SLOW: 1500,
    PULSE_MEDIUM: 1200,
    PULSE_FAST: 800,
    PULSE_CRITICAL: 400
},

// ========================================
// SCORING SYSTEM CONSTANTS
// ========================================
SCORING: {
    INITIAL_SCORE: 1000,
    STEP_BONUS: 1000,
    DECREMENT_PER_SECOND: 16.67,
    QUERY_COST: 50,
    FREE_QUERIES: 2,

    // Star thresholds (percentage of max possible)
    STAR_3_THRESHOLD: 0.8,      // 80%+ = 3 stars
    STAR_2_THRESHOLD: 0.5,      // 50%+ = 2 stars
    STAR_1_THRESHOLD: 0.2       // 20%+ = 1 star
}
```

#### `game.html`

Add HUD elements:

```html
<!-- Score & Timer HUD -->
<div id="game-hud" class="game-hud">
  <div id="score-display" class="hud-element score-display">
    <span class="hud-label">SCORE</span>
    <span id="score-value" class="hud-value">1000</span>
  </div>
  <div id="timer-display" class="hud-element timer-display">
    <span class="hud-label">TIME</span>
    <span id="timer-value" class="hud-value">60</span>
  </div>
</div>

<!-- Investigation Panel -->
<div
  id="investigation-panel"
  class="investigation-panel"
  style="display: none;"
>
  <button id="query-btn" class="query-button">❓ Ask Question</button>
  <button id="hint-btn" class="hint-button">💡 Get Hint</button>
  <div id="query-response" class="query-response"></div>
</div>
```

#### `js/game.js`

Integrate with existing event system:

```javascript
// In handleCorrectAnswer()
ScoreTimerManager.registerCorrectAnswer();

// In checkLineCompletion() when line completes
ScoreTimerManager.completeStep();

// In checkProblemCompletion()
ScoreTimerManager.completeProblem();
PlayerStorage.updateSession({ levelScore: ScoreTimerManager.getLevelScore() });

// Add timer timeout handler
document.addEventListener("timerExpired", () => {
  ScoreTimerManager.failStep();
});
```

---

## 3. CSS Animation Specifications

### 3.1 Timer Pulsating Animation

```css
/* Timer color phases with pulsating effect */
.timer-display {
  font-family: "Orbitron", monospace;
  font-size: 2.5em;
  font-weight: 900;
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 15px 25px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid currentColor;
  transition:
    color 1s ease,
    border-color 1s ease,
    box-shadow 0.3s ease;
}

/* Phase: Blue (60-50s) */
.timer-phase-blue {
  color: #00bfff;
  animation: pulse-blue 1.5s ease-in-out infinite;
}

@keyframes pulse-blue {
  0%,
  100% {
    box-shadow:
      0 0 10px #00bfff,
      0 0 20px rgba(0, 191, 255, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 20px #00bfff,
      0 0 40px rgba(0, 191, 255, 0.8);
    transform: scale(1.02);
  }
}

/* Phase: Green (50-30s) */
.timer-phase-green {
  color: #00ff00;
  animation: pulse-green 1.2s ease-in-out infinite;
}

@keyframes pulse-green {
  0%,
  100% {
    box-shadow:
      0 0 10px #00ff00,
      0 0 20px rgba(0, 255, 0, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 25px #00ff00,
      0 0 50px rgba(0, 255, 0, 0.8);
    transform: scale(1.03);
  }
}

/* Phase: Yellow (30-10s) */
.timer-phase-yellow {
  color: #ffd700;
  animation: pulse-yellow 0.8s ease-in-out infinite;
}

@keyframes pulse-yellow {
  0%,
  100% {
    box-shadow:
      0 0 15px #ffd700,
      0 0 30px rgba(255, 215, 0, 0.5);
    transform: scale(1);
  }
  50% {
    box-shadow:
      0 0 30px #ffd700,
      0 0 60px rgba(255, 215, 0, 0.9);
    transform: scale(1.05);
  }
}

/* Phase: Red (10-0s) - CRITICAL */
.timer-phase-red {
  color: #ff4444;
  animation: pulse-red 0.4s ease-in-out infinite;
}

@keyframes pulse-red {
  0%,
  100% {
    box-shadow:
      0 0 20px #ff4444,
      0 0 40px rgba(255, 68, 68, 0.6);
    transform: scale(1);
    text-shadow: 0 0 10px #ff4444;
  }
  50% {
    box-shadow:
      0 0 40px #ff4444,
      0 0 80px rgba(255, 68, 68, 1);
    transform: scale(1.08);
    text-shadow:
      0 0 20px #ff0000,
      0 0 40px #ff4444;
  }
}
```

### 3.2 Score Counter Animation

```css
.score-display {
  font-family: "Orbitron", monospace;
  font-size: 2em;
  font-weight: 700;
  position: fixed;
  top: 20px;
  left: 20px;
  padding: 15px 25px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.8);
  border: 3px solid #00ff00;
  color: #00ff00;
}

/* Score increase animation */
.score-increase {
  animation: score-pop 0.5s ease-out;
}

@keyframes score-pop {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.3);
    color: #00ffff;
  }
  100% {
    transform: scale(1);
  }
}

/* Score locked animation */
.score-locked {
  animation: score-lock 0.8s ease-out;
}

@keyframes score-lock {
  0% {
    border-color: #00ff00;
  }
  50% {
    border-color: #ffd700;
    box-shadow: 0 0 30px #ffd700;
  }
  100% {
    border-color: #00ffff;
    box-shadow: 0 0 20px #00ffff;
  }
}
```

---

## 4. Event Integration Points

### 4.1 Events to Dispatch

| Event Name           | Trigger              | Payload                                |
| -------------------- | -------------------- | -------------------------------------- |
| `timerStarted`       | Timer begins         | `{ duration: 60 }`                     |
| `timerUpdated`       | Every 60ms           | `{ remaining: number, phase: string }` |
| `timerExpired`       | Timer hits 0         | `{ stepNumber: number }`               |
| `scoreUpdated`       | Score changes        | `{ current: number, total: number }`   |
| `scoreLocked`        | Step completed       | `{ score: number, bonus: number }`     |
| `playerSaved`        | Data persisted       | `{ playerId: string }`                 |
| `investigationQuery` | Player asks question | `{ question: string, cost: number }`   |

### 4.2 Events to Listen For

| Event Name             | Handler Action                     |
| ---------------------- | ---------------------------------- |
| `problemLineCompleted` | Lock score, add bonus, reset timer |
| `problemCompleted`     | Save level score, show summary     |
| `first-line-solved`    | Start timer if not already running |
| `helpButtonClicked`    | Pause timer during help modal      |

---

## 5. Implementation Order

### Phase 1: Core Timer & Score (Priority: HIGH)

1. ✅ Create `js/constants.js` additions (TIMER, SCORING blocks)
2. ✅ Create `js/score-timer-manager.js`
3. ✅ Create `css/score-timer.css`
4. ✅ Update `game.html` with HUD elements
5. ✅ Integrate with `game.js` events

### Phase 2: Player Storage (Priority: HIGH)

1. ✅ Create `js/player-storage.js`
2. ✅ Add player name entry modal
3. ✅ Implement leaderboard display
4. ✅ Add data export/import functionality

### Phase 3: Investigation System (Priority: MEDIUM)

1. ✅ Create `js/investigation-system.js`
2. ✅ Add investigation panel UI
3. ✅ Implement hint generation logic
4. ✅ Connect to scoring system

### Phase 4: Polish & Testing (Priority: HIGH)

1. ✅ Add sound effects for timer warnings
2. ✅ Test across all difficulty levels
3. ✅ Verify localStorage persistence
4. ✅ Performance optimization

---

## 6. Questions for Clarification

1. **Timer Pause Behavior**: Should timer pause when help modal is open or during worm attacks?
   - _Recommendation_: Pause only during modals, continue during worm activity for challenge.

2. **Score Persistence Scope**: Save per-problem, per-level, or cumulative across all sessions?
   - _Recommendation_: Per-level with all-time high score tracking.

3. **Investigation Query Source**: Should queries be AI-generated or pre-scripted per problem?
   - _Recommendation_: Pre-scripted hints with template-based responses for consistency.

4. **Multi-Player Support**: Should multiple player profiles be supported on same device?
   - _Recommendation_: Yes, allow up to 5 profiles with easy switching.

---

## 7. Testing Checklist

- [ ] Timer countdown displays correctly
- [ ] Color phases transition smoothly at thresholds
- [ ] Score decrements at correct rate
- [ ] Score locks properly on step completion
- [ ] Bonus points add correctly
- [ ] Timer expiration triggers failure state
- [ ] Player data saves to localStorage
- [ ] Player data loads on page refresh
- [ ] Investigation queries deduct correct points
- [ ] Hints display appropriate content
- [ ] Mobile responsive layout works
- [ ] No performance degradation with timer running

---

_Document Created: January 4, 2026_
_Math Master - Timer & Scoring System Implementation Plan_
