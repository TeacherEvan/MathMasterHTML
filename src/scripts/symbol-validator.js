// js/symbol-validator.js - Symbol Validation and Verification Module
console.log("✔️ Symbol Validator Module Loading...");

/**
 * SymbolValidator - Handles symbol validation and matching logic
 * Extracted from game.js to improve maintainability
 */
class SymbolValidator {
    constructor() {
        // Symbols that should be treated as equivalent
        this.EQUIVALENT_SYMBOLS = {
            'x': 'X',
            'X': 'X'
        };
        
        // Symbols that should be ignored in validation
        this.IGNORED_SYMBOLS = [' '];
        
        console.log('✔️ SymbolValidator initialized');
    }

    /**
     * Normalize symbol for comparison (handles x/X equivalence)
     * @param {string} symbol - Symbol to normalize
     * @returns {string} Normalized symbol
     */
    normalizeSymbol(symbol) {
        if (typeof symbol !== 'string') {
            return symbol;
        }
        
        return this.EQUIVALENT_SYMBOLS[symbol] || symbol;
    }

    /**
     * Check if symbol should be ignored
     * @param {string} symbol - Symbol to check
     * @returns {boolean} True if should be ignored
     */
    shouldIgnoreSymbol(symbol) {
        return this.IGNORED_SYMBOLS.includes(symbol);
    }

    /**
     * Check if clicked symbol matches the current expected symbol
     * @param {string} clickedSymbol - Symbol that was clicked
     * @param {string} expectedSymbol - Symbol expected at current position
     * @returns {boolean} True if matches
     */
    isSymbolMatch(clickedSymbol, expectedSymbol) {
        if (this.shouldIgnoreSymbol(expectedSymbol)) {
            return false;
        }

        const normalizedClicked = this.normalizeSymbol(clickedSymbol);
        const normalizedExpected = this.normalizeSymbol(expectedSymbol);

        return normalizedClicked === normalizedExpected;
    }

    /**
     * Check if symbol is in current step/line
     * @param {string} symbol - Symbol to check
     * @param {string} stepText - Full text of current step
     * @returns {boolean} True if symbol is in step
     */
    isSymbolInStep(symbol, stepText) {
        if (!stepText || typeof stepText !== 'string') {
            return false;
        }

        const normalizedSymbol = this.normalizeSymbol(symbol);
        
        // Check each character in the step
        for (const char of stepText) {
            if (this.normalizeSymbol(char) === normalizedSymbol) {
                return true;
            }
        }

        return false;
    }

    /**
     * Find all positions of a symbol in a step
     * @param {string} symbol - Symbol to find
     * @param {string} stepText - Full text of current step
     * @returns {Array<number>} Array of indices where symbol appears
     */
    findSymbolPositions(symbol, stepText) {
        const positions = [];
        const normalizedSymbol = this.normalizeSymbol(symbol);

        for (let i = 0; i < stepText.length; i++) {
            if (this.normalizeSymbol(stepText[i]) === normalizedSymbol) {
                positions.push(i);
            }
        }

        return positions;
    }

    /**
     * Check if all symbols in a step have been revealed
     * @param {Array<HTMLElement>} symbolElements - Array of symbol elements
     * @returns {boolean} True if all revealed
     */
    areAllSymbolsRevealed(symbolElements) {
        if (!symbolElements || symbolElements.length === 0) {
            return false;
        }

        for (const element of symbolElements) {
            // Skip space symbols
            if (element.textContent.trim() === '' || 
                element.classList.contains('space-symbol')) {
                continue;
            }

            // Check if symbol is not revealed
            if (element.classList.contains('hidden-symbol')) {
                return false;
            }
        }

        return true;
    }

    /**
     * Count remaining hidden symbols in a step
     * @param {Array<HTMLElement>} symbolElements - Array of symbol elements
     * @returns {number} Count of hidden symbols
     */
    countHiddenSymbols(symbolElements) {
        if (!symbolElements || symbolElements.length === 0) {
            return 0;
        }

        let count = 0;

        for (const element of symbolElements) {
            // Skip space symbols
            if (element.textContent.trim() === '' || 
                element.classList.contains('space-symbol')) {
                continue;
            }

            // Count hidden symbols
            if (element.classList.contains('hidden-symbol')) {
                count++;
            }
        }

        return count;
    }

    /**
     * Get next unrevealed symbol in step
     * @param {Array<HTMLElement>} symbolElements - Array of symbol elements
     * @returns {Object|null} {element, index, symbol} or null
     */
    getNextUnrevealedSymbol(symbolElements) {
        if (!symbolElements || symbolElements.length === 0) {
            return null;
        }

        for (let i = 0; i < symbolElements.length; i++) {
            const element = symbolElements[i];
            
            // Skip space symbols
            if (element.textContent.trim() === '' || 
                element.classList.contains('space-symbol')) {
                continue;
            }

            // Find first hidden symbol
            if (element.classList.contains('hidden-symbol')) {
                return {
                    element: element,
                    index: i,
                    symbol: element.textContent
                };
            }
        }

        return null;
    }

    /**
     * Validate symbol element has correct classes
     * @param {HTMLElement} element - Symbol element to validate
     * @returns {boolean} True if valid
     */
    isValidSymbolElement(element) {
        if (!element) {
            return false;
        }

        // Must have at least one of these classes
        const validClasses = ['solution-symbol', 'hidden-symbol', 'revealed-symbol', 'space-symbol'];
        
        for (const className of validClasses) {
            if (element.classList.contains(className)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Extract symbols from step text
     * @param {string} stepText - Step text to parse
     * @returns {Array<string>} Array of individual symbols
     */
    extractSymbols(stepText) {
        if (!stepText || typeof stepText !== 'string') {
            return [];
        }

        return stepText.split('');
    }

    /**
     * Check if symbol is an operator
     * @param {string} symbol - Symbol to check
     * @returns {boolean} True if operator
     */
    isOperator(symbol) {
        const operators = ['+', '-', '×', '÷', '='];
        return operators.includes(symbol);
    }

    /**
     * Check if symbol is a number
     * @param {string} symbol - Symbol to check
     * @returns {boolean} True if number
     */
    isNumber(symbol) {
        return /^\d$/.test(symbol);
    }

    /**
     * Check if symbol is a variable
     * @param {string} symbol - Symbol to check
     * @returns {boolean} True if variable
     */
    isVariable(symbol) {
        const normalizedSymbol = this.normalizeSymbol(symbol);
        return /^[a-zA-Z]$/.test(normalizedSymbol);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SymbolValidator;
} else {
    window.SymbolValidator = SymbolValidator;
}

console.log('✅ Symbol Validator Module Loaded');
