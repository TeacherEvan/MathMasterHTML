import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  checkToolingTests,
  collectToolingTestFiles,
} from "./tooling-tests.js";

function withTempToolingRoot(run) {
  const rootDir = mkdtempSync(join(tmpdir(), "mathmaster-tooling-tests-"));

  try {
    run(rootDir);
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

function writeToolingFile(rootDir, relativePath, content = "export {}\n") {
  const filePath = join(rootDir, "src", "tools", "scripts", relativePath);
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, "utf8");
}

test("collectToolingTestFiles finds nested tooling tests", () => {
  withTempToolingRoot((rootDir) => {
    writeToolingFile(rootDir, "verify/checks/documentation.test.js");
    writeToolingFile(rootDir, "verify/helpers/example.test.js");
    writeToolingFile(rootDir, "verify/helpers/example.js");

    assert.deepEqual(collectToolingTestFiles(rootDir).sort(), [
      "src/tools/scripts/verify/checks/documentation.test.js",
      "src/tools/scripts/verify/helpers/example.test.js",
    ]);
  });
});

test("checkToolingTests returns true without running anything when no tests exist", () => {
  withTempToolingRoot((rootDir) => {
    writeToolingFile(rootDir, "verify/helpers/example.js");

    let didRun = false;
    const messages = [];
    const passed = checkToolingTests(rootDir, {
      logFn: (message) => messages.push(message),
      logSectionFn: () => {},
      runTestFiles: () => {
        didRun = true;
      },
    });

    assert.equal(passed, true);
    assert.equal(didRun, false);
    assert.match(messages[0], /No tooling unit tests found/);
  });
});

test("checkToolingTests runs discovered files through node --test", () => {
  withTempToolingRoot((rootDir) => {
    writeToolingFile(rootDir, "verify/z-last.test.js");
    writeToolingFile(rootDir, "verify/a-first.test.js");

    const invocations = [];
    const passed = checkToolingTests(rootDir, {
      logFn: () => {},
      logSectionFn: () => {},
      runTestFiles: (...args) => invocations.push(args),
    });

    assert.equal(passed, true);
    assert.equal(invocations.length, 1);
    assert.equal(invocations[0][0], process.execPath);
    assert.deepEqual(invocations[0][1], [
      "--test",
      "src/tools/scripts/verify/a-first.test.js",
      "src/tools/scripts/verify/z-last.test.js",
    ]);
    assert.deepEqual(invocations[0][2], {
      cwd: rootDir,
      stdio: "pipe",
    });
  });
});

test("checkToolingTests reports combined stdout and stderr on failure", () => {
  withTempToolingRoot((rootDir) => {
    writeToolingFile(rootDir, "verify/failing.test.js");

    const printed = [];
    const passed = checkToolingTests(rootDir, {
      logFn: () => {},
      logSectionFn: () => {},
      printOutput: (message) => printed.push(message),
      runTestFiles: () => {
        const error = new Error("tooling tests failed");
        error.stdout = Buffer.from("stdout details");
        error.stderr = Buffer.from("stderr details");
        throw error;
      },
    });

    assert.equal(passed, false);
    assert.equal(printed.length, 1);
    assert.match(printed[0], /stdout details/);
    assert.match(printed[0], /stderr details/);
  });
});