// js/worm.js - Redesigned Elegant Worm System
console.log("🐛 New Worm System Loading...");

class ElegantWormSystem {
    constructor() {
        this.worms = [];
        this.maxWorms = 6;
        this.symbols = '0123456789Xx+-=÷×';
        this.containers = {};
        this.isActive = false;
        
        // Initialize after DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('🐛 Initializing Elegant Worm System');
        
        // Find containers
        this.containers = {
            progression: document.getElementById('progression-worms'),
            problemSolving: document.getElementById('problem-solving-worms'),
            matrix: document.getElementById('matrix-worms')
        };
        
        // Verify containers exist
        const validContainers = Object.values(this.containers).filter(c => c);
        if (validContainers.length === 0) {
            console.error('❌ No worm containers found! Retrying...');
            setTimeout(() => this.initialize(), 2000);
            return;
        }
        
        console.log(`✅ Found ${validContainers.length} worm containers`);
        this.isActive = true;
        
        // Create initial worms
        this.createInitialWorms();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Start worm behaviors
        this.startWormBehaviors();
    }

    createInitialWorms() {
        const containerNames = Object.keys(this.containers);
        
        for (let i = 0; i < this.maxWorms; i++) {
            const containerName = containerNames[i % containerNames.length];
            const container = this.containers[containerName];
            
            if (container) {
                const worm = this.createWorm(container, containerName);
                this.worms.push(worm);
            }
        }
        
        console.log(`🐛 Created ${this.worms.length} elegant worms`);
    }

    setupEventListeners() {
        // Listen for problem completion events to spawn worms
        document.addEventListener('problemLineCompleted', () => {
            console.log('🐛 RECEIVED problemLineCompleted event - Spawning worm!');
            this.spawnWorm();
        });
        
        this.isInitialized = true;
        console.log('🐛 Worm Manager initialization complete!');
    }

    spawnWorm() {
        console.log(`🐛 SPAWN WORM CALLED - Current worms: ${this.worms.length}, Max: ${this.maxWorms}`);
        
        if (this.worms.length >= this.maxWorms) {
            console.log('🚫 Maximum worms reached');
            return;
        }

        // Worms should ONLY appear in the middle panel (problem-solving display)
        const section = 'problemSolving';
        const container = this.containers[section];

        if (!container) {
            console.error('❌ Container not found for section:', section);
            return;
        }

        const worm = this.createWormElement(section, container);
        this.worms.push(worm);
        
        console.log(`🐛 Spawned worm #${this.worms.length} in ${section} section`);
        
        // Start worm behavior after a short delay
        setTimeout(() => this.startWormBehavior(worm), 500);
    }

    createWormElement(section, container) {
        const wormContainer = document.createElement('div');
        wormContainer.className = 'worm-container';
        wormContainer.dataset.section = section;
        wormContainer.dataset.id = `worm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Create segmented worm with 8 body segments - REALISTIC EARTHWORM COLORS
        const segments = [];
        const earthyColors = [
            { base: '#C4A484', light: '#D4B896' }, // Sandy brown - realistic earthworm
            { base: '#B8956F', light: '#C8A57F' }, // Medium brown
            { base: '#A0785A', light: '#B0886A' }, // Darker brown  
            { base: '#D4B896', light: '#E4C8A6' }, // Light sandy
            { base: '#C4A484', light: '#D4B896' }  // Back to sandy brown
        ];
        const colorSet = earthyColors[Math.floor(Math.random() * earthyColors.length)];
        
        // Set CSS custom properties for consistent coloring
        wormContainer.style.setProperty('--worm-color', colorSet.base);
        wormContainer.style.setProperty('--worm-color-light', colorSet.light);
        
        for (let i = 0; i < 8; i++) {
            const segment = document.createElement('div');
            segment.className = `worm-segment segment-${i}`;
            
            if (i === 0) {
                // Head segment with eyes and mouth
                segment.classList.add('worm-head');
                segment.innerHTML = `
                    <div class="worm-eye left-eye"></div>
                    <div class="worm-eye right-eye"></div>
                    <div class="worm-mouth"></div>
                `;
            }
            
            // Proper 12px base segment size with slight randomization as specified
            const segmentSize = 12 + Math.random() * 4;
            segment.style.width = `${segmentSize}px`;
            segment.style.height = `${segmentSize}px`;
            
            wormContainer.appendChild(segment);
            segments.push(segment);
        }
        
        // FIXED: Position worm on the BOTTOM of the container (ground level)
        const containerRect = container.getBoundingClientRect();
        const x = Math.random() * (containerRect.width - 120); // Account for worm length
        const y = containerRect.height - 30; // FORCE worms to stay at BOTTOM
        
        wormContainer.style.left = x + 'px';
        wormContainer.style.top = y + 'px';
        
        // Add click event listener for symbol theft prevention
        wormContainer.addEventListener('click', (e) => this.onWormClick(e, wormContainer));
        
        container.appendChild(wormContainer);
        
        return {
            element: wormContainer,
            segments: segments,
            section: section,
            container: container,
            isCarryingSymbol: false,
            carriedSymbol: null,
            targetSymbol: null,
            lastStealTime: Date.now(),
            behaviorInterval: null,
            moveInterval: null,
            blinkInterval: null,
            currentX: x,
            currentY: y,
            direction: Math.random() * 360, // Random initial direction
            speed: 0.5 + Math.random() * 1.5, // Dynamic speed as specified
            groundLevel: containerRect.height - 30 // Store ground level
        };
    }

    startWormBehavior(worm) {
        // FIXED: Slower, less frequent movement to reduce lag
        worm.moveInterval = setInterval(() => {
            this.moveWormWithBouncing(worm);
        }, 1000); // Much slower - move every 1 second

        // Symbol stealing behavior - less frequent
        worm.behaviorInterval = setInterval(() => {
            this.attemptSymbolTheft(worm);
        }, 8000 + Math.random() * 5000); // 8-13 seconds

        // Blinking animation - less frequent
        worm.blinkInterval = setInterval(() => {
            this.blinkWormEyes(worm);
        }, 3000 + Math.random() * 2000); // 3-5 seconds

        // Initial movement
        this.moveWormWithBouncing(worm);
    }

    moveWormWithBouncing(worm) {
        const container = worm.container;
        const element = worm.element;
        
        if (!container || !element.parentNode) return;

        const containerRect = container.getBoundingClientRect();
        const maxX = containerRect.width - 120; // Account for full worm length
        const groundLevel = containerRect.height - 30; // KEEP ON GROUND
        
        // FIXED: Horizontal movement ONLY - no vertical floating
        const moveDistance = worm.speed * 2; // Slower movement
        
        let newX = worm.currentX + (Math.random() > 0.5 ? moveDistance : -moveDistance);
        let newY = groundLevel; // ALWAYS stay on ground
        
        // Edge bouncing behavior - HORIZONTAL ONLY
        if (newX <= 0) {
            newX = 5; // Bounce off left edge
        }
        if (newX >= maxX) {
            newX = maxX - 5; // Bounce off right edge
        }
        
        // Update position
        worm.currentX = newX;
        worm.currentY = newY;
        
        // INSTANT position updates - no transitions
        element.style.transition = 'none';
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        
        // Simple segment following without floating effects
        this.animateSegmentFollowing(worm);
    }

    animateSegmentFollowing(worm) {
        // SIMPLIFIED: No floating effects, just basic trailing
        worm.segments.forEach((segment, index) => {
            if (index > 0) {
                const lag = index * 2; // Simple trailing distance
                segment.style.transform = `translate(${-lag}px, 0px)`;
                // NO size changes, NO rotation, NO sine waves
            }
        });
    }

    blinkWormEyes(worm) {
        const eyes = worm.element.querySelectorAll('.worm-eye');
        eyes.forEach(eye => {
            eye.style.opacity = '0';
            setTimeout(() => {
                eye.style.opacity = '1';
            }, 100 + Math.random() * 200);
        });
    }

    attemptSymbolTheft(worm) {
        if (worm.isCarryingSymbol) return; // Already carrying something

        // Find symbols in the problem-solving area (middle panel)
        const symbols = document.querySelectorAll('#solution-container .symbol, #problem-container .symbol, .math-symbol, .revealed-symbol');
        
        if (symbols.length === 0) {
            console.log('🐛 No symbols found to steal');
            return;
        }

        // Choose a random symbol with proximity-based targeting
        const targetSymbol = this.findNearestSymbol(worm, symbols);
        
        if (!targetSymbol) return;

        console.log(`🐛 Worm targeting symbol: ${targetSymbol.textContent}`);
        
        // Start theft animation - 1-second smooth movement as specified
        this.startTheftAnimation(worm, targetSymbol);
    }

    findNearestSymbol(worm, symbols) {
        let nearest = null;
        let shortestDistance = Infinity;
        
        const wormRect = worm.element.getBoundingClientRect();
        const wormCenterX = wormRect.left + wormRect.width / 2;
        const wormCenterY = wormRect.top + wormRect.height / 2;
        
        symbols.forEach(symbol => {
            const symbolRect = symbol.getBoundingClientRect();
            const symbolCenterX = symbolRect.left + symbolRect.width / 2;
            const symbolCenterY = symbolRect.top + symbolRect.height / 2;
            
            const distance = Math.sqrt(
                Math.pow(wormCenterX - symbolCenterX, 2) + 
                Math.pow(wormCenterY - symbolCenterY, 2)
            );
            
            // Detection range as specified - within reasonable proximity
            if (distance < 200 && distance < shortestDistance) {
                shortestDistance = distance;
                nearest = symbol;
            }
        });
        
        return nearest;
    }

    startTheftAnimation(worm, targetSymbol) {
        const symbolText = targetSymbol.textContent || targetSymbol.innerText;
        const symbolRect = targetSymbol.getBoundingClientRect();
        const containerRect = worm.container.getBoundingClientRect();
        
        // Calculate position relative to worm container
        const targetX = symbolRect.left - containerRect.left;
        const targetY = symbolRect.top - containerRect.top;
        
        // Store original position
        const originalX = worm.currentX;
        const originalY = worm.currentY;
        
        // 1-second smooth movement to symbol as specified
        worm.element.style.transition = 'all 1s ease-in-out';
        worm.element.style.left = targetX + 'px';
        worm.element.style.top = targetY + 'px';
        
        // Visual indicator - glow effect during targeting
        worm.element.style.filter = 'drop-shadow(0 0 10px rgba(255, 165, 0, 0.8))';
        
        setTimeout(() => {
            // Symbol follows worm to off-screen as specified
            this.completeTheft(worm, targetSymbol, symbolText, originalX, originalY);
        }, 1000);
    }

    completeTheft(worm, targetSymbol, symbolText, originalX, originalY) {
        // Mark as carrying symbol
        worm.isCarryingSymbol = true;
        worm.carriedSymbol = symbolText;
        worm.element.dataset.symbol = symbolText;
        worm.element.classList.add('carrying-symbol');
        
        // Hide the original symbol (simulate theft)
        targetSymbol.style.opacity = '0.3';
        targetSymbol.style.textDecoration = 'line-through';
        
        // Transport effect - symbol follows worm
        const symbolIndicator = document.createElement('div');
        symbolIndicator.className = 'stolen-symbol-indicator';
        symbolIndicator.textContent = symbolText;
        symbolIndicator.style.cssText = `
            position: absolute;
            top: -25px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #ff6600, #ffaa00);
            color: #000;
            padding: 4px 8px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
            box-shadow: 0 3px 6px rgba(0,0,0,0.4);
            border: 2px solid #cc4400;
            animation: symbolBob 0.8s ease-in-out infinite;
            z-index: 20;
        `;
        
        worm.element.appendChild(symbolIndicator);
        
        // Move to off-screen location for transport
        worm.element.style.transition = 'all 2s ease-in-out';
        worm.element.style.left = '-100px';
        worm.element.style.opacity = '0.7';
        
        console.log(`🐛 Worm successfully stole symbol: ${symbolText}`);
        
        // Return after theft (with stolen symbol)
        setTimeout(() => {
            this.returnAfterTheft(worm, originalX, originalY);
        }, 2000);
    }

    returnAfterTheft(worm, originalX, originalY) {
        // Return to approximate original area
        const returnX = originalX + (Math.random() - 0.5) * 100;
        const returnY = originalY + (Math.random() - 0.5) * 100;
        
        worm.element.style.transition = 'all 1.5s ease-in-out';
        worm.element.style.left = returnX + 'px';
        worm.element.style.top = returnY + 'px';
        worm.element.style.opacity = '1';
        
        worm.currentX = returnX;
        worm.currentY = returnY;
        
        // Resume normal behavior after 3 seconds
        setTimeout(() => {
            worm.element.style.filter = '';
        }, 1500);
    }

    onWormClick(event, wormContainer) {
        event.stopPropagation();
        
        // Find the worm object
        const worm = this.worms.find(w => w.element === wormContainer);
        if (!worm) return;
        
        console.log('🎯 Worm clicked - Player intervention!');
        
        if (worm.isCarryingSymbol) {
            // Save the symbol! - Player intervention as specified
            this.saveSymbolFromWorm(worm);
            
            // Visual and audio confirmation as specified
            this.showSaveEffect(worm);
            
            // Remove the stolen symbol indicator
            const indicator = worm.element.querySelector('.stolen-symbol-indicator');
            if (indicator) indicator.remove();
            
            worm.isCarryingSymbol = false;
            worm.carriedSymbol = null;
            worm.element.removeAttribute('data-symbol');
            worm.element.classList.remove('carrying-symbol');
            
            console.log('✅ Symbol saved by player intervention!');
        } else {
            // Explosion animation when clicked as specified
            this.createExplosionEffect(worm);
            this.destroyWorm(worm);
        }
    }

    saveSymbolFromWorm(worm) {
        // Restore the stolen symbol to its original location
        const symbols = document.querySelectorAll('#solution-container .symbol, #problem-container .symbol, .math-symbol, .revealed-symbol');
        
        symbols.forEach(symbol => {
            if (symbol.style.opacity === '0.3' && symbol.style.textDecoration === 'line-through') {
                symbol.style.opacity = '1';
                symbol.style.textDecoration = 'none';
                
                // Add save effect
                symbol.style.animation = 'symbolSaved 1s ease-in-out';
                setTimeout(() => {
                    symbol.style.animation = '';
                }, 1000);
            }
        });
    }

    showSaveEffect(worm) {
        // Visual confirmation effect
        const saveEffect = document.createElement('div');
        saveEffect.textContent = 'SAVED!';
        saveEffect.style.cssText = `
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            color: #00ff00;
            font-weight: bold;
            font-size: 14px;
            z-index: 25;
            animation: saveText 1.5s ease-out forwards;
        `;
        
        worm.element.appendChild(saveEffect);
        
        setTimeout(() => {
            if (saveEffect.parentNode) {
                saveEffect.parentNode.removeChild(saveEffect);
            }
        }, 1500);
    }

    createExplosionEffect(worm) {
        // Explosion animation when clicked as specified
        worm.element.style.animation = 'wormDeath 0.5s ease-out forwards';
        
        // Create particle effect
        for (let i = 0; i < 8; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: absolute;
                width: 4px;
                height: 4px;
                background: #ff6600;
                border-radius: 50%;
                left: 50%;
                top: 50%;
                animation: explodeParticle 0.8s ease-out forwards;
                animation-delay: ${i * 0.1}s;
                transform: rotate(${i * 45}deg) translateY(-20px);
            `;
            worm.element.appendChild(particle);
        }
    }

    createStealingEffect(worm, symbol) {
        const container = worm.container;
        const wormRect = worm.element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        
        // Create floating symbol effect
        const floatingSymbol = document.createElement('div');
        floatingSymbol.className = 'stolen-symbol';
        floatingSymbol.textContent = symbol;
        floatingSymbol.style.left = (wormRect.left - containerRect.left) + 'px';
        floatingSymbol.style.top = (wormRect.top - containerRect.top) + 'px';
        
        container.appendChild(floatingSymbol);
        
        // Remove after animation
        setTimeout(() => {
            if (floatingSymbol.parentNode) {
                floatingSymbol.remove();
            }
        }, 2500);
    }

    onWormClick(event, worm) {
        event.stopPropagation();
        
        if (worm.isCarryingSymbol) {
            // Check if this is the correct symbol click
            const expectedSymbol = this.getNextExpectedSymbol();
            
            if (worm.carriedSymbol === expectedSymbol) {
                console.log(`✅ Correct! Destroyed worm carrying: ${worm.carriedSymbol}`);
                this.destroyWorm(worm);
                
                // Trigger correct answer event
                document.dispatchEvent(new CustomEvent('wormSymbolCorrect', {
                    detail: { symbol: worm.carriedSymbol }
                }));
            } else {
                console.log(`❌ Wrong symbol! Expected: ${expectedSymbol}, Got: ${worm.carriedSymbol}`);
                this.flashWormError(worm);
            }
        } else {
            // Clicking on worm without symbol multiplies it
            console.log('🐛 Worm clicked - multiplying!');
            this.multiplyWorm(worm);
        }
    }

    getNextExpectedSymbol() {
        // This should integrate with the game logic to get the next expected character
        // For now, return a random symbol from the current problem
        const solutionContainer = document.getElementById('solution-container');
        if (solutionContainer) {
            const hiddenChars = solutionContainer.querySelectorAll('.hidden-char');
            if (hiddenChars.length > 0) {
                return hiddenChars[0].textContent;
            }
        }
        return this.symbols[Math.floor(Math.random() * this.symbols.length)];
    }

    flashWormError(worm) {
        worm.element.style.background = 'radial-gradient(circle, #ff0000, #cc0000)';
        worm.element.style.animation = 'none';
        
        setTimeout(() => {
            worm.element.style.background = '';
            worm.element.style.animation = '';
        }, 500);
    }

    multiplyWorm(worm) {
        if (this.worms.length >= this.maxWorms) {
            console.log('🚫 Cannot multiply - max worms reached');
            return;
        }

        // Create a new worm near the clicked one
        const newWorm = this.createWormElement(worm.section, worm.container);
        
        // Position near the original worm
        const originalRect = worm.element.getBoundingClientRect();
        const containerRect = worm.container.getBoundingClientRect();
        
        const offsetX = (Math.random() - 0.5) * 100;
        const offsetY = (Math.random() - 0.5) * 100;
        
        newWorm.element.style.left = Math.max(0, Math.min(
            containerRect.width - 30,
            (originalRect.left - containerRect.left) + offsetX
        )) + 'px';
        
        newWorm.element.style.top = Math.max(0, Math.min(
            containerRect.height - 30,
            (originalRect.top - containerRect.top) + offsetY
        )) + 'px';
        
        this.worms.push(newWorm);
        
        // Start behavior for new worm
        setTimeout(() => this.startWormBehavior(newWorm), 500);
        
        console.log(`🐛➡️🐛 Worm multiplied! Now ${this.worms.length} worms total`);
    }

    destroyWorm(worm) {
        // Clear intervals
        if (worm.behaviorInterval) clearInterval(worm.behaviorInterval);
        if (worm.moveInterval) clearInterval(worm.moveInterval);
        if (worm.blinkInterval) clearInterval(worm.blinkInterval);
        
        // Death animation
        worm.element.style.animation = 'wormDeath 0.5s ease-out forwards';
        
        setTimeout(() => {
            if (worm.element.parentNode) {
                worm.element.remove();
            }
            
            // Remove from worms array
            this.worms = this.worms.filter(w => w !== worm);
            
            console.log(`💀 Worm destroyed. ${this.worms.length} worms remaining`);
        }, 500);
    }

    // Method to be called when a problem line is completed
    onProblemLineCompleted() {
        this.spawnWorm();
    }

    // Cleanup method
    destroyAllWorms() {
        console.log('🧹 Destroying all worms');
        this.worms.forEach(worm => this.destroyWorm(worm));
        this.worms = [];
    }
}

// Add death animation CSS
const wormStyles = document.createElement('style');
wormStyles.textContent = `
    @keyframes wormDeath {
        0% { 
            transform: scale(1) rotate(0deg); 
            opacity: 1; 
        }
        50% { 
            transform: scale(1.5) rotate(180deg); 
            opacity: 0.7; 
            background: radial-gradient(circle, #ff0000, #cc0000);
        }
        100% { 
            transform: scale(0) rotate(360deg); 
            opacity: 0; 
        }
    }
`;
document.head.appendChild(wormStyles);

// Initialize the worm manager
const wormManager = new WormManager();

// Export for global access
window.wormManager = wormManager;
