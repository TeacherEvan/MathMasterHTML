// src/scripts/lazy-lock-manager.js - Lock Component Integration for Lazy Loading
// Extracted from lazy-component-loader.js to follow Single Responsibility Principle
console.log("🔒 Lazy Lock Manager Loading...");

/**
 * Enhanced lock manager integration for lazy loading
 * Handles loading lock components with visual feedback (loading skeletons, toasts)
 *
 * @class LazyLockManager
 * @param {Object} lockManager - Reference to the lock manager instance
 * @param {LazyComponentLoader} componentLoader - Reference to the lazy component loader
 */
class LazyLockManager {
  constructor(lockManager, componentLoader) {
    this.lockManager = lockManager;
    this.componentLoader = componentLoader;
  }

  /**
   * Load lock component with loading state and user feedback
   * @param {number} level - Lock level to load (1-6)
   * @param {HTMLElement} container - Container element to inject lock HTML into
   * @returns {Promise<void>}
   */
  async loadLockWithFeedback(level, container) {
    // Show loading skeleton
    if (window.UXEnhancements && window.UXEnhancements.loading) {
      window.UXEnhancements.loading.showLoadingSkeleton(container, "custom");
    }

    try {
      // Determine component path using shared utility
      const fileName = this.componentLoader.getLockComponentFilename(level);
      const componentPath = `/src/assets/components/lock-components/${fileName}`;

      // Load component
      const lockHtml = await this.componentLoader.loadComponent(componentPath);

      // Hide loading skeleton and inject content
      if (window.UXEnhancements && window.UXEnhancements.loading) {
        window.UXEnhancements.loading.hideLoadingSkeleton(container);
      }

      container.innerHTML = lockHtml;

      // Preload next components
      this.componentLoader.preloadNextLockComponents(level);

      // Show success toast
      if (window.UXEnhancements && window.UXEnhancements.toast) {
        window.UXEnhancements.toast.success(
          `Lock level ${level} activated!`,
          2000,
        );
      }
    } catch (error) {
      console.error(`❌ Failed to load lock level ${level}`, error);

      // Hide loading skeleton
      if (window.UXEnhancements && window.UXEnhancements.loading) {
        window.UXEnhancements.loading.hideLoadingSkeleton(container);
      }

      // Show error toast
      if (window.UXEnhancements && window.UXEnhancements.toast) {
        window.UXEnhancements.toast.error(
          "Failed to load lock animation",
          3000,
        );
      }

      // Fallback to basic display
      container.innerHTML = `<div class="lock-error">Lock Level ${level}</div>`;
    }
  }

  /**
   * Preload all lock components during game initialization
   */
  preloadAllLockComponents() {
    const allPaths = this.componentLoader.getAllLockComponentPaths();
    this.componentLoader.preloadComponents(allPaths);
  }
}

// Export class to window for global access
window.LazyLockManager = LazyLockManager;

console.log("🔒 Lazy Lock Manager loaded successfully");
