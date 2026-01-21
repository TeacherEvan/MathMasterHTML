// js/symbol-manager.js - Handles symbol revealing and validation

/**
 * Symbol Manager - Centralized symbol operations
 */
const SymbolManager = {
  _solutionContainer: null,
  _currentStepIndex: 0,
  _cachedStepSymbols: null,
  _cachedStepIndex: -1,
  _cacheInvalidated: true,

  /**
   * Initialize with solution container
   * @param {HTMLElement} container - Solution container element
   */
  init(container) {
    this._solutionContainer = container;
  },

  /**
   * Get cached step symbols
   * @param {number} stepIndex - Step index
   * @returns {NodeList} Cached symbols
   */
  getCachedStepSymbols(stepIndex) {
    if (
      this._cacheInvalidated ||
      this._cachedStepIndex !== stepIndex ||
      !this._cachedStepSymbols
    ) {
      this._cachedStepSymbols = this._solutionContainer.querySelectorAll(
        `.solution-symbol[data-step-index="${stepIndex}"]`
      );
      this._cachedStepIndex = stepIndex;
      this._cacheInvalidated = false;
    }
    return this._cachedStepSymbols;
  },

  /**
   * Invalidate symbol cache
   */
  invalidateCache() {
    this._cacheInvalidated = true;
    this._cachedStepSymbols = null;
  },

  /**
   * Get next hidden symbols in current step
   * @returns {Array<string>} Array of possible symbols
   */
  getNextSymbols() {
    const currentStepSymbols = this.getCachedStepSymbols(
      this._currentStepIndex
    );
    const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
      el.classList.contains("hidden-symbol")
    );
    return hiddenSymbols.map((span) => span.textContent);
  },

  /**
   * Check if symbol is in current line
   * @param {string} clickedSymbol - Clicked symbol
   * @returns {boolean} Is valid
   */
  isSymbolInCurrentLine(clickedSymbol) {
    const expectedSymbols = this.getNextSymbols();
    const normalizedClicked = window.normalizeSymbol(clickedSymbol);
    const normalizedExpected = expectedSymbols.map((s) =>
      window.normalizeSymbol(s)
    );
    return normalizedExpected.includes(normalizedClicked);
  },

  /**
   * Reveal specific symbol
   * @param {string} targetSymbol - Symbol to reveal
   * @returns {boolean} Success
   */
  revealSymbol(targetSymbol) {
    const normalizedTarget = window.normalizeSymbol(targetSymbol);
    const currentStepSymbols = this.getCachedStepSymbols(
      this._currentStepIndex
    );
    const hiddenSymbols = Array.from(currentStepSymbols).filter((el) =>
      el.classList.contains("hidden-symbol")
    );

    for (const span of hiddenSymbols) {
      const spanSymbol = span.textContent;
      const normalizedSpan = window.normalizeSymbol(spanSymbol);

      if (normalizedSpan === normalizedTarget) {
        span.classList.remove("hidden-symbol");
        span.classList.add("revealed-symbol");
        this.invalidateCache();

        // Dispatch event
        document.dispatchEvent(
          new CustomEvent("symbolRevealed", {
            detail: { symbol: targetSymbol, element: span },
          })
        );
        return true;
      }
    }
    return false;
  },

  /**
   * Set current step index
   * @param {number} index - Step index
   */
  setCurrentStep(index) {
    this._currentStepIndex = index;
    this.invalidateCache();
  },

  /**
   * Check if current step is complete
   * @returns {boolean} Complete
   */
  isStepComplete() {
    const currentStepHiddenSymbols = this._solutionContainer.querySelectorAll(
      `[data-step-index="${this._currentStepIndex}"].hidden-symbol`
    );
    return currentStepHiddenSymbols.length === 0;
  },
};

// Export for ES6 modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = SymbolManager;
} else {
  window.SymbolManager = SymbolManager;
}
