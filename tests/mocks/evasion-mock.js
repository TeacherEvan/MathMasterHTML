/**
 * tests/mocks/evasion-mock.js - Evasion module mock for testing
 */

/**
 * Creates a mock WormEvasion instance
 * @param {Object} overrides - Method/property overrides
 * @returns {Object} Mock WormEvasion
 */
export function createEvasionMock(overrides = {}) {
  return {
    cursorThreatRadius: 140,
    cursorEscapeRadius: 220,
    cursorEscapeMultiplier: 2.2,
    obstacleAvoidStrength: 0.9,
    obstaclePadding: 12,

    isCursorThreat: jest.fn((worm, cursorState) => {
      if (!cursorState || !cursorState.isActive) return false;
      const dx = worm.x - cursorState.x;
      const dy = worm.y - cursorState.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance <= 140;
    }),

    getCursorEscapeVector: jest.fn((worm, cursorState, baseSpeed) => {
      const dx = worm.x - cursorState.x;
      const dy = worm.y - cursorState.y;
      const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
      const multiplier = distance <= 220 ? 2.2 : 1.0;

      return {
        velocityX: (dx / distance) * baseSpeed * multiplier,
        velocityY: (dy / distance) * baseSpeed * multiplier,
        direction: Math.atan2(dy, dx),
      };
    }),

    applyObstacleAvoidance: jest.fn((worm, obstacles) => {
      if (!obstacles || obstacles.length === 0) return { x: 0, y: 0 };
      return { x: 0, y: 0 }; // Default: no avoidance
    }),

    ...overrides,
  };
}

export default { createEvasionMock };
