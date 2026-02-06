// js/console-manager.js - Console manager loader
console.log("🎮 Console Manager loaded");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const consoleManager = new window.ConsoleManager();
  window.consoleManager = consoleManager;

  console.log("✅ Console Manager ready");
})();
