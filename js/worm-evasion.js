// js/worm-evasion.js - Cursor and obstacle avoidance behaviors
console.log("🛡️ Worm Evasion Loading...");

class WormEvasion {
  constructor(config = {}) {
    this.cursorThreatRadius = config.cursorThreatRadius ?? 140;
    this.cursorEscapeRadius = config.cursorEscapeRadius ?? 220;
    this.cursorEscapeMultiplier = config.cursorEscapeMultiplier ?? 2.2;
    this.obstacleAvoidStrength = config.obstacleAvoidStrength ?? 0.9;
    this.obstaclePadding = config.obstaclePadding ?? 12;
  }

  isCursorThreat(worm, cursorState) {
    if (!cursorState || !cursorState.isActive) return false;

    const dx = worm.x - cursorState.x;
    const dy = worm.y - cursorState.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance <= this.cursorThreatRadius;
  }

  getCursorEscapeVector(worm, cursorState, baseSpeed) {
    const dx = worm.x - cursorState.x;
    const dy = worm.y - cursorState.y;
    const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const multiplier =
      distance <= this.cursorEscapeRadius ? this.cursorEscapeMultiplier : 1.0;

    return {
      velocityX: (dx / distance) * baseSpeed * multiplier,
      velocityY: (dy / distance) * baseSpeed * multiplier,
      direction: Math.atan2(dy, dx),
    };
  }

  applyObstacleAvoidance(worm, obstacles) {
    if (!obstacles || obstacles.length === 0) return { x: 0, y: 0 };

    let avoidX = 0;
    let avoidY = 0;

    obstacles.forEach((obstacle) => {
      const closestX = Math.max(
        obstacle.left,
        Math.min(worm.x, obstacle.right),
      );
      const closestY = Math.max(
        obstacle.top,
        Math.min(worm.y, obstacle.bottom),
      );

      const dx = worm.x - closestX;
      const dy = worm.y - closestY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < this.obstaclePadding + 1) {
        avoidX += dx * this.obstacleAvoidStrength;
        avoidY += dy * this.obstacleAvoidStrength;
      } else if (distance < this.obstaclePadding * 3) {
        const falloff =
          (this.obstaclePadding * 3 - distance) / (this.obstaclePadding * 3);
        avoidX += dx * this.obstacleAvoidStrength * falloff;
        avoidY += dy * this.obstacleAvoidStrength * falloff;
      }
    });

    return { x: avoidX, y: avoidY };
  }
}

if (typeof window !== "undefined") {
  window.WormEvasion = WormEvasion;
}
