/**
 * tests/utils/test-data-generators.js - Test data generation utilities
 */

/**
 * Generates random number within range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
export function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * Generates random integer within range
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
export function randomIntInRange(min, max) {
  return Math.floor(randomInRange(min, max + 1));
}

/**
 * Generates random point within bounds
 * @param {Object} bounds - {x, y, width, height}
 * @returns {Object} {x, y} random point
 */
export function randomPointInBounds(bounds) {
  return {
    x: randomInRange(bounds.x, bounds.x + bounds.width),
    y: randomInRange(bounds.y, bounds.y + bounds.height),
  };
}

/**
 * Generates random velocity vector
 * @param {number} maxSpeed - Maximum speed
 * @returns {Object} {vx, vy} velocity components
 */
export function randomVelocity(maxSpeed = 5) {
  const speed = randomInRange(0.1, maxSpeed);
  const angle = randomInRange(0, Math.PI * 2);
  return {
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  };
}

/**
 * Generates test cases for boundary testing
 * @param {number} width - Viewport width
 * @param {number} height - Viewport height
 * @param {number} margin - Border margin
 * @returns {Array} Array of boundary test cases
 */
export function generateBoundaryTestCases(
  width = 1920,
  height = 1080,
  margin = 20,
) {
  return [
    { name: "left_edge", x: margin - 1, y: height / 2 },
    { name: "left_valid", x: margin, y: height / 2 },
    { name: "right_valid", x: width - margin, y: height / 2 },
    { name: "right_edge", x: width - margin + 1, y: height / 2 },
    { name: "top_edge", x: width / 2, y: margin - 1 },
    { name: "top_valid", x: width / 2, y: margin },
    { name: "bottom_valid", x: width / 2, y: height - margin },
    { name: "bottom_edge", x: width / 2, y: height - margin + 1 },
    { name: "top_left_corner", x: margin - 1, y: margin - 1 },
    { name: "center", x: width / 2, y: height / 2 },
  ];
}

/**
 * Generates test cases for velocity calculation
 * @returns {Array} Array of velocity test cases
 */
export function generateVelocityTestCases() {
  return [
    {
      name: "horizontal_right",
      start: { x: 0, y: 0 },
      target: { x: 10, y: 0 },
      expected: { vx: 1, vy: 0, distance: 10 },
    },
    {
      name: "horizontal_left",
      start: { x: 10, y: 0 },
      target: { x: 0, y: 0 },
      expected: { vx: -1, vy: 0, distance: 10 },
    },
    {
      name: "vertical_up",
      start: { x: 0, y: 10 },
      target: { x: 0, y: 0 },
      expected: { vx: 0, vy: -1, distance: 10 },
    },
    {
      name: "vertical_down",
      start: { x: 0, y: 0 },
      target: { x: 0, y: 10 },
      expected: { vx: 0, vy: 1, distance: 10 },
    },
    {
      name: "diagonal_45_degrees",
      start: { x: 0, y: 0 },
      target: { x: 10, y: 10 },
      expected: { vx: 0.7071, vy: 0.7071, distance: 14.1421, tolerance: 0.01 },
    },
    {
      name: "same_position",
      start: { x: 5, y: 5 },
      target: { x: 5, y: 5 },
      expected: { vx: 0, vy: 0, distance: 0 },
    },
    {
      name: "negative_coordinates",
      start: { x: -10, y: -10 },
      target: { x: -20, y: -20 },
      expected: {
        vx: -0.7071,
        vy: -0.7071,
        distance: 14.1421,
        tolerance: 0.01,
      },
    },
  ];
}

/**
 * Generates test cases for distance calculation
 * @returns {Array} Array of distance test cases
 */
export function generateDistanceTestCases() {
  return [
    { name: "zero", p1: { x: 0, y: 0 }, p2: { x: 0, y: 0 }, expected: 0 },
    { name: "unit_x", p1: { x: 0, y: 0 }, p2: { x: 1, y: 0 }, expected: 1 },
    { name: "unit_y", p1: { x: 0, y: 0 }, p2: { x: 0, y: 1 }, expected: 1 },
    { name: "3_4_5", p1: { x: 0, y: 0 }, p2: { x: 3, y: 4 }, expected: 5 },
    {
      name: "large_values",
      p1: { x: 1000, y: 1000 },
      p2: { x: 2000, y: 2000 },
      expected: 1414.2136,
      tolerance: 0.01,
    },
  ];
}

/**
 * Generates test cases for cursor threat detection
 * @returns {Array} Array of threat test cases
 */
export function generateCursorThreatTestCases() {
  return [
    {
      name: "inside_radius",
      cursor: { x: 100, y: 100, isActive: true },
      worm: { x: 100, y: 100 },
      distance: 0,
      expected: true,
    },
    {
      name: "at_radius",
      cursor: { x: 100, y: 100, isActive: true },
      worm: { x: 240, y: 100 },
      distance: 140,
      expected: true,
    },
    {
      name: "outside_radius",
      cursor: { x: 100, y: 100, isActive: true },
      worm: { x: 250, y: 100 },
      distance: 150,
      expected: false,
    },
    {
      name: "inactive_cursor",
      cursor: { x: 100, y: 100, isActive: false },
      worm: { x: 100, y: 100 },
      distance: 0,
      expected: false,
    },
    {
      name: "null_cursor",
      cursor: null,
      worm: { x: 100, y: 100 },
      distance: 0,
      expected: false,
    },
  ];
}

/**
 * Generates obstacle configurations for testing
 * @param {number} count - Number of obstacles
 * @param {Object} bounds - Viewport bounds
 * @returns {Array} Array of obstacle rectangles
 */
export function generateObstacles(
  count = 5,
  bounds = { width: 1920, height: 1080 },
) {
  const obstacles = [];
  for (let i = 0; i < count; i++) {
    obstacles.push({
      left: randomInRange(100, bounds.width - 200),
      top: randomInRange(100, bounds.height - 200),
      right: randomInRange(300, bounds.width - 100),
      bottom: randomInRange(300, bounds.height - 100),
    });
  }
  return obstacles;
}

/**
 * Creates a sequence of test worm states for behavior transition testing
 * @param {number} steps - Number of steps in sequence
 * @returns {Array} Array of worm state objects
 */
export function generateBehaviorSequence(steps = 5) {
  const sequence = [];
  for (let i = 0; i < steps; i++) {
    sequence.push({
      x: randomInRange(100, 500),
      y: randomInRange(100, 500),
      direction: randomInRange(0, Math.PI * 2),
      velocityX: 0,
      velocityY: 0,
      step: i,
    });
  }
  return sequence;
}

export default {
  randomInRange,
  randomIntInRange,
  randomPointInBounds,
  randomVelocity,
  generateBoundaryTestCases,
  generateVelocityTestCases,
  generateDistanceTestCases,
  generateCursorThreatTestCases,
  generateObstacles,
  generateBehaviorSequence,
};
