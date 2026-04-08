// src/scripts/level-select-page.interactions.js
(function () {
  "use strict";

  const CONFIG = Object.freeze({
    RIPPLE: {
      SIZE_PX: 60,
      REMOVE_DELAY_MS: 600,
    },
    NAVIGATION: {
      LEVEL_SELECT: "/src/pages/game.html?level=",
      BACK: "/src/pages/index.html",
    },
    COMPACT_BREAKPOINT: "(max-width: 768px)",
  });

  const elements = {
    backButton: document.querySelector(".back-button"),
    cards: Array.from(document.querySelectorAll(".level-card")),
    levelButtons: Array.from(document.querySelectorAll(".level-button")),
    routeButtons: Array.from(document.querySelectorAll(".route-switcher-button")),
  };

  const compactMedia = window.matchMedia(CONFIG.COMPACT_BREAKPOINT);

  const state = {
    activeLevel: elements.cards[0]?.dataset.level || "beginner",
    levelHandlers: new Map(),
    routeHandlers: new Map(),
  };

  function createRipple(event, target) {
    const ripple = document.createElement("div");
    ripple.className = "ripple";

    const rect = target.getBoundingClientRect();
    const size = CONFIG.RIPPLE.SIZE_PX;
    const hasNumericPointerPosition =
      typeof event.clientX === "number" && typeof event.clientY === "number";
    const hasZeroedKeyboardPosition =
      hasNumericPointerPosition && event.clientX === 0 && event.clientY === 0;
    const hasPointerPosition =
      hasNumericPointerPosition &&
      !hasZeroedKeyboardPosition &&
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;
    const x = hasPointerPosition
      ? event.clientX - rect.left - size / 2
      : rect.width / 2 - size / 2;
    const y = hasPointerPosition
      ? event.clientY - rect.top - size / 2
      : rect.height / 2 - size / 2;

    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    target.appendChild(ripple);

    setTimeout(() => {
      if (target.contains(ripple)) {
        target.removeChild(ripple);
      }
    }, CONFIG.RIPPLE.REMOVE_DELAY_MS);
  }

  function selectLevel(levelKey, triggerElement, interactionEvent) {
    if (interactionEvent) {
      createRipple(interactionEvent, triggerElement);
    }

    triggerElement.style.transform = "scale(0.98)";
    setTimeout(() => {
      triggerElement.style.transform = "";
    }, 180);

    setTimeout(() => {
      window.location.href = `${CONFIG.NAVIGATION.LEVEL_SELECT}${levelKey}`;
    }, 300);
  }

  function syncCompactLayout() {
    const compactMode = compactMedia.matches;

    elements.cards.forEach((card) => {
      const isActive = card.dataset.level === state.activeLevel;
      card.classList.toggle("is-active", isActive);
      card.hidden = compactMode ? !isActive : false;
    });

    elements.routeButtons.forEach((button) => {
      const isActive = button.dataset.level === state.activeLevel;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setActiveLevel(levelKey) {
    state.activeLevel = levelKey;
    syncCompactLayout();
  }

  function goBack(interactionEvent) {
    const rippleTarget =
      interactionEvent?.currentTarget ||
      interactionEvent?.target?.closest?.("button") ||
      elements.backButton;

    if (rippleTarget) {
      createRipple(interactionEvent || {}, rippleTarget);
    }
    setTimeout(() => {
      window.location.href = CONFIG.NAVIGATION.BACK;
    }, 300);
  }

  function handleKeydown(event) {
    const selectedCard = (() => {
      switch (event.key) {
        case "1":
          return elements.cards[0];
        case "2":
          return elements.cards[1];
        case "3":
          return elements.cards[2];
        default:
          return null;
      }
    })();

    if (selectedCard) {
      const levelKey = selectedCard.dataset.level || "beginner";
      const button = selectedCard.querySelector(".level-button");
      setActiveLevel(levelKey);
      if (button instanceof HTMLElement) {
        selectLevel(levelKey, button, event);
      }
      return;
    }

    if (event.key === "Escape" || event.key === "Backspace") {
      if (event.key === "Backspace") {
        event.preventDefault();
      }
      goBack(event);
    }
  }

  function attachLevelHandlers() {
    elements.levelButtons.forEach((button) => {
      const levelKey = button.dataset.level || "beginner";
      const handler = (event) => {
        selectLevel(levelKey, button, event);
      };

      state.levelHandlers.set(button, handler);
      button.addEventListener("click", handler);
    });
  }

  function attachRouteHandlers() {
    elements.routeButtons.forEach((button) => {
      const levelKey = button.dataset.level || "beginner";
      const handler = () => {
        setActiveLevel(levelKey);
      };

      state.routeHandlers.set(button, handler);
      button.addEventListener("click", handler);
    });
  }

  function detachHandlers() {
    state.levelHandlers.forEach((handler, button) => {
      button.removeEventListener("click", handler);
    });
    state.routeHandlers.forEach((handler, button) => {
      button.removeEventListener("click", handler);
    });
    state.levelHandlers.clear();
    state.routeHandlers.clear();
  }

  function initInteractions() {
    document.addEventListener("keydown", handleKeydown);
    compactMedia.addEventListener("change", syncCompactLayout);

    attachLevelHandlers();
    attachRouteHandlers();
    syncCompactLayout();

    if (elements.backButton) {
      elements.backButton.addEventListener("click", goBack);
    }
  }

  function destroyInteractions() {
    document.removeEventListener("keydown", handleKeydown);
    compactMedia.removeEventListener("change", syncCompactLayout);

    detachHandlers();

    if (elements.backButton) {
      elements.backButton.removeEventListener("click", goBack);
    }
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initInteractions = initInteractions;
  window.LevelSelectPage.destroyInteractions = destroyInteractions;
})();
