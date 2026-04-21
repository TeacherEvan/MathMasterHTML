// js/game-symbol-handler.stolen.js - Stolen symbol restoration
console.log("🔤 Game symbol handler stolen module loading...");

(function () {
  if (!window.normalizeSymbol) {
    console.error("❌ normalizeSymbol not loaded");
    return;
  }

  function invalidateWormSymbolCache() {
    window.wormSystem?.invalidateSymbolCache?.();
  }

  function restoreStolenSymbol({
    solutionContainer,
    clickedSymbol,
    onLineCompletion,
  }) {
    if (!solutionContainer) {
      return false;
    }

    const normalizedClicked = normalizeSymbol(clickedSymbol);
    const stolenSymbols = solutionContainer.querySelectorAll(
      '[data-stolen="true"]',
    );

    for (const stolenSymbol of stolenSymbols) {
      const stolenText =
        window.GameSymbolHelpers?.getSymbolValue?.(stolenSymbol) ||
        stolenSymbol.dataset.expected ||
        stolenSymbol.textContent;
      const normalizedStolen = normalizeSymbol(stolenText);

      if (normalizedStolen === normalizedClicked) {
        const wasBlueSymbol = stolenSymbol.dataset.wasRevealed === "true";

        window.GameSymbolHelpers?.setRevealedSymbolState?.(stolenSymbol);
        stolenSymbol.classList.remove("stolen");
        delete stolenSymbol.dataset.stolen;
        invalidateWormSymbolCache();

        if (wasBlueSymbol) {
          delete stolenSymbol.dataset.wasRevealed;
        }

        document.body.style.background = wasBlueSymbol
          ? "radial-gradient(circle, rgba(0,255,255,0.3), rgba(0,0,0,1))"
          : "radial-gradient(circle, rgba(0,255,255,0.2), rgba(0,0,0,1))";

        setTimeout(() => {
          document.body.style.background = "";
        }, 300);

        onLineCompletion?.();
        return true;
      }
    }

    return false;
  }

  window.GameSymbolHandlerStolen = {
    restoreStolenSymbol,
  };

  console.log("✅ Game symbol handler stolen module loaded");
})();
