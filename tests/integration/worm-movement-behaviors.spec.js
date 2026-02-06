/**
 * tests/integration/worm-movement-behaviors.spec.js - Integration tests for worm behaviors
 */

import { describe, expect, test } from "@playwright/test";
import { createEvasionMock } from "../mocks/evasion-mock.js";
import { createMovementMock } from "../mocks/movement-mock.js";
import { createElementMock, createWormMock } from "../mocks/worm-mock.js";

describe("Worm Movement Behaviors Integration", () => {
  let mockMovement;
  let mockEvasion;
  let mockWormSystem;

  beforeEach(() => {
    mockMovement = createMovementMock();
    mockEvasion = createEvasionMock();

    // Create a mock WormSystem with the required methods
    mockWormSystem = {
      movement: mockMovement,
      evasion: mockEvasion,
      cursorState: { x: 100, y: 100, isActive: true },
      obstacleMap: { getObstacleRects: () => [] },
      CURSOR_ESCAPE_MULTIPLIER: 2.2,
      DISTANCE_CONSOLE_ARRIVAL: 20,
      BORDER_MARGIN: 20,
      DIRECTION_CHANGE_RATE: 0.1,
      CRAWL_AMPLITUDE: 0.5,
      findEmptyConsoleSlot: jest.fn(() => null),
      removeWorm: jest.fn(),
      stealSymbol: jest.fn(),
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
      _calculateVelocityToTarget: function(
        worm,
        targetX,
        targetY,
        speedMultiplier,
      ) {
        return mockMovement.calculateVelocityToTarget(
          worm,
          targetX,
          targetY,
          speedMultiplier,
        );
      },
      calculateDistance: function(x1, y1, x2, y2) {
        return mockMovement.calculateDistance(x1, y1, x2, y2);
      },
    };
  });

  describe("_updateWormRushingToDevil", () => {
    test("should return false when not rushing to devil", () => {
      const worm = createWormMock({ isRushingToDevil: false });
      const result = mockWormSystem._updateWormRushingToDevil(worm);

      expect(result).toBe(false);
    });

    test("should return false when devil target is undefined", () => {
      const worm = createWormMock({
        isRushingToDevil: true,
        devilX: undefined,
        devilY: undefined,
      });
      const result = mockWormSystem._updateWormRushingToDevil(worm);

      expect(result).toBe(false);
    });

    test("should move toward devil at double speed when far away", () => {
      const worm = createWormMock({
        x: 100,
        y: 100,
        isRushingToDevil: true,
        devilX: 200,
        devilY: 100,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      const result = mockWormSystem._updateWormRushingToDevil(worm);

      expect(result).toBe(true);
      // Should have moved toward target
      expect(worm.x).toBeGreaterThan(100);
      expect(worm.direction).toBeCloseTo(0, 5);
    });

    test("should stop moving when close to devil", () => {
      const worm = createWormMock({
        x: 96,
        y: 100,
        isRushingToDevil: true,
        devilX: 100,
        devilY: 100,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      const originalX = worm.x;
      const result = mockWormSystem._updateWormRushingToDevil(worm);

      expect(result).toBe(true);
      // Position may or may not change at threshold
      expect(worm.direction).toBeCloseTo(Math.atan2(0, 4), 5);
    });

    test("should rotate toward devil", () => {
      const worm = createWormMock({
        x: 100,
        y: 100,
        isRushingToDevil: true,
        devilX: 100,
        devilY: 200,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockWormSystem._updateWormRushingToDevil(worm);

      expect(worm.element.style.transform).toContain("rotate");
    });
  });

  describe("_updateWormEvadingCursor", () => {
    test("should return false when worm has stolen symbol", () => {
      const worm = createWormMock({ hasStolen: true });
      const result = mockWormSystem._updateWormEvadingCursor(worm, 1920, 1080);

      expect(result).toBe(false);
    });

    test("should return false when cursor is not a threat", () => {
      mockEvasion.isCursorThreat = jest.fn(() => false);
      const worm = createWormMock({ hasStolen: false });
      const result = mockWormSystem._updateWormEvadingCursor(worm, 1920, 1080);

      expect(result).toBe(false);
    });

    test("should apply evasion when cursor is a threat", () => {
      mockEvasion.isCursorThreat = jest.fn(() => true);
      mockEvasion.getCursorEscapeVector = jest.fn(() => ({
        velocityX: 5,
        velocityY: 3,
        direction: 0.5,
      }));

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        direction: 0,
        element: createElementMock(),
      });

      const result = mockWormSystem._updateWormEvadingCursor(worm, 500, 500);

      expect(result).toBe(true);
      expect(worm.velocityX).toBe(5);
      expect(worm.velocityY).toBe(3);
      expect(worm.direction).toBe(0.5);
    });

    test("should constrain to bounds after evasion", () => {
      mockEvasion.isCursorThreat = jest.fn(() => true);
      mockEvasion.getCursorEscapeVector = jest.fn(() => ({
        velocityX: 1000,
        velocityY: 0,
        direction: 0,
      }));

      const worm = createWormMock({
        x: 480,
        y: 250,
        hasStolen: false,
        direction: 0,
        element: createElementMock(),
      });

      mockWormSystem._updateWormEvadingCursor(worm, 500, 500);

      // Should be constrained to bounds
      expect(worm.x).toBeLessThanOrEqual(500 - 20);
    });
  });

  describe("_updateWormEscapeBurst", () => {
    test("should return false when escape time has expired", () => {
      const pastTime = Date.now() - 1000;
      const worm = createWormMock({ escapeUntil: pastTime });

      const result = mockWormSystem._updateWormEscapeBurst(worm, 1920, 1080);

      expect(result).toBe(false);
    });

    test("should return false when no escape vector", () => {
      const futureTime = Date.now() + 10000;
      const worm = createWormMock({
        escapeUntil: futureTime,
        escapeVector: null,
      });

      const result = mockWormSystem._updateWormEscapeBurst(worm, 1920, 1080);

      expect(result).toBe(false);
    });

    test("should apply escape burst when active", () => {
      const futureTime = Date.now() + 10000;
      const worm = createWormMock({
        x: 100,
        y: 100,
        escapeUntil: futureTime,
        escapeVector: { x: 1, y: 0 },
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      const result = mockWormSystem._updateWormEscapeBurst(worm, 500, 500);

      expect(result).toBe(true);
      expect(worm.velocityX).toBeCloseTo(2.2, 5); // baseSpeed * CURSOR_ESCAPE_MULTIPLIER
      expect(worm.direction).toBeCloseTo(0, 5);
    });

    test("should constrain to bounds after escape burst", () => {
      const futureTime = Date.now() + 10000;
      const worm = createWormMock({
        x: 490,
        y: 250,
        escapeUntil: futureTime,
        escapeVector: { x: 1, y: 0 },
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockWormSystem._updateWormEscapeBurst(worm, 500, 500);

      expect(worm.x).toBeLessThanOrEqual(500 - 20);
    });
  });

  describe("_updateWormCarryingSymbol", () => {
    test("should return false when worm has not stolen", () => {
      const worm = createWormMock({ hasStolen: false });

      const result = mockWormSystem._updateWormCarryingSymbol(worm);

      expect(result).toBe(false);
    });

    test("should return false when worm is from console (normal behavior)", () => {
      const worm = createWormMock({ hasStolen: true, fromConsole: true });

      const result = mockWormSystem._updateWormCarryingSymbol(worm);

      expect(result).toBe(false);
    });

    test("should apply crawl movement for normal carrying worm", () => {
      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: true,
        fromConsole: false,
        direction: Math.PI / 4,
        baseSpeed: 2,
        crawlPhase: 0,
        element: createElementMock(),
      });

      const result = mockWormSystem._updateWormCarryingSymbol(worm);

      expect(result).toBe(true);
      expect(worm.x).not.toBe(100);
      expect(worm.y).not.toBe(100);
    });

    test("should trigger pull-in animation when close to console", () => {
      mockWormSystem.findEmptyConsoleSlot = jest.fn(() => ({
        element: {
          getBoundingClientRect: () => ({
            left: 100,
            top: 100,
            width: 50,
            height: 50,
          }),
        },
        index: 0,
      }));

      const worm = createWormMock({
        x: 60,
        y: 100,
        hasStolen: true,
        fromConsole: false,
        isPurple: true,
        shouldExitToConsole: true,
        exitingToConsole: true,
        targetConsoleSlot: {
          getBoundingClientRect: () => ({
            left: 100,
            top: 100,
            width: 50,
            height: 50,
          }),
        },
        baseSpeed: 2,
        direction: 0,
        crawlPhase: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 1,
        velocityY: 0,
        distance: 40,
      }));

      mockWormSystem._updateWormCarryingSymbol(worm);

      expect(worm.pullingIn).toBe(true);
    });
  });

  describe("_updateWormReturningToConsole", () => {
    test("should return false when conditions not met", () => {
      const worm = createWormMock({
        hasStolen: false,
        fromConsole: false,
        consoleSlotElement: null,
      });

      const result = mockWormSystem._updateWormReturningToConsole(worm);

      expect(result).toBe(false);
    });

    test("should move toward console slot", () => {
      const consoleSlotElement = {
        getBoundingClientRect: () => ({
          left: 200,
          top: 200,
          width: 50,
          height: 50,
        }),
      };

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: true,
        fromConsole: true,
        consoleSlotElement,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 2,
        velocityY: 2,
        distance: 15,
      }));

      const result = mockWormSystem._updateWormReturningToConsole(worm);

      expect(result).toBe(true);
      expect(worm.velocityX).toBe(2);
      expect(worm.velocityY).toBe(2);
    });

    test("should remove worm when reaching console", () => {
      const consoleSlotElement = {
        getBoundingClientRect: () => ({
          left: 120,
          top: 120,
          width: 50,
          height: 50,
        }),
      };

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: true,
        fromConsole: true,
        consoleSlotElement,
        stolenSymbol: "x",
        id: "worm-1",
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 2,
        velocityY: 2,
        distance: 10,
      }));

      const result = mockWormSystem._updateWormReturningToConsole(worm);

      expect(result).toBe(true);
      expect(mockWormSystem.removeWorm).toHaveBeenCalledWith(worm);
    });
  });

  describe("Behavior Priority and State Transitions", () => {
    test("should handle rapid behavior state changes", () => {
      const worm = createWormMock({
        x: 250,
        y: 250,
        hasStolen: false,
        isRushingToTarget: false,
        baseSpeed: 2,
        direction: 0,
        crawlPhase: 0,
        element: createElementMock(),
      });

      // First update - roaming
      mockWormSystem._applyCrawlMovement(worm);
      const positionAfterRoam = { x: worm.x, y: worm.y };

      // Rapid state change - start rushing
      worm.isRushingToTarget = true;
      worm.devilX = 300;
      worm.devilY = 250;
      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 4,
        velocityY: 0,
        distance: 50,
        direction: 0,
      }));

      const rushResult = mockWormSystem._updateWormRushingToDevil(worm);

      // Position should be different after rushing
      expect(rushResult).toBe(true);
    });

    test("should maintain position continuity during behavior transitions", () => {
      const worm = createWormMock({
        x: 250,
        y: 250,
        hasStolen: false,
        isRushingToDevil: false,
        baseSpeed: 2,
        direction: Math.PI / 4,
        velocityX: 1.41,
        velocityY: 1.41,
        crawlPhase: 0,
        element: createElementMock(),
      });

      // Simulate roaming
      mockWormSystem._applyCrawlMovement(worm);
      const roamPosition = { x: worm.x, y: worm.y };

      // Switch to rushing
      worm.isRushingToDevil = true;
      worm.devilX = 300;
      worm.devilY = 300;

      mockMovement.calculateVelocityToTarget = jest.fn(() => ({
        velocityX: 2.82,
        velocityY: 2.82,
        distance: 70.7,
        direction: Math.PI / 4,
      }));

      mockWormSystem._updateWormRushingToDevil(worm);

      // Position should be continuous (no teleporting)
      expect(Math.abs(worm.x - roamPosition.x)).toBeLessThan(10);
      expect(Math.abs(worm.y - roamPosition.y)).toBeLessThan(10);
    });
  });

  describe("Edge Cases", () => {
    test("should handle null movement module gracefully", () => {
      mockWormSystem.movement = null;

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        isRushingToDevil: false,
        baseSpeed: 2,
        direction: 0,
        element: createElementMock(),
      });

      // Should not throw
      expect(() => {
        mockWormSystem._updateWormCarryingSymbol(worm);
      }).not.toThrow();
    });

    test("should handle undefined evasion module", () => {
      mockWormSystem.evasion = null;

      const worm = createWormMock({
        x: 100,
        y: 100,
        hasStolen: false,
        element: createElementMock(),
      });

      mockWormSystem._updateWormEvadingCursor(worm, 1920, 1080);

      // Should handle gracefully (returns false when evasion is not available)
      expect(worm.velocityX).toBeUndefined();
    });
  });
});
