const WormConstants = window.WormConstants || {};
const WormBehaviorModules = window.WormBehaviorModules || {};

function assignTarget(behavior, worm) {
  const system = behavior.system;
  const logger = behavior.logger;

  const resolveTargetElement = WormBehaviorModules.resolveTargetElement;
  const stealSymbol = WormBehaviorModules.stealSymbol;

  const symbolsToSearch = worm.isPurple
    ? system.getCachedAllSymbols()
    : system.getCachedRevealedSymbols();

  const targetElement = resolveTargetElement
    ? resolveTargetElement(behavior, worm, symbolsToSearch)
    : null;

  if (!targetElement) {
    logger.debug("🐛", `Worm ${worm.id} has no symbols to target, roaming...`);
    worm.isRushingToTarget = false;
    worm.path = null;
    worm.pathIndex = 0;
    return false;
  }

  worm.targetElement = targetElement;

  const targetRect = targetElement.getBoundingClientRect();
  let targetX = targetRect.left + targetRect.width / 2;
  let targetY = targetRect.top + targetRect.height / 2;

  const distanceToTarget = system.movement.calculateDistance(
    worm.x,
    worm.y,
    targetX,
    targetY,
  );

  const aggression = system.aggressionModel
    ? system.aggressionModel.getAggression(distanceToTarget)
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

  const obstacles = system.obstacleMap
    ? system.obstacleMap.getObstacleRects()
    : [];

  if (aggression.usePathfinding && system.pathfinder) {
    const now = Date.now();
    if (
      !worm.path ||
      now - worm.lastPathUpdate > WormConstants.PATH_RECALC_INTERVAL
    ) {
      const path = system.pathfinder.findPath(
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

    const waypointDistance = system.movement.calculateDistance(
      worm.x,
      worm.y,
      waypoint.x,
      waypoint.y,
    );

    if (
      waypointDistance < WormConstants.DISTANCE_TARGET_RUSH &&
      worm.pathIndex < worm.path.length - 1
    ) {
      worm.pathIndex += 1;
    }
  }

  const distance = system.movement.calculateDistance(
    worm.x,
    worm.y,
    targetX,
    targetY,
  );
  if (
    distance < WormConstants.NEAR_MISS_THRESHOLD &&
    distance >= WormConstants.DISTANCE_STEAL_SYMBOL
  ) {
    system.renderer.triggerNearMissWarning(worm, targetElement, distance);
  }

  if (distance < WormConstants.DISTANCE_STEAL_SYMBOL) {
    system.renderer.clearNearMissWarning();
    if (stealSymbol) {
      stealSymbol(behavior, worm);
    }
    return true;
  }

  const velocity = system.movement.calculateVelocityToTarget(
    worm,
    waypoint.x,
    waypoint.y,
    aggression.speedMultiplier,
  );

  worm.velocityX = velocity.velocityX;
  worm.velocityY = velocity.velocityY;

  if (system.evasion) {
    const avoidance = system.evasion.applyObstacleAvoidance(worm, obstacles);
    worm.velocityX += avoidance.x;
    worm.velocityY += avoidance.y;
  }

  worm.direction = Math.atan2(worm.velocityY, worm.velocityX);
  worm.x += worm.velocityX;
  worm.y += worm.velocityY;

  return true;
}

window.WormBehaviorModules = window.WormBehaviorModules || {};
window.WormBehaviorModules.assignTarget = assignTarget;
