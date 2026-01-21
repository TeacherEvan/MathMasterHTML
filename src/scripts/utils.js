// js/utils.js - Shared utility functions across the Math Master game

/**
 * Normalize symbol for comparison (X/x treated as same)
 * @param {string} symbol - The symbol to normalize
 * @returns {string} Normalized symbol
 */
function normalizeSymbol(symbol) {
  if (typeof symbol !== "string") return symbol;
  return symbol.toLowerCase() === "x" ? "X" : symbol;
}

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance between points
 */
function calculateDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create a DOM element with specified properties
 * @param {string} tag - HTML tag name
 * @param {string|string[]} className - CSS class name(s)
 * @param {Object} styles - CSS styles to apply
 * @returns {HTMLElement} Created element
 */
function createDOMElement(tag, className, styles = {}) {
  const element = document.createElement(tag);

  if (className) {
    if (Array.isArray(className)) {
      element.className = className.join(" ");
    } else {
      element.className = className;
    }
  }

  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });

  return element;
}

/**
 * Generate unique ID with prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateUniqueId(prefix = "item") {
  return `${prefix}-${Date.now()}-${Math.random()}`;
}

/**
 * Get current level from URL parameters
 * @returns {string} Level name ('beginner', 'warrior', or 'master')
 */
function getLevelFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("level") || "beginner";
}

/**
 * Deferred execution utility - uses requestIdleCallback if available, else setTimeout
 * Useful for deferring heavy operations to prevent blocking animations
 * @param {Function} callback - Function to execute
 */
function deferExecution(callback) {
  if (window.requestIdleCallback) {
    window.requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}

// Expose utility functions globally for use across modules
if (typeof window !== "undefined") {
  window.normalizeSymbol = normalizeSymbol;
  window.calculateDistance = calculateDistance;
  window.createDOMElement = createDOMElement;
  window.generateUniqueId = generateUniqueId;
  window.getLevelFromURL = getLevelFromURL;
  window.deferExecution = deferExecution;
}

/**
 * Production-Ready Logging System
 * Allows conditional logging based on environment
 * Use ?debug=true in URL to enable verbose logging
 */
const Logger = {
  // Check if debug mode is enabled
  _isDebugMode: () => {
    const urlParams = new URLSearchParams(window.location.search);
    return (
      urlParams.get("debug") === "true" ||
      localStorage.getItem("mathmaster_debug") === "true"
    );
  },

  // Log levels
  LEVELS: {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
  },

  // Current log level (can be changed)
  currentLevel: 1, // INFO by default

  /**
   * Debug level logging (most verbose)
   * @param {string} emoji - Emoji prefix for module identification
   * @param  {...any} args - Log arguments
   */
  debug(emoji, ...args) {
    if (this._isDebugMode() && this.currentLevel <= this.LEVELS.DEBUG) {
      console.log(emoji, ...args);
    }
  },

  /**
   * Info level logging (important events)
   * @param {string} emoji - Emoji prefix for module identification
   * @param  {...any} args - Log arguments
   */
  info(emoji, ...args) {
    if (this._isDebugMode() && this.currentLevel <= this.LEVELS.INFO) {
      console.log(emoji, ...args);
    }
  },

  /**
   * Warning level logging (always shown)
   * @param {string} emoji - Emoji prefix for module identification
   * @param  {...any} args - Log arguments
   */
  warn(emoji, ...args) {
    if (this.currentLevel <= this.LEVELS.WARN) {
      console.warn(emoji, ...args);
    }
  },

  /**
   * Error level logging (always shown)
   * @param {string} emoji - Emoji prefix for module identification
   * @param  {...any} args - Log arguments
   */
  error(emoji, ...args) {
    if (this.currentLevel <= this.LEVELS.ERROR) {
      console.error(emoji, ...args);
    }
  },

  /**
   * Group logging (collapsible console groups)
   * @param {string} label - Group label
   * @param {Function} fn - Function to execute within group
   */
  group(label, fn) {
    if (this._isDebugMode()) {
      console.group(label);
      fn();
      console.groupEnd();
    }
  },

  /**
   * Enable debug mode programmatically
   */
  enableDebug() {
    localStorage.setItem("mathmaster_debug", "true");
    console.log("🔧 Debug mode enabled. Refresh page to see verbose logs.");
  },

  /**
   * Disable debug mode programmatically
   */
  disableDebug() {
    localStorage.removeItem("mathmaster_debug");
    console.log("🔇 Debug mode disabled. Verbose logs will be hidden.");
  },
};

// Make Logger available globally
if (typeof window !== "undefined") {
  window.Logger = Logger;
}

/**
 * Resource Cleanup Manager
 * Helps prevent memory leaks by tracking and cleaning up timers and event listeners
 */
const ResourceManager = {
  // Track active timers
  _timers: new Set(),

  // Track active intervals
  _intervals: new Set(),

  /**
   * Create a tracked timeout that will be automatically cleaned up
   * @param {Function} callback - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timer ID
   */
  setTimeout(callback, delay) {
    const timerId = setTimeout(() => {
      this._timers.delete(timerId);
      callback();
    }, delay);
    this._timers.add(timerId);
    return timerId;
  },

  /**
   * Create a tracked interval that will be automatically cleaned up
   * @param {Function} callback - Function to execute
   * @param {number} delay - Delay in milliseconds
   * @returns {number} Timer ID
   */
  setInterval(callback, delay) {
    const intervalId = setInterval(callback, delay);
    this._intervals.add(intervalId);
    return intervalId;
  },

  /**
   * Clear a tracked timeout
   * @param {number} timerId - Timer ID to clear
   */
  clearTimeout(timerId) {
    clearTimeout(timerId);
    this._timers.delete(timerId);
  },

  /**
   * Clear a tracked interval
   * @param {number} intervalId - Interval ID to clear
   */
  clearInterval(intervalId) {
    clearInterval(intervalId);
    this._intervals.delete(intervalId);
  },

  /**
   * Clean up all tracked timers and intervals
   * Call this when navigating away or resetting the game
   */
  cleanupAll() {
    // Clear all timeouts
    this._timers.forEach((timerId) => {
      clearTimeout(timerId);
    });
    this._timers.clear();

    // Clear all intervals
    this._intervals.forEach((intervalId) => {
      clearInterval(intervalId);
    });
    this._intervals.clear();

    console.log("🧹 ResourceManager: All timers and intervals cleaned up");
  },

  /**
   * Get current resource usage stats
   * @returns {Object} Stats object
   */
  getStats() {
    return {
      activeTimeouts: this._timers.size,
      activeIntervals: this._intervals.size,
      totalActive: this._timers.size + this._intervals.size,
    };
  },
};

// Make ResourceManager available globally
if (typeof window !== "undefined") {
  window.ResourceManager = ResourceManager;

  // Clean up resources when page is about to unload
  window.addEventListener("beforeunload", () => {
    ResourceManager.cleanupAll();
  });
}

/**
 * Combo System - Tracks consecutive correct answers for excitement escalation
 * Provides visual feedback multipliers and streak bonuses
 */
const ComboSystem = {
  // Current combo count
  _combo: 0,

  // Maximum combo achieved this session
  _maxCombo: 0,

  // Time window for combo maintenance (ms)
  COMBO_WINDOW: 5000,

  // Last successful hit timestamp
  _lastHitTime: 0,

  // Combo timeout timer
  _comboTimer: null,

  // Combo thresholds for visual feedback
  THRESHOLDS: {
    GOOD: 3, // "Good!" feedback
    GREAT: 5, // "Great!" + screen pulse
    AMAZING: 8, // "Amazing!" + intense effects
    LEGENDARY: 12, // "LEGENDARY!" + maximum excitement
  },

  // Combo display element
  _displayElement: null,

  /**
   * Register a successful hit, incrementing combo
   * @returns {Object} Combo state with multiplier and feedback
   */
  hit() {
    const now = Date.now();

    // Clear existing timer
    if (this._comboTimer) {
      clearTimeout(this._comboTimer);
    }

    // Increment combo
    this._combo++;
    this._lastHitTime = now;

    // Track max combo
    if (this._combo > this._maxCombo) {
      this._maxCombo = this._combo;
    }

    // Set decay timer
    this._comboTimer = setTimeout(() => {
      this._decayCombo();
    }, this.COMBO_WINDOW);

    // Calculate feedback
    const feedback = this._getFeedback();

    // Update display
    this._updateDisplay();

    // Dispatch combo event
    document.dispatchEvent(
      new CustomEvent("comboUpdated", {
        detail: {
          combo: this._combo,
          multiplier: feedback.multiplier,
          level: feedback.level,
          message: feedback.message,
        },
      })
    );

    return feedback;
  },

  /**
   * Break the combo (wrong answer or timeout)
   */
  break() {
    if (this._combo > 0) {
      console.log(`💔 Combo broken at ${this._combo}!`);

      // Dispatch combo break event
      document.dispatchEvent(
        new CustomEvent("comboBroken", {
          detail: { finalCombo: this._combo },
        })
      );
    }

    this._combo = 0;

    if (this._comboTimer) {
      clearTimeout(this._comboTimer);
      this._comboTimer = null;
    }

    this._updateDisplay();
  },

  /**
   * Decay combo on timeout
   * @private
   */
  _decayCombo() {
    if (this._combo > 0) {
      console.log(`⏰ Combo decayed from ${this._combo}`);
      this._combo = Math.max(0, this._combo - 1);
      this._updateDisplay();

      // Continue decay if combo remains
      if (this._combo > 0) {
        this._comboTimer = setTimeout(() => {
          this._decayCombo();
        }, this.COMBO_WINDOW);
      }
    }
  },

  /**
   * Get feedback based on current combo
   * @private
   * @returns {Object} Feedback object with multiplier, level, message
   */
  _getFeedback() {
    const combo = this._combo;

    if (combo >= this.THRESHOLDS.LEGENDARY) {
      return {
        multiplier: 2.0,
        level: "legendary",
        message: "🔥 LEGENDARY! 🔥",
        color: "#ff00ff",
        screenEffect: "legendary-pulse",
      };
    } else if (combo >= this.THRESHOLDS.AMAZING) {
      return {
        multiplier: 1.75,
        level: "amazing",
        message: "⚡ AMAZING! ⚡",
        color: "#ffff00",
        screenEffect: "amazing-pulse",
      };
    } else if (combo >= this.THRESHOLDS.GREAT) {
      return {
        multiplier: 1.5,
        level: "great",
        message: "✨ GREAT! ✨",
        color: "#00ffff",
        screenEffect: "great-pulse",
      };
    } else if (combo >= this.THRESHOLDS.GOOD) {
      return {
        multiplier: 1.25,
        level: "good",
        message: "👍 Good!",
        color: "#00ff00",
        screenEffect: null,
      };
    }

    return {
      multiplier: 1.0,
      level: "normal",
      message: null,
      color: "#00ff00",
      screenEffect: null,
    };
  },

  /**
   * Update combo display
   * @private
   */
  _updateDisplay() {
    // Create display if doesn't exist
    if (!this._displayElement) {
      this._createDisplay();
    }

    if (this._combo > 0) {
      const feedback = this._getFeedback();
      this._displayElement.innerHTML = `
                <div class="combo-count" style="color: ${feedback.color}">${this._combo}x</div>
                ${feedback.message ? `<div class="combo-message">${feedback.message}</div>` : ""}
            `;
      this._displayElement.style.display = "block";
      this._displayElement.style.transform = "scale(1.2)";
      setTimeout(() => {
        if (this._displayElement) {
          this._displayElement.style.transform = "scale(1)";
        }
      }, 100);
    } else {
      this._displayElement.style.display = "none";
    }
  },

  /**
   * Create combo display element
   * @private
   */
  _createDisplay() {
    const display = document.createElement("div");
    display.id = "combo-display";
    display.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Orbitron', monospace;
            font-size: 2em;
            font-weight: bold;
            text-align: center;
            z-index: 10002;
            pointer-events: none;
            transition: transform 0.1s ease-out;
            text-shadow: 0 0 20px currentColor;
            display: none;
        `;
    document.body.appendChild(display);
    this._displayElement = display;
  },

  /**
   * Get current combo count
   * @returns {number} Current combo
   */
  getCombo() {
    return this._combo;
  },

  /**
   * Get maximum combo achieved
   * @returns {number} Max combo
   */
  getMaxCombo() {
    return this._maxCombo;
  },

  /**
   * Reset combo system (new game)
   */
  reset() {
    this._combo = 0;
    this._maxCombo = 0;
    if (this._comboTimer) {
      clearTimeout(this._comboTimer);
      this._comboTimer = null;
    }
    this._updateDisplay();
  },
};

// Make ComboSystem available globally
if (typeof window !== "undefined") {
  window.ComboSystem = ComboSystem;
}

/**
 * Achievement System - Track player milestones and provide rewards
 */
const AchievementSystem = {
  // Achievement definitions
  ACHIEVEMENTS: {
    FIRST_BLOOD: {
      id: "first_blood",
      name: "First Blood",
      description: "Complete your first problem",
      icon: "🎯",
      requirement: { type: "problems", count: 1 },
    },
    COMBO_STARTER: {
      id: "combo_starter",
      name: "Combo Starter",
      description: "Achieve a 3x combo",
      icon: "🔗",
      requirement: { type: "combo", count: 3 },
    },
    COMBO_MASTER: {
      id: "combo_master",
      name: "Combo Master",
      description: "Achieve a 10x combo",
      icon: "⚡",
      requirement: { type: "combo", count: 10 },
    },
    WORM_SLAYER: {
      id: "worm_slayer",
      name: "Worm Slayer",
      description: "Destroy 10 worms",
      icon: "💀",
      requirement: { type: "wormsKilled", count: 10 },
    },
    SPEEDSTER: {
      id: "speedster",
      name: "Speedster",
      description: "Complete a problem in under 30 seconds",
      icon: "🏃",
      requirement: { type: "fastComplete", time: 30000 },
    },
    PERFECT_LINE: {
      id: "perfect_line",
      name: "Perfect Line",
      description: "Complete a line without any wrong clicks",
      icon: "✨",
      requirement: { type: "perfectLine", count: 1 },
    },
    LEVEL_MASTER: {
      id: "level_master",
      name: "Level Master",
      description: "Complete all problems in a level",
      icon: "👑",
      requirement: { type: "levelComplete", count: 1 },
    },
  },

  // Unlocked achievements (loaded from localStorage)
  _unlocked: new Set(),

  // Stats tracking
  _stats: {
    problemsCompleted: 0,
    maxCombo: 0,
    wormsKilled: 0,
    perfectLines: 0,
    wrongClicks: 0,
  },

  /**
   * Initialize achievement system
   */
  init() {
    this._loadProgress();
    this._setupEventListeners();
    console.log("🏆 Achievement System initialized");
  },

  /**
   * Load progress from localStorage
   * @private
   */
  _loadProgress() {
    const saved = localStorage.getItem("mathmaster_achievements");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this._unlocked = new Set(data.unlocked || []);
        this._stats = { ...this._stats, ...data.stats };
      } catch (e) {
        console.error("Failed to load achievements:", e);
      }
    }
  },

  /**
   * Save progress to localStorage
   * @private
   */
  _saveProgress() {
    const data = {
      unlocked: Array.from(this._unlocked),
      stats: this._stats,
    };
    localStorage.setItem("mathmaster_achievements", JSON.stringify(data));
  },

  /**
   * Setup event listeners for achievement tracking
   * @private
   */
  _setupEventListeners() {
    // Track problem completion
    document.addEventListener("problemCompleted", () => {
      this._stats.problemsCompleted++;
      this._checkAchievement("FIRST_BLOOD");
      this._saveProgress();
    });

    // Track combo updates
    document.addEventListener("comboUpdated", (e) => {
      if (e.detail.combo > this._stats.maxCombo) {
        this._stats.maxCombo = e.detail.combo;
        this._checkAchievement("COMBO_STARTER");
        this._checkAchievement("COMBO_MASTER");
        this._saveProgress();
      }
    });

    // Track worm kills (listen for worm explosion events)
    document.addEventListener("wormExploded", () => {
      this._stats.wormsKilled++;
      this._checkAchievement("WORM_SLAYER");
      this._saveProgress();
    });
  },

  /**
   * Check and unlock achievement if requirements met
   * @private
   * @param {string} achievementKey - Key from ACHIEVEMENTS
   */
  _checkAchievement(achievementKey) {
    const achievement = this.ACHIEVEMENTS[achievementKey];
    if (!achievement || this._unlocked.has(achievement.id)) {
      return;
    }

    const req = achievement.requirement;
    let unlocked = false;

    switch (req.type) {
      case "problems":
        unlocked = this._stats.problemsCompleted >= req.count;
        break;
      case "combo":
        unlocked = this._stats.maxCombo >= req.count;
        break;
      case "wormsKilled":
        unlocked = this._stats.wormsKilled >= req.count;
        break;
    }

    if (unlocked) {
      this._unlock(achievement);
    }
  },

  /**
   * Unlock an achievement
   * @private
   * @param {Object} achievement - Achievement object
   */
  _unlock(achievement) {
    if (this._unlocked.has(achievement.id)) return;

    this._unlocked.add(achievement.id);
    this._saveProgress();

    console.log(`🏆 Achievement Unlocked: ${achievement.name}`);

    // Show achievement popup
    this._showAchievementPopup(achievement);

    // Dispatch event
    document.dispatchEvent(
      new CustomEvent("achievementUnlocked", {
        detail: achievement,
      })
    );
  },

  /**
   * Show achievement unlock popup
   * @private
   * @param {Object} achievement - Achievement object
   */
  _showAchievementPopup(achievement) {
    const popup = document.createElement("div");
    popup.className = "achievement-popup";
    popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
    popup.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(30,30,30,0.95));
            border: 2px solid gold;
            border-radius: 12px;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            font-family: 'Orbitron', monospace;
            z-index: 10003;
            animation: achievement-slide-in 0.5s ease-out, achievement-slide-out 0.5s ease-in 3.5s forwards;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;

    // Add achievement icon styling
    const iconStyle = popup.querySelector(".achievement-icon");
    iconStyle.style.cssText = "font-size: 2.5em;";

    const titleStyle = popup.querySelector(".achievement-title");
    titleStyle.style.cssText =
      "color: gold; font-size: 0.8em; text-transform: uppercase;";

    const nameStyle = popup.querySelector(".achievement-name");
    nameStyle.style.cssText =
      "color: #fff; font-size: 1.1em; font-weight: bold;";

    const descStyle = popup.querySelector(".achievement-desc");
    descStyle.style.cssText = "color: #aaa; font-size: 0.75em;";

    document.body.appendChild(popup);

    // Remove after animation
    setTimeout(() => popup.remove(), 4000);
  },

  /**
   * Get all achievements with unlock status
   * @returns {Object[]} Array of achievement objects with unlocked property
   */
  getAll() {
    return Object.values(this.ACHIEVEMENTS).map((a) => ({
      ...a,
      unlocked: this._unlocked.has(a.id),
    }));
  },

  /**
   * Get player stats
   * @returns {Object} Stats object
   */
  getStats() {
    return { ...this._stats };
  },
};

// Make AchievementSystem available globally
if (typeof window !== "undefined") {
  window.AchievementSystem = AchievementSystem;

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      AchievementSystem.init()
    );
  } else {
    AchievementSystem.init();
  }
}

console.log(
  "✅ Utils module fully loaded with ComboSystem and AchievementSystem"
);
