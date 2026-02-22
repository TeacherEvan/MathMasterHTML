// src/scripts/worm-system.effects.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for effects helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  proto.explodeWorm = function(
    worm,
    isRainKill = false,
    isChainReaction = false,
  ) {
    // ERROR HANDLING: Validate worm parameter
    if (!worm) {
      Logger.warn("⚠️", "explodeWorm called with null worm");
      return;
    }
    if (!worm.element) {
      Logger.warn(
        "⚠️",
        "explodeWorm called with worm missing element",
        worm.id,
      );
      // Still try to clean up worm from array
      this.worms = this.worms.filter((w) => w.id !== worm.id);
      return;
    }

    console.log(
      `💥 EXPLODING worm ${worm.id} (${
        isRainKill ? "RAIN KILL" : "direct click"
      }${isChainReaction ? " - CHAIN REACTION" : ""}) and returning symbol "${
        worm.stolenSymbol
      }"!`,
    );

    // FIX: Mark worm inactive IMMEDIATELY to stop movement during explosion animation
    worm.active = false;

    // ACHIEVEMENT SYSTEM: Dispatch worm explosion event
    document.dispatchEvent(
      new CustomEvent("wormExploded", {
        detail: {
          wormId: worm.id,
          isRainKill: isRainKill,
          isChainReaction: isChainReaction,
          wasPurple: worm.isPurple || false,
          stolenSymbol: worm.stolenSymbol || null,
        },
      }),
    );

    // AOE DAMAGE: Check for nearby worms and trigger chain explosions
    const nearbyWorms = this.worms.filter((w) => {
      if (w.id === worm.id || !w.active) return false;
      const distance = calculateDistance(worm.x, worm.y, w.x, w.y);
      return distance <= this.EXPLOSION_AOE_RADIUS;
    });

    if (nearbyWorms.length > 0) {
      console.log(
        `💥 CHAIN REACTION! ${nearbyWorms.length} worms caught in blast radius!`,
      );
      // Delay chain explosions slightly for visual effect
      setTimeout(() => {
        nearbyWorms.forEach((nearbyWorm) => {
          this.explodeWorm(nearbyWorm, false, true); // Chain explosion!
        });
      }, this.EXPLOSION_CHAIN_DELAY);
    }

    // Return stolen symbol to its original position
    if (worm.targetElement) {
      worm.targetElement.classList.remove("stolen", "hidden-symbol");
      worm.targetElement.classList.add("revealed-symbol");
      worm.targetElement.style.visibility = "visible";
      delete worm.targetElement.dataset.stolen;

      console.log(`✅ Symbol "${worm.stolenSymbol}" returned to Panel B`);
    }

    // DRAMATIC EXPLOSION EFFECT
    worm.element.classList.add("worm-exploding");

    // Create explosion particles
    this.createExplosionParticles(worm.x, worm.y);

    // Flash the screen
    this.createExplosionFlash();

    // Create persistent crack at worm's location
    this.createCrack(worm.x, worm.y);

    // Create slime splat that lasts 15 seconds
    this.createSlimeSplat(worm.x, worm.y);

    // Drop power-up if this worm has one (and not killed by chain reaction to avoid spam)
    if (worm.hasPowerUp && !isChainReaction) {
      this.dropPowerUp(worm.x, worm.y, worm.powerUpType);
    }

    setTimeout(() => {
      this.removeWorm(worm);
    }, this.WORM_REMOVAL_DELAY);
  };

  proto.createExplosionParticles = function(x, y) {
    // Create particle fragments flying outward
    for (let i = 0; i < this.EXPLOSION_PARTICLE_COUNT; i++) {
      const particle = document.createElement("div");
      particle.className = "explosion-particle";

      const angle = (i / this.EXPLOSION_PARTICLE_COUNT) * Math.PI * 2;
      const _speed = 100 + Math.random() * 100; // Reserved for particle speed animation
      const distance = 80 + Math.random() * 40;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty(
        "--angle-x",
        String(Math.cos(angle) * distance),
      );
      particle.style.setProperty(
        "--angle-y",
        String(Math.sin(angle) * distance),
      );

      this.wormContainer.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 600);
    }
  };

  proto.createExplosionFlash = function(color = null) {
    const flash = document.createElement("div");
    flash.className = "explosion-flash";
    if (color) {
      flash.style.background = `radial-gradient(circle, ${color}66, transparent)`;
    }
    document.body.appendChild(flash);

    setTimeout(() => {
      if (flash.parentNode) {
        flash.parentNode.removeChild(flash);
      }
    }, 200);
  };

  /**
   * Trigger near-miss warning when worm is close to stealing
   * Creates urgency and excitement for player
   * @private
   */
  proto._triggerNearMissWarning = function(worm, targetElement, distance) {
    // Only trigger if not already in near-miss state
    if (this._nearMissActive) return;

    this._nearMissActive = true;
    this._nearMissWorm = worm.id;

    // Calculate urgency level (closer = more urgent)
    const urgencyLevel = Math.max(0, 1 - distance / 80);

    // Dispatch event for other systems to react
    document.dispatchEvent(
      new CustomEvent("nearMissWarning", {
        detail: {
          wormId: worm.id,
          targetSymbol: worm.targetSymbol,
          targetElement: targetElement || null,
          distance: distance,
          urgencyLevel: urgencyLevel,
        },
      }),
    );

    console.log(
      `⚠️ NEAR MISS! Worm ${worm.id} is ${distance.toFixed(
        0,
      )}px from stealing "${worm.targetSymbol}"!`,
    );
  };

  /**
   * Clear near-miss warning state
   * @private
   */
  proto._clearNearMissWarning = function() {
    if (!this._nearMissActive) return;

    this._nearMissActive = false;
    this._nearMissWorm = null;

    document.dispatchEvent(
      new CustomEvent("nearMissCleared", {
        detail: {},
      }),
    );
  };

  proto.createSlimeSplat = function(x, y) {
    const splat = document.createElement("div");
    splat.className = "slime-splat";
    splat.textContent = "🫟";
    splat.style.left = `${x}px`;
    splat.style.top = `${y}px`;
    splat.style.position = "fixed"; // Use fixed positioning to place at exact coordinates
    splat.style.zIndex = "10002";

    // Random rotation for variation
    splat.style.transform = `translate(-50%, -50%) rotate(${Math.random() *
      360}deg)`;

    // FIX: Append to cross-panel container so splat appears at worm's actual death location
    this.crossPanelContainer.appendChild(splat);

    console.log(`🟢 Slime splat created at (${x}, ${y})`);

    // Fade out and remove after 15 seconds
    setTimeout(() => {
      splat.classList.add("slime-fading");
    }, 14000); // Start fade at 14s

    setTimeout(() => {
      if (splat.parentNode) {
        splat.parentNode.removeChild(splat);
      }
    }, 15000); // Remove at 15s
  };

  proto.createCrack = function(x, y) {
    const crack = document.createElement("div");
    crack.className = "worm-crack";
    crack.style.left = `${x}px`;
    crack.style.top = `${y}px`;

    // Append to panel C (third display)
    // PERFORMANCE: Use cached element
    const panelC =
      this.cachedPanelC || document.getElementById("third-display");
    if (panelC) {
      panelC.appendChild(crack);
      console.log(`💥 Crack created at (${x}, ${y})`);
    }
  };

  proto.cleanupCracks = function() {
    // PERFORMANCE: Use cached element
    const panelC =
      this.cachedPanelC || document.getElementById("third-display");
    if (panelC) {
      const cracks = panelC.querySelectorAll(".worm-crack");
      cracks.forEach((crack) => crack.remove());
      console.log(`🧹 Cleaned up ${cracks.length} crack(s)`);
    }
  };
})();
