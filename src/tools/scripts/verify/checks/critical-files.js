// src/tools/scripts/verify/checks/critical-files.js

import { existsSync, readdirSync, readFileSync } from "fs";
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

/**
 * Statically parses the STATIC_ASSETS array in service-worker.js and verifies
 * that every listed URL resolves to an existing file on disk with exact
 * case-sensitive path matching. Missing or case-mismatched URLs are reported
 * as failures (not warnings): a single bad URL in a monolithic cache.addAll()
 * would atomically reject Service Worker installation and leave users without
 * offline support.
 */
export function checkServiceWorkerPrecacheAssets(rootDir) {
  logSection("SERVICE WORKER PRECACHE ASSETS CHECK");
  const swPath = join(rootDir, "service-worker.js");
  if (!existsSync(swPath)) {
    log("❌ service-worker.js not found at project root", "red");
    return false;
  }

  // Must match the BUILD_VERSION value used by service-worker.js so
  // `/src/...?v=${BUILD_VERSION}` entries resolve to their real file paths.
  const BUILD_VERSION = "20260501-symbol-rain-lifecycle-2";
  const swSource = readFileSync(swPath, "utf8");

  const arrayMatch = swSource.match(/const\s+STATIC_ASSETS\s*=\s*\[\s*([\s\S]*?)\s*\]\s*;/);
  if (!arrayMatch) {
    log("❌ Could not parse STATIC_ASSETS array from service-worker.js", "red");
    return false;
  }

  const rawEntries = [...arrayMatch[1].matchAll(/["'`]([^"'`]+)["'`]/g)].map((m) => m[1]);

  let allPassed = true;
  let checked = 0;
  const failures = [];

  for (const rawEntry of rawEntries) {
    let assetPath = rawEntry.replace(/\$\{BUILD_VERSION\}/g, BUILD_VERSION);

    // Strip query string (?v=...) so cache keys are compared as file paths
    const queryIndex = assetPath.indexOf("?");
    if (queryIndex !== -1) {
      assetPath = assetPath.slice(0, queryIndex);
    }

    const relativePath = assetPath.startsWith("/") ? assetPath.slice(1) : assetPath;
    const fullPath = join(rootDir, relativePath);

    checked++;
    if (existsSync(fullPath)) {
      continue;
    }

    // Distinguish "missing" from "case mismatch" for actionable reporting
    let caseMismatch = false;
    try {
      const slashIndex = relativePath.lastIndexOf("/");
      const dir = join(rootDir, slashIndex === -1 ? "" : relativePath.slice(0, slashIndex));
      const fileName = slashIndex === -1 ? relativePath : relativePath.slice(slashIndex + 1);
      if (existsSync(dir) && fileName.length > 0) {
        const actual = readdirSync(dir).find(
          (name) => name.toLowerCase() === fileName.toLowerCase(),
        );
        if (actual && actual !== fileName) {
          caseMismatch = true;
        }
      }
    } catch {
      // Not a resolvable directory -> treated as missing below
    }

    allPassed = false;
    failures.push({ rawEntry, assetPath, caseMismatch });
  }

  log(`📁 Checked: ${checked} STATIC_ASSETS entries`, "cyan");
  if (failures.length > 0) {
    allPassed = false;
    log(`❌ ${failures.length} precache asset(s) do not resolve on disk:`, "red");
    failures.forEach((f) => {
      const reason = f.caseMismatch ? "case mismatch" : "missing";
      log(`   ${reason}: ${f.rawEntry} → ${f.assetPath}`, "red");
    });
  } else {
    log("✅ All STATIC_ASSETS entries resolve to existing files", "green");
  }

  return allPassed;
}
