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
    COMPACT_BREAKPOINT: "(max-width: 760px)",
  });

  const elements = {
    backButton: document.querySelector(".back-button"),
    cards: Array.from(document.querySelectorAll(".level-card")),
    levelButtons: Array.from(document.querySelectorAll(".level-button")),
    routeSwitcher: document.querySelector(".route-switcher"),
    routeButtons: Array.from(document.querySelectorAll(".route-switcher-button")),
  };

  const compactMedia = window.matchMedia(CONFIG.COMPACT_BREAKPOINT);

  const state = {
    activeLevel:
      document.querySelector(".route-switcher-button[aria-pressed='true']")
        ?.dataset.level || elements.cards[0]?.dataset.level || "beginner",
    levelHandlers: new Map(),
    routeHandlers: new Map(),
    lastPointerActivation: null,
  };

  function markPointerActivation(target) {
    state.lastPointerActivation = {
      target,
      timestamp: Date.now(),
    };
  }

  function shouldIgnoreClick(event, target) {
    if (event.detail === 0) {
      return false;
    }

    const activation = state.lastPointerActivation;
    return Boolean(
      activation &&
        activation.target === target &&
        Date.now() - activation.timestamp < 750,
    );
  }

  function createRipple(event, target) {
    const ripple = document.createElement("div");
    ripple.className = "ripple";

    const rect = target.getBoundingClientRect();
    const size = CONFIG.RIPPLE.SIZE_PX;
    const hasPointerPosition =
      typeof event.clientX === "number" && typeof event.clientY === "number";
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

  function syncCompactLayout() {
    const compactMode = compactMedia.matches;

    if (elements.routeSwitcher) {
      elements.routeSwitcher.hidden = !compactMode;
      elements.routeSwitcher.setAttribute("aria-hidden", String(!compactMode));
    }

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
    if (!levelKey) {
      return;
    }

    state.activeLevel = levelKey;
    syncCompactLayout();
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
      setActiveLevel(levelKey);
      const button = selectedCard.querySelector(".level-button");
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
      const pointerHandler = (event) => {
        markPointerActivation(button);
        selectLevel(levelKey, button, event);
      };
      const clickHandler = (event) => {
        if (shouldIgnoreClick(event, button)) {
          return;
        }

        selectLevel(levelKey, button, event);
      };

      state.levelHandlers.set(button, {
        pointerHandler,
        clickHandler,
      });
      button.addEventListener("pointerdown", pointerHandler);
      button.addEventListener("click", clickHandler);
    });
  }

  function attachRouteHandlers() {
    elements.routeButtons.forEach((button) => {
      const levelKey = button.dataset.level || "beginner";
      const pointerHandler = (event) => {
        markPointerActivation(button);
        createRipple(event, button);
        setActiveLevel(levelKey);
      };
      const clickHandler = (event) => {
        if (shouldIgnoreClick(event, button)) {
          return;
        }

        createRipple(event, button);
        setActiveLevel(levelKey);
      };

      state.routeHandlers.set(button, {
        pointerHandler,
        clickHandler,
      });
      button.addEventListener("pointerdown", pointerHandler);
      button.addEventListener("click", clickHandler);
    });
  }

  function detachLevelHandlers() {
    state.levelHandlers.forEach((handlers, button) => {
      button.removeEventListener("pointerdown", handlers.pointerHandler);
      button.removeEventListener("click", handlers.clickHandler);
    });
    state.levelHandlers.clear();
  }

  function detachRouteHandlers() {
    state.routeHandlers.forEach((handlers, button) => {
      button.removeEventListener("pointerdown", handlers.pointerHandler);
      button.removeEventListener("click", handlers.clickHandler);
    });
    state.routeHandlers.clear();
  }

  function bindCompactMedia(listener) {
    if (typeof compactMedia.addEventListener === "function") {
      compactMedia.addEventListener("change", listener);
      return;
    }

    compactMedia.addListener(listener);
  }

  function unbindCompactMedia(listener) {
    if (typeof compactMedia.removeEventListener === "function") {
      compactMedia.removeEventListener("change", listener);
      return;
    }

    compactMedia.removeListener(listener);
  }

  function initInteractions() {
    document.addEventListener("keydown", handleKeydown);
    bindCompactMedia(syncCompactLayout);
    attachLevelHandlers();
    attachRouteHandlers();
    syncCompactLayout();

    if (elements.backButton) {
      const backPointerHandler = (event) => {
        markPointerActivation(elements.backButton);
        goBack(event);
      };
      const backClickHandler = (event) => {
        if (shouldIgnoreClick(event, elements.backButton)) {
          return;
        }

        goBack(event);
      };

      elements.backButton._levelSelectBackPointerHandler = backPointerHandler;
      elements.backButton._levelSelectBackClickHandler = backClickHandler;
      elements.backButton.addEventListener("pointerdown", backPointerHandler);
      elements.backButton.addEventListener("click", backClickHandler);
    }
  }

  function destroyInteractions() {
    document.removeEventListener("keydown", handleKeydown);
    unbindCompactMedia(syncCompactLayout);
    detachLevelHandlers();
    detachRouteHandlers();

    if (elements.backButton) {
      elements.backButton.removeEventListener(
        "pointerdown",
        elements.backButton._levelSelectBackPointerHandler,
      );
      elements.backButton.removeEventListener(
        "click",
        elements.backButton._levelSelectBackClickHandler,
      );
      delete elements.backButton._levelSelectBackPointerHandler;
      delete elements.backButton._levelSelectBackClickHandler;
    }
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initInteractions = initInteractions;
  window.LevelSelectPage.destroyInteractions = destroyInteractions;
})();
