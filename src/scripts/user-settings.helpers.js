(function () {
  const SETTINGS_VERSION = 1;
  const STORAGE_KEY = "mathmaster_user_settings_v1";
  const LEGACY_AUDIO_STORAGE_KEY = "mathmaster_audio_pref_v1";
  const QUALITY_MODES = new Set(["auto", "low", "medium", "high"]);

  function createDefaultSettings() {
    return {
      version: SETTINGS_VERSION,
      display: {
        qualityMode: "auto",
        reducedMotion: false,
        fullscreenPreferred: false,
      },
      language: {
        locale: "en-US",
      },
      sound: {
        muted: false,
        musicEnabled: true,
        effectsEnabled: true,
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
    createDefaultSettings,
    normalizeSettings,
  };
})();