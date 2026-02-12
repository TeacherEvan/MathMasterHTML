// src/scripts/constants.part.gameplay.js

(function() {
  window.__GameConstantsParts = window.__GameConstantsParts || {};

  window.__GameConstantsParts.gameplay = {
    // ========================================
    // DIFFICULTY SETTINGS
    // ========================================
    DIFFICULTY: {
      BEGINNER: {
        wormsPerRow: 3,
        speedMultiplier: 1.0,
        roamTimeConsole: 8000, // ms
        roamTimeBorder: 5000, // ms
        label: "Beginner",
      },
      WARRIOR: {
        wormsPerRow: 5,
        speedMultiplier: 1.5,
        roamTimeConsole: 6000, // ms
        roamTimeBorder: 4000, // ms
        label: "Warrior",
      },
      MASTER: {
        wormsPerRow: 8,
        speedMultiplier: 2.0,
        roamTimeConsole: 4000, // ms
        roamTimeBorder: 3000, // ms
        label: "Master",
      },
    },

    // ========================================
    // WORM SYSTEM CONSTANTS
    // ========================================
    WORM: {
      // Appearance
      SEGMENT_COUNT: 5,
      Z_INDEX: 10000,

      // Limits
      MAX_WORMS: 999, // Reasonable limit to prevent crash from infinite cloning

      // Speeds (multiplied by difficulty)
      SPEED_CONSOLE: 2.0,
      SPEED_FALLBACK: 1.0,
      SPEED_BORDER: 2.5,
      SPEED_PURPLE: 1.0, // Not scaled by difficulty

      // Roaming durations
      ROAM_DURATION_CONSOLE: 3000, // ms
      ROAM_DURATION_BORDER: 5000, // ms
      ROAM_RESUME_DURATION: 5000, // ms

      // Movement
      RUSH_SPEED_MULTIPLIER: 2.0,
      FLICKER_SPEED_BOOST: 1.2,
      CRAWL_AMPLITUDE: 0.5,
      DIRECTION_CHANGE_RATE: 0.1,
      CRAWL_PHASE_INCREMENT: 0.05,
      BORDER_MARGIN: 20, // px from viewport edge

      // Distance thresholds
      DISTANCE_STEAL_SYMBOL: 30, // px
      DISTANCE_CONSOLE_ARRIVAL: 20, // px
      DISTANCE_TARGET_RUSH: 30, // px
      DISTANCE_ROAM_RESUME: 5, // px

      // Timing
      SPAWN_QUEUE_DELAY: 50, // ms
      EXPLOSION_CLEANUP_DELAY: 600, // ms
      WORM_REMOVAL_DELAY: 500, // ms
      PROBLEM_COMPLETION_CLEANUP_DELAY: 2000, // ms
      CLONE_BIRTH_ANIMATION: 500, // ms
      EXPLOSION_CHAIN_DELAY: 150, // ms
      CLONE_WORM_ROAM_DURATION: 10000, // ms
      PURPLE_CLONE_ROAM_TIME: 8000, // ms

      // Spawn offsets
      WORM_SPAWN_OFFSET_RANGE: 60, // px
      CLONE_POSITION_OFFSET: 30, // px

      // Explosion
      EXPLOSION_AOE_RADIUS: 18, // px
      EXPLOSION_PARTICLE_COUNT: 120,
    },

    // ========================================
    // POWER-UP CONSTANTS
    // ========================================
    POWERUP: {
      DROP_RATE: 0.1, // 10% chance
      TYPES: ["chainLightning", "spider", "devil"],
      EMOJIS: {
        chainLightning: "⚡",
        spider: "🕷️",
        devil: "👹",
      },

      // Durations
      SLIME_SPLAT_DURATION: 10000, // ms - 10 seconds
      SPIDER_HEART_DURATION: 60000, // ms - 1 minute
      SKULL_DISPLAY_DURATION: 10000, // ms - 10 seconds

      // Chain lightning
      CHAIN_LIGHTNING_INITIAL_KILLS: 5,
      CHAIN_LIGHTNING_INCREMENT: 2,

      // Devil
      DEVIL_PROXIMITY_DISTANCE: 50, // px
      DEVIL_KILL_TIME: 5000, // ms
    },

    // ========================================
    // PURPLE WORM CONSTANTS
    // ========================================
    PURPLE_WORM: {
      TRIGGER_THRESHOLD: 3, // Wrong answers needed to trigger
      SPEED_MULTIPLIER: 1.0, // Slower than normal worms
    },
  };
})();
