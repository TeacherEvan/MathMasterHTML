// js/worm-behavior-fsm.js - Finite State Machine for Worm Behavior
// ARCHITECTURAL IMPROVEMENT: Replaces string-based state comparison with explicit FSM pattern
// Provides state transition logging for debugging and ensures valid state transitions
console.log("🧠 Worm Behavior FSM Loading...");

/**
 * WormBehaviorState - Enumeration of valid worm behavior states
 * Using frozen object to prevent accidental modification
 */
const WormBehaviorState = Object.freeze({
  IDLE: "idle",
  ROAMING: "roaming",
  RUSHING: "rushing",
  STEALING: "stealing",
  CARRYING: "carrying",
  ESCAPING: "escaping",
  DEVIL_ATTRACTED: "devilAttracted",
  DEAD: "dead",
});

/**
 * StateTransition - Represents a single state transition
 * @typedef {Object} StateTransition
 * @property {string} fromState - Source state
 * @property {string} toState - Target state
 * @property {string} trigger - Event that caused transition
 * @property {number} timestamp - When transition occurred
 * @property {Object} data - Additional transition data
 */

/**
 * WormBehaviorFSM - Finite State Machine for worm behavior
 *
 * ARCHITECTURAL IMPROVEMENTS:
 * 1. Explicit state transitions (no string comparison anti-pattern)
 * 2. State transition logging for debugging
 * 3. Guard conditions for valid transitions
 * 4. Enter/Exit callbacks for state lifecycle
 */
class WormBehaviorFSM {
  /**
   * Create a new behavior FSM
   * @param {Object} config - Configuration options
   * @param {Object} config.system - Reference to WormSystem
   * @param {Object} [config.logger] - Logger instance
   * @param {boolean} [config.enableLogging] - Enable transition logging
   */
  constructor(config = {}) {
    this.system = config.system;
    this.logger = config.logger || console;
    this._enableLogging = config.enableLogging !== false;

    // Current state
    this._currentState = WormBehaviorState.IDLE;

    // State history for debugging (max 50 entries)
    this._transitionHistory = [];
    this._maxHistorySize = 50;

    // Define valid state transitions (adjacency list)
    // This ensures only valid transitions can occur
    this._validTransitions = new Map([
      [
        WormBehaviorState.IDLE,
        [
          WormBehaviorState.ROAMING,
          WormBehaviorState.RUSHING,
          WormBehaviorState.DEAD,
        ],
      ],
      [
        WormBehaviorState.ROAMING,
        [
          WormBehaviorState.RUSHING,
          WormBehaviorState.DEVIL_ATTRACTED,
          WormBehaviorState.DEAD,
        ],
      ],
      [
        WormBehaviorState.RUSHING,
        [
          WormBehaviorState.STEALING,
          WormBehaviorState.ROAMING,
          WormBehaviorState.DEVIL_ATTRACTED,
          WormBehaviorState.DEAD,
        ],
      ],
      [
        WormBehaviorState.STEALING,
        [
          WormBehaviorState.CARRYING,
          WormBehaviorState.ROAMING,
          WormBehaviorState.DEAD,
        ],
      ],
      [
        WormBehaviorState.CARRYING,
        [WormBehaviorState.ESCAPING, WormBehaviorState.DEAD],
      ],
      [WormBehaviorState.ESCAPING, [WormBehaviorState.DEAD]],
      [
        WormBehaviorState.DEVIL_ATTRACTED,
        [
          WormBehaviorState.ROAMING,
          WormBehaviorState.RUSHING,
          WormBehaviorState.DEAD,
        ],
      ],
      [WormBehaviorState.DEAD, []], // Terminal state
    ]);

    // State handlers (injected via setHandlers)
    this._handlers = new Map();

    // Vector cache for GC optimization (reused during updates)
    this._vectorCache = {
      velocity: { x: 0, y: 0 },
      direction: 0,
      distance: 0,
    };

    if (this._enableLogging) {
      this.logger.log(
        "🧠 WormBehaviorFSM initialized with states:",
        Object.values(WormBehaviorState).join(", "),
      );
    }
  }

  /**
   * Get current state name
   * @returns {string} Current state
   */
  get currentState() {
    return this._currentState;
  }

  /**
   * Check if FSM is in a specific state
   * @param {string} state - State to check
   * @returns {boolean}
   */
  isInState(state) {
    return this._currentState === state;
  }

  /**
   * Check if transition is valid
   * @param {string} fromState - Source state
   * @param {string} toState - Target state
   * @returns {boolean}
   */
  isValidTransition(fromState, toState) {
    const allowedTargets = this._validTransitions.get(fromState);
    return allowedTargets ? allowedTargets.includes(toState) : false;
  }

  /**
   * Set state handlers for enter/exit callbacks
   * @param {string} state - State name
   * @param {Object} handlers - Handler functions
   * @param {Function} [handlers.enter] - Called when entering state
   * @param {Function} [handlers.update] - Called each frame in state
   * @param {Function} [handlers.exit] - Called when exiting state
   */
  setHandlers(state, handlers) {
    this._handlers.set(state, {
      enter: handlers.enter || null,
      update: handlers.update || null,
      exit: handlers.exit || null,
    });
  }

  /**
   * Transition to a new state
   * @param {string} newState - Target state
   * @param {Object} [data] - Additional transition data
   * @param {string} [trigger] - Event that triggered transition
   * @returns {boolean} True if transition succeeded
   */
  transitionTo(newState, data = {}, trigger = "unknown") {
    const fromState = this._currentState;

    // Validate transition
    if (!this.isValidTransition(fromState, newState)) {
      this._logTransition(
        fromState,
        newState,
        trigger,
        false,
        "Invalid transition",
      );
      if (this._enableLogging) {
        this.logger.warn(
          `⚠️ Invalid state transition: ${fromState} → ${newState} (trigger: ${trigger})`,
        );
      }
      return false;
    }

    // Execute exit handler for current state
    const currentHandlers = this._handlers.get(fromState);
    if (currentHandlers && currentHandlers.exit) {
      try {
        currentHandlers.exit(data);
      } catch (error) {
        this.logger.error(`Error in exit handler for ${fromState}:`, error);
      }
    }

    // Update state
    this._currentState = newState;

    // Log successful transition
    this._logTransition(fromState, newState, trigger, true);

    // Execute enter handler for new state
    const newHandlers = this._handlers.get(newState);
    if (newHandlers && newHandlers.enter) {
      try {
        newHandlers.enter(data);
      } catch (error) {
        this.logger.error(`Error in enter handler for ${newState}:`, error);
      }
    }

    return true;
  }

  /**
   * Force state transition (bypasses validation)
   * Use only for error recovery or testing
   * @param {string} newState - Target state
   * @param {Object} [data] - Additional transition data
   */
  forceState(newState, data = {}) {
    const fromState = this._currentState;
    this._currentState = newState;
    this._logTransition(fromState, newState, "forced", true);

    if (this._enableLogging) {
      this.logger.warn(
        `⚠️ Forced state transition: ${fromState} → ${newState}`,
      );
    }
  }

  /**
   * Update current state
   * @param {Object} worm - Worm data object
   * @param {number} deltaTime - Time since last frame
   * @returns {string|null} New state if transition requested, null otherwise
   */
  update(worm, deltaTime) {
    const handlers = this._handlers.get(this._currentState);

    if (handlers && handlers.update) {
      try {
        const nextState = handlers.update(worm, deltaTime, this._vectorCache);

        if (nextState && nextState !== this._currentState) {
          this.transitionTo(nextState, { worm }, "update");
        }

        return this._currentState;
      } catch (error) {
        this.logger.error(
          `Error in update handler for ${this._currentState}:`,
          error,
        );
        return null;
      }
    }

    return null;
  }

  /**
   * Get transition history
   * @returns {StateTransition[]} Array of transitions
   */
  getHistory() {
    return [...this._transitionHistory];
  }

  /**
   * Get last N transitions
   * @param {number} count - Number of transitions to return
   * @returns {StateTransition[]}
   */
  getRecentTransitions(count = 10) {
    return this._transitionHistory.slice(-count);
  }

  /**
   * Clear transition history
   */
  clearHistory() {
    this._transitionHistory = [];
  }

  /**
   * Reset FSM to initial state
   */
  reset() {
    this._currentState = WormBehaviorState.IDLE;
    this._transitionHistory = [];

    // Reset vector cache
    this._vectorCache.velocity.x = 0;
    this._vectorCache.velocity.y = 0;
    this._vectorCache.direction = 0;
    this._vectorCache.distance = 0;

    if (this._enableLogging) {
      this.logger.log("🧠 WormBehaviorFSM reset to IDLE state");
    }
  }

  /**
   * Log a state transition
   * @param {string} fromState - Source state
   * @param {string} toState - Target state
   * @param {string} trigger - Event that triggered transition
   * @param {boolean} success - Whether transition succeeded
   * @param {string} [reason] - Reason for failure (if applicable)
   * @private
   */
  _logTransition(fromState, toState, trigger, success, reason = null) {
    const transition = {
      fromState,
      toState,
      trigger,
      success,
      reason,
      timestamp: Date.now(),
    };

    this._transitionHistory.push(transition);

    // Trim history if needed
    if (this._transitionHistory.length > this._maxHistorySize) {
      this._transitionHistory.shift();
    }

    // Dispatch custom event for external logging/debugging
    if (typeof document !== "undefined") {
      document.dispatchEvent(
        new CustomEvent("wormStateTransition", {
          detail: transition,
        }),
      );
    }
  }

  /**
   * Get state transition diagram as string (for debugging)
   * @returns {string} ASCII diagram of valid transitions
   */
  getTransitionDiagram() {
    let diagram = "Worm Behavior State Transitions:\n";
    diagram += "================================\n";

    for (const [state, targets] of this._validTransitions) {
      const arrows =
        targets.length > 0 ? ` → ${targets.join(", ")}` : " (terminal)";
      diagram += `${state}${arrows}\n`;
    }

    return diagram;
  }

  /**
   * Get current state info for debugging
   * @returns {Object} State information
   */
  getDebugInfo() {
    return {
      currentState: this._currentState,
      validNextStates: this._validTransitions.get(this._currentState) || [],
      recentTransitions: this.getRecentTransitions(5),
      historySize: this._transitionHistory.length,
    };
  }
}

// Export state enumeration
WormBehaviorFSM.State = WormBehaviorState;

// Attach to window for global access (maintaining backward compatibility)
if (typeof window !== "undefined") {
  window.WormBehaviorFSM = WormBehaviorFSM;
  window.WormBehaviorState = WormBehaviorState;
}

console.log("✅ Worm Behavior FSM Module Loaded");
