// js/game-symbol-handler.js - Aggregator for symbol handler modules
console.log("🔤 Game symbol handler module loading...");

(function() {
  if (!window.GameSymbolHandlerCore || !window.GameSymbolHandlerEvents) {
    console.error(
      "❌ GameSymbolHandlerCore or GameSymbolHandlerEvents not loaded",
    );
    return;
  }

  window.GameSymbolHandler = {
    ...window.GameSymbolHandlerCore,
  };

  console.log("✅ Game symbol handler loaded");
})();
