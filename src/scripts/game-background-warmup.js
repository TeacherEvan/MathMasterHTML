(function () {
  const LEVELS = ["beginner", "warrior", "master"];
  const GE = window.GameEvents;

  const state = {
    started: false,
    completed: false,
    currentLevel: null,
    queuedLevels: [],
    warmedLevels: [],
  };

  function cloneState() {
    return {
      started: state.started,
      completed: state.completed,
      currentLevel: state.currentLevel,
      queuedLevels: [...state.queuedLevels],
      warmedLevels: [...state.warmedLevels],
    };
  }

  function getCurrentLevel() {
    return window.getLevelFromURL?.() || "beginner";
  }

  function getInactiveLevels() {
    const currentLevel = getCurrentLevel();
    return LEVELS.filter((level) => level !== currentLevel);
  }

  function yieldToBrowser() {
    if (window.scheduler?.yield) {
      return window.scheduler.yield();
    }

    return new Promise((resolve) => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(() => resolve(), { timeout: 800 });
      } else {
        setTimeout(resolve, 40);
      }
    });
  }

  async function warmProblemSets() {
    const ProblemLoader = window.ProblemLoader;
    if (typeof ProblemLoader !== "function") {
      state.completed = true;
      return;
    }

    const loader = new ProblemLoader();

    for (const level of state.queuedLevels) {
      const problemPath = loader.getProblemPath(level);

      try {
        await fetch(problemPath, { cache: "force-cache" });
        state.warmedLevels.push(level);
      } catch (error) {
        console.warn(`Background warmup skipped for ${level}:`, error);
      }

      await yieldToBrowser();
    }

    state.completed = true;
  }

  function startWarmup() {
    if (state.started) {
      return;
    }

    state.started = true;
    state.currentLevel = getCurrentLevel();
    state.queuedLevels = getInactiveLevels();
    window.deferExecution?.(() => {
      warmProblemSets();
    });
  }

  if (window.GameRuntimeCoordinator?.isGameplayReady?.()) {
    startWarmup();
  } else if (GE?.GAMEPLAY_READY_CHANGED) {
    document.addEventListener(
      GE.GAMEPLAY_READY_CHANGED,
      (event) => {
        if (event.detail?.gameplayReady) {
          startWarmup();
        }
      },
      { once: true },
    );
  }

  window.GameBackgroundWarmup = {
    getState: cloneState,
    start: startWarmup,
  };
})();