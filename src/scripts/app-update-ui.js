(function () {
  "use strict";

  const EVENT_NAME = window.GameEvents?.APP_UPDATE_AVAILABLE || "appUpdateAvailable";

  const elements = {
    panel: document.querySelector(".settings-update-panel"),
    message: document.querySelector(".settings-update-message"),
    refreshButton: document.querySelector(".settings-update-refresh"),
    clearCacheButton: document.querySelector(".settings-update-clear-cache"),
  };

  const state = {
    initialized: false,
    updateAvailable: Boolean(window.MathMasterAppUpdate?.available),
    detail: window.MathMasterAppUpdate || null,
  };

  function render() {
    if (!elements.panel || !elements.message || !elements.refreshButton) {
      return;
    }

    if (state.updateAvailable) {
      const buildVersion = state.detail?.buildVersion || "the latest build";
      elements.panel.dataset.updateState = "available";
      elements.message.textContent = `Update ready. Refresh when you are between runs to load ${buildVersion}.`;
      elements.refreshButton.hidden = false;
    } else {
      elements.panel.dataset.updateState = "idle";
      elements.message.textContent =
        "No update pending. Cache recovery stays available here if this device gets stuck on stale assets.";
      elements.refreshButton.hidden = true;
    }
  }

  async function handleRefreshClick() {
    await window.refreshToUpdate?.();
  }

  async function handleClearCacheClick() {
    await window.clearServiceWorkerCache?.();
  }

  function handleUpdateAvailable(event) {
    state.updateAvailable = true;
    state.detail = event.detail || window.MathMasterAppUpdate || null;
    render();
  }

  function init() {
    if (state.initialized) {
      render();
      return;
    }

    state.initialized = true;
    elements.refreshButton?.addEventListener("click", handleRefreshClick);
    elements.clearCacheButton?.addEventListener("click", handleClearCacheClick);
    document.addEventListener(EVENT_NAME, handleUpdateAvailable);
    render();
  }

  window.AppUpdateUI = {
    init,
  };
})();