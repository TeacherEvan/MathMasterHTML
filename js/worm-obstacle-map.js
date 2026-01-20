// js/worm-obstacle-map.js - Cache obstacle rectangles for worm avoidance
console.log("🧱 Worm Obstacle Map Loading...");

class WormObstacleMap {
  constructor(config = {}) {
    this.selectors = config.selectors || [
      "#help-button",
      "#clarify-button",
      "#symbol-console",
      "#lock-display",
      "#problem-container",
      "#game-hud",
      "#back-button",
    ];
    this.cacheDuration = config.cacheDuration ?? 200;
    this.padding = config.padding ?? 8;

    this._cache = null;
    this._cacheTime = 0;
  }

  getObstacleRects() {
    const now = Date.now();
    if (this._cache && now - this._cacheTime < this.cacheDuration) {
      return this._cache;
    }

    const elements = this.selectors
      .map((selector) => Array.from(document.querySelectorAll(selector)))
      .flat()
      .filter(Boolean);

    this._cache = elements
      .map((element) => element.getBoundingClientRect())
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => ({
        left: rect.left - this.padding,
        top: rect.top - this.padding,
        right: rect.right + this.padding,
        bottom: rect.bottom + this.padding,
        width: rect.width + this.padding * 2,
        height: rect.height + this.padding * 2,
      }));

    this._cacheTime = now;
    return this._cache;
  }
}

if (typeof window !== "undefined") {
  window.WormObstacleMap = WormObstacleMap;
}
