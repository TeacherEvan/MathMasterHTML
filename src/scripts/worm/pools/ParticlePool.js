// worm/pools/ParticlePool.js - Object Pool for explosion particles
// SOLID: Single Responsibility - Only manages particle recycling
// Performance: Eliminates GC pressure from explosion effects
(function() {
  "use strict";

  /**
   * ParticlePool - Pre-allocated pool of explosion particle elements
   * Eliminates garbage collection pressure from frequent particle creation
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
    _expandSize = 24; // 12 particles per explosion × 2

    /**
     * Get singleton instance
     * @param {number} [initialSize=240] - Initial pool size
     * @returns {ParticlePool}
     */
    static getInstance(initialSize = 240) {
      if (!ParticlePool._instance) {
        ParticlePool._instance = new ParticlePool(initialSize);
      }
      return ParticlePool._instance;
    }

    /**
     * Create a new particle pool
     * @param {number} initialSize - Number of particles to pre-allocate
     */
    constructor(initialSize = 240) {
      // Create template particle
      this._template = document.createElement("div");
      this._template.className = "explosion-particle";

      // Pre-allocate particles
      this._expand(initialSize);

      console.log(`✨ ParticlePool: Pre-allocated ${initialSize} particles`);
    }

    /**
     * Expand the pool with additional particles
     * @param {number} count - Number of particles to add
     * @private
     */
    _expand(count) {
      for (let i = 0; i < count; i++) {
        const particle = this._template.cloneNode(true);
        this._pool.push(particle);
        this._available.push(particle);
      }
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
        // Pool exhausted - expand
        this._expand(this._expandSize);
        console.log(`✨ ParticlePool: Expanded by ${this._expandSize}`);
      }

      particle = this._available.pop();

      // Configure particle
      particle.className = "explosion-particle";
      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--angle-x", `${Math.cos(angle) * distance}`);
      particle.style.setProperty("--angle-y", `${Math.sin(angle) * distance}`);

      return particle;
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
     * @param {HTMLDivElement} particle - Particle to release
     */
    release(particle) {
      // Clean up particle
      particle.className = "explosion-particle";
      particle.style.cssText = "";

      // Remove from DOM if attached
      if (particle.parentNode) {
        particle.parentNode.removeChild(particle);
      }

      // Return to available pool
      if (!this._available.includes(particle)) {
        this._available.push(particle);
      }
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
     * @param {HTMLDivElement} particle - Particle to release
     * @param {number} [delay=600] - Delay in ms
     */
    scheduleRelease(particle, delay = 600) {
      setTimeout(() => {
        this.release(particle);
      }, delay);
    }

    /**
     * Schedule release of multiple particles
     * @param {HTMLDivElement[]} particles - Particles to release
     * @param {number} [delay=600] - Delay in ms
     */
    scheduleReleaseMultiple(particles, delay = 600) {
      setTimeout(() => {
        this.releaseMultiple(particles);
      }, delay);
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
      // Release all particles
      this._pool.forEach((particle) => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
        particle.className = "explosion-particle";
        particle.style.cssText = "";
      });

      // Reset available list
      this._available = [...this._pool];

      console.log("✨ ParticlePool: Reset complete");
    }

    /**
     * Destroy the pool and free all resources
     */
    destroy() {
      this._pool.forEach((particle) => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      });

      this._pool = [];
      this._available = [];
      ParticlePool._instance = null;

      console.log("✨ ParticlePool: Destroyed");
    }
  }

  // Attach to window
  window.ParticlePool = ParticlePool;

  console.log("✅ ParticlePool module loaded");
})();
