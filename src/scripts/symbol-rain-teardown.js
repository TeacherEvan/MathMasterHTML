// symbol-rain-teardown.js - Cleanup, listener removal, resource disposal

(function () {
  "use strict";

  const SymbolRainTeardown = (function () {
    /**
     * Create a teardown manager.
     * @returns {object} { registerTeardown, runTeardown, addControllerListener, controllerDestroyed }
     */
    function createTeardownManager() {
      const teardownCallbacks = [];
      let controllerDestroyed = false;

      /**
       * Register a teardown callback.
       * @param {Function} callback
       */
      function registerTeardown(callback) {
        if (typeof callback === "function") {
          teardownCallbacks.push(callback);
        }
      }

      /**
       * Run all teardown callbacks (once).
       */
      function runTeardown() {
        if (controllerDestroyed) return;
        controllerDestroyed = true;

        while (teardownCallbacks.length > 0) {
          const teardownCallback = teardownCallbacks.pop();
          try {
            teardownCallback();
          } catch (error) {
            console.warn("Symbol Rain teardown callback failed", error);
          }
        }
      }

      /**
       * Add an event listener with automatic teardown registration.
       * @param {EventTarget} target
       * @param {string} eventName
       * @param {Function} handler
       * @param {object} [options]
       */
      function addControllerListener(target, eventName, handler, options) {
        if (!target?.addEventListener || !target?.removeEventListener) return;

        target.addEventListener(eventName, handler, options);
        registerTeardown(() => {
          target.removeEventListener(eventName, handler, options);
        });
      }

      return {
        registerTeardown,
        runTeardown,
        addControllerListener,
        get controllerDestroyed() { return controllerDestroyed; },
      };
    }

    return { createTeardownManager };
  })();

  window.SymbolRainTeardown = SymbolRainTeardown;
})();