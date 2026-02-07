// src/scripts/utils-achievements.definitions.js - Achievement Definitions (Data Only)
// Extracted from utils-achievements.js to separate data from logic and UI
console.log("🏆 Achievement Definitions Loading...");

/**
 * Achievement definitions - pure data, no logic or UI
 * Each achievement has an id, name, description, icon, and requirement
 */
const ACHIEVEMENT_DEFINITIONS = {
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
  SURVIVOR: {
    id: "survivor",
    name: "Survivor",
    description: "Complete a problem with 3+ active worms",
    icon: "🛡️",
    requirement: { type: "survivorComplete", wormCount: 3 },
  },
  LEVEL_MASTER: {
    id: "level_master",
    name: "Level Master",
    description: "Complete all problems in a level",
    icon: "👑",
    requirement: { type: "levelComplete", count: 1 },
  },
};

// Export for use by AchievementSystem
window.ACHIEVEMENT_DEFINITIONS = ACHIEVEMENT_DEFINITIONS;

console.log("🏆 Achievement Definitions loaded");
