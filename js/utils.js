// js/utils.js - Shared utility functions across the Math Master game

/**
 * Normalize symbol for comparison (X/x treated as same)
 * @param {string} symbol - The symbol to normalize
 * @returns {string} Normalized symbol
 */
function normalizeSymbol(symbol) {
    if (typeof symbol !== 'string') return symbol;
    return symbol.toLowerCase() === 'x' ? 'X' : symbol;
}

/**
 * Calculate Euclidean distance between two points
 * @param {number} x1 - X coordinate of first point
 * @param {number} y1 - Y coordinate of first point
 * @param {number} x2 - X coordinate of second point
 * @param {number} y2 - Y coordinate of second point
 * @returns {number} Distance between points
 */
function calculateDistance(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create a DOM element with specified properties
 * @param {string} tag - HTML tag name
 * @param {string|string[]} className - CSS class name(s)
 * @param {Object} styles - CSS styles to apply
 * @returns {HTMLElement} Created element
 */
function createDOMElement(tag, className, styles = {}) {
    const element = document.createElement(tag);
    
    if (className) {
        if (Array.isArray(className)) {
            element.className = className.join(' ');
        } else {
            element.className = className;
        }
    }
    
    Object.entries(styles).forEach(([key, value]) => {
        element.style[key] = value;
    });
    
    return element;
}

/**
 * Generate unique ID with prefix
 * @param {string} prefix - Prefix for the ID
 * @returns {string} Unique ID
 */
function generateUniqueId(prefix = 'item') {
    return `${prefix}-${Date.now()}-${Math.random()}`;
}
