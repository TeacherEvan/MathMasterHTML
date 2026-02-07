/**
 * Lazy Component Loader - Production-Grade Performance Enhancement
 * Loads lock components and other heavy resources on-demand
 */

class LazyComponentLoader {
  constructor() {
    this.cache = new Map();
    this.loadingPromises = new Map();
    this.preloadQueue = [];
    this.isPreloading = false;
  }

  /**
   * Load HTML component lazily
   * @param {string} componentPath - Path to the HTML component
   * @returns {Promise<string>} - Promise that resolves with HTML content
   */
  async loadComponent(componentPath) {
    // Return from cache if available
    if (this.cache.has(componentPath)) {
      console.log(`💾 Loading from cache: ${componentPath}`);
      return this.cache.get(componentPath);
    }

    // Return existing promise if already loading
    if (this.loadingPromises.has(componentPath)) {
      console.log(`⏳ Already loading: ${componentPath}`);
      return this.loadingPromises.get(componentPath);
    }

    // Create new loading promise
    const loadingPromise = this.fetchComponent(componentPath);
    this.loadingPromises.set(componentPath, loadingPromise);

    try {
      const content = await loadingPromise;
      this.cache.set(componentPath, content);
      this.loadingPromises.delete(componentPath);
      console.log(`✅ Loaded and cached: ${componentPath}`);
      return content;
    } catch (error) {
      this.loadingPromises.delete(componentPath);
      console.error(`❌ Failed to load component: ${componentPath}`, error);
      throw error;
    }
  }

  /**
   * Fetch component from server
   * @param {string} componentPath - Path to component
   * @returns {Promise<string>}
   */
  async fetchComponent(componentPath) {
    const response = await fetch(componentPath);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  }

  /**
   * Preload components during idle time
   * @param {Array<string>} componentPaths - Array of component paths to preload
   */
  preloadComponents(componentPaths) {
    console.log(`📥 Queuing ${componentPaths.length} components for preload`);
    this.preloadQueue = [...componentPaths];

    // Use requestIdleCallback for non-blocking preload
    if ("requestIdleCallback" in window) {
      requestIdleCallback(() => this.processPreloadQueue(), { timeout: 2000 });
    } else {
      // Fallback for browsers without requestIdleCallback
      setTimeout(() => this.processPreloadQueue(), 100);
    }
  }

  /**
   * Process preload queue during idle time
   */
  async processPreloadQueue() {
    if (this.isPreloading || this.preloadQueue.length === 0) {
      return;
    }

    this.isPreloading = true;

    while (this.preloadQueue.length > 0) {
      const componentPath = this.preloadQueue.shift();

      try {
        await this.loadComponent(componentPath);
        console.log(`✨ Preloaded: ${componentPath}`);
      } catch (error) {
        console.warn(`⚠️ Preload failed: ${componentPath}`, error);
      }

      // Check if we should yield to prevent blocking
      if (this.preloadQueue.length > 0) {
        await new Promise((resolve) => {
          if ("requestIdleCallback" in window) {
            requestIdleCallback(resolve, { timeout: 1000 });
          } else {
            setTimeout(resolve, 50);
          }
        });
      }
    }

    this.isPreloading = false;
    console.log("✅ Preload queue complete");
  }

  /**
   * Get lock component filename for a given level
   * Handles inconsistent naming convention (line-1 vs Line-5)
   * @param {number} level - Lock level (1-6)
   * @returns {string} - Filename
   */
  getLockComponentFilename(level) {
    const filenameMap = {
      1: "Line-1-transformer.html",
      2: "line-2-transformer.html",
      3: "line-3-transformer.html",
      4: "line-4-transformer.html",
      5: "Line-5-transformer.html",
      6: "line-6-transformer.html",
    };
    return filenameMap[level] || `line-${level}-transformer.html`;
  }

  /**
   * Preload next N lock components based on current level
   * @param {number} currentLevel - Current lock level
   * @param {number} lookahead - Number of levels to preload ahead
   */
  preloadNextLockComponents(currentLevel, lookahead = 2) {
    const componentPaths = [];
    const maxLevel = 6;

    for (let i = 1; i <= lookahead; i++) {
      const nextLevel = currentLevel + i;
      if (nextLevel <= maxLevel) {
        const fileName = this.getLockComponentFilename(nextLevel);
        componentPaths.push(
          `/src/assets/components/lock-components/${fileName}`,
        );
      }
    }

    if (componentPaths.length > 0) {
      this.preloadComponents(componentPaths);
    }
  }

  /**
   * Get all lock component paths
   * @returns {Array<string>}
   */
  getAllLockComponentPaths() {
    return [
      "/src/assets/components/lock-components/Line-1-transformer.html",
      "/src/assets/components/lock-components/line-2-transformer.html",
      "/src/assets/components/lock-components/line-3-transformer.html",
      "/src/assets/components/lock-components/line-4-transformer.html",
      "/src/assets/components/lock-components/Line-5-transformer.html",
      "/src/assets/components/lock-components/line-6-transformer.html",
    ];
  }

  /**
   * Clear cache for a specific component or all components
   * @param {string} componentPath - Optional path to clear, clears all if not provided
   */
  clearCache(componentPath = null) {
    if (componentPath) {
      this.cache.delete(componentPath);
      console.log(`🗑️ Cleared cache for: ${componentPath}`);
    } else {
      this.cache.clear();
      console.log("🗑️ Cleared all component cache");
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      cachedComponents: this.cache.size,
      loadingComponents: this.loadingPromises.size,
      queuedForPreload: this.preloadQueue.length,
      cachedPaths: Array.from(this.cache.keys()),
    };
  }
}

// ============================================
// EXPORT (LazyLockManager moved to lazy-lock-manager.js)
// (Initialization moved to lazy-component-loader.init.js)
// ============================================

// Create global instance
const lazyComponentLoader = new LazyComponentLoader();

// Export to window for global access
window.LazyComponentLoader = lazyComponentLoader;

console.log("✨ Lazy Component Loader module loaded successfully");
