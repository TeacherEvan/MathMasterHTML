// src/scripts/symbol-rain.helpers.interactions.js - Click handling helpers
console.log("🎯 SymbolRain helpers: interactions loading...");

(function attachSymbolRainInteractionHelpers() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});
  const GameEvents = window.GameEvents || {
    SYMBOL_CLICKED: "symbolClicked",
  };

  helpers.handleSymbolClick = function handleSymbolClick(
    { activeFallingSymbols, symbolPool, activeFaceReveals, spatialGrid },
    symbolElement,
    event,
  ) {
    const panel = document.getElementById("panel-c");
    if (!panel || !panel.contains(event.target)) {
      return;
    }

    if (symbolElement.classList.contains("clicked")) {
      return;
    }

    const clickedSymbol = symbolElement.textContent;
    symbolElement.classList.add("clicked");
    symbolElement.dataset.symbolState = "clicked";

    document.dispatchEvent(
      new CustomEvent(GameEvents.SYMBOL_CLICKED, {
        detail: { symbol: clickedSymbol },
      }),
    );

    const managedLifecycle = window.__symbolRainLifecycle;

    const scheduleReplacement = (callback) => {
      const managedTimeout = managedLifecycle?.createManagedTimeout?.(
        callback,
        500,
      );

      if (managedTimeout) {
        return managedTimeout;
      }

      return window.setTimeout(callback, 500);
    };

    scheduleReplacement(() => {
      const symbolObj = activeFallingSymbols.find(
        (s) => s.element === symbolElement,
      );
      if (symbolObj) {
        symbolObj.isCollected = true;
        if (helpers.clearSymbolLifecycle) {
          helpers.clearSymbolLifecycle(symbolObj);
        }
        const replacementController = window.SymbolRainController;
        const restarted = replacementController?.restartCollectedSymbol?.(
          symbolObj,
          clickedSymbol,
        );

        if (!restarted && replacementController?.spawnVisibleSymbol) {
          replacementController.spawnVisibleSymbol(clickedSymbol, {
            horizontalOffset: 0,
          });
        }
        return;
      }
      if (symbolElement.parentNode) {
        symbolElement.parentNode.removeChild(symbolElement);
      }
      symbolPool.release(symbolElement);
    }, 500);
  };
})();
