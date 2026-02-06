/**
 * tests/mocks/dom-mock.js - DOM element mocking utilities
 */

/**
 * Creates a mock DOM element with configurable properties
 * @param {Object} config - Element configuration
 * @returns {Object} Mock DOM element
 */
export function createMockDOMElement(config = {}) {
  const {
    left = 100,
    top = 100,
    width = 50,
    height = 50,
    transform = "",
  } = config;

  return {
    style: {
      left: `${left}px`,
      top: `${top}px`,
      transform: transform,
      setProperty: jest.fn(),
      getPropertyValue: jest.fn(() => ""),
    },
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
      toggle: jest.fn(),
      contains: jest.fn(() => false),
      replace: jest.fn(),
    },
    getBoundingClientRect: jest.fn(() => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
    })),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    dataset: {},
    attributes: {},
    parentNode: null,
    childNodes: [],
    nodeType: 1,
    nodeName: "DIV",
  };
}

/**
 * Creates a mock document body
 * @returns {Object} Mock document body
 */
export function createMockDocumentBody() {
  const body = createMockDOMElement({
    left: 0,
    top: 0,
    width: 1920,
    height: 1080,
  });

  body.classList = {
    ...body.classList,
    _classes: new Set(),
    add: jest.fn((cls) => {
      body.classList._classes.add(cls);
    }),
    remove: jest.fn((cls) => {
      body.classList._classes.delete(cls);
    }),
    contains: jest.fn((cls) => body.classList._classes.has(cls)),
    toggle: jest.fn((cls, force) => {
      if (force === true) body.classList._classes.add(cls);
      else if (force === false) body.classList._classes.delete(cls);
      else {
        if (body.classList._classes.has(cls))
          body.classList._classes.delete(cls);
        else body.classList._classes.add(cls);
      }
    }),
    value: "",
  };

  return body;
}

/**
 * Creates a mock CustomEvent
 * @param {string} type - Event type
 * @param {Object} detail - Event detail
 * @returns {Object} Mock CustomEvent
 */
export function createMockCustomEvent(type, detail = {}) {
  return {
    type,
    detail,
    bubbles: false,
    cancelable: false,
    composed: false,
    currentTarget: null,
    target: null,
    defaultPrevented: false,
    composedPath: jest.fn(() => []),
    preventDefault: jest.fn(),
    stopPropagation: jest.fn(),
  };
}

/**
 * Mock document object
 */
export const mockDocument = {
  body: createMockDocumentBody(),
  querySelector: jest.fn(() => null),
  querySelectorAll: jest.fn(() => []),
  getElementById: jest.fn(() => null),
  createElement: jest.fn((tagName) => createMockDOMElement({})),
  createEvent: jest.fn(() => ({
    initEvent: jest.fn(),
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
  styleSheets: [],
  readyState: "complete",

  // Custom event dispatch helper
  dispatchCustomEvent: jest.fn((type, detail) => {
    const event = createMockCustomEvent(type, detail);
    return mockDocument.dispatchEvent(event);
  }),
};

/**
 * Mock window object
 */
export const mockWindow = {
  innerWidth: 1920,
  innerHeight: 1080,
  pageXOffset: 0,
  pageYOffset: 0,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  requestAnimationFrame: jest.fn((cb) => setTimeout(cb, 16)),
  cancelAnimationFrame: jest.fn(),
  Date: Date,
  Math: Math,
  console: console,
};

export default {
  createMockDOMElement,
  createMockDocumentBody,
  createMockCustomEvent,
  mockDocument,
  mockWindow,
};
