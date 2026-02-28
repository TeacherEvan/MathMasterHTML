// src/scripts/worm-system.events.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for event helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  // PERFORMANCE: Setup event listeners once (called from initialize)
  proto.setupEventListeners = function() {
    if (this.eventListenersInitialized) {
      console.log("⚠️ Event listeners already initialized, skipping...");
      return;
    }

    console.log("🎧 Setting up WormSystem event listeners...");

    // Listen for the custom event dispatched by game.js
    document.addEventListener("problemLineCompleted", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log(
        "🐛 Worm System received problemLineCompleted event:",
        detail,
      );
      this.rowsCompleted++;
      this.initialize(); // Ensure containers are resolved before cache access

      // Spawn 1 green worm inside Panel B that immediately rushes to steal a blue symbol.
      // targetSymbol may be null when the row just completed (all symbols are now cyan/completed).
      // The worm will roam in Panel B and auto-target revealed symbols once the player
      // starts revealing symbols in the next row.
      const revealedSymbols = this.getCachedRevealedSymbols();
      let targetSymbol = null;
      if (revealedSymbols && revealedSymbols.length > 0) {
        const idx = Math.floor(Math.random() * revealedSymbols.length);
        targetSymbol = revealedSymbols[idx].textContent;
      }
      console.log(
        `📊 Row ${this.rowsCompleted} completed. Spawning 1 green worm in Panel B targeting blue symbol "${targetSymbol}".`,
      );
      this.queueWormSpawn("panelB", { targetSymbol });
    });

    // CONSOLIDATED: Listen for problem completion (reset row counter + cleanup)
    document.addEventListener("problemCompleted", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log(
        "🎉 Problem completed! Resetting row counter and cleaning up.",
        detail,
      );
      this.rowsCompleted = 0;

      // Kill all worms and clean up cracks
      console.log("🎯 Problem completed - killing all worms!");
      this.killAllWorms();

      // Clean up cracks after worms are killed
      setTimeout(() => {
        this.cleanupCracks();
      }, this.PROBLEM_COMPLETION_CLEANUP_DELAY); // Wait for explosions to finish
    });

    // PURPLE WORM: Listen for purple worm trigger (3 wrong answers)
    document.addEventListener("purpleWormTriggered", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log(
        "🟣 Purple Worm System received purpleWormTriggered event:",
        detail,
      );
      this.queueWormSpawn("purple");
    });

    // Listen for symbol clicks in rain display to check if worm's target was clicked
    document.addEventListener("symbolClicked", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.checkWormTargetClickForExplosion(detail.symbol);
    });

    // Listen for symbol reveals to trigger worm targeting
    document.addEventListener("symbolRevealed", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      console.log("🎯 Symbol revealed event:", detail);
      this.notifyWormsOfRedSymbol(detail.symbol);
    });

    // Cursor tracking for evasion (event-driven)
    document.addEventListener("wormCursorUpdate", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.cursorState = detail;
    });
    document.addEventListener("wormCursorTap", (event) => {
      const detail = /** @type {CustomEvent} */ (event).detail;
      this.cursorState = detail;
    });

    if (this.cursorTracker) {
      this.cursorTracker.start();
    }

    this.eventListenersInitialized = true;
    console.log("✅ WormSystem event listeners initialized");
  };

  // Check if rain symbol clicked matches worm's stolen symbol - EXPLODE WORM or TURN GREEN
  proto.checkWormTargetClickForExplosion = function(clickedSymbol) {
    // REFACTORED: Use utility function for normalization
    const normalizedClicked = normalizeSymbol(clickedSymbol);

    // Check if any worm is carrying this symbol
    this.worms.forEach((worm) => {
      if (!worm.active || !worm.hasStolen) return;

      const normalizedWormSymbol = normalizeSymbol(worm.stolenSymbol);

        if (normalizedWormSymbol === normalizedClicked) {
        // PURPLE WORM: matching rain symbol is the only valid kill path
        if (worm.isPurple) {
          console.log(
            `💥 User clicked matching rain symbol "${clickedSymbol}" - EXPLODING purple worm ${worm.id}!`,
          );
          this.explodeWorm(worm, true);
          return;
        }

        // GREEN WORM: Explode immediately
        console.log(
          `💥 BOOM! User clicked rain symbol "${clickedSymbol}" - EXPLODING worm with stolen symbol!`,
        );

        this.explodeWorm(worm, true); // Pass true to indicate this is a rain kill
      }
    });
  };

  // Notify roaming worms that a red symbol has appeared
  proto.notifyWormsOfRedSymbol = function(symbolValue) {
    console.log(`🎯 Notifying worms of revealed red symbol: "${symbolValue}"`);

    // Cache the latest revealed symbol and refresh symbol caches
    this.latestRevealedSymbol = symbolValue;
    this.latestRevealedAt = Date.now();
    this.invalidateSymbolCache();

    this.worms.forEach((worm) => {
      if (!worm.active || worm.hasStolen || worm.isRushingToTarget) return;

      // Worm stops roaming and rushes to this symbol
      console.log(
        `🐛 Worm ${worm.id} detected red symbol "${symbolValue}" - RUSHING TO TARGET!`,
      );
      worm.isRushingToTarget = true;
      worm.targetSymbol = symbolValue;
      worm.forceRushUntil = Date.now() + 1500;
      worm.roamingEndTime = Date.now(); // Stop roaming timer
      worm.path = null;
      worm.pathIndex = 0;
      worm.lastPathUpdate = 0;
    });
  };
})();
