/**
 * tests/unit/symbol-validator.spec.js - Unit tests for SymbolValidator
 * and the middle-screen solver stub.
 *
 * Loads src via fs.readFileSync + vm sandbox (see tests/unit/worm-evasion.spec.js).
 */

import { expect, test } from "@playwright/test";
import fs from "node:fs";
import vm from "node:vm";

const { describe } = test;

const validatorCode = fs.readFileSync(
  new URL("../../src/scripts/symbol-validator.js", import.meta.url),
  "utf8",
);
const validatorContext = { console, window: {} };
vm.createContext(validatorContext);
vm.runInContext(validatorCode, validatorContext);
const SymbolValidator = validatorContext.window.SymbolValidator;

const solverCode = fs.readFileSync(
  new URL("../../src/tools/middle-screen/solver.js", import.meta.url),
  "utf8",
);

// Fresh solver context per test so module-level `firstLineAnnounced` state
// does not leak between tests.
function loadSolver() {
  const events = [];
  const ctx = {
    console,
    window: {},
    Event: class Event {
      constructor(type) {
        this.type = type;
      }
    },
    document: {
      dispatchEvent: (event) => events.push({ type: event.type }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(solverCode, ctx);
  vm.runInContext("window.__onLineSolved = _onLineSolved;", ctx);
  return { onLineSolved: ctx.window.__onLineSolved, events };
}

function makeValidator() {
  return new SymbolValidator();
}

describe("SymbolValidator", () => {
  let validator;

  test.beforeEach(() => {
    validator = makeValidator();
  });

  describe("normalizeSymbol", () => {
    test("normalizes lowercase x to uppercase X", () => {
      expect(validator.normalizeSymbol("x")).toBe("X");
    });

    test("keeps uppercase X as X", () => {
      expect(validator.normalizeSymbol("X")).toBe("X");
    });

    test("leaves other letters unchanged", () => {
      expect(validator.normalizeSymbol("y")).toBe("y");
      expect(validator.normalizeSymbol("a")).toBe("a");
    });

    test("leaves operators unchanged", () => {
      expect(validator.normalizeSymbol("+")).toBe("+");
      expect(validator.normalizeSymbol("=")).toBe("=");
      expect(validator.normalizeSymbol("×")).toBe("×");
    });

    test("returns non-strings as-is (null, undefined, number)", () => {
      expect(validator.normalizeSymbol(null)).toBe(null);
      expect(validator.normalizeSymbol(undefined)).toBeUndefined();
      expect(validator.normalizeSymbol(5)).toBe(5);
    });

    test("returns empty string as-is", () => {
      expect(validator.normalizeSymbol("")).toBe("");
    });
  });

  describe("isSymbolMatch", () => {
    test("treats x and X as equivalent both directions", () => {
      expect(validator.isSymbolMatch("x", "X")).toBe(true);
      expect(validator.isSymbolMatch("X", "x")).toBe(true);
    });

    test("matches identical operators", () => {
      expect(validator.isSymbolMatch("+", "+")).toBe(true);
      expect(validator.isSymbolMatch("=", "=")).toBe(true);
    });

    test("returns false for different symbols", () => {
      expect(validator.isSymbolMatch("x", "y")).toBe(false);
      expect(validator.isSymbolMatch("+", "-")).toBe(false);
      expect(validator.isSymbolMatch("x", "+")).toBe(false);
    });

    test("returns false when expected symbol is ignored", () => {
      expect(validator.isSymbolMatch(" ", " ")).toBe(false);
    });

    test("handles null / empty / non-string inputs", () => {
      expect(validator.isSymbolMatch(null, "x")).toBe(false);
      expect(validator.isSymbolMatch("x", null)).toBe(false);
      expect(validator.isSymbolMatch("", "x")).toBe(false);
      expect(validator.isSymbolMatch("x", "")).toBe(false);
      expect(validator.isSymbolMatch(5, "x")).toBe(false);
      expect(validator.isSymbolMatch("x", 5)).toBe(false);
    });
  });

  describe("isSymbolInStep", () => {
    test("returns true when symbol appears in step text", () => {
      expect(validator.isSymbolInStep("x", "x + 2 = 5")).toBe(true);
      expect(validator.isSymbolInStep("+", "x + 2 = 5")).toBe(true);
    });

    test("treats x/X equivalence inside a step", () => {
      expect(validator.isSymbolInStep("X", "x + 2")).toBe(true);
      expect(validator.isSymbolInStep("x", "X + 2")).toBe(true);
    });

    test("returns false when symbol is not in step", () => {
      expect(validator.isSymbolInStep("y", "x + 2 = 5")).toBe(false);
      expect(validator.isSymbolInStep("7", "x + 2 = 5")).toBe(false);
    });

    test("returns false for empty / null / non-string step text", () => {
      expect(validator.isSymbolInStep("x", "")).toBe(false);
      expect(validator.isSymbolInStep("x", null)).toBe(false);
      expect(validator.isSymbolInStep("x", undefined)).toBe(false);
      expect(validator.isSymbolInStep("x", 123)).toBe(false);
    });
  });

  describe("findSymbolPositions", () => {
    test("returns all positions of a symbol in step text", () => {
      expect(validator.findSymbolPositions("x", "x + x = 5")).toEqual([0, 4]);
    });

    test("treats x/X equivalence across positions", () => {
      expect(validator.findSymbolPositions("X", "x + X")).toEqual([0, 4]);
    });

    test("returns empty array when symbol is not present", () => {
      expect(validator.findSymbolPositions("y", "x + 2 = 5")).toEqual([]);
    });

    test("returns empty array for empty step text", () => {
      expect(validator.findSymbolPositions("x", "")).toEqual([]);
    });

    test("finds operator positions", () => {
      expect(validator.findSymbolPositions("+", "x + y - z")).toEqual([2]);
    });
  });

  describe("isOperator", () => {
    test("returns true for recognized operators", () => {
      ["+", "-", "×", "÷", "="].forEach((op) => {
        expect(validator.isOperator(op)).toBe(true);
      });
    });

    test("returns false for non-operators", () => {
      expect(validator.isOperator("x")).toBe(false);
      expect(validator.isOperator("X")).toBe(false);
      expect(validator.isOperator("5")).toBe(false);
      expect(validator.isOperator(" ")).toBe(false);
      expect(validator.isOperator("")).toBe(false);
    });

    test("returns false for null / non-string", () => {
      expect(validator.isOperator(null)).toBe(false);
      expect(validator.isOperator(undefined)).toBe(false);
      expect(validator.isOperator(5)).toBe(false);
    });
  });

  describe("isNumber", () => {
    test("returns true for single-digit numbers", () => {
      expect(validator.isNumber("0")).toBe(true);
      expect(validator.isNumber("5")).toBe(true);
      expect(validator.isNumber("9")).toBe(true);
    });

    test("returns false for non-digits", () => {
      expect(validator.isNumber("x")).toBe(false);
      expect(validator.isNumber("X")).toBe(false);
      expect(validator.isNumber("+")).toBe(false);
      expect(validator.isNumber(" ")).toBe(false);
      expect(validator.isNumber("")).toBe(false);
    });

    test("returns false for multi-digit strings", () => {
      expect(validator.isNumber("12")).toBe(false);
      expect(validator.isNumber("10")).toBe(false);
    });

    test("returns false for null / non-string", () => {
      expect(validator.isNumber(null)).toBe(false);
      expect(validator.isNumber(undefined)).toBe(false);
    });
  });

  describe("isVariable", () => {
    test("returns true for letters including x/X equivalence", () => {
      expect(validator.isVariable("x")).toBe(true);
      expect(validator.isVariable("X")).toBe(true);
      expect(validator.isVariable("y")).toBe(true);
      expect(validator.isVariable("a")).toBe(true);
      expect(validator.isVariable("Z")).toBe(true);
    });

    test("returns false for non-letters", () => {
      expect(validator.isVariable("+")).toBe(false);
      expect(validator.isVariable("5")).toBe(false);
      expect(validator.isVariable(" ")).toBe(false);
      expect(validator.isVariable("")).toBe(false);
    });

    test("returns false for null / non-string", () => {
      expect(validator.isVariable(null)).toBe(false);
      expect(validator.isVariable(undefined)).toBe(false);
      expect(validator.isVariable(5)).toBe(false);
    });
  });
});

describe("solver.js stub (_onLineSolved)", () => {
  let solver;

  test.beforeEach(() => {
    solver = loadSolver();
  });

  test("dispatches first-line-solved event on first solved line (rowIdx 0)", () => {
    solver.onLineSolved(0);
    expect(solver.events).toHaveLength(1);
    expect(solver.events[0].type).toBe("first-line-solved");
  });

  test("does not re-dispatch on subsequent calls with rowIdx 0", () => {
    solver.onLineSolved(0);
    solver.onLineSolved(0);
    solver.onLineSolved(0);
    // Only the first call dispatches; the flag prevents re-dispatch.
    expect(solver.events).toHaveLength(1);
    expect(solver.events[0].type).toBe("first-line-solved");
  });

  test("does not dispatch for non-first lines", () => {
    solver.onLineSolved(1);
    solver.onLineSolved(2);
    expect(solver.events).toHaveLength(0);
  });
});
