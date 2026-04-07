// js/console-manager.ui.js - Console UI helpers
console.log("🎮 Console Manager UI loading");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const proto = window.ConsoleManager.prototype;

  proto.showSymbolSelectionModal = function() {
    if (this.isPendingSelection) {
      console.log("⚠️ Modal already open");
      return;
    }

    this.isPendingSelection = true;
    this.selectedSymbol = null;
    this.selectedPosition = null;

    document.querySelectorAll(".symbol-choice").forEach((btn) => {
      btn.classList.remove("selected");
    });
    const positionInstruction = document.getElementById("position-instruction");
    const positionChoices = document.getElementById("position-choices");

    if (positionInstruction) {
      positionInstruction.style.display = "none";
    }
    if (positionChoices) {
      positionChoices.style.display = "none";
    }

    this.updatePositionButtons();

    document.body.classList.add("console-modal-open");
    this.modal.style.display = "flex";
    this.modal.setAttribute("aria-hidden", "false");
    this._modalFocusCleanup =
      window.UXModules?.AccessibilityManager?.trapFocus?.(
        this.modal.querySelector(".modal-content"),
        {
          initialFocus: () =>
            this.modal.querySelector(".symbol-choice") ||
            this.modal.querySelector("#modal-close-btn"),
        },
      ) || null;

    console.log("📋 Symbol selection modal opened");
  };

  proto.hideSymbolSelectionModal = function() {
    if (typeof this._modalFocusCleanup === "function") {
      this._modalFocusCleanup();
      this._modalFocusCleanup = null;
    }
    document.body.classList.remove("console-modal-open");
    this.modal.style.display = "none";
    this.modal.setAttribute("aria-hidden", "true");
    this.isPendingSelection = false;
    console.log("📋 Symbol selection modal closed");
  };

  proto.selectSymbol = function(symbol) {
    console.log(`✨ Symbol selected: ${symbol}`);
    this.selectedSymbol = symbol;

    document.querySelectorAll(".symbol-choice").forEach((btn) => {
      if (btn.dataset.symbol === symbol) {
        btn.classList.add("selected");
      } else {
        btn.classList.remove("selected");
      }
    });

    const positionInstruction = document.getElementById("position-instruction");
    const positionChoices = document.getElementById("position-choices");

    if (positionInstruction) {
      positionInstruction.style.display = "block";
    }
    if (positionChoices) {
      positionChoices.style.display = "grid";
    }
  };

  proto.selectPosition = function(position) {
    if (this.slots[position] !== null) {
      console.log(
        `⚠️ Overwriting position ${position + 1} which was ${
          this.slots[position]
        }`,
      );
    }

    if (!this.selectedSymbol) {
      console.log("⚠️ No symbol selected yet");
      return;
    }

    console.log(`📍 Position selected: ${position + 1}`);
    this.selectedPosition = position;

    this.fillSlot(position, this.selectedSymbol);
    this.hideSymbolSelectionModal();

    document.dispatchEvent(
      new CustomEvent("consoleSymbolAdded", {
        detail: { symbol: this.selectedSymbol, position: position },
      }),
    );
  };

  proto.skipSelection = function() {
    console.log("⏭️ User skipped selection - filling random slot");

    const emptySlots = [];
    this.slots.forEach((slot, index) => {
      if (slot === null) emptySlots.push(index);
    });

    if (emptySlots.length === 0) {
      console.log("⚠️ No empty slots available");
      this.hideSymbolSelectionModal();
      document.dispatchEvent(new CustomEvent("consoleSymbolAdded"));
      return;
    }

    const randomSlot =
      emptySlots[Math.floor(Math.random() * emptySlots.length)];
    const randomSymbol = this.availableSymbols[
      Math.floor(Math.random() * this.availableSymbols.length)
    ];

    console.log(
      `🎲 Random fill: ${randomSymbol} at position ${randomSlot + 1}`,
    );

    this.fillSlot(randomSlot, randomSymbol);
    this.hideSymbolSelectionModal();

    document.dispatchEvent(
      new CustomEvent("consoleSymbolAdded", {
        detail: { symbol: randomSymbol, position: randomSlot },
      }),
    );
  };

  proto.fillSlot = function(position, symbol) {
    this.slots[position] = symbol;

    this.updateConsoleDisplay();
    this.saveProgress();

    // Play refresh animation on the filled slot
    const slotEl = this.consoleElement
      ? this.consoleElement.querySelector(`[data-slot="${position}"]`)
      : null;
    if (slotEl) {
      slotEl.classList.remove("refreshing");
      // Force reflow so the animation restarts if called twice quickly
      void slotEl.offsetWidth;
      slotEl.classList.add("refreshing");
      // Duration must match the @keyframes slotRefresh animation in console.core.css
      setTimeout(() => slotEl.classList.remove("refreshing"), 500);
    }

    console.log(`📦 Slot ${position + 1} filled with ${symbol}`);
    console.log("📊 Console state:", this.slots);
  };

  proto.updateConsoleDisplay = function() {
    const slots = this.consoleElement.querySelectorAll(".console-slot");
    slots.forEach((slotElement, index) => {
      const symbol = this.slots[index];
      if (symbol) {
        slotElement.textContent = symbol;
        slotElement.classList.add("filled");
        slotElement.setAttribute(
          "aria-label",
          `Console slot ${index + 1}, symbol ${symbol}`,
        );
        slotElement.setAttribute("aria-disabled", "false");
      } else {
        slotElement.textContent = "";
        slotElement.classList.remove("filled");
        slotElement.setAttribute(
          "aria-label",
          `Console slot ${index + 1}, empty`,
        );
        slotElement.setAttribute("aria-disabled", "true");
      }
    });
  };

  proto.updatePositionButtons = function() {
    const positionButtons = document.querySelectorAll(".position-choice");

    positionButtons.forEach((btn, index) => {
      if (this.slots[index] !== null) {
        btn.classList.remove("disabled");
        btn.disabled = false;
        btn.textContent = `Swap ${this.slots[index]}`;
      } else {
        btn.classList.remove("disabled");
        btn.disabled = false;
        btn.textContent = index + 1;
      }
    });
  };

  console.log("✅ Console Manager UI loaded");
})();
