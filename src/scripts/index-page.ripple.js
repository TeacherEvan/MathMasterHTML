// src/scripts/index-page.ripple.js
(function() {
  "use strict";

  const CONFIG = Object.freeze({
    SIZE_PX: 60,
    REMOVE_DELAY_MS: 600,
    NAVIGATION_DELAY_MS: 300,
    NAVIGATION_TARGET: "/src/pages/level-select.html",
  });

  const body = document.body;

  function navigateToLevelSelect() {
    setTimeout(() => {
      window.location.href = CONFIG.NAVIGATION_TARGET;
    }, CONFIG.NAVIGATION_DELAY_MS);
  }

  function createRippleAt(x, y) {
    if (!body) return;

    const ripple = document.createElement("div");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = `${CONFIG.SIZE_PX}px`;
    ripple.style.left = `${x - CONFIG.SIZE_PX / 2}px`;
    ripple.style.top = `${y - CONFIG.SIZE_PX / 2}px`;

    body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, CONFIG.REMOVE_DELAY_MS);

    navigateToLevelSelect();
  }

  function createRippleFromEvent(event) {
    createRippleAt(event.clientX, event.clientY);
  }

  function createCenteredRipple() {
    createRippleAt(window.innerWidth / 2, window.innerHeight / 2);
  }

  window.IndexPageModules = window.IndexPageModules || {};
  window.IndexPageModules.ripple = {
    createRippleFromEvent,
    createCenteredRipple,
  };
})();
