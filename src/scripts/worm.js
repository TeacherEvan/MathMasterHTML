// js/worm.js - Enhanced Worm System with Crawling Behavior
Logger.debug("🐛", "Worm System Loading...");

// ========================================
// WORM SYSTEM CLASS (Core)
// ========================================

class WormSystem {
  // ========================================
  // CONSTRUCTOR & INITIALIZATION
  // ========================================

  constructor() {
    this.worms = [];
    this.maxWorms = 999; // Reasonable limit to prevent system crash from infinite cloning
    this.wormContainer = null;
    this.solutionContainer = null;
    this.consoleElement = null;
    this.isInitialized = false;
    this.animationFrameId = null;
    this.spawnTimer = null;
    this.firstWormSpawned = false;
    this.crossPanelContainer = null; // Container for cross-panel worm movement

    // ROW COMPLETION TRACKING
    this.rowsCompleted = 0; // Track number of rows completed in current problem

    // CONSOLE SLOT TRACKING
    this.lockedConsoleSlots = new Set(); // Track which console slots are locked by active worms

    // DIFFICULTY SCALING: Get current level from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentLevel = urlParams.get("level") || "beginner";

    // DIFFICULTY SETTINGS PER LEVEL
    const difficultySettings = {
      beginner: {
        wormsPerRow: 3,
        speed: 1.0,
        roamTimeConsole: 8000,
        roamTimeBorder: 5000,
      },
      warrior: {
        wormsPerRow: 5,
        speed: 1.5,
        roamTimeConsole: 6000,
        roamTimeBorder: 4000,
      },
      master: {
        wormsPerRow: 8,
        speed: 2.0,
        roamTimeConsole: 4000,
        roamTimeBorder: 3000,
      },
    };

    // Apply difficulty settings
    const settings =
      difficultySettings[currentLevel] || difficultySettings.beginner;
    this.wormsPerRow = settings.wormsPerRow;
    this.difficultySpeedMultiplier = settings.speed;
    this.difficultyRoamTimeConsole = settings.roamTimeConsole;
    this.difficultyRoamTimeBorder = settings.roamTimeBorder;

    this.additionalWormsPerRow = 0; // No additional escalation (already scaled by difficulty)

    // Automation mode: reduce worm count for deterministic tests
    this.isAutomation = navigator.webdriver === true;
    if (this.isAutomation) {
      this.wormsPerRow = Math.min(this.wormsPerRow, 1);
      this.maxWorms = Math.min(this.maxWorms, 8);
    }

    Logger.info(
      `🎮`,
      `Difficulty: ${currentLevel.toUpperCase()} - ${
        this.wormsPerRow
      } worms/row, ${this.difficultySpeedMultiplier}x speed, ${
        this.difficultyRoamTimeBorder
      }ms roam`,
    );

    // POWER-UP SYSTEM
    this.powerUps = {
      chainLightning: 0, // Number of chain lightning power-ups collected
      spider: 0,
      devil: 0,
    };
    this.chainLightningKillCount = 5; // First use kills 5, then +2 per use

    // PERFORMANCE: DOM query caching
    this.cachedRevealedSymbols = null;
    this.revealedSymbolsCacheTime = 0;
    this.cachedAllSymbols = null; // FIX: Cache for ALL symbols (for purple worms)
    this.allSymbolsCacheTime = 0;
    this.cachedContainerRect = null;
    this.containerRectCacheTime = 0;
    this.CACHE_DURATION_TARGETS = 100; // Refresh revealed symbols every 100ms
    this.CACHE_DURATION_RECT = 200; // Refresh container rect every 200ms

    // PERFORMANCE: Guard to prevent duplicate event listener registration
    this.eventListenersInitialized = false;

    // Cached DOM elements to avoid repeated getElementById calls
    this.cachedHelpButton = null;
    this.cachedPowerUpDisplay = null;
    this.cachedPanelC = null;
    this.cachedGameOverModal = null;

    // Track latest revealed symbol for late-spawned worms
    this.latestRevealedSymbol = null;
    this.latestRevealedAt = 0;
    this.LATEST_REVEALED_TTL = 5000; // ms

    // CONSTANTS: Extract magic numbers for better maintainability
    this.WORM_SEGMENT_COUNT = 5;
    this.WORM_Z_INDEX = 10000;
    // FIX 1: Reduced roaming times for faster worm effectiveness (was 10000/5000)
    this.ROAMING_DURATION_CONSOLE = 3000; // 3 seconds for console worms (was 10s)
    this.ROAMING_DURATION_BORDER = 5000; // 5 seconds for border worms (unchanged)
    // FIX 2: Base speeds (multiplied by difficulty scaling)
    this.SPEED_CONSOLE_WORM = 2.0 * this.difficultySpeedMultiplier;
    this.SPEED_FALLBACK_WORM = 1.0 * this.difficultySpeedMultiplier;
    this.SPEED_BORDER_WORM = 2.5 * this.difficultySpeedMultiplier;
    this.SPEED_PURPLE_WORM = 1.0; // Purple worm speed not scaled by difficulty
    this.SPAWN_QUEUE_DELAY = 50; // ms between spawn queue processing
    this.BORDER_MARGIN = 20; // px from viewport edge

    // POWER-UP CONSTANTS
    this.POWER_UP_DROP_RATE = 0.1; // 10% chance to drop power-up
    this.POWER_UP_TYPES = ["chainLightning", "spider", "devil"];

    // ANIMATION TIMING CONSTANTS
    this.EXPLOSION_CLEANUP_DELAY = 600; // ms - worm removal delay after explosion
    this.WORM_REMOVAL_DELAY = 500; // ms - delay before removing worm from DOM
    this.PROBLEM_COMPLETION_CLEANUP_DELAY = 2000; // ms - wait for explosions to finish
    this.SLIME_SPLAT_DURATION = 10000; // ms - 10 seconds
    this.SPIDER_HEART_DURATION = 60000; // ms - 1 minute
    this.SKULL_DISPLAY_DURATION = 10000; // ms - 10 seconds

    // WORM BEHAVIOR CONSTANTS
    this.CLONE_WORM_ROAM_DURATION = 10000; // ms - cloned worm roaming time
    this.DEVIL_PROXIMITY_DISTANCE = 50; // px
    this.DEVIL_KILL_TIME = 5000; // ms - 5 seconds

    // DISTANCE THRESHOLDS
    this.DISTANCE_STEAL_SYMBOL = 30; // px - how close to symbol to steal it
    this.DISTANCE_CONSOLE_ARRIVAL = 20; // px - how close to console to escape
    this.DISTANCE_TARGET_RUSH = 30; // px - when rushing to target symbol
    this.DISTANCE_ROAM_RESUME = 5; // px - lost target, resume roaming

    // EXPLOSION CONSTANTS
    this.EXPLOSION_AOE_RADIUS = 18; // px - one worm height for chain reactions
    this.EXPLOSION_PARTICLE_COUNT = 12; // number of particles per explosion

    // MOVEMENT CONSTANTS
    this.RUSH_SPEED_MULTIPLIER = 2.0; // 2x speed when rushing to target
    this.FLICKER_SPEED_BOOST = 1.2; // 20% speed boost when carrying symbol
    this.CRAWL_AMPLITUDE = 0.5; // inchworm effect amplitude
    this.DIRECTION_CHANGE_RATE = 0.1; // random direction change per frame
    this.CRAWL_PHASE_INCREMENT = 0.05; // crawl animation speed

    // AGGRESSION & CURSOR AVOIDANCE CONSTANTS
    this.AGGRESSION_MIN_DISTANCE = 40; // px
    this.AGGRESSION_MAX_DISTANCE = 420; // px
    this.AGGRESSION_MAX_SPEED_BOOST = 1.6; // +160%
    this.PATHFINDING_DISTANCE = 600; // px
    this.INTERCEPT_DISTANCE = 220; // px
    this.PATH_RECALC_INTERVAL = 200; // ms
    this.PATH_CELL_SIZE = 60; // px
    this.CURSOR_THREAT_RADIUS = 140; // px
    this.CURSOR_ESCAPE_RADIUS = 220; // px
    this.CURSOR_ESCAPE_DURATION = 700; // ms
    this.CURSOR_ESCAPE_MULTIPLIER = 2.2; // speed multiplier when escaping
    this.WORM_CLICK_GRACE_WINDOW = 900; // ms for double-click kill

    // SPAWN CONSTANTS
    this.WORM_SPAWN_OFFSET_RANGE = 60; // px - max offset when cloning
    this.CLONE_POSITION_OFFSET = 30; // px - purple worm clone offset

    // TIMING CONSTANTS
    this.ROAM_RESUME_DURATION = 5000; // ms - resume roaming after losing target
    this.CLONE_BIRTH_ANIMATION = 500; // ms - clone birth effect duration
    this.EXPLOSION_CHAIN_DELAY = 150; // ms - delay between chain explosions
    this.PURPLE_CLONE_ROAM_TIME = 8000; // ms - purple clone roaming time

    // ========================================
    // REFACTORED MODULES INTEGRATION
    // ========================================

    // Initialize factory for worm creation
    this.factory = new WormFactory({
      segmentCount: this.WORM_SEGMENT_COUNT,
      zIndex: this.WORM_Z_INDEX,
      dropRate: this.POWER_UP_DROP_RATE,
      powerUpTypes: this.POWER_UP_TYPES,
    });

    // Initialize movement handler
    this.movement = new WormMovement({
      borderMargin: this.BORDER_MARGIN,
      rushSpeedMultiplier: this.RUSH_SPEED_MULTIPLIER,
      flickerSpeedBoost: this.FLICKER_SPEED_BOOST,
      crawlAmplitude: this.CRAWL_AMPLITUDE,
      directionChangeRate: this.DIRECTION_CHANGE_RATE,
      crawlPhaseIncrement: this.CRAWL_PHASE_INCREMENT,
    });

    // Initialize spawn manager
    this.spawnManager = new WormSpawnManager({
      queueDelay: this.SPAWN_QUEUE_DELAY,
      maxWorms: this.maxWorms,
    });

    // Initialize cursor tracking, aggression model, and pathfinding
    this.cursorTracker = new WormCursorTracker({ throttleMs: 16 });
    this.aggressionModel = new WormAggressionModel({
      minDistance: this.AGGRESSION_MIN_DISTANCE,
      maxDistance: this.AGGRESSION_MAX_DISTANCE,
      maxSpeedBoost: this.AGGRESSION_MAX_SPEED_BOOST,
      pathfindingDistance: this.PATHFINDING_DISTANCE,
      interceptDistance: this.INTERCEPT_DISTANCE,
    });
    this.pathfinder = new WormPathfinder({
      cellSize: this.PATH_CELL_SIZE,
      maxIterations: 1200,
      obstaclePadding: 12,
    });
    this.obstacleMap = new WormObstacleMap({
      cacheDuration: 200,
      padding: 8,
    });
    this.evasion = new WormEvasion({
      cursorThreatRadius: this.CURSOR_THREAT_RADIUS,
      cursorEscapeRadius: this.CURSOR_ESCAPE_RADIUS,
      cursorEscapeMultiplier: this.CURSOR_ESCAPE_MULTIPLIER,
      obstacleAvoidStrength: 0.9,
      obstaclePadding: 12,
    });

    this.cursorState = {
      x: 0,
      y: 0,
      isActive: false,
      pointerType: "mouse",
      lastUpdate: 0,
      lastTap: 0,
    };

    console.log("🐛 WormSystem initialized with refactored modules");
  }

  initialize() {
    if (this.isInitialized) return;

    this.wormContainer = document.getElementById("worm-container");
    this.solutionContainer = document.getElementById("solution-container");
    this.consoleElement = document.getElementById("symbol-console");

    // Create cross-panel container for worms to roam all panels
    if (!this.crossPanelContainer) {
      this.crossPanelContainer = document.createElement("div");
      this.crossPanelContainer.id = "cross-panel-worm-container";
      this.crossPanelContainer.style.position = "fixed";
      this.crossPanelContainer.style.top = "0";
      this.crossPanelContainer.style.left = "0";
      this.crossPanelContainer.style.width = "100vw";
      this.crossPanelContainer.style.height = "100vh";
      this.crossPanelContainer.style.pointerEvents = "none"; // Let clicks pass through
      this.crossPanelContainer.style.zIndex = "10000";
      document.body.appendChild(this.crossPanelContainer);
      console.log("🌍 Cross-panel worm container created");
    }

    if (!this.wormContainer) {
      console.error("🐛 Worm container #worm-container not found!");
      return;
    }

    if (!this.solutionContainer) {
      console.error("🐛 Solution container not found!");
      return;
    }

    if (!this.consoleElement) {
      console.error("🐛 Console element not found!");
      // Continue even if console not found (mobile mode)
    }

    // Ensure container has relative positioning for absolute children
    if (getComputedStyle(this.wormContainer).position === "static") {
      this.wormContainer.style.position = "relative";
    }

    // PERFORMANCE: Cache frequently-accessed DOM elements
    this.cachedHelpButton = document.getElementById("help-button");
    this.cachedPowerUpDisplay = document.getElementById("power-up-display");
    this.cachedPanelC = document.getElementById("third-display");
    this.cachedGameOverModal = document.getElementById("game-over-modal");
    console.log(
      "💾 Cached DOM elements: helpButton, powerUpDisplay, panelC, gameOverModal",
    );

    // PERFORMANCE: Setup event listeners once
    this.setupEventListeners();

    // POWER-UP SYSTEM (Two-click UI): initialize extracted module if available
    if (!this.powerUpSystem && window.WormPowerUpSystem) {
      try {
        this.powerUpSystem = new window.WormPowerUpSystem(this);

        // Keep inventories in sync with the WormSystem's existing counters
        this.powerUpSystem.inventory = this.powerUps;
        this.powerUpSystem.chainLightningKillCount = this.chainLightningKillCount;
        this.powerUpSystem.updateDisplay();
      } catch (e) {
        console.warn("⚠️ Failed to initialize WormPowerUpSystem:", e);
      }
    }

    this.isInitialized = true;
    console.log("✅ Worm System initialized successfully");
  }
}

if (typeof window !== "undefined") {
  window.WormSystem = WormSystem;
}

// Initialize global worm system
document.addEventListener("DOMContentLoaded", () => {
  window.wormSystem = new WormSystem();
  console.log("✅ Global wormSystem created");

  // CRITICAL: Initialize immediately to setup event listeners
  window.wormSystem.initialize();
  console.log("✅ WormSystem initialized - event listeners active");
});
