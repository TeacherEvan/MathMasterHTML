// js/worm.js - Refactored Worm System
console.log("🐛 Worm System Loading...");

class WormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 4; // As per spec
        this.container = document.getElementById('panel-b');
        this.targetedSymbols = new Set(); // Track symbols being stolen
        this.initialize();
    }

    initialize() {
        if (!this.container) {
            console.error('Worm container #panel-b not found!');
            return;
        }

        // Ensure container has relative positioning for absolute children
        if (getComputedStyle(this.container).position === 'static') {
            this.container.style.position = 'relative';
        }

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', () => this.spawnWorm());

        // Cleanup on page unload
        window.addEventListener('beforeunload', () => this.cleanup());

        console.log('✅ Worm System initialized successfully');
    }

    cleanup() {
        // Clear all worms and their intervals
        this.worms.forEach(worm => {
            if (worm.moveInterval) clearInterval(worm.moveInterval);
            if (worm.theftInterval) clearInterval(worm.theftInterval);
            if (worm.element && worm.element.parentNode) {
                worm.element.remove();
            }
        });
        this.worms = [];
        this.targetedSymbols.clear();
        console.log('🧹 Worm System cleaned up');
    }

    spawnWorm() {
        if (this.worms.length >= this.maxWorms) {
            console.log('Max worms reached. No more spawning.');
            return;
        }

        const worm = this.createWorm(this.container);
        this.worms.push(worm);
        this.startWormBehaviors(worm);
    }

    createWorm(container) {
        const wormContainer = document.createElement('div');
        wormContainer.className = 'worm-container';

        // Create segments for the worm body
        for (let i = 0; i < 8; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            wormContainer.appendChild(segment);
        }

        // Position at bottom of container with random x
        const containerWidth = container.offsetWidth || 800; // Fallback width
        const containerHeight = container.offsetHeight || 600; // Fallback height
        const x = Math.random() * Math.max(0, containerWidth - 120);
        const y = Math.max(0, containerHeight - 40); // Ensure positive value

        wormContainer.style.left = `${x}px`;
        wormContainer.style.top = `${y}px`;

        const worm = {
            element: wormContainer,
            isCarryingSymbol: false,
            carriedSymbolElement: null,
            targetedSymbol: null,
            moveInterval: null,
            theftInterval: null,
            id: Date.now() + Math.random() // Unique ID for debugging
        };

        wormContainer.addEventListener('click', () => this.onWormClick(worm));
        container.appendChild(wormContainer);

        console.log(`🐛 Worm ${worm.id} spawned at (${x.toFixed(0)}, ${y.toFixed(0)})`);

        return worm;
    }

    startWormBehaviors(worm) {
        // Store interval references for cleanup
        worm.moveInterval = setInterval(() => this.moveWorm(worm), 1000);
        worm.theftInterval = setInterval(() => this.attemptSymbolTheft(worm), 10000);

        console.log(`🎯 Worm ${worm.id} behaviors started`);
    }

    moveWorm(worm) {
        const newX = worm.element.offsetLeft + (Math.random() * 20 - 10);
        worm.element.style.left = `${Math.max(0, Math.min(newX, worm.element.parentElement.offsetWidth - 120))}px`;
    }

    attemptSymbolTheft(worm) {
        if (worm.isCarryingSymbol) return;

        // Get untargeted hidden symbols
        const hiddenSymbols = document.querySelectorAll('#solution-container .hidden-symbol:not(.stolen)');
        if (hiddenSymbols.length === 0) return;

        // Filter out symbols that are already being targeted
        const availableSymbols = Array.from(hiddenSymbols).filter(symbol =>
            !this.targetedSymbols.has(symbol)
        );

        if (availableSymbols.length === 0) {
            console.log('⚠️ All symbols already targeted by other worms');
            return;
        }

        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];

        // Mark symbol as targeted
        this.targetedSymbols.add(targetSymbol);
        worm.targetedSymbol = targetSymbol;

        this.stealSymbol(worm, targetSymbol);
    }

    stealSymbol(worm, symbolElement) {
        worm.isCarryingSymbol = true;
        worm.carriedSymbolElement = symbolElement;

        symbolElement.classList.add('stolen');

        const carriedSymbolIndicator = document.createElement('div');
        carriedSymbolIndicator.className = 'carried-symbol';
        carriedSymbolIndicator.textContent = symbolElement.textContent;
        worm.element.appendChild(carriedSymbolIndicator);

        console.log(`🎯 Worm ${worm.id} stole symbol: ${symbolElement.textContent}`);

        // Add visual feedback
        worm.element.classList.add('carrying');
    }

    onWormClick(worm) {
        console.log(`🎯 Worm ${worm.id} clicked!`);

        // Add visual feedback for click
        worm.element.classList.add('worm-clicked');

        if (worm.isCarryingSymbol) {
            this.returnSymbol(worm);

            // Dispatch event to game.js for scoring/feedback
            document.dispatchEvent(new CustomEvent('wormSymbolSaved', {
                detail: {
                    symbol: worm.carriedSymbolElement.textContent,
                    wormId: worm.id
                }
            }));
        }

        // Delay destruction slightly for visual feedback
        setTimeout(() => this.destroyWorm(worm), 200);
    }

    returnSymbol(worm) {
        if (worm.carriedSymbolElement) {
            worm.carriedSymbolElement.classList.remove('stolen');
            console.log(`✅ Symbol returned: ${worm.carriedSymbolElement.textContent}`);
        }

        const indicator = worm.element.querySelector('.carried-symbol');
        if (indicator) {
            indicator.remove();
        }

        // Remove from targeted set
        if (worm.targetedSymbol) {
            this.targetedSymbols.delete(worm.targetedSymbol);
            worm.targetedSymbol = null;
        }

        worm.isCarryingSymbol = false;
        worm.carriedSymbolElement = null;
        worm.element.classList.remove('carrying');
    }

    destroyWorm(worm) {
        console.log(`💥 Destroying worm ${worm.id}`);

        // Clear intervals to prevent memory leak
        if (worm.moveInterval) {
            clearInterval(worm.moveInterval);
            worm.moveInterval = null;
        }
        if (worm.theftInterval) {
            clearInterval(worm.theftInterval);
            worm.theftInterval = null;
        }

        // Remove from targeted symbols if carrying
        if (worm.targetedSymbol) {
            this.targetedSymbols.delete(worm.targetedSymbol);
        }

        // Remove element from DOM
        if (worm.element && worm.element.parentNode) {
            worm.element.remove();
        }

        // Remove from worms array
        this.worms = this.worms.filter(w => w !== worm);

        console.log(`📊 Remaining worms: ${this.worms.length}/${this.maxWorms}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WormSystem();
});
