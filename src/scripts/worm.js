// js/worm.js - Enhanced Worm System with Crawling Behavior
Logger.debug("🐛", "Worm System Loading...");

// ========================================
// WORM SYSTEM CLASS (Refactored)
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

  // ========================================
  // EVENT LISTENERS & INITIALIZATION
  // ========================================

  // PERFORMANCE: Setup event listeners once (called from initialize)
  setupEventListeners() {
    if (this.eventListenersInitialized) {
      console.log("⚠️ Event listeners already initialized, skipping...");
      return;
    }

    console.log("🎧 Setting up WormSystem event listeners...");

    // Listen for the custom event dispatched by game.js
    document.addEventListener("problemLineCompleted", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log(
        "🐛 Worm System received problemLineCompleted event:",
        detail,
      );
      this.rowsCompleted++;
      const wormsToSpawn =
        this.wormsPerRow +
        (this.rowsCompleted - 1) * this.additionalWormsPerRow;
      console.log(
        `📊 Row ${this.rowsCompleted} completed. Spawning ${wormsToSpawn} worms!`,
      );

      // Spawn multiple worms spread around borders
      for (let i = 0; i < wormsToSpawn; i++) {
        this.queueWormSpawn("border", { index: i, total: wormsToSpawn });
      }
    });

    // CONSOLIDATED: Listen for problem completion (reset row counter + cleanup)
    document.addEventListener("problemCompleted", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log(
        "🎉 Problem completed! Resetting row counter and cleaning up.",
        detail,
      );
      this.rowsCompleted = 0;

      // Kill all worms and clean up cracks
      console.log("🎯 Problem completed - killing all worms!");
      this.killAllWorms();

      // Clean up cracks after worms are killed
      setTimeout(() => {
        this.cleanupCracks();
      }, this.PROBLEM_COMPLETION_CLEANUP_DELAY); // Wait for explosions to finish
    }); // PURPLE WORM: Listen for purple worm trigger (3 wrong answers)
    document.addEventListener("purpleWormTriggered", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log(
        "🟣 Purple Worm System received purpleWormTriggered event:",
        detail,
      );
      this.queueWormSpawn("purple");
    });

    // Listen for symbol clicks in rain display to check if worm's target was clicked
    document.addEventListener("symbolClicked", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.checkWormTargetClickForExplosion(detail.symbol);
    });

    // Listen for symbol reveals to trigger worm targeting
    document.addEventListener("symbolRevealed", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log("🎯 Symbol revealed event:", detail);
      this.notifyWormsOfRedSymbol(detail.symbol);
    });

    // Cursor tracking for evasion (event-driven)
    document.addEventListener("wormCursorUpdate", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.cursorState = detail;
    });
    document.addEventListener("wormCursorTap", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.cursorState = detail;
    });

    if (this.cursorTracker) {
      this.cursorTracker.start();
    }

    this.eventListenersInitialized = true;
    console.log("✅ WormSystem event listeners initialized");
  }

  // ========================================
  // PERFORMANCE OPTIMIZATION UTILITIES
  // ========================================

  // PERFORMANCE: Get cached revealed symbols (refreshes every 100ms instead of every frame)
  getCachedRevealedSymbols() {
    const now = Date.now();
    if (
      !this.cachedRevealedSymbols ||
      now - this.revealedSymbolsCacheTime > this.CACHE_DURATION_TARGETS
    ) {
      this.cachedRevealedSymbols = this.solutionContainer.querySelectorAll(
        ".revealed-symbol",
      );
      this.revealedSymbolsCacheTime = now;
    }
    return this.cachedRevealedSymbols;
  }

  // FIX: Get ALL solution symbols (for purple worms that can steal hidden symbols)
  getCachedAllSymbols() {
    const now = Date.now();
    if (
      !this.cachedAllSymbols ||
      now - this.allSymbolsCacheTime > this.CACHE_DURATION_TARGETS
    ) {
      this.cachedAllSymbols = this.solutionContainer.querySelectorAll(
        ".solution-symbol",
      );
      this.allSymbolsCacheTime = now;
    }
    return this.cachedAllSymbols;
  }

  // PERFORMANCE: Get cached container bounding rect (refreshes every 200ms instead of every frame)
  getCachedContainerRect() {
    const now = Date.now();
    if (
      !this.cachedContainerRect ||
      now - this.containerRectCacheTime > this.CACHE_DURATION_RECT
    ) {
      this.cachedContainerRect = this.wormContainer.getBoundingClientRect();
      this.containerRectCacheTime = now;
    }
    return this.cachedContainerRect;
  }

  // PERFORMANCE: Invalidate caches when symbols change
  invalidateSymbolCache() {
    this.cachedRevealedSymbols = null;
    this.cachedAllSymbols = null; // FIX: Also invalidate all symbols cache
  }

  // PERFORMANCE: Queue worm spawn to prevent frame drops on multi-spawn
  queueWormSpawn(type, data = {}) {
    this.spawnManager.queueSpawn(type, data);
    this.processSpawnQueue();
  }

  // PERFORMANCE: Process spawn queue using refactored spawn manager
  processSpawnQueue() {
    this.spawnManager.processQueue((type, data) => {
      if (type === "console") {
        this.spawnWormFromConsole();
      } else if (type === "purple") {
        this.spawnPurpleWorm();
      } else if (type === "border") {
        this.spawnWormFromBorder(data);
      }
    });
  }

  // ========================================
  // SYMBOL INTERACTION & TARGET DETECTION
  // ========================================

  // Check if rain symbol clicked matches worm's stolen symbol - EXPLODE WORM or TURN GREEN
  checkWormTargetClickForExplosion(clickedSymbol) {
    // REFACTORED: Use utility function for normalization
    const normalizedClicked = normalizeSymbol(clickedSymbol);

    // Check if any worm is carrying this symbol
    this.worms.forEach((worm) => {
      if (!worm.active || !worm.hasStolen) return;

      const normalizedWormSymbol = normalizeSymbol(worm.stolenSymbol);

      if (normalizedWormSymbol === normalizedClicked) {
        // PURPLE WORM: Turn green when matching symbol clicked (must click worm to destroy)
        if (worm.isPurple) {
          console.log(
            `🟣→🟢 User clicked rain symbol "${clickedSymbol}" - Purple worm ${worm.id} turns GREEN!`,
          );

          // Turn worm green (damaged state)
          worm.element.style.filter = "hue-rotate(120deg) brightness(1.2)"; // Purple → Green
          worm.element.classList.remove("purple-worm");
          worm.element.classList.add("worm-damaged", "purple-turned-green");
          worm.isPurple = false; // No longer purple
          worm.canBeClicked = true; // Now clickable for destruction

          // Flash effect
          worm.element.style.animation = "worm-flash-green 0.5s ease-out";
          setTimeout(() => {
            worm.element.style.animation = "";
          }, 500);

          // Update click handler to explode instead of clone
          worm.element.removeEventListener("click", worm.clickHandler);
          worm.clickHandler = (e) => {
            e.stopPropagation();
            console.log(
              `💥 Green (was purple) worm ${worm.id} clicked - EXPLODING!`,
            );

            // Drop power-up when purple worm (now green) is destroyed
            this.dropPowerUp(worm.x, worm.y);

            this.explodeWorm(worm, false);
          };
          worm.element.addEventListener("click", worm.clickHandler);

          return;
        }

        // GREEN WORM: Explode immediately
        console.log(
          `💥 BOOM! User clicked rain symbol "${clickedSymbol}" - EXPLODING worm with stolen symbol!`,
        );

        this.explodeWorm(worm, true); // Pass true to indicate this is a rain kill
      }
    });
  }

  // Notify roaming worms that a red symbol has appeared
  notifyWormsOfRedSymbol(symbolValue) {
    console.log(`🎯 Notifying worms of revealed red symbol: "${symbolValue}"`);

    // Cache the latest revealed symbol and refresh symbol caches
    this.latestRevealedSymbol = symbolValue;
    this.latestRevealedAt = Date.now();
    this.invalidateSymbolCache();

    this.worms.forEach((worm) => {
      if (!worm.active || worm.hasStolen || worm.isRushingToTarget) return;

      // Worm stops roaming and rushes to this symbol
      console.log(
        `🐛 Worm ${worm.id} detected red symbol "${symbolValue}" - RUSHING TO TARGET!`,
      );
      worm.isRushingToTarget = true;
      worm.targetSymbol = symbolValue;
      worm.forceRushUntil = Date.now() + 1500;
      worm.roamingEndTime = Date.now(); // Stop roaming timer
      worm.path = null;
      worm.pathIndex = 0;
      worm.lastPathUpdate = 0;
    });
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

  // Find an empty console slot to spawn worm from
  findEmptyConsoleSlot() {
    if (!this.consoleElement) return null;

    const slots = this.consoleElement.querySelectorAll(".console-slot");
    const emptySlots = [];

    slots.forEach((slot, index) => {
      // Check if slot is empty and not locked by an active worm
      if (!slot.textContent && !this.lockedConsoleSlots.has(index)) {
        emptySlots.push({ element: slot, index: index });
      }
    });

    if (emptySlots.length === 0) {
      console.log("⚠️ No empty console slots available for worm spawn");
      return null;
    }

    // Return random empty slot
    return emptySlots[Math.floor(Math.random() * emptySlots.length)];
  }

  // ========================================
  // HELPER: Find empty console slot
  // ========================================

  // ========================================
  // SPAWN MANAGEMENT
  // ========================================

  // REFACTORED: Unified spawn helper to eliminate duplication
  // All spawn methods follow the same pattern with different spawn configs
  _spawnWormWithConfig(config) {
    const {
      logMessage,
      position,
      wormIdPrefix = "worm",
      classNames = [],
      baseSpeed,
      roamDuration,
      fromConsole = false,
      consoleSlotIndex = null,
      consoleSlotElement = null,
    } = config;

    this.initialize();
    Logger.debug("🐛", logMessage);

    if (!this.spawnManager.canSpawn(this.worms.length)) {
      return null;
    }

    // Create worm element
    const wormId = generateUniqueId(wormIdPrefix);
    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames,
      segmentCount: this.WORM_SEGMENT_COUNT,
      x: position.x,
      y: position.y,
    });

    this.crossPanelContainer.appendChild(wormElement);

    // Seed target if a revealed symbol exists (helps late spawns rush immediately)
    let targetSymbol = null;
    const revealedSymbols = this.getCachedRevealedSymbols();
    if (revealedSymbols && revealedSymbols.length > 0) {
      targetSymbol = revealedSymbols[0].textContent;
    } else if (
      this.latestRevealedSymbol &&
      Date.now() - this.latestRevealedAt < this.LATEST_REVEALED_TTL
    ) {
      targetSymbol = this.latestRevealedSymbol;
    }

    // Create worm data
    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: position.x,
      y: position.y,
      baseSpeed,
      roamDuration,
      fromConsole,
      consoleSlotIndex,
      consoleSlotElement,
      targetSymbol,
    });

    // Handle console slot locking if applicable
    if (fromConsole && consoleSlotIndex !== null && consoleSlotElement) {
      this.lockedConsoleSlots.add(consoleSlotIndex);
      consoleSlotElement.classList.add("worm-spawning", "locked");
    }

    this.worms.push(wormData);

    // Add click handler
    wormElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handleWormInteraction(wormData, e);
    });

    Logger.debug(
      "✅",
      `Worm ${wormId} spawned at (${position.x.toFixed(
        0,
      )}, ${position.y.toFixed(0)}). Total worms: ${this.worms.length}`,
    );

    // Start animation loop if not already running
    if (this.worms.length === 1) {
      this.animate();
    }

    return wormData;
  }

  // Spawn worm from console slot with slide-open animation
  spawnWormFromConsole() {
    // Find empty console slot
    const slotData = this.findEmptyConsoleSlot();
    if (!slotData) {
      Logger.warn(
        "⚠️",
        "All console slots occupied or locked, spawning worm normally",
      );
      this.spawnWorm(); // Fallback to normal spawn
      return;
    }

    const { element: slotElement, index: slotIndex } = slotData;

    // Get slot position for worm spawn point (viewport coordinates)
    const slotRect = slotElement.getBoundingClientRect();
    const position = {
      x: slotRect.left + slotRect.width / 2,
      y: slotRect.top + slotRect.height / 2,
    };

    // Use unified spawn helper
    return this._spawnWormWithConfig({
      logMessage: `🐛 spawnWormFromConsole() called. Current worms: ${this.worms.length}/${this.maxWorms}`,
      position,
      wormIdPrefix: "worm",
      classNames: ["console-worm"],
      baseSpeed: this.SPEED_CONSOLE_WORM,
      roamDuration: this.difficultyRoamTimeConsole,
      fromConsole: true,
      consoleSlotIndex: slotIndex,
      consoleSlotElement: slotElement,
    });
  }

  // Fallback spawn method for when console slots are all occupied
  spawnWorm() {
    const position = this.factory.calculateFallbackSpawnPosition();

    // Use unified spawn helper
    return this._spawnWormWithConfig({
      logMessage: `🐛 spawnWorm() called (fallback). Current worms: ${this.worms.length}/${this.maxWorms}`,
      position,
      wormIdPrefix: "worm",
      classNames: [],
      baseSpeed: this.SPEED_FALLBACK_WORM,
      roamDuration: this.difficultyRoamTimeConsole,
      fromConsole: false,
    });
  }

  // Spawn worm from border (bottom or sides) - used for row completion
  spawnWormFromBorder(data = {}) {
    const { index = 0, total = 1 } = data;
    const position = this.factory.calculateBorderSpawnPosition(
      index,
      total,
      this.BORDER_MARGIN,
    );

    // Use unified spawn helper
    return this._spawnWormWithConfig({
      logMessage: `🐛 spawnWormFromBorder() called. Worm ${index +
        1}/${total}. Current worms: ${this.worms.length}/${this.maxWorms}`,
      position,
      wormIdPrefix: "border-worm",
      classNames: [],
      baseSpeed: this.SPEED_BORDER_WORM,
      roamDuration: this.difficultyRoamTimeBorder,
      fromConsole: false,
    });
  }

  // PURPLE WORM: Spawn purple worm triggered by 2+ wrong answers
  spawnPurpleWorm() {
    this.initialize();

    console.log(
      `🟣 spawnPurpleWorm() called. Current worms: ${this.worms.length}/${this.maxWorms}`,
    );

    if (!this.spawnManager.canSpawn(this.worms.length)) {
      return;
    }

    // Spawn from help button position - USE VIEWPORT COORDINATES
    // PERFORMANCE: Use cached element instead of getElementById
    const helpButton =
      this.cachedHelpButton || document.getElementById("help-button");
    let startX, startY;

    if (helpButton) {
      const helpRect = helpButton.getBoundingClientRect();
      startX = helpRect.left + helpRect.width / 2;
      startY = helpRect.top + helpRect.height / 2;
      console.log(
        `🟣 Purple worm spawning from help button at (${startX.toFixed(
          0,
        )}, ${startY.toFixed(0)})`,
      );
    } else {
      // REFACTORED: Use factory module for fallback position
      const position = this.factory.calculateFallbackSpawnPosition();
      startX = position.x;
      startY = -50; // Start above viewport
      console.log(`⚠️ Help button not found, using fallback position`);
    }

    // REFACTORED: Use factory module for worm creation
    const wormId = generateUniqueId("purple-worm");
    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: ["purple-worm"],
      segmentCount: this.WORM_SEGMENT_COUNT,
      x: startX,
      y: startY,
    });

    this.crossPanelContainer.appendChild(wormElement);

    // REFACTORED: Use factory module for worm data (purple worm)
    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: startX,
      y: startY,
      baseSpeed: this.SPEED_PURPLE_WORM,
      roamDuration: 0, // Purple worms rush immediately
      isPurple: true,
      fromConsole: false,
    });

    this.worms.push(wormData);

    // PURPLE WORM CLICK: Always clones
    wormData.clickHandler = (e) => {
      e.stopPropagation();
      this.handlePurpleWormClick(wormData);
    };
    wormElement.addEventListener("click", wormData.clickHandler);

    console.log(
      `🟣 Purple worm ${wormId} spawned from help button at (${startX.toFixed(
        0,
      )}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`,
    );
    console.log(
      `🟣 Purple worm moves slower, prioritizes RED symbols, and CLONES on click!`,
    );

    // Start animation loop if not already running
    if (this.worms.length === 1) {
      this.animate();
    }
  }

  // ========================================
  // WORM BEHAVIOR & INTERACTIONS
  // ========================================

  stealSymbol(worm) {
    // ERROR HANDLING: Validate worm parameter
    if (!worm || !worm.element) {
      Logger.warn("⚠️", "stealSymbol called with invalid worm object");
      return;
    }

    // CROSS-PANEL CHECK: Worm can only steal symbols when inside Panel B
    // PERFORMANCE: Use cached container rect instead of live query
    const panelBRect = this.getCachedContainerRect();
    const wormInPanelB =
      worm.x >= panelBRect.left &&
      worm.x <= panelBRect.right &&
      worm.y >= panelBRect.top &&
      worm.y <= panelBRect.bottom;

    if (!wormInPanelB) {
      console.log(`🐛 Worm ${worm.id} outside Panel B - cannot steal symbols`);
      // Continue roaming
      worm.roamingEndTime = Date.now() + 5000;
      worm.isRushingToTarget = false;
      return;
    }

    // FIX: Purple worms need access to ALL symbols (including hidden), not just revealed
    const symbolsSource = worm.isPurple
      ? this.getCachedAllSymbols()
      : this.getCachedRevealedSymbols();

    // Get all available symbols (not stolen, not spaces, not completed)
    const allAvailableSymbols = Array.from(symbolsSource).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol"),
    );

    // PURPLE WORM LOGIC: Only steal blue symbols when NO red symbols available
    let availableSymbols;
    if (worm.canStealBlue && worm.isPurple) {
      // First, try to get red (hidden) symbols only
      const redSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );

      if (redSymbols.length > 0) {
        // Red symbols available - purple worm steals red symbols like normal
        availableSymbols = redSymbols;
        console.log(
          `🟣 PURPLE WORM - ${redSymbols.length} red symbols available (preferring red)`,
        );
      } else {
        // NO red symbols - now purple worm can steal blue symbols!
        const blueSymbols = allAvailableSymbols.filter((el) =>
          el.classList.contains("revealed-symbol"),
        );
        availableSymbols = blueSymbols;
        console.log(
          `🟣 PURPLE WORM - NO red symbols! Stealing blue symbols (${blueSymbols.length} available)`,
        );
      }
    } else {
      // Normal worm - only steal red (hidden) symbols
      availableSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );
      console.log(
        `🐛 Normal worm - ${availableSymbols.length} red symbols available`,
      );
    }

    if (availableSymbols.length === 0) {
      console.log("🐛 No symbols available to steal");
      // Continue roaming
      worm.roamingEndTime = Date.now() + 5000;
      worm.isRushingToTarget = false;
      return;
    }

    // If worm has a target symbol, try to find it
    // REFACTORED: Use shared normalizeSymbol utility from utils.js
    let targetSymbol = null;
    if (worm.targetSymbol) {
      const normalizedTarget = normalizeSymbol(worm.targetSymbol);
      targetSymbol = availableSymbols.find((el) => {
        const elSymbol = normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget;
      });
    }

    // If no specific target or target not found, pick random
    if (!targetSymbol) {
      targetSymbol =
        availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
    }

    // ERROR HANDLING: Verify targetSymbol exists and has required properties
    if (!targetSymbol || !targetSymbol.textContent) {
      Logger.warn("⚠️", `Worm ${worm.id} could not find valid target symbol`);
      worm.roamingEndTime = Date.now() + 5000;
      worm.isRushingToTarget = false;
      return;
    }

    const symbolValue = targetSymbol.textContent;
    const wasBlueSymbol = targetSymbol.classList.contains("revealed-symbol");

    console.log(
      `🐛 Worm ${worm.id} stealing ${
        wasBlueSymbol ? "BLUE" : "RED"
      } symbol: "${symbolValue}"`,
    );

    // Mark symbol as stolen and hide it
    targetSymbol.dataset.stolen = "true";
    targetSymbol.classList.add("stolen");
    targetSymbol.classList.remove("revealed-symbol");
    targetSymbol.classList.add("hidden-symbol"); // Hide it again until user re-clicks in rain
    targetSymbol.style.visibility = "hidden";

    // Update worm data
    worm.stolenSymbol = symbolValue;
    worm.targetElement = targetSymbol;
    worm.hasStolen = true;
    worm.isRushingToTarget = false;
    worm.element.dataset.stolenSymbol = symbolValue;
    worm.wasBlueSymbol = wasBlueSymbol; // Track if it was blue
    worm.path = null;
    worm.pathIndex = 0;
    worm.lastPathUpdate = 0;

    // ACTIVATE LSD FLICKER when stealing symbol!
    console.log(
      `🌈 Worm ${worm.id} stole ${
        wasBlueSymbol ? "blue" : "red"
      } symbol - ACTIVATING LSD FLICKER with 20% SPEED BOOST!`,
    );
    worm.isFlickering = true;
    worm.element.classList.add("flickering");
    worm.currentSpeed = worm.baseSpeed * this.FLICKER_SPEED_BOOST; // 20% speed boost!

    // Add stolen symbol indicator (symbol follows worm)
    const stolenSymbolDiv = document.createElement("div");
    stolenSymbolDiv.className = "carried-symbol";
    stolenSymbolDiv.textContent = symbolValue;
    if (wasBlueSymbol) {
      stolenSymbolDiv.style.color = "#00ffff"; // Cyan for stolen blue symbols
    }
    worm.element.appendChild(stolenSymbolDiv);

    console.log(
      `🐛 Worm now carrying "${symbolValue}" and heading back to console hole!`,
    );

    // GAME OVER CHECK: Did worm steal the last available symbol?
    this.checkGameOverCondition();
  }

  // GAME OVER: Check if all symbols have been stolen
  checkGameOverCondition() {
    // FIX: Query ALL symbol elements (not just revealed ones) because stolen symbols may not be in .revealed-symbol class
    // We need to check both revealed and hidden symbols to see if they're stolen
    const allSymbols = this.solutionContainer.querySelectorAll(
      ".symbol:not(.space-symbol):not(.completed-row-symbol)",
    );

    const availableSymbols = Array.from(allSymbols).filter((el) => {
      const isStolen = el.dataset.stolen === "true";
      const isSpace = el.classList.contains("space-symbol");
      const isCompleted = el.classList.contains("completed-row-symbol");

      // Symbol is available if it's not stolen, not a space, and not from a completed row
      return !isStolen && !isSpace && !isCompleted;
    });

    console.log(
      `🎮 Game Over Check: ${availableSymbols.length} symbols available out of ${allSymbols.length} total`,
    );

    if (availableSymbols.length === 0 && allSymbols.length > 0) {
      console.log("💀 GAME OVER! All symbols stolen!");
      this.triggerGameOver();
    }
  }

  // GAME OVER: Trigger game over sequence
  triggerGameOver() {
    // Pause worm animations
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove a random console symbol as penalty (if any exist)
    this.removeRandomConsoleSymbol();

    // Show Game Over modal
    this.showGameOverModal();
  }

  // Remove random symbol from console as penalty
  removeRandomConsoleSymbol() {
    if (!window.consoleManager) return;

    const filledSlots = [];
    window.consoleManager.slots.forEach((symbol, index) => {
      if (symbol !== null) {
        filledSlots.push(index);
      }
    });

    if (filledSlots.length === 0) {
      console.log("⚠️ No console symbols to remove");
      return;
    }

    // Pick random filled slot
    const randomIndex =
      filledSlots[Math.floor(Math.random() * filledSlots.length)];
    const removedSymbol = window.consoleManager.slots[randomIndex];

    // Remove it
    window.consoleManager.slots[randomIndex] = null;
    window.consoleManager.updateConsoleDisplay();
    window.consoleManager.saveProgress();

    console.log(
      `💔 PENALTY: Removed "${removedSymbol}" from console slot ${randomIndex +
        1}`,
    );
  }

  // Show Game Over modal
  showGameOverModal() {
    // PERFORMANCE: Use cached element or create if doesn't exist
    let modal =
      this.cachedGameOverModal || document.getElementById("game-over-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "game-over-modal";
      modal.className = "game-over-modal";
      modal.innerHTML = `
                <div class="game-over-content">
                    <h1 class="game-over-title">💀 GAME OVER! 💀</h1>
                    <p class="game-over-message">All symbols have been stolen by worms!</p>
                    <p class="game-over-penalty">Penalty: Lost 1 console symbol</p>
                    <button class="game-over-button" onclick="location.reload()">Try Again</button>
                    <button class="game-over-button secondary" onclick="window.location.href='level-select.html'">Back to Levels</button>
                </div>
            `;
      document.body.appendChild(modal);
      this.cachedGameOverModal = modal; // Cache the newly created modal
    }

    // Show modal with animation
    setTimeout(() => {
      modal.style.display = "flex";
      modal.style.opacity = "1";
    }, 100);
  }

  // ========================================
  // MOVEMENT UTILITIES (Delegated to WormMovement module)
  // ========================================

  /**
   * Calculate velocity toward target position (delegates to movement module)
   * @private
   */
  _calculateVelocityToTarget(worm, targetX, targetY, speedMultiplier = 1) {
    return this.movement.calculateVelocityToTarget(
      worm,
      targetX,
      targetY,
      speedMultiplier,
    );
  }

  /**
   * Apply boundary constraints to worm position (delegates to movement module)
   * @private
   */
  _constrainToBounds(worm, bounds) {
    this.movement.constrainToBounds(worm, bounds);
  }

  /**
   * Check if worm reached target (delegates to movement module)
   * @private (placeholder for future refactoring)
   */
  _hasReachedTarget(worm, targetX, targetY, threshold) {
    return this.movement.hasReachedTarget(worm, targetX, targetY, threshold);
  }

  /**
   * Update worm position (delegates to movement module)
   * @private (placeholder - kept for compatibility)
   * @deprecated Use movement module instead
   */
  _updatePosition_old_reference(worm) {
    // Old inline implementation - to be replaced with:
    // this.movement.updatePosition(worm);
    const height = window.innerHeight;
    const margin = this.BORDER_MARGIN;
    if (worm.y < this.BORDER_MARGIN) {
      worm.y = this.BORDER_MARGIN;
      worm.direction = -worm.direction;
    }
    if (worm.y > height - margin) {
      worm.y = height - margin;
      worm.direction = -worm.direction;
    }
  }

  /**
   * Update worm rotation to face movement direction
   * @private
   */
  _updateWormRotation(worm) {
    // Add π (180°) to flip worm so head faces forward
    worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
  }

  /**
   * Apply crawling movement with inchworm effect
   * @private
   */
  _applyCrawlMovement(worm) {
    worm.direction += (Math.random() - 0.5) * this.DIRECTION_CHANGE_RATE;
    const crawlOffset = Math.sin(worm.crawlPhase) * this.CRAWL_AMPLITUDE;

    worm.velocityX =
      Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
    worm.velocityY =
      Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

    worm.x += worm.velocityX;
    worm.y += worm.velocityY;
  }

  /**
   * Apply worm position to DOM element
   * @private
   */
  _applyWormPosition(worm) {
    worm.element.style.left = `${worm.x}px`;
    worm.element.style.top = `${worm.y}px`;
  }

  // ========================================
  // STATE HANDLERS (Phase 1 Refactoring)
  // ========================================

  /**
   * Handle worm rushing to devil power-up
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  _updateWormRushingToDevil(worm) {
    if (
      !worm.isRushingToDevil ||
      worm.devilX === undefined ||
      worm.devilY === undefined
    ) {
      return false;
    }

    const distance = calculateDistance(
      worm.x,
      worm.y,
      worm.devilX,
      worm.devilY,
    );
    const dx = worm.devilX - worm.x;
    const dy = worm.devilY - worm.y;

    if (distance > 5) {
      // Rush toward devil at double speed
      const rushSpeed = worm.baseSpeed * 2;
      worm.velocityX = (dx / distance) * rushSpeed;
      worm.velocityY = (dy / distance) * rushSpeed;

      worm.x += worm.velocityX;
      worm.y += worm.velocityY;

      // Rotate towards devil
      worm.element.style.transform = `rotate(${Math.atan2(dy, dx) +
        Math.PI}rad)`;
    }

    // Apply position
    this._applyWormPosition(worm);
    return true; // Handled, skip other behaviors
  }

  /**
   * Select available symbols for a worm based on rules (purple vs green)
   * @private
   */
  _getAvailableSymbolsForWorm(worm, symbolsSource) {
    const allAvailableSymbols = /** @type {HTMLElement[]} */ (Array.from(
      symbolsSource,
    ).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol"),
    ));

    if (worm.isPurple && worm.canStealBlue) {
      const redSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );
      if (redSymbols.length > 0) return redSymbols;

      return allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
      );
    }

    return allAvailableSymbols.filter((el) =>
      el.classList.contains("hidden-symbol"),
    );
  }

  /**
   * Resolve target element for a worm (keeps targetSymbol and targetElement synced)
   * @private
   */
  _resolveTargetElement(worm, symbolsSource) {
    const availableSymbols = this._getAvailableSymbolsForWorm(
      worm,
      symbolsSource,
    );

    if (availableSymbols.length === 0) {
      return null;
    }

    let targetElement = null;

    if (worm.targetSymbol) {
      const normalizedTarget = normalizeSymbol(worm.targetSymbol);
      targetElement = availableSymbols.find((el) => {
        const elSymbol = normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget;
      });
    }

    if (!targetElement) {
      /** @type {HTMLElement | null} */
      let nearestSymbol = null;
      let nearestDistance = Infinity;

      availableSymbols.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const symbolX = rect.left + rect.width / 2;
        const symbolY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(worm.x - symbolX, 2) + Math.pow(worm.y - symbolY, 2),
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSymbol = el;
        }
      });

      if (nearestSymbol) {
        targetElement = nearestSymbol;
        worm.targetSymbol = nearestSymbol.textContent;
      }
    }

    return targetElement;
  }

  /**
   * Handle cursor evasion (highest priority during targeting)
   * @private
   */
  _updateWormEvadingCursor(worm, viewportWidth, viewportHeight) {
    if (worm.hasStolen || !this.evasion) return false;
    if (!this.evasion.isCursorThreat(worm, this.cursorState)) return false;

    const escape = this.evasion.getCursorEscapeVector(
      worm,
      this.cursorState,
      worm.baseSpeed,
    );

    worm.velocityX = escape.velocityX;
    worm.velocityY = escape.velocityY;
    worm.direction = escape.direction;
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    this._constrainToBounds(worm, {
      width: viewportWidth,
      height: viewportHeight,
    });
    this._updateWormRotation(worm);

    return true;
  }

  /**
   * Apply escape burst after first click (double-click kill)
   * @private
   */
  _updateWormEscapeBurst(worm, viewportWidth, viewportHeight) {
    const now = Date.now();
    if (!worm.escapeUntil || now > worm.escapeUntil || !worm.escapeVector) {
      return false;
    }

    const speed = worm.baseSpeed * this.CURSOR_ESCAPE_MULTIPLIER;
    worm.velocityX = worm.escapeVector.x * speed;
    worm.velocityY = worm.escapeVector.y * speed;
    worm.direction = Math.atan2(worm.velocityY, worm.velocityX);
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    this._constrainToBounds(worm, {
      width: viewportWidth,
      height: viewportHeight,
    });
    this._updateWormRotation(worm);

    return true;
  }

  /**
   * Handle worm rushing to revealed target symbol
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  _updateWormRushingToTarget(worm) {
    if (!worm.isRushingToTarget || worm.hasStolen) {
      return false;
    }

    const symbolsToSearch = worm.isPurple
      ? this.getCachedAllSymbols()
      : this.getCachedRevealedSymbols();

    const targetElement = this._resolveTargetElement(worm, symbolsToSearch);

    if (!targetElement) {
      const now = Date.now();
      if (worm.forceRushUntil && now < worm.forceRushUntil) {
        return false;
      }

      console.log(`🐛 Worm ${worm.id} has no symbols to target, roaming...`);
      worm.isRushingToTarget = false;
      worm.path = null;
      worm.pathIndex = 0;
      return false;
    }

    worm.targetElement = targetElement;

    const targetRect = targetElement.getBoundingClientRect();
    let targetX = targetRect.left + targetRect.width / 2;
    let targetY = targetRect.top + targetRect.height / 2;

    const distanceToTarget = this.movement.calculateDistance(
      worm.x,
      worm.y,
      targetX,
      targetY,
    );

    const aggression = this.aggressionModel
      ? this.aggressionModel.getAggression(distanceToTarget)
      : {
          level: 0,
          speedMultiplier: 1,
          usePathfinding: false,
          useIntercept: false,
        };

    worm.aggressionLevel = aggression.level;

    if (aggression.useIntercept) {
      const leadFactor = 0.12;
      targetX += (targetX - worm.x) * leadFactor;
      targetY += (targetY - worm.y) * leadFactor;
    }

    const obstacles = this.obstacleMap
      ? this.obstacleMap.getObstacleRects()
      : [];

    if (aggression.usePathfinding && this.pathfinder) {
      const now = Date.now();
      if (!worm.path || now - worm.lastPathUpdate > this.PATH_RECALC_INTERVAL) {
        const path = this.pathfinder.findPath(
          { x: worm.x, y: worm.y },
          { x: targetX, y: targetY },
          { width: window.innerWidth, height: window.innerHeight },
          obstacles,
        );
        worm.path = path.length > 0 ? path : null;
        worm.pathIndex = 0;
        worm.lastPathUpdate = now;
      }
    } else {
      worm.path = null;
      worm.pathIndex = 0;
    }

    let waypoint = { x: targetX, y: targetY };
    if (worm.path && worm.path.length > 0) {
      const index = Math.min(worm.pathIndex, worm.path.length - 1);
      waypoint = worm.path[index];

      const waypointDistance = this.movement.calculateDistance(
        worm.x,
        worm.y,
        waypoint.x,
        waypoint.y,
      );

      if (
        waypointDistance < this.DISTANCE_TARGET_RUSH &&
        worm.pathIndex < worm.path.length - 1
      ) {
        worm.pathIndex += 1;
      }
    }

    // NEAR-MISS EXCITEMENT: Trigger warning when worm is close but not stealing yet
    const NEAR_MISS_THRESHOLD = 80; // px
    if (
      distanceToTarget < NEAR_MISS_THRESHOLD &&
      distanceToTarget >= this.DISTANCE_STEAL_SYMBOL
    ) {
      this._triggerNearMissWarning(worm, targetElement, distanceToTarget);
    }

    if (distanceToTarget < this.DISTANCE_STEAL_SYMBOL) {
      // Reached target - steal it on direct contact
      this._clearNearMissWarning();
      this.stealSymbol(worm);
      return true;
    }

    const velocity = this._calculateVelocityToTarget(
      worm,
      waypoint.x,
      waypoint.y,
      aggression.speedMultiplier,
    );

    worm.velocityX = velocity.velocityX;
    worm.velocityY = velocity.velocityY;

    if (this.evasion) {
      const avoidance = this.evasion.applyObstacleAvoidance(worm, obstacles);
      worm.velocityX += avoidance.x;
      worm.velocityY += avoidance.y;
    }

    worm.direction = Math.atan2(worm.velocityY, worm.velocityX);
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    return true; // Handled
  }

  /**
   * Handle worm roaming behavior (crawling across panels)
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  _updateWormRoaming(worm, viewportWidth, viewportHeight) {
    if (worm.hasStolen || worm.isRushingToTarget) {
      return false;
    }

    this._applyCrawlMovement(worm);

    if (this.evasion && this.obstacleMap) {
      const avoidance = this.evasion.applyObstacleAvoidance(
        worm,
        this.obstacleMap.getObstacleRects(),
      );
      worm.x += avoidance.x;
      worm.y += avoidance.y;
    }

    this._constrainToBounds(worm, {
      width: viewportWidth,
      height: viewportHeight,
    });
    this._updateWormRotation(worm);

    return true; // Handled
  }

  /**
   * Handle worm returning to console slot with stolen symbol
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  _updateWormReturningToConsole(worm) {
    if (!worm.hasStolen || !worm.fromConsole || !worm.consoleSlotElement) {
      return false;
    }

    const slotRect = worm.consoleSlotElement.getBoundingClientRect();
    const targetX = slotRect.left + slotRect.width / 2;
    const targetY = slotRect.top + slotRect.height / 2;

    const velocity = this._calculateVelocityToTarget(
      worm,
      targetX,
      targetY,
      1.0,
    );

    // Trigger pull-in animation when getting close to console
    if (velocity.distance < 50 && !worm.pullingIn) {
      const carriedSymbol = worm.element.querySelector(".carried-symbol");
      if (carriedSymbol) {
        carriedSymbol.classList.add("pulling-in");
        worm.pullingIn = true;
      }
    }

    if (velocity.distance < this.DISTANCE_CONSOLE_ARRIVAL) {
      // Reached console hole - escape with symbol!
      console.log(
        `🐛 Worm ${worm.id} escaped to console with symbol "${worm.stolenSymbol}"!`,
      );
      console.log(
        `💀 Symbol "${worm.stolenSymbol}" stays HIDDEN until user clicks it again in Panel C`,
      );
      this.removeWorm(worm);
      return true; // Handled and removed
    }

    // Move towards console with LSD colors!
    worm.direction = velocity.direction;
    worm.velocityX = velocity.velocityX;
    worm.velocityY = velocity.velocityY;
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;
    this._updateWormRotation(worm);

    return true; // Handled
  }

  /**
   * Handle worm carrying symbol (non-console worms or purple worms)
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  _updateWormCarryingSymbol(worm) {
    if (!worm.hasStolen || worm.fromConsole) {
      return false;
    }

    // PURPLE WORM CONSOLE EXIT: If this is a purple worm, exit through console
    if (worm.isPurple && worm.shouldExitToConsole) {
      // Find empty console slot if not already targeting one
      if (!worm.exitingToConsole) {
        const emptySlotData = this.findEmptyConsoleSlot();
        if (emptySlotData) {
          worm.exitingToConsole = true;
          worm.targetConsoleSlot = emptySlotData.element;
          worm.targetConsoleSlotIndex = emptySlotData.index;
          console.log(
            `🟣 Purple worm ${worm.id} heading to exit at console slot ${emptySlotData.index}`,
          );
        }
      }

      // If targeting a console slot, move toward it
      if (worm.exitingToConsole && worm.targetConsoleSlot) {
        const slotRect = worm.targetConsoleSlot.getBoundingClientRect();
        const targetX = slotRect.left + slotRect.width / 2;
        const targetY = slotRect.top + slotRect.height / 2;

        const velocity = this._calculateVelocityToTarget(
          worm,
          targetX,
          targetY,
          1.0,
        );

        // Trigger pull-in animation when getting close to console
        if (velocity.distance < 50 && !worm.pullingIn) {
          const carriedSymbol = worm.element.querySelector(".carried-symbol");
          if (carriedSymbol) {
            carriedSymbol.classList.add("pulling-in");
            worm.pullingIn = true;
          }
        }

        if (velocity.distance < this.DISTANCE_CONSOLE_ARRIVAL) {
          // Reached console exit - purple worm escapes!
          console.log(`🟣 Purple worm ${worm.id} exited through console!`);
          this.removeWorm(worm);
          return true; // Handled and removed
        }

        // Move towards console exit
        worm.direction = velocity.direction;
        worm.velocityX = velocity.velocityX;
        worm.velocityY = velocity.velocityY;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
        this._updateWormRotation(worm);
      } else {
        // No console slot found yet, continue roaming
        this._applyCrawlMovement(worm);
      }
    } else {
      // Normal worm carrying symbol - continue roaming
      this._applyCrawlMovement(worm);
    }

    this._updateWormRotation(worm);
    return true; // Handled
  }

  animate() {
    if (this.worms.length === 0) {
      this.animationFrameId = null;
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    this.worms.forEach((worm) => {
      if (!worm.active) return;

      // Update crawl phase for animation
      worm.crawlPhase =
        (worm.crawlPhase + this.CRAWL_PHASE_INCREMENT) % (Math.PI * 2);

      // Always keep worms targeting when symbols exist
      if (!worm.hasStolen && !worm.isRushingToTarget) {
        const symbolsToSearch = worm.isPurple
          ? this.getCachedAllSymbols()
          : this.getCachedRevealedSymbols();
        const targetElement = this._resolveTargetElement(worm, symbolsToSearch);
        if (targetElement) {
          worm.isRushingToTarget = true;
          worm.targetElement = targetElement;
        }
      }

      // REFACTORED: Use state handlers for clean separation of concerns
      // Priority order: Devil > Escape Burst > Cursor Evasion > Target Rush > Console Return > Carrying > Roaming
      if (this._updateWormRushingToDevil(worm)) {
        return; // Devil rush handled, skip other behaviors
      }

      if (this._updateWormEscapeBurst(worm, viewportWidth, viewportHeight)) {
        return;
      }

      if (this._updateWormEvadingCursor(worm, viewportWidth, viewportHeight)) {
        return;
      }

      if (this._updateWormRushingToTarget(worm)) {
        // Target rush handled (or fell through to roaming)
      } else if (this._updateWormReturningToConsole(worm)) {
        // Console return handled (worm may be removed)
        return;
      } else if (this._updateWormCarryingSymbol(worm)) {
        // Carrying symbol handled (worm may be removed)
        if (!worm.active) return;
      } else {
        // Default to roaming behavior
        this._updateWormRoaming(worm, viewportWidth, viewportHeight);
      }

      // Apply position directly (no CSS transitions for smooth crawling)
      this._applyWormPosition(worm);
    });

    // Continue animation if there are active worms
    if (this.worms.some((w) => w.active)) {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationFrameId = null;
    }
  }

  // ========================================
  // WORM CLICK HANDLERS & CLONING
  // ========================================

  handleWormInteraction(worm, event) {
    if (!worm || !worm.active) return;

    if (worm.isPurple) {
      this.handlePurpleWormClick(worm);
      return;
    }

    const now = Date.now();
    if (
      !worm.lastHitTime ||
      now - worm.lastHitTime > this.WORM_CLICK_GRACE_WINDOW
    ) {
      worm.lastHitTime = now;
      this._triggerWormEscape(worm, event);
      return;
    }

    worm.lastHitTime = 0;
    this.handleWormClick(worm);
  }

  _triggerWormEscape(worm, event) {
    const now = Date.now();
    worm.escapeUntil = now + this.CURSOR_ESCAPE_DURATION;

    const cursor = this.cursorState;
    let dx = Math.random() - 0.5;
    let dy = Math.random() - 0.5;

    if (cursor && cursor.isActive) {
      dx = worm.x - cursor.x;
      dy = worm.y - cursor.y;
    } else if (event && typeof event.clientX === "number") {
      dx = worm.x - event.clientX;
      dy = worm.y - event.clientY;
    }

    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    worm.escapeVector = {
      x: dx / distance,
      y: dy / distance,
    };

    console.log(`🐛 Worm ${worm.id} escaped click - first strike used`);
  }

  handleWormClick(worm) {
    if (!worm.active) return;

    // GREEN WORMS: Always explode on click (no cloning)
    console.log(`💥 Green worm ${worm.id} clicked - EXPLODING!`);

    // Drop power-up if this worm has one
    if (worm.hasPowerUp) {
      this.dropPowerUp(worm.x, worm.y, worm.powerUpType);
    }

    this.explodeWorm(worm, false); // false = not a rain kill
  }

  // PURPLE WORM: Special click handler - always clones
  handlePurpleWormClick(worm) {
    if (!worm.active) return;

    console.log(`🟣 Purple worm ${worm.id} clicked - CREATING CLONE!`);

    // Visual feedback
    worm.element.style.animation = "worm-flash-purple 0.5s ease-out";
    setTimeout(() => {
      worm.element.style.animation = "";
    }, 500);

    // Clone the purple worm
    this.clonePurpleWorm(worm);
  }

  // PURPLE WORM: Clone purple worm (maintains purple properties)
  /**
   * Clone a purple worm - creates another purple worm as punishment for clicking
   * This is the ONLY cloning mechanic remaining (cloning curse removed Oct 2025)
   * Purple worms can only be killed by clicking matching symbol in Panel C rain.
   */
  clonePurpleWorm(parentWorm) {
    if (!parentWorm.active) return;

    console.log(
      `🟣 Purple worm ${parentWorm.id} cloning! Creating purple clone...`,
    );

    // Check if we can spawn more worms
    if (this.worms.length >= this.maxWorms) {
      console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot clone.`);
      parentWorm.element.style.animation = "worm-flash 0.3s ease-out";
      setTimeout(() => {
        parentWorm.element.style.animation = "";
      }, 300);
      return;
    }

    // Create purple clone near parent
    const newWormId = `purple-clone-${Date.now()}-${Math.random()}`;
    const newWormElement = document.createElement("div");
    newWormElement.className = "worm-container purple-worm";
    newWormElement.id = newWormId;

    // Worm body with segments
    const wormBody = document.createElement("div");
    wormBody.className = "worm-body";

    for (let i = 0; i < 5; i++) {
      const segment = document.createElement("div");
      segment.className = "worm-segment";
      segment.style.setProperty("--segment-index", String(i));
      wormBody.appendChild(segment);
    }

    newWormElement.appendChild(wormBody);

    // Position clone near parent with random offset - USE VIEWPORT COORDINATES
    const offset = this.CLONE_POSITION_OFFSET;
    const newX = Math.max(
      0,
      Math.min(
        window.innerWidth - 50,
        parentWorm.x + (Math.random() - 0.5) * offset * 2,
      ),
    );
    const newY = Math.max(
      0,
      Math.min(
        window.innerHeight - 50,
        parentWorm.y + (Math.random() - 0.5) * offset * 2,
      ),
    );

    newWormElement.style.left = `${newX}px`;
    newWormElement.style.top = `${newY}px`;
    newWormElement.style.position = "fixed"; // Use fixed for viewport positioning
    newWormElement.style.zIndex = "10000";
    newWormElement.style.opacity = "1";
    newWormElement.style.visibility = "visible";
    newWormElement.style.pointerEvents = "auto"; // Allow clicks

    this.crossPanelContainer.appendChild(newWormElement); // Use cross-panel container

    // Create purple clone data
    const cloneData = {
      id: newWormId,
      element: newWormElement,
      stolenSymbol: null,
      targetElement: null,
      targetSymbol: parentWorm.targetSymbol,
      x: newX,
      y: newY,
      velocityX: (Math.random() - 0.5) * 2.0,
      velocityY: (Math.random() - 0.5) * 1.0,
      active: true,
      hasStolen: false,
      isRushingToTarget: parentWorm.isRushingToTarget,
      roamingEndTime: Date.now() + this.PURPLE_CLONE_ROAM_TIME,
      isFlickering: false,
      baseSpeed: 2.0,
      currentSpeed: 2.0,
      isPurple: true, // Maintain purple status
      canStealBlue: true, // Can steal blue symbols
      fromConsole: false,
      crawlPhase: Math.random() * Math.PI * 2,
      direction: Math.random() * Math.PI * 2,
      aggressionLevel: 0,
      path: null,
      pathIndex: 0,
      lastPathUpdate: 0,
      lastHitTime: 0,
      escapeUntil: 0,
      escapeVector: null,
    };

    this.worms.push(cloneData);

    // Purple worm click handler (50% clone chance)
    newWormElement.addEventListener("click", (e) => {
      e.stopPropagation();
      this.handlePurpleWormClick(cloneData);
    });

    // Clone birth effect
    parentWorm.element.classList.add("worm-multiply");
    newWormElement.classList.add("worm-multiply");

    setTimeout(() => {
      parentWorm.element.classList.remove("worm-multiply");
      newWormElement.classList.remove("worm-multiply");
    }, this.CLONE_BIRTH_ANIMATION);

    console.log(
      `🟣 Purple worm cloned! New clone ${newWormId}. Total worms: ${this.worms.length}`,
    );

    // Start animation loop if not already running
    if (!this.animationFrameId) {
      this.animate();
    }
  }

  // ========================================
  // VISUAL EFFECTS & EXPLOSIONS
  // ========================================

  explodeWorm(worm, isRainKill = false, isChainReaction = false) {
    // ERROR HANDLING: Validate worm parameter
    if (!worm) {
      Logger.warn("⚠️", "explodeWorm called with null worm");
      return;
    }
    if (!worm.element) {
      Logger.warn(
        "⚠️",
        "explodeWorm called with worm missing element",
        worm.id,
      );
      // Still try to clean up worm from array
      this.worms = this.worms.filter((w) => w.id !== worm.id);
      return;
    }

    console.log(
      `💥 EXPLODING worm ${worm.id} (${
        isRainKill ? "RAIN KILL" : "direct click"
      }${isChainReaction ? " - CHAIN REACTION" : ""}) and returning symbol "${
        worm.stolenSymbol
      }"!`,
    );

    // FIX: Mark worm inactive IMMEDIATELY to stop movement during explosion animation
    worm.active = false;

    // ACHIEVEMENT SYSTEM: Dispatch worm explosion event
    document.dispatchEvent(
      new CustomEvent("wormExploded", {
        detail: {
          wormId: worm.id,
          isRainKill: isRainKill,
          isChainReaction: isChainReaction,
          wasPurple: worm.isPurple || false,
          stolenSymbol: worm.stolenSymbol || null,
        },
      }),
    );

    // AOE DAMAGE: Check for nearby worms and trigger chain explosions
    const nearbyWorms = this.worms.filter((w) => {
      if (w.id === worm.id || !w.active) return false;
      const distance = calculateDistance(worm.x, worm.y, w.x, w.y);
      return distance <= this.EXPLOSION_AOE_RADIUS;
    });

    if (nearbyWorms.length > 0) {
      console.log(
        `💥 CHAIN REACTION! ${nearbyWorms.length} worms caught in blast radius!`,
      );
      // Delay chain explosions slightly for visual effect
      setTimeout(() => {
        nearbyWorms.forEach((nearbyWorm) => {
          this.explodeWorm(nearbyWorm, false, true); // Chain explosion!
        });
      }, this.EXPLOSION_CHAIN_DELAY);
    }

    // Return stolen symbol to its original position
    if (worm.targetElement) {
      worm.targetElement.classList.remove("stolen", "hidden-symbol");
      worm.targetElement.classList.add("revealed-symbol");
      worm.targetElement.style.visibility = "visible";
      delete worm.targetElement.dataset.stolen;

      console.log(`✅ Symbol "${worm.stolenSymbol}" returned to Panel B`);
    }

    // DRAMATIC EXPLOSION EFFECT
    worm.element.classList.add("worm-exploding");

    // Create explosion particles
    this.createExplosionParticles(worm.x, worm.y);

    // Flash the screen
    this.createExplosionFlash();

    // Create persistent crack at worm's location
    this.createCrack(worm.x, worm.y);

    // Create slime splat that lasts 15 seconds
    this.createSlimeSplat(worm.x, worm.y);

    // Drop power-up if this worm has one (and not killed by chain reaction to avoid spam)
    if (worm.hasPowerUp && !isChainReaction) {
      this.dropPowerUp(worm.x, worm.y, worm.powerUpType);
    }

    setTimeout(() => {
      this.removeWorm(worm);
    }, this.WORM_REMOVAL_DELAY);
  }

  createExplosionParticles(x, y) {
    // Create particle fragments flying outward
    for (let i = 0; i < this.EXPLOSION_PARTICLE_COUNT; i++) {
      const particle = document.createElement("div");
      particle.className = "explosion-particle";

      const angle = (i / this.EXPLOSION_PARTICLE_COUNT) * Math.PI * 2;
      const _speed = 100 + Math.random() * 100; // Reserved for particle speed animation
      const distance = 80 + Math.random() * 40;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty(
        "--angle-x",
        String(Math.cos(angle) * distance),
      );
      particle.style.setProperty(
        "--angle-y",
        String(Math.sin(angle) * distance),
      );

      this.wormContainer.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 600);
    }
  }

  createExplosionFlash(color = null) {
    const flash = document.createElement("div");
    flash.className = "explosion-flash";
    if (color) {
      flash.style.background = `radial-gradient(circle, ${color}66, transparent)`;
    }
    document.body.appendChild(flash);

    setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 200);
  }

  // ========================================
  // NEAR-MISS EXCITEMENT SYSTEM
  // ========================================

  /**
   * Trigger near-miss warning when worm is close to stealing
   * Creates urgency and excitement for player
   * @private
   */
  _triggerNearMissWarning(worm, targetElement, distance) {
    // Only trigger if not already in near-miss state
    if (this._nearMissActive) return;

    this._nearMissActive = true;
    this._nearMissWorm = worm.id;

    // Calculate urgency level (closer = more urgent)
    const urgencyLevel = Math.max(0, 1 - distance / 80);

    // Add visual warning to target symbol
    targetElement.classList.add("near-miss-target");
    targetElement.style.setProperty("--urgency", urgencyLevel);

    // Add screen border warning
    document.body.classList.add("near-miss-active");

    // Dispatch event for other systems to react
    document.dispatchEvent(
      new CustomEvent("nearMissWarning", {
        detail: {
          wormId: worm.id,
          targetSymbol: worm.targetSymbol,
          distance: distance,
          urgencyLevel: urgencyLevel,
        },
      }),
    );

    console.log(
      `⚠️ NEAR MISS! Worm ${worm.id} is ${distance.toFixed(
        0,
      )}px from stealing "${worm.targetSymbol}"!`,
    );
  }

  /**
   * Clear near-miss warning state
   * @private
   */
  _clearNearMissWarning() {
    if (!this._nearMissActive) return;

    this._nearMissActive = false;
    this._nearMissWorm = null;

    // Remove visual warnings
    document.body.classList.remove("near-miss-active");

    // Remove target highlights
    const nearMissTargets = document.querySelectorAll(".near-miss-target");
    nearMissTargets.forEach((el) => {
      el.classList.remove("near-miss-target");
    });
  }

  // ========================================
  // POWER-UP SYSTEM
  // ========================================

  // Drop power-up at worm location
  dropPowerUp(x, y, type = null) {
    // Random power-up type if not specified
    if (!type) {
      const types = ["chainLightning", "spider", "devil"];
      type = types[Math.floor(Math.random() * types.length)];
    }

    const powerUp = document.createElement("div");
    powerUp.className = "power-up";
    powerUp.dataset.type = type;

    // Set emoji based on type
    const emojis = {
      chainLightning: "⚡",
      spider: "🕷️",
      devil: "👹",
    };
    powerUp.textContent = emojis[type] || "⭐";

    powerUp.style.left = `${x}px`;
    powerUp.style.top = `${y}px`;
    powerUp.style.position = "fixed";
    powerUp.style.fontSize = "30px";
    powerUp.style.zIndex = "10001";
    powerUp.style.cursor = "pointer";
    powerUp.style.animation = "power-up-appear 0.5s ease-out";
    powerUp.style.pointerEvents = "auto";

    // Click to collect
    powerUp.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collectPowerUp(type, powerUp);
    });

    this.crossPanelContainer.appendChild(powerUp);
    console.log(
      `✨ Power-up "${type}" dropped at (${x.toFixed(0)}, ${y.toFixed(0)})`,
    );

    // Auto-remove after 10 seconds if not collected
    setTimeout(() => {
      if (powerUp.parentNode) {
        powerUp.style.animation = "power-up-fade 0.5s ease-out";
        setTimeout(() => {
          if (powerUp.parentNode) {
            powerUp.parentNode.removeChild(powerUp);
          }
        }, this.WORM_REMOVAL_DELAY);
      }
    }, this.SLIME_SPLAT_DURATION);
  }

  // Collect power-up
  collectPowerUp(type, element) {
    this.powerUps[type]++;
    console.log(`🎁 Collected ${type} power-up! Total: ${this.powerUps[type]}`);

    // Chain Lightning: Increase kill count with each pickup
    if (type === "chainLightning") {
      // Only increase after first pickup
      if (this.powerUps[type] > 1) {
        this.chainLightningKillCount += 2;
        console.log(
          `⚡ Chain Lightning kill count increased to ${this.chainLightningKillCount}`,
        );
      }
    }

    // Visual feedback
    element.style.animation = "power-up-collect 0.3s ease-out";

    // Update console display (will be implemented)
    this.updatePowerUpDisplay();

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  }

  // Update power-up display on console
  updatePowerUpDisplay() {
    console.log(
      `📊 Power-ups: ⚡${this.powerUps.chainLightning} 🕷️${this.powerUps.spider} 👹${this.powerUps.devil}`,
    );

    // PERFORMANCE: Use cached elements
    let powerUpDisplay =
      this.cachedPowerUpDisplay || document.getElementById("power-up-display");
    const _consoleElement =
      this.consoleElement || document.getElementById("symbol-console"); // Reserved for console integration

    if (!powerUpDisplay) {
      powerUpDisplay = document.createElement("div");
      powerUpDisplay.id = "power-up-display";
      powerUpDisplay.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 8px;
                border-radius: 8px;
                font-family: 'Orbitron', monospace;
                font-size: 16px;
                z-index: 9999;
                display: flex;
                justify-content: center;
                gap: 12px;
                border: 2px solid #0f0;
                box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
                cursor: move;
                user-select: none;
            `;

      // Append to body for fixed positioning
      document.body.appendChild(powerUpDisplay);

      // Make draggable
      this._makePowerUpDisplayDraggable(powerUpDisplay);

      this.cachedPowerUpDisplay = powerUpDisplay; // Cache the newly created display
    }

    powerUpDisplay.innerHTML = `
            <div class="power-up-item" data-type="chainLightning" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s; position: relative;">
                ⚡ ${this.powerUps.chainLightning}
                ${
                  this.powerUps.chainLightning > 0
                    ? `<div style="position: absolute; top: -10px; right: -10px; font-size: 12px; color: #0ff;">${this.chainLightningKillCount}</div>`
                    : ""
                }
            </div>
            <div class="power-up-item" data-type="spider" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                🕷️ ${this.powerUps.spider}
            </div>
            <div class="power-up-item" data-type="devil" style="cursor: pointer; padding: 5px; border-radius: 5px; transition: all 0.2s;">
                👹 ${this.powerUps.devil}
            </div>
        `;

    // Add click handlers
    powerUpDisplay.querySelectorAll(".power-up-item").forEach((item) => {
      item.addEventListener("mouseenter", () => {
        item.style.background = "rgba(0, 255, 0, 0.3)";
      });
      item.addEventListener("mouseleave", () => {
        item.style.background = "transparent";
      });
      item.addEventListener("click", () => {
        const type = item.dataset.type;
        this.usePowerUp(type);
      });
    });
  }

  // Make power-up display draggable
  _makePowerUpDisplayDraggable(element) {
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    element.addEventListener("pointerdown", dragStart);
    document.addEventListener("pointermove", drag);
    document.addEventListener("pointerup", dragEnd);

    function dragStart(e) {
      // Only allow dragging from the display itself, not from power-up items
      if (e.target.classList.contains("power-up-item")) {
        return;
      }

      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;

      if (e.target === element || e.target.parentElement === element) {
        isDragging = true;
        element.style.cursor = "grabbing";
      }
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();

        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        // Keep within viewport bounds
        const rect = element.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width;
        const maxY = window.innerHeight - rect.height;

        const boundedX = Math.max(0, Math.min(currentX, maxX));
        const boundedY = Math.max(0, Math.min(currentY, maxY));

        setTranslate(boundedX, boundedY, element);
      }
    }

    function dragEnd(e) {
      if (isDragging) {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
        element.style.cursor = "move";
      }
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate(${xPos}px, ${yPos}px)`;
    }
  }

  // Use a power-up
  usePowerUp(type) {
    if (this.powerUps[type] <= 0) {
      console.log(`⚠️ No ${type} power-ups available!`);
      return;
    }

    console.log(`🎮 Using ${type} power-up!`);
    this.powerUps[type]--;

    if (type === "chainLightning") {
      this.activateChainLightning();
    } else if (type === "spider") {
      this.activateSpider();
    } else if (type === "devil") {
      this.activateDevil();
    }

    this.updatePowerUpDisplay();
  }

  // Chain Lightning: Click worm to kill 5 + nearby worms
  activateChainLightning() {
    console.log(
      `⚡ CHAIN LIGHTNING ACTIVATED! Click a worm to unleash the power!`,
    );

    // Calculate kill count (5 for first use, then +2 for each subsequent use)
    const killCount = this.chainLightningKillCount;
    console.log(`⚡ Will kill ${killCount} worms in proximity`);

    // Set up one-time click listener on worms
    const handleWormClickForLightning = (e, worm) => {
      e.stopPropagation();
      console.log(`⚡ Chain Lightning targeting worm ${worm.id}!`);

      // Find closest worms
      const sortedWorms = this.worms
        .filter((w) => w.active)
        .sort((a, b) => {
          const distA = Math.sqrt(
            Math.pow(a.x - worm.x, 2) + Math.pow(a.y - worm.y, 2),
          );
          const distB = Math.sqrt(
            Math.pow(b.x - worm.x, 2) + Math.pow(b.y - worm.y, 2),
          );
          return distA - distB;
        })
        .slice(0, killCount);

      console.log(
        `⚡ Killing ${sortedWorms.length} worms with chain lightning!`,
      );

      // Visual effect
      sortedWorms.forEach((targetWorm, index) => {
        setTimeout(() => {
          // Lightning bolt effect
          const bolt = document.createElement("div");
          bolt.style.cssText = `
                        position: fixed;
                        left: ${worm.x}px;
                        top: ${worm.y}px;
                        width: 3px;
                        height: ${Math.sqrt(
                          Math.pow(targetWorm.x - worm.x, 2) +
                            Math.pow(targetWorm.y - worm.y, 2),
                        )}px;
                        background: linear-gradient(180deg, #fff, #0ff, #fff);
                        transform-origin: top left;
                        transform: rotate(${Math.atan2(
                          targetWorm.y - worm.y,
                          targetWorm.x - worm.x,
                        ) +
                          Math.PI / 2}rad);
                        z-index: 10003;
                        box-shadow: 0 0 10px #0ff, 0 0 20px #0ff;
                        pointer-events: none;
                    `;
          document.body.appendChild(bolt);

          setTimeout(() => {
            if (bolt.parentNode) bolt.parentNode.removeChild(bolt);
          }, 200);

          // Explode worm
          this.explodeWorm(targetWorm, false);
        }, index * 100);
      });

      // RESET: Count resets when used (back to 5 for next collection)
      this.chainLightningKillCount = 5;

      // Remove temporary listeners
      this.worms.forEach((w) => {
        if (w.element && w.tempLightningHandler) {
          w.element.removeEventListener("click", w.tempLightningHandler);
          delete w.tempLightningHandler;
        }
      });

      // Reset cursor
      document.body.style.cursor = "";
    };

    // Add temporary click listeners to all worms
    this.worms.forEach((w) => {
      if (w.active && w.element) {
        w.tempLightningHandler = (e) => handleWormClickForLightning(e, w);
        w.element.addEventListener("click", w.tempLightningHandler);
      }
    });

    // Change cursor to indicate power-up is active
    document.body.style.cursor = "crosshair";
  }

  // Spider: Spawns spider that converts worms to spiders, which convert more worms
  activateSpider() {
    console.log(`🕷️ SPIDER ACTIVATED! Spawning conversion spider...`);

    // Find closest worm
    const activeWorms = this.worms.filter((w) => w.active);
    if (activeWorms.length === 0) {
      console.log(`⚠️ No worms to convert!`);
      return;
    }

    // Spawn spider at random location
    const startX = Math.random() * window.innerWidth;
    const startY = Math.random() * window.innerHeight;

    this.spawnSpider(startX, startY);
  }

  spawnSpider(x, y) {
    const spider = document.createElement("div");
    spider.className = "spider-entity";
    spider.textContent = "🕷️";
    spider.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 40px;
            z-index: 10001;
            cursor: pointer;
            transition: all 0.3s ease;
        `;

    const spiderData = {
      id: `spider-${Date.now()}`,
      element: spider,
      x: x,
      y: y,
      type: "spider",
      active: true,
      createdAt: Date.now(),
      isHeart: false,
    };

    // Click to turn into heart
    spider.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!spiderData.isHeart) {
        spider.textContent = "❤️";
        spiderData.isHeart = true;
        console.log(`🕷️ Spider clicked - turned into ❤️!`);

        // After 1 minute, turn to skull
        setTimeout(() => {
          if (spider.parentNode) {
            spider.textContent = "💀";
            setTimeout(() => {
              if (spider.parentNode) {
                spider.parentNode.removeChild(spider);
              }
            }, this.SKULL_DISPLAY_DURATION); // Remove after 10 seconds
          }
        }, this.SPIDER_HEART_DURATION);
      }
    });

    this.crossPanelContainer.appendChild(spider);

    // Move spider toward closest worm
    const moveSpider = () => {
      if (!spiderData.active || spiderData.isHeart) return;

      const activeWorms = this.worms.filter((w) => w.active);
      if (activeWorms.length === 0) {
        console.log(`🕷️ No more worms to convert`);
        return;
      }

      // Find closest worm
      const closest = activeWorms.reduce((prev, curr) => {
        const prevDist = Math.sqrt(
          Math.pow(prev.x - spiderData.x, 2) +
            Math.pow(prev.y - spiderData.y, 2),
        );
        const currDist = Math.sqrt(
          Math.pow(curr.x - spiderData.x, 2) +
            Math.pow(curr.y - spiderData.y, 2),
        );
        return currDist < prevDist ? curr : prev;
      });

      // Move toward closest worm
      const dist = calculateDistance(
        spiderData.x,
        spiderData.y,
        closest.x,
        closest.y,
      );
      const dx = closest.x - spiderData.x;
      const dy = closest.y - spiderData.y;

      if (dist < 30) {
        // Convert worm to spider!
        console.log(
          `🕷️ Spider converted worm ${closest.id} to another spider!`,
        );
        this.removeWorm(closest);
        this.spawnSpider(closest.x, closest.y);

        // Remove this spider
        if (spider.parentNode) {
          spider.parentNode.removeChild(spider);
        }
        spiderData.active = false;
      } else {
        // Move toward worm
        const speed = 5;
        spiderData.x += (dx / dist) * speed;
        spiderData.y += (dy / dist) * speed;
        spider.style.left = `${spiderData.x}px`;
        spider.style.top = `${spiderData.y}px`;

        requestAnimationFrame(moveSpider);
      }
    };

    moveSpider();
  }

  // Devil: Click location to spawn devil, worms rush to it and die after 5s proximity
  activateDevil() {
    console.log(`👹 DEVIL ACTIVATED! Click location to spawn devil...`);

    // One-time click listener
    const handleDevilClick = (e) => {
      const x = e.clientX;
      const y = e.clientY;

      console.log(`👹 Devil spawning at (${x}, ${y})`);

      this.spawnDevil(x, y);

      // Remove listener and reset cursor
      document.removeEventListener("click", handleDevilClick);
      document.body.style.cursor = "";
    };

    document.addEventListener("click", handleDevilClick);
    document.body.style.cursor = "crosshair";
  }

  spawnDevil(x, y) {
    const devil = document.createElement("div");
    devil.textContent = "👹";
    devil.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            font-size: 60px;
            z-index: 10001;
            pointer-events: none;
            animation: devil-pulsate 1.5s ease-in-out infinite;
        `;

    this.crossPanelContainer.appendChild(devil);

    // Track worms near devil
    const devilData = {
      x: x,
      y: y,
      wormProximity: new Map(), // Track how long each worm has been near
    };

    const checkProximity = () => {
      const activeWorms = this.worms.filter((w) => w.active);

      activeWorms.forEach((worm) => {
        const dist = Math.sqrt(
          Math.pow(worm.x - devilData.x, 2) + Math.pow(worm.y - devilData.y, 2),
        );

        if (dist < this.DEVIL_PROXIMITY_DISTANCE) {
          // Worm is near devil
          if (!devilData.wormProximity.has(worm.id)) {
            devilData.wormProximity.set(worm.id, Date.now());
          } else {
            const timeNear = Date.now() - devilData.wormProximity.get(worm.id);
            if (timeNear >= this.DEVIL_KILL_TIME) {
              // Worm has been near for 5 seconds - kill it!
              console.log(`👹 Worm ${worm.id} killed by devil (5s proximity)`);

              // Create skull emoji
              const skull = document.createElement("div");
              skull.textContent = "💀";
              skull.style.cssText = `
                                position: fixed;
                                left: ${worm.x}px;
                                top: ${worm.y}px;
                                font-size: 30px;
                                z-index: 10002;
                                pointer-events: none;
                            `;
              this.crossPanelContainer.appendChild(skull);

              setTimeout(() => {
                if (skull.parentNode) {
                  skull.parentNode.removeChild(skull);
                }
              }, this.SKULL_DISPLAY_DURATION);

              this.explodeWorm(worm, false);
              devilData.wormProximity.delete(worm.id);
            }
          }

          // Make worm rush toward devil (override normal behavior)
          worm.isRushingToDevil = true;
          worm.devilX = devilData.x;
          worm.devilY = devilData.y;
        } else {
          // Worm left proximity
          if (devilData.wormProximity.has(worm.id)) {
            devilData.wormProximity.delete(worm.id);
          }
          worm.isRushingToDevil = false;
        }
      });

      if (activeWorms.length > 0) {
        requestAnimationFrame(checkProximity);
      } else {
        // No more worms, remove devil
        if (devil.parentNode) {
          devil.parentNode.removeChild(devil);
        }
      }
    };

    checkProximity();
  }

  createSlimeSplat(x, y) {
    const splat = document.createElement("div");
    splat.className = "slime-splat";
    splat.style.left = `${x}px`;
    splat.style.top = `${y}px`;
    splat.style.position = "fixed"; // Use fixed positioning to place at exact coordinates

    // Random rotation for variation
    splat.style.transform = `translate(-50%, -50%) rotate(${Math.random() *
      360}deg)`;

    // FIX: Append to cross-panel container so splat appears at worm's actual death location
    this.crossPanelContainer.appendChild(splat);

    console.log(`🟢 Slime splat created at (${x}, ${y})`);

    // Fade out and remove after 15 seconds
    setTimeout(() => {
      splat.classList.add("slime-fading");
    }, 14000); // Start fade at 14s

    setTimeout(() => {
      if (splat.parentNode) {
        splat.parentNode.removeChild(splat);
      }
    }, 15000); // Remove at 15s
  }

  createCrack(x, y) {
    const crack = document.createElement("div");
    crack.className = "worm-crack";
    crack.style.left = `${x}px`;
    crack.style.top = `${y}px`;

    // Append to panel C (third display)
    // PERFORMANCE: Use cached element
    const panelC =
      this.cachedPanelC || document.getElementById("third-display");
    if (panelC) {
      panelC.appendChild(crack);
      console.log(`💥 Crack created at (${x}, ${y})`);
    }
  }

  cleanupCracks() {
    // PERFORMANCE: Use cached element
    const panelC =
      this.cachedPanelC || document.getElementById("third-display");
    if (panelC) {
      const cracks = panelC.querySelectorAll(".worm-crack");
      cracks.forEach((crack) => crack.remove());
      console.log(`🧹 Cleaned up ${cracks.length} crack(s)`);
    }
  }

  removeWorm(wormData) {
    const index = this.worms.indexOf(wormData);
    if (index > -1) {
      this.worms.splice(index, 1);
    }

    // Unlock console slot if worm was spawned from console
    if (wormData.fromConsole && wormData.consoleSlotIndex !== undefined) {
      this.lockedConsoleSlots.delete(wormData.consoleSlotIndex);
      if (wormData.consoleSlotElement) {
        wormData.consoleSlotElement.classList.remove("worm-spawning", "locked");
      }
      console.log(`🔓 Console slot ${wormData.consoleSlotIndex + 1} unlocked`);
    }

    if (wormData.element && wormData.element.parentNode) {
      wormData.element.parentNode.removeChild(wormData.element);
    }

    console.log(
      `🐛 Worm ${wormData.id} removed. Active worms: ${this.worms.length}`,
    );
  }

  // ========================================
  // CLEANUP & RESET
  // ========================================

  killAllWorms() {
    console.log(
      `💀 KILLING ALL WORMS! Total worms to kill: ${this.worms.length}`,
    );

    // Create a copy of the worms array to iterate over
    const wormsToKill = [...this.worms];

    // Explode each worm with a slight delay for dramatic effect
    wormsToKill.forEach((worm, index) => {
      setTimeout(() => {
        if (worm.active) {
          console.log(`💥 Exploding worm ${worm.id}`);
          this.explodeWorm(worm);
        }
      }, index * 100); // 100ms delay between each explosion
    });

    console.log(`✅ All worms scheduled for extermination!`);
  }

  reset() {
    console.log("🐛 Resetting worm system");

    // Clear spawn timer
    if (this.spawnTimer) {
      clearInterval(this.spawnTimer);
      this.spawnTimer = null;
    }

    // Reset spawn flag
    this.firstWormSpawned = false;

    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove all worms
    this.worms.forEach((worm) => {
      if (worm.element && worm.element.parentNode) {
        worm.element.parentNode.removeChild(worm.element);
      }
    });

    this.worms = [];

    // Clear stolen flags from symbols
    if (this.solutionContainer) {
      const stolenSymbols = this.solutionContainer.querySelectorAll(
        "[data-stolen]",
      );
      stolenSymbols.forEach((el) => {
        el.style.visibility = "visible";
        el.classList.remove("stolen");
        delete el.dataset.stolen;
      });
    }
  }
}

// Initialize global worm system
document.addEventListener("DOMContentLoaded", () => {
  window.wormSystem = new WormSystem();
  console.log("✅ Global wormSystem created");

  // CRITICAL: Initialize immediately to setup event listeners
  window.wormSystem.initialize();
  console.log("✅ WormSystem initialized - event listeners active");
});
