(function () {
  const STORAGE_KEY = "mathmaster_onboarding_v1";
  const VALID_LEVELS = new Set(["beginner", "warrior", "master"]);
  const VALID_REASONS = new Set(["skip", "completed", "manual-stop"]);

  function defaultState() {
    return {
      version: 1,
      sessionCount: 0,
      evanConsumed: {
        beginner: false,
        warrior: false,
        master: false,
      },
      tutorialConsumed: false,
      installPromptDismissedAt: null,
      updatedAt: 0,
    };
  }

  let state = defaultState();
  let hydrated = false;

  function ensureHydrated() {
    if (hydrated) {
      return;
    }

    const persisted = readStorage();
    state = persisted || defaultState();
    hydrated = true;
  }

  function normalizeState(input) {
    const base = defaultState();
    const candidate = input && typeof input === "object" ? input : {};

    return {
      version: 1,
      sessionCount:
        Number.isFinite(candidate.sessionCount) && candidate.sessionCount >= 0
          ? candidate.sessionCount
          : base.sessionCount,
      evanConsumed: {
        beginner: Boolean(candidate.evanConsumed?.beginner),
        warrior: Boolean(candidate.evanConsumed?.warrior),
        master: Boolean(candidate.evanConsumed?.master),
      },
      tutorialConsumed: Boolean(candidate.tutorialConsumed),
      installPromptDismissedAt:
        candidate.installPromptDismissedAt === null ||
        Number.isFinite(candidate.installPromptDismissedAt)
          ? candidate.installPromptDismissedAt
          : base.installPromptDismissedAt,
      updatedAt:
        Number.isFinite(candidate.updatedAt) && candidate.updatedAt >= 0
          ? candidate.updatedAt
          : base.updatedAt,
    };
  }

  function readStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && parsed.version === 1) {
        return normalizeState(parsed);
      }
      return null;
    } catch {
      return null;
    }
  }

  function writeStorage() {
    try {
      hydrated = true;
      state.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable — state stays in-memory only
    }
  }

  function initSession() {
    ensureHydrated();
    state.sessionCount++;
    writeStorage();
  }

  function getState() {
    ensureHydrated();
    return normalizeState(state);
  }

  function shouldAutoRunEvan(level, override) {
    ensureHydrated();
    if (override === "off") return false;
    if (override === "force") return true;
    return !state.evanConsumed[level];
  }

  function shouldShowInstallPrompt() {
    ensureHydrated();
    return state.sessionCount >= 3 && state.installPromptDismissedAt === null;
  }

  function hasConsumedTutorial() {
    ensureHydrated();
    return Boolean(state.tutorialConsumed);
  }

  function markEvanConsumed(level, reason = "completed") {
    ensureHydrated();
    if (!VALID_LEVELS.has(level) || !VALID_REASONS.has(reason)) {
      return;
    }

    if (state.evanConsumed[level]) return;

    state.evanConsumed[level] = true;
    writeStorage();
  }

  function markTutorialConsumed() {
    ensureHydrated();
    if (state.tutorialConsumed) return;
    state.tutorialConsumed = true;
    writeStorage();
  }

  function markInstallPromptDismissed() {
    ensureHydrated();
    state.installPromptDismissedAt = Date.now();
    writeStorage();
  }

  window.GameOnboardingStorage = {
    initSession,
    getState,
    shouldAutoRunEvan,
    shouldShowInstallPrompt,
    hasConsumedTutorial,
    markEvanConsumed,
    markTutorialConsumed,
    markInstallPromptDismissed,
  };
})();
