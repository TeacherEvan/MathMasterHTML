// worm/core/EventBus.js - Event Bus for decoupled communication
// SOLID: Single Responsibility - Only handles event routing
(function() {
  "use strict";

  /**
   * EventBus - Publish/Subscribe pattern for decoupled module communication
   * Supports one-time subscriptions, priority listeners, and event history
   */
  class EventBus {
    constructor() {
      /** @type {Map<string, Array<{handler: Function, priority: number}>>} */
      this._listeners = new Map();
      /** @type {Array<{event: string, payload: any, timestamp: number}>} */
      this._history = [];
      this._maxHistorySize = 100;
      this._debugMode = false;
    }

    /**
     * Subscribe to an event
     * @param {string} eventName - Event to subscribe to
     * @param {Function} handler - Event handler
     * @param {number} [priority=0] - Higher priority = called first
     * @returns {Function} Unsubscribe function
     */
    on(eventName, handler, priority = 0) {
      if (!this._listeners.has(eventName)) {
        this._listeners.set(eventName, []);
      }

      const listeners = this._listeners.get(eventName);
      const listener = { handler, priority };

      // Insert sorted by priority (descending)
      const insertIndex = listeners.findIndex((l) => l.priority < priority);
      if (insertIndex === -1) {
        listeners.push(listener);
      } else {
        listeners.splice(insertIndex, 0, listener);
      }

      if (this._debugMode) {
        console.log(`📡 EventBus: Subscribed to "${eventName}"`);
      }

      // Return unsubscribe function
      return () => this.off(eventName, handler);
    }

    /**
     * Subscribe to an event once
     * @param {string} eventName - Event to subscribe to
     * @param {Function} handler - Event handler
     * @returns {Function} Unsubscribe function
     */
    once(eventName, handler) {
      const wrapper = (payload) => {
        this.off(eventName, wrapper);
        handler(payload);
      };
      return this.on(eventName, wrapper);
    }

    /**
     * Unsubscribe from an event
     * @param {string} eventName - Event to unsubscribe from
     * @param {Function} handler - Handler to remove
     */
    off(eventName, handler) {
      const listeners = this._listeners.get(eventName);
      if (!listeners) return;

      const index = listeners.findIndex((l) => l.handler === handler);
      if (index !== -1) {
        listeners.splice(index, 1);
        if (this._debugMode) {
          console.log(`📡 EventBus: Unsubscribed from "${eventName}"`);
        }
      }
    }

    /**
     * Emit an event to all subscribers
     * @param {string} eventName - Event to emit
     * @param {any} [payload] - Event payload
     */
    emit(eventName, payload) {
      if (this._debugMode) {
        console.log(`📡 EventBus: Emitting "${eventName}"`, payload);
      }

      // Record in history
      this._history.push({
        event: eventName,
        payload,
        timestamp: Date.now(),
      });

      // Trim history if needed
      if (this._history.length > this._maxHistorySize) {
        this._history.shift();
      }

      // Call all listeners
      const listeners = this._listeners.get(eventName);
      if (!listeners) return;

      // Create a copy to prevent modification during iteration
      const listenersCopy = [...listeners];
      for (const { handler } of listenersCopy) {
        try {
          handler(payload);
        } catch (error) {
          console.error(
            `📡 EventBus: Error in handler for "${eventName}"`,
            error,
          );
        }
      }
    }

    /**
     * Get event history
     * @param {string} [eventName] - Filter by event name
     * @returns {Array} Event history
     */
    getHistory(eventName) {
      if (eventName) {
        return this._history.filter((e) => e.event === eventName);
      }
      return [...this._history];
    }

    /**
     * Clear all listeners for an event
     * @param {string} [eventName] - Event to clear (all if not specified)
     */
    clear(eventName) {
      if (eventName) {
        this._listeners.delete(eventName);
      } else {
        this._listeners.clear();
      }
    }

    /**
     * Enable/disable debug mode
     * @param {boolean} enabled
     */
    setDebugMode(enabled) {
      this._debugMode = enabled;
    }

    /**
     * Get listener count for an event
     * @param {string} eventName
     * @returns {number}
     */
    listenerCount(eventName) {
      const listeners = this._listeners.get(eventName);
      return listeners ? listeners.length : 0;
    }
  }

  // Singleton instance
  let _instance = null;

  /**
   * Get the singleton EventBus instance
   * @returns {EventBus}
   */
  EventBus.getInstance = function() {
    if (!_instance) {
      _instance = new EventBus();
    }
    return _instance;
  };

  // Attach to window
  window.EventBus = EventBus;

  console.log("✅ EventBus module loaded");
})();
