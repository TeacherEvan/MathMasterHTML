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
        this.spawnTimer = null;
        this.firstWormSpawned = false;

        console.log('🐛 WormSystem initialized');

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', (event) => {
            console.log('🐛 Worm System received problemLineCompleted event:', event.detail);
            if (!this.firstWormSpawned) {
                this.spawnWorm();
                this.firstWormSpawned = true;
                // Start spawning new worms every 10 seconds
                this.startSpawnTimer();
            }
        });

        // Listen for symbol clicks in rain display to check if worm's target was clicked
        document.addEventListener('symbolClicked', (event) => {
            this.checkWormTargetClick(event.detail.symbol);
        });
    }

    startSpawnTimer() {
        // Clear existing timer if any
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
        }

        // Spawn a new worm every 10 seconds
        this.spawnTimer = setInterval(() => {
            if (this.worms.length < this.maxWorms) {
                this.spawnWorm();
            }
        }, 10000); // 10 seconds

        console.log('⏱️ Worm spawn timer started (every 10 seconds)');
    }

    checkWormTargetClick(clickedSymbol) {
        // Normalize X/x
        const normalizedClicked = clickedSymbol.toLowerCase() === 'x' ? 'X' : clickedSymbol;

        // Check if any worm is carrying this symbol
        this.worms.forEach(worm => {
            if (!worm.active || !worm.hasStolen) return;

            const normalizedWormSymbol = worm.stolenSymbol.toLowerCase() === 'x' ? 'X' : worm.stolenSymbol;

            if (normalizedWormSymbol === normalizedClicked) {
                console.log(`🎯 User clicked rain target "${clickedSymbol}" matching worm's stolen symbol!`);
                this.explodeWorm(worm);
            }
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

        // Create worm element
        const wormId = `worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container';
        wormElement.id = wormId;

        // Worm body with segments (quarter-coin size ~24px)
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

        // 5 segments for quarter-sized worm
        for (let i = 0; i < 5; i++) {
            const segment = document.createElement('div');
            segment.className = 'worm-segment';
            segment.style.setProperty('--segment-index', i);
            wormBody.appendChild(segment);
        }

        wormElement.appendChild(wormBody);

        // Random starting position at bottom
        const containerWidth = this.wormContainer.offsetWidth || 800;
        const containerHeight = this.wormContainer.offsetHeight || 600;
        const startX = Math.random() * Math.max(0, containerWidth - 80);
        const startY = Math.max(0, containerHeight - 30); // Bottom of container

        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';

        this.wormContainer.appendChild(wormElement);

        // Store worm data
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 1.0, // Horizontal roaming
            velocityY: (Math.random() - 0.5) * 0.5, // Slight vertical roaming
            active: true,
            hasStolen: false,
            roamingEndTime: Date.now() + 10000, // Roam for 10 seconds
            isFlickering: false,
            baseSpeed: 1.0,
            currentSpeed: 1.0
        };

        this.worms.push(wormData);

        // Add click handler to explode worm
        wormElement.addEventListener('click', () => this.explodeWorm(wormData));

        console.log(`✅ Worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);
        console.log(`🐛 Worm will roam for 10 seconds before stealing`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    stealSymbol(worm) {
        // Find a hidden symbol to steal
        const hiddenSymbols = this.solutionContainer.querySelectorAll('.hidden-symbol');
        const availableSymbols = Array.from(hiddenSymbols).filter(el => !el.dataset.stolen);

        if (availableSymbols.length === 0) {
            console.log('🐛 No hidden symbols available to steal');
            // Continue roaming
            worm.roamingEndTime = Date.now() + 5000;
            return;
        }

        // Pick random hidden symbol (only unlocked red symbols)
        const targetSymbol = availableSymbols[Math.floor(Math.random() * availableSymbols.length)];
        const symbolValue = targetSymbol.textContent;

        console.log(`🐛 Worm ${worm.id} stealing symbol: "${symbolValue}"`);

        // Mark symbol as stolen
        targetSymbol.dataset.stolen = 'true';
        targetSymbol.classList.add('stolen');

        // Update worm data
        worm.stolenSymbol = symbolValue;
        worm.targetElement = targetSymbol;
        worm.hasStolen = true;
        worm.element.dataset.stolenSymbol = symbolValue;

        // Add stolen symbol indicator
        const stolenSymbolDiv = document.createElement('div');
        stolenSymbolDiv.className = 'carried-symbol';
        stolenSymbolDiv.textContent = symbolValue;
        worm.element.appendChild(stolenSymbolDiv);

        // Change velocity to move upward and throw symbol out
        worm.velocityY = -1.5;
        worm.velocityX = (Math.random() - 0.5) * 0.5;

        console.log(`🐛 Worm now carrying "${symbolValue}" and moving to top`);
    }

    checkWormNearRainSymbol(worm) {
        if (!worm.hasStolen) return;

        // Get all falling symbols in rain display
        const rainSymbols = document.querySelectorAll('#symbol-rain-container .falling-symbol');
        const normalizedWormSymbol = worm.stolenSymbol.toLowerCase() === 'x' ? 'X' : worm.stolenSymbol;

        let isNearMatchingSymbol = false;

        rainSymbols.forEach(rainSymbol => {
            const rainSymbolText = rainSymbol.textContent;
            const normalizedRainSymbol = rainSymbolText.toLowerCase() === 'x' ? 'X' : rainSymbolText;

            if (normalizedRainSymbol === normalizedWormSymbol) {
                // Check proximity (simple distance check)
                const rainRect = rainSymbol.getBoundingClientRect();
                const wormRect = worm.element.getBoundingClientRect();

                // Calculate distance between centers
                const rainCenterX = rainRect.left + rainRect.width / 2;
                const rainCenterY = rainRect.top + rainRect.height / 2;
                const wormCenterX = wormRect.left + wormRect.width / 2;
                const wormCenterY = wormRect.top + wormRect.height / 2;

                const distance = Math.sqrt(
                    Math.pow(rainCenterX - wormCenterX, 2) +
                    Math.pow(rainCenterY - wormCenterY, 2)
                );

                // If within ~100px, consider it "near"
                if (distance < 100) {
                    isNearMatchingSymbol = true;
                }
            }
        });

        // Update flicker state
        if (isNearMatchingSymbol && !worm.isFlickering) {
            console.log(`🌈 Worm ${worm.id} near matching rain symbol - FLICKERING!`);
            worm.isFlickering = true;
            worm.element.classList.add('flickering');
            worm.currentSpeed = worm.baseSpeed * 1.3; // 30% speed boost
        } else if (!isNearMatchingSymbol && worm.isFlickering) {
            console.log(`🐛 Worm ${worm.id} no longer near matching symbol - normal`);
            worm.isFlickering = false;
            worm.element.classList.remove('flickering');
            worm.currentSpeed = worm.baseSpeed;
        }
    }

    animate() {
        if (this.worms.length === 0) {
            this.animationFrameId = null;
            return;
        }

        const currentTime = Date.now();

        this.worms.forEach(worm => {
            if (!worm.active) return;

            // Check if roaming period has ended and worm hasn't stolen yet
            if (!worm.hasStolen && currentTime >= worm.roamingEndTime) {
                this.stealSymbol(worm);
            }

            // Check proximity to matching rain symbols (for flickering effect)
            if (worm.hasStolen) {
                this.checkWormNearRainSymbol(worm);
            }

            // Update position based on current behavior
            if (!worm.hasStolen) {
                // Roaming behavior - random movement in bottom area
                worm.x += worm.velocityX * worm.currentSpeed;
                worm.y += worm.velocityY * worm.currentSpeed;

                // Keep in bottom 40% while roaming
                const containerHeight = this.wormContainer.offsetHeight || 600;
                const minY = containerHeight * 0.6;
                const maxY = containerHeight - 30;

                if (worm.y < minY) {
                    worm.y = minY;
                    worm.velocityY *= -1;
                }
                if (worm.y > maxY) {
                    worm.y = maxY;
                    worm.velocityY *= -1;
                }

                // Bounce horizontally
                const containerWidth = this.wormContainer.offsetWidth || 800;
                if (worm.x < 5) {
                    worm.x = 5;
                    worm.velocityX *= -1;
                }
                if (worm.x > containerWidth - 80) {
                    worm.x = containerWidth - 80;
                    worm.velocityX *= -1;
                }
            } else {
                // Carrying symbol - move upward to throw it out
                worm.y += worm.velocityY * worm.currentSpeed;
                worm.x += worm.velocityX * worm.currentSpeed;

                // Keep horizontal position in bounds
                const containerWidth = this.wormContainer.offsetWidth || 800;
                if (worm.x < 5) {
                    worm.x = 5;
                    worm.velocityX *= -1;
                }
                if (worm.x > containerWidth - 80) {
                    worm.x = containerWidth - 80;
                    worm.velocityX *= -1;
                }

                // Check if worm has thrown symbol out of bounds (reached top)
                if (worm.y < -50) {
                    console.log(`🐛 Worm ${worm.id} threw symbol "${worm.stolenSymbol}" out of bounds`);
                    this.removeWorm(worm);
                    return;
                }
            }

            // Apply position directly (no CSS transitions)
            worm.element.style.left = `${worm.x}px`;
            worm.element.style.top = `${worm.y}px`;
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

        // Clear spawn timer
        if (this.spawnTimer) {
            clearInterval(this.spawnTimer);
            this.spawnTimer = null;
        }

        // Reset spawn flag
        this.firstWormSpawned = false;

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
