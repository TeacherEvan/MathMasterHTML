// src/tools/scripts/verify/checks/daily-challenge.test.js

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import vm from "node:vm";

function loadDailyChallengeContext(storageState = {}, throwOnStorage = false) {
  const store = new Map(Object.entries(storageState));
  const recordedScores = [];

  const localStorage = {
    getItem(key) {
      if (throwOnStorage) {
        throw new Error("Simulated storage failure");
      }
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      if (throwOnStorage) {
        throw new Error("Simulated storage quota failure");
      }
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
  };

  const windowObj = {
    localStorage,
    PlayerStorage: {
      setDailyChallengeCompleted(score) {
        recordedScores.push(score);
      },
    },
  };

  const context = vm.createContext({
    window: windowObj,
    localStorage,
    console: { log() {}, warn() {}, error() {} },
    Date,
    Math,
    Number,
    String,
    Boolean,
    JSON,
  });

  const code = readFileSync(
    resolve(process.cwd(), "src/scripts/daily-challenge.js"),
    "utf8",
  );
  vm.runInContext(code, context);

  return {
    DailyChallenge: windowObj.DailyChallenge,
    store,
    recordedScores,
  };
}

function assertEquationHolds(challenge) {
  const { template, values } = challenge;
  const { A, B, C, X } = values;

  assert.equal(Number.isInteger(A), true, `A must be integer in ${template}`);
  assert.equal(Number.isInteger(B), true, `B must be integer in ${template}`);
  assert.equal(Number.isInteger(C), true, `C must be integer in ${template}`);
  assert.equal(Number.isInteger(X), true, `X must be integer in ${template}`);

  switch (template) {
    case "A + B - X = C":
      assert.equal(A + B - X, C, `${A} + ${B} - ${X} !== ${C}`);
      break;
    case "A - X = B":
      assert.equal(A - X, B, `${A} - ${X} !== ${B}`);
      break;
    case "X + A = B":
      assert.equal(X + A, B, `${X} + ${A} !== ${B}`);
      break;
    case "A × B - X = C":
      assert.equal(A * B - X, C, `${A} * ${B} - ${X} !== ${C}`);
      break;
    case "A × X = B":
      assert.equal(A * X, B, `${A} * ${X} !== ${B}`);
      break;
    case "A × B + X = C":
      assert.equal(A * B + X, C, `${A} * ${B} + ${X} !== ${C}`);
      break;
    case "X × A = B":
      assert.equal(X * A, B, `${X} * ${A} !== ${B}`);
      break;
    case "A ÷ B = X":
      assert.equal(A / B, X, `${A} / ${B} !== ${X}`);
      assert.equal(A % B, 0, `${A} not divisible by ${B}`);
      break;
    case "A ÷ X = B":
      assert.equal(A / X, B, `${A} / ${X} !== ${B}`);
      assert.equal(A % X, 0, `${A} not divisible by ${X}`);
      break;
    case "X ÷ A = B":
      assert.equal(X / A, B, `${X} / ${A} !== ${B}`);
      assert.equal(X % A, 0, `${X} not divisible by ${A}`);
      break;
    case "A × B ÷ X = C":
      assert.equal((A * B) / X, C, `${A} * ${B} / ${X} !== ${C}`);
      assert.equal((A * B) % X, 0, `${A} * ${B} not divisible by ${X}`);
      assert.notEqual(B, X, "A × B ÷ X = C should not trivially set B === X");
      break;
    default:
      assert.fail(`Unexpected equation template: ${template}`);
  }
}

test("DailyChallenge generates algebraically valid equations across all templates", () => {
  const { DailyChallenge } = loadDailyChallengeContext();
  const seenTemplates = new Set();

  for (let seed = 20260101; seed < 20260300; seed += 1) {
    const challenge = DailyChallenge.generateChallenge(seed, `seed-${seed}`);
    seenTemplates.add(challenge.template);
    assertEquationHolds(challenge);
  }

  assert.equal(seenTemplates.size, 11, "All 11 templates must be exercised");
});

test("DailyChallenge todayStr and dateSeed align on local calendar dates and isYesterday handles month rollovers", () => {
  const { DailyChallenge } = loadDailyChallengeContext();
  const sampleDate = new Date(2026, 9, 19, 1, 15, 0); // Local Oct 19, 2026 01:15
  assert.equal(DailyChallenge.todayStr(sampleDate), "2026-10-19");
  assert.equal(DailyChallenge.dateSeed(sampleDate), 20261019);
  assert.equal(DailyChallenge.isYesterday("2026-10-18", "2026-10-19"), true);
  assert.equal(DailyChallenge.isYesterday("2026-09-30", "2026-10-01"), true);
  assert.equal(DailyChallenge.isYesterday("2026-10-17", "2026-10-19"), false);
});

test("DailyChallenge degrades gracefully when localStorage is corrupted or throws", () => {
  const corrupted = loadDailyChallengeContext({
    mathmaster_daily_challenge_v1: "{not-valid-json",
    mathmaster_streak_v1: "{not-valid-json",
  });

  assert.doesNotThrow(() => {
    const challenge = corrupted.DailyChallenge.getTodaysChallenge();
    assertEquationHolds(challenge);
    assert.equal(corrupted.DailyChallenge.getStreakCount(), 0);
    assert.equal(corrupted.DailyChallenge.isDailyCompleted(), false);
    assert.equal(corrupted.DailyChallenge.recordPlay(), 1);
    corrupted.DailyChallenge.markDailyCompleted(12500);
    assert.equal(corrupted.DailyChallenge.isDailyCompleted(), true);
    assert.deepEqual(corrupted.recordedScores, [12500]);
  });

  const throwing = loadDailyChallengeContext({}, true);
  assert.doesNotThrow(() => {
    const challenge = throwing.DailyChallenge.getTodaysChallenge();
    assertEquationHolds(challenge);
    assert.equal(throwing.DailyChallenge.getStreakCount(), 0);
    assert.equal(throwing.DailyChallenge.isDailyCompleted(), false);
    assert.equal(throwing.DailyChallenge.recordPlay(), 1);
    throwing.DailyChallenge.markDailyCompleted(9000);
  });
});
