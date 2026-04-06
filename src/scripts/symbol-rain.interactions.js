(function () {
  const SymbolRainHelpers = window.SymbolRainHelpers;

  function bindInteractions(symbolRainContainer, state) {
    if (!SymbolRainHelpers || !symbolRainContainer) {
      return;
    }

    let isPointerCurrentlyDown = false;
    let _lastClickedFallingSymbol = null;

    const resetPointerState = () => {
      isPointerCurrentlyDown = false;
      _lastClickedFallingSymbol = null;
    };

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

    window.addEventListener("pointerup", resetPointerState, {
      passive: true,
    });

    window.addEventListener("pointercancel", resetPointerState, {
      passive: true,
    });

    window.addEventListener("blur", resetPointerState, {
      passive: true,
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
