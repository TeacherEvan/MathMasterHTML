// worm/behavior/StealingState.js - Stealing symbol behavior state
// SOLID: Single Responsibility - Only handles stealing behavior
(function() {
  "use strict";

  /**
   * StealingState - Worm performs the steal action on a target symbol
   * This is a transient state that quickly transitions to carrying
   */
  class StealingState extends window.WormState {
    name = "stealing";

    /** @type {number} */
    _stealDuration = 300; // ms

    /** @type {number|null} */
    _stealStartTime = null;

    /** @type {Object|null} */
    _targetElement = null;

    /** @type {Function|null} */
    _onStealCallback = null;

    /**
     * Create stealing state
     * @param {Object} [config] - Configuration
     * @param {number} [config.stealDuration] - Duration of steal animation in ms
     */
    constructor(config = {}) {
      super();
      this._stealDuration = config.stealDuration || 300;
    }

    /**
     * Called when entering stealing state
     * @param {Object} worm - Worm data object
     * @param {Object} [params] - Optional parameters
     */
    enter(worm, params = {}) {
      this._stealStartTime = Date.now();
      this._targetElement = params.targetElement || worm.targetElement || null;
      this._onStealCallback = params.onStealCallback || null;

      // Stop movement during steal
      worm.velocityX = 0;
      worm.velocityY = 0;

      this.emit(window.WormEvents?.STATE_PUSH, {
        wormId: worm.id,
        state: "stealing",
      });
    }

    /**
     * Update stealing behavior
     * @param {Object} worm - Worm data object
     * @param {number} deltaTime - Time since last frame
     * @returns {string|null} Next state or null to stay
     */
    update(worm, deltaTime) {
      const elapsed = Date.now() - this._stealStartTime;

      // Check if steal animation is complete
      if (elapsed >= this._stealDuration) {
        // Perform the actual steal
        this._performSteal(worm);

        // Transition to carrying state
        return "carrying";
      }

      // Optional: Add steal animation effects here
      this._updateStealAnimation(worm, elapsed / this._stealDuration);

      return null;
    }

    /**
     * Called when exiting stealing state
     * @param {Object} worm - Worm data object
     */
    exit(worm) {
      this._targetElement = null;
      this._onStealCallback = null;
      this._stealStartTime = null;

      this.emit(window.WormEvents?.STATE_POP, {
        wormId: worm.id,
        state: "stealing",
      });
    }

    /**
     * Update steal animation progress
     * @param {Object} worm - Worm data object
     * @param {number} progress - Animation progress (0-1)
     * @private
     */
    _updateStealAnimation(worm, progress) {
      // Optional: Add visual feedback during steal
      // For example, pulse effect on worm
      if (worm.element) {
        const scale = 1 + Math.sin(progress * Math.PI) * 0.1;
        worm.element.style.transform = `scale(${scale})`;
      }
    }

    /**
     * Perform the actual steal action
     * @param {Object} worm - Worm data object
     * @private
     */
    _performSteal(worm) {
      // Mark worm as having stolen
      worm.hasStolen = true;
      worm.stolenSymbol = worm.targetSymbol;

      // Execute callback if provided
      if (this._onStealCallback) {
        try {
          this._onStealCallback(worm, this._targetElement);
        } catch (error) {
          console.error("StealingState: Error in steal callback", error);
        }
      }

      // Emit stolen event
      this.emit(window.WormEvents?.SYMBOL_STOLEN, {
        wormId: worm.id,
        symbol: worm.targetSymbol,
        element: this._targetElement,
      });

      // Clear target references
      worm.targetSymbol = null;
      worm.targetElement = null;

      // Reset transform if applied
      if (worm.element) {
        worm.element.style.transform = "";
      }
    }

    /**
     * Check if this state can transition to another state
     * @param {string} stateName - Target state name
     * @returns {boolean}
     */
    canTransitionTo(stateName) {
      // Stealing is a quick transient state
      // Only allow transition to carrying after steal completes
      return stateName === "carrying";
    }
  }

  // Attach to window
  window.StealingState = StealingState;

  console.log("✅ StealingState module loaded");
})();
