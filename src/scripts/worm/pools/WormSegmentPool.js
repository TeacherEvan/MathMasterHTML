// worm/pools/WormSegmentPool.js - Object Pool for worm segments
// SOLID: Single Responsibility - Only manages segment recycling
// Performance: Eliminates GC pressure from segment creation
(function() {
  "use strict";

  /**
   * WormSegmentPool - Pre-allocated pool of worm segment DOM elements
   * Eliminates garbage collection pressure from frequent segment creation
   */
  class WormSegmentPool {
    /** @type {WormSegmentPool|null} */
    static _instance = null;

    /** @type {HTMLDivElement[]} */
    _pool = [];

    /** @type {HTMLDivElement[]} */
    _available = [];

    /** @type {HTMLDivElement} */
    _template = null;

    /** @type {number} */
    _initialSize = 0;

    /** @type {number} */
    _expandSize = 10;

    /**
     * Get singleton instance
     * @param {number} [initialSize=100] - Initial pool size
     * @returns {WormSegmentPool}
     */
    static getInstance(initialSize = 100) {
      if (!WormSegmentPool._instance) {
        WormSegmentPool._instance = new WormSegmentPool(initialSize);
      }
      return WormSegmentPool._instance;
    }

    /**
     * Create a new segment pool
     * @param {number} initialSize - Number of segments to pre-allocate
     */
    constructor(initialSize = 100) {
      this._initialSize = initialSize;

      // Create template segment
      this._template = document.createElement("div");
      this._template.className = "worm-segment";

      // Pre-allocate segments
      this._expand(initialSize);

      console.log(`🧩 WormSegmentPool: Pre-allocated ${initialSize} segments`);
    }

    /**
     * Expand the pool with additional segments
     * @param {number} count - Number of segments to add
     * @private
     */
    _expand(count) {
      for (let i = 0; i < count; i++) {
        const segment = this._template.cloneNode(true);
        this._pool.push(segment);
        this._available.push(segment);
      }
    }

    /**
     * Acquire a segment from the pool
     * @param {number} [index] - Segment index for CSS variable
     * @returns {HTMLDivElement} Segment element
     */
    acquire(index = 0) {
      let segment;

      if (this._available.length === 0) {
        // Pool exhausted - expand
        this._expand(this._expandSize);
        console.log(`🧩 WormSegmentPool: Expanded by ${this._expandSize}`);
      }

      segment = this._available.pop();
      segment.style.setProperty("--segment-index", String(index));
      segment.className = "worm-segment";
      segment.style.cssText = "";

      return segment;
    }

    /**
     * Acquire multiple segments at once
     * @param {number} count - Number of segments to acquire
     * @returns {HTMLDivElement[]} Array of segment elements
     */
    acquireMultiple(count) {
      const segments = [];
      for (let i = 0; i < count; i++) {
        segments.push(this.acquire(i));
      }
      return segments;
    }

    /**
     * Release a segment back to the pool
     * @param {HTMLDivElement} segment - Segment to release
     */
    release(segment) {
      // Clean up segment
      segment.className = "worm-segment";
      segment.style.cssText = "";

      // Remove from DOM if attached
      if (segment.parentNode) {
        segment.parentNode.removeChild(segment);
      }

      // Return to available pool
      if (!this._available.includes(segment)) {
        this._available.push(segment);
      }
    }

    /**
     * Release multiple segments at once
     * @param {HTMLDivElement[]} segments - Segments to release
     */
    releaseMultiple(segments) {
      segments.forEach((s) => this.release(s));
    }

    /**
     * Get pool statistics
     * @returns {{total: number, available: number, inUse: number}}
     */
    getStats() {
      return {
        total: this._pool.length,
        available: this._available.length,
        inUse: this._pool.length - this._available.length,
      };
    }

    /**
     * Reset pool to initial state
     */
    reset() {
      // Release all segments
      this._pool.forEach((segment) => {
        if (segment.parentNode) {
          segment.parentNode.removeChild(segment);
        }
        segment.className = "worm-segment";
        segment.style.cssText = "";
      });

      // Reset available list
      this._available = [...this._pool];

      console.log("🧩 WormSegmentPool: Reset complete");
    }

    /**
     * Destroy the pool and free all resources
     */
    destroy() {
      this._pool.forEach((segment) => {
        if (segment.parentNode) {
          segment.parentNode.removeChild(segment);
        }
      });

      this._pool = [];
      this._available = [];
      WormSegmentPool._instance = null;

      console.log("🧩 WormSegmentPool: Destroyed");
    }
  }

  // Attach to window
  window.WormSegmentPool = WormSegmentPool;

  console.log("✅ WormSegmentPool module loaded");
})();
