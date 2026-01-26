// src/scripts/worm-system.movement.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for movement helpers");
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
   * @private (placeholder for future refactoring)
   */
  proto._hasReachedTarget = function(worm, targetX, targetY, threshold) {
    return this.movement.hasReachedTarget(worm, targetX, targetY, threshold);
  };

  /**
   * Update worm position (delegates to movement module)
   * @private (placeholder - kept for compatibility)
   * @deprecated Use movement module instead
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

  /**
   * Handle worm rushing to devil power-up
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  proto._updateWormRushingToDevil = function(worm) {
    if (
      !worm.isRushingToDevil ||
      worm.devilX === undefined ||
      worm.devilY === undefined
    ) {
      return false;
    }

    const distance = calculateDistance(
      worm.x,
      worm.y,
      worm.devilX,
      worm.devilY,
    );
    const dx = worm.devilX - worm.x;
    const dy = worm.devilY - worm.y;

    if (distance > 5) {
      // Rush toward devil at double speed
      const rushSpeed = worm.baseSpeed * 2;
      worm.velocityX = (dx / distance) * rushSpeed;
      worm.velocityY = (dy / distance) * rushSpeed;

      worm.x += worm.velocityX;
      worm.y += worm.velocityY;

      // Rotate towards devil
      worm.element.style.transform = `rotate(${Math.atan2(dy, dx) +
        Math.PI}rad)`;
    }

    // Apply position
    this._applyWormPosition(worm);
    return true; // Handled, skip other behaviors
  };

  /**
   * Handle cursor evasion (highest priority during targeting)
   * @private
   */
  proto._updateWormEvadingCursor = function(
    worm,
    viewportWidth,
    viewportHeight,
  ) {
    if (worm.hasStolen || !this.evasion) return false;
    if (!this.evasion.isCursorThreat(worm, this.cursorState)) return false;

    const escape = this.evasion.getCursorEscapeVector(
      worm,
      this.cursorState,
      worm.baseSpeed,
    );

    worm.velocityX = escape.velocityX;
    worm.velocityY = escape.velocityY;
    worm.direction = escape.direction;
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    this._constrainToBounds(worm, {
      width: viewportWidth,
      height: viewportHeight,
    });
    this._updateWormRotation(worm);

    return true;
  };

  /**
   * Apply escape burst after first click (double-click kill)
   * @private
   */
  proto._updateWormEscapeBurst = function(worm, viewportWidth, viewportHeight) {
    const now = Date.now();
    if (!worm.escapeUntil || now > worm.escapeUntil || !worm.escapeVector) {
      return false;
    }

    const speed = worm.baseSpeed * this.CURSOR_ESCAPE_MULTIPLIER;
    worm.velocityX = worm.escapeVector.x * speed;
    worm.velocityY = worm.escapeVector.y * speed;
    worm.direction = Math.atan2(worm.velocityY, worm.velocityX);
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    this._constrainToBounds(worm, {
      width: viewportWidth,
      height: viewportHeight,
    });
    this._updateWormRotation(worm);

    return true;
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

    const symbolsToSearch = worm.isPurple
      ? this.getCachedAllSymbols()
      : this.getCachedRevealedSymbols();

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
        worm.pathIndex = 0;
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
   * Handle worm returning to console slot with stolen symbol
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  proto._updateWormReturningToConsole = function(worm) {
    if (!worm.hasStolen || !worm.fromConsole || !worm.consoleSlotElement) {
      return false;
    }

    const slotRect = worm.consoleSlotElement.getBoundingClientRect();
    const targetX = slotRect.left + slotRect.width / 2;
    const targetY = slotRect.top + slotRect.height / 2;

    const velocity = this._calculateVelocityToTarget(
      worm,
      targetX,
      targetY,
      1.0,
    );

    // Trigger pull-in animation when getting close to console
    if (velocity.distance < 50 && !worm.pullingIn) {
      const carriedSymbol = worm.element.querySelector(".carried-symbol");
      if (carriedSymbol) {
        carriedSymbol.classList.add("pulling-in");
        worm.pullingIn = true;
      }
    }

    if (velocity.distance < this.DISTANCE_CONSOLE_ARRIVAL) {
      // Reached console hole - escape with symbol!
      console.log(
        `🐛 Worm ${worm.id} escaped to console with symbol "${worm.stolenSymbol}"!`,
      );
      console.log(
        `💀 Symbol "${worm.stolenSymbol}" stays HIDDEN until user clicks it again in Panel C`,
      );
      this.removeWorm(worm);
      return true; // Handled and removed
    }

    // Move towards console with LSD colors!
    worm.direction = velocity.direction;
    worm.velocityX = velocity.velocityX;
    worm.velocityY = velocity.velocityY;
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;
    this._updateWormRotation(worm);

    return true; // Handled
  };

  /**
   * Handle worm carrying symbol (non-console worms or purple worms)
   * @private
   * @returns {boolean} True if this state handled the worm update
   */
  proto._updateWormCarryingSymbol = function(worm) {
    if (!worm.hasStolen || worm.fromConsole) {
      return false;
    }

    // PURPLE WORM CONSOLE EXIT: If this is a purple worm, exit through console
    if (worm.isPurple && worm.shouldExitToConsole) {
      // Find empty console slot if not already targeting one
      if (!worm.exitingToConsole) {
        const emptySlotData = this.findEmptyConsoleSlot();
        if (emptySlotData) {
          worm.exitingToConsole = true;
          worm.targetConsoleSlot = emptySlotData.element;
          worm.targetConsoleSlotIndex = emptySlotData.index;
          console.log(
            `🟣 Purple worm ${worm.id} heading to exit at console slot ${emptySlotData.index}`,
          );
        }
      }

      // If targeting a console slot, move toward it
      if (worm.exitingToConsole && worm.targetConsoleSlot) {
        const slotRect = worm.targetConsoleSlot.getBoundingClientRect();
        const targetX = slotRect.left + slotRect.width / 2;
        const targetY = slotRect.top + slotRect.height / 2;

        const velocity = this._calculateVelocityToTarget(
          worm,
          targetX,
          targetY,
          1.0,
        );

        // Trigger pull-in animation when getting close to console
        if (velocity.distance < 50 && !worm.pullingIn) {
          const carriedSymbol = worm.element.querySelector(".carried-symbol");
          if (carriedSymbol) {
            carriedSymbol.classList.add("pulling-in");
            worm.pullingIn = true;
          }
        }

        if (velocity.distance < this.DISTANCE_CONSOLE_ARRIVAL) {
          // Reached console exit - purple worm escapes!
          console.log(`🟣 Purple worm ${worm.id} exited through console!`);
          this.removeWorm(worm);
          return true; // Handled and removed
        }

        // Move towards console exit
        worm.direction = velocity.direction;
        worm.velocityX = velocity.velocityX;
        worm.velocityY = velocity.velocityY;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
        this._updateWormRotation(worm);
      } else {
        // No console slot found yet, continue roaming
        this._applyCrawlMovement(worm);
      }
    } else {
      // Normal worm carrying symbol - continue roaming
      this._applyCrawlMovement(worm);
    }

    this._updateWormRotation(worm);
    return true; // Handled
  };

  proto.animate = function() {
    if (this.worms.length === 0) {
      this.animationFrameId = null;
      return;
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    this.worms.forEach((worm) => {
      if (!worm.active) return;

      // Update crawl phase for animation
      worm.crawlPhase =
        (worm.crawlPhase + this.CRAWL_PHASE_INCREMENT) % (Math.PI * 2);

      // Always keep worms targeting when symbols exist
      if (!worm.hasStolen && !worm.isRushingToTarget) {
        const symbolsToSearch = worm.isPurple
          ? this.getCachedAllSymbols()
          : this.getCachedRevealedSymbols();
        const targetElement = this._resolveTargetElement(worm, symbolsToSearch);
        if (targetElement) {
          worm.isRushingToTarget = true;
          worm.targetElement = targetElement;
        }
      }

      // REFACTORED: Use state handlers for clean separation of concerns
      // Priority order: Devil > Escape Burst > Cursor Evasion > Target Rush > Console Return > Carrying > Roaming
      if (this._updateWormRushingToDevil(worm)) {
        return; // Devil rush handled, skip other behaviors
      }

      if (this._updateWormEscapeBurst(worm, viewportWidth, viewportHeight)) {
        return;
      }

      if (this._updateWormEvadingCursor(worm, viewportWidth, viewportHeight)) {
        return;
      }

      if (this._updateWormRushingToTarget(worm)) {
        // Target rush handled (or fell through to roaming)
      } else if (this._updateWormReturningToConsole(worm)) {
        // Console return handled (worm may be removed)
        return;
      } else if (this._updateWormCarryingSymbol(worm)) {
        // Carrying symbol handled (worm may be removed)
        if (!worm.active) return;
      } else {
        // Default to roaming behavior
        this._updateWormRoaming(worm, viewportWidth, viewportHeight);
      }

      // Apply position directly (no CSS transitions for smooth crawling)
      this._applyWormPosition(worm);
    });

    // Continue animation if there are active worms
    if (this.worms.some((w) => w.active)) {
      this.animationFrameId = requestAnimationFrame(() => this.animate());
    } else {
      this.animationFrameId = null;
    }
  };
})();
