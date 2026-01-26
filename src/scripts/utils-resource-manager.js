// utils-resource-manager.js - Resource cleanup utilities

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
