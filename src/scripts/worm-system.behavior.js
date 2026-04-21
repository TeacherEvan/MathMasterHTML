// src/scripts/worm-system.behavior.js
(function() {
  if (!window.WormSystem) {
    console.warn("🐛 WormSystem not found for behavior helpers");
    return;
  }

  const proto = window.WormSystem.prototype;
  const GameEvents = window.GameEvents || {
    ROW_RESET_BY_WORM: "rowResetByWorm",
  };
  const getSolutionSymbolValue = (element) =>
    window.GameSymbolHelpers?.getSymbolValue?.(element) ||
    String(element?.dataset?.expected || element?.textContent || "").trim();
  const hideSolutionSymbol = (element) => {
    if (window.GameSymbolHelpers?.setHiddenSymbolState) {
      return window.GameSymbolHelpers.setHiddenSymbolState(element);
    }

    const symbolValue = getSolutionSymbolValue(element);
    if (symbolValue && element && !element.dataset.expected) {
      element.dataset.expected = symbolValue;
    }

    if (element) {
      element.textContent = "";
      element.classList.remove("revealed-symbol");
      element.classList.add("hidden-symbol");
      element.style.visibility = "visible";
    }

    return symbolValue;
  };

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
      worm.roamingEndTime = Date.now() + this.ROAM_RESUME_DURATION;
      worm.isRushingToTarget = false;
      return;
    }

    const symbolsSource = this.getCachedRevealedSymbols();

    // Get all available symbols (not stolen, not spaces, not completed)
    const allAvailableSymbols = Array.from(symbolsSource).filter(
      (el) =>
        !el.dataset.stolen &&
        !el.classList.contains("space-symbol") &&
        !el.classList.contains("completed-row-symbol"),
    );

    // PURPLE WORM LOGIC: can only steal symbols currently visible to the user
    let availableSymbols;
    if (worm.canStealBlue && worm.isPurple) {
      availableSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
      );
      console.log(
        `🟣 PURPLE WORM - ${availableSymbols.length} revealed symbols available`,
      );
    } else {
      // All non-purple steal attempts are restricted to currently revealed symbols
      availableSymbols = allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
      );
      console.log(
        `🐛 Normal worm - ${availableSymbols.length} revealed symbols available`,
      );
    }

    if (availableSymbols.length === 0) {
      console.log("🐛 No symbols available to steal");
      // Continue roaming
      worm.roamingEndTime = Date.now() + this.ROAM_RESUME_DURATION;
      worm.isRushingToTarget = false;
      return;
    }

    // If worm has a target symbol, try to find it
    // REFACTORED: Use shared normalizeSymbol utility from utils.js
    let targetSymbol = null;
    if (worm.targetSymbol) {
      const normalizedTarget = normalizeSymbol(worm.targetSymbol);
      targetSymbol = availableSymbols.find((el) => {
        const elSymbol = normalizeSymbol(getSolutionSymbolValue(el));
        return elSymbol === normalizedTarget;
      });
    }

    // If no specific target or target not found, pick random
    if (!targetSymbol) {
      targetSymbol =
        availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
    }

    // ERROR HANDLING: Verify targetSymbol exists and has required properties
    const symbolValue = getSolutionSymbolValue(targetSymbol);
    if (!targetSymbol || !symbolValue) {
      Logger.warn("⚠️", `Worm ${worm.id} could not find valid target symbol`);
      worm.roamingEndTime = Date.now() + this.ROAM_RESUME_DURATION;
      worm.isRushingToTarget = false;
      return;
    }

    const wasBlueSymbol = targetSymbol.classList.contains("revealed-symbol");

    console.log(
      `🐛 Worm ${worm.id} stealing ${
        wasBlueSymbol ? "BLUE" : "RED"
      } symbol: "${symbolValue}"`,
    );

    // Mark symbol as stolen and hide it
    targetSymbol.dataset.stolen = "true";
    targetSymbol.classList.add("stolen");
    hideSolutionSymbol(targetSymbol);
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

    // When a blue symbol is stolen, revert the entire row back to red
    if (wasBlueSymbol) {
      const stepIndex = targetSymbol.dataset.stepIndex;
      if (stepIndex !== undefined) {
        const rowSymbols = this.solutionContainer
          ? this.solutionContainer.querySelectorAll(
            `[data-step-index="${stepIndex}"].revealed-symbol`,
          )
          : [];
        Array.from(rowSymbols).forEach((el) => {
          hideSolutionSymbol(el);
        });
        console.log(
          `🔴 Worm stole blue symbol from row ${stepIndex} - reverted ${rowSymbols.length} more revealed symbol(s) to red`,
        );
        this.invalidateSymbolCache();
        document.dispatchEvent(
          new CustomEvent(GameEvents.ROW_RESET_BY_WORM, {
            detail: { stepIndex: parseInt(stepIndex, 10) },
          }),
        );
      }
    }

    // ACTIVATE LSD FLICKER when stealing symbol!
    const flickerBoostPercent = Math.round((this.FLICKER_SPEED_BOOST - 1) * 100);
    console.log(
      `🌈 Worm ${worm.id} stole ${
        wasBlueSymbol ? "blue" : "red"
      } symbol - ACTIVATING LSD FLICKER with ${flickerBoostPercent}% SPEED BOOST!`,
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
      return allAvailableSymbols.filter((el) =>
        el.classList.contains("revealed-symbol"),
      );
    }

    return allAvailableSymbols.filter((el) =>
      el.classList.contains("revealed-symbol"),
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
        const elSymbol = normalizeSymbol(getSolutionSymbolValue(el));
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
        worm.targetSymbol = getSolutionSymbolValue(nearestSymbol);
      }
    }

    return targetElement;
  };

  // Game-over logic extracted to worm-system.gameover.js
  // (checkGameOverCondition, triggerGameOver, removeRandomConsoleSymbol, showGameOverModal)
})();
