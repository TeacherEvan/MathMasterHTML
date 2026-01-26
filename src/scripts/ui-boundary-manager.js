// js/ui-boundary-manager.js - UIBoundaryManager bootstrap
console.log("📐 UIBoundaryManager bootstrap loading...");

(function initUIBoundaryManager() {
  if (!window.UIBoundaryManager) {
    console.error("❌ UIBoundaryManager core not loaded");
    return;
  }

  if (!window.uiBoundaryManager) {
    window.uiBoundaryManager = new window.UIBoundaryManager({
      minSpacing: 10,
      logOverlaps: true,
      autoReposition: true,
      checkInterval: 500,
      enablePeriodic: true,
    });
    console.log("✅ UIBoundaryManager loaded and default instance created");
    return;
  }

  console.log("ℹ️ UIBoundaryManager instance already exists");
})();
