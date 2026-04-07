// src/tools/scripts/line-limit/cli.js

import { resolve } from "path";
import { fileURLToPath } from "url";
import { LINE_LIMIT_POLICY } from "../line-limit.config.js";
import { writeAuditArtifacts } from "./audit-write.js";
import { runLineLimitCheck } from "./index.js";

function formatViolations(list, max = 15) {
  const shown = list.slice(0, max);
  const lines = shown.map(
    (v) => `  ${String(v.lines).padStart(4)}  ${v.relPath}`,
  );
  const extra = list.length > max ? `  …and ${list.length - max} more` : "";
  return lines.concat(extra ? [extra] : []).join("\n");
}

export function isExecutedDirectly(scriptUrl) {
  const filename = fileURLToPath(scriptUrl);
  return Boolean(process.argv[1] && resolve(process.argv[1]) === filename);
}

export function runCli() {
  const args = new Set(process.argv.slice(2));
  const mode = args.has("--strict") ? "strict" : "baseline";
  const writeBaseline = args.has("--write-baseline");

  const rootDir = process.cwd();
  const baselineCsv = resolve(rootDir, LINE_LIMIT_POLICY.baselineViolationsCsv);
  const useBaseline = mode === "baseline" && !args.has("--no-baseline");

  const result = runLineLimitCheck({
    rootDir,
    mode,
    baselineCsv: useBaseline ? baselineCsv : null,
  });

  if (writeBaseline) {
    const artifacts = writeAuditArtifacts({
      rootDir,
      policy: LINE_LIMIT_POLICY,
      scanned: result.scanned,
      violations: result.violations,
    });
    console.log("\n📝 Updated line-limit audit artifacts:");
    console.log(`  - ${artifacts.summaryPath}`);
    console.log(`  - ${artifacts.allCsvPath}`);
    console.log(`  - ${artifacts.violationsCsvPath}`);
  }

  const total = result.violations.length;
  const newCount = result.newViolations.length;

  console.log("\n==================================================");
  console.log(`  LINE LENGTH SUGGESTION (aim for 250–300 lines)`);
  console.log("==================================================\n");
  console.log(`Mode: ${mode}${useBaseline ? " (no-new-violations)" : ""}`);
  console.log(`Files over ${LINE_LIMIT_POLICY.maxLines} lines: ${total}`);

  if (mode === "baseline") {
    console.log(`New over-limit files: ${newCount}`);
  }

  if (!result.ok) {
    console.log("\n⚠️  Some files exceed the suggested line length.");
    if (mode === "baseline" && newCount > 0) {
      console.log("\nNewly over-limit files (consider splitting when convenient):");
      console.log(formatViolations(result.newViolations));
      console.log(
        `\nBaseline list: ${LINE_LIMIT_POLICY.baselineViolationsCsv} (update only with intent)`,
      );
    } else {
      console.log("\nOver-limit files:");
      console.log(formatViolations(result.violations));
    }
    process.exit(0);
  }

  console.log("\n✅ All files within the suggested line length.");
  process.exit(0);
}

if (isExecutedDirectly(import.meta.url)) {
  runCli();
}
