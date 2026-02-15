// worm/pools/ParticlePool.js - Object Pool for explosion particles
// SOLID: Single Responsibility - Only manages particle recycling
// Performance: Eliminates GC pressure from explosion effects
// ARCHITECTURAL IMPROVEMENT: Added pre-allocation, reset methods, and statistics tracking
(function() {
  "use strict";

  /**
   * ParticlePool - Pre-allocated pool of explosion particle elements
   * Eliminates garbage collection pressure from frequent particle creation
   *
   * ARCHITECTURAL IMPROVEMENTS:
   * 1. Pre-allocation during game initialization
   * 2. Object reset methods that clear all properties
   * 3. Pool statistics tracking for memory efficiency monitoring
   * 4. Scheduled release tracking for cleanup
   */
  class ParticlePool {
    /** @type {ParticlePool|null} */
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
    _expandSize = 24; // 12 particles per explosion × 2

    /** @type {number} */
    _maxSize = 1000;

    /** @type {boolean} */
    _isPreAllocated = false;

    /** @type {Set<number>} Scheduled release timeout IDs */
    _scheduledReleases = new Set();

    /** @type {Object} Statistics tracking */
    _stats = {
      totalAllocated: 0,
      totalReleased: 0,
      totalExpansions: 0,
      peakUsage: 0,
      cacheHits: 0,
      cacheMisses: 0,
      scheduledReleases: 0,
    };

    /**
     * Get singleton instance
     * @param {number} [initialSize=240] - Initial pool size
     * @param {number} [maxSize=1000] - Maximum pool size
     * @returns {ParticlePool}
     */
    static getInstance(initialSize = 240, maxSize = 1000) {
      if (!ParticlePool._instance) {
        ParticlePool._instance = new ParticlePool(initialSize, maxSize);
      }
      return ParticlePool._instance;
    }

    /**
     * Create a new particle pool
     * @param {number} initialSize - Number of particles to pre-allocate
     * @param {number} maxSize - Maximum pool size
     */
    constructor(initialSize = 240, maxSize = 1000) {
      this._initialSize = initialSize;
      this._maxSize = maxSize;

      // Create template particle
      this._template = document.createElement("div");
      this._template.className = "explosion-particle";

      // Pre-allocate particles
      this._expand(initialSize);
      this._isPreAllocated = true;

      console.log(
        `✨ ParticlePool: Pre-allocated ${initialSize} particles (max: ${maxSize})`,
      );
    }

    /**
     * Expand the pool with additional particles
     * @param {number} count - Number of particles to add
     * @private
     */
    _expand(count) {
      // ARCHITECTURAL IMPROVEMENT: Respect maximum pool size
      const currentSize = this._pool.length;
      const expandAmount = Math.min(count, this._maxSize - currentSize);

      if (expandAmount <= 0) {
        console.warn(
          `✨ ParticlePool: Maximum size (${this._maxSize}) reached, cannot expand`,
        );
        return;
      }

      for (let i = 0; i < expandAmount; i++) {
        const particle = this._template.cloneNode(true);
        this._pool.push(particle);
        this._available.push(particle);
      }

      this._stats.totalExpansions++;
    }

    /**
     * Pre-allocate pool during game initialization
     * Call this during game startup for optimal performance
     * @param {number} [count] - Number of particles to pre-allocate (default: initialSize)
     */
    preAllocate(count) {
      const amount = count || this._initialSize;
      if (this._pool.length < amount) {
        this._expand(amount - this._pool.length);
        this._isPreAllocated = true;
        console.log(
          `✨ ParticlePool: Pre-allocated ${amount} particles during initialization`,
        );
      }
    }

    /**
     * Reset a particle to its initial state
     * ARCHITECTURAL IMPROVEMENT: Centralized reset logic
     * @param {HTMLDivElement} particle - Particle to reset
     * @private
     */
    _resetParticle(particle) {
      // Clear all CSS properties
      particle.className = "explosion-particle";
      particle.style.cssText = "";

      // Clear CSS custom properties
      particle.style.removeProperty("--angle-x");
      particle.style.removeProperty("--angle-y");

      // Clear any data attributes
      particle.removeAttribute("data-particle-id");
    }

    /**
     * Acquire a particle from the pool
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} angle - Movement angle in radians
     * @param {number} distance - Travel distance
     * @returns {HTMLDivElement} Particle element
     */
    acquire(x, y, angle, distance) {
      let particle;

      if (this._available.length === 0) {
        // Pool exhausted - try to expand
        this._expand(this._expandSize);
        this._stats.cacheMisses++;

        if (this._available.length === 0) {
          // Still empty after expansion attempt (max size reached)
          console.warn(
            "✨ ParticlePool: Pool exhausted, creating temporary particle",
          );
          particle = this._template.cloneNode(true);
          this._configureParticle(particle, x, y, angle, distance);
          return particle;
        }
      } else {
        this._stats.cacheHits++;
      }

      particle = this._available.pop();

      // ARCHITECTURAL IMPROVEMENT: Use reset method for consistent initialization
      this._resetParticle(particle);
      this._configureParticle(particle, x, y, angle, distance);

      // Update statistics
      this._stats.totalAllocated++;
      const inUse = this._pool.length - this._available.length;
      if (inUse > this._stats.peakUsage) {
        this._stats.peakUsage = inUse;
      }

      return particle;
    }

    /**
     * Configure a particle with position and animation properties
     * @param {HTMLDivElement} particle - Particle to configure
     * @param {number} x - Initial X position
     * @param {number} y - Initial Y position
     * @param {number} angle - Movement angle in radians
     * @param {number} distance - Travel distance
     * @private
     */
    _configureParticle(particle, x, y, angle, distance) {
      particle.className = "explosion-particle";
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--angle-x", `${Math.cos(angle) * distance}`);
      particle.style.setProperty("--angle-y", `${Math.sin(angle) * distance}`);
    }

    /**
     * Acquire particles for an explosion effect
     * @param {number} x - Explosion center X
     * @param {number} y - Explosion center Y
     * @param {number} [count=12] - Number of particles
     * @param {number} [baseDistance=80] - Base travel distance
     * @returns {HTMLDivElement[]} Array of particle elements
     */
    acquireExplosion(x, y, count = 12, baseDistance = 80) {
      const particles = [];

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const distance = baseDistance + Math.random() * 40;
        particles.push(this.acquire(x, y, angle, distance));
      }

      return particles;
    }

    /**
     * Release a particle back to the pool
     * ARCHITECTURAL IMPROVEMENT: Enhanced reset and statistics tracking
     * @param {HTMLDivElement} particle - Particle to release
     */
    release(particle) {
      // Validate particle
      if (!particle) return;

      // Check if this is a temporary particle (not from pool)
      if (!this._pool.includes(particle)) {
        // Just remove from DOM
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
        return;
      }

      // ARCHITECTURAL IMPROVEMENT: Full reset of all properties
      this._resetParticle(particle);

      // Remove from DOM if attached
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }

      // Return to available pool (avoid duplicates)
      if (!this._available.includes(particle)) {
        this._available.push(particle);
      }

      // Update statistics
      this._stats.totalReleased++;
    }

    /**
     * Release multiple particles at once
     * @param {HTMLDivElement[]} particles - Particles to release
     */
    releaseMultiple(particles) {
      particles.forEach((p) => this.release(p));
    }

    /**
     * Schedule automatic release after delay
     * ARCHITECTURAL IMPROVEMENT: Track scheduled releases for cleanup
     * @param {HTMLDivElement} particle - Particle to release
     * @param {number} [delay=600] - Delay in ms
     */
    scheduleRelease(particle, delay = 600) {
      this._stats.scheduledReleases++;

      const timeoutId = setTimeout(() => {
        this._scheduledReleases.delete(timeoutId);
        this.release(particle);
      }, delay);

      this._scheduledReleases.add(timeoutId);
    }

    /**
     * Schedule release of multiple particles
     * @param {HTMLDivElement[]} particles - Particles to release
     * @param {number} [delay=600] - Delay in ms
     */
    scheduleReleaseMultiple(particles, delay = 600) {
      particles.forEach((p) => this.scheduleRelease(p, delay));
    }

    /**
     * Cancel all scheduled releases
     */
    cancelScheduledReleases() {
      this._scheduledReleases.forEach((id) => clearTimeout(id));
      this._scheduledReleases.clear();
      console.log("✨ ParticlePool: Cancelled all scheduled releases");
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
        scheduledReleases: this._stats.scheduledReleases,
        pendingScheduled: this._scheduledReleases.size,
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
        `✨ ParticlePool Efficiency Report:`,
        `   Pool Size: ${stats.total}/${stats.maxSize} (${stats.efficiency}% utilized)`,
        `   Peak Usage: ${stats.peakUsage} particles`,
        `   Cache Hit Rate: ${stats.cacheHitRate}%`,
        `   Total Allocations: ${stats.totalAllocated}`,
        `   Total Releases: ${stats.totalReleased}`,
        `   Pool Expansions: ${stats.expansions}`,
        `   Pending Scheduled: ${stats.pendingScheduled}`,
      ].join("\n");
    }

    /**
     * Reset pool to initial state
     * ARCHITECTURAL IMPROVEMENT: Also reset statistics and cancel scheduled releases
     */
    reset() {
      // Cancel all scheduled releases
      this.cancelScheduledReleases();

      // Release all particles
      this._pool.forEach((particle) => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
        this._resetParticle(particle);
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
        scheduledReleases: 0,
      };

      console.log("✨ ParticlePool: Reset complete");
    }

    /**
     * Destroy the pool and free all resources
     */
    destroy() {
      // Cancel all scheduled releases
      this.cancelScheduledReleases();

      this._pool.forEach((particle) => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
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
        scheduledReleases: 0,
      };
      ParticlePool._instance = null;

      console.log("✨ ParticlePool: Destroyed");
    }
  }

  // Attach to window
  window.ParticlePool = ParticlePool;

  console.log("✅ ParticlePool module loaded");
})();
