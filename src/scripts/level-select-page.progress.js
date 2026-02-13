// src/scripts/level-select-page.progress.js
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    MAX_PROBLEMS: 50,
    ANIMATE_DELAY_MS: 1000,
  });

  const elements = {
    resetButton: document.querySelector(".reset-progress-btn"),
    cards: Array.from(document.querySelectorAll(".level-card")),
  };

  function safeGetLocalStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.warn("⚠️ LocalStorage read failed:", error);
      return null;
    }
  }

  function safeRemoveLocalStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn("⚠️ LocalStorage remove failed:", error);
    }
  }

  function animateProgress() {
    const levels = ["beginner", "warrior", "master"];
    const progressBars = document.querySelectorAll(".progress-fill");

    progressBars.forEach((bar, index) => {
      const levelName = levels[index];
      const countKey = `mathmaster_problems_${levelName}`;
      const rawValue = safeGetLocalStorage(countKey);
      const problemsCompleted = parseInt(rawValue || "0", 10);

      const percentage = Math.min(
        (problemsCompleted / CONFIG.MAX_PROBLEMS) * 100,
        100,
      );

      const card = elements.cards[index];
      const statsSection = card?.querySelector(".level-stats");
      if (statsSection && problemsCompleted > 0) {
        let completionStat = statsSection.querySelector(".completion-stat");
        if (!completionStat) {
          completionStat = document.createElement("div");
          completionStat.className = "stat completion-stat";

          const valueSpan = document.createElement("span");
          valueSpan.className = "stat-value";
          valueSpan.textContent = String(problemsCompleted);

          const labelSpan = document.createElement("span");
          labelSpan.className = "stat-label";
          labelSpan.textContent = "Completed";

          completionStat.appendChild(valueSpan);
          completionStat.appendChild(labelSpan);
          statsSection.appendChild(completionStat);
        } else {
          const valueSpan = completionStat.querySelector(".stat-value");
          if (valueSpan) {
            valueSpan.textContent = String(problemsCompleted);
          }
        }
      }

      bar.style.width = "0%";
      setTimeout(() => {
        bar.style.transition = "width 2s ease-in-out";
        bar.style.width = `${percentage}%`;
      }, index * 200);
    });
  }

  function resetProgress() {
    const confirmReset = confirm(
      "⚠️ Are you sure you want to reset ALL progress? This will clear your console slots and problem completion counts for all levels!",
    );

    if (!confirmReset) return;

    ["beginner", "warrior", "master"].forEach((level) => {
      safeRemoveLocalStorage(`mathmaster_console_${level}`);
      safeRemoveLocalStorage(`mathmaster_problems_${level}`);
    });

    console.log("🔄 All progress reset!");
    alert("✅ Progress reset successfully!");
    window.location.reload();
  }

  function animateCards() {
    elements.cards.forEach((card, index) => {
      card.style.opacity = "0";
      card.style.transform = "translateY(50px)";
      setTimeout(() => {
        card.style.transition = "all 0.6s ease-out";
        card.style.opacity = "1";
        card.style.transform = "translateY(0)";
      }, index * 200 + 500);
    });
  }

  function handleLoad() {
    animateCards();
    setTimeout(animateProgress, CONFIG.ANIMATE_DELAY_MS);
  }

  function initProgress() {
    window.addEventListener("load", handleLoad);
    if (elements.resetButton) {
      elements.resetButton.addEventListener("click", resetProgress);
    }
  }

  function destroyProgress() {
    window.removeEventListener("load", handleLoad);
    if (elements.resetButton) {
      elements.resetButton.removeEventListener("click", resetProgress);
    }
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initProgress = initProgress;
  window.LevelSelectPage.destroyProgress = destroyProgress;
})();
