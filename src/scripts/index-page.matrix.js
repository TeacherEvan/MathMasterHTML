// src/scripts/index-page.matrix.js
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    COLUMN_WIDTH_PX: 20,
    ANIMATION_DURATION_MIN_SEC: 2,
    ANIMATION_DURATION_RANGE_SEC: 3,
    ANIMATION_DELAY_MAX_SEC: 2,
    COLUMN_LENGTH_MIN: 10,
    COLUMN_LENGTH_RANGE: 20,
    SYMBOLS: "0123456789+-×÷=XxΣπ∞√±∆αβγ",
  });

  const matrixBg = document.getElementById("matrixBg");

  function createMatrixColumn(index) {
    const column = document.createElement("div");
    column.className = "matrix-column";
    column.style.left = `${index * CONFIG.COLUMN_WIDTH_PX}px`;
    column.style.animationDuration = `${Math.random() *
      CONFIG.ANIMATION_DURATION_RANGE_SEC +
      CONFIG.ANIMATION_DURATION_MIN_SEC}s`;
    column.style.animationDelay = `${Math.random() *
      CONFIG.ANIMATION_DELAY_MAX_SEC}s`;

    const length =
      Math.floor(Math.random() * CONFIG.COLUMN_LENGTH_RANGE) +
      CONFIG.COLUMN_LENGTH_MIN;
    const symbolsArray = [];

    for (let j = 0; j < length; j++) {
      symbolsArray.push(
        CONFIG.SYMBOLS[Math.floor(Math.random() * CONFIG.SYMBOLS.length)],
      );
    }

    column.textContent = symbolsArray.join("\n");
    return column;
  }

  function createMatrixRain() {
    if (!matrixBg) return;

    const columns = Math.floor(window.innerWidth / CONFIG.COLUMN_WIDTH_PX);
    matrixBg.innerHTML = "";

    const fragment = document.createDocumentFragment();
    for (let i = 0; i < columns; i++) {
      fragment.appendChild(createMatrixColumn(i));
    }

    matrixBg.appendChild(fragment);
  }

  window.IndexPageModules = window.IndexPageModules || {};
  window.IndexPageModules.matrix = {
    createMatrixRain,
  };
})();
