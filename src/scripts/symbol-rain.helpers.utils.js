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

  helpers.getRainWindowRect = function getRainWindowRect(container) {
    if (!container?.getBoundingClientRect) {
      return null;
    }

    const rect = container.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return rect;
  };

  helpers.rectIntersectsRainWindow = function rectIntersectsRainWindow(
    rect,
    rainRect,
  ) {
    if (!rect || !rainRect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    return (
      rect.bottom > rainRect.top &&
      rect.top < rainRect.bottom &&
      rect.right > rainRect.left &&
      rect.left < rainRect.right
    );
  };

  helpers.isSymbolVisibleInRainWindow = function isSymbolVisibleInRainWindow(
    state,
    symbolObj,
  ) {
    if (!symbolObj?.element?.isConnected) {
      return false;
    }

    if (
      symbolObj.element.dataset?.symbolState !== "visible" &&
      symbolObj.element.getAttribute?.("data-symbol-state") !== "visible"
    ) {
      return false;
    }

    if (symbolObj.element.classList.contains("clicked")) {
      return false;
    }

    const rainRect = helpers.getRainWindowRect(state?.symbolRainContainer);
    if (!rainRect) {
      return false;
    }

    return helpers.rectIntersectsRainWindow(
      symbolObj.element.getBoundingClientRect(),
      rainRect,
    );
  };

  helpers.isSymbolPastRainWindow = function isSymbolPastRainWindow(
    state,
    symbolObj,
    padding = 0,
  ) {
    if (!symbolObj?.element?.isConnected) {
      return true;
    }

    const rainRect = helpers.getRainWindowRect(state?.symbolRainContainer);
    if (!rainRect) {
      const cachedContainerHeight = state?.cachedContainerHeight;
      if (
        !Number.isFinite(cachedContainerHeight) ||
        cachedContainerHeight <= 0
      ) {
        return false;
      }

      return symbolObj.y > cachedContainerHeight + padding;
    }

    const rect = symbolObj.element.getBoundingClientRect();
    return rect.top > rainRect.bottom + padding;
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
