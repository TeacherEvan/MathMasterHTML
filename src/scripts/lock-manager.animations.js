// js/lock-manager.animations.js - Lock animation helpers
console.log("🔒 LockManager animation helpers loading...");

(function attachLockManagerAnimations() {
  if (!window.LockManager) {
    console.error("❌ LockManager core not loaded");
    return;
  }

  const proto = window.LockManager.prototype;

  const LOCK_MOMENT_TIMINGS = {
    SURGE_DELAY_MS: 24,
    SETTLE_DELAY_MS: 520,
    CLEANUP_DELAY_MS: 820,
  };
  const LOCK_TONES = {
    BEGINNER: "beginner",
    WARRIOR: "warrior",
    MASTER: "master",
  };

  proto.activateLockLevel = function activateLockLevel(level) {
    console.log(`🔒 Activating lock level ${level}`);

    const lockBody = this.container.querySelector(".lock-body");
    const resolvedTone =
      this.container.dataset.lockTone || this._resolveLockTone(level);
    if (!lockBody) {
      console.warn("⚠️ Lock body not found for activation");
      this.currentLockLevel = level;
      this.container.classList.add("is-lock-live");
      this.container.dataset.lockLevel = String(level);
      this.container.dataset.lockTone = resolvedTone;
      this.container.dataset.lockMoment =
        this.container.dataset.lockMoment || "settled";
      this.container.dataset.lockStatus = `Lock phase ${String(level).padStart(2, "0")} engaged`;

      document.dispatchEvent(
        new CustomEvent("lockLevelUpdated", {
          detail: {
            level,
            tone: this.container.dataset.lockTone,
            moment: this.container.dataset.lockMoment,
          },
        }),
      );
      return;
    }

    for (let lvl = 1; lvl <= 6; lvl += 1) {
      lockBody.classList.remove(`level-${lvl}-active`);
    }

    lockBody.classList.add(`level-${level}-active`);
    this.currentLockLevel = level;

    this.triggerLevelAnimation(lockBody, level);
    this.updateProgressIndicators(level);

    document.dispatchEvent(
      new CustomEvent("lockLevelUpdated", {
        detail: {
          level,
          tone: this.container.dataset.lockTone || resolvedTone,
          moment: this.container.dataset.lockMoment || "settled",
        },
      }),
    );
  };

  proto._resolveLockTone = function _resolveLockTone(level) {
    const isMasterLevel = document.body.classList.contains("master-level");
    if (isMasterLevel || level >= 4) {
      return LOCK_TONES.MASTER;
    }
    if (level >= 2) {
      return LOCK_TONES.WARRIOR;
    }
    return LOCK_TONES.BEGINNER;
  };

  proto._clearLockMomentTimers = function _clearLockMomentTimers() {
    if (this._lockMomentSurgeTimer) {
      window.clearTimeout(this._lockMomentSurgeTimer);
      this._lockMomentSurgeTimer = null;
    }
    if (this._lockMomentSettleTimer) {
      window.clearTimeout(this._lockMomentSettleTimer);
      this._lockMomentSettleTimer = null;
    }
    if (this._lockMomentCleanupTimer) {
      window.clearTimeout(this._lockMomentCleanupTimer);
      this._lockMomentCleanupTimer = null;
    }
  };

  proto._applyLockMomentState = function _applyLockMomentState(
    lockBody,
    level,
  ) {
    const effectiveLevel = this.currentLockLevel || level;
    const tone = this._resolveLockTone(effectiveLevel);
    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const progress = Math.min(effectiveLevel, 6) / 6;
    const wrapper = this.container.querySelector(".lock-component-wrapper");

    this._clearLockMomentTimers();

    this.container.classList.add("is-lock-live");
    this.container.classList.toggle(
      "is-lock-master",
      tone === LOCK_TONES.MASTER,
    );
    this.container.dataset.lockLevel = String(effectiveLevel);
    this.container.dataset.lockTone = tone;
    this.container.dataset.lockMotion = reducedMotion ? "reduced" : "full";
    this.container.dataset.lockMoment = reducedMotion ? "settled" : "arming";
    this.container.dataset.lockStatus = `Lock phase ${String(effectiveLevel).padStart(2, "0")} engaged`;
    this.container.style.setProperty("--lock-progress", progress.toFixed(2));
    this.container.style.setProperty(
      "--lock-intensity",
      String((0.78 + progress * 0.32).toFixed(2)),
    );
    this.container.setAttribute("aria-live", "polite");
    this.container.setAttribute(
      "aria-label",
      `Lock phase ${String(effectiveLevel).padStart(2, "0")} engaged`,
    );

    if (wrapper) {
      wrapper.classList.add("lock-ceremony-shell");
    }

    lockBody.classList.add("lock-body--ceremony");

    if (reducedMotion) {
      return;
    }

    this._lockMomentSurgeTimer = window.setTimeout(() => {
      this.container.dataset.lockMoment = "surge";
    }, LOCK_MOMENT_TIMINGS.SURGE_DELAY_MS);

    this._lockMomentSettleTimer = window.setTimeout(() => {
      this.container.dataset.lockMoment = "settled";
    }, LOCK_MOMENT_TIMINGS.SETTLE_DELAY_MS);

    this._lockMomentCleanupTimer = window.setTimeout(() => {
      lockBody.classList.remove("lock-body--ceremony");
    }, LOCK_MOMENT_TIMINGS.CLEANUP_DELAY_MS);
  };

  proto.progressLockLevel = function progressLockLevel() {
    if (this.isLoadingComponent) {
      console.log("🔒 Lock component already loading, skipping progression");
      return;
    }

    const isMasterLevel = document.body.classList.contains("master-level");
    let newLevel;
    if (isMasterLevel) {
      newLevel = Math.min(6, this.completedLinesCount);
    } else {
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
      const componentName = this.normalizeComponentName(newLevel);
      console.log(
        `🔒 Loading component for level ${newLevel}: ${componentName}`,
      );
      this.loadLockComponent(componentName)
        .then(() => {
          setTimeout(() => {
            this.activateLockLevel(newLevel);
            this.isLoadingComponent = false;
          }, 300);
        })
        .catch((error) => {
          console.error(`❌ Failed to load level ${newLevel} lock:`, error);
          this.isLoadingComponent = false;
          this.activateLockLevel(newLevel);
        });
    }
  };

  proto.triggerLevelAnimation = function triggerLevelAnimation(
    lockBody,
    level,
  ) {
    console.log(`🎨 Triggering level ${level} animation`);
    const isMasterLevel = document.body.classList.contains("master-level");
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
          this.triggerWarriorAnimation(lockBody, 3);
        }
        break;
      default:
        this.triggerGenericAnimation(lockBody, level);
    }
  };

  proto.triggerBeginnerAnimation = function triggerBeginnerAnimation(lockBody) {
    console.log("🎮 Triggering beginner level animation");
    this._applyLockMomentState(lockBody, 1);
  };
  proto.triggerWarriorAnimation = function triggerWarriorAnimation(
    lockBody,
    level,
  ) {
    console.log(`🟡 Triggering warrior level ${level} animation`);
    this._applyLockMomentState(lockBody, level);
  };
  proto.triggerMasterAnimation = function triggerMasterAnimation(
    lockBody,
    level,
  ) {
    console.log(`🔴 Triggering master level ${level} animation`);
    this._applyLockMomentState(lockBody, level);
  };
  proto.triggerGenericAnimation = function triggerGenericAnimation(
    lockBody,
    level,
  ) {
    console.log(`⚪ Triggering generic level ${level} animation`);
    this._applyLockMomentState(lockBody, level);
  };

  proto.updateProgressIndicators = function updateProgressIndicators(level) {
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
