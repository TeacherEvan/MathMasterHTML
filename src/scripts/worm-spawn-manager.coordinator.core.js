// js/worm-spawn-manager.coordinator.core.js - Spawn coordinator core
console.log("🎯 Worm Spawn Coordinator core loading...");

(function() {
  class WormSpawnCoordinator {
    constructor(dependencies) {
      this.factory = dependencies.factory;
      this.spawnManager = dependencies.spawnManager;
      this.container = dependencies.container;
      this.onSpawnComplete = dependencies.onSpawnComplete;

      this.lockedConsoleSlots = new Set();

      console.log("🎯 WormSpawnCoordinator initialized");
    }

    unlockConsoleSlot(slotIndex, slotElement) {
      this.lockedConsoleSlots.delete(slotIndex);
      if (slotElement) {
        slotElement.classList.remove("worm-spawning", "locked");
      }
      console.log(`🔓 Console slot ${slotIndex + 1} unlocked`);
    }

    generateUniqueId(prefix) {
      return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { WormSpawnCoordinator };
  } else {
    window.WormSpawnCoordinator = WormSpawnCoordinator;
  }

  console.log("✅ Worm Spawn Coordinator core loaded");
})();
