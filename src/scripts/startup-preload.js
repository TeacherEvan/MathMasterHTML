(function () {
  const GE = window.GameEvents;
  const overlay = document.getElementById("startup-preload");
  const messageEl = document.getElementById("startup-preload-message");
  const progressEl = document.getElementById("startup-preload-progress");
  const OVERLAY_HIDE_DELAY_MS = 400;

  let complete = false;
  let progressBar = null;
  let hideOverlayTimer = null;
  let messagePriority = "status";

  function setOverlayMessage(message, options = {}) {
    if (complete || !messageEl || typeof message !== "string") {
      return false;
    }

    const nextPriority = options.priority === "progress" ? "progress" : "status";
    if (messagePriority === "progress" && nextPriority !== "progress") {
      return false;
    }

    messagePriority = nextPriority;
    messageEl.textContent = message;
    return true;
  }

  function hideOverlay() {
    if (!overlay) return;

    overlay.style.opacity = "0";
    overlay.style.pointerEvents = "none";
    overlay.setAttribute("aria-hidden", "true");
    clearTimeout(hideOverlayTimer);
    hideOverlayTimer = setTimeout(() => {
      overlay.style.display = "none";
    }, OVERLAY_HIDE_DELAY_MS);
  }

  function dispatchComplete(reason) {
    if (!GE?.STARTUP_PRELOAD_COMPLETE) return;

    document.dispatchEvent(
      new CustomEvent(GE.STARTUP_PRELOAD_COMPLETE, {
        detail: { reason },
      }),
    );
  }

  function markComplete(reason = "complete", shouldDispatch = true) {
    if (complete) return;

    complete = true;
    messagePriority = "status";
    hideOverlay();

    if (shouldDispatch) {
      dispatchComplete(reason);
    }
  }

  function setOverlayProgress(event) {
    if (complete) return;

    const { progress, message } = event.detail || {};
    if (message) {
      setOverlayMessage(message, { priority: "progress" });
    }
    if (progressEl && typeof progress === "number") {
      progressEl.setAttribute("aria-valuenow", String(progress));
      progressEl.style.setProperty("--progress", progress + "%");
    }
    if (progressBar && typeof progress === "number") {
      try {
        progressBar.setProgress(progress);
      } catch {
        // Progress bar is optional.
      }
    }
  }

  function init() {
    const mode = window.GameOnboarding?.preloadMode;

    if (!GE) {
      complete = true;
      hideOverlay();
      return;
    }

    if (mode === "off" || !overlay) {
      complete = true;
      if (overlay) {
        overlay.style.display = "none";
        overlay.style.pointerEvents = "none";
        overlay.setAttribute("aria-hidden", "true");
      }
      dispatchComplete(mode === "off" ? "disabled" : "missing-overlay");
      return;
    }

    overlay.style.display = "flex";
    overlay.style.opacity = "1";
    overlay.style.pointerEvents = "auto";
    overlay.removeAttribute("aria-hidden");

    if (window.UXModules?.ProgressBarManager && progressEl) {
      try {
        progressBar = new window.UXModules.ProgressBarManager(
          "#startup-preload-progress",
        );
      } catch {
        // Progress bar optional — overlay still functions.
      }
    }

    document.addEventListener(GE.PRELOAD_PROGRESS, setOverlayProgress);
    document.addEventListener(GE.PRELOAD_READY, () => {
      markComplete("ready");
    });
    document.addEventListener(GE.PRELOAD_FAILED, () => {
      markComplete("failed");
    });
    document.addEventListener(GE.STARTUP_PRELOAD_FORCE_COMPLETE, (event) => {
      markComplete(event.detail?.reason || "forced");
    });
  }

  init();

  window.StartupPreload = {
    isBlocking: () => !complete,
    isComplete: () => complete,
    setMessage: (message, options = {}) => setOverlayMessage(message, options),
    requestComplete: (reason = "api") => {
      if (GE?.STARTUP_PRELOAD_FORCE_COMPLETE) {
        document.dispatchEvent(
          new CustomEvent(GE.STARTUP_PRELOAD_FORCE_COMPLETE, {
            detail: { reason },
          }),
        );
        return;
      }

      markComplete(reason, false);
    },
  };
})();
