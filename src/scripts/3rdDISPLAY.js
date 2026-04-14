// js/3rdDISPLAY.js - Symbol Rain Display for Math Game

function initSymbolRain() {
  try {
    const MAX_LAYOUT_RETRIES = 24;
    const GameEvents = window.GameEvents || {
      DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
      PROBLEM_COMPLETED: "problemCompleted",
    };
    const symbolRainContainer = document.getElementById(
      "symbol-rain-container",
    );
    if (!symbolRainContainer) {
      return;
    }

    const SymbolRainHelpers = window.SymbolRainHelpers;
    const SymbolRainConfig = window.SymbolRainConfig;
    const SymbolRainSymbols = window.SymbolRainSymbols;
    const SymbolRainAnimation = window.SymbolRainAnimation;
    const SymbolRainInteractions = window.SymbolRainInteractions;
    const SymbolRainSpawn = window.SymbolRainSpawn;

    if (
      !SymbolRainHelpers ||
      !SymbolRainConfig ||
      !SymbolRainSymbols ||
      !SymbolRainAnimation ||
      !SymbolRainInteractions ||
      !SymbolRainSpawn
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
        spawnRate: 0.05,
        burstSpawnRate: 0.05,
        guaranteedSpawnInterval: 1000,
        symbolsPerWave: 4,
        maxActiveSymbols: 30,
      },
      standard: {
        spawnRate: 0.5,
        burstSpawnRate: 0.15,
        guaranteedSpawnInterval: 5000,
        symbolsPerWave: 14,
        maxActiveSymbols: 200,
      },
    };
    const preservePerfSmokeConfig = window.__PERF_SMOKE_MODE === true;

    function isGameplayReady() {
      return window.GameRuntimeCoordinator?.isGameplayReady?.() === true;
    }

    function queueBootstrapWhenGameplayReady() {
      if (state.bootstrapDeferred) {
        return;
      }

      const gameplayReadyEvent = GameEvents?.GAMEPLAY_READY_CHANGED;
      if (!gameplayReadyEvent) {
        return;
      }

      state.bootstrapDeferred = true;
      document.addEventListener(
        gameplayReadyEvent,
        (event) => {
          if (!event.detail?.gameplayReady) {
            return;
          }

          state.bootstrapDeferred = false;
          scheduleBootstrap();
        },
        { once: true },
      );
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
      guaranteedSpawnControllerId: null,
      symbolsToRemove: new Set(),
      cachedContainerHeight: 0,
      isTabVisible: !document.hidden,
      isMobileMode: isCompactDisplayMode(),
      spatialGrid: SymbolRainHelpers.createSpatialGrid(SymbolRainConfig),
      symbolPool: SymbolRainHelpers.createSymbolPool(SymbolRainConfig),
      bootstrapFrameId: null,
      layoutRetryId: null,
      layoutRetryCount: 0,
      bootstrapDeferred: false,
    };

    window.__symbolRainState = state;

    const debounce = SymbolRainHelpers.debounce;

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
    }

    syncResponsiveConfig();

    function calculateColumns() {
      const { columnCount, containerHeight } =
        SymbolRainHelpers.calculateColumns(
          symbolRainContainer,
          SymbolRainConfig,
        );
      state.cachedContainerHeight = containerHeight;
      state.columnCount = columnCount;
    }

    function hasUsableLayout() {
      return state.columnCount > 0 && state.cachedContainerHeight > 0;
    }

    function populateInitialSymbols() {
      SymbolRainHelpers.populateInitialSymbols(
        {
          config: SymbolRainConfig,
          columnCount: state.columnCount,
          isMobileMode: state.isMobileMode,
          activeFallingSymbols: state.activeFallingSymbols,
          symbols: state.symbols,
          symbolRainContainer,
          symbolPool: state.symbolPool,
          lastSymbolSpawnTimestamp: state.lastSymbolSpawnTimestamp,
        },
        () => {
          state.isInitialPopulation = false;
        },
      );
    }

    function startControllers() {
      SymbolRainAnimation.startAnimation(state);
      SymbolRainAnimation.startSpeedController(state);
      SymbolRainSpawn.startGuaranteedSpawnController(state);
    }

    function scheduleBootstrap() {
      if (state.bootstrapDeferred && !isGameplayReady()) {
        return;
      }

      if (state.bootstrapFrameId !== null) {
        return;
      }

      state.bootstrapFrameId = requestAnimationFrame(() => {
        state.bootstrapFrameId = null;

        if (!isGameplayReady()) {
          queueBootstrapWhenGameplayReady();
          return;
        }

        state.isMobileMode = isCompactDisplayMode();
        syncResponsiveConfig();
        calculateColumns();

        if (!hasUsableLayout()) {
          if (state.layoutRetryCount >= MAX_LAYOUT_RETRIES) {
            console.warn(
              "⚠️ Symbol Rain layout never stabilized; skipping startup",
            );
            return;
          }

          state.layoutRetryCount += 1;
          clearTimeout(state.layoutRetryId);
          state.layoutRetryId = window.setTimeout(() => {
            state.layoutRetryId = null;
            scheduleBootstrap();
          }, 80);
          return;
        }

        clearTimeout(state.layoutRetryId);
        state.layoutRetryId = null;
        state.layoutRetryCount = 0;
        startControllers();

        if (state.isInitialPopulation && state.activeFallingSymbols.length === 0) {
          populateInitialSymbols();
        }
      });
    }

    SymbolRainInteractions.bindInteractions(symbolRainContainer, state);
    scheduleBootstrap();

    document.addEventListener(GameEvents.PROBLEM_COMPLETED, () => {
      SymbolRainAnimation.resetSpeed(state);
    });

    document.addEventListener("visibilitychange", () => {
      state.isTabVisible = !document.hidden;
    });

    const debouncedResize = debounce(() => {
      state.isMobileMode = isCompactDisplayMode();
      syncResponsiveConfig();
      scheduleBootstrap();
    }, 250);

    window.addEventListener("resize", debouncedResize);
    window.SharedResizeObserver?.subscribe?.(debouncedResize, {
      immediate: true,
      source: "symbol-rain",
    });

    document.addEventListener(
      GameEvents.DISPLAY_RESOLUTION_CHANGED,
      (event) => {
        state.isMobileMode =
          event.detail?.isCompactViewport === true ||
          document.body.classList.contains("viewport-compact");
        syncResponsiveConfig();
        scheduleBootstrap();
      },
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
