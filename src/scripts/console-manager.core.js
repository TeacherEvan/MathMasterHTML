// js/console-manager.core.js - Console manager core
console.log("🎮 Console Manager core loading");

/**
 * @typedef {ConsoleManager & {
 *   loadProgress: () => void;
 *   setupConsoleButtons: () => void;
 *   setupModalInteractions: () => void;
 *   setupKeyboardShortcuts: () => void;
 *   incrementProblemsCompleted: () => void;
 *   showSymbolSelectionModal: () => void;
 * }} ConsoleManagerRuntime
 */

(function() {
  // How long the post-problem console intermission may be held back by an
  // unclear board (live worms / unclaimed muffin rewards) before it opens
  // anyway. Prevents the game from stalling between problems.
  const SELECTION_GATE_MAX_WAIT_MS = 4000;

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
      this.selectionWindowElement = null;
      this.selectionStatusElement = null;
      this.isPendingSelection = false;
      this.selectionGateTimer = null;
      this.currentLevel =
        typeof getLevelFromURL === "function"
          ? getLevelFromURL()
          : this._getLevelFromURLFallback();

      this.init();
    }

    _getLevelFromURLFallback() {
      const params = new URLSearchParams(window.location.search);
      if (typeof window.normalizeGameLevel === "function") {
        return window.normalizeGameLevel(params.get("level"));
      }

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
      this.selectionWindowElement = this.modal?.querySelector(
        ".console-selection-window",
      );
      this.selectionStatusElement = document.getElementById(
        "console-selection-status",
      );

      if (
        !this.consoleElement ||
        !this.modal ||
        !this.selectionWindowElement ||
        !this.selectionStatusElement
      ) {
        console.error("❌ Console selection elements not found in DOM");
        return;
      }

      console.log("✅ Console elements found, setting up event listeners");

      const runtimeConsoleManager = /** @type {ConsoleManagerRuntime} */ (/** @type {unknown} */ (this));

      runtimeConsoleManager.loadProgress();
      runtimeConsoleManager.setupConsoleButtons();
      runtimeConsoleManager.setupModalInteractions();
      runtimeConsoleManager.setupKeyboardShortcuts();
      const GameEvents = window.GameEvents || {
        CONSOLE_SYMBOL_ADDED: "consoleSymbolAdded",
        PROBLEM_COMPLETED: "problemCompleted",
      };

      document.addEventListener(GameEvents.PROBLEM_COMPLETED, () => {
        console.log("🎉 Problem completed! Queueing console selection panel");
        runtimeConsoleManager.incrementProblemsCompleted();
        this.queueSymbolSelectionModal();
      });

      console.log("🎮 Console Manager ready!");
    }

    hasBlockingBoardRewards() {
      return Array.from(
        document.querySelectorAll("button.worm-muffin-reward"),
      ).some((reward) => reward.isConnected);
    }

    hasActiveBoardWorms() {
      const worms = window.wormSystem?.worms;
      if (!Array.isArray(worms)) {
        return false;
      }

      return worms.some((worm) => worm?.active);
    }

    isBoardClearForSelection() {
      return !this.hasActiveBoardWorms() && !this.hasBlockingBoardRewards();
    }

    queueSymbolSelectionModal() {
      const runtimeConsoleManager = /** @type {ConsoleManagerRuntime} */ (/** @type {unknown} */ (this));

      if (this.isPendingSelection) {
        return;
      }

      if (this.selectionGateTimer) {
        window.clearTimeout(this.selectionGateTimer);
        this.selectionGateTimer = null;
      }

      // GUARD: the board can stay "unclear" indefinitely (a muffin reward the
      // player never clicks, or a worm that refuses to die). Without a ceiling
      // the console modal never opens, so the game stalls after a completed
      // problem and the next problem never loads. Force the intermission open
      // once the grace window elapses so progression always continues.
      const gateStartedAt = Date.now();

      const tryOpen = () => {
        if (this.isPendingSelection) {
          this.selectionGateTimer = null;
          return;
        }

        const boardClear = this.isBoardClearForSelection();
        const waitedMs = Date.now() - gateStartedAt;

        if (!boardClear) {
          if (waitedMs < SELECTION_GATE_MAX_WAIT_MS) {
            this.selectionGateTimer = window.setTimeout(tryOpen, 120);
            return;
          }

          console.warn(
            `⚠️ Console selection gate still blocked after ${waitedMs}ms ` +
              `(worms=${this.hasActiveBoardWorms()}, ` +
              `rewards=${this.hasBlockingBoardRewards()}) - opening anyway`,
          );
        }

        this.selectionGateTimer = null;
        runtimeConsoleManager.showSymbolSelectionModal();
      };

      tryOpen();
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
