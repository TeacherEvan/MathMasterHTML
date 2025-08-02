// js/3rdDISPLAY.js - Symbol Rain Display for Math Game
console.log("Symbol Rain Display script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    const symbolRainContainer = document.getElementById('symbol-rain-container');
    
    if (!symbolRainContainer) {
        console.error('Symbol rain container not found!');
        return;
    }
    
    const symbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', 'x', '+', '-', '=', '÷', '×'];
    
    // Configuration
    let symbolFallSpeed = 0.5; // Start slow
    const maxFallSpeed = 5; // Set a maximum speed
    const spawnRate = 0.2; // Higher spawn rate for initial population
    const columnWidth = 50;
    
    let columns = 0;
    let activeSymbols = [];
    let animationRunning = false;

    function calculateColumns() {
        const containerWidth = symbolRainContainer.offsetWidth;
        columns = Math.floor(containerWidth / columnWidth);
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

    function animateSymbols() {
        const containerHeight = symbolRainContainer.offsetHeight;
        
        activeSymbols = activeSymbols.filter(symbolObj => {
            symbolObj.y += symbolFallSpeed;
            symbolObj.element.style.top = `${symbolObj.y}px`;
            
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
    calculateColumns();
    populateInitialSymbols();
    startAnimation();
    startSpeedController();
    
    window.addEventListener('resize', calculateColumns);
});
