// src/scripts/worm-powerups.ui.js
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for UI helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;
  const DEFAULT_UI_CONFIG = Object.freeze({
    COMPACT_MAX_WIDTH: 768,
    COMPACT_MAX_HEIGHT: 500,
    PANEL_B_BASE_SAFE_ZONE: 80,
    PANEL_B_CONTROLS_CLEARANCE: 12,
    DESKTOP_WIDTH: 320,
    COMPACT_MIN_WIDTH: 220,
    COMPACT_WIDTH_RATIO: 0.68,
    COMPACT_WIDTH_CAP: 280,
    DESKTOP_TOP_OFFSET: 12,
    COMPACT_TOP_OFFSET: 86,
    DESKTOP_HORIZONTAL_INSET: 180,
    COMPACT_HORIZONTAL_INSET: 12,
    DESKTOP_MAX_Y: 100,
    COMPACT_MAX_Y: 160,
    DESKTOP_GAP: 15,
    COMPACT_GAP: 8,
    DESKTOP_PADDING: 10,
    COMPACT_PADDING: 6,
    DESKTOP_FONT_SIZE: 18,
    COMPACT_FONT_SIZE: 14,
  });

  /**
   * Show tooltip notification
   * @param {string} message - Message to display
   * @param {string} type - 'info', 'warning', or 'success'
   * @private
   */
  proto._showTooltip = function(message, type = "info") {
    // Remove existing tooltip
    this._hideTooltip();

    const tooltip = document.createElement("div");
    tooltip.id = "power-up-tooltip";
    tooltip.textContent = message;

    const colors = {
      info: "#0ff",
      warning: "#ff0",
      success: "#0f0",
    };

    tooltip.style.cssText = `
            position: fixed;
            bottom: 100px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.9);
            color: ${colors[type] || colors.info};
            padding: 10px 20px;
            border-radius: 8px;
            font-family: 'Orbitron', monospace;
            font-size: 16px;
            z-index: 10010;
            border: 2px solid ${colors[type] || colors.info};
            animation: tooltip-appear 0.3s ease-out;
            pointer-events: none;
        `;

    document.body.appendChild(tooltip);

    // Auto-hide after 3 seconds
    setTimeout(() => this._hideTooltip(), 3000);
  };

  proto._bindUIEventHandlers = function() {
    if (this._uiEventsBound) return;

    this._uiEventsBound = true;

    document.addEventListener("powerUpInventoryChanged", (event) => {
      if (event.detail?.system && event.detail.system !== this) return;
      this.updateDisplay();
    });

    document.addEventListener("powerUpSelectionChanged", (event) => {
      if (event.detail?.system && event.detail.system !== this) return;
      this.updateDisplay();
    });

    if (!this._displayLayoutHandler) {
      this._displayLayoutHandler = () => this.syncDisplayLayout();
      window.addEventListener("resize", this._displayLayoutHandler);
      window.addEventListener("orientationchange", this._displayLayoutHandler);
    }
  };

  proto.getDisplayUIConfig = function() {
    return {
      ...DEFAULT_UI_CONFIG,
      ...(window.GameConstants?.POWER_UP_UI || {}),
    };
  };

  proto.getDisplayLayoutMetrics = function() {
    const config = this.getDisplayUIConfig();
    const isCompactViewport =
      window.innerWidth <= config.COMPACT_MAX_WIDTH ||
      window.innerHeight <= config.COMPACT_MAX_HEIGHT;
    const compactWidth = Math.max(
      config.COMPACT_MIN_WIDTH,
      Math.floor(window.innerWidth * config.COMPACT_WIDTH_RATIO),
    );
    const displayWidth = isCompactViewport
      ? Math.min(config.COMPACT_WIDTH_CAP, compactWidth)
      : config.DESKTOP_WIDTH;
    return {
      config,
      isCompactViewport,
      displayWidth,
      topOffset: isCompactViewport
        ? config.COMPACT_TOP_OFFSET
        : config.DESKTOP_TOP_OFFSET,
      displayGap: isCompactViewport ? config.COMPACT_GAP : config.DESKTOP_GAP,
      displayPadding: isCompactViewport
        ? config.COMPACT_PADDING
        : config.DESKTOP_PADDING,
      displayFontSize: isCompactViewport
        ? config.COMPACT_FONT_SIZE
        : config.DESKTOP_FONT_SIZE,
      maxWidth: isCompactViewport
        ? `min(${config.COMPACT_WIDTH_CAP}px, calc(100vw - ${config.COMPACT_HORIZONTAL_INSET * 2}px))`
        : `calc(100vw - ${config.DESKTOP_HORIZONTAL_INSET * 2}px)`,
    };
  };

  proto.getDisplayBoundaryConstraints = function() {
    const { config, isCompactViewport } = this.getDisplayLayoutMetrics();
    const horizontalInset = isCompactViewport
      ? config.COMPACT_HORIZONTAL_INSET
      : config.DESKTOP_HORIZONTAL_INSET;
    return {
      minX: horizontalInset,
      maxX: window.innerWidth - horizontalInset,
      minY: 0,
      maxY: isCompactViewport ? config.COMPACT_MAX_Y : config.DESKTOP_MAX_Y,
    };
  };

  proto.syncDisplayLayout = function() {
    if (!this.displayElement) return;

    const {
      config,
      isCompactViewport,
      displayWidth,
      topOffset,
      displayGap,
      displayPadding,
      displayFontSize,
      maxWidth,
    } = this.getDisplayLayoutMetrics();
    this.displayElement.dataset.viewport = isCompactViewport ? "compact" : "full";
    this.displayElement.style.setProperty(
      "--power-up-display-width",
      `${displayWidth}px`,
    );
    this.displayElement.style.setProperty("--power-up-display-top", `${topOffset}px`);
    this.displayElement.style.setProperty("--power-up-display-gap", `${displayGap}px`);
    this.displayElement.style.setProperty(
      "--power-up-display-padding",
      `${displayPadding}px`,
    );
    this.displayElement.style.setProperty(
      "--power-up-display-font-size",
      `${displayFontSize}px`,
    );
    this.displayElement.style.setProperty("--power-up-display-max-width", maxWidth);

    const displayHeight = this.displayElement.offsetHeight || 0;
    const panelBSafeZone = isCompactViewport
      ? Math.max(
          config.PANEL_B_BASE_SAFE_ZONE,
          topOffset + displayHeight + config.PANEL_B_CONTROLS_CLEARANCE,
        )
      : config.PANEL_B_BASE_SAFE_ZONE;
    document.documentElement.style.setProperty(
      "--panel-b-top-safe-zone",
      `${panelBSafeZone}px`,
    );

    if (this.displayElement.dataset.dragged !== "true") {
      this.displayElement.style.removeProperty("top");
      this.displayElement.style.removeProperty("right");
      this.displayElement.style.removeProperty("bottom");
      this.displayElement.style.removeProperty("left");
      this.displayElement.style.removeProperty("transform");
    }

    if (window.uiBoundaryManager?.setConstraints) {
      window.uiBoundaryManager.setConstraints(
        "power-up-display",
        this.getDisplayBoundaryConstraints(),
      );
    }
  };

  /**
   * Hide tooltip
   * @private
   */
  proto._hideTooltip = function() {
    const existing = document.getElementById("power-up-tooltip");
    if (existing) {
      existing.remove();
    }
  };

  /**
   * Use a power-up (LEGACY - now redirects to selectPowerUp for two-click system)
   * @param {string} type - Power-up type to use
   */
  proto.use = function(type) {
    // Redirect to two-click selection system
    this.selectPowerUp(type);
  };

  /**
   * Update power-up display UI
   */
  proto.updateDisplay = function() {
    console.log(
      `📊 Power-ups: ⚡${this.inventory.chainLightning} 🕷️${
        this.inventory.spider
      } 👹${this.inventory.devil}${
        this.selectedPowerUp ? ` | Selected: ${this.selectedPowerUp}` : ""
      }`,
    );

    if (!this.displayElement) {
      this.displayElement = this.createDisplayElement();
    }

    // Build display with selection highlighting
    const createItem = (type, emoji, count) => {
      const isSelected = this.selectedPowerUp === type;
      const hasStock = count > 0;
      const classNames = ["power-up-item"];
      if (isSelected) {
        classNames.push("is-selected");
      }
      if (!hasStock) {
        classNames.push("is-empty");
      }

      let extraInfo = "";
      if (type === "chainLightning" && count > 0) {
        extraInfo = `<span class="power-up-count-badge">${this.chainLightningKillCount}</span>`;
      }
      if (isSelected) {
        extraInfo += `<span class="power-up-item-selected-label">SELECTED</span>`;
      }

      return `
        <button
          type="button"
          class="${classNames.join(" ")}"
          data-type="${type}"
          data-testid="powerup-${type}"
          data-has-stock="${hasStock}"
          aria-pressed="${isSelected}"
          title="${this.DESCRIPTIONS[type]}"
        >
          <span class="power-up-item-value">${emoji} ${count}</span>
          ${extraInfo}
        </button>
      `;
    };

    this.displayElement.innerHTML = this.TYPES.map((type) =>
      createItem(type, this.EMOJIS[type], this.inventory[type]),
    ).join("");
    this.syncDisplayLayout();
  };

  /**
   * Create power-up display UI element
   * @returns {HTMLElement} Display element
   */
  proto.createDisplayElement = function() {
    const display = document.createElement("div");
    display.id = "power-up-display";
    display.className = "power-up-display";
    display.dataset.testid = "power-up-display";
    display.setAttribute("aria-label", "Power-up inventory");

    // Make it draggable with boundary validation
    this.makeDraggable(display);
    display.addEventListener("click", (event) => {
      const item = event.target.closest(".power-up-item");
      if (!item || !display.contains(item)) {
        return;
      }

      event.stopPropagation();
      this.selectPowerUp(item.dataset.type);
    });

    document.body.appendChild(display);
    this.displayElement = display;
    this.syncDisplayLayout();

    // Register with UIBoundaryManager if available
    if (window.uiBoundaryManager) {
      window.uiBoundaryManager.register("power-up-display", display, {
        zone: "top-center",
        priority: 1, // Lower priority than score/timer
        fixed: false,
        constraints: this.getDisplayBoundaryConstraints(),
      });
    }
    console.log("📊 Power-up display created (centered in top bar zone)");

    return display;
  };

  // makeDraggable and capitalize extracted to worm-powerups.ui.draggable.js
})();
