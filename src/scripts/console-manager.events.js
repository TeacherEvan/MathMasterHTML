// js/console-manager.events.js - Console input/event wiring
console.log("🎮 Console Manager events loading");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const proto = window.ConsoleManager.prototype;

  proto.setupConsoleButtons = function() {
    const slots = this.consoleElement.querySelectorAll(".console-slot");

    slots.forEach((slot, index) => {
      const handleConsoleClick = () => {
        const symbol = this.slots[index];

        if (symbol) {
          console.log(`🎯 Console button ${index + 1} clicked: ${symbol}`);

          if (slot.classList.contains("clicked")) return;

          slot.classList.add("clicked");
          setTimeout(() => slot.classList.remove("clicked"), 600);

          document.dispatchEvent(
            new CustomEvent("symbolClicked", {
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
    const symbolButtons = document.querySelectorAll(".symbol-choice");
    symbolButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const symbol = btn.dataset.symbol;
        this.selectSymbol(symbol);
      });
    });

    const positionButtons = document.querySelectorAll(".position-choice");
    positionButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const position = parseInt(btn.dataset.position);
        this.selectPosition(position);
      });
    });

    const skipButton = document.getElementById("skip-button");
    if (skipButton) {
      skipButton.addEventListener("click", () => {
        this.skipSelection();
      });
    }

    console.log("✅ Modal interaction handlers set up");
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
