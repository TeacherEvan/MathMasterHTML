// utils-dom.js - DOM helper utilities

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
      element.className = className.join(" ");
    } else {
      element.className = className;
    }
  }

  Object.entries(styles).forEach(([key, value]) => {
    element.style[key] = value;
  });

  return element;
}

if (typeof window !== "undefined") {
  window.createDOMElement = createDOMElement;
}
