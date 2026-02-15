// worm/index.js - Module loader for the refactored worm system
// Loads all modules in dependency order
(function() {
  "use strict";

  console.log("🐛 Loading refactored worm system modules...");

  // Module loading order (dependencies first)
  const modules = [
    // Core
    "/src/scripts/worm/core/WormEvents.js",
    "/src/scripts/worm/core/EventBus.js",

    // Pools
    "/src/scripts/worm/pools/WormSegmentPool.js",
    "/src/scripts/worm/pools/ParticlePool.js",

    // Collision
    "/src/scripts/worm/collision/SpatialHashGrid.js",

    // Behavior (base classes first)
    "/src/scripts/worm/behavior/WormState.js",
    "/src/scripts/worm/behavior/BehaviorStateMachine.js",
    "/src/scripts/worm/behavior/RoamingState.js",
    "/src/scripts/worm/behavior/RushingState.js",
    "/src/scripts/worm/behavior/StealingState.js",
    "/src/scripts/worm/behavior/CarryingState.js",
    "/src/scripts/worm/behavior/DevilState.js",
  ];

  let loadedCount = 0;

  /**
   * Load a single module script
   * @param {string} src - Script source path
   * @returns {Promise<void>}
   */
  function loadModule(src) {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        loadedCount++;
        resolve();
        return;
      }

      const script = document.createElement("script");
      script.src = src;
      script.async = false; // Maintain order

      script.onload = () => {
        loadedCount++;
        console.log(
          `✅ Loaded module (${loadedCount}/${modules.length}): ${src}`,
        );
        resolve();
      };

      script.onerror = () => {
        console.warn(`⚠️ Failed to load module: ${src}`);
        reject(new Error(`Failed to load ${src}`));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Load all modules in sequence
   */
  async function loadAllModules() {
    try {
      for (const module of modules) {
        await loadModule(module);
      }

      console.log("✅ All worm system modules loaded successfully");

      // Dispatch event when all modules are loaded
      document.dispatchEvent(
        new CustomEvent("wormSystemModulesLoaded", {
          detail: { count: loadedCount },
        }),
      );
    } catch (error) {
      console.error("❌ Failed to load worm system modules:", error);
    }
  }

  // Start loading
  loadAllModules();

  // Expose loader for manual use
  window.WormModuleLoader = {
    loadAll: loadAllModules,
    loadModule: loadModule,
    getLoadedCount: () => loadedCount,
    getTotalCount: () => modules.length,
  };
})();
