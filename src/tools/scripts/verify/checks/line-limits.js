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

  logSection(`LINE LENGTH SUGGESTION (aim for 250–300 lines)`);
  log(
    `Mode: ${mode}${mode === "baseline" ? " (informational)" : ""}`,
    "cyan",
  );
  log(
    `Files over ${LINE_LIMIT_POLICY.maxLines} lines: ${result.violations.length}`,
    "cyan",
  );

  if (mode === "baseline") {
    if (result.newViolations.length > 0) {
      log(`⚠️  Newly over-limit files: ${result.newViolations.length}`, "yellow");
      result.newViolations.slice(0, 10).forEach((v) => {
        log(`   ${v.lines}  ${v.relPath}`, "yellow");
      });
      log("   (consider splitting when convenient — not a blocker)", "yellow");
    } else {
      log("✅ No newly over-limit files", "green");
    }
    return true;
  }

  if (result.violations.length > 0) {
    log(
      `⚠️  ${result.violations.length} file(s) over suggested length — not a blocker`,
      "yellow",
    );
  }
  return true;
}
