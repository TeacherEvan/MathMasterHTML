// js/player-storage.helpers.js - Player profile migration + defaults
console.log("💾 PlayerStorage helpers loading...");

(function() {
  const PROFILE_VERSION = 3;
  const LEVEL_KEYS = ["beginner", "warrior", "master"];
  const RECENT_HISTORY_LIMIT = 25;
  const MAX_PLAYER_NAME_LENGTH = 18;

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
      recentHistory: [],
      overall: {
        totalScore: 0,
        problemsCompleted: 0,
        lastPlayed: null,
      },
      updatedAt: Date.now(),
    };
  }

  function normalizePlayerName(value) {
    if (typeof value !== "string") {
      return "";
    }

    return value.replace(/\s+/g, " ").trim().slice(0, MAX_PLAYER_NAME_LENGTH);
  }

  function normalizeRecentHistoryEntry(entry) {
    const safeEntry = entry && typeof entry === "object" ? entry : {};
    const levelKey =
      typeof safeEntry.levelKey === "string" && safeEntry.levelKey.trim().length > 0
        ? safeEntry.levelKey.trim()
        : null;
    const completedAt =
      typeof safeEntry.completedAt === "number" && safeEntry.completedAt > 0
        ? safeEntry.completedAt
        : null;

    if (!levelKey || completedAt === null) {
      return null;
    }

    return {
      levelKey,
      score: Math.max(0, Number(safeEntry.score) || 0),
      completedAt,
    };
  }

  function normalizeRecentHistory(historyEntries) {
    if (!Array.isArray(historyEntries)) {
      return [];
    }

    return historyEntries
      .map((entry) => normalizeRecentHistoryEntry(entry))
      .filter(Boolean)
      .sort((a, b) => b.completedAt - a.completedAt)
      .slice(0, RECENT_HISTORY_LIMIT);
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

    nextProfile.name = normalizePlayerName(sourceProfile.name) || null;

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

    nextProfile.recentHistory = normalizeRecentHistory(sourceProfile.recentHistory);
    nextProfile.overall = buildOverallSummary(nextProfile.levels);
    nextProfile.updatedAt =
      typeof sourceProfile.updatedAt === "number"
        ? sourceProfile.updatedAt
        : Date.now();

    return nextProfile;
  }

  window.PlayerStorageHelpers = {
    PROFILE_VERSION,
    RECENT_HISTORY_LIMIT,
    MAX_PLAYER_NAME_LENGTH,
    createEmptyLevelStats,
    createDefaultProfile,
    normalizePlayerName,
    normalizeLevelStats,
    normalizeRecentHistory,
    buildOverallSummary,
    migrateProfile,
  };

  console.log("✅ PlayerStorage helpers loaded");
})();
