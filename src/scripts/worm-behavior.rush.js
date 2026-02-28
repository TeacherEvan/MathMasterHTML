const WormConstants = window.WormConstants || {};
const WormBehaviorModules = window.WormBehaviorModules || {};

function updateWormRushingToTarget(behavior, worm) {
  const system = behavior.system;
  const logger = behavior.logger;

  const stealSymbol = WormBehaviorModules.stealSymbol;

  if (!worm.isRushingToTarget || worm.hasStolen) {
    return false;
  }

  const symbolsToSearch = worm.isPurple
    ? system.getCachedAllSymbols()
    : system.getCachedRevealedSymbols();

  let targetElement = null;

  if (worm.targetSymbol) {
    const normalizedTarget = system.utils.normalizeSymbol(worm.targetSymbol);
    targetElement = Array.from(symbolsToSearch).find((el) => {
      const elSymbol = system.utils.normalizeSymbol(el.textContent);
      return elSymbol === normalizedTarget && !el.dataset.stolen;
    });
  }

  if (!targetElement && worm.isRushingToTarget) {
    const allSymbols = Array.from(symbolsToSearch).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol"),
    );

    let availableSymbols;
    if (worm.isPurple && worm.canStealBlue) {
      const redSymbols = allSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );
      if (redSymbols.length > 0) {
        availableSymbols = redSymbols;
        logger.log(
          `🟣 Purple worm ${worm.id} found ${redSymbols.length} red (hidden) symbols to target`,
        );
      } else {
        availableSymbols = allSymbols.filter((el) =>
          el.classList.contains("revealed-symbol"),
        );
        logger.log(
          `🟣 Purple worm ${worm.id} no red symbols, targeting ${availableSymbols.length} blue symbols`,
        );
      }
    } else {
      availableSymbols = allSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
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
          Math.pow(worm.x - symbolX, 2) + Math.pow(worm.y - symbolY, 2),
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSymbol = el;
        }
      });

      if (nearestSymbol) {
        worm.targetSymbol = nearestSymbol.textContent;
        targetElement = nearestSymbol;
        logger.log(
          `🟣 Purple worm ${worm.id} found nearest symbol: "${
            worm.targetSymbol
          }" (${nearestDistance.toFixed(0)}px away)`,
        );
      }
    }
  }

  if (targetElement) {
    const targetRect = targetElement.getBoundingClientRect();
    const targetX = targetRect.left + targetRect.width / 2;
    const targetY = targetRect.top + targetRect.height / 2;

    const velocity = system.movement.calculateVelocityToTarget(
      worm,
      targetX,
      targetY,
      WormConstants.RUSH_SPEED_MULTIPLIER,
    );

    if (
      velocity.distance < WormConstants.NEAR_MISS_THRESHOLD &&
      velocity.distance >= WormConstants.DISTANCE_STEAL_SYMBOL
    ) {
      system.renderer.triggerNearMissWarning(
        worm,
        targetElement,
        velocity.distance,
      );
    }

    if (velocity.distance < WormConstants.DISTANCE_STEAL_SYMBOL) {
      system.renderer.clearNearMissWarning();
      if (stealSymbol) {
        stealSymbol(behavior, worm);
      }
    } else {
      worm.velocityX = velocity.velocityX;
      worm.velocityY = velocity.velocityY;
      worm.x += worm.velocityX;
      worm.y += worm.velocityY;
    }
  } else {
    logger.log(`🐛 Worm ${worm.id} lost target, resuming roaming`);
    worm.isRushingToTarget = false;
    worm.roamingEndTime = Date.now() + WormConstants.ROAM_RESUME_DURATION;
    return false;
  }

  return true;
}

window.WormBehaviorModules = window.WormBehaviorModules || {};
window.WormBehaviorModules.updateWormRushingToTarget = updateWormRushingToTarget;
