// Shared settings dialog controller.
// Both the welcome and level-select pages import this module and call
// `SettingsDialog.mount({...})` to wire up their own dialog shell.
// Controls can use a per-page ID prefix ("welcome-settings-" for the
// welcome page, "" for the level-select page).
(function () {
  "use strict";

  function readSettings() {
    return (
      window.UserSettings?.getSettings?.() ||
      window.UserSettingsHelpers?.createDefaultSettings?.() ||
      {
        display: { qualityMode: "auto", reducedMotion: false, uiScale: 1, highContrast: false },
        language: { locale: "en-US" },
        sound: { muted: false, volume: 80 },
        gameplay: { pressure: "auto" },
      }
    );
  }

  function applyUiScale(settings) {
    const scale = Number(settings?.display?.uiScale);
    if (document.documentElement) {
      if (Number.isFinite(scale) && scale >= 0.85 && scale <= 1.15) {
        document.documentElement.style.setProperty(
          "--mm-ui-scale",
          String(scale),
        );
      }
    }
  }

  function applyHighContrast(settings) {
    const hc = Boolean(settings?.display?.highContrast);
    document.body.classList.toggle("user-high-contrast", hc);
    document.body.dataset.userHighContrast = hc ? "true" : "false";
  }

  function applyReducedMotion(settings) {
    const rm = Boolean(settings?.display?.reducedMotion);
    document.body.classList.toggle("user-reduced-motion", rm);
    document.body.dataset.userReducedMotion = rm ? "true" : "false";
  }

  function applyCosmicConsole(settings) {
    const cc = Boolean(settings?.display?.cosmicConsole);
    document.body.classList.toggle("cosmic-console", cc);
    document.body.dataset.cosmicConsole = cc ? "true" : "false";
  }

  function syncRangeValueText(settings) {
    document.querySelectorAll("[data-mm-bind]").forEach((el) => {
      const key = el.dataset.mmBind;
      let value;
      if (key === "uiScale") {
        const scale = Number(settings?.display?.uiScale);
        value = Number.isFinite(scale) ? Math.round(scale * 100) : 100;
      } else if (key === "volume") {
        const v = Number(settings?.sound?.volume);
        value = Number.isFinite(v) ? v : 80;
      }
      el.textContent = `${value}%`;
    });
  }

  function syncPressurePreview(settings) {
    const el = document.getElementById("settings-pressure-preview");
    if (el) {
      el.textContent = `Per-level pressure: ${settings?.gameplay?.pressure || "auto"}`;
    }
  }

  function updateSliderFill(rangeEl) {
    if (!(rangeEl instanceof HTMLInputElement) || rangeEl.type !== "range") {
      return;
    }
    const min = Number(rangeEl.min) || 0;
    const max = Number(rangeEl.max) || 100;
    const value = Number(rangeEl.value);
    const percent = ((value - min) / (max - min)) * 100;
    rangeEl.style.setProperty("--p", `${percent}%`);
  }

  function attachSliderFillHandlers(root) {
    const scope = root || document;
    scope.querySelectorAll('input[type="range"]').forEach((el) => {
      updateSliderFill(el);
      el.addEventListener("input", () => updateSliderFill(el));
    });
  }

function populateForm(settings = readSettings(), scope, idPrefix) {
    const root = scope || document;
    const prefix = idPrefix || "";
    const doc = root instanceof Document ? root : document;
    const elements = {
      qualitySelect: doc.getElementById(prefix + "settings-quality"),
      reducedMotionInput: doc.getElementById(prefix + "settings-reduced-motion"),
      languageSelect: doc.getElementById(prefix + "settings-language"),
      mutedInput: doc.getElementById(prefix + "settings-muted"),
      highContrastInput: doc.getElementById(prefix + "settings-high-contrast"),
      uiScaleInput: doc.getElementById(prefix + "settings-ui-scale"),
      volumeInput: doc.getElementById(prefix + "settings-volume"),
      cosmicConsoleInput: doc.getElementById(prefix + "cosmic-console"),
    };

    if (elements.qualitySelect) {
      elements.qualitySelect.value = settings.display?.qualityMode || "auto";
    }
    if (elements.reducedMotionInput) {
      elements.reducedMotionInput.checked = Boolean(settings.display?.reducedMotion);
    }
    if (elements.languageSelect) {
      elements.languageSelect.value = settings.language?.locale || "en-US";
    }
    if (elements.mutedInput) {
      elements.mutedInput.checked = Boolean(settings.sound?.muted);
    }
    if (elements.highContrastInput) {
      elements.highContrastInput.checked = Boolean(settings.display?.highContrast);
    }
    if (elements.uiScaleInput) {
      elements.uiScaleInput.value = String(Number.isFinite(Number(settings.display?.uiScale)) ? Number(settings.display?.uiScale) * 100 : 100);
    }
    if (elements.volumeInput) {
      elements.volumeInput.value = String(Number.isFinite(Number(settings.sound?.volume)) ? Number(settings.sound?.volume) : 80);
    }
    if (elements.cosmicConsoleInput) {
      elements.cosmicConsoleInput.checked = Boolean(settings.display?.cosmicConsole);
    }

    applyUiScale(settings);
    applyHighContrast(settings);
    applyReducedMotion(settings);
    applyCosmicConsole(settings);
    syncRangeValueText(settings);
    syncPressurePreview(settings);
    attachSliderFillHandlers(root);
  }

  let currentShell = null;
  let currentIdPrefix = "";

  function updateSettings(partial, source, shell, idPrefix) {
    const nextSettings = window.UserSettings?.updateSettings?.(partial, source);
    if (nextSettings) {
      populateForm(nextSettings, shell, idPrefix);
    }
    return nextSettings;
  }

  function handleControlChange(event, idPrefix) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const prefix = idPrefix || "";
    const id = target.id;

    if (id === prefix + "settings-quality") {
      updateSettings({ display: { qualityMode: target.value } }, "settingsDialog.quality", currentShell, currentIdPrefix);
      return;
    }
    if (id === prefix + "settings-reduced-motion") {
      updateSettings({ display: { reducedMotion: target.checked } }, "settingsDialog.reducedMotion", currentShell, currentIdPrefix);
      return;
    }
    if (id === prefix + "settings-language") {
      updateSettings({ language: { locale: target.value } }, "settingsDialog.language", currentShell, currentIdPrefix);
      return;
    }
    if (id === prefix + "settings-muted") {
      updateSettings({ sound: { muted: target.checked } }, "settingsDialog.muted", currentShell, currentIdPrefix);
      return;
    }
    if (id === prefix + "settings-high-contrast") {
      updateSettings({ display: { highContrast: target.checked } }, "settingsDialog.highContrast", currentShell, currentIdPrefix);
      return;
    }
    if (id === prefix + "settings-ui-scale") {
      const scale = Number(target.value) / 100;
      updateSettings({ display: { uiScale: scale } }, "settingsDialog.uiScale", currentShell, currentIdPrefix);
      return;
    }
    if (id === prefix + "settings-volume") {
      updateSettings({ sound: { volume: Number(target.value) } }, "settingsDialog.volume", currentShell, currentIdPrefix);
    }
    if (id === prefix + "cosmic-console") {
      updateSettings({ display: { cosmicConsole: target.checked } }, "settingsDialog.cosmicConsole", currentShell, currentIdPrefix);
    }
  }

  function openSettings({ shell, dialog, openButton }) {
    if (!shell || !dialog) {
      return;
    }
    if (shell.hidden === false) {
      return;
    }
    shell.hidden = false;
    shell.removeAttribute("hidden");
    document.body.classList.add("settings-open");
    if (openButton) {
      openButton.setAttribute("aria-expanded", "true");
    }
    populateForm();
    requestAnimationFrame(() => {
      dialog.focus();
    });
  }

  function closeSettings({ shell, openButton }) {
    if (!shell) {
      return;
    }
    if (shell.hidden === true) {
      return;
    }
    shell.hidden = true;
    shell.setAttribute("hidden", "");
    document.body.classList.remove("settings-open");
    if (openButton) {
      openButton.setAttribute("aria-expanded", "false");
    }
    const lastFocused = window.__mmLastSettingsFocus || null;
    if (lastFocused instanceof HTMLElement) {
      lastFocused.focus();
    } else if (openButton) {
      openButton.focus();
    }
  }

  function mount(config) {
    const {
      shellId,
      dialogId,
      openButtonSelector,
      closeButtonSelector = ".settings-dialog-close",
      backdropSelector = ".settings-dialog-backdrop",
      idPrefix = "",
    } = config || {};

    if (!shellId || !dialogId) {
      return null;
    }

    const shell = document.getElementById(shellId);
    const dialog = document.getElementById(dialogId);
    const openButton =
      openButtonSelector ? document.querySelector(openButtonSelector) : null;
    const closeButton = shell.querySelector(closeButtonSelector);
    const backdrop = shell.querySelector(backdropSelector);

    if (!shell || !dialog) {
      return null;
    }

    if (shell.hidden === undefined || shell.hidden === true) {
      shell.hidden = true;
      shell.setAttribute("hidden", "");
    }

    currentShell = shell;
    currentIdPrefix = idPrefix;

    const api = {
      open() {
        const lastFocused =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        window.__mmLastSettingsFocus = lastFocused;
        openSettings({ shell, dialog, openButton });
      },
      close() {
        closeSettings({ shell, openButton });
      },
      is_open() {
        return shell.hidden === false;
      },
      populate() {
        populateForm(undefined, shell, idPrefix);
      },
    };

    if (openButton) {
      openButton.addEventListener("click", () => api.open());
    }
    if (closeButton) {
      closeButton.addEventListener("click", () => api.close());
    }
    if (backdrop) {
      backdrop.addEventListener("click", () => api.close());
    }
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && api.is_open()) {
        event.preventDefault();
        api.close();
      }
    });

    const controlled = [
      shell.querySelector(`#${idPrefix}settings-quality`),
      shell.querySelector(`#${idPrefix}settings-reduced-motion`),
      shell.querySelector(`#${idPrefix}settings-language`),
      shell.querySelector(`#${idPrefix}settings-muted`),
      shell.querySelector(`#${idPrefix}settings-high-contrast`),
      shell.querySelector(`#${idPrefix}settings-ui-scale`),
      shell.querySelector(`#${idPrefix}settings-volume`),
      shell.querySelector(`#${idPrefix}cosmic-console`),
    ];

    controlled.forEach((el) => {
      if (el) {
        el.addEventListener("change", (event) =>
          handleControlChange(event, idPrefix),
        );
      }
    });

    const resetButton = shell.querySelector(".settings-reset-button");
    if (resetButton) {
      resetButton.addEventListener("click", () => {
        const resetSettings =
          window.UserSettings?.resetSettings?.("settingsDialog.reset");
        populateForm(resetSettings || readSettings(), shell, idPrefix);
      });
    }

    window.addEventListener("userSettingsLoaded", (event) => {
      populateForm(event.detail?.settings || readSettings(), shell, idPrefix);
    });
    window.addEventListener("userSettingsChanged", (event) => {
      populateForm(event.detail?.settings || readSettings(), shell, idPrefix);
    });

    // URL override: ?cosmic=on / ?cosmic=off
    const urlParams = new URLSearchParams(location.search);
    const cosmicOverride = urlParams.get("cosmic");
    if (cosmicOverride === "on" || cosmicOverride === "off") {
      const value = cosmicOverride === "on";
      updateSettings({ display: { cosmicConsole: value } }, "url.override", shell, idPrefix);
    }

    return api;
  }

  window.SettingsDialog = window.SettingsDialog || {
    mount,
    readSettings,
    populateForm,
    bootWelcome: bootWelcome,
    bootLevelSelect: bootLevelSelect,
  };

  function bootWelcome() {
    if (!window.SettingsDialog || !window.SettingsDialog.mount) {
      return;
    }
    window.SettingsDialog.mount({
      shellId: "welcome-settings-shell",
      dialogId: "welcome-settings-dialog",
      openButtonSelector: "#welcome-settings-button",
      idPrefix: "welcome-settings-",
    });
  }

  function bootLevelSelect() {
    if (!window.SettingsDialog || !window.SettingsDialog.mount) {
      return;
    }
    // The level-select page keeps its original controller (`level-select-page.settings.js`).
    // The shared controller is only used here for the welcome page.
    return null;
  }

  if (document.getElementById("welcome-settings-shell")) {
    bootWelcome();
  }
})();