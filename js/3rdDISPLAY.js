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
    const INITIAL_FALL_SPEED = 0.6; // Store initial speed for reset
    const maxFallSpeed = 1.2; // 100% more than default (2x)
    const spawnRate = 0.3; // REDUCED from 0.4 to 0.3 to prevent overcrowding
    const burstSpawnRate = 0.10; // REDUCED from 15% to 10% chance for burst spawning
    const columnWidth = 50;

    // Wave-based spawn system for initial population
    const SYMBOLS_PER_WAVE = 5; // Release 5 symbols at a time
    const WAVE_INTERVAL = 110; // Milliseconds between waves
    let isInitialPopulation = true; // Flag to disable random spawning during startup
    let wavesSpawned = 0;

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
        // FIX: Center the random offset around column position to prevent right-side bias
        const horizontalOffset = (Math.random() - 0.5) * 40; // -20px to +20px
        symbol.style.left = (column * columnWidth + columnWidth / 2 + horizontalOffset) + 'px';

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
        // Wave-based spawn: Release 5 symbols at a time, evenly spread out
        const totalWaves = isMobileMode ? 4 : 8; // Mobile: 4 waves (20 symbols), Desktop: 8 waves (40 symbols)
        
        console.log(`📱 Starting wave-based spawn: ${totalWaves} waves of ${SYMBOLS_PER_WAVE} symbols (Mobile: ${isMobileMode})`);

        function spawnWave(waveNumber) {
            if (waveNumber >= totalWaves) {
                isInitialPopulation = false; // Enable random spawning
                console.log(`✅ Initial population complete. ${wavesSpawned} waves spawned. Random spawning enabled.`);
                return;
            }

            // Evenly distribute symbols across columns
            const columnsToUse = Math.min(columns, SYMBOLS_PER_WAVE); // Don't exceed available columns
            const columnStep = Math.floor(columns / columnsToUse);
            
            for (let i = 0; i < SYMBOLS_PER_WAVE && i < columns; i++) {
                const column = (i * columnStep) % columns; // Evenly distribute
                createFallingSymbol(column, true);
            }

            wavesSpawned++;
            console.log(`🌊 Wave ${waveNumber + 1}/${totalWaves} spawned (${SYMBOLS_PER_WAVE} symbols)`);

            // Schedule next wave
            setTimeout(() => spawnWave(waveNumber + 1), WAVE_INTERVAL);
        }

        // Start the wave spawn sequence
        spawnWave(0);
    }

    function handleSymbolClick(symbolElement, event) {
        // Quick validation check
        if (!document.getElementById('panel-c').contains(event.target)) {
            return;
        }

        // Prevent multiple clicks on same symbol
        if (symbolElement.classList.contains('clicked')) {
            return;
        }

        const clickedSymbol = symbolElement.textContent;

        // INSTANT FEEDBACK: Apply clicked class immediately
        symbolElement.classList.add('clicked');

        // Dispatch event immediately (no delay)
        document.dispatchEvent(new CustomEvent('symbolClicked', { detail: { symbol: clickedSymbol } }));

        // Remove from DOM and clean up after animation
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

            // Check if symbol should be removed (out of bounds or stuck at bottom)
            // Remove symbols more aggressively if they're near bottom and moving slowly
            const isOffScreen = symbolObj.y > containerHeight + 50;
            const isStuckAtBottom = symbolObj.y > containerHeight - 100 && activeSymbols.length > 30; // Remove stuck symbols when screen is crowded

            if (isOffScreen || isStuckAtBottom) {
                symbolObj.element.remove();
                returnSymbolToPool(symbolObj.element); // Return to pool
                continue; // Skip this symbol, don't copy to writeIndex
            }

            // Update position - symbols move slower when near others instead of stopping completely
            if (!checkCollision(symbolObj)) {
                // No collision - move at full speed
                symbolObj.y += symbolFallSpeed;
                symbolObj.element.style.top = `${symbolObj.y}px`;
            } else {
                // Collision detected - move at reduced speed to prevent pile-up
                symbolObj.y += symbolFallSpeed * 0.5; // INCREASED from 30% to 50% speed to reduce accumulation
                symbolObj.element.style.top = `${symbolObj.y}px`;
            }

            // Keep this symbol - copy to writeIndex
            activeSymbols[writeIndex++] = symbolObj;
        }
        // Trim array to new length (no reallocation!)
        activeSymbols.length = writeIndex;

        // PERFORMANCE: Helper to check if column is crowded (extract to avoid duplication)
        function isColumnCrowded(col) {
            for (let i = 0; i < activeSymbols.length; i++) {
                if (activeSymbols[i].column === col && activeSymbols[i].y < 40) {
                    return true;
                }
            }
            return false;
        }

        // Skip random spawning during initial population phase
        if (isInitialPopulation) {
            return; // Let wave-based spawn handle initial population
        }

        // Normal random spawning - optimized to reduce array iterations
        for (let col = 0; col < columns; col++) {
            if (Math.random() < spawnRate && !isColumnCrowded(col)) {
                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                createFallingSymbol(col, false, randomSymbol);
            }
        }

        // BURST SPAWNING: Occasionally spawn 2-3 symbols simultaneously in different columns
        if (Math.random() < burstSpawnRate) {
            const burstCount = 2 + Math.floor(Math.random() * 2); // 2-3 symbols
            
            // Find columns that aren't crowded - reuse helper function
            const availableColumns = [];
            for (let col = 0; col < columns; col++) {
                if (!isColumnCrowded(col)) {
                    availableColumns.push(col);
                }
            }

            // Spawn burst symbols in random available columns
            for (let i = 0; i < burstCount && availableColumns.length > 0; i++) {
                const randomIndex = Math.floor(Math.random() * availableColumns.length);
                const col = availableColumns.splice(randomIndex, 1)[0]; // Remove selected column
                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                createFallingSymbol(col, false, randomSymbol);
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
                symbolFallSpeed *= 1.10; // Increase by 10% every minute
                console.log(`⏱️ Speed increased to: ${symbolFallSpeed.toFixed(2)} (max: ${maxFallSpeed})`);
            }
        }, 60000); // Every 60 seconds (1 minute)
    }

    // Reset speed when problem completes
    function resetSpeed() {
        symbolFallSpeed = INITIAL_FALL_SPEED;
        console.log(`🔄 Symbol fall speed reset to: ${INITIAL_FALL_SPEED}`);
    }

    // Listen for problem completion to reset speed
    document.addEventListener('problemCompleted', () => {
        console.log('🎯 Problem completed - resetting symbol rain speed');
        resetSpeed();
    });

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

    // PERFORMANCE + TOUCH FIX: Use pointerdown for instant response (no 300ms delay)
    // Pointer Events API unifies mouse, touch, and pen input
    let isPointerDown = false;
    let lastClickedSymbol = null;

    symbolRainContainer.addEventListener('pointerdown', (event) => {
        // Prevent accidental double-handling
        if (isPointerDown) return;
        isPointerDown = true;

        const symbol = event.target.closest('.falling-symbol');
        if (symbol && symbolRainContainer.contains(symbol)) {
            // Prevent default to avoid click delay and text selection
            event.preventDefault();
            lastClickedSymbol = symbol;
            handleSymbolClick(symbol, event);
        }
    }, { passive: false }); // Non-passive to allow preventDefault

    symbolRainContainer.addEventListener('pointerup', () => {
        isPointerDown = false;
        lastClickedSymbol = null;
    });

    // Prevent pointer cancel from breaking the interaction
    symbolRainContainer.addEventListener('pointercancel', () => {
        isPointerDown = false;
        lastClickedSymbol = null;
    });

    // Fallback for older browsers that don't support Pointer Events
    if (!window.PointerEvent) {
        console.warn('⚠️ Pointer Events not supported, falling back to click events');
        symbolRainContainer.addEventListener('click', (event) => {
            const symbol = event.target.closest('.falling-symbol');
            if (symbol && symbolRainContainer.contains(symbol)) {
                handleSymbolClick(symbol, event);
            }
        });
    }

    console.log('✅ Pointer events enabled for instant touch/click response');

    calculateColumns();
    console.log(`📊 Starting wave-based initial spawn...`);
    populateInitialSymbols();
    console.log(`✨ Wave-based spawn initiated`);
    startAnimation();
    console.log('▶️ Animation started');
    startSpeedController();
    console.log('⏱️ Speed controller started (10% increase every 60 seconds)');
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

