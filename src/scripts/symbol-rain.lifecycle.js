(function () {
  const PHASES = {
    CREATED: "created",
    WAITING_GAMEPLAY: "waiting-gameplay",
    WAITING_LAYOUT: "waiting-layout",
    STARTING: "starting",
    RUNNING: "running",
    STOPPING: "stopping",
    STOPPED: "stopped",
    FAILED: "failed",
  };

  const MAX_LAYOUT_RETRIES = 24;
  const LAYOUT_RETRY_DELAY_MS = 80;
  const GAMEPLAY_READY_RETRY_INITIAL_MS = 80;
  const GAMEPLAY_READY_RETRY_MAX_MS = 1000;

  function noop() {}

  function createMachine(state, deps = {}) {
    const runtimeWindow = deps.window || window;
    const runtimeDocument = deps.document || document;
    const gameEvents = deps.GameEvents || runtimeWindow.GameEvents || {};
    const gameplayReadyEvent = gameEvents.GAMEPLAY_READY_CHANGED;
    const requestAnimationFrameFn =
      deps.requestAnimationFrame ||
      runtimeWindow.requestAnimationFrame?.bind(runtimeWindow) ||
      ((callback) => runtimeWindow.setTimeout(callback, 16));
    const cancelAnimationFrameFn =
      deps.cancelAnimationFrame ||
      runtimeWindow.cancelAnimationFrame?.bind(runtimeWindow) ||
      runtimeWindow.clearTimeout?.bind(runtimeWindow);
    const setTimeoutFn =
      deps.setTimeout || runtimeWindow.setTimeout.bind(runtimeWindow);
    const clearTimeoutFn =
      deps.clearTimeout || runtimeWindow.clearTimeout.bind(runtimeWindow);
    const isGameplayReady = deps.isGameplayReady || (() => false);
    const refreshLayoutMetrics = deps.refreshLayoutMetrics || (() => false);
    const hasUsableLayout = deps.hasUsableLayout || (() => false);
    const syncResponsiveConfig = deps.syncResponsiveConfig || noop;
    const startControllers = deps.startControllers || noop;
    const stopControllers = deps.stopControllers || noop;
    const populateInitialSymbols = deps.populateInitialSymbols || noop;
    const onFailure = deps.onFailure || noop;

    let startRequested = false;
    let destroyed = false;
    let initialPopulationStarted = state.isInitialPopulation !== true;
    let bootstrapFrameId = null;
    let layoutRetryId = null;
    let gameplayReadyRetryId = null;
    let gameplayReadyRetryDelayMs = GAMEPLAY_READY_RETRY_INITIAL_MS;
    let observedGameplayReady = isGameplayReady();

    state.lifecyclePhase = state.lifecyclePhase || PHASES.CREATED;
    state.layoutRetryCount = state.layoutRetryCount || 0;

    function setPhase(phase) {
      state.lifecyclePhase = phase;
    }

    function clearBootstrapFrame() {
      if (bootstrapFrameId === null) {
        return;
      }

      cancelAnimationFrameFn(bootstrapFrameId);
      bootstrapFrameId = null;
    }

    function clearLayoutRetry() {
      if (layoutRetryId !== null) {
        clearTimeoutFn(layoutRetryId);
        layoutRetryId = null;
      }
    }

    function clearGameplayReadyRetry() {
      if (gameplayReadyRetryId !== null) {
        clearTimeoutFn(gameplayReadyRetryId);
        gameplayReadyRetryId = null;
      }

      gameplayReadyRetryDelayMs = GAMEPLAY_READY_RETRY_INITIAL_MS;
    }

    function clearTimers() {
      clearBootstrapFrame();
      clearLayoutRetry();
      clearGameplayReadyRetry();
    }

    function hasSpeedControllerState() {
      return Object.prototype.hasOwnProperty.call(state, "speedControllerId");
    }

    function areControllersStarted() {
      if (state.isAnimationRunning !== true) {
        return false;
      }

      return !hasSpeedControllerState() || state.speedControllerId != null;
    }

    function createInitialPopulationToken() {
      const token = {
        cancelled: false,
        timeoutIds: [],
      };
      state.initialPopulationToken = token;
      return token;
    }

    function cancelInitialPopulation() {
      const token = state.initialPopulationToken;
      if (!token) {
        return;
      }

      token.cancelled = true;

      if (Array.isArray(token.timeoutIds)) {
        token.timeoutIds.forEach((timeoutId) => clearTimeoutFn(timeoutId));
        token.timeoutIds.length = 0;
      }

      if (state.initialPopulationToken === token) {
        state.initialPopulationToken = null;
      }
    }

    function hasGameplayReadiness() {
      observedGameplayReady = isGameplayReady() === true;
      return observedGameplayReady;
    }

    function fail(reason) {
      clearTimers();
      setPhase(PHASES.FAILED);
      onFailure(reason);
    }

    function scheduleGameplayReadyRetry() {
      if (gameplayReadyRetryId !== null || destroyed || !startRequested) {
        return;
      }

      const retryDelay = gameplayReadyRetryDelayMs;
      gameplayReadyRetryId = setTimeoutFn(() => {
        gameplayReadyRetryId = null;

        if (!startRequested || destroyed) {
          return;
        }

        if (hasGameplayReadiness()) {
          gameplayReadyRetryDelayMs = GAMEPLAY_READY_RETRY_INITIAL_MS;
          advance("gameplay-ready-retry");
          return;
        }

        gameplayReadyRetryDelayMs = Math.min(
          GAMEPLAY_READY_RETRY_MAX_MS,
          Math.round(retryDelay * 1.5),
        );
        scheduleGameplayReadyRetry();
      }, retryDelay);
    }

    function scheduleLayoutRetry(reason) {
      if (destroyed || !startRequested || layoutRetryId !== null) {
        return;
      }

      if (state.layoutRetryCount >= MAX_LAYOUT_RETRIES) {
        fail(reason || "layout-unavailable");
        return;
      }

      state.layoutRetryCount += 1;
      layoutRetryId = setTimeoutFn(() => {
        layoutRetryId = null;
        advance("layout-retry");
      }, LAYOUT_RETRY_DELAY_MS);
    }

    function finishStart() {
      clearTimers();
      state.layoutRetryCount = 0;
      setPhase(PHASES.STARTING);

      if (!areControllersStarted()) {
        startControllers();
      }

      if (
        !initialPopulationStarted &&
        state.isInitialPopulation &&
        state.activeFallingSymbols.length === 0
      ) {
        initialPopulationStarted = true;
        populateInitialSymbols(createInitialPopulationToken());
      }

      setPhase(PHASES.RUNNING);
    }

    function attemptStart(reason, options = {}) {
      bootstrapFrameId = null;

      if (
        !startRequested ||
        destroyed ||
        (state.lifecyclePhase === PHASES.FAILED && !options.allowFailedRecovery)
      ) {
        return;
      }

      if (!hasGameplayReadiness()) {
        setPhase(PHASES.WAITING_GAMEPLAY);
        scheduleGameplayReadyRetry();
        return;
      }

      clearGameplayReadyRetry();
      syncResponsiveConfig();
      refreshLayoutMetrics(true);

      if (!hasUsableLayout()) {
        setPhase(PHASES.WAITING_LAYOUT);
        scheduleLayoutRetry(reason || "layout-unavailable");
        return;
      }

      finishStart();
    }

    function advance(reason, options = {}) {
      if (
        !startRequested ||
        destroyed ||
        (state.lifecyclePhase === PHASES.FAILED && !options.allowFailedRecovery)
      ) {
        return;
      }

      if (state.lifecyclePhase === PHASES.RUNNING && state.isAnimationRunning) {
        return;
      }

      if (bootstrapFrameId !== null) {
        return;
      }

      bootstrapFrameId = requestAnimationFrameFn(() =>
        attemptStart(reason, options),
      );
    }

    function requestStart(reason = "request") {
      if (destroyed) {
        return getSnapshot();
      }

      startRequested = true;

      if (state.lifecyclePhase === PHASES.FAILED) {
        syncResponsiveConfig();
        refreshLayoutMetrics(true);

        if (!hasUsableLayout()) {
          return getSnapshot();
        }

        state.layoutRetryCount = 0;
        setPhase(PHASES.WAITING_LAYOUT);
        advance(reason, { allowFailedRecovery: true });
        return getSnapshot();
      }

      advance(reason);
      return getSnapshot();
    }

    function onGameplayReadyChanged(detail = {}) {
      if (!startRequested || destroyed) {
        return getSnapshot();
      }

      if (detail.gameplayReady === true) {
        observedGameplayReady = true;
      }

      if (detail.gameplayReady === false && !isGameplayReady()) {
        observedGameplayReady = false;
      }

      if (
        state.lifecyclePhase === PHASES.RUNNING &&
        state.isAnimationRunning === true
      ) {
        return getSnapshot();
      }

      if (!hasGameplayReadiness()) {
        setPhase(PHASES.WAITING_GAMEPLAY);
        scheduleGameplayReadyRetry();
        return getSnapshot();
      }

      clearGameplayReadyRetry();
      advance("gameplay-ready-event");
      return getSnapshot();
    }

    function onLayoutChanged(reason = "layout-changed") {
      if (destroyed) {
        return getSnapshot();
      }

      const recoveringFromFailed = state.lifecyclePhase === PHASES.FAILED;
      syncResponsiveConfig();
      const layoutChanged = refreshLayoutMetrics(false);

      if (!startRequested) {
        return getSnapshot();
      }

      if (state.lifecyclePhase === PHASES.RUNNING && state.isAnimationRunning) {
        if (layoutChanged && state.isInitialPopulation) {
          advance(reason);
        }
        return getSnapshot();
      }

      if (!hasUsableLayout()) {
        if (recoveringFromFailed) {
          state.layoutRetryCount = 0;
        }

        setPhase(PHASES.WAITING_LAYOUT);
        scheduleLayoutRetry(reason);
        return getSnapshot();
      }

      if (recoveringFromFailed) {
        state.layoutRetryCount = 0;
        setPhase(PHASES.WAITING_LAYOUT);
      }

      advance(reason, { allowFailedRecovery: recoveringFromFailed });
      return getSnapshot();
    }

    function stop(reason = "stop") {
      if (destroyed || state.lifecyclePhase === PHASES.STOPPED) {
        return getSnapshot();
      }

      startRequested = false;
      clearTimers();
      cancelInitialPopulation();

      if (state.isInitialPopulation === true) {
        initialPopulationStarted = false;
      }

      setPhase(PHASES.STOPPING);
      stopControllers(reason);
      setPhase(PHASES.STOPPED);
      return getSnapshot();
    }

    function destroy(reason = "destroy") {
      if (destroyed) {
        return getSnapshot();
      }

      stop(reason);
      destroyed = true;

      if (runtimeDocument?.removeEventListener && gameplayReadyEvent) {
        runtimeDocument.removeEventListener(
          gameplayReadyEvent,
          handleGameplayReadyEvent,
        );
      }

      return getSnapshot();
    }

    function getSnapshot() {
      return {
        phase: state.lifecyclePhase,
        startRequested,
        controllersStarted: areControllersStarted(),
        initialPopulationStarted,
        layoutRetryCount: state.layoutRetryCount,
        gameplayReady: hasGameplayReadiness(),
        hasUsableLayout: hasUsableLayout(),
        isAnimationRunning: state.isAnimationRunning === true,
        activeFallingSymbols: state.activeFallingSymbols?.length || 0,
      };
    }

    function handleGameplayReadyEvent(event) {
      onGameplayReadyChanged(event.detail || {});
    }

    if (runtimeDocument?.addEventListener && gameplayReadyEvent) {
      runtimeDocument.addEventListener(
        gameplayReadyEvent,
        handleGameplayReadyEvent,
      );
    }

    return {
      requestStart,
      onGameplayReadyChanged,
      onLayoutChanged,
      stop,
      destroy,
      getSnapshot,
    };
  }

  window.SymbolRainLifecycle = {
    PHASES,
    createMachine,
  };
})();
