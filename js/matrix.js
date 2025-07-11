// js/matrix.js
console.log("Matrix script loaded.");

const canvas = document.getElementById('matrix-canvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions to match the display container
canvas.width = canvas.offsetWidth;
canvas.height = canvas.offsetHeight;

const symbols = '0123456789X+-=÷×()';
const fontSize = 20;
const columns = canvas.width / fontSize;

const drops = [];
for (let x = 0; x < columns; x++) {
    drops[x] = 1;
}

// Array to hold the current symbol displayed in each column
const columnSymbols = new Array(columns);

function draw() {
    // Semi-transparent background to create the fading trail effect
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#0f0'; // Green text
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i++) {
        const text = symbols[Math.floor(Math.random() * symbols.length)];
        // Store the symbol currently drawn for this column
        columnSymbols[i] = text;
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        // Reset drop to the top randomly after it has crossed the screen
        // Add a random element to make the rain effect less uniform
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
            drops[i] = 0;
        }

        // Increment y-coordinate
        drops[i]++;
    }
}

setInterval(draw, 33); // ~30 FPS

// Add a click event listener to the canvas
canvas.addEventListener('click', (event) => {
    // Calculate the column that was clicked based on the mouse X position
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const column = Math.floor(x / fontSize);

    // Get the current symbol for the clicked column
    const currentSymbol = columnSymbols[column];

    // Dispatch a custom event with the current symbol
    const symbolEvent = new CustomEvent('symbolClick', { detail: { symbol: currentSymbol } });
    canvas.dispatchEvent(symbolEvent);
});

// Example: Listen for the custom event and log the symbol
canvas.addEventListener('symbolClick', (event) => {
    console.log('Symbol clicked:', event.detail.symbol);
});

// Handle clicks on the canvas to detect clicks on the "live" symbol
canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const col = Math.floor(x / fontSize);
    const row = Math.floor(y / fontSize);

    // If the click matches the last drop position (live symbol) for that column
    if (row === drops[col] - 1) {
        const clickedSymbol = columnSymbols[col];
        console.log(`Clicked symbol: ${clickedSymbol} at column ${col}`);

        // Dispatch custom event with the clicked symbol
        const symbolClickEvent = new CustomEvent('symbolClicked', {
            detail: { symbol: clickedSymbol },
            bubbles: true,
            composed: true
        });
        canvas.dispatchEvent(symbolClickEvent);
    }
});
