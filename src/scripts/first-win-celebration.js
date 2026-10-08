// js/first-win-celebration.js - First win celebration modal
console.log("🎉 FirstWinCelebration loading...");

(function() {
  const STORAGE_KEY = "mathmaster_first_win_v1";

  function hasSeenFirstWin() {
    return localStorage.getItem(STORAGE_KEY) === "true";
  }

  function markFirstWinSeen() {
    localStorage.setItem(STORAGE_KEY, "true");
  }

  function createCelebrationModal() {
    const modal = document.createElement("div");
    modal.id = "first-win-modal";
    modal.className = "first-win-modal modal-overlay";
    modal.style.display = "none";
    modal.setAttribute("aria-hidden", "true");
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "first-win-title");

    modal.innerHTML = `
      <div class="first-win-content modal-content" role="document">
        <div class="first-win-emoji" aria-hidden="true">🎉</div>
        <h2 id="first-win-title">First Equation Solved!</h2>
        <p class="first-win-message">
          You've unlocked your first chain. The symbols are responding.
        </p>
        <div class="first-win-stats">
          <div class="first-win-stat">
            <span class="first-win-stat-value" id="first-win-score">0</span>
            <span class="first-win-stat-label">Score</span>
          </div>
          <div class="first-win-stat">
            <span class="first-win-stat-value" id="first-win-time">0s</span>
            <span class="first-win-stat-label">Time</span>
          </div>
        </div>
        <button id="first-win-continue" class="first-win-button" type="button">
          Continue Calibration
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    return modal;
  }

  function showFirstWinCelebration(score, timeRemaining) {
    if (hasSeenFirstWin()) return;

    let modal = document.getElementById("first-win-modal");
    if (!modal) {
      modal = createCelebrationModal();
    }

    // Update stats
    const scoreEl = modal.querySelector("#first-win-score");
    const timeEl = modal.querySelector("#first-win-time");
    if (scoreEl) scoreEl.textContent = score.toLocaleString();
    if (timeEl) timeEl.textContent = `${timeRemaining}s`;

    // Show modal
    modal.style.display = "flex";
    modal.setAttribute("aria-hidden", "false");

    // Focus trap
    const continueBtn = modal.querySelector("#first-win-continue");
    if (continueBtn) {
      continueBtn.focus();
    }

    // Haptic + screen shake
    window.HapticFeedback?.HapticEvents?.celebration?.();
    window.ScreenShake?.shakePreset?.("celebration");

    // Confetti effect
    spawnConfetti();

    // Auto-dismiss after 5 seconds or on button click
    let dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      modal.style.display = "none";
      modal.setAttribute("aria-hidden", "true");
      markFirstWinSeen();
      // Return focus to game
      const helpBtn = document.getElementById("help-button");
      if (helpBtn) helpBtn.focus({ preventScroll: true });
    }

    continueBtn?.addEventListener("click", dismiss, { once: true });
    modal?.addEventListener("click", (e) => {
      if (e.target === modal) dismiss();
    });

    setTimeout(dismiss, 5000);
  }

  function spawnConfetti() {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const colors = ["#00ff00", "#00bfff", "#ff00ff", "#ffb347", "#e96bff"];
    const count = 30;

    for (let i = 0; i < count; i++) {
      const confetti = document.createElement("div");
      confetti.className = "first-win-confetti";
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = `${Math.random() * 0.5}s`;
      confetti.style.animationDuration = `${2 + Math.random() * 1.5}s`;
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }
  }

  // Listen for first problem completion
  document.addEventListener("problemCompleted", (event) => {
    const detail = event?.detail || {};
    // Check if this is the first problem ever completed
    if (!hasSeenFirstWin() && window.PlayerStorage) {
      const profile = window.PlayerStorage.getProfile();
      const totalProblems = profile?.overall?.problemsCompleted || 0;
      if (totalProblems === 1) {
        const score = detail.score || 0;
        const timeRemaining = detail.timeRemaining || 600;
        // Small delay to let problem completion animation finish
        setTimeout(() => showFirstWinCelebration(score, timeRemaining), 1000);
      }
    }
  });

  window.FirstWinCelebration = {
    showFirstWinCelebration,
    hasSeenFirstWin,
    markFirstWinSeen,
  };

  console.log("✅ FirstWinCelebration loaded");
})();