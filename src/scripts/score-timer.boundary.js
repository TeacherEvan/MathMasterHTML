(function () {
  function buildHudConstraints(element, padding = {}) {
    if (!element || !element.isConnected) {
      return null;
    }

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    const horizontalPadding = padding.horizontal ?? 8;
    const verticalPadding = padding.vertical ?? 6;

    return {
      minX: Math.max(0, Math.floor(rect.left - horizontalPadding)),
      maxX: Math.min(
        window.innerWidth,
        Math.ceil(rect.right + horizontalPadding),
      ),
      minY: Math.max(0, Math.floor(rect.top - verticalPadding)),
      maxY: Math.min(
        window.innerHeight,
        Math.ceil(rect.bottom + verticalPadding),
      ),
    };
  }

  function registerOrUpdateHudElement(id, element, priority = 10) {
    if (!window.uiBoundaryManager || !element) {
      return;
    }

    const registration = {
      zone: null,
      priority,
      fixed: true,
      constraints: buildHudConstraints(element),
    };

    if (window.uiBoundaryManager.elements?.has?.(id)) {
      window.uiBoundaryManager.updateRegistration(id, {
        ...registration,
        element,
        resetOriginalPosition: true,
      });
      return;
    }

    window.uiBoundaryManager.register(id, element, registration);
  }

  function registerHudElements(scoreDisplay, timerDisplay) {
    if (!window.uiBoundaryManager) {
      console.log("⏱️ UIBoundaryManager not available, skipping registration");
      return;
    }

    const refreshHudRegistrations = () => {
      registerOrUpdateHudElement("score-display", scoreDisplay, 10);
      registerOrUpdateHudElement("timer-display", timerDisplay, 10);
    };

    const scheduleHudRefresh = () => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          refreshHudRegistrations();
        });
      });
    };

    scheduleHudRefresh();

    if (!window.ScoreTimerModules?._hudBoundaryRefreshHandler) {
      window.ScoreTimerModules = window.ScoreTimerModules || {};
      window.ScoreTimerModules._hudBoundaryRefreshHandler = () => {
        window.requestAnimationFrame(() => {
          const scoreEl = document.getElementById("score-display");
          const timerEl = document.getElementById("timer-display");
          registerOrUpdateHudElement("score-display", scoreEl, 10);
          registerOrUpdateHudElement("timer-display", timerEl, 10);
        });
      };
      window.addEventListener(
        "resize",
        window.ScoreTimerModules._hudBoundaryRefreshHandler,
      );
      window.addEventListener(
        "orientationchange",
        window.ScoreTimerModules._hudBoundaryRefreshHandler,
      );
    }

    console.log("⏱️ HUD elements registered with UIBoundaryManager");
  }

  window.ScoreTimerModules = window.ScoreTimerModules || {};
  window.ScoreTimerModules.registerHudElements = registerHudElements;
})();
