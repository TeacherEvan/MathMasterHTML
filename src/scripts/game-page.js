(function () {
  const GE = window.GameEvents;
  const backButton = document.getElementById("back-button");
  let briefingFocusCleanup = null;

  function goBack() {
    window.location.assign("level-select.html");
  }

  function enterFullscreen() {
    const elem = document.documentElement;
    if (!elem) return;

    if (navigator.webdriver === true) {
      console.log("🧪 Skipping auto-fullscreen while running automation");
      return;
    }

    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch((err) => {
        console.log(
          "⚠️ Fullscreen request failed (user may need to interact first):",
          err,
        );
      });
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    }
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

    if (!modal || !dialog || !startButton) return;

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

    function showModal() {
      modal.style.display = "flex";
      modal.setAttribute("aria-hidden", "false");
      briefingFocusCleanup =
        window.UXModules?.AccessibilityManager?.trapFocus?.(dialog, {
          initialFocus: startButton,
          restoreFocus: false,
        }) || null;
    }

    function onStartClick() {
      modal.style.animation = "modalFadeOut 0.3s ease-out";
      setTimeout(() => {
        modal.style.display = "none";
        modal.setAttribute("aria-hidden", "true");
        releaseBriefingFocus({ focusSelector: "#help-button" });
        notifyBriefingDismissed();
        enterFullscreen();
      }, 300);
    }

    startButton.addEventListener("click", onStartClick);

    if (window.StartupPreload?.isBlocking()) {
      modal.style.display = "none";
      const safetyTimeout = setTimeout(() => {
        requestStartupPreloadCompletion("timeout");
      }, 8000);
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
  }

  document.addEventListener("DOMContentLoaded", () => {
    setupHowToPlayModal();
  });
})();
