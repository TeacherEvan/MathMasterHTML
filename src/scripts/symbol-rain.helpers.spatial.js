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
        for (let i = 0; i < activeSymbols.length; i++) {
          const symbolObj = activeSymbols[i];
          const key = this.getCellKey(symbolObj.x, symbolObj.y);
          if (symbolObj.spatialKey !== key) {
            if (symbolObj.spatialKey && spatialGrid.has(symbolObj.spatialKey)) {
              const arr = spatialGrid.get(symbolObj.spatialKey);
              if (arr.length > 0) {
                const idx = arr.indexOf(symbolObj);
                if (idx !== -1) arr.splice(idx, 1);
              }
            }
            if (!spatialGrid.has(key)) {
              spatialGrid.set(key, []);
            }
            spatialGrid.get(key).push(symbolObj);
            symbolObj.spatialKey = key;
          }
        }
      },

      remove(symbolObj) {
        if (symbolObj.spatialKey && spatialGrid.has(symbolObj.spatialKey)) {
          const arr = spatialGrid.get(symbolObj.spatialKey);
          if (arr.length > 0) {
            const idx = arr.indexOf(symbolObj);
            if (idx !== -1) arr.splice(idx, 1);
          }
          symbolObj.spatialKey = null;
        }
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

  // Collision resolution is owned by the slot grid in
  // `symbol-rain.placement.js` (a tile can never overlap its neighbour), so the
  // old ad-hoc `checkCollision` / `checkTouching` pair was removed. The spatial
  // grid above is still used for occupancy bookkeeping and hit lookups.
})();
