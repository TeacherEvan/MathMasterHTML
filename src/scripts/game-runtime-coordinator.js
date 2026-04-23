(function () {
  const GE = window.GameEvents;

  const state = {
    preloadComplete: false,
    preloadReason: null,
    briefingDismissed: false,
    gameplayContentReady: false,
    gameplayReady: false,
    inputLocks: {},
    inputLocked: false,
  };

  function cloneState() {
    return {
      preloadComplete: state.preloadComplete,
      preloadReason: state.preloadReason,
      briefingDismissed: state.briefingDismissed,
      gameplayContentReady: state.gameplayContentReady,
      gameplayReady: state.gameplayReady,
      inputLocks: { ...state.inputLocks },
      inputLocked: state.inputLocked,
    };
  }

  function dispatch(name) {
    if (!name) {
      return;
    }

    document.dispatchEvent(new CustomEvent(name, { detail: cloneState() }));
  }

  function dispatchDeferred(name, detail) {
    if (!name) {
      return;
    }

    queueMicrotask(() => {
      document.dispatchEvent(new CustomEvent(name, { detail }));
    });
  }

  function recomputeDerivedState() {
    const nextInputLocked = Object.values(state.inputLocks).some(Boolean);
    const nextGameplayReady =
      state.preloadComplete &&
      state.briefingDismissed &&
      state.gameplayContentReady;
    const gameplayReadyChanged = nextGameplayReady !== state.gameplayReady;

    state.inputLocked = nextInputLocked;
    state.gameplayReady = nextGameplayReady;

    if (gameplayReadyChanged) {
      dispatchDeferred(GE?.GAMEPLAY_READY_CHANGED, cloneState());
    }
  }

  function markPreloadComplete(reason = "complete") {
    if (state.preloadComplete) {
      return cloneState();
    }

    state.preloadComplete = true;
    state.preloadReason = reason;
    recomputeDerivedState();
    return cloneState();
  }

  function markBriefingDismissed() {
    if (state.briefingDismissed) {
      return cloneState();
    }

    state.briefingDismissed = true;
    recomputeDerivedState();
    return cloneState();
  }

  function markGameplayContentReady(ready = true) {
    const nextReady = Boolean(ready);
    if (state.gameplayContentReady === nextReady) {
      return cloneState();
    }

    state.gameplayContentReady = nextReady;
    recomputeDerivedState();
    return cloneState();
  }

  function setInputLock(source, locked) {
    if (!source) {
      return cloneState();
    }

    const nextLocked = Boolean(locked);
    const previousLocked = Boolean(state.inputLocks[source]);

    if (nextLocked) {
      state.inputLocks[source] = true;
    } else {
      delete state.inputLocks[source];
    }

    recomputeDerivedState();

    if (previousLocked !== nextLocked) {
      dispatch(GE?.GAMEPLAY_INPUT_LOCK_CHANGED);
    }

    return cloneState();
  }

  document.addEventListener(GE?.STARTUP_PRELOAD_COMPLETE, (event) => {
    markPreloadComplete(event.detail?.reason || "complete");
  });

  document.addEventListener(GE?.BRIEFING_DISMISSED, () => {
    markBriefingDismissed();
  });

  window.GameRuntimeCoordinator = {
    getState: cloneState,
    isGameplayReady: () => state.gameplayReady,
    canAcceptGameplayInput: () => state.gameplayReady && !state.inputLocked,
    markPreloadComplete,
    markBriefingDismissed,
    markGameplayContentReady,
    setInputLock,
  };
})();
