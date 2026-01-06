// js/ui-boundary-manager.js - UI Collision Detection and Boundary Management
console.log("📐 UIBoundaryManager loading...");

/**
 * UIBoundaryManager - Manages UI element boundaries, detects overlaps,
 * and automatically repositions elements to prevent collisions.
 *
 * Features:
 * - Bounding box collision detection
 * - Automatic repositioning with snap-to-position logic
 * - Window resize handling
 * - Overlap attempt logging
 * - Configurable minimum spacing
 * - Zone-based layout constraints
 */
class UIBoundaryManager {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      minSpacing: config.minSpacing ?? 10, // Minimum gap between elements (px)
      logOverlaps: config.logOverlaps ?? true, // Log overlap attempts
      autoReposition: config.autoReposition ?? true, // Auto-fix overlaps
      checkInterval: config.checkInterval ?? 500, // ms between periodic checks
      enablePeriodic: config.enablePeriodic ?? true, // Enable periodic overlap checks
      ...config,
    };

    // Registry of managed UI elements
    this.elements = new Map(); // id -> { element, zone, priority, fixed }

    // Predefined layout zones (regions where elements can be placed)
    this.zones = {
      "top-left": { x: 0, y: 0, width: 0.33, height: 0.1 },
      "top-center": { x: 0.33, y: 0, width: 0.34, height: 0.1 },
      "top-right": { x: 0.67, y: 0, width: 0.33, height: 0.1 },
      "panel-a": { x: 0, y: 0.1, width: 0.33, height: 0.9 },
      "panel-b": { x: 0.34, y: 0.1, width: 0.33, height: 0.9 },
      "panel-c": { x: 0.67, y: 0.1, width: 0.33, height: 0.9 },
      "bottom-left": { x: 0, y: 0.9, width: 0.33, height: 0.1 },
      "bottom-center": { x: 0.33, y: 0.9, width: 0.34, height: 0.1 },
      "bottom-right": { x: 0.67, y: 0.9, width: 0.33, height: 0.1 },
    };

    // Overlap log for debugging
    this.overlapLog = [];
    this.maxLogEntries = 100;

    // Interval ID for periodic checks
    this._checkIntervalId = null;

    // Bind methods
    this._onResize = this._onResize.bind(this);
    this._periodicCheck = this._periodicCheck.bind(this);

    this._init();
  }

  /**
   * Initialize the boundary manager
   * @private
   */
  _init() {
    // Listen for window resize
    window.addEventListener("resize", this._onResize);
    window.addEventListener("orientationchange", () => {
      setTimeout(this._onResize, 100);
    });

    // Start periodic overlap checks if enabled
    if (this.config.enablePeriodic) {
      this._startPeriodicCheck();
    }

    // Listen for display resolution changes
    document.addEventListener("displayResolutionChanged", () => {
      this._onResize();
    });

    console.log("📐 UIBoundaryManager initialized", this.config);
  }

  /**
   * Register a UI element for boundary management
   * @param {string} id - Unique identifier for the element
   * @param {HTMLElement} element - The DOM element
   * @param {Object} options - Configuration options
   * @param {string} options.zone - Preferred zone for the element
   * @param {number} options.priority - Higher priority elements won't be moved (default: 0)
   * @param {boolean} options.fixed - If true, element position is locked
   * @param {Object} options.constraints - Position constraints {minX, maxX, minY, maxY}
   */
  register(id, element, options = {}) {
    if (!element || !(element instanceof HTMLElement)) {
      console.warn(`📐 Cannot register "${id}": invalid element`);
      return false;
    }

    const entry = {
      id,
      element,
      zone: options.zone || null,
      priority: options.priority ?? 0,
      fixed: options.fixed ?? false,
      constraints: options.constraints || null,
      originalPosition: this._getPosition(element),
    };

    this.elements.set(id, entry);
    console.log(`📐 Registered UI element: "${id}"`, entry);

    // Check for overlaps with newly registered element
    if (this.config.autoReposition) {
      this._checkAndReposition(id);
    }

    return true;
  }

  /**
   * Unregister a UI element
   * @param {string} id - Element identifier
   */
  unregister(id) {
    if (this.elements.has(id)) {
      this.elements.delete(id);
      console.log(`📐 Unregistered UI element: "${id}"`);
      return true;
    }
    return false;
  }

  /**
   * Get the bounding box of an element
   * @param {HTMLElement} element - The element
   * @returns {Object} Bounding box {x, y, width, height, right, bottom}
   */
  getBoundingBox(element) {
    if (!element) return null;

    const rect = element.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      right: rect.right,
      bottom: rect.bottom,
    };
  }

  /**
   * Check if two bounding boxes overlap
   * @param {Object} boxA - First bounding box
   * @param {Object} boxB - Second bounding box
   * @param {number} spacing - Minimum spacing to maintain
   * @returns {boolean} True if boxes overlap
   */
  checkOverlap(boxA, boxB, spacing = 0) {
    if (!boxA || !boxB) return false;

    const expandedA = {
      x: boxA.x - spacing,
      y: boxA.y - spacing,
      right: boxA.right + spacing,
      bottom: boxA.bottom + spacing,
    };

    return !(
      expandedA.right < boxB.x ||
      boxB.right < expandedA.x ||
      expandedA.bottom < boxB.y ||
      boxB.bottom < expandedA.y
    );
  }

  /**
   * Calculate overlap area between two boxes
   * @param {Object} boxA - First bounding box
   * @param {Object} boxB - Second bounding box
   * @returns {number} Overlap area in pixels squared
   */
  getOverlapArea(boxA, boxB) {
    if (!this.checkOverlap(boxA, boxB)) return 0;

    const xOverlap = Math.max(
      0,
      Math.min(boxA.right, boxB.right) - Math.max(boxA.x, boxB.x)
    );
    const yOverlap = Math.max(
      0,
      Math.min(boxA.bottom, boxB.bottom) - Math.max(boxA.y, boxB.y)
    );

    return xOverlap * yOverlap;
  }

  /**
   * Find all overlapping elements for a given element
   * @param {string} id - Element identifier
   * @returns {Array} Array of overlapping element entries
   */
  findOverlaps(id) {
    const entry = this.elements.get(id);
    if (!entry) return [];

    const box = this.getBoundingBox(entry.element);
    if (!box) return [];

    const overlaps = [];

    for (const [otherId, otherEntry] of this.elements) {
      if (otherId === id) continue;

      const otherBox = this.getBoundingBox(otherEntry.element);
      if (this.checkOverlap(box, otherBox, this.config.minSpacing)) {
        overlaps.push({
          id: otherId,
          entry: otherEntry,
          box: otherBox,
          overlapArea: this.getOverlapArea(box, otherBox),
        });
      }
    }

    return overlaps;
  }

  /**
   * Get all current overlaps in the system
   * @returns {Array} Array of overlap pairs
   */
  getAllOverlaps() {
    const overlaps = [];
    const checked = new Set();

    for (const [id, entry] of this.elements) {
      const box = this.getBoundingBox(entry.element);
      if (!box) continue;

      for (const [otherId, otherEntry] of this.elements) {
        if (id === otherId) continue;

        const pairKey = [id, otherId].sort().join("|");
        if (checked.has(pairKey)) continue;
        checked.add(pairKey);

        const otherBox = this.getBoundingBox(otherEntry.element);
        if (this.checkOverlap(box, otherBox, this.config.minSpacing)) {
          overlaps.push({
            elementA: { id, entry, box },
            elementB: { id: otherId, entry: otherEntry, box: otherBox },
            overlapArea: this.getOverlapArea(box, otherBox),
          });
        }
      }
    }

    return overlaps;
  }

  /**
   * Log an overlap attempt
   * @param {string} elementA - First element ID
   * @param {string} elementB - Second element ID
   * @param {Object} details - Additional details
   * @private
   */
  _logOverlap(elementA, elementB, details = {}) {
    if (!this.config.logOverlaps) return;

    const logEntry = {
      timestamp: Date.now(),
      elementA,
      elementB,
      ...details,
    };

    this.overlapLog.push(logEntry);

    // Trim log if too large
    if (this.overlapLog.length > this.maxLogEntries) {
      this.overlapLog.shift();
    }

    console.warn(
      `📐 OVERLAP DETECTED: "${elementA}" overlaps with "${elementB}"`,
      details
    );

    // Dispatch event for external listeners
    document.dispatchEvent(
      new CustomEvent("uiOverlapDetected", {
        detail: logEntry,
      })
    );
  }

  /**
   * Calculate a non-overlapping position for an element
   * @param {string} id - Element to reposition
   * @param {Object} currentBox - Current bounding box
   * @param {Array} obstacles - Array of obstacle bounding boxes
   * @returns {Object} New position {x, y}
   */
  calculateSafePosition(id, currentBox, obstacles) {
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
  }

  /**
   * Reposition an element to avoid overlaps
   * @param {string} id - Element to reposition
   * @param {Object} newPosition - New position {x, y}
   * @private
   */
  _repositionElement(id, newPosition) {
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
      `📐 Repositioned "${id}" to (${newPosition.x}, ${newPosition.y})`
    );

    // Dispatch event
    document.dispatchEvent(
      new CustomEvent("uiElementRepositioned", {
        detail: { id, newPosition },
      })
    );
  }

  /**
   * Check and reposition an element if needed
   * @param {string} id - Element ID to check
   * @private
   */
  _checkAndReposition(id) {
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
      (o) => o.entry.priority > entry.priority
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
  }

  /**
   * Get current position of an element
   * @param {HTMLElement} element - The element
   * @returns {Object} Position info
   * @private
   */
  _getPosition(element) {
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
  }

  /**
   * Handle window resize
   * @private
   */
  _onResize() {
    console.log("📐 Window resized - rechecking boundaries");

    // Recheck all elements
    for (const [id] of this.elements) {
      if (this.config.autoReposition) {
        this._checkAndReposition(id);
      }
    }
  }

  /**
   * Start periodic overlap checking
   * @private
   */
  _startPeriodicCheck() {
    if (this._checkIntervalId) return;

    this._checkIntervalId = setInterval(
      this._periodicCheck,
      this.config.checkInterval
    );
    console.log(
      `📐 Started periodic overlap check (every ${this.config.checkInterval}ms)`
    );
  }

  /**
   * Stop periodic overlap checking
   */
  stopPeriodicCheck() {
    if (this._checkIntervalId) {
      clearInterval(this._checkIntervalId);
      this._checkIntervalId = null;
      console.log("📐 Stopped periodic overlap check");
    }
  }

  /**
   * Periodic overlap check
   * @private
   */
  _periodicCheck() {
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
  }

  /**
   * Validate a proposed position before applying it
   * @param {string} id - Element ID
   * @param {Object} proposedPosition - Proposed {x, y}
   * @returns {Object} Validation result {valid, adjustedPosition, violations}
   */
  validatePosition(id, proposedPosition) {
    const entry = this.elements.get(id);
    if (!entry) {
      return { valid: false, violations: ["Element not registered"] };
    }

    const violations = [];
    let adjustedPosition = { ...proposedPosition };

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
  }

  /**
   * Get overlap log for debugging
   * @returns {Array} Overlap log entries
   */
  getOverlapLog() {
    return [...this.overlapLog];
  }

  /**
   * Clear overlap log
   */
  clearOverlapLog() {
    this.overlapLog = [];
    console.log("📐 Overlap log cleared");
  }

  /**
   * Get debug info about all registered elements
   * @returns {Object} Debug information
   */
  getDebugInfo() {
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
  }

  /**
   * Destroy the boundary manager
   */
  destroy() {
    window.removeEventListener("resize", this._onResize);
    this.stopPeriodicCheck();
    this.elements.clear();
    console.log("📐 UIBoundaryManager destroyed");
  }
}

// Export to window
window.UIBoundaryManager = UIBoundaryManager;

// Create default instance
window.uiBoundaryManager = new UIBoundaryManager({
  minSpacing: 10,
  logOverlaps: true,
  autoReposition: true,
  checkInterval: 500,
  enablePeriodic: true,
});

console.log("✅ UIBoundaryManager loaded and default instance created");
