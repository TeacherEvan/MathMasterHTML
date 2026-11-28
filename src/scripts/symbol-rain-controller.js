// symbol-rain-controller.js - Orchestration, lifecycle coordination, public API

(function () {
  "use strict";

  const SymbolRainController = (function () {
    /**
     * Create the main controller.
     * @param {object} modules - All SymbolRain* modules
     * @returns {object} controller API
     */
    function createController(modules) {
      const {
        SymbolRainHelpers,
        SymbolRainConfig,
        SymbolRainSymbols,
        SymbolRainAnimation,
        SymbolRainInteractions,
        SymbolRainLifecycle,
        SymbolRainPlacement,
      } = modules;

      const symbolRainContainer = document.getElementById("symbol-rain-container");
      const panelC = document.getElementById("panel-c");
      if (!symbolRainContainer) return null;

      // ---- State -----------------------------------------------------------
      const now = Date.now();
      const lastSymbolSpawnTimestamp = {};
      SymbolRainSymbols.forEach((s) => (lastSymbolSpawnTimestamp[s] = now));

      const getViewportContract = () =>
        window.displayManager?.getCurrentResolution?.() ||
        window.displayManager?.getViewportState?.() ||
        null;

      const isCompactDisplayMode = () => {
        const activeResolution = getViewportContract();
        return (
          activeResolution?.isCompactViewport === true ||
          document.body.classList.contains("viewport-compact")
        );
      };

      const responsiveConfig = {
        compact: {
          spawnRate: 0,
          burstSpawnRate: 0,
          guaranteedSpawnInterval: 0,
          symbolsPerWave: 0,
          maxActiveSymbols: 150,
          minVisibleSymbols: 0,
        },
        standard: {
          spawnRate: 0,
          burstSpawnRate: 0,
          guaranteedSpawnInterval: 0,
          symbolsPerWave: 0,
          maxActiveSymbols: 150,
          minVisibleSymbols: 0,
        },
      };
      const preservePerfSmokeConfig = window.__PERF_SMOKE_MODE === true;
      let pendingResponsiveModeOverride = null;

      function isGameplayReady() {
        return window.GameRuntimeCoordinator?.isGameplayReady?.() === true;
      }

      const state = {
        config: SymbolRainConfig,
        symbols: SymbolRainSymbols,
        symbolRainContainer,
        symbolFallSpeed: SymbolRainConfig.initialFallSpeed,
        isInitialPopulation: true,
        lastSymbolSpawnTimestamp,
        faceRevealState: { lastFaceRevealTime: Date.now() },
        activeFaceReveals: new Set(),
        columnCount: 0,
        activeFallingSymbols: [],
        isAnimationRunning: false,
        speedControllerId: null,
        symbolsToRemove: new Set(),
        cachedContainerHeight: 0,
        isTabVisible: !document.hidden,
        isMobileMode: isCompactDisplayMode(),
        spatialGrid: SymbolRainHelpers.createSpatialGrid(SymbolRainConfig),
        symbolPool: SymbolRainHelpers.createSymbolPool(SymbolRainConfig),
        lifecyclePhase: "created",
        layoutRetryCount: 0,
        lastMeasuredLayout: { columnCount: 0, containerHeight: 0 },
        layout: null,
        slotOwners: [],
      };

      window.__symbolRainState = state;

      const debounce = SymbolRainHelpers.debounce;

      // ---- Teardown Manager ------------------------------------------------
      const teardown = window.SymbolRainTeardown.createTeardownManager();
      const { registerTeardown, runTeardown, addControllerListener } = teardown;

      // ---- Responsive Config Sync ------------------------------------------
      function syncResponsiveConfig() {
        if (preservePerfSmokeConfig) return;
        const profile = state.isMobileMode ? responsiveConfig.compact : responsiveConfig.standard;
        Object.assign(state.config, profile);
      }

      function syncResponsiveRuntimeConfig() {
        state.isMobileMode =
          pendingResponsiveModeOverride === null ? isCompactDisplayMode() : pendingResponsiveModeOverride;
        pendingResponsiveModeOverride = null;
        syncResponsiveConfig();
      }

      syncResponsiveRuntimeConfig();

      // ---- Layout Metrics --------------------------------------------------
      function refreshLayoutMetrics(force = false) {
        const { columnCount, containerHeight } = SymbolRainHelpers.calculateColumns(
          symbolRainContainer,
          SymbolRainConfig,
        );

        const layoutChanged =
          force ||
          state.lastMeasuredLayout.columnCount !== columnCount ||
          state.lastMeasuredLayout.containerHeight !== containerHeight;

        state.cachedContainerHeight = containerHeight;
        state.columnCount = columnCount;
        state.lastMeasuredLayout = { columnCount, containerHeight };

        if (layoutChanged) {
          spawner.reconcileVisibleSlots();
        }
        return layoutChanged;
      }

      function hasUsableLayout() {
        return state.columnCount > 0 && state.cachedContainerHeight > 0;
      }

      // ---- Placement Adapter -----------------------------------------------
      const placementAdapter = window.SymbolRainPlacementAdapter.createPlacementAdapter(state, {
        SymbolRainConfig,
        SymbolRainHelpers,
        SymbolRainPlacement,
        symbolRainContainer,
      });

      // ---- Spawner ---------------------------------------------------------
      const spawner = window.SymbolRainSpawner.createSpawner(state, {
        SymbolRainConfig,
        SymbolRainHelpers,
        SymbolRainSymbols,
        SymbolRainAnimation,
      }, placementAdapter, teardown);

      // Wire lifecycle callbacks between spawner and placement adapter
      placementAdapter.setLifecycleCallbacks({
        setSymbolLifecycleState: spawner.setSymbolLifecycleState,
        scheduleHiddenResurface: spawner.scheduleHiddenResurface,
      });

      // ---- Controller Start/Stop -------------------------------------------
      function startControllers() {
        SymbolRainAnimation.startAnimation(state);
        SymbolRainAnimation.startSpeedController(state);
      }

      // ---- Lifecycle Machine -----------------------------------------------
      const symbolRainLifecycle = SymbolRainLifecycle.createMachine(state, {
        isGameplayReady,
        refreshLayoutMetrics,
        hasUsableLayout,
        syncResponsiveConfig: syncResponsiveRuntimeConfig,
        startControllers,
        populateInitialSymbols: spawner.populateInitialSymbols,
        stopControllers() {
          SymbolRainAnimation.stopAnimation(state);
          state.layout = null;
          placementAdapter.slotRegistry.reset(0);
        },
        onFailure() {
          console.warn("⚠️ Symbol Rain layout never stabilized; skipping startup");
        },
        GameEvents: window.GameEvents || {
          DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
          PROBLEM_COMPLETED: "problemCompleted",
        },
        document,
        window,
      });

      window.__symbolRainLifecycle = symbolRainLifecycle;

      // Wire lifecycle machine to spawner for managed timeouts
      spawner.setLifecycleMachine(symbolRainLifecycle);

      symbolRainLifecycle.requestStart("init");

      // ---- Public Snapshot API ---------------------------------------------
      const configSnapshotKeys = [
        "visibleMs", "fadeMs", "hiddenMinMs", "hiddenMaxMs", "instancesPerSymbol",
        "minClearancePx", "maxDomElements", "spawnRate", "burstSpawnRate",
        "guaranteedSpawnInterval", "symbolsPerWave", "minVisibleSymbols", "maxActiveSymbols",
        "initialFallSpeed", "maxFallSpeed", "columnWidth", "symbolHeight",
        "symbolWidth", "poolSize",
      ];

      function getConfigSnapshot() {
        const configSnapshot = {
          profile: state.isMobileMode ? "compact" : "standard",
          preservePerfSmokeConfig,
        };
        configSnapshotKeys.forEach((key) => {
          const value = state.config?.[key];
          if (typeof value === "number" || typeof value === "string" || typeof value === "boolean") {
            configSnapshot[key] = value;
          }
        });
        return configSnapshot;
      }

      function getPublicSnapshot() {
        try {
          const lifecycleSnapshot = symbolRainLifecycle.getSnapshot?.() || {};
          const activeFallingSymbols = Array.isArray(state.activeFallingSymbols)
            ? state.activeFallingSymbols.length
            : 0;
          return {
            ...lifecycleSnapshot,
            lifecycle: { ...lifecycleSnapshot },
            phase: lifecycleSnapshot.phase || state.lifecyclePhase,
            isAnimationRunning: state.isAnimationRunning === true,
            activeFallingSymbols,
            activeFallingSymbolCount: activeFallingSymbols,
            columnCount: state.columnCount || 0,
            cachedContainerHeight: state.cachedContainerHeight || 0,
            isInitialPopulation: state.isInitialPopulation === true,
            isMobileMode: state.isMobileMode === true,
            layoutRetryCount: state.layoutRetryCount || 0,
            config: getConfigSnapshot(),
          };
        } catch (error) {
          console.warn("Symbol Rain controller snapshot failed", error);
          return null;
        }
      }

      function runLifecycleAction(actionName, reason) {
        try {
          const action = symbolRainLifecycle?.[actionName];
          if (typeof action !== "function") return null;
          return action(reason || "controller") || null;
        } catch (error) {
          console.warn("Symbol Rain controller lifecycle action failed", error);
          return null;
        }
      }

      // ---- Controller Spawn/Removal API ------------------------------------
      function getSymbolInputList(symbols) {
        if (symbols == null) return [];
        if (typeof symbols === "string" || typeof symbols === "number") return [symbols];
        if (typeof symbols[Symbol.iterator] === "function") return Array.from(symbols);
        return [symbols];
      }

      function getNormalizedSymbolSet(symbols) {
        return new Set(
          getSymbolInputList(symbols)
            .map((s) => window.SymbolRainTargets?.normalizeSymbol?.(s))
            .filter(Boolean),
        );
      }

      function getRainWindowMeasurements() {
        const rainRect = SymbolRainHelpers.getRainWindowRect?.(state.symbolRainContainer);
        const parentElement = state.symbolRainContainer?.parentElement;
        const width =
          rainRect?.width ||
          state.symbolRainContainer?.clientWidth ||
          state.symbolRainContainer?.offsetWidth ||
          parentElement?.clientWidth ||
          0;
        const height =
          state.cachedContainerHeight ||
          state.symbolRainContainer?.clientHeight ||
          state.symbolRainContainer?.offsetHeight ||
          parentElement?.clientHeight ||
          0;
        return { width, height };
      }

      function releaseSymbolForControllerSpawn() {
        const activeSymbols = state.activeFallingSymbols;
        if (!Array.isArray(activeSymbols) || activeSymbols.length === 0) return false;

        let replacementIndex = -1;
        for (let index = 0; index < activeSymbols.length; index++) {
          const symbolObj = activeSymbols[index];
          if (!symbolObj?.element?.isConnected) {
            replacementIndex = index;
            break;
          }
          if (symbolObj.element.classList.contains("clicked")) continue;
          if (
            replacementIndex === -1 ||
            symbolObj.y > activeSymbols[replacementIndex].y
          ) {
            replacementIndex = index;
          }
        }
        return spawner.cleanupSymbolAtIndex(replacementIndex);
      }

      function ensureControllerSpawnCapacity() {
        const maxActiveSymbols = state.config?.maxActiveSymbols || 200;
        if (state.activeFallingSymbols.length < maxActiveSymbols) return true;
        return releaseSymbolForControllerSpawn();
      }

      function resolveControllerPlacement(options, effectiveColumnCount) {
        const rainMeasurements = getRainWindowMeasurements();
        if (rainMeasurements.width <= 0 || rainMeasurements.height <= 0) return null;

        const claim = placementAdapter.claimSlot();
        if (!claim) return null;

        const columnWidth = Math.max(SymbolRainConfig.columnWidth || 1, 1);
        const requestedColumn = Number.isInteger(options?.column) ? options.column : Math.floor(claim.left / columnWidth);
        const column = Math.max(0, Math.min(requestedColumn, Math.max(effectiveColumnCount - 1, 0)));

        return { column, slotClaim: claim, placement: { left: claim.left, top: claim.top } };
      }

      function spawnVisibleSymbol(symbol, options = {}) {
        try {
          if (teardown.controllerDestroyed) return false;

          const forcedSymbol = window.SymbolRainTargets?.normalizeSymbol?.(symbol);
          if (!forcedSymbol || !state.symbolRainContainer) return false;

          if (state.columnCount <= 0 || state.cachedContainerHeight <= 0) {
            refreshLayoutMetrics(true);
          }

          const rainMeasurements = getRainWindowMeasurements();
          const effectiveColumnCount = Math.max(state.columnCount, 1);

          if (
            rainMeasurements.width <= 0 ||
            rainMeasurements.height <= 0 ||
            !ensureControllerSpawnCapacity()
          ) {
            return false;
          }

          let controllerPlacement = resolveControllerPlacement(options, effectiveColumnCount);
          if (!controllerPlacement && !releaseSymbolForControllerSpawn()) return false;
          if (!controllerPlacement) {
            controllerPlacement = resolveControllerPlacement(options, effectiveColumnCount);
          }
          if (!controllerPlacement) return false;

          const createdSymbol = spawner.createResurfacingSymbol(
            forcedSymbol,
            controllerPlacement.column,
            { initialState: "visible", slotClaim: controllerPlacement.slotClaim },
          );

          if (!createdSymbol) return false;

          const createdSymbolIndex = state.activeFallingSymbols.indexOf(createdSymbol);
          if (createdSymbolIndex === -1) {
            createdSymbol?.element?.remove?.();
            state.symbolPool?.release?.(createdSymbol?.element);
            state.spatialGrid?.update?.(state.activeFallingSymbols);
            return false;
          }

          if (
            !SymbolRainHelpers.isSymbolVisibleInRainWindow?.(
              state,
              state.activeFallingSymbols[createdSymbolIndex],
            )
          ) {
            spawner.cleanupSymbolAtIndex(createdSymbolIndex);
            state.spatialGrid?.update?.(state.activeFallingSymbols);
            return false;
          }

          state.spatialGrid?.update?.(state.activeFallingSymbols);
          return true;
        } catch (error) {
          console.warn("Symbol Rain controller spawn failed", error);
          return false;
        }
      }

      function removeMatchingSymbols(symbols) {
        try {
          const normalizedSymbols = getNormalizedSymbolSet(symbols);
          if (normalizedSymbols.size === 0) return 0;

          let removalCount = 0;
          for (let index = state.activeFallingSymbols.length - 1; index >= 0; index--) {
            const symbolObj = state.activeFallingSymbols[index];
            const normalizedSymbol = window.SymbolRainTargets?.normalizeSymbol?.(
              symbolObj?.symbol || symbolObj?.element?.textContent || "",
            );
            if (!normalizedSymbols.has(normalizedSymbol)) continue;
            if (spawner.cleanupSymbolAtIndex(index)) removalCount++;
          }
          return removalCount;
        } catch (error) {
          console.warn("Symbol Rain controller removal failed", error);
          return 0;
        }
      }

      // ---- Interaction Controller ------------------------------------------
      const interactionController = SymbolRainInteractions.bindInteractions(
        symbolRainContainer,
        state,
      );
      registerTeardown(() => interactionController?.dispose?.());

      // ---- Event Listeners -------------------------------------------------
      const handleProblemCompleted = () => {
        if (teardown.controllerDestroyed) return;
        SymbolRainAnimation.resetSpeed(state);
      };

      const handleVisibilityChange = () => {
        if (teardown.controllerDestroyed) return;
        state.isTabVisible = !document.hidden;
        if (state.isTabVisible) {
          symbolRainLifecycle?.resumeManagedTimeouts?.();
        } else {
          symbolRainLifecycle?.pauseManagedTimeouts?.();
        }
      };

      const debouncedResize = debounce(() => {
        if (teardown.controllerDestroyed) return;
        state.isMobileMode = isCompactDisplayMode();
        symbolRainLifecycle.onLayoutChanged("resize");
      }, 250);

      const debouncedLocalLayoutRefresh = debounce(() => {
        if (teardown.controllerDestroyed) return;
        state.isMobileMode = isCompactDisplayMode();
        symbolRainLifecycle.onLayoutChanged("local-layout-refresh");
      }, 20);

      addControllerListener(
        document,
        window.GameEvents?.PROBLEM_COMPLETED || "problemCompleted",
        handleProblemCompleted,
      );
      addControllerListener(document, "visibilitychange", handleVisibilityChange);
      addControllerListener(window, "resize", debouncedResize);

      const unsubscribeResizeHub = window.SharedResizeObserver?.subscribe?.(debouncedResize, {
        immediate: true,
        source: "symbol-rain",
      });
      registerTeardown(unsubscribeResizeHub);

      let panelLocalResizeObserver = null;
      if (typeof ResizeObserver === "function") {
        panelLocalResizeObserver = new ResizeObserver(() => debouncedLocalLayoutRefresh());
        if (panelC) panelLocalResizeObserver.observe(panelC);
        panelLocalResizeObserver.observe(symbolRainContainer);
        registerTeardown(() => panelLocalResizeObserver?.disconnect());
      }

      const handleDisplayResolutionChanged = (event) => {
        if (teardown.controllerDestroyed) return;
        pendingResponsiveModeOverride =
          event.detail?.isCompactViewport === true ||
          document.body.classList.contains("viewport-compact");
        state.isMobileMode = pendingResponsiveModeOverride;
        symbolRainLifecycle.onLayoutChanged("display-resolution-changed");
      };
      addControllerListener(
        document,
        window.GameEvents?.DISPLAY_RESOLUTION_CHANGED || "displayResolutionChanged",
        handleDisplayResolutionChanged,
      );

      // ---- Debug helper ----------------------------------------------------
      window.getActiveSymbolCount = function () {
        return state.activeFallingSymbols.length;
      };

      // ---- Public API ------------------------------------------------------
      const publicAPI = {
        getSnapshot: getPublicSnapshot,
        start(reason) {
          return runLifecycleAction("requestStart", reason);
        },
        stop(reason) {
          return runLifecycleAction("stop", reason);
        },
        destroy(reason) {
          const snapshot = runLifecycleAction("destroy", reason);
          runTeardown();
          return snapshot || getPublicSnapshot();
        },
        refreshLayout(reason) {
          try {
            if (teardown.controllerDestroyed) return getPublicSnapshot();
            state.isMobileMode = isCompactDisplayMode();
            refreshLayoutMetrics(true);
            return (
              symbolRainLifecycle.onLayoutChanged?.(reason || "controller") || getPublicSnapshot()
            );
          } catch (error) {
            console.warn("Symbol Rain controller layout refresh failed", error);
            return null;
          }
        },
        restartCollectedSymbol: spawner.restartCollectedSymbol,
        spawnVisibleSymbol,
        removeMatchingSymbols,
        syncKeyboardTarget() {
          try {
            const syncKeyboardTarget = interactionController?.syncKeyboardTarget;
            if (typeof syncKeyboardTarget !== "function") return false;
            return Boolean(syncKeyboardTarget());
          } catch (error) {
            console.warn("Symbol Rain controller keyboard sync failed", error);
            return false;
          }
        },
      };

      // Attach to window for backward compatibility
      window.SymbolRainController = publicAPI;

      return publicAPI;
    }

    return { createController };
  })();

  window.SymbolRainController = SymbolRainController;
})();