// utils-achievements.js - Achievement tracking system

/**
 * Achievement System - Track player milestones and provide rewards
 */
const AchievementSystem = {
  // Achievement definitions
  ACHIEVEMENTS: {
    FIRST_BLOOD: {
      id: "first_blood",
      name: "First Blood",
      description: "Complete your first problem",
      icon: "🎯",
      requirement: { type: "problems", count: 1 },
    },
    COMBO_STARTER: {
      id: "combo_starter",
      name: "Combo Starter",
      description: "Achieve a 3x combo",
      icon: "🔗",
      requirement: { type: "combo", count: 3 },
    },
    COMBO_MASTER: {
      id: "combo_master",
      name: "Combo Master",
      description: "Achieve a 10x combo",
      icon: "⚡",
      requirement: { type: "combo", count: 10 },
    },
    WORM_SLAYER: {
      id: "worm_slayer",
      name: "Worm Slayer",
      description: "Destroy 10 worms",
      icon: "💀",
      requirement: { type: "wormsKilled", count: 10 },
    },
    SPEEDSTER: {
      id: "speedster",
      name: "Speedster",
      description: "Complete a problem in under 30 seconds",
      icon: "🏃",
      requirement: { type: "fastComplete", time: 30000 },
    },
    PERFECT_LINE: {
      id: "perfect_line",
      name: "Perfect Line",
      description: "Complete a line without any wrong clicks",
      icon: "✨",
      requirement: { type: "perfectLine", count: 1 },
    },
    LEVEL_MASTER: {
      id: "level_master",
      name: "Level Master",
      description: "Complete all problems in a level",
      icon: "👑",
      requirement: { type: "levelComplete", count: 1 },
    },
  },

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
   * @private
   * @param {Object} achievement - Achievement object
   */
  _showAchievementPopup(achievement) {
    const popup = document.createElement("div");
    popup.className = "achievement-popup";
    popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
    popup.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, rgba(0,0,0,0.95), rgba(30,30,30,0.95));
            border: 2px solid gold;
            border-radius: 12px;
            padding: 15px 20px;
            display: flex;
            align-items: center;
            gap: 15px;
            font-family: 'Orbitron', monospace;
            z-index: 10003;
            animation: achievement-slide-in 0.5s ease-out, achievement-slide-out 0.5s ease-in 3.5s forwards;
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
        `;

    // Add achievement icon styling
    const iconStyle = popup.querySelector(".achievement-icon");
    iconStyle.style.cssText = "font-size: 2.5em;";

    const titleStyle = popup.querySelector(".achievement-title");
    titleStyle.style.cssText =
      "color: gold; font-size: 0.8em; text-transform: uppercase;";

    const nameStyle = popup.querySelector(".achievement-name");
    nameStyle.style.cssText =
      "color: #fff; font-size: 1.1em; font-weight: bold;";

    const descStyle = popup.querySelector(".achievement-desc");
    descStyle.style.cssText = "color: #aaa; font-size: 0.75em;";

    document.body.appendChild(popup);

    // Remove after animation
    setTimeout(() => popup.remove(), 4000);
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
