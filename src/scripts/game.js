// js/game.js - Game module loader (refactored into smaller modules)
console.log("🎮 Game module loader loading...");

// Load game modules in dependency order
const gameModules = [
  "/src/scripts/game-init.js",
  "/src/scripts/game-problem-manager.js",
  "/src/scripts/game-symbol-handler.stolen.js",
  "/src/scripts/game-symbol-handler.core.js",
  "/src/scripts/game-symbol-handler.events.js",
  "/src/scripts/game-symbol-handler.js",
  "/src/scripts/game-state-manager.js",
];
const GAME_MODULE_VERSION = "20260422-local-freshness-evan-audio-1";

let loadedModules = 0;
const startupPreloadMessageEl = document.getElementById("startup-preload-message");

function setStartupPreloadMessage(message) {
  if (startupPreloadMessageEl && typeof message === "string") {
    startupPreloadMessageEl.textContent = message;
  }
}

function getModuleLabel(src) {
  const parts = src.split("/");
  return parts[parts.length - 1] || src;
}

function loadModule(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const separator = src.includes("?") ? "&" : "?";
    script.src = `${src}${separator}v=${GAME_MODULE_VERSION}`;
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
    setStartupPreloadMessage("Loading gameplay shell...");
    for (const module of gameModules) {
      setStartupPreloadMessage(
        "Loading gameplay shell " +
          (loadedModules + 1) +
          "/" +
          gameModules.length +
          " - " +
          getModuleLabel(module),
      );
      await loadModule(module);
    }
    setStartupPreloadMessage("Gameplay shell loaded. Preparing briefing...");
    console.log("✅ All game modules loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load game modules:", error);
  }
}

// Start loading modules
loadGameModules();
