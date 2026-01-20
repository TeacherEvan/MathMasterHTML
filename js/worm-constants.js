// js/worm-constants.js - Centralized constants for worm system
console.log("📋 Worm Constants Loading...");

// ========================================
// WORM SYSTEM CONSTANTS
// ========================================

// DISTANCE THRESHOLDS
export const DISTANCE_STEAL_SYMBOL = 30; // px - how close to symbol to steal it
export const DISTANCE_CONSOLE_ARRIVAL = 20; // px - how close to console to escape
export const DISTANCE_TARGET_RUSH = 30; // px - when rushing to target symbol
export const DISTANCE_ROAM_RESUME = 5; // px - lost target, resume roaming

// EXPLOSION CONSTANTS
export const EXPLOSION_AOE_RADIUS = 18; // px - one worm height for chain reactions
export const EXPLOSION_PARTICLE_COUNT = 12; // number of particles per explosion

// MOVEMENT CONSTANTS
export const RUSH_SPEED_MULTIPLIER = 2.0; // 2x speed when rushing to target
export const FLICKER_SPEED_BOOST = 1.2; // 20% speed boost when carrying symbol
export const CRAWL_AMPLITUDE = 0.5; // inchworm effect amplitude
export const DIRECTION_CHANGE_RATE = 0.1; // random direction change per frame
export const CRAWL_PHASE_INCREMENT = 0.05; // crawl animation speed

// AGGRESSION & CURSOR AVOIDANCE CONSTANTS
export const AGGRESSION_MIN_DISTANCE = 40; // px
export const AGGRESSION_MAX_DISTANCE = 420; // px
export const AGGRESSION_MAX_SPEED_BOOST = 1.6; // +160%
export const PATHFINDING_DISTANCE = 600; // px
export const INTERCEPT_DISTANCE = 220; // px
export const PATH_RECALC_INTERVAL = 200; // ms
export const PATH_CELL_SIZE = 60; // px
export const CURSOR_THREAT_RADIUS = 140; // px
export const CURSOR_ESCAPE_RADIUS = 220; // px
export const CURSOR_ESCAPE_DURATION = 700; // ms
export const CURSOR_ESCAPE_MULTIPLIER = 2.2; // speed multiplier when escaping
export const WORM_CLICK_GRACE_WINDOW = 900; // ms for double-click kill

// SPAWN CONSTANTS
export const WORM_SPAWN_OFFSET_RANGE = 60; // px - max offset when cloning
export const CLONE_POSITION_OFFSET = 30; // px - purple worm clone offset

// TIMING CONSTANTS
export const ROAM_RESUME_DURATION = 5000; // ms - resume roaming after losing target
export const CLONE_BIRTH_ANIMATION = 500; // ms - clone birth effect duration
export const EXPLOSION_CHAIN_DELAY = 150; // ms - delay between chain explosions
export const PURPLE_CLONE_ROAM_TIME = 8000; // ms - purple clone roaming time

// CACHE CONSTANTS
export const CACHE_DURATION_TARGETS = 100; // ms - symbol cache refresh
export const CACHE_DURATION_RECT = 200; // ms - container rect cache refresh
export const CACHE_DURATION_OBSTACLES = 200; // ms - obstacle cache refresh

// VISUAL CONSTANTS
export const WORM_SEGMENT_COUNT = 5;
export const WORM_Z_INDEX = 10000;
export const BORDER_MARGIN = 20; // px

// POWER-UP CONSTANTS
export const POWER_UP_DROP_RATE = 0.3; // 30% chance
export const POWER_UP_TYPES = ["chainLightning", "spider", "devil"];
export const CHAIN_LIGHTNING_KILL_COUNT_BASE = 5;
export const SLIME_SPLAT_DURATION = 15000; // ms
export const SKULL_DISPLAY_DURATION = 10000; // ms
export const SPIDER_HEART_DURATION = 60000; // ms - 1 minute

// SPEED CONSTANTS
export const SPEED_CONSOLE_WORM = 1.5;
export const SPEED_FALLBACK_WORM = 1.0;
export const SPEED_BORDER_WORM = 2.0;
export const SPEED_PURPLE_WORM = 1.0;

// MAX WORMS
export const MAX_WORMS_DEFAULT = 20;

// SPAWN QUEUE
export const SPAWN_QUEUE_DELAY = 100; // ms

// PROBLEM COMPLETION
export const PROBLEM_COMPLETION_CLEANUP_DELAY = 1000; // ms

// REMOVAL DELAYS
export const WORM_REMOVAL_DELAY = 500; // ms

// NEAR MISS
export const NEAR_MISS_THRESHOLD = 80; // px

// DEVIL CONSTANTS
export const DEVIL_PROXIMITY_DISTANCE = 50; // px
export const DEVIL_KILL_TIME = 5000; // ms

// CLONE WORM ROAM
export const CLONE_WORM_ROAM_DURATION = 10000; // ms

if (typeof window !== "undefined") {
  window.WormConstants = {
    DISTANCE_STEAL_SYMBOL,
    DISTANCE_CONSOLE_ARRIVAL,
    DISTANCE_TARGET_RUSH,
    DISTANCE_ROAM_RESUME,
    EXPLOSION_AOE_RADIUS,
    EXPLOSION_PARTICLE_COUNT,
    RUSH_SPEED_MULTIPLIER,
    FLICKER_SPEED_BOOST,
    CRAWL_AMPLITUDE,
    DIRECTION_CHANGE_RATE,
    CRAWL_PHASE_INCREMENT,
    AGGRESSION_MIN_DISTANCE,
    AGGRESSION_MAX_DISTANCE,
    AGGRESSION_MAX_SPEED_BOOST,
    PATHFINDING_DISTANCE,
    INTERCEPT_DISTANCE,
    PATH_RECALC_INTERVAL,
    PATH_CELL_SIZE,
    CURSOR_THREAT_RADIUS,
    CURSOR_ESCAPE_RADIUS,
    CURSOR_ESCAPE_DURATION,
    CURSOR_ESCAPE_MULTIPLIER,
    WORM_CLICK_GRACE_WINDOW,
    WORM_SPAWN_OFFSET_RANGE,
    CLONE_POSITION_OFFSET,
    ROAM_RESUME_DURATION,
    CLONE_BIRTH_ANIMATION,
    EXPLOSION_CHAIN_DELAY,
    PURPLE_CLONE_ROAM_TIME,
    CACHE_DURATION_TARGETS,
    CACHE_DURATION_RECT,
    CACHE_DURATION_OBSTACLES,
    WORM_SEGMENT_COUNT,
    WORM_Z_INDEX,
    BORDER_MARGIN,
    POWER_UP_DROP_RATE,
    POWER_UP_TYPES,
    CHAIN_LIGHTNING_KILL_COUNT_BASE,
    SLIME_SPLAT_DURATION,
    SKULL_DISPLAY_DURATION,
    SPIDER_HEART_DURATION,
    SPEED_CONSOLE_WORM,
    SPEED_FALLBACK_WORM,
    SPEED_BORDER_WORM,
    SPEED_PURPLE_WORM,
    MAX_WORMS_DEFAULT,
    SPAWN_QUEUE_DELAY,
    PROBLEM_COMPLETION_CLEANUP_DELAY,
    WORM_REMOVAL_DELAY,
    NEAR_MISS_THRESHOLD,
    DEVIL_PROXIMITY_DISTANCE,
    DEVIL_KILL_TIME,
    CLONE_WORM_ROAM_DURATION,
  };
}