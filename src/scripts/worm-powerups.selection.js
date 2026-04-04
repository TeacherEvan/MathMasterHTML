// src/scripts/worm-powerups.selection.js
(function () {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for selection helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;

  /**
    * TWO-CLICK SYSTEM: Select a power-up (first tap/click)
   * @param {string} type - Power-up type to select
   */
  proto.selectPowerUp = function (type) {
    // If already selected, deselect (toggle)
    if (this.selectedPowerUp === type) {
      this.deselectPowerUp();
      return;
    }

    // Check if available
    if (this.inventory[type] <= 0) {
      console.log(`⚠️ No ${type} power-ups available!`);
      this._showTooltip(`No ${this.EMOJIS[type]} available!`, "warning");
      return;
    }

    // Deselect any previous selection
    if (this.selectedPowerUp) {
      this.deselectPowerUp();
    }

    // Select new power-up
    this.selectedPowerUp = type;
    this.isPlacementMode = true;
    console.log(`🎯 ${this.EMOJIS[type]} SELECTED! ${this.DESCRIPTIONS[type]}`);

    this._dispatchSelectionChanged();

    // Show placement instructions
    this._showTooltip(
      `${this.EMOJIS[type]} selected - ${this.DESCRIPTIONS[type]}`,
      "info",
    );

    // Change cursor to indicate placement mode
    document.body.style.cursor = "crosshair";
    document.body.classList.add("power-up-placement-mode");
    document.documentElement.classList.add("power-up-placement-mode");

    // Drop focus from any previously active element to ensure document keydown catches Escape
    if (
      document.activeElement &&
      document.activeElement instanceof HTMLElement
    ) {
      document.activeElement.blur();
    }

    requestAnimationFrame(() => {
      if (!this.selectedPowerUp) return;
      document.body.tabIndex = -1;
      document.body.focus({ preventScroll: true });
    });

    // Setup placement pointer handler
    this._setupPlacementHandler(type);
  };

  /**
   * TWO-CLICK SYSTEM: Deselect current power-up (cancel)
   */
  proto.deselectPowerUp = function () {
    if (!this.selectedPowerUp) return;

    console.log(`❌ ${this.EMOJIS[this.selectedPowerUp]} deselected`);

    // Cleanup placement handler
    this._cleanupPlacementHandler();

    // Reset state
    this.selectedPowerUp = null;
    this.isPlacementMode = false;

    // Reset cursor
    document.body.style.cursor = "";
    document.body.classList.remove("power-up-placement-mode");
    document.documentElement.classList.remove("power-up-placement-mode");

    this._keyboardCaptureTarget = null; // Clean up legacy reference if it exists

    this._dispatchSelectionChanged();
    this._hideTooltip();
  };

  /**
   * Setup placement input handler for two-click system
   * @param {string} type - Power-up type being placed
   * @private
   */
  proto._setupPlacementHandler = function (type) {
    // Remove any existing handler
    this._cleanupPlacementHandler();

    const handlePlacementEvent = (e) => {
      // Ignore clicks on power-up display itself
      if (e.target.closest("#power-up-display")) {
        return;
      }

      if (e.type === "click" && e.detail !== 0) {
        return;
      }

      if (typeof e.button === "number" && e.button !== 0) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      // Execute the power-up at input location
      this._executePlacement(type, e.clientX, e.clientY, e);
    };

    this.placementHandler = handlePlacementEvent;
    this.placementClickFallbackHandler = handlePlacementEvent;

    // Add with capture to ensure we get the pointer first on touch devices.
    document.addEventListener("pointerdown", this.placementHandler, {
      capture: true,
    });
    document.addEventListener("click", this.placementClickFallbackHandler, {
      capture: true,
    });
  };

  /**
   * Cleanup placement input handler
   * @private
   */
  proto._cleanupPlacementHandler = function () {
    if (this.placementHandler) {
      document.removeEventListener("pointerdown", this.placementHandler, {
        capture: true,
      });
      this.placementHandler = null;
    }
    if (this.placementClickFallbackHandler) {
      document.removeEventListener("click", this.placementClickFallbackHandler, {
        capture: true,
      });
      this.placementClickFallbackHandler = null;
    }
  };

  /**
   * Execute power-up placement (second click)
   * @param {string} type - Power-up type
   * @param {number} x - Click X coordinate
   * @param {number} y - Click Y coordinate
   * @param {Event} event - Original click event
   * @private
   */
  proto._executePlacement = function (type, x, y, event) {
    console.log(`🎮 Placing ${this.EMOJIS[type]} at (${x}, ${y})`);

    // Deduct from inventory
    this.inventory[type]--;
    this._dispatchInventoryChanged();

    try {
      document.dispatchEvent(
        new CustomEvent("powerUpActivated", {
          detail: {
            system: this,
            type,
            x,
            y,
            originalEvent: event || null,
          },
        }),
      );
    } finally {
      // Always reset selection state, even if a handler throws, so
      // the UI is never left stuck in placement mode.
      this.deselectPowerUp();
    }
  };
})();
