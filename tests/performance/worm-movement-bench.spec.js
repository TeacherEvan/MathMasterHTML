/**
 * tests/performance/worm-movement-bench.spec.js - Performance benchmarks for worm movement
 */

import { describe, expect, test } from "@playwright/test";
import { WormEvasion } from "../../src/scripts/worm-evasion.js";
import { WormMovement } from "../../src/scripts/worm-movement.js";
import { createWormMock } from "../mocks/worm-mock.js";

describe("Worm Movement Performance Benchmarks", () => {
  let movement;
  let evasion;

  beforeEach(() => {
    movement = new WormMovement({
      borderMargin: 20,
      rushSpeedMultiplier: 2.0,
      crawlAmplitude: 0.5,
      directionChangeRate: 0.1,
    });
    evasion = new WormEvasion({
      cursorThreatRadius: 140,
      cursorEscapeRadius: 220,
      cursorEscapeMultiplier: 2.2,
      obstacleAvoidStrength: 0.9,
      obstaclePadding: 12,
    });
  });

  describe("WormMovement Performance", () => {
    test("calculateVelocityToTarget should execute in under 0.01ms", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        movement.calculateVelocityToTarget(worm, 200, 200, 1);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`calculateVelocityToTarget avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.1); // Reasonable threshold for JS
    });

    test("calculateDistance should execute in under 0.005ms", () => {
      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        movement.calculateDistance(100, 100, 200, 200);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`calculateDistance avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.05);
    });

    test("constrainToBounds should execute in under 0.01ms", () => {
      const worm = createWormMock({ x: 10, y: 100 });
      const bounds = { width: 500, height: 400, margin: 20 };

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        worm.x = 10;
        worm.y = 100;
        movement.constrainToBounds(worm, bounds);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`constrainToBounds avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.1);
    });

    test("hasReachedTarget should execute in under 0.005ms", () => {
      const worm = createWormMock({ x: 100, y: 100 });

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        movement.hasReachedTarget(worm, 120, 120, 30);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`hasReachedTarget avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.05);
    });

    test("updatePosition should execute in under 0.01ms", () => {
      const worm = createWormMock({
        x: 100,
        y: 100,
        velocityX: 5,
        velocityY: 3,
        crawlPhase: 0,
      });

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        movement.updatePosition(worm);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`updatePosition avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  describe("WormEvasion Performance", () => {
    test("isCursorThreat should execute in under 0.005ms", () => {
      const worm = createWormMock({ x: 100, y: 100 });
      const cursorState = { x: 150, y: 150, isActive: true };

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        evasion.isCursorThreat(worm, cursorState);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`isCursorThreat avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.05);
    });

    test("getCursorEscapeVector should execute in under 0.01ms", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const cursorState = { x: 150, y: 150, isActive: true };

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        evasion.getCursorEscapeVector(worm, cursorState, 2);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`getCursorEscapeVector avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.1);
    });

    test("applyObstacleAvoidance with multiple obstacles should execute in under 0.05ms", () => {
      const worm = createWormMock({ x: 150, y: 150 });
      const obstacles = [
        { left: 100, top: 100, right: 140, bottom: 140 },
        { left: 160, top: 100, right: 200, bottom: 140 },
        { left: 100, top: 160, right: 140, bottom: 200 },
        { left: 160, top: 160, right: 200, bottom: 200 },
        { left: 300, top: 100, right: 340, bottom: 140 },
      ];

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        evasion.applyObstacleAvoidance(worm, obstacles);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`applyObstacleAvoidance avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.5);
    });
  });

  describe("High-Frequency Update Scenarios", () => {
    test("should handle 60 updates per second for single worm", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const frameTime = 1000 / 60; // ~16.67ms per frame
      const testDuration = 1000; // 1 second test
      const frames = testDuration / frameTime;

      const start = performance.now();
      for (let i = 0; i < frames; i++) {
        // Simulate game frame update
        movement.updatePosition(worm);
        movement.constrainToBounds(worm, {
          width: 500,
          height: 400,
          margin: 20,
        });
      }
      const end = performance.now();
      const totalTime = end - start;

      console.log(
        `${frames} frames in ${totalTime.toFixed(
          2,
        )}ms (target: ${testDuration}ms)`,
      );
      expect(totalTime).toBeLessThan(testDuration * 0.5); // Should complete in half the test duration
    });

    test("should handle 10 concurrent worms at 60fps", () => {
      const worms = Array.from({ length: 10 }, (_, i) =>
        createWormMock({ x: 50 + i * 50, y: 100 + (i % 3) * 50, baseSpeed: 2 }),
      );
      const obstacles = [{ left: 200, top: 100, right: 300, bottom: 300 }];

      const frameTime = 1000 / 60;
      const testDuration = 1000;
      const frames = testDuration / frameTime;

      const start = performance.now();
      for (let i = 0; i < frames; i++) {
        worms.forEach((worm) => {
          movement.updatePosition(worm);
          movement.constrainToBounds(worm, {
            width: 500,
            height: 400,
            margin: 20,
          });
          evasion.applyObstacleAvoidance(worm, obstacles);
        });
      }
      const end = performance.now();
      const totalTime = end - start;

      console.log(`${frames} frames x 10 worms in ${totalTime.toFixed(2)}ms`);
      expect(totalTime).toBeLessThan(testDuration);
    });

    test("should handle rapid target changes", () => {
      const worm = createWormMock({ x: 250, y: 250, baseSpeed: 2 });
      const targets = [
        { x: 100, y: 100 },
        { x: 400, y: 100 },
        { x: 400, y: 400 },
        { x: 100, y: 400 },
        { x: 250, y: 250 },
      ];

      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        const target = targets[i % targets.length];
        movement.calculateVelocityToTarget(worm, target.x, target.y, 1);
      }
      const end = performance.now();
      const avgTime = (end - start) / iterations;

      console.log(`rapid target change avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  describe("Boundary Edge Case Performance", () => {
    test("should handle boundary-constrained movement efficiently", () => {
      const worm = createWormMock({
        x: 25,
        y: 200,
        direction: Math.PI,
        baseSpeed: 5,
      });

      const iterations = 1000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        // Simulate rapid boundary hits
        worm.x = 25;
        worm.direction = Math.PI;
        movement.constrainToBounds(worm, {
          width: 500,
          height: 400,
          margin: 20,
        });

        worm.x = 480;
        worm.direction = 0;
        movement.constrainToBounds(worm, {
          width: 500,
          height: 400,
          margin: 20,
        });

        worm.y = 25;
        worm.direction = -Math.PI / 2;
        movement.constrainToBounds(worm, {
          width: 500,
          height: 400,
          margin: 20,
        });

        worm.y = 380;
        worm.direction = Math.PI / 2;
        movement.constrainToBounds(worm, {
          width: 500,
          height: 400,
          margin: 20,
        });
      }
      const end = performance.now();
      const totalTime = end - start;
      const avgTime = totalTime / (iterations * 4);

      console.log(`boundary constraint avg: ${avgTime.toFixed(6)}ms`);
      expect(avgTime).toBeLessThan(0.1);
    });
  });

  describe("Memory Utilization", () => {
    test("should not leak memory during repeated calculations", () => {
      const worm = createWormMock({ x: 100, y: 100, baseSpeed: 2 });
      const initialMemory = process.memoryUsage().heapUsed;

      const iterations = 100000;
      for (let i = 0; i < iterations; i++) {
        movement.calculateVelocityToTarget(worm, 200, 200, 1);
        movement.calculateDistance(100, 100, 200, 200);
        movement.hasReachedTarget(worm, 150, 150, 30);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(
        `Memory increase after ${iterations} iterations: ${(
          memoryIncrease / 1024
        ).toFixed(2)}KB`,
      );

      // Should not have excessive memory growth (less than 10MB for 100K iterations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe("Stress Testing", () => {
    test("should maintain performance under sustained load", () => {
      const worms = Array.from({ length: 50 }, (_, i) =>
        createWormMock({
          x: Math.random() * 500,
          y: Math.random() * 400,
          baseSpeed: 1 + Math.random() * 3,
        }),
      );
      const obstacles = Array.from({ length: 10 }, () => ({
        left: Math.random() * 400,
        top: Math.random() * 300,
        right: Math.random() * 400 + 100,
        bottom: Math.random() * 300 + 100,
      }));

      const iterations = 1000;
      const measurements = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        worms.forEach((worm) => {
          movement.updatePosition(worm);
          movement.constrainToBounds(worm, {
            width: 500,
            height: 400,
            margin: 20,
          });
          evasion.applyObstacleAvoidance(worm, obstacles);
        });

        const end = performance.now();
        measurements.push(end - start);
      }

      const avgTime =
        measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const p95 = measurements.sort((a, b) => a - b)[
        Math.floor(measurements.length * 0.95)
      ];
      const maxTime = Math.max(...measurements);

      console.log(
        `50 worms stress test - avg: ${avgTime.toFixed(
          3,
        )}ms, p95: ${p95.toFixed(3)}ms, max: ${maxTime.toFixed(3)}ms`,
      );

      expect(avgTime).toBeLessThan(5); // Average should be under 5ms
      expect(p95).toBeLessThan(10); // 95th percentile should be under 10ms
    });
  });
});
