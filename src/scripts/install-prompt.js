(function () {
  const GE = window.GameEvents;
  const storage = window.GameOnboardingStorage;
  if (!GE || !storage) return;

  let deferredPrompt = null;
  let shown = false;
  let toastManager = null;
  let toastEl = null;

  function dismissToast() {
    if (!toastEl) return;
    toastManager?.dismiss?.(toastEl);
    toastEl = null;
  }

  function isGameplayReady() {
    return window.GameRuntimeCoordinator?.isGameplayReady?.() === true;
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
    if (!isGameplayReady()) {
      return;
    }
    showInstallUI();
  }

  function showInstallUI() {
    if (shown) return;
    shown = true;

    toastManager =
      window.UXEnhancements?.toast ||
      (window.UXModules?.ToastNotificationManager
        ? new window.UXModules.ToastNotificationManager()
        : null);

    if (!toastManager || typeof toastManager.info !== "function") {
      shown = false;
      return;
    }

    toastEl = toastManager.info("Install Math Master for offline play \u2192", 0);

    if (toastEl) {
      toastEl.style.cursor = "pointer";
      toastEl.addEventListener("click", () => {
        promptNow();
      });
    }
  }

  async function promptNow() {
    if (!deferredPrompt) {
      shown = false;
      return;
    }
    try {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
    } catch {
      shown = false;
      dismissToast();
      return;
    }
    finish();
  }

  function finish() {
    dismissToast();
    shown = false;
    storage.markInstallPromptDismissed();
    document.dispatchEvent(new CustomEvent(GE.INSTALL_PROMPT_DISMISSED));
    deferredPrompt = null;
  }

  document.addEventListener(GE.GAMEPLAY_READY_CHANGED, (event) => {
    if (event.detail?.gameplayReady) {
      tryShow();
    }
  });

  window.InstallPromptManager = { tryShow };
})();
