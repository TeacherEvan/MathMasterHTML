// js/console-manager.ui.js - Console UI helpers
console.log("🎮 Console Manager UI loading");

(function() {
  if (!window.ConsoleManager) {
    console.error("❌ ConsoleManager core not loaded");
    return;
  }

  const proto = window.ConsoleManager.prototype;
  const ConsoleLifecycleEvents = Object.freeze({
    CONSOLE_SELECTION_OPENED: "consoleSelectionOpened",
    CONSOLE_SELECTION_CLOSED: "consoleSelectionClosed",
  });
  const resolveConsoleLifecycleEventName = function(eventKey) {
    const GameEvents = window.GameEvents;
    return typeof GameEvents?.[eventKey] === "string"
      ? GameEvents[eventKey]
      : ConsoleLifecycleEvents[eventKey];
  };

  const dispatchConsoleLifecycleEvent = function(eventKey) {
    document.dispatchEvent(
      new CustomEvent(resolveConsoleLifecycleEventName(eventKey)),
    );
  };

  proto.updateSelectionStatus = function() {
    if (!this.selectionStatusElement) {
      return;
    }

    this.selectionStatusElement.textContent = this.selectedSymbol
      ? `Symbol ${this.selectedSymbol} selected. Choose a slot.`
      : "Choose a symbol to unlock the slot grid.";
  };

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

    this.updatePositionButtons();
    this.updateSelectionStatus();

    document.body.classList.add("console-selection-active");
    document.body.classList.add("console-modal-open");
    this.modal.style.display = "grid";
    this._applySymbolModalAccessibility?.();
    dispatchConsoleLifecycleEvent("CONSOLE_SELECTION_OPENED");

    console.log("📋 Console selection panel opened");
  };

  proto.hideSymbolSelectionModal = function() {
    this._releaseSymbolModalAccessibility?.();
    document.body.classList.remove("console-selection-active");
    document.body.classList.remove("console-modal-open");
    this.modal.style.display = "none";
    this.isPendingSelection = false;
    dispatchConsoleLifecycleEvent("CONSOLE_SELECTION_CLOSED");
    console.log("📋 Console selection panel closed");
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

    this.updatePositionButtons();
    this.updateSelectionStatus();
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

    const GameEvents = window.GameEvents || {
      CONSOLE_SYMBOL_ADDED: "consoleSymbolAdded",
    };

    document.dispatchEvent(
      new CustomEvent(GameEvents.CONSOLE_SYMBOL_ADDED, {
        detail: { symbol: this.selectedSymbol, position: position },
      }),
    );
  };

  proto.skipSelection = function() {
    console.log("⏭️ User skipped selection - filling random slot");

    const GameEvents = window.GameEvents || {
      CONSOLE_SYMBOL_ADDED: "consoleSymbolAdded",
    };

    const emptySlots = [];
    this.slots.forEach((slot, index) => {
      if (slot === null) emptySlots.push(index);
    });

    if (emptySlots.length === 0) {
      console.log("⚠️ No empty slots available");
      this.hideSymbolSelectionModal();
      document.dispatchEvent(new CustomEvent(GameEvents.CONSOLE_SYMBOL_ADDED));
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
      new CustomEvent(GameEvents.CONSOLE_SYMBOL_ADDED, {
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
      } else {
        slotElement.textContent = "";
        slotElement.classList.remove("filled");
      }
      this._updateConsoleSlotAccessibility?.(slotElement, index, symbol);
    });
  };

  proto.updatePositionButtons = function() {
    const positionButtons = document.querySelectorAll(".position-choice");
    const canChooseSlot = Boolean(this.selectedSymbol);

    positionButtons.forEach((btn, index) => {
      if (this.slots[index] !== null) {
        btn.classList.toggle("disabled", !canChooseSlot);
        btn.disabled = !canChooseSlot;
        btn.textContent = `Swap ${this.slots[index]}`;
      } else {
        btn.classList.toggle("disabled", !canChooseSlot);
        btn.disabled = !canChooseSlot;
        btn.textContent = index + 1;
      }
    });
  };

  console.log("✅ Console Manager UI loaded");
})();
