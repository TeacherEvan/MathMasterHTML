// src/scripts/worm-system.movement.js - Worm animation loop
// Movement helper methods are loaded as static scripts (worm-movement-core/behaviors/navigation.js)
// before this file in game.html.
console.log("🐛 Worm movement animate loading...");

(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for animate");
    return;
  }

  const proto = window.WormSystem.prototype;

  const TWO_PI = Math.PI * 2;

  /**
   * Main animation loop - moves all active worms each frame.
   * Calls requestAnimationFrame to schedule the next tick, then iterates
   * over every worm and delegates to the appropriate behaviour handler.
   */
  proto.animate = function() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const now = Date.now();

    // Iterate backwards so splice-removal inside handlers doesn't skip entries
    for (let i = this.worms.length - 1; i >= 0; i--) {
      const worm = this.worms[i];
      if (!worm || !worm.active) continue;

      // Advance crawl phase each frame for the inchworm animation
      worm.crawlPhase =
        (worm.crawlPhase + this.CRAWL_PHASE_INCREMENT) % TWO_PI;

      // Transition from roaming to rushing once the roam timer expires
      if (
        !worm.hasStolen &&
        !worm.isRushingToTarget &&
        now >= worm.roamingEndTime
      ) {
        worm.isRushingToTarget = true;
      }

      // Priority-ordered behaviour chain – first handler that returns true wins
      this._updateWormRushingToDevil(worm) ||
        this._updateWormEvadingCursor(worm, viewportWidth, viewportHeight) ||
        this._updateWormEscapeBurst(worm, viewportWidth, viewportHeight) ||
        this._updateWormReturningToConsole(worm) ||
        this._updateWormCarryingSymbol(worm) ||
        this._updateWormRushingToTarget(worm) ||
        this._updateWormRoaming(worm, viewportWidth, viewportHeight);

      // Apply updated position to DOM (skip if worm was removed during this tick)
      if (worm.active && worm.element && worm.element.parentNode) {
        this._applyWormPosition(worm);
      }
    }
  };

  console.log("✅ Worm animate method registered");
})();
