// js/game-init.js - Game initialization and setup
console.log("🎮 Game initialization module loading...");

(function() {
  // Simple error boundary for game initialization
  try {
    const problemContainer = document.getElementById("problem-container");
    const solutionContainer = document.getElementById("solution-container");
    const lockDisplay = document.getElementById("lock-display");
    const helpButton = document.getElementById("help-button");
    const clarifyButton = document.getElementById("clarify-button");
    const startGameButton = document.getElementById("start-game-btn");

    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const level = urlParams.get("level") || "beginner";
    const _lockComponent =
      urlParams.get("lockComponent") || "level-1-transformer.html";
    // Init persistence + timer/score HUD
    if (window.PlayerStorage) {
      window.PlayerStorage.init();
    }
    if (window.ScoreTimerManager) {
      window.ScoreTimerManager.init({ level });
    }

    // Don't start the per-step countdown behind the How-To-Play modal
    if (startGameButton && window.ScoreTimerManager) {
      startGameButton.addEventListener("click", () => {
        // game.html uses a ~300ms fade-out; increase buffer to ensure modal is gone
        setTimeout(() => {
          window.ScoreTimerManager.setGameStarted();
        }, 500);
      });
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
