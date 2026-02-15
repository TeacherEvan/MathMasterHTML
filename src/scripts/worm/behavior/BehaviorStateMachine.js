// worm/behavior/BehaviorStateMachine.js - State machine for worm behavior
// SOLID: Single Responsibility - Only manages state transitions
(function() {
  "use strict";

  /**
   * BehaviorStateMachine - Manages worm behavior states
   * Implements State Pattern for clean behavior management
   */
  class BehaviorStateMachine {
    /** @type {Map<string, WormState>} */
    _states = new Map();

    /** @type {WormState|null} */
    _currentState = null;

    /** @type {Object|null} */
    _worm = null;

    /** @type {EventBus|null} */
    eventBus = null;

    /** @type {Object|null} */
    movement = null;

    /** @type {Object|null} */
    collision = null;

    /** @type {Array<{state: string, timestamp: number}>} */
    _history = [];

    /** @type {number} */
    _maxHistorySize = 20;

    /**
     * Create a new behavior state machine
     * @param {Object} [config] - Configuration options
     * @param {EventBus} [config.eventBus] - Event bus for events
     * @param {Object} [config.movement] - Movement controller
     * @param {Object} [config.collision] - Collision detector
     */
    constructor(config = {}) {
      this.eventBus = config.eventBus || null;
      this.movement = config.movement || null;
      this.collision = config.collision || null;
    }

    /**
     * Register a state
     * @param {string} name - State name
     * @param {WormState} state - State instance
     */
    registerState(name, state) {
      state.setContext(this);
      this._states.set(name, state);
    }

    /**
     * Initialize the state machine for a worm
     * @param {Object} worm - Worm data object
     * @param {string} [initialState='roaming'] - Initial state name
     */
    initialize(worm, initialState = "roaming") {
      this._worm = worm;
      this._currentState = null;
      this._history = [];

      if (this._states.has(initialState)) {
        this.transitionTo(initialState);
      }
    }

    /**
     * Transition to a new state
     * @param {string} stateName - Target state name
     * @param {Object} [params] - Parameters to pass to enter()
     * @returns {boolean} True if transition succeeded
     */
    transitionTo(stateName, params = {}) {
      const newState = this._states.get(stateName);

      if (!newState) {
        console.warn(`⚠️ BehaviorStateMachine: Unknown state "${stateName}"`);
        return false;
      }

      // Check if current state allows transition
      if (
        this._currentState &&
        !this._currentState.canTransitionTo(stateName)
      ) {
        console.warn(
          `⚠️ BehaviorStateMachine: Cannot transition from "${this._currentState.name}" to "${stateName}"`,
        );
        return false;
      }

      // Exit current state
      if (this._currentState) {
        this._currentState.exit(this._worm);
      }

      // Record in history
      this._history.push({
        state: stateName,
        timestamp: Date.now(),
      });

      // Trim history
      if (this._history.length > this._maxHistorySize) {
        this._history.shift();
      }

      // Enter new state
      this._currentState = newState;
      this._currentState.enter(this._worm, params);

      // Emit event
      if (this.eventBus && window.WormEvents) {
        this.eventBus.emit(window.WormEvents.BEHAVIOR_CHANGED, {
          wormId: this._worm.id,
          newState: stateName,
          previousState:
            this._history.length > 1
              ? this._history[this._history.length - 2].state
              : null,
        });
      }

      return true;
    }

    /**
     * Update the current state
     * @param {number} deltaTime - Time since last frame in ms
     */
    update(deltaTime) {
      if (!this._currentState || !this._worm) return;

      const nextState = this._currentState.update(this._worm, deltaTime);

      if (nextState && nextState !== this._currentState.name) {
        this.transitionTo(nextState);
      }
    }

    /**
     * Get the current state name
     * @returns {string|null}
     */
    getCurrentStateName() {
      return this._currentState ? this._currentState.name : null;
    }

    /**
     * Get the current state
     * @returns {WormState|null}
     */
    getCurrentState() {
      return this._currentState;
    }

    /**
     * Check if in a specific state
     * @param {string} stateName - State name to check
     * @returns {boolean}
     */
    isInState(stateName) {
      return this._currentState && this._currentState.name === stateName;
    }

    /**
     * Get state transition history
     * @returns {Array<{state: string, timestamp: number}>}
     */
    getHistory() {
      return [...this._history];
    }

    /**
     * Get the previous state name
     * @returns {string|null}
     */
    getPreviousStateName() {
      if (this._history.length < 2) return null;
      return this._history[this._history.length - 2].state;
    }

    /**
     * Force a state transition (bypasses canTransitionTo check)
     * @param {string} stateName - Target state name
     * @param {Object} [params] - Parameters to pass to enter()
     */
    forceTransition(stateName, params = {}) {
      const newState = this._states.get(stateName);

      if (!newState) {
        console.warn(`⚠️ BehaviorStateMachine: Unknown state "${stateName}"`);
        return;
      }

      // Exit current state
      if (this._currentState) {
        this._currentState.exit(this._worm);
      }

      // Record in history
      this._history.push({
        state: stateName,
        timestamp: Date.now(),
      });

      // Enter new state
      this._currentState = newState;
      this._currentState.enter(this._worm, params);
    }

    /**
     * Reset the state machine
     */
    reset() {
      if (this._currentState && this._worm) {
        this._currentState.exit(this._worm);
      }
      this._currentState = null;
      this._worm = null;
      this._history = [];
    }

    /**
     * Get all registered state names
     * @returns {string[]}
     */
    getRegisteredStates() {
      return Array.from(this._states.keys());
    }
  }

  // Attach to window
  window.BehaviorStateMachine = BehaviorStateMachine;

  console.log("✅ BehaviorStateMachine module loaded");
})();
