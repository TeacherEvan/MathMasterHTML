// js/display-manager.js - Auto Display Resolution Manager
console.log("🖥️ Loading Display Manager...");

const resolveSharedResizeObserverHub =
  window.__ensureSharedResizeObserver ||
  function ensureSharedResizeObserverHub() {
    if (window.SharedResizeObserver) {
      return window.SharedResizeObserver;
    }

    const subscribers = new Set();
    const sources =
      window.__sharedResizeObserverSources ||
      (window.__sharedResizeObserverSources = new Set());
    let frameId = null;
    let lastReason = "init";

    const notify = (reason = "resize") => {
      lastReason = reason;
      if (frameId !== null) {
        return;
      }

      frameId = requestAnimationFrame(() => {
        frameId = null;
        const payload = {
          reason: lastReason,
          width: window.innerWidth,
          height: window.innerHeight,
        };

        subscribers.forEach((callback) => {
          try {
            callback(payload);
          } catch (error) {
            console.error("🖥️ Shared resize subscriber failed", error);
          }
        });
      });
    };

    const resizeObserver =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => notify("resize-observer"))
        : null;

    if (resizeObserver && document.documentElement) {
      resizeObserver.observe(document.documentElement);
    }

    window.addEventListener("resize", () => notify("window-resize"), {
      passive: true,
    });
    window.addEventListener(
      "orientationchange",
      () => notify("orientationchange"),
      { passive: true },
    );
    document.addEventListener("fullscreenchange", () => {
      notify("fullscreenchange");
    });

    window.SharedResizeObserver = {
      observer: resizeObserver,
      subscribe(callback, { immediate = false, source = "anonymous" } = {}) {
        subscribers.add(callback);
        sources.add(source);
        if (immediate) {
          callback({
            reason: "subscribe",
            width: window.innerWidth,
            height: window.innerHeight,
          });
        }
        return () => subscribers.delete(callback);
      },
      notify,
      getSubscriberCount() {
        return Math.max(subscribers.size, sources.size);
      },
      getSources() {
        return Array.from(sources);
      },
    };

    return window.SharedResizeObserver;
  };

window.__ensureSharedResizeObserver = resolveSharedResizeObserverHub;

class DisplayManager {
  constructor() {
    this.gameEvents = window.GameEvents || {
      DISPLAY_RESOLUTION_CHANGED: "displayResolutionChanged",
    };
    this.currentResolution = null;
    this.compactPanelALayoutFrameId = null;
    this.compactViewportConfig = {
      mobileMaxWidth: 600,
      compactMaxWidth: 1024,
      compactMaxHeight: 500,
      compactLandscapeWidth: 950,
      compactLandscapeMaxHeight: 600,
    };
    this.viewportStateClasses = [
      "viewport-compact",
      "viewport-standard",
      "viewport-portrait",
      "viewport-landscape",
      "viewport-rotate-required",
      "viewport-rotate-not-required",
    ];
    this.resolutions = {
      "4k": { width: 3840, minWidth: 2560, scale: 1.0, fontSize: "24px" },
      "1440p": { width: 2560, minWidth: 1920, scale: 0.9, fontSize: "20px" },
      "1080p": { width: 1920, minWidth: 1280, scale: 0.8, fontSize: "18px" },
      "720p": { width: 1280, minWidth: 768, scale: 0.7, fontSize: "16px" },
      mobile: { width: 768, minWidth: 0, scale: 0.6, fontSize: "14px" },
    };

    // PERFORMANCE: Cache DOM elements to avoid repeated getElementById calls
    this.domCache = {};

    this.init();
  }

  init() {
    console.log("🚀 Initializing Display Manager");

    if (navigator.webdriver) {
      document.body.classList.add("automation");
    }

    // PERFORMANCE: Cache DOM elements once at initialization
    this.cacheDOMElements();

    this.detectAndApply();

    const handleViewportChange = this.debounce((event) => {
      if (event?.reason === "orientationchange") {
        console.log("📱 Orientation changed, re-detecting resolution");
      } else {
        console.log("🔄 Viewport changed, re-detecting resolution");
      }
      this.detectAndApply();
    }, 300);

    this._unsubscribeResizeHub = resolveSharedResizeObserverHub().subscribe(
      handleViewportChange,
      { source: "display-manager" },
    );

    // Show resolution indicator
    this.showResolutionIndicator();
  }

  // PERFORMANCE: Cache DOM elements to avoid repeated getElementById calls
  cacheDOMElements() {
    this.domCache = {
      solutionContainer: document.getElementById("solution-container"),
      problemContainer: document.getElementById("problem-container"),
      panelA: document.getElementById("panel-a"),
      lockDisplay: document.getElementById("lock-display"),
      backButton: document.getElementById("back-button"),
      helpButton: document.getElementById("help-button"),
      startGameButton: document.getElementById("start-game-btn"),
      rotationOverlay: document.getElementById("rotation-overlay"),
      howToPlayModal: document.getElementById("how-to-play-modal"),
      resolutionIndicator: document.getElementById("resolution-indicator"),
    };
    console.log("📦 DOM elements cached for performance");
  }

  detectResolution() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const viewportState = this.getViewportState({ width, height });

    if (viewportState.isCompactViewport) {
      return {
        name: "mobile",
        config: this.resolutions.mobile,
        width,
        height,
        ...viewportState,
      };
    }

    for (const [name, config] of Object.entries(this.resolutions)) {
      if (width >= config.minWidth) {
        return {
          name,
          config,
          width,
          height,
          ...viewportState,
          isCompactViewport: false,
        };
      }
    }

    return {
      name: "mobile",
      config: this.resolutions.mobile,
      width,
      height,
      ...viewportState,
    };
  }

  getMobilePlatformHints() {
    const userAgent = navigator.userAgent || "";
    const maxTouchPoints =
      typeof navigator.maxTouchPoints === "number"
        ? navigator.maxTouchPoints
        : 0;
    const hasTouchRuntime =
      maxTouchPoints > 0 ||
      window.matchMedia?.("(any-pointer: coarse)")?.matches === true ||
      /Android|Tablet|Mobile|iP(hone|ad|od)|webOS/i.test(userAgent);
    const isAndroid = /Android/i.test(userAgent);
    const isKnownTabletClassAndroidUa =
      /Tablet|\bSM-T\w+\b|\bNexus (7|9|10)\b|\bPixel C\b|\bLenovo TB-[A-Z0-9]+\b/i.test(
        userAgent,
      );
    const isPhoneClassMobileUa = /Mobile/i.test(userAgent);
    const isWebView = /\bwv\b|; wv\)|Version\/\d+\.\d+.*Chrome\//i.test(
      userAgent,
    );
    const devicePixelRatio = Math.max(window.devicePixelRatio || 1, 1);
    const screenWidth = Math.min(window.screen?.width || window.innerWidth, window.innerWidth);
    const screenHeight = Math.min(window.screen?.height || window.innerHeight, window.innerHeight);
    const shortestRuntimeSide = Math.min(screenWidth, screenHeight);
    const densityNormalizedShortestSide = shortestRuntimeSide / devicePixelRatio;
    const isTabletLikeAndroidRuntime =
      hasTouchRuntime &&
      isAndroid &&
      (isKnownTabletClassAndroidUa || densityNormalizedShortestSide >= 320);

    return {
      hasTouchRuntime,
      isAndroid,
      isKnownTabletClassAndroidUa,
      isTabletLikeAndroidRuntime,
      isPhoneClassMobileUa,
      isWebView,
      densityNormalizedShortestSide,
      isAndroidPhoneLikeRuntime:
        hasTouchRuntime &&
        isAndroid &&
        !isTabletLikeAndroidRuntime &&
        (isPhoneClassMobileUa || isWebView),
    };
  }

  getViewportState({
    width = window.innerWidth,
    height = window.innerHeight,
  } = {}) {
    const coarsePointerQuery = window.matchMedia?.(
      "(hover: none) and (pointer: coarse)",
    );
    const platformHints = this.getMobilePlatformHints();
    const hasCoarsePointer =
      Boolean(coarsePointerQuery?.matches) ||
      platformHints.isAndroidPhoneLikeRuntime ||
      platformHints.isTabletLikeAndroidRuntime;
    const {
      mobileMaxWidth,
      compactMaxWidth,
      compactMaxHeight,
      compactLandscapeWidth,
      compactLandscapeMaxHeight,
    } = this.compactViewportConfig;
    const isLandscape = width >= height;
    const isPortrait = height > width;
    const isCompactNarrowViewport = width <= mobileMaxWidth;
    const isCompactLandscapeTouch =
      hasCoarsePointer &&
      isLandscape &&
      width <= compactLandscapeWidth &&
      height <= compactLandscapeMaxHeight;
    const isCompactShortViewport =
      width <= compactMaxWidth && height <= compactMaxHeight;
    const isCompactAndroidWebViewFallback =
      platformHints.isAndroidPhoneLikeRuntime &&
      isLandscape &&
      width <= compactMaxWidth &&
      height <= compactLandscapeWidth;
    const isCompactViewport =
      isCompactNarrowViewport ||
      isCompactLandscapeTouch ||
      isCompactShortViewport ||
      isCompactAndroidWebViewFallback;
    const shouldShowRotationOverlay =
      (hasCoarsePointer || platformHints.isAndroidPhoneLikeRuntime) &&
      isCompactViewport &&
      isPortrait &&
      width <= mobileMaxWidth;

    return {
      width,
      height,
      hasCoarsePointer,
      ...platformHints,
      isLandscape,
      isPortrait,
      isCompactNarrowViewport,
      isCompactViewport,
      isCompactLandscapeTouch,
      isCompactShortViewport,
      isCompactAndroidWebViewFallback,
      shouldShowRotationOverlay,
    };
  }

  async requestLandscapeOrientation() {
    const viewportState = this.getViewportState();
    const orientation = window.screen?.orientation;

    if (!viewportState.shouldShowRotationOverlay || !orientation?.lock) {
      return false;
    }

    try {
      await orientation.lock("landscape");
      return true;
    } catch (error) {
      console.log("📱 Landscape orientation request rejected", error);
      return false;
    }
  }

  isCompactViewport(viewport = {}) {
    return this.getViewportState(viewport).isCompactViewport;
  }

  updateViewportClasses(detected) {
    document.body.classList.remove(
      ...Object.keys(this.resolutions).map((name) => `res-${name}`),
    );
    document.body.classList.remove(...this.viewportStateClasses);
    document.body.classList.add(`res-${detected.name}`);
    document.body.classList.add(
      detected.isCompactViewport ? "viewport-compact" : "viewport-standard",
    );
    document.body.classList.add(
      detected.isPortrait ? "viewport-portrait" : "viewport-landscape",
    );
    document.body.classList.add(
      detected.shouldShowRotationOverlay
        ? "viewport-rotate-required"
        : "viewport-rotate-not-required",
    );
    document.body.classList.toggle(
      "console-compact-clearance",
      detected.isCompactViewport === true,
    );
  }

  syncRotationInputLock(detected) {
    window.GameRuntimeCoordinator?.setInputLock?.(
      "rotation-required",
      detected.shouldShowRotationOverlay,
    );
  }

  syncRotationOverlayAccessibility(detected) {
    const overlay = this.domCache.rotationOverlay;

    if (!(overlay instanceof HTMLElement)) {
      return;
    }

    overlay.setAttribute(
      "aria-hidden",
      String(!detected.shouldShowRotationOverlay),
    );

    if (detected.shouldShowRotationOverlay) {
      overlay.focus({ preventScroll: true });
      return;
    }

    if (document.activeElement !== overlay) {
      return;
    }

    const howToPlayModal = this.domCache.howToPlayModal;
    const briefingVisible =
      howToPlayModal instanceof HTMLElement &&
      window.getComputedStyle(howToPlayModal).display !== "none";
    const focusTarget = briefingVisible
      ? this.domCache.startGameButton
      : this.domCache.helpButton;

    if (focusTarget instanceof HTMLElement) {
      focusTarget.focus({ preventScroll: true });
    }
  }

  detectAndApply() {
    const detected = this.detectResolution();
    this.currentResolution = detected;

    console.log(`📊 ========================================`);
    console.log(`📊 DISPLAY MANAGER - Resolution Detected`);
    console.log(`📊 Resolution: ${detected.name.toUpperCase()}`);
    console.log(`📊 Viewport: ${detected.width}x${detected.height}`);
    console.log(`� Scale: ${detected.config.scale}`);
    console.log(`📊 Base Font Size: ${detected.config.fontSize}`);
    console.log(`📊 ========================================`);

    // Apply shared viewport/body contract
    this.updateViewportClasses(detected);
    this.syncRotationInputLock(detected);
    this.syncRotationOverlayAccessibility(detected);

    // Apply CSS variables for dynamic scaling
    document.documentElement.style.setProperty(
      "--display-scale",
      detected.config.scale,
    );
    document.documentElement.style.setProperty(
      "--display-font-size",
      detected.config.fontSize,
    );
    document.documentElement.style.setProperty(
      "--viewport-width",
      `${detected.width}px`,
    );
    document.documentElement.style.setProperty(
      "--viewport-height",
      `${detected.height}px`,
    );

    // Apply font sizes
    this.applyFontSizes(detected.config);

    // Apply symbol rain adjustments
    this.applySymbolRainAdjustments(detected.config);
    this.queueCompactPanelALayoutSync();

    // Dispatch event for other components
    document.dispatchEvent(
      new CustomEvent(this.gameEvents.DISPLAY_RESOLUTION_CHANGED, {
        detail: detected,
      }),
    );

    // Update resolution indicator
    this.updateResolutionIndicator(detected);
  }

  syncCompactPanelALayout() {
    this.compactPanelALayoutFrameId = null;

    const panelA = this.domCache.panelA;
    const problemContainer = this.domCache.problemContainer;
    if (!(panelA instanceof HTMLElement)) {
      return;
    }

    const isCompactLandscape =
      this.currentResolution?.isCompactViewport === true &&
      this.currentResolution?.isLandscape === true;

    if (!isCompactLandscape || !(problemContainer instanceof HTMLElement)) {
      panelA.style.removeProperty("--compact-panel-a-lock-top");
      return;
    }

    const panelRect = panelA.getBoundingClientRect();
    const problemRect = problemContainer.getBoundingClientRect();
    if (panelRect.height === 0 || problemRect.height === 0) {
      return;
    }

    const lockTop = Math.ceil(problemRect.bottom - panelRect.top + 8);
    panelA.style.setProperty("--compact-panel-a-lock-top", `${lockTop}px`);
  }

  queueCompactPanelALayoutSync() {
    if (this.compactPanelALayoutFrameId !== null) {
      cancelAnimationFrame(this.compactPanelALayoutFrameId);
    }

    this.compactPanelALayoutFrameId = requestAnimationFrame(() => {
      this.compactPanelALayoutFrameId = requestAnimationFrame(() => {
        this.syncCompactPanelALayout();
      });
    });
  }

  applyFontSizes(config) {
    const isMobile = this.currentResolution?.isCompactViewport === true;

    console.log(`📱 Mobile mode: ${isMobile ? "YES" : "NO"}`);

    // PERFORMANCE: Use cached DOM elements
    // Solution container
    const solutionContainer = this.domCache.solutionContainer;
    if (solutionContainer) {
      if (isMobile) {
        solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.30)`;
        solutionContainer.style.lineHeight = "1.2";
        solutionContainer.style.letterSpacing = "0.2px"; // REDUCED: 60% reduction for tighter spacing
        console.log(
          `📱 Solution container font reduced to 30% with 0.2px letter-spacing`,
        );
      } else {
        solutionContainer.style.fontSize = `calc(${config.fontSize} * 0.8)`;
        solutionContainer.style.lineHeight = "1.4";
        // Unified default compact spacing across logic
        solutionContainer.style.letterSpacing = "1px"; 
      }
    }

    // Problem container - DECREASE to 25% on mobile to prevent edge cutoff (37.5% smaller than desktop)
    const problemContainer = this.domCache.problemContainer;
    if (problemContainer) {
      if (isMobile) {
        problemContainer.style.fontSize = `calc(${config.fontSize} * 0.25)`;
        problemContainer.style.letterSpacing = "0.5px"; // REDUCED from 1px to 0.5px (50% reduction)
        console.log(
          `📱 Problem container font reduced to 25% with 0.5px letter-spacing`,
        );
      } else {
        problemContainer.style.fontSize = `calc(${config.fontSize} * 0.8)`;
        problemContainer.style.letterSpacing = "2px";
      }
    }

    // Back button
    const backButton = this.domCache.backButton;
    if (backButton) {
      backButton.style.fontSize = `calc(${config.fontSize} * 0.9)`;
    }

    // Help button
    const helpButton = this.domCache.helpButton;
    if (helpButton) {
      helpButton.style.fontSize = `calc(${config.fontSize} * 0.9)`;
    }
  }

  applySymbolRainAdjustments(config) {
    const isMobile = this.currentResolution?.isCompactViewport === true;
    const isCompactLandscape =
      isMobile && document.body.classList.contains("viewport-landscape");

    // Adjust falling symbol sizes
    const style = document.createElement("style");
    style.id = "dynamic-symbol-style";

    // Remove old style if exists
    const oldStyle = document.getElementById("dynamic-symbol-style");
    if (oldStyle) {
      oldStyle.remove();
    }

    // On mobile: increase falling symbols by 50% (1.5x larger)
    // On desktop: normal size
    const symbolMultiplier = isCompactLandscape ? 1.35 : isMobile ? 1.65 : 1.2;

    style.textContent = `
            .falling-symbol {
                font-size: calc(${config.fontSize} * ${symbolMultiplier}) !important;
            }
        `;

    if (isMobile) {
      console.log(
        `📱 Falling symbols tuned for compact input (multiplier: ${symbolMultiplier})`,
      );
    }

    document.head.appendChild(style);
  }

  showResolutionIndicator() {
    const indicator = document.createElement("div");
    indicator.id = "resolution-indicator";
    indicator.style.cssText = `
            position: fixed;
            bottom: 10px;
            right: 10px;
            background: rgba(0, 255, 0, 0.2);
            border: 2px solid #0f0;
            color: #0f0;
            padding: 10px 15px;
            font-family: 'Orbitron', monospace;
            font-size: 14px;
            font-weight: bold;
            border-radius: 6px;
            z-index: 9999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s;
            box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
            pointer-events: none;
        `;
    indicator.textContent = "DETECTING RESOLUTION...";
    document.body.appendChild(indicator);

    // Keep it hidden but functional
    // Indicator still exists for debugging if needed via console
  }

  updateResolutionIndicator(detected) {
    // PERFORMANCE: Use cached element
    const indicator = this.domCache.resolutionIndicator;
    if (indicator) {
      indicator.textContent = `${detected.name.toUpperCase()} | ${
        detected.width
      }x${detected.height} | SCALE: ${Math.round(
        detected.config.scale * 100,
      )}%`;
      // Keep hidden - functionality preserved for debugging
      console.log(`📺 Resolution Indicator: ${indicator.textContent}`);
    }
  }
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  getCurrentResolution() {
    return this.currentResolution;
  }
}

// Create and export singleton
const displayManager = new DisplayManager();
window.displayManager = displayManager;

console.log("✅ Display Manager loaded");
