// js/game.js - Game module loader (refactored into smaller modules)
console.log("🎮 Game module loader loading...");

// Load game modules in dependency order
const gameModules = [
  "/src/scripts/game-init.js",
  "/src/scripts/game-problem-manager.js",
  "/src/scripts/game-symbol-handler.js",
  "/src/scripts/game-state-manager.js",
];

let loadedModules = 0;

function loadModule(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = () => {
      loadedModules++;
      console.log(`✅ Loaded ${src} (${loadedModules}/${gameModules.length})`);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

async function loadGameModules() {
  try {
    for (const module of gameModules) {
      await loadModule(module);
    }
    console.log("✅ All game modules loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load game modules:", error);
  }
}

// Start loading modules
loadGameModules();
