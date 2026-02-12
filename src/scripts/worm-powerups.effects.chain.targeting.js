(function() {
  window.WormPowerUpEffects = window.WormPowerUpEffects || {};

  window.WormPowerUpEffects.applyChainTargeting = function(proto) {
    proto._findWormAtPosition = function(x, y) {
      const threshold = 50;
      return this.wormSystem.worms.find((w) => {
        if (!w.active) return false;
        const dist = calculateDistance(w.x, w.y, x, y);
        return dist < threshold;
      });
    };

    proto._findNearestWorm = function(x, y) {
      const activeWorms = this.wormSystem.worms.filter((w) => w.active);
      if (activeWorms.length === 0) return null;

      return activeWorms.reduce((nearest, worm) => {
        const distCurrent = calculateDistance(worm.x, worm.y, x, y);
        const distNearest = nearest
          ? calculateDistance(nearest.x, nearest.y, x, y)
          : Infinity;
        return distCurrent < distNearest ? worm : nearest;
      }, null);
    };

    proto._getChainLightningTargets = function(originWorm, killCount) {
      return this.wormSystem.worms
        .filter((w) => w.active)
        .sort((a, b) => {
          const distA = calculateDistance(a.x, a.y, originWorm.x, originWorm.y);
          const distB = calculateDistance(b.x, b.y, originWorm.x, originWorm.y);
          return distA - distB;
        })
        .slice(0, killCount);
    };
  };
})();
