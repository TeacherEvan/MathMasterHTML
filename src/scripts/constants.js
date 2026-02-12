// js/constants.js - Global Constants and Configuration
console.log("⚙️ Constants Module Loading...");

/**
 * Global game constants and configuration values
 * Centralizes magic numbers for better maintainability
 */
const parts =
  typeof window !== "undefined" && window.__GameConstantsParts
    ? window.__GameConstantsParts
    : {};

const GameConstants = {
  ...(parts.gameplay || {}),
  ...(parts.system || {}),
  ...(parts.ui || {}),
};

// Freeze constants to prevent modification
Object.freeze(GameConstants);

Object.keys(GameConstants).forEach((key) => {
  const value = GameConstants[key];
  if (value && typeof value === "object") {
    Object.freeze(value);
  }
});

// Export for use in other modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = GameConstants;
} else {
  window.GameConstants = GameConstants;
}

console.log("✅ Constants Module Loaded");
console.log(
  "⚙️ Game configured with",
  Object.keys(GameConstants).length,
  "constant groups",
);
