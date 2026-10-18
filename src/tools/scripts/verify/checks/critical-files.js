// src/tools/scripts/verify/checks/critical-files.js

import { existsSync, readdirSync } from "fs";
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

/**
 * Asserts every file in src/assets/components/lock-components/ and
 * src/styles/css/lock-components/ uses strictly lowercase filenames
 * (no uppercase characters), preventing case-sensitive HTTP 404s on
 * Linux/Vercel deployment filesystems.
 */
export function checkLockComponentFilenamesLowercase(rootDir) {
  logSection("LOCK COMPONENT FILENAME CASE CHECK");
  const dirs = [
    join(rootDir, "src/assets/components/lock-components"),
    join(rootDir, "src/styles/css/lock-components"),
  ];
  let allPassed = true;
  let checked = 0;
  const violations = [];

  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        checked++;
        if (/[A-Z]/.test(entry.name)) {
          allPassed = false;
          violations.push(full);
        }
      }
    }
  };

  dirs.forEach(walk);

  log(
    `📁 Checked: ${checked} files across ${dirs.length} directories`,
    "cyan",
  );
  if (violations.length > 0) {
    allPassed = false;
    log(`❌ ${violations.length} file(s) contain uppercase characters:`, "red");
    violations.forEach((v) => log(`   ${v}`, "red"));
  } else {
    log("✅ All lock component filenames are strictly lowercase", "green");
  }

  return allPassed;
}
