// js/worm.js - Advanced Worm NPC Mechanics
console.log("Worm script loaded.");

class WormManager {
    constructor() {
        this.worms = [];
        this.maxWorms = 8;
        this.symbols = '0123456789X+-=÷×';
        this.containers = {
            progression: document.getElementById('progression-worms'),
            problemSolving: document.getElementById('problem-solving-worms'),
            matrix: document.getElementById('matrix-worms')
        };
        this.isInitialized = false;
        
        // Wait for DOM to be fully loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        if (this.isInitialized) return;
        
        console.log('🐛 Initializing Worm Manager');
        
        // Listen for problem completion events to spawn worms
        document.addEventListener('problemLineCompleted', () => this.spawnWorm());
        
        this.isInitialized = true;
    }

    spawnWorm() {
        if (this.worms.length >= this.maxWorms) {
            console.log('🚫 Maximum worms reached');
            return;
        }

        // Randomly choose a section to spawn the worm
        const sections = ['progression', 'problemSolving', 'matrix'];
        const section = sections[Math.floor(Math.random() * sections.length)];
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
        
        // Create segmented worm with 8 body segments
        const segments = [];
        const earthyColors = ['#8B4513', '#A0522D', '#CD853F', '#D2691E', '#DEB887'];
        const wormColor = earthyColors[Math.floor(Math.random() * earthyColors.length)];
        
        for (let i = 0; i < 8; i++) {
            const segment = document.createElement('div');
            segment.className = `worm-segment segment-${i}`;
            
            if (i === 0) {
                // Head segment with eyes
                segment.classList.add('worm-head');
                segment.innerHTML = `
                    <div class="worm-eye left-eye"></div>
                    <div class="worm-eye right-eye"></div>
                    <div class="worm-mouth"></div>
                `;
            }
            
            segment.style.backgroundColor = wormColor;
            segment.style.width = `${12 + Math.random() * 4}px`;
            segment.style.height = `${12 + Math.random() * 4}px`;
            
            wormContainer.appendChild(segment);
            segments.push(segment);
        }
        
        // Random starting position within the container
        const containerRect = container.getBoundingClientRect();
        const x = Math.random() * (containerRect.width - 100);
        const y = Math.random() * (containerRect.height - 30);
        
        wormContainer.style.left = x + 'px';
        wormContainer.style.top = y + 'px';
        
        // Add click event listener
        wormContainer.addEventListener('click', (e) => this.onWormClick(e, wormContainer));
        
        container.appendChild(wormContainer);
        
        return {
            element: wormContainer,
            segments: segments,
            section: section,
            container: container,
            isCarryingSymbol: false,
            carriedSymbol: null,
            lastStealTime: Date.now(),
            behaviorInterval: null,
            moveInterval: null,
            blinkInterval: null
        };
    }

    startWormBehavior(worm) {
        // Random movement every 200-500ms
        worm.moveInterval = setInterval(() => {
            this.moveWormRandomly(worm);
        }, 200 + Math.random() * 300);

        // Symbol stealing behavior every 10 seconds
        worm.behaviorInterval = setInterval(() => {
            this.wormStealSymbol(worm);
        }, 10000);

        // Blinking animation for eyes
        worm.blinkInterval = setInterval(() => {
            this.blinkWormEyes(worm);
        }, 2000 + Math.random() * 3000);

        // Initial movement
        this.moveWormRandomly(worm);
    }

    moveWormRandomly(worm) {
        const container = worm.container;
        const element = worm.element;
        
        if (!container || !element.parentNode) return;

        const containerRect = container.getBoundingClientRect();
        const maxX = containerRect.width - 100; // Account for worm length
        const maxY = containerRect.height - 30;
        
        // Random movement within bounds
        const currentX = parseInt(element.style.left) || 0;
        const currentY = parseInt(element.style.top) || 0;
        
        const deltaX = (Math.random() - 0.5) * 60; // Move up to 60px
        const deltaY = (Math.random() - 0.5) * 60;
        
        const newX = Math.max(0, Math.min(maxX, currentX + deltaX));
        const newY = Math.max(0, Math.min(maxY, currentY + deltaY));
        
        element.style.transition = 'all 0.5s ease-in-out';
        element.style.left = newX + 'px';
        element.style.top = newY + 'px';
        
        // Animate segments following the head
        this.animateSegmentMovement(worm, newX, newY);
    }

    animateSegmentMovement(worm, newX, newY) {
        // Create a trailing effect for segments
        worm.segments.forEach((segment, index) => {
            if (index > 0) {
                setTimeout(() => {
                    const lag = index * 2; // Each segment follows with a small delay
                    segment.style.transform = `translate(${-lag}px, ${-lag * 0.5}px)`;
                }, index * 50);
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

    wormStealSymbol(worm) {
        if (worm.isCarryingSymbol) return; // Already carrying something

        // Choose a random symbol to steal
        const symbol = this.symbols[Math.floor(Math.random() * this.symbols.length)];
        
        worm.isCarryingSymbol = true;
        worm.carriedSymbol = symbol;
        worm.element.textContent = symbol;
        worm.element.classList.add('carrying-symbol');
        
        console.log(`🐛 Worm stole symbol: ${symbol}`);
        
        // Create stealing animation
        this.createStealingEffect(worm, symbol);
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
