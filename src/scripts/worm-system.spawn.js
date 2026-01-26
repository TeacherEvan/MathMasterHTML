// src/scripts/worm-system.spawn.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for spawn helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  // PERFORMANCE: Queue worm spawn to prevent frame drops on multi-spawn
  proto.queueWormSpawn = function(type, data = {}) {
    this.spawnManager.queueSpawn(type, data);
    this.processSpawnQueue();
  };

  // PERFORMANCE: Process spawn queue using refactored spawn manager
  proto.processSpawnQueue = function() {
    this.spawnManager.processQueue((type, data) => {
      if (type === "console") {
        this.spawnWormFromConsole();
      } else if (type === "purple") {
        this.spawnPurpleWorm();
      } else if (type === "border") {
        this.spawnWormFromBorder(data);
      }
    });
  };

  // Find an empty console slot to spawn worm from
  proto.findEmptyConsoleSlot = function() {
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
  };

  // REFACTORED: Unified spawn helper to eliminate duplication
  // All spawn methods follow the same pattern with different spawn configs
  proto._spawnWormWithConfig = function(config) {
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
  };

  // Spawn worm from console slot with slide-open animation
  proto.spawnWormFromConsole = function() {
    this.initialize();

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
  };

  // Fallback spawn method for when console slots are all occupied
  proto.spawnWorm = function() {
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
  };

  // Spawn worm from border (bottom or sides) - used for row completion
  proto.spawnWormFromBorder = function(data = {}) {
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
  };

  // PURPLE WORM: Spawn purple worm triggered by 2+ wrong answers
  proto.spawnPurpleWorm = function() {
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
  };
})();
