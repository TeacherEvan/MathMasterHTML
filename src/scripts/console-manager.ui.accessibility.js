// js/console-manager.ui.accessibility.js - Console UI accessibility helpers
console.log("🎮 Console Manager UI accessibility loading");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const proto = window.ConsoleManager.prototype;

  proto._applySymbolModalAccessibility = function() {
    this.modal?.setAttribute("aria-hidden", "false");
    this.selectionStatusElement?.setAttribute("aria-live", "polite");
    this._modalFocusCleanup =
      window.UXModules?.AccessibilityManager?.trapFocus?.(
        this.selectionWindowElement ||
          this.modal?.querySelector(".console-selection-window"),
        {
          initialFocus: () =>
            this.modal?.querySelector(".symbol-choice") ||
            this.modal?.querySelector("#skip-button"),
        },
      ) || null;
  };

  proto._releaseSymbolModalAccessibility = function() {
    if (typeof this._modalFocusCleanup === "function") {
      this._modalFocusCleanup();
      this._modalFocusCleanup = null;
    }
    this.modal?.setAttribute("aria-hidden", "true");
  };

  proto._updateConsoleSlotAccessibility = function(slotElement, index, symbol) {
    const label = symbol
      ? `Console slot ${index + 1}, symbol ${symbol}`
      : `Console slot ${index + 1}, empty`;
    slotElement.setAttribute("aria-label", label);
    slotElement.setAttribute("aria-disabled", symbol ? "false" : "true");
  };

  console.log("✅ Console Manager UI accessibility loaded");
})();
