// js/3rdDISPLAY.js - Symbol Rain Display for Math Game
console.log("Symbol Rain Display script loaded.");

// PERFORMANCE FIX: Start animation immediately, don't wait for DOMContentLoaded
function initSymbolRain() {
    console.log('🎯 Initializing symbol rain (early start for performance)');
    const symbolRainContainer = document.getElementById('symbol-rain-container');

    if (!symbolRainContainer) {
        console.error('❌ Symbol rain container not found!');
        return;
    }

    console.log('✅ Symbol rain container found:', symbolRainContainer);

    const symbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', 'x', '+', '-', '=', '÷', '×'];

    // Mobile mode detection
    let isMobileMode = window.innerWidth <= 768 || document.body.classList.contains('res-mobile');

    // Configuration
    let symbolFallSpeed = 0.6;
    const maxFallSpeed = 6;
    const spawnRate = 0.2;
    const columnWidth = 50;

    // Guaranteed spawn system - ensure all symbols appear every 5 seconds
    let lastSpawnTime = {};
    symbols.forEach(sym => {
        lastSpawnTime[sym] = Date.now() - Math.random() * 2000;
    });
    const GUARANTEED_SPAWN_INTERVAL = 5000; // 5 seconds

    let columns = 0;
    let activeSymbols = [];
    let animationRunning = false;

    function calculateColumns() {
        const containerWidth = symbolRainContainer.offsetWidth;
        const containerHeight = symbolRainContainer.offsetHeight;
        columns = Math.floor(containerWidth / columnWidth);
        console.log(`📏 Container dimensions: ${containerWidth}x${containerHeight}, Columns: ${columns}`);
    }

    // DESKTOP: Create falling symbol (vertical)
    function createFallingSymbol(column, isInitialPopulation = false, forcedSymbol = null) {
        const symbol = document.createElement('div');
        symbol.className = 'falling-symbol';
        symbol.textContent = forcedSymbol || symbols[Math.floor(Math.random() * symbols.length)];
        symbol.style.left = (column * columnWidth + Math.random() * 30) + 'px';

        if (isInitialPopulation) {
            symbol.style.top = `${Math.random() * symbolRainContainer.offsetHeight}px`;
        } else {
            symbol.style.top = '-50px';
        }

        symbol.addEventListener('click', (event) => handleSymbolClick(symbol, event));
        symbolRainContainer.appendChild(symbol);

        activeSymbols.push({
            element: symbol,
            column: column,
            y: isInitialPopulation ? parseFloat(symbol.style.top) : -50,
            x: parseFloat(symbol.style.left),
            symbol: symbol.textContent
        });

        if (forcedSymbol) {
            lastSpawnTime[forcedSymbol] = Date.now();
        }
    }

    function populateInitialSymbols() {
        const initialSymbolCount = columns * 5;
        let spawned = 0;
        
        // Gradually spawn symbols over time to prevent performance spike
        function spawnBatch() {
            const batchSize = 3; // Spawn 3 symbols at a time
            const batchDelay = 50; // 50ms between batches
            
            for (let i = 0; i < batchSize && spawned < initialSymbolCount; i++) {
                createFallingSymbol(Math.floor(Math.random() * columns), true);
                spawned++;
            }
            
            if (spawned < initialSymbolCount) {
                setTimeout(spawnBatch, batchDelay);
            }
        }
        
        spawnBatch();
    }

    function handleSymbolClick(symbolElement, event) {
        if (!document.getElementById('panel-c').contains(event.target)) {
            return;
        }

        const clickedSymbol = symbolElement.textContent;
        document.dispatchEvent(new CustomEvent('symbolClicked', { detail: { symbol: clickedSymbol } }));

        symbolElement.classList.add('clicked');
        setTimeout(() => {
            if (symbolElement.parentNode) {
                symbolElement.parentNode.removeChild(symbolElement);
            }
            activeSymbols = activeSymbols.filter(s => s.element !== symbolElement);
        }, 500);
    }

    function checkCollision(symbolObj) {
        if (isMobileMode) {
            // Mobile: Check horizontal spacing
            const symbolWidth = 60;
            const horizontalBuffer = 80; // Space between symbols in train

            for (let other of activeSymbols) {
                if (other === symbolObj) continue;
                const distance = symbolObj.x - other.x;
                if (distance > 0 && distance < symbolWidth + horizontalBuffer) {
                    return true;
                }
            }
            return false;
        } else {
            // Desktop: Check vertical collision with increased spacing
            const symbolHeight = 30;
            const symbolWidth = 30;
            const collisionBuffer = 40; // Increased from 25 to spread symbols more
            const horizontalBuffer = 35; // Increased from 20 for better horizontal spacing

            // Cache element position to avoid repeated style access
            const symbolLeft = symbolObj.x;
            const symbolRight = symbolLeft + symbolWidth;

            for (let other of activeSymbols) {
                if (other === symbolObj) continue;

                // Use cached positions instead of parsing style
                const otherLeft = other.x;
                const otherRight = otherLeft + symbolWidth;

                const horizontalOverlap = !(symbolRight + horizontalBuffer < otherLeft || symbolLeft > otherRight + horizontalBuffer);

                if (horizontalOverlap) {
                    const distance = other.y - symbolObj.y;
                    if (distance > 0 && distance < symbolHeight + collisionBuffer) {
                        return true;
                    }
                }
            }
            return false;
        }
    }

    function animateSymbols() {
        const containerHeight = symbolRainContainer.offsetHeight;
        const currentTime = Date.now();

        // Use filter for cleanup and update positions in single pass
        activeSymbols = activeSymbols.filter(symbolObj => {
            // Check if symbol should be removed (out of bounds)
            if (symbolObj.y > containerHeight + 50) {
                symbolObj.element.remove();
                return false;
            }

            // Update position only if not colliding
            if (!checkCollision(symbolObj)) {
                symbolObj.y += symbolFallSpeed;
                symbolObj.element.style.top = `${symbolObj.y}px`;
            }

            return true;
        });

        // Guaranteed spawn system - all symbols in 5 seconds
        symbols.forEach(sym => {
            if (currentTime - lastSpawnTime[sym] > GUARANTEED_SPAWN_INTERVAL) {
                const randomColumn = Math.floor(Math.random() * columns);
                createFallingSymbol(randomColumn, false, sym);
            }
        });

        // Normal random spawning - optimized to reduce array iterations
        for (let col = 0; col < columns; col++) {
            if (Math.random() < spawnRate) {
                // Quick check: only spawn if column isn't crowded at top
                let columnCrowded = false;
                for (let i = 0; i < activeSymbols.length; i++) {
                    if (activeSymbols[i].column === col && activeSymbols[i].y < 100) {
                        columnCrowded = true;
                        break; // Early exit optimization
                    }
                }

                if (!columnCrowded) {
                    const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                    createFallingSymbol(col, false, randomSymbol);
                }
            }
        }
    }

    function startAnimation() {
        if (animationRunning) return;
        animationRunning = true;
        function loop() {
            if (animationRunning) {
                animateSymbols();
                requestAnimationFrame(loop);
            }
        }
        loop();
    }

    function startSpeedController() {
        setInterval(() => {
            if (!isMobileMode && symbolFallSpeed < maxFallSpeed) {
                symbolFallSpeed *= 1.05; // Increase by 5%
            }
        }, 10000); // Every 10 seconds
    }

    // Initialize
    console.log('🚀 Initializing symbol rain system...');
    calculateColumns();
    console.log(`📊 Creating ${columns * 5} initial symbols...`);
    populateInitialSymbols();
    console.log(`✨ Created ${activeSymbols.length} symbols`);
    startAnimation();
    console.log('▶️ Animation started');
    startSpeedController();
    console.log('⏱️ Speed controller started');

    window.addEventListener('resize', () => {
        console.log('🔄 Window resized, recalculating columns...');
        isMobileMode = window.innerWidth <= 768 || document.body.classList.contains('res-mobile');
        console.log(`📱 Mobile mode: ${isMobileMode}`);
        calculateColumns();
    });

    // Listen for display resolution changes
    document.addEventListener('displayResolutionChanged', (event) => {
        const isMobile = event.detail.name === 'mobile';
        isMobileMode = isMobile;
        console.log(`🖥️ Display resolution changed to: ${event.detail.name}, isMobileMode: ${isMobileMode}`);
    });
}

// PERFORMANCE FIX: Call initSymbolRain as soon as DOM is interactive (earlier than DOMContentLoaded)
if (document.readyState === 'loading') {
    // DOM still loading - wait for interactive state
    document.addEventListener('DOMContentLoaded', initSymbolRain);
} else {
    // DOM already loaded - start immediately
    initSymbolRain();
}

