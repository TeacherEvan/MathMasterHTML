// js/worm.js - Enhanced Worm System with Crawling Behavior
console.log("🐛", "Worm System Loading...");

class WormSystem {
  constructor() {
    this.worms = [];
    this.maxWorms = 999; 
    this.wormContainer = null;
    this.solutionContainer = null;
    this.consoleElement = null;
    this.isInitialized = false;
    this.animationFrameId = null;
    this.spawnTimer = null;
    this.firstWormSpawned = false;
    this.crossPanelContainer = null; 
    this.rowsCompleted = 0; 
    this.lockedConsoleSlots = new Set(); 
    this.isDestroyed = false; // Flag to stop animations cleanly

    const urlParams = new URLSearchParams(window.location.search);
    const currentLevel = urlParams.get("level") || "beginner";

    const difficultySettings = {
      beginner: { wormsPerRow: 1, speed: 1.0, roamTimeConsole: 8000, roamTimeBorder: 5000 },
      warrior: { wormsPerRow: 1, speed: 1.5, roamTimeConsole: 6000, roamTimeBorder: 4000 },
      master: { wormsPerRow: 1, speed: 2.0, roamTimeConsole: 4000, roamTimeBorder: 3000 },
    };

    const settings = difficultySettings[currentLevel] || difficultySettings.beginner;
    this.wormsPerRow = settings.wormsPerRow;
    this.difficultySpeedMultiplier = settings.speed;
    this.difficultyRoamTimeConsole = settings.roamTimeConsole;
    this.difficultyRoamTimeBorder = settings.roamTimeBorder;
    this.additionalWormsPerRow = 0; 

    this.isAutomation = navigator.webdriver === true;
    if (this.isAutomation) {
      this.wormsPerRow = Math.min(this.wormsPerRow, 1);
      this.maxWorms = Math.min(this.maxWorms, 8);
    }

    console.log(
      `🎮 Difficulty: ${currentLevel.toUpperCase()} - ${this.wormsPerRow} worms/row, ${this.difficultySpeedMultiplier}x speed, ${this.difficultyRoamTimeBorder}ms roam`
    );

    this.powerUps = { chainLightning: 0, spider: 0, devil: 0 };
    this.chainLightningKillCount = 5; 

    this.cachedRevealedSymbols = null;
    this.revealedSymbolsCacheTime = 0;
    this.cachedAllSymbols = null; 
    this.allSymbolsCacheTime = 0;
    this.cachedContainerRect = null;
    this.containerRectCacheTime = 0;
    this.CACHE_DURATION_TARGETS = 100; 
    this.CACHE_DURATION_RECT = 200; 

    this.eventListenersInitialized = false;

    this.cachedHelpButton = null;
    this.cachedPowerUpDisplay = null;
    this.cachedPanelC = null;
    this.cachedGameOverModal = null;

    this.latestRevealedSymbol = null;
    this.latestRevealedAt = 0;
    this.LATEST_REVEALED_TTL = 5000; 

    this.WORM_SEGMENT_COUNT = 5;
    this.WORM_Z_INDEX = 10000;
    this.ROAMING_DURATION_CONSOLE = 3000; 
    this.ROAMING_DURATION_BORDER = 5000; 
    this.SPEED_CONSOLE_WORM = 2.0 * this.difficultySpeedMultiplier;
    this.SPEED_FALLBACK_WORM = 1.0 * this.difficultySpeedMultiplier;
    this.SPEED_BORDER_WORM = 2.5 * this.difficultySpeedMultiplier;
    this.SPEED_PURPLE_WORM = 1.0; 
    this.SPAWN_QUEUE_DELAY = 50; 
    this.BORDER_MARGIN = 20; 

    this.POWER_UP_DROP_RATE = 0.1; 
    this.POWER_UP_TYPES = ["chainLightning", "spider", "devil"];

    this.EXPLOSION_CLEANUP_DELAY = 600; 
    this.WORM_REMOVAL_DELAY = 500; 
    this.PROBLEM_COMPLETION_CLEANUP_DELAY = 2000; 
    this.SLIME_SPLAT_DURATION = 10000; 
    this.SPIDER_HEART_DURATION = 60000; 
    this.SKULL_DISPLAY_DURATION = 10000; 

    this.CLONE_WORM_ROAM_DURATION = 10000; 
    this.DEVIL_PROXIMITY_DISTANCE = 50; 
    this.DEVIL_KILL_TIME = 5000; 

    this.DISTANCE_STEAL_SYMBOL = 30; 
    this.DISTANCE_CONSOLE_ARRIVAL = 20; 
    this.DISTANCE_TARGET_RUSH = 30; 
    this.DISTANCE_ROAM_RESUME = 5; 

    this.EXPLOSION_AOE_RADIUS = 18; 
    this.EXPLOSION_PARTICLE_COUNT = 12; 

    this.RUSH_SPEED_MULTIPLIER = 2.0; 
    this.FLICKER_SPEED_BOOST = 1.2; 
    this.CRAWL_AMPLITUDE = 0.5; 
    this.DIRECTION_CHANGE_RATE = 0.1; 
    this.CRAWL_PHASE_INCREMENT = 0.05; 

    this.AGGRESSION_MIN_DISTANCE = 40; 
    this.AGGRESSION_MAX_DISTANCE = 420; 
    this.AGGRESSION_MAX_SPEED_BOOST = 1.6; 
    this.PATHFINDING_DISTANCE = 600; 
    this.INTERCEPT_DISTANCE = 220; 
    this.PATH_RECALC_INTERVAL = 200; 
    this.PATH_CELL_SIZE = 60; 
    this.CURSOR_THREAT_RADIUS = 140; 
    this.CURSOR_ESCAPE_RADIUS = 220; 
    this.CURSOR_ESCAPE_DURATION = 700; 
    this.CURSOR_ESCAPE_MULTIPLIER = 2.2; 
    this.WORM_CLICK_GRACE_WINDOW = 900; 

    this.WORM_SPAWN_OFFSET_RANGE = 60; 
    this.CLONE_POSITION_OFFSET = 30; 

    this.ROAM_RESUME_DURATION = 5000; 
    this.CLONE_BIRTH_ANIMATION = 500; 
    this.EXPLOSION_CHAIN_DELAY = 150; 
    this.PURPLE_CLONE_ROAM_TIME = 8000; 

    // Initializing isolated subsystems when available
    if (window.WormFactory) this.factory = new WormFactory({ segmentCount: this.WORM_SEGMENT_COUNT, zIndex: this.WORM_Z_INDEX, dropRate: this.POWER_UP_DROP_RATE, powerUpTypes: this.POWER_UP_TYPES });
    if (window.WormMovement) this.movement = new WormMovement({ borderMargin: this.BORDER_MARGIN, rushSpeedMultiplier: this.RUSH_SPEED_MULTIPLIER, flickerSpeedBoost: this.FLICKER_SPEED_BOOST, crawlAmplitude: this.CRAWL_AMPLITUDE, directionChangeRate: this.DIRECTION_CHANGE_RATE, crawlPhaseIncrement: this.CRAWL_PHASE_INCREMENT });
    if (window.WormSpawnManager) this.spawnManager = new WormSpawnManager({ queueDelay: this.SPAWN_QUEUE_DELAY, maxWorms: this.maxWorms });
    if (window.WormCursorTracker) this.cursorTracker = new WormCursorTracker({ throttleMs: 16 });
    if (window.WormAggressionModel) this.aggressionModel = new WormAggressionModel({ minDistance: this.AGGRESSION_MIN_DISTANCE, maxDistance: this.AGGRESSION_MAX_DISTANCE, maxSpeedBoost: this.AGGRESSION_MAX_SPEED_BOOST, pathfindingDistance: this.PATHFINDING_DISTANCE, interceptDistance: this.INTERCEPT_DISTANCE });
    if (window.WormPathfinder) this.pathfinder = new WormPathfinder({ cellSize: this.PATH_CELL_SIZE, maxIterations: 1200, obstaclePadding: 12 });
    if (window.WormObstacleMap) this.obstacleMap = new WormObstacleMap({ cacheDuration: 200, padding: 8 });
    if (window.WormEvasion) this.evasion = new WormEvasion({ cursorThreatRadius: this.CURSOR_THREAT_RADIUS, cursorEscapeRadius: this.CURSOR_ESCAPE_RADIUS, cursorEscapeMultiplier: this.CURSOR_ESCAPE_MULTIPLIER, obstacleAvoidStrength: 0.9, obstaclePadding: 12 });

    this.cursorState = { x: 0, y: 0, isActive: false, pointerType: "mouse", lastUpdate: 0, lastTap: 0 };
  }

  initialize() {
    if (this.isInitialized) return;

    this.wormContainer = document.getElementById("worm-container");
    this.solutionContainer = document.getElementById("solution-container");
    this.consoleElement = document.getElementById("symbol-console");

    if (!this.crossPanelContainer) {
      this.crossPanelContainer = document.createElement("div");
      this.crossPanelContainer.id = "cross-panel-worm-container";
      this.crossPanelContainer.style.position = "fixed";
      this.crossPanelContainer.style.top = "0";
      this.crossPanelContainer.style.left = "0";
      this.crossPanelContainer.style.width = "100vw";
      this.crossPanelContainer.style.height = "100vh";
      this.crossPanelContainer.style.pointerEvents = "none"; 
      this.crossPanelContainer.style.zIndex = "10000";
      document.body.appendChild(this.crossPanelContainer);
      console.log("🌍 Cross-panel worm container created");
    }

    if (this.wormContainer && getComputedStyle(this.wormContainer).position === "static") {
      this.wormContainer.style.position = "relative";
    }

    this.cachedHelpButton = document.getElementById("help-button");
    this.cachedPowerUpDisplay = document.getElementById("power-up-display");
    this.cachedPanelC = document.getElementById("third-display");
    this.cachedGameOverModal = document.getElementById("game-over-modal");

    if(this.setupEventListeners) this.setupEventListeners();

    if (!this.powerUpSystem && window.WormPowerUpSystem) {
      try {
        this.powerUpSystem = new window.WormPowerUpSystem(this);
        this.powerUpSystem.inventory = this.powerUps;
        this.powerUpSystem.chainLightningKillCount = this.chainLightningKillCount;
        this.powerUpSystem.updateDisplay();
      } catch (e) {
        console.warn("⚠️ Failed to initialize WormPowerUpSystem:", e);
      }
    }

    this.isInitialized = true;

    // VERY IMPORTANT: Bind animate to preserve scope context
    this._boundAnimate = this.animate.bind(this);

    console.log("✅ Worm System initialized successfully");
  }

  // Graceful cleanup
  destroy() {
    this.isDestroyed = true;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

if (typeof window !== "undefined") {
  window.WormSystem = WormSystem;
}

// Global initialization
document.addEventListener("DOMContentLoaded", () => {
  if(!window.wormSystem) window.wormSystem = new WormSystem();
  window.wormSystem.initialize();
});
