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

/**
 * Debounce function to prevent excessive function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Delay in milliseconds
 * @returns {Function} Debounced function
 */
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

// Expose utility functions globally for use across modules
if (typeof window !== 'undefined') {
    window.normalizeSymbol = normalizeSymbol;
    window.calculateDistance = calculateDistance;
    window.createDOMElement = createDOMElement;
    window.generateUniqueId = generateUniqueId;
    window.debounce = debounce;
}

/**
 * Production-Ready Logging System
 * Allows conditional logging based on environment
 * Use ?debug=true in URL to enable verbose logging
 */
const Logger = {
    // Check if debug mode is enabled
    _isDebugMode: () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('debug') === 'true' || localStorage.getItem('mathmaster_debug') === 'true';
    },

    // Log levels
    LEVELS: {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    },

    // Current log level (can be changed)
    currentLevel: 1, // INFO by default

    /**
     * Debug level logging (most verbose)
     * @param {string} emoji - Emoji prefix for module identification
     * @param  {...any} args - Log arguments
     */
    debug(emoji, ...args) {
        if (this._isDebugMode() && this.currentLevel <= this.LEVELS.DEBUG) {
            console.log(emoji, ...args);
        }
    },

    /**
     * Info level logging (important events)
     * @param {string} emoji - Emoji prefix for module identification
     * @param  {...any} args - Log arguments
     */
    info(emoji, ...args) {
        if (this._isDebugMode() && this.currentLevel <= this.LEVELS.INFO) {
            console.log(emoji, ...args);
        }
    },

    /**
     * Warning level logging (always shown)
     * @param {string} emoji - Emoji prefix for module identification
     * @param  {...any} args - Log arguments
     */
    warn(emoji, ...args) {
        if (this.currentLevel <= this.LEVELS.WARN) {
            console.warn(emoji, ...args);
        }
    },

    /**
     * Error level logging (always shown)
     * @param {string} emoji - Emoji prefix for module identification
     * @param  {...any} args - Log arguments
     */
    error(emoji, ...args) {
        if (this.currentLevel <= this.LEVELS.ERROR) {
            console.error(emoji, ...args);
        }
    },

    /**
     * Group logging (collapsible console groups)
     * @param {string} label - Group label
     * @param {Function} fn - Function to execute within group
     */
    group(label, fn) {
        if (this._isDebugMode()) {
            console.group(label);
            fn();
            console.groupEnd();
        }
    },

    /**
     * Enable debug mode programmatically
     */
    enableDebug() {
        localStorage.setItem('mathmaster_debug', 'true');
        console.log('🔧 Debug mode enabled. Refresh page to see verbose logs.');
    },

    /**
     * Disable debug mode programmatically
     */
    disableDebug() {
        localStorage.removeItem('mathmaster_debug');
        console.log('🔇 Debug mode disabled. Verbose logs will be hidden.');
    }
};

// Make Logger available globally
if (typeof window !== 'undefined') {
    window.Logger = Logger;
}

/**
 * Resource Cleanup Manager
 * Helps prevent memory leaks by tracking and cleaning up timers and event listeners
 */
const ResourceManager = {
    // Track active timers
    _timers: new Set(),

    // Track active intervals
    _intervals: new Set(),

    /**
     * Create a tracked timeout that will be automatically cleaned up
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timer ID
     */
    setTimeout(callback, delay) {
        const timerId = setTimeout(() => {
            this._timers.delete(timerId);
            callback();
        }, delay);
        this._timers.add(timerId);
        return timerId;
    },

    /**
     * Create a tracked interval that will be automatically cleaned up
     * @param {Function} callback - Function to execute
     * @param {number} delay - Delay in milliseconds
     * @returns {number} Timer ID
     */
    setInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this._intervals.add(intervalId);
        return intervalId;
    },

    /**
     * Clear a tracked timeout
     * @param {number} timerId - Timer ID to clear
     */
    clearTimeout(timerId) {
        clearTimeout(timerId);
        this._timers.delete(timerId);
    },

    /**
     * Clear a tracked interval
     * @param {number} intervalId - Interval ID to clear
     */
    clearInterval(intervalId) {
        clearInterval(intervalId);
        this._intervals.delete(intervalId);
    },

    /**
     * Clean up all tracked timers and intervals
     * Call this when navigating away or resetting the game
     */
    cleanupAll() {
        // Clear all timeouts
        this._timers.forEach(timerId => {
            clearTimeout(timerId);
        });
        this._timers.clear();

        // Clear all intervals
        this._intervals.forEach(intervalId => {
            clearInterval(intervalId);
        });
        this._intervals.clear();

        console.log('🧹 ResourceManager: All timers and intervals cleaned up');
    },

    /**
     * Get current resource usage stats
     * @returns {Object} Stats object
     */
    getStats() {
        return {
            activeTimeouts: this._timers.size,
            activeIntervals: this._intervals.size,
            totalActive: this._timers.size + this._intervals.size
        };
    }
};

// Make ResourceManager available globally
if (typeof window !== 'undefined') {
    window.ResourceManager = ResourceManager;

    // Clean up resources when page is about to unload
    window.addEventListener('beforeunload', () => {
        ResourceManager.cleanupAll();
    });
}
