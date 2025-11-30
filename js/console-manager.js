// js/console-manager.js - Symbol Console Management System
console.log("🎮 Console Manager loaded");

class ConsoleManager {
    constructor() {
        this.slots = [null, null, null, null, null, null, null, null, null]; // 9 slots
        this.availableSymbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', '+', '-', '=', '÷', '×'];
        this.selectedSymbol = null;
        this.selectedPosition = null;
        this.consoleElement = null;
        this.modal = null;
        this.isPendingSelection = false;
        // REFACTORED: Use shared getLevelFromURL utility from utils.js
        this.currentLevel = typeof getLevelFromURL === 'function' ? getLevelFromURL() : this._getLevelFromURLFallback();

        this.init();
    }

    // Fallback in case utils.js hasn't loaded yet
    _getLevelFromURLFallback() {
        const params = new URLSearchParams(window.location.search);
        return params.get('level') || 'beginner';
    }

    // PROGRESSION TRACKING: Load saved console state
    loadProgress() {
        const saveKey = `mathmaster_console_${this.currentLevel}`;
        const saved = localStorage.getItem(saveKey);

        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.slots = data.slots || this.slots;
                console.log(`📥 Loaded console progress for ${this.currentLevel}:`, this.slots);
                this.updateConsoleDisplay();
                return true;
            } catch (e) {
                console.error('❌ Error loading progress:', e);
                return false;
            }
        }
        return false;
    }

    // PROGRESSION TRACKING: Save console state
    saveProgress() {
        const saveKey = `mathmaster_console_${this.currentLevel}`;
        const data = {
            slots: this.slots,
            timestamp: Date.now()
        };
        localStorage.setItem(saveKey, JSON.stringify(data));
        console.log(`💾 Saved console progress for ${this.currentLevel}`);
    }

    // PROGRESSION TRACKING: Increment problems completed count
    incrementProblemsCompleted() {
        const countKey = `mathmaster_problems_${this.currentLevel}`;
        let count = parseInt(localStorage.getItem(countKey) || '0');
        count++;
        localStorage.setItem(countKey, count.toString());
        console.log(`✅ Problems completed for ${this.currentLevel}: ${count}`);
        return count;
    }

    init() {
        console.log("🔧 Initializing Console Manager");

        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.consoleElement = document.getElementById('symbol-console');
        this.modal = document.getElementById('symbol-modal');

        if (!this.consoleElement || !this.modal) {
            console.error("❌ Console elements not found in DOM");
            return;
        }

        console.log("✅ Console elements found, setting up event listeners");

        // Load saved progress
        this.loadProgress();

        // Set up console button click handlers
        this.setupConsoleButtons();

        // Set up modal interactions
        this.setupModalInteractions();

        // Set up keyboard shortcuts
        this.setupKeyboardShortcuts();

        // Listen for problem completion
        document.addEventListener('problemCompleted', () => {
            console.log("🎉 Problem completed! Showing symbol selection modal");
            this.incrementProblemsCompleted(); // Track progress
            this.showSymbolSelectionModal();
        });

        console.log("🎮 Console Manager ready!");
    }

    setupConsoleButtons() {
        const slots = this.consoleElement.querySelectorAll('.console-slot');

        slots.forEach((slot, index) => {
            // TOUCH FIX: Use pointerdown for instant response
            const handleConsoleClick = (e) => {
                const symbol = this.slots[index];

                if (symbol) {
                    console.log(`🎯 Console button ${index + 1} clicked: ${symbol}`);

                    // Prevent double-clicks
                    if (slot.classList.contains('clicked')) return;

                    // Add purple pulsate animation
                    slot.classList.add('clicked');
                    setTimeout(() => slot.classList.remove('clicked'), 600);

                    // Dispatch symbolClicked event (same as rain click)
                    document.dispatchEvent(new CustomEvent('symbolClicked', {
                        detail: { symbol: symbol }
                    }));
                } else {
                    console.log(`⚠️ Console button ${index + 1} is empty`);
                }
            };

            // Use pointerdown for instant response, with click fallback
            if (window.PointerEvent) {
                slot.addEventListener('pointerdown', (e) => {
                    e.preventDefault();
                    handleConsoleClick(e);
                }, { passive: false });
            } else {
                slot.addEventListener('click', handleConsoleClick);
            }
        });

        console.log("✅ Console button handlers set up with instant touch response");
    }

    setupModalInteractions() {
        // Symbol selection buttons
        const symbolButtons = document.querySelectorAll('.symbol-choice');
        symbolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const symbol = btn.dataset.symbol;
                this.selectSymbol(symbol);
            });
        });

        // Position selection buttons
        const positionButtons = document.querySelectorAll('.position-choice');
        positionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const position = parseInt(btn.dataset.position);
                this.selectPosition(position);
            });
        });

        // Skip button
        const skipButton = document.getElementById('skip-button');
        skipButton.addEventListener('click', () => {
            this.skipSelection();
        });

        console.log("✅ Modal interaction handlers set up");
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Handle numpad and number row (1-9)
            const key = e.key;
            let slotIndex = -1;

            // Map keyboard numbers to console positions
            // 1-9 on keyboard or numpad
            if (key >= '1' && key <= '9') {
                slotIndex = parseInt(key) - 1; // Convert 1-9 to 0-8
            }

            if (slotIndex >= 0 && slotIndex < 9) {
                const symbol = this.slots[slotIndex];
                if (symbol) {
                    console.log(`⌨️ Keyboard shortcut ${key} triggered console slot ${slotIndex + 1}: ${symbol}`);

                    // Trigger the console button click
                    const slot = this.consoleElement.querySelector(`[data-slot="${slotIndex}"]`);
                    if (slot) {
                        slot.click();
                    }
                }
            }
        });

        console.log("✅ Keyboard shortcuts set up (1-9 for console slots)");
    }

    showSymbolSelectionModal() {
        if (this.isPendingSelection) {
            console.log("⚠️ Modal already open");
            return;
        }

        this.isPendingSelection = true;
        this.selectedSymbol = null;
        this.selectedPosition = null;

        // Reset modal state
        document.querySelectorAll('.symbol-choice').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('position-instruction').style.display = 'none';
        document.getElementById('position-choices').style.display = 'none';

        // Update position buttons to show which slots are filled
        this.updatePositionButtons();

        // Show modal
        this.modal.style.display = 'flex';

        console.log("📋 Symbol selection modal opened");
    }

    hideSymbolSelectionModal() {
        this.modal.style.display = 'none';
        this.isPendingSelection = false;
        console.log("📋 Symbol selection modal closed");
    }

    selectSymbol(symbol) {
        console.log(`✨ Symbol selected: ${symbol}`);
        this.selectedSymbol = symbol;

        // Highlight selected symbol
        document.querySelectorAll('.symbol-choice').forEach(btn => {
            if (btn.dataset.symbol === symbol) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        // Show position selection
        document.getElementById('position-instruction').style.display = 'block';
        document.getElementById('position-choices').style.display = 'grid';
    }

    selectPosition(position) {
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

        // Fill the console slot
        this.fillSlot(position, this.selectedSymbol);

        // Close modal and continue game
        this.hideSymbolSelectionModal();

        // Dispatch event to continue to next problem
        document.dispatchEvent(new CustomEvent('consoleSymbolAdded', {
            detail: { symbol: this.selectedSymbol, position: position }
        }));
    }

    skipSelection() {
        console.log("⏭️ User skipped selection - filling random slot");

        // Find empty slots
        const emptySlots = [];
        this.slots.forEach((slot, index) => {
            if (slot === null) emptySlots.push(index);
        });

        if (emptySlots.length === 0) {
            console.log("⚠️ No empty slots available");
            this.hideSymbolSelectionModal();
            document.dispatchEvent(new CustomEvent('consoleSymbolAdded'));
            return;
        }

        // Pick random empty slot
        const randomSlot = emptySlots[Math.floor(Math.random() * emptySlots.length)];

        // Pick random symbol
        const randomSymbol = this.availableSymbols[Math.floor(Math.random() * this.availableSymbols.length)];

        console.log(`🎲 Random fill: ${randomSymbol} at position ${randomSlot + 1}`);

        // Fill the slot
        this.fillSlot(randomSlot, randomSymbol);

        // Close modal and continue game
        this.hideSymbolSelectionModal();

        document.dispatchEvent(new CustomEvent('consoleSymbolAdded', {
            detail: { symbol: randomSymbol, position: randomSlot }
        }));
    }

    fillSlot(position, symbol) {
        this.slots[position] = symbol;

        // Update DOM
        this.updateConsoleDisplay();

        // Save progress to localStorage
        this.saveProgress();

        console.log(`📦 Slot ${position + 1} filled with ${symbol}`);
        console.log(`📊 Console state:`, this.slots);
    }

    updateConsoleDisplay() {
        const slots = this.consoleElement.querySelectorAll('.console-slot');
        slots.forEach((slotElement, index) => {
            const symbol = this.slots[index];
            if (symbol) {
                slotElement.textContent = symbol;
                slotElement.classList.add('filled');
            } else {
                slotElement.textContent = '';
                slotElement.classList.remove('filled');
            }
        });
    }
    updatePositionButtons() {
        const positionButtons = document.querySelectorAll('.position-choice');

        positionButtons.forEach((btn, index) => {
            if (this.slots[index] !== null) {
                btn.classList.add('disabled');
                btn.disabled = true;
                btn.textContent = this.slots[index]; // Show what's already there
            } else {
                btn.classList.remove('disabled');
                btn.disabled = false;
                btn.textContent = index + 1; // Show position number
            }
        });
    }

    getFilledSlotsCount() {
        return this.slots.filter(slot => slot !== null).length;
    }

    isFull() {
        return this.getFilledSlotsCount() === 9;
    }

    reset() {
        console.log("🔄 Resetting console");
        this.slots = [null, null, null, null, null, null, null, null, null];

        const slotElements = this.consoleElement.querySelectorAll('.console-slot');
        slotElements.forEach(slot => {
            slot.textContent = '';
            slot.classList.remove('filled');
        });

        console.log("✅ Console reset complete");
    }
}

// Initialize console manager when script loads
const consoleManager = new ConsoleManager();

// Export for debugging
window.consoleManager = consoleManager;
