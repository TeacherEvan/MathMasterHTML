// src/scripts/worm-powerups.selection.js
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for selection helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;

  /**
   * TWO-CLICK SYSTEM: Select a power-up (first click)
   * @param {string} type - Power-up type to select
   */
  proto.selectPowerUp = function(type) {
    // If already selected, deselect (toggle)
    if (this.selectedPowerUp === type) {
      this.deselectPowerUp();
      return;
    }

    // Check if available
    if (this.inventory[type] <= 0) {
      console.log(`⚠️ No ${type} power-ups available!`);
      this._showTooltip(`No ${this.EMOJIS[type]} available!`, "warning");
      return;
    }

    // Deselect any previous selection
    if (this.selectedPowerUp) {
      this.deselectPowerUp();
    }

    // Select new power-up
    this.selectedPowerUp = type;
    this.isPlacementMode = true;
    console.log(`🎯 ${this.EMOJIS[type]} SELECTED! ${this.DESCRIPTIONS[type]}`);

    // Update UI to show selection
    this.updateDisplay();

    // Show placement instructions
    this._showTooltip(
      `${this.EMOJIS[type]} selected - ${this.DESCRIPTIONS[type]}`,
      "info",
    );

    // Change cursor to indicate placement mode
    document.body.style.cursor = "crosshair";
    document.body.classList.add("power-up-placement-mode");
    document.documentElement.classList.add("power-up-placement-mode");
    document.documentElement.style.pointerEvents = "none";
    document.body.style.pointerEvents = "auto";

    // Setup placement click handler
    this._setupPlacementHandler(type);
  };

  /**
   * TWO-CLICK SYSTEM: Deselect current power-up (cancel)
   */
  proto.deselectPowerUp = function() {
    if (!this.selectedPowerUp) return;

    console.log(`❌ ${this.EMOJIS[this.selectedPowerUp]} deselected`);

    // Cleanup placement handler
    this._cleanupPlacementHandler();

    // Reset state
    this.selectedPowerUp = null;
    this.isPlacementMode = false;

    // Reset cursor
    document.body.style.cursor = "";
    document.body.classList.remove("power-up-placement-mode");
    document.documentElement.classList.remove("power-up-placement-mode");
    document.documentElement.style.pointerEvents = "";
    document.body.style.pointerEvents = "";

    // Update UI
    this.updateDisplay();
    this._hideTooltip();
  };

  /**
   * Setup placement click handler for two-click system
   * @param {string} type - Power-up type being placed
   * @private
   */
  proto._setupPlacementHandler = function(type) {
    // Remove any existing handler
    this._cleanupPlacementHandler();

    this.placementHandler = (e) => {
      // Ignore clicks on power-up display itself
      if (e.target.closest("#power-up-display")) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Execute the power-up at click location
      this._executePlacement(type, e.clientX, e.clientY, e);
    };

    // Add with capture to ensure we get the click first
    document.addEventListener("click", this.placementHandler, {
      capture: true,
    });
  };

  /**
   * Cleanup placement click handler
   * @private
   */
  proto._cleanupPlacementHandler = function() {
    if (this.placementHandler) {
      document.removeEventListener("click", this.placementHandler, {
        capture: true,
      });
      this.placementHandler = null;
    }
  };

  /**
   * Execute power-up placement (second click)
   * @param {string} type - Power-up type
   * @param {number} x - Click X coordinate
   * @param {number} y - Click Y coordinate
   * @param {Event} event - Original click event
   * @private
   */
  proto._executePlacement = function(type, x, y, event) {
    console.log(`🎮 Placing ${this.EMOJIS[type]} at (${x}, ${y})`);

    // Deduct from inventory
    this.inventory[type]--;

    // Execute based on type
    switch (type) {
      case "chainLightning":
        this._executeChainLightning(x, y, event);
        break;
      case "spider":
        this._executeSpider(x, y);
        break;
      case "devil":
        this._executeDevil(x, y);
        break;
      default:
        console.error(`❌ Unknown power-up type: ${type}`);
    }

    // Reset selection state
    this.deselectPowerUp();
    this.updateDisplay();
  };

  /**
   * Execute Chain Lightning at position
   * @private
   */
  proto._executeChainLightning = function(x, y, event) {
    // Find worm closest to click position
    const clickedWorm = this._findWormAtPosition(x, y);

    if (clickedWorm) {
      this._chainLightningFromWorm(clickedWorm);
    } else {
      // No worm at click - find nearest worm to click position
      const nearestWorm = this._findNearestWorm(x, y);
      if (nearestWorm) {
        this._chainLightningFromWorm(nearestWorm);
      } else {
        console.log(`⚠️ No worms to target!`);
        // Refund the power-up
        this.inventory.chainLightning++;
        this._showTooltip("No worms to target!", "warning");
      }
    }
  };

  /**
   * Execute Spider spawn at position
   * @private
   */
  proto._executeSpider = function(x, y) {
    this.spawnSpider(x, y);
  };

  /**
   * Execute Devil spawn at position
   * @private
   */
  proto._executeDevil = function(x, y) {
    this.spawnDevil(x, y);
  };

  /**
   * Find worm at or near click position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Worm data or null
   * @private
   */
  proto._findWormAtPosition = function(x, y) {
    const threshold = 50; // Click tolerance in pixels
    // REFACTORED: Use shared calculateDistance utility from utils.js
    return this.wormSystem.worms.find((w) => {
      if (!w.active) return false;
      const dist = calculateDistance(w.x, w.y, x, y);
      return dist < threshold;
    });
  };

  /**
   * Find nearest active worm to position
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @returns {Object|null} Worm data or null
   * @private
   */
  proto._findNearestWorm = function(x, y) {
    const activeWorms = this.wormSystem.worms.filter((w) => w.active);
    if (activeWorms.length === 0) return null;

    // REFACTORED: Use shared calculateDistance utility from utils.js
    return activeWorms.reduce((nearest, worm) => {
      const distCurrent = calculateDistance(worm.x, worm.y, x, y);
      const distNearest = nearest
        ? calculateDistance(nearest.x, nearest.y, x, y)
        : Infinity;
      return distCurrent < distNearest ? worm : nearest;
    }, null);
  };

  /**
   * Execute chain lightning from a specific worm
   * @param {Object} worm - Starting worm
   * @private
   */
  proto._chainLightningFromWorm = function(worm) {
    const killCount = this.chainLightningKillCount;
    console.log(
      `⚡ Chain Lightning targeting worm ${worm.id}! Will kill ${killCount} worms`,
    );

    // Find closest worms
    // REFACTORED: Use shared calculateDistance utility from utils.js
    const sortedWorms = this.wormSystem.worms
      .filter((w) => w.active)
      .sort((a, b) => {
        const distA = calculateDistance(a.x, a.y, worm.x, worm.y);
        const distB = calculateDistance(b.x, b.y, worm.x, worm.y);
        return distA - distB;
      })
      .slice(0, killCount);

    console.log(`⚡ Killing ${sortedWorms.length} worms with chain lightning!`);

    // Kill with delay for visual effect
    sortedWorms.forEach((targetWorm, index) => {
      setTimeout(() => {
        if (targetWorm.active) {
          this.createLightningBolt(worm.x, worm.y, targetWorm.x, targetWorm.y);
          this.wormSystem.createExplosionFlash("#00ffff");
          this.wormSystem.explodeWorm(targetWorm, false, true);
        }
      }, index * 100);
    });

    // Reset kill count back to 5
    this.chainLightningKillCount = 5;
  };
})();
