// js/worm-pathfinding.js - A* pathfinding for worms
console.log("🧩 Worm Pathfinding Loading...");

class WormPathfinder {
  constructor(config = {}) {
    this.cellSize = config.cellSize ?? 60;
    this.maxIterations = config.maxIterations ?? 1200;
    this.obstaclePadding = config.obstaclePadding ?? 12;
  }

  findPath(start, goal, bounds, obstacles = []) {
    if (!start || !goal || !bounds) return [];

    const cols = Math.max(1, Math.floor(bounds.width / this.cellSize));
    const rows = Math.max(1, Math.floor(bounds.height / this.cellSize));

    const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
    const toCell = (x, y) => ({
      col: clamp(Math.floor(x / this.cellSize), 0, cols - 1),
      row: clamp(Math.floor(y / this.cellSize), 0, rows - 1),
    });
    const toPoint = (cell) => ({
      x: cell.col * this.cellSize + this.cellSize / 2,
      y: cell.row * this.cellSize + this.cellSize / 2,
    });
    const keyFor = (cell) => `${cell.col},${cell.row}`;

    const startCell = toCell(start.x, start.y);
    const goalCell = toCell(goal.x, goal.y);
    const goalKey = keyFor(goalCell);

    const blocked = this._buildBlockedSet(obstacles, cols, rows, this.cellSize);
    if (blocked.has(goalKey)) {
      return [];
    }

    const open = [];
    const gScore = new Map();
    const fScore = new Map();
    const cameFrom = new Map();

    const startKey = keyFor(startCell);
    gScore.set(startKey, 0);
    fScore.set(startKey, this._heuristic(startCell, goalCell));
    open.push(startCell);

    let iterations = 0;

    while (open.length > 0 && iterations < this.maxIterations) {
      iterations++;

      let currentIndex = 0;
      let currentKey = keyFor(open[0]);
      let currentScore = fScore.get(currentKey) ?? Infinity;

      for (let i = 1; i < open.length; i++) {
        const key = keyFor(open[i]);
        const score = fScore.get(key) ?? Infinity;
        if (score < currentScore) {
          currentIndex = i;
          currentScore = score;
          currentKey = key;
        }
      }

      const current = open.splice(currentIndex, 1)[0];
      const currentCellKey = keyFor(current);

      if (currentCellKey === goalKey) {
        return this._reconstructPath(cameFrom, current, toPoint);
      }

      const neighbors = this._getNeighbors(current, cols, rows);
      for (const neighbor of neighbors) {
        const neighborKey = keyFor(neighbor);
        if (blocked.has(neighborKey)) continue;

        const tentativeG =
          (gScore.get(currentCellKey) ?? Infinity) +
          this._distance(current, neighbor);

        if (tentativeG < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeG);
          fScore.set(
            neighborKey,
            tentativeG + this._heuristic(neighbor, goalCell),
          );

          if (!open.some((cell) => keyFor(cell) === neighborKey)) {
            open.push(neighbor);
          }
        }
      }
    }

    return [];
  }

  _buildBlockedSet(obstacles, cols, rows, cellSize) {
    const blocked = new Set();

    const normalized = obstacles.map((obstacle) => {
      const left = obstacle.left ?? obstacle.x ?? 0;
      const top = obstacle.top ?? obstacle.y ?? 0;
      const right = obstacle.right ?? left + (obstacle.width ?? 0);
      const bottom = obstacle.bottom ?? top + (obstacle.height ?? 0);
      return {
        left: left - this.obstaclePadding,
        top: top - this.obstaclePadding,
        right: right + this.obstaclePadding,
        bottom: bottom + this.obstaclePadding,
      };
    });

    normalized.forEach((rect) => {
      const startCol = Math.max(0, Math.floor(rect.left / cellSize));
      const endCol = Math.min(cols - 1, Math.floor(rect.right / cellSize));
      const startRow = Math.max(0, Math.floor(rect.top / cellSize));
      const endRow = Math.min(rows - 1, Math.floor(rect.bottom / cellSize));

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          blocked.add(`${col},${row}`);
        }
      }
    });

    return blocked;
  }

  _heuristic(a, b) {
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
  }

  _distance(a, b) {
    const dx = a.col - b.col;
    const dy = a.row - b.row;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _getNeighbors(cell, cols, rows) {
    const neighbors = [];
    const deltas = [
      { col: 1, row: 0 },
      { col: -1, row: 0 },
      { col: 0, row: 1 },
      { col: 0, row: -1 },
      { col: 1, row: 1 },
      { col: -1, row: -1 },
      { col: 1, row: -1 },
      { col: -1, row: 1 },
    ];

    deltas.forEach((delta) => {
      const col = cell.col + delta.col;
      const row = cell.row + delta.row;

      if (col >= 0 && col < cols && row >= 0 && row < rows) {
        neighbors.push({ col, row });
      }
    });

    return neighbors;
  }

  _reconstructPath(cameFrom, current, toPoint) {
    const path = [toPoint(current)];
    let currentKey = `${current.col},${current.row}`;

    while (cameFrom.has(currentKey)) {
      const previous = cameFrom.get(currentKey);
      currentKey = `${previous.col},${previous.row}`;
      path.push(toPoint(previous));
    }

    return path.reverse();
  }
}

if (typeof window !== "undefined") {
  window.WormPathfinder = WormPathfinder;
}
