// worm/behavior/RushingState.js - Rushing to target behavior state
// SOLID: Single Responsibility - Only handles rushing behavior
(function() {
  "use strict";

  /**
   * RushingState - Worm rushes toward a target symbol
   */
  class RushingState extends window.WormState {
    name = "rushing";

    /** @type {number} */
    _rushSpeedMultiplier = 2.0;

    /** @type {number} */
    _stealDistance = 30;

    /** @type {Object|null} */
    _targetElement = null;

    /**
     * Create rushing state
     * @param {Object} [config] - Configuration
     * @param {number} [config.rushSpeedMultiplier] - Speed multiplier when rushing
     * @param {number} [config.stealDistance] - Distance to steal symbol
     */
    constructor(config = {}) {
      super();
      this._rushSpeedMultiplier = config.rushSpeedMultiplier || 2.0;
      this._stealDistance = config.stealDistance || 30;
    }

    /**
     * Called when entering rushing state
     * @param {Object} worm - Worm data object
     * @param {Object} [params] - Optional parameters
     */
    enter(worm, params = {}) {
      worm.isRushingToTarget = true;
      this._targetElement = params.targetElement || null;

      this.emit(window.WormEvents?.TARGET_ACQUIRED, {
        wormId: worm.id,
        targetSymbol: worm.targetSymbol,
      });
    }

    /**
     * Update rushing behavior
     * @param {Object} worm - Worm data object
     * @param {number} deltaTime - Time since last frame
     * @returns {string|null} Next state or null to stay
     */
    update(worm, deltaTime) {
      // Check for devil attraction (higher priority)
      if (worm.isRushingToDevil) {
        return "devil";
      }

      // Check if already stolen
      if (worm.hasStolen) {
        return "carrying";
      }

      // Get target position
      const target = this._getTargetPosition(worm);

      if (!target) {
        // No target available, return to roaming
        worm.roamingEndTime = Date.now() + 5000;
        return "roaming";
      }

      // Calculate distance to target
      const dx = target.x - worm.x;
      const dy = target.y - worm.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      // Check if close enough to steal
      if (distance < this._stealDistance) {
        return "stealing";
      }

      // Move toward target
      this._moveTowardTarget(worm, target, distance);

      return null;
    }

    /**
     * Called when exiting rushing state
     * @param {Object} worm - Worm data object
     */
    exit(worm) {
      this._targetElement = null;
    }

    /**
     * Get target position
     * @param {Object} worm - Worm data object
     * @returns {{x: number, y: number, element: HTMLElement}|null}
     * @private
     */
    _getTargetPosition(worm) {
      // Use cached target element if available
      if (this._targetElement && this._targetElement.parentNode) {
        const rect = this._targetElement.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          element: this._targetElement,
        };
      }

      // Return devil position if rushing to devil
      if (worm.devilX !== undefined && worm.devilY !== undefined) {
        return { x: worm.devilX, y: worm.devilY, element: null };
      }

      return null;
    }

    /**
     * Move worm toward target
     * @param {Object} worm - Worm data object
     * @param {{x: number, y: number}} target - Target position
     * @param {number} distance - Distance to target
     * @private
     */
    _moveTowardTarget(worm, target, distance) {
      if (distance === 0) return;

      const dx = target.x - worm.x;
      const dy = target.y - worm.y;

      // Calculate rush speed
      const rushSpeed = worm.baseSpeed * this._rushSpeedMultiplier;

      // Update velocity
      worm.velocityX = (dx / distance) * rushSpeed;
      worm.velocityY = (dy / distance) * rushSpeed;

      // Update direction
      worm.direction = Math.atan2(dy, dx);

      // Update position
      worm.x += worm.velocityX;
      worm.y += worm.velocityY;
    }
  }

  // Attach to window
  window.RushingState = RushingState;

  console.log("✅ RushingState module loaded");
})();
