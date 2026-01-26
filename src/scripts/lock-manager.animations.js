// js/lock-manager.animations.js - Lock animation helpers
console.log("🔒 LockManager animation helpers loading...");

(function attachLockManagerAnimations() {
  if (!window.LockManager) {
    console.error("❌ LockManager core not loaded");
    return;
  }

  const proto = window.LockManager.prototype;

  proto.activateLockLevel = function activateLockLevel(level) {
    console.log(`🔒 Activating lock level ${level}`);

    const lockBody = this.container.querySelector(".lock-body");
    if (!lockBody) {
      console.warn("⚠️ Lock body not found for activation");
      return;
    }

    // Remove any previous level-* classes
    for (let lvl = 1; lvl <= 6; lvl++) {
      lockBody.classList.remove(`level-${lvl}-active`);
    }
    // Apply level-specific activation and update state
    lockBody.classList.add(`level-${level}-active`);
    this.currentLockLevel = level;

    // Trigger level-specific animations
    this.triggerLevelAnimation(lockBody, level);

    // Update progress indicators
    this.updateProgressIndicators(level);
  };

  proto.progressLockLevel = function progressLockLevel() {
    if (this.isLoadingComponent) {
      console.log("🔒 Lock component already loading, skipping progression");
      return;
    }

    // Get the current level
    const isMasterLevel = document.body.classList.contains("master-level");

    // Progress calculation differs for Master level vs other levels
    let newLevel;
    if (isMasterLevel) {
      // In Master level, all 6 lock lines can be triggered
      newLevel = Math.min(6, this.completedLinesCount);
    } else {
      // For other levels, advance one level per completed line, capped at 3
      newLevel = Math.min(3, this.completedLinesCount);
    }

    console.log(
      `🔒 Lock progression check: completedLinesCount=${this.completedLinesCount}, newLevel=${newLevel}, currentLevel=${this.currentLockLevel}, isMasterLevel=${isMasterLevel}`,
    );

    if (newLevel > this.currentLockLevel) {
      console.log(
        `🔒 Progressing to lock level ${newLevel} (${this.completedLinesCount} lines completed)`,
      );
      this.currentLockLevel = newLevel;
      this.isLoadingComponent = true;

      // Normalize component filename (handle inconsistent naming)
      const componentName = this.normalizeComponentName(newLevel);

      console.log(
        `🔒 Loading component for level ${newLevel}: ${componentName}`,
      );

      // Load the new lock component
      this.loadLockComponent(componentName)
        .then(() => {
          setTimeout(() => {
            this.activateLockLevel(newLevel);
            this.isLoadingComponent = false;
            // Dispatch an event to notify that the lock level has been updated
            document.dispatchEvent(
              new CustomEvent("lockLevelUpdated", {
                detail: { level: newLevel },
              }),
            );
          }, 300);
        })
        .catch((error) => {
          console.error(`❌ Failed to load level ${newLevel} lock:`, error);
          this.isLoadingComponent = false;
          // Fallback to generic animation
          this.activateLockLevel(newLevel);
        });
    }
  };

  proto.triggerLevelAnimation = function triggerLevelAnimation(
    lockBody,
    level,
  ) {
    console.log(`🎨 Triggering level ${level} animation`);

    // Check if we're in master level
    const isMasterLevel = document.body.classList.contains("master-level");

    // In non-master levels, cap at level 3
    if (!isMasterLevel && level > 3) {
      console.log(`⚠️ Capping animation at level 3 (non-master level)`);
      level = 3;
    }

    switch (level) {
      case 1:
        this.triggerBeginnerAnimation(lockBody);
        break;
      case 2:
      case 3:
        this.triggerWarriorAnimation(lockBody, level);
        break;
      case 4:
      case 5:
      case 6:
        if (isMasterLevel) {
          this.triggerMasterAnimation(lockBody, level);
        } else {
          // Fallback to warrior animation if somehow reached here in non-master level
          this.triggerWarriorAnimation(lockBody, 3);
        }
        break;
      default:
        this.triggerGenericAnimation(lockBody, level);
    }
  };

  proto.triggerBeginnerAnimation = function triggerBeginnerAnimation(lockBody) {
    console.log("🎮 Triggering beginner level animation");

    // Scale and color progression
    const scaleAmount = 1.2;
    lockBody.style.transform = `scaleY(${scaleAmount})`;
    lockBody.style.background =
      "linear-gradient(145deg, #1a4a1a, #2a6a2a, #1a4a1a)";
    lockBody.style.borderColor = "#0f0";
    lockBody.style.boxShadow = "0 0 20px rgba(0, 255, 0, 0.4)";
  };

  proto.triggerWarriorAnimation = function triggerWarriorAnimation(
    lockBody,
    level,
  ) {
    console.log(`🟡 Triggering warrior level ${level} animation`);

    // Remove rotation: scale only for warrior levels
    const scaleAmount = 1 + level * 0.15;
    lockBody.style.transform = `scale(${scaleAmount})`;

    const goldIntensity = Math.min(255, 150 + level * 30);
    lockBody.style.background = `linear-gradient(145deg, #4a4a1a, rgb(${goldIntensity}, ${goldIntensity}, 42), #4a4a1a)`;
    lockBody.style.borderColor = `rgb(${goldIntensity}, ${goldIntensity}, 0)`;
    lockBody.style.boxShadow = `0 0 ${25 +
      level * 15}px rgba(255, 215, 0, 0.5)`;
  };

  proto.triggerMasterAnimation = function triggerMasterAnimation(
    lockBody,
    level,
  ) {
    console.log(`🔴 Triggering master level ${level} animation`);

    // Remove rotation and skew: scale only for master levels
    const scaleAmount = 1 + level * 0.2;
    lockBody.style.transform = `scale(${scaleAmount})`;

    const redIntensity = Math.min(255, 120 + level * 35);
    lockBody.style.background = `linear-gradient(145deg, #4a1a1a, rgb(${redIntensity}, 42, 42), #4a1a1a)`;
    lockBody.style.borderColor = `rgb(${redIntensity}, 0, 0)`;
    lockBody.style.boxShadow = `0 0 ${30 + level * 20}px rgba(255, 0, 0, 0.6)`;

    // Add pulsing effect
    lockBody.style.animation = `lockPulse${level} 1s ease-in-out`;
  };

  proto.triggerGenericAnimation = function triggerGenericAnimation(
    lockBody,
    level,
  ) {
    console.log(`⚪ Triggering generic level ${level} animation`);

    const scaleAmount = 1 + level * 0.1;
    lockBody.style.transform = `scale(${scaleAmount})`;
    lockBody.style.filter = `brightness(${1 + level * 0.2})`;
  };

  proto.updateProgressIndicators = function updateProgressIndicators(level) {
    // Update any progress bars or indicators
    const progressBars = this.container.querySelectorAll(
      ".progress-bar, .lock-progress",
    );
    const totalLevels = 6;
    const progressPercentage = (level / totalLevels) * 100;

    progressBars.forEach((bar) => {
      bar.style.width = `${progressPercentage}%`;
      bar.style.background = "linear-gradient(90deg, #0f0, #090)";
      bar.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.5)";
    });

    // Update lock segments
    const segments = this.container.querySelectorAll(".lock-segment");
    segments.forEach((segment, index) => {
      if (index < level) {
        segment.classList.add("segment-active");
        segment.style.background = "linear-gradient(45deg, #0f0, #090)";
        segment.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.6)";
      }
    });
  };

  proto.showErrorLock = function showErrorLock() {
    if (this.container) {
      this.container.innerHTML = `
                <div class="lock-error">
                    🔒 Lock Component Error
                    <br>
                    <small>Failed to load lock animation</small>
                </div>
            `;
    }
  };
})();
