// src/tools/scripts/line-limit/baseline.js

import { existsSync, readFileSync } from "fs";
import { normalizeRelPath } from "./path-utils.js";

export function parseBaselineViolationsCsv(csvPath) {
  if (!existsSync(csvPath)) {
    return new Set();
  }

  const raw = readFileSync(csvPath, "utf8");
  const lines = raw.split(/\r\n|\r|\n/).filter(Boolean);
  if (lines.length <= 1) return new Set();

  // Header: "RelativePath","Extension","Lines","Category","Over<limit>"
  const set = new Set();
  for (const line of lines.slice(1)) {
    const m = line.match(/^"([^"]+)"/);
    if (m && m[1]) set.add(normalizeRelPath(m[1]));
  }
  return set;
}
