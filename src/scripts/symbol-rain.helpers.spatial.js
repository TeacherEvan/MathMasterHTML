// src/scripts/symbol-rain.helpers.spatial.js - Spatial grid + collision helpers
console.log("🎯 SymbolRain helpers: spatial loading...");

(function attachSymbolRainSpatial() {
  const helpers = (window.SymbolRainHelpers = window.SymbolRainHelpers || {});

  helpers.createSpatialGrid = function createSpatialGrid(config) {
    const spatialGrid = new Map();

    return {
      getCellKey(x, y) {
        const cellX = Math.floor(x / config.gridCellSize);
        const cellY = Math.floor(y / config.gridCellSize);
        return `${cellX},${cellY}`;
      },

      update(activeSymbols) {
        spatialGrid.clear();
        activeSymbols.forEach((symbolObj) => {
          const key = this.getCellKey(symbolObj.x, symbolObj.y);
          if (!spatialGrid.has(key)) {
            spatialGrid.set(key, []);
          }
          spatialGrid.get(key).push(symbolObj);
        });
      },

      getNeighbors(x, y) {
        const cellX = Math.floor(x / config.gridCellSize);
        const cellY = Math.floor(y / config.gridCellSize);
        const neighbors = [];

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const key = `${cellX + dx},${cellY + dy}`;
            if (spatialGrid.has(key)) {
              neighbors.push(...spatialGrid.get(key));
            }
          }
        }
        return neighbors;
      },
    };
  };

  helpers.checkCollision = function checkCollision(
    { config, spatialGrid },
    symbolObj,
  ) {
    // Unify all platforms under the responsive constraints
    const symbolHeight = config.symbolHeight;
    const symbolWidth = config.symbolWidth;
    const collisionBuffer = config.collisionBuffer;
    const baseHorizontalBuffer = config.horizontalBuffer;
    const faceRevealBuffer = symbolObj.isInFaceReveal
      ? config.faceRevealBuffer
      : 0;
    const horizontalBuffer = baseHorizontalBuffer + faceRevealBuffer;

    const symbolLeft = symbolObj.x;
    const symbolRight = symbolLeft + symbolWidth;
    const symbolTop = symbolObj.y;
    const symbolBottom = symbolTop + symbolHeight;

    const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
    for (const other of neighbors) {
      if (other === symbolObj) continue;

      const otherLeft = other.x;
      const otherRight = otherLeft + symbolWidth;
      const otherTop = other.y;

      const horizontalOverlap = !(
        symbolRight + horizontalBuffer < otherLeft ||
        symbolLeft > otherRight + horizontalBuffer
      );
      const distance = otherTop - symbolTop;
      const verticalConflict =
        distance > 0 &&
        symbolBottom > otherTop &&
        distance < symbolHeight + collisionBuffer;

      if (horizontalOverlap && verticalConflict) {
        return true;
      }
    }
    return false;
  };

  helpers.checkTouching = function checkTouching(
    { config, spatialGrid },
    symbolObj,
  ) {
    // Unified collision matching
    const symbolHeight = config.symbolHeight;
    const symbolWidth = config.symbolWidth;

    const symbolLeft = symbolObj.x;
    const symbolRight = symbolLeft + symbolWidth;
    const symbolTop = symbolObj.y;
    const symbolBottom = symbolTop + symbolHeight;

    const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
    for (const other of neighbors) {
      if (other === symbolObj) continue;

      const otherLeft = other.x;
      const otherRight = otherLeft + symbolWidth;
      const otherTop = other.y;
      const otherBottom = otherTop + symbolHeight;

      const horizontalOverlap = !(
        symbolRight <= otherLeft || symbolLeft >= otherRight
      );
      const verticalOverlap = !(
        symbolBottom <= otherTop || symbolTop >= otherBottom
      );

      if (horizontalOverlap && verticalOverlap) {
        return other;
      }
    }
    return null;
  };
})();
