// src/scripts/worm-near-miss-ui.js
// UI handler for worm near-miss warnings (event-driven)

(function() {
  const state = {
    active: false,
    wormId: null,
  };

  function clearNearMissUI() {
    state.active = false;
    state.wormId = null;

    document.body.classList.remove("near-miss-active");

    const targets = document.querySelectorAll(".near-miss-target");
    targets.forEach((el) => {
      el.classList.remove("near-miss-target");
      el.style.removeProperty("--urgency");
    });
  }

  function applyNearMissUI(detail) {
    if (!detail) return;

    const wormId = detail.wormId || null;
    if (state.active && state.wormId === wormId) {
      return;
    }

    clearNearMissUI();

    const targetElement = detail.targetElement;
    if (!targetElement) {
      return;
    }

    const urgencyLevel = Math.max(0, detail.urgencyLevel || 0);

    state.active = true;
    state.wormId = wormId;

    targetElement.classList.add("near-miss-target");
    targetElement.style.setProperty("--urgency", String(urgencyLevel));

    document.body.classList.add("near-miss-active");
  }

  document.addEventListener("nearMissWarning", (event) => {
    applyNearMissUI(event.detail);
  });

  document.addEventListener("nearMissCleared", () => {
    clearNearMissUI();
  });
})();
