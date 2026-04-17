(function () {
  const GE = window.GameEvents;
  const backButton = document.getElementById("back-button");
  const preloadSafetyTimeoutMs = Number(
    window.__STARTUP_PRELOAD_SAFETY_TIMEOUT_MS,
  );
  const resolvedPreloadSafetyTimeoutMs =
    Number.isFinite(preloadSafetyTimeoutMs) && preloadSafetyTimeoutMs > 0
      ? preloadSafetyTimeoutMs
      : 8000;
  let briefingFocusCleanup = null;
  let briefingStartRequested = false;

  function canLeaveActiveGameplay() {
    const runtimeState = window.GameRuntimeCoordinator?.getState?.();
    if (!runtimeState) {
      return true;
    }

    const activelyPlaying =
      runtimeState.briefingDismissed === true &&
      runtimeState.gameplayReady === true;

    const completed = document.body.classList.contains("problem-completed");
    return !activelyPlaying || completed;
  }

  function syncBackButtonState() {
    const canLeave = canLeaveActiveGameplay();
    if (backButton) {
      backButton.dataset.exitGuard = canLeave ? "ready" : "blocked";
      backButton.setAttribute(
        "aria-label",
        canLeave
          ? "Go back to level selection"
          : "Go back to level selection unavailable until the current problem is complete",
      );
    }
    return canLeave;
  }

  function goBack(event) {
    if (
      event?.type === "pointerup" &&
      typeof event.button === "number" &&
      event.button !== 0
    ) {
      return;
    }

    if (!syncBackButtonState()) {
      event?.preventDefault?.();
      return;
    }

    window.location.assign("level-select.html");
  }

  function enterFullscreen() {
    const elem = document.documentElement;
    if (!elem) return Promise.resolve(false);

    if (navigator.webdriver === true) {
      console.log("🧪 Skipping auto-fullscreen while running automation");
      return Promise.resolve(false);
    }

    if (elem.requestFullscreen) {
      return elem.requestFullscreen()
        .then(() => true)
        .catch((err) => {
          console.log(
            "⚠️ Fullscreen request failed (user may need to interact first):",
            err,
          );
          return false;
        });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
      return Promise.resolve(true);
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
      return Promise.resolve(true);
    }

    return Promise.resolve(false);
  }

  function requestStartupPreloadCompletion(reason) {
    if (GE?.STARTUP_PRELOAD_FORCE_COMPLETE) {
      document.dispatchEvent(
        new CustomEvent(GE.STARTUP_PRELOAD_FORCE_COMPLETE, {
          detail: { reason },
        }),
      );
      return;
    }

    window.StartupPreload?.requestComplete?.(reason);
  }

  function notifyBriefingDismissed() {
    if (GE?.BRIEFING_DISMISSED) {
      document.dispatchEvent(new CustomEvent(GE.BRIEFING_DISMISSED));
      return;
    }

    window.ScoreTimerManager?.setGameStarted?.();
    window.GameOnboardingController?.onBriefingDismissed?.();
  }

  function setupHowToPlayModal() {
    const modal = document.getElementById("how-to-play-modal");
    const dialog = modal?.querySelector("[role='dialog']");
    const startButton = document.getElementById("start-game-btn");
    let pendingRotationDismissal = false;
    let briefingDismissed = false;

    if (!modal || !dialog || !startButton) return;

    function isRotationStillRequired() {
      if (document.body.classList.contains("automation") || navigator.webdriver) {
        return false;
      }

      return Boolean(
        window.displayManager?.getCurrentResolution?.()
          ?.shouldShowRotationOverlay ??
          document.body.classList.contains("viewport-rotate-required"),
      );
    }

    function releaseBriefingFocus(options = {}) {
      if (typeof briefingFocusCleanup === "function") {
        briefingFocusCleanup();
      }
      briefingFocusCleanup = null;

      if (!options.focusSelector) {
        return;
      }

      const target = document.querySelector(options.focusSelector);
      if (target instanceof HTMLElement) {
        target.focus({ preventScroll: true });
      }
    }

    function finalizeBriefingDismissal() {
      if (briefingDismissed) {
        return;
      }

      briefingDismissed = true;
      pendingRotationDismissal = false;
      releaseBriefingFocus({ focusSelector: "#help-button" });
      notifyBriefingDismissed();
    }

    function showModal() {
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      briefingFocusCleanup =
        window.UXModules?.AccessibilityManager?.trapFocus?.(dialog, {
          initialFocus: startButton,
          restoreFocus: false,
        }) || null;
    }

    function handleViewportResolutionChange(event) {
      if (!pendingRotationDismissal) {
        return;
      }

      const shouldShowRotationOverlay =
        event.detail?.shouldShowRotationOverlay ?? isRotationStillRequired();

      if (!shouldShowRotationOverlay) {
        finalizeBriefingDismissal();
      }
    }

    function onStartClick(event) {
      if (
        event?.type === "pointerup" &&
        typeof event.button === "number" &&
        event.button !== 0
      ) {
        return;
      }

      if (briefingStartRequested || briefingDismissed) {
        return;
      }

      briefingStartRequested = true;
      enterFullscreen();
      window.displayManager?.requestLandscapeOrientation?.();
      const dismissDelayMs = navigator.webdriver ? 0 : 300;
      modal.style.animation =
        dismissDelayMs > 0 ? "modalFadeOut 0.3s ease-out" : "none";
      setTimeout(() => {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");

        if (isRotationStillRequired()) {
          pendingRotationDismissal = true;
          return;
        }

        finalizeBriefingDismissal();
      }, dismissDelayMs);
    }

    startButton.addEventListener("click", onStartClick);
    if (navigator.webdriver) {
      startButton.addEventListener("pointerup", onStartClick);
    }
    document.addEventListener(
      GE?.DISPLAY_RESOLUTION_CHANGED,
      handleViewportResolutionChange,
    );

    if (window.StartupPreload?.isBlocking()) {
      modal.style.display = "none";
      const safetyTimeout = setTimeout(() => {
        requestStartupPreloadCompletion("timeout");
      }, resolvedPreloadSafetyTimeoutMs);
      document.addEventListener(
        GE.STARTUP_PRELOAD_COMPLETE,
        () => {
          clearTimeout(safetyTimeout);
          showModal();
        },
        { once: true },
      );
    } else {
      showModal();
    }
  }

  if (backButton) {
    backButton.addEventListener("click", goBack);
    if (navigator.webdriver) {
      backButton.addEventListener("pointerup", goBack);
    }
  }

  document.addEventListener(GE?.GAMEPLAY_READY_CHANGED, () => {
    syncBackButtonState();
  });

  document.addEventListener(window.GameEvents.PROBLEM_COMPLETED, () => {
    document.body.classList.add("problem-completed");
    syncBackButtonState();
  });

  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.remove("problem-completed");
    syncBackButtonState();
    setupHowToPlayModal();
  });
})();
