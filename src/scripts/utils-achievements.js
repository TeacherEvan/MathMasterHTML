// utils-achievements.js - Achievement tracking system (Logic Only)
// Definitions extracted to utils-achievements.definitions.js
// UI rendering extracted to utils-achievements.ui.js

/**
 * Achievement System - Track player milestones and provide rewards
 * Uses ACHIEVEMENT_DEFINITIONS from utils-achievements.definitions.js
 * Uses AchievementUI from utils-achievements.ui.js for popup rendering
 */
const AchievementSystem = {
  // Achievement definitions (loaded from separate definitions file)
  ACHIEVEMENTS: window.ACHIEVEMENT_DEFINITIONS || {},

  // Unlocked achievements (loaded from localStorage)
  _unlocked: new Set(),

  // Stats tracking
  _stats: {
    problemsCompleted: 0,
    maxCombo: 0,
    wormsKilled: 0,
    perfectLines: 0,
    wrongClicks: 0,
  },

  /**
   * Initialize achievement system
   */
  init() {
    this._loadProgress();
    this._setupEventListeners();
    console.log("🏆 Achievement System initialized");
  },

  /**
   * Load progress from localStorage
   * @private
   */
  _loadProgress() {
    const saved = localStorage.getItem("mathmaster_achievements");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        this._unlocked = new Set(data.unlocked || []);
        this._stats = { ...this._stats, ...data.stats };
      } catch (e) {
        console.error("Failed to load achievements:", e);
      }
    }
  },

  /**
   * Save progress to localStorage
   * @private
   */
  _saveProgress() {
    const data = {
      unlocked: Array.from(this._unlocked),
      stats: this._stats,
    };
    localStorage.setItem("mathmaster_achievements", JSON.stringify(data));
  },

  /**
   * Setup event listeners for achievement tracking
   * @private
   */
  _setupEventListeners() {
    // Track problem completion
    document.addEventListener("problemCompleted", () => {
      this._stats.problemsCompleted++;
      this._checkAchievement("FIRST_BLOOD");
      this._saveProgress();
    });

    // Track combo updates
    document.addEventListener("comboUpdated", (e) => {
      if (e.detail.combo > this._stats.maxCombo) {
        this._stats.maxCombo = e.detail.combo;
        this._checkAchievement("COMBO_STARTER");
        this._checkAchievement("COMBO_MASTER");
        this._saveProgress();
      }
    });

    // Track worm kills (listen for worm explosion events)
    document.addEventListener("wormExploded", () => {
      this._stats.wormsKilled++;
      this._checkAchievement("WORM_SLAYER");
      this._saveProgress();
    });
  },

  /**
   * Check and unlock achievement if requirements met
   * @private
   * @param {string} achievementKey - Key from ACHIEVEMENTS
   */
  _checkAchievement(achievementKey) {
    const achievement = this.ACHIEVEMENTS[achievementKey];
    if (!achievement || this._unlocked.has(achievement.id)) {
      return;
    }

    const req = achievement.requirement;
    let unlocked = false;

    switch (req.type) {
      case "problems":
        unlocked = this._stats.problemsCompleted >= req.count;
        break;
      case "combo":
        unlocked = this._stats.maxCombo >= req.count;
        break;
      case "wormsKilled":
        unlocked = this._stats.wormsKilled >= req.count;
        break;
    }

    if (unlocked) {
      this._unlock(achievement);
    }
  },

  /**
   * Unlock an achievement
   * @private
   * @param {Object} achievement - Achievement object
   */
  _unlock(achievement) {
    if (this._unlocked.has(achievement.id)) return;

    this._unlocked.add(achievement.id);
    this._saveProgress();

    console.log(`🏆 Achievement Unlocked: ${achievement.name}`);

    // Show achievement popup
    this._showAchievementPopup(achievement);

    // Dispatch event
    document.dispatchEvent(
      new CustomEvent("achievementUnlocked", {
        detail: achievement,
      }),
    );
  },

  /**
   * Show achievement unlock popup
   * Delegates to AchievementUI (loaded from utils-achievements.ui.js)
   * @private
   * @param {Object} achievement - Achievement object
   */
  _showAchievementPopup(achievement) {
    if (window.AchievementUI) {
      window.AchievementUI.showAchievementPopup(achievement);
    }
  },

  /**
   * Get all achievements with unlock status
   * @returns {Object[]} Array of achievement objects with unlocked property
   */
  getAll() {
    return Object.values(this.ACHIEVEMENTS).map((a) => ({
      ...a,
      unlocked: this._unlocked.has(a.id),
    }));
  },

  /**
   * Get player stats
   * @returns {Object} Stats object
   */
  getStats() {
    return { ...this._stats };
  },
};

// Make AchievementSystem available globally
if (typeof window !== "undefined") {
  window.AchievementSystem = AchievementSystem;

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () =>
      AchievementSystem.init(),
    );
  } else {
    AchievementSystem.init();
  }
}
