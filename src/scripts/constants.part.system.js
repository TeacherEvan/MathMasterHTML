// src/scripts/constants.part.system.js

(function() {
  window.__GameConstantsParts = window.__GameConstantsParts || {};

  window.__GameConstantsParts.system = {
    // ========================================
    // PERFORMANCE CONSTANTS
    // ========================================
    PERFORMANCE: {
      CACHE_DURATION_TARGETS: 100, // ms - symbol cache refresh
      CACHE_DURATION_RECT: 200, // ms - container rect cache refresh
      DOM_QUERY_LOG_THRESHOLD: 100, // queries/sec warning threshold
    },

    // ========================================
    // SYMBOL RAIN CONSTANTS
    // ========================================
    SYMBOL_RAIN: {
      GUARANTEED_SPAWN_INTERVAL: 5000, // ms - ensure symbol appears
      BASE_FALL_SPEED: 0.6,
      MAX_FALL_SPEED: 6.0,
      SPEED_INCREMENT_INTERVAL: 60000, // ms - 1 minute
      SPEED_INCREMENT_PERCENT: 0.1, // 10% increase

      // Collision safety
      COLLISION_CHECK_ENABLED: true,
      TYPICAL_ACTIVE_COUNT: 40, // Expected active symbols
    },

    // ========================================
    // TIMER SYSTEM CONSTANTS
    // ========================================
    TIMER: {
      // 10-minute game session
      STEP_DURATION: 600, // seconds
      UPDATE_INTERVAL: 100, // ms
      // Keep phase pacing proportional to the original 60s tune:
      // 50/60, 30/60, 10/60 -> 500, 300, 100 for 600s
      PHASE_BLUE_END: 500, // seconds remaining
      PHASE_GREEN_END: 300, // seconds remaining
      PHASE_YELLOW_END: 100, // seconds remaining
    },

    // ========================================
    // SCORING SYSTEM CONSTANTS
    // ========================================
    SCORING: {
      // Score counts down linearly and reaches 0 when the timer reaches 0.
      // 10,000 points over 10 minutes => 1,000 points/minute (same pacing as before).
      INITIAL_SCORE: 10000,
      STEP_BONUS: 10000,
      DECREMENT_PER_MINUTE: 1000,
    },

    // ========================================
    // ASSET PATHS
    // ========================================
    PATHS: {
      ASSETS_BASE: "/src/assets/problems/Assets",
      BEGINNER: "/src/assets/problems/Assets/Beginner_Lvl/beginner_problems.md",
      WARRIOR: "/src/assets/problems/Assets/Warrior_Lvl/warrior_problems.md",
      MASTER: "/src/assets/problems/Assets/Master_Lvl/master_problems.md",
      LOCK_COMPONENTS: "/src/assets/components/lock-components/",
    },
  };
})();
