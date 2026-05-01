// src/scripts/worm-powerups.ui.js
(function () {
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
    COMPACT_LANDSCAPE_MIN_WIDTH: 132,
    COMPACT_LANDSCAPE_WIDTH_RATIO: 0.18,
    COMPACT_LANDSCAPE_WIDTH_CAP: 168,
    DESKTOP_TOP_OFFSET: 12,
    COMPACT_TOP_OFFSET: 86,
    COMPACT_LANDSCAPE_TOP_OFFSET: 4,
    DESKTOP_HORIZONTAL_INSET: 180,
    COMPACT_HORIZONTAL_INSET: 12,
    DESKTOP_MAX_Y: 100,
    COMPACT_MAX_Y: 160,
    COMPACT_LANDSCAPE_MAX_Y: 132,
    DESKTOP_GAP: 15,
    COMPACT_GAP: 8,
    COMPACT_LANDSCAPE_GAP: 4,
    DESKTOP_PADDING: 10,
    COMPACT_PADDING: 6,
    COMPACT_LANDSCAPE_PADDING: 4,
    DESKTOP_FONT_SIZE: 18,
    COMPACT_FONT_SIZE: 14,
    COMPACT_LANDSCAPE_FONT_SIZE: 12,
    PANEL_B_LANDSCAPE_SAFE_ZONE: 62,
  });

  /**
   * Show tooltip notification
   * @param {string} message - Message to display
   * @param {string} type - 'info', 'warning', or 'success'
   * @private
   */
  proto._showTooltip = function (message, type = "info") {
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

  proto._bindUIEventHandlers = function () {
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
      document.addEventListener("fullscreenchange", this._displayLayoutHandler);
      const sharedResizeObserver =
        window.__ensureSharedResizeObserver?.() || window.SharedResizeObserver;
      sharedResizeObserver?.subscribe?.(this._displayLayoutHandler, {
        immediate: true,
        source: "worm-powerups-ui",
      });
    }
  };

  proto.getDisplayUIConfig = function () {
    return {
      ...DEFAULT_UI_CONFIG,
      ...(window.GameConstants?.POWER_UP_UI || {}),
    };
  };

  proto.getDisplayLayoutMetrics = function () {
    const config = this.getDisplayUIConfig();
    const isCompactViewport =
      window.innerWidth <= config.COMPACT_MAX_WIDTH ||
      window.innerHeight <= config.COMPACT_MAX_HEIGHT;
    const isCompactLandscape =
      isCompactViewport &&
      window.innerWidth >= window.innerHeight &&
      document.body.classList.contains("viewport-landscape");
    const compactWidth = Math.max(
      config.COMPACT_MIN_WIDTH,
      Math.floor(window.innerWidth * config.COMPACT_WIDTH_RATIO),
    );
    const compactLandscapeWidth = Math.max(
      config.COMPACT_LANDSCAPE_MIN_WIDTH,
      Math.floor(window.innerWidth * config.COMPACT_LANDSCAPE_WIDTH_RATIO),
    );
    const displayWidth = isCompactViewport
      ? isCompactLandscape
        ? Math.min(config.COMPACT_LANDSCAPE_WIDTH_CAP, compactLandscapeWidth)
        : Math.min(config.COMPACT_WIDTH_CAP, compactWidth)
      : config.DESKTOP_WIDTH;
    return {
      config,
      isCompactViewport,
      isCompactLandscape,
      displayWidth,
      topOffset: isCompactLandscape
        ? config.COMPACT_LANDSCAPE_TOP_OFFSET
        : isCompactViewport
          ? config.COMPACT_TOP_OFFSET
          : config.DESKTOP_TOP_OFFSET,
      displayGap: isCompactLandscape
        ? config.COMPACT_LANDSCAPE_GAP
        : isCompactViewport
          ? config.COMPACT_GAP
          : config.DESKTOP_GAP,
      displayPadding: isCompactLandscape
        ? config.COMPACT_LANDSCAPE_PADDING
        : isCompactViewport
          ? config.COMPACT_PADDING
          : config.DESKTOP_PADDING,
      displayFontSize: isCompactLandscape
        ? config.COMPACT_LANDSCAPE_FONT_SIZE
        : isCompactViewport
          ? config.COMPACT_FONT_SIZE
          : config.DESKTOP_FONT_SIZE,
    };
  };

  proto.getDisplayPanelContext = function (displayRect = null) {
    const { config, isCompactViewport, isCompactLandscape } =
      this.getDisplayLayoutMetrics();
    const panelB = document.getElementById("panel-b");
    const controls = panelB?.querySelector(".panel-b-controls");
    const timerDisplay = document.getElementById("timer-display");
    const hud = document.getElementById("game-hud");
    const panelRect = panelB?.getBoundingClientRect() || null;
    const controlsRect = controls?.getBoundingClientRect() || null;
    const timerRect = timerDisplay?.getBoundingClientRect() || null;
    const hudRect = hud?.getBoundingClientRect() || null;
    const trayHeight =
      displayRect?.height || this.displayElement?.offsetHeight || 0;
    const trayWidth =
      displayRect?.width || this.displayElement?.offsetWidth || 0;
    const hudSafeTop = Math.max(
      0,
      Math.ceil(
        (hudRect?.bottom || 0) +
          (isCompactLandscape ? 1 : isCompactViewport ? -8 : 8),
      ),
    );

    if (!panelRect) {
      return {
        panelRect: null,
        controlsRect,
        timerRect,
        minX: isCompactViewport
          ? config.COMPACT_HORIZONTAL_INSET
          : config.DESKTOP_HORIZONTAL_INSET,
        maxX:
          window.innerWidth -
          (isCompactViewport
            ? config.COMPACT_HORIZONTAL_INSET
            : config.DESKTOP_HORIZONTAL_INSET),
        minY: hudSafeTop,
        maxY: isCompactViewport ? config.COMPACT_MAX_Y : config.DESKTOP_MAX_Y,
        availableWidth: window.innerWidth,
      };
    }

    const compactInset = isCompactLandscape
      ? 6
      : isCompactViewport
        ? 4
        : config.COMPACT_HORIZONTAL_INSET;
    const panelInset = Math.max(
      compactInset,
      Math.floor(panelRect.width * (isCompactViewport ? 0.02 : 0.04)),
    );
    const minXBase = panelRect.left + panelInset;
    const maxXBase = panelRect.right - panelInset;
    const timerOverlapPadding =
      (window.uiBoundaryManager?.config?.minSpacing || 10) +
      (isCompactViewport ? 2 : 0);
    const timerOverlapsPanel =
      !!timerRect &&
      timerRect.left < panelRect.right &&
      timerRect.right > panelRect.left;
    let minX = minXBase;
    let maxX = maxXBase;

    if (timerOverlapsPanel && timerRect) {
      const leftSafeMaxX = Math.min(
        maxXBase,
        timerRect.left - timerOverlapPadding,
      );
      const rightSafeMinX = Math.max(
        minXBase,
        timerRect.right + timerOverlapPadding,
      );
      const leftSafeWidth = Math.max(0, leftSafeMaxX - minXBase);
      const rightSafeWidth = Math.max(0, maxXBase - rightSafeMinX);

      if (rightSafeWidth > leftSafeWidth && rightSafeWidth > 0) {
        minX = rightSafeMinX;
      } else if (leftSafeWidth > 0) {
        maxX = leftSafeMaxX;
      }
    }

    const panelAnchoredTop =
      panelRect.top +
      (isCompactLandscape
        ? config.COMPACT_LANDSCAPE_TOP_OFFSET
        : isCompactViewport
          ? config.COMPACT_TOP_OFFSET
          : config.DESKTOP_TOP_OFFSET);
    const minTop = isCompactLandscape
      ? panelAnchoredTop
      : Math.max(hudSafeTop, panelAnchoredTop);
    const controlsBottomLimit =
      controlsRect?.top !== undefined
        ? controlsRect.top - config.PANEL_B_CONTROLS_CLEARANCE
        : panelRect.top +
          (isCompactViewport ? config.COMPACT_MAX_Y : config.DESKTOP_MAX_Y);
    const fallbackBottomLimit =
      panelRect.top +
      (isCompactLandscape
        ? config.COMPACT_LANDSCAPE_MAX_Y
        : isCompactViewport
          ? config.COMPACT_MAX_Y
          : config.DESKTOP_MAX_Y);
    const maxY = Math.max(
      minTop + trayHeight,
      Math.min(controlsBottomLimit, fallbackBottomLimit),
    );

    return {
      panelRect,
      controlsRect,
      timerRect,
      minX,
      maxX,
      minY: minTop,
      maxY,
      availableWidth: Math.max(0, maxX - minX),
      trayWidth,
      trayHeight,
    };
  };

  proto.getDisplayBoundaryConstraints = function (displayRect = null) {
    const context = this.getDisplayPanelContext(displayRect);
    return {
      minX: context.minX,
      maxX: context.maxX,
      minY: context.minY,
      maxY: context.maxY,
    };
  };

  proto.getDisplayAnchorPosition = function (displayWidth, displayHeight) {
    const { config } = this.getDisplayLayoutMetrics();
    const context = this.getDisplayPanelContext({
      width: displayWidth,
      height: displayHeight,
    });
    const { panelRect, controlsRect } = context;

    if (!panelRect) {
      return {
        left: Math.round((window.innerWidth - displayWidth) / 2),
        top: config.DESKTOP_TOP_OFFSET,
      };
    }

    const availableWidth = Math.max(
      0,
      context.maxX - context.minX - displayWidth,
    );
    const centeredLeft = context.minX + availableWidth / 2;
    const maxTopFromControls =
      controlsRect?.top !== undefined
        ? controlsRect.top - config.PANEL_B_CONTROLS_CLEARANCE - displayHeight
        : context.minY;

    return {
      left: Math.round(
        Math.max(
          context.minX,
          Math.min(centeredLeft, context.maxX - displayWidth),
        ),
      ),
      top: Math.round(
        Math.max(context.minY, Math.min(context.minY, maxTopFromControls)),
      ),
    };
  };

  proto.syncDisplayLayout = function () {
    if (!this.displayElement) return;

    const {
      config,
      isCompactViewport,
      isCompactLandscape,
      displayWidth,
      displayGap,
      displayPadding,
      displayFontSize,
    } = this.getDisplayLayoutMetrics();
    this.displayElement.dataset.viewport = isCompactViewport
      ? "compact"
      : "full";
    this.displayElement.style.setProperty(
      "--power-up-display-width",
      `${displayWidth}px`,
    );
    this.displayElement.style.setProperty(
      "--power-up-display-gap",
      `${displayGap}px`,
    );
    this.displayElement.style.setProperty(
      "--power-up-display-padding",
      `${displayPadding}px`,
    );
    this.displayElement.style.setProperty(
      "--power-up-display-font-size",
      `${displayFontSize}px`,
    );

    const panelContext = this.getDisplayPanelContext();
    const panelRect = panelContext.panelRect;
    const availableDisplayWidth = panelRect
      ? Math.max(52, Math.floor(panelContext.availableWidth))
      : displayWidth;
    const narrowPanel = panelRect && panelContext.availableWidth < displayWidth;
    const resolvedDisplayWidth = panelRect
      ? Math.min(displayWidth, availableDisplayWidth)
      : displayWidth;
    const panelMaxWidth = panelRect
      ? `${availableDisplayWidth}px`
      : isCompactViewport
        ? `min(${config.COMPACT_WIDTH_CAP}px, calc(100vw - ${config.COMPACT_HORIZONTAL_INSET * 2}px))`
        : `calc(100vw - ${config.DESKTOP_HORIZONTAL_INSET * 2}px)`;
    this.displayElement.dataset.layout = isCompactLandscape
      ? "row-compact"
      : narrowPanel
        ? "stacked"
        : "row";
    this.displayElement.style.setProperty(
      "--power-up-display-width",
      `${resolvedDisplayWidth}px`,
    );
    this.displayElement.style.setProperty(
      "--power-up-display-max-width",
      panelMaxWidth,
    );

    const displayRect = this.displayElement.getBoundingClientRect();
    const displayHeight = this.displayElement.offsetHeight || 0;
    const displayWidthActual =
      this.displayElement.offsetWidth || resolvedDisplayWidth;
    const constraints = this.getDisplayBoundaryConstraints(displayRect);
    const anchoredPosition = this.getDisplayAnchorPosition(
      displayWidthActual,
      displayHeight,
    );
    const panelBSafeZone = isCompactLandscape
      ? Math.max(
          config.PANEL_B_LANDSCAPE_SAFE_ZONE,
          anchoredPosition.top +
            displayHeight -
            (panelRect?.top || 0) +
            config.PANEL_B_CONTROLS_CLEARANCE +
            4,
        )
      : isCompactViewport
        ? Math.max(
            config.PANEL_B_BASE_SAFE_ZONE,
            anchoredPosition.top +
              displayHeight -
              (panelRect?.top || 0) +
              config.PANEL_B_CONTROLS_CLEARANCE,
          )
        : Math.max(
            config.PANEL_B_BASE_SAFE_ZONE,
            anchoredPosition.top +
              displayHeight -
              (panelRect?.top || 0) +
              config.PANEL_B_CONTROLS_CLEARANCE +
              4,
          );
    document.documentElement.style.setProperty(
      "--panel-b-top-safe-zone",
      `${panelBSafeZone}px`,
    );

    if (this.displayElement.dataset.dragged !== "true") {
      this.displayElement.style.top = `${anchoredPosition.top}px`;
      this.displayElement.style.left = `${anchoredPosition.left}px`;
      this.displayElement.style.right = "auto";
      this.displayElement.style.bottom = "auto";
      this.displayElement.style.transform = "none";
    } else if (window.uiBoundaryManager?.validatePosition) {
      const currentRect = this.displayElement.getBoundingClientRect();
      const validation = window.uiBoundaryManager.validatePosition(
        "power-up-display",
        { x: currentRect.left, y: currentRect.top },
      );
      if (!validation.valid) {
        this.displayElement.style.left = `${validation.adjustedPosition.x}px`;
        this.displayElement.style.top = `${validation.adjustedPosition.y}px`;
        this.displayElement.style.right = "auto";
        this.displayElement.style.bottom = "auto";
        this.displayElement.style.transform = "none";
      }
    }

    if (
      window.uiBoundaryManager?.setConstraints &&
      window.uiBoundaryManager.elements?.has?.("power-up-display")
    ) {
      window.uiBoundaryManager.setConstraints("power-up-display", constraints);
    }
  };

  proto.ensureDisplayBoundaryRegistration = function () {
    if (!this.displayElement || !window.uiBoundaryManager) {
      return;
    }

    const displayRect = this.displayElement.getBoundingClientRect();
    if (displayRect.width <= 0 || displayRect.height <= 0) {
      return;
    }

    const registration = {
      element: this.displayElement,
      zone: null,
      priority: 1,
      fixed: false,
      constraints: this.getDisplayBoundaryConstraints(displayRect),
    };

    if (window.uiBoundaryManager.elements?.has?.("power-up-display")) {
      window.uiBoundaryManager.updateRegistration("power-up-display", {
        ...registration,
        resetOriginalPosition: true,
      });
      return;
    }

    window.uiBoundaryManager.register(
      "power-up-display",
      this.displayElement,
      registration,
    );
  };

  /**
   * Hide tooltip
   * @private
   */
  proto._hideTooltip = function () {
    const existing = document.getElementById("power-up-tooltip");
    if (existing) {
      existing.remove();
    }
  };

  /**
   * Use a power-up (LEGACY - now redirects to selectPowerUp for two-click system)
   * @param {string} type - Power-up type to use
   */
  proto.use = function (type) {
    // Redirect to two-click selection system
    this.selectPowerUp(type);
  };

  /**
   * Update power-up display UI
   */
  proto.updateDisplay = function () {
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

    const hasAvailablePowerUps = this.TYPES.some(
      (type) => (this.inventory?.[type] || 0) > 0,
    );

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

    this.displayElement.hidden = false;
    this.displayElement.setAttribute("aria-hidden", "false");
    this.displayElement.style.display = "flex";
    this.displayElement.style.pointerEvents = "auto";
    this.displayElement.dataset.hasInventory = hasAvailablePowerUps
      ? "true"
      : "false";

    this.syncDisplayLayout();
    this.ensureDisplayBoundaryRegistration();
  };

  /**
   * Create power-up display UI element
   * @returns {HTMLElement} Display element
   */
  proto.createDisplayElement = function () {
    const display = document.createElement("div");
    display.id = "power-up-display";
    display.className = "power-up-display";
    display.dataset.testid = "power-up-display";
    display.setAttribute("aria-label", "Power-up inventory");
    display.hidden = false;
    display.setAttribute("aria-hidden", "false");
    display.style.display = "flex";

    // Make it draggable with boundary validation
    this.makeDraggable(display);
    const activatePowerUp = (event) => {
      const item = event.target.closest(".power-up-item");
      if (!item || !display.contains(item)) {
        return;
      }

      if (event.type === "click" && event.detail !== 0) {
        return;
      }

      if (typeof event.button === "number" && event.button !== 0) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      this.selectPowerUp(item.dataset.type);
    };
    display.addEventListener("pointerdown", activatePowerUp);
    display.addEventListener("click", activatePowerUp);

    document.body.appendChild(display);
    this.displayElement = display;

    this.syncDisplayLayout();
    console.log("📊 Power-up display created (centered in top bar zone)");

    return display;
  };

  // makeDraggable and capitalize extracted to worm-powerups.ui.draggable.js
})();
