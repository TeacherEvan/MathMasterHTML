// js/3rdDISPLAY.js - Symbol Rain Display for Math Game
console.log("Symbol Rain Display script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    const symbolRainContainer = document.getElementById('symbol-rain-container');
    const refreshCountdown = document.querySelector('.matrix-refresh');
    
    if (!symbolRainContainer) {
        console.error('Symbol rain container not found!');
        return;
    }
    
    // Math symbols for the rain
    const symbols = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X', '+', '-', '=', '÷', '×'];
    
    // Configuration
    const SYMBOL_FALL_SPEED = 2.7; // Reduced by 10% from 3
    const SPAWN_RATE = 0.12; // Increased for more symbols
    const COLUMN_WIDTH = 50; // Reduced for more columns
    
    let columns = 0;
    let activeSymbols = [];
    let refreshTimer = 10;
    let animationRunning = false;
    
    // Calculate number of columns based on container width
    function calculateColumns() {
        const containerWidth = symbolRainContainer.offsetWidth;
        columns = Math.floor(containerWidth / COLUMN_WIDTH);
        console.log(`Calculated ${columns} columns for symbol rain`);
    }
    
    // Create a new falling symbol
    function createFallingSymbol(column) {
        const symbol = document.createElement('div');
        symbol.className = 'falling-symbol';
        symbol.textContent = symbols[Math.floor(Math.random() * symbols.length)];
        symbol.style.left = (column * COLUMN_WIDTH + Math.random() * 30) + 'px';
        symbol.style.top = '-50px';
        symbol.style.zIndex = '25';
        symbol.style.pointerEvents = 'auto';
        
        console.log(`🌟 Created symbol "${symbol.textContent}" at column ${column}`);
        
        symbol.addEventListener('click', function() {
            handleSymbolClick(this);
        });
        
        symbolRainContainer.appendChild(symbol);
        
        activeSymbols.push({
            element: symbol,
            column: column,
            y: -50,
            symbol: symbol.textContent
        });
    }
    
    // Handle symbol click
    function handleSymbolClick(symbolElement) {
        const clickedSymbol = symbolElement.textContent;
        console.log(`🎯 Player clicked symbol: "${clickedSymbol}"`);
        
        symbolElement.classList.add('clicked');
        
        setTimeout(() => {
            if (symbolElement.parentNode) {
                symbolElement.parentNode.removeChild(symbolElement);
            }
            activeSymbols = activeSymbols.filter(s => s.element !== symbolElement);
        }, 500);
        
        // Notify game logic
        document.dispatchEvent(new CustomEvent('symbolClicked', {
            detail: { symbol: clickedSymbol }
        }));
    }
    
    // Animation loop
    function animateSymbols() {
        const containerHeight = symbolRainContainer.offsetHeight;
        
        // Update existing symbols
        activeSymbols = activeSymbols.filter(symbolObj => {
            symbolObj.y += SYMBOL_FALL_SPEED;
            symbolObj.element.style.top = symbolObj.y + 'px';
            
            if (symbolObj.y > containerHeight + 50) {
                if (symbolObj.element.parentNode) {
                    symbolObj.element.parentNode.removeChild(symbolObj.element);
                }
                return false;
            }
            return true;
        });
        
        // Spawn new symbols
        for (let col = 0; col < columns; col++) {
            if (Math.random() < SPAWN_RATE) {
                const hasRecentSymbol = activeSymbols.some(s => 
                    s.column === col && s.y < 100
                );
                
                if (!hasRecentSymbol) {
                    createFallingSymbol(col);
                }
            }
        }
    }
    
    // Start animation
    function startRainLoop() {
        if (animationRunning) return;
        animationRunning = true;
        
        function loop() {
            if (animationRunning) {
                animateSymbols();
                requestAnimationFrame(loop);
            }
        }
        loop();
        console.log('🌧️ Symbol rain started');
    }
    
    // Start refresh timer
    function startRefreshTimer() {
        setInterval(() => {
            refreshTimer--;
            if (refreshCountdown) {
                refreshCountdown.textContent = `Refresh: ${Math.max(0, refreshTimer)}s`;
            }
            
            if (refreshTimer <= 0) {
                fullRefresh();
            }
        }, 1000);
    }
    
    // Full refresh
    function fullRefresh() {
        console.log('🔄 Full refresh');
        activeSymbols.forEach(s => {
            if (s.element.parentNode) {
                s.element.parentNode.removeChild(s.element);
            }
        });
        activeSymbols = [];
        refreshTimer = 10;
        calculateColumns();
    }
    
    // Initialize
    calculateColumns();
    startRainLoop();
    startRefreshTimer();
    
    // Handle resize
    window.addEventListener('resize', calculateColumns);
    
    // Export
    window.symbolRain = {
        refresh: fullRefresh,
        getActiveSymbols: () => activeSymbols.map(s => s.symbol)
    };
});
