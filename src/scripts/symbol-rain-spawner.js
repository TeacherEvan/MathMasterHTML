// symbol-rain-spawner.js - Population, spawning, resurfacing logic

(function () {
  "use strict";

  const SymbolRainSpawner = (function () {
    /**
     * Create a spawner bound to state, modules, and placement adapter.
     * @param {object} state - Shared mutable state
     * @param {object} modules - { SymbolRainConfig, SymbolRainHelpers, SymbolRainSymbols, SymbolRainAnimation }
     * @param {object} placementAdapter - from SymbolRainPlacementAdapter.createPlacementAdapter
     * @param {object} teardown - from SymbolRainTeardown.createTeardownManager
     * @returns {object} spawner API
     */
    function createSpawner(state, modules, placementAdapter, teardown) {
      const { SymbolRainConfig, SymbolRainHelpers } = modules;

      const { claimSlot, bindSlotToSymbol, releaseSlotClaim, releaseSymbolSlot, reconcileVisibleSlots } = placementAdapter;
      // Read via the manager's live getter; destructuring would freeze the value.
      const isControllerDestroyed = () => teardown.controllerDestroyed === true;

      let lifecycleMachine = null;

      // Timer management per symbol
      function clearSymbolLifecycle(symbolObj) {
        if (!Array.isArray(symbolObj?.lifecycleTimers)) return;
        while (symbolObj.lifecycleTimers.length > 0) {
          const timeoutEntry = symbolObj.lifecycleTimers.pop();
          lifecycleMachine?.clearManagedTimeout?.(timeoutEntry);
        }
      }

      SymbolRainHelpers.clearSymbolLifecycle = clearSymbolLifecycle;

      function setSymbolLifecycleStateInternal(symbolObj, lifecycleState) {
        if (!symbolObj?.element) return;
        SymbolRainHelpers.setSymbolState?.(symbolObj.element, lifecycleState);
        symbolObj.lifecycleState = lifecycleState;
      }

      function scheduleSymbolTimer(symbolObj, delayMs, callback) {
        const timeoutEntry = lifecycleMachine?.createManagedTimeout?.(() => {
          if (isControllerDestroyed() || symbolObj?.isCollected === true) return;

          if (Array.isArray(symbolObj.lifecycleTimers)) {
            const entryIndex = symbolObj.lifecycleTimers.indexOf(timeoutEntry);
            if (entryIndex !== -1) symbolObj.lifecycleTimers.splice(entryIndex, 1);
          }
          callback?.();
        }, delayMs);

        if (!timeoutEntry) return null;
        if (!Array.isArray(symbolObj.lifecycleTimers)) symbolObj.lifecycleTimers = [];
        symbolObj.lifecycleTimers.push(timeoutEntry);
        return timeoutEntry;
      }

      function scheduleVisibleCycle(symbolObj) {
        if (isControllerDestroyed() || symbolObj?.isCollected === true) return;
        setSymbolLifecycleStateInternal(symbolObj, "visible");

        scheduleSymbolTimer(symbolObj, SymbolRainConfig.visibleMs, () => {
          if (isControllerDestroyed() || symbolObj?.isCollected === true) return;
          setSymbolLifecycleStateInternal(symbolObj, "fading");

          scheduleSymbolTimer(symbolObj, SymbolRainConfig.fadeMs, () => {
            if (isControllerDestroyed() || symbolObj?.isCollected === true) return;
            setSymbolLifecycleStateInternal(symbolObj, "hidden");
            releaseSymbolSlot(symbolObj);
            state.spatialGrid?.remove?.(symbolObj);
            scheduleHiddenResurfaceInternal(symbolObj);
          });
        });
      }

      /**
       * Resurface a hidden symbol onto a free slot (with backpressure).
       * @param {object} symbolObj
       * @param {number|null} delayOverride - stagger delay
       */
      function scheduleHiddenResurfaceInternal(symbolObj, delayOverride = null) {
        const hiddenMin = SymbolRainConfig.hiddenMinMs || 2000;
        const hiddenMax = SymbolRainConfig.hiddenMaxMs || hiddenMin;
        const hiddenDelay = Number.isFinite(delayOverride)
          ? Math.max(0, delayOverride)
          : hiddenMin + Math.random() * Math.max(0, hiddenMax - hiddenMin);

        scheduleSymbolTimer(symbolObj, hiddenDelay, () => {
          if (isControllerDestroyed() || symbolObj?.isCollected === true) return;

          const claim = claimSlot();
          if (!claim) {
            const attempts = (symbolObj.resurfaceAttempts || 0) + 1;
            symbolObj.resurfaceAttempts = attempts;
            const backoffMs = Math.min(3000, 300 * 2 ** Math.min(attempts, 4));
            scheduleSymbolTimer(symbolObj, backoffMs, () => scheduleHiddenResurfaceInternal(symbolObj));
            return;
          }

          symbolObj.resurfaceAttempts = 0;
          bindSlotToSymbol(claim, symbolObj);
          SymbolRainHelpers.setSymbolPosition(symbolObj.element, claim.left, claim.top);
          symbolObj.x = claim.left;
          symbolObj.y = claim.top;
          symbolObj.column = Math.max(
            0,
            Math.floor(claim.left / (SymbolRainConfig.columnWidth || claim.left || 1)),
          );
          state.spatialGrid?.update?.([symbolObj]);
          scheduleVisibleCycle(symbolObj);
        });
      }

      /**
       * Create a symbol that resurfaces (hidden -> visible cycle).
       * @param {string} symbolText
       * @param {number} placementIndex
       * @param {object} options
       */
      function createResurfacingSymbol(symbolText, placementIndex = 0, options = {}) {
        const initialState = options.initialState || "visible";
        const placementOverride = options.placementOverride || null;
        const claim = placementOverride ? null : options.slotClaim || claimSlot();
        const placement = placementOverride || claim;

        if (!placement) return null;

        const createdSymbol = SymbolRainHelpers.createFallingSymbol(
          {
            symbols: state.symbols,
            symbolRainContainer: state.symbolRainContainer,
            config: SymbolRainConfig,
            activeFallingSymbols: state.activeFallingSymbols,
            symbolPool: state.symbolPool,
            lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
          },
          {
            column: Math.max(0, placementIndex % Math.max(state.columnCount || 1, 1)),
            isInitialPopulation: false,
            forcedSymbol: symbolText,
            initialY: placement.top,
            horizontalOffset: 0,
          },
        );

        if (!createdSymbol) {
          releaseSlotClaim(claim);
          return null;
        }

        const symbolObj = state.activeFallingSymbols.at(-1);
        if (!symbolObj) {
          releaseSlotClaim(claim);
          return null;
        }

        if (claim) bindSlotToSymbol(claim, symbolObj);

        symbolObj.lifecycleTimers = [];
        symbolObj.lifecycleState = initialState;
        symbolObj.isCollected = false;
        SymbolRainHelpers.setSymbolPosition(symbolObj.element, placement.left, placement.top);
        symbolObj.x = placement.left;
        symbolObj.y = placement.top;
        symbolObj.column = Math.max(
          0,
          Math.floor(placement.left / (SymbolRainConfig.columnWidth || 1)),
        );
        setSymbolLifecycleStateInternal(symbolObj, initialState);

        if (initialState === "hidden") {
          releaseSymbolSlot(symbolObj);
          state.spatialGrid?.remove?.(symbolObj);
          scheduleHiddenResurfaceInternal(symbolObj);
        } else {
          state.spatialGrid?.update?.([symbolObj]);
          scheduleVisibleCycle(symbolObj);
        }

        return symbolObj;
      }

      /**
       * Restart a collected symbol with new text at its last position.
       * @param {object} symbolObj
       * @param {string|null} symbolText
       */
      function restartCollectedSymbol(symbolObj, symbolText = null) {
        if (!symbolObj?.element || isControllerDestroyed()) return false;

        const symbolIndex = state.activeFallingSymbols.indexOf(symbolObj);
        if (symbolIndex === -1) return false;

        const replacementText =
          symbolText || symbolObj.symbol || symbolObj.element.textContent || "";
        const replacementPlacement = {
          left: Number.isFinite(symbolObj.x) ? symbolObj.x : 0,
          top: Number.isFinite(symbolObj.y) ? symbolObj.y : 0,
        };
        const replacementColumn = Number.isInteger(symbolObj.column) ? symbolObj.column : 0;

        cleanupSymbolAtIndex(symbolIndex);

        return Boolean(
          createResurfacingSymbol(replacementText, replacementColumn, {
            initialState: "hidden",
            placementOverride: replacementPlacement,
          }),
        );
      }

      /**
       * Create a symbol for initial population (starts hidden, staggered later).
       * @param {string} symbolText
       * @param {number} placementIndex
       */
      function createInitialPopulationSymbol(symbolText, placementIndex = 0) {
        const columnCount = Math.max(state.columnCount || 1, 1);

        const createdSymbol = SymbolRainHelpers.createFallingSymbol(
          {
            symbols: state.symbols,
            symbolRainContainer: state.symbolRainContainer,
            config: SymbolRainConfig,
            activeFallingSymbols: state.activeFallingSymbols,
            symbolPool: state.symbolPool,
            lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
          },
          {
            column: placementIndex % columnCount,
            isInitialPopulation: true,
            forcedSymbol: symbolText,
            initialY: 0,
            horizontalOffset: 0,
          },
        );

        if (!createdSymbol) return null;

        const symbolObj = state.activeFallingSymbols.at(-1);
        if (!symbolObj) return null;

        symbolObj.lifecycleTimers = [];
        symbolObj.lifecycleState = "hidden";
        symbolObj.isCollected = false;
        setSymbolLifecycleStateInternal(symbolObj, "hidden");
        state.spatialGrid?.remove?.(symbolObj);
        return symbolObj;
      }

      /**
       * Populate initial symbol roster with round-robin staggering.
       * @param {object} initialPopulationToken - { cancelled, timeoutIds }
       */
      function populateInitialSymbols(initialPopulationToken) {
        const spawnOrder = [];
        const instancesPerSymbol = SymbolRainConfig.instancesPerSymbol || 5;

        for (let instanceIndex = 0; instanceIndex < instancesPerSymbol; instanceIndex++) {
          state.symbols.forEach((symbolText) => {
            spawnOrder.push({ symbolText, placementIndex: instanceIndex });
          });
        }

        const batchSize = 8;
        let cursor = 0;
        let createdCount = 0;
        const readySymbols = [];

        function pumpInitialPopulation() {
          if (initialPopulationToken?.cancelled === true) return;

          const limit = Math.min(cursor + batchSize, spawnOrder.length);
          for (; cursor < limit; cursor++) {
            const { symbolText, placementIndex } = spawnOrder[cursor];
            const symbolObj = createInitialPopulationSymbol(symbolText, placementIndex + cursor);
            if (symbolObj) {
              createdCount++;
              readySymbols.push(symbolObj);
            }
          }

          if (cursor < spawnOrder.length) {
            const timeoutId = window.setTimeout(pumpInitialPopulation, 16);
            initialPopulationToken?.timeoutIds?.push?.(timeoutId);
            return;
          }

          if (createdCount > 0) {
            const lifeCycleMs =
              (SymbolRainConfig.visibleMs || 7000) +
              (SymbolRainConfig.fadeMs || 1000) +
              ((SymbolRainConfig.hiddenMinMs || 2000) + (SymbolRainConfig.hiddenMaxMs || 7000)) / 2;

            const initialBurst = Math.min(
              readySymbols.length,
              Math.max(1, Math.min(12, state.layout?.slotCount || 12)),
            );
            const remainingSymbols = Math.max(1, readySymbols.length - initialBurst);

            readySymbols.forEach((symbolObj, symbolIndex) => {
              const delayMs =
                symbolIndex < initialBurst
                  ? 0
                  : Math.round(((symbolIndex - initialBurst) / remainingSymbols) * lifeCycleMs);
              scheduleHiddenResurfaceInternal(symbolObj, delayMs);
            });
            state.isInitialPopulation = false;
            state.initialPopulationToken = null;
          }
        }

        pumpInitialPopulation();
      }

      /**
       * Clean up a symbol at index (removes from array, pool, spatial grid).
       * @param {number} symbolIndex
       */
      function cleanupSymbolAtIndex(symbolIndex) {
        if (
          !Array.isArray(state.activeFallingSymbols) ||
          symbolIndex < 0 ||
          symbolIndex >= state.activeFallingSymbols.length
        ) {
          return false;
        }

        const [symbolObj] = state.activeFallingSymbols.splice(symbolIndex, 1);
        if (!symbolObj?.element || !SymbolRainHelpers.cleanupSymbolObject) return false;

        releaseSymbolSlot(symbolObj);
        SymbolRainHelpers.cleanupSymbolObject({
          symbolObj,
          activeFaceReveals: state.activeFaceReveals,
          symbolPool: state.symbolPool,
          spatialGrid: state.spatialGrid,
        });
        return true;
      }

      function setLifecycleMachine(machine) {
        lifecycleMachine = machine;
      }

      // Expose internal functions for controller to wire up
      return {
        clearSymbolLifecycle,
        setSymbolLifecycleState: setSymbolLifecycleStateInternal,
        scheduleSymbolTimer,
        scheduleVisibleCycle,
        scheduleHiddenResurface: scheduleHiddenResurfaceInternal,
        createResurfacingSymbol,
        restartCollectedSymbol,
        createInitialPopulationSymbol,
        populateInitialSymbols,
        cleanupSymbolAtIndex,
        setLifecycleMachine,
        reconcileVisibleSlots, // forwarded from placement adapter
      };
    }

    return { createSpawner };
  })();

  window.SymbolRainSpawner = SymbolRainSpawner;
})();