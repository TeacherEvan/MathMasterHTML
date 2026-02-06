// js/console-manager.core.js - Console manager core
console.log("🎮 Console Manager core loading");

(function() {
  class ConsoleManager {
    constructor() {
      this.slots = [null, null, null, null, null, null, null, null, null];
      this.availableSymbols = [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "X",
        "+",
        "-",
        "=",
        "÷",
        "×",
      ];
      this.selectedSymbol = null;
      this.selectedPosition = null;
      this.consoleElement = null;
      this.modal = null;
      this.isPendingSelection = false;
      this.currentLevel =
        typeof getLevelFromURL === "function"
          ? getLevelFromURL()
          : this._getLevelFromURLFallback();

      this.init();
    }

    _getLevelFromURLFallback() {
      const params = new URLSearchParams(window.location.search);
      return params.get("level") || "beginner";
    }

    init() {
      console.log("🔧 Initializing Console Manager");

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => this.setup());
      } else {
        this.setup();
      }
    }

    setup() {
      this.consoleElement = document.getElementById("symbol-console");
      this.modal = document.getElementById("symbol-modal");

      if (!this.consoleElement || !this.modal) {
        console.error("❌ Console elements not found in DOM");
        return;
      }

      console.log("✅ Console elements found, setting up event listeners");

      this.loadProgress();
      this.setupConsoleButtons();
      this.setupModalInteractions();
      this.setupKeyboardShortcuts();

      document.addEventListener("problemCompleted", () => {
        console.log("🎉 Problem completed! Showing symbol selection modal");
        this.incrementProblemsCompleted();
        this.showSymbolSelectionModal();
      });

      console.log("🎮 Console Manager ready!");
    }

    getFilledSlotsCount() {
      return this.slots.filter((slot) => slot !== null).length;
    }

    isFull() {
      return this.getFilledSlotsCount() === 9;
    }

    reset() {
      console.log("🔄 Resetting console");
      this.slots = [null, null, null, null, null, null, null, null, null];

      const slotElements = this.consoleElement.querySelectorAll(
        ".console-slot",
      );
      slotElements.forEach((slot) => {
        slot.textContent = "";
        slot.classList.remove("filled");
      });

      console.log("✅ Console reset complete");
    }
  }

  window.ConsoleManager = ConsoleManager;
  console.log("✅ Console Manager core loaded");
})();
