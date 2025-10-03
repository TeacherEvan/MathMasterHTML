// js/worm.js - Refactored Worm System
console.log("🐛 Worm System Loading...");

class WormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 4; // As per spec
        this.wormContainer = null;
        this.solutionContainer = null;
        this.isInitialized = false;
        this.animationFrameId = null;

        console.log('🐛 WormSystem initialized');

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', (event) => {
            console.log('🐛 Worm System received problemLineCompleted event:', event.detail);
            this.spawnWorm();
        });
    }

    initialize() {
        if (this.isInitialized) return;

        this.wormContainer = document.getElementById('panel-b');
        this.solutionContainer = document.getElementById('solution-container');

        if (!this.wormContainer) {
            console.error('🐛 Worm container #panel-b not found!');
            return;
        }

        if (!this.solutionContainer) {
            console.error('🐛 Solution container not found!');
            return;
        }

        // Ensure container has relative positioning for absolute children
        if (getComputedStyle(this.wormContainer).position === 'static') {
            this.wormContainer.style.position = 'relative';
        }

        this.isInitialized = true;
        console.log('✅ Worm System initialized successfully');
    }


    spawnWorm() {
        this.initialize();

        console.log(`🐛 spawnWorm() called. Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
            return;
        }

        // Find a hidden symbol to steal
        const hiddenSymbols = this.solutionContainer.querySelectorAll('.hidden-symbol');
        const availableSymbols = Array.from(hiddenSymbols).filter(el => !el.dataset.stolen);

        if (availableSymbols.length === 0) {
            console.log('🐛 No hidden symbols available to steal');
            return;
        }

        // Pick random hidden symbol
        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        const symbolValue = targetSymbol.textContent;

        console.log(`🐛 Spawning worm to steal symbol: "${symbolValue}"`);

        // Mark symbol as stolen
        targetSymbol.dataset.stolen = 'true';
        targetSymbol.classList.add('stolen');

        // Create worm element
        const wormId = `worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container';
        wormElement.id = wormId;
        wormElement.dataset.stolenSymbol = symbolValue;

        // Worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        for (let i = 0; i < 8; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        wormElement.appendChild(wormBody);

        // Add stolen symbol indicator
        const stolenSymbolDiv = document.createElement('div');
        stolenSymbolDiv.className = 'carried-symbol';
        stolenSymbolDiv.textContent = symbolValue;
        wormElement.appendChild(stolenSymbolDiv);

        // Random starting position at bottom
        const containerWidth = this.wormContainer.offsetWidth || 800;
        const containerHeight = this.wormContainer.offsetHeight || 600;
        const startX = Math.random() * Math.max(0, containerWidth - 120);
        const startY = Math.max(0, containerHeight - 40); // Bottom of container

        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';

        this.wormContainer.appendChild(wormElement);

        // Store worm data
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: symbolValue,
            targetElement: targetSymbol,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 0.5, // Slower horizontal movement
            velocityY: -1.5, // Move upward to throw symbol out of bounds
            active: true
        };

        this.worms.push(wormData);

        // Add click handler to explode worm
        wormElement.addEventListener('click', () => this.explodeWorm(wormData));

        console.log(`✅ Worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    animate() {
        if (this.worms.length === 0) {
            this.animationFrameId = null;
            return;
        }

        this.worms.forEach(worm => {
            if (!worm.active) return;

            // Update position using JavaScript (NO CSS transitions to avoid floating)
            worm.y += worm.velocityY;
            worm.x += worm.velocityX;

            // Keep horizontal position in bounds
            if (worm.x < 5) {
                worm.x = 5;
                worm.velocityX *= -1;
            }
            const containerWidth = this.wormContainer.offsetWidth || 800;
            if (worm.x > containerWidth - 120) {
                worm.x = containerWidth - 120;
                worm.velocityX *= -1;
            }

            // Apply position directly (no CSS transitions)
            worm.element.style.left = `${worm.x}px`;
            worm.element.style.top = `${worm.y}px`;

            // Check if worm has thrown symbol out of bounds (reached top)
            if (worm.y < -50) {
                console.log(`🐛 Worm ${worm.id} threw symbol "${worm.stolenSymbol}" out of bounds`);
                this.removeWorm(worm);
            }
        });

        // Continue animation if there are active worms
        if (this.worms.some(w => w.active)) {
            this.animationFrameId = requestAnimationFrame(() => this.animate());
        } else {
            this.animationFrameId = null;
        }
    }

    explodeWorm(wormData) {
        if (!wormData.active) return;

        console.log(`🐛 Worm ${wormData.id} exploded! Returning symbol: "${wormData.stolenSymbol}"`);

        // Mark as inactive
        wormData.active = false;

        // Explosion animation
        wormData.element.classList.add('worm-clicked');
        wormData.element.style.transition = 'transform 0.3s, opacity 0.3s';
        wormData.element.style.transform = 'scale(2) rotate(360deg)';
        wormData.element.style.opacity = '0';

        // Return stolen symbol to solution
        if (wormData.targetElement) {
            wormData.targetElement.classList.remove('stolen');
            wormData.targetElement.style.visibility = 'visible';
            delete wormData.targetElement.dataset.stolen;

            // Add return animation
            wormData.targetElement.style.animation = 'symbol-return 0.5s ease-out';
            setTimeout(() => {
                if (wormData.targetElement) {
                    wormData.targetElement.style.animation = '';
                }
            }, 500);
        }

        // Dispatch event for successful worm click
        document.dispatchEvent(new CustomEvent('wormSymbolCorrect', {
            detail: { symbol: wormData.stolenSymbol }
        }));

        // Remove worm after animation
        setTimeout(() => {
            this.removeWorm(wormData);
        }, 300);
    }

    removeWorm(wormData) {
        const index = this.worms.indexOf(wormData);
        if (index > -1) {
            this.worms.splice(index, 1);
        }

        if (wormData.element && wormData.element.parentNode) {
            wormData.element.parentNode.removeChild(wormData.element);
        }

        console.log(`🐛 Worm ${wormData.id} removed. Active worms: ${this.worms.length}`);
    }

    reset() {
        console.log('🐛 Resetting worm system');

        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        // Remove all worms
        this.worms.forEach(worm => {
            if (worm.element && worm.element.parentNode) {
                worm.element.parentNode.removeChild(worm.element);
            }
        });

        this.worms = [];

        // Clear stolen flags from symbols
        if (this.solutionContainer) {
            const stolenSymbols = this.solutionContainer.querySelectorAll('[data-stolen]');
            stolenSymbols.forEach(el => {
                el.style.visibility = 'visible';
                el.classList.remove('stolen');
                delete el.dataset.stolen;
            });
        }
    }
}

// Initialize global worm system
document.addEventListener('DOMContentLoaded', () => {
    window.wormSystem = new WormSystem();
    console.log('✅ Global wormSystem created');
});
