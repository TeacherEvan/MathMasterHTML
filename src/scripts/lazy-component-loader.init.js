// src/scripts/lazy-component-loader.init.js - Initialization for Lazy Component System
// Extracted from lazy-component-loader.js to separate bootstrap from class definitions
console.log("🚀 Lazy Component Loader Initialization...");

const lazyLoaderState = {
  started: false,
};

/**
 * Initialize lazy loading system
 * Creates global instance and begins non-critical preloading after gameplay is ready
 */
function initializeLazyLoading() {
  if (lazyLoaderState.started) {
    return;
  }

  lazyLoaderState.started = true;
  console.log("🚀 Lazy Component Loader initialized");

  // Preload lock components after gameplay is already interactive.
  if ("requestIdleCallback" in window) {
    requestIdleCallback(
      () => {
        window.LazyComponentLoader.preloadComponents(
          window.LazyComponentLoader.getAllLockComponentPaths(),
        );
      },
      { timeout: 3000 },
    );
  } else {
    setTimeout(() => {
      window.LazyComponentLoader.preloadComponents(
        window.LazyComponentLoader.getAllLockComponentPaths(),
      );
    }, 2000);
  }
}

function bindGameplayReadyPreload() {
  const gameplayReady = window.GameRuntimeCoordinator?.isGameplayReady?.();
  if (gameplayReady) {
    initializeLazyLoading();
    return;
  }

  const gameplayReadyEvent = window.GameEvents?.GAMEPLAY_READY_CHANGED;
  if (!gameplayReadyEvent) {
    window.deferExecution?.(() => {
      initializeLazyLoading();
    });
    return;
  }

  document.addEventListener(
    gameplayReadyEvent,
    (event) => {
      if (event.detail?.gameplayReady) {
        initializeLazyLoading();
      }
    },
    { once: true },
  );
}

// Integrate with existing lock manager if available
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    bindGameplayReadyPreload();
  });
} else {
  bindGameplayReadyPreload();
}

console.log("✨ Lazy Component Loader initialization complete");
