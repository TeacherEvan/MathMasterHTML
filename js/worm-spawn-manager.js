// js/worm-spawn-manager.js - Worm Spawn Queue and Management
console.log("📋 Worm Spawn Manager Loading...");

/**
 * WormSpawnManager - Handles spawn queue and batch processing
 * Prevents frame drops when spawning multiple worms simultaneously
 */
class WormSpawnManager {
  /**
   * @param {Object} [config] - Spawn manager configuration
   * @param {number} [config.queueDelay] - Delay between spawn queue processing (ms)
   * @param {number} [config.maxWorms] - Maximum number of active worms
   */
  constructor(config = {}) {
    this.SPAWN_QUEUE_DELAY = config.queueDelay || 50;
    this.maxWorms = config.maxWorms || 999;

    this.spawnQueue = [];
    this.isProcessingQueue = false;

    console.log(
      `📋 WormSpawnManager initialized (max: ${this.maxWorms}, delay: ${this.SPAWN_QUEUE_DELAY}ms)`,
    );
  }

  /**
   * Queue a worm spawn to prevent frame drops
   * @param {string} type - Spawn type ('console', 'border', 'purple', 'fallback')
   * @param {Object} data - Spawn-specific data
   */
  queueSpawn(type, data = {}) {
    this.spawnQueue.push({
      type,
      data,
      timestamp: Date.now(),
    });

    console.log(
      `📋 Queued ${type} worm spawn. Queue length: ${this.spawnQueue.length}`,
    );
  }

  /**
   * Process spawn queue one at a time with RAF spacing
   * @param {Function} spawnCallback - Callback to execute spawn: (type, data) => void
   * @returns {Promise<void>}
   */
  async processQueue(spawnCallback) {
    if (this.isProcessingQueue || this.spawnQueue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;

    requestAnimationFrame(() => {
      const spawn = this.spawnQueue.shift();

      if (spawn && typeof spawnCallback === "function") {
        try {
          spawnCallback(spawn.type, spawn.data);
        } catch (error) {
          console.error(`❌ Error spawning ${spawn.type} worm:`, error);
        }
      }

      this.isProcessingQueue = false;

      // Process next spawn after delay
      if (this.spawnQueue.length > 0) {
        setTimeout(() => {
          this.processQueue(spawnCallback);
        }, this.SPAWN_QUEUE_DELAY);

        console.log(
          `⏱️ Processing next spawn in queue (${this.spawnQueue.length} remaining)...`,
        );
      }
    });
  }

  /**
   * Get current queue status
   * @returns {Object} {length, isProcessing}
   */
  getStatus() {
    return {
      length: this.spawnQueue.length,
      isProcessing: this.isProcessingQueue,
    };
  }

  /**
   * Clear spawn queue
   */
  clearQueue() {
    const cleared = this.spawnQueue.length;
    this.spawnQueue = [];
    this.isProcessingQueue = false;

    if (cleared > 0) {
      console.log(`🧹 Cleared ${cleared} queued spawn(s)`);
    }
  }

  /**
   * Check if can spawn more worms
   * @param {number} currentWormCount - Current active worm count
   * @returns {boolean} True if can spawn
   */
  canSpawn(currentWormCount) {
    if (currentWormCount >= this.maxWorms) {
      console.log(`⚠️ Max worms (${this.maxWorms}) reached. Cannot spawn.`);
      return false;
    }
    return true;
  }
}

/**
 * WormSpawnCoordinator - Coordinates different spawn strategies
 */
class WormSpawnCoordinator {
  /**
   * @param {Object} dependencies - Required dependencies
   * @param {any} dependencies.factory - Worm factory instance
   * @param {WormSpawnManager} dependencies.spawnManager - Spawn manager instance
   * @param {HTMLElement} dependencies.container - Spawn container element
   * @param {Function} dependencies.onSpawnComplete - Callback when spawn completes
   */
  constructor(dependencies) {
    this.factory = dependencies.factory;
    this.spawnManager = dependencies.spawnManager;
    this.container = dependencies.container;
    this.onSpawnComplete = dependencies.onSpawnComplete;

    // Console slot tracking
    this.lockedConsoleSlots = new Set();

    console.log("🎯 WormSpawnCoordinator initialized");
  }

  /**
   * Spawn worm from console slot
   * @param {HTMLElement} slotElement - Console slot element
   * @param {number} slotIndex - Slot index
   * @param {Object} config - Spawn configuration (speed, roamDuration, etc.)
   * @returns {Object|null} Worm data or null if failed
   */
  spawnFromConsole(slotElement, slotIndex, config) {
    if (!slotElement) {
      console.error("❌ Cannot spawn from console: slotElement is null");
      return null;
    }

    // Lock console slot
    this.lockedConsoleSlots.add(slotIndex);
    slotElement.classList.add("worm-spawning", "locked");

    console.log(`🕳️ Worm spawning from console slot ${slotIndex + 1}`);

    // Get slot position
    const slotRect = slotElement.getBoundingClientRect();
    const startX = slotRect.left + slotRect.width / 2;
    const startY = slotRect.top + slotRect.height / 2;

    // Generate unique ID
    const wormId = this.generateUniqueId("worm");

    // Create worm element
    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: ["console-worm"],
      segmentCount: config.segmentCount,
      x: startX,
      y: startY,
    });

    // Append to container
    this.container.appendChild(wormElement);

    // Create worm data
    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: startX,
      y: startY,
      baseSpeed: config.baseSpeed,
      roamDuration: config.roamDuration,
      fromConsole: true,
      consoleSlotIndex: slotIndex,
      consoleSlotElement: slotElement,
    });

    console.log(
      `✅ Worm ${wormId} spawned from console at (${startX.toFixed(
        0,
      )}, ${startY.toFixed(0)})`,
    );

    return wormData;
  }

  /**
   * Spawn worm from border
   * @param {number} index - Spawn index
   * @param {number} total - Total spawns
   * @param {Object} config - Spawn configuration
   * @returns {Object|null} Worm data or null if failed
   */
  spawnFromBorder(index, total, config) {
    // Calculate border position
    const position = this.factory.calculateBorderSpawnPosition(
      index,
      total,
      config.borderMargin,
    );

    // Generate unique ID
    const wormId = this.generateUniqueId("border-worm");

    // Create worm element
    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: [],
      segmentCount: config.segmentCount,
      x: position.x,
      y: position.y,
    });

    // Append to container
    this.container.appendChild(wormElement);

    // Create worm data
    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: position.x,
      y: position.y,
      baseSpeed: config.baseSpeed,
      roamDuration: config.roamDuration,
      fromConsole: false,
    });

    console.log(
      `✅ Border worm ${wormId} spawned at (${position.x.toFixed(
        0,
      )}, ${position.y.toFixed(0)})`,
    );

    return wormData;
  }

  /**
   * Spawn purple worm from help button
   * @param {HTMLElement} helpButton - Help button element
   * @param {Object} config - Spawn configuration
   * @returns {Object|null} Worm data or null if failed
   */
  spawnPurpleWorm(helpButton, config) {
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
      // Fallback position
      const position = this.factory.calculateFallbackSpawnPosition();
      startX = position.x;
      startY = position.y - 50; // Start above viewport
      console.log(`⚠️ Help button not found, using fallback position`);
    }

    // Generate unique ID
    const wormId = this.generateUniqueId("purple-worm");

    // Create worm element
    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: ["purple-worm"],
      segmentCount: config.segmentCount,
      x: startX,
      y: startY,
    });

    // Append to container
    this.container.appendChild(wormElement);

    // Create worm data (purple worm has special properties)
    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: startX,
      y: startY,
      baseSpeed: config.baseSpeed,
      roamDuration: 0, // Purple worms rush immediately
      isPurple: true,
      fromConsole: false,
    });

    console.log(
      `🟣 Purple worm ${wormId} spawned at (${startX.toFixed(
        0,
      )}, ${startY.toFixed(0)})`,
    );
    console.log(
      `🟣 Purple worm moves slower, prioritizes RED symbols, and CLONES on click!`,
    );

    return wormData;
  }

  /**
   * Spawn fallback worm (when console slots occupied)
   * @param {Object} config - Spawn configuration
   * @returns {Object|null} Worm data or null if failed
   */
  spawnFallback(config) {
    // Calculate fallback position
    const position = this.factory.calculateFallbackSpawnPosition();

    // Generate unique ID
    const wormId = this.generateUniqueId("worm");

    // Create worm element
    const wormElement = this.factory.createWormElement({
      id: wormId,
      classNames: [],
      segmentCount: config.segmentCount,
      x: position.x,
      y: position.y,
    });

    // Append to container
    this.container.appendChild(wormElement);

    // Create worm data
    const wormData = this.factory.createWormData({
      id: wormId,
      element: wormElement,
      x: position.x,
      y: position.y,
      baseSpeed: config.baseSpeed,
      roamDuration: config.roamDuration,
      fromConsole: false,
    });

    console.log(`✅ Worm ${wormId} spawned (fallback mode)`);

    return wormData;
  }

  /**
   * Unlock console slot
   * @param {number} slotIndex - Slot index
   * @param {HTMLElement} slotElement - Slot element
   */
  unlockConsoleSlot(slotIndex, slotElement) {
    this.lockedConsoleSlots.delete(slotIndex);
    if (slotElement) {
      slotElement.classList.remove("worm-spawning", "locked");
    }
    console.log(`🔓 Console slot ${slotIndex + 1} unlocked`);
  }

  /**
   * Generate unique ID with prefix
   * @param {string} prefix - ID prefix
   * @returns {string} Unique ID
   */
  generateUniqueId(prefix) {
    return `${prefix}-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
  }
}

// Export modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = { WormSpawnManager, WormSpawnCoordinator };
} else {
  window.WormSpawnManager = WormSpawnManager;
  window.WormSpawnCoordinator = WormSpawnCoordinator;
}

console.log("✅ Worm Spawn Manager Module Loaded");
