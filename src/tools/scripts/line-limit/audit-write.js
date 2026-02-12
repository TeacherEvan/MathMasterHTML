// src/tools/scripts/line-limit/audit-write.js

import { writeFileSync } from "fs";
import { resolve } from "path";
import { toWindowsRelPath } from "./path-utils.js";
import { categorize } from "./scan.js";

function csvEscape(value) {
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function writeAuditArtifacts({ rootDir, policy, scanned, violations }) {
  const docsDir = resolve(rootDir, "Docs");
  const allCsvPath = resolve(docsDir, "LINE_LIMIT_200_AUDIT.policy.all.csv");
  const violationsCsvPath = resolve(
    docsDir,
    "LINE_LIMIT_200_AUDIT.policy.violations.csv",
  );
  const summaryPath = resolve(
    docsDir,
    "LINE_LIMIT_200_AUDIT.policy.summary.txt",
  );

  const byCategory = new Map();
  for (const v of violations) {
    const cat = categorize(v.relPath);
    byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
  }

  const sortedCats = Array.from(byCategory.entries()).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );

  const allSorted = [...scanned].sort(
    (a, b) => b.lines - a.lines || a.relPath.localeCompare(b.relPath),
  );

  const violationsSorted = [...violations].sort(
    (a, b) => b.lines - a.lines || a.relPath.localeCompare(b.relPath),
  );

  const header = [
    "RelativePath",
    "Extension",
    "Lines",
    "Category",
    "Over200",
  ].map(csvEscape);

  const allLines = [header.join(",")];
  for (const r of allSorted) {
    const ext = r.ext.startsWith(".") ? r.ext.slice(1) : r.ext;
    const over = r.lines > policy.maxLines;
    allLines.push(
      [
        csvEscape(toWindowsRelPath(r.relPath)),
        csvEscape(ext),
        csvEscape(r.lines),
        csvEscape(categorize(r.relPath)),
        csvEscape(over ? "True" : "False"),
      ].join(","),
    );
  }

  const violationLines = [header.join(",")];
  for (const v of violationsSorted) {
    const ext = v.relPath.includes(".")
      ? v.relPath
          .split(".")
          .pop()
          .toLowerCase()
      : "";
    violationLines.push(
      [
        csvEscape(toWindowsRelPath(v.relPath)),
        csvEscape(ext),
        csvEscape(v.lines),
        csvEscape(categorize(v.relPath)),
        csvEscape("True"),
      ].join(","),
    );
  }

  const top20 = violationsSorted.slice(0, 20);
  const summaryLines = [];
  summaryLines.push("LINE LIMIT 200 AUDIT SUMMARY (policy exclusions applied)");
  summaryLines.push(`Root: ${rootDir}`);
  summaryLines.push(`Included file count: ${scanned.length}`);
  summaryLines.push(`Violations (>200 lines): ${violations.length}`);
  summaryLines.push("");
  summaryLines.push(
    `Exclusions (generated/3rd-party): ${policy.excludeFileNames.join(", ")}`,
  );
  summaryLines.push("");
  summaryLines.push("Violations by category:");
  for (const [cat, count] of sortedCats) {
    summaryLines.push(`${cat.padEnd(16)} ${String(count).padStart(3)}`);
  }
  summaryLines.push("");
  summaryLines.push("Top 20 largest violators:");
  for (const v of top20) {
    summaryLines.push(
      `  ${String(v.lines).padStart(4)}  ${toWindowsRelPath(v.relPath)}`,
    );
  }
  summaryLines.push("");
  summaryLines.push("CSV (all): ");
  summaryLines.push(allCsvPath);
  summaryLines.push("CSV (violations): ");
  summaryLines.push(violationsCsvPath);
  summaryLines.push("");

  writeFileSync(allCsvPath, allLines.join("\r\n") + "\r\n", "utf8");
  writeFileSync(
    violationsCsvPath,
    violationLines.join("\r\n") + "\r\n",
    "utf8",
  );
  writeFileSync(summaryPath, summaryLines.join("\r\n") + "\r\n", "utf8");

  return { allCsvPath, violationsCsvPath, summaryPath };
}
