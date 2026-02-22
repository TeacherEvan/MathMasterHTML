// src/scripts/worm-system.cache.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for cache helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  // PERFORMANCE: Get cached revealed symbols (refreshes every 100ms instead of every frame)
  proto.getCachedRevealedSymbols = function() {
    const now = Date.now();
    if (
      !this.cachedRevealedSymbols ||
      now - this.revealedSymbolsCacheTime > this.CACHE_DURATION_TARGETS
    ) {
      this.cachedRevealedSymbols = this.solutionContainer.querySelectorAll(
        ".revealed-symbol",
      );
      this.revealedSymbolsCacheTime = now;
    }
    return this.cachedRevealedSymbols;
  };

  // FIX: Get ALL solution symbols (for purple worms that can steal hidden symbols)
  proto.getCachedAllSymbols = function() {
    const now = Date.now();
    if (
      !this.cachedAllSymbols ||
      now - this.allSymbolsCacheTime > this.CACHE_DURATION_TARGETS
    ) {
      this.cachedAllSymbols = this.solutionContainer.querySelectorAll(
        ".solution-symbol",
      );
      this.allSymbolsCacheTime = now;
    }
    return this.cachedAllSymbols;
  };

  // PERFORMANCE: Get cached container bounding rect (refreshes every 200ms instead of every frame)
  proto.getCachedContainerRect = function() {
    const now = Date.now();
    if (
      !this.cachedContainerRect ||
      now - this.containerRectCacheTime > this.CACHE_DURATION_RECT
    ) {
      const container =
        this.solutionContainer ||
        document.getElementById("panel-b") ||
        this.wormContainer;
      this.cachedContainerRect = container.getBoundingClientRect();
      this.containerRectCacheTime = now;
    }
    return this.cachedContainerRect;
  };

  // PERFORMANCE: Invalidate caches when symbols change
  proto.invalidateSymbolCache = function() {
    this.cachedRevealedSymbols = null;
    this.cachedAllSymbols = null; // FIX: Also invalidate all symbols cache
  };
})();
