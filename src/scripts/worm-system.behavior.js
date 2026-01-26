// src/scripts/worm-system.behavior.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for behavior helpers");
    return;
  }

  const proto = window.WormSystem.prototype;

  proto.stealSymbol = function(worm) {
    // ERROR HANDLING: Validate worm parameter
    if (!worm || !worm.element) {
      Logger.warn("⚠️", "stealSymbol called with invalid worm object");
      return;
    }

    // CROSS-PANEL CHECK: Worm can only steal symbols when inside Panel B
    // PERFORMANCE: Use cached container rect instead of live query
    const panelBRect = this.getCachedContainerRect();
    const wormInPanelB =
      worm.x >= panelBRect.left &&
      worm.x <= panelBRect.right &&
      worm.y >= panelBRect.top &&
      worm.y <= panelBRect.bottom;

    if (!wormInPanelB) {
      console.log(`🐛 Worm ${worm.id} outside Panel B - cannot steal symbols`);
      // Continue roaming
      worm.roamingEndTime = Date.now() + 5000;
      worm.isRushingToTarget = false;
      return;
    }

    // FIX: Purple worms need access to ALL symbols (including hidden), not just revealed
    const symbolsSource = worm.isPurple
      ? this.getCachedAllSymbols()
      : this.getCachedRevealedSymbols();

    // Get all available symbols (not stolen, not spaces, not completed)
    const allAvailableSymbols = Array.from(symbolsSource).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol"),
    );

    // PURPLE WORM LOGIC: Only steal blue symbols when NO red symbols available
    let availableSymbols;
    if (worm.canStealBlue && worm.isPurple) {
      // First, try to get red (hidden) symbols only
      const redSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );

      if (redSymbols.length > 0) {
        // Red symbols available - purple worm steals red symbols like normal
        availableSymbols = redSymbols;
        console.log(
          `🟣 PURPLE WORM - ${redSymbols.length} red symbols available (preferring red)`,
        );
      } else {
        // NO red symbols - now purple worm can steal blue symbols!
        const blueSymbols = allAvailableSymbols.filter((el) =>
          el.classList.contains("revealed-symbol"),
        );
        availableSymbols = blueSymbols;
        console.log(
          `🟣 PURPLE WORM - NO red symbols! Stealing blue symbols (${blueSymbols.length} available)`,
        );
      }
    } else {
      // Normal worm - only steal red (hidden) symbols
      availableSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );
      console.log(
        `🐛 Normal worm - ${availableSymbols.length} red symbols available`,
      );
    }

    if (availableSymbols.length === 0) {
      console.log("🐛 No symbols available to steal");
      // Continue roaming
      worm.roamingEndTime = Date.now() + 5000;
      worm.isRushingToTarget = false;
      return;
    }

    // If worm has a target symbol, try to find it
    // REFACTORED: Use shared normalizeSymbol utility from utils.js
    let targetSymbol = null;
    if (worm.targetSymbol) {
      const normalizedTarget = normalizeSymbol(worm.targetSymbol);
      targetSymbol = availableSymbols.find((el) => {
        const elSymbol = normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget;
      });
    }

    // If no specific target or target not found, pick random
    if (!targetSymbol) {
      targetSymbol =
        availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
    }

    // ERROR HANDLING: Verify targetSymbol exists and has required properties
    if (!targetSymbol || !targetSymbol.textContent) {
      Logger.warn("⚠️", `Worm ${worm.id} could not find valid target symbol`);
      worm.roamingEndTime = Date.now() + 5000;
      worm.isRushingToTarget = false;
      return;
    }

    const symbolValue = targetSymbol.textContent;
    const wasBlueSymbol = targetSymbol.classList.contains("revealed-symbol");

    console.log(
      `🐛 Worm ${worm.id} stealing ${
        wasBlueSymbol ? "BLUE" : "RED"
      } symbol: "${symbolValue}"`,
    );

    // Mark symbol as stolen and hide it
    targetSymbol.dataset.stolen = "true";
    targetSymbol.classList.add("stolen");
    targetSymbol.classList.remove("revealed-symbol");
    targetSymbol.classList.add("hidden-symbol"); // Hide it again until user re-clicks in rain
    targetSymbol.style.visibility = "hidden";

    // Update worm data
    worm.stolenSymbol = symbolValue;
    worm.targetElement = targetSymbol;
    worm.hasStolen = true;
    worm.isRushingToTarget = false;
    worm.element.dataset.stolenSymbol = symbolValue;
    worm.wasBlueSymbol = wasBlueSymbol; // Track if it was blue
    worm.path = null;
    worm.pathIndex = 0;
    worm.lastPathUpdate = 0;

    // ACTIVATE LSD FLICKER when stealing symbol!
    console.log(
      `🌈 Worm ${worm.id} stole ${
        wasBlueSymbol ? "blue" : "red"
      } symbol - ACTIVATING LSD FLICKER with 20% SPEED BOOST!`,
    );
    worm.isFlickering = true;
    worm.element.classList.add("flickering");
    worm.currentSpeed = worm.baseSpeed * this.FLICKER_SPEED_BOOST; // 20% speed boost!

    // Add stolen symbol indicator (symbol follows worm)
    const stolenSymbolDiv = document.createElement("div");
    stolenSymbolDiv.className = "carried-symbol";
    stolenSymbolDiv.textContent = symbolValue;
    if (wasBlueSymbol) {
      stolenSymbolDiv.style.color = "#00ffff"; // Cyan for stolen blue symbols
    }
    worm.element.appendChild(stolenSymbolDiv);

    console.log(
      `🐛 Worm now carrying "${symbolValue}" and heading back to console hole!`,
    );

    // GAME OVER CHECK: Did worm steal the last available symbol?
    this.checkGameOverCondition();
  };

  /**
   * Select available symbols for a worm based on rules (purple vs green)
   * @private
   */
  proto._getAvailableSymbolsForWorm = function(worm, symbolsSource) {
    const allAvailableSymbols = /** @type {HTMLElement[]} */ (Array.from(
      symbolsSource,
    ).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol"),
    ));

    if (worm.isPurple && worm.canStealBlue) {
      const redSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("hidden-symbol"),
      );
      if (redSymbols.length > 0) return redSymbols;

      return allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
      );
    }

    return allAvailableSymbols.filter((el) =>
      el.classList.contains("hidden-symbol"),
    );
  };

  /**
   * Resolve target element for a worm (keeps targetSymbol and targetElement synced)
   * @private
   */
  proto._resolveTargetElement = function(worm, symbolsSource) {
    const availableSymbols = this._getAvailableSymbolsForWorm(
      worm,
      symbolsSource,
    );

    if (availableSymbols.length === 0) {
      return null;
    }

    let targetElement = null;

    if (worm.targetSymbol) {
      const normalizedTarget = normalizeSymbol(worm.targetSymbol);
      targetElement = availableSymbols.find((el) => {
        const elSymbol = normalizeSymbol(el.textContent);
        return elSymbol === normalizedTarget;
      });
    }

    if (!targetElement) {
      /** @type {HTMLElement | null} */
      let nearestSymbol = null;
      let nearestDistance = Infinity;

      availableSymbols.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const symbolX = rect.left + rect.width / 2;
        const symbolY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(worm.x - symbolX, 2) + Math.pow(worm.y - symbolY, 2),
        );

        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestSymbol = el;
        }
      });

      if (nearestSymbol) {
        targetElement = nearestSymbol;
        worm.targetSymbol = nearestSymbol.textContent;
      }
    }

    return targetElement;
  };

  // GAME OVER: Check if all symbols have been stolen
  proto.checkGameOverCondition = function() {
    // FIX: Query ALL symbol elements (not just revealed ones) because stolen symbols may not be in .revealed-symbol class
    // We need to check both revealed and hidden symbols to see if they're stolen
    const allSymbols = this.solutionContainer.querySelectorAll(
      ".symbol:not(.space-symbol):not(.completed-row-symbol)",
    );

    const availableSymbols = Array.from(allSymbols).filter((el) => {
      const isStolen = el.dataset.stolen === "true";
      const isSpace = el.classList.contains("space-symbol");
      const isCompleted = el.classList.contains("completed-row-symbol");

      // Symbol is available if it's not stolen, not a space, and not from a completed row
      return !isStolen && !isSpace && !isCompleted;
    });

    console.log(
      `🎮 Game Over Check: ${availableSymbols.length} symbols available out of ${allSymbols.length} total`,
    );

    if (availableSymbols.length === 0 && allSymbols.length > 0) {
      console.log("💀 GAME OVER! All symbols stolen!");
      this.triggerGameOver();
    }
  };

  // GAME OVER: Trigger game over sequence
  proto.triggerGameOver = function() {
    // Pause worm animations
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Remove a random console symbol as penalty (if any exist)
    this.removeRandomConsoleSymbol();

    // Show Game Over modal
    this.showGameOverModal();
  };

  // Remove random symbol from console as penalty
  proto.removeRandomConsoleSymbol = function() {
    if (!window.consoleManager) return;

    const filledSlots = [];
    window.consoleManager.slots.forEach((symbol, index) => {
      if (symbol !== null) {
        filledSlots.push(index);
      }
    });

    if (filledSlots.length === 0) {
      console.log("⚠️ No console symbols to remove");
      return;
    }

    // Pick random filled slot
    const randomIndex =
      filledSlots[Math.floor(Math.random() * filledSlots.length)];
    const removedSymbol = window.consoleManager.slots[randomIndex];

    // Remove it
    window.consoleManager.slots[randomIndex] = null;
    window.consoleManager.updateConsoleDisplay();
    window.consoleManager.saveProgress();

    console.log(
      `💔 PENALTY: Removed "${removedSymbol}" from console slot ${randomIndex +
        1}`,
    );
  };

  // Show Game Over modal
  proto.showGameOverModal = function() {
    // PERFORMANCE: Use cached element or create if doesn't exist
    let modal =
      this.cachedGameOverModal || document.getElementById("game-over-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "game-over-modal";
      modal.className = "game-over-modal";
      modal.innerHTML = `
                <div class="game-over-content">
                    <h1 class="game-over-title">💀 GAME OVER! 💀</h1>
                    <p class="game-over-message">All symbols have been stolen by worms!</p>
                    <p class="game-over-penalty">Penalty: Lost 1 console symbol</p>
                    <button class="game-over-button" onclick="location.reload()">Try Again</button>
                    <button class="game-over-button secondary" onclick="window.location.href='level-select.html'">Back to Levels</button>
                </div>
            `;
      document.body.appendChild(modal);
      this.cachedGameOverModal = modal; // Cache the newly created modal
    }

    // Show modal with animation
    setTimeout(() => {
      modal.style.display = "flex";
      modal.style.opacity = "1";
    }, 100);
  };
})();
