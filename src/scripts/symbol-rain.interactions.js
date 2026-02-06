(function() {
  const SymbolRainHelpers = window.SymbolRainHelpers;

  function bindInteractions(symbolRainContainer, state) {
    if (!SymbolRainHelpers || !symbolRainContainer) {
      return;
    }

    let isPointerCurrentlyDown = false;
    let _lastClickedFallingSymbol = null;

    symbolRainContainer.addEventListener(
      "pointerdown",
      (event) => {
        if (isPointerCurrentlyDown) return;
        isPointerCurrentlyDown = true;

        const fallingSymbolElement = event.target.closest(".falling-symbol");
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          event.preventDefault();
          _lastClickedFallingSymbol = fallingSymbolElement;
          SymbolRainHelpers.handleSymbolClick(
            {
              activeFallingSymbols: state.activeFallingSymbols,
              symbolPool: state.symbolPool,
              activeFaceReveals: state.activeFaceReveals,
            },
            fallingSymbolElement,
            event,
          );
        }
      },
      { passive: false },
    );

    symbolRainContainer.addEventListener("pointerup", () => {
      isPointerCurrentlyDown = false;
      _lastClickedFallingSymbol = null;
    });

    symbolRainContainer.addEventListener("pointercancel", () => {
      isPointerCurrentlyDown = false;
      _lastClickedFallingSymbol = null;
    });

    if (!window.PointerEvent) {
      symbolRainContainer.addEventListener("click", (event) => {
        const fallingSymbolElement = event.target.closest(".falling-symbol");
        if (
          fallingSymbolElement &&
          symbolRainContainer.contains(fallingSymbolElement)
        ) {
          SymbolRainHelpers.handleSymbolClick(
            {
              activeFallingSymbols: state.activeFallingSymbols,
              symbolPool: state.symbolPool,
              activeFaceReveals: state.activeFaceReveals,
            },
            fallingSymbolElement,
            event,
          );
        }
      });
    }
  }

  window.SymbolRainInteractions = { bindInteractions };
})();
