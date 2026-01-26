/**
 * Quality Tier Manager - Adaptive Graphics Quality System
 * Detects device capabilities and applies appropriate visual settings
 *
 * @module QualityTierManager
 * @description Automatically scales graphics quality based on device capabilities
 */

// Quality tier constants
const QUALITY_TIERS = Object.freeze({
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
  ULTRA_LOW: "ultra-low",
});

// Settings per quality tier
const TIER_SETTINGS = Object.freeze({
  [QUALITY_TIERS.HIGH]: {
    particleCount: 15,
    wormSpawnRate: 1.0,
    shadowsEnabled: true,
    blurEffects: true,
    animationComplexity: "full",
    symbolRainDensity: 1.0,
    glowIntensity: 1.0,
    maxActiveWorms: 10,
    explosionParticles: 12,
  },
  [QUALITY_TIERS.MEDIUM]: {
    particleCount: 10,
    wormSpawnRate: 0.8,
    shadowsEnabled: true,
    blurEffects: false,
    animationComplexity: "standard",
    symbolRainDensity: 0.8,
    glowIntensity: 0.7,
    maxActiveWorms: 8,
    explosionParticles: 8,
  },
  [QUALITY_TIERS.LOW]: {
    particleCount: 5,
    wormSpawnRate: 0.6,
    shadowsEnabled: false,
    blurEffects: false,
    animationComplexity: "simplified",
    symbolRainDensity: 0.6,
    glowIntensity: 0.4,
    maxActiveWorms: 5,
    explosionParticles: 4,
  },
  [QUALITY_TIERS.ULTRA_LOW]: {
    particleCount: 2,
    wormSpawnRate: 0.4,
    shadowsEnabled: false,
    blurEffects: false,
    animationComplexity: "minimal",
    symbolRainDensity: 0.4,
    glowIntensity: 0.2,
    maxActiveWorms: 3,
    explosionParticles: 0,
  },
});

class QualityTierManager {
  constructor() {
    this.currentTier = null;
    this.settings = null;
    this.detectedTier = null;
    this.listeners = new Set();

    this.init();
  }

  init() {
    this.detectedTier = this.detectTier();
    this.currentTier = this.detectedTier;
    this.settings = this.getSettingsForTier(this.currentTier);
    this.applySettings();

    // Listen for reduced motion preference changes
    this.setupReducedMotionListener();

    console.log(`🎮 Quality Tier: ${this.currentTier.toUpperCase()}`);
  }

  /**
   * Detect appropriate quality tier based on device capabilities
   * @returns {string} Quality tier identifier
   */
  detectTier() {
    const metrics = this.gatherDeviceMetrics();
    const score = this.calculateCapabilityScore(metrics);

    if (score >= 6) return QUALITY_TIERS.HIGH;
    if (score >= 3) return QUALITY_TIERS.MEDIUM;
    if (score >= 0) return QUALITY_TIERS.LOW;
    return QUALITY_TIERS.ULTRA_LOW;
  }

  /**
   * Gather device capability metrics
   * @returns {Object} Device metrics
   */
  gatherDeviceMetrics() {
    return {
      cores: navigator.hardwareConcurrency || 2,
      memory: navigator.deviceMemory || 4,
      isMobile: /Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
      connectionType: navigator.connection?.effectiveType || "4g",
      prefersReducedMotion: window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches,
      screenWidth: window.screen.width,
      devicePixelRatio: window.devicePixelRatio || 1,
      isTouchDevice: "ontouchstart" in window,
    };
  }

  /**
   * Calculate capability score from device metrics
   * @param {Object} metrics - Device metrics
   * @returns {number} Capability score
   */
  calculateCapabilityScore(metrics) {
    let score = 0;

    // CPU cores scoring
    if (metrics.cores >= 8) score += 3;
    else if (metrics.cores >= 4) score += 2;
    else if (metrics.cores >= 2) score += 1;

    // Memory scoring
    if (metrics.memory >= 8) score += 3;
    else if (metrics.memory >= 4) score += 2;
    else if (metrics.memory >= 2) score += 1;

    // Mobile penalty
    if (metrics.isMobile) score -= 1;

    // Connection type
    if (metrics.connectionType === "4g") score += 1;
    else if (metrics.connectionType === "3g") score += 0;
    else score -= 1;

    // Reduced motion preference
    if (metrics.prefersReducedMotion) score -= 2;

    // High DPI screen (more pixels to render)
    if (metrics.devicePixelRatio > 2) score -= 1;

    return score;
  }

  /**
   * Get settings for a specific quality tier
   * @param {string} tier - Quality tier
   * @returns {Object} Settings object
   */
  getSettingsForTier(tier) {
    return { ...TIER_SETTINGS[tier] };
  }

  /**
   * Apply current settings to document
   */
  applySettings() {
    const root = document.documentElement;
    const s = this.settings;

    // Set CSS custom properties
    root.style.setProperty("--quality-particle-count", s.particleCount);
    root.style.setProperty("--quality-glow-intensity", s.glowIntensity);
    root.style.setProperty(
      "--quality-shadow-enabled",
      s.shadowsEnabled ? "1" : "0",
    );
    root.style.setProperty("--quality-blur-enabled", s.blurEffects ? "1" : "0");
    root.style.setProperty("--quality-rain-density", s.symbolRainDensity);

    // Set data attribute for CSS selectors
    document.body.dataset.qualityTier = this.currentTier;

    // Dispatch event for JavaScript modules
    this.dispatchChange();
  }

  /**
   * Dispatch quality tier change event
   */
  dispatchChange() {
    const event = new CustomEvent("qualityTierChanged", {
      detail: {
        tier: this.currentTier,
        settings: { ...this.settings },
        detectedTier: this.detectedTier,
      },
    });
    document.dispatchEvent(event);

    // Notify listeners
    this.listeners.forEach((callback) => {
      try {
        callback(this.currentTier, this.settings);
      } catch (e) {
        console.error("Quality tier listener error:", e);
      }
    });
  }

  /**
   * Setup listener for reduced motion preference changes
   */
  setupReducedMotionListener() {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    mediaQuery.addEventListener("change", (e) => {
      console.log(`♿ Reduced motion: ${e.matches ? "enabled" : "disabled"}`);

      if (e.matches) {
        // Force ultra-low when reduced motion is enabled
        this.setTier(QUALITY_TIERS.ULTRA_LOW);
      } else {
        // Return to detected tier
        this.setTier(this.detectedTier);
      }
    });
  }

  /**
   * Manually set quality tier
   * @param {string} tier - Quality tier to set
   */
  setTier(tier) {
    const normalizedTier = tier.toLowerCase();

    if (!Object.values(QUALITY_TIERS).includes(normalizedTier)) {
      console.error(`Invalid quality tier: ${tier}`);
      return;
    }

    if (this.currentTier === normalizedTier) return;

    const previousTier = this.currentTier;
    this.currentTier = normalizedTier;
    this.settings = this.getSettingsForTier(normalizedTier);
    this.applySettings();

    console.log(`🔄 Quality tier: ${previousTier} → ${normalizedTier}`);
  }

  /**
   * Get current quality tier
   * @returns {string} Current tier
   */
  getTier() {
    return this.currentTier;
  }

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  getSettings() {
    return { ...this.settings };
  }

  /**
   * Check if a feature is enabled at current tier
   * @param {string} feature - Feature name
   * @returns {boolean} Whether feature is enabled
   */
  isFeatureEnabled(feature) {
    return Boolean(this.settings[feature]);
  }

  /**
   * Add listener for quality tier changes
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove listener
   * @param {Function} callback - Callback function
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Force re-detection of quality tier
   */
  redetect() {
    this.detectedTier = this.detectTier();
    this.setTier(this.detectedTier);
  }
}

// Export constants
window.QUALITY_TIERS = QUALITY_TIERS;

// Create and export singleton instance
window.QualityTierManager = QualityTierManager;

// Initialize on DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    window.qualityManager = new QualityTierManager();
  });
} else {
  window.qualityManager = new QualityTierManager();
}
