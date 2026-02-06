/**
 * tests/global-setup.js - Global test setup and configuration
 */

/**
 * Global setup function for Playwright tests
 */
export default async function globalSetup() {
  // Set default test timeout
  process.env.PLAYWRIGHT_TEST_TIMEOUT = "30000";

  // Set up global test utilities
  global.__TEST_UTILS__ = {
    // Common test helpers
    generateWormData: (overrides = {}) => ({
      id: `worm-${Date.now()}`,
      x: 100 + Math.random() * 400,
      y: 100 + Math.random() * 200,
      direction: Math.random() * Math.PI * 2,
      baseSpeed: 1 + Math.random() * 2,
      currentSpeed: 1 + Math.random() * 2,
      velocityX: 0,
      velocityY: 0,
      crawlPhase: 0,
      hasStolen: false,
      isPurple: false,
      fromConsole: false,
      isRushingToDevil: false,
      isRushingToTarget: false,
      ...overrides,
    }),

    // Generate random position within bounds
    randomPosition: (width = 500, height = 400, margin = 20) => ({
      x: margin + Math.random() * (width - margin * 2),
      y: margin + Math.random() * (height - margin * 2),
    }),

    // Calculate expected velocity
    expectedVelocity: (startX, startY, targetX, targetY, speed) => {
      const dx = targetX - startX;
      const dy = targetY - startY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance === 0) return { vx: 0, vy: 0, distance: 0 };
      return {
        vx: (dx / distance) * speed,
        vy: (dy / distance) * speed,
        distance,
      };
    },
  };

  console.log("Test global setup complete");
}
