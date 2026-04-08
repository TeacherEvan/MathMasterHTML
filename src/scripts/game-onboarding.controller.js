(function () {
  const GE = window.GameEvents;
  const storage = window.GameOnboardingStorage;
  const bootstrap = window.GameOnboarding;

  if (!GE || !storage || !bootstrap) {
    console.warn("Onboarding controller: missing dependencies, skipping.");
    window.GameOnboardingController = { onBriefingDismissed: () => {} };
    return;
  }

  const level = bootstrap.level;
  let currentMode = null;
  let helpActive = false;
  let gameplayReadyHandled = false;

  function shouldAutoRun() {
    return storage.shouldAutoRunEvan(level, bootstrap.evanMode);
  }

  function onBriefingDismissed() {
    if (shouldAutoRun()) {
      startEvanHelp("auto");
    } else if (storage.getState().evanConsumed[level]) {
      window.EvanPresenter?.showSolve?.();
    } else {
      window.EvanPresenter?.hideSolve?.();
    }
  }

  function onGameplayReady() {
    if (gameplayReadyHandled) return;
    gameplayReadyHandled = true;
    onBriefingDismissed();
  }

  function startEvanHelp(mode) {
    if (helpActive) return;
    helpActive = true;
    currentMode = mode;
    window.EvanPresenter?.hideSolve?.();
    document.dispatchEvent(
      new CustomEvent(GE.EVAN_HELP_STARTED, {
        detail: { mode, level },
      }),
    );
  }

  function stopEvanHelp(reason) {
    if (!helpActive) return;
    helpActive = false;
    const mode = currentMode;
    currentMode = null;
    document.dispatchEvent(
      new CustomEvent(GE.EVAN_HELP_STOPPED, {
        detail: { reason, mode, level },
      }),
    );
  }

  const skipBtn = document.getElementById("evan-skip-button");
  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      stopEvanHelp("skip");
    });
  }

  const stopBtn = document.getElementById("evan-stop-button");
  if (stopBtn) {
    stopBtn.addEventListener("click", () => {
      stopEvanHelp("manual-stop");
    });
  }

  const solveBtn = document.getElementById("evan-solve-button");
  if (solveBtn) {
    solveBtn.addEventListener("click", () => {
      startEvanHelp("manual");
    });
  }

  document.addEventListener(GE.EVAN_HELP_STARTED, (event) => {
    if (event.detail?.mode === "manual") {
      window.EvanPresenter?.hideSkip?.();
      window.EvanPresenter?.showStop?.();
      return;
    }

    window.EvanPresenter?.hideStop?.();
  });

  document.addEventListener(GE.EVAN_HELP_STOPPED, (event) => {
    const reason = event.detail?.reason || "manual-stop";
    const mode = event.detail?.mode;

    if (mode === "auto" && !storage.getState().evanConsumed[level]) {
      storage.markEvanConsumed(level, reason);
    }

    if (storage.getState().evanConsumed[level]) {
      window.EvanPresenter?.showSolve?.();
    }
  });

  document.addEventListener(GE.PROBLEM_COMPLETED, () => {
    if (helpActive) {
      stopEvanHelp("completed");
    }
  });

  document.addEventListener(GE.GAMEPLAY_READY_CHANGED, (event) => {
    if (!event.detail?.gameplayReady) {
      return;
    }

    onGameplayReady();
  });

  if (window.GameRuntimeCoordinator?.isGameplayReady?.()) {
    onGameplayReady();
  }

  window.GameOnboardingController = {
    onBriefingDismissed: () => {
      document.dispatchEvent(new CustomEvent(GE.BRIEFING_DISMISSED));
    },
  };
})();
