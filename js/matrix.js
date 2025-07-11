// js/matrix.js
console.log("Matrix script loaded.");

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('matrix-canvas');
    const ctx = canvas.getContext('2d');

    // Function to set canvas dimensions
    function setCanvasDimensions() {
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        console.log(`Canvas dimensions set to: ${canvas.width}x${canvas.height}`);
    }

    // Set initial dimensions
    setCanvasDimensions();

    const symbols = '0123456789X+-=÷×';
    const fontSize = 32; // Increased from 20 to make symbols larger
    let columns = Math.floor(canvas.width / fontSize);

    // Initialize drops
    let drops = [];
    function initDrops() {
        drops = [];
        columns = Math.floor(canvas.width / fontSize);
        for (let x = 0; x < columns; x++) {
            drops[x] = 1;
        }
        console.log(`Initialized ${columns} columns for matrix rain`);
    }

    // Array to hold the current symbol and position for each column
    let columnSymbols = new Array(columns);
    let columnPositions = new Array(columns);

    // Initialize drops and columnSymbols
    initDrops();

    function draw() {
        // Semi-transparent background to create the fading trail effect
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)'; // Slightly more opaque for better trails
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#0f0'; // Green text
        ctx.font = `bold ${fontSize}px 'Courier New', monospace`; // Made bold and specified font
        ctx.textAlign = 'center'; // Center the text in each column

        for (let i = 0; i < drops.length; i++) {
            const text = symbols[Math.floor(Math.random() * symbols.length)];
            // Store the symbol currently drawn for this column
            columnSymbols[i] = text;
            columnPositions[i] = drops[i] * fontSize;
            
            // Draw the symbol centered in its column
            ctx.fillText(text, i * fontSize + fontSize/2, drops[i] * fontSize);

            // Reset drop to the top randomly after it has crossed the screen
            // Slower reset rate for slower falling
            if (drops[i] * fontSize > canvas.height && Math.random() > 0.985) {
                drops[i] = 0;
            }

            // Increment y-coordinate (slower movement)
            drops[i] += 0.5; // Reduced from 1 to 0.5 for slower falling
        }
    }

    // Start the animation with slower frame rate
    const animationInterval = setInterval(draw, 60); // Changed from 33ms to 60ms for slower animation

    // Handle window resize
    window.addEventListener('resize', () => {
        console.log('Window resized, updating canvas');
        setCanvasDimensions();
        initDrops();
    });

    // Add a click event listener to the canvas with improved click detection
    canvas.addEventListener('click', (event) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const col = Math.floor(x / fontSize);
        
        // More generous click detection - check if click is near any symbol in the column
        let clickedSymbol = null;
        const tolerance = fontSize; // Allow clicks within fontSize pixels of a symbol
        
        for (let i = 0; i < drops.length; i++) {
            if (i === col) {
                const symbolY = drops[i] * fontSize;
                // Check if click is within tolerance of this symbol
                if (Math.abs(y - symbolY) <= tolerance && symbolY > 0 && symbolY < canvas.height) {
                    clickedSymbol = columnSymbols[i];
                    console.log(`Clicked symbol: ${clickedSymbol} at column ${col}, position ${symbolY}`);
                    
                    // Add visual feedback for successful click
                    ctx.save();
                    ctx.fillStyle = '#ffff00'; // Yellow highlight
                    ctx.font = `bold ${fontSize + 8}px 'Courier New', monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText(clickedSymbol, i * fontSize + fontSize/2, symbolY);
                    ctx.restore();
                    
                    // Dispatch custom event with the clicked symbol
                    const symbolClickEvent = new CustomEvent('symbolClicked', {
                        detail: { symbol: clickedSymbol, column: col, position: symbolY },
                        bubbles: true,
                        composed: true
                    });
                    canvas.dispatchEvent(symbolClickEvent);
                    break;
                }
            }
        }
        
        if (!clickedSymbol) {
            console.log(`No symbol clicked at position (${x}, ${y})`);
        }
    });
});
