// js/3rdDISPLAY.js - Symbol Rain Display bootstrap.
// The controller owns all module construction and shared state; this file only
// verifies dependencies and starts it once the DOM is available.

function initSymbolRain() {
  // createController() replaces window.SymbolRainController with the public
  // API, so keep the factory and guard against a second initialization.
  if (window.__symbolRainInitialized) return;
  const controllerFactory = window.SymbolRainController?.createController;
  if (typeof controllerFactory !== "function") {
    console.error("❌ Symbol Rain controller factory not available");
    return;
  }

  const requiredModules = [
    "SymbolRainHelpers",
    "SymbolRainConfig",
    "SymbolRainSymbols",
    "SymbolRainAnimation",
    "SymbolRainInteractions",
    "SymbolRainLifecycle",
    "SymbolRainPlacement",
    "SymbolRainTeardown",
    "SymbolRainPlacementAdapter",
    "SymbolRainSpawner",
    "SymbolRainController",
  ];

  const missing = requiredModules.filter((name) => !window[name]);
  if (missing.length > 0) {
    console.error("❌ Symbol Rain modules not loaded: missing " + missing.join(", "));
    return;
  }

  const {
    SymbolRainHelpers,
    SymbolRainConfig,
    SymbolRainSymbols,
    SymbolRainAnimation,
    SymbolRainInteractions,
    SymbolRainLifecycle,
    SymbolRainPlacement,
  } = window;

  try {
    const controller = controllerFactory({
      SymbolRainHelpers,
      SymbolRainConfig,
      SymbolRainSymbols,
      SymbolRainAnimation,
      SymbolRainInteractions,
      SymbolRainLifecycle,
      SymbolRainPlacement,
    });
    window.__symbolRainInitialized = Boolean(controller);
  } catch (error) {
    console.error("Symbol Rain init error:", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initSymbolRain, { once: true });
} else {
  initSymbolRain();
}
