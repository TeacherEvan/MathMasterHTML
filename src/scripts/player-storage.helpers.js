// js/player-storage.helpers.js - Player profile migration + defaults
console.log("💾 PlayerStorage helpers loading...");

(function() {
  const PROFILE_VERSION = 2;
  const LEVEL_KEYS = ["beginner", "warrior", "master"];

  function createEmptyLevelStats() {
    return {
      totalScore: 0,
      bestProblemScore: 0,
      lastProblemScore: 0,
      problemsCompleted: 0,
      lastPlayed: null,
    };
  }

  function createDefaultProfile() {
    return {
      version: PROFILE_VERSION,
      name: null,
      levels: {},
      overall: {
        totalScore: 0,
        problemsCompleted: 0,
        lastPlayed: null,
      },
      updatedAt: Date.now(),
    };
  }

  function normalizeLevelStats(levelStats) {
    const safeStats =
      levelStats && typeof levelStats === "object" ? levelStats : {};

    return {
      ...createEmptyLevelStats(),
      totalScore: Math.max(0, Number(safeStats.totalScore) || 0),
      bestProblemScore: Math.max(0, Number(safeStats.bestProblemScore) || 0),
      lastProblemScore: Math.max(0, Number(safeStats.lastProblemScore) || 0),
      problemsCompleted: Math.max(0, Number(safeStats.problemsCompleted) || 0),
      lastPlayed:
        typeof safeStats.lastPlayed === "number" ? safeStats.lastPlayed : null,
    };
  }

  function buildOverallSummary(levels) {
    return Object.values(levels).reduce(
      (summary, levelStats) => {
        summary.totalScore += Math.max(0, Number(levelStats.totalScore) || 0);
        summary.problemsCompleted += Math.max(
          0,
          Number(levelStats.problemsCompleted) || 0,
        );
        const lastPlayed =
          typeof levelStats.lastPlayed === "number" ? levelStats.lastPlayed : 0;
        if (lastPlayed > (summary.lastPlayed || 0)) {
          summary.lastPlayed = lastPlayed;
        }
        return summary;
      },
      {
        totalScore: 0,
        problemsCompleted: 0,
        lastPlayed: null,
      },
    );
  }

  function migrateProfile(profile) {
    const nextProfile = createDefaultProfile();
    const sourceProfile = profile && typeof profile === "object" ? profile : {};
    const sourceLevels =
      sourceProfile.levels && typeof sourceProfile.levels === "object"
        ? sourceProfile.levels
        : {};

    nextProfile.name =
      typeof sourceProfile.name === "string" &&
      sourceProfile.name.trim().length > 0
        ? sourceProfile.name.trim()
        : null;

    LEVEL_KEYS.forEach((levelKey) => {
      if (sourceLevels[levelKey]) {
        nextProfile.levels[levelKey] = normalizeLevelStats(sourceLevels[levelKey]);
      }
    });

    Object.keys(sourceLevels).forEach((levelKey) => {
      if (!nextProfile.levels[levelKey]) {
        nextProfile.levels[levelKey] = normalizeLevelStats(sourceLevels[levelKey]);
      }
    });

    nextProfile.overall = buildOverallSummary(nextProfile.levels);
    nextProfile.updatedAt =
      typeof sourceProfile.updatedAt === "number"
        ? sourceProfile.updatedAt
        : Date.now();

    return nextProfile;
  }

  window.PlayerStorageHelpers = {
    PROFILE_VERSION,
    createEmptyLevelStats,
    createDefaultProfile,
    normalizeLevelStats,
    buildOverallSummary,
    migrateProfile,
  };

  console.log("✅ PlayerStorage helpers loaded");
})();
