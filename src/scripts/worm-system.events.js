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
      const wormsToSpawn =
        this.wormsPerRow +
        (this.rowsCompleted - 1) * this.additionalWormsPerRow;
      console.log(
        `📊 Row ${this.rowsCompleted} completed. Spawning ${wormsToSpawn} worms!`,
      );

      // Spawn multiple worms spread around borders
      for (let i = 0; i < wormsToSpawn; i++) {
        this.queueWormSpawn("border", { index: i, total: wormsToSpawn });
      }
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
        // PURPLE WORM: Turn green when matching symbol clicked (must click worm to destroy)
        if (worm.isPurple) {
          console.log(
            `🟣→🟢 User clicked rain symbol "${clickedSymbol}" - Purple worm ${worm.id} turns GREEN!`,
          );

          // Turn worm green (damaged state)
          worm.element.style.filter = "hue-rotate(120deg) brightness(1.2)"; // Purple → Green
          worm.element.classList.remove("purple-worm");
          worm.element.classList.add("worm-damaged", "purple-turned-green");
          worm.isPurple = false; // No longer purple
          worm.canBeClicked = true; // Now clickable for destruction

          // Flash effect
          worm.element.style.animation = "worm-flash-green 0.5s ease-out";
          setTimeout(() => {
            worm.element.style.animation = "";
          }, 500);

          // Update click handler to explode instead of clone
          worm.element.removeEventListener("click", worm.clickHandler);
          worm.clickHandler = (e) => {
            e.stopPropagation();
            console.log(
              `💥 Green (was purple) worm ${worm.id} clicked - EXPLODING!`,
            );

            // Drop power-up when purple worm (now green) is destroyed
            this.dropPowerUp(worm.x, worm.y);

            this.explodeWorm(worm, false);
          };
          worm.element.addEventListener("click", worm.clickHandler);

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
