// utils-logging.js - Logging utilities

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
