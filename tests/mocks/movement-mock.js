/**
 * tests/mocks/movement-mock.js - Movement module mock for testing
 */

/**
 * Creates a mock WormMovement instance
 * @param {Object} overrides - Method/property overrides
 * @returns {Object} Mock WormMovement
 */
export function createMovementMock(overrides = {}) {
  return {
    BORDER_MARGIN: 20,
    RUSH_SPEED_MULTIPLIER: 2.0,
    FLICKER_SPEED_BOOST: 1.2,
    CRAWL_AMPLITUDE: 0.5,
    DIRECTION_CHANGE_RATE: 0.1,
    CRAWL_PHASE_INCREMENT: 0.05,
    DISTANCE_STEAL_SYMBOL: 30,
    DISTANCE_CONSOLE_ARRIVAL: 20,
    DISTANCE_TARGET_RUSH: 30,
    DISTANCE_ROAM_RESUME: 5,

    calculateVelocityToTarget: jest.fn(
      (worm, targetX, targetY, speedMultiplier = 1) => {
        const dx = targetX - worm.x;
        const dy = targetY - worm.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
          return {
            velocityX: 0,
            velocityY: 0,
            distance: 0,
            direction: worm.direction || 0,
          };
        }

        const speed = (worm.baseSpeed || 2) * speedMultiplier;
        return {
          velocityX: (dx / distance) * speed,
          velocityY: (dy / distance) * speed,
          distance: distance,
          direction: Math.atan2(dy, dx),
        };
      },
    ),

    constrainToBounds: jest.fn((worm, bounds) => {
      const { width, height, margin = 20 } = bounds;
      if (worm.x < margin) {
        worm.x = margin;
        worm.direction = Math.PI - worm.direction;
      }
      if (worm.x > width - margin) {
        worm.x = width - margin;
        worm.direction = Math.PI - worm.direction;
      }
      if (worm.y < margin) {
        worm.y = margin;
        worm.direction = -worm.direction;
      }
      if (worm.y > height - margin) {
        worm.y = height - margin;
        worm.direction = -worm.direction;
      }
    }),

    hasReachedTarget: jest.fn((worm, targetX, targetY, threshold) => {
      const dx = targetX - worm.x;
      const dy = targetY - worm.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < threshold;
    }),

    calculateDistance: jest.fn((x1, y1, x2, y2) => {
      const dx = x2 - x1;
      const dy = y2 - y1;
      return Math.sqrt(dx * dx + dy * dy);
    }),

    updatePosition: jest.fn((worm) => {
      worm.x += worm.velocityX || 0;
      worm.y += worm.velocityY || 0;
    }),

    applyCrawlEffect: jest.fn((worm) => {
      return {
        x: worm.x,
        y: worm.y,
      };
    }),

    updateRoaming: jest.fn((worm) => {
      // Default implementation
    }),

    updateRushing: jest.fn((worm, targetX, targetY) => {
      return 100; // Default distance
    }),

    updateElementTransform: jest.fn((worm) => {
      // Default implementation
    }),

    isInsideRect: jest.fn((worm, rect) => {
      return (
        worm.x >= rect.left &&
        worm.x <= rect.right &&
        worm.y >= rect.top &&
        worm.y <= rect.bottom
      );
    }),

    findClosestElement: jest.fn((worm, elements) => {
      if (!elements || elements.length === 0) return null;
      return null; // Default: no closest element
    }),

    ...overrides,
  };
}

export default { createMovementMock };
