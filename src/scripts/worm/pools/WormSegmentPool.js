// worm/pools/WormSegmentPool.js - Object Pool for worm segments
// SOLID: Single Responsibility - Only manages segment recycling
// Performance: Eliminates GC pressure from segment creation
// ARCHITECTURAL IMPROVEMENT: Added pre-allocation, reset methods, and statistics tracking
(function() {
  "use strict";

  /**
   * WormSegmentPool - Pre-allocated pool of worm segment DOM elements
   * Eliminates garbage collection pressure from frequent segment creation
   *
   * ARCHITECTURAL IMPROVEMENTS:
   * 1. Pre-allocation during game initialization
   * 2. Object reset methods that clear all properties
   * 3. Pool statistics tracking for memory efficiency monitoring
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

    /** @type {number} */
    _maxSize = 500;

    /** @type {boolean} */
    _isPreAllocated = false;

    /** @type {Object} Statistics tracking */
    _stats = {
      totalAllocated: 0,
      totalReleased: 0,
      totalExpansions: 0,
      peakUsage: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    /**
     * Get singleton instance
     * @param {number} [initialSize=100] - Initial pool size
     * @param {number} [maxSize=500] - Maximum pool size
     * @returns {WormSegmentPool}
     */
    static getInstance(initialSize = 100, maxSize = 500) {
      if (!WormSegmentPool._instance) {
        WormSegmentPool._instance = new WormSegmentPool(initialSize, maxSize);
      }
      return WormSegmentPool._instance;
    }

    /**
     * Create a new segment pool
     * @param {number} initialSize - Number of segments to pre-allocate
     * @param {number} maxSize - Maximum pool size
     */
    constructor(initialSize = 100, maxSize = 500) {
      this._initialSize = initialSize;
      this._maxSize = maxSize;

      // Create template segment
      this._template = document.createElement("div");
      this._template.className = "worm-segment";

      // Pre-allocate segments
      this._expand(initialSize);
      this._isPreAllocated = true;

      console.log(
        `🧩 WormSegmentPool: Pre-allocated ${initialSize} segments (max: ${maxSize})`,
      );
    }

    /**
     * Expand the pool with additional segments
     * @param {number} count - Number of segments to add
     * @private
     */
    _expand(count) {
      // ARCHITECTURAL IMPROVEMENT: Respect maximum pool size
      const currentSize = this._pool.length;
      const expandAmount = Math.min(count, this._maxSize - currentSize);

      if (expandAmount <= 0) {
        console.warn(
          `🧩 WormSegmentPool: Maximum size (${this._maxSize}) reached, cannot expand`,
        );
        return;
      }

      for (let i = 0; i < expandAmount; i++) {
        const segment = this._template.cloneNode(true);
        this._pool.push(segment);
        this._available.push(segment);
      }

      this._stats.totalExpansions++;
    }

    /**
     * Pre-allocate pool during game initialization
     * Call this during game startup for optimal performance
     * @param {number} [count] - Number of segments to pre-allocate (default: initialSize)
     */
    preAllocate(count) {
      const amount = count || this._initialSize;
      if (this._pool.length < amount) {
        this._expand(amount - this._pool.length);
        this._isPreAllocated = true;
        console.log(
          `🧩 WormSegmentPool: Pre-allocated ${amount} segments during initialization`,
        );
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
        // Pool exhausted - try to expand
        this._expand(this._expandSize);
        this._stats.cacheMisses++;

        if (this._available.length === 0) {
          // Still empty after expansion attempt (max size reached)
          console.warn(
            "🧩 WormSegmentPool: Pool exhausted, creating temporary segment",
          );
          segment = this._template.cloneNode(true);
          segment.style.setProperty("--segment-index", String(index));
          segment.className = "worm-segment";
          return segment;
        }
      } else {
        this._stats.cacheHits++;
      }

      segment = this._available.pop();

      // ARCHITECTURAL IMPROVEMENT: Use reset method for consistent initialization
      this._resetSegment(segment, index);

      // Update statistics
      this._stats.totalAllocated++;
      const inUse = this._pool.length - this._available.length;
      if (inUse > this._stats.peakUsage) {
        this._stats.peakUsage = inUse;
      }

      return segment;
    }

    /**
     * Reset a segment to its initial state
     * ARCHITECTURAL IMPROVEMENT: Centralized reset logic
     * @param {HTMLDivElement} segment - Segment to reset
     * @param {number} index - Segment index
     * @private
     */
    _resetSegment(segment, index = 0) {
      // Clear all CSS properties
      segment.className = "worm-segment";
      segment.style.cssText = "";

      // Set segment index for CSS animations
      segment.style.setProperty("--segment-index", String(index));

      // Clear any data attributes
      segment.removeAttribute("data-worm-id");
      segment.removeAttribute("data-segment-index");

      // Remove any event listeners (by cloning if necessary)
      // Note: For performance, we assume no event listeners are added to segments
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
     * ARCHITECTURAL IMPROVEMENT: Enhanced reset and statistics tracking
     * @param {HTMLDivElement} segment - Segment to release
     */
    release(segment) {
      // Validate segment
      if (!segment || !this._pool.includes(segment)) {
        return; // Not from this pool
      }

      // ARCHITECTURAL IMPROVEMENT: Full reset of all properties
      this._resetSegment(segment);

      // Remove from DOM if attached
      if (segment.parentNode) {
        segment.parentNode.removeChild(segment);
      }

      // Return to available pool (avoid duplicates)
      if (!this._available.includes(segment)) {
        this._available.push(segment);
      }

      // Update statistics
      this._stats.totalReleased++;
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
     * ARCHITECTURAL IMPROVEMENT: Enhanced statistics for memory efficiency monitoring
     * @returns {{total: number, available: number, inUse: number, peakUsage: number, efficiency: number, cacheHitRate: number}}
     */
    getStats() {
      const inUse = this._pool.length - this._available.length;
      const totalRequests = this._stats.cacheHits + this._stats.cacheMisses;
      const cacheHitRate =
        totalRequests > 0 ? (this._stats.cacheHits / totalRequests) * 100 : 100;
      const efficiency =
        this._pool.length > 0 ? (inUse / this._pool.length) * 100 : 0;

      return {
        total: this._pool.length,
        available: this._available.length,
        inUse: inUse,
        maxSize: this._maxSize,
        peakUsage: this._stats.peakUsage,
        efficiency: efficiency.toFixed(1),
        cacheHitRate: cacheHitRate.toFixed(1),
        totalAllocated: this._stats.totalAllocated,
        totalReleased: this._stats.totalReleased,
        expansions: this._stats.totalExpansions,
        isPreAllocated: this._isPreAllocated,
      };
    }

    /**
     * Get memory efficiency report
     * @returns {string} Human-readable efficiency report
     */
    getEfficiencyReport() {
      const stats = this.getStats();
      return [
        `🧩 WormSegmentPool Efficiency Report:`,
        `   Pool Size: ${stats.total}/${stats.maxSize} (${stats.efficiency}% utilized)`,
        `   Peak Usage: ${stats.peakUsage} segments`,
        `   Cache Hit Rate: ${stats.cacheHitRate}%`,
        `   Total Allocations: ${stats.totalAllocated}`,
        `   Total Releases: ${stats.totalReleased}`,
        `   Pool Expansions: ${stats.expansions}`,
      ].join("\n");
    }

    /**
     * Reset pool to initial state
     * ARCHITECTURAL IMPROVEMENT: Also reset statistics
     */
    reset() {
      // Release all segments
      this._pool.forEach((segment) => {
        if (segment.parentNode) {
          segment.parentNode.removeChild(segment);
        }
        this._resetSegment(segment);
      });

      // Reset available list
      this._available = [...this._pool];

      // Reset statistics
      this._stats = {
        totalAllocated: 0,
        totalReleased: 0,
        totalExpansions: 0,
        peakUsage: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };

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
      this._stats = {
        totalAllocated: 0,
        totalReleased: 0,
        totalExpansions: 0,
        peakUsage: 0,
        cacheHits: 0,
        cacheMisses: 0,
      };
      WormSegmentPool._instance = null;

      console.log("🧩 WormSegmentPool: Destroyed");
    }
  }

  // Attach to window
  window.WormSegmentPool = WormSegmentPool;

  console.log("✅ WormSegmentPool module loaded");
})();
