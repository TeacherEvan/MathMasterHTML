// src/scripts/symbol-rain.helpers.interactions.js - Click handling helpers
console.log("🎯 SymbolRain helpers: interactions loading...");

(function attachSymbolRainInteractionHelpers() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});

  helpers.handleSymbolClick = function handleSymbolClick(
    { activeFallingSymbols, symbolPool, activeFaceReveals },
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

    document.dispatchEvent(
      new CustomEvent("symbolClicked", { detail: { symbol: clickedSymbol } }),
    );

    setTimeout(() => {
      const symbolObj = activeFallingSymbols.find(
        (s) => s.element === symbolElement,
      );
      if (symbolObj) {
        const symbolIndex = activeFallingSymbols.indexOf(symbolObj);
        if (symbolIndex !== -1) {
          activeFallingSymbols.splice(symbolIndex, 1);
        }
        if (helpers.cleanupSymbolObject) {
          helpers.cleanupSymbolObject({
            symbolObj,
            activeFaceReveals,
            symbolPool,
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
