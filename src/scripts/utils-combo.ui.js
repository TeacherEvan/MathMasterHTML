// src/scripts/utils-combo.ui.js - Combo Display UI Rendering
// Extracted from utils-combo.js to separate presentation from combo logic
console.log("🔗 Combo UI Loading...");

/**
 * Combo UI - Handles visual rendering of combo counter and feedback
 * Delegates display updates from ComboSystem
 */
const ComboUI = {
  /** @type {HTMLElement|null} */
  _displayElement: null,

  /**
   * Update combo display with current state
   * @param {number} combo - Current combo count
   * @param {Object} feedback - Feedback object with color, message
   */
  updateDisplay(combo, feedback) {
    // Create display if doesn't exist
    if (!this._displayElement) {
      this._createDisplay();
    }

    if (combo > 0) {
      this._displayElement.innerHTML = `
                <div class="combo-count" style="color: ${
                  feedback.color
                }">${combo}x</div>
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
   * Create combo display DOM element
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
};

// Export globally
window.ComboUI = ComboUI;

console.log("🔗 Combo UI loaded");
