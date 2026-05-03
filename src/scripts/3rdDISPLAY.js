// js/3rdDISPLAY.js - Symbol Rain Display for Math Game

function initSymbolRain() {
  try {
    const GameEvents = window.GameEvents || {
      DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
      PROBLEM_COMPLETED: "problemCompleted",
    };
    const symbolRainContainer = document.getElementById(
      "symbol-rain-container",
    );
    const panelC = document.getElementById("panel-c");
    if (!symbolRainContainer) {
      return;
    }

    const SymbolRainHelpers = window.SymbolRainHelpers;
    const SymbolRainConfig = window.SymbolRainConfig;
    const SymbolRainSymbols = window.SymbolRainSymbols;
    const SymbolRainAnimation = window.SymbolRainAnimation;
    const SymbolRainInteractions = window.SymbolRainInteractions;
    const SymbolRainLifecycle = window.SymbolRainLifecycle;

    if (
      !SymbolRainHelpers ||
      !SymbolRainConfig ||
      !SymbolRainSymbols ||
      !SymbolRainAnimation ||
      !SymbolRainInteractions ||
      !SymbolRainLifecycle
    ) {
      console.error("❌ Symbol Rain modules not loaded");
      return;
    }

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
      lastMeasuredLayout: {
        columnCount: 0,
        containerHeight: 0,
      },
    };

    window.__symbolRainState = state;

    const debounce = SymbolRainHelpers.debounce;
    const teardownCallbacks = [];
    let controllerDestroyed = false;
    let interactionController = null;

    function registerTeardown(callback) {
      if (typeof callback === "function") {
        teardownCallbacks.push(callback);
      }
    }

    function runControllerTeardown() {
      if (controllerDestroyed) {
        return;
      }

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

    function addControllerListener(target, eventName, handler, options) {
      if (!target?.addEventListener || !target?.removeEventListener) {
        return;
      }

      target.addEventListener(eventName, handler, options);
      registerTeardown(() => {
        target.removeEventListener(eventName, handler, options);
      });
    }

    function syncResponsiveConfig() {
      if (preservePerfSmokeConfig) {
        return;
      }

      const profile = state.isMobileMode
        ? responsiveConfig.compact
        : responsiveConfig.standard;
      state.config.spawnRate = profile.spawnRate;
      state.config.burstSpawnRate = profile.burstSpawnRate;
      state.config.guaranteedSpawnInterval = profile.guaranteedSpawnInterval;
      state.config.symbolsPerWave = profile.symbolsPerWave;
      state.config.maxActiveSymbols = profile.maxActiveSymbols;
      state.config.minVisibleSymbols = profile.minVisibleSymbols;
    }

    function syncResponsiveRuntimeConfig() {
      state.isMobileMode =
        pendingResponsiveModeOverride === null
          ? isCompactDisplayMode()
          : pendingResponsiveModeOverride;
      pendingResponsiveModeOverride = null;
      syncResponsiveConfig();
    }

    syncResponsiveRuntimeConfig();

    function refreshLayoutMetrics(force = false) {
      const { columnCount, containerHeight } =
        SymbolRainHelpers.calculateColumns(
          symbolRainContainer,
          SymbolRainConfig,
        );

      const layoutChanged =
        force ||
        state.lastMeasuredLayout.columnCount !== columnCount ||
        state.lastMeasuredLayout.containerHeight !== containerHeight;

      state.cachedContainerHeight = containerHeight;
      state.columnCount = columnCount;
      state.lastMeasuredLayout = {
        columnCount,
        containerHeight,
      };

      return layoutChanged;
    }

    function hasUsableLayout() {
      return state.columnCount > 0 && state.cachedContainerHeight > 0;
    }

    function getPanelBounds() {
      return panelC?.getBoundingClientRect?.() || null;
    }

    function getContainerBounds() {
      return symbolRainContainer?.getBoundingClientRect?.() || null;
    }

    function rectIntersectsWithClearance(leftRect, rightRect, clearance) {
      if (!leftRect || !rightRect) {
        return false;
      }

      return !(
        leftRect.right + clearance <= rightRect.left ||
        leftRect.left >= rightRect.right + clearance ||
        leftRect.bottom + clearance <= rightRect.top ||
        leftRect.top >= rightRect.bottom + clearance
      );
    }

    function getVisibleSymbolRects(excludeElement = null) {
      return state.activeFallingSymbols
        .filter((symbolObj) => {
          const element = symbolObj?.element;
          return (
            element?.isConnected &&
            element !== excludeElement &&
            element.dataset?.symbolState === "visible" &&
            !element.classList.contains("clicked")
          );
        })
        .map((symbolObj) => ({
          element: symbolObj.element,
          rect: symbolObj.element.getBoundingClientRect(),
        }))
        .filter(({ rect }) => Boolean(rect && rect.width > 0 && rect.height > 0));
    }

    function isPlacementClear(candidateRect, excludeElement = null, clearance = SymbolRainConfig.minClearancePx || 4) {
      const containerRect = getContainerBounds();
      const panelRect = getPanelBounds();

      if (!containerRect || !panelRect) {
        return false;
      }

      const insideContainer =
        candidateRect.left >= containerRect.left + clearance &&
        candidateRect.top >= containerRect.top + clearance &&
        candidateRect.right <= containerRect.right - clearance &&
        candidateRect.bottom <= containerRect.bottom - clearance;

      const insidePanel =
        candidateRect.left >= panelRect.left + clearance &&
        candidateRect.top >= panelRect.top + clearance &&
        candidateRect.right <= panelRect.right - clearance &&
        candidateRect.bottom <= panelRect.bottom - clearance;

      if (!insideContainer || !insidePanel) {
        return false;
      }

      return !getVisibleSymbolRects(excludeElement).some(({ rect }) =>
        rectIntersectsWithClearance(candidateRect, rect, clearance),
      );
    }

    function hasMeaningfulPlacementShift(placement, previousPlacement, thresholdPx = 2) {
      if (
        !previousPlacement ||
        !Number.isFinite(previousPlacement.left) ||
        !Number.isFinite(previousPlacement.top)
      ) {
        return true;
      }

      return (
        Math.abs(placement.left - previousPlacement.left) +
          Math.abs(placement.top - previousPlacement.top) >
        thresholdPx
      );
    }

    function samplePlacement(
      symbolWidth,
      symbolHeight,
      excludeElement = null,
      options = {},
    ) {
      const containerRect = getContainerBounds();
      if (!containerRect) {
        return null;
      }

      const previousPlacement = options.previousPlacement || null;
      const preferredClearance = SymbolRainConfig.minClearancePx || 4;
      const reducedClearance = Math.max(1, Math.floor(preferredClearance / 2));
      const attemptSets = [
        { attempts: 10, clearance: preferredClearance },
        { attempts: 5, clearance: reducedClearance },
      ];

      for (const attemptSet of attemptSets) {
        for (let attempt = 0; attempt < attemptSet.attempts; attempt += 1) {
          const maxLeft = Math.max(
            0,
            containerRect.width - symbolWidth - attemptSet.clearance * 2,
          );
          const maxTop = Math.max(
            0,
            containerRect.height - symbolHeight - attemptSet.clearance * 2,
          );
          const left = containerRect.left + attemptSet.clearance + Math.random() * maxLeft;
          const top = containerRect.top + attemptSet.clearance + Math.random() * maxTop;
          const candidateRect = {
            left,
            top,
            right: left + symbolWidth,
            bottom: top + symbolHeight,
            width: symbolWidth,
            height: symbolHeight,
          };

          if (isPlacementClear(candidateRect, excludeElement, attemptSet.clearance)) {
            const placement = {
              left: candidateRect.left - containerRect.left,
              top: candidateRect.top - containerRect.top,
              clearance: attemptSet.clearance,
            };

            if (!hasMeaningfulPlacementShift(placement, previousPlacement)) {
              continue;
            }

            return placement;
          }
        }
      }

      return null;
    }

    function clearSymbolLifecycle(symbolObj) {
      if (!Array.isArray(symbolObj?.lifecycleTimers)) {
        return;
      }

      while (symbolObj.lifecycleTimers.length > 0) {
        const timeoutEntry = symbolObj.lifecycleTimers.pop();
        symbolRainLifecycle?.clearManagedTimeout?.(timeoutEntry);
      }
    }

    SymbolRainHelpers.clearSymbolLifecycle = clearSymbolLifecycle;

    function setSymbolLifecycleState(symbolObj, lifecycleState) {
      if (!symbolObj?.element) {
        return;
      }

      SymbolRainHelpers.setSymbolState?.(symbolObj.element, lifecycleState);
      symbolObj.lifecycleState = lifecycleState;
    }

    function scheduleSymbolTimer(symbolObj, delayMs, callback) {
      const timeoutEntry = symbolRainLifecycle?.createManagedTimeout?.(() => {
        if (controllerDestroyed || symbolObj?.isCollected === true) {
          return;
        }

        if (Array.isArray(symbolObj.lifecycleTimers)) {
          const entryIndex = symbolObj.lifecycleTimers.indexOf(timeoutEntry);
          if (entryIndex !== -1) {
            symbolObj.lifecycleTimers.splice(entryIndex, 1);
          }
        }

        callback?.();
      }, delayMs);

      if (!timeoutEntry) {
        return null;
      }

      if (!Array.isArray(symbolObj.lifecycleTimers)) {
        symbolObj.lifecycleTimers = [];
      }

      symbolObj.lifecycleTimers.push(timeoutEntry);
      return timeoutEntry;
    }

    function scheduleVisibleCycle(symbolObj) {
      if (controllerDestroyed || symbolObj?.isCollected === true) {
        return;
      }

      setSymbolLifecycleState(symbolObj, "visible");

      scheduleSymbolTimer(symbolObj, SymbolRainConfig.visibleMs, () => {
        if (controllerDestroyed || symbolObj?.isCollected === true) {
          return;
        }

        setSymbolLifecycleState(symbolObj, "fading");

        scheduleSymbolTimer(symbolObj, SymbolRainConfig.fadeMs, () => {
          if (controllerDestroyed || symbolObj?.isCollected === true) {
            return;
          }

          setSymbolLifecycleState(symbolObj, "hidden");
          state.spatialGrid?.remove?.(symbolObj);
          scheduleHiddenResurface(symbolObj);
        });
      });
    }

    function scheduleHiddenResurface(symbolObj) {
      const hiddenMin = SymbolRainConfig.hiddenMinMs || 2000;
      const hiddenMax = SymbolRainConfig.hiddenMaxMs || hiddenMin;
      const hiddenDelay =
        hiddenMin + Math.random() * Math.max(0, hiddenMax - hiddenMin);

      scheduleSymbolTimer(symbolObj, hiddenDelay, () => {
        if (controllerDestroyed || symbolObj?.isCollected === true) {
          return;
        }

        const symbolWidth = SymbolRainConfig.symbolWidth || 60;
        const symbolHeight = SymbolRainConfig.symbolHeight || 42;
        const placement = samplePlacement(symbolWidth, symbolHeight, symbolObj.element, {
          previousPlacement: {
            left: symbolObj.x,
            top: symbolObj.y,
          },
        });

        if (!placement) {
          scheduleSymbolTimer(symbolObj, 500, () => scheduleHiddenResurface(symbolObj));
          return;
        }

        SymbolRainHelpers.setSymbolPosition(
          symbolObj.element,
          placement.left,
          placement.top,
        );
        symbolObj.x = placement.left;
        symbolObj.y = placement.top;
        symbolObj.column = Math.max(
          0,
          Math.floor(placement.left / (SymbolRainConfig.columnWidth || symbolWidth)),
        );
        state.spatialGrid?.update?.([symbolObj]);

        scheduleVisibleCycle(symbolObj);
      });
    }

    function createResurfacingSymbol(
      symbolText,
      placementIndex = 0,
      options = {},
    ) {
      const symbolWidth = SymbolRainConfig.symbolWidth || 60;
      const symbolHeight = SymbolRainConfig.symbolHeight || 42;
      const initialState = options.initialState || "visible";
      const placement =
        options.placementOverride || samplePlacement(symbolWidth, symbolHeight);

      if (!placement) {
        return null;
      }

      const createdSymbol = SymbolRainHelpers.createFallingSymbol(
        {
          symbols: state.symbols,
          symbolRainContainer,
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
          horizontalOffset: placement.left,
        },
      );

      if (!createdSymbol) {
        return null;
      }

      const symbolObj = state.activeFallingSymbols.at(-1);
      if (!symbolObj) {
        return null;
      }

      symbolObj.lifecycleTimers = [];
      symbolObj.lifecycleState = initialState;
      symbolObj.isCollected = false;
      SymbolRainHelpers.setSymbolPosition(
        symbolObj.element,
        placement.left,
        placement.top,
      );
      symbolObj.x = placement.left;
      symbolObj.y = placement.top;
      symbolObj.column = Math.max(
        0,
        Math.floor(placement.left / (SymbolRainConfig.columnWidth || symbolWidth)),
      );
      setSymbolLifecycleState(symbolObj, initialState);

      if (initialState === "hidden") {
        state.spatialGrid?.remove?.(symbolObj);
        scheduleHiddenResurface(symbolObj);
      } else {
        state.spatialGrid?.update?.([symbolObj]);
        scheduleVisibleCycle(symbolObj);
      }

      return symbolObj;
    }

    function restartCollectedSymbol(symbolObj, symbolText = null) {
      if (!symbolObj?.element || controllerDestroyed) {
        return false;
      }

      const symbolIndex = state.activeFallingSymbols.indexOf(symbolObj);
      if (symbolIndex === -1) {
        return false;
      }

      const replacementText =
        symbolText || symbolObj.symbol || symbolObj.element.textContent || "";
      const replacementPlacement = {
        left: Number.isFinite(symbolObj.x) ? symbolObj.x : 0,
        top: Number.isFinite(symbolObj.y) ? symbolObj.y : 0,
      };
      const replacementColumn = Number.isInteger(symbolObj.column)
        ? symbolObj.column
        : 0;

      cleanupSymbolAtIndex(symbolIndex);

      return Boolean(
        createResurfacingSymbol(replacementText, replacementColumn, {
          initialState: "hidden",
          placementOverride: replacementPlacement,
        }),
      );
    }

    function createInitialPopulationSymbol(symbolText, placementIndex = 0) {
      const columnCount = Math.max(state.columnCount || 1, 1);
      const containerHeight = Math.max(
        0,
        state.cachedContainerHeight || symbolRainContainer.offsetHeight || 0,
      );

      const createdSymbol = SymbolRainHelpers.createFallingSymbol(
        {
          symbols: state.symbols,
          symbolRainContainer,
          config: SymbolRainConfig,
          activeFallingSymbols: state.activeFallingSymbols,
          symbolPool: state.symbolPool,
          lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
        },
        {
          column: placementIndex % columnCount,
          isInitialPopulation: true,
          forcedSymbol: symbolText,
          initialY: containerHeight > 0 ? Math.random() * containerHeight : 0,
          horizontalOffset:
            (Math.random() - 0.5) * (SymbolRainConfig.columnWidth || 50),
        },
      );

      if (!createdSymbol) {
        return null;
      }

      const symbolObj = state.activeFallingSymbols.at(-1);
      if (!symbolObj) {
        return null;
      }

      symbolObj.lifecycleTimers = [];
      symbolObj.lifecycleState = "visible";
      symbolObj.isCollected = false;
      setSymbolLifecycleState(symbolObj, "visible");
      state.spatialGrid?.update?.([symbolObj]);
      return symbolObj;
    }

    function populateInitialSymbols(initialPopulationToken) {
      const spawnOrder = [];

      state.symbols.forEach((symbolText) => {
        for (let index = 0; index < (SymbolRainConfig.instancesPerSymbol || 5); index += 1) {
          spawnOrder.push({ symbolText, placementIndex: index });
        }
      });

      const batchSize = 8;
      let cursor = 0;
      let createdCount = 0;
      const readySymbols = [];

      function pumpInitialPopulation() {
        if (initialPopulationToken?.cancelled === true) {
          return;
        }

        const limit = Math.min(cursor + batchSize, spawnOrder.length);
        for (; cursor < limit; cursor += 1) {
          const { symbolText, placementIndex } = spawnOrder[cursor];
          const symbolObj = createInitialPopulationSymbol(
            symbolText,
            placementIndex + cursor,
          );
          if (symbolObj) {
            createdCount += 1;
            readySymbols.push(symbolObj);
          }
        }

        if (cursor < spawnOrder.length) {
          const timeoutId = window.setTimeout(pumpInitialPopulation, 16);
          initialPopulationToken?.timeoutIds?.push?.(timeoutId);
          return;
        }

        if (createdCount > 0) {
          readySymbols.forEach((symbolObj) => {
            scheduleVisibleCycle(symbolObj);
          });
          state.isInitialPopulation = false;
          state.initialPopulationToken = null;
        }
      }

      pumpInitialPopulation();
    }

    function startControllers() {
      SymbolRainAnimation.startAnimation(state);
      SymbolRainAnimation.startSpeedController(state);
    }

    const symbolRainLifecycle = SymbolRainLifecycle.createMachine(state, {
      isGameplayReady,
      refreshLayoutMetrics,
      hasUsableLayout,
      syncResponsiveConfig: syncResponsiveRuntimeConfig,
      startControllers,
      populateInitialSymbols,
      stopControllers() {
        SymbolRainAnimation.stopAnimation(state);
      },
      onFailure() {
        console.warn("⚠️ Symbol Rain layout never stabilized; skipping startup");
      },
      GameEvents,
      document,
      window,
    });

    const configSnapshotKeys = [
      "visibleMs",
      "fadeMs",
      "hiddenMinMs",
      "hiddenMaxMs",
      "instancesPerSymbol",
      "minClearancePx",
      "maxDomElements",
      "spawnRate",
      "burstSpawnRate",
      "guaranteedSpawnInterval",
      "symbolsPerWave",
      "minVisibleSymbols",
      "maxActiveSymbols",
      "initialFallSpeed",
      "maxFallSpeed",
      "columnWidth",
      "symbolHeight",
      "symbolWidth",
      "poolSize",
    ];

    function getConfigSnapshot() {
      const configSnapshot = {
        profile: state.isMobileMode ? "compact" : "standard",
        preservePerfSmokeConfig,
      };

      configSnapshotKeys.forEach((key) => {
        const value = state.config?.[key];
        if (
          typeof value === "number" ||
          typeof value === "string" ||
          typeof value === "boolean"
        ) {
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
        if (typeof action !== "function") {
          return null;
        }

        return action(reason || "controller") || null;
      } catch (error) {
        console.warn("Symbol Rain controller lifecycle action failed", error);
        return null;
      }
    }

    function getSymbolInputList(symbols) {
      if (symbols == null) {
        return [];
      }

      if (typeof symbols === "string" || typeof symbols === "number") {
        return [symbols];
      }

      if (typeof symbols[Symbol.iterator] === "function") {
        return Array.from(symbols);
      }

      return [symbols];
    }

    function getNormalizedSymbolSet(symbols) {
      const normalizedSymbols = getSymbolInputList(symbols)
        .map((symbol) => window.SymbolRainTargets?.normalizeSymbol?.(symbol))
        .filter(Boolean);

      return new Set(normalizedSymbols);
    }

    function cleanupSymbolAtIndex(symbolIndex) {
      if (
        !Array.isArray(state.activeFallingSymbols) ||
        symbolIndex < 0 ||
        symbolIndex >= state.activeFallingSymbols.length
      ) {
        return false;
      }

      const [symbolObj] = state.activeFallingSymbols.splice(symbolIndex, 1);
      if (!symbolObj?.element || !SymbolRainHelpers.cleanupSymbolObject) {
        return false;
      }

      SymbolRainHelpers.cleanupSymbolObject({
        symbolObj,
        activeFaceReveals: state.activeFaceReveals,
        symbolPool: state.symbolPool,
        spatialGrid: state.spatialGrid,
      });
      return true;
    }

    function getRainWindowMeasurements() {
      const rainRect = SymbolRainHelpers.getRainWindowRect?.(
        state.symbolRainContainer,
      );
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

    function clampVisibleAxis(position, windowSize, symbolSize) {
      if (!Number.isFinite(windowSize) || windowSize <= 0) {
        return null;
      }

      const resolvedSymbolSize = Math.max(
        1,
        Number.isFinite(symbolSize) ? symbolSize : 1,
      );
      const canFitWholeSymbol = windowSize >= resolvedSymbolSize;
      const minPosition = canFitWholeSymbol
        ? 0
        : Math.min(0, windowSize - resolvedSymbolSize);
      const maxPosition = canFitWholeSymbol
        ? windowSize - resolvedSymbolSize
        : Math.max(0, windowSize - 1);
      const resolvedPosition = Number.isFinite(position) ? position : 0;

      return Math.min(Math.max(resolvedPosition, minPosition), maxPosition);
    }

    function releaseSymbolForControllerSpawn() {
      const activeSymbols = state.activeFallingSymbols;
      if (!Array.isArray(activeSymbols) || activeSymbols.length === 0) {
        return false;
      }

      let replacementIndex = -1;

      for (let index = 0; index < activeSymbols.length; index += 1) {
        const symbolObj = activeSymbols[index];
        if (!symbolObj?.element?.isConnected) {
          replacementIndex = index;
          break;
        }

        if (symbolObj.element.classList.contains("clicked")) {
          continue;
        }

        if (
          replacementIndex === -1 ||
          symbolObj.y > activeSymbols[replacementIndex].y
        ) {
          replacementIndex = index;
        }
      }

      return cleanupSymbolAtIndex(replacementIndex);
    }

    function ensureControllerSpawnCapacity() {
      const maxActiveSymbols = state.config?.maxActiveSymbols || 200;
      if (state.activeFallingSymbols.length < maxActiveSymbols) {
        return true;
      }

      return releaseSymbolForControllerSpawn();
    }

    function getLeastOccupiedColumn() {
      let selectedColumn = 0;
      let selectedLoad = Number.POSITIVE_INFINITY;

      for (
        let columnIndex = 0;
        columnIndex < state.columnCount;
        columnIndex += 1
      ) {
        let columnLoad = 0;

        for (const symbolObj of state.activeFallingSymbols) {
          if (symbolObj.column === columnIndex) {
            columnLoad += 1;
          }
        }

        if (columnLoad < selectedLoad) {
          selectedColumn = columnIndex;
          selectedLoad = columnLoad;
        }
      }

      return selectedColumn;
    }

    function resolveControllerSpawnColumn(options, effectiveColumnCount) {
      if (effectiveColumnCount <= 0) {
        return 0;
      }

      if (options.preferLeastOccupiedColumn === true) {
        return getLeastOccupiedColumn();
      }

      const requestedColumn = Number.isInteger(options.column)
        ? options.column
        : Number.isInteger(options.targetColumn)
          ? options.targetColumn
          : 0;

      return Math.min(
        Math.max(requestedColumn, 0),
        Math.max(effectiveColumnCount - 1, 0),
      );
    }

    function resolveControllerSpawnY(options, rainMeasurements) {
      const symbolHeight = state.config?.symbolHeight || 42;
      if (Number.isFinite(options.initialY)) {
        return clampVisibleAxis(
          options.initialY,
          rainMeasurements.height,
          symbolHeight,
        );
      }

      const containerHeight = rainMeasurements.height || symbolHeight * 4;
      const maxY = Math.max(0, containerHeight - symbolHeight);
      const preferredY = Math.max(symbolHeight, containerHeight * 0.35);

      return clampVisibleAxis(
        Math.min(preferredY, maxY),
        rainMeasurements.height,
        symbolHeight,
      );
    }

    function resolveControllerHorizontalOffset(
      options,
      column,
      rainMeasurements,
    ) {
      const symbolWidth = state.config?.symbolWidth || 60;
      const columnWidth = state.config?.columnWidth || symbolWidth;
      const requestedOffset = Number.isFinite(options.horizontalOffset)
        ? options.horizontalOffset
        : 0;
      const baseX = column * columnWidth + columnWidth / 2;
      const clampedX = clampVisibleAxis(
        baseX + requestedOffset,
        rainMeasurements.width,
        symbolWidth,
      );

      if (clampedX === null) {
        return null;
      }

      return clampedX - baseX;
    }

    function resolveControllerPlacement(options, effectiveColumnCount) {
      const rainMeasurements = getRainWindowMeasurements();
      if (rainMeasurements.width <= 0 || rainMeasurements.height <= 0) {
        return null;
      }

      const column = resolveControllerSpawnColumn(
        options,
        effectiveColumnCount,
      );
      const top = resolveControllerSpawnY(options, rainMeasurements);
      const horizontalOffset = resolveControllerHorizontalOffset(
        options,
        column,
        rainMeasurements,
      );

      if (top === null || horizontalOffset === null) {
        return null;
      }

      const symbolWidth = state.config?.symbolWidth || 60;
      const symbolHeight = state.config?.symbolHeight || 42;
      const columnWidth = state.config?.columnWidth || symbolWidth;
      const left = clampVisibleAxis(
        column * columnWidth + columnWidth / 2 + horizontalOffset,
        rainMeasurements.width,
        symbolWidth,
      );

      if (left === null) {
        return null;
      }

      const candidateRect = {
        left,
        top,
        right: left + symbolWidth,
        bottom: top + symbolHeight,
        width: symbolWidth,
        height: symbolHeight,
      };

      if (isPlacementClear(candidateRect)) {
        return {
          column,
          placement: {
            left,
            top,
          },
        };
      }

      const sampledPlacement = samplePlacement(symbolWidth, symbolHeight);
      if (!sampledPlacement) {
        return null;
      }

      return {
        column,
        placement: sampledPlacement,
      };
    }

    function spawnVisibleSymbol(symbol, options = {}) {
      try {
        if (controllerDestroyed) {
          return false;
        }

        const forcedSymbol = window.SymbolRainTargets?.normalizeSymbol?.(symbol);
        if (
          !forcedSymbol ||
          typeof createResurfacingSymbol !== "function" ||
          !state.symbolRainContainer
        ) {
          return false;
        }

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

        const resolvedPlacement = resolveControllerPlacement(
          options,
          effectiveColumnCount,
        );
        let controllerPlacement = resolvedPlacement;
        if (!controllerPlacement && !releaseSymbolForControllerSpawn()) {
          return false;
        }

        if (!controllerPlacement) {
          controllerPlacement = resolveControllerPlacement(
            options,
            effectiveColumnCount,
          );
        }

        if (!controllerPlacement) {
          return false;
        }

        const createdSymbol = createResurfacingSymbol(
          forcedSymbol,
          controllerPlacement.column,
          {
            initialState: "visible",
            placementOverride: controllerPlacement.placement,
          },
        );

        if (!createdSymbol) {
          return false;
        }

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
          cleanupSymbolAtIndex(createdSymbolIndex);
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
        if (normalizedSymbols.size === 0) {
          return 0;
        }

        let removalCount = 0;
        for (
          let index = state.activeFallingSymbols.length - 1;
          index >= 0;
          index -= 1
        ) {
          const symbolObj = state.activeFallingSymbols[index];
          const normalizedSymbol = window.SymbolRainTargets?.normalizeSymbol?.(
            symbolObj?.symbol || symbolObj?.element?.textContent || "",
          );

          if (!normalizedSymbols.has(normalizedSymbol)) {
            continue;
          }

          if (cleanupSymbolAtIndex(index)) {
            removalCount += 1;
          }
        }

        return removalCount;
      } catch (error) {
        console.warn("Symbol Rain controller removal failed", error);
        return 0;
      }
    }

    window.SymbolRainController = {
      getSnapshot: getPublicSnapshot,
      start(reason) {
        return runLifecycleAction("requestStart", reason);
      },
      stop(reason) {
        return runLifecycleAction("stop", reason);
      },
      destroy(reason) {
        const snapshot = runLifecycleAction("destroy", reason);
        runControllerTeardown();
        return snapshot || getPublicSnapshot();
      },
      refreshLayout(reason) {
        try {
          if (controllerDestroyed) {
            return getPublicSnapshot();
          }

          state.isMobileMode = isCompactDisplayMode();
          refreshLayoutMetrics(true);
          return (
            symbolRainLifecycle.onLayoutChanged?.(reason || "controller") ||
            getPublicSnapshot()
          );
        } catch (error) {
          console.warn("Symbol Rain controller layout refresh failed", error);
          return null;
        }
      },
      restartCollectedSymbol,
      spawnVisibleSymbol,
      removeMatchingSymbols,
      syncKeyboardTarget() {
        try {
          const syncKeyboardTarget = interactionController?.syncKeyboardTarget;
          if (typeof syncKeyboardTarget !== "function") {
            return false;
          }

          return Boolean(syncKeyboardTarget());
        } catch (error) {
          console.warn("Symbol Rain controller keyboard sync failed", error);
          return false;
        }
      },
    };

    interactionController = SymbolRainInteractions.bindInteractions(
      symbolRainContainer,
      state,
    );
    registerTeardown(() => interactionController?.dispose?.());
    window.__symbolRainLifecycle = symbolRainLifecycle;
    symbolRainLifecycle.requestStart("init");

    const handleProblemCompleted = () => {
      if (controllerDestroyed) {
        return;
      }

      SymbolRainAnimation.resetSpeed(state);
    };

    const handleVisibilityChange = () => {
      if (controllerDestroyed) {
        return;
      }

      state.isTabVisible = !document.hidden;
      if (state.isTabVisible) {
        symbolRainLifecycle?.resumeManagedTimeouts?.();
      } else {
        symbolRainLifecycle?.pauseManagedTimeouts?.();
      }
    };

    const debouncedResize = debounce(() => {
      if (controllerDestroyed) {
        return;
      }

      state.isMobileMode = isCompactDisplayMode();
      symbolRainLifecycle.onLayoutChanged("resize");
    }, 250);

    const debouncedLocalLayoutRefresh = debounce(() => {
      if (controllerDestroyed) {
        return;
      }

      state.isMobileMode = isCompactDisplayMode();
      symbolRainLifecycle.onLayoutChanged("local-layout-refresh");
    }, 20);

    addControllerListener(
      document,
      GameEvents.PROBLEM_COMPLETED,
      handleProblemCompleted,
    );
    addControllerListener(document, "visibilitychange", handleVisibilityChange);
    addControllerListener(window, "resize", debouncedResize);

    const unsubscribeResizeHub = window.SharedResizeObserver?.subscribe?.(
      debouncedResize,
      {
        immediate: true,
        source: "symbol-rain",
      },
    );
    registerTeardown(unsubscribeResizeHub);

    let panelLocalResizeObserver = null;
    if (typeof ResizeObserver === "function") {
      panelLocalResizeObserver = new ResizeObserver(() => {
        debouncedLocalLayoutRefresh();
      });

      if (panelC) {
        panelLocalResizeObserver.observe(panelC);
      }
      panelLocalResizeObserver.observe(symbolRainContainer);
      registerTeardown(() => {
        panelLocalResizeObserver.disconnect();
      });
    }

    const handleDisplayResolutionChanged = (event) => {
      if (controllerDestroyed) {
        return;
      }

      pendingResponsiveModeOverride =
        event.detail?.isCompactViewport === true ||
        document.body.classList.contains("viewport-compact");
      state.isMobileMode = pendingResponsiveModeOverride;
      symbolRainLifecycle.onLayoutChanged("display-resolution-changed");
    };
    addControllerListener(
      document,
      GameEvents.DISPLAY_RESOLUTION_CHANGED,
      handleDisplayResolutionChanged,
    );

    window.getActiveSymbolCount = function () {
      return state.activeFallingSymbols.length;
    };
  } catch (e) {
    console.error("Symbol Rain init error:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSymbolRain);
} else {
  initSymbolRain();
}
