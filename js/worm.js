// js/worm.js - Refactored Worm System with Console Integration
console.log("🐛 Worm System Loading...");

class WormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 4; // As per spec
        this.wormContainer = null;
        this.solutionContainer = null;
        this.consoleElement = null;
        this.isInitialized = false;
        this.animationFrameId = null;
        this.spawnTimer = null;
        this.firstWormSpawned = false;
        this.lockedConsoleSlots = new Set(); // Track which console slots have active worms

        console.log('🐛 WormSystem initialized');

        // Listen for the custom event dispatched by game.js
        document.addEventListener('problemLineCompleted', (event) => {
            console.log('🐛 Worm System received problemLineCompleted event:', event.detail);
            this.spawnWormFromConsole();
        });

        // Listen for symbol clicks in rain display to check if worm's target was clicked
        document.addEventListener('symbolClicked', (event) => {
            this.checkWormTargetClick(event.detail.symbol);
        });
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
        this.consoleElement = document.getElementById('symbol-console');

        if (!this.wormContainer) {
            console.error('🐛 Worm container #panel-b not found!');
            return;
        }

        if (!this.solutionContainer) {
            console.error('🐛 Solution container not found!');
            return;
        }

        if (!this.consoleElement) {
            console.error('🐛 Console element not found!');
            return;
        }

        // Ensure container has relative positioning for absolute children
        if (getComputedStyle(this.wormContainer).position === 'static') {
            this.wormContainer.style.position = 'relative';
        }

        this.isInitialized = true;
        console.log('✅ Worm System initialized successfully');
    }

    // Find an empty console slot to spawn worm from
    findEmptyConsoleSlot() {
        if (!this.consoleElement) return null;

        const slots = this.consoleElement.querySelectorAll('.console-slot');
        const emptySlots = [];

        slots.forEach((slot, index) => {
            // Check if slot is empty and not locked by an active worm
            if (!slot.textContent && !this.lockedConsoleSlots.has(index)) {
                emptySlots.push({ element: slot, index: index });
            }
        });

        if (emptySlots.length === 0) {
            console.log('⚠️ No empty console slots available for worm spawn');
            return null;
        }

        // Return random empty slot
        return emptySlots[Math.floor(Math.random() * emptySlots.length)];
    }

    // Spawn worm from console slot with slide-open animation
    spawnWormFromConsole() {
        this.initialize();

        console.log(`🐛 spawnWormFromConsole() called. Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
            return;
        }

        // Find empty console slot
        const slotData = this.findEmptyConsoleSlot();
        if (!slotData) {
            console.log('⚠️ All console slots occupied or locked, spawning worm normally');
            this.spawnWorm(); // Fallback to normal spawn
            return;
        }

        const { element: slotElement, index: slotIndex } = slotData;

        // Lock this console slot
        this.lockedConsoleSlots.add(slotIndex);
        slotElement.classList.add('worm-spawning', 'locked');

        console.log(`🕳️ Worm spawning from console slot ${slotIndex + 1}`);

        // Get slot position for worm spawn point
        const slotRect = slotElement.getBoundingClientRect();
        const containerRect = this.wormContainer.getBoundingClientRect();

        // Calculate spawn position relative to panel-b
        const startX = slotRect.left - containerRect.left + (slotRect.width / 2);
        const startY = slotRect.top - containerRect.top + (slotRect.height / 2);

        // Create worm element
        const wormId = `worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container console-worm';
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

        // Position worm at console slot
        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';
        wormElement.style.zIndex = '1000'; // High z-index for visibility
        wormElement.style.opacity = '1';
        wormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(wormElement);

        // Store worm data with console slot reference
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 1.5, // Horizontal roaming
            velocityY: (Math.random() - 0.5) * 1.0, // Vertical roaming
            active: true,
            hasStolen: false,
            roamingEndTime: Date.now() + 10000, // Roam for 10 seconds
            isFlickering: false,
            baseSpeed: 1.5,
            currentSpeed: 1.5,
            consoleSlotIndex: slotIndex,
            consoleSlotElement: slotElement,
            fromConsole: true
        };

        this.worms.push(wormData);// Add click handler to explode worm
        wormElement.addEventListener('click', () => this.explodeWorm(wormData));

        console.log(`✅ Worm ${wormId} spawned at (${startX.toFixed(0)}, ${startY.toFixed(0)}). Total worms: ${this.worms.length}`);
        console.log(`🐛 Worm will roam for 10 seconds before stealing`);

        // Start animation loop if not already running
        if (this.worms.length === 1) {
            this.animate();
        }
    }

    // Fallback spawn method for when console slots are all occupied
    spawnWorm() {
        this.initialize();

        console.log(`🐛 spawnWorm() called (fallback). Current worms: ${this.worms.length}/${this.maxWorms}`);

        if (this.worms.length >= this.maxWorms) {
            console.log(`⚠️ Max worms (${this.maxWorms}) reached. No more spawning.`);
            return;
        }

        // Create worm element
        const wormId = `worm-${Date.now()}-${Math.random()}`;
        const wormElement = document.createElement('div');
        wormElement.className = 'worm-container';
        wormElement.id = wormId;

        // Worm body with segments
        const wormBody = document.createElement('div');
        wormBody.className = 'worm-body';

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
        const startY = Math.max(0, containerHeight - 30);

        wormElement.style.left = `${startX}px`;
        wormElement.style.top = `${startY}px`;
        wormElement.style.position = 'absolute';
        wormElement.style.zIndex = '1000'; // High z-index for visibility
        wormElement.style.opacity = '1';
        wormElement.style.visibility = 'visible';

        this.wormContainer.appendChild(wormElement);

        // Store worm data (non-console worm)
        const wormData = {
            id: wormId,
            element: wormElement,
            stolenSymbol: null,
            targetElement: null,
            x: startX,
            y: startY,
            velocityX: (Math.random() - 0.5) * 1.0,
            velocityY: (Math.random() - 0.5) * 0.5,
            active: true,
            hasStolen: false,
            roamingEndTime: Date.now() + 10000,
            isFlickering: false,
            baseSpeed: 1.0,
            currentSpeed: 1.0,
            fromConsole: false
        };

        this.worms.push(wormData);

        // Add click handler
        wormElement.addEventListener('click', () => this.explodeWorm(wormData));

        console.log(`✅ Worm ${wormId} spawned (fallback mode). Total worms: ${this.worms.length}`);

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
                // Carrying symbol - behavior depends on if worm is from console
                if (worm.fromConsole && worm.consoleSlotElement) {
                    // Move back towards console hole
                    const slotRect = worm.consoleSlotElement.getBoundingClientRect();
                    const containerRect = this.wormContainer.getBoundingClientRect();

                    const targetX = slotRect.left - containerRect.left + (slotRect.width / 2);
                    const targetY = slotRect.top - containerRect.top + (slotRect.height / 2);

                    // Calculate direction to console
                    const dx = targetX - worm.x;
                    const dy = targetY - worm.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < 20) {
                        // Reached console hole - escape with symbol!
                        console.log(`🐛 Worm ${worm.id} escaped to console with symbol "${worm.stolenSymbol}"!`);
                        this.removeWorm(worm);
                        return;
                    }

                    // Move towards console
                    worm.velocityX = (dx / distance) * 2;
                    worm.velocityY = (dy / distance) * 2;

                    worm.x += worm.velocityX * worm.currentSpeed;
                    worm.y += worm.velocityY * worm.currentSpeed;
                } else {
                    // Non-console worm - move upward to throw it out
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

        // Unlock console slot if worm was spawned from console
        if (wormData.fromConsole && wormData.consoleSlotIndex !== undefined) {
            this.lockedConsoleSlots.delete(wormData.consoleSlotIndex);
            if (wormData.consoleSlotElement) {
                wormData.consoleSlotElement.classList.remove('worm-spawning', 'locked');
            }
            console.log(`🔓 Console slot ${wormData.consoleSlotIndex + 1} unlocked`);
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
