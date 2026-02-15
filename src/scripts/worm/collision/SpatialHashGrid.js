// worm/collision/SpatialHashGrid.js - Spatial partitioning for collision detection
// SOLID: Single Responsibility - Only handles spatial queries
// Performance: O(n) average case instead of O(n²) for collision detection
(function() {
  "use strict";

  /**
   * SpatialHashGrid - Divides space into cells for efficient proximity queries
   * Reduces collision detection from O(n²) to O(n) average case
   */
  class SpatialHashGrid {
    /** @type {number} */
    _cellSize;

    /** @type {Map<string, Set<any>>} */
    _grid;

    /** @type {number} */
    _entityCount;

    /**
     * Create a new spatial hash grid
     * @param {number} [cellSize=60] - Size of each cell in pixels
     */
    constructor(cellSize = 60) {
      this._cellSize = cellSize;
      this._grid = new Map();
      this._entityCount = 0;
    }

    /**
     * Get cell key for a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {string} Cell key
     * @private
     */
    _hash(x, y) {
      const cellX = Math.floor(x / this._cellSize);
      const cellY = Math.floor(y / this._cellSize);
      return `${cellX},${cellY}`;
    }

    /**
     * Clear all entities from the grid
     */
    clear() {
      this._grid.clear();
      this._entityCount = 0;
    }

    /**
     * Insert an entity into the grid
     * @param {Object} entity - Entity with x, y properties
     */
    insert(entity) {
      const key = this._hash(entity.x, entity.y);

      if (!this._grid.has(key)) {
        this._grid.set(key, new Set());
      }

      this._grid.get(key).add(entity);
      this._entityCount++;
    }

    /**
     * Insert multiple entities
     * @param {Array<Object>} entities - Array of entities
     */
    insertMultiple(entities) {
      entities.forEach((e) => this.insert(e));
    }

    /**
     * Remove an entity from the grid
     * @param {Object} entity - Entity to remove
     */
    remove(entity) {
      const key = this._hash(entity.x, entity.y);
      const cell = this._grid.get(key);

      if (cell) {
        cell.delete(entity);
        if (cell.size === 0) {
          this._grid.delete(key);
        }
        this._entityCount--;
      }
    }

    /**
     * Update entity position in grid
     * @param {Object} entity - Entity to update
     * @param {number} newX - New X coordinate
     * @param {number} newY - New Y coordinate
     */
    update(entity, newX, newY) {
      const oldKey = this._hash(entity.x, entity.y);
      const newKey = this._hash(newX, newY);

      if (oldKey !== newKey) {
        // Remove from old cell
        const oldCell = this._grid.get(oldKey);
        if (oldCell) {
          oldCell.delete(entity);
          if (oldCell.size === 0) {
            this._grid.delete(oldKey);
          }
        }

        // Add to new cell
        if (!this._grid.has(newKey)) {
          this._grid.set(newKey, new Set());
        }
        this._grid.get(newKey).add(entity);
      }

      // Update entity position
      entity.x = newX;
      entity.y = newY;
    }

    /**
     * Get all entities in the same cell as a position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {Array<Object>} Entities in the same cell
     */
    getCell(x, y) {
      const key = this._hash(x, y);
      const cell = this._grid.get(key);
      return cell ? Array.from(cell) : [];
    }

    /**
     * Get all entities within a radius of a position
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Search radius
     * @returns {Array<Object>} Nearby entities
     */
    getNearby(x, y, radius) {
      const results = [];
      const cellRadius = Math.ceil(radius / this._cellSize);
      const centerX = Math.floor(x / this._cellSize);
      const centerY = Math.floor(y / this._cellSize);

      // Check all cells within radius
      for (let dx = -cellRadius; dx <= cellRadius; dx++) {
        for (let dy = -cellRadius; dy <= cellRadius; dy++) {
          const key = `${centerX + dx},${centerY + dy}`;
          const cell = this._grid.get(key);

          if (cell) {
            results.push(...cell);
          }
        }
      }

      return results;
    }

    /**
     * Find the nearest entity to a position
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} [maxDistance=Infinity] - Maximum search distance
     * @param {Function} [filter] - Optional filter function
     * @returns {Object|null} Nearest entity or null
     */
    findNearest(x, y, maxDistance = Infinity, filter = null) {
      const candidates = this.getNearby(x, y, maxDistance);
      let nearest = null;
      let minDist = maxDistance;

      for (const entity of candidates) {
        // Apply filter if provided
        if (filter && !filter(entity)) {
          continue;
        }

        const dx = entity.x - x;
        const dy = entity.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          nearest = entity;
        }
      }

      return nearest;
    }

    /**
     * Find all entities within radius that pass a filter
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} radius - Search radius
     * @param {Function} [filter] - Optional filter function
     * @returns {Array<{entity: Object, distance: number}>}
     */
    findAllWithin(x, y, radius, filter = null) {
      const candidates = this.getNearby(x, y, radius);
      const results = [];

      for (const entity of candidates) {
        // Apply filter if provided
        if (filter && !filter(entity)) {
          continue;
        }

        const dx = entity.x - x;
        const dy = entity.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist <= radius) {
          results.push({ entity, distance: dist });
        }
      }

      // Sort by distance
      results.sort((a, b) => a.distance - b.distance);

      return results;
    }

    /**
     * Get grid statistics
     * @returns {{cellCount: number, entityCount: number, avgPerCell: number}}
     */
    getStats() {
      const cellCount = this._grid.size;
      return {
        cellCount,
        entityCount: this._entityCount,
        avgPerCell: cellCount > 0 ? this._entityCount / cellCount : 0,
      };
    }

    /**
     * Get the cell size
     * @returns {number}
     */
    getCellSize() {
      return this._cellSize;
    }

    /**
     * Set the cell size (clears the grid)
     * @param {number} size - New cell size
     */
    setCellSize(size) {
      this._cellSize = size;
      this.clear();
    }
  }

  // Attach to window
  window.SpatialHashGrid = SpatialHashGrid;

  console.log("✅ SpatialHashGrid module loaded");
})();
