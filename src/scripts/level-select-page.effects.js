// src/scripts/level-select-page.effects.js
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    MATRIX: {
      COLUMN_WIDTH_PX: 20,
      ANIMATION_DURATION_MIN_SEC: 3,
      ANIMATION_DURATION_RANGE_SEC: 4,
      ANIMATION_DELAY_MAX_SEC: 3,
      COLUMN_LENGTH_MIN: 8,
      COLUMN_LENGTH_RANGE: 15,
      SYMBOLS: "0123456789+-×÷=XxΣπ∞√±∆αβγθλμ",
    },
    EFFECTS: {
      TITLE_INTERVAL_MS: 3000,
      SUBTITLE_INTERVAL_MS: 5000,
      BRIGHTNESS_MIN: 0.8,
      BRIGHTNESS_RANGE: 0.3,
      COLORS: Object.freeze(["#ffd700", "#ffcc00", "#ffaa00"]),
    },
    RESIZE_DEBOUNCE_MS: 200,
  });

  const elements = {
    matrixBg: document.getElementById("matrixBg"),
    title: document.querySelector(".main-title"),
    subtitle: document.querySelector(".subtitle"),
  };

  const state = {
    titleIntervalId: null,
    subtitleIntervalId: null,
    resizeTimer: null,
    colorIndex: 0,
  };

  function createMatrixColumn(index) {
    const {
      COLUMN_WIDTH_PX,
      ANIMATION_DURATION_MIN_SEC,
      ANIMATION_DURATION_RANGE_SEC,
      ANIMATION_DELAY_MAX_SEC,
      COLUMN_LENGTH_MIN,
      COLUMN_LENGTH_RANGE,
      SYMBOLS,
    } = CONFIG.MATRIX;

    const column = document.createElement("div");
    column.className = "matrix-column";
    column.style.left = `${index * COLUMN_WIDTH_PX}px`;
    column.style.animationDuration = `${Math.random() *
      ANIMATION_DURATION_RANGE_SEC +
      ANIMATION_DURATION_MIN_SEC}s`;
    column.style.animationDelay = `${Math.random() * ANIMATION_DELAY_MAX_SEC}s`;

    const length =
      Math.floor(Math.random() * COLUMN_LENGTH_RANGE) + COLUMN_LENGTH_MIN;
    const symbolsArray = [];

    for (let j = 0; j < length; j++) {
      symbolsArray.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }

    column.textContent = symbolsArray.join("\n");
    return column;
  }

  function createMatrixRain() {
    const { matrixBg } = elements;
    if (!matrixBg) return;

    const columns = Math.floor(
      window.innerWidth / CONFIG.MATRIX.COLUMN_WIDTH_PX,
    );

    matrixBg.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < columns; i++) {
      fragment.appendChild(createMatrixColumn(i));
    }

    matrixBg.appendChild(fragment);
  }

  function startDynamicEffects() {
    stopDynamicEffects();
    const { title, subtitle } = elements;
    if (!title || !subtitle) return;

    const {
      TITLE_INTERVAL_MS,
      SUBTITLE_INTERVAL_MS,
      BRIGHTNESS_MIN,
      BRIGHTNESS_RANGE,
      COLORS,
    } = CONFIG.EFFECTS;

    state.titleIntervalId = setInterval(() => {
      const intensity = Math.random() * BRIGHTNESS_RANGE + BRIGHTNESS_MIN;
      title.style.filter = `brightness(${intensity})`;
    }, TITLE_INTERVAL_MS);

    state.subtitleIntervalId = setInterval(() => {
      subtitle.style.color = COLORS[state.colorIndex];
      state.colorIndex = (state.colorIndex + 1) % COLORS.length;
    }, SUBTITLE_INTERVAL_MS);
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

  function handleVisibilityChange() {
    if (document.hidden) {
      stopDynamicEffects();
    } else {
      startDynamicEffects();
    }
  }

  function handleResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(() => {
      createMatrixRain();
    }, CONFIG.RESIZE_DEBOUNCE_MS);
  }

  function handleLoad() {
    createMatrixRain();
    startDynamicEffects();
  }

  function initEffects() {
    window.addEventListener("load", handleLoad);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  function destroyEffects() {
    stopDynamicEffects();
    clearTimeout(state.resizeTimer);
    window.removeEventListener("load", handleLoad);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initEffects = initEffects;
  window.LevelSelectPage.destroyEffects = destroyEffects;
})();
