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
      installPromptDismissedAt: null,
      updatedAt: 0,
    };
  }

  let state = defaultState();

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
      state.updatedAt = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // localStorage unavailable — state stays in-memory only
    }
  }

  function initSession() {
    const persisted = readStorage();
    state = persisted || defaultState();
    state.sessionCount++;
    writeStorage();
  }

  function getState() {
    return normalizeState(state);
  }

  function shouldAutoRunEvan(level, override) {
    if (override === "off") return false;
    if (override === "force") return true;
    return !state.evanConsumed[level];
  }

  function shouldShowInstallPrompt() {
    return state.sessionCount >= 3 && state.installPromptDismissedAt === null;
  }

  function markEvanConsumed(level, reason = "completed") {
    if (!VALID_LEVELS.has(level) || !VALID_REASONS.has(reason)) {
      return;
    }

    if (state.evanConsumed[level]) return;

    state.evanConsumed[level] = true;
    writeStorage();
  }

  function markInstallPromptDismissed() {
    state.installPromptDismissedAt = Date.now();
    writeStorage();
  }

  window.GameOnboardingStorage = {
    initSession,
    getState,
    shouldAutoRunEvan,
    shouldShowInstallPrompt,
    markEvanConsumed,
    markInstallPromptDismissed,
  };
})();
