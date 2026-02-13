// js/player-storage.js - Local player name + level score persistence
console.log("💾 PlayerStorage loading...");

(function() {
  const STORAGE_KEY = "mathmaster_player_profile_v1";

  function safeParse(json) {
    if (!json) return null;
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  const PlayerStorage = {
    init() {
      // Ensure baseline structure exists
      const existing = this._read();
      if (!existing) {
        this._write({
          name: null,
          levels: {},
          updatedAt: Date.now(),
        });
      }
    },

    ensurePlayerName() {
      const profile = this._read() || { name: null, levels: {} };
      if (profile.name && String(profile.name).trim().length > 0)
        return profile.name;

      const name = window.prompt("Enter your name to save scores:", "");
      const cleaned = (name || "").trim();
      profile.name = cleaned.length > 0 ? cleaned : "Player";
      profile.updatedAt = Date.now();
      this._write(profile);
      return profile.name;
    },

    getProfile() {
      return this._read();
    },

    recordProblemResult(levelKey, problemScore) {
      const profile = this._read() || { name: null, levels: {} };
      const level = profile.levels[levelKey] || {
        totalScore: 0,
        problemsCompleted: 0,
        lastPlayed: null,
      };

      level.totalScore += Math.max(0, Number(problemScore) || 0);
      level.problemsCompleted += 1;
      level.lastPlayed = Date.now();

      profile.levels[levelKey] = level;
      profile.updatedAt = Date.now();
      this._write(profile);

      return level;
    },

    _read() {
      try {
        return safeParse(localStorage.getItem(STORAGE_KEY));
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
