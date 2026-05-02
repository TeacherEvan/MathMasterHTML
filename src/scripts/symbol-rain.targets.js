(function () {
  function normalizeSymbol(value) {
    const text = value == null ? "" : String(value).trim();
    return text.toLowerCase() === "x" ? "X" : text;
  }

  function getSymbolValue(element) {
    return String(
      element?.dataset?.expected || element?.textContent || "",
    ).trim();
  }

  function getCurrentNeededSymbols() {
    const stepIndex = window.GameSymbolHandlerCore?.getCurrentStepIndex?.();
    const isValidStepIndex = Number.isInteger(stepIndex) && stepIndex >= 0;
    const selector = isValidStepIndex
      ? `#solution-container [data-step-index="${stepIndex}"].hidden-symbol, ` +
        `#solution-container [data-step-index="${stepIndex}"] .hidden-symbol`
      : "#solution-container .hidden-symbol";

    return Array.from(document.querySelectorAll(selector))
      .map(getSymbolValue)
      .filter(Boolean);
  }

  function getRainContainer(symbolRainContainer, state) {
    return (
      symbolRainContainer ||
      state?.symbolRainContainer ||
      document.getElementById("symbol-rain-container") ||
      document.getElementById("panel-c")
    );
  }

  function getNormalizedSymbolSet(symbols) {
    if (symbols == null) {
      return null;
    }

    if (typeof symbols === "string" || typeof symbols === "number") {
      return new Set([normalizeSymbol(symbols)].filter(Boolean));
    }

    return new Set(Array.from(symbols).map(normalizeSymbol).filter(Boolean));
  }

  function rectIntersectsDirectly(rect, rainRect) {
    if (!rect || !rainRect || rect.width <= 0 || rect.height <= 0) {
      return false;
    }

    return (
      rect.bottom > rainRect.top &&
      rect.top < rainRect.bottom &&
      rect.right > rainRect.left &&
      rect.left < rainRect.right
    );
  }

  function rectIntersectsRainWindow(container, rect) {
    const SymbolRainHelpers = window.SymbolRainHelpers;
    const rainRect =
      SymbolRainHelpers?.getRainWindowRect?.(container) ||
      container?.getBoundingClientRect?.() ||
      null;

    if (SymbolRainHelpers?.rectIntersectsRainWindow) {
      return SymbolRainHelpers.rectIntersectsRainWindow(rect, rainRect);
    }

    return rectIntersectsDirectly(rect, rainRect);
  }

  function isVisibleStateElement(element) {
    return (
      element?.dataset?.symbolState === "visible" ||
      element?.getAttribute?.("data-symbol-state") === "visible"
    );
  }

  function isVisibleSymbolObject(state, symbolObj, container, rect) {
    const SymbolRainHelpers = window.SymbolRainHelpers;
    const visibilityState = state?.symbolRainContainer
      ? state
      : { ...state, symbolRainContainer: container };

    if (SymbolRainHelpers?.isSymbolVisibleInRainWindow) {
      return SymbolRainHelpers.isSymbolVisibleInRainWindow(
        visibilityState,
        symbolObj,
      );
    }

    return rectIntersectsRainWindow(container, rect);
  }

  function shouldIncludeCandidate(symbol, normalizedSymbols, matchRequired) {
    return !matchRequired || normalizedSymbols?.has(normalizeSymbol(symbol));
  }

  function createCandidate(
    element,
    symbolObj,
    container,
    normalizedSymbols,
    matchRequired,
  ) {
    if (
      !element?.isConnected ||
      element.classList.contains("clicked") ||
      !isVisibleStateElement(element)
    ) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (!rectIntersectsRainWindow(container, rect)) {
      return null;
    }

    const symbol = String(
      symbolObj?.symbol || element.textContent || "",
    ).trim();
    if (!shouldIncludeCandidate(symbol, normalizedSymbols, matchRequired)) {
      return null;
    }

    const candidate = { element, symbol, rect };
    if (symbolObj) {
      candidate.symbolObj = symbolObj;
    }

    return candidate;
  }

  function getVisibleCandidates({
    symbolRainContainer,
    state,
    symbols,
    matchRequired = false,
  } = {}) {
    const container = getRainContainer(symbolRainContainer, state);
    if (!container) {
      return [];
    }

    const normalizedSymbols = getNormalizedSymbolSet(symbols);
    if (matchRequired && (!normalizedSymbols || normalizedSymbols.size === 0)) {
      return [];
    }

    const candidates = [];
    const seenElements = new Set();
    const activeSymbols = Array.isArray(state?.activeFallingSymbols)
      ? state.activeFallingSymbols
      : [];

    for (const symbolObj of activeSymbols) {
      const element = symbolObj?.element;
      if (
        !element?.isConnected ||
        element.classList.contains("clicked") ||
        !isVisibleStateElement(element)
      ) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (!isVisibleSymbolObject(state, symbolObj, container, rect)) {
        continue;
      }

      const symbol = String(
        symbolObj.symbol || element.textContent || "",
      ).trim();
      if (!shouldIncludeCandidate(symbol, normalizedSymbols, matchRequired)) {
        continue;
      }

      candidates.push({ element, symbol, rect, symbolObj });
      seenElements.add(element);
    }

    for (const element of container.querySelectorAll(
      ".falling-symbol[data-symbol-state='visible']:not(.clicked)",
    )) {
      if (seenElements.has(element)) {
        continue;
      }

      const candidate = createCandidate(
        element,
        null,
        container,
        normalizedSymbols,
        matchRequired,
      );
      if (candidate) {
        candidates.push(candidate);
      }
    }

    return candidates;
  }

  function getVisibleMatchingCandidates({
    symbolRainContainer,
    state,
    symbols,
  } = {}) {
    const targetSymbols = symbols == null ? getCurrentNeededSymbols() : symbols;
    return getVisibleCandidates({
      symbolRainContainer,
      state,
      symbols: targetSymbols,
      matchRequired: true,
    });
  }

  function hasVisibleSymbol({ symbolRainContainer, state, symbols } = {}) {
    return getVisibleMatchingCandidates({
      symbolRainContainer,
      state,
      symbols,
    }).length > 0;
  }

  function rankKeyboardCandidates(candidates) {
    return [...candidates].sort(
      (left, right) => right.rect.bottom - left.rect.bottom,
    );
  }

  window.SymbolRainTargets = {
    normalizeSymbol,
    getCurrentNeededSymbols,
    getVisibleCandidates,
    getVisibleMatchingCandidates,
    hasVisibleSymbol,
    rankKeyboardCandidates,
  };
})();