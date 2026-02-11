/**
 * Quality Tier Manager - Adaptive Graphics Quality System
 * Detects device capabilities and applies appropriate visual settings
 *
 * @module QualityTierManager
 * @description Automatically scales graphics quality based on device capabilities
 */

const QUALITY_TIERS = window.QUALITY_TIERS;
const TIER_SETTINGS = window.QUALITY_TIER_SETTINGS;

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

  // Prototype extensions moved to quality-tier-manager.methods.js
}

// Create and export singleton instance
window.QualityTierManager = QualityTierManager;
