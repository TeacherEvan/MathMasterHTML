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
    document
      .querySelectorAll(".achievement-popup")
      .forEach((existingPopup) => existingPopup.remove());

    const popup = document.createElement("div");
    popup.className = "achievement-popup";
    popup.setAttribute("role", "status");
    popup.setAttribute("aria-live", "polite");
    popup.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">Achievement Unlocked!</div>
                <div class="achievement-name">${achievement.name}</div>
                <div class="achievement-desc">${achievement.description}</div>
            </div>
        `;
    const panelC = document.getElementById("panel-c");
    const announcementLayer = document.getElementById("panel-c-announcements");
    if (panelC) {
      (announcementLayer || panelC).appendChild(popup);
    } else {
      document.body.appendChild(popup);
    }

    window.setTimeout(() => {
      popup.classList.add("is-exiting");
    }, 3000);

    window.setTimeout(() => popup.remove(), 8000);
  },
};

// Export globally
window.AchievementUI = AchievementUI;

console.log("🏆 Achievement UI loaded");
