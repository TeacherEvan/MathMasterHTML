(function () {
  "use strict";

  const EVENT_NAMES = {
    loaded: window.GameEvents?.USER_SETTINGS_LOADED || "userSettingsLoaded",
    changed: window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
  };

  const elements = {
    openButton: document.querySelector(".settings-button"),
    shell: document.getElementById("level-select-settings-shell"),
    dialog: document.getElementById("level-select-settings-dialog"),
    closeButton: document.querySelector(".settings-dialog-close"),
    backdrop: document.querySelector(".settings-dialog-backdrop"),
    qualitySelect: document.getElementById("settings-quality"),
    reducedMotionInput: document.getElementById("settings-reduced-motion"),
    languageSelect: document.getElementById("settings-language"),
    mutedInput: document.getElementById("settings-muted"),
    resetButton: document.querySelector(".settings-reset-button"),
  };

  const state = {
    isOpen: false,
    lastFocusedElement: null,
  };

  function readSettings() {
    return (
      window.UserSettings?.getSettings?.() ||
      window.UserSettingsHelpers?.createDefaultSettings?.() ||
      {
        display: { qualityMode: "auto", reducedMotion: false },
        language: { locale: "en-US" },
        sound: { muted: false },
      }
    );
  }

  function syncOpenButtonState() {
    if (!elements.openButton) {
      return;
    }

    elements.openButton.setAttribute("aria-expanded", String(state.isOpen));
  }

  function applyReducedMotionState(settings) {
    const reducedMotion = Boolean(settings?.display?.reducedMotion);
    document.body.classList.toggle("user-reduced-motion", reducedMotion);
    document.body.dataset.userReducedMotion = reducedMotion ? "true" : "false";
  }

  function populateForm(settings = readSettings()) {
    if (elements.qualitySelect) {
      elements.qualitySelect.value = settings.display?.qualityMode || "auto";
    }
    if (elements.reducedMotionInput) {
      elements.reducedMotionInput.checked = Boolean(
        settings.display?.reducedMotion,
      );
    }
    if (elements.languageSelect) {
      elements.languageSelect.value = settings.language?.locale || "en-US";
    }
    if (elements.mutedInput) {
      elements.mutedInput.checked = Boolean(settings.sound?.muted);
    }

    applyReducedMotionState(settings);
  }

  function updateSettings(partial, source) {
    const nextSettings = window.UserSettings?.updateSettings?.(partial, source);
    if (nextSettings) {
      populateForm(nextSettings);
    }
  }

  function openSettings() {
    if (!elements.shell || !elements.dialog || state.isOpen) {
      return;
    }

    state.lastFocusedElement =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    state.isOpen = true;
    elements.shell.hidden = false;
    elements.shell.removeAttribute("hidden");
    document.body.classList.add("settings-open");
    syncOpenButtonState();
    populateForm();
    elements.dialog.focus();
  }

  function closeSettings() {
    if (!elements.shell || state.isOpen === false) {
      return;
    }

    state.isOpen = false;
    elements.shell.hidden = true;
    elements.shell.setAttribute("hidden", "");
    document.body.classList.remove("settings-open");
    syncOpenButtonState();

    if (state.lastFocusedElement instanceof HTMLElement) {
      state.lastFocusedElement.focus();
    } else {
      elements.openButton?.focus();
    }
  }

  function handleControlChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    if (target === elements.qualitySelect) {
      updateSettings(
        {
          display: {
            qualityMode: elements.qualitySelect.value,
          },
        },
        "levelSelectSettings.quality",
      );
      return;
    }

    if (target === elements.reducedMotionInput) {
      updateSettings(
        {
          display: {
            reducedMotion: elements.reducedMotionInput.checked,
          },
        },
        "levelSelectSettings.reducedMotion",
      );
      return;
    }

    if (target === elements.languageSelect) {
      updateSettings(
        {
          language: {
            locale: elements.languageSelect.value,
          },
        },
        "levelSelectSettings.language",
      );
      return;
    }

    if (target === elements.mutedInput) {
      updateSettings(
        {
          sound: {
            muted: elements.mutedInput.checked,
          },
        },
        "levelSelectSettings.muted",
      );
    }
  }

  function handleSettingsLoaded(event) {
    populateForm(event.detail?.settings || readSettings());
  }

  function handleSettingsChanged(event) {
    populateForm(event.detail?.settings || readSettings());
  }

  function initSettings() {
    if (elements.shell) {
      elements.shell.hidden = true;
      elements.shell.setAttribute("hidden", "");
    }

    window.AppUpdateUI?.init?.();
    populateForm();
    syncOpenButtonState();

    elements.openButton?.addEventListener("click", openSettings);
    elements.closeButton?.addEventListener("click", closeSettings);
    elements.backdrop?.addEventListener("click", closeSettings);
    elements.qualitySelect?.addEventListener("change", handleControlChange);
    elements.reducedMotionInput?.addEventListener("change", handleControlChange);
    elements.languageSelect?.addEventListener("change", handleControlChange);
    elements.mutedInput?.addEventListener("change", handleControlChange);
    elements.resetButton?.addEventListener("click", () => {
      const resetSettings = window.UserSettings?.resetSettings?.(
        "levelSelectSettings.reset",
      );
      populateForm(resetSettings || readSettings());
    });

    document.addEventListener(EVENT_NAMES.loaded, handleSettingsLoaded);
    document.addEventListener(EVENT_NAMES.changed, handleSettingsChanged);
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initSettings = initSettings;
  window.LevelSelectPage.openSettings = openSettings;
  window.LevelSelectPage.closeSettings = closeSettings;
  window.LevelSelectPage.isSettingsOpen = () => state.isOpen;
})();