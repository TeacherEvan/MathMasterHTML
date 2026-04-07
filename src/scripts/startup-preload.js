(function () {
  const GE = window.GameEvents;
  const overlay = document.getElementById("startup-preload");
  const messageEl = document.getElementById("startup-preload-message");
  const progressEl = document.getElementById("startup-preload-progress");

  let complete = false;
  let progressBar = null;

  function dispatchComplete() {
    document.dispatchEvent(new CustomEvent(GE.STARTUP_PRELOAD_COMPLETE));
  }

  function finishOverlay() {
    if (overlay) {
      overlay.style.opacity = "0";
      setTimeout(() => {
        overlay.style.display = "none";
        overlay.setAttribute("aria-hidden", "true");
      }, 400);
    }
    dispatchComplete();
  }

  function markComplete() {
    if (complete) return;
    complete = true;
    finishOverlay();
  }

  function init() {
    const mode = window.GameOnboarding?.preloadMode;

    if (mode === "off" || !overlay) {
      complete = true;
      if (overlay) {
        overlay.style.display = "none";
        overlay.setAttribute("aria-hidden", "true");
      }
      dispatchComplete();
      return;
    }
    overlay.style.display = "flex";
    overlay.removeAttribute("aria-hidden");

    if (window.UXModules?.ProgressBarManager && progressEl) {
      try {
        progressBar = new window.UXModules.ProgressBarManager(
          "#startup-preload-progress",
        );
      } catch {
        // Progress bar optional — overlay still functions
      }
    }

    document.addEventListener(GE.PRELOAD_PROGRESS, (e) => {
      if (complete) return;
      const { progress, message } = e.detail || {};
      if (messageEl && message) {
        messageEl.textContent = message;
      }
      if (progressEl && typeof progress === "number") {
        progressEl.setAttribute("aria-valuenow", String(progress));
        progressEl.style.setProperty("--progress", progress + "%");
      }
      if (progressBar && typeof progress === "number") {
        try {
          progressBar.setProgress(progress);
        } catch {
          // ignore
        }
      }
    });

    document.addEventListener(GE.PRELOAD_READY, () => {
      markComplete();
    });

    document.addEventListener(GE.PRELOAD_FAILED, () => {
      markComplete();
    });
  }

  init();

  window.StartupPreload = {
    isBlocking: () => !complete,
    isComplete: () => complete,
    _onComplete: markComplete,
  };
})();
