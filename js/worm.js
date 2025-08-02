// js/worm.js - Refactored Worm System
console.log("🐛 Worm System Loading...");

class WormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 4; // As per spec
        this.container = document.getElementById('panel-b');
        this.initialize();
    }

    initialize() {
        if (!this.container) {
            console.error('Worm container #panel-b not found!');
            return;
        }
        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', () => this.spawnWorm());
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

        const x = Math.random() * (container.offsetWidth - 120);
        const y = container.offsetHeight - 30;
        wormContainer.style.left = `${x}px`;
        wormContainer.style.top = `${y}px`;

        wormContainer.addEventListener('click', () => this.onWormClick(worm));
        container.appendChild(wormContainer);

        return {
            element: wormContainer,
            isCarryingSymbol: false,
            carriedSymbolElement: null,
        };
    }

    startWormBehaviors(worm) {
        setInterval(() => this.moveWorm(worm), 1000);
        setInterval(() => this.attemptSymbolTheft(worm), 10000);
    }

    moveWorm(worm) {
        const newX = worm.element.offsetLeft + (Math.random() * 20 - 10);
        worm.element.style.left = `${Math.max(0, Math.min(newX, worm.element.parentElement.offsetWidth - 120))}px`;
    }

    attemptSymbolTheft(worm) {
        if (worm.isCarryingSymbol) return;

        const hiddenSymbols = document.querySelectorAll('#solution-container .hidden-symbol:not(.stolen)');
        if (hiddenSymbols.length === 0) return;

        const targetSymbol = hiddenSymbols[Math.floor(Math.random() * hiddenSymbols.length)];
        
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
    }

    onWormClick(worm) {
        if (worm.isCarryingSymbol) {
            this.returnSymbol(worm);
        }
        this.destroyWorm(worm);
    }

    returnSymbol(worm) {
        worm.carriedSymbolElement.classList.remove('stolen');
        const indicator = worm.element.querySelector('.carried-symbol');
        if (indicator) {
            indicator.remove();
        }
        worm.isCarryingSymbol = false;
        worm.carriedSymbolElement = null;
    }

    destroyWorm(worm) {
        worm.element.remove();
        this.worms = this.worms.filter(w => w !== worm);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WormSystem();
});