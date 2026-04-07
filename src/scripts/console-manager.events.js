// js/console-manager.events.js - Console input/event wiring
console.log("🎮 Console Manager events loading");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const proto = window.ConsoleManager.prototype;
  const GameEvents = window.GameEvents || {
    SYMBOL_CLICKED: "symbolClicked",
  };
  const POINTER_FOLLOWUP_CLICK_WINDOW_MS = 400;
  const recentPointerActivations = new WeakMap();

  function shouldIgnoreFollowupClick(element) {
    const lastPointerActivation = recentPointerActivations.get(element);

    if (typeof lastPointerActivation !== "number") {
      return false;
    }

    recentPointerActivations.delete(element);
    return performance.now() - lastPointerActivation <
      POINTER_FOLLOWUP_CLICK_WINDOW_MS;
  }

  function bindPrimaryActivation(element, handler) {
    if (!element) {
      return;
    }

    if (window.PointerEvent) {
      element.addEventListener(
        "pointerdown",
        (event) => {
          recentPointerActivations.set(element, performance.now());
          event.preventDefault();
          handler(event);
        },
        { passive: false },
      );

      element.addEventListener("click", (event) => {
        if (shouldIgnoreFollowupClick(element)) {
          return;
        }

        handler(event);
      });
      return;
    }

    element.addEventListener("click", handler);
  }

  proto.setupConsoleButtons = function() {
    const slots = this.consoleElement.querySelectorAll(".console-slot");

    slots.forEach((slot, index) => {
      slot.setAttribute("aria-label", `Console slot ${index + 1}, empty`);
      slot.setAttribute("aria-disabled", "true");
      const handleConsoleClick = () => {
        const symbol = this.slots[index];

        if (symbol) {
          console.log(`🎯 Console button ${index + 1} clicked: ${symbol}`);

          if (slot.classList.contains("clicked")) return;

          slot.classList.add("clicked");
          setTimeout(() => slot.classList.remove("clicked"), 600);

          document.dispatchEvent(
            new CustomEvent(GameEvents.SYMBOL_CLICKED, {
              detail: { symbol: symbol },
            }),
          );
        } else {
          console.log(`⚠️ Console button ${index + 1} is empty`);
        }
      };

      bindPrimaryActivation(slot, handleConsoleClick);
    });

    console.log(
      "✅ Console button handlers set up with instant touch response",
    );
  };

  proto.setupModalInteractions = function() {
    document.querySelectorAll(".symbol-choice").forEach((btn) => {
      bindPrimaryActivation(btn, () => {
        this.selectSymbol(btn.dataset.symbol);
      });
    });

    document.querySelectorAll(".position-choice").forEach((btn) => {
      bindPrimaryActivation(btn, () => {
        const position = Number.parseInt(btn.dataset.position, 10);
        this.selectPosition(position);
      });
    });

    bindPrimaryActivation(document.getElementById("skip-button"), () => {
      this.skipSelection();
    });

    this.modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.isPendingSelection) {
        event.preventDefault();
        this.skipSelection();
      }
    });

    console.log("✅ Console selection panel interactions set up");
  };

  proto.setupKeyboardShortcuts = function() {
    document.addEventListener("keydown", (event) => {
      const key = event.key;
      let slotIndex = -1;

      if (key >= "1" && key <= "9") {
        slotIndex = parseInt(key) - 1;
      }

      if (slotIndex >= 0 && slotIndex < 9) {
        const symbol = this.slots[slotIndex];
        if (symbol) {
          console.log(
            `⌨️ Keyboard shortcut ${key} triggered console slot ${slotIndex +
              1}: ${symbol}`,
          );

          const slot = this.consoleElement.querySelector(
            `[data-slot="${slotIndex}"]`,
          );
          if (slot) {
            slot.click();
          }
        }
      }
    });

    console.log("✅ Keyboard shortcuts set up (1-9 for console slots)");
  };

  console.log("✅ Console Manager events loaded");
})();
