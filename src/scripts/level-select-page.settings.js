// level-select-page.settings.js
// Thin bootstrap that mounts the shared SettingsDialog controller.
(function () {
  "use strict";

  const ready = () => {
    if (!window.SettingsDialog || !window.SettingsDialog.mount) {
      return;
    }
    const api = window.SettingsDialog.mount({
      shellId: "level-select-settings-shell",
      dialogId: "level-select-settings-dialog",
      openButtonSelector: ".settings-button, #level-select-settings-icon, #settings-button",
      idPrefix: "",
    });

    window.LevelSelectPage = window.LevelSelectPage || {};
    window.LevelSelectPage.initSettings = () => {};
    window.LevelSelectPage.openSettings =
      api && api.open ? api.open.bind(api) : () => {};
    window.LevelSelectPage.closeSettings =
      api && api.close ? api.close.bind(api) : () => {};
    window.LevelSelectPage.isSettingsOpen =
      api && api.is_open ? api.is_open.bind(api) : () => false;
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ready);
  } else {
    ready();
  }
})();