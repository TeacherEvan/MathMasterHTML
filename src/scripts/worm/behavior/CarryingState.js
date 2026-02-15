// worm/behavior/CarryingState.js - Carrying stolen symbol behavior state
// SOLID: Single Responsibility - Only handles carrying behavior
(function() {
  "use strict";

  /**
   * CarryingState - Worm carries a stolen symbol and exits the screen
   */
  class CarryingState extends window.WormState {
    name = "carrying";

    /** @type {number} */
    _exitSpeedMultiplier = 1.5;

    /** @type {string|null} */
    _exitDirection = null;

    /** @type {Object|null} */
    _stolenSymbol = null;

    /**
     * Create carrying state
     * @param {Object} [config] - Configuration
     * @param {number} [config.exitSpeedMultiplier] - Speed multiplier when exiting
     */
    constructor(config = {}) {
      super();
      this._exitSpeedMultiplier = config.exitSpeedMultiplier || 1.5;
    }

    /**
     * Called when entering carrying state
     * @param {Object} worm - Worm data object
     * @param {Object} [params] - Optional parameters
     */
    enter(worm, params = {}) {
      this._stolenSymbol = params.stolenSymbol || worm.stolenSymbol || null;

      // Determine exit direction (toward nearest edge)
      this._exitDirection = this._determineExitDirection(worm);

      // Set worm as having stolen
      worm.hasStolen = true;
      worm.isRushingToTarget = false;

      this.emit(window.WormEvents?.SYMBOL_STOLEN, {
        wormId: worm.id,
        symbol: this._stolenSymbol,
      });

      this.emit(window.WormEvents?.STATE_PUSH, {
        wormId: worm.id,
        state: "carrying",
      });
    }

    /**
     * Update carrying behavior
     * @param {Object} worm - Worm data object
     * @param {number} deltaTime - Time since last frame
     * @returns {string|null} Next state or null to stay
     */
    update(worm, deltaTime) {
      // Move toward exit
      this._moveTowardExit(worm);

      // Check if worm has exited the screen
      if (this._hasExitedScreen(worm)) {
        return "exiting"; // Transition to removal state
      }

      return null;
    }

    /**
     * Called when exiting carrying state
     * @param {Object} worm - Worm data object
     */
    exit(worm) {
      this._stolenSymbol = null;
      this._exitDirection = null;

      this.emit(window.WormEvents?.STATE_POP, {
        wormId: worm.id,
        state: "carrying",
      });
    }

    /**
     * Determine the best exit direction
     * @param {Object} worm - Worm data object
     * @returns {string} Exit direction ('left', 'right', 'top', 'bottom')
     * @private
     */
    _determineExitDirection(worm) {
      const bounds = this._getScreenBounds();
      const distances = {
        left: worm.x,
        right: bounds.width - worm.x,
        top: worm.y,
        bottom: bounds.height - worm.y,
      };

      // Find nearest edge
      let minDist = Infinity;
      let nearest = "right";

      for (const [direction, distance] of Object.entries(distances)) {
        if (distance < minDist) {
          minDist = distance;
          nearest = direction;
        }
      }

      return nearest;
    }

    /**
     * Get screen bounds
     * @returns {{width: number, height: number}}
     * @private
     */
    _getScreenBounds() {
      return {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight,
      };
    }

    /**
     * Move worm toward exit
     * @param {Object} worm - Worm data object
     * @private
     */
    _moveTowardExit(worm) {
      const bounds = this._getScreenBounds();
      let targetX = worm.x;
      let targetY = worm.y;

      // Set target based on exit direction
      switch (this._exitDirection) {
        case "left":
          targetX = -100;
          targetY = worm.y;
          break;
        case "right":
          targetX = bounds.width + 100;
          targetY = worm.y;
          break;
        case "top":
          targetX = worm.x;
          targetY = -100;
          break;
        case "bottom":
          targetX = worm.x;
          targetY = bounds.height + 100;
          break;
      }

      // Calculate direction to target
      const dx = targetX - worm.x;
      const dy = targetY - worm.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 0) {
        const speed = worm.baseSpeed * this._exitSpeedMultiplier;
        worm.velocityX = (dx / distance) * speed;
        worm.velocityY = (dy / distance) * speed;
        worm.direction = Math.atan2(dy, dx);

        // Update position
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
      }
    }

    /**
     * Check if worm has exited the screen
     * @param {Object} worm - Worm data object
     * @returns {boolean}
     * @private
     */
    _hasExitedScreen(worm) {
      const bounds = this._getScreenBounds();
      const margin = 150; // Extra margin for full worm body

      return (
        worm.x < -margin ||
        worm.x > bounds.width + margin ||
        worm.y < -margin ||
        worm.y > bounds.height + margin
      );
    }
  }

  // Attach to window
  window.CarryingState = CarryingState;

  console.log("✅ CarryingState module loaded");
})();
