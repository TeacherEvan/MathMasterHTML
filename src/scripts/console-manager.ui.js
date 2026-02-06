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

    this.modal.style.display = "flex";

    console.log("📋 Symbol selection modal opened");
  };

  proto.hideSymbolSelectionModal = function() {
    this.modal.style.display = "none";
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
      console.log(`⚠️ Position ${position + 1} is already filled`);
      return;
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
      } else {
        slotElement.textContent = "";
        slotElement.classList.remove("filled");
      }
    });
  };

  proto.updatePositionButtons = function() {
    const positionButtons = document.querySelectorAll(".position-choice");

    positionButtons.forEach((btn, index) => {
      if (this.slots[index] !== null) {
        btn.classList.add("disabled");
        btn.disabled = true;
        btn.textContent = this.slots[index];
      } else {
        btn.classList.remove("disabled");
        btn.disabled = false;
        btn.textContent = index + 1;
      }
    });
  };

  console.log("✅ Console Manager UI loaded");
})();
