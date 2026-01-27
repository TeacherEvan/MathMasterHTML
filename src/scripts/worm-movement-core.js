// js/worm-movement-core.js - Core movement calculations for worms
console.log("🐛 Worm movement core loading...");

(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for movement core");
    return;
  }

  const proto = window.WormSystem.prototype;

  /**
   * Calculate velocity toward target position (delegates to movement module)
   * @private
   */
  proto._calculateVelocityToTarget = function(
    worm,
    targetX,
    targetY,
    speedMultiplier = 1,
  ) {
    return this.movement.calculateVelocityToTarget(
      worm,
      targetX,
      targetY,
      speedMultiplier,
    );
  };

  /**
   * Apply boundary constraints to worm position (delegates to movement module)
   * @private
   */
  proto._constrainToBounds = function(worm, bounds) {
    this.movement.constrainToBounds(worm, bounds);
  };

  /**
   * Check if worm reached target (delegates to movement module)
   * @private
   */
  proto._hasReachedTarget = function(worm, targetX, targetY, threshold) {
    return this.movement.hasReachedTarget(worm, targetX, targetY, threshold);
  };

  /**
   * Update worm position (delegates to movement module)
   * @private (placeholder for future refactoring)
   */
  proto._updatePosition_old_reference = function(worm) {
    // Old inline implementation - to be replaced with:
    // this.movement.updatePosition(worm);
    const height = window.innerHeight;
    const margin = this.BORDER_MARGIN;
    if (worm.y < this.BORDER_MARGIN) {
      worm.y = this.BORDER_MARGIN;
      worm.direction = -worm.direction;
    }
    if (worm.y > height - margin) {
      worm.y = height - margin;
      worm.direction = -worm.direction;
    }
  };

  /**
   * Update worm rotation to face movement direction
   * @private
   */
  proto._updateWormRotation = function(worm) {
    // Add π (180°) to flip worm so head faces forward
    worm.element.style.transform = `rotate(${worm.direction + Math.PI}rad)`;
  };

  /**
   * Apply crawling movement with inchworm effect
   * @private
   */
  proto._applyCrawlMovement = function(worm) {
    worm.direction += (Math.random() - 0.5) * this.DIRECTION_CHANGE_RATE;
    const crawlOffset = Math.sin(worm.crawlPhase) * this.CRAWL_AMPLITUDE;

    worm.velocityX =
      Math.cos(worm.direction) * (worm.currentSpeed + crawlOffset);
    worm.velocityY =
      Math.sin(worm.direction) * (worm.currentSpeed + crawlOffset);

    worm.x += worm.velocityX;
    worm.y += worm.velocityY;
  };

  /**
   * Apply worm position to DOM element
   * @private
   */
  proto._applyWormPosition = function(worm) {
    worm.element.style.left = `${worm.x}px`;
    worm.element.style.top = `${worm.y}px`;
  };

  console.log("✅ Worm movement core loaded");
})();
