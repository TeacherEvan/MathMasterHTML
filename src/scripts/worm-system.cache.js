// src/scripts/worm-system.cache.js
(function () {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for cache helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  function ensureCacheStats(system) {
    if (!system._cacheStats) {
      system._cacheStats = {
        revealedSymbols: { hits: 0, misses: 0 },
        allSymbols: { hits: 0, misses: 0 },
        containerRect: { hits: 0, misses: 0 },
      };
    }

    return system._cacheStats;
  }

  function recordCacheAccess(system, key, isHit) {
    const stats = ensureCacheStats(system);
    const bucket = stats[key];
    if (!bucket) {
      return;
    }

    if (isHit) {
      bucket.hits++;
    } else {
      bucket.misses++;
    }
  }

  function summarizeBucket(bucket) {
    const hits = bucket?.hits ?? 0;
    const misses = bucket?.misses ?? 0;
    const totalRequests = hits + misses;

    return {
      hits,
      misses,
      totalRequests,
      hitRate:
        totalRequests > 0
          ? Math.round((hits / totalRequests) * 10000) / 100
          : 0,
    };
  }

  // PERFORMANCE: Get cached revealed symbols (refreshes every 100ms instead of every frame)
  proto.getCachedRevealedSymbols = function () {
    const now = Date.now();
    const hasFreshCache =
      this.cachedRevealedSymbols &&
      now - this.revealedSymbolsCacheTime <= this.CACHE_DURATION_TARGETS;

    recordCacheAccess(this, "revealedSymbols", hasFreshCache);

    if (!hasFreshCache) {
      this.cachedRevealedSymbols =
        this.solutionContainer.querySelectorAll(".revealed-symbol");
      this.revealedSymbolsCacheTime = now;
    }
    return this.cachedRevealedSymbols;
  };

  // FIX: Get ALL solution symbols (for purple worms that can steal hidden symbols)
  proto.getCachedAllSymbols = function () {
    const now = Date.now();
    const hasFreshCache =
      this.cachedAllSymbols &&
      now - this.allSymbolsCacheTime <= this.CACHE_DURATION_TARGETS;

    recordCacheAccess(this, "allSymbols", hasFreshCache);

    if (!hasFreshCache) {
      this.cachedAllSymbols =
        this.solutionContainer.querySelectorAll(".solution-symbol");
      this.allSymbolsCacheTime = now;
    }
    return this.cachedAllSymbols;
  };

  // PERFORMANCE: Get cached container bounding rect (refreshes every 200ms instead of every frame)
  proto.getCachedContainerRect = function () {
    const now = Date.now();
    const hasFreshCache =
      this.cachedContainerRect &&
      now - this.containerRectCacheTime <= this.CACHE_DURATION_RECT;

    recordCacheAccess(this, "containerRect", hasFreshCache);

    if (!hasFreshCache) {
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
  proto.invalidateSymbolCache = function () {
    this.cachedRevealedSymbols = null;
    this.cachedAllSymbols = null; // FIX: Also invalidate all symbols cache
  };

  proto.getCacheStats = function () {
    const stats = ensureCacheStats(this);
    const revealedSymbols = summarizeBucket(stats.revealedSymbols);
    const allSymbols = summarizeBucket(stats.allSymbols);
    const containerRect = summarizeBucket(stats.containerRect);
    const totalHits =
      revealedSymbols.hits + allSymbols.hits + containerRect.hits;
    const totalMisses =
      revealedSymbols.misses + allSymbols.misses + containerRect.misses;
    const totalRequests = totalHits + totalMisses;

    return {
      revealedSymbols,
      allSymbols,
      containerRect,
      totalHits,
      totalMisses,
      totalRequests,
      overallHitRate:
        totalRequests > 0
          ? Math.round((totalHits / totalRequests) * 10000) / 100
          : 0,
      caches: {
        revealedSymbols,
        allSymbols,
        containerRect,
      },
    };
  };
})();
