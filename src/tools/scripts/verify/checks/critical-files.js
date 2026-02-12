// src/tools/scripts/verify/checks/critical-files.js

import { existsSync } from "fs";
import { join } from "path";
import { CRITICAL_FILES } from "../verify.constants.js";
import { log, logSection } from "../verify.logging.js";

export function checkCriticalFiles(rootDir) {
  logSection("CRITICAL FILES CHECK");
  let allPassed = true;
  let found = 0;
  let missing = 0;

  for (const file of CRITICAL_FILES) {
    const fullPath = join(rootDir, file);
    const exists = existsSync(fullPath);
    if (exists) {
      found++;
    } else {
      missing++;
      allPassed = false;
      log(`❌ Missing: ${file}`, "red");
    }
  }

  log(
    `\n📁 Found: ${found}/${CRITICAL_FILES.length} critical files`,
    found === CRITICAL_FILES.length ? "green" : "yellow",
  );
  if (missing > 0) {
    log(`⚠️  Missing: ${missing} files`, "red");
  }

  return allPassed;
}
