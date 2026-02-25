// js/worm-movement-navigation.js - Worm navigation and targeting logic
console.log("🐛 Worm movement navigation loading...");

(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for movement navigation");
    return;
  }

  const proto = window.WormSystem.prototype;

  /**
   * Handle worm roaming behavior (crawling across panels)
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  proto._updateWormRoaming = function(worm, viewportWidth, viewportHeight) {
    if (worm.hasStolen || worm.isRushingToTarget) {
      return false;
    }

    this._applyCrawlMovement(worm);

    if (this.evasion && this.obstacleMap) {
      const avoidance = this.evasion.applyObstacleAvoidance(
        worm,
        this.obstacleMap.getObstacleRects(),
      );
      worm.x += avoidance.x;
      worm.y += avoidance.y;
    }

    this._constrainToBounds(worm, {
      width: viewportWidth,
      height: viewportHeight,
    });
    this._updateWormRotation(worm);

    return true; // Handled
  };

  /**
   * Handle worm rushing to revealed target symbol
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  proto._updateWormRushingToTarget = function(worm) {
    if (!worm.isRushingToTarget || worm.hasStolen) {
      return false;
    }

    const symbolsToSearch = this.getCachedRevealedSymbols();

    const targetElement = this._resolveTargetElement(worm, symbolsToSearch);

    if (!targetElement) {
      const now = Date.now();
      if (worm.forceRushUntil && now < worm.forceRushUntil) {
        return false;
      }

      console.log(`🐛 Worm ${worm.id} has no symbols to target, roaming...`);
      worm.isRushingToTarget = false;
      worm.path = null;
      worm.pathIndex = 0;
      return false;
    }

    worm.targetElement = targetElement;

    const targetRect = targetElement.getBoundingClientRect();
    let targetX = targetRect.left + targetRect.width / 2;
    let targetY = targetRect.top + targetRect.height / 2;

    const distanceToTarget = this.movement.calculateDistance(
      worm.x,
      worm.y,
      targetX,
      targetY,
    );

    const aggression = this.aggressionModel
      ? this.aggressionModel.getAggression(distanceToTarget)
      : {
          level: 0,
          speedMultiplier: 1,
          usePathfinding: false,
          useIntercept: false,
        };

    worm.aggressionLevel = aggression.level;

    if (aggression.useIntercept) {
      const leadFactor = 0.12;
      targetX += (targetX - worm.x) * leadFactor;
      targetY += (targetY - worm.y) * leadFactor;
    }

    const obstacles = this.obstacleMap
      ? this.obstacleMap.getObstacleRects()
      : [];

    if (aggression.usePathfinding && this.pathfinder) {
      const now = Date.now();
      if (!worm.path || now - worm.lastPathUpdate > this.PATH_RECALC_INTERVAL) {
        const path = this.pathfinder.findPath(
          { x: worm.x, y: worm.y },
          { x: targetX, y: targetY },
          { width: window.innerWidth, height: window.innerHeight },
          obstacles,
        );
        worm.path = path.length > 0 ? path : null;
        // Skip index 0 because pathfinder includes the worm's current cell first.
        worm.pathIndex = path.length > 1 ? 1 : 0;
        worm.lastPathUpdate = now;
      }
    } else {
      worm.path = null;
      worm.pathIndex = 0;
    }

    let waypoint = { x: targetX, y: targetY };
    if (worm.path && worm.path.length > 0) {
      const index = Math.min(worm.pathIndex, worm.path.length - 1);
      waypoint = worm.path[index];

      const waypointDistance = this.movement.calculateDistance(
        worm.x,
        worm.y,
        waypoint.x,
        waypoint.y,
      );

      if (
        waypointDistance < this.DISTANCE_TARGET_RUSH &&
        worm.pathIndex < worm.path.length - 1
      ) {
        worm.pathIndex += 1;
      }
    }

    // NEAR-MISS EXCITEMENT: Trigger warning when worm is close but not stealing yet
    const NEAR_MISS_THRESHOLD = 80; // px
    if (
      distanceToTarget < NEAR_MISS_THRESHOLD &&
      distanceToTarget >= this.DISTANCE_STEAL_SYMBOL
    ) {
      this._triggerNearMissWarning(worm, targetElement, distanceToTarget);
    }

    if (distanceToTarget < this.DISTANCE_STEAL_SYMBOL) {
      // Reached target - steal it on direct contact
      this._clearNearMissWarning();
      this.stealSymbol(worm);
      return true;
    }

    const velocity = this._calculateVelocityToTarget(
      worm,
      waypoint.x,
      waypoint.y,
      aggression.speedMultiplier,
    );

    worm.velocityX = velocity.velocityX;
    worm.velocityY = velocity.velocityY;

    if (this.evasion) {
      const avoidance = this.evasion.applyObstacleAvoidance(worm, obstacles);
      worm.velocityX += avoidance.x;
      worm.velocityY += avoidance.y;
    }

    worm.direction = Math.atan2(worm.velocityY, worm.velocityX);
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    return true; // Handled
  };

  console.log("✅ Worm movement navigation loaded");
})();
