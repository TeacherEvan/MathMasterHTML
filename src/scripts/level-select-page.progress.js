// src/scripts/level-select-page.progress.js
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    MAX_PROBLEMS: 50,
    ANIMATE_DELAY_MS: 1000,
  });
  const LEVELS = ["beginner", "warrior", "master"];
  const SCOREBOARD_STATS = [
    { className: "completion-stat", label: "Completed", valueKey: "problemsCompleted" },
    { className: "best-score-stat", label: "Best Score", valueKey: "bestProblemScore" },
    { className: "total-score-stat", label: "Total Score", valueKey: "totalScore" },
  ];

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

  function formatScore(value) {
    return new Intl.NumberFormat().format(Math.max(0, Number(value) || 0));
  }

  function getPlayerProfile() {
    if (!window.PlayerStorage?.getProfile) {
      return null;
    }
    return window.PlayerStorage.getProfile();
  }

  function getLevelSummary(levelName, problemsCompleted) {
    const profile = getPlayerProfile();
    const storedLevel = profile?.levels?.[levelName];

    return {
      problemsCompleted: Math.max(
        problemsCompleted,
        Number(storedLevel?.problemsCompleted) || 0,
      ),
      bestProblemScore: Math.max(0, Number(storedLevel?.bestProblemScore) || 0),
      totalScore: Math.max(0, Number(storedLevel?.totalScore) || 0),
    };
  }

  function upsertStat(statsSection, className, label, value) {
    let stat = statsSection.querySelector(`.${className}`);
    if (!stat) {
      stat = document.createElement("div");
      stat.className = `stat ${className}`;

      const valueSpan = document.createElement("span");
      valueSpan.className = "stat-value";

      const labelSpan = document.createElement("span");
      labelSpan.className = "stat-label";
      labelSpan.textContent = label;

      stat.appendChild(valueSpan);
      stat.appendChild(labelSpan);
      statsSection.appendChild(stat);
    }

    const valueSpan = stat.querySelector(".stat-value");
    if (valueSpan) {
      valueSpan.textContent = value;
    }
  }

  function animateProgress() {
    const progressBars = document.querySelectorAll(".progress-fill");

    progressBars.forEach((bar, index) => {
      const levelName = LEVELS[index];
      const countKey = `mathmaster_problems_${levelName}`;
      const rawValue = safeGetLocalStorage(countKey);
      const problemsCompleted = parseInt(rawValue || "0", 10);
      const levelSummary = getLevelSummary(levelName, problemsCompleted);

      const percentage = Math.min(
        (levelSummary.problemsCompleted / CONFIG.MAX_PROBLEMS) * 100,
        100,
      );

      const card = elements.cards[index];
      const statsSection = card?.querySelector(".level-stats");
      if (statsSection) {
        SCOREBOARD_STATS.forEach(({ className, label, valueKey }) => {
          const rawValueForStat = levelSummary[valueKey];
          const formattedValue =
            valueKey === "problemsCompleted"
              ? String(rawValueForStat)
              : formatScore(rawValueForStat);
          upsertStat(statsSection, className, label, formattedValue);
        });
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
      "⚠️ Are you sure you want to reset ALL progress? This will clear your console slots, scoreboard data, and problem completion counts for all levels!",
    );

    if (!confirmReset) return;

    LEVELS.forEach((level) => {
      safeRemoveLocalStorage(`mathmaster_console_${level}`);
      safeRemoveLocalStorage(`mathmaster_problems_${level}`);
    });
    window.PlayerStorage?.resetProfile?.();

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
    window.PlayerStorage?.init?.();
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
