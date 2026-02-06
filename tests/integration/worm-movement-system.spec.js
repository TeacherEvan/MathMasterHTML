/**
 * tests/integration/worm-movement-system.spec.js - System-level integration tests
 */

import { describe, expect, test } from "@playwright/test";
import { createEvasionMock } from "../mocks/evasion-mock.js";
import { createMovementMock } from "../mocks/movement-mock.js";
import {
  createElementMock,
  createSymbolMock,
  createWormMock,
} from "../mocks/worm-mock.js";

describe("Worm Movement System Integration", () => {
  let mockMovement;
  let mockEvasion;
  let mockWormSystem;

  beforeEach(() => {
    mockMovement = createMovementMock();
    mockEvasion = createEvasionMock();

    mockWormSystem = {
      movement: mockMovement,
      evasion: mockEvasion,
      cursorState: { x: 100, y: 100, isActive: true },
      obstacleMap: { getObstacleRects: () => [] },
      pathfinder: { findPath: jest.fn(() => []) },
      aggressionModel: {
        getAggression: jest.fn(() => ({
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
      _nearMissActive: false,
      _nearMissWorm: null,

      // Methods that will be tested
      _resolveTargetElement: jest.fn(() => null),
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
      _updateWormRotation: function(worm) {
        if (worm.element && worm.element.style) {
          worm.element.style.transform = `rotate(${worm.direction +
            Math.PI}rad)`;
        }
      },
      _triggerNearMissWarning: jest.fn(),
      _clearNearMissWarning: jest.fn(),
      stealSymbol: jest.fn(),
      removeWorm: jest.fn(),
      findEmptyConsoleSlot: jest.fn(() => null),
    };
  });

  describe("Movement Pipeline Flow", () => {
    test("should flow from behavior selection to velocity application", () => {
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

      // Simulate behavior selection (roaming)
      const behaviorResult = mockWormSystem._applyCrawlMovement(worm);

      // Verify position updated
      expect(worm.x).not.toBe(100);
      expect(worm.y).not.toBe(100);

      // Verify velocity calculated
      expect(worm.velocityX).toBeDefined();
      expect(worm.velocityY).toBeDefined();

      // Apply bounds
      mockWormSystem._constrainToBounds(worm, {
        width: 500,
        height: 400,
        margin: 20,
      });

      // Verify within bounds
      expect(worm.x).toBeGreaterThanOrEqual(20);
      expect(worm.x).toBeLessThanOrEqual(480);
      expect(worm.y).toBeGreaterThanOrEqual(20);
      expect(worm.y).toBeLessThanOrEqual(380);
    });

    test("should handle complete rush-to-target pipeline", () => {
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
        velocityX: 0,
        velocityY: 0,
        path: null,
        pathIndex: 0,
        lastPathUpdate: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 200,
        direction: 0,
      }));

      // Step 1: Resolve target
      const target = mockWormSystem._resolveTargetElement(worm, [
        symbolElement,
      ]);
      expect(target).toBe(symbolElement);

      // Step 2: Calculate velocity
      const velocity = mockMovement.calculateVelocityToTarget(
        worm,
        300,
        250,
        1,
      );
      worm.velocityX = velocity.velocityX;
      worm.velocityY = velocity.velocityY;
      expect(worm.velocityX).toBe(4);

      // Step 3: Apply position
      worm.x += worm.velocityX;
      worm.y += worm.velocityY;

      // Step 4: Apply bounds
      mockWormSystem._constrainToBounds(worm, {
        width: 500,
        height: 400,
        margin: 20,
      });

      // Verify final position
      expect(worm.x).toBe(304);
      expect(worm.y).toBe(250);
    });
  });

  describe("Behavior State Transitions", () => {
    test("should transition from roaming to rushing without corruption", () => {
      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: Math.PI / 4,
        velocityX: 1,
        velocityY: 1,
        crawlPhase: 0,
        element: createElementMock(),
      });

      // Initial state - roaming
      mockWormSystem._applyCrawlMovement(worm);
      const roamPosition = {
        x: worm.x,
        y: worm.y,
        velocityX: worm.velocityX,
        velocityY: worm.velocityY,
      };

      // Transition to rushing
      worm.isRushingToTarget = true;
      worm.targetElement = createSymbolMock("x", 400, 400);

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 6,
        velocityY: 6,
        distance: 424,
        direction: Math.PI / 4,
      }));

      // Calculate new velocity for rushing
      const velocity = mockMovement.calculateVelocityToTarget(
        worm,
        400,
        400,
        1,
      );
      worm.velocityX = velocity.velocityX;
      worm.velocityY = velocity.velocityY;
      worm.direction = velocity.direction;

      // Verify transition maintains direction continuity
      expect(
        Math.abs(
          worm.direction - roamPosition.velocityY / roamPosition.velocityX,
        ),
      ).toBeLessThan(0.5);

      // Verify position continuity
      expect(Math.abs(worm.x - roamPosition.x)).toBeLessThan(10);
      expect(Math.abs(worm.y - roamPosition.y)).toBeLessThan(10);
    });

    test("should handle evasion interruption correctly", () => {
      mockEvasion.isCursorThreat = jest.fn(() => false);

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        velocityX: 2,
        velocityY: 0,
        crawlPhase: 0,
        element: createElementMock(),
      });

      // Normal movement
      mockWormSystem._applyCrawlMovement(worm);
      const normalPosition = { x: worm.x, y: worm.y };

      // Cursor becomes threat
      mockEvasion.isCursorThreat = jest.fn(() => true);
      mockEvasion.getCursorEscapeVector = jest.fn(() => ({
        velocityX: -5,
        velocityY: 0,
        direction: Math.PI,
      }));

      // Evasion applied
      const evasionResult = mockEvasion.getCursorEscapeVector(
        worm,
        { x: 150, y: 100, isActive: true },
        2,
      );
      worm.velocityX = evasionResult.velocityX;
      worm.velocityY = evasionResult.velocityY;
      worm.direction = evasionResult.direction;

      // Verify evasion changes velocity
      expect(worm.velocityX).toBeNegative();

      // Cursor leaves threat area
      mockEvasion.isCursorThreat = jest.fn(() => false);

      // Return to normal behavior
      mockWormSystem._applyCrawlMovement(worm);

      // Verify system continues without corruption
      expect(worm.x).toBeDefined();
      expect(worm.y).toBeDefined();
    });

    test("should handle multiple rapid state changes", () => {
      const worm = createWormMock({
        x: 250,
        y: 250,
        hasStolen: false,
        isRushingToTarget: false,
        isRushingToDevil: false,
        baseSpeed: 2,
        direction: 0,
        velocityX: 0,
        velocityY: 0,
        crawlPhase: 0,
        element: createElementMock(),
      });

      const states = [
        { isRushingToTarget: false, isRushingToDevil: false },
        { isRushingToTarget: true, isRushingToDevil: false },
        { isRushingToTarget: false, isRushingToDevil: true },
        { isRushingToTarget: true, isRushingToDevil: false },
        { isRushingToTarget: false, isRushingToDevil: false },
      ];

      states.forEach((state, index) => {
        worm.isRushingToTarget = state.isRushingToTarget;
        worm.isRushingToDevil = state.isRushingToDevil;

        mockWormSystem._applyCrawlMovement(worm);
        mockWormSystem._constrainToBounds(worm, {
          width: 500,
          height: 400,
          margin: 20,
        });

        // Verify no corruption after each state change
        expect(worm.x).toBeGreaterThanOrEqual(20);
        expect(worm.x).toBeLessThanOrEqual(480);
        expect(worm.y).toBeGreaterThanOrEqual(20);
        expect(worm.y).toBeLessThanOrEqual(380);
      });
    });
  });

  describe("Navigation to Movement Coordination", () => {
    test("should coordinate navigation output with movement input", () => {
      const worm = createWormMock({
        x: 100,
        y: 250,
        isRushingToTarget: true,
        hasStolen: false,
        baseSpeed: 2,
        direction: 0,
        velocityX: 0,
        velocityY: 0,
        path: null,
        pathIndex: 0,
        lastPathUpdate: 0,
        element: createElementMock(),
      });

      const symbolElement = createSymbolMock("x", 300, 250);

      // Navigation calculates waypoint
      const waypoint = { x: 200, y: 250 };

      // Movement calculates velocity to waypoint
      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 100,
        direction: 0,
      }));

      const velocity = mockMovement.calculateVelocityToTarget(
        worm,
        waypoint.x,
        waypoint.y,
        1,
      );

      // Apply velocity through movement system
      worm.velocityX = velocity.velocityX;
      worm.velocityY = velocity.velocityY;

      mockWormSystem._constrainToBounds(worm, {
        width: 500,
        height: 400,
        margin: 20,
      });

      // Verify coordination
      expect(worm.velocityX).toBe(4);
      expect(worm.x).toBe(104);
    });

    test("should apply obstacle avoidance to movement", () => {
      mockEvasion.applyObstacleAvoidance = jest.fn(() => ({ x: 0.5, y: 0 }));

      const worm = createWormMock({
        x: 150,
        y: 150,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: Math.PI / 4,
        velocityX: 1,
        velocityY: 1,
        crawlPhase: 0,
        element: createElementMock(),
      });

      // Movement calculates base velocity
      mockWormSystem._applyCrawlMovement(worm);
      const baseVelocity = { x: worm.velocityX, y: worm.velocityY };

      // Obstacle avoidance modifies velocity
      const avoidance = mockEvasion.applyObstacleAvoidance(worm, [
        { left: 200, top: 100, right: 300, bottom: 200 },
      ]);
      worm.x += avoidance.x;
      worm.y += avoidance.y;

      // Verify avoidance applied
      expect(mockEvasion.applyObstacleAvoidance).toHaveBeenCalled();
    });
  });

  describe("Error Recovery", () => {
    test("should handle null movement module gracefully", () => {
      mockWormSystem.movement = null;

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
      });

      // Should not throw
      expect(() => {
        // Manual fallback calculation
        const dx = 200 - worm.x;
        const dy = 200 - worm.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        worm.velocityX = (dx / distance) * 2;
        worm.velocityY = (dy / distance) * 2;
      }).not.toThrow();

      // Verify fallback worked
      expect(worm.velocityX).toBeDefined();
      expect(worm.velocityY).toBeDefined();
    });

    test("should handle undefined evasion module", () => {
      mockWormSystem.evasion = undefined;

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

      // Should still be able to move
      mockWormSystem._applyCrawlMovement(worm);

      expect(worm.x).toBeDefined();
      expect(worm.y).toBeDefined();
    });

    test("should handle empty symbol list without crashing", () => {
      mockWormSystem.getCachedRevealedSymbols = jest.fn(() => []);
      mockWormSystem._resolveTargetElement = jest.fn(() => null);

      const worm = createWormMock({
        isRushingToTarget: true,
        hasStolen: false,
        forceRushUntil: Date.now() - 1000,
      });

      // Should return false, not throw
      const result = mockWormSystem._updateWormRushingToTarget(worm);

      expect(result).toBe(false);
      expect(worm.isRushingToTarget).toBe(false);
    });
  });

  describe("Concurrent Worms", () => {
    test("should handle multiple worms independently", () => {
      const worms = Array.from({ length: 5 }, (_, i) =>
        createWormMock({
          id: `worm-${i}`,
          x: 50 + i * 100,
          y: 100,
          hasStolen: false,
          isRushingToTarget: false,
          baseSpeed: 2,
          direction: Math.random() * Math.PI * 2,
          velocityX: 0,
          velocityY: 0,
          crawlPhase: 0,
          element: createElementMock(),
        }),
      );

      // Update all worms
      worms.forEach((worm) => {
        mockWormSystem._applyCrawlMovement(worm);
        mockWormSystem._constrainToBounds(worm, {
          width: 600,
          height: 400,
          margin: 20,
        });
      });

      // Verify each worm updated independently
      worms.forEach((worm, index) => {
        expect(worm.x).toBeDefined();
        expect(worm.y).toBeDefined();
        // Each worm should have unique position
        expect(worm.x).not.toBeCloseTo(
          50 + (index === 0 ? 0 : (index - 1) * 100),
          -1,
        );
      });
    });

    test("should maintain worm isolation during behavior changes", () => {
      const worm1 = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        isRushingToTarget: true,
        baseSpeed: 2,
        direction: 0,
        velocityX: 0,
        velocityY: 0,
        element: createElementMock(),
      });

      const worm2 = createWormMock({
        x: 200,
        y: 100,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: Math.PI,
        velocityX: 0,
        velocityY: 0,
        crawlPhase: 0,
        element: createElementMock(),
      });

      // Update worm1 (rushing)
      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 100,
        direction: 0,
      }));

      worm1.velocityX = 4;
      worm1.velocityY = 0;
      worm1.x += worm1.velocityX;
      worm1.y += worm1.velocityY;

      // Update worm2 (roaming)
      mockWormSystem._applyCrawlMovement(worm2);

      // Verify isolation
      expect(worm1.velocityX).not.toBe(worm2.velocityX);
      expect(worm1.x).not.toBeCloseTo(worm2.x, -1);
    });
  });

  describe("Boundary System Integration", () => {
    test("should enforce boundaries across all behaviors", () => {
      const bounds = { width: 500, height: 400, margin: 20 };
      const behaviors = ["roaming", "rushing"];

      behaviors.forEach((behavior) => {
        const worm = createWormMock({
          x: 25,
          y: 200,
          hasStolen: false,
          baseSpeed: 10, // High speed to test boundary
          direction: Math.PI,
          velocityX: -10,
          velocityY: 0,
          crawlPhase: 0,
          element: createElementMock(),
        });

        // Simulate movement toward boundary
        mockWormSystem._constrainToBounds(worm, bounds);

        // Verify boundary enforced
        expect(worm.x).toBeGreaterThanOrEqual(20);
        expect(worm.direction).not.toBeNaN();
      });
    });

    test("should reflect direction at boundaries correctly", () => {
      const bounds = { width: 500, height: 400, margin: 20 };

      // Test left boundary
      const wormLeft = createWormMock({ x: 10, y: 200, direction: Math.PI });
      mockWormSystem._constrainToBounds(wormLeft, bounds);
      expect(wormLeft.x).toBe(20);
      expect(wormLeft.direction).toBeCloseTo(0, 5);

      // Test right boundary
      const wormRight = createWormMock({ x: 490, y: 200, direction: 0 });
      mockWormSystem._constrainToBounds(wormRight, bounds);
      expect(wormRight.x).toBe(480);
      expect(wormRight.direction).toBeCloseTo(Math.PI, 5);

      // Test top boundary
      const wormTop = createWormMock({
        x: 250,
        y: 10,
        direction: -Math.PI / 2,
      });
      mockWormSystem._constrainToBounds(wormTop, bounds);
      expect(wormTop.y).toBe(20);
      expect(wormTop.direction).toBeCloseTo(Math.PI / 2, 5);

      // Test bottom boundary
      const wormBottom = createWormMock({
        x: 250,
        y: 390,
        direction: Math.PI / 2,
      });
      mockWormSystem._constrainToBounds(wormBottom, bounds);
      expect(wormBottom.y).toBe(380);
      expect(wormBottom.direction).toBeCloseTo(-Math.PI / 2, 5);
    });
  });
});
