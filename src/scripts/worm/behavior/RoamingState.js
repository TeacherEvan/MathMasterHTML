// worm/behavior/RoamingState.js - Roaming behavior state
// SOLID: Single Responsibility - Only handles roaming behavior
(function() {
  "use strict";

  /**
   * RoamingState - Worm wanders randomly until timeout or target found
   */
  class RoamingState extends window.WormState {
    name = "roaming";

    /** @type {number} */
    _directionChangeRate = 0.1;

    /** @type {number} */
    _crawlAmplitude = 0.5;

    /** @type {number} */
    _crawlPhaseIncrement = 0.05;

    /**
     * Create roaming state
     * @param {Object} [config] - Configuration
     * @param {number} [config.directionChangeRate] - Rate of direction changes
     * @param {number} [config.crawlAmplitude] - Crawl animation amplitude
     */
    constructor(config = {}) {
      super();
      this._directionChangeRate = config.directionChangeRate || 0.1;
      this._crawlAmplitude = config.crawlAmplitude || 0.5;
      this._crawlPhaseIncrement = config.crawlPhaseIncrement || 0.05;
    }

    /**
     * Called when entering roaming state
     * @param {Object} worm - Worm data object
     * @param {Object} [params] - Optional parameters
     */
    enter(worm, params = {}) {
      worm.isRushingToTarget = false;

      // Set roaming end time if provided
      if (params.roamingEndTime) {
        worm.roamingEndTime = params.roamingEndTime;
      }

      this.emit(window.WormEvents?.STATE_PUSH, {
        wormId: worm.id,
        state: "roaming",
      });
    }

    /**
     * Update roaming behavior
     * @param {Object} worm - Worm data object
     * @param {number} deltaTime - Time since last frame
     * @returns {string|null} Next state or null to stay
     */
    update(worm, deltaTime) {
      const currentTime = Date.now();

      // Check for roaming timeout
      if (currentTime >= worm.roamingEndTime && !worm.hasStolen) {
        return "rushing";
      }

      // Check for target acquisition
      if (worm.targetSymbol || worm.isRushingToTarget) {
        return "rushing";
      }

      // Check for devil attraction
      if (worm.isRushingToDevil) {
        return "devil";
      }

      // Apply roaming movement
      this._applyRoamingMovement(worm);

      // Update crawl animation
      worm.crawlPhase += this._crawlPhaseIncrement;
      if (worm.crawlPhase > Math.PI * 2) {
        worm.crawlPhase -= Math.PI * 2;
      }

      return null;
    }

    /**
     * Called when exiting roaming state
     * @param {Object} worm - Worm data object
     */
    exit(worm) {
      this.emit(window.WormEvents?.STATE_POP, {
        wormId: worm.id,
        state: "roaming",
      });
    }

    /**
     * Apply roaming movement to worm
     * @param {Object} worm - Worm data object
     * @private
     */
    _applyRoamingMovement(worm) {
      // Random direction changes for organic movement
      if (Math.random() < this._directionChangeRate) {
        worm.direction += ((Math.random() - 0.5) * Math.PI) / 4;
      }

      // Calculate crawl offset
      const crawlOffset = Math.sin(worm.crawlPhase) * this._crawlAmplitude;

      // Update velocity based on direction
      worm.velocityX = Math.cos(worm.direction) * worm.currentSpeed;
      worm.velocityY = Math.sin(worm.direction) * worm.currentSpeed;

      // Apply crawl offset perpendicular to direction
      worm.velocityX += Math.cos(worm.direction + Math.PI / 2) * crawlOffset;
      worm.velocityY += Math.sin(worm.direction + Math.PI / 2) * crawlOffset;

      // Update position
      worm.x += worm.velocityX;
      worm.y += worm.velocityY;
    }
  }

  // Attach to window
  window.RoamingState = RoamingState;

  console.log("✅ RoamingState module loaded");
})();
