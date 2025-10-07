// js/utils.js - Common utility functions

/**
 * Debounces a function to limit the rate at which it gets called.
 * @param {Function} func The function to debounce.
 * @param {number} wait The number of milliseconds to delay.
 * @returns {Function} The debounced function.
 */
export function debounce(func, wait) {
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

/**
 * Checks if the current device is a mobile device based on screen width.
 * @returns {boolean} True if the device is considered mobile.
 */
export function isMobile() {
    return window.innerWidth <= 768;
}
