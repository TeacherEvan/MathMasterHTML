(function() {
  const modules = window.ScoreTimerModules || {};

  function getRemainingMs(manager) {
    const elapsed = Date.now() - manager._stepStartMs;
    return Math.max(0, manager._stepDurationMs - elapsed);
  }

  function setDisplayedTime(manager, seconds) {
    if (manager._timerValueEl) {
      manager._timerValueEl.textContent = String(Math.max(0, seconds));
    }
  }

  function setDisplayedScore(manager, score) {
    if (manager._scoreValueEl) {
      manager._scoreValueEl.textContent = String(
        Math.max(0, Math.round(score)),
      );
    }
  }

  function clearIntervalId(manager) {
    if (!manager._intervalId) return;
    if (window.ResourceManager) {
      ResourceManager.clearInterval(manager._intervalId);
    } else {
      clearInterval(manager._intervalId);
    }
    manager._intervalId = null;
  }

  function update(manager) {
    if (manager._paused || manager._zeroLocked) {
      console.log(
        "⏱️ _update() returning early - _paused:",
        manager._paused,
        "_zeroLocked:",
        manager._zeroLocked,
      );
      return;
    }

    const remainingMs = getRemainingMs(manager);
    const remainingSeconds = Math.ceil(remainingMs / 1000);

    if (remainingMs % 1000 < 150) {
      console.log(
        "⏱️ Timer tick:",
        remainingSeconds,
        "s, score:",
        manager._currentStepScore,
      );
    }

    const ratio =
      manager._stepDurationMs > 0 ? remainingMs / manager._stepDurationMs : 0;
    const computed = Math.round(manager._scoreAtStepStart * ratio);
    manager._currentStepScore = Math.max(0, computed);

    setDisplayedTime(manager, remainingSeconds);
    setDisplayedScore(manager, manager.getDisplayedScore());
    if (modules.applyPhaseStyles) {
      modules.applyPhaseStyles(
        manager._timerDisplayEl,
        remainingSeconds,
        manager._cfg,
      );
    }

    if (remainingMs <= 0) {
      clearIntervalId(manager);
      manager._bankedProblemScore = 0;
      manager._currentStepScore = 0;
      manager._zeroLocked = true;
      setDisplayedScore(manager, 0);
      document.dispatchEvent(new CustomEvent("timerExpired"));
    }
  }

  function startStep(manager) {
    console.log(
      "⏱️ startStep() called - _paused:",
      manager._paused,
      "_zeroLocked:",
      manager._zeroLocked,
      "_gameStarted:",
      manager._gameStarted,
      "timestamp:",
      Date.now(),
    );
    if (manager._paused || manager._zeroLocked) {
      console.log("⏱️ startStep() returning early due to paused/zeroLocked");
      return;
    }

    manager._stepStartMs = Date.now();
    manager._scoreAtStepStart = manager._cfg.initialScore;

    clearIntervalId(manager);

    const tick = () => update(manager);

    if (window.ResourceManager) {
      manager._intervalId = ResourceManager.setInterval(tick, 100);
      console.log(
        "⏱️ Interval created via ResourceManager, ID:",
        manager._intervalId,
      );
    } else {
      manager._intervalId = setInterval(tick, 100);
      console.log(
        "⏱️ Interval created via native setInterval, ID:",
        manager._intervalId,
      );
    }

    update(manager);
  }

  function pause(manager) {
    manager._paused = true;
    clearIntervalId(manager);
  }

  function resume(manager) {
    if (!manager._paused) return;
    manager._paused = false;
    const remainingMs = getRemainingMs(manager);
    manager._stepStartMs = Date.now() - (manager._stepDurationMs - remainingMs);
    startStep(manager);
  }

  window.ScoreTimerModules = window.ScoreTimerModules || {};
  window.ScoreTimerModules.startStep = startStep;
  window.ScoreTimerModules.pause = pause;
  window.ScoreTimerModules.resume = resume;
  window.ScoreTimerModules.setDisplayedTime = setDisplayedTime;
  window.ScoreTimerModules.setDisplayedScore = setDisplayedScore;
  window.ScoreTimerModules.getRemainingMs = getRemainingMs;
  window.ScoreTimerModules.update = update;
  window.ScoreTimerModules.clearIntervalId = clearIntervalId;
})();
