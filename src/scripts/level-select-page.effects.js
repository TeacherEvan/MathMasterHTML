// src/scripts/level-select-page.effects.js
(function () {
  "use strict";

  const CONFIG = Object.freeze({
    MATRIX: {
      COLUMN_WIDTH_PX: 24,
      ANIMATION_DURATION_MIN_SEC: 9,
      ANIMATION_DURATION_RANGE_SEC: 5,
      ANIMATION_DELAY_MAX_SEC: 5,
      COLUMN_LENGTH_MIN: 8,
      COLUMN_LENGTH_RANGE: 13,
      SYMBOLS: "0123456789+-×÷=XxΣπ∞√±∆αβγθλμ",
    },
    RESIZE_DEBOUNCE_MS: 180,
  });

  const elements = {
    body: document.body,
    matrixBg: document.getElementById("matrixBg"),
  };

  const state = {
    motionFrame: null,
    resizeTimer: null,
  };

  function prefersReducedMotion() {
    return Boolean(
      window.UserSettings?.getSettings?.()?.display?.reducedMotion ||
        window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    );
  }

  function createMatrixColumn(index, columnWidth) {
    const {
      ANIMATION_DURATION_MIN_SEC,
      ANIMATION_DURATION_RANGE_SEC,
      ANIMATION_DELAY_MAX_SEC,
      COLUMN_LENGTH_MIN,
      COLUMN_LENGTH_RANGE,
      SYMBOLS,
    } = CONFIG.MATRIX;

    const column = document.createElement("div");
    column.className = "matrix-column";
    column.style.left = `${index * columnWidth}px`;
    column.style.animationDuration = `${Math.random() * ANIMATION_DURATION_RANGE_SEC + ANIMATION_DURATION_MIN_SEC}s`;
    column.style.animationDelay = `${Math.random() * ANIMATION_DELAY_MAX_SEC}s`;

    const length =
      Math.floor(Math.random() * COLUMN_LENGTH_RANGE) + COLUMN_LENGTH_MIN;
    const symbolsArray = [];

    for (let j = 0; j < length; j += 1) {
      symbolsArray.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]);
    }

    column.textContent = symbolsArray.join("\n");
    return column;
  }

  function createMatrixRain() {
    const { matrixBg } = elements;
    if (!matrixBg) return;

    const columnWidth = CONFIG.MATRIX.COLUMN_WIDTH_PX;
    const columns = Math.max(8, Math.floor(window.innerWidth / columnWidth));
    const effectiveColumns = prefersReducedMotion()
      ? Math.max(8, Math.floor(columns * 0.6))
      : columns;

    matrixBg.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < effectiveColumns; i += 1) {
      fragment.appendChild(createMatrixColumn(i, columnWidth));
    }

    matrixBg.appendChild(fragment);
  }

  function applyMotionPreference() {
    const { body } = elements;
    if (!body) return;

    const reducedMotion = prefersReducedMotion();
    body.classList.toggle("level-motion-disabled", reducedMotion);

    if (state.motionFrame) {
      window.cancelAnimationFrame(state.motionFrame);
      state.motionFrame = null;
    }

    if (reducedMotion) {
      return;
    }

    state.motionFrame = window.requestAnimationFrame(() => {
      state.motionFrame = window.requestAnimationFrame(() => {
        body.classList.add("level-motion-ready");
        state.motionFrame = null;
      });
    });
  }

  function handleResize() {
    clearTimeout(state.resizeTimer);
    state.resizeTimer = setTimeout(createMatrixRain, CONFIG.RESIZE_DEBOUNCE_MS);
  }

  function handleLoad() {
    createMatrixRain();
  }

  function initEffects() {
    applyMotionPreference();
    window.addEventListener("resize", handleResize);
    document.addEventListener(
      window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
      () => {
        applyMotionPreference();
        createMatrixRain();
      },
    );

    if (document.readyState === "loading") {
      window.addEventListener("load", handleLoad, { once: true });
    } else {
      handleLoad();
    }
  }

  function destroyEffects() {
    if (state.motionFrame) {
      window.cancelAnimationFrame(state.motionFrame);
      state.motionFrame = null;
    }
    clearTimeout(state.resizeTimer);
    window.removeEventListener("load", handleLoad);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener(
      window.GameEvents?.USER_SETTINGS_CHANGED || "userSettingsChanged",
      createMatrixRain,
    );
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initEffects = initEffects;
  window.LevelSelectPage.destroyEffects = destroyEffects;
})();
