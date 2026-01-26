// utils-core.js - Core utility helpers

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
  window.generateUniqueId = generateUniqueId;
  window.getLevelFromURL = getLevelFromURL;
  window.deferExecution = deferExecution;
}
