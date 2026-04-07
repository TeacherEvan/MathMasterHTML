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

      if (window.PointerEvent) {
        slot.addEventListener(
          "pointerdown",
          (event) => {
            event.preventDefault();
            handleConsoleClick();
          },
          { passive: false },
        );
      } else {
        slot.addEventListener("click", handleConsoleClick);
      }
    });

    console.log(
      "✅ Console button handlers set up with instant touch response",
    );
  };

  proto.setupModalInteractions = function() {
    const bindPress = (element, handler) => {
      if (!element) {
        return;
      }

      if (window.PointerEvent) {
        element.addEventListener(
          "pointerdown",
          (event) => {
            event.preventDefault();
            handler(event);
          },
          { passive: false },
        );
        return;
      }

      element.addEventListener("click", handler);
    };

    document.querySelectorAll(".symbol-choice").forEach((btn) => {
      bindPress(btn, () => {
        this.selectSymbol(btn.dataset.symbol);
      });
    });

    document.querySelectorAll(".position-choice").forEach((btn) => {
      bindPress(btn, () => {
        const position = Number.parseInt(btn.dataset.position, 10);
        this.selectPosition(position);
      });
    });

    bindPress(document.getElementById("skip-button"), () => {
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
