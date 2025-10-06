// js/3rdDISPLAY.js - Symbol Rain Display for Math Game (Desktop & Mobile)
console.log("Symbol Rain Display script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 DOMContentLoaded fired for 3rdDISPLAY.js');
    const symbolRainContainer = document.getElementById('symbol-rain-container');

    if (!symbolRainContainer) {
        console.error('❌ Symbol rain container not found!');
        return;
    }

    console.log('✅ Symbol rain container found:', symbolRainContainer);

    const symbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', 'x', '+', '-', '=', '÷', '×'];

    // Mode detection
    let isMobileMode = false;

    // Configuration - Desktop (Vertical Fall)
    let symbolFallSpeed = 0.6;
    const maxFallSpeed = 6;
    const spawnRate = 0.2;
    const columnWidth = 50;

    // Configuration - Mobile (Horizontal Train)
    let symbolTrainSpeed = 2.5; // Pixels per frame for horizontal movement
    const MOBILE_GUARANTEED_INTERVAL = 10000; // 10 seconds for all symbols to appear
    const DESKTOP_GUARANTEED_INTERVAL = 5000; // 5 seconds for desktop

    // Guaranteed spawn system
    let lastSpawnTime = {};
    symbols.forEach(sym => {
        lastSpawnTime[sym] = Date.now() - Math.random() * 2000;
    });

    let columns = 0;
    let activeSymbols = [];
    let animationRunning = false;
    let mobileSpawnTimer = null;

    function detectMobileMode() {
        isMobileMode = document.body.classList.contains('res-mobile');
        console.log(`📱 Display mode: ${isMobileMode ? 'MOBILE (Horizontal Train)' : 'DESKTOP (Vertical Fall)'}`);
        return isMobileMode;
    }

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

    // MOBILE: Create horizontal train symbol (right to left)
    function createTrainSymbol(forcedSymbol = null) {
        const symbol = document.createElement('div');
        symbol.className = 'falling-symbol';
        symbol.textContent = forcedSymbol || symbols[Math.floor(Math.random() * symbols.length)];

        const containerWidth = symbolRainContainer.offsetWidth;
        const containerHeight = symbolRainContainer.offsetHeight;

        // Start from right edge
        symbol.style.left = `${containerWidth + 50}px`;
        // Center vertically in the train row
        symbol.style.top = `${containerHeight / 2 - 20}px`;

        symbol.addEventListener('click', (event) => handleSymbolClick(symbol, event));
        symbolRainContainer.appendChild(symbol);

        activeSymbols.push({
            element: symbol,
            x: containerWidth + 50,
            y: containerHeight / 2 - 20,
            symbol: symbol.textContent
        });

        if (forcedSymbol) {
            lastSpawnTime[forcedSymbol] = Date.now();
        }
    }

    function populateInitialSymbols() {
        if (isMobileMode) {
            // Mobile: Start with a few symbols already in view
            const initialCount = 3;
            const containerWidth = symbolRainContainer.offsetWidth;
            for (let i = 0; i < initialCount; i++) {
                const symbol = document.createElement('div');
                symbol.className = 'falling-symbol';
                symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];
                symbol.style.left = `${containerWidth - (i * 100)}px`;
                symbol.style.top = `${symbolRainContainer.offsetHeight / 2 - 20}px`;
                symbol.addEventListener('click', (event) => handleSymbolClick(symbol, event));
                symbolRainContainer.appendChild(symbol);
                activeSymbols.push({
                    element: symbol,
                    x: containerWidth - (i * 100),
                    y: symbolRainContainer.offsetHeight / 2 - 20,
                    symbol: symbol.textContent
                });
            }
        } else {
            // Desktop: Populate columns with falling symbols
            const initialSymbolCount = columns * 5;
            for (let i = 0; i < initialSymbolCount; i++) {
                createFallingSymbol(Math.floor(Math.random() * columns), true);
            }
        }
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
            // Desktop: Check vertical collision
            const symbolHeight = 30;
            const symbolWidth = 30;
            const collisionBuffer = 25;
            const horizontalBuffer = 20;
            const symbolLeft = parseFloat(symbolObj.element.style.left);
            const symbolRight = symbolLeft + symbolWidth;

            for (let other of activeSymbols) {
                if (other === symbolObj) continue;

                const otherLeft = parseFloat(other.element.style.left);
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
        const currentTime = Date.now();

        if (isMobileMode) {
            // MOBILE: Horizontal train movement (right to left)
            const containerWidth = symbolRainContainer.offsetWidth;

            activeSymbols = activeSymbols.filter(symbolObj => {
                // Move left
                if (!checkCollision(symbolObj)) {
                    symbolObj.x -= symbolTrainSpeed;
                    symbolObj.element.style.left = `${symbolObj.x}px`;
                }

                // Remove if off-screen
                if (symbolObj.x < -100) {
                    symbolObj.element.remove();
                    return false;
                }
                return true;
            });

            // Guaranteed spawn system for mobile - all symbols in 10 seconds
            const guaranteedInterval = MOBILE_GUARANTEED_INTERVAL;
            symbols.forEach(sym => {
                if (currentTime - lastSpawnTime[sym] > guaranteedInterval) {
                    console.log(`⏰ Mobile: Forcing spawn of "${sym}" (not seen in 10s)`);
                    createTrainSymbol(sym);
                }
            });

            // Random spawning
            if (Math.random() < 0.05) { // 5% chance each frame
                const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                createTrainSymbol(randomSymbol);
            }

        } else {
            // DESKTOP: Vertical fall movement
            const containerHeight = symbolRainContainer.offsetHeight;

            activeSymbols = activeSymbols.filter(symbolObj => {
                if (!checkCollision(symbolObj)) {
                    symbolObj.y += symbolFallSpeed;
                    symbolObj.element.style.top = `${symbolObj.y}px`;
                }

                if (symbolObj.y > containerHeight + 50) {
                    symbolObj.element.remove();
                    return false;
                }
                return true;
            });

            // Guaranteed spawn for desktop - all symbols in 5 seconds
            symbols.forEach(sym => {
                if (currentTime - lastSpawnTime[sym] > DESKTOP_GUARANTEED_INTERVAL) {
                    const randomColumn = Math.floor(Math.random() * columns);
                    console.log(`⏰ Desktop: Forcing spawn of "${sym}" (not seen in 5s)`);
                    createFallingSymbol(randomColumn, false, sym);
                }
            });

            // Normal random spawning
            for (let col = 0; col < columns; col++) {
                if (Math.random() < spawnRate) {
                    if (!activeSymbols.some(s => s.column === col && s.y < 100)) {
                        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
                        createFallingSymbol(col, false, randomSymbol);
                    }
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

    function reinitialize() {
        console.log('🔄 Reinitializing symbol display for mode change...');

        // Clear all active symbols
        activeSymbols.forEach(symbolObj => {
            if (symbolObj.element.parentNode) {
                symbolObj.element.remove();
            }
        });
        activeSymbols = [];

        // Reset spawn times
        symbols.forEach(sym => {
            lastSpawnTime[sym] = Date.now() - Math.random() * 2000;
        });

        // Detect new mode
        detectMobileMode();

        // Repopulate
        if (!isMobileMode) {
            calculateColumns();
        }
        populateInitialSymbols();

        console.log(`✨ Reinitialized in ${isMobileMode ? 'MOBILE' : 'DESKTOP'} mode`);
    }

    // Listen for resolution changes
    document.addEventListener('displayResolutionChanged', (e) => {
        const wasMobile = isMobileMode;
        detectMobileMode();

        if (wasMobile !== isMobileMode) {
            console.log(`📱 Mode changed! Switching to ${isMobileMode ? 'MOBILE' : 'DESKTOP'} mode`);
            reinitialize();
        }
    });

    // Initialize
    console.log('🚀 Initializing symbol rain system...');
    detectMobileMode();

    if (!isMobileMode) {
        calculateColumns();
        console.log(`📊 Creating ${columns * 5} initial symbols...`);
    } else {
        console.log('📊 Creating initial mobile train symbols...');
    }

    populateInitialSymbols();
    console.log(`✨ Created ${activeSymbols.length} symbols`);
    startAnimation();
    console.log('▶️ Animation started');
    startSpeedController();
    console.log('⏱️ Speed controller started');

    window.addEventListener('resize', () => {
        if (!isMobileMode) {
            console.log('🔄 Window resized, recalculating columns...');
            calculateColumns();
        }
    });
});
