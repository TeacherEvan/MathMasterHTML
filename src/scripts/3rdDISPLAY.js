// js/3rdDISPLAY.js - Symbol Rain Display for Math Game

function initSymbolRain() {
  try {
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
      symbolsToRemove: new Set(),
      cachedContainerHeight: 0,
      isTabVisible: !document.hidden,
      isMobileMode:
        window.innerWidth <= 768 ||
        document.body.classList.contains("res-mobile"),
      spatialGrid: SymbolRainHelpers.createSpatialGrid(SymbolRainConfig),
      symbolPool: SymbolRainHelpers.createSymbolPool(SymbolRainConfig),
    };

    const debounce = SymbolRainHelpers.debounce;

    function calculateColumns() {
      const {
        columnCount,
        containerHeight,
      } = SymbolRainHelpers.calculateColumns(
        symbolRainContainer,
        SymbolRainConfig,
      );
      state.cachedContainerHeight = containerHeight;
      state.columnCount = columnCount;
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

    SymbolRainInteractions.bindInteractions(symbolRainContainer, state);

    calculateColumns();
    populateInitialSymbols();
    SymbolRainAnimation.startAnimation(state);
    SymbolRainAnimation.startSpeedController(state);
    SymbolRainSpawn.startGuaranteedSpawnController(state);

    document.addEventListener("problemCompleted", () => {
      SymbolRainAnimation.resetSpeed(state);
    });

    document.addEventListener("visibilitychange", () => {
      state.isTabVisible = !document.hidden;
    });

    const debouncedResize = debounce(() => {
      state.isMobileMode =
        window.innerWidth <= 768 ||
        document.body.classList.contains("res-mobile");
      calculateColumns();
    }, 250);

    window.addEventListener("resize", debouncedResize);

    document.addEventListener("displayResolutionChanged", (event) => {
      state.isMobileMode = event.detail.name === "mobile";
    });

    window.getActiveSymbolCount = function() {
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
