(function () {
  const GE = window.GameEvents;
  const storage = window.GameOnboardingStorage;
  if (!GE || !storage) return;

  let deferredPrompt = null;
  let shown = false;
  let briefingDismissed = false;

  function markBriefingDismissed() {
    if (briefingDismissed) return;
    briefingDismissed = true;
    tryShow();
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.dispatchEvent(new CustomEvent(GE.INSTALL_PROMPT_AVAILABLE));
    tryShow();
  });

  function tryShow() {
    if (shown || !deferredPrompt) return;
    if (!storage.shouldShowInstallPrompt()) return;
    if (!briefingDismissed) {
      return;
    }
    showInstallUI();
  }

  function showInstallUI() {
    if (shown) return;
    shown = true;

    const toast =
      window.UXEnhancements?.toast ||
      (window.UXModules?.ToastNotificationManager
        ? new window.UXModules.ToastNotificationManager()
        : null);

    if (!toast || typeof toast.info !== "function") {
      promptNow();
      return;
    }

    const el = toast.info("Install Math Master for offline play \u2192", 0);

    if (el) {
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        promptNow();
      });
    }
  }

  async function promptNow() {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        // ignore
      }
    }
    finish();
  }

  function finish() {
    storage.markInstallPromptDismissed();
    document.dispatchEvent(new CustomEvent(GE.INSTALL_PROMPT_DISMISSED));
    deferredPrompt = null;
  }

  document.addEventListener(GE.STARTUP_PRELOAD_COMPLETE, () => tryShow(), {
    once: true,
  });

  const startButton = document.getElementById("start-game-btn");
  if (startButton) {
    startButton.addEventListener("click", () => {
      setTimeout(markBriefingDismissed, 320);
    });
  }

  window.InstallPromptManager = { tryShow };
})();
