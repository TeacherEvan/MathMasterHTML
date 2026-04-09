// src/scripts/symbol-rain.helpers.utils.js - Shared utility helpers
console.log("🎯 SymbolRain helpers: utils loading...");

(function attachSymbolRainUtils() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});

  helpers.debounce = function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  helpers.calculateColumns = function calculateColumns(container, config) {
    const containerRect = container?.getBoundingClientRect?.() || {
      width: 0,
      height: 0,
    };
    const parentElement = container?.parentElement;
    const containerWidth =
      containerRect.width ||
      container?.clientWidth ||
      container?.offsetWidth ||
      parentElement?.clientWidth ||
      0;
    const containerHeight =
      containerRect.height ||
      container?.clientHeight ||
      container?.offsetHeight ||
      parentElement?.clientHeight ||
      0;
    const columnCount = Math.max(
      0,
      Math.floor(containerWidth / config.columnWidth),
    );
    return { columnCount, containerHeight };
  };

  helpers.isColumnCrowded = function isColumnCrowded(
    activeFallingSymbols,
    targetColumnIndex,
  ) {
    for (
      let symbolIndex = 0;
      symbolIndex < activeFallingSymbols.length;
      symbolIndex++
    ) {
      const currentSymbol = activeFallingSymbols[symbolIndex];
      if (currentSymbol.column === targetColumnIndex && currentSymbol.y < 40) {
        return true;
      }
    }
    return false;
  };
})();
