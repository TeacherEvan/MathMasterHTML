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
      STEP_DURATION: 60, // seconds
      UPDATE_INTERVAL: 100, // ms
      PHASE_BLUE_END: 50, // seconds remaining
      PHASE_GREEN_END: 30, // seconds remaining
      PHASE_YELLOW_END: 10, // seconds remaining
    },

    // ========================================
    // SCORING SYSTEM CONSTANTS
    // ========================================
    SCORING: {
      INITIAL_SCORE: 1000,
      STEP_BONUS: 1000,
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
