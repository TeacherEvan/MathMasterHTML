/**
 * tests/unit/worm-movement.spec.js - Unit tests for WormMovement class
 * Tests the actual browser implementation via page evaluation
 */

import { describe, expect, test } from "@playwright/test";

describe("WormMovement", () => {
  beforeEach(async ({ page }) => {
    // Load the movement module in the browser context
    await page.addScriptTag({ path: "./src/scripts/worm-movement.js" });
  });

  describe("Constructor", () => {
    test("should initialize with default values", async ({ page }) => {
      const defaultMovement = await page.evaluate(() => {
        return new window.WormMovement();
      });

      expect(defaultMovement.BORDER_MARGIN).toBe(20);
      expect(defaultMovement.RUSH_SPEED_MULTIPLIER).toBe(2.0);
      expect(defaultMovement.FLICKER_SPEED_BOOST).toBe(1.2);
      expect(defaultMovement.CRAWL_AMPLITUDE).toBe(0.5);
      expect(defaultMovement.DIRECTION_CHANGE_RATE).toBe(0.1);
    });

    test("should accept custom configuration", async ({ page }) => {
      const customMovement = await page.evaluate(() => {
        return new window.WormMovement({
          borderMargin: 50,
          rushSpeedMultiplier: 3.0,
          crawlAmplitude: 1.0,
        });
      });

      expect(customMovement.BORDER_MARGIN).toBe(50);
      expect(customMovement.RUSH_SPEED_MULTIPLIER).toBe(3.0);
      expect(customMovement.CRAWL_AMPLITUDE).toBe(1.0);
    });

    test("should initialize distance thresholds", async ({ page }) => {
      const movement = await page.evaluate(() => {
        return new window.WormMovement();
      });

      expect(movement.DISTANCE_STEAL_SYMBOL).toBe(30);
      expect(movement.DISTANCE_CONSOLE_ARRIVAL).toBe(20);
      expect(movement.DISTANCE_TARGET_RUSH).toBe(30);
      expect(movement.DISTANCE_ROAM_RESUME).toBe(5);
    });
  });

  describe("calculateVelocityToTarget", () => {
    test("should calculate correct velocity for horizontal movement right", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 0, y: 0, baseSpeed: 2, direction: 0 };
        return movement.calculateVelocityToTarget(worm, 10, 0, 1);
      });

      expect(result.velocityX).toBeCloseTo(2, 5);
      expect(result.velocityY).toBeCloseTo(0, 5);
      expect(result.distance).toBeCloseTo(10, 5);
      expect(result.direction).toBeCloseTo(0, 5);
    });

    test("should calculate correct velocity for horizontal movement left", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 10, y: 0, baseSpeed: 2, direction: 0 };
        return movement.calculateVelocityToTarget(worm, 0, 0, 1);
      });

      expect(result.velocityX).toBeCloseTo(-2, 5);
      expect(result.velocityY).toBeCloseTo(0, 5);
      expect(result.distance).toBeCloseTo(10, 5);
      expect(result.direction).toBeCloseTo(Math.PI, 5);
    });

    test("should calculate correct velocity for vertical movement", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 0, y: 0, baseSpeed: 2, direction: 0 };
        return movement.calculateVelocityToTarget(worm, 0, 10, 1);
      });

      expect(result.velocityX).toBeCloseTo(0, 5);
      expect(result.velocityY).toBeCloseTo(2, 5);
      expect(result.distance).toBeCloseTo(10, 5);
      expect(result.direction).toBeCloseTo(Math.PI / 2, 5);
    });

    test("should calculate correct velocity for diagonal movement", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 0, y: 0, baseSpeed: 2, direction: 0 };
        return movement.calculateVelocityToTarget(worm, 10, 10, 1);
      });

      const expectedVelocity = 2 / Math.sqrt(2);
      expect(result.velocityX).toBeCloseTo(expectedVelocity, 5);
      expect(result.velocityY).toBeCloseTo(expectedVelocity, 5);
      expect(result.distance).toBeCloseTo(14.1421, 3);
      expect(result.direction).toBeCloseTo(Math.PI / 4, 5);
    });

    test("should handle zero distance by preserving direction", async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 5, y: 5, baseSpeed: 2, direction: Math.PI / 4 };
        return movement.calculateVelocityToTarget(worm, 5, 5, 1);
      });

      expect(result.velocityX).toBe(0);
      expect(result.velocityY).toBe(0);
      expect(result.distance).toBe(0);
      expect(result.direction).toBe(Math.PI / 4);
    });

    test("should apply speed multiplier correctly", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 0, y: 0, baseSpeed: 2, direction: 0 };
        return movement.calculateVelocityToTarget(worm, 10, 0, 2);
      });

      expect(result.velocityX).toBeCloseTo(4, 5);
      expect(result.velocityY).toBeCloseTo(0, 5);
    });

    test("should handle negative coordinates", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: -10, y: -10, baseSpeed: 2, direction: 0 };
        return movement.calculateVelocityToTarget(worm, -20, -20, 1);
      });

      expect(result.velocityX).toBeCloseTo(-1.414, 3);
      expect(result.velocityY).toBeCloseTo(-1.414, 3);
    });
  });

  describe("constrainToBounds", () => {
    const bounds = { width: 500, height: 400, margin: 20 };

    test("should constrain left edge position", async ({ page }) => {
      const result = await page.evaluate(
        ({ bounds }) => {
          const movement = new window.WormMovement();
          const worm = { x: 10, y: 200, direction: Math.PI };
          movement.constrainToBounds(worm, bounds);
          return worm;
        },
        { bounds },
      );

      expect(result.x).toBe(20);
      expect(result.direction).toBeCloseTo(0, 5);
    });

    test("should constrain right edge position", async ({ page }) => {
      const result = await page.evaluate(
        ({ bounds }) => {
          const movement = new window.WormMovement();
          const worm = { x: 490, y: 200, direction: 0 };
          movement.constrainToBounds(worm, bounds);
          return worm;
        },
        { bounds },
      );

      expect(result.x).toBe(480);
      expect(result.direction).toBeCloseTo(Math.PI, 5);
    });

    test("should constrain top edge position", async ({ page }) => {
      const result = await page.evaluate(
        ({ bounds }) => {
          const movement = new window.WormMovement();
          const worm = { x: 250, y: 10, direction: -Math.PI / 2 };
          movement.constrainToBounds(worm, bounds);
          return worm;
        },
        { bounds },
      );

      expect(result.y).toBe(20);
      expect(result.direction).toBeCloseTo(Math.PI / 2, 5);
    });

    test("should constrain bottom edge position", async ({ page }) => {
      const result = await page.evaluate(
        ({ bounds }) => {
          const movement = new window.WormMovement();
          const worm = { x: 250, y: 390, direction: Math.PI / 2 };
          movement.constrainToBounds(worm, bounds);
          return worm;
        },
        { bounds },
      );

      expect(result.y).toBe(380);
      expect(result.direction).toBeCloseTo(-Math.PI / 2, 5);
    });

    test("should not constrain valid positions", async ({ page }) => {
      const result = await page.evaluate(
        ({ bounds }) => {
          const movement = new window.WormMovement();
          const worm = { x: 100, y: 100, direction: Math.PI / 4 };
          const originalX = worm.x;
          const originalY = worm.y;
          const originalDirection = worm.direction;
          movement.constrainToBounds(worm, bounds);
          return {
            x: worm.x,
            y: worm.y,
            direction: worm.direction,
            originalX,
            originalY,
            originalDirection,
          };
        },
        { bounds },
      );

      expect(result.x).toBe(result.originalX);
      expect(result.y).toBe(result.originalY);
      expect(result.direction).toBe(result.originalDirection);
    });

    test("should handle corner positions correctly", async ({ page }) => {
      const result = await page.evaluate(
        ({ bounds }) => {
          const movement = new window.WormMovement();
          const worm = { x: 5, y: 5, direction: Math.PI };
          movement.constrainToBounds(worm, bounds);
          return worm;
        },
        { bounds },
      );

      expect(result.x).toBe(20);
      expect(result.y).toBe(20);
    });
  });

  describe("calculateDistance", () => {
    test("should return 0 for same point", async ({ page }) => {
      const distance = await page.evaluate(() => {
        const movement = new window.WormMovement();
        return movement.calculateDistance(0, 0, 0, 0);
      });

      expect(distance).toBe(0);
    });

    test("should calculate correct distance on x-axis", async ({ page }) => {
      const distance = await page.evaluate(() => {
        const movement = new window.WormMovement();
        return movement.calculateDistance(0, 0, 10, 0);
      });

      expect(distance).toBe(10);
    });

    test("should calculate correct distance for 3-4-5 triangle", async ({
      page,
    }) => {
      const distance = await page.evaluate(() => {
        const movement = new window.WormMovement();
        return movement.calculateDistance(0, 0, 3, 4);
      });

      expect(distance).toBe(5);
    });

    test("should handle large coordinate values", async ({ page }) => {
      const distance = await page.evaluate(() => {
        const movement = new window.WormMovement();
        return movement.calculateDistance(1000, 1000, 2000, 2000);
      });

      expect(distance).toBeCloseTo(1414.2136, 3);
    });
  });

  describe("hasReachedTarget", () => {
    test("should return true when within threshold", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100 };
        return movement.hasReachedTarget(worm, 120, 120, 30);
      });

      expect(result).toBe(true);
    });

    test("should return false when outside threshold", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100 };
        return movement.hasReachedTarget(worm, 150, 150, 30);
      });

      expect(result).toBe(false);
    });

    test("should return true when exactly at threshold", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100 };
        return movement.hasReachedTarget(worm, 130, 100, 30);
      });

      expect(result).toBe(true);
    });
  });

  describe("isInsideRect", () => {
    test("should return true when completely inside", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100 };
        const rect = { left: 50, top: 50, right: 150, bottom: 150 };
        return movement.isInsideRect(worm, rect);
      });

      expect(result).toBe(true);
    });

    test("should return false when outside", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 200, y: 200 };
        const rect = { left: 50, top: 50, right: 150, bottom: 150 };
        return movement.isInsideRect(worm, rect);
      });

      expect(result).toBe(false);
    });

    test("should return true when on edge", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 50, y: 100 };
        const rect = { left: 50, top: 50, right: 150, bottom: 150 };
        return movement.isInsideRect(worm, rect);
      });

      expect(result).toBe(true);
    });
  });

  describe("updatePosition", () => {
    test("should update position based on velocity", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = {
          x: 100,
          y: 100,
          velocityX: 5,
          velocityY: 3,
          crawlPhase: 0,
        };
        movement.updatePosition(worm);
        return { x: worm.x, y: worm.y };
      });

      expect(result.x).toBe(105);
      expect(result.y).toBe(103);
    });

    test("should update crawl phase", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = {
          x: 100,
          y: 100,
          crawlPhase: 0,
          velocityX: 0,
          velocityY: 0,
        };
        movement.updatePosition(worm);
        return worm.crawlPhase;
      });

      expect(result).toBeCloseTo(0.05, 5);
    });

    test("should wrap crawl phase at 2PI", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = {
          x: 100,
          y: 100,
          crawlPhase: 6.28,
          velocityX: 0,
          velocityY: 0,
        };
        movement.updatePosition(worm);
        return worm.crawlPhase;
      });

      expect(result).toBeLessThan(Math.PI * 2);
    });
  });

  describe("applyCrawlEffect", () => {
    test("should apply perpendicular offset", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100, direction: 0, crawlPhase: Math.PI / 2 };
        return movement.applyCrawlEffect(worm);
      });

      // At phase PI/2, sin is 1, offset should be CRAWL_AMPLITUDE
      expect(result.x).toBeCloseTo(100 + 0.5, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });

    test("should handle zero crawl phase", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100, direction: 0, crawlPhase: 0 };
        return movement.applyCrawlEffect(worm);
      });

      // At phase 0, sin is 0, no perpendicular offset
      expect(result.x).toBeCloseTo(100, 5);
      expect(result.y).toBeCloseTo(100, 5);
    });
  });

  describe("findClosestElement", () => {
    test("should return null for empty array", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100 };
        return movement.findClosestElement(worm, []);
      });

      expect(result).toBeNull();
    });

    test("should find closest element correctly", async ({ page }) => {
      const result = await page.evaluate(() => {
        const movement = new window.WormMovement();
        const worm = { x: 100, y: 100 };
        const elements = [
          {
            getBoundingClientRect: () => ({
              left: 500,
              top: 500,
              width: 50,
              height: 50,
            }),
          },
          {
            getBoundingClientRect: () => ({
              left: 150,
              top: 150,
              width: 50,
              height: 50,
            }),
          },
          {
            getBoundingClientRect: () => ({
              left: 300,
              top: 300,
              width: 50,
              height: 50,
            }),
          },
        ];
        return movement.findClosestElement(worm, elements);
      });

      expect(result).not.toBeNull();
      expect(result.centerX).toBe(175);
      expect(result.centerY).toBe(175);
    });
  });
});
