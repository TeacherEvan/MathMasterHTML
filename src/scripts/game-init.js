// js/game-init.js - Game initialization and setup
console.log("🎮 Game initialization module loading...");

(function () {
  // Simple error boundary for game initialization
  try {
    const GE = window.GameEvents;
    const problemContainer = document.getElementById("problem-container");
    const solutionContainer = document.getElementById("solution-container");
    const lockDisplay = document.getElementById("lock-display");
    const helpButton = document.getElementById("help-button");
    const clarifyButton = document.getElementById("clarify-button");
    const startGameButton = document.getElementById("start-game-btn");

    const urlParams = new URLSearchParams(window.location.search);
    const requestedLevel = urlParams.get("level");
    const level =
      typeof window.getLevelFromURL === "function"
        ? window.getLevelFromURL()
        : typeof window.normalizeGameLevel === "function"
          ? window.normalizeGameLevel(requestedLevel)
          : requestedLevel === "h2p" ||
              requestedLevel === "beginner" ||
              requestedLevel === "warrior" ||
              requestedLevel === "master"
            ? requestedLevel
            : "beginner";
    const allowedLockComponents = new Set([
      "Line-1-transformer.html",
      "line-2-transformer.html",
      "line-3-transformer.html",
      "line-4-transformer.html",
      "Line-5-transformer.html",
      "line-6-transformer.html",
    ]);
    const requestedLockComponent = urlParams.get("lockComponent");
    const defaultLockComponent =
      window.LazyComponentLoader?.getLockComponentFilename?.(1) ||
      "Line-1-transformer.html";
    const _lockComponent =
      requestedLockComponent &&
      allowedLockComponents.has(requestedLockComponent)
        ? requestedLockComponent
        : defaultLockComponent;
    // Init persistence + timer/score HUD
    if (window.PlayerStorage) {
      window.PlayerStorage.init();
    }
    if (window.ScoreTimerManager) {
      window.ScoreTimerManager.init({ level });
    }

    // Don't start the per-step countdown until shared gameplay readiness is reached.
    if (GE?.GAMEPLAY_READY_CHANGED && window.ScoreTimerManager) {
      document.addEventListener(GE.GAMEPLAY_READY_CHANGED, (event) => {
        const gameplayReadyEvent = /** @type {CustomEvent<{ gameplayReady?: boolean }>} */ (event);
        if (gameplayReadyEvent.detail?.gameplayReady) {
          window.ScoreTimerManager.setGameStarted();
        }
      });

      if (window.GameRuntimeCoordinator?.isGameplayReady?.()) {
        window.ScoreTimerManager.setGameStarted();
      }
    }
    // Mark automation runs (Playwright) to avoid portrait lock overlay
    if (navigator.webdriver) {
      document.body.classList.add("automation");
      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock("landscape").catch(() => {});
      }
    }

    // Apply level theme to body without wiping other classes
    document.body.classList.remove(
      "level-h2p",
      "level-beginner",
      "level-warrior",
      "level-master",
    );
    document.body.classList.add(`level-${level}`);

    // Export initialization data for other modules
    window.GameInit = {
      problemContainer,
      solutionContainer,
      lockDisplay,
      helpButton,
      clarifyButton,
      startGameButton,
      level,
      _lockComponent,
    };

    console.log("✅ Game initialization complete");

    // Fail-fast: verify critical globals exist after a short delay (scripts load async)
    setTimeout(() => {
      const requiredGlobals = ["WormSystem", "GameProblemManager"];
      const missing = requiredGlobals.filter((name) => !window[name]);
      if (missing.length > 0) {
        console.error(
          `🎮 BOOT_FAIL: Missing required globals: ${missing.join(", ")}`,
        );
      }
    }, 2000);
  } catch (error) {
    console.error("❌ Game initialization failed:", error);
    // Show user-friendly error message
    const errorMsg = document.createElement("div");
    errorMsg.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      font-family: 'Orbitron', monospace;
      text-align: center;
      z-index: 10000;
    `;
    // Use static HTML for structure only; inject dynamic text safely
    errorMsg.innerHTML = `
      <h2>Game Loading Error</h2>
      <p>Please refresh the page to try again.</p>
    `;
    const errorContainer = document.body || document.documentElement;
    if (errorContainer) {
      errorContainer.appendChild(errorMsg);
    }

    const errorDetail = document.createElement("div");
    errorDetail.style.cssText = "font-size: 0.8em; opacity: 0.7;";
    errorDetail.textContent = error?.message || "An unknown error occurred.";
    errorMsg.appendChild(errorDetail);
  }
})();
