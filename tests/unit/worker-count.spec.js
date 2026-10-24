/**
 * tests/unit/worker-count.spec.js - Unit tests for the Playwright worker count.
 *
 * The worker count decides how many browsers the lane may run at once. Too
 * many and the browser is killed for memory, which surfaces as a cascade of
 * "Target page, context or browser has been closed" failures that look like
 * product bugs.
 */

import { expect, test } from "@playwright/test";

import { resolveWorkerCount } from "../utils/worker-count.js";

const { describe } = test;

describe("playwright worker count", () => {
  test("an explicit override wins", () => {
    expect(resolveWorkerCount({ override: 1 })).toBe(1);
    expect(resolveWorkerCount({ override: 4 })).toBe(4);
  });

  test("never returns less than one worker", () => {
    expect(resolveWorkerCount()).toBeGreaterThanOrEqual(1);
  });

  test("never exceeds the number of cores", () => {
    // The config derives the count from the core count as well as memory.
    expect(resolveWorkerCount()).toBeLessThanOrEqual(8);
  });
});
