// life-stats-page.core.js — external bootstrap (no inline scripts; CSP-safe)
// Loaded on life-stats.html and index.html. Self-initializes the relevant modules.
(function () {
  function boot() {
    // Tax badge on every page
    if (window.LifeStatsTax) window.LifeStatsTax.init();
    // Stats board controls (only when on the board)
    if (window.LifeStatsControls && document.getElementById("ls-tabs")) {
      window.LifeStatsControls.init();
    }
    // Menu feature graphs (only when the feature panel exists)
    if (window.LifeStatsMenu && document.getElementById("life-stats-features")) {
      window.LifeStatsMenu.init();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
