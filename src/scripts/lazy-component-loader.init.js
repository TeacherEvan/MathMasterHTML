// src/scripts/lazy-component-loader.init.js - Initialization for Lazy Component System
// Extracted from lazy-component-loader.js to separate bootstrap from class definitions
console.log("🚀 Lazy Component Loader Initialization...");

/**
 * Initialize lazy loading system
 * Creates global instance and begins idle-time preloading of lock components
 */
function initializeLazyLoading() {
  console.log("🚀 Lazy Component Loader initialized");

  // Preload lock components during idle time
  // Start preloading after a short delay to not block initial render
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

// Integrate with existing lock manager if available
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initializeLazyLoading();
  });
} else {
  initializeLazyLoading();
}

console.log("✨ Lazy Component Loader initialization complete");
