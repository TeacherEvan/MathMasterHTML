/**
 * Dynamic Quality Adjuster
 * Real-time quality scaling based on FPS monitoring
 *
 * @module DynamicQualityAdjuster
 * @description Automatically adjusts quality tier when FPS drops
 */

class DynamicQualityAdjuster {
  constructor() {
    this.fpsHistory = [];
    this.lastCheckTime = performance.now();
    this.startedAt = this.lastCheckTime;
    this.adjustmentCooldown = false;
    this.isActive = true;

    // Configuration
    this.config = {
      FPS_THRESHOLD_CRITICAL: 25, // Immediate quality reduction
      FPS_THRESHOLD_LOW: 35, // Gradual quality reduction
      FPS_THRESHOLD_RECOVER: 55, // Can increase quality
      HISTORY_SIZE: 60, // ~1 second at 60fps
      CHECK_INTERVAL: 1000, // Check every 1 second
      COOLDOWN_DURATION: 5000, // 5 second cooldown after change
      MIN_SAMPLES: 30, // Minimum samples before adjusting
      STARTUP_GRACE_MS: 2500, // Ignore cold-start stalls while the page boots
      GAMEPLAY_READY_GRACE_MS: 1200, // Give gameplay a moment to settle after briefing
    };

    this.lastGameplayReadyAt = null;
    this.wasGameplayReady = false;

    // Quality tier order (worst to best)
    this.tierOrder = ["ultra-low", "low", "medium", "high"];

    this.init();
  }

  init() {
    // Wait for quality manager to be available
    if (!window.qualityManager) {
      setTimeout(() => this.init(), 100);
      return;
    }

    this.startMonitoring();
    console.log("📈 Dynamic Quality Adjuster active");
  }

  /**
   * Start FPS monitoring loop
   */
  startMonitoring() {
    let lastFrameTime = performance.now();

    const measureFrame = () => {
      if (this._destroyed) return;

      if (!this.isActive) {
        requestAnimationFrame(measureFrame);
        return;
      }

      const now = performance.now();
      this.updateGameplayReadyState(now);

      if (this.shouldSuspendSampling(now)) {
        this.resetSamplingWindow(now);
        lastFrameTime = now;
        requestAnimationFrame(measureFrame);
        return;
      }

      const delta = now - lastFrameTime;
      lastFrameTime = now;

      // Calculate instantaneous FPS
      const fps = delta > 0 ? 1000 / delta : 60;

      // Add to history
      this.fpsHistory.push(fps);
      if (this.fpsHistory.length > this.config.HISTORY_SIZE) {
        this.fpsHistory.shift();
      }

      // Check for adjustment periodically
      if (now - this.lastCheckTime > this.config.CHECK_INTERVAL) {
        this.checkAndAdjust();
        this.lastCheckTime = now;
      }

      requestAnimationFrame(measureFrame);
    };

    requestAnimationFrame(measureFrame);
  }

  updateGameplayReadyState(now = performance.now()) {
    const gameplayReady =
      window.GameRuntimeCoordinator?.isGameplayReady?.() === true;

    if (gameplayReady && !this.wasGameplayReady) {
      this.lastGameplayReadyAt = now;
      this.resetSamplingWindow(now);
    }

    this.wasGameplayReady = gameplayReady;
  }

  isPerfInstrumentationActive() {
    return (
      window.__PERF_SMOKE_MODE === true || window.__PERF_INSTRUMENTATION === true
    );
  }

  shouldSuspendSampling(now = performance.now()) {
    if (this.isPerfInstrumentationActive()) {
      return true;
    }

    if (document.hidden) return true;

    if (now - this.startedAt < this.config.STARTUP_GRACE_MS) {
      return true;
    }

    const coordinator = window.GameRuntimeCoordinator;
    const hasGameplayCoordinator = Boolean(coordinator?.isGameplayReady);
    const gameplayReady = coordinator?.isGameplayReady?.() === true;

    if (hasGameplayCoordinator && !gameplayReady) {
      return true;
    }

    if (
      gameplayReady &&
      typeof this.lastGameplayReadyAt === "number" &&
      now - this.lastGameplayReadyAt < this.config.GAMEPLAY_READY_GRACE_MS
    ) {
      return true;
    }

    return false;
  }

  resetSamplingWindow(now = performance.now()) {
    this.fpsHistory = [];
    this.lastCheckTime = now;
  }

  /**
   * Check current FPS and adjust quality if needed
   */
  checkAndAdjust() {
    if (this.adjustmentCooldown) return;
    if (this.fpsHistory.length < this.config.MIN_SAMPLES) return;

    const now = performance.now();
    this.updateGameplayReadyState(now);
    if (this.shouldSuspendSampling(now)) {
      this.resetSamplingWindow(now);
      return;
    }

    const avgFps = this.getAverageFps();
    const minFps = this.getMinFps();

    // Critical: Immediate reduction if minimum FPS is very low
    if (minFps < this.config.FPS_THRESHOLD_CRITICAL) {
      this.reduceQuality("critical");
      return;
    }

    // Low: Gradual reduction if average is below threshold
    if (avgFps < this.config.FPS_THRESHOLD_LOW) {
      this.reduceQuality("low");
      return;
    }

    // Recovery: Try to increase quality if FPS is stable and high
    if (avgFps > this.config.FPS_THRESHOLD_RECOVER) {
      this.tryIncreaseQuality();
    }
  }

  /**
   * Get average FPS from history
   * @returns {number} Average FPS
   */
  getAverageFps() {
    if (this.fpsHistory.length === 0) return 60;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  /**
   * Get minimum FPS from recent history (last 10 frames)
   * @returns {number} Minimum recent FPS
   */
  getMinFps() {
    const recent = this.fpsHistory.slice(-10);
    if (recent.length === 0) return 60;
    return Math.min(...recent);
  }

  /**
   * Reduce quality tier
   * @param {string} reason - Reason for reduction
   */
  reduceQuality(reason) {
    const currentTier = window.qualityManager.getTier();
    const currentIndex = this.tierOrder.indexOf(currentTier);

    // Already at lowest quality
    if (currentIndex <= 0) {
      console.log("⚠️ Already at minimum quality");
      return;
    }

    // Critical: Drop by 2 tiers if possible
    const dropAmount = reason === "critical" ? 2 : 1;
    const newIndex = Math.max(0, currentIndex - dropAmount);
    const newTier = this.tierOrder[newIndex];

    window.qualityManager.setTier(newTier);
    console.log(`⬇️ Quality reduced: ${currentTier} → ${newTier} (${reason})`);

    this.setCooldown();
  }

  /**
   * Try to increase quality tier
   */
  tryIncreaseQuality() {
    const currentTier = window.qualityManager.getTier();
    const detectedTier = window.qualityManager.detectedTier;

    const currentIndex = this.tierOrder.indexOf(currentTier);
    const detectedIndex = this.tierOrder.indexOf(detectedTier);

    // Don't go above detected capability
    if (currentIndex >= detectedIndex) return;

    // Already at highest quality
    if (currentIndex >= this.tierOrder.length - 1) return;

    // Check FPS stability before increasing
    const fpsVariance = this.getFpsVariance();
    if (fpsVariance > 10) {
      // FPS is unstable, don't increase
      return;
    }

    const newTier = this.tierOrder[currentIndex + 1];
    window.qualityManager.setTier(newTier);
    console.log(`⬆️ Quality increased: ${currentTier} → ${newTier}`);

    this.setCooldown();
  }

  /**
   * Get FPS variance (stability measure)
   * @returns {number} Standard deviation of FPS
   */
  getFpsVariance() {
    if (this.fpsHistory.length < 10) return 0;

    const avg = this.getAverageFps();
    const squareDiffs = this.fpsHistory.map((fps) => Math.pow(fps - avg, 2));
    const avgSquareDiff =
      squareDiffs.reduce((a, b) => a + b, 0) / squareDiffs.length;
    return Math.sqrt(avgSquareDiff);
  }

  /**
   * Set cooldown to prevent rapid tier changes
   */
  setCooldown() {
    this.adjustmentCooldown = true;
    this.fpsHistory = []; // Reset history

    setTimeout(() => {
      this.adjustmentCooldown = false;
    }, this.config.COOLDOWN_DURATION);
  }

  /**
   * Pause quality adjustment
   */
  pause() {
    this.isActive = false;
    console.log("⏸️ Dynamic quality adjustment paused");
  }

  /**
   * Resume quality adjustment
   */
  resume() {
    this.isActive = true;
    this.fpsHistory = [];
    console.log("▶️ Dynamic quality adjustment resumed");
  }

  /**
   * Destroy the adjuster and stop the rAF monitoring loop
   */
  destroy() {
    this.isActive = false;
    this._destroyed = true;
    this.fpsHistory = [];
    console.log("📈 Dynamic Quality Adjuster destroyed");
  }

  /**
   * Get current status
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isActive: this.isActive,
      currentFps: Math.round(this.getAverageFps()),
      minFps: Math.round(this.getMinFps()),
      variance: Math.round(this.getFpsVariance() * 10) / 10,
      cooldownActive: this.adjustmentCooldown,
      historySize: this.fpsHistory.length,
    };
  }
}

// Export class
window.DynamicQualityAdjuster = DynamicQualityAdjuster;

function bootstrapDynamicQualityAdjuster() {
  if (window.dynamicQualityAdjuster) {
    return;
  }

  window.dynamicQualityAdjuster = new DynamicQualityAdjuster();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapDynamicQualityAdjuster, {
    once: true,
  });
} else {
  bootstrapDynamicQualityAdjuster();
}
