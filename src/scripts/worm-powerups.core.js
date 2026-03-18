// src/scripts/worm-powerups.core.js
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for core helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;

  /**
   * Setup keyboard handler for ESC to cancel selection
   * @private
   */
  proto._setupKeyboardHandler = function() {
    if (this._keyboardHandler) {
      return;
    }

    this._keyboardHandler = (e) => {
      if (e.key === "Escape" && this.selectedPowerUp) {
        this.deselectPowerUp();
      }
    };

    document.addEventListener("keydown", this._keyboardHandler, true);
    window.addEventListener("keydown", this._keyboardHandler, true);
  };

  proto._ensureKeyboardCaptureTarget = function() {
    if (this._keyboardCaptureTarget?.isConnected) {
      return this._keyboardCaptureTarget;
    }

    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("aria-hidden", "true");
    input.tabIndex = -1;
    input.autocomplete = "off";
    input.style.cssText = `
      position: fixed;
      top: -1000px;
      left: -1000px;
      width: 1px;
      height: 1px;
      opacity: 0;
      pointer-events: none;
    `;
    input.addEventListener("keydown", this._keyboardHandler, true);
    document.body.appendChild(input);
    this._keyboardCaptureTarget = input;
    return input;
  };

  /**
   * Roll for power-up drop
   * @returns {boolean} Whether to drop a power-up
   */
  proto.shouldDrop = function() {
    return Math.random() < this.DROP_RATE;
  };

  /**
   * Drop power-up at location
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} type - Optional type override
   */
  proto.drop = function(x, y, type = null) {
    if (!type) {
      type = this.TYPES[Math.floor(Math.random() * this.TYPES.length)];
    }

    const powerUp = this.createPowerUpElement(x, y, type);
    this.wormSystem.crossPanelContainer.appendChild(powerUp);

    console.log(
      `✨ Power-up "${type}" dropped at (${x.toFixed(0)}, ${y.toFixed(0)})`,
    );

    // Auto-remove after timeout
    setTimeout(() => {
      if (powerUp.parentNode) {
        powerUp.parentNode.removeChild(powerUp);
        console.log(
          `⏱️ Power-up "${type}" expired after ${this.SLIME_SPLAT_DURATION /
            1000}s`,
        );
      }
    }, this.SLIME_SPLAT_DURATION);
  };

  /**
   * Create power-up DOM element
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {string} type - Power-up type
   * @returns {HTMLElement} Power-up element
   */
  proto.createPowerUpElement = function(x, y, type) {
    const powerUp = document.createElement("div");
    powerUp.className = "power-up";
    powerUp.dataset.type = type;
    powerUp.textContent = this.EMOJIS[type] || "⭐";

    Object.assign(powerUp.style, {
      left: `${x}px`,
      top: `${y}px`,
      position: "fixed",
      fontSize: "30px",
      zIndex: "10001",
      cursor: "pointer",
      animation: "power-up-appear 0.5s ease-out",
      pointerEvents: "auto",
    });

    // Click to collect
    powerUp.addEventListener("click", (e) => {
      e.stopPropagation();
      this.collect(type, powerUp);
    });

    return powerUp;
  };

  /**
   * Collect power-up
   * @param {string} type - Power-up type
   * @param {HTMLElement} element - Power-up DOM element
   */
  proto.collect = function(type, element) {
    this.inventory[type]++;
    console.log(`🎁 Collected ${type}! Total: ${this.inventory[type]}`);

    // Chain Lightning: Increase kill count with each pickup (after first)
    if (type === "chainLightning" && this.inventory[type] > 1) {
      this.chainLightningKillCount += 2;
      console.log(
        `⚡ Chain Lightning kill count increased to ${this.chainLightningKillCount}`,
      );
    }

    // Visual feedback
    element.style.animation = "power-up-collect 0.3s ease-out";
    this._dispatchInventoryChanged();

    setTimeout(() => {
      if (element.parentNode) {
        element.parentNode.removeChild(element);
      }
    }, 300);
  };

  proto._dispatchInventoryChanged = function() {
    document.dispatchEvent(
      new CustomEvent("powerUpInventoryChanged", {
        detail: {
          system: this,
          inventory: { ...this.inventory },
          chainLightningKillCount: this.chainLightningKillCount,
        },
      }),
    );
  };

  proto._dispatchSelectionChanged = function() {
    document.dispatchEvent(
      new CustomEvent("powerUpSelectionChanged", {
        detail: {
          system: this,
          selectedPowerUp: this.selectedPowerUp,
          isPlacementMode: this.isPlacementMode,
        },
      }),
    );
  };
})();
