// src/scripts/index-page.js
/**
 * Index Page Module
 * Handles matrix rain animation, ripple effects, and dynamic title effects
 * for the main landing page.
 */
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    MATRIX: {
      COLUMN_WIDTH_PX: 20,
      ANIMATION_DURATION_MIN_SEC: 2,
      ANIMATION_DURATION_RANGE_SEC: 3,
      ANIMATION_DELAY_MAX_SEC: 2,
      COLUMN_LENGTH_MIN: 10,
      COLUMN_LENGTH_RANGE: 20,
      SYMBOLS: "0123456789+-×÷=XxΣπ∞√±∆αβγ",
    },
    RIPPLE: {
      SIZE_PX: 60,
      REMOVE_DELAY_MS: 600,
      NAVIGATION_DELAY_MS: 300,
    },
    EFFECTS: {
      TITLE_INTERVAL_MS: 2000,
      SUBTITLE_INTERVAL_MS: 4000,
      BRIGHTNESS_MIN: 0.5,
      BRIGHTNESS_RANGE: 0.5,
    },
    RESIZE_DEBOUNCE_MS: 200,
    NAVIGATION_TARGET: "/src/pages/level-select.html",
    COLORS: Object.freeze(["#ffd700", "#ffcc00", "#ffaa00", "#ff9900"]),
  });

  const elements = {
    matrixBg: document.getElementById("matrixBg"),
    body: document.body,
    title: document.querySelector(".main-title"),
    subtitle: document.querySelector(".subtitle"),
  };

  const state = {
    titleIntervalId: null,
    subtitleIntervalId: null,
    resizeTimer: null,
    colorIndex: 0,
    isDestroyed: false,
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
    if (!matrixBg || state.isDestroyed) return;

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

  function navigateToLevelSelect(delayMs) {
    if (state.isDestroyed) return;
    setTimeout(() => {
      if (!state.isDestroyed) {
        window.location.href = CONFIG.NAVIGATION_TARGET;
      }
    }, delayMs);
  }

  function createRippleAt(x, y) {
    if (state.isDestroyed) return;
    const { body } = elements;
    if (!body) return;

    const { SIZE_PX, REMOVE_DELAY_MS, NAVIGATION_DELAY_MS } = CONFIG.RIPPLE;

    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${SIZE_PX}px`;
    ripple.style.left = `${x - SIZE_PX / 2}px`;
    ripple.style.top = `${y - SIZE_PX / 2}px`;

    body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, REMOVE_DELAY_MS);

    navigateToLevelSelect(NAVIGATION_DELAY_MS);
  }

  function createRipple(event) {
    createRippleAt(event.clientX, event.clientY);
  }

  function createCenteredRipple() {
    createRippleAt(window.innerWidth / 2, window.innerHeight / 2);
  }

  function startDynamicEffects() {
    stopDynamicEffects();
    const { title, subtitle } = elements;
    if (!title || !subtitle || state.isDestroyed) return;

    const {
      TITLE_INTERVAL_MS,
      SUBTITLE_INTERVAL_MS,
      BRIGHTNESS_MIN,
      BRIGHTNESS_RANGE,
    } = CONFIG.EFFECTS;

    state.titleIntervalId = setInterval(() => {
      if (state.isDestroyed) return;
      const intensity = Math.random() * BRIGHTNESS_RANGE + BRIGHTNESS_MIN;
      title.style.filter = `brightness(${intensity})`;
    }, TITLE_INTERVAL_MS);

    state.subtitleIntervalId = setInterval(() => {
      if (state.isDestroyed) return;
      subtitle.style.color = CONFIG.COLORS[state.colorIndex];
      state.colorIndex = (state.colorIndex + 1) % CONFIG.COLORS.length;
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

  function handleKeydown(event) {
    if (event.repeat || state.isDestroyed) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      createCenteredRipple();
    }
  }

  function handleDOMContentLoaded() {
    createMatrixRain();
    startDynamicEffects();
  }

  function init() {
    if (!elements.body) {
      console.error("[IndexPage] document.body not available");
      return;
    }

    document.addEventListener("DOMContentLoaded", handleDOMContentLoaded);
    window.addEventListener("resize", handleResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("keydown", handleKeydown);
    elements.body.addEventListener("click", createRipple, { passive: true });
  }

  function destroy() {
    state.isDestroyed = true;
    stopDynamicEffects();
    clearTimeout(state.resizeTimer);

    document.removeEventListener("DOMContentLoaded", handleDOMContentLoaded);
    window.removeEventListener("resize", handleResize);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    document.removeEventListener("keydown", handleKeydown);

    if (elements.body) {
      elements.body.removeEventListener("click", createRipple);
    }

    elements.matrixBg = null;
    elements.body = null;
    elements.title = null;
    elements.subtitle = null;
  }

  window.__indexPageDestroy__ = destroy;

  init();
})();
