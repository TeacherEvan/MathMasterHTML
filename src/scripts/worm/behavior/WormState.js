// worm/behavior/WormState.js - Base class for worm behavior states
// SOLID: Open/Closed - New states can be added without modifying existing code
(function() {
  "use strict";

  /**
   * WormState - Abstract base class for behavior states
   * Implements the State Pattern for clean behavior transitions
   */
  class WormState {
    /** @type {string} */
    name = "base";

    /** @type {Object|null} */
    context = null;

    /**
     * Called when entering this state
     * @param {Object} worm - Worm data object
     * @param {Object} [params] - Optional parameters
     */
    enter(worm, params = {}) {
      // Override in subclass
    }

    /**
     * Called every frame while in this state
     * @param {Object} worm - Worm data object
     * @param {number} deltaTime - Time since last frame in ms
     * @returns {string|null} New state name or null to stay
     */
    update(worm, deltaTime) {
      // Override in subclass
      return null;
    }

    /**
     * Called when exiting this state
     * @param {Object} worm - Worm data object
     */
    exit(worm) {
      // Override in subclass
    }

    /**
     * Check if this state can transition to another state
     * @param {string} stateName - Target state name
     * @returns {boolean}
     */
    canTransitionTo(stateName) {
      return true; // Override in subclass for restricted transitions
    }

    /**
     * Set the state context (reference to state machine)
     * @param {Object} context
     */
    setContext(context) {
      this.context = context;
    }

    /**
     * Emit an event through the context
     * @param {string} eventName
     * @param {any} [payload]
     */
    emit(eventName, payload) {
      if (this.context && this.context.eventBus) {
        this.context.eventBus.emit(eventName, payload);
      }
    }
  }

  // Attach to window
  window.WormState = WormState;

  console.log("✅ WormState module loaded");
})();
