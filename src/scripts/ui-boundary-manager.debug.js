// js/ui-boundary-manager.debug.js - Debug helpers for UIBoundaryManager
console.log("📐 UIBoundaryManager debug loading...");

(function attachUIBoundaryDebug() {
  if (!window.UIBoundaryManager) {
    console.error("❌ UIBoundaryManager core not loaded");
    return;
  }

  const proto = window.UIBoundaryManager.prototype;

  /**
   * Validate a proposed position before applying it
   * @param {string} id - Element ID
   * @param {Object} proposedPosition - Proposed {x, y}
   * @returns {Object} Validation result {valid, adjustedPosition, violations}
   */
  proto.validatePosition = function validatePosition(id, proposedPosition) {
    const entry = this.elements.get(id);
    if (!entry) {
      return { valid: false, violations: ["Element not registered"] };
    }

    const violations = [];
    const adjustedPosition = { ...proposedPosition };

    const box = this.getBoundingBox(entry.element);
    const testBox = {
      x: proposedPosition.x,
      y: proposedPosition.y,
      width: box.width,
      height: box.height,
      right: proposedPosition.x + box.width,
      bottom: proposedPosition.y + box.height,
    };

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Check viewport bounds
    if (testBox.x < 0) {
      violations.push("Left edge out of viewport");
      adjustedPosition.x = 0;
    }
    if (testBox.y < 0) {
      violations.push("Top edge out of viewport");
      adjustedPosition.y = 0;
    }
    if (testBox.right > viewport.width) {
      violations.push("Right edge out of viewport");
      adjustedPosition.x = viewport.width - box.width;
    }
    if (testBox.bottom > viewport.height) {
      violations.push("Bottom edge out of viewport");
      adjustedPosition.y = viewport.height - box.height;
    }

    // Check for overlaps with other elements
    for (const [otherId, otherEntry] of this.elements) {
      if (otherId === id) continue;

      const otherBox = this.getBoundingBox(otherEntry.element);
      if (this.checkOverlap(testBox, otherBox, this.config.minSpacing)) {
        violations.push(`Overlaps with "${otherId}"`);
      }
    }

    return {
      valid: violations.length === 0,
      adjustedPosition,
      violations,
    };
  };

  /**
   * Get overlap log for debugging
   * @returns {Array} Overlap log entries
   */
  proto.getOverlapLog = function getOverlapLog() {
    return [...this.overlapLog];
  };

  /**
   * Clear overlap log
   */
  proto.clearOverlapLog = function clearOverlapLog() {
    this.overlapLog = [];
    console.log("📐 Overlap log cleared");
  };

  /**
   * Get debug info about all registered elements
   * @returns {Object} Debug information
   */
  proto.getDebugInfo = function getDebugInfo() {
    const info = {
      registeredElements: [],
      currentOverlaps: this.getAllOverlaps(),
      config: this.config,
      recentOverlaps: this.overlapLog.slice(-10),
    };

    for (const [id, entry] of this.elements) {
      info.registeredElements.push({
        id,
        zone: entry.zone,
        priority: entry.priority,
        fixed: entry.fixed,
        boundingBox: this.getBoundingBox(entry.element),
      });
    }

    return info;
  };

  /**
   * Destroy the boundary manager
   */
  proto.destroy = function destroy() {
    window.removeEventListener("resize", this._onResize);
    this.stopPeriodicCheck();
    this.elements.clear();
    console.log("📐 UIBoundaryManager destroyed");
  };
})();
