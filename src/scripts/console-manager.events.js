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

  function isNonPrimaryActivation(event) {
    return event.button !== 0;
  }

  function bindPrimaryActivation(element, handler) {
    if (!element) {
      return;
    }

    if (window.PointerEvent) {
      element.addEventListener(
        "pointerdown",
        (event) => {
          if (isNonPrimaryActivation(event) || !event.isPrimary) {
            return;
          }
          event.preventDefault();
          handler(event);
        },
        { passive: false },
      );

      element.addEventListener("click", (event) => {
        if (isNonPrimaryActivation(event)) {
          return;
        }

        // We already handled pointerdown. If this is a physical browser-generated click,
        // it will have a pointerId > 0 or a valid pointerType. 
        // Programmatic clicks (e.g. from tests or screen readers) typically have empty pointerType 
        // and pointerId <= 0 (or undefined).
        // By relying on pointer ID / pointerType directly, we ignore follow-up clicks seamlessly natively.
        if ((typeof event.pointerId === "number" && event.pointerId > 0) || event.pointerType) {
          return;
        }

        handler(event);
      });
      return;
    }

    element.addEventListener("click", (event) => {
      if (isNonPrimaryActivation(event)) {
        return;
      }

      handler(event);
    });
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
        if (this.isPendingSelection) {
          console.log(
            `⌨️ Keyboard shortcut ${key} ignored while console selection panel is open`,
          );
          return;
        }

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
