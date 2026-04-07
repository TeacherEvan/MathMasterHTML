(function () {
  const params = new URLSearchParams(window.location.search);

  const VALID_EVAN_MODES = ["off", "force", "auto"];
  const VALID_PRELOAD_MODES = ["off", "auto"];
  const VALID_LEVELS = ["beginner", "warrior", "master"];

  const rawEvan = params.get("evan");
  const rawPreload = params.get("preload");
  const rawLevel = params.get("level");

  const evanMode = VALID_EVAN_MODES.includes(rawEvan) ? rawEvan : "auto";
  const preloadMode = VALID_PRELOAD_MODES.includes(rawPreload)
    ? rawPreload
    : "auto";
  const level = VALID_LEVELS.includes(rawLevel) ? rawLevel : "beginner";

  if (window.GameOnboardingStorage) {
    window.GameOnboardingStorage.initSession();
  }

  window.GameOnboarding = Object.freeze({ level, evanMode, preloadMode });
})();
