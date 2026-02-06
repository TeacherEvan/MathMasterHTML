// js/lock-manager.js - Unified Lock Animation Manager
console.log("LockManager loading...");

class LockManager {
  constructor(containerSelector = "#lock-display") {
    this.container = document.querySelector(containerSelector);
    this.lockIsLive = false;
    this.lockAnimationActive = false;
    this.currentLockLevel = 1;
    this.completedLinesCount = 0;
    this.isLoadingComponent = false; // Prevent concurrent loading
    this.responsiveManager = null; // Will be set when responsive manager loads

    // Validation
    if (!this.container) {
      console.error(`❌ Lock container not found: ${containerSelector}`);
    }

    // PERFORMANCE FIX: Defer basic lock display to prevent blocking
    // REFACTORED: Use shared deferExecution utility from utils.js
    deferExecution(() => {
      this.showBasicLock();
    });

    // Bind event listeners
    if (window.LockManagerEvents) {
      window.LockManagerEvents.bindCoreEvents(this);
      window.LockManagerEvents.bindDebugListeners();
    }

    // Wait for responsive manager to load
    this.initResponsiveIntegration();

    console.log(
      "🔒 LockManager initialized (lock display deferred for performance)",
    );
  }

  startLockAnimation() {
    if (this.lockIsLive) {
      console.log("🔒 Lock animation already active, ignoring duplicate start");
      return;
    }

    console.log("🔒 Starting lock animation sequence");
    this.lockIsLive = true;
    this.lockAnimationActive = true;

    // Load the basic lock component first (using normalized naming)
    const componentName = this.normalizeComponentName(1);
    this.loadLockComponent(componentName)
      .then(() => {
        console.log("🔒 Basic lock component loaded, activating...");
        setTimeout(() => {
          this.activateLockLevel(1);
        }, 300);
      })
      .catch((error) => {
        console.error("❌ Failed to load basic lock component:", error);
        this.showErrorLock();
        // Reset state on error
        this.lockIsLive = false;
        this.lockAnimationActive = false;
      });
  }

  loadLockComponent(_componentName) {
    // Method moved to lock-manager.loader.js
  }

  // Animation helpers moved to lock-manager.animations.js

  reset() {
    console.log("🔄 Resetting lock manager");
    this.lockIsLive = false;
    this.lockAnimationActive = false;
    this.currentLockLevel = 1;
    this.completedLinesCount = 0;
    this.isLoadingComponent = false;

    // Show basic lock instead of waiting message
    this.showBasicLock();
  }

  showBasicLock() {
    if (this.container && window.LockManagerTemplates) {
      this.container.innerHTML = window.LockManagerTemplates.getBasicLockMarkup();
    }
  }

  initResponsiveIntegration() {
    // Check if responsive manager is available
    if (window.lockResponsiveManager) {
      this.responsiveManager = window.lockResponsiveManager;
      console.log("🔗 LockManager connected to ResponsiveManager");
    } else {
      // Wait for responsive manager to load
      const checkForResponsiveManager = setInterval(() => {
        if (window.lockResponsiveManager) {
          this.responsiveManager = window.lockResponsiveManager;
          console.log(
            "🔗 LockManager connected to ResponsiveManager (delayed)",
          );
          clearInterval(checkForResponsiveManager);
        }
      }, 100);

      // Stop checking after 5 seconds
      setTimeout(() => {
        clearInterval(checkForResponsiveManager);
      }, 5000);
    }

    // Listen for responsive scale changes
    document.addEventListener("lockScaleChanged", (e) => {
      console.log("🔒 LockManager received scale change:", e.detail);
      this.onScaleChanged(e.detail);
    });
  }

  onScaleChanged(scaleInfo) {
    // Adjust lock animations based on scale
    const { scale, resolution } = scaleInfo;

    if (this.container) {
      // Apply scale-specific adjustments
      this.container.style.setProperty("--lock-scale", scale);
      this.container.style.setProperty("--lock-container-scale", scale * 0.9);
      this.container.style.setProperty("--lock-body-scale", scale * 0.8);

      // Adjust animation timing for different scales
      if (scale < 0.6) {
        // Faster animations for smaller scales
        this.container.style.setProperty("--animation-duration", "0.8s");
      } else if (scale > 1.0) {
        // Slower animations for larger scales
        this.container.style.setProperty("--animation-duration", "1.5s");
      } else {
        // Normal animation duration
        this.container.style.setProperty("--animation-duration", "1.2s");
      }

      // Add resolution class for component-specific adjustments
      this.container.classList.remove(
        "res-4k",
        "res-1440p",
        "res-1080p",
        "res-720p",
        "res-mobile",
      );
      this.container.classList.add(`res-${resolution}`);
    }
  }

  // Public API methods
  isActive() {
    return this.lockIsLive;
  }

  getCurrentLevel() {
    return this.currentLockLevel;
  }

  getCompletedLines() {
    return this.completedLinesCount;
  }

  // Method to manually trigger lock animation for testing
  triggerLockAnimation() {
    if (!this.lockAnimationActive) {
      this.startLockAnimation();
    } else {
      this.progressLockLevel();
    }
  }

  // Debug method to get current state
  getDebugInfo() {
    return {
      lockIsLive: this.lockIsLive,
      lockAnimationActive: this.lockAnimationActive,
      currentLockLevel: this.currentLockLevel,
      completedLinesCount: this.completedLinesCount,
      isLoadingComponent: this.isLoadingComponent,
      containerExists: !!this.container,
    };
  }

  // Method to force advance to specific level (for testing)
  forceLockLevel(level) {
    if (level < 1 || level > 6) {
      console.error("❌ Invalid lock level:", level);
      return;
    }

    console.log(`🔧 Force advancing to lock level ${level}`);
    this.currentLockLevel = level;
    this.completedLinesCount = (level - 1) * 2; // Update completed lines accordingly

    const componentName = this.normalizeComponentName(level);
    this.loadLockComponent(componentName)
      .then(() => {
        setTimeout(() => {
          this.activateLockLevel(level);
        }, 300);
      })
      .catch((error) => {
        console.error(`❌ Failed to force load level ${level}:`, error);
        this.activateLockLevel(level);
      });
  }
}

// Export class for extension modules
window.LockManager = LockManager;

// Create and export singleton instance
const lockManager = new LockManager();

// Make available globally for game.js
window.lockManager = lockManager;

// Export for module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = lockManager;
}

console.log("✅ LockManager loaded and initialized");
