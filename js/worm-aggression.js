// js/worm-aggression.js - Aggression model for worm pursuit
console.log("🧠 Worm Aggression Model Loading...");

class WormAggressionModel {
  constructor(config = {}) {
    this.minDistance = config.minDistance ?? 40;
    this.maxDistance = config.maxDistance ?? 420;
    this.maxSpeedBoost = config.maxSpeedBoost ?? 1.6;
    this.pathfindingDistance = config.pathfindingDistance ?? 600;
    this.interceptDistance = config.interceptDistance ?? 220;
  }

  getAggression(distance) {
    const safeDistance = Math.max(0, distance);
    const normalized = Math.max(
      0,
      Math.min(
        1,
        1 -
          (safeDistance - this.minDistance) /
            (this.maxDistance - this.minDistance),
      ),
    );

    return {
      level: normalized,
      speedMultiplier: 1 + normalized * this.maxSpeedBoost,
      usePathfinding: safeDistance <= this.pathfindingDistance,
      useIntercept: safeDistance <= this.interceptDistance,
    };
  }
}

if (typeof window !== "undefined") {
  window.WormAggressionModel = WormAggressionModel;
}
