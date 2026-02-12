// src/tools/scripts/verify/checks/eslint.js

import { execSync } from "child_process";
import { log, logSection } from "../verify.logging.js";

export function checkESLint(rootDir) {
  logSection("ESLINT CODE QUALITY");

  try {
    execSync("npm run lint", { cwd: rootDir, stdio: "pipe" });
    log("✅ ESLint passed - No errors found", "green");
    return true;
  } catch (error) {
    const output = error.stdout?.toString() || error.stderr?.toString() || "";
    log("❌ ESLint found issues:", "red");
    // eslint-disable-next-line no-console
    console.log(output.slice(0, 500));
    return false;
  }
}
