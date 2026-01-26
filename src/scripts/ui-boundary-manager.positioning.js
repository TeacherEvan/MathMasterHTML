// js/ui-boundary-manager.positioning.js - Positioning logic for UIBoundaryManager
console.log("📐 UIBoundaryManager positioning loading...");

(function attachUIBoundaryPositioning() {
  if (!window.UIBoundaryManager) {
    console.error("❌ UIBoundaryManager core not loaded");
    return;
  }

  const proto = window.UIBoundaryManager.prototype;

  /**
   * Calculate a non-overlapping position for an element
   * @param {string} id - Element to reposition
   * @param {Object} currentBox - Current bounding box
   * @param {Array} obstacles - Array of obstacle bounding boxes
   * @returns {Object} New position {x, y}
   */
  proto.calculateSafePosition = function calculateSafePosition(
    id,
    currentBox,
    obstacles,
  ) {
    const entry = this.elements.get(id);
    if (!entry) return null;

    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Get zone constraints if specified
    let zoneBox = null;
    if (entry.zone && this.zones[entry.zone]) {
      const zone = this.zones[entry.zone];
      zoneBox = {
        x: zone.x * viewport.width,
        y: zone.y * viewport.height,
        width: zone.width * viewport.width,
        height: zone.height * viewport.height,
      };
    }

    // Try different positions
    const spacing = this.config.minSpacing;
    const positions = [];

    // Original position
    positions.push({ x: currentBox.x, y: currentBox.y });

    // Try moving right
    for (const obs of obstacles) {
      positions.push({ x: obs.right + spacing, y: currentBox.y });
    }

    // Try moving left
    for (const obs of obstacles) {
      positions.push({
        x: obs.x - currentBox.width - spacing,
        y: currentBox.y,
      });
    }

    // Try moving down
    for (const obs of obstacles) {
      positions.push({ x: currentBox.x, y: obs.bottom + spacing });
    }

    // Try moving up
    for (const obs of obstacles) {
      positions.push({
        x: currentBox.x,
        y: obs.y - currentBox.height - spacing,
      });
    }

    // Find first valid position
    for (const pos of positions) {
      const testBox = {
        x: pos.x,
        y: pos.y,
        width: currentBox.width,
        height: currentBox.height,
        right: pos.x + currentBox.width,
        bottom: pos.y + currentBox.height,
      };

      // Check viewport bounds
      if (
        testBox.x < 0 ||
        testBox.y < 0 ||
        testBox.right > viewport.width ||
        testBox.bottom > viewport.height
      ) {
        continue;
      }

      // Check zone constraints
      if (zoneBox) {
        if (
          testBox.x < zoneBox.x ||
          testBox.y < zoneBox.y ||
          testBox.right > zoneBox.x + zoneBox.width ||
          testBox.bottom > zoneBox.y + zoneBox.height
        ) {
          continue;
        }
      }

      // Check custom constraints
      if (entry.constraints) {
        const c = entry.constraints;
        if (
          (c.minX !== undefined && testBox.x < c.minX) ||
          (c.maxX !== undefined && testBox.right > c.maxX) ||
          (c.minY !== undefined && testBox.y < c.minY) ||
          (c.maxY !== undefined && testBox.bottom > c.maxY)
        ) {
          continue;
        }
      }

      // Check if position is free of overlaps
      let hasOverlap = false;
      for (const obs of obstacles) {
        if (this.checkOverlap(testBox, obs, spacing)) {
          hasOverlap = true;
          break;
        }
      }

      if (!hasOverlap) {
        return pos;
      }
    }

    // Fallback: return position with minimum overlap
    console.warn(`📐 Could not find non-overlapping position for "${id}"`);
    return positions[0];
  };

  /**
   * Reposition an element to avoid overlaps
   * @param {string} id - Element to reposition
   * @param {Object} newPosition - New position {x, y}
   * @private
   */
  proto._repositionElement = function _repositionElement(id, newPosition) {
    const entry = this.elements.get(id);
    if (!entry || entry.fixed) return;

    const element = entry.element;
    const style = element.style;

    // Store original position if not already stored
    if (!entry.repositionedFrom) {
      entry.repositionedFrom = this._getPosition(element);
    }

    // Apply new position
    style.position = "fixed";
    style.left = `${newPosition.x}px`;
    style.top = `${newPosition.y}px`;
    style.right = "auto";
    style.bottom = "auto";
    style.transform = "none";

    console.log(
      `📐 Repositioned "${id}" to (${newPosition.x}, ${newPosition.y})`,
    );

    // Dispatch event
    document.dispatchEvent(
      new CustomEvent("uiElementRepositioned", {
        detail: { id, newPosition },
      }),
    );
  };

  /**
   * Check and reposition an element if needed
   * @param {string} id - Element ID to check
   * @private
   */
  proto._checkAndReposition = function _checkAndReposition(id) {
    const overlaps = this.findOverlaps(id);

    if (overlaps.length === 0) return;

    const entry = this.elements.get(id);
    if (!entry) return;

    // Log overlaps
    for (const overlap of overlaps) {
      this._logOverlap(id, overlap.id, {
        overlapArea: overlap.overlapArea,
        action: entry.fixed ? "logged" : "repositioning",
      });
    }

    // Don't reposition if fixed or if we have higher priority
    if (entry.fixed) return;

    const higherPriorityOverlaps = overlaps.filter(
      (o) => o.entry.priority > entry.priority,
    );
    if (higherPriorityOverlaps.length === 0) {
      // This element has equal or higher priority, reposition the others
      for (const overlap of overlaps) {
        if (!overlap.entry.fixed) {
          this._checkAndReposition(overlap.id);
        }
      }
      return;
    }

    // Calculate new position
    const currentBox = this.getBoundingBox(entry.element);
    const obstacleBoxes = overlaps.map((o) => o.box);
    const newPos = this.calculateSafePosition(id, currentBox, obstacleBoxes);

    if (newPos) {
      this._repositionElement(id, newPos);
    }
  };

  /**
   * Get current position of an element
   * @param {HTMLElement} element - The element
   * @returns {Object} Position info
   * @private
   */
  proto._getPosition = function _getPosition(element) {
    const computed = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      position: computed.position,
      left: computed.left,
      top: computed.top,
      right: computed.right,
      bottom: computed.bottom,
      transform: computed.transform,
      rect: {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      },
    };
  };
})();
