// src/scripts/game-symbol-helpers.js - Symbol reveal helpers
console.log("🎯 GameSymbolHelpers loading...");

(function attachGameSymbolHelpers() {
  function getNextSymbol({ stepIndex, getCachedStepSymbols }) {
    const currentStepSymbols = getCachedStepSymbols(stepIndex);
    const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
      el.classList.contains("hidden-symbol"),
    );

    if (hiddenSymbols.length > 0) {
      return hiddenSymbols.map((span) => span.textContent);
    }

    return null;
  }

  function isSymbolInCurrentLine({
    clickedSymbol,
    stepIndex,
    getCachedStepSymbols,
    normalizeSymbol,
  }) {
    const expectedSymbols = getNextSymbol({ stepIndex, getCachedStepSymbols });

    if (expectedSymbols && Array.isArray(expectedSymbols)) {
      const normalizedClicked = normalizeSymbol(clickedSymbol);
      const normalizedExpected = expectedSymbols.map((s) => normalizeSymbol(s));

      return normalizedExpected.includes(normalizedClicked);
    }
    return false;
  }

  function revealSpecificSymbol({
    targetSymbol,
    stepIndex,
    getCachedStepSymbols,
    invalidateStepCache,
    normalizeSymbol,
    onSymbolRevealed,
  }) {
    const normalizedTarget = normalizeSymbol(targetSymbol);
    const currentStepSymbols = getCachedStepSymbols(stepIndex);
    const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
      el.classList.contains("hidden-symbol"),
    );

    for (const span of hiddenSymbols) {
      const spanSymbol = span.textContent;
      const normalizedSpan = normalizeSymbol(spanSymbol);

      if (normalizedSpan === normalizedTarget) {
        span.classList.remove("hidden-symbol");
        span.classList.add("revealed-symbol");
        invalidateStepCache();

        onSymbolRevealed?.(targetSymbol, span);
        return true;
      }
    }

    return false;
  }

  window.GameSymbolHelpers = {
    getNextSymbol,
    isSymbolInCurrentLine,
    revealSpecificSymbol,
  };
})();
