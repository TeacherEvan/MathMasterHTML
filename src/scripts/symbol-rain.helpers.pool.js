// src/scripts/symbol-rain.helpers.pool.js - Symbol pool + cleanup helpers
console.log("🎯 SymbolRain helpers: pool loading...");

(function attachSymbolRainPool() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});

  helpers.createSymbolPool = function createSymbolPool(config) {
    return {
      pool: [],

      get() {
        if (this.pool.length > 0) {
          const symbol = this.pool.pop();
          symbol.style.display = "block";
          symbol.dataset.symbolState = symbol.dataset.symbolState || "hidden";
          return symbol;
        }
        const symbol = document.createElement("div");
        symbol.className = "falling-symbol";
        symbol.dataset.symbolState = "hidden";
        return symbol;
      },

      release(symbolElement) {
        const maxPoolSize = config.maxDomElements || config.poolSize || 150;

        if (this.pool.length < maxPoolSize) {
          symbolElement.style.display = "none";
          symbolElement.className = "falling-symbol";
          symbolElement.dataset.symbolState = "hidden";
          this.pool.push(symbolElement);
        } else {
          symbolElement.remove();
        }
      },
    };
  };

  helpers.cleanupSymbolObject = function cleanupSymbolObject({
    symbolObj,
    activeFaceReveals,
    symbolPool,
    spatialGrid,
  }) {
    if (helpers.clearSymbolLifecycle) {
      helpers.clearSymbolLifecycle(symbolObj);
    }

    if (activeFaceReveals.has(symbolObj)) {
      activeFaceReveals.delete(symbolObj);
      if (helpers.resetFaceRevealStyles) {
        helpers.resetFaceRevealStyles(symbolObj.element);
      }
    }
    if (spatialGrid && spatialGrid.remove) {
      spatialGrid.remove(symbolObj);
    }
    symbolObj.element.remove();
    symbolPool.release(symbolObj.element);
  };
})();
