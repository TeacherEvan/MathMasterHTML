// src/scripts/index-page.effects.js
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    TITLE_INTERVAL_MS: 2000,
    SUBTITLE_INTERVAL_MS: 4000,
    BRIGHTNESS_MIN: 0.5,
    BRIGHTNESS_RANGE: 0.5,
    COLORS: Object.freeze(["#ffd700", "#ffcc00", "#ffaa00", "#ff9900"]),
  });

  const title = document.querySelector(".main-title");
  const subtitle = document.querySelector(".subtitle");

  const state = {
    titleIntervalId: null,
    subtitleIntervalId: null,
    colorIndex: 0,
  };

  function startDynamicEffects() {
    stopDynamicEffects();
    if (!title || !subtitle) return;

    state.titleIntervalId = setInterval(() => {
      const intensity =
        Math.random() * CONFIG.BRIGHTNESS_RANGE + CONFIG.BRIGHTNESS_MIN;
      title.style.filter = `brightness(${intensity})`;
    }, CONFIG.TITLE_INTERVAL_MS);

    state.subtitleIntervalId = setInterval(() => {
      subtitle.style.color = CONFIG.COLORS[state.colorIndex];
      state.colorIndex = (state.colorIndex + 1) % CONFIG.COLORS.length;
    }, CONFIG.SUBTITLE_INTERVAL_MS);
  }

  function stopDynamicEffects() {
    if (state.titleIntervalId) {
      clearInterval(state.titleIntervalId);
      state.titleIntervalId = null;
    }
    if (state.subtitleIntervalId) {
      clearInterval(state.subtitleIntervalId);
      state.subtitleIntervalId = null;
    }
  }

  window.IndexPageModules = window.IndexPageModules || {};
  window.IndexPageModules.effects = {
    startDynamicEffects,
    stopDynamicEffects,
  };
})();
