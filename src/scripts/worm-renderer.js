// js/worm-renderer.js - Worm visual rendering and effects module
console.log("🎨 Worm Renderer Loading...");

import * as WormConstants from './worm-constants.js';

class WormRenderer {
  constructor(system) {
    this.system = system;
    this.logger = system.logger || console;
    this._nearMissActive = false;
    this._nearMissWorm = null;
  }

  // ========================================
  // VISUAL EFFECTS
  // ========================================

  triggerNearMissWarning(worm, targetElement, distance) {
    if (this._nearMissActive) return;

    this._nearMissActive = true;
    this._nearMissWorm = worm.id;

    const urgencyLevel = Math.max(0, 1 - distance / WormConstants.NEAR_MISS_THRESHOLD);

    targetElement.classList.add("near-miss-target");
    targetElement.style.setProperty("--urgency", urgencyLevel);

    document.body.classList.add("near-miss-active");

    document.dispatchEvent(
      new CustomEvent("nearMissWarning", {
        detail: {
          wormId: worm.id,
          targetSymbol: worm.targetSymbol,
          distance: distance,
          urgencyLevel: urgencyLevel,
        },
      })
    );

    this.logger.log(
      `⚠️ NEAR MISS! Worm ${worm.id} is ${distance.toFixed(
        0
      )}px from stealing "${worm.targetSymbol}"!`
    );
  }

  clearNearMissWarning() {
    if (!this._nearMissActive) return;

    this._nearMissActive = false;
    this._nearMissWorm = null;

    document.body.classList.remove("near-miss-active");

    const nearMissTargets = document.querySelectorAll(".near-miss-target");
    nearMissTargets.forEach((el) => {
      el.classList.remove("near-miss-target");
    });
  }

  // ========================================
  // EXPLOSION EFFECTS
  // ========================================

  explodeWorm(worm, isRainKill = false, isChainReaction = false) {
    if (!worm) {
      this.logger.warn("⚠️", "explodeWorm called with null worm");
      return;
    }
    if (!worm.element) {
      this.logger.warn(
        "⚠️",
        "explodeWorm called with worm missing element",
        worm.id
      );
      this.system.worms = this.system.worms.filter((w) => w.id !== worm.id);
      return;
    }

    this.logger.log(
      `💥 EXPLODING worm ${worm.id} (${
        isRainKill ? "RAIN KILL" : "direct click"
      }${isChainReaction ? " - CHAIN REACTION" : ""}) and returning symbol "${
        worm.stolenSymbol
      }"!`
    );

    worm.active = false;

    document.dispatchEvent(
      new CustomEvent("wormExploded", {
        detail: {
          wormId: worm.id,
          isRainKill: isRainKill,
          isChainReaction: isChainReaction,
          wasPurple: worm.isPurple || false,
          stolenSymbol: worm.stolenSymbol || null,
        },
      })
    );

    const nearbyWorms = this.system.worms.filter((w) => {
      if (w.id === worm.id || !w.active) return false;
      const distance = this.system.movement.calculateDistance(worm.x, worm.y, w.x, w.y);
      return distance <= WormConstants.EXPLOSION_AOE_RADIUS;
    });

    if (nearbyWorms.length > 0) {
      this.logger.log(
        `💥 CHAIN REACTION! ${nearbyWorms.length} worms caught in blast radius!`
      );
      setTimeout(() => {
        nearbyWorms.forEach((nearbyWorm) => {
          this.explodeWorm(nearbyWorm, false, true);
        });
      }, WormConstants.EXPLOSION_CHAIN_DELAY);
    }

    if (worm.targetElement) {
      worm.targetElement.classList.remove("stolen", "hidden-symbol");
      worm.targetElement.classList.add("revealed-symbol");
      worm.targetElement.style.visibility = "visible";
      delete worm.targetElement.dataset.stolen;

      this.logger.log(`✅ Symbol "${worm.stolenSymbol}" returned to Panel B`);
    }

    worm.element.classList.add("worm-exploding");

    this.createExplosionParticles(worm.x, worm.y);
    this.createExplosionFlash();
    this.createCrack(worm.x, worm.y);
    this.createSlimeSplat(worm.x, worm.y);

    if (worm.hasPowerUp && !isChainReaction) {
      this.system.dropPowerUp(worm.x, worm.y, worm.powerUpType);
    }

    setTimeout(() => {
      this.system.removeWorm(worm);
    }, WormConstants.WORM_REMOVAL_DELAY);
  }

  createExplosionParticles(x, y) {
    for (let i = 0; i < WormConstants.EXPLOSION_PARTICLE_COUNT; i++) {
      const particle = document.createElement("div");
      particle.className = "explosion-particle";

      const angle = (i / WormConstants.EXPLOSION_PARTICLE_COUNT) * Math.PI * 2;
      const distance = 80 + Math.random() * 40;

      particle.style.left = `${x}px`;
      particle.style.top = `${y}px`;
      particle.style.setProperty("--angle-x", Math.cos(angle) * distance);
      particle.style.setProperty("--angle-y", Math.sin(angle) * distance);

      this.system.wormContainer.appendChild(particle);

      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 600);
    }
  }

  createExplosionFlash(color = null) {
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
  }

  createSlimeSplat(x, y) {
    if (window.WormEffectHelpers?.createSlimeSplat) {
      window.WormEffectHelpers.createSlimeSplat({
        x,
        y,
        lifetime:
          this.system.SLIME_SPLAT_DURATION || WormConstants.SLIME_SPLAT_DURATION,
        fadeDuration:
          this.system.SLIME_SPLAT_FADE_DURATION ||
          WormConstants.SLIME_SPLAT_FADE_DURATION,
        container: this.system.crossPanelContainer,
        logger: this.logger,
      });
      return;
    }

    this.logger.warn(
      "⚠️ WormEffectHelpers.createSlimeSplat unavailable; skipping splat creation fallback",
    );
  }

  createCrack(x, y) {
    const crack = document.createElement("div");
    crack.className = "worm-crack";
    crack.style.left = `${x}px`;
    crack.style.top = `${y}px`;

    const panelC = this.system.cachedPanelC || document.getElementById("third-display");
    if (panelC) {
      panelC.appendChild(crack);
      this.logger.log(`💥 Crack created at (${x}, ${y})`);
    }
  }

  // ========================================
  // WORM VISUAL UPDATES
  // ========================================

  updateWormRotation(worm) {
    const rotation = Math.PI; // Flip worm so head faces forward
    worm.element.style.transform = `rotate(${worm.direction + rotation}rad)`;
  }

  applyWormPosition(worm) {
    worm.element.style.left = `${worm.x}px`;
    worm.element.style.top = `${worm.y}px`;
  }

  // ========================================
  // CLONING EFFECTS
  // ========================================

  applyCloneBirthEffect(parentWorm, cloneWorm) {
    parentWorm.element.classList.add("worm-multiply");
    cloneWorm.element.classList.add("worm-multiply");

    setTimeout(() => {
      parentWorm.element.classList.remove("worm-multiply");
      cloneWorm.element.classList.remove("worm-multiply");
    }, WormConstants.CLONE_BIRTH_ANIMATION);
  }

  // ========================================
  // PULL-IN EFFECTS
  // ========================================

  applyPullInEffect(worm) {
    const carriedSymbol = worm.element.querySelector(".carried-symbol");
    if (carriedSymbol) {
      carriedSymbol.classList.add("pulling-in");
      worm.pullingIn = true;
    }
  }
}

if (typeof window !== "undefined") {
  window.WormRenderer = WormRenderer;
}

export default WormRenderer;
