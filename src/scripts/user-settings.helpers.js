(function () {
  const SETTINGS_VERSION = 3;
  const STORAGE_KEY = "mathmaster_user_settings_v1";
  const LEGACY_AUDIO_STORAGE_KEY = "mathmaster_audio_pref_v1";
  const QUALITY_MODES = new Set(["auto", "low", "medium", "high"]);
  const UI_SCALE_MIN = 0.85;
  const UI_SCALE_MAX = 1.15;
  const VOLUME_MIN = 0;
  const VOLUME_MAX = 100;

  function clampNumber(value, min, max, fallback) {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    return Math.max(min, Math.min(max, n));
  }

  function createDefaultSettings() {
    return {
      version: SETTINGS_VERSION,
      display: {
        qualityMode: "auto",
        reducedMotion: false,
        fullscreenPreferred: false,
        highContrast: false,
        uiScale: 1,
        cosmicConsole: false,
      },
      language: {
        locale: "en-US",
      },
      sound: {
        muted: false,
        musicEnabled: true,
        effectsEnabled: true,
        volume: 80,
      },
      gameplay: {
        pressure: "auto",
      },
      updatedAt: Date.now(),
    };
  }

  function normalizeLocale(locale) {
    return typeof locale === "string" && locale.trim().length > 0
      ? locale.trim()
      : "en-US";
  }

  function normalizeQualityMode(qualityMode) {
    return QUALITY_MODES.has(qualityMode) ? qualityMode : "auto";
  }

  function normalizeNumber(value, range) {
    if (value === undefined || value === null) {
      return range.fallback;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      return range.fallback;
    }
    return clampNumber(n, range.min, range.max, range.fallback);
  }

  function normalizeSettings(candidate) {
    const defaults = createDefaultSettings();
    const safeCandidate = candidate && typeof candidate === "object" ? candidate : {};

    return {
      version: SETTINGS_VERSION,
      display: {
        qualityMode: normalizeQualityMode(
          safeCandidate.display?.qualityMode,
        ),
        reducedMotion: Boolean(safeCandidate.display?.reducedMotion),
        fullscreenPreferred: Boolean(
          safeCandidate.display?.fullscreenPreferred,
        ),
        highContrast: Boolean(safeCandidate.display?.highContrast),
        uiScale: normalizeNumber(safeCandidate.display?.uiScale, {
          min: UI_SCALE_MIN,
          max: UI_SCALE_MAX,
          fallback: 1,
        }),
        cosmicConsole: Boolean(safeCandidate.display?.cosmicConsole),
      },
      language: {
        locale: normalizeLocale(safeCandidate.language?.locale),
      },
      sound: {
        muted: Boolean(safeCandidate.sound?.muted),
        musicEnabled:
          safeCandidate.sound?.musicEnabled === undefined
            ? defaults.sound.musicEnabled
            : Boolean(safeCandidate.sound.musicEnabled),
        effectsEnabled:
          safeCandidate.sound?.effectsEnabled === undefined
            ? defaults.sound.effectsEnabled
            : Boolean(safeCandidate.sound.effectsEnabled),
        volume: normalizeNumber(safeCandidate.sound?.volume, {
          min: VOLUME_MIN,
          max: VOLUME_MAX,
          fallback: 80,
        }),
      },
      gameplay: {
        pressure:
          safeCandidate.gameplay?.pressure === undefined
            ? defaults.gameplay.pressure
            : String(safeCandidate.gameplay.pressure),
      },
      updatedAt:
        typeof safeCandidate.updatedAt === "number" &&
        Number.isFinite(safeCandidate.updatedAt) &&
        safeCandidate.updatedAt > 0
          ? safeCandidate.updatedAt
          : defaults.updatedAt,
    };
  }

  window.UserSettingsHelpers = {
    SETTINGS_VERSION,
    STORAGE_KEY,
    LEGACY_AUDIO_STORAGE_KEY,
    QUALITY_MODES,
    UI_SCALE_MIN,
    UI_SCALE_MAX,
    VOLUME_MIN,
    VOLUME_MAX,
    createDefaultSettings,
    normalizeSettings,
    normalizeNumber,
  };
})();