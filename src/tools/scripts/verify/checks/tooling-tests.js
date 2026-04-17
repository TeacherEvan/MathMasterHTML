// src/tools/scripts/verify/checks/tooling-tests.js

import { execFileSync } from "child_process";
import { readdirSync } from "fs";
import { join } from "path";
import { log, logSection } from "../verify.logging.js";

const TOOLING_TEST_ROOT = "src/tools/scripts";

export function collectToolingTestFiles(
  rootDir,
  relativeDir = "",
  toolingTestRoot = TOOLING_TEST_ROOT,
) {
  const currentDir = join(rootDir, toolingTestRoot, relativeDir);
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const testFiles = [];

  for (const entry of entries) {
    const nextRelativeDir = join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      testFiles.push(
        ...collectToolingTestFiles(rootDir, nextRelativeDir, toolingTestRoot),
      );
      continue;
    }

    if (entry.name.endsWith(".test.js")) {
      testFiles.push(join(toolingTestRoot, nextRelativeDir).replaceAll("\\", "/"));
    }
  }

  return testFiles;
}

function getToolingTestFailureOutput(error) {
  return [error.stdout?.toString() || "", error.stderr?.toString() || ""]
    .filter(Boolean)
    .join("\n")
    .slice(0, 2000);
}

export function checkToolingTests(rootDir, options = {}) {
  const {
    toolingTestRoot = TOOLING_TEST_ROOT,
    logFn = log,
    logSectionFn = logSection,
    printOutput = console.log,
    runTestFiles = execFileSync,
  } = options;

  logSectionFn("TOOLING TESTS");

  const testFiles = collectToolingTestFiles(rootDir, "", toolingTestRoot).sort();
  if (testFiles.length === 0) {
    logFn(`ℹ️ No tooling unit tests found under ${toolingTestRoot}`, "cyan");
    return true;
  }

  try {
    runTestFiles(process.execPath, ["--test", ...testFiles], {
      cwd: rootDir,
      stdio: "pipe",
    });
    logFn(
      `✅ Tooling tests passed (${testFiles.length} file${testFiles.length === 1 ? "" : "s"})`,
      "green",
    );
    return true;
  } catch (error) {
    const output = getToolingTestFailureOutput(error);
    logFn("❌ Tooling tests failed:", "red");
    printOutput(output);
    return false;
  }
}
