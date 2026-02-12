// src/tools/scripts/verify/checks/line-limits.js

import { join } from "path";
import { runLineLimitCheck } from "../../line-limit-check.js";
import { LINE_LIMIT_POLICY } from "../../line-limit.config.js";
import { log, logSection } from "../verify.logging.js";

export function checkLineLimits(rootDir, mode = "baseline") {
  const baselineCsv = join(rootDir, LINE_LIMIT_POLICY.baselineViolationsCsv);
  const result = runLineLimitCheck({
    rootDir,
    mode,
    baselineCsv: mode === "baseline" ? baselineCsv : null,
  });

  logSection("LINE LIMIT (200) CHECK");
  log(
    `Mode: ${mode}${mode === "baseline" ? " (no-new-violations)" : ""}`,
    "cyan",
  );
  log(`Violations (>200): ${result.violations.length}`, "cyan");

  if (mode === "baseline") {
    if (result.newViolations.length > 0) {
      log(`❌ New violations: ${result.newViolations.length}`, "red");
      result.newViolations.slice(0, 10).forEach((v) => {
        log(`   ${v.lines}  ${v.relPath}`, "red");
      });
      return false;
    }
    log("✅ No new line-limit violations introduced", "green");
    return true;
  }

  return result.ok;
}
