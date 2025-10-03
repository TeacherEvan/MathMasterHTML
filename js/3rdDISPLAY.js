// js/3rdDISPLAY.js - Symbol Rain Display for Math Game
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

    // Configuration
    let symbolFallSpeed = 0.6; // Increased by 20% from 0.5
    const maxFallSpeed = 6; // Increased by 20% from 5
    const spawnRate = 0.2; // Higher spawn rate for initial population
    const columnWidth = 50;

    let columns = 0;
    let activeSymbols = [];
    let animationRunning = false;

    function calculateColumns() {
        const containerWidth = symbolRainContainer.offsetWidth;
        const containerHeight = symbolRainContainer.offsetHeight;
        columns = Math.floor(containerWidth / columnWidth);
        console.log(`📏 Container dimensions: ${containerWidth}x${containerHeight}, Columns: ${columns}`);
    }

    function createFallingSymbol(column, isInitialPopulation = false) {
        const symbol = document.createElement('div');
        symbol.className = 'falling-symbol';
        symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];
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
            symbol: symbol.textContent
        });
    }

    function populateInitialSymbols() {
        const initialSymbolCount = columns * 5; // Populate with more symbols
        for (let i = 0; i < initialSymbolCount; i++) {
            createFallingSymbol(Math.floor(Math.random() * columns), true);
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
        const symbolHeight = 30; // Approximate height of a symbol
        const collisionBuffer = 10; // Additional spacing between symbols
        const symbolLeft = parseFloat(symbolObj.element.style.left);
        const symbolRight = symbolLeft + 30; // Approximate width of a symbol

        // Check collision with other symbols
        for (let other of activeSymbols) {
            if (other === symbolObj) continue;

            const otherLeft = parseFloat(other.element.style.left);
            const otherRight = otherLeft + 30;

            // Check if symbols are horizontally overlapping or close
            const horizontalOverlap = !(symbolRight < otherLeft || symbolLeft > otherRight);

            if (horizontalOverlap) {
                // Check if this symbol would collide with the other
                const distance = other.y - symbolObj.y;
                if (distance > 0 && distance < symbolHeight + collisionBuffer) {
                    return true; // Collision detected
                }
            }
        }
        return false;
    }

    function animateSymbols() {
        const containerHeight = symbolRainContainer.offsetHeight;

        activeSymbols = activeSymbols.filter(symbolObj => {
            // Check for collision before moving
            if (!checkCollision(symbolObj)) {
                symbolObj.y += symbolFallSpeed;
                symbolObj.element.style.top = `${symbolObj.y}px`;
            }
            // If collision detected, symbol stays at current position

            if (symbolObj.y > containerHeight + 50) {
                symbolObj.element.remove();
                return false;
            }
            return true;
        });

        for (let col = 0; col < columns; col++) {
            if (Math.random() < spawnRate) {
                if (!activeSymbols.some(s => s.column === col && s.y < 100)) {
                    createFallingSymbol(col);
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
            if (symbolFallSpeed < maxFallSpeed) {
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
        calculateColumns();
    });
});
