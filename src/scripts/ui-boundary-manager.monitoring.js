// js/ui-boundary-manager.monitoring.js - Monitoring for UIBoundaryManager
console.log("📐 UIBoundaryManager monitoring loading...");

(function attachUIBoundaryMonitoring() {
  if (!window.UIBoundaryManager) {
    console.error("❌ UIBoundaryManager core not loaded");
    return;
  }

  const proto = window.UIBoundaryManager.prototype;

  /**
   * Handle window resize
   * @private
   */
  proto._onResize = function _onResize() {
    console.log("📐 Window resized - rechecking boundaries");

    // Recheck all elements
    for (const [id] of this.elements) {
      if (this.config.autoReposition) {
        this._checkAndReposition(id);
      }
    }
  };

  /**
   * Start periodic overlap checking
   * @private
   */
  proto._startPeriodicCheck = function _startPeriodicCheck() {
    if (this._checkIntervalId) return;

    this._checkIntervalId = setInterval(
      this._periodicCheck,
      this.config.checkInterval,
    );
    console.log(
      `📐 Started periodic overlap check (every ${this.config.checkInterval}ms)`,
    );
  };

  /**
   * Stop periodic overlap checking
   */
  proto.stopPeriodicCheck = function stopPeriodicCheck() {
    if (this._checkIntervalId) {
      clearInterval(this._checkIntervalId);
      this._checkIntervalId = null;
      console.log("📐 Stopped periodic overlap check");
    }
  };

  /**
   * Periodic overlap check
   * @private
   */
  proto._periodicCheck = function _periodicCheck() {
    const overlaps = this.getAllOverlaps();

    if (overlaps.length > 0 && this.config.autoReposition) {
      for (const overlap of overlaps) {
        // Reposition the lower priority element
        if (
          overlap.elementA.entry.priority >= overlap.elementB.entry.priority
        ) {
          this._checkAndReposition(overlap.elementB.id);
        } else {
          this._checkAndReposition(overlap.elementA.id);
        }
      }
    }
  };
})();
