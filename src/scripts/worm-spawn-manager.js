// js/worm-spawn-manager.js - Aggregator for worm spawn modules
console.log("📋 Worm Spawn Manager module loading...");

(function() {
  if (!window.WormSpawnManager || !window.WormSpawnCoordinator) {
    console.error("❌ Worm spawn modules not loaded");
    return;
  }

  if (
    !window.WormSpawnCoordinator.prototype.spawnFromConsole ||
    !window.WormSpawnCoordinator.prototype.spawnFromBorder
  ) {
    console.warn("⚠️ Worm spawn coordinator methods missing");
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      WormSpawnManager: window.WormSpawnManager,
      WormSpawnCoordinator: window.WormSpawnCoordinator,
    };
  }

  console.log("✅ Worm Spawn Manager module loaded");
})();
