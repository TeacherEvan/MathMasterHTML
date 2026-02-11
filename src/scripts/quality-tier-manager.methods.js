(function() {
  if (!window.QualityTierManager) {
    console.warn("QualityTierManager not found for extensions");
    return;
  }

  const proto = window.QualityTierManager.prototype;

  /**
   * Get current quality tier
   * @returns {string} Current tier
   */
  proto.getTier = function() {
    return this.currentTier;
  };

  /**
   * Get current settings
   * @returns {Object} Current settings
   */
  proto.getSettings = function() {
    return { ...this.settings };
  };

  /**
   * Check if a feature is enabled at current tier
   * @param {string} feature - Feature name
   * @returns {boolean} Whether feature is enabled
   */
  proto.isFeatureEnabled = function(feature) {
    return Boolean(this.settings[feature]);
  };

  /**
   * Add listener for quality tier changes
   * @param {Function} callback - Callback function
   */
  proto.addListener = function(callback) {
    this.listeners.add(callback);
  };

  /**
   * Remove listener
   * @param {Function} callback - Callback function
   */
  proto.removeListener = function(callback) {
    this.listeners.delete(callback);
  };

  /**
   * Force re-detection of quality tier
   */
  proto.redetect = function() {
    this.detectedTier = this.detectTier();
    this.setTier(this.detectedTier);
  };
})();
