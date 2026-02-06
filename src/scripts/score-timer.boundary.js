(function() {
  function registerHudElements(scoreDisplay, timerDisplay) {
    if (!window.uiBoundaryManager) {
      console.log("⏱️ UIBoundaryManager not available, skipping registration");
      return;
    }

    if (scoreDisplay) {
      window.uiBoundaryManager.register("score-display", scoreDisplay, {
        zone: "top-left",
        priority: 10,
        fixed: true,
        constraints: {
          minX: 0,
          maxX: window.innerWidth * 0.33,
          minY: 0,
          maxY: 100,
        },
      });
    }

    if (timerDisplay) {
      window.uiBoundaryManager.register("timer-display", timerDisplay, {
        zone: "top-right",
        priority: 10,
        fixed: true,
        constraints: {
          minX: window.innerWidth * 0.67,
          maxX: window.innerWidth,
          minY: 0,
          maxY: 100,
        },
      });
    }

    console.log("⏱️ HUD elements registered with UIBoundaryManager");
  }

  window.ScoreTimerModules = window.ScoreTimerModules || {};
  window.ScoreTimerModules.registerHudElements = registerHudElements;
})();
