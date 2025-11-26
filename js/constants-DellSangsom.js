// js/constants.js - Global Constants and Configuration
console.log("⚙️ Constants Module Loading...");

/**
 * Global game constants and configuration values
 * Centralizes magic numbers for better maintainability
 */
const GameConstants = {
    // ========================================
    // DIFFICULTY SETTINGS
    // ========================================
    DIFFICULTY: {
        BEGINNER: {
            wormsPerRow: 3,
            speedMultiplier: 1.0,
            roamTimeConsole: 8000, // ms
            roamTimeBorder: 5000,  // ms
            label: 'Beginner'
        },
        WARRIOR: {
            wormsPerRow: 5,
            speedMultiplier: 1.5,
            roamTimeConsole: 6000, // ms
            roamTimeBorder: 4000,  // ms
            label: 'Warrior'
        },
        MASTER: {
            wormsPerRow: 8,
            speedMultiplier: 2.0,
            roamTimeConsole: 4000, // ms
            roamTimeBorder: 3000,  // ms
            label: 'Master'
        }
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
        ROAM_DURATION_BORDER: 5000,  // ms
        ROAM_RESUME_DURATION: 5000,  // ms

        // Movement
        RUSH_SPEED_MULTIPLIER: 2.0,
        FLICKER_SPEED_BOOST: 1.2,
        CRAWL_AMPLITUDE: 0.5,
        DIRECTION_CHANGE_RATE: 0.1,
        CRAWL_PHASE_INCREMENT: 0.05,
        BORDER_MARGIN: 20, // px from viewport edge

        // Distance thresholds
        DISTANCE_STEAL_SYMBOL: 30,      // px
        DISTANCE_CONSOLE_ARRIVAL: 20,   // px
        DISTANCE_TARGET_RUSH: 30,       // px
        DISTANCE_ROAM_RESUME: 5,        // px

        // Timing
        SPAWN_QUEUE_DELAY: 50,                      // ms
        EXPLOSION_CLEANUP_DELAY: 600,               // ms
        WORM_REMOVAL_DELAY: 500,                    // ms
        PROBLEM_COMPLETION_CLEANUP_DELAY: 2000,    // ms
        CLONE_BIRTH_ANIMATION: 500,                 // ms
        EXPLOSION_CHAIN_DELAY: 150,                 // ms
        CLONE_WORM_ROAM_DURATION: 10000,            // ms
        PURPLE_CLONE_ROAM_TIME: 8000,               // ms

        // Spawn offsets
        WORM_SPAWN_OFFSET_RANGE: 60,  // px
        CLONE_POSITION_OFFSET: 30,    // px

        // Explosion
        EXPLOSION_AOE_RADIUS: 18,      // px
        EXPLOSION_PARTICLE_COUNT: 120
    },

    // ========================================
    // POWER-UP CONSTANTS
    // ========================================
    POWERUP: {
        DROP_RATE: 0.10, // 10% chance
        TYPES: ['chainLightning', 'spider', 'devil'],
        EMOJIS: {
            chainLightning: '⚡',
            spider: '🕷️',
            devil: '👹'
        },

        // Durations
        SLIME_SPLAT_DURATION: 10000,   // ms - 10 seconds
        SPIDER_HEART_DURATION: 60000,   // ms - 1 minute
        SKULL_DISPLAY_DURATION: 10000,  // ms - 10 seconds

        // Chain lightning
        CHAIN_LIGHTNING_INITIAL_KILLS: 5,
        CHAIN_LIGHTNING_INCREMENT: 2,

        // Devil
        DEVIL_PROXIMITY_DISTANCE: 50,  // px
        DEVIL_KILL_TIME: 5000           // ms
    },

    // ========================================
    // PURPLE WORM CONSTANTS
    // ========================================
    PURPLE_WORM: {
        TRIGGER_THRESHOLD: 3, // Wrong answers needed to trigger
        SPEED_MULTIPLIER: 1.0 // Slower than normal worms
    },

    // ========================================
    // PERFORMANCE CONSTANTS
    // ========================================
    PERFORMANCE: {
        CACHE_DURATION_TARGETS: 100,  // ms - symbol cache refresh
        CACHE_DURATION_RECT: 200,     // ms - container rect cache refresh
        DOM_QUERY_LOG_THRESHOLD: 100  // queries/sec warning threshold
    },

    // ========================================
    // SYMBOL RAIN CONSTANTS
    // ========================================
    SYMBOL_RAIN: {
        GUARANTEED_SPAWN_INTERVAL: 5000, // ms - ensure symbol appears
        BASE_FALL_SPEED: 0.6,
        MAX_FALL_SPEED: 6.0,
        SPEED_INCREMENT_INTERVAL: 60000, // ms - 1 minute
        SPEED_INCREMENT_PERCENT: 0.1,    // 10% increase

        // Collision safety
        COLLISION_CHECK_ENABLED: true,
        TYPICAL_ACTIVE_COUNT: 40 // Expected active symbols
    },

    // ========================================
    // LOCK SYSTEM CONSTANTS
    // ========================================
    LOCK: {
        TOTAL_LEVELS: 6,
        COMPONENT_BASE_PATH: 'lock-components/',
        ANIMATION_DELAY: 300 // ms - for line 3 special case
    },

    // ========================================
    // CONSOLE MANAGER CONSTANTS
    // ========================================
    CONSOLE: {
        SLOT_COUNT: 9,
        GRID_SIZE: 3, // 3x3 grid
        CLICK_ANIMATION_DURATION: 600, // ms
        TOUCH_RESPONSE_DELAY: 0 // Use pointerdown for instant response
    },

    // ========================================
    // GAME STATES
    // ========================================
    GAME_STATE: {
        MENU: 'menu',
        PLAYING: 'playing',
        PAUSED: 'paused',
        GAME_OVER: 'gameOver',
        COMPLETED: 'completed'
    },

    // ========================================
    // ASSET PATHS
    // ========================================
    PATHS: {
        ASSETS_BASE: 'Assets',
        BEGINNER: 'Assets/Beginner_Lvl/beginner_problems.md',
        WARRIOR: 'Assets/Warrior_Lvl/warrior_problems.md',
        MASTER: 'Assets/Master_Lvl/master_problems.md',
        LOCK_COMPONENTS: 'lock-components/'
    },

    // ========================================
    // DISPLAY RESOLUTION THRESHOLDS
    // ========================================
    RESOLUTION: {
        MOBILE_MAX_WIDTH: 768,
        MOBILE_MAX_HEIGHT: 1024,
        TABLET_MAX_WIDTH: 1024,
        DESKTOP_MIN_WIDTH: 1025
    },

    // ========================================
    // ANIMATION TIMING
    // ========================================
    ANIMATION: {
        FADE_DURATION: 300,      // ms
        SLIDE_DURATION: 500,     // ms
        PULSE_DURATION: 600,     // ms
        EXPLOSION_DURATION: 600  // ms
    },

    // ========================================
    // COLOR SCHEME
    // ========================================
    COLORS: {
        PRIMARY: '#00ff00',      // Matrix green
        SECONDARY: '#0f0',       // Light green
        BACKGROUND: '#000',      // Black
        TEXT: '#0f0',            // Green text
        ERROR: '#ff0000',        // Red
        WARNING: '#ffff00',      // Yellow
        HIDDEN_SYMBOL: '#ff0000', // Red (before reveal)
        REVEALED_SYMBOL: '#00ffff' // Cyan (after reveal)
    }
};

// Freeze constants to prevent modification
Object.freeze(GameConstants);
Object.freeze(GameConstants.DIFFICULTY);
Object.freeze(GameConstants.WORM);
Object.freeze(GameConstants.POWERUP);
Object.freeze(GameConstants.PURPLE_WORM);
Object.freeze(GameConstants.PERFORMANCE);
Object.freeze(GameConstants.SYMBOL_RAIN);
Object.freeze(GameConstants.LOCK);
Object.freeze(GameConstants.CONSOLE);
Object.freeze(GameConstants.GAME_STATE);
Object.freeze(GameConstants.PATHS);
Object.freeze(GameConstants.RESOLUTION);
Object.freeze(GameConstants.ANIMATION);
Object.freeze(GameConstants.COLORS);

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameConstants;
} else {
    window.GameConstants = GameConstants;
}

console.log('✅ Constants Module Loaded');
console.log('⚙️ Game configured with', Object.keys(GameConstants).length, 'constant groups');
