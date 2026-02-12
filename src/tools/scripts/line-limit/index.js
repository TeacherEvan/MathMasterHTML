// src/tools/scripts/line-limit/index.js

import { LINE_LIMIT_POLICY } from "../line-limit.config.js";
import { parseBaselineViolationsCsv } from "./baseline.js";
import { scanWorkspace } from "./scan.js";

export function runLineLimitCheck({
  rootDir,
  mode,
  baselineCsv,
  policy = LINE_LIMIT_POLICY,
}) {
  const { scanned, violations } = scanWorkspace({ rootDir, policy });

  if (mode === "strict") {
    return {
      ok: violations.length === 0,
      violations,
      newViolations: violations,
      scanned,
    };
  }

  const baselineSet = baselineCsv
    ? parseBaselineViolationsCsv(baselineCsv)
    : new Set();
  const newViolations = violations.filter((v) => !baselineSet.has(v.relPath));

  return {
    ok: newViolations.length === 0,
    violations,
    newViolations,
    scanned,
  };
}
