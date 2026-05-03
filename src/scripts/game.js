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

function dispatchModuleLoadFailure(error) {
  if (!window.GameEvents?.PRELOAD_FAILED) {
    return;
  }

  document.dispatchEvent(
    new CustomEvent(window.GameEvents.PRELOAD_FAILED, {
      detail: {
        source: "game-module-loader",
        message: error?.message || "Failed to load gameplay shell.",
      },
    }),
  );
}

function showModuleLoadFailure(error) {
  if (document.getElementById("game-module-load-error")) {
    return;
  }

  const errorOverlay = document.createElement("div");
  errorOverlay.id = "game-module-load-error";
  errorOverlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 10001;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.92);
    color: #ffffff;
    padding: 24px;
    text-align: center;
    font-family: 'Orbitron', monospace;
  `;
  errorOverlay.innerHTML = `
    <div style="max-width: 480px; border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 16px; padding: 24px; background: rgba(20, 20, 20, 0.96); box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);">
      <h2 style="margin: 0 0 12px; font-size: 1.75rem;">Game Loading Error</h2>
      <p style="margin: 0 0 16px; line-height: 1.5;">The gameplay shell could not finish loading. Refresh the page or return to level select.</p>
      <p id="game-module-load-error-detail" style="margin: 0 0 20px; font-size: 0.85rem; opacity: 0.75;"></p>
      <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button id="game-module-load-error-refresh" type="button" style="min-width: 144px; min-height: 44px; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; background: #14a914; color: #041104; font: inherit; cursor: pointer; padding: 10px 18px;">Refresh</button>
        <a href="level-select.html" style="display: inline-flex; align-items: center; justify-content: center; min-width: 144px; min-height: 44px; border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 999px; color: #ffffff; text-decoration: none; padding: 10px 18px;">Level Select</a>
      </div>
    </div>
  `;

  const errorDetail = errorOverlay.querySelector("#game-module-load-error-detail");
  if (errorDetail) {
    errorDetail.textContent =
      error?.message || "Unknown module load failure.";
  }

  errorOverlay
    .querySelector("#game-module-load-error-refresh")
    ?.addEventListener("click", () => {
      window.location.reload();
    });

  (document.body || document.documentElement)?.appendChild(errorOverlay);
}

function setStartupPreloadMessage(message) {
  if (typeof message !== "string") {
    return;
  }

  const handledByPreload = window.StartupPreload?.setMessage?.(message, {
    priority: "status",
  });
  if (handledByPreload !== false) {
    return;
  }

  if (startupPreloadMessageEl) {
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
    setStartupPreloadMessage("Gameplay shell failed to load.");
    console.error("❌ Failed to load game modules:", error);
    window.GameRuntimeCoordinator?.setInputLock?.("game-module-loader", true);
    dispatchModuleLoadFailure(error);
    showModuleLoadFailure(error);
  }
}

// Start loading modules
loadGameModules();
