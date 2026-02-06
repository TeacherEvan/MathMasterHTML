/**
 * tests/mocks/worm-mock.js - Worm object factory for testing (ES Module)
 */

/**
 * Creates a mock worm object with default values
 * @param {Object} overrides - Property overrides
 * @returns {Object} Mock worm object
 */
export function createWormMock(overrides = {}) {
  return {
    id: "worm-1",
    x: 100,
    y: 100,
    direction: 0,
    baseSpeed: 2,
    currentSpeed: 2,
    velocityX: 0,
    velocityY: 0,
    crawlPhase: 0,

    // State flags
    hasStolen: false,
    isPurple: false,
    fromConsole: false,
    isRushingToDevil: false,
    isRushingToTarget: false,
    shouldExitToConsole: false,
    exitingToConsole: false,
    pullingIn: false,

    // Target data
    devilX: undefined,
    devilY: undefined,
    targetSymbol: undefined,
    stolenSymbol: undefined,

    // Escape data
    escapeUntil: undefined,
    escapeVector: null,

    // Navigation data
    targetElement: null,
    consoleSlotElement: null,
    targetConsoleSlot: null,
    targetConsoleSlotIndex: -1,
    path: null,
    pathIndex: 0,
    lastPathUpdate: 0,
    forceRushUntil: undefined,
    aggressionLevel: 0,

    // Element reference (mock DOM element)
    element: createElementMock(),

    ...overrides,
  };
}

/**
 * Creates a mock DOM element with style properties
 * @returns {Object} Mock element
 */
export function createElementMock() {
  return {
    style: {
      left: "0px",
      top: "0px",
      transform: "",
      setProperty: () => {},
    },
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
    },
    querySelector: () => null,
    getBoundingClientRect: () => ({
      left: 100,
      top: 100,
      width: 50,
      height: 50,
      right: 150,
      bottom: 150,
    }),
  };
}

/**
 * Creates a mock console slot element
 * @param {number} index - Slot index
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @returns {Object} Mock console slot element
 */
export function createConsoleSlotMock(index, x = 100, y = 100) {
  return {
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
    },
    getBoundingClientRect: () => ({
      left: x - 25,
      top: y - 25,
      width: 50,
      height: 50,
      right: x + 25,
      bottom: y + 25,
    }),
  };
}

/**
 * Creates a mock symbol element
 * @param {string} symbol - Symbol value
 * @param {number} x - Center X position
 * @param {number} y - Center Y position
 * @returns {Object} Mock symbol element
 */
export function createSymbolMock(symbol, x = 200, y = 200) {
  return {
    dataset: { value: symbol },
    style: {},
    classList: {
      add: () => {},
      remove: () => {},
      contains: () => false,
    },
    getBoundingClientRect: () => ({
      left: x - 20,
      top: y - 20,
      width: 40,
      height: 40,
      right: x + 20,
      bottom: y + 20,
    }),
  };
}
