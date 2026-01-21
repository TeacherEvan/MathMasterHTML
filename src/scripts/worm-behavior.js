// js/worm-behavior.js - Worm behavior logic module
console.log("🧠 Worm Behavior Loading...");

import * as WormConstants from './worm-constants.js';

class WormBehavior {
  constructor(system) {
    this.system = system;
    this.logger = system.logger || console;
  }

  // ========================================
  // TARGETING & STEALING
  // ========================================

  /**
   * Find and assign target for a worm
   */
  assignTarget(worm) {
    const symbolsToSearch = worm.isPurple
      ? this.system.getCachedAllSymbols()
      : this.system.getCachedRevealedSymbols();

    const targetElement = this._resolveTargetElement(worm, symbolsToSearch);

    if (!targetElement) {
      this.logger.debug("🐛", `Worm ${worm.id} has no symbols to target, roaming...`);
      worm.isRushingToTarget = false;
      worm.path = null;
      worm.pathIndex = 0;
      return false;
    }

    worm.targetElement = targetElement;

    const targetRect = targetElement.getBoundingClientRect();
    let targetX = targetRect.left + targetRect.width / 2;
    let targetY = targetRect.top + targetRect.height / 2;

    const distanceToTarget = this.system.movement.calculateDistance(
      worm.x,
      worm.y,
      targetX,
      targetY
    );

    const aggression = this.system.aggressionModel
      ? this.system.aggressionModel.getAggression(distanceToTarget)
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

    const obstacles = this.system.obstacleMap
      ? this.system.obstacleMap.getObstacleRects()
      : [];

    if (aggression.usePathfinding && this.system.pathfinder) {
      const now = Date.now();
      if (!worm.path || now - worm.lastPathUpdate > WormConstants.PATH_RECALC_INTERVAL) {
        const path = this.system.pathfinder.findPath(
          { x: worm.x, y: worm.y },
          { x: targetX, y: targetY },
          { width: window.innerWidth, height: window.innerHeight },
          obstacles
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

      const waypointDistance = this.system.movement.calculateDistance(
        worm.x,
        worm.y,
        waypoint.x,
        waypoint.y
      );

      if (
        waypointDistance < WormConstants.DISTANCE_TARGET_RUSH &&
        worm.pathIndex < worm.path.length - 1
      ) {
        worm.pathIndex += 1;
      }
    }

    // NEAR-MISS EXCITEMENT
    const distance = this.system.movement.calculateDistance(
      worm.x,
      worm.y,
      targetX,
      targetY
    );
    if (
      distance < WormConstants.NEAR_MISS_THRESHOLD &&
      distance >= WormConstants.DISTANCE_STEAL_SYMBOL
    ) {
      this.system.renderer.triggerNearMissWarning(worm, targetElement, distance);
    }

    if (distance < WormConstants.DISTANCE_STEAL_SYMBOL) {
      this.system.renderer.clearNearMissWarning();
      this.stealSymbol(worm);
      return true;
    }

    const velocity = this.system.movement.calculateVelocityToTarget(
      worm,
      waypoint.x,
      waypoint.y,
      aggression.speedMultiplier
    );

    worm.velocityX = velocity.velocityX;
    worm.velocityY = velocity.velocityY;

    if (this.system.evasion) {
      const avoidance = this.system.evasion.applyObstacleAvoidance(worm, obstacles);
      worm.velocityX += avoidance.x;
      worm.velocityY += avoidance.y;
    }

    worm.direction = Math.atan2(worm.velocityY, worm.velocityX);
    worm.x += worm.velocityX;
    worm.y += worm.velocityY;

    return true;
  }

  stealSymbol(worm) {
    if (!worm || !worm.element) {
      this.logger.warn("⚠️", "stealSymbol called with invalid worm object");
      return;
    }

    const panelBRect = this.system.getCachedContainerRect();
    const wormInPanelB =
      worm.x >= panelBRect.left &&
      worm.x <= panelBRect.right &&
      worm.y >= panelBRect.top &&
      worm.y <= panelBRect.bottom;

    if (!wormInPanelB) {
      this.logger.log(`🐛 Worm ${worm.id} outside Panel B - cannot steal symbols`);
      worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
      worm.isRushingToTarget = false;
      return;
    }

    const symbolsSource = worm.isPurple
      ? this.system.getCachedAllSymbols()
      : this.system.getCachedRevealedSymbols();

    const allAvailableSymbols = Array.from(symbolsSource).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol")
    );

    let availableSymbols;
    if (worm.canStealBlue && worm.isPurple) {
      const redSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol")
      );

      if (redSymbols.length > 0) {
        availableSymbols = redSymbols;
        this.logger.log(
          `🟣 PURPLE WORM - ${redSymbols.length} red symbols available (preferring red)`
        );
      } else {
        const blueSymbols = allAvailableSymbols.filter((el) =>
          el.classList.contains("revealed-symbol")
        );
        availableSymbols = blueSymbols;
        this.logger.log(
          `🟣 PURPLE WORM - NO red symbols! Stealing blue symbols (${blueSymbols.length} available)`
        );
      }
    } else {
      availableSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol")
      );
      this.logger.log(
        `🐛 Normal worm - ${availableSymbols.length} red symbols available`
      );
    }

    if (availableSymbols.length === 0) {
      this.logger.log("🐛 No symbols available to steal");
      worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
      worm.isRushingToTarget = false;
      return;
    }

    let targetSymbol = null;
    if (worm.targetSymbol) {
      const normalizedTarget = this.system.utils.normalizeSymbol(worm.targetSymbol);
      targetSymbol = availableSymbols.find((el) => {
        const elSymbol = this.system.utils.normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget;
      });
    }

    if (!targetSymbol) {
      targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
    }

    if (!targetSymbol || !targetSymbol.textContent) {
      this.logger.warn("⚠️", `Worm ${worm.id} could not find valid target symbol`);
      worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
      worm.isRushingToTarget = false;
      return;
    }

    const symbolValue = targetSymbol.textContent;
    const wasBlueSymbol = targetSymbol.classList.contains("revealed-symbol");

    this.logger.log(
      `🐛 Worm ${worm.id} stealing ${
        wasBlueSymbol ? "BLUE" : "RED"
      } symbol: "${symbolValue}"`
    );

    targetSymbol.dataset.stolen = "true";
    targetSymbol.classList.add("stolen");
    targetSymbol.classList.remove("revealed-symbol");
    targetSymbol.classList.add("hidden-symbol");
    targetSymbol.style.visibility = "hidden";

    worm.stolenSymbol = symbolValue;
    worm.targetElement = targetSymbol;
    worm.hasStolen = true;
    worm.isRushingToTarget = false;
    worm.wasBlueSymbol = wasBlueSymbol;
    worm.path = null;
    worm.pathIndex = 0;
    worm.lastPathUpdate = 0;

    this.logger.log(
      `🌈 Worm ${worm.id} stole ${
        wasBlueSymbol ? "blue" : "red"
      } symbol - ACTIVATING LSD FLICKER with ${WormConstants.FLICKER_SPEED_BOOST * 100}% SPEED BOOST!`
    );
    worm.isFlickering = true;
    worm.element.classList.add("flickering");
    worm.currentSpeed = worm.baseSpeed * WormConstants.FLICKER_SPEED_BOOST;

    const stolenSymbolDiv = document.createElement("div");
    stolenSymbolDiv.className = "carried-symbol";
    stolenSymbolDiv.textContent = symbolValue;
    if (wasBlueSymbol) {
      stolenSymbolDiv.style.color = "#00ffff";
    }
    worm.element.appendChild(stolenSymbolDiv);

    this.logger.log(
      `🐛 Worm now carrying "${symbolValue}" and heading back to console hole!`
    );

    this.system.checkGameOverCondition();
  }

  // ========================================
  // STATE HANDLERS
  // ========================================

  updateWormRushingToTarget(worm) {
    if (!worm.isRushingToTarget || worm.hasStolen) {
      return false;
    }

    const symbolsToSearch = worm.isPurple
      ? this.system.getCachedAllSymbols()
      : this.system.getCachedRevealedSymbols();

    let targetElement = null;

    if (worm.targetSymbol) {
      const normalizedTarget = this.system.utils.normalizeSymbol(worm.targetSymbol);
      targetElement = Array.from(symbolsToSearch).find((el) => {
        const elSymbol = this.system.utils.normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget && !el.dataset.stolen;
      });
    }

    if (!targetElement && worm.isRushingToTarget) {
      const allSymbols = Array.from(symbolsToSearch).filter(
        (el) =>
          !el.dataset.stolen &&
          !el.classList.contains("space-symbol") &&
          !el.classList.contains("completed-row-symbol")
      );

      let availableSymbols;
      if (worm.isPurple && worm.canStealBlue) {
        const redSymbols = allSymbols.filter((el) =>
          el.classList.contains("hidden-symbol")
        );
        if (redSymbols.length > 0) {
          availableSymbols = redSymbols;
          this.logger.log(
            `🟣 Purple worm ${worm.id} found ${redSymbols.length} red (hidden) symbols to target`
          );
        } else {
          availableSymbols = allSymbols.filter((el) =>
            el.classList.contains("revealed-symbol")
          );
          this.logger.log(
            `🟣 Purple worm ${worm.id} no red symbols, targeting ${availableSymbols.length} blue symbols`
          );
        }
      } else {
        availableSymbols = allSymbols.filter((el) =>
          el.classList.contains("hidden-symbol")
        );
      }

      if (availableSymbols.length > 0) {
        let nearestSymbol = null;
        let nearestDistance = Infinity;

        availableSymbols.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const symbolX = rect.left + rect.width / 2;
          const symbolY = rect.top + rect.height / 2;
          const distance = Math.sqrt(
            Math.pow(worm.x - symbolX, 2) + Math.pow(worm.y - symbolY, 2)
          );

          if (distance < nearestDistance) {
            nearestDistance = distance;
            nearestSymbol = el;
          }
        });

        if (nearestSymbol) {
          worm.targetSymbol = nearestSymbol.textContent;
          targetElement = nearestSymbol;
          this.logger.log(
            `🟣 Purple worm ${worm.id} found nearest symbol: "${
              worm.targetSymbol
            }" (${nearestDistance.toFixed(0)}px away)`
          );
        }
      }
    }

    if (targetElement) {
      const targetRect = targetElement.getBoundingClientRect();
      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;

      const velocity = this.system.movement.calculateVelocityToTarget(
        worm,
        targetX,
        targetY,
        WormConstants.RUSH_SPEED_MULTIPLIER
      );

      if (velocity.distance < WormConstants.NEAR_MISS_THRESHOLD &&
          velocity.distance >= WormConstants.DISTANCE_STEAL_SYMBOL) {
        this.system.renderer.triggerNearMissWarning(worm, targetElement, velocity.distance);
      }

      if (velocity.distance < WormConstants.DISTANCE_STEAL_SYMBOL) {
        this.system.renderer.clearNearMissWarning();
        this.stealSymbol(worm);
      } else {
        worm.velocityX = velocity.velocityX;
        worm.velocityY = velocity.velocityY;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
      }
    } else {
      this.logger.log(`🐛 Worm ${worm.id} lost target, resuming roaming`);
      worm.isRushingToTarget = false;
      worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
      return false;
    }

    return true;
  }

  // Add other state handlers similarly...

  // ========================================
  // PRIVATE HELPERS
  // ========================================

  _resolveTargetElement(worm, symbolsSource) {
    const availableSymbols = this._getAvailableSymbolsForWorm(worm, symbolsSource);

    if (availableSymbols.length === 0) {
      return null;
    }

    let targetElement = null;

    if (worm.targetSymbol) {
      const normalizedTarget = this.system.utils.normalizeSymbol(worm.targetSymbol);
      targetElement = availableSymbols.find((el) => {
        const elSymbol = this.system.utils.normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget;
      });
    }

    if (!targetElement) {
      let nearestSymbol = null;
      let nearestDistance = Infinity;

      availableSymbols.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const symbolX = rect.left + rect.width / 2;
        const symbolY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(worm.x - symbolX, 2) + Math.pow(worm.y - symbolY, 2)
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSymbol = el;
        }
      });

      if (nearestSymbol) {
        targetElement = nearestSymbol;
        worm.targetSymbol = nearestSymbol.textContent;
      }
    }

    return targetElement;
  }

  _getAvailableSymbolsForWorm(worm, symbolsSource) {
    const allAvailableSymbols = Array.from(symbolsSource).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol")
    );

    if (worm.isPurple && worm.canStealBlue) {
      const redSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol")
      );
      if (redSymbols.length > 0) return redSymbols;

      return allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol")
      );
    }

    return allAvailableSymbols.filter((el) =>
      el.classList.contains("hidden-symbol")
    );
  }
}

if (typeof window !== "undefined") {
  window.WormBehavior = WormBehavior;
}

export default WormBehavior;