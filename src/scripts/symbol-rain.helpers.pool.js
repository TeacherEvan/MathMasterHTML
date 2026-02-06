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
          return symbol;
        }
        const symbol = document.createElement("div");
        symbol.className = "falling-symbol";
        return symbol;
      },

      release(symbolElement) {
        if (this.pool.length < config.poolSize) {
          symbolElement.style.display = "none";
          symbolElement.className = "falling-symbol";
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
  }) {
    if (activeFaceReveals.has(symbolObj)) {
      activeFaceReveals.delete(symbolObj);
      if (helpers.resetFaceRevealStyles) {
        helpers.resetFaceRevealStyles(symbolObj.element);
      }
    }
    symbolObj.element.remove();
    symbolPool.release(symbolObj.element);
  };
})();
