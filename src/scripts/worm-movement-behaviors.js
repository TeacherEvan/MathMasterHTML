// js/worm-movement-behaviors.js - Worm behavior handlers
console.log("🐛 Worm movement behaviors loading...");

(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for movement behaviors");
    return;
  }

  const proto = window.WormSystem.prototype;

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

  console.log("✅ Worm movement behaviors loaded");
})();
