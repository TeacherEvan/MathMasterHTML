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
    this.initEventListeners();

    // Wait for responsive manager to load
    this.initResponsiveIntegration();

    console.log(
      "🔒 LockManager initialized (lock display deferred for performance)",
    );
  }

  initEventListeners() {
    // Listen for first-line-solved event
    document.addEventListener("first-line-solved", () => {
      console.log("🔒 LockManager received first-line-solved event");
      this.startLockAnimation();
    });

    // Listen for step completion events
    document.addEventListener("stepCompleted", (e) => {
      console.log("🔒 LockManager received stepCompleted event:", e.detail);
      if (this.lockAnimationActive) {
        // Only advance if we haven't reached this level yet
        const targetLevel = e.detail.stepIndex + 1;
        if (targetLevel > this.currentLockLevel && targetLevel <= 6) {
          this.activateLockLevel(targetLevel);
        }
      }
    });

    // Listen for problem line completion
    document.addEventListener("problemLineCompleted", (e) => {
      console.log(
        "🔒 LockManager received problemLineCompleted event",
        e.detail ? e.detail : "(no details)",
      );
      this.completedLinesCount++;
      console.log(
        `🔒 Completed lines count is now: ${this.completedLinesCount}`,
      );

      // If lock animation hasn't started yet, start it now
      if (!this.lockIsLive && this.completedLinesCount === 1) {
        console.log("🔒 First line completed - starting lock animation");
        this.startLockAnimation();
        return; // startLockAnimation will load level 1 and activate it
      }

      // Check if we're in master level
      const isMasterLevel = document.body.classList.contains("master-level");
      console.log(
        `🔒 Current game mode: ${
          isMasterLevel ? "Master Level" : "Normal Level"
        }`,
      );

      // Force reload line-3-transformer.html specifically when second line is completed in non-master mode
      if (this.completedLinesCount === 2 && !isMasterLevel) {
        console.log(
          "🔒 Second line completed - forcing load of line-3-transformer.html",
        );
        this.isLoadingComponent = true;
        this.loadLockComponent("line-3-transformer.html")
          .then(() => {
            setTimeout(() => {
              this.activateLockLevel(3);
              this.currentLockLevel = 3;
              this.isLoadingComponent = false;
            }, 300);
          })
          .catch((error) => {
            console.error("❌ Failed to load line-3-transformer.html:", error);
            this.isLoadingComponent = false;
          });
      } else {
        // Normal progression
        this.progressLockLevel();
      }
    });

    // Add additional debug listener for lock-related events
    console.log("🔒 Setting up additional debug listeners for lock events");

    // Debug event to trace lock loading issues
    window.addEventListener(
      "error",
      (e) => {
        if (
          e.target &&
          (e.target.tagName === "IFRAME" || e.target.tagName === "IMG")
        ) {
          console.error(`🔒 Resource load error: ${e.target.src}`);
        }
      },
      true,
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

  loadLockComponent(componentName) {
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
    if (this.container) {
      this.container.innerHTML = `
                <div class="lock-component-wrapper">
                    <div class="basic-lock-container">
                        <div class="basic-lock-shackle"></div>
                        <div class="basic-lock-body">
                            <div class="basic-lock-keyhole"></div>
                            <div class="basic-lock-bolts">
                                <div class="bolt bolt-1"></div>
                                <div class="bolt bolt-2"></div>
                                <div class="bolt bolt-3"></div>
                                <div class="bolt bolt-4"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <style>
                    .basic-lock-container {
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) scale(1.8);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        transform-origin: center center;
                        width: 120px;
                        height: 160px;
                        z-index: 10;
                    }
                    
                    .basic-lock-shackle {
                        width: 50px;
                        height: 38px;
                        border: 7px solid #666;
                        border-bottom: none;
                        border-radius: 25px 25px 0 0;
                        margin-bottom: 6px;
                        background: transparent;
                        box-shadow: inset 0 0 6px rgba(0,0,0,0.3);
                    }
                    
                    .basic-lock-body {
                        width: 75px;
                        height: 100px;
                        background: linear-gradient(145deg, #2a2a2a, #404040);
                        border-radius: 10px;
                        position: relative;
                        border: 2px solid #555;
                        box-shadow: 
                            0 5px 10px rgba(0,0,0,0.3),
                            inset 0 0 6px rgba(0,0,0,0.2);
                        display: flex;
                        justify-content: center;
                        align-items: center;
                    }
                    
                    .basic-lock-keyhole {
                        width: 15px;
                        height: 15px;
                        background: #000;
                        border-radius: 50%;
                        position: relative;
                        border: 1px solid #333;
                    }
                    
                    .basic-lock-keyhole::after {
                        content: '';
                        position: absolute;
                        bottom: -8px;
                        left: 50%;
                        transform: translateX(-50%);
                        width: 5px;
                        height: 10px;
                        background: #000;
                        border: 1px solid #333;
                        border-top: none;
                    }
                    
                    .basic-lock-bolts {
                        position: absolute;
                        width: 100%;
                        height: 100%;
                        pointer-events: none;
                    }
                    
                    .bolt {
                        position: absolute;
                        width: 10px;
                        height: 10px;
                        background: #333;
                        border-radius: 50%;
                        box-shadow: inset 0 0 2px rgba(0,0,0,0.5);
                    }
                    
                    .bolt-1 { top: 12px; left: 12px; }
                    .bolt-2 { top: 12px; right: 12px; }
                    .bolt-3 { bottom: 12px; left: 12px; }
                    .bolt-4 { bottom: 12px; right: 12px; }
                </style>
            `;
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
