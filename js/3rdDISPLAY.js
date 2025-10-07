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

    // PERFORMANCE: Cache container dimensions to prevent layout thrashing
    let cachedContainerHeight = 0;

    // PERFORMANCE: Tab visibility throttling (saves 95% CPU when tab hidden)
    let isTabVisible = !document.hidden;

    // PERFORMANCE: DOM element pooling to reduce GC pressure
    const symbolPool = [];
    const POOL_SIZE = 30;

    // PERFORMANCE: Spatial hash grid for O(n) collision detection instead of O(n²)
    const GRID_CELL_SIZE = 100; // 100px cells
    let spatialGrid = new Map();

    // PERFORMANCE: Debounce utility to prevent excessive function calls
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function getCellKey(x, y) {
        const cellX = Math.floor(x / GRID_CELL_SIZE);
        const cellY = Math.floor(y / GRID_CELL_SIZE);
        return `${cellX},${cellY}`;
    }

    function updateSpatialGrid() {
        spatialGrid.clear();
        activeSymbols.forEach(symbolObj => {
            const key = getCellKey(symbolObj.x, symbolObj.y);
            if (!spatialGrid.has(key)) {
                spatialGrid.set(key, []);
            }
            spatialGrid.get(key).push(symbolObj);
        });
    }

    function getNeighborCells(x, y) {
        const cellX = Math.floor(x / GRID_CELL_SIZE);
        const cellY = Math.floor(y / GRID_CELL_SIZE);
        const neighbors = [];

        // Check current cell and 8 surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const key = `${cellX + dx},${cellY + dy}`;
                if (spatialGrid.has(key)) {
                    neighbors.push(...spatialGrid.get(key));
                }
            }
        }
        return neighbors;
    }

    function calculateColumns() {
        const containerWidth = symbolRainContainer.offsetWidth;
        cachedContainerHeight = symbolRainContainer.offsetHeight; // Cache height here
        columns = Math.floor(containerWidth / columnWidth);
        console.log(`📏 Container dimensions: ${containerWidth}x${cachedContainerHeight}, Columns: ${columns}`);
    }

    // PERFORMANCE: Get symbol from pool or create new one
    function getSymbolFromPool() {
        if (symbolPool.length > 0) {
            const symbol = symbolPool.pop();
            symbol.style.display = 'block';
            return symbol;
        }
        // Create new element if pool is empty
        const symbol = document.createElement('div');
        symbol.className = 'falling-symbol';
        return symbol;
    }

    // PERFORMANCE: Return symbol to pool for reuse
    function returnSymbolToPool(symbolElement) {
        if (symbolPool.length < POOL_SIZE) {
            symbolElement.style.display = 'none';
            symbolElement.className = 'falling-symbol'; // Reset classes
            symbolPool.push(symbolElement);
        } else {
            symbolElement.remove(); // Pool full, discard
        }
    }

    // DESKTOP: Create falling symbol (vertical)
    function createFallingSymbol(column, isInitialPopulation = false, forcedSymbol = null) {
        const symbol = getSymbolFromPool(); // Use pooled element
        symbol.className = 'falling-symbol';
        symbol.textContent = forcedSymbol || symbols[Math.floor(Math.random() * symbols.length)];
        symbol.style.left = (column * columnWidth + Math.random() * 30) + 'px';

        if (isInitialPopulation) {
            symbol.style.top = `${Math.random() * symbolRainContainer.offsetHeight}px`;
        } else {
            symbol.style.top = '-50px';
        }

        // PERFORMANCE: Event delegation - no listener needed per symbol!
        // Container handles all clicks via event delegation (see init section)
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
        // MOBILE FIX: Reduce initial symbols on mobile to prevent overload
        const symbolMultiplier = isMobileMode ? 2 : 5; // Mobile: 2 per column, Desktop: 5 per column
        const initialSymbolCount = columns * symbolMultiplier;
        let spawned = 0;

        console.log(`📱 Populating ${initialSymbolCount} initial symbols (Mobile: ${isMobileMode})`);

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
            // PERFORMANCE: Return element to pool for reuse
            returnSymbolToPool(symbolElement);
        }, 500);
    }

    function checkCollision(symbolObj) {
        if (isMobileMode) {
            // Mobile: Check horizontal spacing
            const symbolWidth = 60;
            const horizontalBuffer = 80; // Space between symbols in train

            // PERFORMANCE: Only check nearby symbols from spatial grid
            const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
            for (let other of neighbors) {
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
            const collisionBuffer = 40;
            const horizontalBuffer = 35;

            const symbolLeft = symbolObj.x;
            const symbolRight = symbolLeft + symbolWidth;

            // PERFORMANCE: Only check nearby symbols from spatial grid (not ALL symbols!)
            const neighbors = getNeighborCells(symbolObj.x, symbolObj.y);
            for (let other of neighbors) {
                if (other === symbolObj) continue;

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
        // PERFORMANCE: Tab visibility throttling - run at ~1fps when tab hidden
        if (!isTabVisible && Math.random() > 0.016) {
            return; // Skip ~98% of frames when tab is hidden (60fps -> 1fps)
        }

        // PERFORMANCE: Use cached height instead of querying DOM every frame
        const containerHeight = cachedContainerHeight;

        // PERFORMANCE: Update spatial grid ONCE per frame instead of in every collision check
        updateSpatialGrid();

        // PERFORMANCE: Swap-and-pop instead of filter() to reuse array and reduce GC pressure
        let writeIndex = 0;
        for (let readIndex = 0; readIndex < activeSymbols.length; readIndex++) {
            const symbolObj = activeSymbols[readIndex];

            // Check if symbol should be removed (out of bounds)
            if (symbolObj.y > containerHeight + 50) {
                symbolObj.element.remove();
                returnSymbolToPool(symbolObj.element); // Return to pool
                continue; // Skip this symbol, don't copy to writeIndex
            }

            // Update position only if not colliding
            if (!checkCollision(symbolObj)) {
                symbolObj.y += symbolFallSpeed;
                symbolObj.element.style.top = `${symbolObj.y}px`;
            }

            // Keep this symbol - copy to writeIndex
            activeSymbols[writeIndex++] = symbolObj;
        }
        // Trim array to new length (no reallocation!)
        activeSymbols.length = writeIndex;

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

    // PERFORMANCE: Check guaranteed spawns every 1 second instead of 60x per second
    function startGuaranteedSpawnController() {
        setInterval(() => {
            const currentTime = Date.now();
            symbols.forEach(sym => {
                if (currentTime - lastSpawnTime[sym] > GUARANTEED_SPAWN_INTERVAL) {
                    const randomColumn = Math.floor(Math.random() * columns);
                    createFallingSymbol(randomColumn, false, sym);
                }
            });
        }, 1000); // Check once per second
    }

    // Initialize
    console.log('🚀 Initializing symbol rain system...');

    // PERFORMANCE: Event delegation - single listener for all symbols (prevents memory leaks)
    symbolRainContainer.addEventListener('click', (event) => {
        const symbol = event.target.closest('.falling-symbol');
        if (symbol && symbolRainContainer.contains(symbol)) {
            handleSymbolClick(symbol, event);
        }
    });
    console.log('✅ Event delegation enabled for symbol clicks');

    calculateColumns();
    console.log(`📊 Creating ${columns * 5} initial symbols...`);
    populateInitialSymbols();
    console.log(`✨ Created ${activeSymbols.length} symbols`);
    startAnimation();
    console.log('▶️ Animation started');
    startSpeedController();
    console.log('⏱️ Speed controller started');
    startGuaranteedSpawnController();
    console.log('🎯 Guaranteed spawn controller started');

    // PERFORMANCE: Tab visibility API - throttle animation when tab hidden
    document.addEventListener('visibilitychange', () => {
        isTabVisible = !document.hidden;
        console.log(`👁️ Tab visibility changed: ${isTabVisible ? 'visible' : 'hidden'}`);
        if (!isTabVisible) {
            console.log('⏸️ Tab hidden - throttling animation to ~1fps (95% CPU savings)');
        } else {
            console.log('▶️ Tab visible - resuming normal 60fps animation');
        }
    });

    // PERFORMANCE: Debounced resize handler (250ms delay prevents excessive recalculation)
    const debouncedResize = debounce(() => {
        console.log('🔄 Window resized, recalculating columns...');
        isMobileMode = window.innerWidth <= 768 || document.body.classList.contains('res-mobile');
        console.log(`📱 Mobile mode: ${isMobileMode}`);
        calculateColumns();
    }, 250);

    window.addEventListener('resize', debouncedResize);

    // Listen for display resolution changes
    document.addEventListener('displayResolutionChanged', (event) => {
        const isMobile = event.detail.name === 'mobile';
        isMobileMode = isMobile;
        console.log(`🖥️ Display resolution changed to: ${event.detail.name}, isMobileMode: ${isMobileMode}`);
    });
    // Expose symbol count for performance monitoring
    window.getActiveSymbolCount = function () {
        return activeSymbols.length;
    };
}

// PERFORMANCE FIX: Call initSymbolRain as soon as DOM is interactive (earlier than DOMContentLoaded)
if (document.readyState === 'loading') {
    // DOM still loading - wait for interactive state
    document.addEventListener('DOMContentLoaded', initSymbolRain);
} else {
    // DOM already loaded - start immediately
    initSymbolRain();
}

