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
    const SymbolRainPlacement = window.SymbolRainPlacement;

    if (
      !SymbolRainHelpers ||
      !SymbolRainConfig ||
      !SymbolRainSymbols ||
      !SymbolRainAnimation ||
      !SymbolRainInteractions ||
      !SymbolRainLifecycle ||
      !SymbolRainPlacement
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
      layout: null,
      // Bound to the slot registry once the planner is constructed below.
      slotOwners: [],
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

      if (layoutChanged) {
        // A reflow invalidates every slot coordinate. Re-derive the grid and
        // pull the live symbols back inside it so nothing is left stranded
        // outside the rain window (or on top of the console after a resize).
        // `reconcileVisibleSlots` rebuilds atomically: it never leaves the
        // controller with a null grid, because the resurface timer only fires
        // on a later tick and would have nothing to measure against.
        reconcileVisibleSlots();
      }

      return layoutChanged;
    }

    function hasUsableLayout() {
      return state.columnCount > 0 && state.cachedContainerHeight > 0;
    }

    function getContainerBounds() {
      return symbolRainContainer?.getBoundingClientRect?.() || null;
    }

    /* ---------------------------------------------------------------
       Playable rain layout
       ---------------------------------------------------------------
       Placement used to be decided against a hard-coded 30x30 glyph that
       actually renders at 44x44 (and at 80x70 before the hit-box fix),
       which is why the field could not avoid overlapping itself.

       The geometry now lives in `symbol-rain.placement.js` as pure
       functions over measured rects: chrome bands -> slot grid -> slot
       position. This file only owns the DOM adapter (measure once per
       layout epoch) and the slot registry wiring. Because a cell can
       never be smaller than a box, two visible symbols can never
       intersect; when every slot is taken the symbol stays hidden until
       one frees up (backpressure instead of stacking).
    ---------------------------------------------------------------- */
    const CHROME_SELECTORS = [
      "#game-hud",
      "#panel-c .panel-c-console-zone",
      "#back-button",
      "#audio-toggle",
    ];
    const slotRegistry = SymbolRainPlacement.createRegistry(0);
    // Observability alias: `window.__symbolRainState.slotOwners` mirrors the
    // registry without copying it, so debug tooling always sees live data.
    state.slotOwners = slotRegistry.owners;

    function readSymbolBox() {
      // Prefer a live, visible glyph; fall back to any glyph in the container.
      // A pooled element without data-symbol-state used to fall back to block
      // layout and measure the full panel width, which turned the grid into a
      // single column and starved every resurface.
      const visibleProbe = state.activeFallingSymbols.find(
        (symbolObj) =>
          symbolObj?.element?.isConnected &&
          symbolObj.element.dataset?.symbolState === "visible",
      )?.element;
      const probe =
        visibleProbe || symbolRainContainer?.querySelector?.(".falling-symbol");
      const containerWidth = getContainerBounds()?.width || Infinity;
      const width = probe?.offsetWidth || 0;
      const height = probe?.offsetHeight || 0;

      if (width > 0 && height > 0 && width <= containerWidth * 0.5) {
        const computed = window.getComputedStyle(probe);
        return {
          width,
          height,
          padX: Math.round(parseFloat(computed.paddingLeft) || 0),
          padY: Math.round(parseFloat(computed.paddingTop) || 0),
          measured: true,
        };
      }

      return {
        width: Math.max(1, SymbolRainConfig.symbolWidth || 44),
        height: Math.max(1, SymbolRainConfig.symbolHeight || 50),
        padX: 0,
        padY: 0,
        measured: false,
      };
    }

    function readChromeRects() {
      const rects = [];

      for (const selector of CHROME_SELECTORS) {
        const element = document.querySelector(selector);
        if (!element?.getBoundingClientRect) {
          continue;
        }
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          rects.push(rect);
        }
      }

      return rects;
    }

    function rebuildPlacementLayout() {
      const containerRect = getContainerBounds();
      const box = readSymbolBox();
      const bands = SymbolRainPlacement.computeChromeBands(
        containerRect,
        readChromeRects(),
      );
      const grid = SymbolRainPlacement.computeGrid({
        containerRect,
        box,
        bands,
      });

      if (!grid) {
        state.layout = null;
        return false;
      }

      state.layout = grid;

      if (slotRegistry.size !== grid.slotCount) {
        slotRegistry.reset(grid.slotCount);
      }

      // Keep the legacy config readers honest: they now report the box that
      // is actually on screen instead of the stale 30x30 assumption.
      SymbolRainConfig.symbolWidth = box.width;
      SymbolRainConfig.symbolHeight = box.height;

      return true;
    }

    function getSlotPosition(slotIndex) {
      const position = SymbolRainPlacement.slotPosition(
        state.layout,
        slotIndex,
      );
      if (!position || !state.layout) {
        return null;
      }

      return {
        left: position.left + (state.layout.box.padX || 0),
        top: position.top + (state.layout.box.padY || 0),
      };
    }

    function releaseSymbolSlot(symbolObj) {
      if (!symbolObj || !Number.isInteger(symbolObj.slotIndex)) {
        return;
      }

      slotRegistry.release(symbolObj.slotIndex, symbolObj);
      symbolObj.slotIndex = null;
    }

    function claimSlot() {
      // Rebuild when there is no grid yet, when the grid was derived from the
      // config fallback because no glyph had rendered at measure time, or when
      // the registry has no slots at all (a stopped controller resets it to 0).
      const needsRebuild =
        !state.layout ||
        state.layout.box?.measured !== true ||
        slotRegistry.size === 0;

      if (needsRebuild && !rebuildPlacementLayout()) {
        return null;
      }

      const token = { slotIndex: null };
      const slotIndex = slotRegistry.claim(token);
      if (slotIndex === null) {
        return null;
      }

      token.slotIndex = slotIndex;
      const position = getSlotPosition(slotIndex);

      if (!position) {
        slotRegistry.release(slotIndex, token);
        return null;
      }

      return { slotIndex, token, left: position.left, top: position.top };
    }

    function bindSlotToSymbol(claim, symbolObj) {
      if (!claim || !symbolObj) {
        return;
      }

      if (slotRegistry.bind(claim.slotIndex, claim.token, symbolObj)) {
        symbolObj.slotIndex = claim.slotIndex;
      }
    }

    function releaseSlotClaim(claim) {
      if (!claim) {
        return;
      }

      slotRegistry.release(claim.slotIndex, claim.token);
    }

    function reconcileVisibleSlots() {
      // Swap grids atomically. A reflow can be observed while the panel is
      // momentarily zero-sized (modal/transition frames); nulling the layout
      // first would leave the resurface path with no grid and no reason to
      // retry, which strands hidden symbols forever.
      const previousLayout = state.layout;
      if (!rebuildPlacementLayout()) {
        state.layout = previousLayout;
        return;
      }

      for (const symbolObj of state.activeFallingSymbols) {
        if (symbolObj?.element?.dataset?.symbolState !== "visible") {
          continue;
        }

        const claim = claimSlot();
        if (!claim) {
          // The window shrank below the number of visible symbols: retire the
          // surplus instead of leaving stale entities outside the rain window.
          releaseSymbolSlot(symbolObj);
          setSymbolLifecycleState(symbolObj, "hidden");
          state.spatialGrid?.remove?.(symbolObj);
          scheduleHiddenResurface(symbolObj);
          continue;
        }

        releaseSymbolSlot(symbolObj);
        bindSlotToSymbol(claim, symbolObj);
        SymbolRainHelpers.setSymbolPosition(
          symbolObj.element,
          claim.left,
          claim.top,
        );
        symbolObj.x = claim.left;
        symbolObj.y = claim.top;
        symbolObj.column = Math.max(
          0,
          Math.floor(claim.left / (SymbolRainConfig.columnWidth || symbolObj.x || 1)),
        );
        state.spatialGrid?.update?.([symbolObj]);
      }
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
          releaseSymbolSlot(symbolObj);
          state.spatialGrid?.remove?.(symbolObj);
          scheduleHiddenResurface(symbolObj);
        });
      });
    }

    /**
     * Resurface a hidden symbol onto a free slot.
     * @param {object} symbolObj
     * @param {number|null} delayOverride - used to stagger the opening roster so
     *   the whole field never becomes visible (or blank) at the same instant.
     */
    function scheduleHiddenResurface(symbolObj, delayOverride = null) {
      const hiddenMin = SymbolRainConfig.hiddenMinMs || 2000;
      const hiddenMax = SymbolRainConfig.hiddenMaxMs || hiddenMin;
      const hiddenDelay = Number.isFinite(delayOverride)
        ? Math.max(0, delayOverride)
        : hiddenMin + Math.random() * Math.max(0, hiddenMax - hiddenMin);

      scheduleSymbolTimer(symbolObj, hiddenDelay, () => {
        if (controllerDestroyed || symbolObj?.isCollected === true) {
          return;
        }

        const claim = claimSlot();
        if (!claim) {
          // Field is saturated (or the layout is between epochs). Back off
          // instead of spinning at a fixed 400ms, and never give up on the
          // symbol: a hidden symbol that stops retrying is a lost target.
          const attempts = (symbolObj.resurfaceAttempts || 0) + 1;
          symbolObj.resurfaceAttempts = attempts;
          const backoffMs = Math.min(3000, 300 * 2 ** Math.min(attempts, 4));

          scheduleSymbolTimer(symbolObj, backoffMs, () =>
            scheduleHiddenResurface(symbolObj),
          );
          return;
        }

        symbolObj.resurfaceAttempts = 0;

        bindSlotToSymbol(claim, symbolObj);
        SymbolRainHelpers.setSymbolPosition(
          symbolObj.element,
          claim.left,
          claim.top,
        );
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

    function createResurfacingSymbol(
      symbolText,
      placementIndex = 0,
      options = {},
    ) {
      const initialState = options.initialState || "visible";
      const placementOverride = options.placementOverride || null;
      const claim = placementOverride ? null : options.slotClaim || claimSlot();
      const placement = placementOverride || claim;

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

      if (claim) {
        bindSlotToSymbol(claim, symbolObj);
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
        Math.floor(placement.left / (SymbolRainConfig.columnWidth || 1)),
      );
      setSymbolLifecycleState(symbolObj, initialState);

      if (initialState === "hidden") {
        releaseSymbolSlot(symbolObj);
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
          // The element is parked hidden: it only receives a slot (and a real
          // position) when its staggered turn comes up in populateInitialSymbols.
          initialY: 0,
          horizontalOffset: 0,
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
      symbolObj.lifecycleState = "hidden";
      symbolObj.isCollected = false;
      setSymbolLifecycleState(symbolObj, "hidden");
      state.spatialGrid?.remove?.(symbolObj);
      return symbolObj;
    }

    function populateInitialSymbols(initialPopulationToken) {
      const spawnOrder = [];
      const instancesPerSymbol = SymbolRainConfig.instancesPerSymbol || 5;

      // Round-robin so the first N entries cover every distinct symbol before
      // any symbol gets its second copy: the opening roster then guarantees one
      // of each target within the first stagger window.
      for (
        let instanceIndex = 0;
        instanceIndex < instancesPerSymbol;
        instanceIndex += 1
      ) {
        state.symbols.forEach((symbolText) => {
          spawnOrder.push({ symbolText, placementIndex: instanceIndex });
        });
      }

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
          // Stagger the opening roster across one full lifecycle. Scheduling
          // every symbol visible in the same tick is what produced the
          // all-85-visible burst followed by a completely blank field two
          // seconds later; a uniform phase offset keeps the visible count at
          // its steady-state share from the very first frame.
          const lifeCycleMs =
            (SymbolRainConfig.visibleMs || 7000) +
            (SymbolRainConfig.fadeMs || 1000) +
            ((SymbolRainConfig.hiddenMinMs || 2000) +
              (SymbolRainConfig.hiddenMaxMs || 7000)) /
              2;
          // The opening burst keeps the field playable from the first frame
          // (capped by the slot grid so it can never oversubscribe it); the
          // remainder is spread across one full lifecycle.
          const initialBurst = Math.min(
            readySymbols.length,
            Math.max(1, Math.min(12, state.layout?.slotCount || 12)),
          );
          const remainingSymbols = Math.max(1, readySymbols.length - initialBurst);

          readySymbols.forEach((symbolObj, symbolIndex) => {
            const delayMs =
              symbolIndex < initialBurst
                ? 0
                : Math.round(
                    ((symbolIndex - initialBurst) / remainingSymbols) *
                      lifeCycleMs,
                  );
            scheduleHiddenResurface(symbolObj, delayMs);
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
        state.layout = null;
        slotRegistry.reset(0);
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

      releaseSymbolSlot(symbolObj);
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

    function resolveControllerPlacement(options, effectiveColumnCount) {
      const rainMeasurements = getRainWindowMeasurements();
      if (rainMeasurements.width <= 0 || rainMeasurements.height <= 0) {
        return null;
      }

      const claim = claimSlot();
      if (!claim) {
        return null;
      }

      const columnWidth = Math.max(SymbolRainConfig.columnWidth || 1, 1);
      const requestedColumn = Number.isInteger(options?.column)
        ? options.column
        : Math.floor(claim.left / columnWidth);
      const column = Math.max(
        0,
        Math.min(requestedColumn, Math.max(effectiveColumnCount - 1, 0)),
      );

      return {
        column,
        slotClaim: claim,
        placement: { left: claim.left, top: claim.top },
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
            slotClaim: controllerPlacement.slotClaim,
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
