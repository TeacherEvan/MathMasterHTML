// utils-combo.js - Combo tracking system

/**
 * Combo System - Tracks consecutive correct answers for excitement escalation
 * Provides visual feedback multipliers and streak bonuses
 */
const ComboSystem = {
  // Current combo count
  _combo: 0,

  // Maximum combo achieved this session
  _maxCombo: 0,

  // Time window for combo maintenance (ms)
  COMBO_WINDOW: 5000,

  // Last successful hit timestamp
  _lastHitTime: 0,

  // Combo timeout timer
  _comboTimer: null,

  // Combo thresholds for visual feedback
  THRESHOLDS: {
    GOOD: 3, // "Good!" feedback
    GREAT: 5, // "Great!" + screen pulse
    AMAZING: 8, // "Amazing!" + intense effects
    LEGENDARY: 12, // "LEGENDARY!" + maximum excitement
  },

  // Combo display element
  _displayElement: null,

  /**
   * Register a successful hit, incrementing combo
   * @returns {Object} Combo state with multiplier and feedback
   */
  hit() {
    const now = Date.now();

    // Clear existing timer
    if (this._comboTimer) {
      clearTimeout(this._comboTimer);
    }

    // Increment combo
    this._combo++;
    this._lastHitTime = now;

    // Track max combo
    if (this._combo > this._maxCombo) {
      this._maxCombo = this._combo;
    }

    // Set decay timer
    this._comboTimer = setTimeout(() => {
      this._decayCombo();
    }, this.COMBO_WINDOW);

    // Calculate feedback
    const feedback = this._getFeedback();

    // Update display
    this._updateDisplay();

    // Dispatch combo event
    document.dispatchEvent(
      new CustomEvent("comboUpdated", {
        detail: {
          combo: this._combo,
          multiplier: feedback.multiplier,
          level: feedback.level,
          message: feedback.message,
        },
      }),
    );

    return feedback;
  },

  /**
   * Break the combo (wrong answer or timeout)
   */
  break() {
    if (this._combo > 0) {
      console.log(`💔 Combo broken at ${this._combo}!`);

      // Dispatch combo break event
      document.dispatchEvent(
        new CustomEvent("comboBroken", {
          detail: { finalCombo: this._combo },
        }),
      );
    }

    this._combo = 0;

    if (this._comboTimer) {
      clearTimeout(this._comboTimer);
      this._comboTimer = null;
    }

    this._updateDisplay();
  },

  /**
   * Decay combo on timeout
   * @private
   */
  _decayCombo() {
    if (this._combo > 0) {
      console.log(`⏰ Combo decayed from ${this._combo}`);
      this._combo = Math.max(0, this._combo - 1);
      this._updateDisplay();

      // Continue decay if combo remains
      if (this._combo > 0) {
        this._comboTimer = setTimeout(() => {
          this._decayCombo();
        }, this.COMBO_WINDOW);
      }
    }
  },

  /**
   * Get feedback based on current combo
   * @private
   * @returns {Object} Feedback object with multiplier, level, message
   */
  _getFeedback() {
    const combo = this._combo;

    if (combo >= this.THRESHOLDS.LEGENDARY) {
      return {
        multiplier: 2.0,
        level: "legendary",
        message: "🔥 LEGENDARY! 🔥",
        color: "#ff00ff",
        screenEffect: "legendary-pulse",
      };
    } else if (combo >= this.THRESHOLDS.AMAZING) {
      return {
        multiplier: 1.75,
        level: "amazing",
        message: "⚡ AMAZING! ⚡",
        color: "#ffff00",
        screenEffect: "amazing-pulse",
      };
    } else if (combo >= this.THRESHOLDS.GREAT) {
      return {
        multiplier: 1.5,
        level: "great",
        message: "✨ GREAT! ✨",
        color: "#00ffff",
        screenEffect: "great-pulse",
      };
    } else if (combo >= this.THRESHOLDS.GOOD) {
      return {
        multiplier: 1.25,
        level: "good",
        message: "👍 Good!",
        color: "#00ff00",
        screenEffect: null,
      };
    }

    return {
      multiplier: 1.0,
      level: "normal",
      message: null,
      color: "#00ff00",
      screenEffect: null,
    };
  },

  /**
   * Update combo display
   * @private
   */
  _updateDisplay() {
    // Create display if doesn't exist
    if (!this._displayElement) {
      this._createDisplay();
    }

    if (this._combo > 0) {
      const feedback = this._getFeedback();
      this._displayElement.innerHTML = `
                <div class="combo-count" style="color: ${feedback.color}">${
        this._combo
      }x</div>
                ${
                  feedback.message
                    ? `<div class="combo-message">${feedback.message}</div>`
                    : ""
                }
            `;
      this._displayElement.style.display = "block";
      this._displayElement.style.transform = "scale(1.2)";
      setTimeout(() => {
        if (this._displayElement) {
          this._displayElement.style.transform = "scale(1)";
        }
      }, 100);
    } else {
      this._displayElement.style.display = "none";
    }
  },

  /**
   * Create combo display element
   * @private
   */
  _createDisplay() {
    const display = document.createElement("div");
    display.id = "combo-display";
    display.style.cssText = `
            position: fixed;
            top: 80px;
            left: 50%;
            transform: translateX(-50%);
            font-family: 'Orbitron', monospace;
            font-size: 2em;
            font-weight: bold;
            text-align: center;
            z-index: 10002;
            pointer-events: none;
            transition: transform 0.1s ease-out;
            text-shadow: 0 0 20px currentColor;
            display: none;
        `;
    document.body.appendChild(display);
    this._displayElement = display;
  },

  /**
   * Get current combo count
   * @returns {number} Current combo
   */
  getCombo() {
    return this._combo;
  },

  /**
   * Get maximum combo achieved
   * @returns {number} Max combo
   */
  getMaxCombo() {
    return this._maxCombo;
  },

  /**
   * Reset combo system (new game)
   */
  reset() {
    this._combo = 0;
    this._maxCombo = 0;
    if (this._comboTimer) {
      clearTimeout(this._comboTimer);
      this._comboTimer = null;
    }
    this._updateDisplay();
  },
};

// Make ComboSystem available globally
if (typeof window !== "undefined") {
  window.ComboSystem = ComboSystem;
}
