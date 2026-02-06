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
    { config, isMobileMode, spatialGrid },
    symbolObj,
  ) {
    if (isMobileMode) {
      const symbolWidth = config.mobileSymbolWidth;
      const baseHorizontalBuffer = config.mobileHorizontalBuffer;
      const faceRevealBuffer = symbolObj.isInFaceReveal
        ? config.mobileFaceRevealBuffer
        : 0;
      const horizontalBuffer = baseHorizontalBuffer + faceRevealBuffer;

      const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;
        const distance = symbolObj.x - other.x;
        if (distance > 0 && distance < symbolWidth + horizontalBuffer) {
          return true;
        }
      }
      return false;
    }

    const symbolHeight = config.desktopSymbolHeight;
    const symbolWidth = config.desktopSymbolWidth;
    const baseCollisionBuffer = config.desktopCollisionBuffer;
    const baseHorizontalBuffer = config.desktopHorizontalBuffer;

    const faceRevealMultiplier = symbolObj.isInFaceReveal
      ? config.faceRevealBufferMultiplier
      : 1;
    const collisionBuffer = baseCollisionBuffer * faceRevealMultiplier;
    const horizontalBuffer = baseHorizontalBuffer * faceRevealMultiplier;

    const symbolLeft = symbolObj.x;
    const symbolRight = symbolLeft + symbolWidth;

    const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
    for (const other of neighbors) {
      if (other === symbolObj) continue;

      const otherLeft = other.x;
      const otherRight = otherLeft + symbolWidth;

      const horizontalOverlap = !(
        symbolRight + horizontalBuffer < otherLeft ||
        symbolLeft > otherRight + horizontalBuffer
      );

      if (horizontalOverlap) {
        const distance = other.y - symbolObj.y;
        if (distance > 0 && distance < symbolHeight + collisionBuffer) {
          return true;
        }
      }
    }
    return false;
  };

  helpers.checkTouching = function checkTouching(
    { config, isMobileMode, spatialGrid },
    symbolObj,
  ) {
    if (isMobileMode) {
      const symbolWidth = config.mobileSymbolWidth;

      const neighbors = spatialGrid.getNeighbors(symbolObj.x, symbolObj.y);
      for (const other of neighbors) {
        if (other === symbolObj) continue;

        const distance = Math.abs(symbolObj.x - other.x);
        if (distance < symbolWidth) {
          return other;
        }
      }
      return null;
    }

    const symbolHeight = config.desktopSymbolHeight;
    const symbolWidth = config.desktopSymbolWidth;

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
