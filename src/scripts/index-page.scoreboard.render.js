// src/scripts/index-page.scoreboard.render.js
(function() {
  "use strict";

  const LEVEL_LABELS = {
    beginner: "Beginner",
    warrior: "Warrior",
    master: "Master",
  };

  const scoreFormatter = new Intl.NumberFormat();
  const timeFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  function formatScore(value) {
    return scoreFormatter.format(Math.max(0, Number(value) || 0));
  }

  function formatTimestamp(value) {
    if (typeof value !== "number" || value <= 0) {
      return "Not played yet";
    }

    return timeFormatter.format(new Date(value));
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getSummary() {
    const fallbackSummary = {
      profile: window.PlayerStorage?.getProfile?.() || {
        name: "Player",
        levels: {},
      },
      overall: {
        totalScore: 0,
        problemsCompleted: 0,
        lastPlayed: null,
      },
      recentHistory: [],
    };

    return window.PlayerStorage?.getScoreboardSummary?.("beginner") || fallbackSummary;
  }

  function renderLevelStats(container, levels) {
    container.innerHTML = Object.entries(LEVEL_LABELS)
      .map(([levelKey, label]) => {
        const stats = levels[levelKey] || {};
        return `
          <article class="scoreboard-level-card">
            <h3>${escapeHtml(label)}</h3>
            <dl>
              <div class="scoreboard-stat-row"><dt>Total score</dt><dd>${formatScore(stats.totalScore)}</dd></div>
              <div class="scoreboard-stat-row"><dt>Best score</dt><dd>${formatScore(stats.bestProblemScore)}</dd></div>
              <div class="scoreboard-stat-row"><dt>Problems solved</dt><dd>${formatScore(stats.problemsCompleted)}</dd></div>
              <div class="scoreboard-stat-row"><dt>Last played</dt><dd>${escapeHtml(formatTimestamp(stats.lastPlayed))}</dd></div>
            </dl>
          </article>
        `;
      })
      .join("");
  }

  function renderHistory(container, history) {
    if (!Array.isArray(history) || history.length === 0) {
      container.innerHTML = `
        <li class="scoreboard-empty-state">
          No local score history yet. Solve a problem to start filling this board.
        </li>
      `;
      return;
    }

    container.innerHTML = history
      .map((entry) => {
        const levelLabel = LEVEL_LABELS[entry.levelKey] || entry.levelKey;
        return `
          <li class="scoreboard-history-item">
            <div>
              <strong>${escapeHtml(levelLabel)}</strong>
              <span>${escapeHtml(formatTimestamp(entry.completedAt))}</span>
            </div>
            <span class="scoreboard-history-score">${formatScore(entry.score)}</span>
          </li>
        `;
      })
      .join("");
  }

  function getDisplayName(profile) {
    if (typeof profile?.name === "string" && profile.name.trim().length > 0) {
      return profile.name.trim();
    }

    return "Player";
  }

  function renderSummary(elements) {
    const summary = getSummary();
    const profile = summary.profile || { name: "Player", levels: {} };
    const overall = summary.overall || {
      totalScore: 0,
      problemsCompleted: 0,
      lastPlayed: null,
    };

    elements.playerName.textContent = getDisplayName(profile);
    elements.overallSummary.innerHTML = `
      <div class="scoreboard-stat-row"><dt>Total score</dt><dd>${formatScore(overall.totalScore)}</dd></div>
      <div class="scoreboard-stat-row"><dt>Problems solved</dt><dd>${formatScore(overall.problemsCompleted)}</dd></div>
      <div class="scoreboard-stat-row"><dt>Last played</dt><dd>${escapeHtml(formatTimestamp(overall.lastPlayed))}</dd></div>
    `;

    renderLevelStats(elements.levelStats, profile.levels || {});
    renderHistory(elements.historyList, summary.recentHistory);
    return summary;
  }

  window.IndexPageScoreboardRender = {
    getDisplayName,
    renderSummary,
  };
})();
