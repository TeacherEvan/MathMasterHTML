// src/scripts/utils-achievements.ui.js - Achievement UI Rendering
// Extracted from utils-achievements.js to separate presentation from logic
console.log("🏆 Achievement UI Loading...");

/**
 * Achievement UI - Handles visual rendering of achievement popups
 * Separated from AchievementSystem logic for single-responsibility
 */
const AchievementUI = {
  /**
   * Show achievement unlock popup with slide-in/slide-out animation
   * @param {Object} achievement - Achievement object with icon, name, description
   */
  showAchievementPopup(achievement) {
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
};

// Export globally
window.AchievementUI = AchievementUI;

console.log("🏆 Achievement UI loaded");
