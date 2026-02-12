// src/scripts/constants.part.ui.js

(function() {
  window.__GameConstantsParts = window.__GameConstantsParts || {};

  window.__GameConstantsParts.ui = {
    // ========================================
    // LOCK SYSTEM CONSTANTS
    // ========================================
    LOCK: {
      TOTAL_LEVELS: 6,
      COMPONENT_BASE_PATH: "/src/assets/components/lock-components/",
      ANIMATION_DELAY: 300, // ms - for line 3 special case
    },

    // ========================================
    // CONSOLE MANAGER CONSTANTS
    // ========================================
    CONSOLE: {
      SLOT_COUNT: 9,
      GRID_SIZE: 3, // 3x3 grid
      CLICK_ANIMATION_DURATION: 600, // ms
      TOUCH_RESPONSE_DELAY: 0, // Use pointerdown for instant response
    },

    // ========================================
    // GAME STATES
    // ========================================
    GAME_STATE: {
      MENU: "menu",
      PLAYING: "playing",
      PAUSED: "paused",
      GAME_OVER: "gameOver",
      COMPLETED: "completed",
    },

    // ========================================
    // DISPLAY RESOLUTION THRESHOLDS
    // ========================================
    RESOLUTION: {
      MOBILE_MAX_WIDTH: 768,
      MOBILE_MAX_HEIGHT: 1024,
      TABLET_MAX_WIDTH: 1024,
      DESKTOP_MIN_WIDTH: 1025,
    },

    // ========================================
    // ANIMATION TIMING
    // ========================================
    ANIMATION: {
      FADE_DURATION: 300, // ms
      SLIDE_DURATION: 500, // ms
      PULSE_DURATION: 600, // ms
      EXPLOSION_DURATION: 600, // ms
    },

    // ========================================
    // COLOR SCHEME
    // ========================================
    COLORS: {
      PRIMARY: "#00ff00", // Matrix green
      SECONDARY: "#0f0", // Light green
      BACKGROUND: "#000", // Black
      TEXT: "#0f0", // Green text
      ERROR: "#ff0000", // Red
      WARNING: "#ffff00", // Yellow
      HIDDEN_SYMBOL: "#ff0000", // Red (before reveal)
      REVEALED_SYMBOL: "#00ffff", // Cyan (after reveal)
    },
  };
})();
