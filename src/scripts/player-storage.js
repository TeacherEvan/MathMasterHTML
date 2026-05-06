// js/player-storage.js - Local player name + level score persistence
console.log("💾 PlayerStorage loading...");

(function() {
  const STORAGE_KEY = "mathmaster_player_profile_v1";
  const helpers = window.PlayerStorageHelpers;

  if (!helpers) {
    console.error("❌ PlayerStorage helpers not loaded");
    return;
  }

  const {
    PROFILE_VERSION,
    RECENT_HISTORY_LIMIT,
    createEmptyLevelStats,
    createDefaultProfile,
    normalizePlayerName,
    normalizeLevelStats,
    normalizeRecentHistory,
    buildOverallSummary,
    migrateProfile,
  } = helpers;

  function safeParse(json) {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }


  const PlayerStorage = {
    STORAGE_KEY,
    PROFILE_VERSION,

    init() {
      try {
        const rawProfile = safeParse(localStorage.getItem(STORAGE_KEY));
        if (!rawProfile) {
          this._write(createDefaultProfile());
          return;
        }

        const migratedProfile = migrateProfile(rawProfile);
        if (JSON.stringify(rawProfile) !== JSON.stringify(migratedProfile)) {
          this._write(migratedProfile);
        }
      } catch (error) {
        console.warn("⚠️ Failed to initialize player profile:", error);
      }
    },

    ensurePlayerName() {
      const profile = this._read() || createDefaultProfile();
      const storedName = normalizePlayerName(profile.name);
      if (storedName) {
        return storedName;
      }

      profile.name = "Player";
      profile.updatedAt = Date.now();
      this._write(profile);
      console.log('💾 No player name stored - using default name "Player"');
      return profile.name;
    },

    setPlayerName(name) {
      const profile = this._read() || createDefaultProfile();
      const normalizedName = normalizePlayerName(name) || "Player";

      profile.name = normalizedName;
      profile.updatedAt = Date.now();
      this._write(profile);

      return normalizedName;
    },

    getProfile() {
      return this._read();
    },

    getLevelStats(levelKey) {
      const profile = this._read() || createDefaultProfile();
      return profile.levels[levelKey]
        ? normalizeLevelStats(profile.levels[levelKey])
        : createEmptyLevelStats();
    },

    getScoreboardSummary(levelKey) {
      const profile = this._read() || createDefaultProfile();
      return {
        profile,
        level: this.getLevelStats(levelKey),
        recentHistory: normalizeRecentHistory(profile.recentHistory),
        overall:
          profile.overall && typeof profile.overall === "object"
            ? profile.overall
            : buildOverallSummary(profile.levels || {}),
      };
    },

    recordProblemResult(levelKey, problemScore) {
      const profile = this._read() || createDefaultProfile();
      const safeScore = Math.max(0, Number(problemScore) || 0);
      const level = profile.levels[levelKey]
        ? normalizeLevelStats(profile.levels[levelKey])
        : createEmptyLevelStats();

      level.totalScore += safeScore;
      level.lastProblemScore = safeScore;
      level.bestProblemScore = Math.max(level.bestProblemScore, safeScore);
      level.problemsCompleted += 1;
      level.lastPlayed = Date.now();

      profile.levels[levelKey] = level;
      profile.recentHistory = [
        {
          levelKey,
          score: safeScore,
          completedAt: level.lastPlayed,
        },
        ...normalizeRecentHistory(profile.recentHistory),
      ].slice(0, RECENT_HISTORY_LIMIT);
      profile.overall = buildOverallSummary(profile.levels);
      profile.updatedAt = Date.now();
      this._write(profile);

      return level;
    },

    resetProfile() {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn("⚠️ Failed to reset player profile from storage:", error);
        return;
      }
      this.init();
    },

    _read() {
      try {
        const storedProfile = safeParse(localStorage.getItem(STORAGE_KEY));
        if (!storedProfile) {
          return null;
        }
        return migrateProfile(storedProfile);
      } catch (error) {
        console.warn("⚠️ Failed to read player profile from storage:", error);
        return null;
      }
    },

    _write(profile) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      } catch (error) {
        console.warn("⚠️ Failed to write player profile to storage:", error);
      }
    },
  };

  window.PlayerStorage = PlayerStorage;
  console.log("✅ PlayerStorage loaded");
})();
