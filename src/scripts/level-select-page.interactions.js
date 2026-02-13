// src/scripts/level-select-page.interactions.js
(function() {
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
  });

  const elements = {
    backButton: document.querySelector(".back-button"),
    cards: Array.from(document.querySelectorAll(".level-card")),
  };

  const state = {
    cardHandlers: new Map(),
  };

  function createRipple(event, target) {
    const ripple = document.createElement("div");
    ripple.className = "ripple";

    const rect = target.getBoundingClientRect();
    const size = CONFIG.RIPPLE.SIZE_PX;
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

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

  function selectLevel(levelKey, cardElement, interactionEvent) {
    if (interactionEvent) {
      createRipple(interactionEvent, cardElement);
    }

    cardElement.style.transform = "scale(0.95)";
    setTimeout(() => {
      cardElement.style.transform = "";
    }, 150);

    setTimeout(() => {
      window.location.href = `${CONFIG.NAVIGATION.LEVEL_SELECT}${levelKey}`;
    }, 300);
  }

  function goBack(interactionEvent) {
    if (interactionEvent?.target) {
      createRipple(interactionEvent, interactionEvent.target);
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
      selectLevel(levelKey, selectedCard, event);
      selectedCard.style.animation = "bounce-easy 0.3s ease-in-out";
      setTimeout(() => {
        selectedCard.style.animation = "";
      }, 300);
      return;
    }

    if (event.key === "Escape" || event.key === "Backspace") {
      goBack(event);
    }
  }

  function handleTouchStart(event) {
    const card = event.target.closest(".level-card");
    if (card) {
      card.style.transform = "scale(0.98)";
    }
  }

  function handleTouchEnd(event) {
    const card = event.target.closest(".level-card");
    if (card) {
      card.style.transform = "";
    }
  }

  function attachCardHandlers() {
    elements.cards.forEach((card, index) => {
      const levelKey =
        card.dataset.level ||
        (index === 1 ? "warrior" : index === 2 ? "master" : "beginner");
      const handler = (event) => {
        selectLevel(levelKey, card, event);
      };
      state.cardHandlers.set(card, handler);
      card.addEventListener("click", handler);
    });
  }

  function detachCardHandlers() {
    state.cardHandlers.forEach((handler, card) => {
      card.removeEventListener("click", handler);
    });
    state.cardHandlers.clear();
  }

  function initInteractions() {
    document.addEventListener("keydown", handleKeydown);
    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    attachCardHandlers();

    if (elements.backButton) {
      elements.backButton.addEventListener("click", goBack);
    }
  }

  function destroyInteractions() {
    document.removeEventListener("keydown", handleKeydown);
    document.removeEventListener("touchstart", handleTouchStart);
    document.removeEventListener("touchend", handleTouchEnd);

    detachCardHandlers();

    if (elements.backButton) {
      elements.backButton.removeEventListener("click", goBack);
    }
  }

  window.LevelSelectPage = window.LevelSelectPage || {};
  window.LevelSelectPage.initInteractions = initInteractions;
  window.LevelSelectPage.destroyInteractions = destroyInteractions;
})();
