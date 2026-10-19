// src/scripts/lazy-component-loader.init.js - Initialization for Lazy Component System
// Extracted from lazy-component-loader.js to separate bootstrap from class definitions
console.log("🚀 Lazy Component Loader Initialization...");

const lazyLoaderState = {
  started: false,
};

/**
 * Initialize lazy loading system
 * Starts non-critical preloading of all lock components immediately so that
 * game-runtime-coordinator.bootstrap() can await readyPromise during boot.
 */
function initializeLazyLoading() {
  if (lazyLoaderState.started) {
    return;
  }

  lazyLoaderState.started = true;
  console.log("🚀 Lazy Component Loader initialized");

  // Preload lock components immediately (not gated on gameplay ready).
  // Bootstrap awaits lazyComponentLoader.readyPromise before marking preload complete.
  window.LazyComponentLoader.preloadComponents(
    window.LazyComponentLoader.getAllLockComponentPaths(),
  );
}

// Kick off preload as soon as the module is ready (deferred script runs after DOMContentLoaded).
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeLazyLoading);
} else {
  initializeLazyLoading();
}

console.log("✨ Lazy Component Loader initialization complete");
