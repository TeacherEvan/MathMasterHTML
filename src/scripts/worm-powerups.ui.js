// src/scripts/worm-powerups.ui.js
(function() {
  if (!window.WormPowerUpSystem) {
    console.warn("✨ WormPowerUpSystem not found for UI helpers");
    return;
  }

  const proto = window.WormPowerUpSystem.prototype;

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

  proto.getDisplayLayoutMetrics = function() {
    const isCompactViewport =
      window.innerWidth <= 768 || window.innerHeight <= 500;
    const compactWidth = Math.max(220, Math.floor(window.innerWidth * 0.68));
    return {
      isCompactViewport,
      displayWidth: isCompactViewport ? Math.min(280, compactWidth) : 320,
    };
  };

  proto.getDisplayBoundaryConstraints = function() {
    const { isCompactViewport } = this.getDisplayLayoutMetrics();
    const horizontalInset = isCompactViewport ? 12 : 180;
    return {
      minX: horizontalInset,
      maxX: window.innerWidth - horizontalInset,
      minY: 0,
      maxY: isCompactViewport ? 160 : 100,
    };
  };

  proto.syncDisplayLayout = function() {
    if (!this.displayElement) return;

    const { isCompactViewport, displayWidth } = this.getDisplayLayoutMetrics();
    this.displayElement.dataset.viewport = isCompactViewport ? "compact" : "full";
    this.displayElement.style.width = `${displayWidth}px`;
    this.displayElement.style.maxWidth = `${displayWidth}px`;

    if (this.displayElement.dataset.dragged !== "true") {
      this.displayElement.style.removeProperty("top");
      this.displayElement.style.removeProperty("right");
      this.displayElement.style.removeProperty("bottom");
      this.displayElement.style.removeProperty("left");
      this.displayElement.style.removeProperty("transform");
    }

    if (
      window.uiBoundaryManager &&
      window.uiBoundaryManager.elements instanceof Map &&
      window.uiBoundaryManager.elements.has("power-up-display")
    ) {
      const entry = window.uiBoundaryManager.elements.get("power-up-display");
      entry.constraints = this.getDisplayBoundaryConstraints();
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
      const selectedStyle = isSelected
        ? "background: rgba(0, 255, 255, 0.4); border: 2px solid #0ff; box-shadow: 0 0 10px #0ff;"
        : "border: 2px solid transparent;";
      const availableStyle = hasStock ? "opacity: 1;" : "opacity: 0.5;";
      const cursorStyle = hasStock
        ? "cursor: pointer;"
        : "cursor: not-allowed;";

      let extraInfo = "";
      if (type === "chainLightning" && count > 0) {
        extraInfo = `<div style="position: absolute; top: -10px; right: -10px; font-size: 12px; color: #0ff;">${this.chainLightningKillCount}</div>`;
      }
      if (isSelected) {
        extraInfo += `<div style="position: absolute; bottom: -15px; left: 50%; transform: translateX(-50%); font-size: 10px; color: #0ff; white-space: nowrap;">SELECTED</div>`;
      }

      return `
                <div class="power-up-item" data-type="${type}" data-testid="powerup-${type}" 
                     style="${cursorStyle} padding: 8px; border-radius: 8px; transition: all 0.2s; position: relative; ${selectedStyle} ${availableStyle}">
                    ${emoji} ${count}
                    ${extraInfo}
                </div>
            `;
    };

    this.displayElement.innerHTML = `
            ${createItem("chainLightning", "⚡", this.inventory.chainLightning)}
            ${createItem("spider", "🕷️", this.inventory.spider)}
            ${createItem("devil", "👹", this.inventory.devil)}
        `;

    // Re-add click handlers and hover effects
    this.displayElement.querySelectorAll(".power-up-item").forEach((item) => {
      const type = item.dataset.type;
      const hasStock = this.inventory[type] > 0;

      item.addEventListener("mouseenter", () => {
        if (hasStock && this.selectedPowerUp !== type) {
          item.style.background = "rgba(0, 255, 0, 0.3)";
        }
      });
      item.addEventListener("mouseleave", () => {
        if (this.selectedPowerUp !== type) {
          item.style.background = "transparent";
        }
      });
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectPowerUp(type);
      });
    });
  };

  /**
   * Create power-up display UI element
   * @returns {HTMLElement} Display element
   */
  proto.createDisplayElement = function() {
    const display = document.createElement("div");
    display.id = "power-up-display";
    display.dataset.testid = "power-up-display";
    display.style.cssText = `
      position: fixed;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      border-radius: 10px;
      font-family: 'Orbitron', monospace;
      font-size: 18px;
      z-index: 10004;
      display: flex;
      gap: 15px;
      border: 2px solid #0f0;
      cursor: move;
      user-select: none;
      box-sizing: border-box;
    `;

    // Make it draggable with boundary validation
    this.makeDraggable(display);

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
