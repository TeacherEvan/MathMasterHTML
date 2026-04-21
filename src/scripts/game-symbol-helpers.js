// src/scripts/game-symbol-helpers.js - Symbol reveal helpers
console.log("🎯 GameSymbolHelpers loading...");

(function attachGameSymbolHelpers() {
  function getSymbolValue(element) {
    return String(element?.dataset?.expected || element?.textContent || "").trim();
  }

  function setHiddenSymbolState(element) {
    if (!element || element.classList.contains("space-symbol")) {
      return "";
    }

    const symbolValue = getSymbolValue(element);
    if (symbolValue && !element.dataset.expected) {
      element.dataset.expected = symbolValue;
    }

    element.textContent = "";
    element.classList.remove("revealed-symbol");
    element.classList.add("hidden-symbol");
    element.style.visibility = "visible";

    return symbolValue;
  }

  function setRevealedSymbolState(element) {
    if (!element) {
      return "";
    }

    const symbolValue = getSymbolValue(element);
    element.textContent = symbolValue;
    element.classList.remove("hidden-symbol");
    element.classList.add("revealed-symbol");
    element.style.visibility = "visible";

    return symbolValue;
  }

  function invalidateWormSymbolCache() {
    window.wormSystem?.invalidateSymbolCache?.();
  }

  function getNextSymbol({ stepIndex, getCachedStepSymbols }) {
    const currentStepSymbols = getCachedStepSymbols(stepIndex);
    const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
      el.classList.contains("hidden-symbol"),
    );

    if (hiddenSymbols.length > 0) {
      return hiddenSymbols.map((span) => getSymbolValue(span));
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
      const spanSymbol = getSymbolValue(span);
      const normalizedSpan = normalizeSymbol(spanSymbol);

      if (normalizedSpan === normalizedTarget) {
        setRevealedSymbolState(span);
        invalidateStepCache();
        invalidateWormSymbolCache();

        onSymbolRevealed?.(targetSymbol, span);
        return true;
      }
    }

    return false;
  }

  window.GameSymbolHelpers = {
    getSymbolValue,
    getNextSymbol,
    isSymbolInCurrentLine,
    revealSpecificSymbol,
    setHiddenSymbolState,
    setRevealedSymbolState,
  };
})();
