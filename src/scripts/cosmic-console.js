// src/scripts/cosmic-console.js
// Applies the Cosmic Console visual layer (body.cosmic-console) on pages that
// do not mount the shared settings dialog (the in-game page).
//
// Source of truth is UserSettings.display.cosmicConsole; ?cosmic=on|off acts as
// a session-only URL override, mirroring the welcome/level-select behaviour.
(function () {
  "use strict";

  const URL_PARAM = "cosmic";

  function readUrlOverride() {
    try {
      const value = new URLSearchParams(window.location.search).get(URL_PARAM);
      if (value === "on") return true;
      if (value === "off") return false;
    } catch {
      // Malformed query strings must not break boot.
    }
    return null;
  }

  function readStoredSetting() {
    return Boolean(
      window.UserSettings?.getSettings?.()?.display?.cosmicConsole,
    );
  }

  function apply(enabled) {
    if (!document.body) return;
    document.body.classList.toggle("cosmic-console", enabled);
    document.body.dataset.cosmicConsole = enabled ? "true" : "false";
  }

  function sync() {
    const override = readUrlOverride();
    apply(override === null ? readStoredSetting() : override);
  }

  function boot() {
    sync();
    document.addEventListener("userSettingsLoaded", sync);
    document.addEventListener("userSettingsChanged", sync);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }

  window.CosmicConsole = { apply, sync };
})();
