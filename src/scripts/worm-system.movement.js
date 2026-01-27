// src/scripts/worm-system.movement.js - Worm movement module loader (refactored)
console.log("🐛 Worm movement module loader loading...");

// Load worm movement modules in dependency order
const wormMovementModules = [
  "src/scripts/worm-movement-core.js",
  "src/scripts/worm-movement-behaviors.js",
  "src/scripts/worm-movement-navigation.js",
];

let loadedWormModules = 0;

function loadWormModule(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      loadedWormModules++;
      console.log(
        `✅ Loaded ${src} (${loadedWormModules}/${wormMovementModules.length})`,
      );
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadWormMovementModules() {
  try {
    for (const module of wormMovementModules) {
      await loadWormModule(module);
    }
    console.log("✅ All worm movement modules loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load worm movement modules:", error);
  }
}

// Start loading modules
loadWormMovementModules();
