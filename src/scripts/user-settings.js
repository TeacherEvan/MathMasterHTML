(function () {
  const helpers = window.UserSettingsHelpers;

  if (!helpers) {
    console.warn("UserSettings helpers missing; skipping initialization.");
    return;
  }

  const {
    STORAGE_KEY,
    LEGACY_AUDIO_STORAGE_KEY,
    createDefaultSettings,
    normalizeSettings,
  } = helpers;
  const EVENT_NAMES = {
    loaded: window.GameEvents?.USER_SETTINGS_LOADED || "userSettingsLoaded",
    changed: window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
  };

  let settings = createDefaultSettings();

  function cloneSettings(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function safeParse(rawValue) {
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      return null;
    }
  }

  function readStoredSettings() {
    try {
      return safeParse(window.localStorage?.getItem(STORAGE_KEY) || null);
    } catch {
      return null;
    }
  }

  function readLegacyMutedPreference() {
    try {
      return window.localStorage?.getItem(LEGACY_AUDIO_STORAGE_KEY) === "muted";
    } catch {
      return false;
    }
  }

  function clearLegacyMutedPreference() {
    try {
      window.localStorage?.removeItem(LEGACY_AUDIO_STORAGE_KEY);
    } catch {
      // Ignore storage failures.
    }
  }

  function persistSettings(nextSettings) {
    try {
      window.localStorage?.setItem(STORAGE_KEY, JSON.stringify(nextSettings));
      return true;
    } catch {
      return false;
    }
  }

  function dispatchSettingsEvent(eventName, detail) {
    document.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
      }),
    );
  }

  function mergePartialSettings(partial) {
    const safePartial = partial && typeof partial === "object" ? partial : {};

    return {
      ...settings,
      ...safePartial,
      display: {
        ...settings.display,
        ...(safePartial.display || {}),
      },
      language: {
        ...settings.language,
        ...(safePartial.language || {}),
      },
      sound: {
        ...settings.sound,
        ...(safePartial.sound || {}),
      },
    };
  }

  function collectChangedKeys(partial) {
    const changedKeys = [];
    const sections = partial && typeof partial === "object" ? partial : {};

    Object.entries(sections).forEach(([sectionKey, sectionValue]) => {
      if (!sectionValue || typeof sectionValue !== "object" || Array.isArray(sectionValue)) {
        changedKeys.push(sectionKey);
        return;
      }

      Object.keys(sectionValue).forEach((fieldKey) => {
        changedKeys.push(`${sectionKey}.${fieldKey}`);
      });
    });

    return changedKeys;
  }

  function applySettings(nextSettings, source, changedKeys) {
    settings = normalizeSettings({
      ...nextSettings,
      updatedAt: Date.now(),
    });
    persistSettings(settings);

    dispatchSettingsEvent(EVENT_NAMES.changed, {
      settings: cloneSettings(settings),
      changedKeys,
      source,
    });

    return cloneSettings(settings);
  }

  function initializeSettings() {
    const storedSettings = readStoredSettings();
    const initialSettings = storedSettings || createDefaultSettings();

    if (!storedSettings && readLegacyMutedPreference()) {
      initialSettings.sound = {
        ...initialSettings.sound,
        muted: true,
      };
      clearLegacyMutedPreference();
    }

    settings = normalizeSettings(initialSettings);
    persistSettings(settings);

    dispatchSettingsEvent(EVENT_NAMES.loaded, {
      settings: cloneSettings(settings),
      source: storedSettings ? "storage" : "defaults",
    });
  }

  window.UserSettings = {
    STORAGE_KEY,
    getSettings() {
      return cloneSettings(settings);
    },
    updateSettings(partial, source = "updateSettings") {
      return applySettings(
        mergePartialSettings(partial),
        source,
        collectChangedKeys(partial),
      );
    },
    resetSettings(source = "resetSettings") {
      return applySettings(createDefaultSettings(), source, ["*"]);
    },
  };

  initializeSettings();
})();