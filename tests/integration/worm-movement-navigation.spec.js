/**
 * tests/integration/worm-movement-navigation.spec.js - Integration tests for worm navigation
 */

import { describe, expect, test } from "@playwright/test";
import { createEvasionMock } from "../mocks/evasion-mock.js";
import { createMovementMock } from "../mocks/movement-mock.js";
import {
  createElementMock,
  createSymbolMock,
  createWormMock,
} from "../mocks/worm-mock.js";

describe("Worm Movement Navigation Integration", () => {
  let mockMovement;
  let mockEvasion;
  let mockPathfinder;
  let mockWormSystem;

  beforeEach(() => {
    mockMovement = createMovementMock();
    mockEvasion = createEvasionMock();
    mockPathfinder = {
      findPath: jest.fn((start, end, bounds, obstacles) => []),
    };

    mockWormSystem = {
      movement: mockMovement,
      evasion: mockEvasion,
      pathfinder: mockPathfinder,
      obstacleMap: { getObstacleRects: () => [] },
      aggressionModel: {
        getAggression: jest.fn((distance) => ({
          level: 0,
          speedMultiplier: 1,
          usePathfinding: false,
          useIntercept: false,
        })),
      },
      getCachedAllSymbols: jest.fn(() => []),
      getCachedRevealedSymbols: jest.fn(() => []),
      CURSOR_ESCAPE_MULTIPLIER: 2.2,
      DISTANCE_CONSOLE_ARRIVAL: 20,
      DISTANCE_STEAL_SYMBOL: 30,
      DISTANCE_TARGET_RUSH: 30,
      BORDER_MARGIN: 20,
      DIRECTION_CHANGE_RATE: 0.1,
      CRAWL_AMPLITUDE: 0.5,
      PATH_RECALC_INTERVAL: 500,
      NEAR_MISS_THRESHOLD: 80,
      _nearMissActive: false,
      _nearMissWorm: null,
      _constrainToBounds: function(worm, bounds) {
        const margin = bounds.margin || 20;
        if (worm.x < margin) {
          worm.x = margin;
          worm.direction = Math.PI - worm.direction;
        }
        if (worm.x > bounds.width - margin) {
          worm.x = bounds.width - margin;
          worm.direction = Math.PI - worm.direction;
        }
        if (worm.y < margin) {
          worm.y = margin;
          worm.direction = -worm.direction;
        }
        if (worm.y > bounds.height - margin) {
          worm.y = bounds.height - margin;
          worm.direction = -worm.direction;
        }
      },
      _resolveTargetElement: jest.fn(() => null),
      _updateWormRotation: function(worm) {
        if (worm.element && worm.element.style) {
          worm.element.style.transform = `rotate(${worm.direction +
            Math.PI}rad)`;
        }
      },
      _applyCrawlMovement: function(worm) {
        if (!worm.crawlPhase) worm.crawlPhase = 0;
        worm.direction += (Math.random() - 0.5) * this.DIRECTION_CHANGE_RATE;
        const crawlOffset = Math.sin(worm.crawlPhase) * this.CRAWL_AMPLITUDE;
        worm.velocityX =
          Math.cos(worm.direction) * (worm.baseSpeed || 2) + crawlOffset;
        worm.velocityY =
          Math.sin(worm.direction) * (worm.baseSpeed || 2) + crawlOffset;
        worm.x += worm.velocityX;
        worm.y += worm.velocityY;
      },
      _triggerNearMissWarning: jest.fn(),
      _clearNearMissWarning: jest.fn(),
      stealSymbol: jest.fn(),
      removeWorm: jest.fn(),
    };
  });

  describe("_updateWormRoaming", () => {
    test("should return false when worm has stolen", () => {
      const worm = createWormMock({ hasStolen: true });
      const result = mockWormSystem._updateWormRoaming(worm, 1920, 1080);

      expect(result).toBe(false);
    });

    test("should return false when rushing to target", () => {
      const worm = createWormMock({ isRushingToTarget: true });
      const result = mockWormSystem._updateWormRoaming(worm, 1920, 1080);

      expect(result).toBe(false);
    });

    test("should apply crawl movement for normal roaming", () => {
      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: Math.PI / 4,
        crawlPhase: 0,
        element: createElementMock(),
      });

      const result = mockWormSystem._updateWormRoaming(worm, 500, 500);

      expect(result).toBe(true);
      expect(worm.x).not.toBe(100);
      expect(worm.y).not.toBe(100);
    });

    test("should apply obstacle avoidance during roaming", () => {
      mockEvasion.applyObstacleAvoidance = jest.fn(() => ({ x: 1, y: 0 }));

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: 0,
        crawlPhase: 0,
        element: createElementMock(),
      });

      mockWormSystem._updateWormRoaming(worm, 500, 500);

      expect(mockEvasion.applyObstacleAvoidance).toHaveBeenCalled();
    });

    test("should constrain to bounds after roaming", () => {
      const worm = createWormMock({
        x: 10,
        y: 250,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: Math.PI,
        crawlPhase: 0,
        element: createElementMock(),
      });

      mockWormSystem._updateWormRoaming(worm, 500, 500);

      expect(worm.x).toBeGreaterThanOrEqual(20);
    });
  });

  describe("_updateWormRushingToTarget", () => {
    test("should return false when not rushing to target", () => {
      const worm = createWormMock({ isRushingToTarget: false });
      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(false);
    });

    test("should return false when has stolen", () => {
      const worm = createWormMock({ isRushingToTarget: true, hasStolen: true });
      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(false);
    });

    test("should fall back to roaming when no symbols available", () => {
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => []);
      mockWormSystem._resolveTargetElement = jest.fn(() => null);

      const worm = createWormMock({
        isRushingToTarget: true,
        hasStolen: false,
        forceRushUntil: Date.now() - 1000,
      });

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(false);
      expect(worm.isRushingToTarget).toBe(false);
    });

    test("should move toward target when resolved", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 200,
        direction: 0,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(worm.velocityX).toBe(4);
      expect(worm.velocityY).toBe(0);
    });

    test("should steal symbol when close enough", () => {
      const symbolElement = createSymbolMock("x", 130, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 2,
        velocityY: 0,
        distance: 28, // Less than DISTANCE_STEAL_SYMBOL (30)
        direction: 0,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(mockWormSystem.stealSymbol).toHaveBeenCalledWith(worm);
    });

    test("should trigger near-miss warning when close but not stealing", () => {
      const symbolElement = createSymbolMock("x", 180, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        id: "worm-1",
        targetSymbol: "x",
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 2,
        velocityY: 0,
        distance: 75, // Between 30 and 80 (NEAR_MISS_THRESHOLD)
        direction: 0,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(mockWormSystem._triggerNearMissWarning).toHaveBeenCalled();
    });

    test("should use pathfinding when aggression requires it", () => {
      mockWormSystem.aggressionModel.getAggression = jest.fn(() => ({
        level: 2,
        speedMultiplier: 1.5,
        usePathfinding: true,
        useIntercept: false,
      }));

      const symbolElement = createSymbolMock("x", 500, 500);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);
      mockPathfinder.findPath = jest.fn(() => [
        { x: 200, y: 300 },
        { x: 300, y: 400 },
        { x: 500, y: 500 },
      ]);

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 3,
        velocityY: 4.5,
        distance: 400,
        direction: 0.98,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(mockPathfinder.findPath).toHaveBeenCalled();
      expect(worm.path).not.toBeNull();
    });

    test("should apply obstacle avoidance during rush", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);
      mockEvasion.applyObstacleAvoidance = jest.fn(() => ({ x: 0.5, y: 0 }));

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        velocityX: 4,
        velocityY: 0,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 200,
        direction: 0,
      }));

      mockWormSystem._updateWormRushingToTarget(worm);

      expect(mockEvasion.applyObstacleAvoidance).toHaveBeenCalled();
      expect(worm.velocityX).toBeCloseTo(4.5, 5);
    });

    test("should keep purple worm targeting restricted to revealed symbols", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        isPurple: true,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 200,
        direction: 0,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(mockWormSystem.getCachedRevealedSymbols).toHaveBeenCalled();
    });
  });

  describe("Near-Miss Warning System", () => {
    test("_triggerNearMissWarning should activate warning state", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem._nearMissActive = false;

      mockWormSystem._triggerNearMissWarning(
        createWormMock({ id: "worm-1" }),
        symbolElement,
        75,
      );

      expect(mockWormSystem._nearMissActive).toBe(true);
      expect(mockWormSystem._nearMissWorm).toBe("worm-1");
    });

    test("_triggerNearMissWarning should ignore if already active", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem._nearMissActive = true;

      mockWormSystem._triggerNearMissWarning(
        createWormMock({ id: "worm-2" }),
        symbolElement,
        75,
      );

      expect(mockWormSystem._nearMissWorm).not.toBe("worm-2");
    });

    test("_clearNearMissWarning should reset state", () => {
      mockWormSystem._nearMissActive = true;
      mockWormSystem._nearMissWorm = "worm-1";

      mockWormSystem._clearNearMissWarning();

      expect(mockWormSystem._nearMissActive).toBe(false);
      expect(mockWormSystem._nearMissWorm).toBeNull();
    });

    test("_clearNearMissWarning should ignore if not active", () => {
      mockWormSystem._nearMissActive = false;

      mockWormSystem._clearNearMissWarning();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe("Pathfinding Integration", () => {
    test("should recalculate path at specified interval", () => {
      const symbolElement = createSymbolMock("x", 500, 500);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);
      mockWormSystem.aggressionModel.getAggression = jest.fn(() => ({
        level: 2,
        speedMultiplier: 1.5,
        usePathfinding: true,
        useIntercept: false,
      }));

      mockPathfinder.findPath = jest.fn(() => [
        { x: 200, y: 300 },
        { x: 500, y: 500 },
      ]);

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        lastPathUpdate: 0,
        path: null,
        pathIndex: 0,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 3,
        velocityY: 4.5,
        distance: 400,
        direction: 0.98,
      }));

      // First call - should calculate path
      mockWormSystem._updateWormRushingToTarget(worm);
      expect(mockPathfinder.findPath).toHaveBeenCalledTimes(1);

      // Second call immediately - should not recalculate
      mockWormSystem._updateWormRushingToTarget(worm);
      expect(mockPathfinder.findPath).toHaveBeenCalledTimes(1);

      // Third call after interval - should recalculate
      worm.lastPathUpdate =
        Date.now() - mockWormSystem.PATH_RECALC_INTERVAL - 100;
      mockWormSystem._updateWormRushingToTarget(worm);
      expect(mockPathfinder.findPath).toHaveBeenCalledTimes(2);
    });

    test("should fallback to direct movement when pathfinding fails", () => {
      const symbolElement = createSymbolMock("x", 500, 500);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);
      mockWormSystem.aggressionModel.getAggression = jest.fn(() => ({
        level: 2,
        speedMultiplier: 1.5,
        usePathfinding: true,
        useIntercept: false,
      }));

      mockPathfinder.findPath = jest.fn(() => []); // Empty path

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        lastPathUpdate: 0,
        path: null,
        pathIndex: 0,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 3,
        velocityY: 0,
        distance: 400,
        direction: 0,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(worm.path).toBeNull();
    });
  });

  describe("Aggression Model Integration", () => {
    test("should apply aggression speed multiplier", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);
      mockWormSystem.aggressionModel.getAggression = jest.fn(() => ({
        level: 1,
        speedMultiplier: 2.0,
        usePathfinding: false,
        useIntercept: false,
      }));

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(
        (worm, tx, ty, multiplier) => {
          const speed = (worm.baseSpeed || 2) * multiplier;
          return {
            velocityX: speed,
            velocityY: 0,
            distance: 200,
            direction: 0,
          };
        },
      );

      mockWormSystem._updateWormRushingToTarget(worm);

      expect(mockMovement.calculateVelocityToTarget).toHaveBeenCalledWith(
        worm,
        expect.any(Number),
        expect.any(Number),
        2.0, // Speed multiplier from aggression
      );
    });

    test("should use intercept mode when aggression requires it", () => {
      const symbolElement = createSymbolMock("x", 300, 250);
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => [symbolElement]);
      mockWormSystem._resolveTargetElement = jest.fn(() => symbolElement);
      mockWormSystem.aggressionModel.getAggression = jest.fn(() => ({
        level: 3,
        speedMultiplier: 2.5,
        usePathfinding: false,
        useIntercept: true,
      }));

      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 5,
        velocityY: 0,
        distance: 200,
        direction: 0,
      }));

      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(true);
      expect(worm.aggressionLevel).toBe(3);
    });
  });
});
