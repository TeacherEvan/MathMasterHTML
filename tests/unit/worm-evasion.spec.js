/**
 * tests/unit/worm-evasion.spec.js - Unit tests for WormEvasion class
 */

import { describe, expect, test } from "@playwright/test";
import { WormEvasion } from "../../src/scripts/worm-evasion.js";
import { createWormMock } from "../mocks/worm-mock.js";

describe("WormEvasion", () => {
  let evasion;

  beforeEach(() => {
    evasion = new WormEvasion({
      cursorThreatRadius: 140,
      cursorEscapeRadius: 220,
      cursorEscapeMultiplier: 2.2,
      obstacleAvoidStrength: 0.9,
      obstaclePadding: 12,
    });
  });

  describe("Constructor", () => {
    test("should initialize with default values", () => {
      const defaultEvasion = new WormEvasion();
      expect(defaultEvasion.cursorThreatRadius).toBe(140);
      expect(defaultEvasion.cursorEscapeRadius).toBe(220);
      expect(defaultEvasion.cursorEscapeMultiplier).toBe(2.2);
      expect(defaultEvasion.obstacleAvoidStrength).toBe(0.9);
      expect(defaultEvasion.obstaclePadding).toBe(12);
    });

    test("should accept custom configuration", () => {
      const customEvasion = new WormEvasion({
        cursorThreatRadius: 200,
        cursorEscapeRadius: 300,
        cursorEscapeMultiplier: 3.0,
        obstacleAvoidStrength: 1.5,
        obstaclePadding: 20,
      });

      expect(customEvasion.cursorThreatRadius).toBe(200);
      expect(customEvasion.cursorEscapeRadius).toBe(300);
      expect(customEvasion.cursorEscapeMultiplier).toBe(3.0);
      expect(customEvasion.obstacleAvoidStrength).toBe(1.5);
      expect(customEvasion.obstaclePadding).toBe(20);
    });
  });

  describe("isCursorThreat", () => {
    test("should return true when cursor is at worm position", () => {
      const worm = createWormMock({ x: 100, y: 100 });
      const cursorState = { x: 100, y: 100, isActive: true };

      expect(evasion.isCursorThreat(worm, cursorState)).toBe(true);
    });

    test("should return true when cursor is within threat radius", () => {
      const worm = createWormMock({ x: 100, y: 100 });
      const cursorState = { x: 100, y: 100, isActive: true };

      // Distance of 100 is within 140 radius
      expect(evasion.isCursorThreat(worm, cursorState)).toBe(true);
    });

    test("should return true when cursor is exactly at threat radius", () => {
      const worm = createWormMock({ x: 100, y: 100 });
      const cursorState = { x: 240, y: 100, isActive: true };

      // Distance of 140 is at the boundary
      expect(evasion.isCursorThreat(worm, cursorState)).toBe(true);
    });

    test("should return false when cursor is outside threat radius", () => {
      const worm = createWormMock({ x: 100, y: 100 });
      const cursorState = { x: 250, y: 100, isActive: true };

      // Distance of 150 is outside 140 radius
      expect(evasion.isCursorThreat(worm, cursorState)).toBe(false);
    });

    test("should return false when cursor is inactive", () => {
      const worm = createWormMock({ x: 100, y: 100 });
      const cursorState = { x: 100, y: 100, isActive: false };

      expect(evasion.isCursorThreat(worm, cursorState)).toBe(false);
    });

    test("should return false for null cursor state", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      expect(evasion.isCursorThreat(worm, null)).toBe(false);
    });

    test("should return false for undefined cursor state", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      expect(evasion.isCursorThreat(worm, undefined)).toBe(false);
    });

    test("should handle cursor at various angles", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      // Cursor at 45 degrees, distance 100
      const cursorState = {
        x: 100 + 100 * Math.cos(Math.PI / 4),
        y: 100 + 100 * Math.sin(Math.PI / 4),
        isActive: true,
      };
      expect(evasion.isCursorThreat(worm, cursorState)).toBe(true);

      // Cursor at 45 degrees, distance 150
      const farCursor = {
        x: 100 + 150 * Math.cos(Math.PI / 4),
        y: 100 + 150 * Math.sin(Math.PI / 4),
        isActive: true,
      };
      expect(evasion.isCursorThreat(worm, farCursor)).toBe(false);
    });
  });

  describe("getCursorEscapeVector", () => {
    test("should calculate correct escape vector for cursor at same position", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 100, y: 100, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // When worm and cursor are at same position, use default direction
      expect(result.velocityX).toBeCloseTo(2 * 2.2, 5); // baseSpeed * escapeMultiplier
      expect(result.velocityY).toBeCloseTo(0, 5);
      expect(result.direction).toBe(0);
    });

    test("should calculate correct escape vector for cursor to the left", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 50, y: 100, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Escape should be in opposite direction (right)
      expect(result.velocityX).toBePositive();
      expect(result.velocityY).toBeCloseTo(0, 5);
      expect(result.direction).toBeCloseTo(0, 5);
    });

    test("should calculate correct escape vector for cursor to the right", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 150, y: 100, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Escape should be in opposite direction (left)
      expect(result.velocityX).toBeNegative();
      expect(result.velocityY).toBeCloseTo(0, 5);
      expect(result.direction).toBeCloseTo(Math.PI, 5);
    });

    test("should calculate correct escape vector for cursor above", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 100, y: 50, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Escape should be in opposite direction (down)
      expect(result.velocityX).toBeCloseTo(0, 5);
      expect(result.velocityY).toBePositive();
      expect(result.direction).toBeCloseTo(Math.PI / 2, 5);
    });

    test("should calculate correct escape vector for cursor below", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 100, y: 150, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Escape should be in opposite direction (up)
      expect(result.velocityX).toBeCloseTo(0, 5);
      expect(result.velocityY).toBeNegative();
      expect(result.direction).toBeCloseTo(-Math.PI / 2, 5);
    });

    test("should apply escape multiplier when within escape radius", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 100, y: 50, isActive: true }; // Distance 50 < 220

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Should use escape multiplier (2.2)
      expect(result.velocityX).toBeCloseTo(0, 5);
      expect(result.velocityY).toBeCloseTo(2 * 2.2, 5);
    });

    test("should use normal speed when outside escape radius", () => {
      const customEvasion = new WormEvasion({
        cursorThreatRadius: 50,
        cursorEscapeRadius: 100,
        cursorEscapeMultiplier: 2.2,
        obstacleAvoidStrength: 0.9,
        obstaclePadding: 12,
      });

      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 250, y: 100, isActive: true }; // Distance 150 > 100

      const result = customEvasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Should not use escape multiplier
      expect(result.velocityX).toBeCloseTo(-2, 5);
      expect(result.velocityY).toBeCloseTo(0, 5);
    });

    test("should handle diagonal escape correctly", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 50, y: 50, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Escape should be in direction of (50, 50) from (100, 100)
      const expectedAngle = Math.atan2(50, 50);
      expect(result.direction).toBeCloseTo(expectedAngle, 5);
    });

    test("should have normalized velocity magnitude", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 50, y: 100, isActive: true };

      const result = evasion.getCursorEscapeVector(
        worm,
        cursorState,
        worm.baseSpeed,
      );

      // Velocity magnitude should equal baseSpeed * multiplier
      const magnitude = Math.sqrt(
        result.velocityX ** 2 + result.velocityY ** 2,
      );
      expect(magnitude).toBeCloseTo(2 * 2.2, 5);
    });
  });

  describe("applyObstacleAvoidance", () => {
    test("should return zero vector for empty obstacles array", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      const result = evasion.applyObstacleAvoidance(worm, []);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    test("should return zero vector for null obstacles", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      const result = evasion.applyObstacleAvoidance(worm, null);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    test("should return zero vector for undefined obstacles", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      const result = evasion.applyObstacleAvoidance(worm, undefined);

      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    test("should return zero vector when worm is far from obstacles", () => {
      const worm = createWormMock({ x: 500, y: 500 });
      const obstacles = [{ left: 100, top: 100, right: 200, bottom: 200 }];

      const result = evasion.applyObstacleAvoidance(worm, obstacles);

      // Worm at (500, 500) is far from obstacle at (100-200, 100-200)
      expect(result.x).toBeCloseTo(0, 5);
      expect(result.y).toBeCloseTo(0, 5);
    });

    test("should calculate avoidance when worm is near obstacle edge", () => {
      const worm = createWormMock({ x: 188, y: 150 }); // Just outside right edge of obstacle
      const obstacles = [{ left: 100, top: 100, right: 200, bottom: 200 }];

      const result = evasion.applyObstacleAvoidance(worm, obstacles);

      // Should push worm left (negative x)
      expect(result.x).toBeNegative();
      expect(result.y).toBeCloseTo(0, 5);
    });

    test("should calculate avoidance from closest point on obstacle", () => {
      const worm = createWormMock({ x: 250, y: 150 }); // Outside right side
      const obstacles = [{ left: 100, top: 100, right: 200, bottom: 200 }];

      const result = evasion.applyObstacleAvoidance(worm, obstacles);

      // Closest point is (200, 150), so avoidance should be away from it
      // Vector from (200, 150) to (250, 150) is (50, 0)
      expect(result.x).toBePositive();
      expect(result.y).toBeCloseTo(0, 5);
    });

    test("should apply strength multiplier to avoidance", () => {
      const customEvasion = new WormEvasion({
        cursorThreatRadius: 140,
        cursorEscapeRadius: 220,
        cursorEscapeMultiplier: 2.2,
        obstacleAvoidStrength: 1.5, // Stronger avoidance
        obstaclePadding: 12,
      });

      const worm = createWormMock({ x: 188, y: 150 });
      const obstacles = [{ left: 100, top: 100, right: 200, bottom: 200 }];

      const result = customEvasion.applyObstacleAvoidance(worm, obstacles);

      // Should have stronger avoidance
      expect(Math.abs(result.x)).toBeGreaterThan(0);
    });

    test("should combine avoidance from multiple obstacles", () => {
      const worm = createWormMock({ x: 150, y: 150 });
      const obstacles = [
        { left: 100, top: 100, right: 140, bottom: 140 }, // Top-left
        { left: 160, top: 100, right: 200, bottom: 140 }, // Top-right
      ];

      const result = evasion.applyObstacleAvoidance(worm, obstacles);

      // Should have combined avoidance pushing down
      expect(result.y).toBePositive();
    });

    test("should apply falloff for distant obstacles", () => {
      const worm = createWormMock({ x: 280, y: 150 }); // Within 3x padding (36) from edge
      const obstacles = [{ left: 100, top: 100, right: 200, bottom: 200 }];

      const result = evasion.applyObstacleAvoidance(worm, obstacles);

      // Distance from closest point (200, 150) to worm (280, 150) is 80
      // Closest point on edge is (200, 150), which is at padding distance (12)
      // So falloff should apply
      expect(Math.abs(result.x)).toBeGreaterThan(0);
    });
  });
});
