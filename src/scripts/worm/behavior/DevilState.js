// worm/behavior/DevilState.js - Devil attraction behavior state
// SOLID: Single Responsibility - Only handles devil attraction behavior
(function() {
  "use strict";

  /**
   * DevilState - Worm is attracted to a devil power-up
   * This state has higher priority than normal rushing behavior
   */
  class DevilState extends window.WormState {
    name = "devil";

    /** @type {number} */
    _devilSpeedMultiplier = 2.5;

    /** @type {number} */
    _attractionRadius = 200;

    /** @type {Object|null} */
    _devilTarget = null;

    /** @type {number|null} */
    _devilX = null;

    /** @type {number|null} */
    _devilY = null;

    /**
     * Create devil state
     * @param {Object} [config] - Configuration
     * @param {number} [config.devilSpeedMultiplier] - Speed multiplier when attracted
     * @param {number} [config.attractionRadius] - Radius of attraction effect
     */
    constructor(config = {}) {
      super();
      this._devilSpeedMultiplier = config.devilSpeedMultiplier || 2.5;
      this._attractionRadius = config.attractionRadius || 200;
    }

    /**
     * Called when entering devil state
     * @param {Object} worm - Worm data object
     * @param {Object} [params] - Optional parameters
     */
    enter(worm, params = {}) {
      this._devilTarget = params.devilTarget || null;
      this._devilX = params.devilX ?? worm.devilX ?? null;
      this._devilY = params.devilY ?? worm.devilY ?? null;

      worm.isRushingToDevil = true;
      worm.isRushingToTarget = false;

      this.emit(window.WormEvents?.TARGET_ACQUIRED, {
        wormId: worm.id,
        targetType: "devil",
        devilX: this._devilX,
        devilY: this._devilY,
      });

      this.emit(window.WormEvents?.STATE_PUSH, {
        wormId: worm.id,
        state: "devil",
      });
    }

    /**
     * Update devil attraction behavior
     * @param {Object} worm - Worm data object
     * @param {number} deltaTime - Time since last frame
     * @returns {string|null} Next state or null to stay
     */
    update(worm, deltaTime) {
      // Check if devil still exists
      if (!this._isDevilActive(worm)) {
        // Devil no longer active, return to previous behavior
        worm.isRushingToDevil = false;

        if (worm.hasStolen) {
          return "carrying";
        } else if (worm.targetSymbol) {
          return "rushing";
        } else {
          worm.roamingEndTime = Date.now() + 5000;
          return "roaming";
        }
      }

      // Get devil position
      const devilPos = this._getDevilPosition(worm);

      if (!devilPos) {
        worm.isRushingToDevil = false;
        return "roaming";
      }

      // Move toward devil
      this._moveTowardDevil(worm, devilPos);

      // Check if reached devil
      const distance = this._getDistanceToDevil(worm, devilPos);
      if (distance < 30) {
        return "devilReached";
      }

      return null;
    }

    /**
     * Called when exiting devil state
     * @param {Object} worm - Worm data object
     */
    exit(worm) {
      worm.isRushingToDevil = false;
      this._devilTarget = null;
      this._devilX = null;
      this._devilY = null;

      this.emit(window.WormEvents?.STATE_POP, {
        wormId: worm.id,
        state: "devil",
      });
    }

    /**
     * Check if devil is still active
     * @param {Object} worm - Worm data object
     * @returns {boolean}
     * @private
     */
    _isDevilActive(worm) {
      // Check if devil target element still exists
      if (this._devilTarget && this._devilTarget.parentNode) {
        return true;
      }

      // Check if devil coordinates are set
      if (this._devilX !== null && this._devilY !== null) {
        return true;
      }

      // Check worm's devil reference
      if (worm.devilActive) {
        return true;
      }

      return false;
    }

    /**
     * Get devil position
     * @param {Object} worm - Worm data object
     * @returns {{x: number, y: number}|null}
     * @private
     */
    _getDevilPosition(worm) {
      // Use cached coordinates if available
      if (this._devilX !== null && this._devilY !== null) {
        return { x: this._devilX, y: this._devilY };
      }

      // Get from devil target element
      if (this._devilTarget && this._devilTarget.parentNode) {
        const rect = this._devilTarget.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }

      // Get from worm's devil reference
      if (worm.devilX !== undefined && worm.devilY !== undefined) {
        return { x: worm.devilX, y: worm.devilY };
      }

      return null;
    }

    /**
     * Move worm toward devil
     * @param {Object} worm - Worm data object
     * @param {{x: number, y: number}} devilPos - Devil position
     * @private
     */
    _moveTowardDevil(worm, devilPos) {
      const dx = devilPos.x - worm.x;
      const dy = devilPos.y - worm.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) return;

      // Calculate devil attraction speed
      const speed = worm.baseSpeed * this._devilSpeedMultiplier;

      // Update velocity
      worm.velocityX = (dx / distance) * speed;
      worm.velocityY = (dy / distance) * speed;

      // Update direction
      worm.direction = Math.atan2(dy, dx);

      // Update position
      worm.x += worm.velocityX;
      worm.y += worm.velocityY;
    }

    /**
     * Get distance to devil
     * @param {Object} worm - Worm data object
     * @param {{x: number, y: number}} devilPos - Devil position
     * @returns {number}
     * @private
     */
    _getDistanceToDevil(worm, devilPos) {
      const dx = devilPos.x - worm.x;
      const dy = devilPos.y - worm.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Check if this state can transition to another state
     * @param {string} stateName - Target state name
     * @returns {boolean}
     */
    canTransitionTo(stateName) {
      // Devil state has high priority - can transition to most states
      return ["roaming", "rushing", "carrying", "devilReached"].includes(
        stateName,
      );
    }
  }

  // Attach to window
  window.DevilState = DevilState;

  console.log("✅ DevilState module loaded");
})();
